package golar

import (
	"bytes"
	"cmp"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"runtime/metrics"
	"runtime/pprof"
	"slices"
	"strconv"
	"strings"
	"time"
)

// Memory watchdog, for diagnosing runs that get OOM-killed before they can
// write a profile (--pprofDir only writes on a clean exit).
//
// VUE_GO_TSC_MEMWATCH=<dir> starts it: each time the process memory crosses a
// new multiple of VUE_GO_TSC_MEMWATCH_STEP (default 1GiB), it writes
// <dir>/memwatch-<pid>-<n>.txt with the Go runtime memory breakdown, what every
// goroutine is doing at that moment, and the live heap by allocation site.
// Everything is plain text, readable without the Go toolchain.

const (
	memwatchPollInterval = 100 * time.Millisecond
	memwatchDefaultStep  = 1 << 30
	// Goroutine dumps beyond this are truncated: the checker runs on one or a
	// few goroutines, the rest are idle workers.
	memwatchMaxGoroutineDump = 256 << 10
	memwatchTopSites         = 40
	memwatchStackDepth       = 12
)

func init() {
	dir, ok := os.LookupEnv("VUE_GO_TSC_MEMWATCH")
	if !ok || dir == "" {
		return
	}
	step := uint64(memwatchDefaultStep)
	if s := os.Getenv("VUE_GO_TSC_MEMWATCH_STEP"); s != "" {
		parsed, err := parseByteSize(s)
		if err != nil || parsed == 0 {
			fmt.Fprintf(os.Stderr, "vue-go-tsc: invalid VUE_GO_TSC_MEMWATCH_STEP %q\n", s)
			os.Exit(1)
		}
		step = parsed
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "vue-go-tsc: memwatch: %v\n", err)
		os.Exit(1)
	}
	w := &memWatch{dir: dir, step: step, start: time.Now()}
	go w.run()
}

// parseByteSize parses a byte count with an optional KiB/MiB/GiB suffix (the
// GOMEMLIMIT syntax).
func parseByteSize(s string) (uint64, error) {
	s = strings.TrimSpace(s)
	mult := uint64(1)
	for _, u := range []struct {
		suffix string
		mult   uint64
	}{{"KiB", 1 << 10}, {"MiB", 1 << 20}, {"GiB", 1 << 30}, {"B", 1}} {
		if before, ok := strings.CutSuffix(s, u.suffix); ok {
			s, mult = before, u.mult
			break
		}
	}
	n, err := strconv.ParseUint(strings.TrimSpace(s), 10, 64)
	if err != nil {
		return 0, err
	}
	return n * mult, nil
}

type memWatch struct {
	dir   string
	step  uint64
	start time.Time
	dumps int
}

func (w *memWatch) run() {
	next := w.step
	for {
		time.Sleep(memwatchPollInterval)
		used := processMemory()
		if used < next {
			continue
		}
		w.dump(used)
		next = (used/w.step + 1) * w.step
	}
}

// processMemory is the resident set size on Linux (what the OOM killer
// counts, including memory the Go runtime does not manage), and the memory
// mapped by the Go runtime elsewhere.
func processMemory() uint64 {
	if data, err := os.ReadFile("/proc/self/statm"); err == nil {
		if fields := strings.Fields(string(data)); len(fields) > 1 {
			if pages, err := strconv.ParseUint(fields[1], 10, 64); err == nil {
				return pages * uint64(os.Getpagesize())
			}
		}
	}
	sample := []metrics.Sample{{Name: "/memory/classes/total:bytes"}}
	metrics.Read(sample)
	return sample[0].Value.Uint64()
}

func (w *memWatch) dump(used uint64) {
	w.dumps++
	path := filepath.Join(w.dir, fmt.Sprintf("memwatch-%d-%02d.txt", os.Getpid(), w.dumps))
	f, err := os.Create(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "vue-go-tsc: memwatch: %v\n", err)
		return
	}
	defer f.Close()
	fmt.Fprintf(os.Stderr, "vue-go-tsc: memwatch: %s at %.2f GiB -> %s\n", time.Since(w.start).Round(time.Millisecond), gib(used), path)

	// What is running right now comes first: the dump must be useful even if
	// the process is killed during the forced GC below.
	fmt.Fprintf(f, "memwatch dump %d, %s after start, process memory %.2f GiB\n\n", w.dumps, time.Since(w.start).Round(time.Millisecond), gib(used))
	writeRuntimeMemory(f)
	var goroutines bytes.Buffer
	_ = pprof.Lookup("goroutine").WriteTo(&goroutines, 2)
	if goroutines.Len() > memwatchMaxGoroutineDump {
		goroutines.Truncate(memwatchMaxGoroutineDump)
		goroutines.WriteString("\n... (truncated)\n")
	}
	fmt.Fprintf(f, "\n== goroutines ==\n%s\n", goroutines.Bytes())
	_ = f.Sync()

	// The heap profile reflects the state as of the last completed GC cycles;
	// two forced cycles make it describe the live heap now.
	gcStart := time.Now()
	runtime.GC()
	runtime.GC()
	fmt.Fprintf(f, "== after 2 forced GCs (%s) ==\n", time.Since(gcStart).Round(time.Millisecond))
	writeRuntimeMemory(f)
	writeHeapSites(f)
}

func gib(b uint64) float64 {
	return float64(b) / (1 << 30)
}

func writeRuntimeMemory(f *os.File) {
	names := []string{
		"/memory/classes/total:bytes",
		"/memory/classes/heap/objects:bytes",
		"/memory/classes/heap/unused:bytes",
		"/memory/classes/heap/free:bytes",
		"/memory/classes/heap/released:bytes",
		"/memory/classes/heap/stacks:bytes",
		"/memory/classes/metadata/other:bytes",
		"/memory/classes/os-stacks:bytes",
		"/memory/classes/other:bytes",
		"/gc/heap/live:bytes",
		"/gc/heap/goal:bytes",
		"/gc/gomemlimit:bytes",
		"/gc/gogc:percent",
		"/gc/cycles/total:gc-cycles",
		"/sched/goroutines:goroutines",
	}
	samples := make([]metrics.Sample, len(names))
	for i, name := range names {
		samples[i].Name = name
	}
	metrics.Read(samples)
	fmt.Fprintf(f, "process memory: %.3f GiB\n", gib(processMemory()))
	for _, s := range samples {
		if s.Value.Kind() != metrics.KindUint64 {
			continue
		}
		v := s.Value.Uint64()
		if strings.HasSuffix(s.Name, ":bytes") {
			fmt.Fprintf(f, "%-40s %10.3f GiB\n", s.Name, gib(v))
		} else {
			fmt.Fprintf(f, "%-40s %10d\n", s.Name, v)
		}
	}
}

type heapSite struct {
	key     string
	bytes   float64
	objects float64
}

// writeHeapSites prints the live heap grouped by allocating function (the
// first frame outside the Go runtime) and by allocation stack.
func writeHeapSites(f *os.File) {
	var records []runtime.MemProfileRecord
	n, _ := runtime.MemProfile(nil, true)
	for {
		records = make([]runtime.MemProfileRecord, n+64)
		var ok bool
		n, ok = runtime.MemProfile(records, true)
		if ok {
			records = records[:n]
			break
		}
	}

	rate := float64(runtime.MemProfileRate)
	byFunc := map[string]*heapSite{}
	byStack := map[string]*heapSite{}
	var total float64
	for i := range records {
		r := &records[i]
		objects, size := r.InUseObjects(), r.InUseBytes()
		if objects <= 0 || size <= 0 {
			continue
		}
		// Undo the sampling bias, as pprof does (see runtime/pprof scaleHeapSample).
		scale := 1.0
		if rate > 1 {
			avg := float64(size) / float64(objects)
			scale = 1 / (1 - math.Exp(-avg/rate))
		}
		b, o := float64(size)*scale, float64(objects)*scale
		total += b

		frames := runtime.CallersFrames(r.Stack())
		var stack []string
		leaf := ""
		for {
			frame, more := frames.Next()
			if frame.Function != "" && !strings.HasPrefix(frame.Function, "runtime.") && !strings.HasPrefix(frame.Function, "internal/") {
				name := shortFunc(frame.Function)
				if leaf == "" {
					leaf = name
				}
				if len(stack) < memwatchStackDepth {
					stack = append(stack, fmt.Sprintf("%s:%d", name, frame.Line))
				}
			}
			if !more {
				break
			}
		}
		add := func(m map[string]*heapSite, key string) {
			s := m[key]
			if s == nil {
				s = &heapSite{key: key}
				m[key] = s
			}
			s.bytes += b
			s.objects += o
		}
		add(byFunc, leaf)
		add(byStack, strings.Join(stack, "\n    "))
	}

	fmt.Fprintf(f, "\n== live heap: %.3f GiB sampled ==\n", total/(1<<30))
	writeTop := func(title string, m map[string]*heapSite) {
		sites := make([]*heapSite, 0, len(m))
		for _, s := range m {
			sites = append(sites, s)
		}
		slices.SortFunc(sites, func(a, b *heapSite) int { return cmp.Compare(b.bytes, a.bytes) })
		fmt.Fprintf(f, "\n== top %s ==\n", title)
		for _, s := range sites[:min(len(sites), memwatchTopSites)] {
			fmt.Fprintf(f, "%9.1f MiB %5.1f%% %11.0f objs  %s\n", s.bytes/(1<<20), 100*s.bytes/total, s.objects, s.key)
		}
	}
	writeTop("allocating functions", byFunc)
	writeTop("allocation stacks", byStack)
}

// shortFunc drops the module path: github.com/microsoft/typescript-go/internal/checker.(*Checker).f
// becomes checker.(*Checker).f.
func shortFunc(name string) string {
	if i := strings.LastIndex(name, "/"); i >= 0 {
		return name[i+1:]
	}
	return name
}
