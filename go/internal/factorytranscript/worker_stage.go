package factorytranscript

import "errors"

// Worker codes 40–48 are a stable host/worker protocol, below signal exits.
// Stages describe observed boundaries, never model-authored explanations.
const (
	workerInput = 40 + iota
	workerStore
	workerDecode
	workerExport
	workerGuide
	workerMetadata
	workerCleanup
	workerState
	workerLimits
)

type workerStageError struct {
	code int
	err  error
}

func (e *workerStageError) Error() string { return WorkerHostReason(e.code) }
func (e *workerStageError) Unwrap() error { return e.err }
func stageError(code int, err error) error {
	if err == nil {
		return nil
	}
	var prior *workerStageError
	if errors.As(err, &prior) {
		return err
	}
	return &workerStageError{code, err}
}

// WorkerExitCode preserves the conventional exit 1 for unspecified errors.
func WorkerExitCode(err error) int {
	if err == nil {
		return 0
	}
	var stage *workerStageError
	if errors.As(err, &stage) && WorkerHostReason(stage.code) != "worker_failed" {
		return stage.code
	}
	return 1
}
func WorkerHostReason(code int) string {
	switch code {
	case workerInput:
		return "worker_input_failed"
	case workerStore:
		return "worker_store_failed"
	case workerDecode:
		return "worker_decode_failed"
	case workerExport:
		return "worker_export_failed"
	case workerGuide:
		return "worker_guide_failed"
	case workerMetadata:
		return "worker_metadata_failed"
	case workerCleanup:
		return "worker_cleanup_failed"
	case workerState:
		return "worker_state_failed"
	case workerLimits:
		return "worker_limits_failed"
	default:
		return "worker_failed"
	}
}
