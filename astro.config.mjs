// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

import sanity from '@sanity/astro';

const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, PUBLIC_SITE_URL } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  ''
);

// https://astro.build/config
export default defineConfig({
  // URL pública del sitio (base de og:image y, más adelante, sitemap/canonical).
  // Mientras no haya dominio definitivo, cae a la URL de Cloudflare Pages.
  site: PUBLIC_SITE_URL || 'https://cas-sitio.pages.dev',

  // Astro 7 cambió el default a 'jsx' (sin espacios entre elementos inline);
  // mantenemos el comportamiento viejo para no romper el patrón <span>icono</span> Texto usado en todo el sitio.
  compressHTML: true,

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

  integrations: [
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      useCdn: false,
    }),
  ],
});