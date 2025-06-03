<script setup lang="ts">
import FileUploader from "./components/FileUploader.vue";
</script>

<template>
  <div class="app-container">
    <FileUploader />
  </div>
</template>

<style lang="less">
.app-container {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: @text-color;
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
}
</style>
