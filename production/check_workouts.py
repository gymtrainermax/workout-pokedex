#!/usr/bin/env python3
"""Workout Dex static preflight. Usage: python production/check_workouts.py data.js

Checks structure, workout prescriptions, duplicate four-move cores, and A/B parity.
Human editor still verifies official learnsets, exercise science, and filmed camera tests.
"""
import json,re,sys
from pathlib import Path

p=Path(sys.argv[1] if len(sys.argv)>1 else 'data.js')
s=p.read_text(encoding='utf-8').strip()
lead='window.WORKOUT_DEX_SEED = '
assert s.startswith(lead) and s.endswith(';'), 'invalid public seed wrapper'
db=json.loads(s[len(lead):-1]); problems=[]; observed={}

def check(test,msg):
    if not test:problems.append(msg)

for e in db['entries']:
    if e['kind']!='pokemon' or not (e.get('publicWorkout') or e.get('status')=='Final'):continue
    id_=e['id']; moves=e.get('moves') or []; prog=e.get('production') or {}
    check(len(moves)==4,f'{id_}: needs four official moves')
    if len(moves)==4:
        names=[str(m.get('name','')).strip().casefold() for m in moves]
        check(all(names) and len(set(names))==4,f'{id_}: move names must be nonempty and distinct')
        core=tuple(sorted(names))
        check(core not in observed,f'{id_}: duplicate four-move set (also {observed.get(core)})')
        observed[core]=id_
        for m in moves:
            check(m.get('verified') is True and m.get('pokemonTest') is True and m.get('trainerTest') is True,f'{id_}: unverified move/analogy {m.get("name")}')
            check(bool(m.get('type') and m.get('exercise') and m.get('reps')),f'{id_}: move missing type/exercise/dose: {m.get("name")}')
            check(any(x.get('alias','').casefold()==m.get('name','').casefold() and x.get('name')==m.get('exercise') for x in e.get('exercises',[])),f'{id_}: no matching exercise for move {m.get("name")}')
            if e.get('status')!='Final':check(m.get('cameraTest') is False,f'{id_}: pre-filming camera test must remain pending')
    check(e.get('publicWorkout') is True,f'{id_}: must be explicitly approved for draft public publication')
    check(e.get('status') in ('Review','Final'),f'{id_}: status must not imply filmed completion')
    check(len(e.get('exercises') or [])>=4,f'{id_}: too few programmed exercises')
    for x in e.get('exercises',[]):
        check(all(x.get(k) for k in ['name','sets','reps','rest','notes']),f'{id_}: exercise lacks prescription or safety/scaling cue: {x.get("name")}')
    check(all(e.get('workout',{}).get(k) for k in ['warmup','main','cooldown','modifications','safety']),f'{id_}: incomplete workout sections')
    check(all(e.get('research',{}).get(k) for k in ['pokedex','anatomy','behavior','learnset','sources']),f'{id_}: incomplete research checklist')
    check(all(e.get('content',{}).get(k) for k in ['hook','script','filming','cover','caption','hashtags','callToAction']),f'{id_}: incomplete production/social package')
    check(len([x for x in e['content'].get('hashtags','').split(',') if x.strip()])==5,f'{id_}: should have five hashtags')
    check(e.get('quality',{}).get('visual') is False if e['status']=='Review' else True,f'{id_}: visual QA status does not match Review/Final')
    vers=prog.get('versions') or []
    is_program_only=prog.get('releaseStage')=='program-only'
    if is_program_only:
        # Explicit creator-directed program-only release: video QA has NOT passed.
        check(e['status']=='Review',f'{id_}: program-only release cannot be Final')
        check(not vers,f'{id_}: program-only release must not misrepresent scripts as approved')
        check('pending' in str(prog.get('videoStatus','')).lower(),f'{id_}: program-only release must label scripts pending')
        check(len(prog.get('shootList') or [])>=4,f'{id_}: needs filming feasibility notes for all moves')
    else:
        check(len(vers)==2 and [v.get('id') for v in vers]==['a','b'],f'{id_}: needs gym-comedy A and Pokémon-comedy B')
    if len(vers)==2:
        a,b=vers
        check(len(a.get('beats',[]))==len(b.get('beats',[]))>=6,f'{id_}: unequal/incomplete A/B beats')
        check([v.get('time') for v in a['beats']]==[v.get('time') for v in b['beats']],f'{id_}: A/B timecode mismatch')
        check([v.get('onScreen') for v in a['beats']]==[v.get('onScreen') for v in b['beats']],f'{id_}: unequal A/B workout overlays')
    if not is_program_only:check(len(prog.get('shootList') or [])>=12,f'{id_}: insufficient filming plan')
    check(len(prog.get('cameraTests') or [])==4,f'{id_}: needs four camera tests')
    check(bool(prog.get('assets')),f'{id_}: no linked supporting production documents')
    for asset in prog.get('assets',[]):
        check((p.parent/asset).is_file(),f'{id_}: missing production asset: {asset}')
    print(f'{id_} {e["name"]}: {len(moves)} moves, {len(e.get("exercises",[]))} exercises, {len(vers)} videos, {len(prog.get("shootList",[]))} shots')

if problems:
    for m in problems:print('FAIL:',m,file=sys.stderr)
    raise SystemExit(f'{len(problems)} checks failed')
print(f'PASS: checked {len(observed)} published Pokémon workouts. NOTE: filmed Camera Tests, exercise technique and official move legality require human review.')