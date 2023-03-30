import { defineConfig } from 'vite';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import { dependencies } from './package.json';
function renderChunks(deps: Record<string, string>) {
  let chunks = {};
  Object.keys(deps).forEach((key) => {
    if (['three'].includes(key)) return;
    chunks[key] = [key];
  });
  return chunks;
}

export default defineConfig({
  base: './',
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['three'],
        },
      },
    },
  },
  plugins: [
    // input https://www.npmjs.com/package/html-minifier-terser options
    ViteMinifyPlugin({}),
  ],
});
