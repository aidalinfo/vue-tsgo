# vue-tsgo Architecture

vue-tsgo (formerly Golar) is a native Vue language server that provides first-class Vue Single File Component (SFC) support directly inside typescript-go (tsgo). It is architecturally inspired by [Volar.js](https://github.com/vuejs/language-tools) but implemented in Go, enabling 26x faster type checking than vue-tsc on real-world projects.

**Goal: 1:1 compatibility with vue-tsc.** When in doubt about any behavior, always reference the Volar source code as the canonical implementation.

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [typescript-go Submodule](#2-typescript-go-submodule)
3. [Patch System](#3-patch-system)
4. [Shim Layer](#4-shim-layer)
5. [Codegen Pipeline](#5-codegen-pipeline)
6. [Porting Strategy: TypeScript to Go](#6-porting-strategy-typescript-to-go)
7. [Testing Approach](#7-testing-approach)
8. [VS Code Extension](#8-vs-code-extension)

---

## 1. High-Level Architecture

```
                          ┌─────────────────────────────────────────────┐
                          │               VS Code Extension             │
                          │  (editors/vscode/ — launches tsgo as LSP)   │
                          └────────────────────┬────────────────────────┘
                                               │ stdio
                          ┌────────────────────▼────────────────────────┐
                          │           tsgo binary (cmd/tsgo/)           │
                          │  (typescript-go compiler + Golar callbacks) │
                          └────────────────────┬────────────────────────┘
                                               │
                   ┌───────────────────────────┼───────────────────────────┐
                   │                           │                           │
      ┌────────────▼──────────┐   ┌───────────▼───────────┐   ┌──────────▼──────────┐
      │   Regular/Incremental │   │      Build Mode (-b)   │   │     LSP Server      │
      │   (tsc.go)            │   │   (build/orchestrator) │   │   (lsp/server.go)   │
      └────────────┬──────────┘   └───────────┬───────────┘   └──────────┬──────────┘
                   │                           │                           │
                   └───────────────────────────┼───────────────────────────┘
                                               │
                          ┌────────────────────▼────────────────────────┐
                          │         GolarCallbacks Interface            │
                          │  (thirdparty/typescript-go/internal/        │
                          │   golarext/golarext.go — added by patch)    │
                          │                                             │
                          │  • WrapCompilerHost(host) → host           │
                          │  • ParseSourceFile(fs, opts, text, kind)   │
                          │  • PositionToService(file, pos) → pos      │
                          └────────────────────┬────────────────────────┘
                                               │
                          ┌────────────────────▼────────────────────────┐
                          │           Golar Integration Layer           │
                          │         (internal/golar/golar.go)           │
                          │                                             │
                          │  1. Intercept .vue file reads               │
                          │  2. Parse SFC → Vue AST                    │
                          │  3. Codegen → TypeScript service code       │
                          │  4. Map diagnostics back to source          │
                          │  5. Map LSP positions (hover, goto-def)     │
                          └────────────────────┬────────────────────────┘
                                               │
                   ┌───────────────────────────┼───────────────────────────┐
                   │                           │                           │
      ┌────────────▼──────────┐   ┌───────────▼───────────┐   ┌──────────▼──────────┐
      │   Vue Parser          │   │   Vue Codegen          │   │   Source Mapping     │
      │  (internal/vue/       │   │  (internal/vue/        │   │  (internal/mapping/) │
      │   parser/)            │   │   codegen/)            │   │                      │
      └───────────────────────┘   └───────────────────────┘   └──────────────────────┘
```

### Request Flow (e.g., type-checking a .vue file)

1. **typescript-go** encounters a `.vue` file via any execution mode
2. The **compiler host proxy** intercepts `GetSourceFile()` calls for `.vue` files
3. **Vue parser** tokenizes and parses the SFC into a Vue AST (template, script, style blocks)
4. **Vue codegen** transforms the AST into TypeScript "service code" with source mappings
5. typescript-go's **TypeScript parser** parses the generated code into a TS AST
6. typescript-go's **checker** performs semantic analysis on the generated code
7. **Diagnostics** are mapped back from service positions to source positions via the source map
8. **LSP features** (hover, goto-def, completions) use `PositionToService` for reverse mapping

---

## 2. typescript-go Submodule

### Overview

typescript-go is Microsoft's official native port of the TypeScript compiler, written in Go. We use it as a Git submodule at `thirdparty/typescript-go/` and extend it via patches rather than forking.

### Why a Submodule (Not a Fork)

- **Upstream tracking**: We can pull new typescript-go releases without complex merge conflicts
- **Clean separation**: Golar's additions live in our repo; typescript-go stays pristine except for integration hooks
- **Minimal surface area**: The patch only adds callback interfaces — no behavioral changes to the compiler

### Submodule Location and Workspace

```
go.work
├── .                           # Root module (github.com/NikhilVerma/vue-tsgo)
└── ./thirdparty/typescript-go  # Submodule (github.com/microsoft/typescript-go)
```

The Go workspace (`go.work`) allows the root module to import typescript-go's internal packages through shims, while both modules build together.

### Pinning and Updating

The submodule is pinned to a specific commit. To update:

```bash
cd thirdparty/typescript-go
git fetch origin
git checkout <new-commit>
cd ../..
# Re-apply patches (may need conflict resolution)
cd thirdparty/typescript-go
git am --3way --no-gpg-sign ../../patches/*.patch
cd ../..
# Regenerate shims
go run ./tools/gen_shims
```

---

## 3. Patch System

### Philosophy

The patch adds **integration hooks only** — callback interfaces that typescript-go invokes at key points. No compiler logic is modified. This keeps the patch small (~27KB, 23 files) and reduces merge conflicts when updating typescript-go.

### What the Patch Adds

| Area | Files Modified | Purpose |
|------|---------------|---------|
| **Callback Interface** | `internal/golarext/golarext.go` (new) | Defines `GolarCallbacks` struct with function pointers |
| **Extension Registration** | `internal/tspath/extension.go` | Adds `ExtraExtensions` slice and `RegisterSupportedExtension()` |
| **Compiler Host** | `internal/execute/tsc.go` | Wraps compiler host with `WrapCompilerHost()` in regular/incremental modes |
| **Build Mode** | `internal/execute/build/orchestrator.go` | Wraps compiler host in build mode (`-b` flag) |
| **LSP Server** | `internal/lsp/server.go` | Accepts and stores `GolarCallbacks` in server options |
| **Project/Snapshot** | `internal/project/snapshot.go` | Wires up `PositionToService` for LSP position mapping |
| **Parse Cache** | `internal/project/parsecache.go` | Passes `GolarCallbacks.ParseSourceFile` to cache |
| **Diagnostics** | `internal/compiler/program.go` | Calls `WrapSemanticDiagnostics` for diagnostic filtering |
| **AST Extension** | `internal/ast/ast.go` | Adds `GolarLanguageData` field to `SourceFile` |
| **Fourslash Tests** | `internal/fourslash/fourslash.go` | Imports golar for test support, calls `WrapFourslashFS` |
| **CLI Entry** | `cmd/tsgo/lsp.go`, `cmd/tsgo/sys.go` | Passes `GolarCallbacks` to LSP and CLI modes |

### GolarCallbacks Interface

```go
// thirdparty/typescript-go/internal/golarext/golarext.go (added by patch)
type GolarCallbacks struct {
    WrapCompilerHost  func(host compiler.CompilerHost) compiler.CompilerHost
    ParseSourceFile   func(fs vfs.FS, opts ast.SourceFileParseOptions, sourceText string, scriptKind core.ScriptKind) *ast.SourceFile
    PositionToService func(file *ast.SourceFile, pos int) int
}
```

### Patch Workflow

```bash
# Apply patches to fresh submodule
cd thirdparty/typescript-go
git am --3way --no-gpg-sign ../../patches/*.patch

# After modifying patched files
cd thirdparty/typescript-go
git add -A && git commit --amend
git format-patch -1 HEAD -o ../../patches/

# Regenerate shims after any patch change
cd ../..
go run ./tools/gen_shims
```

### Critical Rule: All Execution Modes Must Use Callbacks

typescript-go has multiple execution modes, each creating its own `CompilerHost`. **Every mode must wrap the host** with `GolarCallbacks.WrapCompilerHost()`, otherwise `.vue` files will be parsed as raw TypeScript and panic with `ScriptKindUnknown`.

| Mode | Where Host is Wrapped |
|------|----------------------|
| Regular (`-p`) | `internal/execute/tsc.go` |
| Incremental | `internal/execute/tsc.go` |
| Build (`-b`) | `internal/execute/build/orchestrator.go` |
| Watch (`-w`) | `internal/execute/tsc.go` (via regular path) |
| LSP | `internal/project/parsecache.go` + `snapshot.go` |

---

## 4. Shim Layer

### Purpose

typescript-go's packages are under `internal/`, making them unexported. The shim layer at `shim/typescript-go/` re-exports these packages so Golar can import them.

### How It Works

```
golar/go.mod:
  require github.com/microsoft/typescript-go v0.0.0
  replace github.com/microsoft/typescript-go/internal/ast => ./shim/typescript-go/ast

shim/typescript-go/ast/shim.go:
  package ast
  import original "github.com/microsoft/typescript-go/internal/ast"
  type Node = original.Node
  type SourceFile = original.SourceFile
  // ... re-exports all public types and functions
```

### Generation

Shims are auto-generated by `tools/gen_shims/main.go`. **Never manually edit shim files.**

```bash
go run ./tools/gen_shims          # Regenerate all shims
./tools/update-typescript-go-shims.sh  # Apply patches + regenerate
```

---

## 5. Codegen Pipeline

The codegen is the heart of Golar. It transforms `.vue` SFC files into TypeScript that preserves full type information for semantic analysis.

### Golar vs Volar: Module Mapping

| Volar (TypeScript) | Golar (Go) | Purpose |
|---------------------|------------|---------|
| `packages/language-core/lib/codegen/script/index.ts` | `internal/vue/codegen/script.go` | Script/ScriptSetup codegen |
| `packages/language-core/lib/codegen/script/component.ts` | `internal/vue/codegen/script.go` (export section) | `defineComponent()` generation |
| `packages/language-core/lib/codegen/script/scriptSetup.ts` | `internal/vue/codegen/script.go` (setup section) | Setup function processing |
| `packages/language-core/lib/codegen/template/index.ts` | `internal/vue/codegen/template.go` | Template codegen orchestration |
| `packages/language-core/lib/codegen/template/element.ts` | `internal/vue/codegen/template.go` (element methods) | Element/component codegen |
| `packages/language-core/lib/codegen/template/elementProps.ts` | `internal/vue/codegen/template.go` (prop methods) | Props and directives |
| `packages/language-core/lib/codegen/template/elementEvents.ts` | `internal/vue/codegen/template.go` (event methods) | Event handler codegen |
| `packages/language-core/lib/codegen/template/interpolation.ts` | `internal/vue/codegen/template.go` (interpolation methods) | `{{ expr }}` handling |
| `packages/language-core/lib/codegen/template/vFor.ts` | `internal/vue/codegen/template.go` (vfor methods) | `v-for` directive |
| `packages/language-core/lib/codegen/template/vSlot.ts` | `internal/vue/codegen/template.go` (slot methods) | Slot handling |
| `packages/language-core/lib/codegen/style/index.ts` | `internal/vue/codegen/codegen.go` (style section) | CSS/SCSS handling |
| `packages/language-core/lib/codegen/names.ts` | Inline constants in Go files | Generated variable names |
| `packages/language-core/lib/codegen/localTypes.ts` | `internal/vue/codegen/types/template-helpers.d.ts` | TypeScript helper types |
| `packages/language-core/lib/parsers/scriptSetupRanges.ts` | `internal/vue/codegen/script.go` (macro detection) | `defineProps`/`defineEmits` extraction |
| `packages/language-core/lib/utils/parseSfc.ts` | `internal/vue/parser/parser.go` | SFC parsing |

### Codegen Principles

1. **Line preservation**: Generated code maintains the same line count as source. Extra lines use `\n` padding, not spaces.
2. **Source mappings**: Character-level `Mapping` structs track `(sourceOffset, serviceOffset, length)` for every mapped span.
3. **Identifier prefixing**: Template expressions prefix setup variables with `__VLS_ctx.` while JS globals (`Math`, `console`, `undefined`, etc.) remain unprefixed.
4. **ASI safety**: Generated expressions like `;(expr)` always end with `;` to prevent ASI issues with following `{` blocks.

### Key Codegen Patterns

```
Source (Vue)                    → Generated (TypeScript)
─────────────────────────────── → ──────────────────────────────────────
{{ expr }}                      → ;(__VLS_ctx.expr);
v-if="condition"                → if (__VLS_ctx.condition) {
v-for="(item, i) in list"      → for (const [item, i] of __VLS_vFor((__VLS_ctx.list))) {
@click="handler"                → onClick: (...[$event]) => { __VLS_ctx.handler }
@click="count++"                → onClick: (...[$event]) => { __VLS_ctx.count++ }
:prop="value"                   → prop: (__VLS_ctx.value)
<MyComp />                      → const __VLS_0 = MyComp; (imported) or
                                  let __VLS_0!: __VLS_WithComponent<...> (global)
defineProps({ foo: String })    → props: { foo: String } in defineComponent
defineProps<{ foo: string }>()  → __typeProps: {} as __VLS_Props in defineComponent
defineEmits<{ ... }>()          → __typeEmits: {} as __VLS_Emit in defineComponent
```

### Export Pattern

The generated `defineComponent()` call differs based on what the component declares:

```typescript
// Type-only props (defineProps<T>()) — Vue 3.5+
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {} as __VLS_PublicProps,
    __typeEmits: {} as __VLS_PublicEmits,
});

// Runtime props (defineProps({ ... })) — uses actual object
const __VLS_export = (await import('vue')).defineComponent({
    props: { isEditable: Boolean, title: String },
    __typeEmits: {} as __VLS_ModelEmit & __VLS_Emit,
});

// With slots — uses __VLS_base intermediate
const __VLS_base = (await import('vue')).defineComponent({ ... });
const __VLS_export = {} as __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;

export default {} as typeof __VLS_export;
```

**Critical**: When `defineProps` has a runtime argument (object literal), Volar emits `props: { ... }` — NOT `__typeProps`. Runtime args take precedence. See Volar's `component.ts` lines where `typeOptionGenerates.length = 0` when runtime args exist.

---

## 6. Porting Strategy: TypeScript to Go

### Philosophy

We are **not doing a mechanical line-by-line translation**. Instead, we study Volar's behavior and implement equivalent logic in idiomatic Go. The key reference is always "what does Volar generate?" not "what does Volar's code look like?"

### Translation Patterns

| Volar Pattern (TypeScript) | Golar Pattern (Go) |
|---------------------------|---------------------|
| Generator functions (`function*` yielding `Code` segments) | Direct `strings.Builder` writes + explicit mapping calls |
| Reactive signals (`alien-signals`) for lazy computation | Eager computation (no reactivity needed for batch compilation) |
| Plugin system with virtual codes | Single-pass codegen in `Codegen()` function |
| `@vue/compiler-dom` for template parsing | Custom Go parser (`internal/vue/parser/`) |
| Segment metadata (code features: verify, complete, navigate) | Not needed — we only do type checking, not LSP features in codegen |
| `muggle-string` for string segmentation | Go `strings.Builder` + `mapping.Mapping` slices |

### Porting a New Feature: Step-by-Step

When implementing a Volar feature in Golar:

1. **Identify the Volar source**: Find the relevant file in `.reference/language-tools/packages/language-core/lib/codegen/`
2. **Generate reference output**: `cd .reference && bun run generate_volar.ts <file.vue>` to see expected TypeScript output
3. **Generate Golar output**: `go run ./cmd/test_codegen <file.vue> --service` to see current output
4. **Diff the outputs**: Identify structural differences (variable names, patterns, ordering)
5. **Implement in Go**: Write the codegen logic to match Volar's output
6. **Add tests**: Create fourslash tests and exact-match comparison tests
7. **Verify on real projects**: Run `./golar/tsgo -p <tsconfig> --noEmit` and compare error counts with vue-tsc

### Key Differences from Volar

| Aspect | Volar | Golar | Rationale |
|--------|-------|-------|-----------|
| **Parsing** | Uses `@vue/compiler-dom` (full Vue compiler) | Custom Go parser | No npm dependency; Go-native parsing |
| **Codegen style** | Generator functions yielding code segments | Imperative `StringBuilder` writes | Go doesn't have generators; imperative is idiomatic |
| **Reactivity** | `alien-signals` for incremental updates | Eager single-pass | CLI type checking doesn't need incremental; LSP uses typescript-go's own caching |
| **Plugin system** | Modular plugins for each SFC block type | Single `Codegen()` function with sections | Simpler; we only support Vue (Astro/Svelte are separate modules) |
| **Code features** | Per-segment metadata (verify, complete, navigate) | Not applicable | typescript-go handles LSP features; we only generate code |
| **Virtual codes** | Multiple embedded codes per SFC (script, template, style) | Single merged TypeScript output | typescript-go expects one SourceFile per file path |

### Naming Conventions

Golar uses the same generated variable/type names as Volar to ensure compatibility:

```
__VLS_ctx        — Template context (setup bindings + component instance)
__VLS_Props      — Extracted type-only props type
__VLS_Emit       — Extracted emits type
__VLS_Slots      — Slots type
__VLS_PublicProps — Combined props (runtime + model props)
__VLS_PublicEmits — Combined emits (defineEmits + model emits)
__VLS_ModelProps  — Model prop types from defineModel
__VLS_ModelEmit   — Model emit types from defineModel
__VLS_SetupExposed — Exposed setup bindings (for template resolution)
__VLS_export     — Final component export
__VLS_base       — Intermediate (only when slots present)
__VLS_intrinsics — JSX.IntrinsicElements for native HTML
__VLS_components — Combined local + global component types
__VLS_directives — Combined local + global directive types
__VLS_N          — Internal numbered variables (N = 0, 1, 2, ...)
```

---

## 7. Testing Approach

Testing is structured in three tiers, from fastest/narrowest to slowest/broadest:

### Tier 1: Fourslash Tests (Unit Tests)

**Location**: `internal/vue/tests/`

These use typescript-go's fourslash test harness to test individual language features in isolation. Each test creates a virtual project with Vue files and checks specific behaviors.

```go
func TestDefinePropsTypeOnly(t *testing.T) {
    content := `
// @filename: /comp.vue
// @strict: true
<script setup lang="ts">
const props = defineProps<{ count: number }>()
</script>
<template>{{ /*1*/count }}</template>`

    runFourslashTest(t, content, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
        f.GoToMarker(t, "1")
        f.VerifyQuickInfoString(t, "(property) count: number")
    })
}
```

**Key features**:
- Tests run across **5 Vue versions** (3.2, 3.3, 3.4, 3.5, 3.6) automatically
- `@golarExtraFiles` directive loads real Vue type definitions from `node_modules`
- Tests verify diagnostics, quick info, completions, and definitions
- **26 test files** covering: props, emits, slots, models, directives, generics, diagnostics

**Running**: `go test ./internal/vue/tests/... -v`

### Tier 2: Volar Comparison Tests (Parity Tests)

**Location**: `internal/vue/tests/volar_comparison/`

These ensure Golar's codegen output matches Volar's byte-for-byte. This is the primary mechanism for guaranteeing 1:1 compatibility.

#### Exact Match Tests

```
internal/vue/tests/volar_comparison/
├── exact_match_test.go          # Test runner
└── testdata/
    └── exact-match/
        ├── basic.vue            # Input Vue file
        ├── basic.vue.volar.ts   # Expected Volar output (golden file)
        ├── props-emits.vue
        ├── props-emits.vue.volar.ts
        └── ...
```

The test:
1. Runs Golar's `Codegen()` on each `.vue` file
2. Runs Volar's codegen via `bun run generate_volar.ts` on the same file
3. Compares outputs character-by-character
4. Fails if there's any difference

**Updating golden files**: `UPDATE_GOLDEN=1 go test ./internal/vue/tests/volar_comparison/... -run TestExactVolarMatch`

#### Feature Comparison Tests

The `compare_test.go` runs Golar on Volar's own test fixtures (from `.reference/language-tools/`) and reports which features produce matching output. This tracks progress toward full parity.

**Running**: `go test ./internal/vue/tests/volar_comparison/... -v`

### Tier 3: Real-World Project Tests (Integration Tests)

Run Golar and vue-tsc on the same real project and compare error output:

```bash
# Build Golar
go build -o golar/tsgo ./thirdparty/typescript-go/cmd/tsgo

# Run Golar
./golar/tsgo -p <tsconfig.json> --noEmit 2>&1 | grep "error TS" | wc -l

# Run vue-tsc (save output — it's slow)
bunx --bun vue-tsc -p <tsconfig.json> --noEmit 2>&1 | tee ~/vue-tsc-output.txt | grep "error TS" | wc -l

# Compare specific errors
diff <(grep "\.vue(" ~/golar-output.txt | sort) <(grep "\.vue(" ~/vue-tsc-output.txt | sort)
```

**Note**: Use `bunx --bun` (not `npx`) to run vue-tsc — Node.js runtime crashes in build mode.

### Adding Tests for a New Feature

1. **Create a fourslash test** in `internal/vue/tests/<feature>_test.go` testing the behavior
2. **Create an exact-match fixture** in `testdata/exact-match/<feature>.vue` + `.volar.ts`
3. **Run both test suites** to verify:
   ```bash
   go test ./internal/vue/tests/... -v -count=1
   go test ./internal/vue/tests/volar_comparison/... -v
   ```
4. **Test on a real project** if the feature affects type checking

### Test Infrastructure Details

**Vue Version Matrix**: Tests load actual Vue type definitions from `internal/vue/tests/vue-{version}/node_modules/`. The `withVueNodeModules()` helper generates `@golarExtraFiles` directives that overlay these into the virtual file system.

**Fourslash Harness Integration**: Golar patches typescript-go's fourslash harness to:
- Import the `golar` package (triggering `init()` for extension registration)
- Call `WrapFourslashFS()` to overlay Vue type definitions
- Use `GolarCallbacks` for file parsing and diagnostic mapping

---

## 8. VS Code Extension

### Architecture

The extension at `editors/vscode/` is a thin TypeScript wrapper that launches the `tsgo` binary as an LSP server.

```
User opens .vue file
  → VS Code activates Golar extension
    → Extension spawns: tsgo --lsp --stdio
      → tsgo starts LSP server with GolarCallbacks
        → Bidirectional stdio communication
```

### Key Components

| File | Purpose |
|------|---------|
| `src/extension.ts` | Entry point, always activates |
| `src/client.ts` | Creates `LanguageClient` with `golar` config namespace |
| `src/util.ts` | Binary resolution (`golar.tsdk` setting or bundled `lib/tsgo`) |
| `syntaxes/vue.tmLanguage.json` | Main Vue TextMate grammar (from Volar) |
| `syntaxes/vue-directives.json` | **Injection grammar** for `:attr="expr"`, `@event="handler"` |
| `syntaxes/vue-interpolations.json` | **Injection grammar** for `{{ expr }}` |

### Syntax Highlighting

Three grammar files work together:
1. **Main grammar** (`vue.tmLanguage.json`): Handles `<script>`, `<style>`, `<template>` blocks
2. **Directives injection** (`vue-directives.json`): Injects into HTML `meta.tag` scopes, adding Vue directive patterns with embedded TypeScript expression highlighting
3. **Interpolations injection** (`vue-interpolations.json`): Injects into `text.html.derivative`, adding `{{ expr }}` patterns

**Without the injection grammars**, directive expressions and interpolations in child template elements appear as plain strings with no syntax highlighting.

### Building

```bash
# Full build (binary + bundle + .vsix)
./scripts/build-extension.sh

# Quick rebuild
go build -o editors/vscode/lib/tsgo ./thirdparty/typescript-go/cmd/tsgo
cd editors/vscode && rm -f golar-*.vsix && npx @vscode/vsce package --no-dependencies

# Install
code --install-extension editors/vscode/golar-*.vsix --force
```

---

## Appendix: Directory Structure

```
golar/
├── cmd/test_codegen/               # CLI: debug parser/codegen output
├── editors/vscode/                  # VS Code extension
│   ├── src/                         # Extension TypeScript source
│   ├── syntaxes/                    # TextMate grammars (3 files)
│   └── languages/                   # Language configuration
├── golar/                           # Public API exports + built binary
├── internal/
│   ├── golar/golar.go              # Core integration (callbacks, host proxy, diagnostics)
│   ├── vue/
│   │   ├── parser/                  # Vue SFC parser (parser.go, tokenizer.go)
│   │   ├── codegen/                 # TypeScript codegen
│   │   │   ├── codegen.go           # Main entry, shared utilities
│   │   │   ├── script.go            # <script> + <script setup> codegen
│   │   │   ├── template.go          # <template> codegen
│   │   │   └── types/               # Embedded .d.ts helpers
│   │   ├── ast/                     # Vue AST definitions
│   │   ├── diagnostics/             # Vue-specific diagnostics
│   │   └── tests/                   # Test suite (26 files)
│   │       └── volar_comparison/    # Parity tests against Volar
│   ├── mapping/                     # Source↔service position mapping
│   ├── utils/                       # Overlay VFS, text utilities
│   └── collections/                 # Set, map utilities
├── shim/typescript-go/              # Auto-generated API wrappers (21 packages)
├── thirdparty/
│   └── typescript-go/               # Submodule (patched)
├── patches/                         # Git patches for typescript-go
├── scripts/                         # Build, setup, sync scripts
├── tools/
│   ├── gen_shims/                   # Shim code generator
│   └── update-typescript-go-shims.sh
├── .reference/                      # Volar source (gitignored, for comparison)
│   └── language-tools/              # vuejs/language-tools clone
├── .github/workflows/               # CI/CD (ci, release, pre-release)
├── go.work                          # Go workspace config
├── go.mod                           # Root module with replace directives
├── Makefile                         # Build targets
└── CLAUDE.md                        # Development instructions
```
