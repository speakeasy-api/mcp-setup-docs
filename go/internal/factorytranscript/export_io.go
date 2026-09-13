package factorytranscript

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
)

type readableSession struct {
	Ref string `json:"session_ref"`
	decodedSession
}
type readableFile struct {
	Name string `json:"name"`
	Text string `json:"text"`
}
type readableArtifact struct {
	Version   int               `json:"schema_version"`
	Kind      string            `json:"kind"`
	Limited   bool              `json:"limited"`
	Omissions []string          `json:"omissions"`
	Sessions  []readableSession `json:"sessions"`
	Files     []readableFile    `json:"files"`
}

// sourceBoundary uses the same component-by-component os.Root/identity pattern
// as factoryrun's control directory. All descriptors remain anchored until commit.
type sourceBoundary struct {
	roots                            []*os.Root
	checks                           []func() bool
	entries, bytes, sessions, events int
}

func (b *sourceBoundary) close() {
	for i := len(b.roots) - 1; i >= 0; i-- {
		b.roots[i].Close()
	}
}
func (b *sourceBoundary) directory(parent *os.Root, name string) (*os.Root, error) {
	before, err := parent.Lstat(name)
	if err != nil {
		return nil, err
	}
	if !before.IsDir() || before.Mode()&os.ModeSymlink != 0 {
		return nil, errUnsafe
	}
	child, err := parent.OpenRoot(name)
	if err != nil {
		return nil, errUnsafe
	}
	b.roots = append(b.roots, child)
	actual, err := child.Stat(".")
	if err != nil || !os.SameFile(before, actual) {
		return nil, errUnsafe
	}
	b.checks = append(b.checks, func() bool {
		now, err := parent.Lstat(name)
		return err == nil && now.IsDir() && os.SameFile(before, now)
	})
	return child, nil
}
func (b *sourceBoundary) root(path string) (*os.Root, error) {
	if !filepath.IsAbs(path) || filepath.Clean(path) != path || path == "/" {
		return nil, errUnsafe
	}
	root, err := os.OpenRoot("/")
	if err != nil {
		return nil, errUnsafe
	}
	b.roots = append(b.roots, root)
	parts := strings.Split(strings.TrimPrefix(path, "/"), "/")
	if len(parts) > 64 {
		return nil, errUnsafe
	}
	for _, part := range parts {
		root, err = b.directory(root, part)
		if err != nil {
			return nil, errUnsafe
		}
	}
	return root, nil
}
func singleRegular(info os.FileInfo) bool {
	st, ok := info.Sys().(*syscall.Stat_t)
	return ok && info.Mode().IsRegular() && st.Nlink == 1
}
func unchanged(a, b os.FileInfo) bool {
	return os.SameFile(a, b) && singleRegular(b) && a.Size() == b.Size() && a.Mode() == b.Mode() && a.ModTime() == b.ModTime()
}
func (b *sourceBoundary) read(root *os.Root, name string) ([]byte, error) {
	before, err := root.Lstat(name)
	if err != nil {
		return nil, err
	}
	if !singleRegular(before) || before.Size() > 1<<20 || b.bytes+int(before.Size()) > 8<<20 {
		return nil, errUnsafe
	}
	file, err := root.OpenFile(name, os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil, errUnsafe
	}
	defer file.Close()
	actual, err := file.Stat()
	if err != nil || !unchanged(before, actual) {
		return nil, errUnsafe
	}
	data, err := io.ReadAll(io.LimitReader(file, (1<<20)+1))
	if err != nil || len(data) > 1<<20 {
		return nil, errUnsafe
	}
	after, err := file.Stat()
	if err != nil || !unchanged(before, after) || int64(len(data)) != before.Size() {
		return nil, errUnsafe
	}
	b.bytes += len(data)
	b.checks = append(b.checks, func() bool { now, err := root.Lstat(name); return err == nil && unchanged(before, now) })
	return data, nil
}
func (b *sourceBoundary) names(root *os.Root) ([]string, error) {
	f, err := root.Open(".")
	if err != nil {
		return nil, errUnsafe
	}
	defer f.Close()
	// Read at most the remaining global entry allowance plus one sentinel, never
	// filepath.Glob/Walk or os.ReadDir's unbounded whole-directory allocation.
	entries, err := f.ReadDir(4097 - b.entries)
	if err != nil && err != io.EOF {
		return nil, errUnsafe
	}
	b.entries += len(entries)
	if b.entries > 4096 {
		return nil, errUnsafe
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.Name())
	}
	sort.Strings(names)
	return names, nil
}
func disjoint(a, b string) bool {
	return a != b && !strings.HasPrefix(a, b+"/") && !strings.HasPrefix(b, a+"/")
}

// Export reads stopped-model private storage and creates a NEW output only.
// The caller must have removed the owned container and excluded other writers.
// Existing outputs (including aliases) are refused, never removed or overwritten.
// No host integration/publication eligibility is implied by this library call.
func Export(home, workspace, output string, known []string) error {
	return exportWithSanitizer(home, workspace, output, known, NewSanitizer)
}
func exportWithSanitizer(home, workspace, output string, known []string, newScanner func([]string) (*Sanitizer, error)) error {
	boundary := &sourceBoundary{}
	defer boundary.close()
	if !filepath.IsAbs(output) || filepath.Clean(output) != output {
		return errUnsafe
	}
	parent, name := filepath.Dir(output), filepath.Base(output)
	if !disjoint(home, workspace) || !disjoint(parent, home) || !disjoint(parent, workspace) {
		return errUnsafe
	}
	h, err := boundary.root(home)
	if err != nil {
		return errUnsafe
	}
	w, err := boundary.root(workspace)
	if err != nil {
		return errUnsafe
	}
	out, err := boundary.root(parent)
	if err != nil {
		return errUnsafe
	}
	info, err := out.Stat(".")
	if err != nil {
		return errUnsafe
	}
	st, ok := info.Sys().(*syscall.Stat_t)
	if !ok || st.Uid != uint32(os.Geteuid()) || info.Mode().Perm()&0077 != 0 {
		return errUnsafe
	}
	if _, err = out.Lstat(name); !os.IsNotExist(err) {
		return errUnsafe
	}
	doc := readableArtifact{Version: 1, Kind: "guide_factory_readable_transcript", Omissions: []string{"metadata_and_unselected_files"}, Sessions: []readableSession{}, Files: []readableFile{}, Limited: true}
	kit, err := boundary.directory(h, ".kit")
	if err != nil {
		return errUnsafe
	}
	sessions, err := boundary.directory(kit, "sessions")
	if err != nil {
		return errUnsafe
	}
	dirs, err := boundary.names(sessions)
	if err != nil {
		return errUnsafe
	}
	count := 0
	for _, dir := range dirs {
		if !strings.HasPrefix(dir, "w-") {
			continue
		}
		count++
		if count > 64 {
			return errUnsafe
		}
		root, err := boundary.directory(sessions, dir)
		if err != nil {
			return errUnsafe
		}
		names, err := boundary.names(root)
		if err != nil {
			return errUnsafe
		}
		for _, name := range names {
			if !strings.HasSuffix(name, ".jsonl") {
				continue
			}
			boundary.sessions++
			if boundary.sessions > 64 {
				return errUnsafe
			}
			data, err := boundary.read(root, name)
			if err != nil {
				return errUnsafe
			}
			session, err := decodeSession(data)
			if err != nil {
				return errUnsafe
			}
			boundary.events += len(session.Events)
			if boundary.events > 4096 {
				return errUnsafe
			}
			reference := fmt.Sprintf("session-%d", len(doc.Sessions)+1)
			for i := range session.Events {
				e := &session.Events[i]
				if e.CallRef != "" {
					e.CallRef = reference + "-" + e.CallRef
				}
			}
			doc.Sessions = append(doc.Sessions, readableSession{reference, session})
		}
	}
	// Exact coordinator-owned public research record names only. Never handles,
	// input assignments, catalogs, credentials, raw stderr, or artifact links.
	factory, err := boundary.directory(w, ".factory")
	if err != nil && !os.IsNotExist(err) {
		return errUnsafe
	}
	if err == nil {
		if e := boundary.snapshots(w, factory, &doc); e != nil {
			return errUnsafe
		}
		research, e := boundary.directory(factory, "research")
		if e != nil && !os.IsNotExist(e) {
			return errUnsafe
		}
		if e == nil {
			names := []string{"dossier.md"}
			for topic := 1; topic <= 5; topic++ {
				for index := 0; index <= 2; index++ {
					for _, suffix := range []string{"prompt.md", "report.md"} {
						names = append(names, fmt.Sprintf("topic-%d-%d.%s", topic, index, suffix))
					}
				}
			}
			for _, name := range names {
				data, e := boundary.read(research, name)
				if os.IsNotExist(e) {
					continue
				}
				if e != nil {
					return errUnsafe
				}
				doc.Files = append(doc.Files, readableFile{"research/" + name, string(data)})
			}
		}
	}
	if factory == nil {
		doc.Omissions = append(doc.Omissions, "missing_candidate_report")
	}
	omitConfidential(&doc)
	sanitizer, err := newScanner(known)
	if err != nil {
		return errUnsafe
	}
	closed := false
	defer func() {
		if !closed {
			_ = sanitizer.Close()
		}
	}()
	// Scan decoded strings twice with ONE instance: discoveries in later fields
	// must redact earlier fields before the final serialized document is scanned.
	for pass := 0; pass < 2; pass++ {
		for i := range doc.Sessions {
			for j := range doc.Sessions[i].Events {
				e := &doc.Sessions[i].Events[j]
				for k, text := range e.Text {
					clean, e2 := sanitizeDecoded(sanitizer, text, 0)
					if e2 != nil {
						return errUnsafe
					}
					e.Text[k] = clean
				}
			}
		}
		for i := range doc.Files {
			clean, e := sanitizeDecoded(sanitizer, doc.Files[i].Text, 0)
			if e != nil {
				return errUnsafe
			}
			doc.Files[i].Text = clean
		}
	}
	data, err := json.MarshalIndent(doc, "", "  ")
	if err != nil || len(data) > 2<<20 {
		return errUnsafe
	}
	final, err := sanitizer.Sanitize(data)
	if err != nil || !bytes.Equal(final, data) || !json.Valid(final) {
		return errUnsafe
	}
	err = sanitizer.Close()
	closed = true
	if err != nil {
		return errUnsafe
	}
	for _, check := range boundary.checks {
		if !check() {
			return errUnsafe
		}
	}
	nonce := make([]byte, 16)
	if _, err = rand.Read(nonce); err != nil {
		return errUnsafe
	}
	tmp := ".transcript-" + hex.EncodeToString(nonce)
	file, err := out.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_EXCL|syscall.O_NOFOLLOW, 0600)
	if err != nil {
		return errUnsafe
	}
	defer out.Remove(tmp)
	_, writeErr := file.Write(final)
	syncErr := file.Sync()
	frozen, statErr := file.Stat()
	closeErr := file.Close()
	if writeErr != nil || syncErr != nil || closeErr != nil || statErr != nil {
		return errUnsafe
	}
	for _, check := range boundary.checks {
		if !check() {
			return errUnsafe
		}
	}
	if _, err = out.Lstat(name); !os.IsNotExist(err) {
		return errUnsafe
	}
	current, e := out.Lstat(tmp)
	if e != nil || !unchanged(frozen, current) {
		return errUnsafe
	}
	if err = out.Rename(tmp, name); err != nil {
		return errUnsafe
	}
	return nil
}

// Decode nested JSON strings before secret matching, including escaped keys.
// This operates only on already-selected text; it does not select more sources.
func sanitizeDecoded(s *Sanitizer, text string, depth int) (string, error) {
	if depth > 32 || len(text) > 1<<20 {
		return "", errUnsafe
	}
	d := json.NewDecoder(strings.NewReader(text))
	d.UseNumber()
	value, parseErr := readValue(d, depth)
	if json.Valid([]byte(text)) && parseErr != nil {
		return "", errUnsafe
	}
	if parseErr == nil {
		if _, e := d.Token(); e != io.EOF {
			return "", errUnsafe
		}
		var walk func(any) (any, error)
		walk = func(v any) (any, error) {
			switch x := v.(type) {
			case string:
				return sanitizeDecoded(s, x, depth+1)
			case []any:
				for i, v := range x {
					clean, e := walk(v)
					if e != nil {
						return nil, e
					}
					x[i] = clean
				}
				return x, nil
			case map[string]any:
				// Native handles can also occur in ordinary Assistant Text, not
				// only ToolResult. Recognize the structure, never an ID spelling.
				_, hasID := x["id"]
				_, hasGeneration := x["generation"]
				output, hasOutput := x["output"]
				if hasID && hasGeneration && hasOutput {
					id, ok := x["id"].(string)
					if !ok || id == "" {
						return nil, errUnsafe
					}
					generation, ok := x["generation"].(json.Number)
					if !ok {
						return nil, errUnsafe
					}
					n, e := generation.Int64()
					if e != nil || n < 1 {
						return nil, errUnsafe
					}
					selected, e := projectToolText(output, depth+1)
					if e != nil {
						return nil, errUnsafe
					}
					values := make([]any, len(selected))
					for i, text := range selected {
						values[i] = text
					}
					return walk(map[string]any{"output": values, "omissions": []any{"native_handle_metadata"}})
				}
				out := map[string]any{}
				for k, v := range x {
					key, e := sanitizeDecoded(s, k, depth+1)
					if e != nil {
						return nil, e
					}
					if _, exists := out[key]; exists {
						return nil, errUnsafe
					}
					clean, e := walk(v)
					if e != nil {
						return nil, e
					}
					out[key] = clean
				}
				return out, nil
			default:
				return v, nil
			}
		}
		clean, e := walk(value)
		if e != nil {
			return "", errUnsafe
		}
		b, e := json.Marshal(clean)
		if e != nil {
			return "", errUnsafe
		}
		text = string(b)
	}
	clean, err := s.Sanitize([]byte(text))
	return string(clean), err
}
