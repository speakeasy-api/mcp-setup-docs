package factoryrun

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"
)

func TestStartBudgets(t *testing.T) {
	now := time.Now()
	d := Start(now)
	if d.Research.Sub(now) != 1800*time.Second || d.Outer.Sub(now) != 2700*time.Second {
		t.Fatal("incorrect host budgets")
	}
	if d.Begun || d.Failed || !d.Writing.IsZero() {
		t.Fatal("writing began before signal")
	}
}
func TestDeadlineArbitration(t *testing.T) {
	now := time.Now()
	t.Run("research exact expiry and sticky failure", func(t *testing.T) {
		d := Start(now)
		if got := d.Begin(d.Research); got != "research_timeout" {
			t.Fatal(got)
		}
		if got := d.Complete(now, 0); got != "research_timeout" {
			t.Fatal(got)
		}
	})
	t.Run("first signal early writing duplicate", func(t *testing.T) {
		d := Start(now)
		if got := d.Begin(now.Add(time.Second)); got != "" {
			t.Fatal(got)
		}
		writing := d.Writing
		if got := d.Begin(now.Add(10 * time.Second)); got != "" || d.Writing != writing {
			t.Fatal("duplicate extended clock", got)
		}
		if got := d.Complete(writing, 0); got != "writing_timeout" {
			t.Fatal(got)
		}
		if got := d.Begin(writing); got != "writing_timeout" {
			t.Fatal(got)
		}
	})
	t.Run("outer cap", func(t *testing.T) {
		d := Start(now)
		d.Outer = now.Add(5 * time.Second)
		d.Begin(now)
		if d.Writing != d.Outer || d.Check(d.Outer) != "writing_timeout" {
			t.Fatal(d)
		}
	})
	t.Run("completion", func(t *testing.T) {
		d := Start(now)
		if d.Complete(now, 0) != "completed" || d.Complete(now, 3) != "provider_exit" {
			t.Fatal("completion")
		}
	})
	t.Run("invalid sticky", func(t *testing.T) {
		d := Start(now)
		if d.Reject(now) != "lifecycle_invalid" || d.Complete(now, 0) != "lifecycle_invalid" {
			t.Fatal(d)
		}
	})
}
func controlDir(t *testing.T) string {
	t.Helper()
	p, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(p, 0700); err != nil {
		t.Fatal(err)
	}
	return p
}
func TestSignal(t *testing.T) {
	id := strings.Repeat("a", 32)
	dir := controlDir(t)
	c, err := OpenControl(dir, id)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if yes, err := c.Read(); yes || err != nil {
		t.Fatal(yes, err)
	}
	if err := c.Publish(); err != nil {
		t.Fatal(err)
	}
	st, _ := os.Stat(filepath.Join(dir, "phase.json"))
	if st.Size() > 256 || !st.Mode().IsRegular() {
		t.Fatal(st)
	}
	if yes, err := c.Read(); !yes || err != nil {
		t.Fatal(yes, err)
	}
	if err := c.Publish(); err != nil {
		t.Fatal(err)
	}
	after, _ := os.Stat(filepath.Join(dir, "phase.json"))
	if !os.SameFile(st, after) {
		t.Fatal("duplicate replaced signal")
	}
	if err := os.Remove(filepath.Join(dir, "phase.json")); err != nil {
		t.Fatal(err)
	}
	if _, err := c.Read(); err == nil {
		t.Fatal("accepted removed phase")
	}
	if err := c.Publish(); err != nil {
		t.Fatal(err)
	}
	if _, err := c.Read(); err == nil {
		t.Fatal("accepted phase replacement")
	}
}

// A replacement can happen entirely between polls: observing deletion is not
// required before the host must reject a different phase object.
func TestSignalReplacementBetweenReads(t *testing.T) {
	c, err := OpenControl(controlDir(t), strings.Repeat("a", 32))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if err := c.Publish(); err != nil {
		t.Fatal(err)
	}
	if yes, err := c.Read(); !yes || err != nil {
		t.Fatal(yes, err)
	}
	if err := c.root.Remove("phase.json"); err != nil {
		t.Fatal(err)
	}
	if err := c.Publish(); err != nil {
		t.Fatal(err)
	}
	if _, err := c.Read(); err != ErrSignal {
		t.Fatal("accepted phase replacement between polls", err)
	}
}

func TestSignalHandleLifetime(t *testing.T) {
	c, err := OpenControl(controlDir(t), strings.Repeat("a", 32))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if err := c.Publish(); err != nil {
		t.Fatal(err)
	}
	if c.seenFile != nil {
		t.Fatal("publisher changed host identity")
	}
	if yes, err := c.Read(); !yes || err != nil {
		t.Fatal(yes, err)
	}
	anchor := c.seenFile
	if anchor == nil {
		t.Fatal("validated phase inode is not pinned")
	}
	if yes, err := c.Read(); !yes || err != nil || c.seenFile != anchor {
		t.Fatal("repeated read changed the retained handle", yes, err)
	}
	if err := c.root.Remove("phase.json"); err != nil {
		t.Fatal(err)
	}
	if _, err := anchor.Stat(); err != nil {
		t.Fatal("unlinked phase inode is no longer pinned", err)
	}
	if err := c.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err := anchor.Stat(); !errors.Is(err, os.ErrClosed) {
		t.Fatal("control close did not release the phase handle", err)
	}
}

func TestUnsafeSignal(t *testing.T) {
	for name, body := range map[string]string{"malformed": "{", "foreign": `{"version":1,"run_id":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","phase":"writing"}`, "oversize": strings.Repeat("x", 257), "unknown": `{"version":1,"run_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","phase":"writing","extra":1}`, "duplicate-key": `{"version":1,"version":1,"run_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","phase":"writing"}`} {
		t.Run(name, func(t *testing.T) {
			dir := controlDir(t)
			c, err := OpenControl(dir, strings.Repeat("a", 32))
			if err != nil {
				t.Fatal(err)
			}
			defer c.Close()
			os.WriteFile(filepath.Join(dir, "phase.json"), []byte(body), 0600)
			if _, err := c.Read(); err == nil {
				t.Fatal("accepted unsafe signal")
			}
			if err := c.Publish(); err == nil {
				t.Fatal("overwrote invalid signal")
			}
		})
	}
	t.Run("symlink", func(t *testing.T) {
		dir := controlDir(t)
		c, _ := OpenControl(dir, strings.Repeat("a", 32))
		defer c.Close()
		os.Symlink("missing", filepath.Join(dir, "phase.json"))
		if _, err := c.Read(); err == nil {
			t.Fatal("accepted symlink")
		}
	})
	t.Run("unsafe directory", func(t *testing.T) {
		dir := controlDir(t)
		os.Symlink(dir, filepath.Join(dir, "link"))
		for _, p := range []string{filepath.Join(dir, "link"), ".", dir + "/../" + filepath.Base(dir)} {
			if c, err := OpenControl(p, strings.Repeat("a", 32)); err == nil {
				c.Close()
				t.Fatal("accepted unsafe path", p)
			}
		}
		os.Chmod(dir, 0755)
		if c, err := OpenControl(dir, strings.Repeat("a", 32)); err == nil {
			c.Close()
			t.Fatal("accepted public directory")
		}
	})
}

func TestProviderExitSticky(t *testing.T) {
	d := Start(time.Now())
	if d.Complete(time.Now(), 7) != "provider_exit" || d.Complete(time.Now(), 0) != "provider_exit" || !d.Failed {
		t.Fatal("provider failure was not sticky")
	}
}
func TestNoSignalAndLateInvalid(t *testing.T) {
	now := time.Now()
	d := Start(now)
	if d.Check(d.Research.Add(-time.Nanosecond)) != "" || d.Complete(d.Research, 0) != "research_timeout" {
		t.Fatal(d)
	}
	d = Start(now)
	if d.Reject(d.Research) != "research_timeout" {
		t.Fatal("invalid signal took precedence over expiry")
	}
}
func TestConcurrentPublish(t *testing.T) {
	dir := controlDir(t)
	id, err := NewRunID()
	if err != nil || !validRunID(id) {
		t.Fatal(id, err)
	}
	results := make(chan error, 16)
	for i := 0; i < 16; i++ {
		go func() {
			c, err := OpenControl(dir, id)
			if err != nil {
				results <- err
				return
			}
			defer c.Close()
			results <- c.Publish()
		}()
	}
	for i := 0; i < 16; i++ {
		if err := <-results; err != nil {
			t.Fatal(err)
		}
	}
	entries, err := os.ReadDir(dir)
	if err != nil || len(entries) != 1 || entries[0].Name() != "phase.json" {
		t.Fatal(entries, err)
	}
}
func TestSpecialSignal(t *testing.T) {
	dir := controlDir(t)
	if err := syscall.Mkfifo(filepath.Join(dir, "phase.json"), 0600); err != nil {
		t.Fatal(err)
	}
	c, err := OpenControl(dir, strings.Repeat("a", 32))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if _, err := c.Read(); err == nil {
		t.Fatal("accepted FIFO")
	}
	if err := c.Publish(); err == nil {
		t.Fatal("replaced FIFO")
	}
}
func TestControlHandleSurvivesPathReplacement(t *testing.T) {
	parent := controlDir(t)
	dir := filepath.Join(parent, "control")
	if err := os.Mkdir(dir, 0700); err != nil {
		t.Fatal(err)
	}
	c, err := OpenControl(dir, strings.Repeat("a", 32))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if err := os.Rename(dir, dir+"-original"); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(dir, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "phase.json"), []byte("hostile"), 0600); err != nil {
		t.Fatal(err)
	}
	if yes, err := c.Read(); yes || err != nil {
		t.Fatal("followed replacement", yes, err)
	}
	if err := c.Publish(); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(dir, "phase.json"))
	if err != nil || string(data) != "hostile" {
		t.Fatal("wrote replacement", err)
	}
}
