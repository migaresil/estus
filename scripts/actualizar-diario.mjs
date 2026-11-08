/**
 * Actualiza el diario de cine desde el RSS de Letterboxd.
 *
 * Cómo funciona y por qué así:
 *
 * El feed de Letterboxd solo devuelve las ~50 entradas más recientes. Si la
 * página leyera el feed directo, el diario se vaciaría solo: una película
 * vista hoy desaparecería del sitio en unos meses, cuando se cayera del feed.
 *
 * Por eso este script no sustituye el archivo, lo acumula. Cada corrida lee
 * el feed, compara contra src/data/peliculas.json y agrega únicamente lo que
 * no estuviera ya. Lo que se cayó del feed se queda guardado para siempre.
 * El Action lo corre todos los días y hace commit si algo cambió.
 *
 * Uso:
 *   node scripts/actualizar-diario.mjs                 # baja el feed real
 *   node scripts/actualizar-diario.mjs --local f.xml   # lee un archivo (pruebas)
 *   node scripts/actualizar-diario.mjs --dry-run       # no escribe nada
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const USUARIO = 'migaresil';
const FEED = `https://letterboxd.com/${USUARIO}/rss/`;
const ARCHIVO = 'src/data/peliculas.json';

// Texto que Letterboxd pone solo cuando NO escribiste reseña.
// Sin este filtro el diario se llenaría de "Watched on Tuesday...".
const RELLENO = /^Watched on \w+,? \w+ \d{1,2}, \d{4}\.?$/i;

// El parser decodifica las entidades con nombre (&amp;) pero no las
// numéricas (&#039;), y los títulos de Letterboxd usan las dos:
// "Pride &amp; Prejudice" y "Pan&#039;s Labyrinth".
const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
};

function decodifica(texto) {
  if (texto === null || texto === undefined) return texto;
  return String(texto)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m);
}

function leeArgumento(bandera) {
  const i = process.argv.indexOf(bandera);
  return i !== -1 ? process.argv[i + 1] : null;
}

async function obtieneFeed() {
  const local = leeArgumento('--local');
  if (local) return readFileSync(local, 'utf-8');

  const res = await fetch(FEED, {
    headers: { 'user-agent': 'estus-diario/1.0 (+https://migaresil.github.io/estus)' },
  });
  if (!res.ok) throw new Error(`Letterboxd respondió ${res.status}`);
  return res.text();
}

/**
 * De la descripción (que viene en CDATA con HTML) saca el póster y la reseña.
 * La forma es siempre: <p><img src="..."/></p> y después cero o más <p>texto</p>
 */
function desmenuzaDescripcion(html = '') {
  const poster = html.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null;

  const parrafos = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((m) => m[1])
    .filter((p) => !p.includes('<img'))
    .map((p) => decodifica(p.replace(/<[^>]+>/g, '')).trim())
    .filter((p) => p && !RELLENO.test(p));

  return { poster, resena: parrafos.length ? parrafos.join('\n\n') : null };
}

function construyeEntrada(item) {
  const { poster, resena } = desmenuzaDescripcion(item.description ?? '');
  const calificacion = item['letterboxd:memberRating'];

  return {
    id: String(item.guid?.['#text'] ?? item.guid),
    titulo: decodifica(String(item['letterboxd:filmTitle'])),
    anio: item['letterboxd:filmYear'] ?? null,
    vista: String(item['letterboxd:watchedDate']),
    // Ojo: hay películas sin calificar (las marcas como vistas sin estrellas).
    calificacion: calificacion === undefined || calificacion === '' ? null : Number(calificacion),
    gusto: item['letterboxd:memberLike'] === 'Yes',
    revision: item['letterboxd:rewatch'] === 'Yes',
    poster,
    resena,
    enlace: String(item.link),
    tmdb: item['tmdb:movieId'] ?? null,
  };
}

async function main() {
  const prueba = process.argv.includes('--dry-run');

  const xml = await obtieneFeed();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // Decodifica &#039; y &amp; en títulos como "Pan's Labyrinth"
    processEntities: true,
    // Sin esto, un feed con un solo item devolvería un objeto y no un arreglo
    isArray: (nombre) => nombre === 'item',
  });

  const feed = parser.parse(xml);
  const items = feed?.rss?.channel?.item ?? [];

  // El feed mezcla las listas del usuario con las películas del diario.
  // Sin este filtro, "mejores películas que he visto en la vida" aparecería
  // en el diario como si fuera una película que vio.
  const soloPeliculas = items.filter((it) => {
    const guid = String(it.guid?.['#text'] ?? it.guid ?? '');
    return guid.startsWith('letterboxd-review-') || guid.startsWith('letterboxd-watch-');
  });

  const previas = existsSync(ARCHIVO) ? JSON.parse(readFileSync(ARCHIVO, 'utf-8')) : [];
  const porId = new Map(previas.map((p) => [p.id, p]));

  let nuevas = 0;
  for (const item of soloPeliculas) {
    const entrada = construyeEntrada(item);
    // Si ya estaba, no la tocamos: respeta cualquier corrección hecha a mano.
    if (!porId.has(entrada.id)) {
      porId.set(entrada.id, entrada);
      nuevas++;
    }
  }

  const todas = [...porId.values()].sort((a, b) => {
    if (a.vista !== b.vista) return b.vista.localeCompare(a.vista);
    return b.id.localeCompare(a.id);
  });

  console.log(`feed: ${items.length} entradas, ${soloPeliculas.length} películas, ${items.length - soloPeliculas.length} listas descartadas`);
  console.log(`archivo: ${previas.length} previas + ${nuevas} nuevas = ${todas.length}`);
  if (nuevas > 0 && todas.length) {
    const recientes = todas.filter((t) => !previas.some((p) => p.id === t.id)).slice(0, 5);
    for (const r of recientes) {
      const estrellas = r.calificacion ? `${r.calificacion}★` : 'sin calificar';
      console.log(`  + ${r.vista}  ${r.titulo} (${r.anio}) — ${estrellas}`);
    }
  }

  if (prueba) {
    console.log('\n--dry-run: no se escribió nada');
    return;
  }

  mkdirSync(dirname(ARCHIVO), { recursive: true });
  writeFileSync(ARCHIVO, JSON.stringify(todas, null, 2) + '\n', 'utf-8');
  // El Action lee esta línea para decidir si hace commit.
  console.log(`\nescrito ${ARCHIVO}`);
  console.log(`NUEVAS=${nuevas}`);
}

main().catch((e) => {
  console.error('Falló la actualización del diario:', e.message);
  process.exit(1);
});
