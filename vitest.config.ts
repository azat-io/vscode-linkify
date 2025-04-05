import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    alias: {
      vscode: path.resolve(__dirname, './test/__mocks__/vscode.ts'),
    },
    coverage: {
      thresholds: {
        100: true,
      },
      all: false,
    },
    server: {
      deps: {
        external: ['vscode'],
      },
    },
    setupFiles: ['./test/setup.ts'],
    environment: 'node',
    globals: true,
  },
})
