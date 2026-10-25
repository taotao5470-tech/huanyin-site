/* One football catalog: national teams and Liga MX share navigation and huanyin_cart. */
(() => {
  'use strict';
  const nationalProducts = products.slice();
  const catalog = window.LIGAMX_CATALOG;
  const clubById = new Map(catalog.clubs.map(c => [c.id,c]));
  const sourceImage = src => '/' + String(src).replace(/^\/+/, '');
  const leagueProducts = catalog.products.map(p => ({
    ...p, isLigaMX:true, category:'jersey', sub_type:'liga-mx', region:'mexico',
    team:clubById.get(p.club).name,
    name_es:`${clubById.get(p.club).name} ${p.season} · ${p.label.es}`.replace(/ +/g,' ').trim(),
    name_en:`${clubById.get(p.club).name} ${p.season} · ${p.label.en}`.replace(/ +/g,' ').trim(),
    name_pt:`${clubById.get(p.club).name} ${p.season} · ${p.label.pt}`.replace(/ +/g,' ').trim(),
    images:p.images.map(sourceImage), thumbnail:sourceImage(p.thumbnail),
    price:{mxn_small:p.priceMxn,mxn_large:p.priceMxn,usd_small:p.priceMxn/USD_TO_MXN,usd_large:p.priceMxn/USD_TO_MXN,moq:1}
  }));
  const allKits = new Map([...nationalProducts,...leagueProducts].map(p => [p.id,p]));
  const byLeagueId = new Map(leagueProducts.map(p => [p.id,p]));
  const escape = value => String(value || '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const text = (es,en,pt) => uiText(es,en,pt);
  function icon(kind){
    const paths={
      trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v2a4 4 0 0 0 4 4m7-6h3v2a4 4 0 0 1-4 4m-3 1v5m-4 2h8m-6-2h4"/>',
      jersey:'<path d="m8 4-5 4 3 4 2-1v9h8v-9l2 1 3-4-5-4a4 4 0 0 1-8 0Z"/><path d="m10 12 2 1 2-1v3l-2 2-2-2v-3Z"/>',
      grid:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
      globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c5 4.5 5 12.5 0 17-5-4.5-5-12.5 0-17Z"/>',
      plus:'<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8m-4-4v8"/>',
      check:'<path d="m5 12 4 4L19 6"/>'
    };
    return `<svg class="football-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[kind]||paths.globe}</svg>`;
  }
  function clubBadge(club){
    return `<img class="football-club-crest" src="/images/football-logos/${club.id}.png" alt="" width="48" height="48" decoding="async">`;
  }
  function competitionLogo(key){
    const file=key==='national'?'worldcup-2026.webp':'liga-mx-symbol.png';
    return `<img class="football-competition-logo" src="/images/football-logos/${file}" alt="" width="64" height="64" decoding="async">`;
  }
  const label = p => p.label[currentLang] || p.label.es;
  const name = p => currentLang==='en'?p.name_en:currentLang==='pt'?p.name_pt:p.name_es;
  let collection='national';
  let leagueSeason='all', leagueVersion='all';
  let leagueModal=null;
  let modalOpener=null;
  const panel=document.createElement('div');
  panel.id='footballCollectionPanel';panel.setAttribute('role','tabpanel');panel.setAttribute('tabindex','0');
  const filterPanel=document.getElementById('wcSubfilters');
  filterPanel.before(panel);
  panel.append(filterPanel,document.getElementById('kitArchiveIntro'),document.querySelector('#pageList .wc-main'));
  const hero=document.querySelector('.wc-hero');
  const originals={
    title:hero.querySelector('h1').innerHTML,
    subtitle:hero.querySelector('.subtitle').innerHTML,
    stats:hero.querySelector('.stats').innerHTML,
    right:hero.querySelector('.wc-hero-right').innerHTML
  };
  const base={renderTabs,renderSubfilters,renderArchiveIntro,renderProducts,openKitModal,wcAddToCart,updateKitModalPrice};

  // Show sourced catalog photos without inferring stock, sales rank or unavailable kit versions.
  renderRankingItem=function(item,index){
    const p=item?.team?productByTeam(item.team):item;if(!p)return '';
    const slot=item?.slot||'home';const resolved=resolveKitSlot(p,slot);
    const src=resolved.img||firstProductImage(p);if(!src)return '';
    const title=item?.label_es?text(item.label_es,item.label_en||item.label_es,item.label_es):productName(p);
    return `<a class="ranking-item js-kit-open" href="#product/${p.id}" data-id="${p.id}" data-slot="${slot}"><span class="ranking-num">${String(index+1).padStart(2,'0')}</span><img class="ranking-thumb" src="${src}" alt="${escape(title)}" loading="lazy"><span class="ranking-name"><strong>${escape(title)}</strong><small>${escape(p.team)} · ${p.season}</small></span></a>`;
  };
  flattenTeamKits=function(p){
    return KIT_SLOTS.filter(slot=>resolveKitSlot(p,slot.key).images.length).map(slot=>{
      const resolved=resolveKitSlot(p,slot.key);
      return kitCardHtml(p,resolved.img,productName(p),`${p.season} ${kitSlotLabel(slot.key)}`,false,resolved.variantIdx,slot.key);
    });
  };

  function cartItem(p,size,qty){
    return {productId:p.id,variantId:p.version,variantLabel:label(p),qty,packaging:'standard',size,
      kitSlot:p.version,kitSlotLabel:label(p),isWorldCup:true,isLigaMX:true,
      name:p.name_es,name_en:p.name_en,name_pt:p.name_pt,team:p.team,season:p.season,
      img:p.images[0],priceMxn:p.priceMxn,priceUsd:p.priceMxn/USD_TO_MXN};
  }
  function migrateLeagueQuote(){
    try{
      const old=JSON.parse(localStorage.getItem('miravue_ligamx_quote_v1')||'[]');
      if(!Array.isArray(old)||!old.length)return;
      const shared=getCart();
      for(const item of old){
        const p=byLeagueId.get(item?.id);
        if(!p||!p.sizes.includes(item.size)||!Number.isInteger(item.qty)||item.qty<1||item.qty>9999)continue;
        const existing=shared.find(c=>c.productId===p.id&&c.size===item.size);
        if(existing)existing.qty+=item.qty;else shared.push(cartItem(p,item.size,item.qty));
      }
      localStorage.setItem('huanyin_cart',JSON.stringify(shared));
      localStorage.removeItem('miravue_ligamx_quote_v1');
    }catch(error){console.warn('Could not migrate the saved Liga MX selection.',error);}
  }
  function refreshHero(){
    const league=collection==='ligamx';
    document.body.classList.toggle('football-ligamx',league);
    hero.querySelector('h1').innerHTML=league?'LIGA<br>MX':originals.title;
    hero.querySelector('.subtitle').textContent=league
      ? text('Camisetas de clubes · El fútbol de tus colores','Club jerseys · Wear your team colors','Camisas de clubes · As cores do seu time')
      : text('Archivo de camisetas nacionales 2026','2026 national team jersey archive','Arquivo de camisas das seleções 2026');
    hero.querySelector('.stats').innerHTML=league
      ? `<div class="stat"><strong>7</strong><span>${text('Clubes','Clubs','Clubes')}</span></div><div class="stat"><strong>37</strong><span>${text('Modelos','Models','Modelos')}</span></div><div class="stat"><strong>185</strong><span>MXN / ${text('pieza','piece','peça')}</span></div><div class="stat"><strong>2</strong><span>${text('Fotos por modelo','Photos per model','Fotos por modelo')}</span></div>`
      : originals.stats;
    if(league){
      hero.querySelector('.wc-hero-right').innerHTML='<div class="football-hero-photos" aria-hidden="true">'+['ligamx-chivas-2026-27-home','ligamx-america-2026-27-home','ligamx-cruz-azul-2026-27-home'].map((id,i)=>`<div class="football-hero-photo photo-${i}"><img src="${byLeagueId.get(id).thumbnail}" alt=""></div>`).join('')+'</div>';
    }else if(!hero.querySelector('#cd-d')){
      hero.querySelector('.wc-hero-right').innerHTML=originals.right;tick();
    }
    if(!league && Date.now()>Date.UTC(2026,6,20,3,59,59)){
      const countdown=hero.querySelector('.wc-countdown');
      if(countdown)countdown.outerHTML=`<div class="football-season-summary"><span>${text('COLECCIÓN 2026','2026 COLLECTION','COLEÇÃO 2026')}</span><strong>${text('Los colores de tu selección','Your national team colors','As cores da sua seleção')}</strong><p>${nationalProducts.length} ${text('selecciones · Cotiza tus modelos favoritos','national teams · Get a quote for your favorites','seleções · Solicite uma cotação dos seus modelos favoritos')}</p></div>`;
    }
    const promo=document.getElementById('promoBar');
    if(promo)promo.hidden=league;
    document.querySelector('.archive-rankings').hidden=league;
    document.title=text('Mundial 2026 y Liga MX · Camisetas · Miravue','World Cup 2026 & Liga MX · Jerseys · Miravue','Mundial 2026 e Liga MX · Camisas · Miravue');
    if(!league)hero.querySelectorAll('[data-es]').forEach(el=>{el.textContent=el.dataset[currentLang]||el.dataset.es;});
  }
  function closeLeagueModal(){
    if(!leagueModal)return;
    const modal=leagueModal;leagueModal=null;modal.remove();
    document.body.style.overflow=document.getElementById('wcCartPanel').classList.contains('open')?'hidden':'';
    if(location.hash.startsWith('#product/ligamx-'))history.replaceState(null,'',location.pathname+location.search+'#catalog');
    if(modalOpener?.isConnected)modalOpener.focus({preventScroll:true});
  }
  function scrollToCatalog(){
    window.scrollTo({top:Math.max(0,hero.getBoundingClientRect().bottom+window.scrollY-64),behavior:'instant'});
  }
  function selectCollection(key,{writeUrl=true,reset=true}={}){
    closeLeagueModal();
    document.querySelectorAll('.kit-detail-modal').forEach(m=>m.remove());
    collection=key==='ligamx'?'ligamx':'national';
    products=collection==='ligamx'?leagueProducts:nationalProducts;
    currentCat='jersey';
    if(reset){selectedTeam='';currentSearch='';currentSubfilter2='';document.getElementById('searchInput').value='';}
    if(writeUrl){const url=new URL(location.href);url.searchParams.set('collection',collection);url.hash='catalog';history.pushState(null,'',url);}
    render();updateCartWCUI();
    if(writeUrl)scrollToCatalog();
  }
  renderTabs=function(){
    refreshHero();
    const tabs=document.getElementById('wcTabs');
    tabs.className='wc-tabs-inner football-collections';tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label',text('Colecciones de camisetas','Jersey collections','Coleções de camisas'));
    tabs.innerHTML=[
      {key:'national',title:'Mundial 2026',sub:text('Selecciones nacionales','National teams','Seleções nacionais'),count:nationalProducts.length,unit:text('selecciones','teams','seleções'),icon:'trophy'},
      {key:'ligamx',title:'Liga MX',sub:text('Clubes de México','Mexican clubs','Clubes do México'),count:leagueProducts.length,unit:text('modelos','models','modelos'),icon:'jersey'}
    ].map(c=>`<button type="button" id="football-tab-${c.key}" class="football-collection ${collection===c.key?'active':''}" role="tab" tabindex="${collection===c.key?0:-1}" aria-selected="${collection===c.key}" aria-controls="footballCollectionPanel" data-collection="${c.key}"><span class="collection-icon">${competitionLogo(c.key)}</span><span class="collection-copy"><strong>${c.title}</strong><small>${c.sub}</small></span><span class="collection-count"><b>${c.count}</b><small>${c.unit}</small></span></button>`).join('');
    panel.setAttribute('aria-labelledby','football-tab-'+collection);
    tabs.querySelectorAll('[data-collection]').forEach(b=>{
      const activate=key=>{selectCollection(key);document.getElementById('football-tab-'+key).focus({preventScroll:true});};
      b.onclick=()=>activate(b.dataset.collection);
      b.onkeydown=e=>{let key;if(e.key==='ArrowRight'||e.key==='ArrowLeft')key=b.dataset.collection==='national'?'ligamx':'national';else if(e.key==='Home')key='national';else if(e.key==='End')key='ligamx';if(key){e.preventDefault();activate(key);}};
    });
    const entry=document.querySelector('a.nav-mundial');
    if(entry){
      entry.href=location.pathname+location.search+'#catalog';
      entry.onclick=e=>{e.preventDefault();closeWorldcupMenu();scrollToCatalog();};
    }
  };
  renderSubfilters=function(){
    const wrap=document.getElementById('wcSubfilters');
    if(collection!=='ligamx'){base.renderSubfilters();return;}
    wrap.innerHTML=`<div class="football-filters"><label>${text('Temporada','Season','Temporada')}<select id="footballSeason"><option value="all">${text('Todas las temporadas','All seasons','Todas as temporadas')}</option><option>2026/27</option><option>2025/26</option><option value="tournament">${text('Edición de torneo','Tournament edition','Edição de torneio')}</option></select></label><label>${text('Versión','Version','Versão')}<select id="footballVersion"><option value="all">${text('Todas las versiones','All versions','Todas as versões')}</option>${[['home','Local','Home','Mandante'],['away','Visitante','Away','Visitante'],['third','Tercera equipación','Third kit','Terceiro uniforme'],['special','Ediciones especiales','Special editions','Edições especiais'],['training','Entrenamiento','Training','Treino'],['prematch','Prepartido','Pre-match','Pré-jogo']].map(([v,es,en,pt])=>`<option value="${v}">${text(es,en,pt)}</option>`).join('')}</select></label><button class="football-clear">${text('Limpiar filtros','Clear filters','Limpar filtros')}</button></div>`;
    document.getElementById('footballSeason').value=leagueSeason;
    document.getElementById('footballVersion').value=leagueVersion;
    document.getElementById('footballSeason').onchange=e=>{leagueSeason=e.target.value;renderProducts();};
    document.getElementById('footballVersion').onchange=e=>{leagueVersion=e.target.value;renderProducts();};
    wrap.querySelector('.football-clear').onclick=()=>{leagueSeason='all';leagueVersion='all';selectedTeam='';currentSearch='';document.getElementById('searchInput').value='';render();};
  };
  renderArchiveIntro=function(){
    if(collection!=='ligamx'){
      base.renderArchiveIntro();
      const index=document.getElementById('teamIndex');index.classList.add('football-country-index');
      index.querySelectorAll('.country-chip').forEach(button=>{
        button.type='button';
        if(button.dataset.toggleCountries){button.setAttribute('aria-expanded',String(showAllCountries));button.insertAdjacentHTML('afterbegin',icon('plus'));}
        else button.setAttribute('aria-pressed',String(button.dataset.team===selectedTeam));
        const badge=button.querySelector('.badge');
        if(badge&&!badge.querySelector('img'))badge.innerHTML=icon('globe');
        badge?.querySelector('img')?.addEventListener('error',()=>{badge.innerHTML=icon('globe');},{once:true});
      });
      const heads=document.querySelectorAll('.country-rankings .ranking-head');
      if(heads[0])heads[0].textContent=text('Selecciones destacadas','Featured national teams','Seleções em destaque');
      if(heads[1])heads[1].textContent=text('Explora más camisetas','Explore more jerseys','Explore mais camisas');
      return;
    }
    const index=document.getElementById('teamIndex');
    index.classList.remove('football-country-index');
    index.innerHTML=[{id:'all',name:text('Todos','All clubs','Todos')},...catalog.clubs].map(c=>`<button type="button" class="football-club-chip ${(c.id==='all'?!selectedTeam:selectedTeam===c.name)?'active':''}" data-club="${c.id}" aria-pressed="${c.id==='all'?!selectedTeam:selectedTeam===c.name}"><span class="football-club-icon">${c.id==='all'?icon('grid'):clubBadge(c)}</span><strong>${c.name}</strong><small class="football-club-count">${c.id==='all'?leagueProducts.length:leagueProducts.filter(p=>p.club===c.id).length}</small><span class="football-selection-mark">${icon('check')}</span></button>`).join('');
    index.querySelectorAll('[data-club]').forEach(b=>b.onclick=()=>{selectedTeam=b.dataset.club==='all'?'':clubById.get(b.dataset.club).name;renderArchiveIntro();renderProducts();});
  };
  renderProducts=function(){
    document.querySelectorAll('.team-intro').forEach(e=>e.remove());
    if(collection!=='ligamx'){
      base.renderProducts();
      const grid=document.getElementById('productsGrid');grid.classList.add('football-national-board');
      grid.querySelectorAll('.archive-side-ad,.team-sidebar').forEach(e=>e.remove());
      const selected=nationalProducts.find(p=>p.team===selectedTeam);
      const available=selected?KIT_SLOTS.filter(slot=>resolveKitSlot(selected,slot.key).images.length).length:0;
      const meta=document.querySelector('#kitSectionHead .team-mini-meta');
      if(meta)meta.textContent=selected?`${available} ${text('versiones','versions','versões')} · ${selected.season}`:`${nationalProducts.length} ${text('selecciones nacionales','national teams','seleções nacionais')}`;
      if(selected)document.getElementById('resultCount').textContent=available;
      grid.querySelectorAll('.more-label').forEach(e=>e.textContent=text('Ver todas','View all','Ver todas'));
      return;
    }
    const first=catalog.clubs.map(c=>leagueProducts.find(p=>p.club===c.id&&p.version==='home'&&p.season==='2026/27')||leagueProducts.find(p=>p.club===c.id));
    const ordered=[...new Map([...first,...leagueProducts].map(p=>[p.id,p])).values()];
    const list=ordered.filter(p=>(!selectedTeam||p.team===selectedTeam)&&(leagueSeason==='all'||(leagueSeason==='tournament'?!p.season:p.season===leagueSeason))&&(leagueVersion==='all'||leagueVersion===p.version)&&normalize(name(p)+' '+p.team+' '+p.season).includes(normalize(currentSearch)));
    document.getElementById('resultCount').textContent=list.length;
    document.getElementById('kitSectionHead').innerHTML=`<div><h2>${escape(selectedTeam||'Liga MX')} · ${text('Camisetas de clubes','Club jerseys','Camisas de clubes')}</h2><p>${text('Elige un modelo, revisa las fotos y agrega tus tallas a la misma cotización.','Choose a model, view the photos and add your sizes to the same quote.','Escolha um modelo, veja as fotos e adicione os tamanhos à mesma cotação.')}</p><div class="team-mini-meta">37 ${text('modelos','models','modelos')} · 185 MXN / ${text('pieza','piece','peça')}</div></div>`;
    const grid=document.getElementById('productsGrid');grid.className='products-grid football-league-grid';
    grid.innerHTML=list.length?list.map(p=>`<article class="football-kit"><button class="football-kit-photo" data-open-kit="${p.id}" aria-label="${escape(name(p))}"><img src="${p.thumbnail}" alt="${escape(name(p))}" width="640" height="640" loading="lazy"><span class="football-season">${p.season||text('Edición de torneo','Tournament edition','Edição de torneio')}</span><span class="football-photo-count">▧ 2</span></button><div class="football-kit-copy"><div class="football-kit-meta">LIGA MX / ${escape(label(p))}</div><h3>${p.team} <small>${p.season}</small></h3><p>${escape(label(p))} · ${text('Tallas','Sizes','Tamanhos')} ${p.sizes[0]}–${p.sizes.at(-1)}</p><div class="football-kit-bottom"><strong>$185 <small>MXN</small></strong><button class="football-kit-add" data-open-kit="${p.id}">${text('Elegir opciones +','Choose options +','Escolher opções +')}</button></div></div></article>`).join(''):`<div class="empty-state"><h3>${text('Sin resultados','No results','Sem resultados')}</h3><p>${text('Prueba con otro filtro','Try another filter','Tente outro filtro')}</p></div>`;
    grid.querySelectorAll('[data-open-kit]').forEach(b=>b.onclick=()=>openKitModal(b.dataset.openKit));
    grid.querySelectorAll('.football-kit').forEach(card=>{
      const p=byLeagueId.get(card.querySelector('[data-open-kit]').dataset.openKit);
      card.querySelector('.football-kit-meta').insertAdjacentHTML('afterbegin',`<img class="football-product-badge" src="/images/football-logos/${p.club}.png" alt="" width="25" height="25" loading="lazy" decoding="async">`);
    });
  };
  function openLeagueModal(p){
    closeLeagueModal();
    modalOpener=document.activeElement;
    currentKitProductId=p.id;currentVariantIdx=0;currentKitSlot=p.version;
    const modal=document.createElement('div');
    modal.className='wc-modal kit-detail-modal football-league-modal';
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','leagueModalTitle');
    modal.innerHTML=`<div class="kit-detail-card"><button class="wc-modal-close" aria-label="${text('Cerrar','Close','Fechar')}">×</button><div class="kit-detail-layout"><div class="kit-detail-media"><div class="kit-detail-hero"><a id="footballFullPhoto" href="${p.images[0]}" target="_blank" rel="noopener"><img id="footballMainPhoto" src="${p.images[0]}" alt="${escape(name(p))}"></a></div><div class="football-thumbnails">${p.images.map((src,i)=>`<button data-league-photo="${i}" class="${i?'':'active'}" aria-pressed="${!i}" aria-label="${text('Foto','Photo','Foto')} ${i+1}"><img src="${src}" alt="${text('Foto','Photo','Foto')} ${i+1}"></button>`).join('')}</div></div><div class="kit-detail-info"><div class="football-kit-meta">LIGA MX · ${p.team}</div><h2 id="leagueModalTitle">${escape(name(p))}</h2><p class="football-detail-note">${text('Las tallas corresponden a este modelo. Confirma disponibilidad y envío al consultar tu pedido.','Sizes are specific to this model. Confirm availability and shipping when requesting your order.','Os tamanhos correspondem a este modelo. Confirme disponibilidade e frete ao consultar o pedido.')}</p><div class="kit-edition-box"><div class="kit-edition-title">${text('Talla','Size','Tamanho')}</div><div class="size-options" id="sizeOpts">${p.sizes.map(s=>`<button class="size-opt ${s==='L'?'active':''}" data-size="${s}" aria-pressed="${s==='L'}">${s}</button>`).join('')}</div></div><div class="kit-edition-box"><label class="kit-edition-title" for="qtyInput">${text('Cantidad','Quantity','Quantidade')}</label><div class="qty-row"><button class="qty-btn-tiny" data-league-qty="-1">−</button><input type="number" id="qtyInput" min="1" max="9999" step="1" value="1" required><button class="qty-btn-tiny" data-league-qty="1">+</button></div></div><div class="kit-price-box" id="kitPriceBlock"></div><div class="kit-spec-table"><div class="kit-spec-row"><div class="label">${text('Temporada','Season','Temporada')}</div><div class="value">${p.season||text('Mundial de Clubes','Club World Cup','Mundial de Clubes')}</div></div><div class="kit-spec-row"><div class="label">${text('Versión','Version','Versão')}</div><div class="value">${escape(label(p))}</div></div></div><div class="kit-buy-row"><button class="btn btn-cart" id="footballAdd">${text('Agregar a cotización','Add to quote','Adicionar à cotação')}</button><button class="btn btn-wa-detail" id="footballViewQuote">${text('Agregar y ver cotización','Add and view quote','Adicionar e ver cotação')}</button></div></div></div></div>`;
    document.body.appendChild(modal);leagueModal=modal;document.body.style.overflow='hidden';
    modal.querySelector('.football-kit-meta').insertAdjacentHTML('afterbegin',`<img class="football-product-badge" src="/images/football-logos/${p.club}.png" alt="" width="25" height="25">`);
    const close=()=>closeLeagueModal();modal.querySelector('.wc-modal-close').onclick=close;
    modal.onclick=e=>{if(e.target===modal)close();};
    modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focusable=[...modal.querySelectorAll('a,button,input')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    modal.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{modal.querySelectorAll('[data-size]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b));});});
    modal.querySelectorAll('[data-league-photo]').forEach(b=>b.onclick=()=>{const src=p.images[Number(b.dataset.leaguePhoto)];modal.querySelector('#footballMainPhoto').src=src;modal.querySelector('#footballFullPhoto').href=src;modal.querySelectorAll('[data-league-photo]').forEach(el=>{el.classList.toggle('active',el===b);el.setAttribute('aria-pressed',String(el===b));});});
    modal.querySelector('#qtyInput').oninput=()=>updateKitModalPrice();
    modal.querySelectorAll('[data-league-qty]').forEach(b=>b.onclick=()=>{const input=modal.querySelector('#qtyInput');input.value=Math.min(9999,Math.max(1,(Number(input.value)||1)+Number(b.dataset.leagueQty)));updateKitModalPrice();});
    modal.querySelector('#footballAdd').onclick=()=>{if(wcAddToCart(p.id)){close();}};
    modal.querySelector('#footballViewQuote').onclick=()=>{if(wcAddToCart(p.id)){close();if(!document.getElementById('wcCartPanel').classList.contains('open'))toggleCartWC();}};
    updateKitModalPrice();modal.querySelector('.wc-modal-close').focus();
    const url=new URL(location.href);url.searchParams.set('collection','ligamx');url.hash='product/'+p.id;history.replaceState(null,'',url);
  }
  openKitModal=function(id,variantIdx,slotKey){
    const p=allKits.get(id);if(!p)return;
    const target=p.isLigaMX?'ligamx':'national';
    if(collection!==target)selectCollection(target,{writeUrl:true});
    if(p.isLigaMX)openLeagueModal(p);else{
      base.openKitModal(id,variantIdx,slotKey);
      const hint=document.querySelector('#playerNumberPanel .edition-hint');
      if(hint)hint.textContent=text('Indica el número deseado y confirma la personalización al solicitar la cotización.','Enter the requested number and confirm customization when asking for a quote.','Informe o número desejado e confirme a personalização ao solicitar a cotação.');
    }
  };
  updateKitModalPrice=function(){
    const p=byLeagueId.get(currentKitProductId);
    if(!p||!leagueModal){base.updateKitModalPrice();return;}
    const input=leagueModal.querySelector('#qtyInput');const valid=input.checkValidity();const qty=valid?Number(input.value):0;
    leagueModal.querySelector('#kitPriceBlock').innerHTML=`<div class="kit-price-row"><span class="kit-price-label">${text('Precio unitario','Unit price','Preço unitário')}</span><span class="kit-price-val">185 MXN</span></div><div class="kit-price-row kit-price-sub"><span class="kit-price-label">${text('Subtotal','Subtotal','Subtotal')} × ${valid?qty:'—'}</span><span class="kit-price-val">${valid?Math.round(p.priceMxn*qty).toLocaleString(currentLang==='en'?'en-US':'es-MX')+' MXN':'—'}</span></div>`;
  };
  wcAddToCart=function(id){
    const p=byLeagueId.get(id);if(!p){base.wcAddToCart(id);return true;}
    const input=leagueModal?.querySelector('#qtyInput');if(!input||!input.reportValidity())return false;
    const qty=Number(input.value);if(!Number.isInteger(qty))return false;
    const size=leagueModal.querySelector('[data-size].active')?.dataset.size;if(!p.sizes.includes(size))return false;
    const cart=getCart();const existing=cart.find(c=>c.productId===p.id&&c.size===size);
    if(existing)existing.qty+=qty;else cart.push(cartItem(p,size,qty));
    saveCartWC(cart);return true;
  };
  // Resolve catalog labels at display time, so a language change also updates saved league rows.
  const baseCartRenderer=renderCartItemsWC;
  renderCartItemsWC=function(items){
    const cart=(items||getCart()).map(item=>{const p=byLeagueId.get(item.productId);return p?{...item,name:name(p),name_en:p.name_en,variantLabel:label(p)}:item;});
    baseCartRenderer(cart);
  };
  addEventListener('storage',e=>{if(e.key==='huanyin_cart')updateCartWCUI();});
  addEventListener('popstate',()=>{const requested=new URLSearchParams(location.search).get('collection');selectCollection(requested,{writeUrl:false});});
  document.querySelectorAll('.lang-toggle button').forEach(b=>b.addEventListener('click',()=>{if(leagueModal){const id=currentKitProductId;openLeagueModal(byLeagueId.get(id));}}));
  migrateLeagueQuote();
  const initial=new URLSearchParams(location.search);
  const hash=window.FOOTBALL_INITIAL_HASH||location.hash;
  const initialProduct=hash.startsWith('#product/')?decodeURIComponent(hash.slice(9)):'';
  selectCollection(byLeagueId.has(initialProduct)?'ligamx':initial.get('collection'),{writeUrl:false});
  if(initial.get('club')&&clubById.has(initial.get('club'))){selectedTeam=clubById.get(initial.get('club')).name;renderArchiveIntro();renderProducts();}
  if(allKits.has(initialProduct))openKitModal(initialProduct);
  if(location.hash==='#catalog')addEventListener('load',scrollToCatalog,{once:true});
})();
