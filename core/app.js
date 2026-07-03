/* App — sidebar catalog, search, hash routing (#/id?params), theme toggle,
   mount/unmount of the selected visualization. */
(function (global) {
  'use strict';
  const { el, clear } = global.DOM;
  const Registry = global.Registry;

  let sidebar, main, current = null;
  let navItems = [];

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
      // [ and ] page through visualizations in catalog order
      if ((e.key === '[' || e.key === ']') && document.activeElement && document.activeElement.tagName !== 'INPUT') {
        const id = parseHash().id;
        if (!id) return;
        const flat = flatOrder();
        const i = flat.findIndex((d) => d.id === id);
        if (i < 0) return;
        const next = e.key === ']' ? flat[i + 1] : flat[i - 1];
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
    sidebar.appendChild(el('a.nav-item', { href: '#/glossary', dataset: { id: 'glossary' } }, '📖 Glossary'));

    let collapsed;
    try { collapsed = new Set(JSON.parse(localStorage.getItem('sf-collapsed') || '[]')); } catch (e) { collapsed = new Set(); }
    function saveCollapsed() { try { localStorage.setItem('sf-collapsed', JSON.stringify([...collapsed])); } catch (e) {} }

    let shown = 0;
    let lastWing = null;
    Registry.grouped().forEach(function (g) {
      if (g.category === 'Reference') return; // Glossary has its own pinned link above
      const items = g.items.filter(function (it) {
        if (!filter) return true;
        return (it.title + ' ' + it.blurb + ' ' + it.category).toLowerCase().indexOf(filter) >= 0;
      });
      if (!items.length) return;
      shown += items.length;
      const wing = Registry.wingOf(g.category);
      if (wing !== lastWing && wing !== 'Learn') {
        sidebar.appendChild(el('div.wing-title', wing));
        lastWing = wing;
      }
      const isCollapsed = collapsed.has(g.category) && !filter; // search always expands
      const title = el('div.cat__title.cat__title--btn', {
        role: 'button', tabindex: '0', 'aria-expanded': String(!isCollapsed),
        onclick: function () {
          if (collapsed.has(g.category)) collapsed.delete(g.category); else collapsed.add(g.category);
          saveCollapsed(); buildSidebar(filter);
        }
      }, [el('span.cat__caret', isCollapsed ? '▸' : '▾'), g.category + '  ', el('span.cat__count', String(items.length))]);
      const cat = el('div.cat', [title]);
      if (!isCollapsed) {
        items.forEach(function (it) {
          cat.appendChild(el('a.nav-item', { href: '#/' + it.id, dataset: { id: it.id } }, [
            it.title, el('span.nav-item__blurb', it.blurb)
          ]));
          navItems.push(cat.lastChild);
        });
      }
      sidebar.appendChild(cat);
    });

    if (!shown) sidebar.appendChild(el('div.hint', { style: { padding: '8px 12px' } }, 'No matches.'));
    highlightActive();
  }

  function highlightActive() {
    const id = parseHash().id;
    let active = null;
    navItems.forEach((n) => {
      const is = n.dataset.id === id;
      n.classList.toggle('active', is);
      if (is) active = n;
    });
    const pinned = sidebar && sidebar.querySelector('.nav-item[data-id="glossary"]');
    if (pinned) pinned.classList.toggle('active', id === 'glossary');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  // ---- Route -------------------------------------------------------------
  function route() {
    if (current && current.destroy) { try { current.destroy(); } catch (e) {} }
    current = null;
    clear(main);
    const { id, params } = parseHash();

    if (!id) { renderLanding(); highlightActive(); return; }
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
  function appendRelated(def) {
    const builtFrom = (def.madeOf || []).map((id) => Registry.get(id)).filter(Boolean);
    const usedBy = Registry.all().filter((d) => (d.madeOf || []).indexOf(def.id) >= 0);
    if (!builtFrom.length && !usedBy.length) return;
    const chips = (list) => list.map((d) => el('a.pill.related__chip', { href: '#/' + d.id }, d.title));
    const row = el('div.related');
    if (builtFrom.length) row.appendChild(el('div.related__group', [el('span.related__label', '⚗ built from'), ...chips(builtFrom)]));
    if (usedBy.length) row.appendChild(el('div.related__group', [el('span.related__label', '→ used by'), ...chips(usedBy)]));
    main.appendChild(row);
  }

  function appendPager(def) {
    const flat = flatOrder();
    const i = flat.findIndex((d) => d.id === def.id);
    if (i < 0) return;
    const prev = flat[i - 1], next = flat[i + 1];
    main.appendChild(el('div.pager', [
      prev ? el('a.pager__link.pager__prev', { href: '#/' + prev.id }, [
        el('span.pager__dir', '← previous'), el('span.pager__title', prev.title)]) : el('span'),
      el('span.pager__hint.mono.dim', '[ and ] keys work too'),
      next ? el('a.pager__link.pager__next', { href: '#/' + next.id }, [
        el('span.pager__dir', 'next →'), el('span.pager__title', next.title)]) : el('span')
    ]));
  }

  function renderLanding() {
    main.appendChild(el('div.main__header', [
      el('h2', 'Software Foundations — an interactive atlas of how software works'),
      el('p', 'Step through the concrete mechanisms of software 1.0: algorithms and data structures, ' +
              'design patterns, runtime internals, memory & number representation, protocols, and storage. ' +
              'Elements are atomic concepts; compounds are built from them. ' +
              'Keyboard: Space = play/pause, ← / → = step, “/” = search.')
    ]));
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
