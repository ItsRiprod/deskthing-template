import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  base: './',
  plugins: [legacy({
    targets: ['Chrome 69']
  })],
  build: {
    outDir: 'dist',
    rollupOptions: {
        output: {
            assetFileNames: '[name]-[hash][extname]',
            chunkFileNames: '[name]-[hash].js',
            entryFileNames: '[name]-[hash].js',
          },
    },
  },
});