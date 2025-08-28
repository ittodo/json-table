import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage'
    }
  }
})
