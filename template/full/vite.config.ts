import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(),
            legacy({
            targets: ['Chrome 69'], // To support the Car Thing
        }),]
})
