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
	"unicode/utf8"

	"github.com/santhosh-tekuri/jsonschema/v5"
	"gopkg.in/yaml.v3"
)

const (
	allowedTemplateKey = "gram.oauth.callback_url"
	guideSchemaPath    = "schema/guide.v1.schema.json"
)

var (
	anchorRE         = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	headingAnchorRE  = regexp.MustCompile(`^[a-z0-9-]+$`)
	templateRE       = regexp.MustCompile(`\{\{[[:space:]]*([^}]+?)[[:space:]]*\}\}`)
	setupRefRE       = regexp.MustCompile(`(external|speakeasy)\.md#([a-z0-9-]+)`)
	quotedPropertyRE = regexp.MustCompile(`'([^']+)'`)
	expectedTypeRE   = regexp.MustCompile(`^expected ([^,]+),`)
	minimumRE        = regexp.MustCompile(`(?:>= |minimum )([0-9]+)`)
	formatRE         = regexp.MustCompile(`not valid '([^']+)'$`)
	uniqueItemsRE    = regexp.MustCompile(`items at index ([0-9]+) and ([0-9]+) are equal`)
	yamlErrorLineRE  = regexp.MustCompile(`yaml: line ([0-9]+):`)
	shotRE           = regexp.MustCompile(`(?i)<!--[[:space:]]*screenshot(?:-exception)?:`)
	shotLineRE       = regexp.MustCompile(`(?im)^screenshot:`)
)

// Finding is one deterministic guide-lint result.
type Finding struct {
	Severity   string `json:"severity"`
	Target     string `json:"target"`
	Where      string `json:"where"`
	Problem    string `json:"problem"`
	Suggestion string `json:"suggestion"`
	Dimension  string `json:"dimension"`
	Rule       string `json:"rule,omitempty"`
}

type heading struct {
	level  int
	text   string
	anchor string
	line   int
	index  int
}

// Check validates the authored files in guideDir using the committed schema under repoRoot.
func CheckGuide(guideDir, repoRoot string) ([]Finding, error) {
	repoRoot, err := filepath.Abs(repoRoot)
	if err != nil {
		return nil, fmt.Errorf("resolve repo root: %w", err)
	}
	guideDir, err = filepath.Abs(guideDir)
	if err != nil {
		return nil, fmt.Errorf("resolve guide directory: %w", err)
	}

	findings := []Finding{}
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
		findings = append(findings, f)
	}
	externalExists, err := pathExists(externalPath)
	if err != nil {
		return nil, fmt.Errorf("stat external.md: %w", err)
	}
	if !externalExists {
		f := finding("blocker", "external", "external.md", "external.md is missing.", "Write external.md (provider-side setup) before review.")
		findings = append(findings, f)
	}
	speakeasyExists, err := pathExists(speakeasyPath)
	if err != nil {
		return nil, fmt.Errorf("stat speakeasy.md: %w", err)
	}
	if !speakeasyExists {
		f := finding("blocker", "speakeasy", "speakeasy.md", "speakeasy.md is missing.", "Write speakeasy.md from doctrine/speakeasy-setup.md via the Dossier.")
		findings = append(findings, f)
	}
	if !externalExists || !speakeasyExists {
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
	findings = append(findings, externalFindings...)
	speakeasyFindings := lintSpeakeasy(string(speakeasy))
	findings = append(findings, speakeasyFindings...)

	_, externalBody := stripFrontmatter(string(external))
	externalLineOffset := 0
	if len(externalBody) < len(external) {
		externalLineOffset = strings.Count(string(external[:len(external)-len(externalBody)]), "\n")
	}
	findings = append(findings, lintURLPlacement([]byte(externalBody), "external", externalLineOffset)...)
	findings = append(findings, lintURLPlacement(speakeasy, "speakeasy", 0)...)

	var metaRaw string
	metaExists, err := pathExists(metaPath)
	if err != nil {
		return nil, fmt.Errorf("stat meta.yaml: %w", err)
	}
	schemaPath := filepath.Join(repoRoot, filepath.FromSlash(guideSchemaPath))
	if !metaExists {
		f := finding("blocker", "meta", "meta.yaml", "meta.yaml is missing.", "Write meta.yaml validating against schema/guide.v1.schema.json.")
		findings = append(findings, f)
	} else {
		schemaExists, statErr := pathExists(schemaPath)
		if statErr != nil {
			return nil, fmt.Errorf("stat %s: %w", guideSchemaPath, statErr)
		}
		if !schemaExists {
			f := finding("blocker", "meta", guideSchemaPath, "Guide schema file is missing; cannot validate meta.yaml.", "Restore schema/guide.v1.schema.json at the repo root.")
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
	findings = append(findings, agreement...)
	return findings, nil
}

// CheckMeta validates only meta.yaml, allowing host validation of partial exports.
func CheckMeta(guideDir, repoRoot string) ([]Finding, error) {
	repoRoot, err := filepath.Abs(repoRoot)
	if err != nil {
		return nil, fmt.Errorf("resolve repo root: %w", err)
	}
	guideDir, err = filepath.Abs(guideDir)
	if err != nil {
		return nil, fmt.Errorf("resolve guide directory: %w", err)
	}
	metaPath := filepath.Join(guideDir, "meta.yaml")
	schemaPath := filepath.Join(repoRoot, filepath.FromSlash(guideSchemaPath))
	metaExists, err := pathExists(metaPath)
	if err != nil {
		return nil, fmt.Errorf("stat meta.yaml: %w", err)
	}
	if !metaExists {
		return []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is missing.", "Write meta.yaml validating against schema/guide.v1.schema.json.")}, nil
	}
	schemaExists, err := pathExists(schemaPath)
	if err != nil {
		return nil, fmt.Errorf("stat %s: %w", guideSchemaPath, err)
	}
	if !schemaExists {
		return []Finding{finding("blocker", "meta", guideSchemaPath, "Guide schema file is missing; cannot validate meta.yaml.", "Restore schema/guide.v1.schema.json at the repo root.")}, nil
	}
	meta, err := os.ReadFile(metaPath)
	if err != nil {
		return nil, fmt.Errorf("read meta.yaml: %w", err)
	}
	return lintMeta(string(meta), schemaPath)
}

func lintExternal(raw string) []Finding {
	var out []Finding
	frontmatter, body := stripFrontmatter(raw)
	if frontmatter == nil {
		out = append(out, finding("blocker", "external", "frontmatter", "external.md is missing YAML frontmatter delimited by ---.", "Start the file with ---\\nsetup_version: 1\\n---"))
	} else {
		var parsed any
		if err := yaml.Unmarshal([]byte(*frontmatter), &parsed); err != nil {
			out = append(out, finding("blocker", "external", "frontmatter", "external.md frontmatter is not valid YAML.", "Fix the YAML between the opening and closing --- lines."))
		} else if fm, ok := parsed.(map[string]any); !ok || !numericOne(fm["setup_version"]) {
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
	out = append(out, lintTemplateKeys(body, "external")...)
	return out
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
	out = append(out, lintTemplateKeys(body, "speakeasy")...)
	return out
}

func lintURLPlacement(markdown []byte, target string, lineOffset int) []Finding {
	violations := FindURLPlacementViolations(markdown)
	out := make([]Finding, 0, len(violations))
	for _, violation := range violations {
		out = append(out, Finding{
			Severity:   "blocker",
			Target:     target,
			Where:      fmt.Sprintf("line %d, column %d", violation.Line+lineOffset, violation.Column),
			Problem:    "URL is not in a Markdown link or fenced code block: " + violation.Source,
			Suggestion: "URLs should either be Markdown links or appear in fenced code blocks. Use a link when the reader should open the URL; use a fenced code block when the reader should copy it.",
			Dimension:  "lint",
			Rule:       "url-placement",
		})
	}
	return out
}

func lintMeta(raw, schemaPath string) ([]Finding, error) {
	var data any
	if err := yaml.Unmarshal([]byte(raw), &data); err != nil {
		return []Finding{finding("blocker", "meta", "meta.yaml", "meta.yaml is not valid YAML: "+normalizeYAMLParseError(raw, err), "Fix YAML syntax so the file parses.")}, nil
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
		issues, normalizeErr := normalizeValidationError(validationErr)
		if normalizeErr != nil {
			return nil, normalizeErr
		}
		for _, issue := range issues {
			out = append(out, finding("blocker", "meta", issue.where, "meta.yaml failed schema: "+issue.message, "Fix the field so meta.yaml validates against schema/guide.v1.schema.json."))
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
	for _, id := range externalAnchors.ordered {
		all[id] = true
	}
	for _, id := range speakeasyAnchors.ordered {
		all[id] = true
	}
	if research != "" {
		researchAnchors := collectAnchors(research)
		for _, id := range externalAnchors.ordered {
			if !researchAnchors.set[id] {
				out = append(out, finding("blocker", "external", "#"+id, "external.md uses an anchor that does not appear in research.md (anchor contract).", "Mint the anchor in the Dossier first, or reuse a Dossier id verbatim."))
			}
		}
	}
	for _, match := range setupRefRE.FindAllStringSubmatch(meta, -1) {
		file, id := match[1], match[2]
		inFile := externalAnchors.set[id]
		if file == "speakeasy" {
			inFile = speakeasyAnchors.set[id]
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
		level, text, anchor, ok := parseHeadingLine(line)
		if ok {
			out = append(out, heading{level, text, anchor, i + 1, offset})
		}
		offset += len(line) + 1
	}
	return out
}

func parseHeadingLine(line string) (int, string, string, bool) {
	level := 0
	for level < len(line) && level < 6 && line[level] == '#' {
		level++
	}
	if level == 0 || level == len(line) || line[level] == '#' {
		return 0, "", "", false
	}

	separatorStart := level
	for level < len(line) {
		r, size := utf8.DecodeRuneInString(line[level:])
		if !isJSWhitespace(r) {
			break
		}
		level += size
	}
	if level == separatorStart {
		return 0, "", "", false
	}
	if level == len(line) {
		_, firstSize := utf8.DecodeRuneInString(line[separatorStart:])
		level = separatorStart + firstSize
		if level == len(line) {
			return 0, "", "", false
		}
	}

	rest := trimJSWhitespace(line[level:])
	if strings.ContainsAny(rest, "\r\n\u2028\u2029") {
		return 0, "", "", false
	}
	anchor := ""
	if open := strings.LastIndex(rest, "{#"); open >= 0 && strings.HasSuffix(rest, "}") {
		candidate := rest[open+2 : len(rest)-1]
		if headingAnchorRE.MatchString(candidate) {
			rest, anchor = trimJSWhitespace(rest[:open]), candidate
		}
	}
	return separatorStart, trimJSWhitespace(rest), anchor, true
}

func trimJSWhitespace(value string) string {
	return strings.TrimFunc(value, isJSWhitespace)
}

// isJSWhitespace matches ECMAScript \s, rather than Go's POSIX or Unicode spaces.
func isJSWhitespace(r rune) bool {
	switch r {
	case '\t', '\n', '\v', '\f', '\r', ' ', '\u00a0', '\u1680',
		'\u2028', '\u2029', '\u202f', '\u205f', '\u3000', '\ufeff':
		return true
	default:
		return r >= '\u2000' && r <= '\u200a'
	}
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

type anchors struct {
	ordered []string
	set     map[string]bool
}

func collectAnchors(md string) anchors {
	_, body := stripFrontmatter(md)
	out := anchors{set: map[string]bool{}}
	for _, h := range parseHeadings(body) {
		if h.anchor != "" && !out.set[h.anchor] {
			out.ordered = append(out.ordered, h.anchor)
			out.set[h.anchor] = true
		}
	}
	return out
}

type schemaIssue struct {
	where   string
	message string
}

func normalizeValidationError(validationErr *jsonschema.ValidationError) ([]schemaIssue, error) {
	if len(validationErr.Causes) == 0 {
		return normalizeValidationLeaf(validationErr)
	}

	causes := append([]*jsonschema.ValidationError(nil), validationErr.Causes...)
	sort.SliceStable(causes, func(i, j int) bool {
		left, right := validationCausePriority(causes[i]), validationCausePriority(causes[j])
		if left != right {
			return left < right
		}
		return causes[i].KeywordLocation < causes[j].KeywordLocation
	})
	var out []schemaIssue
	for _, cause := range causes {
		issues, err := normalizeValidationError(cause)
		if err != nil {
			return nil, err
		}
		out = append(out, issues...)
	}

	branch := ""
	if strings.HasSuffix(validationErr.KeywordLocation, "/then") {
		branch = "then"
	} else if strings.HasSuffix(validationErr.KeywordLocation, "/else") {
		branch = "else"
	}
	if branch != "" {
		out = append(out, schemaIssue{
			where:   schemaWhere(validationErr.InstanceLocation),
			message: fmt.Sprintf(`must match %q schema`, branch),
		})
	}
	return out, nil
}

func validationCausePriority(validationErr *jsonschema.ValidationError) int {
	switch {
	case strings.HasSuffix(validationErr.KeywordLocation, "/required"):
		return 0
	case strings.HasSuffix(validationErr.KeywordLocation, "/additionalProperties"):
		return 1
	default:
		return 2
	}
}

func normalizeValidationLeaf(validationErr *jsonschema.ValidationError) ([]schemaIssue, error) {
	keyword := validationErr.KeywordLocation
	if index := strings.LastIndex(keyword, "/"); index >= 0 {
		keyword = keyword[index+1:]
	}
	messages := []string{}
	switch keyword {
	case "required":
		for _, match := range quotedPropertyRE.FindAllStringSubmatch(validationErr.Message, -1) {
			messages = append(messages, fmt.Sprintf("must have required property '%s'", match[1]))
		}
	case "additionalProperties":
		for range quotedPropertyRE.FindAllStringSubmatch(validationErr.Message, -1) {
			messages = append(messages, "must NOT have additional properties")
		}
	case "const":
		messages = append(messages, "must be equal to constant")
	case "enum":
		messages = append(messages, "must be equal to one of the allowed values")
	case "type":
		match := expectedTypeRE.FindStringSubmatch(validationErr.Message)
		if match != nil {
			messages = append(messages, "must be "+match[1])
		}
	case "minLength":
		match := minimumRE.FindStringSubmatch(validationErr.Message)
		if match != nil {
			messages = append(messages, fmt.Sprintf("must NOT have fewer than %s characters", match[1]))
		}
	case "minimum":
		match := minimumRE.FindStringSubmatch(validationErr.Message)
		if match != nil {
			messages = append(messages, fmt.Sprintf("must be >= %s", match[1]))
		}
	case "pattern":
		const prefix = "does not match pattern '"
		if strings.HasPrefix(validationErr.Message, prefix) && strings.HasSuffix(validationErr.Message, "'") {
			pattern := strings.TrimSuffix(strings.TrimPrefix(validationErr.Message, prefix), "'")
			messages = append(messages, fmt.Sprintf(`must match pattern %q`, pattern))
		}
	case "format":
		match := formatRE.FindStringSubmatch(validationErr.Message)
		if match != nil {
			messages = append(messages, fmt.Sprintf(`must match format %q`, match[1]))
		}
	case "minItems":
		match := minimumRE.FindStringSubmatch(validationErr.Message)
		if match != nil {
			messages = append(messages, fmt.Sprintf("must NOT have fewer than %s items", match[1]))
		}
	case "uniqueItems":
		match := uniqueItemsRE.FindStringSubmatch(validationErr.Message)
		if match != nil {
			messages = append(messages, fmt.Sprintf("must NOT have duplicate items (items ## %s and %s are identical)", match[1], match[2]))
		}
	case "not":
		messages = append(messages, "must NOT be valid")
	default:
		return nil, fmt.Errorf("normalize meta.yaml schema keyword %q: unsupported validation error %q", keyword, validationErr.Message)
	}
	if len(messages) == 0 {
		return nil, fmt.Errorf("normalize meta.yaml schema keyword %q: unrecognized validation error %q", keyword, validationErr.Message)
	}
	out := make([]schemaIssue, 0, len(messages))
	for _, message := range messages {
		out = append(out, schemaIssue{where: schemaWhere(validationErr.InstanceLocation), message: message})
	}
	return out, nil
}

type yamlSyntaxToken struct {
	kind       rune
	line       int
	column     int
	lineSource string
}

func normalizeYAMLParseError(raw string, parseErr error) string {
	tokens := scanYAMLSyntax(raw)
	if strings.Contains(parseErr.Error(), "did not find expected alphabetic or numeric character") {
		errorLine := 0
		if match := yamlErrorLineRE.FindStringSubmatch(parseErr.Error()); match != nil {
			errorLine, _ = strconv.Atoi(match[1])
		}
		for _, token := range tokens {
			if token.kind == '*' && token.line == errorLine {
				return fmt.Sprintf("YAMLParseError: Alias cannot be an empty string at line %d, column %d:\n\n%s\n%s^\n", token.line, token.column, token.lineSource, strings.Repeat(" ", token.column-1))
			}
		}
	}

	var stack []yamlSyntaxToken
	var mismatch *yamlSyntaxToken
	for _, token := range tokens {
		switch token.kind {
		case '[', '{':
			stack = append(stack, token)
		case ']', '}':
			opener := rune('[')
			tokenName := "flow-seq-end"
			if token.kind == '}' {
				opener, tokenName = '{', "flow-map-end"
			}
			match := -1
			for i := len(stack) - 1; i >= 0; i-- {
				if stack[i].kind == opener {
					match = i
					break
				}
			}
			if match < 0 {
				if len(stack) == 0 {
					return fmt.Sprintf("YAMLParseError: Unexpected %s token in YAML stream: %q at line %d, column %d:\n\n%s\n%s^\n", tokenName, string(token.kind), token.line, token.column, token.lineSource, strings.Repeat(" ", token.column-1))
				}
				point := token
				mismatch = &point
				continue
			}
			if match != len(stack)-1 {
				point := token
				mismatch = &point
			}
			stack = append(stack[:match], stack[match+1:]...)
		}
	}

	if len(stack) != 0 {
		unclosed := stack[len(stack)-1]
		collection, closer := "sequence", ']'
		if unclosed.kind == '{' {
			collection, closer = "map", '}'
		}
		line, column, source := unclosed.line, utf8.RuneCountInString(unclosed.lineSource)+1, unclosed.lineSource
		if mismatch != nil {
			line, column, source = mismatch.line, mismatch.column, mismatch.lineSource
		}
		return fmt.Sprintf("YAMLParseError: Flow %s in block collection must be sufficiently indented and end with a %c at line %d, column %d:\n\n%s\n%s^\n", collection, closer, line, column, source, strings.Repeat(" ", column-1))
	}
	return "YAMLParseError: Invalid YAML"
}

func scanYAMLSyntax(raw string) []yamlSyntaxToken {
	var tokens []yamlSyntaxToken
	blockIndent, flowDepth := -1, 0
	singleQuoted, doubleQuoted := false, false
	for lineIndex, line := range strings.Split(raw, "\n") {
		runes := []rune(line)
		indent := 0
		for indent < len(runes) && runes[indent] == ' ' {
			indent++
		}
		if blockIndent >= 0 {
			if strings.TrimSpace(line) == "" || indent > blockIndent {
				continue
			}
			blockIndent = -1
		}

		escaped := false
		atNodeStart := !singleQuoted && !doubleQuoted
	lineScan:
		for columnIndex := 0; columnIndex < len(runes); columnIndex++ {
			r := runes[columnIndex]
			if doubleQuoted {
				if escaped {
					escaped = false
				} else if r == '\\' {
					escaped = true
				} else if r == '"' {
					doubleQuoted = false
				}
				continue
			}
			if singleQuoted {
				if r == '\'' {
					if columnIndex+1 < len(runes) && runes[columnIndex+1] == '\'' {
						columnIndex++
						continue
					}
					singleQuoted = false
				}
				continue
			}
			switch r {
			case '"':
				doubleQuoted, atNodeStart = true, false
			case '\'':
				singleQuoted, atNodeStart = true, false
			case '#':
				if columnIndex == 0 || runes[columnIndex-1] == ' ' || runes[columnIndex-1] == '\t' {
					break lineScan
				}
			case '[', '{':
				if atNodeStart || flowDepth > 0 {
					tokens = append(tokens, yamlSyntaxToken{r, lineIndex + 1, columnIndex + 1, line})
					flowDepth++
					atNodeStart = true
				}
			case ']', '}':
				if atNodeStart || flowDepth > 0 {
					tokens = append(tokens, yamlSyntaxToken{r, lineIndex + 1, columnIndex + 1, line})
					if flowDepth > 0 {
						flowDepth--
					}
					atNodeStart = false
				}
			case '*':
				if atNodeStart {
					tokens = append(tokens, yamlSyntaxToken{r, lineIndex + 1, columnIndex + 1, line})
				}
				atNodeStart = false
			case '|', '>':
				if atNodeStart && isBlockScalarHeader(runes, columnIndex) {
					blockIndent = indent
				}
				atNodeStart = false
			case ':':
				if columnIndex+1 == len(runes) || runes[columnIndex+1] == ' ' || runes[columnIndex+1] == '\t' {
					atNodeStart = true
				}
			case ',':
				if flowDepth > 0 {
					atNodeStart = true
				}
			case ' ', '\t':
			default:
				atNodeStart = false
			}
		}
	}
	return tokens
}

func isBlockScalarHeader(line []rune, index int) bool {
	if index > 0 && line[index-1] != ' ' && line[index-1] != '\t' && line[index-1] != ':' {
		return false
	}
	for _, r := range line[index+1:] {
		if r == '#' {
			return true
		}
		if r != ' ' && r != '\t' && r != '+' && r != '-' && (r < '0' || r > '9') {
			return false
		}
	}
	return true
}

func schemaWhere(instanceLocation string) string {
	if instanceLocation == "" {
		return "meta.yaml"
	}
	return instanceLocation
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
