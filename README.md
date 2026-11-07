# estus

Sitio personal: galería de fotos y escritos. Construido con Astro, publicado gratis en GitHub Pages.

En vivo: https://migaresil.github.io/estus

---

## Qué cambió respecto al sitio anterior

El sitio viejo era HTML escrito a mano. Agregar una foto eran siete líneas de markup que se podían pegar en el lugar equivocado, y eso ya rompió la galería una vez.

Ahora:

- Agregar una foto es una línea en `src/data/fotos.json` más el archivo de imagen. Ya no se escribe HTML.
- Las imágenes se convierten a WebP y se generan en varios tamaños durante el build. No hay que comprimirlas a mano.
- Los escritos son Markdown. Ya no hay que mantener dos archivos sincronizados por entrada.
- El orden de los escritos se calcula por fecha. Ya no hay que acordarse de pegar la entrada nueva hasta arriba.
- Si un pie de foto apunta a un archivo que no existe, el build lo dice por nombre en la consola en vez de dejar una imagen rota en el sitio.
- El header y el footer viven en un solo archivo (`src/layouts/Base.astro`) en vez de estar copiados en cada página.

---

## Puesta en marcha

Una sola vez:

```bash
cd ~/estus
npm install
```

Para trabajar en el sitio:

```bash
npm run dev
```

Abre `http://localhost:4321/estus` — ojo con el `/estus` al final, el sitio vive en un subpath. Los cambios se ven al instante sin recargar.

Para ver cómo va a quedar publicado:

```bash
npm run build
npm run preview
```

---

## Las fotos

Las fotos van en `src/assets/fotos/`, no en `public/`. Astro solo optimiza lo que pasa por su pipeline, y lo que está en `public/` se copia tal cual sin tocar.

Las 71 fotos originales ya están puestas y con los nombres normalizados.

### Si agregas un lote nuevo

Las fotos del iPhone salen como `IMG_1234.JPG`. Antes de meterlas a `fotos.json`, normaliza los nombres:

```bash
python3 renombrar-fotos.py src/assets/fotos --dry-run   # ver qué haría
python3 renombrar-fotos.py src/assets/fotos             # hacerlo
```

Hace falta porque GitHub Pages distingue mayúsculas y los espacios rompen las URLs. El script está en Python y no en bash por dos razones concretas: macOS guarda los acentos descompuestos, así que comparar contra `"Peña.jpeg"` escrito normal no encuentra el archivo; y el sistema de archivos de macOS no distingue mayúsculas, así que un `mv aguila.JPG aguila.jpg` no hace nada y hay que pasar por un nombre temporal.

### Agregar una foto nueva

1. Pon el archivo en `src/assets/fotos/`, con nombre en minúsculas y sin espacios
2. Agrega una entrada a `src/data/fotos.json`:

```json
{
  "id": "oaxaca-mercado",
  "archivo": "oaxaca-mercado.jpg",
  "pie": "Mercado de Abastos, nov 2026"
}
```

El `id` tiene que ser único. El orden del archivo es el orden en que aparecen.

3. Commit y push.

---

## Los escritos

### Agregar una entrada

Crea un archivo en `src/content/escritos/`, por ejemplo `oaxaca.md`:

```markdown
---
titulo: Tres días en Oaxaca
fecha: 2026-11-10
extracto: Las primeras dos o tres líneas, que es lo que se ve en la lista.
---

Aquí va el texto. Markdown normal: un renglón en blanco separa párrafos,
`## Subtítulo` hace un subtítulo, `*cursivas*` hace cursivas.
```

El nombre del archivo se vuelve la URL: `oaxaca.md` queda en `/escritos/oaxaca`. No hay que tocar ningún índice: la lista se arma sola, ordenada por fecha.

### Si el extracto o el título llevan dos puntos

Ponlo entre comillas:

```yaml
extracto: "Nunca he entendido a julio. El resto del año es legible: marzo anuncia la cuenta."
```

En YAML, unos dos puntos seguidos de espacio significan "aquí empieza otro campo", así que sin comillas el build falla con un error de `Nested mappings are not allowed`. Pasa igual con `#`, `[`, `]`, `{`, `}` al inicio del valor.

### Para poemas

Agrega `verso: true` al frontmatter. Eso conserva los saltos de línea, que es el pendiente viejo del sitio — antes los poemas salían como un bloque corrido porque el HTML colapsa los renglones.

### Para borradores

Agrega `borrador: true`. El archivo se queda en el repo pero no se publica.

---

## Publicar

```bash
git add .
git commit -m "descripción del cambio"
git push
```

El workflow construye y publica solo. Tarda un par de minutos. Puedes ver el progreso en la pestaña Actions del repo.

### Configuración de GitHub Pages (una sola vez)

Importante: el sitio anterior se publicaba desde una rama. Ahora se publica desde el workflow, y eso hay que cambiarlo a mano o el deploy no funciona.

Ve a Settings → Pages → Source y cambia de "Deploy from a branch" a "GitHub Actions".

### El build diario

El workflow también corre todos los días a las 3:00 am de CDMX. Hoy eso no cambia nada, porque todo el contenido vive en el repo. A partir de la fase 2 es lo que va a traer las películas de Letterboxd sin que tengas que hacer nada.

Un detalle: GitHub apaga los workflows programados después de 60 días sin actividad en el repo, en silencio. Si estus pasa dos meses sin commits, el build diario muere. Se revive con el botón "Run workflow" en la pestaña Actions.

---

## Estructura

```
estus/
├── astro.config.mjs           configuración; aquí vive base: '/estus'
├── renombrar-fotos.sh         script de normalización de nombres
├── src/
│   ├── content.config.ts      definición y validación de las colecciones
│   ├── data/
│   │   └── fotos.json         pies de foto y orden de la galería
│   ├── content/escritos/      un .md por entrada
│   ├── assets/fotos/          las imágenes (pasan por el optimizador)
│   ├── layouts/Base.astro     head, header y footer compartidos
│   ├── components/
│   │   └── Lightbox.astro     la vista ampliada de la galería
│   ├── pages/
│   │   ├── index.astro        inicio
│   │   ├── galeria.astro
│   │   └── escritos/
│   ├── lib/
│   │   ├── url.js             construye links respetando el base
│   │   └── fecha.js           formato de fechas en español
│   └── styles/global.css      los tokens y todos los estilos
└── .github/workflows/
    └── build.yml              build y publicación
```

---

## Dos cosas que vale la pena entender

`src/lib/url.js` existe porque el sitio vive en `/estus` y no en la raíz. Si escribes `<a href="/galeria">` el link apunta a `migaresil.github.io/galeria`, que no existe. Todos los links internos pasan por ese helper para no tener que escribir `/estus` a mano en cada uno, y para que el día que el sitio se mueva baste cambiar una línea en `astro.config.mjs`.

`src/content.config.ts` define las colecciones y las valida. Si una entrada de `fotos.json` se queda sin pie de foto, el build falla con un mensaje claro en vez de publicar una foto sin texto. En la fase 2 se agrega ahí la colección de películas, que va a usar el mismo mecanismo pero leyendo el RSS de Letterboxd en lugar de un archivo local.

---

## Pendientes

- `src/content/escritos/una-botella.md` está marcado como borrador porque solo tiene la primera línea. Hay que pegarle el texto completo desde el archivo viejo `posts/unabotella.html` y cambiar `borrador` a `false`.
- La fila de cdmx en el inicio sigue siendo un link muerto con etiqueta "pronto".
