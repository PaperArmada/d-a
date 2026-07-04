# The Ascent — construction principles

The Ascent is the site's primary structure: a single dependency-ordered climb
from atomic *elements* to ever-higher *compounds*. Categories still exist, but
only as a secondary index. This document records the rules we follow when we
grow the chain, so it stays honest and consistent as the catalog expands.

The invariant everything below serves:

> **A concept is never presented before every one of its ingredients has
> already been presented.**

"Presented" means its position in the chain — the order used by the Ascent
page, the landing page, the Climb sidebar, and the *previous / next* pager.

## Vocabulary

- **Element** — an entry with no ingredients (Tier 0). A claim, not a default:
  "you can understand this from everyday experience alone."
- **Compound** — an entry with at least one ingredient.
- **Ingredient** — a dependency edge. Two kinds, one graph:
  - **`madeOf`** (structural): the mechanism literally contains the other
    concept (an LRU cache *is* a hash table + a linked list). Declared by the
    entry itself, in its visualization file.
  - **`PREREQS`** (conceptual): understanding requires the other concept even
    though the mechanism doesn't contain it (binary search assumes you've seen
    linear search). Curated centrally in `core/ascent.js`, in one reviewable map.
- **Tier** — computed altitude (see P3). Never assigned by hand.
- **The chain** — the canonical linear order over all catalog entries (see P4).

## Principles

### P1 — Honest edges
An edge exists only if the concept genuinely *uses* or *requires* the other.
Never add an edge for "related", "nice to know first", or thematic grouping —
that is what categories are for. The Ascent's credibility rests on every edge
being defensible: if a card sits above another, it truly builds on it.

The test for each kind:
- `madeOf`: *does the mechanism literally contain it?* → structural edge.
- `PREREQS`: *would a learner hit a wall here without it?* → conceptual edge.
- If both apply, declare `madeOf` only — don't duplicate the edge.

### P2 — Direct edges only (minimality)
Declare only **direct** ingredients; transitive ones are implied. If AVL
depends on BST and BST depends on linked list, AVL must not also declare
linked list. Redundant conceptual edges are flagged by `Ascent.verify()`
("redundant prerequisite"), because a noisy graph stops being reviewable.
(Structural `madeOf` lists are exempt: a compound honestly lists what it is
made of, even when one part happens to build on another.)

### P3 — Computed altitude (longest path)
`tier(x) = 0` if x has no ingredients, else `1 + max(tier of ingredients)`.
Longest path, not shortest: you meet a concept at its **full** depth — a
compound never sits below its tallest ingredient. Tiers are never hand-placed;
to move a card, change its edges.

### P4 — Deterministic chain
The chain is the tier-by-tier flattening of the DAG, with a fixed tie-break
inside each tier: **tier ascending → curriculum category order
(`CATEGORY_ORDER` in `core/registry.js`) → title (alphabetical)**.

- Tier order alone already guarantees the invariant (every ingredient lives on
  a strictly lower tier — verified).
- The category tie-break keeps narrative threads together inside a tier, so
  the reader isn't ping-ponged between domains.
- The title tie-break makes the chain fully deterministic: same catalog, same
  chain, on every machine.

`Ascent.order()` is the single source of this order. Everything that walks the
site linearly (pager, `[` / `]` keys, "continue the climb") must consume it —
never a private copy of the sort.

### P5 — Scope: the chain covers the catalog
Every visualization entry is in the chain. **Lessons** and **Reference** pages
(glossary, the Ascent itself, the category index) sit outside it — they are
tours and maps *of* the climb, not steps *on* it. Lessons page among lessons;
reference pages don't page at all.

### P6 — Verified continuously
`Ascent.verify()` runs in the test harness on every commit (CI gates deploys)
and checks:
1. the graph is **acyclic**;
2. tiers are **monotonic** (every ingredient strictly below its dependent);
3. no **dangling ids** in `PREREQS`;
4. the **chain is a valid topological order** (every ingredient strictly
   earlier — the invariant, checked directly on `Ascent.order()`);
5. **minimality**: no conceptual prerequisite already implied by the entry's
   other ingredients (P2).

A change that breaks any of these does not ship.

## Growth checklist — adding an entry

1. Register the entry; if the mechanism contains other concepts, declare
   `madeOf` in its file.
2. Ask the P1 conceptual question; if a learner would hit a wall, add the
   *direct* prerequisites to `PREREQS` in `core/ascent.js`.
3. If it has **no** edges, you are claiming it's an element — justify that in
   review ("understandable from everyday experience alone").
4. Run `npm test`. Fix anything `verify()` flags (cycle, redundancy, dangling
   id) by changing **edges**, never by touching tier numbers or the sort.
5. Look at where it lands on the Ascent page. If it feels too low, you forgot
   an edge; if too high, an edge is dishonest or redundant. Fix the edge.

## Renaming tiers

Tier count is emergent, so `TIER_NAMES` / `TIER_BLURBS` in `core/ascent.js`
may need a new rung when a deeper compound arrives. Names are flavor; the
numbers and membership are computed and not up for editorial adjustment.
