export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export const CLOCKWISE_ORDER: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export type ArrowColor = string;

export interface Arrow {
  direction: Direction;
  color: ArrowColor;
}

export type EffectType = 'push' | 'pull';

export type Trigger = 'onPlay' | 'onHit' | 'eachTurn' | 'onNeighbor' | 'onTargetAcquired';

export interface Filter {
  team?: 'ally' | 'enemy';
}

export interface Effect {
  type: EffectType;
  magnitude: number;
  color: ArrowColor;
  trigger: Trigger;
  filter?: Filter;
}

export interface CardDefinition {
  id: string;
  name: string;
  tier: number;
  arrows: Arrow[];
  effects: Effect[];
}

export type Player = 'p1' | 'p2';

export interface Position {
  row: number;
  col: number;
}

export interface PlacedCard {
  definition: CardDefinition;
  owner: Player;
  position: Position;
  rukas: number;
  placedOnTurn: number;
}

export interface ResolutionStep {
  source: Position;
  target: Position;
  effectType: EffectType;
  rukasChange: number;
  trigger: Trigger;
}

export const ROWS = 4;
export const COLS = 4;

export type Board = (PlacedCard | null)[][];

export interface GameState {
  board: Board;
  hands: Record<Player, CardDefinition[]>;
  currentPlayer: Player;
  round: number;
  totalRounds: number;
  phase: 'playing' | 'finished';
  selectedCardIndex: number | null;
}
