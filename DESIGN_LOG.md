# Rukator — Design Session Log (2026-04-19)

## Starting Point

Rukator is a two-player card placement game on a 4x3 grid with a corporate/workplace satire theme. Players select 7 cards from a collection and take turns placing them on the board. Cards have arrow patterns that target adjacent cells, and effects distribute "rukas" (workload). The player with fewer rukas at the end wins.

## Key Design Decisions

### 1. Effect Primitives

We settled on a small set of atomic operations rather than a freeform scripting system:

- **Push N** — add N rukas to targets
- **Pull N** — remove N rukas from targets (rukas vanish)
- (Future: Drain, Siphon, Spread)

Individual cards should be simple; complexity should emerge from cards interacting on the board. A card you can't understand in 3 seconds is too complex.

### 2. Complexity Gated by Tier

| Tier | Effects | Filters | Triggers allowed | Specials |
|------|---------|---------|-----------------|----------|
| 1 | 1 primitive | 0 | onTargetAcquired | — |
| 2 | 1–2 primitives | 0–1 | onPlay, onTargetAcquired | — |
| 3 | 1–2 primitives | 0–1 | any | — |
| 4 | 1–2 primitives | 0–2 | any | unique abilities |
| 5 | 2–3 primitives | 0–2 | any | Fired, status effects |

### 3. The `onTargetAcquired` Trigger

**Problem:** On the first turn, the board is empty. Cards with `onPlay` effects have no targets and waste their effect entirely. This makes openers feel dead.

**Solution:** Tier 1 cards use `onTargetAcquired` — the effect fires each time a card appears in one of the card's arrow cells. This means:
- Early placements plant threats that fire retroactively as the board fills
- Late placements fire immediately on existing targets
- Both timing strategies are viable

**Timing decision:** `onTargetAcquired` fires AFTER the newly placed card has fully resolved all its own effects (onPlay chains, onNeighbor). This way, Pull effects have a chance to remove rukas that accumulated during the placed card's resolution.

### 4. Resolution Order

When a card is placed, effects resolve in this order:

1. **onPlay** — placed card's immediate effects (+ DFS chains from onHit)
2. **onNeighbor** — existing adjacent cards react to new neighbor
3. **onTargetAcquired (existing cards)** — cards whose arrows point at the newly placed card
4. **onTargetAcquired (placed card)** — the placed card's arrows fire on existing targets
5. **eachTurn** — fires at end of each round (after both players place), for all cards in placement order

### 5. Filters Are Safety, Not Power

Initial instinct was that ally/enemy filters make cards more powerful. On reflection:

- **Unfiltered** effects are higher risk/reward — you can hit allies accidentally, but the magnitude can be higher to compensate. Requires positioning skill.
- **Filtered** effects (enemies only, allies only) are safer and more predictable but should have lower magnitude.
- Filters become a **deckbuilding personality choice**: aggressive players favor unfiltered high-magnitude cards, cautious players favor filtered consistency.
- Unfiltered cards also enable ally-targeting combos (e.g., deliberately pushing onto your own onHit card).

### 6. Card Balance Framework

Three axes form a tradeoff triangle — a card can be strong on two but must be weak on the third:

- **Reach** — number of arrows, pattern flexibility
- **Magnitude** — rukas moved per activation
- **Reliability** — how likely the effect fires and how safe it is

Rough power budget formula:
```
Power = arrow_count × magnitude × reliability_multiplier

Reliability multipliers:
  unconditional + onPlay     = 1.0
  conditional + onPlay       = 0.6
  unconditional + onHit      = 0.7
  unconditional + eachTurn   = 1.5
  conditional + eachTurn     = 0.9

Target power per tier: T1≈2, T2≈4, T3≈7, T4≈11, T5≈16
```

Push-to-enemies is full value. Push-to-any (unfiltered) is ~70% value due to ally-hit risk. The formula is a starting point — real calibration comes from playtesting.

### 7. Asymmetric Deck Design

Both players have 7 cards (2×T1, 2×T2, 2×T3, 1×T4) but with distinct identities:

**Player 1 — "The Aggressors"** (6 push, 1 pull)
- Almost all push, high pressure, simple to play
- Scrum Master for persistent eachTurn pressure
- Lead + Architect for onTargetAcquired zones and onHit retaliation
- Only one pull card (The Helper) as a defensive anchor

**Player 2 — "The Tacticians"** (4 push, 5 pull)
- Mix of push and pull, multi-color cards
- Firefighter and Manager for immediate ally support via pull
- VP as a late-game onNeighbor landmine
- More complex to pilot but more flexible

### 8. Theme Direction

The workplace satire framing is strong and underserved in card games:
- Rukas = workload/tasks
- Arrows = communication channels (like Slack groups)
- Two competing teams in the same company, each trying to dump work on the other
- Card names follow corporate archetypes (Intern, Scrum Master, VP, etc.)
- Possible narrative hooks: reorg survival, budget war, sprint blame game

Arrows targeting both ally and enemy cards fits the theme — channels connect people regardless of team.

## Prototype Status

Working Vite + TypeScript prototype at `localhost:5173` with:
- 4x3 grid with hotseat two-player gameplay
- Full effect resolution engine (Push, Pull, onPlay, onHit, onTargetAcquired, eachTurn, onNeighbor)
- DFS resolution with loop detection (max 3 repetitions)
- Ally/enemy filters
- SVG arrow overlay: persistent dashed arrows for eachTurn effects, solid arrows on hover for placement preview
- Card tooltips on placed cards (hover to inspect)
- Effect resolution log
- Score tracking and win condition

## Open Questions

- **First-player advantage**: On a 12-cell grid, does going first matter significantly? May need a balancing mechanism (second player bonus, or P2 gets last move).
- **Tier 5 cards and the "Fired" status**: Powerful but scoped to max 1 per deck. Redistribution mechanic needs playtesting to check for feel-bad/degenerate cases.
- **eachTurn multiplier calibration**: Persistent effects scale with placement timing. The budget formula's 1.5× multiplier is a guess — needs data from real games.
- **Variations in collection model**: Players choose pattern variants at deckbuilding time. How many variants per character? How different should they be?
- **Additional effect primitives**: Drain (remove from self, give to target) and Siphon (take from target, add to self) are designed but not yet implemented. Siphon is intentionally bad (helps enemies, hurts self) — useful as a combo enabler with onHit.
- **Status effects**: OOO, Inverse, Promote/Demote, Pip, Fired — all designed conceptually but not prototyped. These are tier 4-5 territory.
- **Visual language / iconography**: As the card pool grows, card text will need compression into keywords and icons (like MTG keyword abilities).

## Session 2 — Playtest Rebalance

### Board and Hand Size

- Grid expanded from 4x3 → 4x4 (16 cells, 8 rounds).
- Hands grew from 7 → 10 cards per player; 2 go unused each match, introducing a small draft decision at the start of a game.
- Three new cards per deck were added to fill the expanded hand (P1: Rookie, Enforcer, Director; P2: Clerk, Analyst, Coach).

### Tier Shape as Silhouette, Not Rule

The original tier rubric scaled power monotonically via `power = arrows × magnitude`. Initial play exposed two problems: T1/T2 cards felt too weak as finishers, and T4 single-target spikes were brittle against pull counterplay.

Revised default shape:

| Tier | Default arrows | Default magnitude |
|------|----------------|-------------------|
| T1   | 1              | 3 |
| T2   | 2              | 2–3 |
| T3   | 3              | 2 |
| T4   | 4              | 1–2 |
| T5   | 5–6            | 1 |

Philosophy: T1/T2 become sharp hitters ("execute" pieces), T4/T5 become board-shapers whose value is coverage and trigger flexibility, not per-hit magnitude.

**These are silhouettes, not constraints.** A card can break the pattern when it has a distinctive effect or trigger that earns the deviation — e.g. a T1 with 3 arrows at push 1 (harasser), or a T5 single-arrow execute at push 4. Tiers continue to gate effect *complexity* (effect count, filters, triggers, specials) via the original table; only the default arrows/magnitude curve is being relaxed.

### `eachTurn` Self-Rukas Cost

`eachTurn` carries a 1.5× reliability multiplier in the budget formula and is by far the strongest trigger per arrow. Rather than lowering magnitude further (which makes the effect feel invisible), cards with an `eachTurn` effect now gain rukas on themselves each round as an intrinsic cost.

This turns persistence into a real timing decision: play a Scrum Master on round 1 and it pays 8 self-rukas over the game; play it round 6 and it pays only 3. The cost scales with remaining rounds, giving the player a meaningful knob.

Implemented via a new optional `target: 'self'` on the Effect type. Self-targeted effects apply directly to the source card, skip arrow iteration, and intentionally do **not** chain `onHit` (the self-cost is a bookkeeping tax, not a "hit" for retaliation purposes).

### Number Adjustments Applied This Session

- **T1 push/pull bumped 2 → 3** across every T1 (6 cards).
- **T2 magnitudes raised** where the card matched the default 2-arrow silhouette (Delegator 1→2, Hustler 2→3, Enforcer 2→3, Mediator 1→2, Mentor's push 2→3, Analyst 2→3).
- **T3 unchanged** — the old sweet spot still hits target power.
- **T4 reshapes:**
  - Architect gains a W arrow (3 → 4 cardinals); `onTargetAcquired` push drops 2→1. `onHit` push 1 unchanged.
  - VP gains SW + SE (now all four diagonals red); `onNeighbor` push 2→1, `onPlay` ally pull 3→2.
- **`eachTurn` self-cost added:**
  - Scrum Master: +1 self rukas each round.
  - Coach: +1 self rukas each round.

### Open Follow-ups

- Visual affordance for self-cost: today it only shows in the effect label. A "+1/round" badge or a small dashed self-loop on the board would help preview pressure without inspecting each card.
- T5 slot still empty — needs at least one per side to validate the "5–6 arrows at magnitude 1" silhouette and test the "execute" exception (e.g. T5 single-arrow push 4).
- Draft decision with 2 unused cards is currently passive (just reveals after placement). Worth testing an explicit open-information draft phase to see if the deckbuilding-at-table feel adds tension or slows the game.
