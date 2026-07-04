/* App — sidebar catalog, search, hash routing (#/id?params), theme toggle,
   mount/unmount of the selected visualization. */
(function (global) {
  'use strict';
  const { el, clear } = global.DOM;
  const Registry = global.Registry;

  let sidebar, main, current = null;
  let navItems = [];
  const autoExpand = new Set();   // active page's category, opened transiently

  function init() {
    sidebar = document.getElementById('sidebar');
    main = document.getElementById('main');
    applyStoredTheme();
    if (isEmbed()) document.body.classList.add('embed');
    buildSidebar('');
    buildMobileChrome();
    sidebar.addEventListener('click', function (e) { if (e.target.closest('.nav-item')) closeSidebar(); });
    if (isEmbed()) {
      const full = el('a.embed-badge', { href: fullLink(), target: '_blank', rel: 'noopener' }, 'Open in DSA Visualizer ↗');
      document.body.appendChild(full);
    }
    window.addEventListener('hashchange', route);
    window.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement && document.activeElement.tagName !== 'INPUT') {
        const s = document.querySelector('.search'); if (s) { e.preventDefault(); s.focus(); }
      }
      if (e.key === 'Escape') closeSidebar();
      // [ and ] page through the site in climb order (see chainFor)
      if ((e.key === '[' || e.key === ']') && document.activeElement && document.activeElement.tagName !== 'INPUT') {
        const id = parseHash().id;
        const def = id && Registry.get(id);
        if (!def) return;
        const chain = chainFor(def);
        if (!chain) return;
        const i = chain.list.findIndex((d) => d.id === id);
        if (i < 0) return;
        const next = e.key === ']' ? chain.list[i + 1] : chain.list[i - 1];
        if (next) location.hash = '#/' + next.id;
      }
    });
    route();
  }

  function flatOrder() {
    const out = [];
    Registry.grouped().forEach((g) => g.items.forEach((it) => out.push(it)));
    return out;
  }

  /* Which linear sequence does prev/next walk for this page?
     Catalog entries follow the Ascent chain (docs/ASCENT.md P4): elements
     first, and never a concept before its ingredients. Lessons page among
     lessons; Reference pages (glossary, ascent, index) don't page. */
  function chainFor(def) {
    if (def.category === 'Reference') return null;
    if (def.category === 'Lessons') {
      const g = Registry.grouped().find((x) => x.category === 'Lessons');
      return { list: g ? g.items : [], label: 'lesson' };
    }
    if (global.Ascent) {
      const list = global.Ascent.order();
      if (list.some((d) => d.id === def.id)) return { list, label: 'climb' };
    }
    return { list: flatOrder(), label: '' };
  }

  function isEmbed() {
    return /(?:^|[?&])embed=1(?:&|$)/.test(location.search) || parseHash().params.embed === '1';
  }

  // ---- Mobile drawer -----------------------------------------------------
  let overlay, menuBtn;
  function buildMobileChrome() {
    if (isEmbed()) return;
    menuBtn = el('button.mobile-menu-btn', { 'aria-label': 'Open menu', onclick: openSidebar }, '☰');
    overlay = el('div.sidebar-overlay', { onclick: closeSidebar });
    document.body.appendChild(menuBtn);
    document.body.appendChild(overlay);
  }
  function openSidebar() { sidebar.classList.add('open'); if (overlay) overlay.classList.add('show'); }
  function closeSidebar() { sidebar.classList.remove('open'); if (overlay) overlay.classList.remove('show'); }

  function fullLink() {
    const { id, params } = parseHash();
    const p = Object.assign({}, params); delete p.embed;
    return location.origin + location.pathname + (id ? buildLink(id, p) : '#/');
  }

  // ---- Theme -------------------------------------------------------------
  function applyStoredTheme() {
    const t = localStorage.getItem('dsa-theme');
    if (t === 'light') document.body.classList.add('light');
  }
  function toggleTheme() {
    const light = document.body.classList.toggle('light');
    localStorage.setItem('dsa-theme', light ? 'light' : 'dark');
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = light ? '🌙' : '☀️';
  }

  // ---- Routing helpers ---------------------------------------------------
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    if (!h) return { id: null, params: {} };
    const qi = h.indexOf('?');
    if (qi < 0) return { id: decodeURIComponent(h), params: {} };
    const id = decodeURIComponent(h.slice(0, qi));
    const params = {};
    h.slice(qi + 1).split('&').forEach(function (kv) {
      if (!kv) return;
      const eq = kv.indexOf('=');
      const k = decodeURIComponent(eq < 0 ? kv : kv.slice(0, eq));
      const v = eq < 0 ? '' : decodeURIComponent(kv.slice(eq + 1));
      params[k] = v;
    });
    return { id: id, params: params };
  }
  function buildLink(id, params) {
    let s = '#/' + encodeURIComponent(id);
    const keys = Object.keys(params || {});
    if (keys.length) {
      s += '?' + keys.map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    }
    return s;
  }

  // Expose a small router API for visualizations (e.g. copy-link buttons).
  global.Router = {
    buildLink: buildLink,
    // Update the address bar silently (no re-mount), for shareable state.
    setParams: function (params) {
      const id = parseHash().id;
      if (!id) return;
      history.replaceState(null, '', location.pathname + location.search + buildLink(id, params));
    },
    absoluteLink: function (id, params) {
      return location.origin + location.pathname + location.search + buildLink(id, params);
    }
  };

  // ---- Sidebar -----------------------------------------------------------
  // Two views: the Climb (primary — the Ascent's tier order) and Categories
  // (secondary index). See docs/ASCENT.md.
  function navView() { return localStorage.getItem('sf-nav-view') === 'cats' ? 'cats' : 'climb'; }
  function setNavView(v) { try { localStorage.setItem('sf-nav-view', v); } catch (e) {} }

  function buildSidebar(filter) {
    clear(sidebar);
    navItems = [];
    sidebar.appendChild(el('div.sidebar__brand', [
      el('h1.brand-mark', 'Software'), el('span', 'Foundations'),
      el('span.spacer'),
      el('button.icon-btn#theme-btn', {
        title: 'Toggle light / dark theme', 'aria-label': 'Toggle theme', onclick: toggleTheme
      }, document.body.classList.contains('light') ? '🌙' : '☀️')
    ]));

    const search = el('input.search', {
      type: 'text', placeholder: 'Search visualizations…  ( / )', value: filter, 'aria-label': 'Search'
    });
    search.addEventListener('input', () => buildSidebar(search.value.trim().toLowerCase()));
    sidebar.appendChild(search);
    if (filter) setTimeout(() => { search.focus(); search.selectionStart = search.value.length; }, 0);

    sidebar.appendChild(el('a.nav-item', { href: '#/' }, '🏠 Home'));
    sidebar.appendChild(el('a.nav-item', { href: '#/ascent', dataset: { id: 'ascent' } }, '🧗 The Ascent'));
    sidebar.appendChild(el('a.nav-item', { href: '#/glossary', dataset: { id: 'glossary' } }, '📖 Glossary'));

    const view = navView();
    sidebar.appendChild(el('div.nav-tabs', { role: 'tablist' }, [
      el('button.nav-tab' + (view === 'climb' ? '.active' : ''), {
        role: 'tab', 'aria-selected': String(view === 'climb'),
        onclick: function () { setNavView('climb'); buildSidebar(filter); }
      }, '🧗 The Climb'),
      el('button.nav-tab' + (view === 'cats' ? '.active' : ''), {
        role: 'tab', 'aria-selected': String(view === 'cats'),
        onclick: function () { setNavView('cats'); buildSidebar(filter); }
      }, '🗂 Categories')
    ]));

    // Groups start COLLAPSED; users expand what they want (persisted),
    // and the active page's group auto-expands transiently.
    let expanded;
    try { expanded = new Set(JSON.parse(localStorage.getItem('sf-expanded') || '[]')); } catch (e) { expanded = new Set(); }
    function saveExpanded() { try { localStorage.setItem('sf-expanded', JSON.stringify([...expanded])); } catch (e) {} }

    const matches = (it) => !filter ||
      (it.title + ' ' + it.blurb + ' ' + it.category).toLowerCase().indexOf(filter) >= 0;
    let shown = 0;

    // Shared collapsible group. `key` is the persisted identity ('tier:2' in
    // climb view, the category name in categories view).
    function addGroup(key, label, items, withTicks) {
      shown += items.length;
      const seen = (withTicks && global.Ascent) ? global.Ascent.visitedSet() : null;
      const isCollapsed = !expanded.has(key) && !autoExpand.has(key) && !filter;
      const title = el('div.cat__title.cat__title--btn', {
        role: 'button', tabindex: '0', 'aria-expanded': String(!isCollapsed),
        onclick: function () {
          if (isCollapsed) expanded.add(key);
          else { expanded.delete(key); autoExpand.delete(key); }
          saveExpanded(); buildSidebar(filter);
        }
      }, [el('span.cat__caret', isCollapsed ? '▸' : '▾'), label + '  ', el('span.cat__count', String(items.length))]);
      const cat = el('div.cat', [title]);
      if (!isCollapsed) {
        items.forEach(function (it) {
          cat.appendChild(el('a.nav-item', { href: '#/' + it.id, dataset: { id: it.id } }, [
            it.title,
            (seen && seen.has(it.id)) ? el('span.nav-item__tick', ' ✓') : null,
            el('span.nav-item__blurb', it.blurb)
          ]));
          navItems.push(cat.lastChild);
        });
      }
      sidebar.appendChild(cat);
    }

    if (view === 'climb' && global.Ascent) {
      const lessons = (Registry.grouped().find((g) => g.category === 'Lessons') || { items: [] }).items.filter(matches);
      if (lessons.length) addGroup('Lessons', '🎓 Guided lessons', lessons, false);
      global.Ascent.computeTiers().bands.forEach(function (band, i) {
        const items = band.filter(matches);
        if (items.length) addGroup('tier:' + i, 'Tier ' + i + ' · ' + global.Ascent.tierName(i).split(' — ')[0], items, true);
      });
    } else {
      let lastWing = null;
      Registry.grouped().forEach(function (g) {
        if (g.category === 'Reference') return; // Glossary/Ascent have pinned links above
        const items = g.items.filter(matches);
        if (!items.length) return;
        const wing = Registry.wingOf(g.category);
        if (wing !== lastWing && wing !== 'Learn') {
          sidebar.appendChild(el('div.wing-title', wing));
          lastWing = wing;
        }
        addGroup(g.category, g.category, items, false);
      });
    }

    if (!shown) sidebar.appendChild(el('div.hint', { style: { padding: '8px 12px' } }, 'No matches.'));
    highlightActive();
  }

  // Which sidebar group holds this page, in the current view?
  function groupKeyFor(id) {
    const def = Registry.get(id);
    if (!def || def.category === 'Reference') return null;
    if (navView() === 'climb' && global.Ascent) {
      if (def.category === 'Lessons') return 'Lessons';
      const t = global.Ascent.computeTiers().tier[def.id];
      return t == null ? null : 'tier:' + t;
    }
    return def.category;
  }

  function highlightActive(noRebuild) {
    const id = parseHash().id;
    let active = null;
    navItems.forEach((n) => {
      const is = n.dataset.id === id;
      n.classList.toggle('active', is);
      if (is) active = n;
    });
    ['glossary', 'ascent'].forEach(function (pid) {
      const pinned = sidebar && sidebar.querySelector('.nav-item[data-id="' + pid + '"]');
      if (pinned) pinned.classList.toggle('active', id === pid);
    });
    // If the active page lives in a collapsed group, open that group
    // (transiently) and rebuild once so the highlight is visible.
    if (!active && !noRebuild && id) {
      const key = groupKeyFor(id);
      if (key && !autoExpand.has(key)) {
        autoExpand.clear();
        autoExpand.add(key);
        const search = sidebar && sidebar.querySelector('.search');
        buildSidebar(search ? search.value.trim().toLowerCase() : '');
        return;
      }
    }
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  // ---- Route -------------------------------------------------------------
  function route() {
    if (current && current.destroy) { try { current.destroy(); } catch (e) {} }
    current = null;
    clear(main);
    const { id, params } = parseHash();

    if (!id) { renderLanding(); highlightActive(); return; }
    if (id === 'index') { renderIndex(); highlightActive(); return; }
    const def = Registry.get(id);
    if (!def) { renderLanding(); highlightActive(); return; }

    const wing = Registry.wingOf(def.category);
    main.appendChild(el('div.main__header', [
      el('div.crumbs', [
        el('a', { href: '#/' }, 'Home'), el('span.crumbs__sep', '›'),
        el('span', wing === 'Learn' ? 'Learn' : wing), el('span.crumbs__sep', '›'),
        el('span', def.category), el('span.crumbs__sep', '›'),
        el('span.crumbs__here', def.title)
      ]),
      el('h2', def.title),
      el('p', { html: window.Glossary ? window.Glossary.linkify(def.longDesc || def.blurb) : (def.longDesc || def.blurb) })
    ]));
    // Progress memory: the Ascent ticks pages you've opened.
    try {
      const seen = new Set(JSON.parse(localStorage.getItem('sf-visited') || '[]'));
      if (!seen.has(id)) { seen.add(id); localStorage.setItem('sf-visited', JSON.stringify([...seen])); }
    } catch (e) {}
    const host = el('div.viz-host');
    main.appendChild(host);
    try {
      current = def.create(host, params) || null;
    } catch (e) {
      host.appendChild(el('div.status', 'Error creating visualization: ' + e.message));
      console.error(e);
    }
    appendRelated(def);
    appendPager(def);
    highlightActive();
    main.scrollTop = 0;
  }

  // "Built from" (madeOf) + "Used by" (reverse madeOf) concept links.
  // Ingredients you haven't opened yet are marked — a gentle nudge back down
  // the mountain before pressing on.
  function appendRelated(def) {
    const builtFrom = (def.madeOf || []).map((id) => Registry.get(id)).filter(Boolean);
    const usedBy = Registry.all().filter((d) => (d.madeOf || []).indexOf(def.id) >= 0);
    if (!builtFrom.length && !usedBy.length) return;
    const seen = global.Ascent ? global.Ascent.visitedSet() : new Set();
    const chips = (list, markUnseen) => list.map((d) => {
      const unseen = markUnseen && !seen.has(d.id);
      return el('a.pill.related__chip' + (unseen ? '.related__chip--unseen' : ''), {
        href: '#/' + d.id, title: unseen ? 'You haven\'t visited this ingredient yet' : ''
      }, d.title);
    });
    const row = el('div.related');
    if (builtFrom.length) row.appendChild(el('div.related__group', [el('span.related__label', '⚗ built from'), ...chips(builtFrom, true)]));
    if (usedBy.length) row.appendChild(el('div.related__group', [el('span.related__label', '→ used by'), ...chips(usedBy, false)]));
    main.appendChild(row);
  }

  function appendPager(def) {
    const chain = chainFor(def);
    if (!chain) return;
    const i = chain.list.findIndex((d) => d.id === def.id);
    if (i < 0) return;
    const prev = chain.list[i - 1], next = chain.list[i + 1];
    const mid = chain.label === 'climb'
      ? '⛰ ' + (i + 1) + ' / ' + chain.list.length + ' on the climb · [ and ] keys'
      : '[ and ] keys work too';
    main.appendChild(el('div.pager', [
      prev ? el('a.pager__link.pager__prev', { href: '#/' + prev.id }, [
        el('span.pager__dir', chain.label === 'climb' ? '← back down' : '← previous'), el('span.pager__title', prev.title)]) : el('span'),
      el('span.pager__hint.mono.dim', mid),
      next ? el('a.pager__link.pager__next', { href: '#/' + next.id }, [
        el('span.pager__dir', chain.label === 'climb' ? 'climb on →' : 'next →'), el('span.pager__title', next.title)]) : el('span')
    ]));
  }

  // The landing leads with the climb (docs/ASCENT.md): hero, then the full
  // tiered ascent. The flat category grid lives at #/index as a secondary view.
  function renderLanding() {
    const nxt = global.Ascent ? global.Ascent.firstUnvisited() : null;
    const started = global.Ascent && global.Ascent.visitedSet().size > 0;
    main.appendChild(el('div.main__header', [
      el('h2', 'Software Foundations — the climb from bits to systems'),
      el('p', 'An interactive atlas of how software works, ordered like a mountain: atomic elements at ' +
              'base camp, and every higher concept built only from ones you\'ve already met. ' +
              'Climb in order, or jump anywhere — each page links its ingredients. ' +
              'Keyboard: Space = play/pause, ← / → = step, [ / ] = move along the climb, “/” = search.'),
      el('div.hero-ctas', [
        nxt ? el('a.btn.btn--primary.hero-cta', { href: '#/' + nxt.id },
                 (started ? '⛏ Continue the climb — ' : '🧗 Start the climb — ') + nxt.title)
            : el('a.btn.btn--primary.hero-cta', { href: '#/ascent' }, '🏔 Summit reached — revisit the map'),
        el('a.btn.hero-cta', { href: '#/lesson-sorting' }, '🎓 Guided lessons'),
        el('a.btn.btn--ghost.hero-cta', { href: '#/glossary' }, '📖 Glossary'),
        el('a.btn.btn--ghost.hero-cta', { href: '#/index' }, '🗂 Index by category')
      ])
    ]));
    if (global.Ascent) global.Ascent.renderClimb(main, { cta: false });
    else renderIndex(true);
  }

  // Secondary index: the whole catalog as a flat grid, grouped by category.
  function renderIndex(bare) {
    if (!bare) {
      main.appendChild(el('div.main__header', [
        el('div.crumbs', [
          el('a', { href: '#/' }, 'Home'), el('span.crumbs__sep', '›'),
          el('span.crumbs__here', 'Index by category')
        ]),
        el('h2', 'Index by category'),
        el('p', 'Every page, grouped by topic — the secondary way around the site.'),
        el('p', [el('a', { href: '#/' }, '← back to the climb')])
      ]));
    }
    let lastWing = null;
    Registry.grouped().forEach(function (g) {
      const wing = Registry.wingOf(g.category);
      if (wing !== lastWing && wing !== 'Learn') {
        main.appendChild(el('h2.landing-wing', wing));
        lastWing = wing;
      }
      main.appendChild(el('h3', { style: { margin: '26px 0 4px', fontSize: '15px', color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '1px' } }, g.category));
      const grid = el('div.landing__grid');
      g.items.forEach(function (it) {
        grid.appendChild(el('div.card', { onclick: () => { location.hash = '#/' + it.id; } }, [
          el('span.card__tag', it.category), el('h3', it.title), el('p', it.blurb),
          it.madeOf ? el('p.card__madeof', ['⚗ compound: ',
            it.madeOf.map((m) => (Registry.get(m) || { title: m }).title).join(' + ')]) : null
        ]));
      });
      main.appendChild(grid);
    });
  }

  global.addEventListener('DOMContentLoaded', init);
})(window);
