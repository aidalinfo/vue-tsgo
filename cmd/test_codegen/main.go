package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/NikhilVerma/vue-tsgo/internal/mapping"
	vue_codegen "github.com/NikhilVerma/vue-tsgo/internal/vue/codegen"
	vue_parser "github.com/NikhilVerma/vue-tsgo/internal/vue/parser"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: test_codegen <vue-file> [--service|--mappings]")
		os.Exit(1)
	}

	filePath := os.Args[1]
	mode := ""
	if len(os.Args) > 2 {
		mode = os.Args[2]
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error reading file:", err)
		os.Exit(1)
	}

	sourceText := string(content)
	ast, _ := vue_parser.Parse(sourceText)
	serviceText, mappings, _, _, _ := vue_codegen.Codegen(sourceText, ast, vue_codegen.VueOptions{})

	switch mode {
	case "--service":
		fmt.Print(serviceText)
	case "--mappings":
		printMappings(sourceText, serviceText, mappings)
	default:
		// Default: show AST info
		for i, child := range ast.Children {
			if child.Kind == 1 { // KindElement
				el := child.AsElement()
				fmt.Printf("Child %d: Tag=%s, Children=%d, InnerLoc=%d-%d\n",
					i, el.Tag, len(el.Children), el.InnerLoc.Pos(), el.InnerLoc.End())
				if el.Tag == "template" {
					for j, tc := range el.Children {
						fmt.Printf("  Template child %d: Kind=%d, Loc=%d-%d\n", j, tc.Kind, tc.Loc.Pos(), tc.Loc.End())
					}
				}
			}
		}
	}
}

func printMappings(sourceText, serviceText string, mappings []mapping.Mapping) {
	fmt.Printf("Source length: %d, Service length: %d, Mapping count: %d\n\n", len(sourceText), len(serviceText), len(mappings))

	sourceMap := mapping.NewSourceMap(mappings)

	// Print all mappings
	for i, m := range mappings {
		srcEnd := m.SourceOffset + m.SourceLength
		svcEnd := m.ServiceOffset + m.SourceLength
		srcChunk := safeSlice(sourceText, m.SourceOffset, srcEnd)
		svcChunk := safeSlice(serviceText, m.ServiceOffset, svcEnd)
		match := "OK"
		if srcChunk != svcChunk {
			match = "DIFF"
		}
		fmt.Printf("[%3d] src:%4d-%4d svc:%4d-%4d len:%3d %s src=%q svc=%q\n",
			i, m.SourceOffset, srcEnd, m.ServiceOffset, svcEnd, m.SourceLength, match, truncate(srcChunk, 40), truncate(svcChunk, 40))
	}

	// Test round-trip for every non-whitespace source character in template
	fmt.Println("\n=== Template position mapping test ===")
	templateStart := strings.Index(sourceText, "<template")
	if templateStart == -1 {
		fmt.Println("No <template> found")
		return
	}
	templateEnd := strings.LastIndex(sourceText, "</template>")
	if templateEnd == -1 {
		templateEnd = len(sourceText)
	}

	for i := templateStart; i < templateEnd; i++ {
		ch := sourceText[i]
		if ch == ' ' || ch == '\n' || ch == '\t' || ch == '\r' {
			continue
		}
		results := sourceMap.ToServiceLocation(uint32(i))
		if len(results) > 0 {
			svcOff := results[0].Offset
			if int(svcOff) < len(serviceText) {
				svcCh := serviceText[svcOff]
				if svcCh != ch {
					fmt.Printf("  MISMATCH at source:%d '%c' -> service:%d '%c'  context: src=%q svc=%q\n",
						i, ch, svcOff, svcCh,
						safeContext(sourceText, i, 10),
						safeContext(serviceText, int(svcOff), 10))
				}
			}
		}
	}
	fmt.Println("Done.")
}

func safeSlice(s string, start, end uint32) string {
	if int(start) > len(s) {
		return "<OOB>"
	}
	if int(end) > len(s) {
		end = uint32(len(s))
	}
	return s[start:end]
}

func safeContext(s string, pos int, radius int) string {
	start := max(0, pos-radius)
	end := min(len(s), pos+radius)
	return s[start:end]
}

func truncate(s string, n int) string {
	s = strings.ReplaceAll(s, "\n", "\\n")
	if len(s) > n {
		return s[:n] + "..."
	}
	return s
}
