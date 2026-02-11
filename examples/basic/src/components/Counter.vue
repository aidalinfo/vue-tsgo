<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  initial: number
}>()

const count = ref(props.initial)

function increment() {
  count.value++
}

function decrement() {
  count.value--
}
</script>

<template>
  <div class="counter">
    <h2>Counter: {{ count }}</h2>
    <div class="buttons">
      <button @click="decrement">-</button>
      <button @click="increment">+</button>
    </div>
  </div>
</template>

<style scoped>
.counter {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 10px;
}

button {
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  border: none;
  background: #42b983;
  color: white;
  border-radius: 4px;
}

button:hover {
  background: #35a372;
}
</style>
