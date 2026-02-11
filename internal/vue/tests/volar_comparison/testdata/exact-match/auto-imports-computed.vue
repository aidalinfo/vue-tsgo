<script setup lang="ts">
import { ref } from "vue";

const props = defineProps({
	count: {
		type: Number,
		required: true
	}
});

const { count } = toRefs(props);
const localCount = ref(0);

const doubled = computed(() => count.value * 2);

watch(localCount, (newVal) => {
	console.log(newVal);
});

function increment() {
	localCount.value++;
}
</script>

<template>
	<div class="counter">
		<span>{{ doubled }}</span>
		<button @click="increment">+</button>
		<Teleport to="body">
			<FDialog :count="count" overlay>
				<FText size="medium">{{ localCount }}</FText>
			</FDialog>
		</Teleport>
	</div>
</template>
