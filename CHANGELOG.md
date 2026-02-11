# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/NikhilVerma/vue-tsgo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/NikhilVerma/vue-tsgo/releases/tag/v0.1.0
[0.0.1]: https://github.com/NikhilVerma/vue-tsgo/releases/tag/v0.0.1
