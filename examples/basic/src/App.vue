<script setup lang="ts">
import { ref } from 'vue'
import Counter from './components/Counter.vue'

const message = ref('Hello vue-tsgo!')
</script>

<template>
  <div class="container">
    <h1>{{ message }}</h1>
    <Counter :initial="5" />
  </div>
</template>

<style scoped>
.container {
  max-width: 600px;
  margin: 50px auto;
  padding: 20px;
  text-align: center;
}

h1 {
  color: #42b983;
}
</style>
