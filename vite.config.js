import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/MonsterSpy/',
  build: {
    outDir: 'docs',
  },
  plugins: [react()],
})
