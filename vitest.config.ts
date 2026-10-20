import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'app/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@/app': resolve(__dirname, 'app'),
      '@/lib': resolve(__dirname, 'lib'),
      '@/resources': resolve(__dirname, 'resources'),
    },
  },
})
