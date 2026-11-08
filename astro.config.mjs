// @ts-check
import { defineConfig } from 'astro/config';

// IMPORTANTE: `site` y `base` tienen que coincidir con dónde vive el sitio.
// Hoy vive en https://migaresil.github.io/estus, así que base es '/estus'.
//
// Si algún día mueves el sitio a la raíz (renombrando el repo a
// migaresil.github.io) o a un dominio propio, cambia base a '/' y
// actualiza site. Todos los links internos usan base automáticamente
// porque pasan por el helper de src/lib/url.js.
export default defineConfig({
  site: 'https://migaresil.github.io',
  base: '/estus',
  trailingSlash: 'ignore',
  // Las URLs viejas siguen funcionando: la galería vivía en /galeria antes
  // de pasar a la raíz, y pelis se llamaba diario.
  redirects: {
    '/galeria': '/',
    '/diario': '/pelis',
  },
  image: {
    // Astro genera varios tamaños y sirve el que corresponda.
    responsiveStyles: true,
  },
  build: {
    format: 'directory',
  },
});
