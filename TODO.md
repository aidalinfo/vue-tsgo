# vue-tsgo Development TODO

Roadmap and task tracking for vue-tsgo (formerly Golar). Tasks are organized by priority.

## Current Status

**Error Parity with vue-tsc** (tested on production Nuxt 3 project, 706 Vue files):

| Metric | vue-tsc | vue-tsgo |
|--------|---------|----------|
| Total errors | 248 | 304 |
| .vue file errors | **0** | **0** |
| .ts/.tsx delta | — | +56 (upstream tsgo vs tsc) |

**Codegen Parity**: ~120 Volar comparison tests passing, 3 failing (2 out of scope: Pug/non-TS languages, 1 minor)

### Completed Features

- `<script setup>` with full TypeScript support
- All core directives: `v-if`, `v-for`, `v-on`, `v-bind`, `v-model`, `v-slot`
- `defineProps` (type-only and runtime), `defineEmits`, `defineExpose`, `defineModel`, `defineSlots`
- Component resolution: imported (direct reference) and global (`__VLS_WithComponent`)
- Dynamic components `<component :is="expr">`
- Event handler type checking (compound and simple expressions)
- Event name quoting for colons (`onUpdate:open`)
- v-model arg camelization (`v-model:is-open` -> `isOpen`)
- Conditional `__VLS_SetupExposed` (only when bindings exist)
- Export pattern optimization (no `__VLS_base` without slots)
- Template-only component support
- Empty `<script setup>` handling
- Diagnostic position mapping (source <-> service)
- LSP: hover, go-to-definition, completions, references
- Build mode (`-b`) with Golar host wrapping
- VS Code extension with syntax highlighting (directives + interpolations)

---

## High Priority: Remaining Error Gap

The 56-error delta between vue-tsgo and vue-tsc is entirely in `.ts/.tsx` files and comes from upstream tsgo vs tsc differences. These are NOT vue-tsgo bugs — they'll be resolved as typescript-go improves.

Known upstream differences:
- Type ordering differences in union/intersection types
- Some generic inference edge cases
- `bun-types` duplicate identifier issues (TS2300)

### Task: Track Upstream tsgo Issues

Monitor typescript-go releases for fixes to these `.ts/.tsx` discrepancies. When updating the submodule, re-run the comparison to check if the delta shrinks.

---

## Medium Priority: Missing Codegen Features

### Task: v-model `modelValue` Prop in Component Props

When `v-model` is used on a component without an argument, Volar generates a `modelValue` prop in the component props. Currently we generate the getter expression but don't emit the prop binding.

### Task: `__defaults` in defineComponent

When `withDefaults()` is used with `defineProps`, Volar emits `__defaults` in the `defineComponent()` call. Not yet implemented.

### Task: Slot Extraction from Template

Template `<slot>` elements should be extracted and their types threaded to the `__VLS_Slots` type. Currently `templateHasSlots` is tracked but the slot type information is basic.

### Task: StyleScopedClasses Comments

Volar generates `/** @type {__VLS_StyleScopedClasses['className']} */` comments after each element for CSS class type checking. Low priority — doesn't affect type correctness.

---

## Low Priority: Unsupported Features

### Task: Generic Components

`<script setup generic="T extends string">` — Parse generic parameter from script setup and pass to component type definition.

### Task: CSS `v-bind()` Support

Parse `v-bind(variable)` in `<style>` blocks and generate type checks for bound variables.

### Task: Pug Templates

`<template lang="pug">` parses but codegen doesn't handle Pug syntax. Out of scope for now.

### Task: Non-TS Script Languages

`<script lang="gleam">` and similar non-TypeScript script blocks. Out of scope.

---

## Testing Tasks

### Task: Expand Exact Match Tests

Add more exact-match comparison tests in `internal/vue/tests/volar_comparison/testdata/exact-match/`:
- [ ] Nested v-for loops
- [ ] Complex v-if/v-else chains with template elements
- [ ] defineProps with defaults (`withDefaults`)
- [ ] Components with slots
- [ ] Generic components

### Task: Real-World Project Testing

Regularly test against production projects to catch regressions:

```bash
# Build binary
make build-binary

# Run vue-tsgo
./golar/tsgo -b --noEmit 2>&1 | grep -c "error TS"

# Compare with vue-tsc (MUST use bunx --bun)
bunx --bun vue-tsc -b --noEmit 2>&1 | grep -c "error TS"
```

---

## Commands Reference

```bash
# Build
make build-binary           # Build golar/tsgo binary
make build-extension        # Build VS Code extension (.vsix)
make install-extension      # Install extension in VS Code
make test                   # Run all tests
make clean                  # Clean build artifacts

# Test
go test ./internal/vue/tests/... -v -count=1           # All Vue tests
go test ./internal/vue/tests/volar_comparison/... -v    # Volar comparison

# Debug
go run ./cmd/test_codegen path/to/file.vue --service    # Generated TS
cd .reference && bun run generate_volar.ts file.vue     # Volar output

# Compare
./golar/tsgo -b --noEmit                               # vue-tsgo errors
bunx --bun vue-tsc -b --noEmit                          # vue-tsc errors
```
