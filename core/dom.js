/* Tiny DOM helper — no framework needed.
   el('div.class#id', {attrs}, [children|text]) → HTMLElement */
(function (global) {
  'use strict';

  function el(tag, attrs, children) {
    // Parse "tag.cls1.cls2#id"
    let id = null;
    const classes = [];
    let name = 'div';
    const m = tag.match(/^([a-zA-Z0-9]+)?([.#][^]*)?$/);
    if (m) {
      name = m[1] || 'div';
      const rest = m[2] || '';
      rest.split(/(?=[.#])/).forEach(function (tok) {
        if (!tok) return;
        if (tok[0] === '.') classes.push(tok.slice(1));
        else if (tok[0] === '#') id = tok.slice(1);
      });
    }
    const node = document.createElement(name);
    if (id) node.id = id;
    if (classes.length) node.className = classes.join(' ');

    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs) && !(attrs instanceof Node)) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') node.className += (node.className ? ' ' : '') + v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'dataset') {
          Object.assign(node.dataset, v);
        } else {
          node.setAttribute(k, v);
        }
      }
    } else if (attrs != null) {
      // attrs is actually children
      children = attrs;
    }

    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    if (children == null) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c))
        : c);
    });
  }

  // SVG element helper (namespaced)
  function svgEl(name, attrs, children) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    if (attrs) for (const k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    appendChildren(node, children);
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  global.DOM = { el: el, svgEl: svgEl, clear: clear };
})(window);
