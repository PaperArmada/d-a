/* Service worker — cache-first for offline use. Bump CACHE on any asset change. */
const CACHE = 'dsa-viz-v5';

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
  './core/lessons.js',
  './core/app.js',
  './visualizations/binary-rep.js',
  './visualizations/float-rep.js',
  './visualizations/call-stack.js',
  './visualizations/state-machine.js',
  './visualizations/btree.js',
  './visualizations/lru-cache.js',
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
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        // cache same-origin successful responses for next time
        if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
