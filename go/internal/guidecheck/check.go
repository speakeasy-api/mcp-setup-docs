package guidecheck

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v5"
	"gopkg.in/yaml.v3"
)

const (
	allowedTemplateKey = "gram.oauth.callback_url"
	guideSchemaPath    = "schema/guide.v1.schema.json"
)

var (
	anchorRE   = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	headingRE  = regexp.MustCompile(`^(#{1,6})[ \t]+(.+?)[ \t]*$`)
	headingID  = regexp.MustCompile(`^(.*?)[ \t]*\{#([a-z0-9-]+)\}[ \t]*$`)
	templateRE = regexp.MustCompile(`\{\{[ \t]*([^}]+?)[ \t]*\}\}`)
	setupRefRE = regexp.MustCompile(`(external|speakeasy)\.md#([a-z0-9-]+)`)
	shotRE     = regexp.MustCompile(`(?i)<!--[ \t]*screenshot(?:-exception)?:`)
	shotLineRE = regexp.MustCompile(`(?im)^screenshot:`)
)

// Finding is one deterministic guide-lint result.
type Finding struct {
	Severity   string `json:"severity"`
	Target     string `json:"target"`
	Where      string `json:"where"`
	Problem    string `json:"problem"`
	Suggestion string `json:"suggestion"`
	Dimension  string `json:"dimension"`

	sourcePath string
	sourceLine int
}

type heading struct {
	level  int
	text   string
	anchor string
	line   int
	index  int
}

// Check validates the authored files in guideDir using the committed schema under repoRoot.
func Check(repoRoot, guideDir string) ([]Finding, error) {
	repoRoot, err := filepath.Abs(repoRoot)
	if err != nil {
		return nil, fmt.Errorf("resolve repo root: %w", err)
	}
	guideDir, err = filepath.Abs(guideDir)
	if err != nil {
		return nil, fmt.Errorf("resolve guide directory: %w", err)
	}

	var findings []Finding
	externalPath := filepath.Join(guideDir, "external.md")
	speakeasyPath := filepath.Join(guideDir, "speakeasy.md")
	metaPath := filepath.Join(guideDir, "meta.yaml")
	researchPath := filepath.Join(guideDir, "research.md")
	legacyPath := filepath.Join(guideDir, "setup.md")

	legacyExists, err := pathExists(legacyPath)
	if err != nil {
		return nil, fmt.Errorf("stat setup.md: %w", err)
	}
	if legacyExists {
		f := finding("blocker", "external", "setup.md", "setup.md is legacy — split into external.md (provider) and speakeasy.md (Control Plane).", "Move provider steps to external.md and Speakeasy steps to speakeasy.md, then delete setup.md.")
		f.sourcePath, f.sourceLine = legacyPath, 1
		findings = append(findings, f)
	}
	externalExists, err := pathExists(externalPath)
	if err != nil {
		return nil, fmt.Errorf("stat external.md: %w", err)
	}
	if !externalExists {
		f := finding("blocker", "external", "external.md", "external.md is missing.", "Write external.md (provider-side setup) before review.")
		f.sourcePath = externalPath
		findings = append(findings, f)
	}
	speakeasyExists, err := pathExists(speakeasyPath)
	if err != nil {
		return nil, fmt.Errorf("stat speakeasy.md: %w", err)
	}
	if !speakeasyExists {
		f := finding("blocker", "speakeasy", "speakeasy.md", "speakeasy.md is missing.", "Write speakeasy.md from doctrine/speakeasy-setup.md via the Dossier.")
		f.sourcePath = speakeasyPath
		findings = append(findings, f)
	}
	if !externalExists || !speakeasyExists {
		sortFindings(findings)
		return findings, nil
	}

	external, err := os.ReadFile(externalPath)
	if err != nil {
		return nil, fmt.Errorf("read external.md: %w", err)
	}
	speakeasy, err := os.ReadFile(speakeasyPath)
	if err != nil {
		return nil, fmt.Errorf("read speakeasy.md: %w", err)
	}
	externalFindings := lintExternal(string(external))
	locateMarkdownFindings(externalFindings, externalPath, string(external))
	findings = append(findings, externalFindings...)
	speakeasyFindings := lintSpeakeasy(string(speakeasy))
	locateMarkdownFindings(speakeasyFindings, speakeasyPath, string(speakeasy))
	findings = append(findings, speakeasyFindings...)

	var metaRaw string
	metaExists, err := pathExists(metaPath)
	if err != nil {
		return nil, fmt.Errorf("stat meta.yaml: %w", err)
	}
	schemaPath := filepath.Join(repoRoot, filepath.FromSlash(guideSchemaPath))
	if !metaExists {
		f := finding("blocker", "meta", "meta.yaml", "meta.yaml is missing.", "Write meta.yaml validating against schema/guide.v1.schema.json.")
		f.sourcePath = metaPath
		findings = append(findings, f)
	} else {
		schemaExists, statErr := pathExists(schemaPath)
		if statErr != nil {
			return nil, fmt.Errorf("stat %s: %w", guideSchemaPath, statErr)
		}
		if !schemaExists {
			f := finding("blocker", "meta", guideSchemaPath, "Guide schema file is missing; cannot validate meta.yaml.", "Restore schema/guide.v1.schema.json at the repo root.")
			f.sourcePath = schemaPath
			findings = append(findings, f)
		} else {
			meta, readErr := os.ReadFile(metaPath)
			if readErr != nil {
				return nil, fmt.Errorf("read meta.yaml: %w", readErr)
			}
			metaRaw = string(meta)
			metaFindings, lintErr := lintMeta(metaRaw, schemaPath)
			if lintErr != nil {
				return nil, lintErr
			}
			locateMetaFindings(metaFindings, metaPath, metaRaw)
			findings = append(findings, metaFindings...)
		}
	}

	var researchRaw string
	researchExists, err := pathExists(researchPath)
	if err != nil {
		return nil, fmt.Errorf("stat research.md: %w", err)
	}
	if researchExists {
		research, readErr := os.ReadFile(researchPath)
		if readErr != nil {
			return nil, fmt.Errorf("read research.md: %w", readErr)
		}
		researchRaw = string(research)
	}
	agreement := lintAnchorAgreement(string(external), string(speakeasy), researchRaw, metaRaw)
	for i := range agreement {
		if agreement[i].Target == "meta" {
			locateMetaFindings(agreement[i:i+1], metaPath, metaRaw)
		} else {
			locateMarkdownFindings(agreement[i:i+1], externalPath, string(external))
		}
	}
	findings = append(findings, agreement...)
	sortFindings(findings)
	return findings, nil
}

func lintExternal(raw string) []Finding {
	var out []Finding
	frontmatter, body := stripFrontmatter(raw)
	if frontmatter == nil {
		out = append(out, finding("blocker", "external", "frontmatter", "external.md is missing YAML frontmatter delimited by ---.", "Start the file with ---\\nsetup_version: 1\\n---"))
	} else {
		var fm map[string]any
		if err := yaml.Unmarshal([]byte(*frontmatter), &fm); err != nil {
			out = append(out, finding("blocker", "external", "frontmatter", "external.md frontmatter is not valid YAML.", "Fix the YAML between the opening and closing --- lines."))
		} else if !numericOne(fm["setup_version"]) {
			out = append(out, finding("blocker", "external", "frontmatter", "external.md frontmatter must set setup_version: 1.", "Use exactly: setup_version: 1"))
		}
	}

	headings := parseHeadings(body)
	h1s := headingsAt(headings, 1)
	if len(h1s) != 1 {
		out = append(out, finding("blocker", "external", "title", fmt.Sprintf("external.md must have exactly one H1; found %d.", len(h1s)), "Keep a single \"# …\" title after the frontmatter."))
	}
	for _, h := range headingsAt(headings, 2) {
		if h.text == "Prerequisites" || h.text == "Provider setup" || h.text == "Speakeasy setup" {
			suggestion := "Drop the H2 and keep the content as opening prose (Prerequisites) or H3 steps (Provider setup)."
			if h.text == "Speakeasy setup" {
				suggestion = "Move this section into speakeasy.md."
			}
			out = append(out, finding("blocker", "external", fmt.Sprintf("line %d: ## %s", h.line, h.text), fmt.Sprintf("external.md must not use \"## %s\" — prerequisites fold into opening prose; Speakeasy steps live in speakeasy.md.", h.text), suggestion))
		}
	}

	gotchasIndex := -1
	for _, h := range headings {
		if h.level == 2 && h.text == "Gotchas" {
			gotchasIndex = h.index
			break
		}
	}
	for i, h := range headings {
		if h.level != 3 || (gotchasIndex >= 0 && h.index >= gotchasIndex) {
			continue
		}
		where := fmt.Sprintf("line %d", h.line)
		if h.anchor == "" {
			out = append(out, finding("blocker", "external", fmt.Sprintf("line %d: %s", h.line, h.text), "External setup H3 is missing a {#kebab-case} anchor.", "Add a Dossier-minted anchor, e.g. ### Create credentials {#create-credentials}"))
		} else {
			where = "#" + h.anchor
			if !anchorRE.MatchString(h.anchor) {
				out = append(out, finding("blocker", "external", where, "External setup anchor is not kebab-case [a-z0-9-]+.", "Use a Dossier-minted kebab-case id."))
			}
		}
		section := sectionBody(body, headings, i)
		if !shotRE.MatchString(section) && !shotLineRE.MatchString(section) {
			out = append(out, finding("blocker", "external", where, "External setup step lacks a screenshot placeholder or screenshot-exception comment.", "Add <!-- screenshot: … --> or <!-- screenshot-exception: … --> on its own line in the step."))
		}
	}
	return append(out, lintTemplateKeys(body, "external")...)
}

func lintSpeakeasy(raw string) []Finding {
	var out []Finding
	frontmatter, body := stripFrontmatter(raw)
	if frontmatter != nil {
		out = append(out, finding("blocker", "speakeasy", "frontmatter", "speakeasy.md must not have YAML frontmatter.", "Put setup_version only on external.md; start speakeasy.md with \"# Speakeasy setup\"."))
	}
	headings := parseHeadings(body)
	h1s := headingsAt(headings, 1)
	if len(h1s) != 1 {
		out = append(out, finding("blocker", "speakeasy", "title", fmt.Sprintf("speakeasy.md must have exactly one H1; found %d.", len(h1s)), "Use a single \"# Speakeasy setup\" title."))
	} else if h1s[0].text != "Speakeasy setup" {
		out = append(out, finding("blocker", "speakeasy", fmt.Sprintf("line %d", h1s[0].line), fmt.Sprintf("Expected \"# Speakeasy setup\", found \"# %s\".", h1s[0].text), "Rename the H1 to Speakeasy setup."))
	}
	h3s := headingsAt(headings, 3)
	anchors := map[string]bool{}
	for _, h := range h3s {
		anchors[h.anchor] = true
	}
	for _, id := range []string{"add-server-in-speakeasy", "connect-speakeasy-credentials"} {
		if !anchors[id] {
			out = append(out, finding("blocker", "speakeasy", "speakeasy.md", fmt.Sprintf("Missing canonical Speakeasy step {#%s}.", id), fmt.Sprintf("Carry ### … {#%s} from doctrine/speakeasy-setup.md via the Dossier.", id)))
		}
	}
	for _, h := range h3s {
		if h.anchor == "" {
			out = append(out, finding("blocker", "speakeasy", fmt.Sprintf("line %d: %s", h.line, h.text), "Speakeasy setup H3 is missing its fixed {#…} anchor.", "Use the fixed anchors from doctrine/speakeasy-setup.md."))
		}
	}
	return append(out, lintTemplateKeys(body, "speakeasy")...)
}

func lintMeta(raw, schemaPath string) ([]Finding, error) {
	var data any
	if err := yaml.Unmarshal([]byte(raw), &data); err != nil {
		return []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: "+err.Error(), "Fix YAML syntax so the file parses.")}, nil
	}
	data = jsonCompatible(data)

	compiler := jsonschema.NewCompiler()
	schema, err := compiler.Compile(schemaPath)
	if err != nil {
		return nil, fmt.Errorf("compile %s: %w", guideSchemaPath, err)
	}
	var out []Finding
	if err := schema.Validate(data); err != nil {
		var validationErr *jsonschema.ValidationError
		if !errors.As(err, &validationErr) {
			return nil, fmt.Errorf("validate meta.yaml: %w", err)
		}
		for _, leaf := range validationLeaves(validationErr) {
			where := leaf.InstanceLocation
			if where == "" {
				where = "meta.yaml"
			}
			out = append(out, finding("blocker", "meta", where, "meta.yaml failed schema: "+leaf.Message, "Fix the field so meta.yaml validates against schema/guide.v1.schema.json."))
		}
	}
	blob, _ := json.Marshal(data)
	for _, match := range setupRefRE.FindAllStringSubmatch(string(blob), -1) {
		if !anchorRE.MatchString(match[2]) {
			out = append(out, finding("blocker", "meta", match[1]+".md#"+match[2], "meta.yaml references a non-kebab-case setup anchor.", "Point at a Dossier-minted kebab-case anchor."))
		}
	}
	return out, nil
}

func lintAnchorAgreement(external, speakeasy, research, meta string) []Finding {
	var out []Finding
	externalAnchors := collectAnchors(external)
	speakeasyAnchors := collectAnchors(speakeasy)
	all := map[string]bool{}
	for id := range externalAnchors {
		all[id] = true
	}
	for id := range speakeasyAnchors {
		all[id] = true
	}
	if research != "" {
		researchAnchors := collectAnchors(research)
		for id := range externalAnchors {
			if !researchAnchors[id] {
				out = append(out, finding("blocker", "external", "#"+id, "external.md uses an anchor that does not appear in research.md (anchor contract).", "Mint the anchor in the Dossier first, or reuse a Dossier id verbatim."))
			}
		}
	}
	for _, match := range setupRefRE.FindAllStringSubmatch(meta, -1) {
		file, id := match[1], match[2]
		inFile := externalAnchors[id]
		if file == "speakeasy" {
			inFile = speakeasyAnchors[id]
		}
		where := file + ".md#" + id
		if !inFile && !all[id] {
			out = append(out, finding("blocker", "meta", where, fmt.Sprintf("meta.yaml references %s.md#… but that anchor is missing from the setup files.", file), "Fix the reference or restore the matching H3 {#anchor}."))
		} else if !inFile {
			out = append(out, finding("blocker", "meta", where, fmt.Sprintf("meta.yaml references %s but that anchor lives in the other setup file.", where), fmt.Sprintf("Point at the file that defines {#%s}.", id)))
		}
	}
	return out
}

func stripFrontmatter(raw string) (*string, string) {
	if !strings.HasPrefix(raw, "---\n") && !strings.HasPrefix(raw, "---\r\n") {
		return nil, raw
	}
	end := strings.Index(raw[3:], "\n---")
	if end < 0 {
		return nil, raw
	}
	end += 3
	afterRel := strings.Index(raw[end+4:], "\n")
	after := -1
	if afterRel >= 0 {
		after = end + 4 + afterRel
	}
	start := 4
	if strings.HasPrefix(raw, "---\r\n") {
		start = 5
	}
	fm := raw[start:end]
	body := ""
	if after >= 0 {
		body = raw[after+1:]
	}
	return &fm, body
}

func parseHeadings(body string) []heading {
	var out []heading
	offset := 0
	for i, line := range strings.Split(strings.ReplaceAll(body, "\r\n", "\n"), "\n") {
		if match := headingRE.FindStringSubmatch(line); match != nil {
			rest, id := match[2], ""
			if anchor := headingID.FindStringSubmatch(rest); anchor != nil {
				rest, id = strings.TrimSpace(anchor[1]), anchor[2]
			}
			out = append(out, heading{len(match[1]), strings.TrimSpace(rest), id, i + 1, offset})
		}
		offset += len(line) + 1
	}
	return out
}

func sectionBody(body string, headings []heading, index int) string {
	end := len(body)
	for i := index + 1; i < len(headings); i++ {
		if headings[i].level <= headings[index].level {
			end = headings[i].index
			break
		}
	}
	return body[headings[index].index:end]
}

func headingsAt(headings []heading, level int) []heading {
	var out []heading
	for _, h := range headings {
		if h.level == level {
			out = append(out, h)
		}
	}
	return out
}

func lintTemplateKeys(body, target string) []Finding {
	var out []Finding
	for _, loc := range templateRE.FindAllStringSubmatchIndex(body, -1) {
		key := strings.TrimSpace(body[loc[2]:loc[3]])
		if key != allowedTemplateKey {
			line := strings.Count(body[:loc[0]], "\n") + 1
			out = append(out, finding("blocker", target, "line "+strconv.Itoa(line), fmt.Sprintf("Unsupported template key {{ %s }}.", key), "Only {{ gram.oauth.callback_url }} is allowed."))
		}
	}
	return out
}

func collectAnchors(md string) map[string]bool {
	_, body := stripFrontmatter(md)
	out := map[string]bool{}
	for _, h := range parseHeadings(body) {
		if h.anchor != "" {
			out[h.anchor] = true
		}
	}
	return out
}

func validationLeaves(err *jsonschema.ValidationError) []*jsonschema.ValidationError {
	if len(err.Causes) == 0 {
		return []*jsonschema.ValidationError{err}
	}
	var out []*jsonschema.ValidationError
	for _, cause := range err.Causes {
		out = append(out, validationLeaves(cause)...)
	}
	return out
}

func jsonCompatible(value any) any {
	switch value := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(value))
		for key, item := range value {
			out[key] = jsonCompatible(item)
		}
		return out
	case map[any]any:
		out := make(map[string]any, len(value))
		for key, item := range value {
			out[fmt.Sprint(key)] = jsonCompatible(item)
		}
		return out
	case []any:
		for i := range value {
			value[i] = jsonCompatible(value[i])
		}
	}
	return value
}

func numericOne(value any) bool {
	switch value := value.(type) {
	case int:
		return value == 1
	case int64:
		return value == 1
	case uint64:
		return value == 1
	case float64:
		return value == 1
	default:
		return false
	}
}

func locateMarkdownFindings(findings []Finding, path, raw string) {
	_, body := stripFrontmatter(raw)
	bodyStart := 1
	if len(body) < len(raw) {
		bodyStart = strings.Count(raw[:len(raw)-len(body)], "\n") + 1
	}
	headings := parseHeadings(body)
	for i := range findings {
		findings[i].sourcePath = path
		switch {
		case findings[i].Where == "frontmatter":
			findings[i].sourceLine = 1
		case strings.HasPrefix(findings[i].Where, "line "):
			findings[i].sourceLine = bodyStart + findingLine(findings[i].Where) - 1
		case strings.HasPrefix(findings[i].Where, "#"):
			id := strings.TrimPrefix(findings[i].Where, "#")
			for _, heading := range headings {
				if heading.anchor == id {
					findings[i].sourceLine = bodyStart + heading.line - 1
					break
				}
			}
		case findings[i].Where == "title":
			for _, heading := range headings {
				if heading.level == 1 {
					findings[i].sourceLine = bodyStart + heading.line - 1
					break
				}
			}
		}
	}
}

func locateMetaFindings(findings []Finding, path, raw string) {
	for i := range findings {
		findings[i].sourcePath = path
		if findings[i].Where == "meta.yaml" {
			findings[i].sourceLine = 1
			continue
		}
		needle := findings[i].Where
		if strings.HasPrefix(needle, "/") {
			parts := strings.Split(needle, "/")
			needle = parts[len(parts)-1]
		}
		if offset := strings.Index(raw, needle); offset >= 0 {
			findings[i].sourceLine = strings.Count(raw[:offset], "\n") + 1
		}
	}
}

func finding(severity, target, where, problem, suggestion string) Finding {
	return Finding{
		Severity: severity, Target: target, Where: where, Problem: problem,
		Suggestion: suggestion, Dimension: "lint",
	}
}

func pathExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, err
}

func sortFindings(findings []Finding) {
	sort.SliceStable(findings, func(i, j int) bool {
		a, b := findings[i], findings[j]
		if a.sourcePath != b.sourcePath {
			return a.sourcePath < b.sourcePath
		}
		if a.sourceLine != b.sourceLine {
			return a.sourceLine < b.sourceLine
		}
		if a.Problem != b.Problem {
			return a.Problem < b.Problem
		}
		return a.Where < b.Where
	})
}

func findingLine(where string) int {
	if !strings.HasPrefix(where, "line ") {
		return 0
	}
	end := strings.IndexAny(where[5:], ": ")
	number := where[5:]
	if end >= 0 {
		number = number[:end]
	}
	line, _ := strconv.Atoi(number)
	return line
}
