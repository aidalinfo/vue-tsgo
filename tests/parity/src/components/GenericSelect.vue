<script setup lang="ts" generic="T extends string | number">
/** An option of the select. */
export interface SelectOption<V> {
  value: V
  label: string
}
export type SelectSize = 'sm' | 'md'

defineProps<{
  modelValue: T
  options: SelectOption<T>[]
  size?: SelectSize
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
  >
    {{ opt.label }}
  </button>
</template>
