const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Formatea una fecha como "13 junio 2026", que es el formato que usa el sitio.
 *
 * No usamos toLocaleDateString porque el resultado depende de qué locales
 * tenga instalado el servidor donde corre el build, y GitHub Actions no
 * siempre trae español. Así siempre sale igual.
 */
export function formateaFecha(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Para el atributo datetime de <time>, que debe ser ISO. */
export function fechaISO(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return d.toISOString().slice(0, 10);
}
