#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Añade el campo 'reviews' a cada perfume en data/perfumes.js y sincroniza perfumes.json."""
import json, re
from pathlib import Path

ROOT = Path(r"c:\Users\USUARIO\OneDrive\Desktop\Proyecto\Isabeleé Parfum\isabelee-perfumes")
PERFUMES_JS   = ROOT / "data" / "perfumes.js"
PERFUMES_JSON = ROOT / "data" / "perfumes.json"

# Reseñas provistas por el usuario (nombre/estrellas/fecha/comentario → name/stars/date/comment)
RAW = {
  1: [{"nombre":"Julián P.","estrellas":4,"fecha":"28 Ene 2025","comentario":"Frescura impecable, perfecto para el calor del día."},{"nombre":"Daniel O.","estrellas":3,"fecha":"8 Sep 2025","comentario":"Limpio y elegante, me dura toda la jornada."}],
  2: [{"nombre":"Andrés R.","estrellas":5,"fecha":"9 Feb 2025","comentario":"Sobrio y masculino, justo lo que buscaba."}],
  3: [{"nombre":"Carlos M.","estrellas":4,"fecha":"2 Ago 2025","comentario":"Dulce y adictivo, no puedo dejar de olerme la muñeca."}],
  4: [{"nombre":"Felipe G.","estrellas":5,"fecha":"28 Ene 2025","comentario":"Llega antes que tú, proyecta muchísimo."}],
  5: [{"nombre":"Andrés R.","estrellas":5,"fecha":"5 Mar 2025","comentario":"Buena duración y proyección por el precio."}],
  6: [{"nombre":"Carlos M.","estrellas":5,"fecha":"18 Mar 2025","comentario":"El fondo de vainilla y maderas es espectacular."},{"nombre":"Esteban A.","estrellas":5,"fecha":"28 Ene 2025","comentario":"Una bomba para la noche, dura toda la salida."},{"nombre":"Santiago L.","estrellas":5,"fecha":"23 May 2025","comentario":"Cálido y envolvente, perfecto para invierno."}],
  7: [{"nombre":"Sebastián C.","estrellas":5,"fecha":"2 Ago 2025","comentario":"Huele a recién bañado, muy versátil para la oficina."}],
  8: [{"nombre":"Mateo V.","estrellas":4,"fecha":"19 Abr 2025","comentario":"Versátil y rico, lo uso casi a diario."},{"nombre":"Santiago L.","estrellas":5,"fecha":"14 Jul 2025","comentario":"Buena duración y proyección por el precio."}],
  9: [{"nombre":"Camilo H.","estrellas":4,"fecha":"11 Jun 2025","comentario":"Un seguro de cumplidos, nunca falla."},{"nombre":"Sebastián C.","estrellas":5,"fecha":"30 Jun 2025","comentario":"El más versátil que tengo, sirve para todo."}],
  10:[{"nombre":"Daniel O.","estrellas":4,"fecha":"5 Mar 2025","comentario":"Sobrio y masculino, justo lo que buscaba."},{"nombre":"Julián P.","estrellas":4,"fecha":"20 Ago 2025","comentario":"Amaderado serio y elegante, ideal para la noche."},{"nombre":"Mateo V.","estrellas":4,"fecha":"19 Abr 2025","comentario":"La estela es buenísima, dura horas en la ropa."}],
  11:[{"nombre":"Carolina V.","estrellas":4,"fecha":"30 Jun 2025","comentario":"Tiene un fondo elegante que sorprende."},{"nombre":"Gabriela A.","estrellas":5,"fecha":"23 May 2025","comentario":"Me encanta para el día a día."}],
  12:[{"nombre":"Sofía P.","estrellas":5,"fecha":"8 Sep 2025","comentario":"Huele a vacaciones, fresco y jugoso."}],
  13:[{"nombre":"Sofía P.","estrellas":5,"fecha":"20 Ago 2025","comentario":"Elegante y femenino, recibo muchos halagos."},{"nombre":"Manuela S.","estrellas":5,"fecha":"5 Mar 2025","comentario":"Proyecta muchísimo, ideal para la noche."},{"nombre":"Natalia O.","estrellas":5,"fecha":"30 Jun 2025","comentario":"El contraste dulce con las flores es precioso."}],
  14:[{"nombre":"Andrea L.","estrellas":4,"fecha":"28 Ene 2025","comentario":"El café y la vainilla son una delicia, muy goloso."}],
  15:[{"nombre":"Gabriela A.","estrellas":5,"fecha":"19 Abr 2025","comentario":"Suave y limpio, perfecto para el día."}],
  16:[{"nombre":"Valentina G.","estrellas":4,"fecha":"20 Ago 2025","comentario":"Fresco y femenino, nada empalagoso."},{"nombre":"Laura M.","estrellas":4,"fecha":"2 Abr 2025","comentario":"Limpio y luminoso, una rosa moderna preciosa."}],
  17:[{"nombre":"Gabriela A.","estrellas":5,"fecha":"30 Jun 2025","comentario":"Distinto y elegante, me encanta."},{"nombre":"Isabela T.","estrellas":5,"fecha":"11 Jun 2025","comentario":"Cálido y envolvente, una joya ambarada."}],
  18:[{"nombre":"Manuela S.","estrellas":5,"fecha":"19 Abr 2025","comentario":"Romántico y fresco, mi rosa favorita."}],
  19:[{"nombre":"Laura M.","estrellas":3,"fecha":"12 Ene 2025","comentario":"Fresco y femenino, nada empalagoso."},{"nombre":"Sofía P.","estrellas":4,"fecha":"9 Feb 2025","comentario":"Discreto pero muy fino."},{"nombre":"Luisa F.","estrellas":5,"fecha":"2 Abr 2025","comentario":"Elegante sin esfuerzo, lo uso a diario."}],
  20:[{"nombre":"Manuela S.","estrellas":5,"fecha":"28 Ene 2025","comentario":"La frescura acuática es deliciosa."},{"nombre":"Mariana D.","estrellas":5,"fecha":"19 Abr 2025","comentario":"Luminoso y limpio, ideal para el día."},{"nombre":"Gabriela A.","estrellas":5,"fecha":"2 Ago 2025","comentario":"Muy agradable, alegre y femenino."}],
  21:[{"nombre":"Valentina G.","estrellas":5,"fecha":"2 Abr 2025","comentario":"Femenino y sofisticado, lo amo."}],
  22:[{"nombre":"Natalia O.","estrellas":5,"fecha":"21 Feb 2025","comentario":"Sofisticado y de gran estela, una joya."},{"nombre":"María C.","estrellas":5,"fecha":"12 Ene 2025","comentario":"Lujoso y femenino, recibo muchos halagos."}],
  23:[{"nombre":"Valentina G.","estrellas":5,"fecha":"2 Abr 2025","comentario":"Buen rendimiento y muy femenino."}],
  24:[{"nombre":"Carolina V.","estrellas":4,"fecha":"30 Jun 2025","comentario":"El café lo hace adictivo, me fascina."},{"nombre":"Natalia O.","estrellas":3,"fecha":"19 Abr 2025","comentario":"Uno de los mejores gourmand femeninos."}],
  25:[{"nombre":"Valentina G.","estrellas":5,"fecha":"9 Feb 2025","comentario":"Cítrico delicioso, fresco y veraniego."},{"nombre":"Esteban A.","estrellas":5,"fecha":"8 Sep 2025","comentario":"Unisex muy versátil, lo usamos los dos."}],
  26:[{"nombre":"Mateo V.","estrellas":4,"fecha":"2 Abr 2025","comentario":"Tiene mucha personalidad, no es uno más del montón."},{"nombre":"Laura M.","estrellas":5,"fecha":"7 May 2025","comentario":"La estela es buenísima, dura horas en la ropa."},{"nombre":"Andrés R.","estrellas":4,"fecha":"18 Mar 2025","comentario":"Amaderado serio y elegante, ideal para la noche."}],
  27:[{"nombre":"Paula H.","estrellas":3,"fecha":"7 May 2025","comentario":"Proyecta muchísimo, ideal para la noche."}],
  28:[{"nombre":"Manuela S.","estrellas":4,"fecha":"11 Jun 2025","comentario":"Muy concentrado, dura todo el día."},{"nombre":"Sebastián C.","estrellas":3,"fecha":"8 Sep 2025","comentario":"Distinto y sofisticado, una joya nicho."}],
  29:[{"nombre":"Gabriela A.","estrellas":4,"fecha":"19 Abr 2025","comentario":"Sensual y envolvente, una joya."}],
  30:[{"nombre":"Daniel O.","estrellas":4,"fecha":"8 Sep 2025","comentario":"Nicho de verdad, recibo muchos cumplidos."}],
  31:[{"nombre":"Gabriela A.","estrellas":5,"fecha":"7 May 2025","comentario":"Concentrado y duradero, vale la pena."}],
  32:[{"nombre":"Carolina V.","estrellas":5,"fecha":"30 Jun 2025","comentario":"Floral elegante con buena estela."},{"nombre":"Juan D.","estrellas":5,"fecha":"18 Mar 2025","comentario":"Versátil y luminoso, sirve día y noche."},{"nombre":"María C.","estrellas":5,"fecha":"28 Ene 2025","comentario":"Original y agradable, recibo halagos."}],
  33:[{"nombre":"Luisa F.","estrellas":3,"fecha":"30 Jun 2025","comentario":"El oud con tonka es una maravilla, potentísimo."},{"nombre":"Andrés R.","estrellas":4,"fecha":"14 Jul 2025","comentario":"Opulento y dulce, una joya nicho."},{"nombre":"Valentina G.","estrellas":4,"fecha":"11 Jun 2025","comentario":"Espectacular para la noche, gran personalidad."}],
  34:[{"nombre":"Mateo V.","estrellas":5,"fecha":"11 Jun 2025","comentario":"Lujo discreto, recibo cumplidos."},{"nombre":"Alejandro S.","estrellas":3,"fecha":"28 Ene 2025","comentario":"Sofisticado y discreto, ideal para el día."}],
}

# Mapear nombre/estrellas/fecha/comentario → name/stars/date/comment
REVIEWS = {
  pid: [{"name": r["nombre"], "stars": r["estrellas"], "date": r["fecha"], "comment": r["comentario"]}
        for r in arr]
  for pid, arr in RAW.items()
}

# Leer y parsear perfumes.js
content = PERFUMES_JS.read_text(encoding="utf-8").strip()
json_str = re.sub(r"^window\.PERFUMES\s*=\s*", "", content)
json_str = re.sub(r";?\s*$", "", json_str)
perfumes = json.loads(json_str)

# Añadir campo reviews
for p in perfumes:
    p["reviews"] = REVIEWS.get(p["id"], [])

# Escribir perfumes.js
lines = ["window.PERFUMES = ["]
for i, p in enumerate(perfumes):
    comma = "," if i < len(perfumes) - 1 else ""
    lines.append("  " + json.dumps(p, ensure_ascii=False, separators=(",", ":")) + comma)
lines.append("];")
PERFUMES_JS.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("[OK] data/perfumes.js actualizado con reviews")

# Sincronizar perfumes.json
PERFUMES_JSON.write_text(json.dumps(perfumes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("[OK] data/perfumes.json sincronizado")

# Verificacion rapida
for pid in [1, 6, 12]:
    p = next(x for x in perfumes if x["id"] == pid)
    n = len(p["reviews"])
    avg = sum(r["stars"] for r in p["reviews"]) / n if n else 0
    print(f"  id={pid}: {n} resena(s), avg={avg:.1f}")
