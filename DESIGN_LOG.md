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
