//go:build !linux && !darwin

package factoryresearch

import (
	"context"
	"os/exec"
)

func supervise(context.Context, *exec.Cmd) int { return -1 }

const noFollow = 0
