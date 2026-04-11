import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://tetonexteriorlighting.com',
  output: 'static',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
