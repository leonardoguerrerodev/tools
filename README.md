# Obsedium Tools

Herramientas propias, publicadas en **https://tools.obsedium.cl** detrás de una contraseña maestra.

## Cómo está hecho

- `public/`: el sitio. `public/index.html` es el índice y cada herramienta vive en su carpeta
  (`public/taller-triangulos/index.html`). Son páginas estáticas que funcionan sin internet.
- `src/index.js`: un Worker de Cloudflare que corre **antes** que los archivos (`run_worker_first`).
  Sin sesión válida responde con la página de contraseña, así que ninguna herramienta se entrega sin entrar.
- La sesión es una cookie firmada (HMAC) que dura 30 días. Cambiar la contraseña cierra todas las sesiones.

## Secretos

No van al repo. Se configuran en Cloudflare:

```bash
npx wrangler secret put TOOLS_PASSWORD   # la contraseña maestra
npx wrangler secret put SESSION_SECRET   # clave aleatoria larga para firmar la sesión
```

Sin los dos secretos el sitio no abre nada (responde 503).

## Agregar una herramienta

1. Crear `public/<nombre>/index.html`.
2. Copiar una tarjeta en `public/index.html` apuntando a `/<nombre>/`.
3. Commit y push a `main`: Cloudflare (Workers Builds) despliega solo.

## Probar en local

Crear `.dev.vars` (ignorado por git) con `TOOLS_PASSWORD=...` y `SESSION_SECRET=...`, y correr `npx wrangler dev`.
