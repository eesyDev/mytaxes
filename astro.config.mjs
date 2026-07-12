// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Старый единый калькулятор разделён на отдельные страницы по типам (SEO).
  redirects: {
    '/calculators/salary': '/calculators/salary-too-our',
  },
  vite: {
    plugins: [tailwindcss()]
  }
});