# estus

Sitio personal minimalista. Galería de fotos, blog y (próximamente) recomendaciones CDMX.

## Estructura

```
estus/
├── index.html          ← página principal
├── galeria.html        ← galería de fotos
├── blog.html           ← lista de entradas
├── css/
│   └── style.css       ← todos los estilos
├── fotos/              ← pon aquí tus imágenes (créala tú)
│   └── foto-01.jpg
│   └── ...
└── posts/              ← una entrada por archivo
    └── nejayote-scp.html   ← ejemplo / plantilla
```

---

## Cómo subir a GitHub Pages

### Primera vez

```bash
# 1. Clona o inicializa el repo
git init
git add .
git commit -m "primer commit"

# 2. Conéctalo a GitHub
git remote add origin https://github.com/migaresil/estus.git
git branch -M main
git push -u origin main
```

Luego en GitHub:
- Ve a **Settings → Pages**
- En "Source" selecciona **main** y carpeta **/ (root)**
- Guarda. En 1–2 minutos tu sitio estará en: `https://migaresil.github.io/estus`

### Cada vez que hagas cambios

```bash
git add .
git commit -m "descripción del cambio"
git push
```

---

## Cómo agregar fotos

1. Crea la carpeta `fotos/` en el proyecto si no existe
2. Pon tus imágenes ahí (`foto-01.jpg`, `foto-verano.jpg`, etc.)
3. En `galeria.html`, copia un bloque `<figure>` y cambia el `src` y el `<figcaption>`
4. Haz commit y push

Las fotos se acomodan solas en la cuadrícula tipo masonry — no importa el orden ni el tamaño.

---

## Cómo escribir una entrada de blog

1. Copia `posts/nejayote-scp.html` con un nombre nuevo (ej: `posts/mi-entrada.html`)
2. Cambia el `<title>`, la `<time>`, el `<h1>` y el texto
3. En `blog.html`, agrega un bloque `<article>` nuevo **arriba** de los demás (orden cronológico inverso)
4. Haz commit y push

---

## Tipografía

- Títulos: **DM Serif Display** (elegante, editorial)
- Textos y fechas: **DM Mono** (limpio, técnico)

Ambas cargan de Google Fonts, sin costo.
