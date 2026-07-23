# Codegen model migration: legacy Volar → Volar 2.2.x

Status: **planned**. This document specifies the remaining work to reach
functional parity with the `vue-tsc` / `@vue/language-core` **2.2.12** the Pulse
ERP project pins. It is written from a byte-level diff of golar's current output
against `@vue/language-core@2.2.12` (regenerated references live in
`internal/vue/tests/volar_comparison/testdata/volar-2.2.12-reference/`).

## Why

On Pulse ERP (`app/pulse`, same tsconfig), with the checker TS2321 fix and the
CPI-spread revert already landed:

| checker        | total errors |
|----------------|-------------:|
| vue-tsc (2.2.12) | 6          |
| vue-tsgo        | 199         |

The 199 residual are **not** real bugs — vue-tsc reports none of them. They are
all symptoms of one root cause: **golar emits an older Volar `__VLS_` codegen
model** than 2.2.x. Breakdown (all false positives):

- `TS7006` (79) — `implicit any` on component-event handler params (`(c) => …`)
  and slot params.
- `TS2448` + `TS7022` (77) — slot destructuring `const [{ row }] = …`: `row`
  untyped / used-before-declaration.
- `TS7053` (26) — index access implicitly any.

Fixing these piecemeal **regresses** (verified twice): correcting the slot/event
helper unmasks the next gap (e.g. `__VLS_30.slots` resolving to `{}`), because
the whole component-instance type plumbing differs. It must move as one model.

## Model deltas (legacy golar → 2.2.x target)

| Concern | golar (legacy) | Volar 2.2.12 (target) |
|---|---|---|
| Component ctx | spreads `ComponentPublicInstance` + emits helpers | `const __VLS_ctx = {} as InstanceType<__VLS_PickNotAny<typeof __VLS_self, new () => {}>>` |
| `$slots/$attrs/$refs/$el` | mixed into ctx | isolated `var __VLS_dollars!` with `… & { [K in keyof ComponentPublicInstance]: unknown }` (CPI→unknown ONLY here) |
| Self type | `__VLS_self` via class heuristics | `const __VLS_self = defineComponent({ setup() { return { …all bindings… } } })` |
| Functional component | `__VLS_asFunctionalComponent1` / `__VLS_FunctionalComponentCtx` | `__VLS_asFunctionalComponent` / `__VLS_PickFunctionalComponentCtx` |
| Element factory | `__VLS_asFunctionalElement1`, `__VLS_intrinsics` | `__VLS_asFunctionalElement`, `__VLS_intrinsicElements` |
| Element event | props object | `...{ onClick: (handler) }` inline in the element attrs object |
| Component event | `(({ ev:{} as any } as typeof emits), { onEv: h })` comma-tuple | direct object `= { onEv: h }`, typed by `__VLS_NormalizeComponentEvent` |
| Emits resolution | `__VLS_ResolveEmits<Comp, ctx.emit>` | `typeof ctxvar.emit` → `__VLS_NormalizeEmits<…>` |
| Slot params | `__VLS_vSlot<S, D extends S>(slot)` (tests `D`, degrades to `any[]`) | `__VLS_getSlotParams<T>(slot): Parameters<__VLS_PickNotAny<NonNullable<T>, (...args:any[])=>any>>` |
| v-for | `__VLS_vFor` | `__VLS_getVForSourceType` (two overloads) |
| Global helpers | embedded `template-helpers.d.ts` (shared) | inlined `declare global { … }` per file — **golar may keep the embedded approach**, but the helper SHAPES must be updated to 2.2.x |

The embedded-vs-inlined helper choice is an architecture decision golar can keep;
what matters is the **per-component body** and the **helper type shapes** matching.

## Safe migration procedure (oracle-driven — do NOT rewrite blind)

1. **Oracle**: the 10 files in `volar-2.2.12-reference/` are the ground truth.
   Add a test that strips the `declare global {…}` block from both sides and
   compares the component body (`gen-volar.cjs` produces the reference).
2. **Helper shapes**: replace `types/template-helpers.d.ts` with the 2.2.x
   globalTypes shapes (see `@vue/language-core/lib/codegen/globalTypes.js`).
3. **script.go**: migrate `__VLS_ctx` / `__VLS_self` / `__VLS_dollars` emission.
4. **template.go**: migrate element/component factories, event objects, slot
   params, v-for — one construct at a time, `go test ./internal/vue/...` green
   after each.
5. Rebuild, re-measure on Pulse; target ≈ vue-tsc's 6.

Each step is gated by the oracle so no step can silently regress — the reason a
blind rewrite is forbidden (it produces a broken binary).

## Root cause, pinned to exact lines (investigation 2026-07-23)

The dominant residual bucket (slot `row` implicit-any + event handler params +
downstream index-access = ~180 of 199) traces to **generic SFC consumption**:

- Most heavily-used components on Pulse are generic (`<script setup generic="T">`),
  e.g. `app/components/shared/DataTable.vue` (the table wrapper used by every
  list page). Probes confirmed golar *does* resolve `GlobalComponents['DataTable']`
  and the component is not `any`.
- golar's generic-SFC codegen (`script.go` ~L584-585) hardcodes the setup-return
  shape as `slots: {}` and `emit: {}`. Volar emits `slots: __VLS_Slots` (an
  index-signature type for slot-forwarding components) and `emit: <real emit>`.
- Consequence downstream: `__VLS_asFunctionalComponent1(genericFn, …)` sees a
  generic **function** (not `new(...)=>any`), so `__VLS_FunctionalComponentCtx`
  yields `.slots = {}` / `.emit = {}` → consumer slot destructuring and handler
  params degrade to implicit-any.

**Why it can't be fixed piecemeal (6 empirical regressions):** golar's generated
TSX carries many *mutually-masked* latent errors. Changing any single type in the
component/ctx/slot/emit chain (generic `slots`/`emit`, `__VLS_vSlot`, event-object
shape) **unmasks** the next layer (e.g. `.slots={}` destructure errors, or latent
TS1232/TS2307 in unrelated files surfacing), so total error count *rises*
(199→207/218) even when the change is locally correct. The fix must replace the
whole generic-consumption chain **coordinatedly**, validated per-fixture against
the oracle so each unmasked error is resolved in the same pass. That is the
migration below — it cannot be a one-line patch.

## Already landed (verified, committed)

- `fix(checker)` one-sided depth overflow → TS2321 5064→0 (`a85f242`;
  standalone fork `aidalinfo/typescript-go@4bd63472`).
- `revert(codegen)` full CPI spread in `__VLS_ctx` (2.2.x confirms CPI→unknown
  belongs only on `$dollars`) → TS18046 137→0, total 337→199 (`bc915b9`).
