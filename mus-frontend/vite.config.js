import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../public/vue-mus',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `js/mus-app.js`,
        assetFileNames: `css/mus-app.[ext]`
      }
    }
  }
})