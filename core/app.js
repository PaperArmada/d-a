/* App — builds the sidebar catalog, handles routing (hash), mounts/unmounts
   the selected visualization. */
(function (global) {
  'use strict';
  const { el, clear } = global.DOM;
  const Registry = global.Registry;

  let sidebar, main, current = null, activeNav = null;
  let navItems = [];

  function init() {
    sidebar = document.getElementById('sidebar');
    main = document.getElementById('main');
    buildSidebar('');
    window.addEventListener('hashchange', route);
    route();
  }

  function buildSidebar(filter) {
    clear(sidebar);
    navItems = [];
    sidebar.appendChild(el('div.sidebar__brand', [
      el('h1', 'DSA'), el('span', 'Visualizer')
    ]));

    const search = el('input.search', {
      type: 'text', placeholder: 'Search visualizations…', value: filter
    });
    search.addEventListener('input', () => buildSidebar(search.value.trim().toLowerCase()));
    sidebar.appendChild(search);
    // keep focus after rebuild
    if (filter) { setTimeout(() => { search.focus(); search.selectionStart = search.value.length; }, 0); }

    sidebar.appendChild(el('a.nav-item', { href: '#/' }, '🏠 Home'));

    const groups = Registry.grouped();
    let shown = 0;
    groups.forEach(function (g) {
      const items = g.items.filter(function (it) {
        if (!filter) return true;
        return (it.title + ' ' + it.blurb + ' ' + it.category).toLowerCase().indexOf(filter) >= 0;
      });
      if (!items.length) return;
      shown += items.length;
      const cat = el('div.cat', [el('div.cat__title', g.category)]);
      items.forEach(function (it) {
        const node = el('a.nav-item', { href: '#/' + it.id, dataset: { id: it.id } }, [
          it.title,
          el('span.nav-item__blurb', it.blurb)
        ]);
        navItems.push(node);
        cat.appendChild(node);
      });
      sidebar.appendChild(cat);
    });

    if (!shown) sidebar.appendChild(el('div.hint', { style: { padding: '8px 12px' } }, 'No matches.'));
    highlightActive();
  }

  function highlightActive() {
    const id = currentId();
    navItems.forEach(function (n) {
      n.classList.toggle('active', n.dataset.id === id);
    });
  }

  function currentId() {
    const h = location.hash.replace(/^#\/?/, '');
    return h || null;
  }

  function route() {
    if (current && current.destroy) { try { current.destroy(); } catch (e) {} }
    current = null;
    clear(main);
    const id = currentId();

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
      current = def.create(host) || null;
    } catch (e) {
      host.appendChild(el('div.status', 'Error creating visualization: ' + e.message));
      console.error(e);
    }
    highlightActive();
    main.scrollTop = 0;
  }

  function renderLanding() {
    main.appendChild(el('div.main__header', [
      el('h2', 'Data Structures & Algorithms — Interactive Visualizations'),
      el('p', 'A modular, dependency-free collection. Pick a topic from the sidebar or a card below. ' +
              'Everything runs client-side with plain HTML/CSS/JS — step through algorithms, tweak inputs, ' +
              'and build intuition.')
    ]));

    Registry.grouped().forEach(function (g) {
      main.appendChild(el('h3', { style: { margin: '26px 0 4px', fontSize: '15px', color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '1px' } }, g.category));
      const grid = el('div.landing__grid');
      g.items.forEach(function (it) {
        grid.appendChild(el('div.card', { onclick: () => { location.hash = '#/' + it.id; } }, [
          el('span.card__tag', it.category),
          el('h3', it.title),
          el('p', it.blurb)
        ]));
      });
      main.appendChild(grid);
    });
  }

  global.addEventListener('DOMContentLoaded', init);
})(window);
