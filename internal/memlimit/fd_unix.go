//go:build unix

package memlimit

import "syscall"

// closeOnExec marks an inherited descriptor close-on-exec so that child
// processes do not inherit it.
func closeOnExec(fd int) bool {
	syscall.CloseOnExec(fd)
	return true
}
