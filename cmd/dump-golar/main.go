package main

import (
	"fmt"
	"os"

	vue_codegen "github.com/NikhilVerma/vue-tsgo/internal/vue/codegen"
	vue_parser "github.com/NikhilVerma/vue-tsgo/internal/vue/parser"
)

func main() {
	b, err := os.ReadFile(os.Args[1])
	if err != nil {
		panic(err)
	}
	content := string(b)
	ast, _ := vue_parser.Parse(content)
	serviceCode, _, _, _, _ := vue_codegen.Codegen(content, ast, vue_codegen.VueOptions{})
	fmt.Print(serviceCode)
}
