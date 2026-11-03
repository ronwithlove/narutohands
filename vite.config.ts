import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset paths: the build works from any folder or GitHub Pages subpath
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
        lab: resolve(__dirname, 'lab.html'),
        pop: resolve(__dirname, 'pop.html'),
        seal: resolve(__dirname, 'seal.html'),
      },
    },
  },
});
