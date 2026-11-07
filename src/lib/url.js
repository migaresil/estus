/**
 * Construye un link interno respetando el `base` configurado en astro.config.mjs.
 *
 * Por qué existe este archivo: el sitio vive en /estus, no en la raíz.
 * Si escribes <a href="/galeria"> el link apunta a migaresil.github.io/galeria,
 * que no existe. Tiene que ser /estus/galeria.
 *
 * En vez de escribir /estus a mano en cada link (y romper todo el día que
 * el sitio se mueva), todos los links pasan por aquí.
 *
 *   url('/galeria')  →  '/estus/galeria'
 *   url('/')         →  '/estus'
 */
export function url(ruta = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const limpia = ruta.startsWith('/') ? ruta : `/${ruta}`;
  const completa = `${base}${limpia}`.replace(/\/+$/, '');
  return completa === '' ? '/' : completa;
}
