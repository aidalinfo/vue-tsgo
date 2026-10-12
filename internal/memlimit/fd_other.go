//go:build !unix

package memlimit

// closeOnExec reports that inherited descriptors are not supported: the
// launcher only opens the channel on Unix.
func closeOnExec(fd int) bool {
	return false
}
