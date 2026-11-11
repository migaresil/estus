// Definición de las colecciones de contenido.
//
// Una colección es un conjunto de datos que Astro carga durante el build y
// valida contra un esquema. Si algo no cumple el esquema, el build falla
// con un mensaje claro, en vez de que el sitio salga roto en silencio.

import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

// ─── Fotos ──────────────────────────────────────────────────────────────
// Los pies de foto viven en src/data/fotos.json. Agregar una foto es
// agregar un objeto ahí, más el archivo de imagen en src/assets/fotos/.
const fotos = defineCollection({
  loader: file('src/data/fotos.json'),
  schema: z.object({
    // Ruta relativa a src/assets/fotos/, con la carpeta del álbum:
    // "canada/vancouver.jpg"
    archivo: z.string(),
    pie: z.string(),
    // La carpeta donde vive la foto. Null si está suelta en la raíz.
    album: z.string().nullable().default(null),
  }),
});

// ─── Escritos ───────────────────────────────────────────────────────────
// Un archivo Markdown por entrada, en src/content/escritos/.
// El nombre del archivo se vuelve la URL: merida.md → /escritos/merida
const escritos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/escritos' }),
  schema: z.object({
    titulo: z.string(),
    fecha: z.coerce.date(),
    extracto: z.string(),
    // `verso: true` conserva los saltos de línea del texto, para poemas.
    verso: z.boolean().default(false),
    // `borrador: true` lo deja fuera del sitio publicado.
    borrador: z.boolean().default(false),
  }),
});

// ─── Películas ──────────────────────────────────────────────────────────
// A diferencia de las otras dos, este archivo no se escribe a mano: lo
// genera scripts/actualizar-diario.mjs leyendo el RSS de Letterboxd, y el
// Action lo corre todos los días.
//
// El archivo se acumula, no se reemplaza. El feed de Letterboxd solo
// devuelve las ~50 entradas más recientes, así que si cada corrida
// sustituyera el archivo, las películas viejas irían desapareciendo del
// sitio solas. En vez de eso el script solo agrega lo que falta.
//
// Se puede editar a mano: el script respeta las entradas que ya existen y
// nunca las sobrescribe.
const peliculas = defineCollection({
  loader: file('src/data/peliculas.json'),
  schema: z.object({
    titulo: z.string(),
    anio: z.number().nullable(),
    // Fecha en que la vio, formato YYYY-MM-DD. Es la que ordena el diario;
    // la de publicación en Letterboxd puede ser otra.
    vista: z.string(),
    // Null cuando la marcó como vista sin ponerle estrellas.
    calificacion: z.number().nullable(),
    gusto: z.boolean(),
    revision: z.boolean(),
    // URL en el CDN de Letterboxd. Si algún día se quiere dejar de depender
    // de ellos, el archivo ya guarda la URL y se pueden descargar todas.
    poster: z.string().nullable(),
    resena: z.string().nullable(),
    enlace: z.string(),
    tmdb: z.number().nullable(),
  }),
});

export const collections = { fotos, escritos, peliculas };
