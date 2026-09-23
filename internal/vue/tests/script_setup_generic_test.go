package vue_tests

import (
	"testing"

	"github.com/microsoft/typescript-go/shim/fourslash"
	"github.com/microsoft/typescript-go/shim/lsp/lsproto"
)

func TestSetupGeneric(t *testing.T) {
	runFourslashTest(t, `// @filename: file.vue
// @strict: true
<script lang="ts" setup>
	import Comp from './file-foo.vue'
</script>

<template>
	<Comp
		[|foo|]
	/>
	<Comp
		foo="123"
		@upd="e => e/*1*/"
	/>
</template>

// @filename: file-foo.vue
<script lang="ts" setup generic="T extends string | number">
	defineProps<{
		foo: T
	}>()

	defineEmits<{
		(e: 'upd', data: T): void
	}>()
</script>
`, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
		f.VerifyQuickInfoAt(t, "1", `(parameter) e: any`, "")
		f.VerifyNonSuggestionDiagnostics(t, []*lsproto.Diagnostic{
			{
				Range:   lsproto.Range{Start: lsproto.Position{Line: 10, Character: 8}, End: lsproto.Position{Line: 10, Character: 9}},
				Code:    &lsproto.IntegerOrString{Integer: ptrTo[int32](7006)},
				Message: "Parameter 'e' implicitly has an 'any' type.",
			},
		})
	})
}

func TestSetupGenericDefineModel(t *testing.T) {
	runFourslashTest(t, `// @filename: file.vue
// @strict: true
<script lang="ts" setup>
	import Comp from './file-foo.vue'
</script>

<template>
	<Comp
		model-value="123"
		@update:model-value="e => e/*1*/"
	/>
</template>

// @filename: file-foo.vue
<script lang="ts" setup generic="T extends string | number">
	defineModel<T>()
</script>
`, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
		switch version {
		case vue_3_2, vue_3_3:
			return
		default:
			f.VerifyQuickInfoAt(t, "1", `(parameter) e: any`, "")
		}
		f.VerifyNonSuggestionDiagnostics(t, []*lsproto.Diagnostic{
			{
				Range:   lsproto.Range{Start: lsproto.Position{Line: 7, Character: 23}, End: lsproto.Position{Line: 7, Character: 24}},
				Code:    &lsproto.IntegerOrString{Integer: ptrTo[int32](7006)},
				Message: "Parameter 'e' implicitly has an 'any' type.",
			},
		})
	})
}

// Leading `export interface` / `export type` declarations of a generic
// `<script setup>` must be emitted above the generic wrapper, like imports.
// Before the fix they were left inside the `(async () => { ... })` setup
// function, where export modifiers are invalid (TS1184 "Modifiers cannot
// appear here"), and every use of the types cascaded into more errors.
// Matches Volar's `importSectionEndOffset`.
func TestSetupGenericExportedTypes(t *testing.T) {
	runFourslashTest(t, `// @filename: file.vue
// @strict: true
<script lang="ts" setup generic="T extends string | number">
import { computed } from 'vue'
/** An option of the chip list. */
export interface ChipOption<V> {
	value: V
	label: string
}
export type ChipSize = 'sm' | 'md'

const props = defineProps<{ options: ChipOption<T>[]; size?: ChipSize }>()
const labels = computed(() => props.options.map(o => o.label))
</script>

<template>
	<div :class="size">{{ labels.join(', ') }}</div>
</template>`, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
		// Generic SFCs (`generic="..."`) are a Vue 3.3+ feature.
		if version == vue_3_2 {
			return
		}
		f.VerifyNonSuggestionDiagnostics(t, []*lsproto.Diagnostic{})
	})
}

// Types exported by a generic component must be importable by its consumers.
func TestSetupGenericExportedTypesImportedByParent(t *testing.T) {
	runFourslashTest(t, `// @filename: file.vue
// @strict: true
<script lang="ts" setup>
import Chips, { type ChipOption } from './file-chips.vue'
const options: ChipOption<number>[] = [{ value: 1, label: 'one' }]
</script>

<template>
	<Chips :options="options" size="sm" />
</template>

// @filename: file-chips.vue
<script lang="ts" setup generic="T extends string | number">
export interface ChipOption<V> {
	value: V
	label: string
}
export type ChipSize = 'sm' | 'md'

defineProps<{ options: ChipOption<T>[]; size?: ChipSize }>()
</script>

<template>
	<div />
</template>
`, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
		if version == vue_3_2 {
			return
		}
		f.VerifyNonSuggestionDiagnostics(t, []*lsproto.Diagnostic{})
	})
}

// A type-only `defineProps<{...}>()` without a variable must expose its props
// to the template of a generic component. Before the fix the props type was
// wired as `typeof defineProps<...>()`, whose DefineProps<T, BooleanKey<T>>
// stays unresolved when T depends on the generic parameter: every template
// access to a prop failed (TS2339/TS2551).
func TestSetupGenericBareDefineProps(t *testing.T) {
	runFourslashTest(t, `// @filename: file.vue
// @strict: true
<script lang="ts" setup generic="T extends string | number">
export interface SegmentedOption<V> {
	value: V
	label: string
}

defineProps<{
	modelValue: T
	options: SegmentedOption<T>[]
	size?: 'sm' | 'md'
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
	<button
		v-for="opt in options"
		:key="String(opt.value)"
		:class="size"
		:aria-selected="opt.value === modelValue"
		@click="emit('update:modelValue', opt.value)"
	>{{ opt.label }}</button>
</template>`, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
		if version == vue_3_2 {
			return
		}
		f.VerifyNonSuggestionDiagnostics(t, []*lsproto.Diagnostic{})
	})
}
