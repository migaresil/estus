/**
 * Ingesta de fotos para la galería.
 *
 * El flujo es: arrastras las fotos a la carpeta del álbum que les toca
 * dentro de src/assets/fotos/, corres `npm run fotos`, y este script hace
 * el resto. La carpeta es el álbum. Lo que esté suelto en la raíz no
 * pertenece a ningún álbum y solo sale en el modo libre.
 *
 *     src/assets/fotos/
 *     ├── canada/vancouver-lluvia.jpg   → álbum "canada"
 *     ├── guatemala/antigua.jpg         → álbum "guatemala"
 *     └── suelta.jpg                    → sin álbum
 *
 * Qué hace con cada foto nueva:
 *   1. Le normaliza el nombre (minúsculas, sin espacios ni acentos),
 *      porque GitHub Pages distingue mayúsculas y los espacios rompen URLs.
 *   2. Le lee la fecha de captura del EXIF.
 *   3. La encoge y comprime si viene pesada, como salen las del iPhone.
 *   4. Le borra los metadatos. Importante: 32 de las fotos originales
 *      traían coordenadas GPS, y este repo es público. Las imágenes que
 *      se publican ya salían limpias porque Astro las reconvierte, pero
 *      los archivos fuente no lo estaban.
 *   5. Agrega su entrada a src/data/fotos.json.
 *
 * Nunca sobrescribe un pie de foto que ya exista: si corriges uno a mano,
 * se queda corregido. Lo único que sí actualiza de una foto ya conocida es
 * su álbum, para que puedas reacomodar carpetas y que se refleje.
 *
 * Uso:
 *   node scripts/actualizar-fotos.mjs
 *   node scripts/actualizar-fotos.mjs --dry-run    # no toca nada
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, renameSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';
import sharp from 'sharp';

const RAIZ = 'src/assets/fotos';
const ARCHIVO = 'src/data/fotos.json';
const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Por encima de esto se reencoda; por debajo solo se le quitan metadatos,
// para no degradar dos veces una foto que ya venía comprimida.
const LADO_MAXIMO = 2000;
const CALIDAD = 75;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const prueba = process.argv.includes('--dry-run');

// ─── Nombres ────────────────────────────────────────────────────────────

function normaliza(nombre) {
  const ext = extname(nombre).toLowerCase();
  let base = basename(nombre, extname(nombre));
  base = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  base = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base + ext;
}

/** "vancouver-lluvia" → "Vancouver lluvia" */
function bonito(id) {
  const t = id.replace(/-/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ─── EXIF ───────────────────────────────────────────────────────────────

/** Fecha de captura, leída del EXIF. Devuelve {anio, mes} o null. */
async function fechaDeCaptura(ruta) {
  try {
    const meta = await sharp(ruta).metadata();
    if (!meta.exif) return null;
    // DateTimeOriginal viene como "2026:07:21 09:58:35"
    const texto = meta.exif.toString('latin1');
    const m = texto.match(/(\d{4}):(\d{2}):(\d{2}) \d{2}:\d{2}:\d{2}/);
    if (!m) return null;
    return { anio: Number(m[1]), mes: Number(m[2]) };
  } catch {
    return null;
  }
}

// ─── Procesamiento de la imagen ─────────────────────────────────────────

/**
 * Deja la imagen lista para publicar: orientación aplicada, tamaño
 * razonable y sin metadatos.
 *
 * El .rotate() sin argumentos aplica la orientación que venía en el EXIF
 * *antes* de borrarlo. Sin eso, quitar los metadatos deja de cabeza las
 * fotos que el teléfono guardó giradas.
 */
async function limpia(ruta) {
  const antes = statSync(ruta).size;
  const meta = await sharp(ruta).metadata();
  const grande = Math.max(meta.width ?? 0, meta.height ?? 0) > LADO_MAXIMO;
  const tieneMetadatos = Boolean(meta.exif || meta.xmp || meta.icc);

  if (!grande && !tieneMetadatos) return { cambio: false, antes, despues: antes };

  const temporal = ruta + '.tmp';
  let pipe = sharp(ruta).rotate();
  if (grande) pipe = pipe.resize(LADO_MAXIMO, LADO_MAXIMO, { fit: 'inside', withoutEnlargement: true });

  const ext = extname(ruta).toLowerCase();
  if (ext === '.png') pipe = pipe.png({ compressionLevel: 9 });
  else if (ext === '.webp') pipe = pipe.webp({ quality: CALIDAD });
  else pipe = pipe.jpeg({ quality: CALIDAD, mozjpeg: true });

  await pipe.toFile(temporal);
  renameSync(temporal, ruta);
  const despues = statSync(ruta).size;
  return { cambio: true, antes, despues, redimensionada: grande, limpiada: tieneMetadatos };
}

// ─── Recorrido de carpetas ──────────────────────────────────────────────

function recorre(dir, album = null) {
  const salida = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name.startsWith('.')) continue;
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      // Solo el primer nivel define álbum; más adentro se hereda.
      salida.push(...recorre(ruta, album ?? entrada.name));
    } else if (EXTENSIONES.has(extname(entrada.name).toLowerCase())) {
      salida.push({ ruta, album });
    }
  }
  return salida;
}

// ─── Principal ──────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(RAIZ)) {
    console.error(`No existe ${RAIZ}`);
    process.exit(1);
  }

  const previas = existsSync(ARCHIVO) ? JSON.parse(readFileSync(ARCHIVO, 'utf-8')) : [];
  const porId = new Map(previas.map((p) => [p.id, p]));

  let archivos = recorre(RAIZ);

  // 1. Normalizar nombres. Dos pasos porque en macOS el sistema de archivos
  //    no distingue mayúsculas y renombrar foto.JPG a foto.jpg es un no-op.
  const renombrados = [];
  for (const f of archivos) {
    const nuevo = normaliza(basename(f.ruta));
    if (nuevo === basename(f.ruta)) continue;
    const destino = join(f.ruta, '..', nuevo);
    if (!prueba) {
      const temporal = join(f.ruta, '..', '__tmp__' + nuevo);
      renameSync(f.ruta, temporal);
      renameSync(temporal, destino);
    }
    renombrados.push([basename(f.ruta), nuevo]);
    f.ruta = destino;
  }

  // 2. Detectar ids repetidos entre álbumes antes de seguir.
  const vistos = new Map();
  const choques = [];
  for (const f of archivos) {
    const id = basename(f.ruta, extname(f.ruta));
    if (vistos.has(id)) choques.push([vistos.get(id), f.ruta]);
    else vistos.set(id, f.ruta);
  }
  if (choques.length) {
    console.error('\nHay nombres repetidos en distintos álbumes. Renómbralos y vuelve a correr:');
    for (const [a, b] of choques) console.error(`  ${a}\n  ${b}\n`);
    process.exit(1);
  }

  // 3. Procesar cada foto
  let nuevas = 0, movidas = 0, limpiadas = 0, ahorro = 0;
  const pendientes = [];

  for (const f of archivos) {
    const nombre = basename(f.ruta);
    const id = basename(nombre, extname(nombre));
    const relativa = relative(RAIZ, f.ruta).split('\\').join('/');

    if (!prueba) {
      const r = await limpia(f.ruta);
      if (r.cambio) {
        limpiadas++;
        ahorro += r.antes - r.despues;
      }
    }

    const existente = porId.get(id);

    if (existente) {
      // Ya la conocemos: solo actualizamos dónde vive, nunca el pie.
      if (existente.archivo !== relativa || (existente.album ?? null) !== f.album) {
        existente.archivo = relativa;
        existente.album = f.album;
        movidas++;
      }
      continue;
    }

    // Foto nueva: armamos el pie con lo que el archivo ya sabe.
    const fecha = prueba ? null : await fechaDeCaptura(f.ruta);
    const pie = fecha
      ? `${bonito(id)}, ${MESES[fecha.mes - 1]} ${fecha.anio}`
      : bonito(id);

    porId.set(id, { id, archivo: relativa, album: f.album, pie });
    pendientes.push({ id, album: f.album, pie });
    nuevas++;
  }

  // 4. Entradas cuyo archivo ya no está. No las borramos: si estás a media
  //    reorganización, borrarlas perdería el pie de foto que escribiste.
  const idsEnDisco = new Set(archivos.map((f) => basename(f.ruta, extname(f.ruta))));
  const huérfanas = [...porId.keys()].filter((id) => !idsEnDisco.has(id));

  // 5. Conservar el orden existente; las nuevas van al final.
  const orden = new Map(previas.map((p, i) => [p.id, i]));
  const todas = [...porId.values()].sort((a, b) => {
    const ia = orden.has(a.id) ? orden.get(a.id) : Infinity;
    const ib = orden.has(b.id) ? orden.get(b.id) : Infinity;
    return ia - ib;
  });

  // ─── Reporte ──────────────────────────────────────────────────────────
  const albums = {};
  for (const p of todas) albums[p.album ?? '(sin álbum)'] = (albums[p.album ?? '(sin álbum)'] ?? 0) + 1;

  console.log(`fotos en disco: ${archivos.length}`);
  if (renombrados.length) {
    console.log(`\nrenombradas (${renombrados.length}):`);
    for (const [a, b] of renombrados.slice(0, 10)) console.log(`  ${a} → ${b}`);
    if (renombrados.length > 10) console.log(`  …y ${renombrados.length - 10} más`);
  }
  if (limpiadas) {
    console.log(`\nprocesadas: ${limpiadas} (metadatos borrados, tamaño ajustado)`);
    if (ahorro > 0) console.log(`  espacio ahorrado: ${(ahorro / 1048576).toFixed(1)} MB`);
  }
  if (movidas) console.log(`\ncambiaron de álbum: ${movidas}`);
  if (huérfanas.length) {
    console.log(`\nen el JSON pero sin archivo (${huérfanas.length}) — no se borraron:`);
    for (const id of huérfanas.slice(0, 10)) console.log(`  ${id}`);
  }

  console.log('\nálbumes:');
  for (const [a, n] of Object.entries(albums).sort((x, y) => y[1] - x[1])) {
    console.log(`  ${String(n).padStart(3)}  ${a}`);
  }

  if (pendientes.length) {
    console.log(`\nfotos nuevas (${pendientes.length}) — revisa los pies, se armaron solos:`);
    for (const p of pendientes.slice(0, 15)) {
      console.log(`  [${p.album ?? 'sin álbum'}] ${p.pie}`);
    }
    if (pendientes.length > 15) console.log(`  …y ${pendientes.length - 15} más`);
  }

  if (prueba) {
    console.log('\n--dry-run: no se escribió nada');
    return;
  }

  writeFileSync(ARCHIVO, JSON.stringify(todas, null, 2) + '\n', 'utf-8');
  console.log(`\nescrito ${ARCHIVO} con ${todas.length} fotos`);
}

main().catch((e) => {
  console.error('Falló la ingesta:', e.message);
  process.exit(1);
});
