/* TCP — three-way handshake, ACKs, and retransmission after packet loss. */
(function () {
  'use strict';
  const { el, clear } = window.DOM;

  function clean() {
    const M = [];
    const F = [];
    const push = (m, status) => { M.push(m); F.push({ msgs: M.slice(), status }); };
    F.push({ msgs: [], status: 'Client wants a reliable connection. UDP would just start shouting; TCP agrees on sequence numbers first.' });
    push({ from: 0, to: 1, label: 'SYN (seq=x)' }, 'SYN: "I want to talk, my numbering starts at x"');
    push({ from: 1, to: 0, label: 'SYN-ACK (seq=y, ack=x+1)' }, 'SYN-ACK: "Heard you (x+1 next), my numbering starts at y"');
    push({ from: 0, to: 1, label: 'ACK (ack=y+1)' }, 'ACK completes the three-way handshake — both sides know both numbers');
    push({ from: 0, to: 1, label: 'DATA seq=x+1 "GET /"' }, 'Now data flows, every byte numbered');
    push({ from: 1, to: 0, label: 'ACK (ack=x+12)' }, 'Receiver acknowledges exactly how much arrived — the sender can forget it');
    push({ from: 1, to: 0, label: 'DATA seq=y+1 (response)' }, 'Data is bidirectional; each direction has its own numbering');
    push({ from: 0, to: 1, label: 'ACK' }, 'Connection humming. Reliability = numbering + acknowledgment.');
    return F;
  }
  function lossy() {
    const M = [];
    const F = [];
    const push = (m, status) => { M.push(m); F.push({ msgs: M.slice(), status }); };
    push({ from: 0, to: 1, label: 'SYN' }, 'Handshake as before…');
    push({ from: 1, to: 0, label: 'SYN-ACK' }, '…');
    push({ from: 0, to: 1, label: 'ACK' }, 'Connected.');
    push({ from: 0, to: 1, label: 'DATA seq=1000', state: 'drop' }, '💥 The network silently drops the packet. Nobody is told — IP makes no promises.');
    push({ from: 0, to: 0, label: 'RTO waiting… no ACK', state: 'timer' }, 'Sender\'s retransmission timer counts down. Silence IS the signal.');
    push({ from: 0, to: 1, label: 'DATA seq=1000 (retransmit)' }, 'Timeout → send the SAME bytes again (same seq number, so no duplication)');
    push({ from: 1, to: 0, label: 'ACK 2000' }, 'This time it lands and is ACKed. The application above never noticed a thing.');
    return F;
  }
  window.__algos = window.__algos || {};
  window.__algos.tcp = { clean, lossy };

  window.Registry.register({
    id: 'tcp',
    title: 'TCP: Handshake & Retransmission',
    category: 'Systems',
    blurb: 'Reliable delivery over an unreliable network — numbering + ACKs + timers.',
    longDesc: 'The network below TCP loses, reorders, and duplicates packets without apology. TCP builds ' +
      'reliability on top with three tools: sequence numbers, acknowledgments, and retransmission timers. ' +
      'Watch the three-way handshake, then break the network and watch recovery.',
    create: function (container) {
      let mode = 'clean';
      const api = window.Scaffold.createStepViz(container, {
        baseDelay: 1300,
        render: function (stage, frame) {
          clear(stage);
          if (!frame) return;
          stage.appendChild(window.Widgets.sequence({
            actors: ['Client', 'Server'], messages: frame.msgs, height: 400
          }));
        },
        complexity: { Handshake: '1.5 RTT', 'Loss detection': 'timeout (RTO) / dup ACKs', Guarantee: 'in-order, exactly-once to the app' },
        controls: [
          { label: '🤝 Clean session', onClick: function (a) { mode = 'clean'; load(a); } },
          { label: '💥 Lossy network', onClick: function (a) { mode = 'lossy'; load(a); } }
        ],
        onReady: function (a) { load(a); }
      });
      function load(a) { const x = a || api; x.setFrames(mode === 'clean' ? clean() : lossy()); x.setStatus('Scenario: ' + mode + ' — press play.'); }
      return api;
    }
  });
})();
