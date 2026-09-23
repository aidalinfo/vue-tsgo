package vue_tests

import (
	"testing"

	"github.com/microsoft/typescript-go/shim/fourslash"
	"github.com/microsoft/typescript-go/shim/lsp/lsproto"
)

// A component v-model with modifiers must pass them as `modelModifiers`, so a
// component that types its model from the modifiers (like Nuxt UI's UInput,
// ApplyModifiers<T, Mod>) accepts a number for `v-model.number`. Before the
// fix the modifiers were dropped and the model was typed as the unmodified
// string: TS2322 "Type 'string | number' is not assignable to type 'string'".
func TestComponentVModelModifiers(t *testing.T) {
	runFourslashTest(t, `// @filename: file.vue
// @strict: true
<script lang="ts" setup>
import { ref } from 'vue'
import NumberInput from './file-input.vue'
const amount = ref<number | string>('')
const label = ref('')
</script>

<template>
	<NumberInput v-model.number="amount" />
	<NumberInput v-model="label" />
	<NumberInput v-model:extra.number="amount" />
</template>

// @filename: file-input.vue
<script lang="ts" setup generic="Mod extends { number?: true }">
type Value<M> = M extends { number: true } ? number | string : string
defineProps<{
	modelValue?: Value<Mod>
	modelModifiers?: Mod
	extra?: Value<Mod>
	extraModifiers?: Mod
}>()
</script>

<template>
	<input />
</template>
`, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
		if version == vue_3_2 {
			return
		}
		f.VerifyNonSuggestionDiagnostics(t, []*lsproto.Diagnostic{})
	})
}

// Unknown props on a component are valid in Vue templates (they fall through
// as attrs), so vue-tsc does not report them unless checkUnknownProps is on.
// Generic components are called as plain functions, so the generated props
// object literal still raised TS2353 on the unknown key. A real type error on
// a known prop must still be reported.
func TestComponentUnknownPropNotReported(t *testing.T) {
	runFourslashTest(t, `// @filename: file.vue
// @strict: true
<script lang="ts" setup>
import List from './file-list.vue'
</script>

<template>
	<List :items="[1, 2]" search-placeholder="Search..." :page-size="10" />
	<List :items="[1, 2]" :title="123" />
</template>

// @filename: file-list.vue
<script lang="ts" setup generic="T">
defineProps<{ items: T[]; title?: string }>()
</script>

<template>
	<ul />
</template>
`, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
		// Vue 3.3 generic component props are not type-checked at all (also
		// with `const p = defineProps<...>()`), so the TS2322 below is absent.
		if version == vue_3_2 || version == vue_3_3 {
			return
		}
		f.VerifyNonSuggestionDiagnostics(t, []*lsproto.Diagnostic{
			{
				Range:   lsproto.Range{Start: lsproto.Position{Line: 6, Character: 23}, End: lsproto.Position{Line: 6, Character: 35}},
				Code:    &lsproto.IntegerOrString{Integer: ptrTo[int32](2322)},
				Message: "Type 'number' is not assignable to type 'string'.",
			},
		})
	})
}
