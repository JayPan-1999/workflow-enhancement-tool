import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      less: {
        additionalData: `@import "./src/styles/variables.less";`,
        javascriptEnabled: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
