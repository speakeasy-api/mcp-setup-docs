package factorycontroller

import (
	"strings"
	"testing"
)

const endpointJSON = `{"established":true,"endpoint":"https://example.test/mcp","sources":["reference"],"blockers":[]}`
const decisionJSON = `{"authentication":"","actions":[],"follow_ups":[],"blockers":[],"dossier":""}`

func TestDecodeEndpoint(t *testing.T) {
	for _, input := range []string{endpointJSON, `{"established":false,"endpoint":"","sources":[],"blockers":["No documented endpoint"]}`} {
		if _, err := DecodeEndpoint([]byte(input)); err != nil {
			t.Fatal(err)
		}
	}
	invalid := []string{
		"", "null", "[]", "```json\n" + endpointJSON + "\n```", endpointJSON + " prose", endpointJSON + "{}",
		strings.Replace(endpointJSON, `"established":true`, `"established":null`, 1),
		strings.Replace(endpointJSON, `"established":true`, `"established":"true"`, 1),
		strings.Replace(endpointJSON, `"established":true`, `"established":false`, 1),
		strings.Replace(endpointJSON, `"endpoint":"https://example.test/mcp"`, `"endpoint":""`, 1),
		strings.Replace(endpointJSON, `["reference"]`, `[]`, 1),
		strings.Replace(endpointJSON, `["reference"]`, `[""]`, 1),
		strings.Replace(endpointJSON, `["reference"]`, `null`, 1),
		strings.Replace(endpointJSON, `"blockers":[]`, `"blockers":["blocked"]`, 1),
		strings.Replace(endpointJSON, `"blockers":[]`, `"blockers":[] ,"extra":0`, 1),
		strings.Replace(endpointJSON, `"blockers":[]`, `"blockers":[],"blockers":[]`, 1),
		strings.Replace(endpointJSON, `"endpoint"`, `"Endpoint"`, 1),
		strings.Replace(endpointJSON, `,"blockers":[]`, ``, 1),
		strings.Replace(endpointJSON, `"reference"`, `42`, 1),
		strings.Replace(endpointJSON, `"reference"`, `"`+strings.Repeat("x", 65537)+`"`, 1),
		strings.Replace(endpointJSON, `["reference"]`, `[`+strings.Repeat(`"x",`, 128)+`"x"]`, 1),
		strings.Repeat(" ", 1<<20) + endpointJSON,
	}
	for i, input := range invalid {
		if _, err := DecodeEndpoint([]byte(input)); err == nil {
			t.Errorf("invalid case %d accepted", i)
		}
	}
}

func TestDecodeDecision(t *testing.T) {
	full := `{"authentication":"token","actions":[{"description":"Configure","sources":["reference"]}],"follow_ups":[{"topic":2,"checks":["Verify"]}],"blockers":[],"dossier":"draft"}`
	for _, input := range []string{decisionJSON, full, strings.Replace(decisionJSON, `"blockers":[]`, `"blockers":["Pending evidence"]`, 1)} {
		if _, err := DecodeDecision([]byte(input)); err != nil {
			t.Fatal(err)
		}
	}
	invalid := []string{"null", "[]", decisionJSON + "\nprose", decisionJSON + decisionJSON,
		strings.Replace(decisionJSON, `"authentication":""`, `"authentication":null`, 1),
		strings.Replace(decisionJSON, `"actions":[]`, `"actions":null`, 1),
		strings.Replace(decisionJSON, `"follow_ups":[]`, `"follow_ups":{}`, 1),
		strings.Replace(decisionJSON, `"dossier":""`, `"Dossier":""`, 1),
		strings.Replace(decisionJSON, `,"dossier":""`, ``, 1),
		strings.Replace(decisionJSON, `"dossier":""`, `"dossier":"","extra":true`, 1),
		strings.Replace(decisionJSON, `"dossier":""`, `"dossier":"","dossier":""`, 1),
		strings.Replace(full, `"description":"Configure"`, `"description":""`, 1),
		strings.Replace(full, `"description":"Configure"`, `"description":"Configure","description":"Again"`, 1),
		strings.Replace(full, `"sources":["reference"]`, `"sources":[]`, 1),
		strings.Replace(full, `"sources":["reference"]`, `"Sources":["reference"]`, 1),
		strings.Replace(full, `"topic":2`, `"topic":2,"topic":3`, 1),
		strings.Replace(full, `"topic":2`, `"topic":0`, 1),
		strings.Replace(full, `"topic":2`, `"topic":6`, 1),
		strings.Replace(full, `"topic":2`, `"topic":2.0`, 1),
		strings.Replace(full, `"topic":2`, `"topic":null`, 1),
		strings.Replace(full, `"checks":["Verify"]`, `"checks":[]`, 1),
		strings.Replace(full, `"checks":["Verify"]`, `"checks":[null]`, 1),
		strings.Replace(full, `"checks":["Verify"]`, `"checks":[""]`, 1),
		strings.Replace(full, `{"topic":2,"checks":["Verify"]}`, `{"topic":2,"checks":["Verify"]},{"topic":2,"checks":["Again"]}`, 1),
		strings.Replace(full, `"authentication":"token"`, `"authentication":"`+strings.Repeat("x", 65537)+`"`, 1),
	}
	for i, input := range invalid {
		if _, err := DecodeDecision([]byte(input)); err == nil {
			t.Errorf("invalid case %d accepted", i)
		}
	}
	got, err := DecodeDecision([]byte(full))
	if err != nil {
		t.Fatal(err)
	}
	if got.Authentication != "token" || len(got.Actions) != 1 || got.Actions[0].Description != "Configure" || len(got.FollowUps) != 1 || got.FollowUps[0].Topic != 2 || got.Dossier != "draft" {
		t.Fatal("decoded fields differ")
	}
}

func TestDecodeBoundsAndExactFields(t *testing.T) {
	full := `{"authentication":"token","actions":[{"description":"Configure","sources":["reference"]}],"follow_ups":[{"topic":2,"checks":["Verify"]}],"blockers":["pending"],"dossier":"draft"}`
	for _, field := range []string{"token", "Configure", "reference", "Verify", "pending"} {
		atLimit := strings.Replace(full, `"`+field+`"`, `"`+strings.Repeat("x", 65536)+`"`, 1)
		if _, err := DecodeDecision([]byte(atLimit)); err != nil {
			t.Errorf("string boundary %s: %v", field, err)
		}
		above := strings.Replace(full, `"`+field+`"`, `"`+strings.Repeat("x", 65537)+`"`, 1)
		if _, err := DecodeDecision([]byte(above)); err == nil {
			t.Errorf("string limit %s accepted", field)
		}
	}
	for _, array := range []struct{ old, item string }{
		{`[{"description":"Configure","sources":["reference"]}]`, `{"description":"Configure","sources":["reference"]}`},
		{`["reference"]`, `"reference"`},
		{`["Verify"]`, `"Verify"`},
		{`["pending"]`, `"pending"`},
	} {
		replacement := `[` + strings.Repeat(array.item+",", 127) + array.item + `]`
		if _, err := DecodeDecision([]byte(strings.Replace(full, array.old, replacement, 1))); err != nil {
			t.Errorf("array boundary: %v", err)
		}
		replacement = `[` + strings.Repeat(array.item+",", 128) + array.item + `]`
		if _, err := DecodeDecision([]byte(strings.Replace(full, array.old, replacement, 1))); err == nil {
			t.Error("array limit accepted")
		}
	}
	for _, replacement := range []string{
		`{"description":"Configure"}`,
		`{"description":"Configure","sources":["reference"],"extra":0}`,
		`{"description":"Configure","sources":["reference"],"sources":["other"]}`,
		`null`,
	} {
		input := strings.Replace(full, `{"description":"Configure","sources":["reference"]}`, replacement, 1)
		if _, err := DecodeDecision([]byte(input)); err == nil || err.Error() != "invalid research decision" {
			t.Error("expected fixed validation error")
		}
	}
	for _, replacement := range []string{`{"topic":2}`, `{"topic":2,"checks":["Verify"],"extra":0}`, `{"Topic":2,"checks":["Verify"]}`, `null`} {
		input := strings.Replace(full, `{"topic":2,"checks":["Verify"]}`, replacement, 1)
		if _, err := DecodeDecision([]byte(input)); err == nil {
			t.Error("invalid follow-up accepted")
		}
	}
	// Total byte limit includes whitespace and JSON syntax, not only strings.
	atLimit := decisionJSON + strings.Repeat(" ", (1<<20)-len(decisionJSON))
	if _, err := DecodeDecision([]byte(atLimit)); err != nil {
		t.Fatal(err)
	}
	if _, err := DecodeDecision([]byte(atLimit + " ")); err == nil {
		t.Error("oversize input accepted")
	}
	if _, err := DecodeEndpoint([]byte("\xff" + endpointJSON)); err == nil {
		t.Error("invalid UTF-8 accepted")
	}
}

func TestDecodeRequiredWhitespace(t *testing.T) {
	for _, field := range []string{"https://example.test/mcp", "reference"} {
		input := strings.Replace(endpointJSON, field, ` \t\n\u2003`, 1)
		if _, err := DecodeEndpoint([]byte(input)); err == nil {
			t.Errorf("whitespace %s accepted", field)
		}
	}
	full := `{"authentication":"","actions":[{"description":"Configure","sources":["reference"]}],"follow_ups":[{"topic":2,"checks":["Verify"]}],"blockers":["pending"],"dossier":""}`
	for _, field := range []string{"Configure", "reference", "Verify", "pending"} {
		if _, err := DecodeDecision([]byte(strings.Replace(full, field, ` \t\n\u2003`, 1))); err == nil {
			t.Errorf("whitespace %s accepted", field)
		}
	}
}

func TestDecodeFinalization(t *testing.T) {
	for _, tc := range []struct {
		input, dossier string
		blockers       int
	}{
		{`{"dossier":"Final dossier","blockers":[]}`, "Final dossier", 0},
		{`{"dossier":"","blockers":["Factual gap"]}`, "", 1},
		{`{"dossier":"  retained  ","blockers":[]}`, "  retained  ", 0},
	} {
		got, err := DecodeFinalization([]byte(tc.input))
		if err != nil {
			t.Fatal(err)
		}
		if got.Dossier != tc.dossier || len(got.Blockers) != tc.blockers {
			t.Fatal("decoded fields differ")
		}
	}
	valid := `{"dossier":"Final dossier","blockers":[]}`
	invalid := []string{"", `null`, `[]`, `{}`, `{"dossier":"only"}`, `{"blockers":[]}`,
		`{"dossier":null,"blockers":[]}`, `{"dossier":1,"blockers":[]}`,
		`{"dossier":"","blockers":[]}`, `{"dossier":" \t\n\u2003","blockers":[]}`,
		`{"dossier":"ok","blockers":null}`, `{"dossier":"ok","blockers":{}}`,
		`{"dossier":"ok","blockers":[null]}`, `{"dossier":"ok","blockers":[""]}`, `{"dossier":"ok","blockers":[" \t"]}`,
		`{"Dossier":"ok","blockers":[]}`, `{"dossier":"ok","Blockers":[]}`,
		`{"dossier":"ok","dossier":"again","blockers":[]}`, `{"dossier":"ok","blockers":[],"blockers":[]}`,
		valid + " prose", valid + valid, "```json\n" + valid + "\n```", "\xff" + valid,
		`{"dossier":"ok","blockers":["` + strings.Repeat("x", 65537) + `"]}`,
		`{"dossier":"ok","blockers":[` + strings.Repeat(`"x",`, 128) + `"x"]}`,
	}
	for _, field := range []string{`"authentication":"token"`, `"actions":[]`, `"follow_ups":[]`, `"extra":false`} {
		invalid = append(invalid, strings.TrimSuffix(valid, "}")+","+field+"}")
	}
	for i, input := range invalid {
		if _, err := DecodeFinalization([]byte(input)); err == nil || err.Error() != "invalid research decision" {
			t.Errorf("case %d: expected fixed error", i)
		}
	}
	atLimit := `{"dossier":"` + strings.Repeat("x", (1<<20)-len(`{"dossier":"","blockers":[]}`)) + `","blockers":[]}`
	if _, err := DecodeFinalization([]byte(atLimit)); err != nil {
		t.Fatal(err)
	}
	if _, err := DecodeFinalization([]byte(atLimit + " ")); err == nil {
		t.Error("oversized input accepted")
	}
	for _, input := range []string{
		`{"dossier":"","blockers":["` + strings.Repeat("x", 65536) + `"]}`,
		`{"dossier":"","blockers":[` + strings.Repeat(`"x",`, 127) + `"x"]}`,
	} {
		if _, err := DecodeFinalization([]byte(input)); err != nil {
			t.Fatal(err)
		}
	}
}
