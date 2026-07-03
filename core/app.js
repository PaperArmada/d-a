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
    });
    route();
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

    let shown = 0;
    let lastWing = null;
    Registry.grouped().forEach(function (g) {
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
      const cat = el('div.cat', [el('div.cat__title', g.category)]);
      items.forEach(function (it) {
        cat.appendChild(el('a.nav-item', { href: '#/' + it.id, dataset: { id: it.id } }, [
          it.title, el('span.nav-item__blurb', it.blurb)
        ]));
        navItems.push(cat.lastChild);
      });
      sidebar.appendChild(cat);
    });

    if (!shown) sidebar.appendChild(el('div.hint', { style: { padding: '8px 12px' } }, 'No matches.'));
    highlightActive();
  }

  function highlightActive() {
    const id = parseHash().id;
    navItems.forEach((n) => n.classList.toggle('active', n.dataset.id === id));
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

    main.appendChild(el('div.main__header', [
      el('h2', def.title),
      el('p', def.longDesc || def.blurb)
    ]));
    const host = el('div.viz-host');
    main.appendChild(host);
    try {
      current = def.create(host, params) || null;
    } catch (e) {
      host.appendChild(el('div.status', 'Error creating visualization: ' + e.message));
      console.error(e);
    }
    highlightActive();
    main.scrollTop = 0;
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
