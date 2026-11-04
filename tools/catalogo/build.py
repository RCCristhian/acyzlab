"""Construye exercises-extra.json a partir de Free Exercise DB + traducciones (es1-3.txt)."""
import json, re, sys, os

SRC = sys.argv[1]   # carpeta fedb
OUT = sys.argv[2]   # ruta del json de salida

d = {x['id']: x for x in json.load(open(os.path.join(SRC, 'exercises.json'), encoding='utf8'))}
rows = []
for f in ['es1.txt', 'es2.txt', 'es3.txt']:
    for line in open(os.path.join(SRC, f), encoding='utf8'):
        line = line.rstrip('\n')
        if not line.strip():
            continue
        parts = line.split('|')
        assert len(parts) == 4, line
        rows.append(parts)

EQ = {'barbell': 'barradisco', 'dumbbell': 'mancuernas', 'kettlebells': 'pesarusa', 'cable': 'poleas',
      'bands': 'banda', 'medicine ball': 'balon', 'exercise ball': 'fitball', 'e-z curl bar': 'barraz',
      'body only': 'ninguno', 'other': 'ninguno', None: 'ninguno'}
LEGS = {'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'}
MUS = {'quadriceps': 'cuádriceps', 'hamstrings': 'isquiotibiales', 'glutes': 'glúteos', 'calves': 'gemelos',
       'adductors': 'aductores', 'abductors': 'abductores', 'chest': 'pecho', 'shoulders': 'hombros',
       'triceps': 'tríceps', 'biceps': 'bíceps', 'lats': 'dorsales', 'middle back': 'espalda media',
       'lower back': 'zona lumbar', 'traps': 'trapecios', 'forearms': 'antebrazos', 'abdominals': 'abdomen',
       'neck': 'cuello'}
RARE = set('''Spell_Caster Cuban_Press Around_The_Worlds Bradford_Rocky_Presses Standing_Bradford_Press Iron_Cross Cable_Iron_Cross
Kettlebell_Pirate_Ships Kettlebell_Figure_8 Bent_Press Power_Partials Cocoons Frog_Sit-Ups Janda_Sit-Up Isometric_Wipers Clock_Push-Up
Flexor_Incline_Dumbbell_Curls Incline_Inner_Biceps_Curl Seated_Dumbbell_Inner_Biceps_Curl Standing_Inner-Biceps_Curl Drag_Curl Landmine_180s
Gorilla_Chin_Crunch Side_To_Side_Chins Gironda_Sternum_Chins Body-Up Butt-Ups Downward_Facing_Balance Kettlebell_Pass_Between_The_Legs
Lunge_Pass_Through Cable_Judo_Flip Leg-Over_Floor_Press Press_Sit-Up Plate_Twist Otis-Up Svend_Press Reverse_Plate_Curls Front_Plate_Raise
Barbell_Shrug_Behind_The_Back Dumbbell_Raise Single-Arm_Push-Up Bottoms-Up_Clean_From_The_Hang_Position JM_Press Tate_Press'''.split())
WEIGHTED = {'mancuernas', 'pesarusa', 'barradisco', 'barraz'}

out, seen = [], set()
for fid, name, desc, ov in rows:
    x = d[fid]
    assert fid not in seen, fid
    seen.add(fid)
    o = {}
    for tok in filter(None, ov.split(';')):
        k, _, v = tok.partition('=')
        o[k] = v if v else True
    cat = x['category']
    prim = x['primaryMuscles']
    # equipo
    if 'eq' in o:
        eq = o['eq']
    elif x['equipment'] == 'machine':
        eq = 'maqpiernas' if set(prim) & LEGS else 'poleas'
    else:
        eq = EQ[x['equipment']]
    machine = eq in ('poleas', 'maqpiernas')
    # grupo
    if 'g' in o:
        g = o['g']
    elif cat == 'stretching':
        g = 'estiramiento'
    elif cat in ('cardio', 'plyometrics'):
        g = 'empuje' if prim[0] in ('chest', 'triceps') else 'cardio'
    else:
        m = prim[0]
        if m in LEGS: g = 'piernas'
        elif m in ('chest', 'triceps'): g = 'empuje'
        elif m == 'shoulders': g = 'empuje' if x['force'] == 'push' else 'traccion'
        elif m == 'abdominals': g = 'core'
        else: g = 'traccion'
    level = int(o['l']) if 'l' in o else {'beginner': 1, 'intermediate': 2, 'expert': 3}[x['level']]
    if g in ('estiramiento', 'calentamiento'):
        level = min(level, 2)
    if 't' in o: typ = o['t']
    elif g in ('estiramiento', 'calentamiento') or x['force'] == 'static' or cat == 'cardio': typ = 'time'
    else: typ = 'reps'
    if 'lo' in o:
        loads = o['lo'].split(',')
    elif g == 'piernas' and re.search(r'Squat|Lunge|Jump', fid) and typ == 'reps':
        loads = ['rodillas']
    else:
        loads = []
    e = {'id': 'f-' + re.sub(r'[^a-z0-9]+', '-', fid.lower()).strip('-'), 'media': fid if x['images'] else None, 'name': name, 'group': g,
         'equip': [eq], 'level': level, 'type': typ, 'loads': loads, 'space': int(o.get('sp', 1))}
    if 'ps' in o: e['perSide'] = True
    if eq in WEIGHTED:
        if 'k' in o: e['kgFactor'] = float(o['k'])
        else:
            iso = x.get('mechanic') == 'isolation'
            e['kgFactor'] = {'mancuernas': 0.06 if iso else 0.1, 'pesarusa': 0.08 if iso else 0.12,
                             'barradisco': 0.15 if iso else 0.3, 'barraz': 0.15}[eq]
    if machine: e['machine'] = True
    if 'n' in o: e['needs'] = o['n'].split(',')
    if 'na' in o: e['needsAny'] = o['na'].split(',')
    if 'skip' in o: e['skipIf'] = o['skip'].split(',')
    if 'pr' in o: pri = float(o['pr'])
    elif cat == 'olympic weightlifting' or re.search(r'Clean|Snatch|Jerk|Turkish', fid): pri = -0.3 if fid in ('Power_Clean', 'Hang_Clean', 'Dumbbell_Clean', 'Kettlebell_Hang_Clean') else -0.55
    elif fid in RARE: pri = -0.35
    else: pri = 0.15 if x.get('mechanic') == 'compound' else -0.15 if x.get('mechanic') == 'isolation' else 0
    if pri: e['pri'] = pri
    e['mus'] = [MUS[m] for m in prim + x['secondaryMuscles'] if m in MUS][:4]
    e['desc'] = desc
    if not e['media']: del e['media']
    out.append(e)

ids = [e['id'] for e in out]
assert len(ids) == len(set(ids))
json.dump(out, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(len(out), 'ejercicios')
print(Counter(e['group'] for e in out))
print(Counter(e['equip'][0] for e in out))
print('bytes', os.path.getsize(OUT))
