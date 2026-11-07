// Definición de las colecciones de contenido.
//
// Una colección es un conjunto de datos que Astro carga durante el build y
// valida contra un esquema. Si algo no cumple el esquema, el build falla
// con un mensaje claro, en vez de que el sitio salga roto en silencio.
//
// Hoy hay dos colecciones. En la fase 2 se agrega `peliculas`, que usará
// el mismo mecanismo pero con un loader propio que lee el RSS de Letterboxd.

import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

// ─── Fotos ──────────────────────────────────────────────────────────────
// Los pies de foto viven en src/data/fotos.json. Agregar una foto es
// agregar un objeto ahí, más el archivo de imagen en src/assets/fotos/.
//
// El esquema no puede verificar que el archivo de imagen exista — eso lo
// hace la página de galería, que avisa en la consola del build si falta
// alguno. Pero sí garantiza que ninguna entrada se quede sin pie o sin
// nombre de archivo.
const fotos = defineCollection({
  loader: file('src/data/fotos.json'),
  schema: z.object({
    archivo: z.string(),
    pie: z.string(),
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

export const collections = { fotos, escritos };
