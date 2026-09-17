package factorytranscript

import "testing"

func TestHostIdentityScopes(t *testing.T) {
	t.Setenv("GITHUB_RUN_ID", "")
	t.Setenv("GITHUB_RUN_ATTEMPT", "")
	local := initialFinalization("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	if !local.validIdentity() || local.WorkflowRunAttempt != 0 {
		t.Fatal("explicit local host identity rejected")
	}
	if initialFinalization("").validIdentity() {
		t.Fatal("missing host identity accepted")
	}
	t.Setenv("GITHUB_RUN_ID", "9001")
	t.Setenv("GITHUB_RUN_ATTEMPT", "1")
	first := initialFinalization(local.HostRunID)
	if !first.validIdentity() || first.sameIdentity(local) {
		t.Fatal("workflow scope ignored")
	}
	t.Setenv("GITHUB_RUN_ATTEMPT", "2")
	if first.sameIdentity(initialFinalization(local.HostRunID)) {
		t.Fatal("prior attempt accepted")
	}
	t.Setenv("GITHUB_RUN_ATTEMPT", "1")
	if first.sameIdentity(initialFinalization("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")) {
		t.Fatal("prior host invocation accepted")
	}
	t.Setenv("GITHUB_RUN_ATTEMPT", "invalid")
	if initialFinalization(local.HostRunID).validIdentity() {
		t.Fatal("invalid workflow identity accepted")
	}
}
