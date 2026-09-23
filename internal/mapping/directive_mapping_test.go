package mapping

import (
	"testing"

	"github.com/microsoft/typescript-go/shim/core"
)

const (
	bit2339 = 1 << 0
	bit2353 = 1 << 1
)

// The camelized prop key `searchPlaceholder` (service 100..117) as Volar 3
// maps it: a zero-length marker that reports everything, then two segments
// that must not report TS2353.
var propKeyMappings = []Mapping{
	{ServiceOffset: 100, ServiceLength: 0},
	{ServiceOffset: 100, ServiceLength: 6},
	{ServiceOffset: 106, ServiceLength: 11},
}
var propKeyMasks = []uint8{0, bit2353, bit2353}

func TestIsReportedThroughMappingsDropsFilteredCode(t *testing.T) {
	// The unknown-prop error spans the key: its end only maps through a
	// mapping that suppresses TS2353, so Volar does not report it.
	if IsReportedThroughMappings(propKeyMappings, propKeyMasks, 2353, core.NewTextRange(100, 117)) {
		t.Fatal("TS2353 on a prop key must not be reported")
	}
}

func TestIsReportedThroughMappingsKeepsOtherCodes(t *testing.T) {
	// Same range, a code the mappings do not filter.
	if !IsReportedThroughMappings(propKeyMappings, propKeyMasks, 2322, core.NewTextRange(100, 117)) {
		t.Fatal("TS2322 is not filtered by these mappings and must be reported")
	}
	// A filterable code where a mapping allows it at both ends.
	if !IsReportedThroughMappings([]Mapping{{ServiceOffset: 10, ServiceLength: 5}}, []uint8{bit2353}, 2339, core.NewTextRange(10, 15)) {
		t.Fatal("TS2339 is allowed by the mapping and must be reported")
	}
}

func TestIsReportedThroughMappingsWithoutMasks(t *testing.T) {
	// Go codegen (no masks) or a mask list out of sync: never filter.
	if !IsReportedThroughMappings(propKeyMappings, nil, 2353, core.NewTextRange(100, 117)) {
		t.Fatal("without masks every diagnostic is reported")
	}
}
