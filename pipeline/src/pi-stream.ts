/**
 * Parsing for pi's `--mode json` NDJSON stream.
 *
 * Pure — no spawn, no I/O — so the failure modes below are unit-testable.
 * pi has three ways of failing and only one of them looks like a failure:
 *
 *  - auth failure: exit 1, a lone `session` line on stdout, a Node stack on stderr
 *  - API error (bad model, 4xx): **exit 0**, with the error carried only as
 *    `stopReason: "error"` / `errorMessage` inside the stream
 *  - truncation: exit 0, a well-formed prefix, and no `agent_end` at all
 *
 * The middle one is the dangerous case: keying success off the exit code reports
 * a guide that never generated as a guide that generated empty.
 */

export type PiEvent = { type: string; [key: string]: unknown }

/**
 * `message_update` carries a full cumulative copy of the message on every delta
 * and is >80% of stream volume. Drop it before `JSON.parse` rather than after.
 */
const NOISE_PREFIX = '{"type":"message_update"'

/** Parse NDJSON, skipping streaming noise and any line that is not valid JSON. */
export function parsePiStream(stdout: string): PiEvent[] {
  const events: PiEvent[] = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(NOISE_PREFIX)) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      continue
    }
    if (isEvent(parsed)) events.push(parsed)
  }
  return events
}

function isEvent(value: unknown): value is PiEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null
}

/**
 * The final assistant text, from `agent_end`.
 *
 * Keyed off `type`, never stream position: 0.57.1 ends at `agent_end` but
 * 0.83.0 appends a contentless `agent_settled`, so "read the last line" works
 * on one version and silently returns nothing on the other.
 */
export function finalText(events: PiEvent[]): string | null {
  const end = events.find((e) => e.type === 'agent_end')
  if (!end) return null
  const messages = end.messages
  if (!Array.isArray(messages) || messages.length === 0) return null
  const last = asRecord(messages[messages.length - 1])
  const content = last?.content
  if (!Array.isArray(content)) return null
  // `thinking` parts sit inline alongside `text` parts — gpt-oss emits reasoning
  // as content, not as a separate field. Keep only text.
  const text = content
    .map((part) => asRecord(part))
    .filter((part) => part?.type === 'text')
    .map((part) => (typeof part!.text === 'string' ? part!.text : ''))
    .join('')
  return text
}

/**
 * How many times each tool was called, e.g. `{read: 12, bash: 3}`.
 *
 * Without this the run is a black box: "research finished in 76s" cannot be
 * told apart from "research re-read a prior dossier and fetched nothing",
 * which is exactly the question that decides whether the dossier is grounded.
 */
export function toolCallCounts(events: PiEvent[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const event of events) {
    if (event.type !== 'tool_execution_start') continue
    const name = typeof event.toolName === 'string' ? event.toolName : 'unknown'
    counts[name] = (counts[name] ?? 0) + 1
  }
  return counts
}

/** `read=12 bash=3`, or '' when the agent called nothing. */
export function formatToolCalls(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `${name}=${n}`)
    .join(' ')
}

/** Whole-run spend, summed across turns. A multi-turn run has several `turn_end`s. */
export function totalCostUsd(events: PiEvent[]): number {
  let total = 0
  for (const event of events) {
    if (event.type !== 'turn_end') continue
    const cost = asRecord(asRecord(asRecord(event.message)?.usage)?.cost)
    if (typeof cost?.total === 'number') total += cost.total
  }
  return total
}

/**
 * An error reported inside the stream despite a zero exit code.
 *
 * The error rides on the assistant *message* object, which surfaces under four
 * event types: `message_start`, `message_end`, `turn_end` (all at
 * `.message`) and `agent_end` (at `.messages[-1]`). Both fields are absent
 * entirely on a healthy turn, so their presence is the signal.
 */
export function streamError(events: PiEvent[]): string | null {
  for (const event of events) {
    for (const carrier of errorCarriers(event)) {
      if (carrier.stopReason !== 'error') continue
      return typeof carrier.errorMessage === 'string' && carrier.errorMessage
        ? carrier.errorMessage
        : 'pi reported stopReason=error'
    }
  }
  return null
}

/** Every object on an event that could carry `stopReason` / `errorMessage`. */
function errorCarriers(event: PiEvent): Record<string, unknown>[] {
  const carriers: Record<string, unknown>[] = [event]
  const message = asRecord(event.message)
  if (message) carriers.push(message)
  if (Array.isArray(event.messages) && event.messages.length > 0) {
    const last = asRecord(event.messages[event.messages.length - 1])
    if (last) carriers.push(last)
  }
  return carriers
}

export type PiOutcome =
  | { ok: true; text: string; costUsd: number }
  | { ok: false; kind: 'spawn' | 'auth' | 'api' | 'truncated'; message: string }

export type PiRun = {
  exitCode: number | null
  stdout: string
  stderr: string
  spawnError?: string
}

/** Decide whether a pi run actually succeeded. Exit code alone is not enough. */
export function classifyPiRun(run: PiRun): PiOutcome {
  if (run.spawnError) {
    return { ok: false, kind: 'spawn', message: run.spawnError }
  }

  const events = parsePiStream(run.stdout)

  if (run.exitCode !== 0) {
    // Auth failure lands here: one `session` line, then a stack trace on stderr.
    const detail = firstLine(run.stderr) || `pi exited ${run.exitCode}`
    return { ok: false, kind: 'auth', message: detail }
  }

  const inStream = streamError(events)
  if (inStream) {
    return { ok: false, kind: 'api', message: inStream }
  }

  const text = finalText(events)
  if (text === null) {
    return {
      ok: false,
      kind: 'truncated',
      message: 'pi exited 0 but emitted no agent_end event',
    }
  }
  if (!text.trim()) {
    // A failed turn still emits `agent_end`, with `content: []`. Every phase
    // owes us a JSON report, so empty is never a legitimate success.
    return {
      ok: false,
      kind: 'truncated',
      message: 'pi exited 0 but the final message had no text content',
    }
  }

  return { ok: true, text, costUsd: totalCostUsd(events) }
}

function firstLine(text: string): string {
  return text.trim().split('\n')[0]?.trim() ?? ''
}
