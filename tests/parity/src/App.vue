<script setup lang="ts">
import { computed, ref } from 'vue'
import Card from './components/Card.vue'
import GenericSelect, { type SelectOption } from './components/GenericSelect.vue'
import NumberField from './components/NumberField.vue'

const amount = ref<number | string>('')
const choice = ref<'a' | 'b'>('a')
const options: SelectOption<'a' | 'b'>[] = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]
const items = ref([{ id: 1, name: 'one' }, { id: 2, name: 'two' }])
const total = computed(() => items.value.length)

function onSelect(id: number) {
  choice.value = id > 1 ? 'b' : 'a'
}

// Intentional error (script): TS2322.
const wrong: number = 'not a number'
</script>

<template>
  <NumberField v-model.number="amount" label="Amount" />
  <GenericSelect v-model="choice" :options="options" size="sm" />
  <!-- Unknown prop on a generic component: valid Vue (fallthrough attr). -->
  <GenericSelect v-model="choice" :options="options" data-test="x" search-placeholder="Search" />

  <!-- vue-tsc does not camelize aria-* attributes: the required `ariaLabel`
       prop is missing (TS2345). The Go codegen used to camelize it. -->
  <Card title="Items" aria-label="items" @select="onSelect">
    <template #default="{ count }">
      <p v-for="(item, index) in items" :key="item.id">{{ index }}: {{ item.name }} / {{ count.toFixed(0) }}</p>
    </template>
    <template #footer>{{ total }}</template>
  </Card>

  <!-- Intentional errors (template). -->
  <p>{{ missingVariable }}</p>
  <Card :title="42" aria-label="bad" />
  <GenericSelect v-model="choice" :options="options" size="xl" />
  <p v-if="choice === 'c'">{{ wrong }}</p>
</template>
