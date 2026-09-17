package factoryrun

import (
	"testing"
	"time"
)

func TestMonotonicPhaseDurations(t *testing.T) {
	start := time.Now()
	get := func(t *testing.T, d *Deadlines, end time.Time) map[string]int64 {
		t.Helper()
		observed, ok := any(d).(interface {
			Durations(time.Time) map[string]int64
		})
		if !ok {
			t.Fatal("host phase durations missing")
		}
		return observed.Durations(end)
	}
	t.Run("duplicate begin does not reset", func(t *testing.T) {
		d := Start(start)
		d.Begin(start.Add(time.Second))
		deadline := d.Writing
		d.Begin(start.Add(2 * time.Second))
		got := get(t, &d, start.Add(3*time.Second))
		if got["research_ms"] != 1000 || got["writing_ms"] != 2000 || d.Writing != deadline {
			t.Fatalf("reset: %v", got)
		}
		if d.Complete(deadline, 0) != "writing_timeout" {
			t.Fatal("classification changed")
		}
		got = get(t, &d, deadline)
		if got["writing_ms"] != 900000 {
			t.Fatal(got)
		}
	})
	t.Run("research timeout", func(t *testing.T) {
		d := Start(start)
		if d.Complete(d.Research, 0) != "research_timeout" {
			t.Fatal("classification changed")
		}
		got := get(t, &d, d.Research)
		if len(got) != 1 || got["research_ms"] != 1800000 {
			t.Fatal(got)
		}
	})
	t.Run("absent invalid and nonmonotonic omitted", func(t *testing.T) {
		for _, end := range []time.Time{time.Time{}, start.Add(-time.Second), start, start.Add(2 * time.Hour), start.Round(0)} {
			d := Start(start)
			if got := get(t, &d, end); len(got) != 0 {
				t.Fatal(got)
			}
		}
		d := Start(start.Round(0))
		if got := get(t, &d, start.Add(time.Second)); len(got) != 0 {
			t.Fatal(got)
		}
		d = Start(start)
		d.Begin(start.Add(2 * time.Second))
		if got := get(t, &d, start.Add(time.Second)); len(got) != 0 {
			t.Fatal(got)
		}
	})
}
