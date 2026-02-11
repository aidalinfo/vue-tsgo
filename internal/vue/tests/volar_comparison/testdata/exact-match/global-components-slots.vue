<script setup lang="ts">
const isOpen = ref(false)
const target = ref<HTMLDivElement>()
const items = ref(['a', 'b', 'c'])

function close() {
  isOpen.value = false
}
</script>

<template>
  <div ref="target" class="wrapper" @click="isOpen = true">
    <Teleport to="body">
      <FDialog :is-open="isOpen" :target="target" overlay>
        <FDiv direction="column" gap="small">
          <FDialogHeader @close-dialog="close">
            <FIcon source="i-close" size="small" />
            <FDialogTitle>Title</FDialogTitle>
          </FDialogHeader>
          <FDiv v-for="item in items" :key="item" direction="row">
            <FText variant="para" size="medium">{{ item }}</FText>
          </FDiv>
          <FDialogFooter>
            <FButton label="Close" @click="close" />
          </FDialogFooter>
        </FDiv>
      </FDialog>
    </Teleport>
  </div>
</template>
