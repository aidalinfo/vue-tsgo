<script setup lang="ts" generic="Mod extends { number?: true, trim?: true }">
type Value<M> = M extends { number: true } ? number | string : string

defineProps<{
  modelValue?: Value<Mod>
  modelModifiers?: Mod
  label?: string
}>()
</script>

<template>
  <label>{{ label }} <input /></label>
</template>
