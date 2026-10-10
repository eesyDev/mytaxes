// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Старый единый калькулятор разделён на отдельные страницы по типам (SEO).
  redirects: {
    '/calculators/salary': '/calculators/salary-too-our',
    '/calculators/forma-240': '/blog/250-vs-270',
    '/blog/240-forma': '/blog/270-forma',
    '/blog/240-forma-crypto': '/blog/270-forma',
    '/blog/patent-dlya-ip-2026': '/blog/snr-2026',
    '/blog/roznichnyi-nalog': '/blog/snr-2026',
    '/blog/e-salyq': '/blog/snr-2026',
    '/blog/ip-uproshchenniy-rezhim-2026': '/blog/snr-2026',
    '/blog/too-uproshchenka': '/blog/snr-2026',
    '/blog/samozanyatye': '/blog/snr-2026',
    '/blog/freelance': '/blog/snr-2026',
    '/blog/nalogi-blogerov': '/blog/snr-2026',
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
