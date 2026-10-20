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
      if(cached?.schemaVersion===1 && Array.isArray(cached.entries)) return cached;
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
  const artHtml = e => art(e) ? `<img loading="lazy" src="${art(e)}" alt="${safe(e.kind==='form'?`${entryBy(e.baseId)?.name||'Base'} base artwork`:`${e.name} artwork`)}" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<span class=character-letter>✧</span>')">` : `<span class="character-letter">${e.id==='oak-000'?'✦':safe(e.name[0])}</span>`;
  const stat = (label,num,desc,icon,special=false) => `<div class="stat-card${special?' special':''}"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-number">${fmtCount(num)}</div><div class="stat-small">${desc}</div></div>`;
  const head = (eyebrow,title,desc,actions='') => `<div class="section-intro"><div><div class="eyebrow dark">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${actions}</div>`;
  const btn = (text,action,cls='btn-dark',attr='') => `<button type="button" class="btn ${cls}" data-action="${action}" ${attr}>${text}</button>`;
  const count = (f) => entries().filter(f).length;
  const card = e => `<button class="dex-card" type="button" data-action="detail" data-id="${safe(e.id)}" aria-label="Open ${safe(e.name)}"><div class="card-top"><span>${shortId(e)}</span><span>${statusChip(e.status)}</span></div><div class="dex-image ${e.kind==='form'?'form-image':''}">${artHtml(e)}${e.kind==='form'?'<span class="image-hint">BASE ART</span>':''}</div><h3 title="${safe(e.name)}">${safe(e.name)}</h3><div class="card-tags">${typeChips(e)}</div><div class="card-bottom"><span>${e.kind==='form'?safe(e.formGroup||'Form'):e.kind==='character'?safe(e.chapter):safe(e.difficulty)}</span><span class="tiny-pill ${e.status==='Final'?'is-final':''}">${e.status==='Final'?'✓ COMPLETE': 'NOT FINAL'}</span></div></button>`;
  function dashboard(){
    const species=count(e=>e.kind==='pokemon'), characters=count(e=>e.kind==='character'), forms=count(e=>e.kind==='form'), finalized=count(e=>e.status==='Final'), baseFinal=count(e=>e.kind==='pokemon'&&e.status==='Final');
    const sections=['Prologue','Original 151','Trainers','Gym Leaders','Elite Four','Forms'];
    return `<section class="hero"><div class="hero-content"><div class="eyebrow light">◉ WELCOME TO THE JOURNEY</div><h1>Gotta train<br/><span>'em all.</span></h1><p>A living Pokédex built on Pokémon lore, real exercise science, and 151 very good reasons to hit the gym.</p><div class="hero-buttons">${btn('Explore Kanto →','pokedex','btn-lime')}${btn('Open Workout Studio ↗','studio','btn-ghost')}</div></div><div class="hero-graphic" aria-hidden="true"></div><span class="hero-dex" aria-hidden="true">#001</span></section>
    <section class="stats-grid" aria-label="Project stats">${stat('ORIGINAL KANTO',species,'Base Pokémon entries','◈')}${stat('CHARACTER WORKOUTS',characters,'Professor, trainers and leaders','♙')}${stat('FORM VARIANTS',forms,'Separate workouts to explore','✦')}${stat('FINALIZED WORKOUTS',finalized,'Approved and ready to publish','✓',true)}</section>
    <div class="section-heading"><div><h2>The journey so far</h2><p>Track the road from Professor Oak to the Elite Four.</p></div></div>
    <section class="two-cols"><div class="panel panel-pad"><div class="panel-top"><h3>Region completion</h3><small>${baseFinal} / ${species} KANTO</small></div><div class="progress-track"><div class="progress-fill" style="width:${species?100*baseFinal/species:0}%"></div></div><div class="progress-meta"><span>Original 151 completed</span><span>${species?Math.round(baseFinal/species*100):0}%</span></div><div style="margin-top:16px">${sections.map((s,i)=>{let all=count(e=>e.chapter===s),fin=count(e=>e.chapter===s&&e.status==='Final');return `<div class="chapter-row"><div class="chapter-dot">${String(i).padStart(2,'0')}</div><div class="chapter-info"><strong>${s}</strong><small>${s==='Prologue'?'Where the adventure starts':s==='Forms'?'Regional, Mega, Gigantamax and more':'Workout collection'}</small></div><div class="chapter-score">${fin} / ${all}</div></div>`}).join('')}</div></div>
    <div class="vertical-gap"><div class="spotlight"><div><div class="eyebrow dark">EPISODE 000 • THE PROLOGUE</div><h3>Professor Oak</h3><p>Every great training adventure starts with a first step.</p>${btn('View the first entry →','oak','btn-dark')}</div><div class="oak-portrait" aria-label="Abstract professor illustration">✦</div></div><div class="notice"><span class="mini-poke">!</span><div><strong>No workout is marked complete until approved.</strong><br/>Entries are placeholders, not published programs. Your Studio performs a finalization check against Series Standards v1.1.</div></div></div></section>
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
  function exercisesEditor(){return `<section class="studio-section"><div class="panel-heading"><div><h3>${isPokemon(draft)?'03':'02'} / Exercise choices</h3><p>Supporting movements in addition to the four signature exercises, with usable sets, reps, and rest.</p></div><button class="btn btn-soft" type="button" data-action="add-exercise">+ Exercise</button></div>${draft.exercises.length?draft.exercises.map((e,i)=>`<div class="exercise-row"><div class="exercise-head"><strong>EXERCISE ${i+1}</strong><button class="text-button danger" data-action="remove-exercise" data-index="${i}">Remove ×</button></div><div class="form-grid three">${field('Real exercise name',`exercises.${i}.name`,e.name,'input','Goblet squat')}${field('Pokémon-inspired alias (optional)',`exercises.${i}.alias`,e.alias,'input','Training name')}${field('Equipment',`exercises.${i}.equipment`,e.equipment,'input','Dumbbell')}${field('Sets',`exercises.${i}.sets`,e.sets,'input','3')}${field('Reps / time',`exercises.${i}.reps`,e.reps,'input','8–12')}${field('Rest',`exercises.${i}.rest`,e.rest,'input','60 seconds')}<div class="wide">${field('Coaching cues',`exercises.${i}.notes`,e.notes,'textarea','Why this exercise belongs here')}</div></div></div>`).join(''):'<div class="empty" style="margin-top:15px"><h3>No supporting exercises yet</h3><p>Add any additional work beyond your signature four.</p></div>'}</section>`;}
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
      ['02','Build a complete episode','Log the workout identity, equipment, warm-up, actual exercises, sets, reps, rest, modifications, lore research, social content and audit.'],
      ['03','Pass the final audit','Pokémon must have four distinct verified official moves, each mapped to an exercise that passes the Pokémon, Trainer and Camera tests. No duplicate four-move combinations.'],
      ['04','Finalize and save','Select “Finalize workout” to validate. The workout immediately changes to Final in your browser and shows up in the Dex and the move registry.'],
      ['05','Export the master data','Use “Export JSON” for backups. Use “Publish data.js” and overwrite the website’s data.js file with the downloaded version. Keep data/workouts.json updated too.'],
      ['06','Publish to the web','Upload the whole site to a static hosting service or push its files to a GitHub Pages repository. Each later file update triggers a fresh public deployment.']
    ];
    return `${head('THE SYSTEM / HOW TO USE IT','Your road map','A living database, a creator studio, and an approval system based on Series Standards v1.1.')}
      <div class="callout" style="margin-bottom:20px"><strong>Important distinction: browser updates vs. public website updates.</strong> Editing and finalizing work immediately in this browser and persist after refresh. A live public site cannot sync those private changes until you publish the exported data files. This starter has no cloud database or authentication.</div>
      <div class="guide-grid">${steps.map(([num,title,body])=>`<div class="guide-card"><div class="guide-number">${num}</div><h3>${title}</h3><p>${body}</p></div>`).join('')}</div>
      <div class="section-heading"><div><h2>Publishing & backup checklist</h2><p>Use this exact flow whenever a workout is finalized.</p></div></div>
      <div class="panel panel-pad"><div class="vertical-gap"><p><strong>Local master:</strong> ${fmtCount(entries().length)} current entries stored in your browser when you save, with Final, Review, Draft and other stages.</p><p><strong>Backup:</strong> Download a JSON export after meaningful edits. You can import a backup later from the Studio.</p><p><strong>Public data:</strong> Download a new <code>data.js</code> from Studio and replace the same file in your published site. Only Final workouts include content; incomplete entries are blank shells. Final workout notes are removed.</p><p><strong>GitHub Pages:</strong> Push updated <code>data.js</code> to the <code>main</code> branch. Keep your private full JSON backup off public GitHub. The included GitHub Actions workflow deploys the website automatically. Initial Pages setup must use GitHub Actions as its source.</p><p><strong>Going multi-device:</strong> A real shared cloud database with authentication can be connected later. The provided site does not claim to silently synchronize devices or publish changes without a deployment.</p><p><strong>Sprites:</strong> Official-style Pokémon artwork is loaded from the open PokéAPI sprites repository when connected to the internet. Form cards deliberately show faded base-species art to avoid misidentifying a form.</p></div></div>
      <div style="margin-top:18px" class="studio-toolbar">${btn('Go to Workout Studio →','studio','btn-dark')}${btn('Download full backup ↓','export-json','btn-outline')}</div>`;
  }
  function render(){
    const views={overview:dashboard,pokedex:()=>browse('pokedex'),characters:()=>browse('characters'),forms:()=>browse('forms'),moves:registry,studio,guide};
    if(!views[route]) route='overview';
    root.innerHTML=views[route]();
    document.getElementById('breadcrumb').textContent=({overview:'DASHBOARD',pokedex:'KANTO POKÉDEX',characters:'CHARACTERS',forms:'FORM REGISTRY',moves:'MOVE REGISTRY',studio:'WORKOUT STUDIO',guide:'PROJECT GUIDE'})[route];
    document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===route);if(a.dataset.nav===route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.querySelector('.sidebar').classList.remove('open');
  }
  function openDetail(id){
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
      if(e.status==='Final')return {...e,notes:''};
      const clean=newRecord(e.id,e.name,e.kind,e.chapter,e.dexNumber,e.types||[],e.baseId,e.form,e.formGroup);
      clean.role=e.role||clean.role;
      return clean;
    });
    return snapshot;
  }
  function exportJs(){
    downloadFile('window.WORKOUT_DEX_SEED = '+JSON.stringify(publicDatabase())+';\n','data.js','text/javascript');
    toast('Public data.js exported (only final workouts). Replace site data.js and redeploy.');
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
    case 'oak':openDetail('oak-000');break;
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
