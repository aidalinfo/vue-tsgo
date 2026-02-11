# Basic Vue 3 + TypeScript Example

Minimal Vue 3 project demonstrating vue-tsgo type checking.

## Setup

```bash
npm install
```

## Development

```bash
# Start dev server
npm run dev

# Type check with vue-tsgo
npm run type-check

# Type check in watch mode
npm run type-check:watch
```

## Type Checking Comparison

```bash
# vue-tsc (Node.js-based, slower)
time npx vue-tsc --noEmit

# vue-tsgo (Go-based, faster)
time npm run type-check
```

You should see **10-50x speedup** with vue-tsgo!

## Project Structure

```
basic/
├── src/
│   ├── App.vue          # Root component
│   ├── components/
│   │   └── Counter.vue  # Example component with props
│   └── main.ts          # App entry point
├── index.html
├── tsconfig.json        # TypeScript config
├── tsconfig.app.json    # App-specific config
└── vite.config.ts       # Vite config
```

## Key Features Demonstrated

- **`<script setup>`** with TypeScript
- **`defineProps`** with type-only syntax
- **Template expressions** with type checking
- **Event handlers** with proper `$event` typing
- **Ref/Computed** auto-unwrapping in templates
