#!/usr/bin/env python3
"""Convertit les karts du « Car Kit » de Kenney (GLB, CC0) en un petit format maison embarqué dans l'appli :
positions sur 16 bits, normales sur 8 bits, couleur par sommet (lue dans la palette colormap.png) — donc ni chargeur glTF ni texture à l'exécution.
Usage : python3 -I tools/k3d-convert.py "<dossier GLB format>" src/vendor/kart3d-models.js"""
import sys, json, struct, base64, os
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
pal = Image.open(os.path.join(src, 'Textures', 'colormap.png')).convert('RGB'); PW, PH = pal.size
CT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def load(name):
    d = open(os.path.join(src, name + '.glb'), 'rb').read(); ln = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + ln]); bin_ = d[20 + ln + 8:]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; f = CT[a['componentType']]; sz = struct.calcsize(f) * n
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); st = bv.get('byteStride', sz)
        return [struct.unpack_from('<' + f * n, bin_, off + k * st) for k in range(a['count'])]
    parts = {}
    for node in j['nodes']:
        if 'mesh' not in node: continue
        P, Nn, C, I = [], [], [], []
        for pr in j['meshes'][node['mesh']]['primitives']:
            base = len(P); pos = acc(pr['attributes']['POSITION']); nor = acc(pr['attributes']['NORMAL']); uv = acc(pr['attributes']['TEXCOORD_0'])
            P += pos; Nn += nor; C += [pal.getpixel((min(PW - 1, max(0, int(u % 1 * PW))), min(PH - 1, max(0, int(v % 1 * PH))))) for (u, v) in uv]
            I += [base + k[0] for k in acc(pr['indices'])]
        parts[node['name']] = dict(P=P, N=Nn, C=C, I=I, t=node.get('translation', [0, 0, 0]))
    return parts
def pack(pt):
    m = max(max(abs(c) for c in p) for p in pt['P']) or 1
    v = b''.join(struct.pack('<3h', *[round(c / m * 32767) for c in p]) for p in pt['P'])
    n = b''.join(struct.pack('<3b', *[max(-127, min(127, round(c * 127))) for c in p]) for p in pt['N'])
    c = b''.join(struct.pack('<3B', *p) for p in pt['C']); i = b''.join(struct.pack('<H', k) for k in pt['I'])
    b = lambda x: base64.b64encode(x).decode()
    return '{s:%.5f,v:"%s",n:"%s",c:"%s",i:"%s"}' % (m, b(v), b(n), b(c), b(i))
names = ['kart-oobi', 'kart-oodi', 'kart-ooli', 'kart-oopi', 'kart-oozi']
js = "/* Karts 3D : « Car Kit » 3.1 de Kenney (www.kenney.nl), licence CC0. Convertis par tools/k3d-convert.py (géométrie + couleur par sommet). */\nconst K3D_MODELS = {\n"
first = load(names[0]); wl = first['wheel-front-left']
js += '  wheel: %s,\n  wheelPos: %s,\n  charPos: %s,\n  karts: [\n' % (pack(wl), json.dumps([[round(c, 4) for c in first[k]['t']] for k in ('wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right')]), json.dumps([round(c, 4) for c in first['character']['t']]))
for nm in names:
    p = load(nm); js += '    { body: %s, driver: %s },\n' % (pack(p[nm]), pack(p['character'])); print(nm, len(p[nm]['P']), 'sommets carrosserie,', len(p['character']['P']), 'pilote, roue', len(p['wheel-front-left']['P']), [round(c, 2) for c in p['wheel-back-left']['t']])
js += '  ]\n};\n'; open(out, 'w').write(js); print(len(js) // 1024, 'Ko')
