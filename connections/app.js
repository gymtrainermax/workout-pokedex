(() => {
  const data = window.CONNECTIONS_SITE_DATA;
  if (!data) return;

  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];
  const escapeHTML = (value='') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase();
  const franchiseColor = name => {
    const known = {
      'Tamagotchi':'#ffce5c','Digimon':'#ef78ba','Pokémon':'#4db5ff','Yu-Gi-Oh!':'#8a7dff',
      'Dragon Quest':'#61e4c5','Sanrio':'#ff8fbf','Disney':'#7bc8ff','Final Fantasy':'#b8a6ff',
      'Sonic the Hedgehog':'#4db5ff','Street Sharks':'#61e4c5','Shark Tale':'#8fc7ff'
    };
    if (known[name]) return known[name];
    let h=0; for (const c of String(name || 'Other')) h=(h*31+c.charCodeAt(0))%360;
    return `hsl(${h} 65% 60%)`;
  };

  const visualForTopic = id => data.visuals?.find(v => v.topicId === id);
  const galleryForTopic = topic => Array.isArray(topic?.gallery) ? topic.gallery.filter(x => x?.name) : [];
  const worlds = Array.isArray(data.paradiseWorlds) ? data.paradiseWorlds : [];
  const topicNames = topic => new Set([topic?.title, ...(topic?.characters || [])].filter(Boolean));
  const worldMatchesTopic = (world, topic) => {
    if (!world || !topic) return false;
    const names = topicNames(topic);
    return (world.characterNames || []).some(name => names.has(name));
  };
  const worldsForTopic = topic => worlds.filter(world => worldMatchesTopic(world, topic));
  const primaryMedia = topic => {
    const gallery = galleryForTopic(topic);
    if (gallery.length) return {image:gallery[0].image, alt:gallery[0].name, source:gallery[0].source, name:gallery[0].name};
    const visual = visualForTopic(topic?.id);
    return visual ? {image:visual.image, alt:visual.alt, source:visual.source, name:visual.label} : null;
  };
  const imageFrame = (item, cls='image-frame') => {
    if (!item?.image) return `<div class="${cls} image-failed" data-fallback="${escapeHTML(initials(item?.name))}"></div>`;
    return `<div class="${cls}" data-fallback="${escapeHTML(initials(item.name))}">
      <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy" decoding="async" data-fallback-name="${escapeHTML(item.name)}">
    </div>`;
  };

  document.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.hasAttribute('data-fallback-name')) return;
    const frame = img.parentElement;
    if (!frame) return;
    frame.classList.add('image-failed');
    frame.dataset.fallback = initials(img.getAttribute('data-fallback-name'));
    img.remove();
  }, true);

  const heroStats = $('#heroStats');
  const stats = [
    [data.stats.topicCount, 'canonical families'],
    [data.stats.characterEntryCount, 'character entries'],
    [data.stats.reelIdeaCount, 'reel concepts'],
    [data.stats.topFranchises.length + '+', 'major franchises']
  ];
  if (heroStats) heroStats.innerHTML = stats.map(([n,l]) => `<div class="stat"><strong>${escapeHTML(n)}</strong><span>${escapeHTML(l)}</span></div>`).join('');

  const toneMap = {
    confirmed:['#61e4c5','#8ff2d8'], possible:['#ffce5c','#ffe08b'], source:['#4db5ff','#8fd7ff'],
    myth:['#ef78ba','#ffa8d1'], internal:['#8a7dff','#b8aeff']
  };
  const visualMarkup = (v, className='visual-image') => v ? `<div class="${className}-wrap"><img class="${className}" src="${escapeHTML(v.image)}" alt="${escapeHTML(v.alt)}" loading="lazy" decoding="async"><div class="visual-caption"><span>${escapeHTML(v.kicker)}</span><strong>${escapeHTML(v.label)}</strong></div></div>` : '';

  if ($('#visualAtlas')) {
    $('#visualAtlas').innerHTML = (data.visuals || []).map(v => `<article class="atlas-card" data-topic-id="${escapeHTML(v.topicId)}">
      <img src="${escapeHTML(v.image)}" alt="${escapeHTML(v.alt)}" loading="lazy" decoding="async">
      <div class="atlas-overlay"><span>${escapeHTML(v.kicker)}</span><h3>${escapeHTML(v.label)}</h3><p>${escapeHTML(v.note)}</p><small>Open connection ↗</small></div>
    </article>`).join('');
  }
  if ($('#imageCredits')) {
    $('#imageCredits').innerHTML = (data.visuals || []).map(v => `<p><a href="${escapeHTML(v.source)}" target="_blank" rel="noreferrer">${escapeHTML(v.label)} ↗</a> · ${escapeHTML(v.credit)} · ${escapeHTML(v.license)}</p>`).join('');
  }

  if ($('#featuredGrid')) {
    $('#featuredGrid').innerHTML = data.featured.map(f => {
      const [accent, accentText] = toneMap[f.tone] || toneMap.source;
      const topic = data.topics.find(x => x.id === f.topicId);
      const media = primaryMedia(topic);
      const visual = visualForTopic(f.topicId);
      return `<article class="feature-card ${media?'has-photo':''}" data-topic-id="${escapeHTML(f.topicId)}" style="--accent:${accent}55;--accentText:${accentText}">
        ${media ? `<div class="feature-photo-wrap" data-fallback="${escapeHTML(initials(media.name))}"><img class="feature-photo" src="${escapeHTML(media.image)}" alt="${escapeHTML(media.alt || media.name)}" loading="lazy" decoding="async" data-fallback-name="${escapeHTML(media.name)}"></div>` : (visual ? visualMarkup(visual, 'feature-photo') : '')}
        <div class="feature-card-copy">
          <div class="feature-eyebrow">${escapeHTML(f.eyebrow)}</div>
          <h3>${escapeHTML(f.headline)}</h3>
          <p>${escapeHTML(f.summary)}</p>
          <div class="feature-chips">${f.franchises.slice(0,5).map(x=>`<span class="chip">${escapeHTML(x)}</span>`).join('')}</div>
        </div>
        <span class="feature-arrow">↗</span>
      </article>`;
    }).join('');
  }

  const state = {q:'', franchise:'All', kind:'All', focus:'All archive', world:'all', visible:24};
  const priorityFranchises = ['All','Tamagotchi','Digimon','Pokémon','Yu-Gi-Oh!','Sanrio','Disney','Sonic the Hedgehog','Dragon Quest','Final Fantasy'];
  const franchiseList = priorityFranchises.filter(x => x==='All' || data.filters.franchises.includes(x));
  const kindList = ['All', ...data.filters.kinds];
  const focusList = ['All archive','Neon Planets','With images','With scripts'];

  const mappedTopicsForWorld = world => data.topics.filter(topic => worldMatchesTopic(world, topic));
  const mappedCharactersForWorld = world => {
    const mappedTopics = mappedTopicsForWorld(world);
    return (world.characterNames || []).filter(name => mappedTopics.some(topic => topic.title === name || (topic.characters || []).includes(name)));
  };
  const renderParadiseWorlds = () => {
    const grid = $('#paradiseWorldsGrid');
    if (!grid || !worlds.length) return;
    grid.innerHTML = worlds.map(world => {
      const mappedTopics = mappedTopicsForWorld(world);
      const mappedCharacters = mappedCharactersForWorld(world);
      const preview = mappedCharacters.slice(0,5);
      return `<article class="paradise-world-card ${state.world===world.id?'active':''}" data-world-id="${escapeHTML(world.id)}">
        <div class="world-card-top">
          <div class="world-orb world-orb-${escapeHTML(world.id)}"><span>${escapeHTML(world.symbol)}</span></div>
          <div class="world-type">${escapeHTML(world.type)}</div>
        </div>
        <div class="world-card-copy">
          <h3>${escapeHTML(world.name)}</h3>
          <p>${escapeHTML(world.description)}</p>
        </div>
        <div class="world-progress">
          <strong>${mappedCharacters.length}<span>/${(world.characterNames||[]).length}</span></strong>
          <small>official adults represented</small>
        </div>
        <div class="world-character-preview">
          ${preview.map(name=>`<span>${escapeHTML(name)}</span>`).join('')}
          ${mappedCharacters.length>preview.length?`<span>+${mappedCharacters.length-preview.length}</span>`:''}
        </div>
        <div class="world-card-footer">
          <span>${mappedTopics.length} case file${mappedTopics.length===1?'':'s'}</span>
          <button type="button" data-world-id="${escapeHTML(world.id)}">Explore ${escapeHTML(world.name)} →</button>
        </div>
      </article>`;
    }).join('');
    const totalMapped = worlds.reduce((n,world)=>n+mappedCharactersForWorld(world).length,0);
    if ($('#worldsSummary')) $('#worldsSummary').textContent = `${worlds.length} worlds · ${totalMapped} mapped roster links`;
    $('#worldsAllButton')?.classList.toggle('active', state.world==='all');
  };

  const renderWorldSelection = () => {
    const selected = worlds.find(world => world.id === state.world);
    $('.paradise-world-card').forEach(card => card.classList.toggle('active', card.dataset.worldId === state.world));
    $('#worldsAllButton')?.classList.toggle('active', state.world==='all');
    const banner = $('#activeWorldFilter');
    if (!banner) return;
    if (!selected) {
      banner.hidden = true;
      banner.innerHTML = '';
    } else {
      banner.hidden = false;
      banner.innerHTML = `<div><span>Paradise world</span><strong>${escapeHTML(selected.name)}</strong><small>${escapeHTML(selected.type)}</small></div><button type="button" data-clear-world>Show all worlds ×</button>`;
    }
  };
  renderParadiseWorlds();
  renderWorldSelection();

  const renderFilterRow = (target, items, key) => {
    if (!target) return;
    target.innerHTML = items.map(item => `<button class="filter-chip ${state[key]===item?'active':''}" data-filter-key="${key}" data-filter-value="${escapeHTML(item)}">${escapeHTML(item)}</button>`).join('');
  };
  renderFilterRow($('#franchiseFilters'), franchiseList, 'franchise');
  renderFilterRow($('#kindFilters'), kindList, 'kind');
  renderFilterRow($('#focusFilters'), focusList, 'focus');

  const isNeonTopic = topic => ['P103','P104',...Array.from({length:12},(_,i)=>`P${128+i}`)].includes(topic.id);
  const matches = topic => {
    const q = state.q.trim().toLowerCase();
    const gallery = galleryForTopic(topic);
    const hay = [topic.id,topic.title,topic.basis,topic.scope,topic.kind,topic.category,topic.summary,topic.rationale,...topic.characters,...topic.franchises,...gallery.flatMap(x=>[x.name,x.franchise,x.role])].filter(Boolean).join(' ').toLowerCase();
    const focusMatch =
      state.focus === 'All archive' ||
      (state.focus === 'Neon Planets' && isNeonTopic(topic)) ||
      (state.focus === 'With images' && gallery.length > 0) ||
      (state.focus === 'With scripts' && (topic.videoScript || topic.skitScript));
    const selectedWorld = worlds.find(world => world.id === state.world);
    const worldMatch = !selectedWorld || worldMatchesTopic(selectedWorld, topic);
    return (!q || hay.includes(q)) &&
      (state.franchise==='All' || topic.franchises.includes(state.franchise)) &&
      (state.kind==='All' || topic.kind===state.kind) &&
      focusMatch &&
      worldMatch;
  };

  const cardMedia = topic => {
    const gallery = galleryForTopic(topic);
    if (gallery.length) {
      const items = gallery.slice(0,3);
      return `<div class="connection-media connection-media-${Math.min(items.length,3)}">
        ${items.map(item => imageFrame(item,'card-image-frame')).join('')}
        <span class="media-count">${gallery.length} visual${gallery.length===1?'':'s'}</span>
      </div>`;
    }
    const visual = visualForTopic(topic.id);
    if (visual) return `<div class="connection-media connection-media-1"><div class="card-image-frame" data-fallback="${escapeHTML(initials(topic.title))}"><img src="${escapeHTML(visual.image)}" alt="${escapeHTML(visual.alt)}" loading="lazy" decoding="async" data-fallback-name="${escapeHTML(topic.title)}"></div><span class="media-count">source image</span></div>`;
    return `<div class="connection-media connection-media-empty" data-fallback="${escapeHTML(initials(topic.title))}"><span>${escapeHTML(initials(topic.title))}</span></div>`;
  };

  const cardHTML = topic => {
    const topicWorlds = worldsForTopic(topic);
    return `<article class="connection-card ${galleryForTopic(topic).length?'has-gallery':''}" data-topic-id="${escapeHTML(topic.id)}">
    ${cardMedia(topic)}
    <div class="connection-card-copy">
      <div class="connection-top"><span class="topic-id">${escapeHTML(topic.id)}</span><span class="topic-kind">${escapeHTML(topic.kind)}</span></div>
      ${topicWorlds.length ? `<div class="card-worlds">${topicWorlds.map(world=>`<span class="world-mini world-mini-${escapeHTML(world.id)}">${escapeHTML(world.label)}</span>`).join('')}</div>` : ''}
      <h3>${escapeHTML(topic.title)}</h3>
      <div class="basis">${escapeHTML(topic.basis)}</div>
      <div class="character-list">${escapeHTML(topic.characters.slice(0,5).join(' · '))}${topic.characters.length>5?' · +'+(topic.characters.length-5)+' more':''}</div>
      <div class="connection-bottom">
        <div class="franchise-dots">${topic.franchises.slice(0,5).map(name=>`<span class="franchise-dot" title="${escapeHTML(name)}" style="--dot:${franchiseColor(name)}">${escapeHTML(initials(name))}</span>`).join('')}</div>
        <span class="reel-count">Open case file ↗</span>
      </div>
    </div>
  </article>`;
  };

  const renderConnections = () => {
    const filtered = data.topics.filter(matches);
    if ($('#resultCount')) $('#resultCount').textContent = filtered.length;
    const shown = filtered.slice(0,state.visible);
    if ($('#connectionGrid')) $('#connectionGrid').innerHTML = shown.length ? shown.map(cardHTML).join('') : `<div class="empty-state"><strong>No connection found.</strong><p>Try a broader term or clear your filters.</p></div>`;
    if ($('#loadMore')) $('#loadMore').hidden = shown.length >= filtered.length;
  };
  renderConnections();

  $('#searchInput')?.addEventListener('input', e => {state.q=e.target.value;state.visible=24;renderConnections();});
  $('#clearFilters')?.addEventListener('click', () => {
    state.q=''; state.franchise='All'; state.kind='All'; state.focus='All archive'; state.world='all'; state.visible=24;
    if ($('#searchInput')) $('#searchInput').value='';
    renderFilterRow($('#franchiseFilters'),franchiseList,'franchise');
    renderFilterRow($('#kindFilters'),kindList,'kind');
    renderFilterRow($('#focusFilters'),focusList,'focus');
    renderWorldSelection();
    renderConnections();
  });
  $('#loadMore')?.addEventListener('click', () => {state.visible+=24;renderConnections();});
  $('#worldsAllButton')?.addEventListener('click', () => {
    state.world = 'all';
    renderWorldSelection();
    renderConnections();
    document.querySelector('#explore')?.scrollIntoView({behavior:'smooth',block:'start'});
  });

  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName || '')) {
      e.preventDefault();
      $('#searchInput')?.focus();
    }
  });

  const creatorScriptMarkup = topic => {
    const nl = value => escapeHTML(value || '').replace(/\n/g, '<br>');
    const video = topic.videoScript ? `<details class="creator-details">
      <summary><span class="script-badge">VIDEO</span><span><strong>${escapeHTML(topic.videoScript.title || 'Creature Connections explainer')}</strong><small>Hook, visual direction, script & CTA</small></span><b>+</b></summary>
      <div class="creator-script">
        <div class="script-piece"><strong>Hook</strong><p>${nl(topic.videoScript.hook)}</p></div>
        ${topic.videoScript.visual ? `<div class="script-piece"><strong>Visual direction</strong><p>${nl(topic.videoScript.visual)}</p></div>` : ''}
        <div class="script-piece"><strong>Script</strong><p>${nl(topic.videoScript.body)}</p></div>
        ${topic.videoScript.cta ? `<div class="script-piece"><strong>CTA</strong><p>${nl(topic.videoScript.cta)}</p></div>` : ''}
      </div>
    </details>` : '';
    const skit = topic.skitScript ? `<details class="creator-details skit-details">
      <summary><span class="script-badge">SKIT</span><span><strong>${escapeHTML(topic.skitScript.title || 'Companion skit')}</strong><small>Film-ready companion concept</small></span><b>+</b></summary>
      <div class="creator-script skit-script"><div class="script-piece"><strong>Film-ready script</strong><p>${nl(topic.skitScript.body)}</p></div></div>
    </details>` : '';
    return video || skit ? `<div class="dialog-section creator-pack"><div class="section-label">Creator pack</div>${video}${skit}</div>` : '';
  };

  const galleryMarkup = topic => {
    const gallery = galleryForTopic(topic);
    if (!gallery.length) return '';
    return `<div class="dialog-section gallery-section">
      <div class="section-head-inline"><div><div class="section-label">Visual comparison board</div><h3>See the connection side by side</h3></div><span>${gallery.length} images</span></div>
      <div class="topic-gallery">
        ${gallery.map((item,index)=>`<article class="gallery-tile">
          <button class="gallery-image-button" type="button" data-gallery-topic="${escapeHTML(topic.id)}" data-gallery-index="${index}" aria-label="Open image of ${escapeHTML(item.name)}">
            ${imageFrame(item,'gallery-image-frame')}
            <span class="gallery-zoom">↗</span>
          </button>
          <div class="gallery-meta">
            <strong>${escapeHTML(item.name)}</strong>
            <span class="gallery-franchise" style="--gallery-accent:${franchiseColor(item.franchise)}">${escapeHTML(item.franchise)}</span>
            <p>${escapeHTML(item.role || '')}</p>
            ${item.source ? `<a href="${escapeHTML(item.source)}" target="_blank" rel="noreferrer">Image / character source ↗</a>` : ''}
          </div>
        </article>`).join('')}
      </div>
    </div>`;
  };

  const relatedTopics = topic => data.topics
    .filter(x => x.id !== topic.id)
    .map(x => {
      const sharedFranchises = x.franchises.filter(f => topic.franchises.includes(f)).length;
      const sameKind = x.kind === topic.kind ? 1 : 0;
      const sameScope = x.scope === topic.scope ? 1 : 0;
      return {topic:x, score:sharedFranchises*3 + sameKind + sameScope};
    })
    .filter(x => x.score > 2)
    .sort((a,b)=>b.score-a.score || a.topic.title.localeCompare(b.topic.title))
    .slice(0,4)
    .map(x=>x.topic);

  const relatedMarkup = topic => {
    const related = relatedTopics(topic);
    if (!related.length) return '';
    return `<div class="dialog-section related-section">
      <div class="section-label">Keep exploring</div>
      <h3>Related connections</h3>
      <div class="related-grid">${related.map(item=>`<button type="button" class="related-card" data-dialog-nav="${escapeHTML(item.id)}">
        <span>${escapeHTML(item.id)}</span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.basis)}</small>
      </button>`).join('')}</div>
    </div>`;
  };

  const dialog = $('#topicDialog');
  const visibleTopicList = () => {
    const pool = data.topics.filter(matches);
    return pool.length ? pool : data.topics;
  };
  const neighborIds = id => {
    let pool = visibleTopicList();
    let index = pool.findIndex(x=>x.id===id);
    if (index < 0) { pool=data.topics; index=pool.findIndex(x=>x.id===id); }
    return {
      prev: pool[(index-1+pool.length)%pool.length]?.id,
      next: pool[(index+1)%pool.length]?.id
    };
  };

  const openTopic = id => {
    const topic = data.topics.find(x=>x.id===id);
    if (!topic || !dialog) return;
    const featured = data.featured.find(x=>x.topicId===id);
    const media = primaryMedia(topic);
    const neighbors = neighborIds(id);
    const gallery = galleryForTopic(topic);
    const topicWorldList = worldsForTopic(topic);
    $('#dialogContent').innerHTML = `<div class="dialog-body">
      <div class="topic-hero ${media?'has-media':''}">
        ${media ? `<button class="topic-hero-image" type="button" ${gallery.length?`data-gallery-topic="${escapeHTML(topic.id)}" data-gallery-index="0"`:''} aria-label="Open ${escapeHTML(media.name || topic.title)} image">
          ${imageFrame({name:media.name||topic.title,image:media.image},'topic-hero-frame')}
        </button>` : `<div class="topic-hero-placeholder">${escapeHTML(initials(topic.title))}</div>`}
        <div class="topic-hero-copy">
          <div class="dialog-kicker">${escapeHTML(topic.id)} · ${escapeHTML(topic.kind)}</div>
          <h2>${escapeHTML(topic.title)}</h2>
          <div class="dialog-basis">${escapeHTML(topic.basis)}</div>
          ${topicWorldList.length ? `<div class="topic-world-row">${topicWorldList.map(world=>`<button type="button" class="topic-world-chip world-mini-${escapeHTML(world.id)}" data-world-id="${escapeHTML(world.id)}">${escapeHTML(world.name)}</button>`).join('')}</div>` : ''}
          <div class="chip-row">${topic.franchises.map(x=>`<span class="chip" style="--chip-accent:${franchiseColor(x)}">${escapeHTML(x)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="topic-nav">
        <button type="button" data-dialog-nav="${escapeHTML(neighbors.prev)}">← Previous</button>
        <span>${gallery.length ? `${gallery.length} visual references` : 'Research case file'}</span>
        <button type="button" data-dialog-nav="${escapeHTML(neighbors.next)}">Next →</button>
      </div>
      <div class="dialog-intro">
        <p class="dialog-summary">${escapeHTML(featured?.summary || topic.summary || `This connection brings together ${topic.characters.join(', ')} through ${topic.basis}.`)}</p>
      </div>
      ${galleryMarkup(topic)}
      <div class="dialog-section research-grid">
        <div><div class="section-label">Characters</div><h3>In this connection</h3><div class="dialog-character-grid">${topic.characters.map(x=>`<span class="dialog-character">${escapeHTML(x)}</span>`).join('')}</div></div>
        <div><div class="section-label">Editorial framing</div><h3>Why this connection matters</h3>
          ${featured ? `<p class="dialog-summary"><strong>Evidence:</strong> ${escapeHTML(featured.evidence)}</p>` : ''}
          ${topic.rationale ? `<p class="dialog-summary">${escapeHTML(topic.rationale)}</p>` : `<p class="dialog-summary">${escapeHTML(topic.summary || topic.basis)}</p>`}
        </div>
      </div>
      ${creatorScriptMarkup(topic)}
      ${relatedMarkup(topic)}
      ${topic.sources?.length ? `<details class="dialog-section source-details"><summary>Research links <span>${topic.sources.length}</span></summary><div class="source-list">${topic.sources.map(url=>`<a href="${escapeHTML(url)}" target="_blank" rel="noreferrer">${escapeHTML(url)} ↗</a>`).join('')}</div></details>` : ''}
    </div>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  };
  window.openTopic = openTopic;

  const lightbox = $('#imageLightbox');
  let lightboxState = {topicId:null,index:0};
  const openLightbox = (topicId,index=0) => {
    const topic = data.topics.find(x=>x.id===topicId);
    const gallery = galleryForTopic(topic);
    if (!lightbox || !topic || !gallery.length) return;
    const safeIndex = (index + gallery.length) % gallery.length;
    const item = gallery[safeIndex];
    lightboxState = {topicId,index:safeIndex};
    $('#lightboxContent').innerHTML = `<div class="lightbox-layout">
      <div class="lightbox-image-wrap" data-fallback="${escapeHTML(initials(item.name))}"><img src="${escapeHTML(item.image || '')}" alt="${escapeHTML(item.name)}" data-fallback-name="${escapeHTML(item.name)}"></div>
      <div class="lightbox-copy">
        <span class="lightbox-count">${safeIndex+1} / ${gallery.length}</span>
        <h2>${escapeHTML(item.name)}</h2>
        <span class="gallery-franchise" style="--gallery-accent:${franchiseColor(item.franchise)}">${escapeHTML(item.franchise)}</span>
        <p>${escapeHTML(item.role || '')}</p>
        ${item.source ? `<a href="${escapeHTML(item.source)}" target="_blank" rel="noreferrer">Open source ↗</a>` : ''}
        <div class="lightbox-nav"><button type="button" data-lightbox-step="-1">←</button><button type="button" data-lightbox-step="1">→</button></div>
      </div>
    </div>`;
    if (!lightbox.open) lightbox.showModal();
  };

  document.addEventListener('click', e => {
    const clearWorld = e.target.closest('[data-clear-world]');
    if (clearWorld) {
      state.world = 'all';
      renderWorldSelection();
      renderConnections();
      return;
    }
    const worldButton = e.target.closest('[data-world-id]');
    if (worldButton) {
      state.world = worldButton.dataset.worldId || 'all';
      state.q = '';
      state.franchise = 'All';
      state.kind = 'All';
      state.focus = 'All archive';
      state.visible = 24;
      if ($('#searchInput')) $('#searchInput').value = '';
      renderFilterRow($('#franchiseFilters'), franchiseList, 'franchise');
      renderFilterRow($('#kindFilters'), kindList, 'kind');
      renderFilterRow($('#focusFilters'), focusList, 'focus');
      renderWorldSelection();
      renderConnections();
      dialog?.close();
      document.querySelector('#explore')?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    const filter = e.target.closest('.filter-chip');
    if (filter) {
      state[filter.dataset.filterKey] = filter.dataset.filterValue;
      state.visible = 24;
      renderFilterRow($('#franchiseFilters'), franchiseList, 'franchise');
      renderFilterRow($('#kindFilters'), kindList, 'kind');
      renderFilterRow($('#focusFilters'), focusList, 'focus');
      renderConnections();
      return;
    }
    const galleryButton = e.target.closest('[data-gallery-topic]');
    if (galleryButton) {
      openLightbox(galleryButton.dataset.galleryTopic, Number(galleryButton.dataset.galleryIndex || 0));
      return;
    }
    const navButton = e.target.closest('[data-dialog-nav]');
    if (navButton) {
      openTopic(navButton.dataset.dialogNav);
      return;
    }
    const lightboxStep = e.target.closest('[data-lightbox-step]');
    if (lightboxStep) {
      openLightbox(lightboxState.topicId, lightboxState.index + Number(lightboxStep.dataset.lightboxStep));
      return;
    }
    const card = e.target.closest('[data-topic-id]');
    if (card) openTopic(card.dataset.topicId);
  });

  $('#dialogClose')?.addEventListener('click',()=>dialog?.close());
  dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  $('#lightboxClose')?.addEventListener('click',()=>lightbox?.close());
  lightbox?.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close();});

  const randomTopic = () => {
    const pool = data.topics.filter(matches);
    const topic = pool[Math.floor(Math.random()*pool.length)] || data.topics[Math.floor(Math.random()*data.topics.length)];
    if (topic) openTopic(topic.id);
  };
  ['#navRandom','#heroRandom','#randomButton'].forEach(sel => $(sel)?.addEventListener('click', randomTopic));
})();
