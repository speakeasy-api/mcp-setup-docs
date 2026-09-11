//go:build linux || darwin

package factoryresearch

import (
	"context"
	"os/exec"
	"syscall"
	"time"
)

const noFollow = syscall.O_NOFOLLOW | syscall.O_NONBLOCK

// WaitDelay bounds inherited pipes even when a descendant outlives its parent.
func supervise(ctx context.Context, cmd *exec.Cmd) int {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.WaitDelay = 100 * time.Millisecond
	if ctx.Err() != nil {
		return -1
	}
	if cmd.Start() != nil {
		return -1
	}
	pid := cmd.Process.Pid
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	select {
	case <-done:
		syscall.Kill(-pid, syscall.SIGKILL)
	case <-ctx.Done():
		syscall.Kill(-pid, syscall.SIGTERM)
		select {
		case <-done:
		case <-time.After(100 * time.Millisecond):
			syscall.Kill(-pid, syscall.SIGKILL)
			<-done
		}
		syscall.Kill(-pid, syscall.SIGKILL)
	}
	if cmd.ProcessState != nil {
		return cmd.ProcessState.ExitCode()
	}
	return -1
}
