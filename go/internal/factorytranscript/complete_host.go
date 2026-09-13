package factorytranscript

import (
	"context"
	"encoding/json"
	"io"
	"os"
	"syscall"
)

// removeOwned checks the original deadline between bounded directory batches.
// It never follows a symlink and keeps only the already-approved host/result.json.
func removeOwned(ctx context.Context, root *os.Root, name string, depth int) error {
	if ctx.Err() != nil || depth > 128 {
		return errUnsafe
	}
	before, err := root.Lstat(name)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return errUnsafe
	}
	if !before.IsDir() {
		return root.Remove(name)
	}
	child, err := root.OpenRoot(name)
	if err != nil {
		return errUnsafe
	}
	defer child.Close()
	actual, err := child.Stat(".")
	if err != nil || !os.SameFile(before, actual) {
		return errUnsafe
	}
	f, err := child.Open(".")
	if err != nil {
		return errUnsafe
	}
	defer f.Close()
	for {
		entries, e := f.ReadDir(32)
		if e != nil && e != io.EOF {
			return errUnsafe
		}
		for _, entry := range entries {
			if err = removeOwned(ctx, child, entry.Name(), depth+1); err != nil {
				return err
			}
		}
		if e == io.EOF {
			break
		}
	}
	now, err := root.Lstat(name)
	if err != nil || !os.SameFile(before, now) {
		return errUnsafe
	}
	return root.Remove(name)
}

// CleanupPrivate is independent of publication paths and always runs after
// confirmed removal, including worker configuration/stage/result-write failures.
func CleanupPrivate(ctx context.Context, private string) error {
	b := &sourceBoundary{}
	defer b.close()
	owned, err := b.root(private)
	if err != nil {
		return errUnsafe
	}
	st, err := owned.Stat(".")
	if err != nil {
		return errUnsafe
	}
	sys, ok := st.Sys().(*syscall.Stat_t)
	if !ok || sys.Uid != uint32(os.Geteuid()) || st.Mode().Perm()&0077 != 0 {
		return errUnsafe
	}
	f, err := owned.Open(".")
	if err != nil {
		return errUnsafe
	}
	defer f.Close()
	for {
		entries, e := f.ReadDir(32)
		if e != nil && e != io.EOF {
			return errUnsafe
		}
		for _, entry := range entries {
			if entry.Name() == "host" {
				host, e := b.directory(owned, "host")
				if e != nil {
					return errUnsafe
				}
				names, e := host.Open(".")
				if e != nil {
					return errUnsafe
				}
				for {
					batch, e := names.ReadDir(32)
					if e != nil && e != io.EOF {
						names.Close()
						return errUnsafe
					}
					for _, item := range batch {
						if item.Name() == "result.json" {
							st, e := host.Lstat(item.Name())
							if e == nil && singleRegular(st) {
								continue
							}
						}
						if e = removeOwned(ctx, host, item.Name(), 0); e != nil {
							names.Close()
							return e
						}
					}
					if e == io.EOF {
						break
					}
				}
				names.Close()
			} else if err = removeOwned(ctx, owned, entry.Name(), 0); err != nil {
				return errUnsafe
			}
		}
		if e == io.EOF {
			break
		}
	}
	return ctx.Err()
}

// CompleteHost runs in the SURVIVING supervisor, never the killable worker.
// The worker only writes .finalizing; no guide/success is visible until raw
// records are removed. All work shares the original overall deadline.
func CompleteHost(ctx, eligibility context.Context, private, export string, workerOK, stageOwned bool) (ret error) {
	cleanupErr := CleanupPrivate(ctx, private)
	b := &sourceBoundary{}
	defer b.close()
	if !disjoint(private, export) {
		return errUnsafe
	}
	owned, err := b.root(private)
	if err != nil {
		return errUnsafe
	}
	out, err := b.root(export)
	if err != nil {
		return errUnsafe
	}
	for _, root := range []*os.Root{owned, out} {
		st, e := root.Stat(".")
		if e != nil {
			return errUnsafe
		}
		sys, ok := st.Sys().(*syscall.Stat_t)
		if !ok || sys.Uid != uint32(os.Geteuid()) || st.Mode().Perm()&0077 != 0 {
			return errUnsafe
		}
	}
	promoted := false
	state := finalization{Version: 1, Primary: "failed", Readable: "failed", Partial: true}
	defer func() {
		if ret == nil && eligibility.Err() != nil {
			ret = errUnsafe
		}
		if stageOwned {
			if e := out.RemoveAll(".finalizing"); e != nil {
				ret = errUnsafe
			}
		}
		if ret != nil {
			state.PublicationReady = false
		}
		data, _ := json.Marshal(state)
		if writeFinal(out, "finalization.json", data) != nil {
			ret = errUnsafe
		}
		// Commit arbitration is this last synchronous eligibility observation.
		// Cancellation before it revokes; cancellation afterward is post-completion.
		if ret == nil && eligibility.Err() != nil {
			ret = errUnsafe
		}
		if ret != nil {
			if promoted {
				_ = out.RemoveAll("guide")
			}
			_ = writeFinal(out, "run-report.json", failedReport)
			state.PublicationReady = false
			data, _ = json.Marshal(state)
			_ = writeFinal(out, "finalization.json", data)
		}
	}()
	if cleanupErr != nil || !stageOwned {
		return errUnsafe
	}
	if _, e := out.Lstat("guide"); !os.IsNotExist(e) {
		return errUnsafe
	}
	if ctx.Err() != nil {
		return errUnsafe
	}
	stage, err := b.directory(out, ".finalizing")
	if err != nil {
		return errUnsafe
	}
	data, err := b.read(stage, "finalization.json")
	if err != nil || json.Unmarshal(data, &state) != nil || state.Version != 1 {
		return errUnsafe
	}
	data, err = b.read(stage, "run-report.json")
	if err != nil {
		return errUnsafe
	}
	report, err := decodeReport(data)
	if err != nil {
		return errUnsafe
	}
	// Retain only complete safe worker artifacts, never pending/raw files.
	for _, name := range []string{"session-transcript.json", "execution-transcript.json", "factory-diagnostics.json"} {
		info, e := stage.Lstat(name)
		if os.IsNotExist(e) {
			continue
		}
		if e != nil || !singleRegular(info) || info.Size() > 2<<20 {
			return errUnsafe
		}
		if e = out.Rename(".finalizing/"+name, name); e != nil {
			return errUnsafe
		}
	}
	if !workerOK || eligibility.Err() != nil {
		return errUnsafe
	}
	if report["outcome"] == "converged" {
		if !state.PublicationReady || state.Readable != "ready" {
			return errUnsafe
		}
		guide, e := b.directory(stage, "guide")
		if e != nil {
			return errUnsafe
		}
		for _, name := range guideNames {
			info, e := guide.Lstat(name)
			if e != nil || !singleRegular(info) {
				return errUnsafe
			}
		}
		if eligibility.Err() != nil || ctx.Err() != nil {
			return errUnsafe
		}
		if e = out.Rename(".finalizing/guide", "guide"); e != nil {
			return errUnsafe
		}
		promoted = true
	} else {
		state.PublicationReady = false
	}
	if ctx.Err() != nil || eligibility.Err() != nil {
		return errUnsafe
	}
	return writeFinal(out, "run-report.json", data)
}
