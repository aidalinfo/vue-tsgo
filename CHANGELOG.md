# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.3] - 2026-09-23

### 🐛 Bug Fixes

- **CLI: an interrupted install no longer leaves a broken `tsgo` behind** —
  `install.js` wrote the download straight onto `bin/tsgo` and trusted any
  existing file, so an install cut mid-download (Ctrl+C, a sibling
  postinstall failing, a network drop) left a truncated, non-executable binary
  that every later install kept (`spawn … EACCES`). The binary is now
  downloaded to a temporary file, checked against `Content-Length`, and only
  renamed into place once complete; cache copies are atomic; an existing or
  cached binary is kept only if it runs (`--version`), otherwise it is
  replaced. The launcher prints how to repair a missing/broken binary.

## [0.2.2] - 2026-09-23

### 🐛 Bug Fixes

- **CLI: stop pinning the CPU at 100% and share resources between concurrent
  runs** — the `vue-go-tsc` launcher now defaults `GOMAXPROCS` to half of the
  available cores (Go otherwise uses every core). Concurrent runs register in a
  shared instance registry (`$TMPDIR/vue-go-tsc-instances`) and split the
  machine: each new run gets a fair share of the cores and of a 75% RAM pool
  for `GOMEMLIMIT` (so N runs no longer each claim 50% of RAM and thrash the
  GC). The launcher also adapts to other work on the machine: it samples the
  idle cores (~200 ms) and reads the available RAM at startup, and never takes
  more than what is free (at least 1/8 of the cores and 1 GiB, so a momentary
  spike cannot cripple a run). Explicit `GOMAXPROCS` / `GOMEMLIMIT` values are
  always respected.
- **CLI: report a killed `tsgo` as a failure** — a `tsgo` terminated by a
  signal (e.g. the OOM killer) used to make the launcher exit `0`; it now exits
  `128 + signal`. Signals sent to the launcher are forwarded to `tsgo`.

## [0.2.1] - 2026-07-24

### 🐛 Bug Fixes

- **CLI: prevent OOM kills on constrained runners** — the `vue-go-tsc` launcher
  now sets a default `GOMEMLIMIT` (50% of total RAM) before spawning `tsgo`.
  The Go runtime's default GC lets the heap roughly double before collecting,
  which could exceed physical RAM on large Nuxt projects and get the process
  OOM-killed by the kernel (observed ~6.9GB RSS on a 7.7GB self-hosted runner).
  The soft limit keeps the GC aggressive under memory pressure. Override with
  the `GOMEMLIMIT` env var when a project's live heap genuinely needs more.

## [0.2.0] - 2026-07-23

### Added
- **On-disk binary cache** in the npm `postinstall` (`install.js`): the native
  binary is cached under `~/.cache/vue-go-tsc/v<version>/` (override with
  `VUE_GO_TSC_CACHE_DIR`), so CI can restore it across runs and local reinstalls
  skip the download. Cache failures fall back to a direct download and never
  break the install.

### Changed
- **README / docs**: honest, project-dependent performance numbers with real
  benchmarks (Pulse ERP app ~4.7×, its docs site ~18×) and measured error parity
  (4 = 4 on the app, 0 = 0 on docs); the headline is now "~5–25× (project-dependent)".
- `docs/integration.md`: CI binary-cache recipe + monorepo (multi-app) migration guide.



## [0.1.0] - 2025-02-10

### 🎉 Initial Beta Release

First public beta release of vue-tsgo (formerly Golar) — a native Go-based type checker for Vue 3 Single File Components.

### ✨ Features

#### Core Type Checking
- **`<script setup>` support** with full TypeScript integration
- **Template expressions** `{{ }}` with type checking
- **Directives**: `v-if`, `v-else-if`, `v-else`, `v-for`, `v-on`/`@`, `v-bind`/`:`, `v-model`
- **Component type inference** for both imported and globally registered components
- **Dynamic components** `<component :is="expr">` with expression-based resolution
- **Diagnostic mapping** — TypeScript errors mapped to `.vue` source positions

#### Vue 3 Composition API
- ✅ `defineProps` (type-only and runtime with `withDefaults`)
- ✅ `defineEmits` with full emit type inference
- ✅ `defineExpose` for component ref types
- ✅ `defineModel` (Vue 3.4+ two-way binding helper)
- ✅ `defineSlots` with slot type definitions
- ✅ Ref/Computed auto-unwrapping in templates

#### Template Features
- **Event handlers** with proper `$event` typing (simple and compound expressions)
- **Slot props** with type annotations via Volar-compatible codegen
- **Component emit type checking** using normalized event types
- **Element type checking** via `__VLS_asFunctionalElement1`

#### Language Server (LSP)
- **Hover** information for template expressions
- **Go-to-definition** from template to script
- **Completions** for component props, events, slots
- **Diagnostics** with accurate source positions
- **VS Code extension** with syntax highlighting and language features

#### CLI
- **Type checking** via `vue-tsgo -p tsconfig.json --noEmit`
- **Watch mode** for continuous type checking
- **Build mode** (`-b`) for monorepos
- **Multi-platform binaries** (Linux, macOS, Windows, ARM64)

### 🚀 Performance
- **10-50x faster** than vue-tsc (Node.js-based)
- **Lower memory usage** thanks to native Go implementation
- **~98% type checking accuracy** compared to Volar

### 🧪 Testing
- **120+ passing tests** across Vue 3.2, 3.3, 3.4, 3.5, 3.6
- **8 exact match tests** with Volar codegen output
- **Fourslash harness** for language service feature testing

### 📦 Distribution
- **npm package** `vue-tsgo` for global CLI installation
- **VS Code extension** with platform-specific binaries
- **GitHub Releases** with pre-built binaries for all platforms

### 🐛 Known Limitations
- Generic components `<script setup generic="T">` not yet supported
- CSS `v-bind()` in `<style>` blocks not yet supported
- Pug templates `<template lang="pug">` not yet supported
- Some complex template expressions may have inaccurate source mappings

### 🔧 Technical Details
- Built on [typescript-go](https://github.com/microsoft/typescript-go) v5.8
- Codegen architecture inspired by [Volar.js](https://github.com/volarjs/volar.js)
- Go 1.25+ required for building from source
- Zero Node.js dependencies for the CLI binary

---

## [0.0.1] - 2025-01-15

### Internal Alpha Release
- Initial proof-of-concept
- Basic Vue SFC parsing and codegen
- Core directive support (`v-if`, `v-for`)
- TypeScript integration prototype

---

[Unreleased]: https://github.com/aidalinfo/vue-tsgo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aidalinfo/vue-tsgo/releases/tag/v0.1.0
[0.0.1]: https://github.com/aidalinfo/vue-tsgo/releases/tag/v0.0.1
