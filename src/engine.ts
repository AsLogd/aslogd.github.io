import {
  type Board, type GameState, type PlacedCard, type CardDefinition,
  type Player, type Position, type ResolutionStep, type Effect, type Direction,
  ROWS, COLS, CLOCKWISE_ORDER,
} from './types';

// --- Position helpers ---

const DIRECTION_OFFSETS: Record<Direction, [number, number]> = {
  N:  [-1,  0],
  NE: [-1,  1],
  E:  [ 0,  1],
  SE: [ 1,  1],
  S:  [ 1,  0],
  SW: [ 1, -1],
  W:  [ 0, -1],
  NW: [-1, -1],
};

const OPPOSITE_DIR: Record<Direction, Direction> = {
  N: 'S', NE: 'SW', E: 'W', SE: 'NW',
  S: 'N', SW: 'NE', W: 'E', NW: 'SE',
};

function adjacentPos(pos: Position, dir: Direction): Position | null {
  const [dr, dc] = DIRECTION_OFFSETS[dir];
  const r = pos.row + dr;
  const c = pos.col + dc;
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
  return { row: r, col: c };
}

function posKey(p: Position): string {
  return `${p.row},${p.col}`;
}

// --- Effect resolution ---

const MAX_LOOP_REPETITIONS = 3;

interface ResolveContext {
  board: Board;
  steps: ResolutionStep[];
  loopCounts: Map<string, number>;
}

function triggerKey(source: Position, effectIdx: number, target: Position): string {
  return `${posKey(source)}:${effectIdx}:${posKey(target)}`;
}

function resolveEffect(
  ctx: ResolveContext,
  source: PlacedCard,
  effect: Effect,
  effectIdx: number,
) {
  if (effect.target === 'self') {
    let rukasChange = 0;
    switch (effect.type) {
      case 'push':
        source.rukas += effect.magnitude;
        rukasChange = effect.magnitude;
        break;
      case 'pull': {
        const pulled = Math.min(source.rukas, effect.magnitude);
        source.rukas -= pulled;
        rukasChange = -pulled;
        break;
      }
    }
    ctx.steps.push({
      source: source.position,
      target: source.position,
      effectType: effect.type,
      rukasChange,
      trigger: effect.trigger,
    });
    return;
  }

  const arrows = source.definition.arrows
    .filter(a => a.color === effect.color)
    .sort((a, b) => CLOCKWISE_ORDER.indexOf(a.direction) - CLOCKWISE_ORDER.indexOf(b.direction));

  for (const arrow of arrows) {
    const targetPos = adjacentPos(source.position, arrow.direction);
    if (!targetPos) continue;
    const target = ctx.board[targetPos.row][targetPos.col];
    if (!target) continue;

    // Apply filter
    if (effect.filter?.team === 'ally' && target.owner !== source.owner) continue;
    if (effect.filter?.team === 'enemy' && target.owner === source.owner) continue;

    // Loop detection
    const key = triggerKey(source.position, effectIdx, target.position);
    const count = ctx.loopCounts.get(key) ?? 0;
    if (count >= MAX_LOOP_REPETITIONS) continue;
    ctx.loopCounts.set(key, count + 1);

    // Apply effect
    let rukasChange = 0;
    switch (effect.type) {
      case 'push':
        target.rukas += effect.magnitude;
        rukasChange = effect.magnitude;
        break;
      case 'pull': {
        const pulled = Math.min(target.rukas, effect.magnitude);
        target.rukas -= pulled;
        rukasChange = -pulled;
        break;
      }
    }

    ctx.steps.push({
      source: source.position,
      target: target.position,
      effectType: effect.type,
      rukasChange,
      trigger: effect.trigger,
    });

    // DFS: if target received rukas, check onHit triggers
    if (rukasChange > 0) {
      target.definition.effects.forEach((e, i) => {
        if (e.trigger === 'onHit') {
          resolveEffect(ctx, target, e, i);
        }
      });
    }
  }
}

// --- Public API ---

export function createInitialState(
  p1Hand: CardDefinition[],
  p2Hand: CardDefinition[],
): GameState {
  const board: Board = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );
  return {
    board,
    hands: { p1: [...p1Hand], p2: [...p2Hand] },
    currentPlayer: 'p1',
    round: 1,
    totalRounds: (ROWS * COLS) / 2,
    phase: 'playing',
    selectedCardIndex: null,
  };
}

export function canPlace(state: GameState, pos: Position): boolean {
  return state.phase === 'playing' && state.board[pos.row][pos.col] === null;
}

export function placeCard(
  state: GameState,
  cardIndex: number,
  pos: Position,
): ResolutionStep[] {
  const player = state.currentPlayer;
  const card = state.hands[player][cardIndex];
  if (!card || !canPlace(state, pos)) return [];

  const turnNumber = (state.round - 1) * 2 + (player === 'p1' ? 1 : 2);

  const placed: PlacedCard = {
    definition: card,
    owner: player,
    position: pos,
    rukas: 0,
    placedOnTurn: turnNumber,
  };
  state.board[pos.row][pos.col] = placed;

  // Remove card from hand
  state.hands[player].splice(cardIndex, 1);

  const ctx: ResolveContext = {
    board: state.board,
    steps: [],
    loopCounts: new Map(),
  };

  // Resolution order:
  // 1. onPlay — placed card's immediate effects (+ DFS chains from onHit)
  // 2. onNeighbor — existing adjacent cards react to new neighbor
  // 3. onTargetAcquired — fires AFTER the placed card is fully settled,
  //    so pulls can actually remove rukas the card accumulated during steps 1-2.
  //    a) Existing cards whose arrows point at the newly placed card
  //    b) The placed card's own arrows pointing at existing cards

  // 1. onPlay
  placed.definition.effects.forEach((effect, i) => {
    if (effect.trigger === 'onPlay') {
      resolveEffect(ctx, placed, effect, i);
    }
  });

  // 2. onNeighbor
  for (const dir of CLOCKWISE_ORDER) {
    const adjPos = adjacentPos(pos, dir);
    if (!adjPos) continue;
    const adjCard = state.board[adjPos.row][adjPos.col];
    if (!adjCard || adjCard === placed) continue;
    adjCard.definition.effects.forEach((effect, i) => {
      if (effect.trigger === 'onNeighbor') {
        resolveEffect(ctx, adjCard, effect, i);
      }
    });
  }

  // 3a. onTargetAcquired — existing cards react to the new card in their arrow path
  for (const dir of CLOCKWISE_ORDER) {
    const adjPos = adjacentPos(pos, dir);
    if (!adjPos) continue;
    const adjCard = state.board[adjPos.row][adjPos.col];
    if (!adjCard || adjCard === placed) continue;
    const oppositeDir = OPPOSITE_DIR[dir];
    const matchingArrows = adjCard.definition.arrows.filter(a => a.direction === oppositeDir);
    if (matchingArrows.length === 0) continue;
    const matchingColors = new Set(matchingArrows.map(a => a.color));
    adjCard.definition.effects.forEach((effect, i) => {
      if (effect.trigger === 'onTargetAcquired' && matchingColors.has(effect.color)) {
        resolveEffect(ctx, adjCard, effect, i);
      }
    });
  }

  // 3b. onTargetAcquired — placed card's own arrows fire on existing targets
  placed.definition.effects.forEach((effect, i) => {
    if (effect.trigger === 'onTargetAcquired') {
      resolveEffect(ctx, placed, effect, i);
    }
  });

  // Advance turn
  if (player === 'p2') {
    // End of round: resolve eachTurn effects
    const eachTurnSteps = resolveEachTurn(state);
    ctx.steps.push(...eachTurnSteps);

    // Check if game is over
    if (state.round >= state.totalRounds) {
      state.phase = 'finished';
    } else {
      state.round++;
    }
  }
  state.currentPlayer = player === 'p1' ? 'p2' : 'p1';
  state.selectedCardIndex = null;

  return ctx.steps;
}

function resolveEachTurn(state: GameState): ResolutionStep[] {
  const ctx: ResolveContext = {
    board: state.board,
    steps: [],
    loopCounts: new Map(),
  };

  // Process in order of placement
  const placed: PlacedCard[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const card = state.board[r][c];
      if (card) placed.push(card);
    }
  }
  placed.sort((a, b) => a.placedOnTurn - b.placedOnTurn);

  for (const card of placed) {
    card.definition.effects.forEach((effect, i) => {
      if (effect.trigger === 'eachTurn') {
        resolveEffect(ctx, card, effect, i);
      }
    });
  }

  return ctx.steps;
}

export function previewPlacement(
  state: GameState,
  cardIndex: number,
  pos: Position,
): ResolutionStep[] {
  // Deep clone the board to simulate without mutating
  const clonedBoard: Board = state.board.map(row =>
    row.map(cell =>
      cell ? { ...cell, definition: { ...cell.definition } } : null,
    ),
  );
  const tempState: GameState = {
    ...state,
    board: clonedBoard,
    hands: {
      p1: [...state.hands.p1],
      p2: [...state.hands.p2],
    },
  };
  return placeCard(tempState, cardIndex, pos);
}

export function getEachTurnPreview(state: GameState): ResolutionStep[] {
  const steps: ResolutionStep[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const card = state.board[r][c];
      if (!card) continue;
      for (const effect of card.definition.effects) {
        if (effect.trigger !== 'eachTurn') continue;
        if (effect.target === 'self') {
          steps.push({
            source: card.position,
            target: card.position,
            effectType: effect.type,
            rukasChange: effect.type === 'push' ? effect.magnitude : -Math.min(card.rukas, effect.magnitude),
            trigger: 'eachTurn',
          });
          continue;
        }
        const arrows = card.definition.arrows
          .filter(a => a.color === effect.color)
          .sort((a, b) => CLOCKWISE_ORDER.indexOf(a.direction) - CLOCKWISE_ORDER.indexOf(b.direction));
        for (const arrow of arrows) {
          const targetPos = adjacentPos(card.position, arrow.direction);
          if (!targetPos) continue;
          const target = state.board[targetPos.row][targetPos.col];
          if (!target) continue;
          if (effect.filter?.team === 'ally' && target.owner !== card.owner) continue;
          if (effect.filter?.team === 'enemy' && target.owner === card.owner) continue;
          steps.push({
            source: card.position,
            target: targetPos,
            effectType: effect.type,
            rukasChange: effect.type === 'push' ? effect.magnitude : -Math.min(target.rukas, effect.magnitude),
            trigger: 'eachTurn',
          });
        }
      }
    }
  }
  return steps;
}

export function getScores(state: GameState): Record<Player, number> {
  let p1 = 0;
  let p2 = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const card = state.board[r][c];
      if (!card) continue;
      if (card.owner === 'p1') p1 += card.rukas;
      else p2 += card.rukas;
    }
  }
  return { p1, p2 };
}

export function getWinner(state: GameState): Player | 'tie' | null {
  if (state.phase !== 'finished') return null;
  const scores = getScores(state);
  if (scores.p1 < scores.p2) return 'p1';
  if (scores.p2 < scores.p1) return 'p2';
  return 'tie';
}
