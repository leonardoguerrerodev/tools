// Obsedium Tools: sirve las herramientas de public/ solo con la contraseña maestra.
// El Worker corre antes que los archivos (run_worker_first), así que sin sesión no sale ni un byte de las tools.
//
// Secretos (no van al repo):
//   TOOLS_PASSWORD  la contraseña maestra            →  npx wrangler secret put TOOLS_PASSWORD
//   SESSION_SECRET  clave para firmar la sesión      →  npx wrangler secret put SESSION_SECRET
// Cambiar TOOLS_PASSWORD cierra todas las sesiones abiertas (la firma incluye su huella).

const COOKIE = "tools_sesion";
const DIAS = 30;
const ESPERA_FALLO_MS = 1500; // frena la fuerza bruta

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function hmac(clave, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(clave), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}
function igual(a, b) { // comparación en tiempo constante
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const configurado = env => !!(env.TOOLS_PASSWORD && env.SESSION_SECRET);

async function firmar(env, vence) {
  return hmac(env.SESSION_SECRET, `${vence}.${await sha256(env.TOOLS_PASSWORD)}`);
}
async function sesionValida(req, env) {
  const m = (req.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([0-9a-f]{64})`));
  if (!m) return false;
  const vence = Number(m[1]);
  if (!(vence > Date.now())) return false;
  return igual(m[2], await firmar(env, vence));
}

function seguridad(res) {
  const r = new Response(res.body, res);
  r.headers.set("X-Frame-Options", "DENY");
  r.headers.set("X-Content-Type-Options", "nosniff");
  r.headers.set("Referrer-Policy", "no-referrer");
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  r.headers.set("Strict-Transport-Security", "max-age=31536000");
  return r;
}
// solo rutas internas: evita redirigir a otro sitio con ?volver=//malo.com
const rutaSegura = p => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\")) ? p : "/";

function paginaEntrar(volver, error, estado = 401) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Obsedium Tools</title><meta name="robots" content="noindex">
<script>(function(){var t=null;try{t=localStorage.getItem("obsedium-tema")}catch(e){}if(t==="oscuro"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.tema="oscuro"})();</script>
<style>
  :root { --fondo:#f6f4ef; --panel:#fff; --borde:#ddd8cb; --texto:#1d1d1b; --suave:#6b675e; --acento:#2f5da8; --mal:#b3261e; }
  :root[data-tema="oscuro"] { --fondo: #15161a; --panel: #1e2025; --borde: #363940; --texto: #e7e5e0; --suave: #a29e95; --acento: #7ea6e6; --mal: #f2827a; color-scheme: dark; }
  :root[data-tema="oscuro"] button[type=submit] { color: #10131a; }
  input[type=password] { background: var(--panel); color: var(--texto); }
  #b-tema { position: fixed; top: 14px; right: 14px; font-size: 15px; padding: 4px 10px; border: 1px solid var(--borde); border-radius: 8px; background: var(--panel); cursor: pointer; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--fondo); color:var(--texto); font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; padding:16px; }
  form { background:var(--panel); border:1px solid var(--borde); border-radius:14px; padding:26px; width:min(360px,100%); }
  h1 { font-size:19px; margin:0 0 4px; } p { margin:0 0 16px; color:var(--suave); font-size:13.5px; }
  label { display:block; font-size:13px; color:var(--suave); margin-bottom:4px; }
  input[type=password] { width:100%; font:inherit; padding:9px 10px; border:1px solid var(--borde); border-radius:8px; }
  input:focus, button:focus-visible { outline:2px solid var(--acento); outline-offset:1px; }
  button { margin-top:14px; width:100%; font:inherit; padding:9px; border:0; border-radius:8px; background:var(--acento); color:#fff; cursor:pointer; }
  .error { color:var(--mal); font-size:13.5px; margin:10px 0 0; }
</style></head><body>
<button id="b-tema" type="button" title="Modo claro u oscuro" aria-label="Cambiar entre modo claro y oscuro"></button>
<form method="post" action="/entrar">
  <h1>Obsedium Tools</h1>
  <p>Herramientas privadas. Escribe la contraseña maestra.</p>
  <label for="c">Contraseña</label>
  <input id="c" name="clave" type="password" autocomplete="current-password" required autofocus>
  <input type="hidden" name="volver" value="${esc(volver)}">
  <button type="submit">Entrar</button>
  ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ""}
</form>
<script>(function(){var b=document.getElementById("b-tema");function p(){b.textContent=document.documentElement.dataset.tema==="oscuro"?"☀️":"🌙"}b.onclick=function(){var o=document.documentElement.dataset.tema!=="oscuro";if(o)document.documentElement.dataset.tema="oscuro";else delete document.documentElement.dataset.tema;try{localStorage.setItem("obsedium-tema",o?"oscuro":"claro")}catch(e){}p()};p()})();</script></body></html>`;
  return seguridad(new Response(html, { status: estado, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!configurado(env)) // sin secretos no se abre nada
      return seguridad(new Response("Obsedium Tools: falta configurar la contraseña maestra.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }));

    if (url.pathname === "/salir")
      return seguridad(new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict` } }));

    if (url.pathname === "/entrar" && req.method === "POST") {
      const datos = await req.formData().catch(() => null);
      const clave = String(datos?.get("clave") ?? ""), volver = rutaSegura(String(datos?.get("volver") ?? "/"));
      const ok = igual(await sha256(clave), await sha256(env.TOOLS_PASSWORD));
      if (!ok) {
        await new Promise(r => setTimeout(r, ESPERA_FALLO_MS));
        return paginaEntrar(volver, "Contraseña incorrecta.");
      }
      const vence = Date.now() + DIAS * 864e5;
      return seguridad(new Response(null, { status: 303, headers: {
        Location: volver,
        "Set-Cookie": `${COOKIE}=${vence}.${await firmar(env, vence)}; Path=/; Max-Age=${DIAS * 86400}; HttpOnly; Secure; SameSite=Strict`,
      } }));
    }

    if (!(await sesionValida(req, env))) return paginaEntrar(rutaSegura(url.pathname + url.search));
    const res = await env.ASSETS.fetch(req);
    const r = seguridad(res);
    r.headers.set("Cache-Control", "private, no-store");
    return r;
  },
};
