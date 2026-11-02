(() => {
  const data = window.CONNECTIONS_SITE_DATA;
  if (!data) return;

  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];
  const escapeHTML = (value='') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const initials = name => name.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase();
  const franchiseColor = name => {
    const known = {
      'Tamagotchi':'#ffce5c','Digimon':'#ef78ba','Pokémon':'#4db5ff','Yu-Gi-Oh!':'#8a7dff',
      'Dragon Quest':'#61e4c5','Sanrio':'#ff8fbf','Disney':'#7bc8ff','Final Fantasy':'#b8a6ff'
    };
    if (known[name]) return known[name];
    let h=0; for (const c of name) h=(h*31+c.charCodeAt(0))%360;
    return `hsl(${h} 65% 60%)`;
  };

  const heroStats = $('#heroStats');
  const stats = [
    [data.stats.topicCount, 'canonical families'],
    [data.stats.characterEntryCount, 'character entries'],
    [data.stats.reelIdeaCount, 'reel concepts'],
    [data.stats.topFranchises.length + '+', 'major franchises']
  ];
  heroStats.innerHTML = stats.map(([n,l]) => `<div class="stat"><strong>${escapeHTML(n)}</strong><span>${escapeHTML(l)}</span></div>`).join('');

  const toneMap = {
    confirmed:['#61e4c5','#8ff2d8'], possible:['#ffce5c','#ffe08b'], source:['#4db5ff','#8fd7ff'],
    myth:['#ef78ba','#ffa8d1'], internal:['#8a7dff','#b8aeff']
  };
  const visualForTopic = id => data.visuals?.find(v => v.topicId === id);
  const visualMarkup = (v, className='visual-image') => v ? `<div class="${className}-wrap"><img class="${className}" src="${escapeHTML(v.image)}" alt="${escapeHTML(v.alt)}" loading="lazy" decoding="async"><div class="visual-caption"><span>${escapeHTML(v.kicker)}</span><strong>${escapeHTML(v.label)}</strong></div></div>` : '';
  $('#visualAtlas').innerHTML = (data.visuals || []).map(v => `<article class="atlas-card" data-topic-id="${escapeHTML(v.topicId)}">
      <img src="${escapeHTML(v.image)}" alt="${escapeHTML(v.alt)}" loading="lazy" decoding="async">
      <div class="atlas-overlay"><span>${escapeHTML(v.kicker)}</span><h3>${escapeHTML(v.label)}</h3><p>${escapeHTML(v.note)}</p><small>Open connection ↗</small></div>
    </article>`).join('');

  $('#imageCredits').innerHTML = (data.visuals || []).map(v => `<p><a href="${escapeHTML(v.source)}" target="_blank" rel="noreferrer">${escapeHTML(v.label)} ↗</a> · ${escapeHTML(v.credit)} · ${escapeHTML(v.license)}</p>`).join('');

  $('#featuredGrid').innerHTML = data.featured.map((f,i) => {
    const [accent, accentText] = toneMap[f.tone] || toneMap.source;
    const visual = visualForTopic(f.topicId);
    return `<article class="feature-card ${visual?'has-photo':''}" data-topic-id="${escapeHTML(f.topicId)}" style="--accent:${accent}55;--accentText:${accentText}">
      ${visual ? visualMarkup(visual, 'feature-photo') : ''}
      <div class="feature-eyebrow">${escapeHTML(f.eyebrow)}</div>
      <h3>${escapeHTML(f.headline)}</h3>
      <p>${escapeHTML(f.summary)}</p>
      <div class="feature-chips">${f.franchises.slice(0,5).map(x=>`<span class="chip">${escapeHTML(x)}</span>`).join('')}</div>
      <span class="feature-arrow">↗</span>
    </article>`;
  }).join('');

  const state = {q:'', franchise:'All', kind:'All', visible:24};
  const priorityFranchises = ['All','Tamagotchi','Digimon','Pokémon','Yu-Gi-Oh!','Dragon Quest','Sanrio','Disney','Final Fantasy'];
  const franchiseList = priorityFranchises.filter(x => x==='All' || data.filters.franchises.includes(x));
  const kindList = ['All', ...data.filters.kinds];
  const renderFilterRow = (target, items, key) => {
    target.innerHTML = items.map(item => `<button class="filter-chip ${state[key]===item?'active':''}" data-filter-key="${key}" data-filter-value="${escapeHTML(item)}">${escapeHTML(item)}</button>`).join('');
  };
  renderFilterRow($('#franchiseFilters'), franchiseList, 'franchise');
  renderFilterRow($('#kindFilters'), kindList, 'kind');

  const matches = topic => {
    const q = state.q.trim().toLowerCase();
    const hay = [topic.id,topic.title,topic.basis,topic.scope,topic.kind,topic.category,topic.summary,topic.rationale,...topic.characters,...topic.franchises].filter(Boolean).join(' ').toLowerCase();
    return (!q || hay.includes(q)) &&
      (state.franchise==='All' || topic.franchises.includes(state.franchise)) &&
      (state.kind==='All' || topic.kind===state.kind);
  };

  const cardHTML = topic => {
    const visual = visualForTopic(topic.id);
    return `<article class="connection-card ${visual?'has-thumb':''}" data-topic-id="${escapeHTML(topic.id)}">
    ${visual ? `<div class="connection-thumb"><img src="${escapeHTML(visual.image)}" alt="" loading="lazy" decoding="async"></div>` : ''}
    <div class="connection-top"><span class="topic-id">${escapeHTML(topic.id)}</span><span class="topic-kind">${escapeHTML(topic.kind)}</span></div>
    <h3>${escapeHTML(topic.title)}</h3>
    <div class="basis">Shared basis · ${escapeHTML(topic.basis)}</div>
    <div class="character-list">${escapeHTML(topic.characters.slice(0,6).join(' · '))}${topic.characters.length>6?' · +'+(topic.characters.length-6)+' more':''}</div>
    <div class="connection-bottom">
      <div class="franchise-dots">${topic.franchises.slice(0,5).map(name=>`<span class="franchise-dot" title="${escapeHTML(name)}" style="--dot:${franchiseColor(name)}">${escapeHTML(initials(name))}</span>`).join('')}</div>
      <span class="reel-count">${topic.reelCount} reel idea${topic.reelCount===1?'':'s'} ↗</span>
    </div>
  </article>`;
  };

  const renderConnections = () => {
    const filtered = data.topics.filter(matches);
    $('#resultCount').textContent = filtered.length;
    const shown = filtered.slice(0,state.visible);
    $('#connectionGrid').innerHTML = shown.length ? shown.map(cardHTML).join('') : `<div class="empty-state"><strong>No connection found.</strong><p>Try a broader term or clear your filters.</p></div>`;
    $('#loadMore').hidden = shown.length >= filtered.length;
  };
  renderConnections();

  $('#searchInput').addEventListener('input', e => {state.q=e.target.value;state.visible=24;renderConnections();});
  document.addEventListener('click', e => {
    const filter = e.target.closest('.filter-chip');
    if (filter) {
      state[filter.dataset.filterKey] = filter.dataset.filterValue;
      state.visible = 24;
      renderFilterRow($('#franchiseFilters'), franchiseList, 'franchise');
      renderFilterRow($('#kindFilters'), kindList, 'kind');
      renderConnections();
    }
    const card = e.target.closest('[data-topic-id]');
    if (card && !filter) openTopic(card.dataset.topicId);
  });
  $('#clearFilters').addEventListener('click', () => {state.q='';state.franchise='All';state.kind='All';state.visible=24;$('#searchInput').value='';renderFilterRow($('#franchiseFilters'),franchiseList,'franchise');renderFilterRow($('#kindFilters'),kindList,'kind');renderConnections();});
  $('#loadMore').addEventListener('click', () => {state.visible+=24;renderConnections();});

  const creatorScriptMarkup = topic => {
    const nl = value => escapeHTML(value || '').replace(/\\n/g, '<br>');
    const video = topic.videoScript ? `<div class="dialog-section creator-script">
      <div class="script-heading"><span class="script-badge">VIDEO</span><h3>${escapeHTML(topic.videoScript.title || 'Creature Connections explainer')}</h3></div>
      <div class="script-piece"><strong>Hook</strong><p>${nl(topic.videoScript.hook)}</p></div>
      ${topic.videoScript.visual ? `<div class="script-piece"><strong>Visual direction</strong><p>${nl(topic.videoScript.visual)}</p></div>` : ''}
      <div class="script-piece"><strong>Script</strong><p>${nl(topic.videoScript.body)}</p></div>
      ${topic.videoScript.cta ? `<div class="script-piece"><strong>CTA</strong><p>${nl(topic.videoScript.cta)}</p></div>` : ''}
    </div>` : '';
    const skit = topic.skitScript ? `<div class="dialog-section creator-script skit-script">
      <div class="script-heading"><span class="script-badge">SKIT</span><h3>${escapeHTML(topic.skitScript.title || 'Companion skit')}</h3></div>
      <div class="script-piece"><strong>Film-ready script</strong><p>${nl(topic.skitScript.body)}</p></div>
    </div>` : '';
    return video + skit;
  };
  const dialog = $('#topicDialog');
  const openTopic = id => {
    const topic = data.topics.find(x=>x.id===id);
    if (!topic) return;
    const featured = data.featured.find(x=>x.topicId===id);
    const visual = visualForTopic(topic.id);
    $('#dialogContent').innerHTML = `<div class="dialog-body">
      ${visual ? `<div class="dialog-visual"><img src="${escapeHTML(visual.image)}" alt="${escapeHTML(visual.alt)}"><div><span>${escapeHTML(visual.kicker)}</span><strong>${escapeHTML(visual.label)}</strong><p>${escapeHTML(visual.note)}</p><a href="${escapeHTML(visual.source)}" target="_blank" rel="noreferrer">Image source ↗</a></div></div>` : ''}
      <div class="dialog-kicker">${escapeHTML(topic.id)} · ${escapeHTML(topic.kind)}</div>
      <h2>${escapeHTML(topic.title)}</h2>
      <div class="dialog-basis">Shared basis · ${escapeHTML(topic.basis)}</div>
      <p class="dialog-summary">${escapeHTML(featured?.summary || topic.summary || `This connection brings together ${topic.characters.join(', ')} through ${topic.basis}.`)}</p>
      <div class="dialog-section"><h3>Characters in this connection</h3><div class="dialog-character-grid">${topic.characters.map(x=>`<span class="dialog-character">${escapeHTML(x)}</span>`).join('')}</div></div>
      <div class="dialog-section"><h3>Franchises</h3><div class="chip-row">${topic.franchises.map(x=>`<span class="chip">${escapeHTML(x)}</span>`).join('')}</div></div>
      ${featured ? `<div class="dialog-section"><h3>Evidence framing</h3><p class="dialog-summary">${escapeHTML(featured.evidence)}</p></div>` : ''}
      ${topic.rationale ? `<div class="dialog-section"><h3>Why it stays separate</h3><p class="dialog-summary">${escapeHTML(topic.rationale)}</p></div>` : ''}
      <div class="dialog-section"><h3>Content potential</h3><p class="dialog-summary">${topic.reelCount} mapped Reel concepts · starter format: ${escapeHTML(topic.starterFormat || 'comparison / analysis')}</p></div>
      ${creatorScriptMarkup(topic)}
      ${topic.sources?.length ? `<div class="dialog-section"><h3>Research links</h3><div class="source-list">${topic.sources.map(url=>`<a href="${escapeHTML(url)}" target="_blank" rel="noreferrer">${escapeHTML(url)} ↗</a>`).join('')}</div></div>` : ''}
    </div>`;
    dialog.showModal();
  };
  window.openTopic = openTopic;
  $('#dialogClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});

  const randomTopic = () => {
    const pool = data.topics.filter(matches);
    const topic = pool[Math.floor(Math.random()*pool.length)] || data.topics[Math.floor(Math.random()*data.topics.length)];
    openTopic(topic.id);
  };
  ['#navRandom','#heroRandom','#randomButton'].forEach(sel => $(sel)?.addEventListener('click', randomTopic));
})();