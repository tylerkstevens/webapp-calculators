import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/calculations/**/*.ts'],
      exclude: [
        'src/test/**',
        'src/**/*.test.ts',
        'src/types/**',
        'src/data/**',
        'src/api/**', // Exclude API layer (requires mocking external calls)
        '**/index.ts', // Exclude barrel exports
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 85,
        statements: 95,
      },
    },
  },
})
