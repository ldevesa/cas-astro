// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// En Cloudflare: sitio estático puro + Pages Function separada para /api/contact
// En Vercel: adapter SSR para el endpoint
const adapter = process.env.VERCEL ? vercel() : undefined;

// https://astro.build/config
export default defineConfig({
  site: 'https://contenidosad.com',
  output: 'static',
  adapter,
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'pt', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});