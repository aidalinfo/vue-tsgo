<script setup lang="ts">
const props = withDefaults(defineProps<{ title: string; count?: number; ariaLabel: string }>(), { count: 0 })
defineSlots<{
  default(props: { count: number }): unknown
  footer?(): unknown
}>()
const emit = defineEmits<{ select: [id: number]; close: [] }>()
</script>

<template>
  <section :aria-label="ariaLabel">
    <h2>{{ props.title }} ({{ count }})</h2>
    <slot :count="count" />
    <slot name="footer" />
    <button @click="emit('select', count)">select</button>
  </section>
</template>
