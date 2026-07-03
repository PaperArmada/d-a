# Expansion Strategy — From DSA Visualizer to *Software Foundations*

**Goal.** Grow the app beyond data structures & algorithms into an interactive atlas of the
*concrete* foundations of software 1.0 — the deterministic, human-written layer of computing.
In scope: mechanisms you can step through (patterns, protocols, runtimes, representations).
Out of scope: frameworks (React, Spring), process methodology (Agile, Scrum), vendor/cloud
specifics, and software 2.0/3.0 (ML, LLMs).

The organizing metaphor — borrowed from the prompt and worth keeping in the product — is a
**periodic table**: *elements* (atomic concepts: a queue, a state machine, two's complement)
combine into *compounds* (LRU cache = hash map + linked list; git = DAG + content hashing;
a database index = B-tree + pages). The app already teaches many elements; the expansion adds
missing elements and, crucially, the compounds that show *why the elements matter*.

---

## 1. What qualifies — the selection filter

Every candidate must pass all five gates (this is what kept the current collection sharp):

| Gate | Test |
| --- | --- |
| **Mechanism, not vibe** | There is a definite state that changes step by step. ("Observer pattern" passes; "clean code" doesn't.) |
| **Step-simulable** | A pure function can emit deterministic frames → drops straight into `Player`/`Scaffold`. |
| **One-screen state** | The whole working state fits in view; no scrolling to understand a step. |
| **Misconception payoff** | The visualization kills a specific, common misunderstanding (e.g. `0.1 + 0.2 ≠ 0.3`, "async = parallel", "git stores diffs"). |
| **Element or compound** | It's either atomic, or explicitly built from elements the app already teaches (and links back to them). |

Explicit rejections and why: *SOLID as prose* (no mechanism — but **coupling shown as a
dependency graph** passes), *test pyramids* (process), *specific ORMs/frameworks* (not
foundational), *microservices topology* (architecture fashion, weak stepping).

---

## 2. The taxonomy — six new domains

Existing domains (Sorting, Searching, Data Structures, Trees, Heaps, Hashing, Graphs,
Recursion & DP) stay as-is. Six domains join them. Each entry lists the concept, the core
mechanism made visible, and reuse of existing machinery. **E** = element, **C** = compound.

### Domain A — The Machine (representation & memory)
| # | Concept | What the learner *sees* | Reuse |
| --- | --- | --- | --- |
| A1 **E** | Binary & two's complement | Toggleable bit cells; live decimal; overflow wrap-around; why `-x = ~x + 1` | `cells`, dsStrip |
| A2 **E** | IEEE-754 floats | Sign/exponent/mantissa segments; type `0.1`, watch it round; `0.1+0.2` explained | bit cells from A1 |
| A3 **E** | Character encoding (UTF-8) | Type any text → code points → bytes; why "é" can be 1 or 2 code points | dsStrip |
| A4 **E** | Stack vs heap memory | Two memory strips; function calls push frames, `new` allocates; dangling pointer demo | dsStrip ×2, frames |
| A5 **E** | Bitwise operations | Two bit-rows + operator; AND/OR/XOR/shift animate column-wise; masks & flags recipe | A1 cells |

### Domain B — The Runtime (how code executes)
| # | Concept | What the learner *sees* | Reuse |
| --- | --- | --- | --- |
| B1 **E** | The call stack | Code steps push/pop frames with locals & return addresses; recursion depth = memory | Player + dsStrip; ties to Hanoi/fib |
| B2 **C** | The event loop | Call stack + task queue + microtask queue lanes; `setTimeout(0)` vs promise ordering | B1 + two dsStrips — kills "async = parallel" |
| B3 **E** | Garbage collection (mark & sweep) | Object graph from roots; mark wave (BFS reuse!), sweep fade; cycle vs refcount | graph render + traversal frames |
| B4 **E** | Lexing & parsing | Expression → token stream → AST growing node by node (shunting-yard) | trie/tree SVG layout |
| B5 **E** | Race conditions & locks | Two thread lanes interleave on `count++`; scrub interleavings; add a lock, watch it serialize | new *lanes* widget |
| B6 **C** | Deadlock (dining philosophers) | Circular wait forms visibly; break it with lock ordering | B5 lanes + graph cycle |

### Domain C — Design Patterns (GoF, the mechanical ones)
| # | Concept | What the learner *sees* | Reuse |
| --- | --- | --- | --- |
| C1 **E** | State machine (FSM) | States + transitions; feed inputs, watch it move; *the* master element — reused by C6, D2, E4 | new *fsm* widget |
| C2 **E** | Observer / pub-sub | Subject pulses; notification fan-out animates along subscription edges; sub/unsub live | graph render |
| C3 **E** | Strategy | One context, hot-swap the algorithm mid-run — literally re-uses the sorting engines | existing sorts |
| C4 **E** | Decorator | Data flows through nested wrapper rings, each transforming it; compose/reorder live | SVG rings |
| C5 **C** | Command + undo/redo | Every action becomes an object pushed on a stack; undo pops — the stack viz, weaponized | stack viz |
| C6 **C** | Iterator | External cursor over list/tree/graph — same interface, different traversals | existing structures |

### Domain D — Data & Storage
| # | Concept | What the learner *sees* | Reuse |
| --- | --- | --- | --- |
| D1 **E** | B-tree | Insertions split nodes; stays shallow at scale; contrast with BST height | tree SVG; sibling of BST/AVL |
| D2 **C** | Regex → NFA/DFA | Pattern compiles to a state machine; test string animates through it; why backtracking blows up | C1 fsm widget |
| D3 **C** | Database index | Same query with/without B-tree index: row-scan race vs tree descent | D1 + race layout |
| D4 **E** | Transactions & ACID | Two transactions interleave on accounts; commit/rollback; lost-update anomaly, then locking fixes it | B5 lanes |
| D5 **C** | Myers diff | Edit-graph walk producing a real diff — Edit Distance's practical twin | edit-distance table |

### Domain E — Systems & Communication
| # | Concept | What the learner *sees* | Reuse |
| --- | --- | --- | --- |
| E1 **C** | LRU cache | Hash map + doubly-linked list working together; hits refresh, misses evict — flagship compound | hash + linked-list visuals |
| E2 **E** | TCP handshake & retransmission | Two-actor sequence lanes; SYN/ACK; drop a packet, watch timeout + resend | new *sequence* widget |
| E3 **C** | HTTP request lifecycle | DNS → TCP → TLS → request → response as one annotated timeline | E2 sequence widget |
| E4 **C** | Retry, backoff & circuit breaker | Exponential backoff timing bars + breaker as a live FSM (closed→open→half-open) | C1 fsm + bars |
| E5 **E** | Rate limiting (token bucket) | Bucket refills; bursts drain it; requests pass/reject in real time | bars + dsStrip |
| E6 **C** | Consistent hashing | Keys on a ring; add/remove a node, watch how few keys move vs `mod n` | SVG ring |
| E7 **C** | Git internals | Commits as a content-addressed DAG; branch/merge; "git stores snapshots, not diffs" | graph-builder machinery |

### Domain F — Correctness & Craft (best practices with mechanisms)
| # | Concept | What the learner *sees* | Reuse |
| --- | --- | --- | --- |
| F1 **E** | Coupling & cohesion | Module dependency graph; refactor button rewires it; ripple-effect of a change animates | graph render |
| F2 **E** | Invariants & assertions | A structure's invariant checked live as you mutate (BST order, heap property) — violations flash | existing structures |
| F3 **C** | Idempotency | Replay the same request N times against naive vs idempotent handlers; state diverges vs converges | E2 sequence |
| F4 **E** | Complexity in practice | Interactive n-vs-operations plot fed by the *actual counters* the sorts already emit | existing counters |

**Rough count:** 28 new entries (≈16 elements, ≈12 compounds) — a considered atlas, not a dump.

---

## 3. New shared machinery (build once, reuse everywhere)

The whole expansion needs only **three new core widgets**, in the spirit of `widgets.js`:

1. **`fsm`** — states + labeled transitions, current-state highlight, input tape.
   Consumers: C1, C2 (subject states), D2 regex, E4 circuit breaker, E5 bucket states.
2. **`lanes`** — N horizontal actors/threads with ordered events and interleaving scrubber.
   Consumers: B2 event loop, B5 races, B6 deadlock, D4 transactions.
3. **`sequence`** — two+ party message diagram with timers/drops (a specialization of lanes).
   Consumers: E2 TCP, E3 HTTP, F3 idempotency.

Everything else reuses: `Player`/`Scaffold` (all frame-based entries), tree SVG layout
(B4, D1), graph render (B3, C2, E7, F1), dsStrip/keyVal (A*, B1, E1, E5), DP table (D5),
race grid (D3), and the lesson engine for every domain's guided tour.

---

## 4. Information architecture & naming

- **Identity:** the title outgrows "DSA". Rename the shell to **"Software Foundations"**
  (tagline: *interactive atlas of how software actually works*), keeping DSA as the first
  wing. URL and repo stay put — only `<title>`, brand mark, and landing copy change.
- **Navigation:** sidebar gains two-level grouping — **Wing → Category** (Foundations wing:
  Machine / Runtime / Patterns / Data & Storage / Systems / Craft; Algorithms wing: existing
  eight categories). `Registry` grows one optional `domain` field; grouping logic already
  centralizes in `registry.js`.
- **Landing page:** becomes the periodic-table moment — a grid of elements colored by domain,
  compounds visually marked as "built from: [hash] + [linked list]" with links to their
  constituent elements. This makes the pedagogy legible at a glance.
- **Cross-linking:** compounds always link to their elements ("LRU = Hash Table + Linked
  List — revisit them"), and lessons interleave both wings.

## 5. Phasing (each wave ships independently, tests green, straight to main)

**Wave 1 — Keystone elements (max reuse, unlock others):**
C1 state machine (fsm widget) · E1 LRU cache · D1 B-tree · A1+A2 number representation ·
B1 call stack. *Plus:* registry `domain` field + sidebar grouping.

**Wave 2 — Runtime & patterns:** B2 event loop (lanes widget) · B5 race conditions ·
C2 observer · C3 strategy · C5 command/undo · F4 complexity plot · "Design Patterns" +
"Inside the Machine" lessons.

**Wave 3 — Systems & data:** E2 TCP (sequence widget) · E4 backoff/circuit breaker ·
E5 token bucket · D2 regex→FSM · E7 git DAG · D4 transactions · lessons for both domains.

**Wave 4 — Compounds & capstones:** E3 HTTP lifecycle · E6 consistent hashing · D3 index
race · D5 Myers diff · B3 GC · B6 deadlock · A3–A5 · F1–F3 · periodic-table landing page.

Effort using the existing framework: elements ≈ S (one file + one script tag), compounds and
new widgets ≈ M. Each wave is roughly the size of what's already been shipped per session.

## 6. Quality bar (unchanged, now codified)

Every new entry must ship with: seeded scenario that demonstrates its misconception-killer ·
pseudocode/counters where frame-based · deep-linkable state · smoke-test pass + a pure logic
assertion for its engine (FSM transitions, LRU eviction order, two's-complement round-trip) ·
lesson step or cross-link · `prefers-reduced-motion` respected · service-worker cache bump.

---

*This document is the working roadmap; check items off by linking the shipped visualization
IDs next to each entry.*
