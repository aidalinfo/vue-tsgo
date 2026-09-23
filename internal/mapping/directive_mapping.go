package mapping

import "github.com/microsoft/typescript-go/shim/core"

type IgnoreDirectiveMapping struct {
	ServiceOffset uint32
	ServiceLength uint32
}

type ExpectErrorDirectiveMapping struct {
	SourceOffset  uint32
	ServiceOffset uint32
	SourceLength  uint32
	ServiceLength uint32
}

type ExpectErrorDirectiveMappingWithUsed struct {
	ExpectErrorDirectiveMapping
	Used bool
}

type DirectiveMap struct {
	IgnoreMappings      []IgnoreDirectiveMapping
	ExpectErrorMappings []ExpectErrorDirectiveMappingWithUsed
	Used                int
}

func NewDirectiveMap(ignore []IgnoreDirectiveMapping, expectError []ExpectErrorDirectiveMapping) DirectiveMap {
	e := make([]ExpectErrorDirectiveMappingWithUsed, len(expectError))
	for i, d := range expectError {
		e[i] = ExpectErrorDirectiveMappingWithUsed{
			d,
			false,
		}
	}

	return DirectiveMap{
		IgnoreMappings:      ignore,
		ExpectErrorMappings: e,
	}
}

func (d *DirectiveMap) IsServiceRangeIgnored(serviceRange core.TextRange) bool {
	result := false
	for _, mapping := range d.IgnoreMappings {
		mappingRange := core.NewTextRange(
			int(mapping.ServiceOffset),
			int(mapping.ServiceOffset+mapping.ServiceLength),
		)
		if serviceRange.ContainedBy(mappingRange) {
			result = true
			break
		}
	}

	for i, mapping := range d.ExpectErrorMappings {
		mappingRange := core.NewTextRange(
			int(mapping.ServiceOffset),
			int(mapping.ServiceOffset+mapping.ServiceLength),
		)
		if serviceRange.ContainedBy(mappingRange) {
			result = true
			if !d.ExpectErrorMappings[i].Used {
				d.ExpectErrorMappings[i].Used = true
				d.Used++
			}
		}
	}

	return result
}

func (d *DirectiveMap) CollectUnused() []ExpectErrorDirectiveMapping {
	if d.Used == len(d.ExpectErrorMappings) {
		return nil
	}
	res := make([]ExpectErrorDirectiveMapping, 0, len(d.ExpectErrorMappings)-d.Used)
	for _, e := range d.ExpectErrorMappings {
		if !e.Used {
			res = append(res, e.ExpectErrorDirectiveMapping)
		}
	}

	return res
}

// PropNameMapping is the service range of a template prop name (the property
// key in the generated props object literal). "Unknown property" diagnostics
// on it (TS2353, TS2561) are not reported: unknown props are valid in Vue
// templates (they fall through as attrs). Mirrors Volar's
// doNotReportTs2353AndTs2561 code feature, used when checkUnknownProps is off.
type PropNameMapping struct {
	ServiceOffset uint32
	ServiceLength uint32
}

// ShouldReportCodes are the diagnostic codes a Volar mapping can filter with
// `verification.shouldReport`. Bit i of a mapping suppression mask stands for
// ShouldReportCodes[i] (same table as packages/volar).
var ShouldReportCodes = [...]int32{2339, 2353, 2551, 2561, 6133}

// IsReportedThroughMappings mirrors how Volar reports a diagnostic whose code a
// mapping may filter: both its start and its end must map through a mapping
// that does not suppress the code (suppressed[i] is the mask of mappings[i]).
// Diagnostics with other codes, or without masks, are unaffected.
func IsReportedThroughMappings(mappings []Mapping, suppressed []uint8, code int32, serviceRange core.TextRange) bool {
	if len(suppressed) != len(mappings) {
		return true
	}
	bit := -1
	for i, c := range ShouldReportCodes {
		if c == code {
			bit = i
		}
	}
	if bit < 0 {
		return true
	}
	allowedAt := func(pos int) bool {
		for i, m := range mappings {
			if suppressed[i]&(1<<bit) == 0 && int(m.ServiceOffset) <= pos && pos <= int(m.ServiceOffset+m.ServiceLength) {
				return true
			}
		}
		return false
	}
	return allowedAt(serviceRange.Pos()) && allowedAt(serviceRange.End())
}

// IsUnknownPropDiagnostic reports whether a diagnostic with `code` at
// `serviceRange` is an unknown-prop error on one of `props`.
func IsUnknownPropDiagnostic(props []PropNameMapping, code int32, serviceRange core.TextRange) bool {
	if code != 2353 && code != 2561 {
		return false
	}
	for _, p := range props {
		if serviceRange.ContainedBy(core.NewTextRange(int(p.ServiceOffset), int(p.ServiceOffset+p.ServiceLength))) {
			return true
		}
	}
	return false
}
