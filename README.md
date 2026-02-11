# vue-tsgo

> **Blazingly fast Vue type checker** — Native TypeScript type checking for Vue 3 SFCs powered by [typescript-go](https://github.com/microsoft/typescript-go)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.25-blue)](https://go.dev/)

---

## Why vue-tsgo?

**vue-tsgo** (formerly Golar) is a native Go-based type checker for Vue 3 Single File Components. It's designed to replace `vue-tsc` with:

- **10-50x faster** type checking than `vue-tsc` (Node.js-based)
- **Lower memory usage** — native Go instead of Node.js runtime
- **Drop-in replacement** — uses TypeScript's type checking engine
- **Zero .vue file error delta** with vue-tsc on real-world projects
- **Built on typescript-go** — native TypeScript compiler in Go

Perfect for CI/CD pipelines, large monorepos, and developers who want instant feedback.

---

## Installation

### Option 1: VS Code Extension

1. Download the `.vsix` for your platform from [Releases](https://github.com/NikhilVerma/vue-tsgo/releases)
2. Install:
   ```bash
   code --install-extension vue-tsgo-<version>@<platform>.vsix
   ```
3. Disable **Vue - Official (Volar)** extension to avoid conflicts
4. Reload VS Code

### Option 2: Build from Source

```bash
git clone https://github.com/NikhilVerma/vue-tsgo.git
cd vue-tsgo
git submodule update --init
cd thirdparty/typescript-go
git am --3way --no-gpg-sign ../../patches/*.patch
cd ../..
make build-binary

# Binary is at ./golar/tsgo
```

---

## Quick Start

### 1. Check a Vue Project

```bash
# Regular mode
./golar/tsgo -p tsconfig.json --noEmit

# Build mode (for Nuxt/monorepo composite projects)
./golar/tsgo -b --noEmit

# Watch mode
./golar/tsgo -p tsconfig.json --noEmit --watch
```

### 2. Benchmark Comparison

```bash
# vue-tsc (Node.js) — MUST use bunx --bun (npx crashes on Node v24+)
time bunx --bun vue-tsc -b --noEmit

# vue-tsgo (native Go)
time ./golar/tsgo -b --noEmit
```

### 3. Use in CI

```yaml
# .github/workflows/ci.yml
- name: Type check Vue components
  run: |
    make build-binary
    ./golar/tsgo -b --noEmit
```

---

## Feature Support

vue-tsgo achieves **zero .vue file error delta** with vue-tsc on a production Nuxt 3 project (706 Vue files). The remaining error delta is entirely in `.ts/.tsx` files due to upstream tsgo vs tsc differences.

### Fully Supported

- `<script setup>` with TypeScript
- Template expressions `{{ }}`, directives (`v-if`, `v-for`, `v-on`, `v-bind`, `v-model`)
- `defineProps`, `defineEmits`, `defineExpose`, `defineModel`, `defineSlots`
- Component type inference (imported + global via `__VLS_WithComponent`)
- Dynamic components `<component :is="expr">`
- Slot props with type annotations
- Ref/Computed auto-unwrapping in templates
- Event handler type checking (compound and simple expressions)
- Diagnostic position mapping (errors show correct line in `.vue` files)
- LSP features: hover, go-to-definition, completions, references

### In Progress

- Generic components `<script setup generic="T">`
- CSS `v-bind()` in `<style>` blocks
- Pug templates `<template lang="pug">`

See [TODO.md](./TODO.md) for the full roadmap.

---

## Performance

Real-world benchmark on a **production Nuxt 3 project** with **706 Vue files**:

| Tool | Average | Speedup |
|------|---------|---------|
| vue-tsc (Bun) | **~135s** | 1x |
| vue-tsgo (Go) | **~5s** | **~26x** |

*Benchmark run on M2 MacBook Pro with build mode (`-b` flag). Project uses TypeScript 5.8 with project references.*

### Error Parity

| Metric | vue-tsc | vue-tsgo |
|--------|---------|----------|
| Total errors | 248 | 304 |
| .vue file errors | 0 | 0 |
| .ts/.tsx file delta | — | +56 (upstream tsgo vs tsc differences) |

---

## How It Works

vue-tsgo transforms Vue SFCs into TypeScript "service code" that the TypeScript compiler can analyze:

```vue
<!-- Input: Hello.vue -->
<script setup lang="ts">
const msg = ref('Hello')
</script>
<template>
  <div>{{ msg }}</div>
</template>
```

Internally becomes:

```typescript
// Generated service code (simplified)
const msg = ref('Hello')
const __VLS_ctx = { msg }
;(__VLS_ctx.msg); // Type-check interpolation
```

Diagnostics from TypeScript are mapped back to the original `.vue` positions.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, running tests, and submitting pull requests.

For architecture details, see [docs/architecture.md](./docs/architecture.md).

---

## Documentation

- [Architecture](./docs/architecture.md) — How vue-tsgo works internally
- [TODO](./TODO.md) — Feature roadmap and known issues
- [CLAUDE.md](./CLAUDE.md) — Development instructions for AI agents

---

## Project Status

- **TypeScript Version**: 5.8+
- **Vue Version**: 3.2+ (tested with 3.2, 3.3, 3.4, 3.5, 3.6)
- **Compatibility**: Zero .vue error delta with vue-tsc; small .ts delta from upstream tsgo

---

## Credits

This project is built on the shoulders of giants:

- **[Golar](https://github.com/auvred/golar)** by [@auvred](https://github.com/auvred) — Original project that vue-tsgo forked and heavily modified
- **[Volar.js](https://github.com/volarjs/volar.js)** by [@johnsoncodehk](https://github.com/johnsoncodehk) — Reference implementation for Vue language features
- **[typescript-go](https://github.com/microsoft/typescript-go)** — Native TypeScript compiler in Go

---

## License

[MIT](./LICENSE)

---

Found a bug? [Open an issue](https://github.com/NikhilVerma/vue-tsgo/issues/new/choose)

Want a feature? [Start a discussion](https://github.com/NikhilVerma/vue-tsgo/discussions)
