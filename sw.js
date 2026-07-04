/* Service worker — NETWORK-FIRST with cache fallback.
   Online users always get the latest deploy immediately (no double-refresh
   dance); the cache exists purely so the app keeps working offline.
   Bump CACHE on any asset change. */
const CACHE = 'dsa-viz-v14';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './styles/main.css',
  './core/dom.js',
  './core/util.js',
  './core/widgets.js',
  './core/player.js',
  './core/scaffold.js',
  './core/registry.js',
  './core/share.js',
  './core/glossary.js',
  './core/ascent.js',
  './core/feedback.js',
  './core/lessons.js',
  './core/app.js',
  './visualizations/binary-rep.js',
  './visualizations/float-rep.js',
  './visualizations/call-stack.js',
  './visualizations/state-machine.js',
  './visualizations/event-loop.js',
  './visualizations/race-condition.js',
  './visualizations/observer.js',
  './visualizations/strategy.js',
  './visualizations/command-undo.js',
  './visualizations/complexity-plot.js',
  './visualizations/btree.js',
  './visualizations/regex-nfa.js',
  './visualizations/transactions.js',
  './visualizations/lru-cache.js',
  './visualizations/tcp.js',
  './visualizations/circuit-breaker.js',
  './visualizations/token-bucket.js',
  './visualizations/git-dag.js',
  './visualizations/utf8.js',
  './visualizations/stack-heap.js',
  './visualizations/bitwise.js',
  './visualizations/gc-mark-sweep.js',
  './visualizations/deadlock.js',
  './visualizations/http-lifecycle.js',
  './visualizations/consistent-hashing.js',
  './visualizations/index-race.js',
  './visualizations/myers-diff.js',
  './visualizations/coupling.js',
  './visualizations/invariants.js',
  './visualizations/idempotency.js',
  './visualizations/sorting.js',
  './visualizations/sort-race.js',
  './visualizations/searching.js',
  './visualizations/stack-queue.js',
  './visualizations/linked-list.js',
  './visualizations/bst.js',
  './visualizations/avl.js',
  './visualizations/trie.js',
  './visualizations/heap.js',
  './visualizations/hash-table.js',
  './visualizations/graph-traversal.js',
  './visualizations/dijkstra.js',
  './visualizations/union-find.js',
  './visualizations/graph-builder.js',
  './visualizations/pathfinding.js',
  './visualizations/path-race.js',
  './visualizations/recursion.js',
  './visualizations/dp-lcs.js',
  './visualizations/knapsack.js',
  './visualizations/edit-distance.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then((hit) => hit || caches.match('./index.html'))
    )
  );
});
