package factorycontroller

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"unicode/utf8"
)

func TestEvidenceChunkReads(t *testing.T) {
	e, dir := evidenceFixture(t)
	data := []byte(strings.Repeat("Quoted \" fact — 中文\n", 1000))
	if err := e.write("dossier.md", data); err != nil {
		t.Fatal(err)
	}
	ref, _, err := e.reference("dossier.md", data)
	if err != nil {
		t.Fatal(err)
	}
	var got []byte
	for _, chunk := range ref.Chunks {
		if chunk.Offset != len(got) || chunk.Bytes > 4096 || chunk.Bytes < 1 {
			t.Fatal("invalid chunk coverage")
		}
		cmd := exec.Command("sh", "-c", chunk.ReadCommand)
		cmd.Dir = filepath.Dir(filepath.Dir(dir))
		b, err := cmd.Output()
		if err != nil || len(b) != chunk.Bytes || !utf8.Valid(b) || fmt.Sprintf("%x", sha256.Sum256(b)) != chunk.SHA256 {
			t.Fatal("invalid read")
		}
		got = append(got, b...)
	}
	if !bytes.Equal(got, data) {
		t.Fatal("incomplete evidence")
	}
}
