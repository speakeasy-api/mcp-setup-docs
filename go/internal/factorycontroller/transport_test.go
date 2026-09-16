package factorycontroller

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"
)

func fakeTransport(t *testing.T, script string) *Transport {
	t.Helper()
	dir, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	exe := filepath.Join(dir, "kit")
	if err := os.WriteFile(exe, []byte("#!/bin/sh\n"+script), 0700); err != nil {
		t.Fatal(err)
	}
	return &Transport{KitPath: exe, Workspace: dir, Home: dir, MaxOutputBytes: 1024, TermGrace: 80 * time.Millisecond}
}

func TestTransportTurns(t *testing.T) {
	tr := fakeTransport(t, `test "$PWD" = "$HOME" || exit 10
 test "$1" = prompt || exit 11
 shift
 if [ "$1" = --resume ]; then test "$2" = abc-123 || exit 12; shift 2; fi
 test "$1" = --root || exit 15
 test "$2" = "$PWD" || exit 16
 shift 2
 test "$1" = -- || exit 13
 test "$2" = '-private prompt' || exit 14
 printf '  answer\nsession_id: misleading\n\n\nsession_id: abc-123\n'
`)
	id := ""
	for range 3 {
		got, err := tr.Turn(context.Background(), id, "-private prompt")
		if err != nil {
			t.Fatal(err)
		}
		if got.SessionID != "abc-123" || got.Answer != "  answer\nsession_id: misleading\n\n" {
			t.Fatalf("unexpected result: %#v", got)
		}
		id = got.SessionID
	}
}

func TestTransportRejects(t *testing.T) {
	for _, tc := range []struct{ name, script, id string }{
		{"missing", "printf 'private answer'", ""},
		{"no framing", "printf 'session_id: abc\\n'", ""},
		{"invalid", "printf 'private\\nsession_id: bad id\\n'", ""},
		{"unterminated", "printf 'private\\nsession_id: abc'", ""},
		{"mismatch", "printf 'private\\nsession_id: other\\n'", "abc"},
		{"exit", "printf 'private\\nsession_id: abc\\n'; echo secret >&2; exit 1", ""},
		{"stdout bound", "yes private | head -c 2000; printf '\\nsession_id: abc\\n'", ""},
		{"stderr bound", "yes secret | head -c 2000 >&2; printf '\\nsession_id: abc\\n'", ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got, err := fakeTransport(t, tc.script).Turn(context.Background(), tc.id, "private prompt")
			if err == nil || got != (TurnResult{}) {
				t.Fatalf("expected empty failure, got %#v %v", got, err)
			}
			if strings.Contains(err.Error(), "private") || strings.Contains(err.Error(), "secret") {
				t.Fatal("error leaked output")
			}
		})
	}
}

func TestTransportConcurrent(t *testing.T) {
	tr := fakeTransport(t, `shift; test "$1" = --resume || exit 1; id="$2"; touch "$id.ready"; while [ "$(ls *.ready | wc -l | tr -d ' ')" != 4 ]; do sleep 0.01; done; printf 'ok\nsession_id: %s\n' "$id"`)
	var wg sync.WaitGroup
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	for i := range 4 {
		wg.Go(func() {
			id := fmt.Sprintf("session-%d", i)
			r, e := tr.Turn(ctx, id, "p")
			if e != nil || r.SessionID != id {
				t.Errorf("turn: %v", e)
			}
		})
	}
	wg.Wait()
}

func TestTransportCancellation(t *testing.T) {
	for _, mode := range []string{"cooperative", "stubborn", "leader-exits-first"} {
		t.Run(mode, func(t *testing.T) {
			trap := "trap 'exit 0' TERM"
			if mode == "stubborn" {
				trap = "trap '' TERM"
			}
			childTrap := trap
			if mode == "leader-exits-first" {
				childTrap = "trap '' TERM"
			}
			tr := fakeTransport(t, fmt.Sprintf(`%s
 ( %s; echo ready > child-ready; while :; do sleep 0.02; done ) &
 echo $! > child-pid
 echo $$ > parent-pid
 wait
`, trap, childTrap))
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			done := make(chan error, 1)
			go func() { _, e := tr.Turn(ctx, "", "p"); done <- e }()
			deadline := time.Now().Add(time.Second)
			for {
				if _, e := os.Stat(filepath.Join(tr.Workspace, "child-ready")); e == nil {
					break
				}
				if time.Now().After(deadline) {
					t.Fatal("child not ready")
				}
				time.Sleep(5 * time.Millisecond)
			}
			cancel()
			select {
			case e := <-done:
				if e == nil {
					t.Fatal("cancel succeeded")
				}
			case <-time.After(time.Second):
				t.Fatal("cancel did not return")
			}
			for _, file := range []string{"parent-pid", "child-pid"} {
				b, e := os.ReadFile(filepath.Join(tr.Workspace, file))
				if e != nil {
					t.Fatal(e)
				}
				pid, e := strconv.Atoi(strings.TrimSpace(string(b)))
				if e != nil {
					t.Fatal(e)
				}
				deadline := time.Now().Add(time.Second)
				for syscall.Kill(pid, 0) == nil && time.Now().Before(deadline) {
					time.Sleep(10 * time.Millisecond)
				}
				if syscall.Kill(pid, 0) == nil {
					t.Errorf("%s survives cancellation", file)
				}
			}
		})
	}
}

func TestTransportSessionQueue(t *testing.T) {
	tr := fakeTransport(t, `shift
 if [ "$1" != --resume ]; then printf 'initial\nsession_id: queue-id\n'; exit 0; fi
 shift 2
 if [ "$1" = --root ]; then shift 2; fi
 test "$1" = -- || exit 20
 prompt="$2"
 mkdir active 2>/dev/null || { touch overlap; exit 21; }
 trap 'rmdir active' EXIT
 touch "$prompt.started"
 if [ "$prompt" = first ]; then while [ ! -f release ]; do sleep 0.01; done; fi
 printf '%s\nsession_id: queue-id\n' "$prompt"
`)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	initial, err := tr.Turn(ctx, "", "initial")
	if err != nil {
		t.Fatal(err)
	}
	first := make(chan error, 1)
	go func() { _, e := tr.Turn(ctx, initial.SessionID, "first"); first <- e }()
	for {
		if _, e := os.Stat(filepath.Join(tr.Workspace, "first.started")); e == nil {
			break
		}
		if ctx.Err() != nil {
			t.Fatal("first turn not ready")
		}
		time.Sleep(5 * time.Millisecond)
	}
	queued, stop := context.WithTimeout(ctx, 100*time.Millisecond)
	defer stop()
	result, err := tr.Turn(queued, initial.SessionID, "cancelled")
	if err != context.DeadlineExceeded || result != (TurnResult{}) {
		t.Fatalf("queued cancellation: %#v %v", result, err)
	}
	if _, err := os.Stat(filepath.Join(tr.Workspace, "cancelled.started")); !os.IsNotExist(err) {
		t.Fatal("cancelled queued turn executed")
	}
	next := make(chan error, 1)
	go func() {
		r, e := tr.Turn(ctx, initial.SessionID, "next")
		if e == nil && r.Answer != "next" {
			e = fmt.Errorf("unexpected answer")
		}
		next <- e
	}()
	select {
	case e := <-next:
		t.Fatalf("same-session turn overlapped: %v", e)
	case <-time.After(80 * time.Millisecond):
	}
	if err := os.WriteFile(filepath.Join(tr.Workspace, "release"), nil, 0600); err != nil {
		t.Fatal(err)
	}
	if err := <-first; err != nil {
		t.Fatal(err)
	}
	if err := <-next; err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(tr.Workspace, "overlap")); !os.IsNotExist(err) {
		t.Fatal("overlapping executable invocations")
	}
}
