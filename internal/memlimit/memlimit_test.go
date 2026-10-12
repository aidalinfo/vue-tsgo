package memlimit

import (
	"bytes"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestApplyParsesLimits(t *testing.T) {
	var got []int64
	input := "limit 1073741824\nusage 12\nlimit nope\nlimit -5\nlimit 0\n\nlimit 2147483648\n"
	Apply(strings.NewReader(input), func(limit int64) { got = append(got, limit) })
	want := []int64{1 << 30, 2 << 30}
	if len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("got %v, want %v", got, want)
	}
}

type failingWriter struct {
	buf    bytes.Buffer
	writes int
}

func (w *failingWriter) Write(p []byte) (int, error) {
	if w.writes == 2 {
		return 0, errors.New("broken pipe")
	}
	w.writes++
	return w.buf.Write(p)
}

func TestReportStopsWhenTheLauncherIsGone(t *testing.T) {
	w := &failingWriter{}
	n := int64(0)
	Report(w, time.Millisecond, func() int64 { n += 100; return n })
	if got := w.buf.String(); got != "usage 100\nusage 200\n" {
		t.Fatalf("got %q", got)
	}
}

func TestUsageIsPositive(t *testing.T) {
	if u := Usage(); u <= 0 {
		t.Fatalf("usage = %d", u)
	}
}
