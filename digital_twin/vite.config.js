import { defineConfig } from 'vite'

// Relative paths, so the built site works from any folder (e.g. a subfolder
// of a UGent webshare). public/ (the MP3s made by `npm run audio`) is copied
// into the build as-is.
export default defineConfig({
  base: './',
})
