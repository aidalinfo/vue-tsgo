package vue_tests

import (
	"testing"

	"github.com/microsoft/typescript-go/shim/fourslash"
)

func TestQuickInfo(t *testing.T) {
	runFourslashTest(t, `// @filename: file.vue
<script lang="ts" setup>
	const foo/*1*/ = 'hello'
</script>`, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
		f.VerifyQuickInfoAt(t, "1", `const foo: "hello"`, "")
	})
}

func TestQuickInfoAfterUnusedVariable(t *testing.T) {
	runFourslashTest(t, `// @filename: file.vue
<script lang="ts" setup>
import { ref, computed } from "vue"

const props = defineProps({
	count: {
		type: Number,
		required: true
	}
})

const combinedData = computed(() => {
	const data: { type: string; reasoning: string }[] = []
	const arr = [{ id: 1, reasoning: "test", metadataName: "foo" }]
	arr.forEach(scope => {
		const key = "unused-" + scope.id
		const reasoning/*1*/ = scope.reasoning || ""
		data.push({
			type: scope.metadataName,
			reasoning,
		})
	})
	return data
})
</script>

<template>
	<div v-for="item in combinedData" :key="item.type">{{ item.reasoning }}</div>
</template>`, func(t *testing.T, f *fourslash.FourslashTest, version vueVersion) {
		f.VerifyQuickInfoAt(t, "1", "const reasoning: string", "")
	})
}
