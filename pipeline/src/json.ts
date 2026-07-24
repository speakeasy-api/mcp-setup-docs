/** Pull a JSON object out of agent final text (raw or fenced). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('empty agent result')

  try {
    return JSON.parse(trimmed)
  } catch {
    // continue
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1))
  }

  throw new Error('could not parse JSON from agent result')
}
