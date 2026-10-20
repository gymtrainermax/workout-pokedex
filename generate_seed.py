import json, datetime, re
from pathlib import Path
root=Path(__file__).parent
text='''
Bulbasaur|Grass,Poison
Ivysaur|Grass,Poison
Venusaur|Grass,Poison
Charmander|Fire
Charmeleon|Fire
Charizard|Fire,Flying
Squirtle|Water
Wartortle|Water
Blastoise|Water
Caterpie|Bug
Metapod|Bug
Butterfree|Bug,Flying
Weedle|Bug,Poison
Kakuna|Bug,Poison
Beedrill|Bug,Poison
Pidgey|Normal,Flying
Pidgeotto|Normal,Flying
Pidgeot|Normal,Flying
Rattata|Normal
Raticate|Normal
Spearow|Normal,Flying
Fearow|Normal,Flying
Ekans|Poison
Arbok|Poison
Pikachu|Electric
Raichu|Electric
Sandshrew|Ground
Sandslash|Ground
Nidoran♀|Poison
Nidorina|Poison
Nidoqueen|Poison,Ground
Nidoran♂|Poison
Nidorino|Poison
Nidoking|Poison,Ground
Clefairy|Fairy
Clefable|Fairy
Vulpix|Fire
Ninetales|Fire
Jigglypuff|Normal,Fairy
Wigglytuff|Normal,Fairy
Zubat|Poison,Flying
Golbat|Poison,Flying
Oddish|Grass,Poison
Gloom|Grass,Poison
Vileplume|Grass,Poison
Paras|Bug,Grass
Parasect|Bug,Grass
Venonat|Bug,Poison
Venomoth|Bug,Poison
Diglett|Ground
Dugtrio|Ground
Meowth|Normal
Persian|Normal
Psyduck|Water
Golduck|Water
Mankey|Fighting
Primeape|Fighting
Growlithe|Fire
Arcanine|Fire
Poliwag|Water
Poliwhirl|Water
Poliwrath|Water,Fighting
Abra|Psychic
Kadabra|Psychic
Alakazam|Psychic
Machop|Fighting
Machoke|Fighting
Machamp|Fighting
Bellsprout|Grass,Poison
Weepinbell|Grass,Poison
Victreebel|Grass,Poison
Tentacool|Water,Poison
Tentacruel|Water,Poison
Geodude|Rock,Ground
Graveler|Rock,Ground
Golem|Rock,Ground
Ponyta|Fire
Rapidash|Fire
Slowpoke|Water,Psychic
Slowbro|Water,Psychic
Magnemite|Electric,Steel
Magneton|Electric,Steel
Farfetch'd|Normal,Flying
Doduo|Normal,Flying
Dodrio|Normal,Flying
Seel|Water
Dewgong|Water,Ice
Grimer|Poison
Muk|Poison
Shellder|Water
Cloyster|Water,Ice
Gastly|Ghost,Poison
Haunter|Ghost,Poison
Gengar|Ghost,Poison
Onix|Rock,Ground
Drowzee|Psychic
Hypno|Psychic
Krabby|Water
Kingler|Water
Voltorb|Electric
Electrode|Electric
Exeggcute|Grass,Psychic
Exeggutor|Grass,Psychic
Cubone|Ground
Marowak|Ground
Hitmonlee|Fighting
Hitmonchan|Fighting
Lickitung|Normal
Koffing|Poison
Weezing|Poison
Rhyhorn|Ground,Rock
Rhydon|Ground,Rock
Chansey|Normal
Tangela|Grass
Kangaskhan|Normal
Horsea|Water
Seadra|Water
Goldeen|Water
Seaking|Water
Staryu|Water
Starmie|Water,Psychic
Mr. Mime|Psychic,Fairy
Scyther|Bug,Flying
Jynx|Ice,Psychic
Electabuzz|Electric
Magmar|Fire
Pinsir|Bug
Tauros|Normal
Magikarp|Water
Gyarados|Water,Flying
Lapras|Water,Ice
Ditto|Normal
Eevee|Normal
Vaporeon|Water
Jolteon|Electric
Flareon|Fire
Porygon|Normal
Omanyte|Rock,Water
Omastar|Rock,Water
Kabuto|Rock,Water
Kabutops|Rock,Water
Aerodactyl|Rock,Flying
Snorlax|Normal
Articuno|Ice,Flying
Zapdos|Electric,Flying
Moltres|Fire,Flying
Dratini|Dragon
Dragonair|Dragon
Dragonite|Dragon,Flying
Mewtwo|Psychic
Mew|Psychic
'''
items=[line.split('|') for line in text.strip().splitlines()]
assert len(items)==151, len(items)

def skeleton(id,name,kind,chapter,number=None,types=None,baseId=None,form=None,formGroup=None,role=None):
 return dict(id=id,name=name,kind=kind,chapter=chapter,dexNumber=number,types=types or [],baseId=baseId,form=form,formGroup=formGroup,role=role,status='Planned',difficulty='Unassigned',goal='',goalRationale='',durationMinutes='',equipment=[],moves=[],exercises=[],workout={'warmup':'','main':'','cooldown':'','modifications':'','safety':''},research={'pokedex':'','anatomy':'','behavior':'','learnset':'','sources':''},content={'hook':'','script':'','filming':'','onScreen':'','ending':'','caption':'','cover':'','callToAction':'','hashtags':''},quality={'accuracy':False,'programming':False,'visual':False,'moveset':False,'writing':False},notes='',videoUrl='',updatedAt=None,finalizedAt=None)

entries=[]
entries.append(skeleton('oak-000','Professor Oak','character','Prologue',role='Professor'))
for i,(name,ty) in enumerate(items,1):
 entries.append(skeleton(f'kanto-{i:03d}',name,'pokemon','Original 151',i,ty.split(',')))
for name in ['Red','Blue','Green']:
 entries.append(skeleton(f'trainer-{name.lower()}',name,'character','Trainers',role='Trainer'))
for name in ['Brock','Misty','Lt. Surge','Erika','Koga','Sabrina','Blaine','Giovanni']:
 entries.append(skeleton('leader-'+re.sub('[^a-z]','-',name.lower()).strip('-'),name,'character','Gym Leaders',role='Gym Leader'))
for name in ['Lorelei','Bruno','Agatha','Lance']:
 entries.append(skeleton('elite-'+name.lower(),name,'character','Elite Four',role='Elite Four'))

# Curated Kanto-associated form seeds. The list is a starting catalog, not a claim
# to enumerate every gender, cosmetic, event, or future form.
regional={
'Alolan':['Rattata','Raticate','Raichu','Sandshrew','Sandslash','Vulpix','Ninetales','Diglett','Dugtrio','Meowth','Persian','Geodude','Graveler','Golem','Grimer','Muk','Exeggutor','Marowak'],
'Galarian':['Meowth','Ponyta','Rapidash','Slowpoke','Slowbro',"Farfetch'd",'Weezing','Mr. Mime','Articuno','Zapdos','Moltres'],
'Hisuian':['Growlithe','Arcanine','Voltorb','Electrode']}
mega={'Mega':['Venusaur','Blastoise','Beedrill','Pidgeot','Alakazam','Slowbro','Gengar','Kangaskhan','Pinsir','Gyarados','Aerodactyl'],
      'Mega X':['Charizard','Mewtwo'],'Mega Y':['Charizard','Mewtwo']}
gmax=['Venusaur','Charizard','Blastoise','Butterfree','Pikachu','Meowth','Machamp','Gengar','Kingler','Lapras','Eevee','Snorlax']
by_name={e['name']:e for e in entries if e['kind']=='pokemon'}
for group,names in regional.items():
 for name in names:
  b=by_name[name]; formname=f'{group} {name}'
  key=re.sub('[^a-z0-9]+','-',formname.lower()).strip('-')
  entries.append(skeleton('form-'+key,formname,'form','Forms',b['dexNumber'],[],b['id'],group,group))
for group,names in mega.items():
 for name in names:
  b=by_name[name]; formname=f'{group} {name}'
  key=re.sub('[^a-z0-9]+','-',formname.lower()).strip('-')
  entries.append(skeleton('form-'+key,formname,'form','Forms',b['dexNumber'],[],b['id'],group,'Mega Evolution'))
for name in gmax:
 b=by_name[name]; formname=f'Gigantamax {name}'
 key=re.sub('[^a-z0-9]+','-',formname.lower()).strip('-')
 entries.append(skeleton('form-'+key,formname,'form','Forms',b['dexNumber'],[],b['id'],'Gigantamax','Gigantamax'))
for formname in ['Combat Breed Tauros','Blaze Breed Tauros','Aqua Breed Tauros']:
 b=by_name['Tauros']; key=re.sub('[^a-z0-9]+','-',formname.lower()).strip('-')
 entries.append(skeleton('form-'+key,'Paldean '+formname,'form','Forms',b['dexNumber'],[],b['id'],'Paldean '+formname,'Paldean'))

assert len({e['id'] for e in entries})==len(entries), 'duplicate ids'
# No workouts are premarked complete. Accuracy of a form's unique typing/learnset
# is intentionally left for individual research/audit before final approval.
payload={'schemaVersion':1,'projectName':'Workout Pokédex','standardsVersion':'1.1','publishedAt':'2026-10-20T00:00:00Z','entries':entries}
(root/'data'/'workouts.json').write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')
(root/'data.js').write_text('window.WORKOUT_DEX_SEED = '+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';\n')
print('created',len(entries),'entries,',sum(e['kind']=='form' for e in entries),'forms, base species',sum(e['kind']=='pokemon' for e in entries),'characters',sum(e['kind']=='character' for e in entries))
