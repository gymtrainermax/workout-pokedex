/* Workout Dex • local-first, static-hosting-ready. No account or backend needed. */
(() => {
  'use strict';
  const STORE_KEY = 'gymtrainermax-workoutdex-v1';
  const root = document.getElementById('main');
  const toastEl = document.getElementById('toast');
  const chapters = ['Prologue','Original 151','Trainers','Gym Leaders','Elite Four','Forms','Future Regions'];
  const statuses = ['Planned','Researching','Draft','Review','Final'];
  const levels = ['Unassigned','Beginner','Intermediate','Advanced','All levels'];
  const qualityKeys = {accuracy:'Pokémon accuracy checked',programming:'Sound training programming',visual:'Clear on-camera movement matching',moveset:'Moveset uniqueness verified',writing:'Writing quality and brand voice approved'};
  const cl = obj => JSON.parse(JSON.stringify(obj));
  const safe = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const norm = s => String(s ?? '').trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
  const fmt = s => s == null || s === '' ? '—' : safe(s);
  const fmtCount = n => new Intl.NumberFormat('en-US').format(n);
  const today = () => new Date().toISOString();
  const isPokemon = e => e.kind !== 'character';
  const shortId = e => e.dexNumber ? '#' + String(e.dexNumber).padStart(3,'0') : e.id === 'oak-000' ? '#000' : e.role === 'Trainer' ? 'TRN' : e.role === 'Gym Leader' ? 'GYM' : 'E4';
  const art = e => e.dexNumber && Number(e.dexNumber) > 0 ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(e.dexNumber)}.png` : null;
  const slug = s => norm(s).normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const moveKey = e => e.moves?.filter(m => norm(m.name)).length === 4 ? e.moves.map(m => norm(m.name)).sort().join(' / ') : '';
  const load = () => {
    let published = cl(window.WORKOUT_DEX_SEED || {schemaVersion:1,entries:[]});
    try {
      const cached = JSON.parse(localStorage.getItem(STORE_KEY));
      if(cached?.schemaVersion===1 && Array.isArray(cached.entries)) {
        // Refresh untouched local placeholders with newly published workouts without discarding actual Studio edits.
        for(const official of published.entries.filter(e=>e.publicWorkout)){
          const saved=cached.entries.find(e=>e.id===official.id);
          if(!saved){cached.entries.push(cl(official));continue;}
          if(saved.status==='Planned' && !saved.goal && !(saved.exercises||[]).length && !(saved.moves||[]).length) Object.assign(saved,cl(official));
        }
        return cached;
      }
    } catch(e) { console.warn('Could not read local save:', e); }
    return published;
  };
  let db = load(), route = location.hash.slice(1) || 'overview', page = 1, query = '', filterStatus = '', filterDifficulty = '', filterType = '', filterForm = '', studioId = 'oak-000', draft = null, errors = [], dirty = false, timer;
  const entries = () => db.entries;
  const entryBy = id => entries().find(e => e.id === id);
  const saveLocal = () => { try {localStorage.setItem(STORE_KEY, JSON.stringify(db)); return true;} catch(e) {toast('Browser storage is full or unavailable. Export a backup now.'); return false;} };
  const toast = msg => {toastEl.textContent = msg; toastEl.classList.add('visible'); clearTimeout(timer); timer=setTimeout(()=>toastEl.classList.remove('visible'), 3600);};
  function selectRoute(newRoute) { if(dirty && !confirm('Discard unsaved studio changes?')) return; route=newRoute; page=1; query=''; filterStatus=''; filterDifficulty=''; filterType=''; filterForm=''; dirty=false; draft=null; errors=[]; location.hash=newRoute; render(); window.scrollTo({top:0,behavior:'instant'}); }
  function initStudio(id){studioId=entryBy(id)?id:'oak-000';draft=cl(entryBy(studioId) || entries()[0]);if(isPokemon(draft)){draft.moves=Array.from({length:4},(_,i)=>Object.assign({name:'',exercise:'',verified:false,notes:'',pokemonTest:false,trainerTest:false,cameraTest:false},draft.moves?.[i]||{}));}draft.exercises ||= [];draft.quality ||= {};errors=[];dirty=false;}
  function navToStudio(id) { if(dirty && !confirm('Discard unsaved studio changes?')) return; route='studio';initStudio(id||studioId);location.hash='studio';render();window.scrollTo({top:0,behavior:'instant'}); }
  const statusClass = s => s==='Final'?'final':s==='Review'?'review':s==='Draft'||s==='Researching'?'progress':'';
  const statusChip = s => `<span class="status-label"><span class="status-dot ${statusClass(s)}"></span>${safe(s)}</span>`;
  const typeChips = e => e.kind==='character' ? `<span class="type-tag">${safe(e.role||'Character')}</span>` : e.types?.length ? e.types.map(t=>`<span class="type-tag type-${slug(t)}">${safe(t)}</span>`).join('') : '<span class="type-tag">Types TBD</span>';
  const artHtml = e => e.id==='oak-000' ? `<img class="oak-art-image" src="assets/professor-oak-game-portrait.webp" onerror="this.onerror=null;this.src='assets/professor-oak-fallback.svg'" alt="Game-inspired portrait of Professor Oak in a white lab coat, holding a Poké Ball and clipboard" loading="lazy" decoding="async" />` : art(e) ? `<img loading="lazy" src="${art(e)}" alt="${safe(e.kind==='form'?`${entryBy(e.baseId)?.name||'Base'} base artwork`:`${e.name} artwork`)}" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<span class=character-letter>✧</span>')">` : `<span class="character-letter">${e.id==='oak-000'?'✦':safe(e.name[0])}</span>`;
  const stat = (label,num,desc,icon,special=false) => `<div class="stat-card${special?' special':''}"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-number">${fmtCount(num)}</div><div class="stat-small">${desc}</div></div>`;
  const head = (eyebrow,title,desc,actions='') => `<div class="section-intro"><div><div class="eyebrow dark">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${actions}</div>`;
  const btn = (text,action,cls='btn-dark',attr='') => `<button type="button" class="btn ${cls}" data-action="${action}" ${attr}>${text}</button>`;
  const count = (f) => entries().filter(f).length;
  const card = e => `<button class="dex-card" type="button" data-action="detail" data-id="${safe(e.id)}" aria-label="Open ${safe(e.name)}"><div class="card-top"><span>${shortId(e)}</span><span>${statusChip(e.status)}</span></div><div class="dex-image ${e.kind==='form'?'form-image':''}">${artHtml(e)}${e.kind==='form'?'<span class="image-hint">BASE ART</span>':''}</div><h3 title="${safe(e.name)}">${safe(e.name)}</h3><div class="card-tags">${typeChips(e)}</div><div class="card-bottom"><span>${e.kind==='form'?safe(e.formGroup||'Form'):e.kind==='character'?safe(e.chapter):safe(e.difficulty)}</span><span class="tiny-pill ${e.status==='Final'||e.publicWorkout?'is-final':''}">${e.status==='Final'?'✓ COMPLETE': e.publicWorkout?'WORKOUT LIVE':'NOT FINAL'}</span></div></button>`;
  function dashboard(){
    const species=count(e=>e.kind==='pokemon'), characters=count(e=>e.kind==='character'), forms=count(e=>e.kind==='form'), finalized=count(e=>e.status==='Final'), published=count(e=>e.status==='Final'||e.publicWorkout), baseFinal=count(e=>e.kind==='pokemon'&&e.status==='Final');
    const sections=['Prologue','Original 151','Trainers','Gym Leaders','Elite Four','Forms'];
    return `<section class="hero"><div class="hero-content"><div class="eyebrow light">◉ WELCOME TO THE JOURNEY</div><h1>Gotta train<br/><span>'em all.</span></h1><p>A living Pokédex built on Pokémon lore, real exercise science, and 151 very good reasons to hit the gym.</p><div class="hero-buttons">${btn('Explore Kanto →','pokedex','btn-lime')}${btn('Open Workout Studio ↗','studio','btn-ghost')}</div></div><div class="hero-graphic" aria-hidden="true"></div><span class="hero-dex" aria-hidden="true">#001</span></section>
    <section class="stats-grid" aria-label="Project stats">${stat('ORIGINAL KANTO',species,'Base Pokémon entries','◈')}${stat('CHARACTER WORKOUTS',characters,'Professor, trainers and leaders','♙')}${stat('FORM VARIANTS',forms,'Separate workouts to explore','✦')}${stat('PUBLISHED WORKOUTS',published,'Complete workout programs online','✓',true)}</section>
    <div class="section-heading"><div><h2>The journey so far</h2><p>Track the road from Professor Oak to the Elite Four.</p></div></div>
    <section class="two-cols"><div class="panel panel-pad"><div class="panel-top"><h3>Region completion</h3><small>${baseFinal} / ${species} KANTO</small></div><div class="progress-track"><div class="progress-fill" style="width:${species?100*baseFinal/species:0}%"></div></div><div class="progress-meta"><span>Original 151 completed</span><span>${species?Math.round(baseFinal/species*100):0}%</span></div><div style="margin-top:16px">${sections.map((s,i)=>{let all=count(e=>e.chapter===s),fin=count(e=>e.chapter===s&&e.status==='Final');return `<div class="chapter-row"><div class="chapter-dot">${String(i).padStart(2,'0')}</div><div class="chapter-info"><strong>${s}</strong><small>${s==='Prologue'?'Where the adventure starts':s==='Forms'?'Regional, Mega, Gigantamax and more':'Workout collection'}</small></div><div class="chapter-score">${fin} / ${all}</div></div>`}).join('')}</div></div>
    <div class="vertical-gap"><div class="spotlight"><div><div class="eyebrow dark">EPISODE 000 • THE PROLOGUE</div><h3>Professor Oak</h3><p>Workout 000 is on the Dex: full training session, coaching, and a two-character comedy shoot plan.</p>${btn('View the first entry →','oak-preview','btn-dark')}</div><div class="oak-portrait" aria-label="Professor Oak portrait"><img class="oak-art-image" src="assets/professor-oak-game-portrait.webp" onerror="this.onerror=null;this.src='assets/professor-oak-fallback.svg'" alt="Game-inspired portrait of Professor Oak in a white lab coat, holding a Poké Ball and clipboard" loading="lazy" decoding="async" /></div></div><div class="notice"><span class="mini-poke">!</span><div><strong>Professor Oak's program is live; his video is still in production.</strong><br/>Bulbasaur #001 and Ivysaur #002 have A/B video scripts; Venusaur #003 and Charmander #004 now have approved workouts online. Filming and Camera Tests remain pending for all four.</div></div><div class="bulba-spotlight"><div class="bulba-spotlight-text"><span class="eyebrow">WORKOUT 001 • GRASS / POISON</span><h3>Bulbasaur</h3><p>Seedling Strength: a complete seven-exercise workout with two A/B-ready scripts.</p><button class="btn btn-dark" data-action="bulbasaur-preview" type="button">Preview Bulbasaur's workout →</button></div><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" alt="Bulbasaur Pokémon artwork" loading="lazy" /></div><div class="bulba-spotlight ivy-spotlight"><div class="bulba-spotlight-text"><span class="eyebrow">WORKOUT 002 • GRASS / POISON</span><h3>Ivysaur</h3><p>Rooted Power: a seven-exercise intermediate workout with two approved A/B video scripts.</p><button class="btn btn-dark" data-action="ivysaur-preview" type="button">Preview Ivysaur's workout →</button></div><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/2.png" alt="Ivysaur Pokémon artwork" loading="lazy"/></div><div class="bulba-spotlight venus-spotlight"><div class="bulba-spotlight-text"><span class="eyebrow">WORKOUT 003 • GRASS / POISON</span><h3>Venusaur</h3><p>Solar Overload: approved seven-exercise power workout. A/B video scripts coming next.</p><button class="btn btn-dark" data-action="venusaur-preview" type="button">Preview Venusaur's workout →</button></div><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png" alt="Venusaur Pokémon artwork" loading="lazy"/></div><div class="bulba-spotlight char-spotlight"><div class="bulba-spotlight-text"><span class="eyebrow">WORKOUT 004 • FIRE</span><h3>Charmander</h3><p>First Flame: approved seven-exercise athletic workout. A/B video scripts coming next.</p><button class="btn btn-dark" data-action="charmander-preview" type="button">Preview Charmander's workout →</button></div><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" alt="Charmander Pokémon artwork" loading="lazy"/></div></div></section>
    <div class="section-heading"><div><h2>Start your adventure</h2><p>The first Pokémon in the National Pokédex.</p></div><a href="#pokedex">VIEW ALL 151 ↗</a></div>
    <div class="cards-grid">${entries().filter(e=>e.kind==='pokemon').slice(0,4).map(card).join('')}</div>`;
  }
  function filtered(collection){
    return collection.filter(e => (!query || [e.name,e.form,e.goal,e.id,String(e.dexNumber||''),...(e.types||[]),...(e.equipment||[])].join(' ').toLowerCase().includes(query.toLowerCase())) && (!filterStatus || e.status===filterStatus) && (!filterDifficulty || e.difficulty===filterDifficulty) && (!filterType || e.types?.includes(filterType)) && (!filterForm || e.formGroup===filterForm));
  }
  function filters(collection,allowForm=false){
    const types=[...new Set(collection.flatMap(e=>e.types||[]))].sort();
    const forms=[...new Set(collection.map(e=>e.formGroup).filter(Boolean))].sort();
    return `<div class="filters"><select aria-label="Filter by status" data-filter="status" class="filter-select"><option value="">All statuses</option>${statuses.map(s=>`<option ${filterStatus===s?'selected':''} value="${safe(s)}">${safe(s)}</option>`).join('')}</select><select aria-label="Filter by difficulty" data-filter="difficulty" class="filter-select"><option value="">All difficulty</option>${levels.slice(1).map(s=>`<option ${filterDifficulty===s?'selected':''} value="${s}">${s}</option>`).join('')}</select><select aria-label="Filter by type" data-filter="type" class="filter-select"><option value="">All types</option>${types.map(t=>`<option ${filterType===t?'selected':''} value="${safe(t)}">${safe(t)}</option>`).join('')}</select>${allowForm?`<select aria-label="Filter by form type" data-filter="form" class="filter-select"><option value="">All form families</option>${forms.map(t=>`<option ${filterForm===t?'selected':''} value="${safe(t)}">${safe(t)}</option>`).join('')}</select>`:''}<span class="result-count">${filtered(collection).length} entries</span></div>`;
  }
  function browse(kind){
    const info = kind==='pokedex'? ['KANTO REGION / GEN I','The original 151','Every Pokémon gets a unique four-move workout, from Bulbasaur to Mew.']: kind==='characters'?['THE PEOPLE BEHIND THE POKÉMON','Kanto characters','Professor Oak, the legendary trainers, eight Gym Leaders, and the Elite Four.']:['THE EVOLUTION DOESN’T STOP','Form registry','Regional forms, Mega Evolutions, Gigantamax forms and additional variants have their own workout records.'];
    const collection=entries().filter(e => kind==='pokedex'?e.kind==='pokemon':kind==='characters'?e.kind==='character':e.kind==='form');
    const found=filtered(collection), per=24, pages=Math.max(1,Math.ceil(found.length/per));page=Math.min(page,pages);
    return `${head(...info,`<label class="searchbar"><span>⌕</span><input id="filterSearch" aria-label="Search entries" placeholder="Search names, types, numbers…" value="${safe(query)}"></label>`)}${kind==='forms'?'<div class="callout" style="margin-bottom:17px"><strong>Forms are independent workouts.</strong> Their types, moves, and exercise identities are intentionally unverified until researched. The initial form catalog is curated, not exhaustive of cosmetic, gender, and future variations.</div>':''}${filters(collection,kind==='forms')}${found.length?`<div class="cards-grid">${found.slice((page-1)*per,page*per).map(card).join('')}</div><div class="pagination"><button class="btn btn-outline" data-action="prev-page" ${page<=1?'disabled':''}>← Previous</button><span>Page ${page} of ${pages}</span><button class="btn btn-outline" data-action="next-page" ${page>=pages?'disabled':''}>Next →</button></div>`:`<div class="empty"><h3>No entries found</h3><p>Try clearing your filters or searching for something else.</p>${btn('Clear filters','clear-filters','btn-dark')}</div>`}${kind==='forms'?`<div style="margin-top:25px">${btn('+ Register another form','add-form','btn-dark')}</div>`:''}`;
  }
  function registry(){
    const sets=entries().filter(isPokemon).filter(e=>moveKey(e));
    const dup=new Map();for(const e of sets){const k=moveKey(e);dup.set(k,(dup.get(k)||[]).concat(e));}
    const unique=[...dup.entries()];const duplicates=unique.filter(([k,v])=>v.length>1);
    const usage={};for(const e of entries().filter(isPokemon))for(const m of (e.moves||[]))if(norm(m.name)){let k=m.name.trim();(usage[norm(k)]||=( {name:k,users:new Set()})).users.add(e.name);}
    const sorted=Object.values(usage).sort((a,b)=>b.users.size-a.users.size||a.name.localeCompare(b.name));
    return `${head('MOVE SYSTEM / AUDIT','Signature move registry','Every four-move set must be unique, regardless of move order. Move learnsets are verified during final approval.')}
      <div class="stats-grid" style="margin-bottom:20px">${stat('COMPLETE SETS',sets.length,'Four named moves','◈')}${stat('UNIQUE SETS',unique.length,'Distinct combinations','≋')}${stat('DUPLICATE SETS',duplicates.length,'Must be resolved before finalizing','⚑')}${stat('INDIVIDUAL MOVES',sorted.length,'Different official move names entered','✦')}</div>
      <section class="panel panel-pad"><div class="panel-heading"><div><h3>Four-move combinations</h3><p>Combination registry across Pokémon and form entries</p></div></div>${sets.length?`<div class="table-wrap"><table class="registry-table"><thead><tr><th>Pokémon</th><th>Signature moves</th><th>Status</th><th>Audit</th></tr></thead><tbody>${sets.map(e=>`<tr><td><button data-action="detail" data-id="${safe(e.id)}">${safe(e.name)}</button></td><td>${e.moves.map(m=>safe(m.name)).join(' · ')}</td><td>${statusChip(e.status)}</td><td>${dup.get(moveKey(e)).length>1?'<span class="badge red">DUPLICATE</span>':'<span class="badge green">UNIQUE</span>'}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><h3>No movesets assigned yet</h3><p>Open Workout Studio, choose Bulbasaur, and start with four verified official moves.</p>${btn('Open workout studio','studio','btn-dark')}</div>`}</section>
      ${sorted.length?`<section class="panel panel-pad" style="margin-top:16px"><h3>Most-used moves</h3><div class="table-wrap"><table class="registry-table"><thead><tr><th>Move</th><th>Used by</th></tr></thead><tbody>${sorted.slice(0,30).map(v=>`<tr><td>${safe(v.name)}</td><td>${v.users.size} entries</td></tr>`).join('')}</tbody></table></div></section>`:''}`;
  }
  function field(label,path,value,kind='input',placeholder='',extra='') {
    const attr=`data-edit="${safe(path)}" ${extra}`;
    const el=kind==='textarea'?`<textarea ${attr} placeholder="${safe(placeholder)}">${safe(value)}</textarea>`:kind==='select'?`<select ${attr}>${placeholder.split('|').map(op=>`<option value="${safe(op)}" ${value===op?'selected':''}>${safe(op)}</option>`).join('')}</select>`:`<input ${attr} type="${kind==='number'?'number':'text'}" ${kind==='number'?'min="0"':''} value="${safe(value)}" placeholder="${safe(placeholder)}" />`;
    return `<label class="field">${label}${el}</label>`;
  }
  function checkField(label,path,value){return `<label class="checkline"><input data-edit="${safe(path)}" type="checkbox" ${value?'checked':''}>${label}</label>`;}
  function movesEditor(){return `<section class="studio-section"><h3>02 / Signature move set</h3><p>Exactly four legitimate learnset moves. Each gets a real exercise name and must pass the Pokémon, Trainer and Camera tests. Verification requires your actual research, not just ticking a box.</p>${draft.moves.map((m,i)=>`<div class="move-row"><div class="move-head"><span class="move-number">SIGNATURE MOVE 0${i+1}</span>${checkField('Learnset researched & verified',`moves.${i}.verified`,m.verified)}</div><div class="form-grid">${field('Official Pokémon move',`moves.${i}.name`,m.name,'input','e.g. Vine Whip')}${field('Matching real exercise',`moves.${i}.exercise`,m.exercise,'input','e.g. Battle rope alternating waves')}<div class="wide">${field('Connection / coaching notes',`moves.${i}.notes`,m.notes,'textarea','Explain why this exercise represents the move')}</div></div><div class="checks-grid">${checkField('Pokémon test',`moves.${i}.pokemonTest`,m.pokemonTest)}${checkField('Trainer test',`moves.${i}.trainerTest`,m.trainerTest)}${checkField('Camera test',`moves.${i}.cameraTest`,m.cameraTest)}</div></div>`).join('')}</section>`;}
  function exercisesEditor(){return `<section class="studio-section"><div class="panel-heading"><div><h3>${isPokemon(draft)?'03':'02'} / Exercise choices</h3><p>For characters, list the full session in actual exercise order. For Pokémon, list supporting exercises alongside the official four-move core.</p></div><button class="btn btn-soft" type="button" data-action="add-exercise">+ Exercise</button></div>${draft.exercises.length?draft.exercises.map((e,i)=>`<div class="exercise-row"><div class="exercise-head"><strong>EXERCISE ${i+1}</strong><button class="text-button danger" data-action="remove-exercise" data-index="${i}">Remove ×</button></div><div class="form-grid three">${field('Real exercise name',`exercises.${i}.name`,e.name,'input','Goblet squat')}${field('Pokémon-inspired alias (optional)',`exercises.${i}.alias`,e.alias,'input','Training name')}${field('Equipment',`exercises.${i}.equipment`,e.equipment,'input','Dumbbell')}${field('Sets',`exercises.${i}.sets`,e.sets,'input','3')}${field('Reps / time',`exercises.${i}.reps`,e.reps,'input','8–12')}${field('Rest',`exercises.${i}.rest`,e.rest,'input','60 seconds')}<div class="wide">${field('Coaching cues',`exercises.${i}.notes`,e.notes,'textarea','Why this exercise belongs here')}</div></div></div>`).join(''):'<div class="empty" style="margin-top:15px"><h3>No supporting exercises yet</h3><p>Add any additional work beyond your signature four.</p></div>'}</section>`;}
  function studio(){
    if(!draft) initStudio(studioId);
    const n=isPokemon(draft)?3:2;
    return `${head('CREATOR HQ / WORKOUT BUILDING','Workout Studio','Research. Program. Film. Review. Only then mark an episode final.')}
      <div class="studio-layout"><aside class="studio-side"><h3>Editor controls</h3><p>Changes stay on this device until you export and publish the updated data files.</p><div class="studio-controls"><label class="field">Choose entry<select id="studioPicker">${entries().map(e=>`<option value="${safe(e.id)}" ${draft.id===e.id?'selected':''}>${shortId(e)} ${safe(e.name)}</option>`).join('')}</select></label>${btn('+ New Pokémon / character','add-entry','btn-soft full-width')}${btn('+ New form','add-form','btn-soft full-width')}</div><div class="notice" style="margin-top:21px;padding:12px">◉ <span>Drafts autosave <strong>only when you click Save Draft</strong>. Use Export JSON to back up your work.</span></div><div class="studio-toolbar">${btn('↓ Export JSON','export-json','btn-outline')}${btn('↓ Publish data.js','export-js','btn-outline')}${btn('↑ Import JSON','import-json','btn-outline')}${btn('Reset local data','reset','btn-outline')}</div><input id="importFile" type="file" accept="application/json,.json" style="display:none" /></aside>
      <div class="studio-main"><div class="studio-section"><div class="panel-top"><div class="item-summary"><div class="small-art">${artHtml(draft)}</div><div><h3>${safe(draft.name)}</h3><p>${shortId(draft)} · ${safe(draft.chapter)} · ${safe(draft.kind==='form'?draft.formGroup:draft.kind)}</p></div></div>${statusChip(draft.status)}</div></div>
      <section class="studio-section"><h3>01 / Training identity</h3><p>Define the Pokémon or character, the target adaptation, and the gear needed.</p><div class="form-grid three">${field('Name','name',draft.name)}${field('Difficulty','difficulty',draft.difficulty,'select',levels.join('|'))}${field('Workflow status','status',draft.status,'select',statuses.filter(s=>s!=='Final').concat(draft.status==='Final'?['Final']:[]).join('|'))}${field('Primary fitness goal','goal',draft.goal,'input','Strength / Mobility / Conditioning')}${field('Duration in minutes','durationMinutes',draft.durationMinutes,'number','45')}${field('Equipment (comma separated)','equipment',draft.equipment.join(', '),'input','Bands, cable, medicine ball')}<div class="wide">${field('Why this training goal fits','goalRationale',draft.goalRationale,'textarea','Connect its anatomy, behavior, battling style, or character to the training goal')}</div>${field('Typing (comma separated)','types',draft.types.join(', '),'input','Grass, Poison')}${field('Video URL (optional)','videoUrl',draft.videoUrl,'input','https://...')}</div></section>
      ${isPokemon(draft)?movesEditor():''}${exercisesEditor()}
      <section class="studio-section"><h3>0${n+1} / Complete workout programming</h3><p>Include working sets, repetitions or time, rest intervals, scaling, form cues and safety considerations.</p><div class="form-grid"><div class="wide">${field('Warm-up','workout.warmup',draft.workout.warmup,'textarea','Exercises, sets/time, and preparation')}</div><div class="wide">${field('Main session','workout.main',draft.workout.main,'textarea','Order, sets, reps, rest, load or RPE')}</div><div class="wide">${field('Cooldown','workout.cooldown',draft.workout.cooldown,'textarea','Time, mobility, recovery')}</div>${field('Progressions and regressions','workout.modifications',draft.workout.modifications,'textarea','Beginner / intermediate / advanced options')}${field('Safety and coaching notes','workout.safety',draft.workout.safety,'textarea','Relevant contraindications, joint alignment, spotting')}</div></section>
      <section class="studio-section"><h3>0${n+2} / Pokémon research</h3><p>Track primary research before choosing moves. Leave unsupported claims unverified.</p><div class="form-grid">${field('Pokédex & background','research.pokedex',draft.research.pokedex,'textarea','Dex entries and notable details')}${field('Anatomy and physical traits','research.anatomy',draft.research.anatomy,'textarea','Movement-relevant traits')}${field('Personality, behavior & identity','research.behavior',draft.research.behavior,'textarea','Distinctive behavioral patterns')}${field('Learnset and ability notes','research.learnset',draft.research.learnset,'textarea','Games or generations checked') }<div class="wide">${field('Research sources / links','research.sources',draft.research.sources,'textarea','Source titles and URLs; note game/version when moves vary')}</div></div></section>
      <section class="studio-section"><h3>0${n+3} / Video and social package</h3><p>What will people see, hear, and save? Script in GymTrainerMax’s authentic voice.</p><div class="form-grid">${field('Opening hook (first 3 seconds)','content.hook',draft.content.hook,'textarea','A Pokémon-first moment')}${field('Full Reel / TikTok script','content.script',draft.content.script,'textarea','Voiceover and beat-by-beat script')}${field('Filming sequence','content.filming',draft.content.filming,'textarea','Movement matching and shot order')}${field('On-screen text','content.onScreen',draft.content.onScreen,'textarea','Move names, sets, reps, cues')}${field('Ending','content.ending',draft.content.ending,'textarea','Episode sign-off')}${field('Social caption','content.caption',draft.content.caption,'textarea','Fun, direct, educational')}${field('Cover concept','content.cover',draft.content.cover,'textarea','Graphic and headline')}${field('Natural engagement prompt','content.callToAction',draft.content.callToAction,'textarea','Optional relevant question') }<div class="wide">${field('Five targeted hashtags (comma separated)','content.hashtags',draft.content.hashtags,'input','#PokemonFitness, #...')}</div></div></section>
      <section class="studio-section"><h3>0${n+4} / Final quality check</h3><p>Sign off on accuracy, exercise science and visual clarity. For Pokémon, individual move tests are checked above.</p><div class="quality-grid">${Object.entries(qualityKeys).map(([k,label])=>`<div class="quality-check">${checkField(label,`quality.${k}`,draft.quality[k])}</div>`).join('')}</div>${field('Additional notes','notes',draft.notes,'textarea','Creative direction, reminders, follow-ups')}${errors.length?`<div class="error-list" id="validationErrors"><strong>Still needed before finalizing (${errors.length}):</strong><ul>${errors.map(x=>`<li>${safe(x)}</li>`).join('')}</ul></div>`:''}</section>
      <div class="save-bar"><div><strong>${safe(draft.name)}</strong><p>${dirty?'Unsaved changes': 'Ready to edit'} · Published entries require a data export and redeploy.</p></div><div class="save-bar-buttons">${btn('Save draft','save-draft','btn-ghost')}${btn('✓ Finalize workout','finalize','btn-lime')}</div></div></div></div>`;
  }
  function guide(){
    const steps=[
      ['01','Choose your entry','Open Workout Studio, select Professor Oak or a Kanto Pokémon, and begin the research and programming. All 167 core entries are already registered.'],
      ['02','Build a complete episode','Log the workout identity, equipment, warm-up, actual exercises, sets, reps, rest, modifications, lore research and audit. Create two video scripts for each Pokémon: A = gym comedy, B = Pokémon-specific comedy; share exercise footage.'],
      ['03','Pass the final audit','Pokémon must have four distinct verified official moves, each mapped to an exercise that passes the Pokémon, Trainer and Camera tests. No duplicate four-move combinations. Both A and B video scripts must be reviewed.'],
      ['04','Finalize and save','Select “Finalize workout” to validate. The workout immediately changes to Final in your browser and shows up in the Dex and the move registry.'],
      ['05','Export the master data','Use “Export JSON” for backups. Use “Publish data.js” and overwrite the website’s data.js file with the downloaded version. Keep data/workouts.json updated too.'],
      ['06','Publish to the web','Upload the whole site to a static hosting service or push its files to a GitHub Pages repository. Each later file update triggers a fresh public deployment.']
    ];
    return `${head('THE SYSTEM / HOW TO USE IT','Your road map','A living database, a creator studio, and an approval system based on Series Standards v1.1.')}
      <div class="callout" style="margin-bottom:20px"><strong>Important distinction: browser updates vs. public website updates.</strong> Editing and finalizing work immediately in this browser and persist after refresh. A live public site cannot sync those private changes until you publish the exported data files. This starter has no cloud database or authentication.</div>
      <div class="guide-grid">${steps.map(([num,title,body])=>`<div class="guide-card"><div class="guide-number">${num}</div><h3>${title}</h3><p>${body}</p></div>`).join('')}</div>
      <div class="section-heading"><div><h2>Publishing & backup checklist</h2><p>Use this exact flow whenever a workout is finalized.</p></div></div>
      <div class="panel panel-pad"><div class="vertical-gap"><p><strong>Local master:</strong> ${fmtCount(entries().length)} current entries stored in your browser when you save, with Final, Review, Draft and other stages.</p><p><strong>Backup:</strong> Download a JSON export after meaningful edits. You can import a backup later from the Studio.</p><p><strong>Public data:</strong> Download a new <code>data.js</code> from Studio and replace the same file in your published site. Final workouts and explicitly approved public programs (such as Oak #000) include content; other incomplete entries are blank shells. Final workout notes are removed.</p><p><strong>GitHub Pages:</strong> Push updated <code>data.js</code> to the <code>main</code> branch. Keep your private full JSON backup off public GitHub. The included GitHub Actions workflow deploys the website automatically. Initial Pages setup must use GitHub Actions as its source.</p><p><strong>Going multi-device:</strong> A real shared cloud database with authentication can be connected later. The provided site does not claim to silently synchronize devices or publish changes without a deployment.</p><p><strong>Sprites:</strong> Official-style Pokémon artwork is loaded from the open PokéAPI sprites repository when connected to the internet. Form cards deliberately show faded base-species art to avoid misidentifying a form.</p></div></div>
      <div style="margin-top:18px" class="studio-toolbar">${btn('Go to Workout Studio →','studio','btn-dark')}${btn('Download full backup ↓','export-json','btn-outline')}</div>`;
  }
  function oakPage(){
    // The public program is always taken from the published seed, not a visitor's local Studio edits.
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='oak-000' && x.publicWorkout) || entryBy('oak-000');
    if(!e || !e.publicWorkout)return `${head('PROLOGUE / WORKOUT 000','Professor Oak','His Trainer Orientation is in development.')}${btn('Open Workout Studio','studio','btn-dark')}`;
    const prod=e.production||{}, shots=prod.shootList||[], beats=prod.beats||[], assignments=prod.assignments||[];
    const count=arr=>Array.isArray(arr)?arr.length:0;
    const subhead=(id,label,title,desc)=>`<div class="oak-section-header" id="${id}"><div class="eyebrow dark">${label}</div><h2>${title}</h2><p>${desc}</p></div>`;
    return `<div class="oak-page">
      <section class="oak-hero">
        <div class="oak-hero-main"><div class="eyebrow">THE PROLOGUE • PALLET TOWN • #000</div>
          <div class="oak-hero-label">PROFESSOR OAK'S LAB</div><h1>TRAINER<br/><span>ORIENTATION.</span></h1>
          <p>${safe(prod.subtitle||'Before you pick your first Pokémon, finish your first workout.')}</p>
          <div class="oak-status-line"><span class="oak-live-dot"></span><strong>Workout program published</strong><span class="oak-status-divider">•</span><span>Video shoot & camera review pending</span></div>
          <div class="oak-hero-actions"><button class="btn btn-lime" data-action="jump-oak" data-target="oak-program">View complete workout ↓</button><button class="btn btn-ghost" data-action="jump-oak" data-target="oak-production">View production package ↗</button></div>
        </div>
        <div class="oak-hero-art"><div class="oak-lab-signal">P O K É D E X / 0 0 0</div><div class="oak-large-ball" aria-hidden="true"><div class="oak-ball-band"></div><div class="oak-ball-center"></div></div><div class="oak-hero-portrait"><img class="oak-art-image" src="assets/professor-oak-game-portrait.webp" onerror="this.onerror=null;this.src='assets/professor-oak-fallback.svg'" alt="Game-inspired portrait of Professor Oak in a white lab coat, holding a Poké Ball and clipboard" loading="lazy" decoding="async" /></div><div class="oak-lab-ticket">PALLET TOWN<br/><strong>LAB ACCESS APPROVED</strong></div><div class="oak-signal-bars">▂ ▅ ▇ ▅ ▂</div></div>
      </section>
      <p class="oak-art-credit">Original game-inspired illustration made for Workout Dex. Unofficial fan fitness project.</p>
      <nav class="oak-jumplinks" aria-label="Professor Oak sections"><button data-action="jump-oak" data-target="oak-program">01 / Workout</button><button data-action="jump-oak" data-target="oak-assignments">02 / Signature assignments</button><button data-action="jump-oak" data-target="oak-production">03 / Film production</button><button data-action="jump-oak" data-target="oak-social">04 / Social & release</button></nav>
      <section class="oak-summary-cards"><div><small>LEVEL</small><strong>${safe(e.difficulty)}</strong></div><div><small>TIME</small><strong>40–45 min</strong></div><div><small>TRAINING</small><strong>Full body</strong></div><div><small>WORKING SETS</small><strong>14</strong></div></section>
      <div class="oak-announce"><strong>The workout is ready to follow.</strong> The four signature story assignments and the full seven-exercise program are published here. The video is a production plan, not a released episode. Camera tests and creator sign-off remain pending before marking #000 <em>Final</em>.</div>
      ${subhead('oak-program','01 / THE ACTUAL WORKOUT','Full-body fundamentals','Do the exercises in this training order. The video tells the assignments in a different sequence for the story.')}
      <section class="oak-workout-intro"><div><span class="oak-kicker">WARM UP</span><h3>Welcome to the lab</h3><p>${safe(e.workout.warmup)}</p></div><div><span class="oak-kicker">TRAINING INTENSITY</span><h3>RPE 6–7</h3><p>Use manageable resistance, roughly 3–4 good reps left in reserve for strength sets. Technique first.</p></div></section>
      <div class="oak-table-wrap"><table class="oak-workout-table"><thead><tr><th>STEP</th><th>EXERCISE</th><th>DOSE</th><th>REST</th></tr></thead><tbody>
      ${(e.exercises||[]).map((x,i)=>`<tr><td><span class="oak-step-index">${String(i+1).padStart(2,'0')}</span></td><td><div class="oak-ex-name">${safe(x.name)}</div>${x.alias?`<span class="oak-alias">${safe(x.alias)}</span>`:`<span class="oak-support">Supporting movement</span>`}<div><small>${safe(x.equipment||'')}</small></div><details class="oak-cue"><summary>Technique & scaling</summary><p>${safe(x.notes||'')}</p></details></td><td><strong>${safe(x.sets)} × ${safe(x.reps)}</strong></td><td>${safe(x.rest)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="oak-workout-panels"><article><span class="oak-kicker">COOL DOWN</span><h3>Research complete</h3><p>${safe(e.workout.cooldown)}</p></article><article><span class="oak-kicker">PROGRESSION</span><h3>Level up at your pace</h3><p>${safe(e.workout.modifications)}</p></article></div>
      <div class="oak-safety"><strong>Safety first.</strong> ${safe(e.workout.safety)}</div>
      ${subhead('oak-assignments','02 / THE FOUR SIGNATURE ASSIGNMENTS','From the lab to the gym','These are character-inspired training tasks, not official Pokémon moves. The filmed story order is 01–04; the actual session places the throwing drill first.')}
      <div class="oak-assignment-grid">${assignments.map(x=>`<article class="oak-assignment"><div class="oak-assignment-head"><span>ASSIGNMENT ${safe(x.number)}</span><span class="oak-pending">CAMERA TEST PENDING</span></div><h3>${safe(x.title)}</h3><div class="oak-assignment-ex">${safe(x.exercise)} <span>· ${safe(x.reps)}</span></div><p>${safe(x.connection)}</p><div class="oak-match">↗ ${safe(x.camera)}</div></article>`).join('')}</div>
      ${subhead('oak-production','03 / CAMERA, COSTUME & EDIT','The shoot-ready production plan','One performer, two characters: Oak is the professor who takes gym form far too seriously; Max just wants to choose a starter.')}
      <div class="oak-production-meta"><div><small>FORMAT</small><strong>${safe(prod.format||'Vertical 9:16')}</strong></div><div><small>EDIT TARGET</small><strong>${safe(prod.runtime||'70–75 sec')}</strong></div><div><small>TONE</small><strong>${safe(prod.tone||'Comedy + nostalgia')}</strong></div></div>
      <div class="oak-roles">${(prod.roles||[]).map((role,i)=>`<div class="oak-role"><span>${i?'MAX / COSTUME B':'PROFESSOR OAK / COSTUME A'}</span><p>${safe(role)}</p></div>`).join('')}</div>
      <h3 class="oak-subtitle">Timed two-character script & edit beats</h3><div class="oak-beats">${beats.map(x=>`<div class="oak-beat"><div class="oak-beat-time">${safe(x.time)}</div><div><strong>${safe(x.audio)}</strong><p>${safe(x.visual)}</p></div></div>`).join('')}</div>
      <div class="oak-production-accordions">
        <details><summary>Full 17-shot camera checklist <span>${shots.length} shots</span></summary><ol>${shots.map(x=>`<li>${safe(x)}</li>`).join('')}</ol></details>
        <details><summary>Costumes, props & training equipment <span>${count(prod.setup)} items</span></summary><ul>${(prod.setup||[]).map(x=>`<li>${safe(x)}</li>`).join('')}</ul></details>
        <details><summary>Editing & on-screen text <span>${count(prod.editing)} notes</span></summary><ul>${(prod.editing||[]).map(x=>`<li>${safe(x)}</li>`).join('')}</ul><div class="oak-overlay-text">${safe(e.content.onScreen)}</div></details>
      </div>
      ${subhead('oak-social','04 / THE FINISH LINE','Cover, caption & release checklist','The content is written and planned. Keep the episode in Review until the actual footage passes the Camera Test.')}
      <div class="oak-social-grid"><article class="oak-cover-preview"><div class="oak-cover-eyebrow">WORKOUT DEX / 000</div><div class="oak-cover-title">OAK MADE<br/>ME WORK<br/>OUT?!</div><div class="oak-cover-small">A TRAINER ORIENTATION</div><p>${safe(e.content.cover)}</p></article><article class="oak-caption-card"><div class="oak-kicker">FINAL CAPTION DRAFT</div><pre>${safe(e.content.caption)}</pre><div class="oak-pin"><strong>Pinned comment</strong><p>${safe(prod.pinnedComment)}</p></div></article></div>
      <div class="oak-preflight"><div><span class="oak-kicker">PRE-FLIGHT / CREATOR SIGN-OFF</span><h3>Before the video goes live</h3><p>The published workout program is not an assertion that this footage has already been filmed or tested.</p></div><ul>${(prod.preflight||[]).map(x=>`<li><span class="oak-unchecked">□</span>${safe(x)}</li>`).join('')}</ul></div>
      <div class="oak-back"><button class="btn btn-dark" data-action="characters">← Back to Kanto characters</button><button class="btn btn-outline" data-action="edit-oak">Edit Oak in Workout Studio ↗</button></div>
    </div>`;
  }

  // Published Pokémon page uses the official seed so public details do not depend on visitors' saved Studio drafts.
  function bulbasaurPage(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-001' && x.publicWorkout);
    if(!e)return head('WORKOUT 001','Bulbasaur','Programming underway.');
    const prod=e.production||{}, variants=prod.versions||[], shots=prod.shootList||[];
    const signature=(name)=>e.moves.find(m=>m.name===name);
    const badgeTitle=(m)=>m?.name||'';
    const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
    const videoTabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="Video script versions">${variants.map((v,i)=>`<button id="bulba-tab-${safe(v.id)}" type="button" data-action="video-version" data-version="${safe(v.id)}" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="bulba-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" class="bulba-tab ${i===0?'selected':''}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
      ${variants.map((v,i)=>`<div id="bulba-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="bulba-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}>
        <div class="bulba-script-intro"><strong>${safe(v.label)}: ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>
        ${v.beats.map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
    return `<div class="bulba-page">
      <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #001 • GRASS / POISON • FIRST PARTNER</div><span class="bulba-hero-number">WORKOUT 001</span><h1>SO YOU PICKED<br/><span>BULBASAUR?</span></h1><p>Seedling Strength combines four recognizable Pokémon moves with three foundational lifts. Your starter might be small. This workout isn't a joke.</p>
        <div class="bulba-hero-tags"><span>Beginner+</span><span>40–50 min</span><span>Full body</span><span>15–16 sets / intervals</span></div>
        <div class="bulba-hero-state">✓ Programming approved <span>•</span> Video A/B scripts written <span>•</span> Filming pending</div>
        <div class="bulba-hero-buttons"><button class="btn btn-lime" data-action="jump-bulbasaur" data-target="bulba-program">Complete workout ↓</button><button class="btn btn-ghost" data-action="jump-bulbasaur" data-target="bulba-scripts">Compare scripts A / B ↗</button></div>
      </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" alt="Bulbasaur official Pokémon character illustration" /><div class="bulba-hero-art-label">SEED POKÉMON<br/><strong>#001</strong></div></div></section>
      <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>Workout published for planning and training.</strong> The program is approved, but filming, four Camera Tests, A/B test results and the final quality review remain pending. The episode is <strong>Review</strong>, not Final.</p></div>
      <section class="bulba-section" id="bulba-moves"><div class="bulba-section-head"><span class="eyebrow dark">THE FOUR SIGNATURE MOVES</span><h2>From game moves to gym movements</h2><p>All four names are official Bulbasaur moves. The exercise mappings are creative interpretations; camera approval is still pending.</p></div>
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1}</div><div class="bulba-move-icon">${['◉','➜','✕','≈'][i]}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes.replace(' Filming Camera Test is not yet complete.',''))}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      <section class="bulba-section" id="bulba-program"><div class="bulba-section-head"><span class="eyebrow dark">APPROVED PROGRAM • 7 EXERCISES</span><h2>Complete Seedling Strength workout</h2><p>Perform Seed Bomb first while fresh. The rope finisher goes last. All working sets are moderate effort, with crisp technique before heavier loading.</p></div>
        <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP • 7–8 MIN</strong><p>${safe(e.workout.warmup)}</p></div><div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="bulba-warmup"><strong>COOLDOWN • 3–5 MIN</strong><p>${safe(e.workout.cooldown)}</p></div></div>
          <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING IDENTITY</div><h3>Sturdy. Controlled. Explosive.</h3><p>${safe(e.goalRationale)}</p></div><div class="bulba-why"><h3>Scale it to your level</h3><p>${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Technique & safety</h3><p>${safe(e.workout.safety)}</p></div></aside>
        </div>
      </section>
      <section class="bulba-section" id="bulba-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO SCRIPTS • ONE EPISODE</span><h2>Video A / B: which comedy lands?</h2><p>Both versions use the same four attacks, shot list, workout prescriptions and target 60–67 second runtime. Only spoken jokes and matching subtitles change for the controlled comparison.</p></div>
        ${videoTabs}
        <div class="bulba-ab-method"><h3>A/B testing rules</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
      </section>
      <section class="bulba-section" id="bulba-shoot"><div class="bulba-section-head"><span class="eyebrow dark">PRE-PRODUCTION • SHOOT CHECKLIST</span><h2>Film once, cut twice</h2><p>Record the same exercise footage and two dialogue tracks. Both edits stay the same length and use the same presentation.</p></div>
       <div class="bulba-shoot-grid"><div class="bulba-shoot-list"><h3>16-shot checklist</h3><ol>${shots.map(s=>`<li>${safe(s.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>The four Camera Tests <span class="bulba-pending">ALL PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
      </section>
      <section class="bulba-section bulba-production-notes"><div class="bulba-section-head"><span class="eyebrow dark">VIDEO / SOCIAL DELIVERABLES</span><h2>Posting package & working files</h2></div><div class="bulba-post-grid"><div><strong>Cover concept</strong><p>${safe(e.content.cover)}</p><strong>Caption draft</strong><p>${safe(e.content.caption)}</p><strong>Hashtags</strong><p>${safe(e.content.hashtags)}</p></div><div><strong>Production documents</strong><p>Read the approved workout and the full Version A and Version B drafts.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Approved program & safety notes','Script A • Gym comedy','Script B • Pokémon comedy'][i]||'Production notes'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Working scripts only. No recorded video or final A/B results are available yet.</p></div></div></section>
    </div>`;
  }
  function ivysaurPage(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-002' && x.publicWorkout);
    if(!e)return head('WORKOUT 002','Ivysaur','Programming underway.');
    const prod=e.production||{}, variants=prod.versions||[], shots=prod.shootList||[];
    const signature=(name)=>e.moves.find(m=>m.name===name);
    const badgeTitle=(m)=>m?.name||'';
    const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
    const videoTabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="Video script versions">${variants.map((v,i)=>`<button id="ivy-tab-${safe(v.id)}" type="button" data-action="video-version" data-version="${safe(v.id)}" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="ivy-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" class="bulba-tab ${i===0?'selected':''}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
      ${variants.map((v,i)=>`<div id="ivy-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="ivy-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}>
        <div class="bulba-script-intro"><strong>${safe(v.label)}: ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>
        ${v.beats.map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
    return `<div class="bulba-page ivy-page">
      <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #002 • GRASS / POISON • MIDDLE EVOLUTION</div><span class="bulba-hero-number">WORKOUT 002</span><h1>SO YOU'RE TRAINING<br/><span>IVYSAUR?</span></h1><p>Rooted Power combines four official Pokémon moves with three supporting strength exercises. Bigger bud, stronger legs—and finally a recovery move.</p>
        <div class="bulba-hero-tags"><span>Intermediate</span><span>45–55 min</span><span>Full body</span><span>Strength + recovery</span></div>
        <div class="bulba-hero-state">✓ Programming approved <span>•</span> Video A/B scripts written <span>•</span> Filming pending</div>
        <div class="bulba-hero-buttons"><button class="btn btn-lime" data-action="jump-ivysaur" data-target="ivy-program">Complete workout ↓</button><button class="btn btn-ghost" data-action="jump-ivysaur" data-target="ivy-scripts">Compare scripts A / B ↗</button></div>
      </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/2.png" alt="Ivysaur official Pokémon character illustration" /><div class="bulba-hero-art-label">SEED POKÉMON<br/><strong>#002</strong></div></div></section>
      <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>Workout published for planning and training.</strong> The program is approved, but filming, four Camera Tests, A/B test results and the final quality review remain pending. The episode is <strong>Review</strong>, not Final.</p></div>
      <section class="bulba-section" id="ivy-moves"><div class="bulba-section-head"><span class="eyebrow dark">THE FOUR SIGNATURE MOVES</span><h2>From game moves to gym movements</h2><p>All four names are official Ivysaur moves. The exercise mappings are creative interpretations; camera approval is still pending.</p></div>
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1}</div><div class="bulba-move-icon">${['☄','↟','⇆','☀'][i]}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes.replace(' Filming Camera Test is not yet complete.',''))}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      <section class="bulba-section" id="ivy-program"><div class="bulba-section-head"><span class="eyebrow dark">APPROVED PROGRAM • 7 EXERCISES</span><h2>Complete Rooted Power workout</h2><p>Throw while fresh, then deadlift before thrusters. Use controlled loading for strength and preserve the Synthesis breathing as your cooldown. Main strength sets are RPE 7–8.</p></div>
        <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP • 7–8 MIN</strong><p>${safe(e.workout.warmup)}</p></div><div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="bulba-warmup"><strong>COOLDOWN • 3–5 MIN</strong><p>${safe(e.workout.cooldown)}</p></div></div>
          <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING IDENTITY</div><h3>Grounded. Stronger. Still growing.</h3><p>${safe(e.goalRationale)}</p></div><div class="bulba-why"><h3>Scale it to your level</h3><p>${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Technique & safety</h3><p>${safe(e.workout.safety)}</p></div></aside>
        </div>
      </section>
      <section class="bulba-section" id="ivy-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO SCRIPTS • ONE EPISODE</span><h2>Video A / B: which comedy lands?</h2><p>Both versions use the same four signature moves, shot list, workout prescriptions and target ~68-second runtime. Only spoken jokes and matching subtitles change for the controlled comparison.</p></div>
        ${videoTabs}
        <div class="bulba-ab-method"><h3>A/B testing rules</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
      </section>
      <section class="bulba-section" id="ivy-shoot"><div class="bulba-section-head"><span class="eyebrow dark">PRE-PRODUCTION • SHOOT CHECKLIST</span><h2>Film once, cut twice</h2><p>Record the same exercise footage and two dialogue tracks. Both edits stay the same length and use the same presentation.</p></div>
       <div class="bulba-shoot-grid"><div class="bulba-shoot-list"><h3>18-shot checklist</h3><ol>${shots.map(s=>`<li>${safe(s.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>The four Camera Tests <span class="bulba-pending">ALL PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
      </section>
      <section class="bulba-section bulba-production-notes"><div class="bulba-section-head"><span class="eyebrow dark">VIDEO / SOCIAL DELIVERABLES</span><h2>Posting package & working files</h2></div><div class="bulba-post-grid"><div><strong>Cover concept</strong><p>${safe(e.content.cover)}</p><strong>Caption draft</strong><p>${safe(e.content.caption)}</p><strong>Hashtags</strong><p>${safe(e.content.hashtags)}</p></div><div><strong>Production documents</strong><p>Read the approved workout and the full Version A and Version B drafts.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Approved program & safety notes','Script A • Gym comedy','Script B • Pokémon comedy','Filming checklist & A/B testing'][i]||'Production notes'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Working scripts only. No recorded video or final A/B results are available yet.</p></div></div></section>
    </div>`;
  }




  // Charmander #004: creator-approved workout and A/B scripts; filmed Camera Tests remain pending.
  function charmanderPage(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-004' && x.publicWorkout);
    if(!e)return head('WORKOUT 004','Charmander','Programming underway.');
    const prod=e.production||{},shots=prod.shootList||[],variants=prod.versions||[];
    const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
    const videoTabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="Charmander A/B video scripts">${variants.map((v,i)=>`<button id="char-tab-${safe(v.id)}" type="button" data-action="video-version" data-version="${safe(v.id)}" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="char-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" class="bulba-tab ${i===0?'selected':''}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
      ${variants.map((v,i)=>`<div id="char-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="char-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}>
        <div class="bulba-script-intro"><strong>${safe(v.label)}: ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>
        ${v.beats.map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
    return `<div class="bulba-page char-page">
      <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #004 • FIRE • FIRST EVOLUTION STAGE</div><span class="bulba-hero-number">WORKOUT 004</span><h1>SO YOU PICKED<br/><span>CHARMANDER?</span></h1><p>First Flame turns speed boosts, tiny fireballs, swirling flames and a claw swipe into a balanced, beginner-friendly athletic workout.</p>
        <div class="bulba-hero-tags"><span>Beginner+</span><span>40–50 min</span><span>16 working sets</span><span>Full body + power</span></div>
        <div class="bulba-hero-state">✓ Program approved and locked <span>•</span> A/B scripts approved <span>•</span> Filming pending</div>
        <div class="bulba-hero-buttons"><button class="btn btn-lime" data-action="jump-charmander" data-target="char-program">Complete workout ↓</button><button class="btn btn-ghost" data-action="jump-charmander" data-target="char-scripts">Compare scripts A / B ↗</button></div>
      </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" alt="Charmander official Pokémon character illustration" /><div class="bulba-hero-art-label">LIZARD POKÉMON<br/><strong>#004</strong></div></div></section>
      <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>Seven-exercise workout approved and published for planning and training.</strong> Filming, four Camera Tests, A/B test results and final quality review remain pending; both A/B scripts are approved. This episode remains in <strong>Review</strong>, not Final.</p></div>
      <section class="bulba-section" id="char-moves"><div class="bulba-section-head"><span class="eyebrow dark">FOUR SIGNATURE MOVES</span><h2>Quick feet. First sparks. Controlled fire.</h2><p>Four real Charmander moves mapped to four purposeful gym movements. The Fire and Normal-type emblems appear in the Pokédex preview.</p></div>
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(m.type)}</div><div class="bulba-move-icon">${['➜','✷','◌','╱'][i]}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes)}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      <section class="bulba-section" id="char-program"><div class="bulba-section-head"><span class="eyebrow dark">PROGRAM LOCKED • 7 EXERCISES</span><h2>Complete First Flame workout</h2><p>Accelerate and throw while fresh, trace Fire Spin with light resistance, then train your squat, hinge and push before finishing with Scratch. Keep working strength sets around RPE 6–7.</p></div>
        <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP • 8–10 MIN</strong><p>${safe(e.workout.warmup)}</p></div><div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="bulba-warmup"><strong>COOLDOWN • 3–5 MIN</strong><p>${safe(e.workout.cooldown)}</p></div></div>
          <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING IDENTITY</div><h3>Fast. Fiery. Foundational.</h3><p>${safe(e.goalRationale)}</p></div><div class="bulba-why"><h3>Beginner → advanced</h3><p>${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Technique &amp; safety</h3><p>${safe(e.workout.safety)}</p></div></aside></div>
      </section>
      <section class="bulba-section" id="char-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO APPROVED VIDEO SCRIPTS • ONE WORKOUT</span><h2>Charmander A / B: which jokes land?</h2><p>Both cuts run approximately 70 seconds with the same footage, moves, on-screen exercise instructions, VFX, music, cover, caption and CTA. Only spoken humor and matched subtitles change.</p></div>
        ${videoTabs}
        <div class="bulba-ab-method"><h3>A/B testing rules</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
      </section>
      <section class="bulba-section" id="char-production"><div class="bulba-section-head"><span class="eyebrow dark">SHOOT PLAN • NOT YET FILMED</span><h2>Film once, cut twice</h2><p>The video groups Pokémon moves first for storytelling, but the actual exercise prescription keeps Scratch seventh. Follow the full workout table for the correct gym order.</p></div>
        <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>20-shot checklist</h3><ol>${shots.map(s=>`<li>${safe(s.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Four Camera Tests <span class="bulba-pending">ALL PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
        <div class="bulba-post-grid venus-docs"><div><strong>Social / cover package</strong><p><strong>Cover:</strong> ${safe(e.content.cover)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p><p><strong>Five hashtags:</strong> ${safe(e.content.hashtags)}</p></div><div><strong>Production files</strong><p>Approved program, matched A/B scripts and shot-by-shot production notes.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Approved workout & safety','Script A • Gym comedy','Script B • Pokémon comedy','20-shot filming & A/B test plan','Complete production package'][i]||'Working document'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Scripts approved, but no recorded video or verified Camera Tests yet. Status: Review.</p></div></div>
      </section>
    </div>`;
  }
  function openCharmanderPreview(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-004' && x.publicWorkout);
    if(!e){selectRoute('pokedex');return;}
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim bulba-preview-scrim char-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal char-preview-modal" role="dialog" aria-modal="true" aria-labelledby="char-preview-title">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close Charmander preview">×</button>
      <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" alt="Charmander Pokémon artwork"/><span>FIRE • #004</span></div>
      <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT 004 • PROGRAM APPROVED</div><h2 id="char-preview-title">So You Picked Charmander?</h2><p>First Flame • Beginner+ • 40–50 minutes</p>
      <div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${ivysaurMoveType(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div>
      <p class="bulba-preview-status">Approved seven-exercise workout and both A/B script drafts are ready for review. Filming and four Camera Tests remain pending.</p>
      <button class="bulba-preview-button" data-action="charmander-full" type="button">View Full Workout & A/B Scripts →</button></div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }

  // Charmeleon #005: creator-locked workout and matched script drafts; filmed Camera Tests pending.
  function charmeleonPage(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-005' && x.publicWorkout);
    if(!e)return head('WORKOUT 005','Charmeleon','Programming underway.');
    const prod=e.production||{},shots=prod.shootList||[],variants=prod.versions||[];
    const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
    const videoTabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="Charmeleon A/B video scripts">${variants.map((v,i)=>`<button id="meleon-tab-${safe(v.id)}" type="button" data-action="video-version" data-version="${safe(v.id)}" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="meleon-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" class="bulba-tab ${i===0?'selected':''}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
      ${variants.map((v,i)=>`<div id="meleon-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="meleon-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}>
        <div class="bulba-script-intro"><strong>${safe(v.label)}: ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>
        ${v.beats.map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
    return `<div class="bulba-page meleon-page">
      <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #005 • FIRE • MIDDLE EVOLUTION STAGE</div><span class="bulba-hero-number">WORKOUT 005</span><h1>SO YOU'RE TRAINING<br/><span>CHARMELEON?</span></h1><p>Tempered Flame turns fierce punches, forward fire projection, claw-like chops and smoky rope circles into a genuine intermediate full-body workout.</p>
        <div class="bulba-hero-tags"><span>Intermediate</span><span>50–60 min</span><span>18 working sets</span><span>Strength + conditioning</span></div>
        <div class="bulba-hero-state">✓ Program approved and locked <span>•</span> A/B scripts drafted <span>•</span> Filming pending</div>
        <div class="bulba-hero-buttons"><button class="btn btn-lime" data-action="jump-charmeleon" data-target="meleon-program">Complete workout ↓</button><button class="btn btn-ghost" data-action="jump-charmeleon" data-target="meleon-scripts">Compare scripts A / B ↗</button></div>
      </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/5.png" alt="Charmeleon official Pokémon character illustration" /><div class="bulba-hero-art-label">FLAME POKÉMON<br/><strong>#005</strong></div></div></section>
      <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>Seven-exercise Charmeleon workout approved and published for planning and training.</strong> Filming, four Camera Tests, A/B test results and final quality review remain pending; both A/B scripts are drafted for production review. This episode remains in <strong>Review</strong>, not Final.</p></div>
      <section class="bulba-section" id="meleon-moves"><div class="bulba-section-head"><span class="eyebrow dark">FOUR SIGNATURE MOVES</span><h2>Punch. Slash. Project fire. Vanish.</h2><p>Four official Charmeleon moves become real gym exercises. Fire and Normal-type move emblems appear in the four-move preview.</p></div>
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(m.type)}</div><div class="bulba-move-icon">${['✊','➜','╱','◌'][i]}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes)}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      <section class="bulba-section" id="meleon-program"><div class="bulba-section-head"><span class="eyebrow dark">PROGRAM LOCKED • 7 EXERCISES</span><h2>Complete Tempered Flame workout</h2><p>Deadlift first while fresh, then shadowbox, perform light Svend presses, row, lunge, chop and finish with outward-circling ropes. Main strength work is around RPE 7–8; the Svend press is a light accessory.</p></div>
        <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP • 8–10 MIN</strong><p>${safe(e.workout.warmup)}</p></div><div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="bulba-warmup"><strong>COOLDOWN • 3–5 MIN</strong><p>${safe(e.workout.cooldown)}</p></div></div>
          <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING IDENTITY</div><h3>Hotheaded. Strong. Still controlled.</h3><p>${safe(e.goalRationale)}</p></div><div class="bulba-why"><h3>Beginner → advanced</h3><p>${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Technique &amp; safety</h3><p>${safe(e.workout.safety)}</p></div></aside></div>
      </section>
      <section class="bulba-section" id="meleon-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO MATCHED VIDEO DRAFTS • ONE WORKOUT</span><h2>Charmeleon A / B: which jokes land?</h2><p>Both 70-second cuts share the exercise footage, timecodes, move labels, VFX, music, cover, caption and CTA. Spoken jokes and matched subtitles are the only differences.</p></div>
        ${videoTabs}
        <div class="bulba-ab-method"><h3>A/B testing rules</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
      </section>
      <section class="bulba-section" id="meleon-production"><div class="bulba-section-head"><span class="eyebrow dark">SHOOT PLAN • NOT YET FILMED</span><h2>Film once, cut twice</h2><p>The video groups Fire Punch, Flamethrower, Slash and Smokescreen before showing supporting movements. The actual approved workout begins with the Trap Bar Deadlift. Follow the workout table for the real order.</p></div>
        <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>20-shot checklist</h3><ol>${shots.map(s=>`<li>${safe(s.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Four Camera Tests <span class="bulba-pending">ALL PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
        <div class="bulba-post-grid venus-docs"><div><strong>Social / cover package</strong><p><strong>Cover:</strong> ${safe(e.content.cover)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p><p><strong>Five hashtags:</strong> ${safe(e.content.hashtags)}</p></div><div><strong>Production files</strong><p>Approved program, matched A/B scripts and shot-by-shot production notes.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Approved workout & safety','Script A • Gym comedy','Script B • Pokémon comedy','20-shot filming & A/B test plan','Complete production package'][i]||'Working document'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Scripts drafted for production review; no footage or verified Camera Tests yet. Status: Review.</p></div></div>
      </section>
    </div>`;
  }
  function openCharmeleonPreview(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-005' && x.publicWorkout);
    if(!e){selectRoute('pokedex');return;}
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim bulba-preview-scrim meleon-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal meleon-preview-modal" role="dialog" aria-modal="true" aria-labelledby="meleon-preview-title">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close Charmeleon preview">×</button>
      <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/5.png" alt="Charmeleon Pokémon artwork"/><span>FIRE • #005</span></div>
      <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT 005 • PROGRAM APPROVED</div><h2 id="meleon-preview-title">So You’re Training Charmeleon?</h2><p>Tempered Flame • Intermediate • 50–60 minutes</p>
      <div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${ivysaurMoveType(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div>
      <p class="bulba-preview-status">Approved seven-exercise workout and both A/B script drafts are ready for review. Filming and four Camera Tests remain pending.</p>
      <button class="bulba-preview-button" data-action="charmeleon-full" type="button">View Full Workout & A/B Scripts →</button></div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }

  // Venusaur #003 public program-first release. A/B scripts are deliberately pending creator review.
  function venusaurPage(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-003' && x.publicWorkout);
    if(!e)return head('WORKOUT 003','Venusaur','Programming underway.');
    const prod=e.production||{}, shots=prod.shootList||[];
    const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
    return `<div class="bulba-page venus-page">
      <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #003 • GRASS / POISON • FINAL EVOLUTION</div><span class="bulba-hero-number">WORKOUT 003</span><h1>SO YOU'RE TRAINING<br/><span>VENUSAUR?</span></h1><p>Solar Overload brings the fully evolved Grass starter's Solar Beam, root slams, energy-draining pull and spore release into a complete strength-and-power workout.</p>
        <div class="bulba-hero-tags"><span>Advanced-intermediate</span><span>55–70 min</span><span>Full body</span><span>18 working sets</span></div>
        <div class="bulba-hero-state">✓ Program approved and locked <span>•</span> A/B scripts pending <span>•</span> Filming pending</div>
        <div class="bulba-hero-buttons"><button class="btn btn-lime" data-action="jump-venusaur" data-target="venus-program">Complete workout ↓</button><button class="btn btn-ghost" data-action="jump-venusaur" data-target="venus-production">Filming notes ↗</button></div>
      </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png" alt="Venusaur official Pokémon character illustration" /><div class="bulba-hero-art-label">SEED POKÉMON<br/><strong>#003</strong></div></div></section>
      <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>Approved workout, now published for planning and training.</strong> Both A/B video scripts are the next creative step. Filming, four actual Camera Tests, A/B comparison and final quality review remain pending. The entry is <strong>Review</strong>, not Final.</p></div>
      <section class="bulba-section" id="venus-moves"><div class="bulba-section-head"><span class="eyebrow dark">THE FOUR SIGNATURE MOVES</span><h2>Solar power, roots, energy and spores</h2><p>These are official Venusaur moves mapped to real exercises. Move types are shown in the Pokédex preview, while the complete exercise programming appears below.</p></div>
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(m.type)}</div><div class="bulba-move-icon">${['☀','〰','↢','✺'][i]}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes)}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      <section class="bulba-section" id="venus-program"><div class="bulba-section-head"><span class="eyebrow dark">PROGRAM LOCKED • 7 EXERCISES</span><h2>Complete Solar Overload workout</h2><p>Launch Solar Beam while fresh, keep rope slams brief and sharp, ramp up before your working back squats, then complete the balanced row, bench, hinge and band finisher. Each unilateral set includes both sides.</p></div>
        <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP • 8–10 MIN + SQUAT RAMP-UP SETS</strong><p>${safe(e.workout.warmup)}</p></div><div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="bulba-warmup"><strong>COOLDOWN • 3–5 MIN</strong><p>${safe(e.workout.cooldown)}</p></div></div>
          <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING IDENTITY</div><h3>Powerful. Grounded. Fully evolved.</h3><p>${safe(e.goalRationale)}</p></div><div class="bulba-why"><h3>Scale it to your level</h3><p>${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Technique & safety</h3><p>${safe(e.workout.safety)}</p></div></aside></div>
      </section>
      <section class="bulba-section" id="venus-production"><div class="bulba-section-head"><span class="eyebrow dark">VIDEO DEVELOPMENT • A/B SCRIPT STAGE NEXT</span><h2>One workout. Two comedy versions.</h2><p>Our production standard remains Version A (gym comedy) and Version B (Pokémon-specific comedy), with matched exercise shots, timing, overlays and CTA. Neither script has been written or approved for Venusaur yet.</p></div>
        <div class="venus-stage-grid"><div class="bulba-why"><h3>A • Gym Comedy</h3><p>Relatable gym jokes around Solar Beam, big ropes, heavy lifting and the final evolution. Script pending creator review.</p></div><div class="bulba-why"><h3>B • Pokémon Comedy</h3><p>Game-specific battle references, Solar Beam charge-up and Frenzy Plant recharge. Script pending creator review.</p></div></div>
        <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>Initial filming feasibility checklist</h3><ol>${shots.map(s=>`<li>${safe(s.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Four Camera Tests <span class="bulba-pending">ALL PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
        <div class="bulba-post-grid venus-docs"><div><strong>Approved working program</strong><p>All seven prescriptions, exercise notes, progressions, regressions, filming feasibility checks and research references are saved with the workout.</p><div class="bulba-doc-links"><a href="production/Workout_003_Venusaur_Approved_Program.md" target="_blank" rel="noopener">Approved program & safety notes ↗</a></div></div><div><strong>Next production milestone</strong><p>Write and review both video scripts. Only after filming and all three real-world audits can the episode move from Review to Final.</p></div></div>
      </section>
    </div>`;
  }
  function openVenusaurPreview(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-003' && x.publicWorkout);
    if(!e){selectRoute('pokedex');return;}
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim bulba-preview-scrim venus-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal venus-preview-modal" role="dialog" aria-modal="true" aria-labelledby="venus-preview-title">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close Venusaur preview">×</button>
      <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/3.png" alt="Venusaur Pokémon artwork"/><span>GRASS / POISON • #003</span></div>
      <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT 003 • PROGRAM APPROVED</div><h2 id="venus-preview-title">So You're Training Venusaur?</h2><p>Solar Overload • Advanced-intermediate • 55–70 minutes</p>
      <div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${ivysaurMoveType(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div>
      <p class="bulba-preview-status">The full seven-exercise workout is approved and available. A/B scripts and filmed Camera Tests are still pending.</p>
      <button class="bulba-preview-button" data-action="venusaur-full" type="button">View Full Workout →</button></div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }

  function ivysaurMoveType(m){
    const type=String(m.type||'').toLowerCase();
    const label=type==='fire'?'Fire':type==='poison'?'Poison':type==='normal'?'Normal':type==='grass'?'Grass':'Unknown';
    const glyph=type==='fire'?`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M13.2 2.5c.5 4.1-2.8 5.2-2.7 9.1-1.2-1-1.9-2.2-2.2-3.5C6.3 11 4.4 13.4 4.4 16.1a7.6 7.6 0 0 0 15.2 0c0-4.4-3.1-7.2-6.4-13.6Z" fill="currentColor"/><path d="M12 11.5c-1.1 2-2.8 3-2.8 5A2.8 2.8 0 0 0 12 19.3a2.8 2.8 0 0 0 2.8-2.8c0-1.8-1.2-3.3-2.8-5Z" fill="#e77433"/></svg>`:
      type==='grass'?`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M20 4C11 4 4.5 7.5 4.5 15.5a4.5 4.5 0 0 0 4.5 4.5C17 20 20 12 20 4Z" fill="currentColor"/><path d="M5.5 19c3.5-4.7 7.5-8 11.4-10.5" stroke="#4c9f5a" stroke-width="1.8" stroke-linecap="round"/></svg>`:
      type==='poison'?`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M12 2.5c-4.2 5.2-7.4 9.4-7.4 13a7.4 7.4 0 0 0 14.8 0c0-3.6-3.2-7.8-7.4-13Z" fill="currentColor"/><circle cx="9" cy="15.5" r="1.2" fill="#733d86"/><circle cx="15" cy="15.5" r="1.2" fill="#733d86"/><path d="m10 18 2 1 2-1" stroke="#733d86" stroke-width="1"/></svg>`:
      `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="m12 2.8 2.6 6.1 6.6.6-5.1 4.4 1.6 6.6-5.7-3.4-5.7 3.4 1.6-6.6-5.1-4.4 6.6-.6L12 2.8Z" fill="currentColor"/></svg>`;
    return `<span class="bulba-move-type-icon is-${type}" aria-label="${label}-type move" title="${label}-type move">${glyph}</span>`;
  }
  function openIvysaurPreview(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-002' && x.publicWorkout);
    if(!e){selectRoute('pokedex');return;}
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim bulba-preview-scrim ivy-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal ivy-preview-modal" role="dialog" aria-modal="true" aria-labelledby="ivy-preview-title">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close Ivysaur preview">×</button>
      <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/2.png" alt="Ivysaur Pokémon artwork"/><span>GRASS / POISON • #002</span></div>
      <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT 002 • PROGRAM APPROVED</div><h2 id="ivy-preview-title">So You're Training Ivysaur?</h2><p>Rooted Power • Intermediate • 45–55 minutes</p>
      <div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${ivysaurMoveType(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div>
      <p class="bulba-preview-status">Seven-exercise workout published, with both approved A/B scripts and an 18-shot filming plan. Camera Tests remain pending.</p>
      <button class="bulba-preview-button" data-action="ivysaur-full" type="button">View Full Workout & A/B Scripts →</button></div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }
  function openBulbasaurPreview(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-001' && x.publicWorkout);
    if(!e){selectRoute('pokedex');return;}
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim bulba-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal" role="dialog" aria-modal="true" aria-labelledby="bulba-preview-title">
      <button class="modal-close" data-action="close-modal" type="button" aria-label="Close Bulbasaur preview">×</button>
      <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" alt="Bulbasaur Pokémon artwork" /><span>GRASS / POISON • #001</span></div><div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT 001 • PROGRAM APPROVED</div><h2 id="bulba-preview-title">So You Picked Bulbasaur?</h2><p>Seedling Strength • Beginner+ • 40–50 minutes</p><div class="bulba-preview-list">${e.moves.map((m,i)=>{const type=(m.type||'').toLowerCase(), isGrass=type==='grass', isNormal=type==='normal'; const typeName=isGrass?'Grass':isNormal?'Normal':'Unknown'; const glyph=isGrass?`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M20 4C11 4 4.5 7.5 4.5 15.5a4.5 4.5 0 0 0 4.5 4.5C17 20 20 12 20 4Z" fill="currentColor"/><path d="M5.5 19c3.5-4.7 7.5-8 11.4-10.5" stroke="#4c9f5a" stroke-width="1.8" stroke-linecap="round"/></svg>`:`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="m12 2.8 2.6 6.1 6.6.6-5.1 4.4 1.6 6.6-5.7-3.4-5.7 3.4 1.6-6.6-5.1-4.4 6.6-.6L12 2.8Z" fill="currentColor"/></svg>`;return `<div class="bulba-preview-move"><span class="bulba-move-type-icon ${isGrass?'is-grass':isNormal?'is-normal':'is-unknown'}" title="${typeName}-type move" aria-label="${typeName}-type move">${glyph}</span><div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name ${isGrass?'is-grass':isNormal?'is-normal':'is-unknown'}">${typeName}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`;}).join('')}</div><p class="bulba-preview-status">Seven-exercise workout is published; Version A / B video scripts and the shot list are ready to review. Filming pending.</p><button class="bulba-preview-button" type="button" data-action="bulbasaur-full">View Full Workout & A/B Scripts →</button></div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }

  function render(){
    const views={overview:dashboard,pokedex:()=>browse('pokedex'),characters:()=>browse('characters'),forms:()=>browse('forms'),moves:registry,studio,guide,oak:oakPage,bulbasaur:bulbasaurPage,ivysaur:ivysaurPage,venusaur:venusaurPage,charmander:charmanderPage,charmeleon:charmeleonPage};
    if(!views[route]) route='overview';
    root.innerHTML=views[route]();
    document.getElementById('breadcrumb').textContent=({overview:'DASHBOARD',pokedex:'KANTO POKÉDEX',characters:'CHARACTERS',forms:'FORM REGISTRY',moves:'MOVE REGISTRY',studio:'WORKOUT STUDIO',guide:'PROJECT GUIDE',oak:'PROFESSOR OAK / #000',bulbasaur:'BULBASAUR / #001',ivysaur:'IVYSAUR / #002',venusaur:'VENUSAUR / #003',charmander:'CHARMANDER / #004',charmeleon:'CHARMELEON / #005'})[route];
    document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===route);if(a.dataset.nav===route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.querySelector('.sidebar').classList.remove('open');
  }
  function openOakPreview(){
    // Always show the published Oak program, even when a visitor has older local Studio edits.
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='oak-000' && x.publicWorkout) || entryBy('oak-000');
    const assignments=e?.production?.assignments || [];
    if(!e || !assignments.length){selectRoute('oak');return;}
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim oak-feature-scrim" data-action="close-scrim"><article class="modal oak-feature-modal" role="dialog" aria-modal="true" aria-labelledby="oak-preview-title" aria-describedby="oak-preview-description">
      <button class="modal-close oak-feature-close" type="button" data-action="close-modal" aria-label="Close Professor Oak preview">×</button>
      <div class="oak-feature-visual">
        <img src="assets/professor-oak-game-portrait.webp" alt="Game-inspired portrait of Professor Oak in his laboratory, holding a Poké Ball and clipboard" onerror="this.onerror=null;this.src='assets/professor-oak-fallback.svg'" decoding="async" />
        <div class="oak-dialogue-box"><span class="oak-dialogue-speaker">Professor Oak</span><p>Ah! Welcome to the world of Pokémon!<br/>Let's get you ready for your journey.</p><span class="oak-dialogue-arrow" aria-hidden="true"></span></div>
      </div>
      <div class="oak-feature-info">
        <div class="oak-feature-meta"><span class="oak-feature-pokeball" aria-hidden="true"></span><strong>WORKOUT 000</strong><span class="oak-feature-place">PALLET TOWN</span></div>
        <h2 id="oak-preview-title">Professor Oak's<br/>Trainer Orientation</h2>
        <div class="oak-feature-tags"><span class="oak-feature-level">Beginner</span><span class="oak-feature-type">Full Body</span><span class="oak-feature-time"><span aria-hidden="true">◷</span> 40–45 minutes</span></div>
        <p class="oak-feature-intro" id="oak-preview-description">Before you can choose your starter Pokémon, complete Professor Oak's Trainer Orientation! These four assignments will prepare you for your journey.</p>
        <div class="oak-feature-moves" aria-label="Four main exercises">
          ${assignments.slice(0,4).map((a,i)=>`<div class="oak-feature-move"><span class="oak-feature-number" aria-hidden="true">${i+1}</span><img class="oak-feature-thumb" src="assets/oak-exercise-${i+1}.webp" alt="${safe(a.exercise)} exercise demonstration" loading="lazy"/><div class="oak-feature-move-info"><strong>${safe(a.title)}</strong><span>${safe(a.exercise)}</span><small>${safe(a.reps)}</small></div></div>`).join('')}
        </div>
        <div class="oak-feature-footer">
          <button class="oak-feature-action" type="button" data-action="oak-full-workout"><span aria-hidden="true">✦</span> View Full Workout <span aria-hidden="true">→</span></button>
          <p>Includes warm-up, 3 additional exercises, technique cues, modifications and the full production guide.</p>
        </div>
      </div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }
  function openDetail(id){
    if(id==='oak-000'){openOakPreview();return;}
    if(id==='kanto-001' && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openBulbasaurPreview();return;}
    if(id==='kanto-002' && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openIvysaurPreview();return;}
    if(id==='kanto-003' && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openVenusaurPreview();return;}
    if(id==='kanto-004' && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openCharmanderPreview();return;}
    if(id==='kanto-005' && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openCharmeleonPreview();return;}
    const e=entryBy(id); if(!e) return;
    const final=e.status==='Final';
    const root=document.getElementById('modalHost');
    const label=e.kind==='form'?'FORM · '+safe(e.formGroup):e.kind==='character'?safe(e.role||'Character'):'KANTO POKÉMON';
    root.innerHTML=`<div class="modal-scrim" data-action="close-scrim"><article class="modal" role="dialog" aria-modal="true" aria-label="${safe(e.name)} workout details"><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button><div class="detail-top"><div class="detail-art">${artHtml(e)}</div><div><div class="eyebrow dark">${shortId(e)} · ${label}</div><h2>${safe(e.name)}</h2><div class="card-tags">${typeChips(e)}</div><div style="margin-top:14px">${statusChip(e.status)}</div></div></div>
      ${final?`<section class="detail-block"><h3>Training identity</h3><p>${safe(e.goal)} · ${safe(e.difficulty)} · ${safe(e.durationMinutes)} minutes</p><p>${safe(e.goalRationale)}</p><div class="detail-attribute"><strong>Equipment</strong><span>${e.equipment.length?safe(e.equipment.join(', ')):'Bodyweight / None'}</span></div></section>
      ${isPokemon(e)?`<section class="detail-block"><h3>Four signature moves</h3><div class="detail-list">${(e.moves||[]).map(m=>`<div class="detail-attribute"><strong>${safe(m.name)}</strong><span>${safe(m.exercise)}</span><div style="margin-top:7px;font-size:11px">${safe(m.notes||'')}</div></div>`).join('')}</div></section>`:''}
      ${(e.exercises||[]).length?`<section class="detail-block"><h3>Supporting exercises</h3><div class="detail-list">${e.exercises.map(x=>`<div class="detail-attribute"><strong>${safe(x.name)}</strong><span>${safe(x.sets)} sets · ${safe(x.reps)} reps / time · ${safe(x.rest)} rest</span></div>`).join('')}</div></section>`:''}
      <section class="detail-block"><h3>Complete workout</h3>${[['Warm-up',e.workout.warmup],['Main work',e.workout.main],['Cooldown',e.workout.cooldown],['Modifications',e.workout.modifications],['Safety notes',e.workout.safety]].map(([k,v])=>`<div style="margin-top:14px"><strong>${k}</strong><p>${safe(v)}</p></div>`).join('')}</section>
      <section class="detail-block"><h3>Video and social</h3><p><strong>Hook:</strong> ${safe(e.content.hook)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p>${/^https:\/\//.test(e.videoUrl||'')?`<p><a href="${safe(e.videoUrl)}" target="_blank" rel="noopener noreferrer">Watch video ↗</a></p>`:''}</section>`:
      `<section class="detail-block"><h3>Workout under construction</h3><p>This entry is currently ${safe(e.status.toLowerCase())}. Its complete program will appear here only after all required checks have passed and the workout is finalized.</p>${e.goal?`<p><strong>Proposed goal:</strong> ${safe(e.goal)}</p>`:''}</section>`}
      ${e.kind==='form'?`<section class="detail-block"><p><strong>Parent species:</strong> ${safe(entryBy(e.baseId)?.name||'Unknown')} · Form-specific typing and learnsets still require individual verification.</p></section>`:''}
      <div class="modal-buttons">${btn('Edit in Studio →','edit-detail','btn-dark',`data-id="${safe(e.id)}"`)}${btn('Close','close-modal','btn-outline')}</div></article></div>`;
    root.querySelector('.modal-close')?.focus();
  }
  function setPath(obj,path,val){const parts=path.split('.');let target=obj;for(const p of parts.slice(0,-1)){if(!(p in target)||target[p]==null)target[p]={};target=target[p];}target[parts.at(-1)]=val;}
  function readEdit(el){if(!draft) return;const path=el.dataset.edit;if(!path)return;let value=el.type==='checkbox'?el.checked:el.value;if(path==='equipment'||path==='types')value=String(value).split(',').map(s=>s.trim()).filter(Boolean);if(path==='durationMinutes')value=value===''?'':Number(value);setPath(draft,path,value);dirty=true;}
  function validate(e){const missing=[];const require=(v,label)=>{if(!String(v??'').trim())missing.push(label);};
    require(e.name,'Entry name');require(e.goal,'Primary training goal');require(e.goalRationale,'Training goal rationale');
    if(!levels.slice(1).includes(e.difficulty))missing.push('Choose a difficulty');
    if(!(Number(e.durationMinutes)>0))missing.push('Set a positive duration in minutes');
    if(isPokemon(e)){
      if(!e.types?.length)missing.push('Verify and enter this form/species typing');
      if(!Array.isArray(e.moves)||e.moves.length!==4)missing.push('Exactly four signature moves');
      else{
        e.moves.forEach((m,i)=>{let p=`Move ${i+1}`;require(m.name,`${p}: official move name`);require(m.exercise,`${p}: real exercise`);require(m.notes,`${p}: meaningful move/exercise connection`);if(!m.verified)missing.push(`${p}: verify the move belongs to this Pokémon's learnset`);for(const [key,label] of [['pokemonTest','Pokémon'],['trainerTest','Trainer'],['cameraTest','Camera']])if(!m[key])missing.push(`${p}: ${label} test`);});
        if(new Set(e.moves.map(m=>norm(m.name))).size!==4)missing.push('Four distinct official moves are required');
        const key=moveKey(e);if(key){const duplicates=entries().filter(other=>other.id!==e.id&&isPokemon(other)&&moveKey(other)===key);if(duplicates.length)missing.push(`Duplicate core moveset used by: ${duplicates.map(x=>x.name).join(', ')}`);}
      }
    }else if(!e.exercises?.length)missing.push('Add at least one programmed exercise for a character');
    for(const [key,label] of [['warmup','Warm-up'],['main','Main workout with sets, reps and rest'],['cooldown','Cooldown'],['modifications','Beginner/intermediate/advanced scaling'],['safety','Safety and technique notes']])require(e.workout?.[key],label);
    for(const x of (e.exercises||[])){require(x.name,'Supporting exercise: real name');require(x.sets,'Supporting exercise: sets');require(x.reps,'Supporting exercise: reps or time');require(x.rest,'Supporting exercise: rest');}
    require(e.research?.pokedex,'Pokémon or character background research');require(e.research?.behavior,'Behavior/personality research');require(e.research?.sources,'Research source references');
    if(isPokemon(e)){require(e.research?.anatomy,'Anatomy / physical characteristic research');require(e.research?.learnset,'Learnset / abilities and game version research');}
    for(const [key,label] of [['hook','3-second hook'],['script','Full video script'],['filming','Filming sequence'],['onScreen','On-screen move and workout text'],['ending','Video ending'],['caption','Social caption'],['cover','Cover concept'],['callToAction','Natural engagement prompt']])require(e.content?.[key],label);
    if(String(e.content?.hashtags||'').split(',').filter(x=>x.trim()).length!==5)missing.push('Exactly five targeted hashtags, comma separated');
    for(const [key,label] of Object.entries(qualityKeys)){if(key==='moveset'&&!isPokemon(e))continue;if(!e.quality?.[key])missing.push(`Quality check: ${label}`);}
    return missing;
  }
  function saveDraft(finalizing){
    if(!draft){toast('Choose an entry first.');return;}
    const row=cl(draft);
    if(isPokemon(row))row.moves=row.moves.map(m=>({...m,name:String(m.name||'').trim(),exercise:String(m.exercise||'').trim()}));
    if(finalizing){errors=validate(row);if(errors.length){render();document.getElementById('validationErrors')?.scrollIntoView({behavior:'smooth',block:'center'});toast(`${errors.length} items still need approval.`);return;}row.status='Final';row.finalizedAt=today();}
    else if(entryBy(row.id)?.status==='Final'){row.status='Review';row.finalizedAt=null;}
    else if(row.status==='Final'){row.status='Review';row.finalizedAt=null;}
    row.updatedAt=today(); const at=entries().findIndex(e=>e.id===row.id);if(at<0)return;db.entries[at]=row;db.publishedAt=today();saveLocal();initStudio(row.id);render();toast(finalizing?`✓ ${row.name} finalized. Export data.js to publish it.`:`Saved ${row.name} to your browser.`);
  }
  function downloadFile(content,file,type='application/json'){
    const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=file;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function exportJson(){ downloadFile(JSON.stringify(db,null,2),'workouts.json');toast('Backup exported. Keep it somewhere safe.');}
  function publicDatabase(){
    const snapshot=cl(db);
    snapshot.entries=snapshot.entries.map(e=>{
      if(e.status==='Final'||e.publicWorkout===true)return {...e,notes:''};
      const clean=newRecord(e.id,e.name,e.kind,e.chapter,e.dexNumber,e.types||[],e.baseId,e.form,e.formGroup);
      clean.role=e.role||clean.role;
      return clean;
    });
    return snapshot;
  }
  function exportJs(){
    downloadFile('window.WORKOUT_DEX_SEED = '+JSON.stringify(publicDatabase())+';\n','data.js','text/javascript');
    toast('Public data.js exported (Final workouts and explicitly published programs). Replace site data.js and redeploy.');
  }
  function openCreate(kind){
    const isForm=kind==='form', parentOptions=entries().filter(e=>e.kind==='pokemon').map(e=>`<option value="${safe(e.id)}">${shortId(e)} ${safe(e.name)}</option>`).join('');
    document.getElementById('modalHost').innerHTML=`<div class="modal-scrim" data-action="close-scrim"><form class="modal" id="createForm" aria-label="Create a new ${isForm?'form':'entry'}"><button type="button" class="modal-close" data-action="close-modal" aria-label="Close">×</button><div class="eyebrow dark">EXPAND THE DEX</div><h2 style="margin:9px 0 8px">${isForm?'Register a new form':'Register a new entry'}</h2><p class="muted">This creates a separate planned workout. You can research and program it in the Studio.</p><div class="form-grid">${isForm?`<label class="field">Parent Pokémon<select name="base" required>${parentOptions}</select></label>${fieldCreate('Form / variant label','form','e.g. Mega, Alolan, Costume',true)}${fieldCreate('Name shown in Dex','name','e.g. Mega Venusaur',true)}${fieldCreate('Form family','formGroup','e.g. Mega Evolution',true)}`:`<label class="field">Entry type<select name="kind"><option value="pokemon">Pokémon</option><option value="character">Character</option></select></label>${fieldCreate('Name','name','Pokémon / trainer name',true)}${fieldCreate('National Pokédex number (Pokémon)','number','152')}${fieldCreate('Region / chapter','chapter','Johto')}${fieldCreate('Pokémon typing (comma separated)','types','Grass, Poison')}`}</div><div class="modal-buttons"><button class="btn btn-dark" type="submit">Create planned entry →</button><button class="btn btn-outline" type="button" data-action="close-modal">Cancel</button></div></form></div>`;
    document.querySelector('#createForm input')?.focus();
  }
  function fieldCreate(label,name,placeholder,required=false){return `<label class="field">${label}<input name="${name}" placeholder="${safe(placeholder)}" ${required?'required':''} /></label>`;}
  function newRecord(id,name,kind,chapter,dexNumber=null,types=[],baseId=null,form=null,formGroup=null){
    return {id,name,kind,chapter,dexNumber,types,baseId,form,formGroup,role:kind==='character'?'Character':null,status:'Planned',difficulty:'Unassigned',goal:'',goalRationale:'',durationMinutes:'',equipment:[],moves:[],exercises:[],workout:{warmup:'',main:'',cooldown:'',modifications:'',safety:''},research:{pokedex:'',anatomy:'',behavior:'',learnset:'',sources:''},content:{hook:'',script:'',filming:'',onScreen:'',ending:'',caption:'',cover:'',callToAction:'',hashtags:''},quality:{accuracy:false,programming:false,visual:false,moveset:false,writing:false},notes:'',videoUrl:'',updatedAt:null,finalizedAt:null};
  }
  function createSubmit(form){
    const data=new FormData(form), isForm=data.has('base'), name=String(data.get('name')||'').trim();if(!name)return toast('Entry needs a name.');
    let record;
    if(isForm){const parent=entryBy(data.get('base'));if(!parent||parent.kind!=='pokemon')return toast('Choose a valid base Pokémon.');
      const f=String(data.get('form')||'').trim(),group=String(data.get('formGroup')||'').trim();if(!f||!group)return toast('Enter the form name and family.');
      record=newRecord('variant-'+Date.now()+'-'+slug(name),name,'form','Forms',parent.dexNumber,[],parent.id,f,group);
    } else {
      const kind=data.get('kind');const raw=String(data.get('number')||'').trim();const num=raw?Number(raw):null;const chapter=String(data.get('chapter')||'').trim()||'Future Regions';
      if(kind==='pokemon'&&(!Number.isInteger(num)||num<1))return toast('Pokémon need a valid National Pokédex number.');
      if(kind==='pokemon'&&entries().some(e=>e.kind==='pokemon'&&e.dexNumber===num))return toast('This base National Pokédex number is already registered. Add a form instead.');
      record=newRecord('new-'+Date.now()+'-'+slug(name),name,kind,chapter,num,String(data.get('types')||'').split(',').map(s=>s.trim()).filter(Boolean));
    }
    db.entries.push(record);db.publishedAt=today();saveLocal();closeModal();dirty=false;navToStudio(record.id);toast(`${name} added to the Dex.`);
  }
  function closeModal(){document.getElementById('modalHost').innerHTML='';}
  function action(action,el){switch(action){
    case 'pokedex':case 'studio':case 'overview':case 'characters':case 'forms':case 'moves':case 'guide':selectRoute(action);break;
    case 'oak':selectRoute('oak');break;
    case 'bulbasaur':selectRoute('bulbasaur');break;
    case 'ivysaur':selectRoute('ivysaur');break;
    case 'venusaur':selectRoute('venusaur');break;
    case 'charmander':selectRoute('charmander');break;
    case 'charmeleon':selectRoute('charmeleon');break;
    case 'charmeleon-preview':openCharmeleonPreview();break;
    case 'charmeleon-full':closeModal();selectRoute('charmeleon');requestAnimationFrame(()=>document.getElementById('meleon-program')?.scrollIntoView({behavior:'instant',block:'start'}));break;
    case 'jump-charmeleon':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'charmander-preview':openCharmanderPreview();break;
    case 'charmander-full':closeModal();selectRoute('charmander');requestAnimationFrame(()=>document.getElementById('char-program')?.scrollIntoView({behavior:'instant',block:'start'}));break;
    case 'jump-charmander':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'venusaur-preview':openVenusaurPreview();break;
    case 'venusaur-full':closeModal();selectRoute('venusaur');requestAnimationFrame(()=>document.getElementById('venus-program')?.scrollIntoView({behavior:'instant',block:'start'}));break;
    case 'jump-venusaur':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'ivysaur-preview':openIvysaurPreview();break;
    case 'ivysaur-full':closeModal();selectRoute('ivysaur');requestAnimationFrame(()=>document.getElementById('ivy-program')?.scrollIntoView({behavior:'instant',block:'start'}));break;
    case 'jump-ivysaur':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'bulbasaur-preview':openBulbasaurPreview();break;
    case 'bulbasaur-full':closeModal();selectRoute('bulbasaur');requestAnimationFrame(()=>document.getElementById('bulba-program')?.scrollIntoView({behavior:'instant',block:'start'}));break;
    case 'jump-bulbasaur':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'video-version':{const ns=route==='ivysaur'?'ivy':route==='charmander'?'char':route==='charmeleon'?'meleon':'bulba';const tab=document.getElementById(ns+'-tab-'+el.dataset.version);if(!tab)break;document.querySelectorAll('#'+ns+'-scripts [role="tab"]').forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;t.classList.toggle('selected',selected);});document.querySelectorAll('#'+ns+'-scripts [role="tabpanel"]').forEach(p=>p.hidden=p.id!==ns+'-panel-'+el.dataset.version);tab.focus();break;}
    case 'oak-preview':openOakPreview();break;
    case 'oak-full-workout':
      closeModal();
      selectRoute('oak');
      if(route==='oak')requestAnimationFrame(()=>document.getElementById('oak-program')?.scrollIntoView({behavior:'instant',block:'start'}));
      break;
    case 'edit-oak':navToStudio('oak-000');break;
    case 'jump-oak':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'detail':openDetail(el.dataset.id);break;
    case 'close-modal':closeModal();break;
    case 'edit-detail':{const id=el.dataset.id;closeModal();navToStudio(id);break;}
    case 'prev-page':page=Math.max(1,page-1);render();break;
    case 'next-page':page++;render();break;
    case 'clear-filters':query=filterStatus=filterDifficulty=filterType=filterForm='';page=1;render();break;
    case 'save-draft':saveDraft(false);break;
    case 'finalize':saveDraft(true);break;
    case 'add-exercise':if(!draft)return;draft.exercises.push({name:'',alias:'',equipment:'',sets:'',reps:'',rest:'',notes:''});dirty=true;render();break;
    case 'remove-exercise':if(!draft)return;draft.exercises.splice(Number(el.dataset.index),1);dirty=true;render();break;
    case 'export-json':exportJson();break;
    case 'export-js':exportJs();break;
    case 'import-json':{let f=document.getElementById('importFile');if(!f){navToStudio(studioId);f=document.getElementById('importFile')}f?.click();break;}
    case 'reset':if(confirm('Clear your browser edits and restore the last published seed? Export your work first.')){localStorage.removeItem(STORE_KEY);db=cl(window.WORKOUT_DEX_SEED);initStudio('oak-000');render();toast('Local edits cleared. Published seed restored.');}break;
    case 'add-form':if(dirty && !confirm('Discard unsaved studio edits to add a form?'))return;dirty=false;openCreate('form');break;
    case 'add-entry':if(dirty && !confirm('Discard unsaved studio edits to add an entry?'))return;dirty=false;openCreate('entry');break;
  }}
  root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)action(b.dataset.action,b);});
  document.addEventListener('click',e=>{
    const b=e.target.closest('#modalHost [data-action]');if(b){if(b.dataset.action==='close-scrim'&&e.target!==b)return;if(b.dataset.action==='close-scrim')closeModal();else action(b.dataset.action,b);}
  });
  document.addEventListener('submit',e=>{if(e.target.id==='createForm'){e.preventDefault();createSubmit(e.target);}});
  root.addEventListener('input',e=>{
    if(e.target.dataset.edit)readEdit(e.target);
    if(e.target.id==='filterSearch'){query=e.target.value;page=1;const where=e.target.selectionStart;render();const next=document.getElementById('filterSearch');next?.focus();try{next?.setSelectionRange(where,where);}catch{}}
  });
  root.addEventListener('change',e=>{
    if(e.target.dataset.edit)readEdit(e.target);
    if(e.target.dataset.filter){const v=e.target.value;({status:()=>filterStatus=v,difficulty:()=>filterDifficulty=v,type:()=>filterType=v,form:()=>filterForm=v})[e.target.dataset.filter]?.();page=1;render();}
    if(e.target.id==='studioPicker'){if(dirty&&!confirm('Discard unsaved changes?')){e.target.value=studioId;return;}initStudio(e.target.value);render();}
    if(e.target.id==='importFile'&&e.target.files?.[0]){
      const f=e.target.files[0],reader=new FileReader();reader.onload=()=>{try{
        const data=JSON.parse(reader.result);
        if(data.schemaVersion!==1||!Array.isArray(data.entries)||!data.entries.length||!data.entries.every(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.kind==='string')||new Set(data.entries.map(x=>x.id)).size!==data.entries.length)throw Error('This is not a valid v1 Workout Dex backup.');
        if(!confirm(`Import ${data.entries.length} entries? This will replace all local changes.`))return;
        db=data;db.publishedAt=today();saveLocal();initStudio(entries()[0].id);render();toast('Import complete. Your entries are restored.');
      }catch(err){toast('Could not import: '+err.message);}};reader.readAsText(f);e.target.value='';
    }
  });
  document.querySelectorAll('a[data-nav]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();selectRoute(a.dataset.nav)}));
  document.getElementById('topStudio').addEventListener('click',()=>{if(dirty && !confirm('Discard unsaved studio edits to add a new entry?'))return;dirty=false;navToStudio(studioId);openCreate('entry');});
  document.getElementById('mobileNav').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  window.addEventListener('hashchange',()=>{const next=location.hash.slice(1)||'overview';if(route!==next){if(dirty&&!confirm('Discard unsaved changes?')){location.hash=route;return;}route=next;draft=null;dirty=false;page=1;query='';render();}});
  if(route==='studio')initStudio(studioId);
  render();
})();