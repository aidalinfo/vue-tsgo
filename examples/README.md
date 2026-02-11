# vue-tsgo Examples

This directory contains example Vue 3 projects demonstrating vue-tsgo usage.

## Examples

### [basic/](./basic/)
Minimal Vue 3 + TypeScript project showing:
- Basic component structure
- `<script setup>` with TypeScript
- Template type checking
- Running vue-tsgo for type checking

### [with-pinia/](./with-pinia/)
Vue 3 with Pinia state management showing:
- Store type inference
- Composable usage in components
- Type-safe state access

### [with-router/](./with-router/)
Vue 3 with Vue Router showing:
- Route type safety
- Typed route parameters
- Navigation guards with types

## Running Examples

Each example has its own README with instructions. General steps:

```bash
cd examples/basic  # or any example
npm install
npm run type-check  # Uses vue-tsgo
npm run dev         # Start dev server
```

## Type Checking

All examples use vue-tsgo for type checking:

```bash
# Type check the project
npm run type-check

# Watch mode
npm run type-check:watch
```

Compare with vue-tsc:

```bash
# vue-tsc (slower)
time npx vue-tsc --noEmit

# vue-tsgo (faster)
time npx vue-tsgo -p tsconfig.json --noEmit
```
