#!/usr/bin/env python3
"""Genera public/calculadora/qalc/catalogo.json: funciones, unidades y constantes de Qalculate! en español.

Las definiciones salen del mismo .wasm (libqalculate las trae incrustadas como XML), así que el catálogo
coincide siempre con el motor. Los textos se traducen con po-defs/es.po de libqalculate (lo que no esté
traducido queda en inglés).
Uso: python3 scripts/catalogo_qalc.py public/calculadora/qalc/libqalculate-0.0.6.wasm
"""
import json, re, sys, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

PO_URL = "https://raw.githubusercontent.com/Qalculate/libqalculate/v5.4.0/po-defs/es.po"
# es.po no distingue contextos: «Length» de unidades sale como «Altura» (el de funciones).
AJUSTES = {"!units!Length": "Longitud"}


def leer_po(texto):
    tr, clave, campo = {}, None, None
    partes = {"msgid": "", "msgstr": ""}
    def cerrar():
        if partes["msgid"] and partes["msgstr"]:
            tr[partes["msgid"]] = partes["msgstr"]
    for linea in texto.splitlines():
        m = re.match(r'(msgid|msgstr) "(.*)"$', linea)
        if m:
            if m[1] == "msgid":
                cerrar(); partes = {"msgid": "", "msgstr": ""}
            campo = m[1]; partes[campo] = m[2]
        elif linea.startswith('"') and campo:
            partes[campo] += linea[1:-1]
    cerrar()
    return {json.loads(f'"{k}"'): json.loads(f'"{v}"') for k, v in tr.items()}


def main(wasm):
    b = Path(wasm).read_bytes()
    xmls, i = [], 0
    while (i := b.find(b"<QALCULATE", i)) >= 0:
        j = b.find(b"</QALCULATE>", i) + len("</QALCULATE>")
        xmls.append(ET.fromstring(b[i:j])); i = j
    po = leer_po(urllib.request.urlopen(PO_URL).read().decode())

    def t(s):
        s = " ".join((s or "").split())
        if s in AJUSTES: return AJUSTES[s]
        if s in po: return po[s]
        s = re.sub(r"^!\w+!", "", s)
        return po.get(s, s)

    def nombre(el, preferir):
        # «ar:m,meter,p:meters» → las letras antes de «:» son banderas (a=abreviatura, p=plural, i=interno…)
        nombres = []
        for n in (el.findtext("names") or el.get("name") or "").split(","):
            flags, _, n = n.strip().rpartition(":")
            if n and "i" not in flags and "p" not in flags: nombres.append((flags, n))
        for flags, n in nombres:
            if preferir in flags: return n
        return nombres[0][1] if nombres else el.get("name")

    out = {"f": [], "u": [], "v": []}
    ETIQ = {"function": "f", "builtin_function": "f", "unit": "u", "builtin_unit": "u", "variable": "v",
            "builtin_variable": "v", "unknown": None, "dataset": "f"}

    def recorrer(el, ruta):
        for h in el:
            if h.tag == "category":
                recorrer(h, ruta + [t(h.findtext("title"))])
            elif ETIQ.get(h.tag) and h.findtext("hidden") != "true" and h.get("active") != "false":
                n = nombre(h, "a" if ETIQ[h.tag] == "u" else "r")
                if n and n.endswith("_c"): n = n[:-2]  # unidad compuesta con prefijo: «km_c» se escribe «km»
                if not n: continue
                fila = [" › ".join(ruta), n, t(h.findtext("title"))]
                if ETIQ[h.tag] == "f":
                    args = sorted(h.findall("argument"), key=lambda a: int(a.get("index", 0)))
                    fila += [[t(a.findtext("title")) or f"arg{a.get('index')}" for a in args], t(h.findtext("description"))]
                out[ETIQ[h.tag]].append(fila)

    for x in xmls: recorrer(x, [])
    destino = Path(wasm).with_name("catalogo.json")
    destino.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(destino, {k: len(v) for k, v in out.items()}, f"{destino.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
