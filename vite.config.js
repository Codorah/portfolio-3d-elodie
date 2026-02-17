import { defineConfig } from 'vite';

// Relative asset paths so the same build works on:
// - GitHub Pages project URLs
// - Vercel root/custom domains
export default defineConfig({
  base: './',
});
