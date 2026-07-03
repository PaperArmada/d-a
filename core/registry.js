/* Registry — visualization modules register themselves here.
   Each entry: { id, title, category, blurb, create(container) -> {destroy?} } */
(function (global) {
  'use strict';
  const entries = [];
  const byId = {};

  const CATEGORY_ORDER = [
    'Lessons',
    // Software Foundations wing
    'The Machine', 'Runtime', 'Design Patterns', 'Data & Storage', 'Systems', 'Craft',
    // Algorithms & Data Structures wing
    'Sorting', 'Searching', 'Data Structures', 'Trees', 'Heaps',
    'Hashing', 'Graphs', 'Recursion & DP'
  ];

  const WING_OF = {
    'Lessons': 'Learn',
    'The Machine': 'Software Foundations', 'Runtime': 'Software Foundations',
    'Design Patterns': 'Software Foundations', 'Data & Storage': 'Software Foundations',
    'Systems': 'Software Foundations', 'Craft': 'Software Foundations',
    'Sorting': 'Algorithms & Data Structures', 'Searching': 'Algorithms & Data Structures',
    'Data Structures': 'Algorithms & Data Structures', 'Trees': 'Algorithms & Data Structures',
    'Heaps': 'Algorithms & Data Structures', 'Hashing': 'Algorithms & Data Structures',
    'Graphs': 'Algorithms & Data Structures', 'Recursion & DP': 'Algorithms & Data Structures'
  };
  function wingOf(category) { return WING_OF[category] || 'Software Foundations'; }

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

  global.Registry = { register, all, get, grouped, wingOf };
})(window);
