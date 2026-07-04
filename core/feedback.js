/* Feedback — a floating widget + local inbox, ported from the React version
   in PaperArmada/common-architectures to this site's zero-dependency stack.

   Design rules preserved from the original (see its "design notes"):
   - HONEST LABELING: the primary button never says "Send" unless a hosted
     form endpoint is configured — until then it's "Save note" and the panel
     carries a lock-line saying notes stay in this browser.
   - The local copy is saved on EVERY path (form POST and GitHub issue too),
     so the inbox is always the superset.
   - Storage changes broadcast an event (plus the native cross-tab 'storage'
     event), so the button counter and inbox never go stale.
   - Every failure mode (private-mode storage, clipboard denial, endpoint
     errors) degrades without crashing. */
(function (global) {
  'use strict';
  const { el, clear } = global.DOM;

  // ---- Delivery configuration ---------------------------------------------
  const GITHUB_REPO = 'PaperArmada/d-a';
  /* Hosted form endpoint (Formspree/Tally/Basin…). When set, the widget POSTs
     {page, path, message} there and the button says "Send". Leave empty to
     keep the honest local-only mode. */
  const FEEDBACK_ENDPOINT = '';

  // ---- Storage layer -------------------------------------------------------
  const KEY = 'sf-feedback';
  const EVT = 'sf-feedback-change';

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    window.dispatchEvent(new Event(EVT));
  }
  function add(entry) {
    const list = getAll();
    list.push({
      id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      ts: Date.now(), path: entry.path, page: entry.page, text: entry.text
    });
    save(list);
  }
  function remove(id) { save(getAll().filter((f) => f.id !== id)); }
  function clearAll() { save([]); }

  // ---- Helpers --------------------------------------------------------------
  function pageInfo() {
    const h = location.hash.replace(/^#\/?/, '');
    const id = decodeURIComponent(h.split('?')[0]);
    if (!id) return { path: '#/', page: 'Home' };
    const def = global.Registry.get(id);
    return { path: '#/' + id, page: def ? def.title : (id === 'index' ? 'Index by category' : id) };
  }
  function fmt(ts) {
    try { return new Date(ts).toLocaleString(); } catch (e) { return String(ts); }
  }
  function asMarkdown(list) {
    const by = {};
    list.slice().sort((a, b) => b.ts - a.ts).forEach((f) => { (by[f.page] = by[f.page] || []).push(f); });
    return Object.keys(by).map((page) =>
      ['## ' + page].concat(by[page].map((f) => '- [' + fmt(f.ts) + '] ' + f.text)).join('\n')
    ).join('\n\n');
  }
  function issueUrl(title, body) {
    return 'https://github.com/' + GITHUB_REPO + '/issues/new?title=' + encodeURIComponent(title) +
      '&body=' + encodeURIComponent(body);
  }

  // ---- Floating widget -------------------------------------------------------
  function buildWidget() {
    // No FAB in embed mode — embeds should stay chrome-free.
    if (/(?:^|[?&])embed=1(?:&|$)/.test(location.search)) return;

    let open = false;
    const badge = el('span.fab__count');
    const fab = el('button.fab', { 'aria-label': 'Leave feedback', 'aria-expanded': 'false' }, ['💬 Feedback', badge]);
    const where = el('span.fb-panel__page');
    const ta = el('textarea.fb-panel__text', {
      rows: '4', placeholder: 'What worked, what confused you, what’s missing…'
    });
    const hasEndpoint = !!FEEDBACK_ENDPOINT;
    const primary = el('button.btn.btn--primary.fb-panel__save', hasEndpoint ? 'Send' : 'Save note');
    const ghBtn = el('button.btn.fb-panel__gh', 'Open a GitHub issue ↗');
    const inboxLink = el('a.fb-panel__inbox', { href: '#/feedback' }, '');
    const err = el('p.fb-panel__err');
    const panel = el('div.fb-panel', [
      el('div.fb-panel__head', [
        el('span.fb-panel__title', 'Leave feedback'),
        el('button.icon-btn', { 'aria-label': 'Close', onclick: () => toggle(false) }, '✕')
      ]),
      el('p.fb-panel__on', ['On: ', where]),
      hasEndpoint ? null : el('p.fb-panel__lock', '🔒 Stays in this browser — nothing is sent anywhere.'),
      ta, primary, ghBtn, err,
      el('div.fb-panel__foot', [inboxLink])
    ]);
    const root = el('div.fb-root', [panel, fab]);
    document.body.appendChild(root);

    function refresh() {
      const n = getAll().length;
      badge.textContent = n ? String(n) : '';
      badge.style.display = n ? '' : 'none';
      inboxLink.textContent = 'Your saved notes (' + n + ')';
      // The inbox page has the full toolkit; hide the FAB there.
      root.style.display = location.hash.indexOf('#/feedback') === 0 ? 'none' : '';
    }
    function toggle(to) {
      open = to != null ? to : !open;
      panel.classList.toggle('open', open);
      fab.setAttribute('aria-expanded', String(open));
      if (open) { where.textContent = pageInfo().page; err.textContent = ''; setTimeout(() => ta.focus(), 0); }
    }
    fab.addEventListener('click', () => toggle());

    function saveLocal(text) { const p = pageInfo(); add({ path: p.path, page: p.page, text: text }); }
    function done(label) {
      primary.textContent = label;
      ta.value = '';
      setTimeout(() => { primary.textContent = hasEndpoint ? 'Send' : 'Save note'; }, 1800);
    }
    primary.addEventListener('click', function () {
      const text = ta.value.trim();
      if (!text) return;
      saveLocal(text);
      if (!hasEndpoint) { done('Saved ✓'); return; }
      primary.textContent = 'Sending…';
      fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ page: pageInfo().page, path: pageInfo().path, message: text })
      }).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        err.textContent = ''; done('Sent ✓');
      }).catch(function () {
        primary.textContent = 'Failed — retry';
        err.textContent = 'Couldn’t reach the form endpoint — your note is saved locally; try GitHub instead.';
        setTimeout(() => { primary.textContent = 'Send'; }, 2500);
      });
    });
    ghBtn.addEventListener('click', function () {
      const text = ta.value.trim();
      if (!text) return;
      saveLocal(text);
      const p = pageInfo();
      window.open(issueUrl('Feedback: ' + p.page, text + '\n\n---\n_Page: ' + p.page + ' (`' + p.path + '`)_'),
        '_blank', 'noopener');
      ta.value = '';
      toggle(false);
    });
    ta.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') primary.click();
      if (e.key === 'Escape') toggle(false);
    });
    inboxLink.addEventListener('click', () => toggle(false));

    window.addEventListener(EVT, refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('hashchange', refresh);
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildWidget);
  else buildWidget();

  // ---- Inbox page -------------------------------------------------------------
  global.Registry.register({
    id: 'feedback',
    title: 'Feedback inbox',
    category: 'Reference',
    blurb: 'Notes you’ve left through the feedback button, grouped by page.',
    longDesc: 'Every note from the 💬 Feedback button lands here, grouped by the page it was written on. ' +
      'Notes live in this browser only — nothing is sent anywhere automatically. When you’re ready, turn ' +
      'the batch into a GitHub issue, copy it as Markdown, or export JSON.',
    create: function (container) {
      const root = el('div.fb-inbox');
      container.appendChild(root);

      function draw() {
        clear(root);
        const list = getAll();
        root.appendChild(el('div.fb-inbox__notice',
          'These notes live in this browser only — the widget saves each one to localStorage on this ' +
          'device, and nothing is sent anywhere automatically. Sharing them is always your action.'));
        if (list.length) {
          const md = asMarkdown(list);
          const copyBtn = el('button.btn', 'Copy all (Markdown)');
          copyBtn.addEventListener('click', function () {
            (navigator.clipboard ? navigator.clipboard.writeText(md) : Promise.reject())
              .then(() => { copyBtn.textContent = 'Copied ✓'; setTimeout(() => { copyBtn.textContent = 'Copy all (Markdown)'; }, 1500); })
              .catch(() => {});
          });
          const exportBtn = el('button.btn', 'Export JSON');
          exportBtn.addEventListener('click', function () {
            const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = el('a', { href: url, download: 'feedback.json' });
            a.click();
            URL.revokeObjectURL(url);
          });
          const clearBtn = el('button.btn.fb-inbox__danger', 'Clear all');
          clearBtn.addEventListener('click', function () {
            if (confirm('Clear all feedback from this browser? This cannot be undone.')) clearAll();
          });
          root.appendChild(el('div.fb-inbox__actions', [
            el('a.btn.btn--primary', {
              href: issueUrl('Feedback — ' + list.length + ' note' + (list.length === 1 ? '' : 's'), md),
              target: '_blank', rel: 'noopener noreferrer'
            }, 'Create GitHub issue ↗'),
            copyBtn, exportBtn, clearBtn
          ]));
        }
        if (!list.length) {
          root.appendChild(el('div.fb-inbox__empty',
            'No feedback yet. Use the 💬 Feedback button on any page to jot a note — it’ll show up here.'));
          return;
        }
        const by = {};
        list.slice().sort((a, b) => b.ts - a.ts).forEach((f) => { (by[f.page] = by[f.page] || []).push(f); });
        Object.keys(by).forEach(function (page) {
          const sec = el('section.fb-inbox__group', [
            el('div.fb-inbox__group-head', [
              el('h3', page), el('span.mono.dim', String(by[page].length)),
              el('a.fb-inbox__goto', { href: by[page][0].path }, 'open page →')
            ])
          ]);
          by[page].forEach(function (f) {
            const del = el('button.icon-btn.fb-note__del', { 'aria-label': 'Delete note', title: 'Delete note' }, '✕');
            del.addEventListener('click', () => remove(f.id));
            sec.appendChild(el('div.fb-note', [
              el('div.fb-note__body', [el('p', f.text), el('div.fb-note__ts.mono.dim', fmt(f.ts))]),
              del
            ]));
          });
          root.appendChild(sec);
        });
      }

      draw();
      window.addEventListener(EVT, draw);
      window.addEventListener('storage', draw);
      return {
        destroy: function () {
          window.removeEventListener(EVT, draw);
          window.removeEventListener('storage', draw);
        }
      };
    }
  });

  global.Feedback = { getAll, add, remove, clearAll, asMarkdown };
})(window);
