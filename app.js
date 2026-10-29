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
    const usage={};for(const e of entries().filter(isPokemon))for(const m of (e.moves||[]))if(norm(m.name)){let k=m.name.trim();(usage[norm(k)]||=( {name:k,type:m.type,users:new Set()})).users.add(e.name);}
    const sorted=Object.values(usage).sort((a,b)=>b.users.size-a.users.size||a.name.localeCompare(b.name));
    return `${head('MOVE SYSTEM / AUDIT','Signature move registry','Every four-move set must be unique, regardless of move order. Move learnsets are verified during final approval.')}
      <div class="stats-grid" style="margin-bottom:20px">${stat('COMPLETE SETS',sets.length,'Four named moves','◈')}${stat('UNIQUE SETS',unique.length,'Distinct combinations','≋')}${stat('DUPLICATE SETS',duplicates.length,'Must be resolved before finalizing','⚑')}${stat('INDIVIDUAL MOVES',sorted.length,'Different official move names entered','✦')}</div>
      <section class="panel panel-pad"><div class="panel-heading"><div><h3>Four-move combinations</h3><p>Combination registry across Pokémon and form entries</p></div></div>${sets.length?`<div class="table-wrap"><table class="registry-table"><thead><tr><th>Pokémon</th><th>Signature moves</th><th>Status</th><th>Audit</th></tr></thead><tbody>${sets.map(e=>`<tr><td><button data-action="detail" data-id="${safe(e.id)}">${safe(e.name)}</button></td><td><div class="registry-moves">${e.moves.map(m=>`<span class="registry-move">${moveTypeEmblem(m)}<span>${safe(m.name)}</span></span>`).join('')}</div></td><td>${statusChip(e.status)}</td><td>${dup.get(moveKey(e)).length>1?'<span class="badge red">DUPLICATE</span>':'<span class="badge green">UNIQUE</span>'}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><h3>No movesets assigned yet</h3><p>Open Workout Studio, choose Bulbasaur, and start with four verified official moves.</p>${btn('Open workout studio','studio','btn-dark')}</div>`}</section>
      ${sorted.length?`<section class="panel panel-pad" style="margin-top:16px"><h3>Most-used moves</h3><div class="table-wrap"><table class="registry-table"><thead><tr><th>Move</th><th>Used by</th></tr></thead><tbody>${sorted.slice(0,30).map(v=>`<tr><td><span class="registry-move">${moveTypeEmblem({type:v.type})}<span>${safe(v.name)}</span></span></td><td>${v.users.size} entries</td></tr>`).join('')}</tbody></table></div></section>`:''}`;
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

  // Approved connected storytelling. Creative training chains are not canonical move evolution.
  const STARTER_FAMILIES = [
    {ids:['kanto-001','kanto-002','kanto-003'],routes:['bulbasaur','ivysaur','venusaur'],names:['Bulbasaur','Ivysaur','Venusaur'],family:'Grass starter',accent:'grass',
      intro:'From seedling fundamentals to rooted strength and the Frenzy Plant finisher. These are related training themes, not literal Pokémon move evolutions.',
      arcs:[
        ['Plant attack grows','Seed Bomb → Growth → Solar Beam','Medicine-ball slam → dumbbell thruster → landmine push press. More whole-body force and projection.'],
        ['Vines to overgrowth','Vine Whip → Grassy Glide → Frenzy Plant','Alternating rope waves → rooted lateral lunge → decisive two-arm rope slams. Plant-control themes, not identical exercise patterns.'],
        ['Leg strength foundation','Tackle → Trap Bar Deadlift → Back Squat','Bulbasaur sled push establishes leg drive; later supporting lifts build strength without pretending to be Pokémon moves.'],
        ['Poison tactics mature','Sludge Bomb → Poison Powder + Giga Drain','Poison appears with Ivysaur; Venusaur adds a poison status move and draining pull. No invented stage-one poison move.']
      ]},
    {ids:['kanto-004','kanto-005','kanto-006'],routes:['charmander','charmeleon','charizard'],names:['Charmander','Charmeleon','Charizard'],family:'Fire starter',accent:'fire',
      intro:'Three signature attack families grow into a final evolution. Charizard adds Seismic Toss as its new identity.',
      arcs:[
        ['Claw progression','Scratch → Slash → Dragon Claw','One-arm diagonal cable pull → two-hand chop → one-arm step-and-pivot chop. Keep the descending claw motion.'],
        ['Forward charge','Flame Charge → strength bridge → Flare Blitz','Short acceleration → Charmeleon deadlift/lunge strength → loaded sled push. Same horizontal drive, greater resistance.'],
        ['Fire projection','Ember → Flamethrower → Blast Burn','Medicine-ball chest pass → light Svend press → squat-driven landmine thruster.'],
        ['Final-stage signature','Seismic Toss joins at Charizard','Safe sandbag shoulder/toss builds on earlier hinges and deadlifts, not a fabricated precursor move.']
      ]},
    {ids:['kanto-007','kanto-008','kanto-009'],routes:['squirtle','wartortle','blastoise'],names:['Squirtle','Wartortle','Blastoise'],family:'Water starter',accent:'water',
      intro:'All four signature slots grow into stronger water pressure, shell defense, rotational skill and forward drive.',
      arcs:[
        ['Water projection','Water Gun → Water Pulse → Hydro Cannon','Standing one-arm band press → half-kneeling cable press → dual-cable power press.'],
        ['Shell defense','Withdraw → Protect → Iron Defense','Forearm plank → tall-kneeling Pallof press → double-kettlebell front-rack carry.'],
        ['Water rotation','Rapid Spin → Aqua Tail → Surf','Controlled band turn → wider landmine sweep → medicine-ball scoop toss into approved wall.'],
        ['Forward charge','Tackle → Aqua Jet → Wave Crash','Light sled march → accelerated light sled push → moderately heavy sled drive. Squirtle marches instead of copying Bulbasaur’s Tackle push.']
      ]}
  ];
  function starterEvolutionPanel(id){
    const family=STARTER_FAMILIES.find(x=>x.ids.includes(id));
    if(!family)return '';
    const stage=family.ids.indexOf(id);
    const stages=family.names.map((name,i)=>{
      const active=stage===i;
      return `<button class="starter-stage ${active?'active':''}" type="button" data-action="starter-stage" data-target="${family.routes[i]}" ${active?'aria-current="page"':''} aria-label="Open Workout ${family.ids[i].slice(-3)} ${name}">
        <span class="starter-stage-number">#${family.ids[i].slice(-3)}</span><strong>${safe(name)}</strong><small>${i===0?'LEARN':i===1?'DEVELOP':'UNLEASH'}</small>
      </button>`;
    }).join('');
    return `<section class="bulba-section starter-chain-section starter-chain-${family.accent}" aria-label="${family.family} evolution workout progression">
      <div class="bulba-section-head"><span class="eyebrow dark">CONNECTED EVOLUTION WORKOUTS</span><h2>${safe(family.names.join(' → '))}</h2><p>${safe(family.intro)}</p></div>
      <div class="starter-stages">${stages}</div>
      <div class="starter-chain-grid">${family.arcs.map(arc=>`<article class="starter-chain-card"><span>${safe(arc[0])}</span><strong>${safe(arc[1])}</strong><p>${safe(arc[2])}</p></article>`).join('')}</div>
      <p class="starter-chain-note">The Pokémon moves are official; the workout connections describe our training design, not in-game move evolution. Filmed Camera Tests remain pending.</p>
    </section>`;
  }

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
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(m)}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes.replace(' Filming Camera Test is not yet complete.',''))}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      ${starterEvolutionPanel(e.id)}
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
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(m)}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes.replace(' Filming Camera Test is not yet complete.',''))}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      ${starterEvolutionPanel(e.id)}
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
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(m.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(m)}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes)}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      ${starterEvolutionPanel(e.id)}
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
      <div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${moveTypeEmblem(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div>
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
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(m.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(m)}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes)}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      ${starterEvolutionPanel(e.id)}
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
      <div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${moveTypeEmblem(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div>
      <p class="bulba-preview-status">Approved seven-exercise workout and both A/B script drafts are ready for review. Filming and four Camera Tests remain pending.</p>
      <button class="bulba-preview-button" data-action="charmeleon-full" type="button">View Full Workout & A/B Scripts →</button></div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }

  // Charizard #006: creator-locked workout and matched script drafts; filmed Camera Tests pending.
  function charizardPage(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-006' && x.publicWorkout);
    if(!e)return head('WORKOUT 006','Charizard','Programming underway.');
    const prod=e.production||{},shots=prod.shootList||[],variants=prod.versions||[];
    const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
    const videoTabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="Charizard A/B video scripts">${variants.map((v,i)=>`<button id="zard-tab-${safe(v.id)}" type="button" data-action="video-version" data-version="${safe(v.id)}" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="zard-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" class="bulba-tab ${i===0?'selected':''}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
      ${variants.map((v,i)=>`<div id="zard-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="zard-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}>
        <div class="bulba-script-intro"><strong>${safe(v.label)}: ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>
        ${v.beats.map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
    return `<div class="bulba-page meleon-page zard-page">
      <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #006 • FIRE / FLYING • FINAL EVOLUTION</div><span class="bulba-hero-number">WORKOUT 006</span><h1>SO YOU'RE TRAINING<br/><span>CHARIZARD?</span></h1><p>Full Blaze completes three training move chains from Charmander and Charmeleon, combining stronger fire projection, a loaded charge, Dragon Claw and Seismic Toss.</p>
        <div class="bulba-hero-tags"><span>Advanced</span><span>65–75 min</span><span>22 working sets</span><span>Power + strength</span></div>
        <div class="bulba-hero-state">✓ Program approved and locked <span>•</span> A/B scripts drafted <span>•</span> Filming pending</div>
        <div class="bulba-hero-buttons"><button class="btn btn-lime" data-action="jump-charizard" data-target="zard-program">Complete workout ↓</button><button class="btn btn-ghost" data-action="jump-charizard" data-target="zard-scripts">Compare scripts A / B ↗</button></div>
      </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png" alt="Charizard official Pokémon character illustration" /><div class="bulba-hero-art-label">FLAME POKÉMON<br/><strong>#006</strong></div></div></section>
      <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>Seven-exercise Charizard workout approved and published for planning and training.</strong> Filming, four Camera Tests, A/B test results and final quality review remain pending; both A/B scripts are drafted for production review. This episode remains in <strong>Review</strong>, not Final.</p></div>
      <section class="bulba-section" id="zard-moves"><div class="bulba-section-head"><span class="eyebrow dark">FOUR SIGNATURE MOVES</span><h2>Three evolved moves. One new finishing throw.</h2><p>Four real Charizard moves map to trained movements. Seismic Toss is from historical learnsets, rather than Scarlet/Violet; Dragon Claw is Dragon-type even though Charizard itself is Fire/Flying.</p></div>
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(m.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(m)}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes)}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      ${starterEvolutionPanel(e.id)}
      <section class="bulba-section" id="zard-program"><div class="bulba-section-head"><span class="eyebrow dark">PROGRAM LOCKED • 7 EXERCISES</span><h2>Complete Full Blaze workout</h2><p>Perform crisp landmine thrusters and safe sandbag tosses first, then front squats, sled pushes, pull-ups, incline dumbbell presses and a controlled Dragon Claw chop. Heavy strength stays near RPE 7–8.</p></div>
        <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP • 8–10 MIN</strong><p>${safe(e.workout.warmup)}</p></div><div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="bulba-warmup"><strong>COOLDOWN • 3–5 MIN</strong><p>${safe(e.workout.cooldown)}</p></div></div>
          <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING IDENTITY</div><h3>The final evolution of a real training plan.</h3><p>${safe(e.goalRationale)}</p></div><div class="bulba-why"><h3>Beginner → advanced</h3><p>${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Technique &amp; safety</h3><p>${safe(e.workout.safety)}</p></div></aside></div>
      </section>
      <section class="bulba-section" id="zard-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO MATCHED VIDEO DRAFTS • ONE WORKOUT</span><h2>Charizard A / B: which jokes land?</h2><p>Both 70-second cuts share the exercise footage, timecodes, move labels, VFX, music, cover, caption and CTA. Spoken jokes and matched subtitles are the only differences.</p></div>
        ${videoTabs}
        <div class="bulba-ab-method"><h3>A/B testing rules</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
      </section>
      <section class="bulba-section" id="zard-production"><div class="bulba-section-head"><span class="eyebrow dark">SHOOT PLAN • NOT YET FILMED</span><h2>Film once, cut twice</h2><p>The video highlights Blast Burn, Seismic Toss, Flare Blitz and Dragon Claw. For the real session follow the seven-exercise program in order; Camera Tests and evolution comparisons must be filmed.</p></div>
        <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>20-shot checklist</h3><ol>${shots.map(s=>`<li>${safe(s.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Four Camera Tests <span class="bulba-pending">ALL PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
        <div class="bulba-post-grid venus-docs"><div><strong>Social / cover package</strong><p><strong>Cover:</strong> ${safe(e.content.cover)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p><p><strong>Five hashtags:</strong> ${safe(e.content.hashtags)}</p></div><div><strong>Production files</strong><p>Approved seven-exercise program, two draft A/B scripts, 20-shot filming plan and the full evolution audit.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Complete training & safety','Filming & A/B plan','Script A • Gym comedy','Script B • Pokémon comedy','Workout card','Evolution progression audit'][i]||'Working document'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Scripts drafted for production review; no footage or verified Camera Tests yet. Status: Review.</p></div></div>
      </section>
    </div>`;
  }
  function openCharizardPreview(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-006' && x.publicWorkout);
    if(!e){selectRoute('pokedex');return;}
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim bulba-preview-scrim zard-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal zard-preview-modal" role="dialog" aria-modal="true" aria-labelledby="zard-preview-title">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close Charizard preview">×</button>
      <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png" alt="Charizard Pokémon artwork"/><span>FIRE / FLYING • #006</span></div>
      <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT 006 • PROGRAM APPROVED</div><h2 id="zard-preview-title">So You’re Training Charizard?</h2><p>Full Blaze • Advanced • 65–75 minutes</p>
      <div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${moveTypeEmblem(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div>
      <p class="bulba-preview-status">Approved seven-exercise workout and both A/B script drafts are ready for review. Filming and four Camera Tests remain pending.</p>
      <button class="bulba-preview-button" data-action="charizard-full" type="button">View Full Workout & A/B Scripts →</button></div>
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
        <div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(m.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(m)}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes)}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div>
      </section>
      ${starterEvolutionPanel(e.id)}
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
      <div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${moveTypeEmblem(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div>
      <p class="bulba-preview-status">The full seven-exercise workout is approved and available. A/B scripts and filmed Camera Tests are still pending.</p>
      <button class="bulba-preview-button" data-action="venusaur-full" type="button">View Full Workout →</button></div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }

  // Shared local move-type catalog. Sources: assets/type-icons/LICENSE.txt.
  const MOVE_TYPE_NAMES = Object.freeze({normal:'Normal',fire:'Fire',water:'Water',electric:'Electric',grass:'Grass',ice:'Ice',fighting:'Fighting',poison:'Poison',ground:'Ground',flying:'Flying',psychic:'Psychic',bug:'Bug',rock:'Rock',ghost:'Ghost',dragon:'Dragon',dark:'Dark',steel:'Steel',fairy:'Fairy'});
  function moveTypeEmblem(move){
    const type=String(move?.type||'').trim().toLowerCase();
    const label=MOVE_TYPE_NAMES[type];
    if(!label)return '<span class="bulba-move-type-icon type-emblem is-unknown" role="img" aria-label="Unknown move type" title="Unknown move type">?</span>';
    return `<span class="bulba-move-type-icon type-emblem is-${type}" role="img" aria-label="${label}-type move" title="${label}-type move"><img src="assets/type-icons/${type}.svg" alt="" aria-hidden="true" width="40" height="40" loading="lazy" decoding="async"></span>`;
  }
  function openIvysaurPreview(){
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-002' && x.publicWorkout);
    if(!e){selectRoute('pokedex');return;}
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim bulba-preview-scrim ivy-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal ivy-preview-modal" role="dialog" aria-modal="true" aria-labelledby="ivy-preview-title">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close Ivysaur preview">×</button>
      <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/2.png" alt="Ivysaur Pokémon artwork"/><span>GRASS / POISON • #002</span></div>
      <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT 002 • PROGRAM APPROVED</div><h2 id="ivy-preview-title">So You're Training Ivysaur?</h2><p>Rooted Power • Intermediate • 45–55 minutes</p>
      <div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${moveTypeEmblem(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div>
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
      <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" alt="Bulbasaur Pokémon artwork" /><span>GRASS / POISON • #001</span></div><div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT 001 • PROGRAM APPROVED</div><h2 id="bulba-preview-title">So You Picked Bulbasaur?</h2><p>Seedling Strength • Beginner+ • 40–50 minutes</p><div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${moveTypeEmblem(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div><p class="bulba-preview-status">Seven-exercise workout is published; Version A / B video scripts and the shot list are ready to review. Filming pending.</p><button class="bulba-preview-button" type="button" data-action="bulbasaur-full">View Full Workout & A/B Scripts →</button></div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }


  // Reusable Water starter trilogy, all programs creator-approved for Review.
  function waterWorkoutPage(number){
    const n=String(number).padStart(3,'0');
    const metadata={
      '007':{name:'Squirtle',title:'Shell School',level:'Beginner+',duration:'40–50 min',sets:16,theme:'Learn water projection, shell bracing, a light tackle march and controlled rotation.'},
      '008':{name:'Wartortle',title:'Current Control',level:'Intermediate',duration:'50–60 min',sets:18,theme:'Develop Squirtle’s four skills with greater speed, cable resistance, tail rotation and anti-rotation.'},
      '009':{name:'Blastoise',title:'Cannon Fortress',level:'Advanced',duration:'65–75 min',sets:22,theme:'Unleash dual-cannon power, stronger shell defense, wave-sized rotation and a heavy water charge.'}
    };
    const m=metadata[n];
    if(!m)return head('WATER WORKOUT','Unknown stage','No workout');
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n&&x.publicWorkout);
    if(!e)return head('WORKOUT '+n,m.name,'Program coming soon.');
    const prod=e.production||{},shots=prod.shootList||[],versions=prod.versions||[],ns='water-'+n;
    const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
    const tabs=versions.length===2?`<div class="bulba-tabs" role="tablist" aria-label="${m.name} A/B scripts">${versions.map((v,i)=>`<button type="button" id="${ns}-tab-${safe(v.id)}" class="bulba-tab ${i===0?'selected':''}" role="tab" aria-controls="${ns}-panel-${safe(v.id)}" aria-selected="${i===0?'true':'false'}" tabindex="${i===0?'0':'-1'}" data-action="video-version" data-version="${safe(v.id)}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
      ${versions.map((v,i)=>`<div class="bulba-script-panel" id="${ns}-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="${ns}-tab-${safe(v.id)}" ${i?'hidden':''}><div class="bulba-script-intro"><strong>${safe(v.label)} • ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>${(v.beats||[]).map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
    return `<div class="bulba-page water-page water-${n}-page">
      <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #${n} • WATER TYPE • CONNECTED EVOLUTION</div><span class="bulba-hero-number">WORKOUT ${n}</span><h1>SO YOU'RE TRAINING<br/><span>${safe(m.name.toUpperCase())}?</span></h1><p>${safe(m.theme)}</p>
        <div class="bulba-hero-tags"><span>${safe(m.level)}</span><span>${m.duration}</span><span>${m.sets} working sets</span><span>${safe(m.title)}</span></div>
        <div class="bulba-hero-state">✓ Program approved <span>•</span> Two A/B script drafts <span>•</span> Filming pending</div>
        <div class="bulba-hero-buttons"><button type="button" class="btn btn-lime" data-action="water-jump" data-target="${ns}-program">Complete workout ↓</button><button type="button" class="btn btn-ghost" data-action="water-jump" data-target="${ns}-scripts">Compare scripts A / B ↗</button></div>
      </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon character art"/><div class="bulba-hero-art-label">WATER STARTER<br/><strong>#${n}</strong></div></div></section>
      <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>${safe(m.name)}'s seven-exercise workout is approved and published in Review.</strong> A/B voiceovers, actual filmed Camera Tests, and test results remain pending; this episode is not Final.</p></div>
      <section class="bulba-section" id="${ns}-moves"><div class="bulba-section-head"><span class="eyebrow dark">FOUR SIGNATURE MOVES</span><h2>${safe(m.name)}'s attacks become gym exercises</h2><p>Official move names and correct move-type emblems, with actual equipment and coaching instructions.</p></div>
        <div class="bulba-move-grid">${e.moves.map((x,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(x.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(x)}</div><h3>${safe(x.name)}</h3><strong>${safe(x.exercise)}</strong><p>${safe(x.notes)}</p><span class="bulba-move-dose">${safe(x.reps)}</span></article>`).join('')}</div>
      </section>
      ${starterEvolutionPanel(e.id)}
      <section class="bulba-section" id="${ns}-program"><div class="bulba-section-head"><span class="eyebrow dark">CREATOR-APPROVED • SEVEN EXERCISES</span><h2>Complete ${safe(m.title)} workout</h2><p>For real training, use this seven-exercise order rather than the four-move video order.</p></div>
        <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP • ${n==='007'?'7–8':n==='008'?'8–10':'9–12'} MIN</strong><p>${safe(e.workout.warmup)}</p></div>
          <div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="bulba-warmup"><strong>COOLDOWN • 3–5 MIN</strong><p>${safe(e.workout.cooldown)}</p></div></div>
          <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING IDENTITY</div><h3>${safe(m.title)}</h3><p>${safe(e.goalRationale)}</p></div><div class="bulba-why"><h3>Beginner / intermediate / advanced modifications</h3><p class="water-preformatted">${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Technique and safety</h3><p class="water-preformatted">${safe(e.workout.safety)}</p></div></aside></div>
      </section>
      <section class="bulba-section" id="${ns}-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO MATCHED 70-SECOND SCRIPTS</span><h2>${safe(m.name)} video A / B</h2><p>Gym comedy against game-specific comedy. Same exercise footage, music, cover, captions, onscreen prescriptions and CTA; spoken jokes and corresponding subtitles are the only differences.</p></div>
        ${tabs}
        <div class="bulba-ab-method"><h3>A/B test plan</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((x,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(x)}</p>`).join('')}</div></div>
      </section>
      <section class="bulba-section" id="${ns}-production"><div class="bulba-section-head"><span class="eyebrow dark">PRODUCTION • ALL CAMERA TESTS PENDING</span><h2>Film once, cut twice, compare each evolution</h2><p>Compare all four signature actions against the preceding stage without VFX before certifying camera legibility.</p></div>
        <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>20-shot filming checklist</h3><ol>${shots.map(x=>`<li>${safe(x.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Four Camera Tests <span class="bulba-pending">ALL PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
        <div class="bulba-post-grid venus-docs"><div><strong>Cover and caption</strong><p><strong>Cover:</strong> ${safe(e.content.cover)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p><p><strong>Five hashtags:</strong> ${safe(e.content.hashtags)}</p></div><div><strong>Production documents</strong><p>Creator-approved workout, matched draft scripts, filming checklist and connected trilogy standard.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Approved workout and safety','Script A • Gym comedy','Script B • Pokémon comedy','20-shot checklist and A/B test','Water evolution blueprint','Evolution continuity standard'][i]||'Production file'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Review, not Final. No actual filmed Camera Tests have passed.</p></div></div>
      </section>
    </div>`;
  }
  function openWaterStarterPreview(number){
    const n=String(number).padStart(3,'0');
    if(!['007','008','009'].includes(n))return;
    const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n&&x.publicWorkout);
    if(!e){selectRoute('pokedex');return;}
    const titles={'007':'Shell School','008':'Current Control','009':'Cannon Fortress'};
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim bulba-preview-scrim water-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal water-preview-modal" role="dialog" aria-modal="true" aria-labelledby="water-preview-title">
      <button class="modal-close" type="button" data-action="close-modal" aria-label="Close ${safe(e.name)} preview">×</button>
      <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(e.name)} artwork"/><span>WATER • #${n}</span></div>
      <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT ${n} • PROGRAM APPROVED</div><h2 id="water-preview-title">So You're Training ${safe(e.name)}?</h2><p>${safe(titles[n])} • ${safe(e.difficulty)} • ${n==='007'?'40–50':n==='008'?'50–60':'65–75'} min</p>
      <div class="bulba-preview-list">${e.moves.map(x=>`<div class="bulba-preview-move">${moveTypeEmblem(x)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(x.name)}</strong><span class="bulba-preview-type-name is-${safe(String(x.type||'').toLowerCase())}">${safe(x.type)}</span></div><small>${safe(x.exercise)} · ${safe(x.reps)}</small></div></div>`).join('')}</div>
      <p class="bulba-preview-status">Seven exercises approved; two A/B drafts and filming checklist ready. All Camera Tests pending.</p><button type="button" class="bulba-preview-button" data-action="water-full" data-species="${n}">View complete workout and A/B scripts →</button></div>
    </article></div>`;
    host.querySelector('.modal-close')?.focus();
  }


  const BUG_META = {"010":{"name":"Caterpie","title":"Silk School","route":"caterpie","duration":"40–50 min","level":"Beginner+","sets":"16 sets","line":"silk","stage":"LARVA","opponent":"Weedle","opponentN":"013","intro":"A gentle first-stage skill session: sled propulsion, forward silk projection, bear-hug bracing and battle-rope rhythm."},"011":{"name":"Metapod","title":"Shell Protocol","route":"metapod","duration":"35–45 min","level":"Recovery-strength","sets":"15 sets","line":"silk","stage":"COCOON","opponent":"Kakuna","opponentN":"014","intro":"The quieter middle evolution. Preserve Caterpie's skills through slow paused pressing, defensive bracing and controlled light loads."},"012":{"name":"Butterfree","title":"Wing Control","route":"butterfree","duration":"50–60 min","level":"Intermediate","sets":"18 training sets + 2 breathing rounds","line":"silk","stage":"FINAL FORM","opponent":"Beedrill","opponentN":"015","intro":"The silk line becomes a wing-control workout with rhythmic ropes, graceful lateral footwork, smooth cable sweeps and a recovery finish."},"013":{"name":"Weedle","title":"Sting School","route":"weedle","duration":"40–50 min","level":"Beginner+","sets":"16 sets","line":"sting","stage":"LARVA","opponent":"Caterpie","opponentN":"010","intro":"Caterpie's opposing beginner: forward strikes, coordinated silk pressing, a moving bear-hug clamp and controlled rope circles."},"014":{"name":"Kakuna","title":"Sting Guard","route":"kakuna","duration":"35–45 min","level":"Recovery-strength","sets":"15 sets","line":"sting","stage":"COCOON","opponent":"Metapod","opponentN":"011","intro":"Defensive cocoon bracing with frozen sting mechanics, paused web pressing and easy-to-moderate supporting strength."},"015":{"name":"Beedrill","title":"Double Sting","route":"beedrill","duration":"60–70 min","level":"Advanced","sets":"21 sets","line":"sting","stage":"FINAL FORM","opponent":"Butterfree","opponentN":"012","intro":"The physical foil to Butterfree: controlled double cable strikes, landmine attack power, rapid sled acceleration and strength."}};
  function bugRivalPanel(id){
 const n=String(id).slice(-3), meta=BUG_META[n];
 if(!meta)return '';
 const pairs=[["010","013"],["011","014"],["012","015"]];
 const stages=["LARVA • LEARN","COCOON • BRACE","FINAL • DIVERGE"];
 const nav=pairs.map((pair,i)=>`<div class="bug-rival-pair"><span class="bug-rival-level">${stages[i]}</span>${pair.map(number=>{const p=BUG_META[number];const active=number===n;return `<button type="button" class="bug-stage ${active?'active':''} bug-stage-${p.line}" data-action="bug-stage" data-target="${p.route}" ${active?'aria-current="page"':''}><small>#${number}</small><strong>${p.name}</strong><span>${p.title}</span></button>`;}).join('<span class="bug-versus">VS</span>')}</div>`).join('');
 const motifs=[
 ["Tackle — same move","Bulbasaur/Squirtle/Caterpie/Metapod all use a recognizable sled push or march. Caterpie pushes low; Metapod uses a paused, light push."],
 ["String Shot — one exercise family","Caterpie presses a band with one arm; Metapod pauses a single-arm cable press. Weedle presses a band with two arms; Kakuna pauses it."],
 ["Bug Bite — sandbag clamp","All four larvae/cocoons use the soft sandbag bear-hug family. Holds develop into carries or lengthened holds."],
 ["Harden / Electroweb — mirrored rivals","Both cocoons use forearm-plank bracing. Both larvae produce waves on battle ropes, with different patterns."],
 ["The final rivalry","Butterfree's Sleep Powder and Beedrill's Twineedle contrast careful control with striking, following the Viridian Forest anime story."]
 ];
 return `<section class="bulba-section bug-rival-section" aria-label="Silk versus Sting connected evolution rivalry">
  <div class="bulba-section-head"><span class="eyebrow dark">VIRIDIAN FOREST • SILK VS. STING</span><h2>Two linked evolutions. One rivalry.</h2><p>Choose the evolution above or its opposing partner. Each workout has its own seven-exercise program, while recurring moves preserve the same exercise family.</p></div>
  <div class="bug-rival-matrix">${nav}</div>
  <div class="bug-continuity-grid">${motifs.map(x=>`<article><strong>${safe(x[0])}</strong><p>${safe(x[1])}</p></article>`).join('')}</div>
  <p class="starter-chain-note">Training-family arrows are creative gym progressions, not Pokémon move evolution. Filmed Camera Tests and live A/B results remain pending.</p>
 </section>`;
}

  function bugWorkoutPage(number){
 const n=String(number).padStart(3,'0'),m=BUG_META[n];
 if(!m)return head('WORKOUT','Bug Rivalry','Unknown Pokémon.');
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n && x.publicWorkout);
 if(!e)return head('WORKOUT '+n,m.name,'Programming underway.');
 const prod=e.production||{},ns='bug-'+n,variants=prod.versions||[],shots=prod.shootList||[];
 const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
 const tabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="${m.name} A/B script comparison">${variants.map((v,i)=>`<button id="${ns}-tab-${safe(v.id)}" class="bulba-tab ${i===0?'selected':''}" type="button" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="${ns}-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" data-action="video-version" data-version="${safe(v.id)}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
 ${variants.map((v,i)=>`<div id="${ns}-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="${ns}-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}><div class="bulba-script-intro"><strong>${safe(v.label)} • ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>${(v.beats||[]).map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
 const usesBreathing=n==='012';
 return `<div class="bulba-page bug-page bug-${m.line}-page bug-${n}-page">
  <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #${n} • ${safe(e.types.join(' / ').toUpperCase())} • ${m.stage}</div><span class="bulba-hero-number">WORKOUT ${n}</span><h1>SO YOU'RE TRAINING<br/><span>${safe(m.name.toUpperCase())}?</span></h1><p>${safe(m.intro)}</p>
   <div class="bulba-hero-tags"><span>${safe(m.level)}</span><span>${m.duration}</span><span>${m.sets}</span><span>RIVAL: ${safe(m.opponent)}</span></div>
   <div class="bulba-hero-state">✓ Exercises + A/B scripts approved <span>•</span> Review <span>•</span> Filming pending</div>
   <div class="bulba-hero-buttons"><button type="button" class="btn btn-lime" data-action="bug-jump" data-target="${ns}-program">Complete workout ↓</button><button type="button" class="btn btn-ghost" data-action="bug-jump" data-target="${ns}-scripts">Compare A/B scripts ↗</button></div>
  </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><div class="bulba-hero-art-label">SILK VS. STING<br/><strong>#${n}</strong></div></div></section>
  <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>${safe(m.name)}'s complete workout and A/B scripts are creator-approved and published for Review.</strong> These are production scripts, not filmed videos. All four Camera Tests, A/B distribution and final editorial approval are pending.</p></div>
  <section class="bulba-section" id="${ns}-moves"><div class="bulba-section-head"><span class="eyebrow dark">FOUR OFFICIAL MOVES</span><h2>Four attacks. Four real gym interpretations.</h2><p>All recurring move names stay within the same recognizable exercise family as the other episodes.</p></div>
   <div class="bulba-move-grid">${e.moves.map((x,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(x.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(x)}</div><h3>${safe(x.name)}</h3><strong>${safe(x.exercise)}</strong><p>${safe(x.notes)}</p><span class="bulba-move-dose">${safe(x.reps)}</span></article>`).join('')}</div>
  </section>
  ${bugRivalPanel(e.id)}
  <section class="bulba-section" id="${ns}-program"><div class="bulba-section-head"><span class="eyebrow dark">APPROVED SEVEN-EXERCISE PROGRAM</span><h2>Complete ${safe(m.title)} workout</h2><p>${usesBreathing?'18 working/training sets plus two easy Sleep Powder breathing rounds; breathing is not strength work.':'All seven movements are arranged in the actual approved session order, not the script order.'}</p></div>
   <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP</strong><p class="bug-text-block">${safe(e.workout.warmup)}</p></div>
    <div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="bulba-warmup"><strong>COOLDOWN</strong><p class="bug-text-block">${safe(e.workout.cooldown)}</p></div></div>
    <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING GOAL</div><h3>${safe(m.title)}</h3><p>${safe(e.goal)}</p></div><div class="bulba-why"><h3>Regressions and progressions</h3><p class="bug-text-block">${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Equipment and safety</h3><p class="bug-text-block">${safe(e.workout.safety)}</p></div></aside></div>
  </section>
  <section class="bulba-section" id="${ns}-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO MATCHED 70-SECOND SCRIPT DRAFTS</span><h2>${safe(m.name)} — video A / B</h2><p>A = general gym comedy; B = Pokémon-specific jokes. Footage, 9:16 timing, fitness overlays, soundtrack, cover, caption and CTA are held identical. Only spoken dialogue and corresponding subtitles differ. Filming pending.</p></div>
    ${tabs}
    <div class="bulba-ab-method"><h3>Controlled A/B comparison</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
  </section>
  <section class="bulba-section" id="${ns}-production"><div class="bulba-section-head"><span class="eyebrow dark">PRE-FILMING • ALL CAMERA TESTS PENDING</span><h2>20 shots, four clean Camera Tests</h2><p>Capture exercise mechanics with no effects and compare the same named move across both bug families before adding silk, wing or sting VFX.</p></div>
    <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>20-shot checklist</h3><ol>${shots.map(x=>`<li>${safe(x.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Camera Tests <span class="bulba-pending">4 PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
    <div class="bulba-post-grid venus-docs"><div><strong>Posting assets</strong><p><strong>Cover:</strong> ${safe(e.content.cover)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p><p><strong>Five hashtags:</strong> ${safe(e.content.hashtags)}</p></div><div><strong>Approved production files</strong><p>Seven-exercise workout, full A/B scripts, 20-shot plan, cross-line continuity blueprint and same-name move audit.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Full approved workout','A/B Script A • gym comedy','A/B Script B • Pokémon humor','20-shot filming and Camera Tests','Six-Pokémon continuity blueprint','Same-name move approval audit'][i]||'Production file'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Review, not Final. No filmed Camera Tests completed.</p></div></div>
  </section>
 </div>`;
}

  function openBugPreview(number){
 const n=String(number).padStart(3,'0'),m=BUG_META[n];
 if(!m)return;
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n&&x.publicWorkout);
 if(!e){selectRoute('pokedex');return;}
 const host=document.getElementById('modalHost');
 host.innerHTML=`<div class="modal-scrim bulba-preview-scrim bug-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal bug-preview-modal bug-${m.line}-preview" role="dialog" aria-modal="true" aria-labelledby="bug-preview-title">
  <button class="modal-close" type="button" data-action="close-modal" aria-label="Close ${safe(m.name)} preview">×</button>
  <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><span>${safe(e.types.join(' / ').toUpperCase())} • #${n}</span></div>
  <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT ${n} • PROGRAM APPROVED</div><h2 id="bug-preview-title">So You're Training ${safe(m.name)}?</h2><p>${safe(m.title)} • ${safe(m.level)} • ${m.duration}</p>
   <div class="bulba-preview-list">${e.moves.map(x=>`<div class="bulba-preview-move">${moveTypeEmblem(x)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(x.name)}</strong><span class="bulba-preview-type-name is-${safe(String(x.type||'').toLowerCase())}">${safe(x.type)}</span></div><small>${safe(x.exercise)} · ${safe(x.reps)}</small></div></div>`).join('')}</div>
  <p class="bulba-preview-status">Both A/B script drafts approved for publication. ${safe(m.opponent)} is the opposing line; filmed Camera Tests pending.</p>
  <button type="button" class="bulba-preview-button" data-action="bug-full" data-species="${n}">View complete workout &amp; A/B scripts →</button></div>
 </article></div>`;
 host.querySelector('.modal-close')?.focus();
}


  const FLIGHT_META = {"016":{"name":"Pidgey","title":"Route One Flight School","route":"pidgey","level":"Beginner+","duration":"40–50 min","sets":"16 working sets","line":"beginner","stage":"LEARN TO TAKE OFF","opponent":"Pidgeotto","intro":"Controlled short acceleration, small wingbeats with ropes, the established Tackle sled push, and a light sand-sweeping band pattern."},"017":{"name":"Pidgeotto","title":"Territory Patrol","route":"pidgeotto","level":"Intermediate","duration":"50–60 min","sets":"16 training sets + 2 balance sets","line":"middle","stage":"PATROL AND CONTROL","opponent":"Pidgeot","intro":"The middle evolution introduces lateral navigation, larger rope circles, loaded wing sweeps and a balanced recovery perch."},"018":{"name":"Pidgeot","title":"Sky Sovereign","route":"pidgeot","level":"Advanced","duration":"65–75 min","sets":"22 working sets","line":"final","stage":"UNLEASH FLIGHT","opponent":"Pidgey","intro":"The final stage combines a powerful sled drive, resisted lateral footwork, storm-sized rope waves and Butterfree-matched Air Slash cable sweeps."}};
  
 function flightEvolutionPanel(id){
  const n=String(id).slice(-3);
  if(!FLIGHT_META[n])return '';
  const nums=['016','017','018'];
  const arcs=[
    ['Wind grows','Gust → Whirlwind → Hurricane','Anchored rope waves become outside circles and finally bigger power waves.'],
    ['Wing path','Sand Attack → Wing Attack → Air Slash','Light band sweep becomes a cable wing sweep; Pidgeot repeats Butterfree’s Air Slash exercise family.'],
    ['Footwork','Quick Attack → Agility → Tailwind','A short safe run develops into lateral direction control and then resisted lateral movement.'],
    ['Forward power','Tackle → supporting trap bar → Brave Bird','Pidgey’s Tackle remains a sled push, then Pidgeotto builds strength and Pidgeot increases loaded sled drive.']
  ];
  return `<section class="bulba-section flight-evolution-section" aria-label="Connected Pidgey, Pidgeotto and Pidgeot training progression"><div class="bulba-section-head"><span class="eyebrow dark">CONNECTED FLIGHT SCHOOL WORKOUTS</span><h2>Pidgey → Pidgeotto → Pidgeot</h2><p>Same flight skills, increasingly demanding training. These are creative exercise relationships, not claims that game moves evolve into different moves.</p></div>
  <div class="flight-evolution-stages">${nums.map((x,i)=>{const m=FLIGHT_META[x];return `<button class="flight-evolution-stage ${x===n?'active':''}" data-action="flight-stage" data-target="${m.route}" type="button" ${x===n?'aria-current="page"':''}><small>#${x}</small><strong>${safe(m.name)}</strong><span>${['LEARN','DEVELOP','UNLEASH'][i]}</span></button>`}).join('')}</div>
  <div class="flight-evolution-grid">${arcs.map(a=>`<article><span>${safe(a[0])}</span><strong>${safe(a[1])}</strong><p>${safe(a[2])}</p></article>`).join('')}</div>
  <p class="starter-chain-note">Same-name move consistency is mandatory: Pidgey Tackle matches Bulbasaur, Squirtle and Caterpie’s sled family; Pidgeot Air Slash matches Butterfree’s cable sweep. All filmed Camera Tests pending.</p></section>`;
 }

  function flightWorkoutPage(number){
 const n=String(number).padStart(3,'0'),m=FLIGHT_META[n];
 if(!m)return head('WORKOUT','Bug Rivalry','Unknown Pokémon.');
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n && x.publicWorkout);
 if(!e)return head('WORKOUT '+n,m.name,'Programming underway.');
 const prod=e.production||{},ns='flight-'+n,variants=prod.versions||[],shots=prod.shootList||[];
 const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
 const tabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="${m.name} A/B script comparison">${variants.map((v,i)=>`<button id="${ns}-tab-${safe(v.id)}" class="bulba-tab ${i===0?'selected':''}" type="button" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="${ns}-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" data-action="video-version" data-version="${safe(v.id)}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
 ${variants.map((v,i)=>`<div id="${ns}-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="${ns}-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}><div class="bulba-script-intro"><strong>${safe(v.label)} • ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>${(v.beats||[]).map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
 const usesBreathing=n==='012';
 return `<div class="bulba-page flight-page flight-${m.line}-page flight-${n}-page">
  <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #${n} • ${safe(e.types.join(' / ').toUpperCase())} • ${m.stage}</div><span class="bulba-hero-number">WORKOUT ${n}</span><h1>SO YOU'RE TRAINING<br/><span>${safe(m.name.toUpperCase())}?</span></h1><p>${safe(m.intro)}</p>
   <div class="bulba-hero-tags"><span>${safe(m.level)}</span><span>${m.duration}</span><span>${m.sets}</span><span>FLIGHT SCHOOL</span></div>
   <div class="bulba-hero-state">✓ Exercises + A/B scripts approved <span>•</span> Review <span>•</span> Filming pending</div>
   <div class="bulba-hero-buttons"><button type="button" class="btn btn-lime" data-action="flight-jump" data-target="${ns}-program">Complete workout ↓</button><button type="button" class="btn btn-ghost" data-action="flight-jump" data-target="${ns}-scripts">Compare A/B scripts ↗</button></div>
  </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><div class="bulba-hero-art-label">FLIGHT SCHOOL<br/><strong>#${n}</strong></div></div></section>
  <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>${safe(m.name)}'s complete workout and A/B scripts are creator-approved and published for Review.</strong> These are production scripts, not filmed videos. All four Camera Tests, A/B distribution and final editorial approval are pending.</p></div>
  <section class="bulba-section" id="${ns}-moves"><div class="bulba-section-head"><span class="eyebrow dark">FOUR OFFICIAL MOVES</span><h2>Four attacks. Four real gym interpretations.</h2><p>Repeated moves preserve the exercise silhouette established across all published workouts, including Tackle and Air Slash.</p></div>
   <div class="bulba-move-grid">${e.moves.map((x,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(x.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(x)}</div><h3>${safe(x.name)}</h3><strong>${safe(x.exercise)}</strong><p>${safe(x.notes)}</p><span class="bulba-move-dose">${safe(x.reps)}</span></article>`).join('')}</div>
  </section>
  ${flightEvolutionPanel(e.id)}
  <section class="bulba-section" id="${ns}-program"><div class="bulba-section-head"><span class="eyebrow dark">APPROVED SEVEN-EXERCISE PROGRAM</span><h2>Complete ${safe(m.title)} workout</h2><p>${usesBreathing?'18 working/training sets plus two easy Sleep Powder breathing rounds; breathing is not strength work.':'All seven movements are arranged in the actual approved session order, not the script order.'}</p></div>
   <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP</strong><p class="flight-text-block">${safe(e.workout.warmup)}</p></div>
    <div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="bulba-warmup"><strong>COOLDOWN</strong><p class="flight-text-block">${safe(e.workout.cooldown)}</p></div></div>
    <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING GOAL</div><h3>${safe(m.title)}</h3><p>${safe(e.goal)}</p></div><div class="bulba-why"><h3>Regressions and progressions</h3><p class="flight-text-block">${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Equipment and safety</h3><p class="flight-text-block">${safe(e.workout.safety)}</p></div></aside></div>
  </section>
  <section class="bulba-section" id="${ns}-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO MATCHED 70-SECOND SCRIPT DRAFTS</span><h2>${safe(m.name)} — video A / B</h2><p>A = general gym comedy; B = Pokémon-specific jokes. Footage, 9:16 timing, fitness overlays, soundtrack, cover, caption and CTA are held identical. Only spoken dialogue and corresponding subtitles differ. Filming pending.</p></div>
    ${tabs}
    <div class="bulba-ab-method"><h3>Controlled A/B comparison</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
  </section>
  <section class="bulba-section" id="${ns}-production"><div class="bulba-section-head"><span class="eyebrow dark">PRE-FILMING • ALL CAMERA TESTS PENDING</span><h2>20 shots, four clean Camera Tests</h2><p>Capture exercise mechanics with no effects and compare the same named move across all three flying evolutions before adding wind and wing VFX.</p></div>
    <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>20-shot checklist</h3><ol>${shots.map(x=>`<li>${safe(x.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Camera Tests <span class="bulba-pending">4 PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
    <div class="bulba-post-grid venus-docs"><div><strong>Posting assets</strong><p><strong>Cover:</strong> ${safe(e.content.cover)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p><p><strong>Five hashtags:</strong> ${safe(e.content.hashtags)}</p></div><div><strong>Approved production files</strong><p>Seven-exercise workout, full A/B scripts, 20-shot plan, cross-line continuity blueprint and same-name move audit.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Full approved workout','A/B Script A • gym comedy','A/B Script B • Pokémon humor','20-shot filming and Camera Tests','Six-Pokémon continuity blueprint','Same-name move approval audit'][i]||'Production file'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Review, not Final. No filmed Camera Tests completed.</p></div></div>
  </section>
 </div>`;
}
  function openFlightPreview(number){
 const n=String(number).padStart(3,'0'),m=FLIGHT_META[n];
 if(!m)return;
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n&&x.publicWorkout);
 if(!e){selectRoute('pokedex');return;}
 const host=document.getElementById('modalHost');
 host.innerHTML=`<div class="modal-scrim bulba-preview-scrim flight-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal flight-preview-modal flight-${m.line}-preview" role="dialog" aria-modal="true" aria-labelledby="flight-preview-title">
  <button class="modal-close" type="button" data-action="close-modal" aria-label="Close ${safe(m.name)} preview">×</button>
  <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><span>${safe(e.types.join(' / ').toUpperCase())} • #${n}</span></div>
  <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT ${n} • PROGRAM APPROVED</div><h2 id="flight-preview-title">So You're Training ${safe(m.name)}?</h2><p>${safe(m.title)} • ${safe(m.level)} • ${m.duration}</p>
   <div class="bulba-preview-list">${e.moves.map(x=>`<div class="bulba-preview-move">${moveTypeEmblem(x)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(x.name)}</strong><span class="bulba-preview-type-name is-${safe(String(x.type||'').toLowerCase())}">${safe(x.type)}</span></div><small>${safe(x.exercise)} · ${safe(x.reps)}</small></div></div>`).join('')}</div>
  <p class="bulba-preview-status">Both A/B script drafts approved for publication. ${safe(m.opponent)} is the next evolution-family stage; filmed Camera Tests pending.</p>
  <button type="button" class="bulba-preview-button" data-action="flight-full" data-species="${n}">View complete workout &amp; A/B scripts →</button></div>
 </article></div>`;
 host.querySelector('.modal-close')?.focus();
}

    const RODENT_META = {"019":{"name":"Rattata","title":"Route One Scavenger","route":"rattata","level":"Beginner+","duration":"40–50 min","sets":"16 working sets","line":"learn","stage":"LEARN • QUICK AND SCRAPPY","opponent":"Raticate","intro":"Quick feet, Tackle sled drive, a safe Bite grip clamp and light Tail Whip resistance-band sweeps."},"020":{"name":"Raticate","title":"Fang Force","route":"raticate","level":"Intermediate+","duration":"55–65 min","sets":"22 working sets","line":"develop","stage":"EVOLVE • STRONGER AND MORE FORCEFUL","opponent":"Rattata","intro":"The same sled and pinch-grip skills develop into heavier pushes and carries, a loaded tail sweep and reactive cable punch."}};

function rodentEvolutionPanel(id){
 const n=String(id).slice(-3);if(!RODENT_META[n])return '';
 const arcs=[
 ['The tackle returns','Tackle → heavier Tackle','Both use horizontal sled pushes, consistent with Bulbasaur, Squirtle, Caterpie and Pidgey.'],
 ['Grip turns into transport','Bite → Hyper Fang','Rubber-coated plate pinch hold becomes short plate pinch carry. No jaw exercises.'],
 ['Tail strength evolves','Tail Whip → Iron Tail','Light band hip-level sweep becomes controlled cable hip-level sweep, turning hips and feet together.'],
 ['Speed becomes reaction','Quick Attack → Sucker Punch','Short acceleration gives way to a controlled reactive cable punch. Two different official moves, not a literal evolution.']
 ];
 return `<section class="bulba-section rodent-evolution-section" aria-label="Rattata and Raticate connected workouts"><div class="bulba-section-head"><span class="eyebrow dark">CONNECTED ROUTE ONE RODENT WORKOUTS</span><h2>Rattata → Raticate</h2><p>Level 20 evolution; familiar movement paths become more demanding. Creative gym progressions, not canonical move evolutions.</p></div>
 <div class="rodent-evolution-stages">${['019','020'].map(x=>{const m=RODENT_META[x];return `<button type="button" class="rodent-evolution-stage ${x===n?'active':''}" data-action="rodent-stage" data-target="${m.route}" ${x===n?'aria-current="page"':''}><small>#${x}</small><strong>${safe(m.name)}</strong><span>${safe(m.title)}</span></button>`}).join('')}</div>
 <div class="rodent-evolution-grid">${arcs.map(a=>`<article><span>${safe(a[0])}</span><strong>${safe(a[1])}</strong><p>${safe(a[2])}</p></article>`).join('')}</div><p class="starter-chain-note">No collisions, biting, or impact stunts. Both A/B scripts are approved; filmed Camera Tests remain pending.</p></section>`;
}

function rodentWorkoutPage(number){
 const n=String(number).padStart(3,'0'),m=RODENT_META[n];
 if(!m)return head('WORKOUT','Bug Rivalry','Unknown Pokémon.');
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n && x.publicWorkout);
 if(!e)return head('WORKOUT '+n,m.name,'Programming underway.');
 const prod=e.production||{},ns='rodent-'+n,variants=prod.versions||[],shots=prod.shootList||[];
 const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
 const tabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="${m.name} A/B script comparison">${variants.map((v,i)=>`<button id="${ns}-tab-${safe(v.id)}" class="bulba-tab ${i===0?'selected':''}" type="button" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="${ns}-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" data-action="video-version" data-version="${safe(v.id)}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
 ${variants.map((v,i)=>`<div id="${ns}-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="${ns}-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}><div class="bulba-script-intro"><strong>${safe(v.label)} • ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>${(v.beats||[]).map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
 const usesBreathing=n==='012';
 return `<div class="bulba-page rodent-page rodent-${m.line}-page rodent-${n}-page">
  <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #${n} • ${safe(e.types.join(' / ').toUpperCase())} • ${m.stage}</div><span class="bulba-hero-number">WORKOUT ${n}</span><h1>SO YOU'RE TRAINING<br/><span>${safe(m.name.toUpperCase())}?</span></h1><p>${safe(m.intro)}</p>
   <div class="bulba-hero-tags"><span>${safe(m.level)}</span><span>${m.duration}</span><span>${m.sets}</span><span>ROUTE ONE RODENTS</span></div>
   <div class="bulba-hero-state">✓ Exercises + A/B scripts approved <span>•</span> Review <span>•</span> Filming pending</div>
   <div class="bulba-hero-buttons"><button type="button" class="btn btn-lime" data-action="rodent-jump" data-target="${ns}-program">Complete workout ↓</button><button type="button" class="btn btn-ghost" data-action="rodent-jump" data-target="${ns}-scripts">Compare A/B scripts ↗</button></div>
  </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><div class="bulba-hero-art-label">ROUTE ONE RODENTS<br/><strong>#${n}</strong></div></div></section>
  <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>${safe(m.name)}'s complete workout and A/B scripts are creator-approved and published for Review.</strong> These are production scripts, not filmed videos. All four Camera Tests, A/B distribution and final editorial approval are pending.</p></div>
  <section class="bulba-section" id="${ns}-moves"><div class="bulba-section-head"><span class="eyebrow dark">FOUR OFFICIAL MOVES</span><h2>Four attacks. Four real gym interpretations.</h2><p>Repeated moves keep their established exercise family: Tackle is a sled push and Quick Attack is a short acceleration.</p></div>
   <div class="bulba-move-grid">${e.moves.map((x,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(x.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(x)}</div><h3>${safe(x.name)}</h3><strong>${safe(x.exercise)}</strong><p>${safe(x.notes)}</p><span class="bulba-move-dose">${safe(x.reps)}</span></article>`).join('')}</div>
  </section>
  ${rodentEvolutionPanel(e.id)}
  <section class="bulba-section" id="${ns}-program"><div class="bulba-section-head"><span class="eyebrow dark">APPROVED SEVEN-EXERCISE PROGRAM</span><h2>Complete ${safe(m.title)} workout</h2><p>${usesBreathing?'18 working/training sets plus two easy Sleep Powder breathing rounds; breathing is not strength work.':'All seven movements are arranged in the actual approved session order, not the script order.'}</p></div>
   <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP</strong><p class="rodent-text-block">${safe(e.workout.warmup)}</p></div>
    <div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="bulba-warmup"><strong>COOLDOWN</strong><p class="rodent-text-block">${safe(e.workout.cooldown)}</p></div></div>
    <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING GOAL</div><h3>${safe(m.title)}</h3><p>${safe(e.goal)}</p></div><div class="bulba-why"><h3>Regressions and progressions</h3><p class="rodent-text-block">${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Equipment and safety</h3><p class="rodent-text-block">${safe(e.workout.safety)}</p></div></aside></div>
  </section>
  <section class="bulba-section" id="${ns}-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO MATCHED 70-SECOND SCRIPT DRAFTS</span><h2>${safe(m.name)} — video A / B</h2><p>A = general gym comedy; B = Pokémon-specific jokes. Footage, 9:16 timing, fitness overlays, soundtrack, cover, caption and CTA are held identical. Only spoken dialogue and corresponding subtitles differ. Filming pending.</p></div>
    ${tabs}
    <div class="bulba-ab-method"><h3>Controlled A/B comparison</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
  </section>
  <section class="bulba-section" id="${ns}-production"><div class="bulba-section-head"><span class="eyebrow dark">PRE-FILMING • ALL CAMERA TESTS PENDING</span><h2>20 shots, four clean Camera Tests</h2><p>Capture exercise mechanics with no effects and compare the same named move across both rat evolutions before adding tail and fang effects.</p></div>
    <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>20-shot checklist</h3><ol>${shots.map(x=>`<li>${safe(x.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Camera Tests <span class="bulba-pending">4 PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
    <div class="bulba-post-grid venus-docs"><div><strong>Posting assets</strong><p><strong>Cover:</strong> ${safe(e.content.cover)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p><p><strong>Five hashtags:</strong> ${safe(e.content.hashtags)}</p></div><div><strong>Approved production files</strong><p>Seven-exercise workout, full A/B scripts, 20-shot plan, cross-line continuity blueprint and same-name move audit.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Full approved workout','A/B Script A • gym comedy','A/B Script B • Pokémon humor','20-shot filming and Camera Tests','Six-Pokémon continuity blueprint','Same-name move approval audit'][i]||'Production file'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Review, not Final. No filmed Camera Tests completed.</p></div></div>
  </section>
 </div>`;
}
  function openRodentPreview(number){
 const n=String(number).padStart(3,'0'),m=RODENT_META[n];
 if(!m)return;
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n&&x.publicWorkout);
 if(!e){selectRoute('pokedex');return;}
 const host=document.getElementById('modalHost');
 host.innerHTML=`<div class="modal-scrim bulba-preview-scrim rodent-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal rodent-preview-modal rodent-${m.line}-preview" role="dialog" aria-modal="true" aria-labelledby="rodent-preview-title">
  <button class="modal-close" type="button" data-action="close-modal" aria-label="Close ${safe(m.name)} preview">×</button>
  <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><span>${safe(e.types.join(' / ').toUpperCase())} • #${n}</span></div>
  <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT ${n} • PROGRAM APPROVED</div><h2 id="rodent-preview-title">So You're Training ${safe(m.name)}?</h2><p>${safe(m.title)} • ${safe(m.level)} • ${m.duration}</p>
   <div class="bulba-preview-list">${e.moves.map(x=>`<div class="bulba-preview-move">${moveTypeEmblem(x)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(x.name)}</strong><span class="bulba-preview-type-name is-${safe(String(x.type||'').toLowerCase())}">${safe(x.type)}</span></div><small>${safe(x.exercise)} · ${safe(x.reps)}</small></div></div>`).join('')}</div>
  <p class="bulba-preview-status">Both A/B script drafts approved for publication. ${safe(m.opponent)} is the paired evolution stage; filmed Camera Tests pending.</p>
  <button type="button" class="bulba-preview-button" data-action="rodent-full" data-species="${n}">View complete workout &amp; A/B scripts →</button></div>
 </article></div>`;
 host.querySelector('.modal-close')?.focus();
}

    const SPEAROW_META = {"021":{"name":"Spearow","title":"Flock Fighter","route":"spearow","level":"Beginner+","duration":"40–50 min","sets":"16 sets","line":"scrapper","stage":"EARLY ROUTE FIGHTER","opponent":"Fearow","intro":"An aggressive little bird learns quick Pursuit reactions, Peck presses, controlled Fury Attack cable rhythm and precise Aerial Ace wing sweeps."},"022":{"name":"Fearow","title":"Aerial Enforcer","route":"fearow","level":"Intermediate–Advanced","duration":"60–70 min","sets":"21 sets","line":"hunter","stage":"EVOLVED AERIAL HUNTER","opponent":"Spearow","intro":"Spearow evolves at level 20 into a powerful hunter: landmine Drill Peck, rotational Drill Run, Pidgeotto-matched Agility and the same controlled Aerial Ace cable sweep."}};

 function spearowEvolutionPanel(id){
 const n=String(id).slice(-3);if(!SPEAROW_META[n])return '';
 const arcs=[
 ['Beak pressure','Peck → Drill Peck','Spearow band forward press becomes Fearow split-stance landmine press. Related forward single-arm pressing without impact.'],
 ['Shared Aerial Ace','Cable wing sweep → stepped cable wing sweep','Identical named move, cable height and high-to-low sweep pattern; Fearow adds a small coordinated step.'],
 ['Reaction and agility','Pursuit → Agility','Cue-triggered acceleration develops into shuffle-to-acceleration footwork; Fearow matches Pidgeotto Agility.'],
 ['New evolved power','Fury Attack → Drill Run','Spearow builds lightweight strike rhythm; Fearow introduces rotational med-ball power. Different moves, not a literal move evolution.']
 ];
 return `<section class="bulba-section spearow-evolution-section" aria-label="Connected Spearow Fearow rival bird workouts"><div class="bulba-section-head"><span class="eyebrow dark">EARLY-ROUTE AERIAL RIVALRY</span><h2>Spearow → Fearow</h2><p>Territory defense evolves into disciplined aerial power. The original anime rivalry ties Fearow to Pidgeot.</p></div>
 <div class="spearow-evolution-stages">${['021','022'].map(x=>{const m=SPEAROW_META[x];return `<button type="button" class="spearow-evolution-stage ${x===n?'active':''}" data-action="spearow-stage" data-target="${m.route}" ${x===n?'aria-current="page"':''}><small>#${x}</small><strong>${safe(m.name)}</strong><span>${safe(m.title)}</span></button>`}).join('')}</div>
 <div class="spearow-rival-links"><span>Also explore the rival flight line:</span><button type="button" data-action="spearow-rival" data-target="pidgey">#016 Pidgey</button><button type="button" data-action="spearow-rival" data-target="pidgeotto">#017 Pidgeotto</button><button type="button" data-action="spearow-rival" data-target="pidgeot">#018 Pidgeot</button></div>
 <div class="spearow-evolution-grid">${arcs.map(a=>`<article><span>${safe(a[0])}</span><strong>${safe(a[1])}</strong><p>${safe(a[2])}</p></article>`).join('')}</div><p class="starter-chain-note">Same-name move continuity is mandatory, and all filmed Camera Tests are pending. No physical bird attacks or contact stunts.</p></section>`;
 }

function spearowWorkoutPage(number){
 const n=String(number).padStart(3,'0'),m=SPEAROW_META[n];
 if(!m)return head('WORKOUT','Bug Rivalry','Unknown Pokémon.');
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n && x.publicWorkout);
 if(!e)return head('WORKOUT '+n,m.name,'Programming underway.');
 const prod=e.production||{},ns='spearow-'+n,variants=prod.versions||[],shots=prod.shootList||[];
 const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
 const tabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="${m.name} A/B script comparison">${variants.map((v,i)=>`<button id="${ns}-tab-${safe(v.id)}" class="bulba-tab ${i===0?'selected':''}" type="button" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="${ns}-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" data-action="video-version" data-version="${safe(v.id)}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
 ${variants.map((v,i)=>`<div id="${ns}-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="${ns}-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}><div class="bulba-script-intro"><strong>${safe(v.label)} • ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>${(v.beats||[]).map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
 const usesBreathing=n==='012';
 return `<div class="bulba-page spearow-page spearow-${m.line}-page spearow-${n}-page">
  <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #${n} • ${safe(e.types.join(' / ').toUpperCase())} • ${m.stage}</div><span class="bulba-hero-number">WORKOUT ${n}</span><h1>SO YOU'RE TRAINING<br/><span>${safe(m.name.toUpperCase())}?</span></h1><p>${safe(m.intro)}</p>
   <div class="bulba-hero-tags"><span>${safe(m.level)}</span><span>${m.duration}</span><span>${m.sets}</span><span>EARLY ROUTE AERIAL RIVALS</span></div>
   <div class="bulba-hero-state">✓ Exercises + A/B scripts approved <span>•</span> Review <span>•</span> Filming pending</div>
   <div class="bulba-hero-buttons"><button type="button" class="btn btn-lime" data-action="spearow-jump" data-target="${ns}-program">Complete workout ↓</button><button type="button" class="btn btn-ghost" data-action="spearow-jump" data-target="${ns}-scripts">Compare A/B scripts ↗</button></div>
  </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><div class="bulba-hero-art-label">EARLY ROUTE AERIAL RIVALS<br/><strong>#${n}</strong></div></div></section>
  <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>${safe(m.name)}'s complete workout and A/B scripts are creator-approved and published for Review.</strong> These are production scripts, not filmed videos. All four Camera Tests, A/B distribution and final editorial approval are pending.</p></div>
  <section class="bulba-section" id="${ns}-moves"><div class="bulba-section-head"><span class="eyebrow dark">FOUR OFFICIAL MOVES</span><h2>Four attacks. Four real gym interpretations.</h2><p>Repeated moves keep their established exercise family: Tackle is a sled push and Quick Attack is a short acceleration.</p></div>
   <div class="bulba-move-grid">${e.moves.map((x,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(x.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(x)}</div><h3>${safe(x.name)}</h3><strong>${safe(x.exercise)}</strong><p>${safe(x.notes)}</p><span class="bulba-move-dose">${safe(x.reps)}</span></article>`).join('')}</div>
  </section>
  ${spearowEvolutionPanel(e.id)}
  <section class="bulba-section" id="${ns}-program"><div class="bulba-section-head"><span class="eyebrow dark">APPROVED SEVEN-EXERCISE PROGRAM</span><h2>Complete ${safe(m.title)} workout</h2><p>${usesBreathing?'18 working/training sets plus two easy Sleep Powder breathing rounds; breathing is not strength work.':'All seven movements are arranged in the actual approved session order, not the script order.'}</p></div>
   <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP</strong><p class="spearow-text-block">${safe(e.workout.warmup)}</p></div>
    <div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="bulba-warmup"><strong>COOLDOWN</strong><p class="spearow-text-block">${safe(e.workout.cooldown)}</p></div></div>
    <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING GOAL</div><h3>${safe(m.title)}</h3><p>${safe(e.goal)}</p></div><div class="bulba-why"><h3>Regressions and progressions</h3><p class="spearow-text-block">${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Equipment and safety</h3><p class="spearow-text-block">${safe(e.workout.safety)}</p></div></aside></div>
  </section>
  <section class="bulba-section" id="${ns}-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO MATCHED 70-SECOND SCRIPT DRAFTS</span><h2>${safe(m.name)} — video A / B</h2><p>A = general gym comedy; B = Pokémon-specific jokes. Footage, 9:16 timing, fitness overlays, soundtrack, cover, caption and CTA are held identical. Only spoken dialogue and corresponding subtitles differ. Filming pending.</p></div>
    ${tabs}
    <div class="bulba-ab-method"><h3>Controlled A/B comparison</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
  </section>
  <section class="bulba-section" id="${ns}-production"><div class="bulba-section-head"><span class="eyebrow dark">PRE-FILMING • ALL CAMERA TESTS PENDING</span><h2>20 shots, four clean Camera Tests</h2><p>Capture exercise mechanics with no effects and compare the same named move across both rat evolutions before adding noncontact wing and beak trails.</p></div>
    <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>20-shot checklist</h3><ol>${shots.map(x=>`<li>${safe(x.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Camera Tests <span class="bulba-pending">4 PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
    <div class="bulba-post-grid venus-docs"><div><strong>Posting assets</strong><p><strong>Cover:</strong> ${safe(e.content.cover)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p><p><strong>Five hashtags:</strong> ${safe(e.content.hashtags)}</p></div><div><strong>Approved production files</strong><p>Seven-exercise workout, full A/B scripts, 20-shot plan, cross-line continuity blueprint and same-name move audit.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Full approved workout','A/B Script A • gym comedy','A/B Script B • Pokémon humor','20-shot filming and Camera Tests','Six-Pokémon continuity blueprint','Same-name move approval audit'][i]||'Production file'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Review, not Final. No filmed Camera Tests completed.</p></div></div>
  </section>
 </div>`;
}
  function openSpearowPreview(number){
 const n=String(number).padStart(3,'0'),m=SPEAROW_META[n];
 if(!m)return;
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n&&x.publicWorkout);
 if(!e){selectRoute('pokedex');return;}
 const host=document.getElementById('modalHost');
 host.innerHTML=`<div class="modal-scrim bulba-preview-scrim spearow-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal spearow-preview-modal spearow-${m.line}-preview" role="dialog" aria-modal="true" aria-labelledby="spearow-preview-title">
  <button class="modal-close" type="button" data-action="close-modal" aria-label="Close ${safe(m.name)} preview">×</button>
  <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><span>${safe(e.types.join(' / ').toUpperCase())} • #${n}</span></div>
  <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT ${n} • PROGRAM APPROVED</div><h2 id="spearow-preview-title">So You're Training ${safe(m.name)}?</h2><p>${safe(m.title)} • ${safe(m.level)} • ${m.duration}</p>
   <div class="bulba-preview-list">${e.moves.map(x=>`<div class="bulba-preview-move">${moveTypeEmblem(x)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(x.name)}</strong><span class="bulba-preview-type-name is-${safe(String(x.type||'').toLowerCase())}">${safe(x.type)}</span></div><small>${safe(x.exercise)} · ${safe(x.reps)}</small></div></div>`).join('')}</div>
  <p class="bulba-preview-status">Both A/B script drafts approved for publication. ${safe(m.opponent)} is the other stage in the Spearow line; filmed Camera Tests pending.</p>
  <button type="button" class="bulba-preview-button" data-action="spearow-full" data-species="${n}">View complete workout &amp; A/B scripts →</button></div>
 </article></div>`;
 host.querySelector('.modal-close')?.focus();
}

  
  const SNAKE_META = {"023":{"name":"Ekans","title":"Coil Foundations","route":"ekans","level":"Beginner+","duration":"40–50 min","sets":"16 working sets","line":"foundation","stage":"SNAKE • FOUNDATION","opponent":"Arbok","intro":"A precise early-stage Poison workout: band rotation, light Poison Sting punches, a safe Bite pinch grip and a still Pallof Glare."},"024":{"name":"Arbok","title":"Cobra Command","route":"arbok","level":"Intermediate+","duration":"55–65 min","sets":"21 working sets","line":"cobra","stage":"COBRA • EVOLVED","opponent":"Ekans","intro":"The evolved cobra builds rotational strength with landmine arcs, plate grip carries, med-ball poison projection and controlled Pallof step-outs."}};
  
function snakeEvolutionPanel(id){
 const n=String(id).slice(-3);if(!SNAKE_META[n])return '';
 const arcs=[["Coil control","Wrap → Coil","Ekans rotates a light anchored band; Arbok performs controlled landmine 180s. Same hip-and-foot pivot, progressed load."],["Poison projection","Poison Sting → Gunk Shot","Ekans's single-arm band punch becomes a two-hand medicine-ball chest pass to a gym-approved wall. No real poison."],["Jaw/grip strength","Bite → Crunch","A rubber-coated plate pinch hold becomes the same pinch technique performed as a short carry."],["The famous stare","Glare → Glare","Both use Pallof anti-rotation presses; tall-kneeling control becomes a standing Pallof step-out. Identical named move, recognizable exercise."]];
 return `<section class="bulba-section snake-evolution-section" aria-label="Ekans and Arbok connected evolution progression"><div class="bulba-section-head"><span class="eyebrow dark">CONNECTED POISON EVOLUTION FAMILY</span><h2>Ekans → Arbok</h2><p>Level 22 evolution. Four gym skills develop across both workouts. The move-name arrows are creative exercise progressions, not claims of canonical attack evolution.</p></div>
 <div class="snake-evolution-stages">${['023','024'].map(x=>{const m=SNAKE_META[x];return `<button type="button" class="snake-evolution-stage ${x===n?'active':''}" data-action="snake-stage" data-target="${m.route}" ${x===n?'aria-current="page"':''}><small>#${x}</small><strong>${safe(m.name)}</strong><span>${safe(m.title)}</span></button>`}).join('')}</div>
 <div class="snake-evolution-grid">${arcs.map(a=>`<article><span>${safe(a[0])}</span><strong>${safe(a[1])}</strong><p>${safe(a[2])}</p></article>`).join('')}</div>
 <p class="starter-chain-note">Same-name move rule: Ekans Poison Sting matches Weedle’s band-punch family, Ekans Bite matches Rattata’s plate pinch, and Glare uses the Pallof press family in both snakes. All filmed Camera Tests pending.</p></section>`;
}
  function snakeWorkoutPage(number){
 const n=String(number).padStart(3,'0'),m=SNAKE_META[n];
 if(!m)return head('WORKOUT','Bug Rivalry','Unknown Pokémon.');
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n && x.publicWorkout);
 if(!e)return head('WORKOUT '+n,m.name,'Programming underway.');
 const prod=e.production||{},ns='snake-'+n,variants=prod.versions||[],shots=prod.shootList||[];
 const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.alias||x.name)}</strong>${x.alias?`<span class="bulba-exercise-sub">${safe(x.name)}</span>`:''}</td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
 const tabs=variants.length===2?`<div class="bulba-tabs" role="tablist" aria-label="${m.name} A/B script comparison">${variants.map((v,i)=>`<button id="${ns}-tab-${safe(v.id)}" class="bulba-tab ${i===0?'selected':''}" type="button" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="${ns}-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" data-action="video-version" data-version="${safe(v.id)}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>
 ${variants.map((v,i)=>`<div id="${ns}-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="${ns}-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}><div class="bulba-script-intro"><strong>${safe(v.label)} • ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>${(v.beats||[]).map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('')}`:'';
 const usesBreathing=n==='012';
 return `<div class="bulba-page snake-page snake-${m.line}-page snake-${n}-page">
  <section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #${n} • ${safe(e.types.join(' / ').toUpperCase())} • ${m.stage}</div><span class="bulba-hero-number">WORKOUT ${n}</span><h1>SO YOU'RE TRAINING<br/><span>${safe(m.name.toUpperCase())}?</span></h1><p>${safe(m.intro)}</p>
   <div class="bulba-hero-tags"><span>${safe(m.level)}</span><span>${m.duration}</span><span>${m.sets}</span><span>POISON SNAKE EVOLUTION</span></div>
   <div class="bulba-hero-state">✓ Exercises + A/B scripts approved <span>•</span> Review <span>•</span> Filming pending</div>
   <div class="bulba-hero-buttons"><button type="button" class="btn btn-lime" data-action="snake-jump" data-target="${ns}-program">Complete workout ↓</button><button type="button" class="btn btn-ghost" data-action="snake-jump" data-target="${ns}-scripts">Compare A/B scripts ↗</button></div>
  </div><div class="bulba-hero-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><div class="bulba-hero-art-label">POISON SNAKE EVOLUTION<br/><strong>#${n}</strong></div></div></section>
  <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>${safe(m.name)}'s complete workout and A/B scripts are creator-approved and published for Review.</strong> These are production scripts, not filmed videos. All four Camera Tests, A/B distribution and final editorial approval are pending.</p></div>
  <section class="bulba-section" id="${ns}-moves"><div class="bulba-section-head"><span class="eyebrow dark">FOUR OFFICIAL MOVES</span><h2>Four attacks. Four real gym interpretations.</h2><p>Ekans Poison Sting matches Weedle’s band-punch family; Ekans Bite matches Rattata’s plate grip. Glare stays a Pallof press in both snake stages.</p></div>
   <div class="bulba-move-grid">${e.moves.map((x,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(x.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(x)}</div><h3>${safe(x.name)}</h3><strong>${safe(x.exercise)}</strong><p>${safe(x.notes)}</p><span class="bulba-move-dose">${safe(x.reps)}</span></article>`).join('')}</div>
  </section>
  ${snakeEvolutionPanel(e.id)}
  <section class="bulba-section" id="${ns}-program"><div class="bulba-section-head"><span class="eyebrow dark">APPROVED SEVEN-EXERCISE PROGRAM</span><h2>Complete ${safe(m.title)} workout</h2><p>${usesBreathing?'18 working/training sets plus two easy Sleep Powder breathing rounds; breathing is not strength work.':'All seven movements are arranged in the actual approved session order, not the script order.'}</p></div>
   <div class="bulba-program-layout"><div class="bulba-program-main"><div class="bulba-warmup"><strong>WARM-UP</strong><p class="snake-text-block">${safe(e.workout.warmup)}</p></div>
    <div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Work</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="bulba-warmup"><strong>COOLDOWN</strong><p class="snake-text-block">${safe(e.workout.cooldown)}</p></div></div>
    <aside class="bulba-program-side"><div class="bulba-why"><div class="eyebrow dark">TRAINING GOAL</div><h3>${safe(m.title)}</h3><p>${safe(e.goal)}</p></div><div class="bulba-why"><h3>Regressions and progressions</h3><p class="snake-text-block">${safe(e.workout.modifications)}</p></div><div class="bulba-why"><h3>Equipment and safety</h3><p class="snake-text-block">${safe(e.workout.safety)}</p></div></aside></div>
  </section>
  <section class="bulba-section" id="${ns}-scripts"><div class="bulba-section-head"><span class="eyebrow dark">TWO MATCHED 70-SECOND SCRIPT DRAFTS</span><h2>${safe(m.name)} — video A / B</h2><p>A = general gym comedy; B = Pokémon-specific jokes. Footage, 9:16 timing, fitness overlays, soundtrack, cover, caption and CTA are held identical. Only spoken dialogue and corresponding subtitles differ. Filming pending.</p></div>
    ${tabs}
    <div class="bulba-ab-method"><h3>Controlled A/B comparison</h3><div class="bulba-method-grid">${(prod.testPlan||[]).map((t,i)=>`<p><span>${String(i+1).padStart(2,'0')}</span>${safe(t)}</p>`).join('')}</div></div>
  </section>
  <section class="bulba-section" id="${ns}-production"><div class="bulba-section-head"><span class="eyebrow dark">PRE-FILMING • ALL CAMERA TESTS PENDING</span><h2>20 shots, four clean Camera Tests</h2><p>Capture exercise mechanics with no effects and compare the same named move across both snake evolutions before adding digital poison or hood effects.</p></div>
    <div class="bulba-shoot-grid venus-shoot"><div class="bulba-shoot-list"><h3>20-shot checklist</h3><ol>${shots.map(x=>`<li>${safe(x.shot)}</li>`).join('')}</ol></div><div class="bulba-camera-tests"><h3>Camera Tests <span class="bulba-pending">4 PENDING</span></h3>${(prod.cameraTests||[]).map(t=>`<div class="bulba-camera-test"><strong>${safe(t.move)}</strong><p>${safe(t.test)}</p><small>${safe(t.status)}</small></div>`).join('')}</div></div>
    <div class="bulba-post-grid venus-docs"><div><strong>Posting assets</strong><p><strong>Cover:</strong> ${safe(e.content.cover)}</p><p><strong>Caption:</strong> ${safe(e.content.caption)}</p><p><strong>Five hashtags:</strong> ${safe(e.content.hashtags)}</p></div><div><strong>Approved production files</strong><p>Seven-exercise workout, full A/B scripts, 20-shot plan, cross-line continuity blueprint and same-name move audit.</p><div class="bulba-doc-links">${(prod.assets||[]).map((path,i)=>`<a href="${safe(path)}" target="_blank" rel="noopener">${['Full approved workout','A/B Script A • gym comedy','A/B Script B • Pokémon humor','20-shot filming and Camera Tests','Six-Pokémon continuity blueprint','Same-name move approval audit'][i]||'Production file'} ↗</a>`).join('')}</div><p class="bulba-draft-note">Review, not Final. No filmed Camera Tests completed.</p></div></div>
  </section>
 </div>`;
}
  
  function openSnakePreview(number){
 const n=String(number).padStart(3,'0'),m=SNAKE_META[n];
 if(!m)return;
 const e=(window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n&&x.publicWorkout);
 if(!e){selectRoute('pokedex');return;}
 const host=document.getElementById('modalHost');
 host.innerHTML=`<div class="modal-scrim bulba-preview-scrim snake-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal snake-preview-modal snake-${m.line}-preview" role="dialog" aria-modal="true" aria-labelledby="snake-preview-title">
  <button class="modal-close" type="button" data-action="close-modal" aria-label="Close ${safe(m.name)} preview">×</button>
  <div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(m.name)} Pokémon artwork"/><span>${safe(e.types.join(' / ').toUpperCase())} • #${n}</span></div>
  <div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT ${n} • PROGRAM APPROVED</div><h2 id="snake-preview-title">So You're Training ${safe(m.name)}?</h2><p>${safe(m.title)} • ${safe(m.level)} • ${m.duration}</p>
   <div class="bulba-preview-list">${e.moves.map(x=>`<div class="bulba-preview-move">${moveTypeEmblem(x)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(x.name)}</strong><span class="bulba-preview-type-name is-${safe(String(x.type||'').toLowerCase())}">${safe(x.type)}</span></div><small>${safe(x.exercise)} · ${safe(x.reps)}</small></div></div>`).join('')}</div>
  <p class="bulba-preview-status">Both A/B script drafts approved for publication. ${safe(m.opponent)} is the other stage in the Spearow line; filmed Camera Tests pending.</p>
  <button type="button" class="bulba-preview-button" data-action="snake-full" data-species="${n}">View complete workout &amp; A/B scripts →</button></div>
 </article></div>`;
 host.querySelector('.modal-close')?.focus();
}

  


  // Shared dedicated pages and Pokédex previews for the Electric and Ground pairs (#025–#028).
  const NEXT_FOUR = {'025':'pikachu','026':'raichu','027':'sandshrew','028':'sandslash'};
  const workoutRoute = n => NEXT_FOUR[n] || 'workout-'+n;
  function nextFourEntry(n){
    return (window.WORKOUT_DEX_SEED?.entries||[]).find(x=>x.id==='kanto-'+n && x.publicWorkout);
  }
  function nextFourPage(n){
    const e=nextFourEntry(n);
    if(!e)return head('WORKOUT '+n,'Programming underway','No published workout available.');
    const p=e.production||{}, ns='new-'+n;
    const partner={'025':'026','026':'025','027':'028','028':'027','056':'057','057':'056','058':'059','059':'058','060':'061','061':'062','062':'061','063':'064','064':'065','065':'064'}[n];
    const peer=nextFourEntry(partner);
    const artUrl='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/'+Number(n)+'.png';
    const rows=e.exercises.map((x,i)=>`<tr><td><span class="bulba-row-no">${String(i+1).padStart(2,'0')}</span></td><td><strong>${safe(x.name)}</strong></td><td>${safe(x.sets)} × ${safe(x.reps)}</td><td>${safe(x.rest)}</td></tr>`).join('');
    const variants=p.versions||[];
    const scripts=variants.map((v,i)=>`<div id="${ns}-panel-${safe(v.id)}" role="tabpanel" aria-labelledby="${ns}-tab-${safe(v.id)}" class="bulba-script-panel" ${i?'hidden':''}><div class="bulba-script-intro"><strong>${safe(v.label)} • ${safe(v.subtitle)}</strong><span>${safe(v.status)}</span></div>${(v.beats||[]).map(b=>`<div class="bulba-beat"><div class="bulba-beat-time">${safe(b.time)}</div><div class="bulba-beat-body"><strong>${safe(b.audio)}</strong><p>${safe(b.visual)}</p><small>ON SCREEN: ${safe(b.onScreen)}</small></div></div>`).join('')}</div>`).join('');
    return `<div class="bulba-page ${workoutColorClass(e)}"><section class="bulba-hero"><div class="bulba-hero-copy"><div class="eyebrow">POKÉDEX #${n} • ${safe(e.types.join(' / ').toUpperCase())}</div><span class="bulba-hero-number">WORKOUT ${n}</span><h1>SO YOU'RE TRAINING<br/><span>${safe(e.name.toUpperCase())}?</span></h1><p>${safe(e.goalRationale)}</p><div class="bulba-hero-tags"><span>${safe(e.difficulty)}</span><span>${safe(e.durationMinutes)} min</span><span>${e.exercises.reduce((total,x)=>total+Number(x.sets||0),0)} working sets</span></div><div class="bulba-hero-state">✓ Approved exercises <span>•</span> Review <span>•</span> Filming pending</div><div class="bulba-hero-buttons"><button type="button" class="btn btn-lime" data-action="next-four-jump" data-target="${ns}-program">Complete workout ↓</button><button type="button" class="btn btn-ghost" data-action="next-four-jump" data-target="${ns}-scripts">A/B scripts ↗</button></div></div><div class="bulba-hero-art"><img src="${artUrl}" alt="${safe(e.name)} Pokémon artwork" loading="eager"/><div class="bulba-hero-art-label">${safe(e.types.join(' / ').toUpperCase())}<br/><strong>#${n}</strong></div></div></section>
    <div class="bulba-progress-note"><span class="bulba-status-dot"></span><p><strong>${safe(p.subtitle||e.name)}</strong> • Full program and both production drafts are published for Review. Filming, camera verification, and final writing checks remain pending.</p></div>
    <section class="bulba-section"><div class="bulba-section-head"><span class="eyebrow dark">FOUR OFFICIAL MOVES</span><h2>Pokémon moves, real exercises.</h2><p>${safe(e.goal)}</p></div><div class="bulba-move-grid">${e.moves.map((m,i)=>`<article class="bulba-move-card"><div class="bulba-move-number">0${i+1} • ${safe(m.type)}</div><div class="bulba-move-icon type-emblem-holder">${moveTypeEmblem(m)}</div><h3>${safe(m.name)}</h3><strong>${safe(m.exercise)}</strong><p>${safe(m.notes)}</p><span class="bulba-move-dose">${safe(m.reps)}</span></article>`).join('')}</div></section>
    ${peer?`<section class="bulba-section"><div class="bulba-section-head"><span class="eyebrow dark">EVOLUTION PAIR</span><h2>${safe(e.name)} &amp; ${safe(peer.name)}</h2><p>Two distinct, connected workouts.</p></div><button class="btn btn-dark" type="button" data-action="next-four-route" data-target="${workoutRoute(partner)}">View ${safe(peer.name)}'s workout →</button></section>`:''}
    <section class="bulba-section" id="${ns}-program"><div class="bulba-section-head"><span class="eyebrow dark">COMPLETE WORKOUT</span><h2>${safe(e.name)}'s ${safe(p.subtitle||'full-body program')}</h2></div><div class="detail-block"><h3>Warm-up</h3><p>${safe(e.workout.warmup)}</p></div><div class="bulba-table-wrap"><table class="bulba-workout-table"><thead><tr><th>#</th><th>Exercise</th><th>Sets × reps</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table></div><div class="detail-block"><h3>Cooldown</h3><p>${safe(e.workout.cooldown)}</p><h3>Beginner, intermediate &amp; advanced modifications</h3><p>${safe(e.workout.modifications)}</p><h3>Safety notes</h3><p>${safe(e.workout.safety)}</p></div></section>
    <section class="bulba-section" id="${ns}-scripts"><div class="bulba-section-head"><span class="eyebrow dark">REEL / TIKTOK PRODUCTION</span><h2>Two versions, one workout.</h2><p>${safe(p.twoVersionPolicy||'Film same exercises for both edits.')}</p></div><div class="bulba-tabs" role="tablist" aria-label="${safe(e.name)} A/B scripts">${variants.map((v,i)=>`<button id="${ns}-tab-${safe(v.id)}" class="bulba-tab ${i===0?'selected':''}" type="button" role="tab" aria-selected="${i===0?'true':'false'}" aria-controls="${ns}-panel-${safe(v.id)}" tabindex="${i===0?'0':'-1'}" data-action="video-version" data-version="${safe(v.id)}" data-ns="${ns}">${safe(v.label)} <span>${safe(v.subtitle)}</span></button>`).join('')}</div>${scripts}</section>
    <section class="bulba-section"><div class="bulba-section-head"><span class="eyebrow dark">PRODUCTION CHECKLIST</span><h2>Shots &amp; Camera Tests</h2></div><div class="detail-block"><h3>20-shot filming checklist</h3><ol>${(p.shootList||[]).map(sh=>`<li>${safe(sh.shot)}</li>`).join('')}</ol><h3>Four signature Camera Tests</h3><ul>${(p.cameraTests||[]).map(t=>`<li><strong>${safe(t.move)}</strong>: ${safe(t.test)} (${safe(t.status)})</li>`).join('')}</ul><h3>A/B test plan</h3><ul>${(p.testPlan||[]).map(v=>`<li>${safe(v)}</li>`).join('')}</ul></div></section>
    <section class="bulba-section"><div class="bulba-section-head"><span class="eyebrow dark">SOCIAL MEDIA</span><h2>Caption &amp; cover</h2></div><div class="detail-block"><h3>Caption</h3><p>${safe(e.content.caption)}</p><h3>Cover concept</h3><p>${safe(e.content.cover)}</p><h3>CTA</h3><p>${safe(e.content.callToAction)}</p><p>${safe(e.content.hashtags)}</p></div></section></div>`;
  }
    // Type-aware presentation for all generic published Pokémon previews and pages.
  function workoutColorClass(e){
    const types=e.types||[];
    if(types.includes('Poison') && types.includes('Ground')) return 'workout-theme-poison-ground';
    const primary=String(types[0]||'Normal').toLowerCase().replace(/[^a-z-]/g,'');
    return 'workout-theme-'+primary;
  }
  function nextFourPreview(n){
    const e=nextFourEntry(n);if(!e)return;
    const host=document.getElementById('modalHost');
    host.innerHTML=`<div class="modal-scrim bulba-preview-scrim" data-action="close-scrim"><article class="modal bulba-preview-modal ${workoutColorClass(e)}" role="dialog" aria-modal="true" aria-labelledby="next-four-preview-title"><button class="modal-close" type="button" data-action="close-modal" aria-label="Close preview">×</button><div class="bulba-preview-art"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${Number(n)}.png" alt="${safe(e.name)} Pokémon artwork"/><span>${safe(e.types.join(' / ').toUpperCase())} • #${n}</span></div><div class="bulba-preview-info"><div class="eyebrow dark">WORKOUT ${n} • EXERCISES APPROVED</div><h2 id="next-four-preview-title">So You're Training ${safe(e.name)}?</h2><p>${safe(e.production?.subtitle||e.goal)}</p><div class="bulba-preview-list">${e.moves.map(m=>`<div class="bulba-preview-move">${moveTypeEmblem(m)}<div class="bulba-preview-move-copy"><div class="bulba-preview-move-heading"><strong>${safe(m.name)}</strong><span class="bulba-preview-type-name is-${safe(String(m.type||'').toLowerCase())}">${safe(m.type)}</span></div><small>${safe(m.exercise)} · ${safe(m.reps)}</small></div></div>`).join('')}</div><p class="bulba-preview-status">Published for Review. Complete workout and A/B scripts available; filmed Camera Tests pending.</p><button type="button" class="bulba-preview-button" data-action="next-four-full" data-species="${n}">View complete workout &amp; A/B scripts →</button></div></article></div>`;
    host.querySelector('.modal-close')?.focus();
  }

function render(){
    const views={overview:dashboard,pokedex:()=>browse('pokedex'),characters:()=>browse('characters'),forms:()=>browse('forms'),moves:registry,studio,guide,oak:oakPage,bulbasaur:bulbasaurPage,ivysaur:ivysaurPage,venusaur:venusaurPage,charmander:charmanderPage,charmeleon:charmeleonPage,charizard:charizardPage,squirtle:()=>waterWorkoutPage('007'),wartortle:()=>waterWorkoutPage('008'),blastoise:()=>waterWorkoutPage('009'),caterpie:()=>bugWorkoutPage('010'),metapod:()=>bugWorkoutPage('011'),butterfree:()=>bugWorkoutPage('012'),weedle:()=>bugWorkoutPage('013'),kakuna:()=>bugWorkoutPage('014'),beedrill:()=>bugWorkoutPage('015'),pidgey:()=>flightWorkoutPage('016'),pidgeotto:()=>flightWorkoutPage('017'),pidgeot:()=>flightWorkoutPage('018'),rattata:()=>rodentWorkoutPage('019'),raticate:()=>rodentWorkoutPage('020'),spearow:()=>spearowWorkoutPage('021'),fearow:()=>spearowWorkoutPage('022'),ekans:()=>snakeWorkoutPage('023'),arbok:()=>snakeWorkoutPage('024'),pikachu:()=>nextFourPage('025'),raichu:()=>nextFourPage('026'),sandshrew:()=>nextFourPage('027'),sandslash:()=>nextFourPage('028')};
    const autoNumber=/^workout-(\d{3})$/.exec(route)?.[1];
    if(autoNumber && nextFourEntry(autoNumber))views[route]=()=>nextFourPage(autoNumber);
    if(!views[route]) route='overview';
    root.innerHTML=views[route]();
    document.getElementById('breadcrumb').textContent=({overview:'DASHBOARD',pokedex:'KANTO POKÉDEX',characters:'CHARACTERS',forms:'FORM REGISTRY',moves:'MOVE REGISTRY',studio:'WORKOUT STUDIO',guide:'PROJECT GUIDE',oak:'PROFESSOR OAK / #000',bulbasaur:'BULBASAUR / #001',ivysaur:'IVYSAUR / #002',venusaur:'VENUSAUR / #003',charmander:'CHARMANDER / #004',charmeleon:'CHARMELEON / #005',charizard:'CHARIZARD / #006',squirtle:'SQUIRTLE / #007',wartortle:'WARTORTLE / #008',blastoise:'BLASTOISE / #009',caterpie:'CATERPIE / #010',metapod:'METAPOD / #011',butterfree:'BUTTERFREE / #012',weedle:'WEEDLE / #013',kakuna:'KAKUNA / #014',beedrill:'BEEDRILL / #015',pidgey:'PIDGEY / #016',pidgeotto:'PIDGEOTTO / #017',pidgeot:'PIDGEOT / #018',rattata:'RATTATA / #019',raticate:'RATICATE / #020',spearow:'SPEAROW / #021',fearow:'FEAROW / #022',ekans:'EKANS / #023',arbok:'ARBOK / #024',pikachu:'PIKACHU / #025',raichu:'RAICHU / #026',sandshrew:'SANDSHREW / #027',sandslash:'SANDSLASH / #028'})[route];
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
    if(id==='kanto-006' && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openCharizardPreview();return;}
    if(['kanto-007','kanto-008','kanto-009'].includes(id) && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openWaterStarterPreview(id.slice(-3));return;}
    if(['kanto-010','kanto-011','kanto-012','kanto-013','kanto-014','kanto-015'].includes(id) && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openBugPreview(id.slice(-3));return;}
    if(['kanto-016','kanto-017','kanto-018'].includes(id) && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openFlightPreview(id.slice(-3));return;}
    if(['kanto-019','kanto-020'].includes(id) && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openRodentPreview(id.slice(-3));return;}
    if(['kanto-021','kanto-022'].includes(id) && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openSpearowPreview(id.slice(-3));return;}
    if(['kanto-023','kanto-024'].includes(id) && (window.WORKOUT_DEX_SEED?.entries||[]).some(x=>x.id===id&&x.publicWorkout)){openSnakePreview(id.slice(-3));return;}
    if(['kanto-025','kanto-026','kanto-027','kanto-028'].includes(id) && nextFourEntry(id.slice(-3))){nextFourPreview(id.slice(-3));return;}
    if(/^kanto-\d{3}$/.test(id) && nextFourEntry(id.slice(-3))){nextFourPreview(id.slice(-3));return;}
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
    case 'pikachu':case 'raichu':case 'sandshrew':case 'sandslash':selectRoute(action);break;
    case 'pokedex':case 'studio':case 'overview':case 'characters':case 'forms':case 'moves':case 'guide':selectRoute(action);break;
    case 'starter-stage':{const target=el.dataset.target;if(STARTER_FAMILIES.some(f=>f.routes.includes(target)))selectRoute(target);break;}
    case 'squirtle':case 'wartortle':case 'blastoise':selectRoute(action);break;
    case 'water-full':{const target={'007':'squirtle','008':'wartortle','009':'blastoise'}[el.dataset.species];if(target){closeModal();selectRoute(target);}break;}
    case 'water-jump':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'caterpie':case 'metapod':case 'butterfree':case 'weedle':case 'kakuna':case 'beedrill':selectRoute(action);break;
    case 'bug-full':{const target=BUG_META[String(el.dataset.species||'')]?.route;if(target){closeModal();selectRoute(target);}break;}
    case 'bug-stage':{const target=el.dataset.target;if(Object.values(BUG_META).some(x=>x.route===target))selectRoute(target);break;}
    case 'bug-jump':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'pidgey':case 'pidgeotto':case 'pidgeot':selectRoute(action);break;
    case 'flight-full':{const target=FLIGHT_META[String(el.dataset.species||'')]?.route;if(target){closeModal();selectRoute(target);}break;}
    case 'flight-stage':{const target=el.dataset.target;if(Object.values(FLIGHT_META).some(x=>x.route===target))selectRoute(target);break;}
    case 'flight-jump':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'rattata':case 'raticate':selectRoute(action);break;
    case 'rodent-full':{const target=RODENT_META[el.dataset.species]?.route;if(target){closeModal();selectRoute(target);}break;}
    case 'rodent-stage':{const target=el.dataset.target;if(Object.values(RODENT_META).some(x=>x.route===target))selectRoute(target);break;}
    case 'rodent-jump':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'spearow':case 'fearow':selectRoute(action);break;
    case 'spearow-full':{const target=SPEAROW_META[el.dataset.species]?.route;if(target){closeModal();selectRoute(target);}break;}
    case 'spearow-stage':{const target=el.dataset.target;if(Object.values(SPEAROW_META).some(x=>x.route===target))selectRoute(target);break;}
    case 'spearow-rival':{const target=el.dataset.target;if(['pidgey','pidgeotto','pidgeot'].includes(target))selectRoute(target);break;}
    case 'spearow-jump':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'ekans':case 'arbok':selectRoute(action);break;
    case 'next-four-full':{const target=workoutRoute(el.dataset.species);if(target){closeModal();selectRoute(target);}break;}
    case 'next-four-route':{const target=el.dataset.target;if(Object.values(NEXT_FOUR).includes(target)||/^workout-\d{3}$/.test(target))selectRoute(target);break;}
    case 'next-four-jump':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'snake-full':{const target=SNAKE_META[el.dataset.species]?.route;if(target){closeModal();selectRoute(target);}break;}
    case 'snake-stage':{const target=el.dataset.target;if(Object.values(SNAKE_META).some(x=>x.route===target))selectRoute(target);break;}
    case 'snake-jump':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'oak':selectRoute('oak');break;
    case 'bulbasaur':selectRoute('bulbasaur');break;
    case 'ivysaur':selectRoute('ivysaur');break;
    case 'venusaur':selectRoute('venusaur');break;
    case 'charmander':selectRoute('charmander');break;
    case 'charmeleon':selectRoute('charmeleon');break;
     case 'charizard':selectRoute('charizard');break;
     case 'charizard-preview':openCharizardPreview();break;
     case 'charizard-full':closeModal();selectRoute('charizard');requestAnimationFrame(()=>document.getElementById('zard-program')?.scrollIntoView({behavior:'instant',block:'start'}));break;
     case 'jump-charizard':document.getElementById(el.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});break;
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
    case 'video-version':{const ns=el.dataset.ns || (route==='ivysaur'?'ivy':route==='charmander'?'char':route==='charmeleon'?'meleon':route==='charizard'?'zard':route==='squirtle'?'water-007':route==='wartortle'?'water-008':route==='blastoise'?'water-009':BUG_META[({caterpie:'010',metapod:'011',butterfree:'012',weedle:'013',kakuna:'014',beedrill:'015'})[route]]?'bug-'+({caterpie:'010',metapod:'011',butterfree:'012',weedle:'013',kakuna:'014',beedrill:'015'})[route]:FLIGHT_META[({pidgey:'016',pidgeotto:'017',pidgeot:'018'})[route]]?'flight-'+({pidgey:'016',pidgeotto:'017',pidgeot:'018'})[route]:RODENT_META[({rattata:'019',raticate:'020'})[route]]?'rodent-'+({rattata:'019',raticate:'020'})[route]:SPEAROW_META[({spearow:'021',fearow:'022'})[route]]?'spearow-'+({spearow:'021',fearow:'022'})[route]:SNAKE_META[({ekans:'023',arbok:'024'})[route]]?'snake-'+({ekans:'023',arbok:'024'})[route]:'bulba');const tab=document.getElementById(ns+'-tab-'+el.dataset.version);if(!tab)break;document.querySelectorAll('#'+ns+'-scripts [role="tab"]').forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;t.classList.toggle('selected',selected);});document.querySelectorAll('#'+ns+'-scripts [role="tabpanel"]').forEach(p=>p.hidden=p.id!==ns+'-panel-'+el.dataset.version);tab.focus();break;}
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