import { defineConfig } from 'vite'

export default defineConfig({\n  css: { postcss: {} },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'JsonTable',
      fileName: (format) => `jsontable.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      output: {
        exports: 'named'
      }
    }
  },
  server: {
    open: '/demo/index.html'
  }
})

