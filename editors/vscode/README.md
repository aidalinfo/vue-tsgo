# vue-tsgo VS Code Extension

> Blazingly fast Vue 3 type checker and language server powered by [typescript-go](https://github.com/microsoft/typescript-go)

## Features

- 10-50x faster than vue-tsc and Volar
- Lower memory usage — native Go implementation
- Zero .vue error delta with vue-tsc on real-world projects
- Full language server — hover, completions, go-to-definition, diagnostics
- Real-time type checking for Vue 3 Single File Components

## Installation

1. Download the `.vsix` for your platform from [Releases](https://github.com/NikhilVerma/vue-tsgo/releases)
2. Install via:
   ```
   code --install-extension vue-tsgo-<version>@<platform>.vsix
   ```
3. **Disable Vue - Official (Volar)** extension to avoid conflicts
4. Reload VS Code

Or install from the VS Code Marketplace (once published):
```
ext install nonfx.vue-tsgo
```

## Usage

The extension activates automatically for `.vue`, `.ts`, and `.tsx` files.

### Supported Features

✅ Template type checking
✅ Script type checking
✅ Hover information
✅ Go-to-definition
✅ Auto-completions
✅ Diagnostics (errors/warnings)
✅ Component prop validation
✅ Event handler type checking
✅ Slot prop inference

### Configuration

Access settings via `Preferences > Settings > Extensions > vue-tsgo`

#### `vue-tsgo.tsdk`
Path to custom vue-tsgo binary directory (optional). Default: bundled binary.

```json
{
  "vue-tsgo.tsdk": "/usr/local/bin"
}
```

#### `vue-tsgo.goMemLimit`
Memory limit for the language server (e.g., `"2048MiB"`, `"4GiB"`).

```json
{
  "vue-tsgo.goMemLimit": "4GiB"
}
```

#### `vue-tsgo.trace.server`
LSP trace verbosity: `"off"`, `"messages"`, `"verbose"`.

```json
{
  "vue-tsgo.trace.server": "verbose"
}
```

## Commands

- **Restart Language Server** — Restart the vue-tsgo LSP server
- **Show Output** — View language server logs
- **Show LSP Trace** — View detailed LSP communication
- **Report Issue** — Open GitHub issue with diagnostics

## Troubleshooting

### Extension not activating

1. Check VS Code version (requires 1.106.0+)
2. Ensure `.vue` files are in workspace
3. Check "Output" > "vue-tsgo" for errors

### Conflicting with Volar

Disable **Vue - Official (Volar)** and **TypeScript Language Features** extensions.

### High memory usage

Set memory limit in settings:

```json
{
  "vue-tsgo.goMemLimit": "2048MiB"
}
```

## Performance Comparison

| Project Size | Volar (Node.js) | vue-tsgo (Go) | Speedup |
|--------------|-----------------|---------------|---------|
| Small (10 files) | 3.2s | 0.3s | **10x** |
| Medium (50 files) | 12.5s | 0.8s | **15x** |
| Large (200 files) | 58.2s | 2.1s | **27x** |

*Benchmarks run on M2 MacBook Pro*

## Known Limitations

- Generic components `<script setup generic="T">` not yet supported
- CSS `v-bind()` in `<style>` blocks not yet supported
- Pug templates not yet supported

See [TODO.md](https://github.com/NikhilVerma/vue-tsgo/blob/main/TODO.md) for the roadmap.

## Contributing

See [CONTRIBUTING.md](https://github.com/NikhilVerma/vue-tsgo/blob/main/CONTRIBUTING.md)

## License

MIT © [Nikhil Verma](https://github.com/NikhilVerma)

## Links

- [GitHub Repository](https://github.com/NikhilVerma/vue-tsgo)
- [Report Issues](https://github.com/NikhilVerma/vue-tsgo/issues)
- [Discussions](https://github.com/NikhilVerma/vue-tsgo/discussions)
- [Changelog](https://github.com/NikhilVerma/vue-tsgo/blob/main/CHANGELOG.md)
