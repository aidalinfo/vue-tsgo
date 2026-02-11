package golarext

import (
	"github.com/microsoft/typescript-go/internal/ast"
	"github.com/microsoft/typescript-go/internal/compiler"
	"github.com/microsoft/typescript-go/internal/core"
	"github.com/microsoft/typescript-go/internal/vfs"
)

type GolarCallbacks struct {
	WrapDiagnostics func (file *ast.SourceFile, diagnostics []*ast.Diagnostic) []*ast.Diagnostic
	PositionToService func(file *ast.SourceFile, pos int) int
	PositionFromService func(file *ast.SourceFile, pos int) int
	WrapCompilerHost  func(host compiler.CompilerHost) compiler.CompilerHost
	ParseSourceFile   func(fs vfs.FS, opts ast.SourceFileParseOptions, sourceText string, scriptKind core.ScriptKind) *ast.SourceFile
}
