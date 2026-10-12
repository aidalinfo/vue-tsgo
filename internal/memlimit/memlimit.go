// Package memlimit keeps the Go heap ceiling (GOMEMLIMIT) of a running tsgo in
// sync with the vue-go-tsc launcher.
//
// The launcher derives GOMEMLIMIT from the machine's RAM, the RAM currently
// available and the number of concurrent vue-go-tsc runs. Those inputs change
// during a long typecheck: when a concurrent run finishes, its memory becomes
// available again, and a run started next to others must not stay stuck with
// the small share it got at startup (the GC would then run near-continuously).
//
// The launcher passes one end of a socket as an inherited file descriptor
// (VUE_GO_TSC_MEMLIMIT_FD). Over it, line by line:
//
//	tsgo     -> launcher: "usage <bytes>"  memory currently held by this process
//	launcher -> tsgo:     "limit <bytes>"  new soft heap ceiling
//
// The launcher needs the usage because the RAM it sees as available excludes
// what tsgo already holds.
package memlimit

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"runtime/debug"
	"runtime/metrics"
	"strconv"
	"strings"
	"time"
)

// EnvFD names the environment variable holding the channel's file descriptor.
const EnvFD = "VUE_GO_TSC_MEMLIMIT_FD"

// ReportInterval is how often the memory usage is reported to the launcher.
const ReportInterval = time.Second

// FollowLauncher serves the launcher's channel when the launcher opened one.
// It returns immediately; the channel is served in the background.
func FollowLauncher() {
	value, ok := os.LookupEnv(EnvFD)
	if !ok {
		return
	}
	// The channel belongs to this process only: keep it (and its variable)
	// away from the processes tsgo starts, such as the Volar codegen.
	os.Unsetenv(EnvFD)
	fd, err := strconv.Atoi(value)
	if err != nil || fd < 3 || !closeOnExec(fd) {
		return
	}
	f := os.NewFile(uintptr(fd), "vue-go-tsc-memlimit")
	if f == nil {
		return
	}
	go Report(f, ReportInterval, Usage)
	go Apply(f, func(limit int64) { debug.SetMemoryLimit(limit) })
}

// Usage returns the memory this process holds from the OS: everything the Go
// runtime has mapped, minus the heap memory already returned to the OS.
func Usage() int64 {
	samples := []metrics.Sample{
		{Name: "/memory/classes/total:bytes"},
		{Name: "/memory/classes/heap/released:bytes"},
	}
	metrics.Read(samples)
	return int64(samples[0].Value.Uint64()) - int64(samples[1].Value.Uint64())
}

// Report writes the current usage to w every interval until a write fails
// (the launcher is gone).
func Report(w io.Writer, interval time.Duration, usage func() int64) {
	for {
		if _, err := fmt.Fprintf(w, "usage %d\n", usage()); err != nil {
			return
		}
		time.Sleep(interval)
	}
}

// Apply reads "limit <bytes>" lines from r and passes each valid limit to set,
// until r is closed. Malformed lines are ignored.
func Apply(r io.Reader, set func(int64)) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		value, ok := strings.CutPrefix(scanner.Text(), "limit ")
		if !ok {
			continue
		}
		limit, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
		if err != nil || limit <= 0 {
			continue
		}
		set(limit)
	}
}
