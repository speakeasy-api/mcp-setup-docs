package factorytranscript

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestLimitMeasurements(t *testing.T) {
	for _, tc := range []struct {
		name     string
		prior    int
		size     int64
		category string
	}{
		{"source", 0, 1<<20 + 1, "source_bytes"},
		{"total", 8 << 20, 1, "total_bytes"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			f, err := os.Create(dir + "/RAW_CANARY")
			if err != nil {
				t.Fatal(err)
			}
			f.Truncate(tc.size)
			f.Close()
			root, _ := os.OpenRoot(dir)
			defer root.Close()
			b := &sourceBoundary{bytes: tc.prior}
			_, err = b.read(root, "RAW_CANARY")
			if WorkerExitCode(err) != 48 {
				t.Fatalf("code: %v", err)
			}
			data, _ := json.Marshal(err)
			var got LimitDiagnostic
			if e := json.Unmarshal(data, &got); e != nil {
				t.Fatal(e)
			}
			allowed := int64(1 << 20)
			if tc.name == "total" {
				allowed = 8 << 20
			}
			if got.Observed != int64(tc.prior)+tc.size || got.Allowed != allowed {
				t.Fatalf("incorrect measurement: %+v", got)
			}

			if !strings.Contains(string(data), `"category":"`+tc.category+`"`) || !strings.Contains(string(data), `"allowed":`) {
				t.Fatalf("missing measurement: %s", data)
			}
			if strings.Contains(string(data), "RAW_CANARY") {
				t.Fatal("raw leakage")
			}
		})
	}
}

func TestUntrustedLimitDiagnostic(t *testing.T) {
	id := strings.Repeat("a", 32)
	valid := `{"version":1,"run_id":"` + id + `","category":"source_bytes","observed":1048577,"allowed":1048576}`
	for _, kind := range []string{"valid", "identity", "extra", "duplicate", "fraction", "negative", "cap", "category", "trailing", "oversize", "symlink", "hardlink", "mode", "parent"} {
		t.Run(kind, func(t *testing.T) {
			dir := t.TempDir()
			os.Chmod(dir, 0700)
			data := valid
			switch kind {
			case "identity":
				data = strings.Replace(data, id, strings.Repeat("b", 32), 1)
			case "extra":
				data = strings.Replace(data, `"version":1`, `"RAW_CANARY":"secret","version":1`, 1)
			case "duplicate":
				data = strings.Replace(data, `"version":1`, `"version":1,"version":1`, 1)
			case "fraction":
				data = strings.Replace(data, "1048577", "1048577.0", 1)
			case "negative":
				data = strings.Replace(data, "1048577", "-1", 1)
			case "cap":
				data = strings.Replace(data, "1048576", "1048575", 1)
			case "category":
				data = strings.Replace(data, "source_bytes", "RAW_CANARY", 1)
			case "trailing":
				data += "{}"
			case "oversize":
				data += strings.Repeat(" ", 513)
			}
			path := dir + "/worker-limit.json"
			if err := os.WriteFile(path, []byte(data), 0600); err != nil {
				t.Fatal(err)
			}
			switch kind {
			case "symlink":
				os.Rename(path, dir+"/target")
				os.Symlink(dir+"/target", path)
			case "hardlink":
				os.Link(path, dir+"/link")
			case "mode":
				os.Chmod(path, 0644)
			case "parent":
				os.Chmod(dir, 0755)
			}
			root, _ := os.OpenRoot(dir)
			defer root.Close()
			got := ReadLimitDiagnostic(root, id)
			if (got != nil) != (kind == "valid") {
				t.Fatalf("unsafe acceptance: %+v", got)
			}
		})
	}
}
