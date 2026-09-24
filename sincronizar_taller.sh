#!/usr/bin/env bash
# Publica el Taller de triángulos: lo copia desde Clase/ (su fuente de verdad), le agrega el «←» al índice,
# y si cambió, commitea y pushea (push a main = Cloudflare lo despliega solo).
# Uso: ./sincronizar_taller.sh            copia, commitea y pushea
#      ./sincronizar_taller.sh --sin-push  solo copia (para revisar con git diff antes)
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
FUENTE="$HOME/Documentos/Clase/Semestre_II/02_Matrices/Trigonometria/Taller_Triangulos.html"
DESTINO="$AQUI/public/taller-triangulos/index.html"

[ -f "$FUENTE" ] || { echo "No encuentro el taller en: $FUENTE" >&2; exit 1; }
python3 - "$FUENTE" "$DESTINO" <<'EOF'
import sys
fuente, destino = sys.argv[1], sys.argv[2]
s = open(fuente, encoding="utf-8").read()
o = "  <h1>Taller de triángulos</h1>"
if s.count(o) != 1:
    sys.exit("La cabecera del taller cambió: no sé dónde poner el «←». Revisa el <h1>.")
s = s.replace(o, '  <h1><a href="/" title="Volver a Obsedium Tools" style="color:inherit;text-decoration:none">← </a>Taller de triángulos</h1>')
open(destino, "w", encoding="utf-8").write(s)
EOF

cd "$AQUI"
if git diff --quiet -- "$DESTINO"; then echo "El taller publicado ya está al día."; exit 0; fi
git --no-pager diff --stat -- "$DESTINO"
[ "${1:-}" = "--sin-push" ] && { echo "Copiado (sin commit). Revisa con: git diff"; exit 0; }
git add "$DESTINO"
git commit -q -m "Taller de triángulos: sincronizado desde Clase"
git push -q
echo "Publicado: Cloudflare lo despliega en tools.obsedium.cl en un par de minutos."
