# vue-go-tsc

> Blazingly fast Vue 3 type checker powered by [typescript-go](https://github.com/microsoft/typescript-go) — a Go-native alternative to `vue-tsc`.

> **Attribution** — This is a redistribution of [`NikhilVerma/vue-tsgo`](https://github.com/NikhilVerma/vue-tsgo)
> (formerly `nonfx/golar`). All the technical work belongs to the upstream author.
> This package only changes the npm name and release location so the aidalinfo
> org can consume it easily in CI. See the [repository README](https://github.com/aidalinfo/vue-tsgo#readme).

## Installation

```bash
# Global CLI
npm install -g vue-go-tsc

# Or as a project dev dependency (recommended for CI)
pnpm add -D vue-go-tsc
```

## Usage

```bash
# Type-check a Vue project
vue-go-tsc -p tsconfig.json --noEmit

# Watch mode
vue-go-tsc -p tsconfig.json --noEmit --watch

# Build mode (for monorepos / composite projects)
vue-go-tsc -b --noEmit
```

### Nuxt

```bash
# Generate .nuxt/tsconfig.json first, then type-check against it
nuxt prepare && vue-go-tsc -p .nuxt/tsconfig.json --noEmit
```

See the full [CI integration guide](https://github.com/aidalinfo/vue-tsgo/blob/main/docs/integration.md).

### Codegen modes

The `.vue` files are turned into TypeScript ("virtual code") before tsgo
type-checks them. Two codegens are available:

| Mode | How | When |
|---|---|---|
| `volar` (**default**) | `@vue/language-core` — the codegen `vue-tsc` runs — taken from your project's `vue-tsc` (bundled copy if you have none) | Same results as `vue-tsc`, for your Volar version |
| `go` | Built-in Go port of the codegen | Fastest; may differ from `vue-tsc` where the port lags behind Volar |

```bash
vue-go-tsc --noEmit -p tsconfig.json                 # Volar codegen (default)
vue-go-tsc --codegen=go --noEmit -p tsconfig.json    # Go codegen
VUE_GO_TSC_CODEGEN=go vue-go-tsc --noEmit            # same, via env
```

The Volar codegen runs in a few Node worker threads next to tsgo and caches
its output in `~/.cache/vue-go-tsc/volar-codegen` (`GOLAR_VUE_CACHE=0` to
disable). It needs `typescript` installed in the project. The type-checking
itself is always tsgo.

## Why vue-go-tsc?

- **~5–25× faster** than vue-tsc (project-dependent) — e.g. on the Pulse ERP
  monorepo: app ~232s → **~49s** (~4.7×), docs site ~28s → **~1.5s** (~18×)
- **Lower memory usage** — native Go instead of Node.js
- **Drop-in replacement** for vue-tsc
- **Same errors as vue-tsc** — the default Volar codegen is vue-tsc's own,
  checked against vue-tsc in CI (`tests/parity`)

## Documentation

Full documentation: https://github.com/aidalinfo/vue-tsgo#readme

## Platform Support

- macOS (Intel & Apple Silicon)
- Linux (x64 & ARM64)
- Windows (x64)

## License

MIT © [Nikhil Verma](https://github.com/NikhilVerma)
