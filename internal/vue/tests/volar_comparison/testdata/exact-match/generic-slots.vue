<script setup lang="ts" generic="T extends { id: number }">
import { useSlots } from 'vue'

defineProps<{
	rows: T[]
	columns: string[]
}>()

const emit = defineEmits<{
	select: [row: T]
}>()

const slots = useSlots()
</script>
<template>
	<table>
		<tr v-for="row in rows" :key="row.id" @click="emit('select', row)">
			<td v-for="col in columns" :key="col">
				<slot name="cell" :row="row" :col="col">{{ col }}</slot>
			</td>
		</tr>
	</table>
</template>
