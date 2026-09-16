package factorycontroller

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"os"
)

// References convey data only. Authority always remains in the trusted prompt.
type evidenceReference struct {
	Path   string `json:"path"`
	Bytes  int    `json:"bytes"`
	SHA256 string `json:"sha256"`
}

func (e *Evidence) reference(name string, expected []byte) (evidenceReference, os.FileInfo, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if !e.valid() {
		return evidenceReference{}, nil, errEvidence
	}
	before, err := e.research.Lstat(name)
	if err != nil || !evidencePrivate(before, false) {
		return evidenceReference{}, nil, errEvidence
	}
	actual, err := e.read(name)
	after, statErr := e.research.Lstat(name)
	if err != nil || statErr != nil || !os.SameFile(before, after) || !bytes.Equal(actual, expected) {
		return evidenceReference{}, nil, errEvidence
	}
	return evidenceReference{Path: ".factory/research/" + name, Bytes: len(actual), SHA256: fmt.Sprintf("%x", sha256.Sum256(actual))}, after, nil
}
func (e *Evidence) verifyReference(name string, expected []byte, before os.FileInfo) error {
	_, after, err := e.reference(name, expected)
	if err != nil || before == nil || !os.SameFile(before, after) || before.Size() != after.Size() || !before.ModTime().Equal(after.ModTime()) {
		return errEvidence
	}
	return nil
}
