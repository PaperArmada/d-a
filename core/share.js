/* Share — small helper for deep-linkable visualization state.
   Copies a shareable URL to the clipboard and syncs the address bar.
   Uses window.Router (defined in app.js) lazily at call time. */
(function (global) {
  'use strict';

  function copy(id, params, onDone) {
    const link = global.Router ? global.Router.absoluteLink(id, params)
      : (location.origin + location.pathname + '#/' + id);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).catch(function () {});
    }
    if (global.Router) global.Router.setParams(params);
    if (onDone) onDone(link);
    return link;
  }

  // Returns a ready-made "Copy link" button element.
  function button(getState, onCopied) {
    return global.DOM.el('button.btn', {
      title: 'Copy a shareable link to this state',
      onclick: function () {
        const s = getState();
        copy(s.id, s.params, onCopied);
      }
    }, '🔗 Copy link');
  }

  global.Share = { copy: copy, button: button };
})(window);
