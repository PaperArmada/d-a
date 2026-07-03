/* What happens when you hit Enter — DNS, TCP, TLS, HTTP, render. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  function build() {
    const M = []; const F = [];
    const push = (m, status) => { M.push(m); F.push({ msgs: M.slice(), status }); };
    F.push({ msgs: [], status: 'You type example.com and hit Enter. Four protocols now run, in order, before a single pixel renders.' });
    push({ from: 0, to: 1, label: 'DNS: A? example.com' }, '1 · DNS — the name is for humans; routers need an IP');
    push({ from: 1, to: 0, label: 'DNS: 93.184.216.34' }, 'The resolver answers (from cache, usually in ms)');
    push({ from: 0, to: 2, label: 'TCP SYN' }, '2 · TCP handshake with that IP, port 443…');
    push({ from: 2, to: 0, label: 'SYN-ACK' }, '…');
    push({ from: 0, to: 2, label: 'ACK' }, 'Reliable byte pipe established');
    push({ from: 0, to: 2, label: 'TLS ClientHello' }, '3 · TLS — agree ciphers, verify the certificate, derive keys');
    push({ from: 2, to: 0, label: 'TLS ServerHello + cert ✓' }, 'Everything after this line is encrypted');
    push({ from: 0, to: 2, label: 'GET / HTTP/1.1' }, '4 · Finally, the actual HTTP request rides inside TLS inside TCP inside IP');
    push({ from: 2, to: 0, label: '200 OK + HTML' }, 'The response arrives; the browser parses HTML and discovers it needs more (CSS, JS, images) — each may repeat this dance');
    F.push({ msgs: M.slice(), status: 'Layers, each solving one problem: naming (DNS) · reliability (TCP) · privacy (TLS) · meaning (HTTP).' });
    return F;
  }

  window.Registry.register({
    id: 'http-lifecycle',
    title: 'HTTP Request Lifecycle',
    category: 'Systems',
    blurb: 'DNS → TCP → TLS → HTTP: the four-protocol relay behind every page load.',
    madeOf: ['tcp'],
    longDesc: 'One URL triggers a relay of protocols, each solving exactly one problem and handing off to ' +
      'the next: DNS turns the name into an address, TCP builds a reliable pipe, TLS makes it private, and ' +
      'only then does HTTP speak. Step through the full relay.',
    create: function (container) {
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 1300,
        render: function (stage, frame) {
          clear(stage);
          if (!frame) return;
          stage.appendChild(window.Widgets.sequence({
            actors: ['Browser', 'DNS resolver', 'Server :443'], messages: frame.msgs, height: 500
          }));
        },
        complexity: { 'Round trips before HTTP': '~3 (why latency matters)', 'Reused on next request': 'DNS cache + keep-alive + TLS session' },
        onReady: function (a) { a.setFrames(build()); a.setStatus('Press play — count the round-trips that happen before any HTML moves.'); }
      });
      return api;
    }
  });
})();
