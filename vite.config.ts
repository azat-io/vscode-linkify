import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      external: (id: string) =>
        id === 'vscode' || builtinModules.includes(id.replace('node:', '')),
      output: {
        preserveModules: true,
        exports: 'auto',
      },
    },
    lib: {
      entry: path.resolve(__dirname, 'extension', 'index.ts'),
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ['cjs'],
    },
    minify: false,
  },
})
