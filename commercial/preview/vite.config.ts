import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Preview app: plays the Remotion compositions in the browser with simple transport controls.
// `public/` (fonts, audio) is shared with the Remotion project so staticFile() paths resolve.
export default defineConfig({
  root: path.resolve(__dirname),
  base: './',
  publicDir: path.resolve(__dirname, '../public'),
  plugins: [react()],
  css: { postcss: { plugins: [] } }, // don't inherit the parent app's Tailwind config
  build: { outDir: path.resolve(__dirname, '../dist/preview'), emptyOutDir: true },
});
