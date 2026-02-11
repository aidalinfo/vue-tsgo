# vue-tsgo

> Blazingly fast Vue 3 type checker powered by [typescript-go](https://github.com/microsoft/typescript-go)

## Installation

```bash
npm install -g vue-tsgo
```

## Usage

```bash
# Type-check a Vue project
vue-tsgo -p tsconfig.json --noEmit

# Watch mode
vue-tsgo -p tsconfig.json --noEmit --watch

# Build mode (for monorepos)
vue-tsgo -b --noEmit
```

## Why vue-tsgo?

- **10-50x faster** than vue-tsc (Node.js-based)
- **Lower memory usage** — native Go instead of Node.js
- **Drop-in replacement** for vue-tsc
- **98% feature parity** with Volar's type system

## Documentation

Full documentation: https://github.com/NikhilVerma/vue-tsgo#readme

## Platform Support

- macOS (Intel & Apple Silicon)
- Linux (x64 & ARM64)
- Windows (x64)

## License

MIT © [Nikhil Verma](https://github.com/NikhilVerma)
