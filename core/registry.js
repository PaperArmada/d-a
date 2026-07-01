/* Registry — visualization modules register themselves here.
   Each entry: { id, title, category, blurb, create(container) -> {destroy?} } */
(function (global) {
  'use strict';
  const entries = [];
  const byId = {};

  const CATEGORY_ORDER = [
    'Lessons', 'Sorting', 'Searching', 'Data Structures', 'Trees', 'Heaps',
    'Hashing', 'Graphs', 'Recursion & DP'
  ];

  function register(def) {
    if (!def || !def.id) throw new Error('viz needs an id');
    if (byId[def.id]) throw new Error('duplicate viz id: ' + def.id);
    byId[def.id] = def;
    entries.push(def);
  }

  function all() { return entries.slice(); }
  function get(id) { return byId[id]; }

  function grouped() {
    const map = {};
    entries.forEach(function (e) {
      (map[e.category] = map[e.category] || []).push(e);
    });
    const order = CATEGORY_ORDER.filter((c) => map[c]);
    Object.keys(map).forEach((c) => { if (order.indexOf(c) < 0) order.push(c); });
    return order.map((c) => ({ category: c, items: map[c] }));
  }

  global.Registry = { register, all, get, grouped };
})(window);
