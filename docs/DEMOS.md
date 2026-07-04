# Demo style guide

Every interactive page is a **demo** (a **lesson** is a guided tour that
sequences demos; see README for terminology). Demos should feel like one
product, not seventy — same anatomy, same color meanings, same voice.
This guide records the standard; the harness enforces the checkable parts.

## Anatomy — one column, in this order

The app shell provides 1, 8 and 9; the demo's `create()` provides the rest.

1. **Header** — title, breadcrumbs, linkified description, visited toggle.
2. **Controls row** — the actions. Primary action first (`.btn--primary`),
   then secondary actions, then a `.spacer`, then share / reset / clear as
   ghost buttons at the right end. Inputs sit left of the button they feed.
3. **Status line** — always present, always narrating. See *Voice* below.
4. **Stage** — the drawing. One idea per stage; spin off a second demo
   rather than adding a second stage.
5. **Pseudocode panel** — whenever an operation has steps worth following
   (policy since the Queue feedback note). Frame-based demos highlight the
   executing line; button-driven demos light up the clicked operation's line.
6. **Legend** — required as soon as the stage uses more than one state color.
7. **Complexity pills** — a spec sheet with a **closed vocabulary**. A pill
   is exactly one of four kinds, in this order:
   1. **Cost** — labeled by the operation, value is a cost
      (`Insert: O(log n)`, `Cost: 1 cycle, no loops`).
   2. **Property** — a measurable/definitional fact of the mechanism
      (`Layout: 1 + 8 + 23 bits`, `Burst capacity: bucket size`,
      `Command carries: apply() + revert()`).
   3. **Invariant** — labeled exactly `Invariant:`
      (`Invariant: exactly one current state`).
   4. **In the wild** — labeled exactly `In the wild:`, always the **last**
      pill; real-world sightings (products, protocols) that are *not pages
      in this atlas*.

   Nothing else is a pill:
   - **Morals, takeaways, comparisons** (`Lesson:`, `Takeaway:`, `Why:`,
     `Bonus:`, `Same idea:`, `vs …`) belong in the closing **hint** — that's
     what it's for.
   - **Atlas relationships** (`Used by:`, `Compound of:`, `Pairs with:`,
     `Everywhere in:`) belong in the ingredient graph; the relations layer
     renders them with rationales. If it's a product, it's `In the wild:`.

   The harness rejects the banned labels and enforces `In the wild:` last —
   so a reader always knows what a pill row holds: what it costs, what it
   carries, what's always true, where it lives in the real world.
8. **Hint** — one closing paragraph telling the story the stage just showed
   ("the nodes never move — only arrows change").
9. **Relations + pager** — "⚗ built on / → leads to" chips with rationales,
   then previous/next on the climb. All generated; never hand-made.

## Color semantics — same meaning on every stage

| Token | Meaning | Typical uses |
| --- | --- | --- |
| `--accent` (blue) | data at rest, neutral structure | unsorted bars, plain nodes, messages |
| `--warn` (amber) | under examination *right now* | comparing, current node, newest message |
| `--danger` (red) | destructive / a write | swap, pop, delete, dropped packet |
| `--good` (green) | settled, final, correct | sorted, found, established |
| `--focus` (violet) | "in the algorithm's hand" | pivot, current minimum, held key |
| `--accent-2` (teal) | derived structure the algorithm built | shortest-path tree, relink arc, flipped pointers |

Rules of thumb: a color keeps one meaning for the whole demo; the legend
names states in the demo's own vocabulary ("Popped", not "red"); if two
states genuinely differ, they get two colors (a *current minimum* is not
merely *being compared* — the selection-sort lesson of the feedback inbox).

## Voice — status lines narrate, they don't log

- Say **why**, not just what: "pop() → 7 — always the most recent push
  (LIFO)", not "popped 7".
- Present tense, plain English, `<b>` around the value being acted on.
- Feynman rule: if a sentence needs jargon, the glossary auto-links it —
  so write the sentence a newcomer can follow anyway.
- Errors are teaching moments: "pop() on empty stack → underflow" beats
  a silent no-op.

## Interaction conventions

- Any demo whose state is reproducible offers a 🔗 share button
  (`Share.button`) that deep-links the exact state.
- Reset is `↺`, ghost-styled, rightmost.
- Frame-based demos use the Player (Space, ←/→, Home) via Scaffold —
  never a private timing loop. Button-driven demos may use short
  `setTimeout` beats for multi-step gestures.
- Global keys ([ ] / "/") are the shell's; demos must not bind them.

## Enforcement

`npm test` checks, for every catalog demo: it mounts and renders, every
control click survives, a status line exists, and no pill hand-declares
atlas relationships (`Used by:`). The softer rules (voice, color meaning)
are review judgment — this file is the reference to review against.
