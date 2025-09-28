import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: [
      { find: '@/components/ui', replacement: path.resolve(__dirname, './src/components/ui') },
      { find: '@/components', replacement: path.resolve(__dirname, './src/components') },
      { find: '@/lib', replacement: path.resolve(__dirname, './lib') },
      { find: '@/hooks', replacement: path.resolve(__dirname, './src/hooks') },
      { find: '@/shared', replacement: path.resolve(__dirname, './shared') },
      { find: '@/simulation/tabs', replacement: path.resolve(__dirname, './app/simulation/tabs') },
      { find: '@/simulation/shared', replacement: path.resolve(__dirname, './app/simulation/shared') },
      { find: '@/src/modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@', replacement: path.resolve(__dirname, './') },
    ],
  },
})
