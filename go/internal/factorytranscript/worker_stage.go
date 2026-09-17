package factorytranscript

import (
	"encoding/json"
	"errors"
)

// Worker codes 40–55 are a stable host/worker protocol, below signal exits.
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
	workerExportScannerInit
	workerExportFields
	workerExportFinalScan
	workerExportScannerClose
	workerExportSourceChanged
	workerExportWrite
	workerExportReadback
)

type workerStageError struct {
	code  int
	err   error
	limit *LimitDiagnostic
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
	return &workerStageError{code: code, err: err}
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
	case workerExportScannerInit:
		return "worker_export_scanner_init_failed"
	case workerExportFields:
		return "worker_export_fields_failed"
	case workerExportFinalScan:
		return "worker_export_final_scan_failed"
	case workerExportScannerClose:
		return "worker_export_scanner_close_failed"
	case workerExportSourceChanged:
		return "worker_export_source_changed"
	case workerExportWrite:
		return "worker_export_write_failed"
	case workerExportReadback:
		return "worker_export_readback_failed"
	default:
		return "worker_failed"
	}
}

// LimitDiagnostic contains source-defined measurements only, never source names
// or error text. It does not establish publication eligibility.
type LimitDiagnostic struct {
	Category string `json:"category"`
	Observed int64  `json:"observed"`
	Allowed  int64  `json:"allowed"`
}

func limitError(category string, observed, allowed int64) error {
	return &workerStageError{code: workerLimits, err: errUnsafe, limit: &LimitDiagnostic{category, observed, allowed}}
}
func (e *workerStageError) MarshalJSON() ([]byte, error) { return json.Marshal(e.limit) }
