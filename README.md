# Obsedium Tools

Herramientas propias, abiertas en **https://tools.obsedium.cl** (repo público).

## Cómo está hecho

- `public/`: el sitio, solo archivos estáticos. `public/index.html` es el índice y cada herramienta vive en su carpeta
  (`public/taller-triangulos/index.html`). Funcionan sin internet.
- No hay código de Worker: `wrangler.toml` publica `public/` como assets y Cloudflare los sirve directo.
  Las cabeceras (seguridad y caché del motor de la calculadora) están en `public/_headers`.
- Si algún día una herramienta necesita datos privados, protegerla con Cloudflare Access (login con Google/GitHub)
  en su propia ruta, no con una clave casera.

## Agregar una herramienta

1. Crear `public/<nombre>/index.html`.
2. Copiar una tarjeta en `public/index.html` apuntando a `/<nombre>/`.
3. Commit y push a `main`: Cloudflare (Workers Builds) despliega solo.

## Taller de triángulos

Su fuente de verdad es `~/Documentos/Clase/Semestre_II/02_Matrices/Trigonometria/Taller_Triangulos.html`.
Para publicar un cambio: `./sincronizar_taller.sh` (copia, agrega el «←» al índice, commitea y pushea;
`--sin-push` solo copia).

## Calculadora científica

`public/calculadora/`: frontend propio (estilo Casio fx-82MS) sobre [libqalculate-wasm](https://github.com/stephtr/libqalculate-wasm)
(GPL-3.0), copiado tal cual en `public/calculadora/qalc/` con la versión en el nombre.

- Menús como el Qalculate de escritorio: Modo, Convertir, Guardar, Funciones, Unidades, Graficar, Bases numéricas, Teclado y Menú.
- Editor 2D: `^` abre un exponente que se mantiene hasta espacio o → (escribe `^( )`), `a/b` se dibuja como fracción,
  `número_unidad` como unidad (20_s) y `nombre_índice` como subíndice (a_1). El texto es lo que se calcula.
- `qalc/catalogo.json` (funciones, unidades y constantes en español) sale del propio wasm:
  `python3 scripts/catalogo_qalc.py public/calculadora/qalc/libqalculate-<v>.wasm`.
- PWA (`manifest.webmanifest`, `sw.js`): se instala y funciona sin internet.
- Chrome no deja angostar una ventana normal por debajo de ~500 px: el botón ⧉ abre una ventana flotante del tamaño
  de la calculadora, y dentro de ella (o en la app instalada) ⇔ la vuelve a ajustar.
- Tasas de cambio: FloatRates (base EUR), una vez al día desde el navegador.
- Actualizar el motor: `npm pack libqalculate-wasm@<v>`, copiar `libqalculate.js`/`.wasm` con el nuevo nombre, cambiar la
  versión en `index.html` y `sw.js` (y subir `CACHE`), y regenerar el catálogo.

## Probar en local

Crear `.dev.vars` (ignorado por git) con `TOOLS_PASSWORD=...` y `SESSION_SECRET=...`, y correr `npx wrangler dev`.
