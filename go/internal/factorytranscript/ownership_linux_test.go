package factorytranscript

import (
	"context"
	"os"
	"testing"
)

// Invoked by test-linux-ownership.sh on Linux tmpfs, not a macOS bind mount.
func TestLinuxOwnership(t *testing.T) {
	base := os.Getenv("FACTORY_OWNERSHIP_ROOT")
	if base == "" {
		t.Skip("requires isolated Linux UID fixture")
	}
	if os.Geteuid() != 1001 {
		t.Fatal("fixture must run as host UID 1001")
	}
	err := Export(base+"/home", base+"/workspace", base+"/export/session.json", nil)
	cleanup := CleanupPrivate(context.Background(), base)
	if os.Getenv("FACTORY_OWNERSHIP_MODE") == "root" {
		if err == nil || cleanup == nil {
			t.Fatal("root-owned private files unexpectedly readable/removable")
		}
	} else if err != nil || cleanup != nil {
		t.Fatalf("same-UID export/cleanup: %v / %v", err, cleanup)
	}
}
