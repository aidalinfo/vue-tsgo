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
