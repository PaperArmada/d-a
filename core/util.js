/* Shared small utilities. */
(function (global) {
  'use strict';

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function randomArray(n, min, max) {
    min = min == null ? 5 : min;
    max = max == null ? 99 : max;
    const a = [];
    for (let i = 0; i < n; i++) a.push(randInt(min, max));
    return a;
  }

  // Distinct random values (useful for search / BST)
  function distinctArray(n, min, max) {
    min = min == null ? 1 : min;
    max = max == null ? 99 : max;
    const pool = [];
    for (let v = min; v <= max; v++) pool.push(v);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(n, pool.length));
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function parseList(str, fallback) {
    if (!str) return fallback;
    const nums = str.split(/[,\s]+/).map(function (s) { return parseInt(s, 10); })
      .filter(function (n) { return !isNaN(n); });
    return nums.length ? nums : fallback;
  }

  global.Util = { randInt, randomArray, distinctArray, clone, parseList };
})(window);
