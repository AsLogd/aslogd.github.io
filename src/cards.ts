import type { CardDefinition } from './types';

// P1 "The Aggressors" — mostly push, high pressure, simple reads
// P2 "The Tacticians" — push + pull mix, reactive, ally support

// =============================================================
// PLAYER 1 DECK
// =============================================================

// T1: East threat, classic opener
const p1Intern: CardDefinition = {
  id: 'p1-intern',
  name: 'The Intern',
  tier: 1,
  arrows: [{ direction: 'E', color: 'red' }],
  effects: [{ type: 'push', magnitude: 2, color: 'red', trigger: 'onTargetAcquired' }],
};

// T1: Downward pull — P1's only pull card, defensive option
const p1Helper: CardDefinition = {
  id: 'p1-helper',
  name: 'The Helper',
  tier: 1,
  arrows: [{ direction: 'S', color: 'blue' }],
  effects: [{ type: 'pull', magnitude: 2, color: 'blue', trigger: 'onTargetAcquired' }],
};

// T2: Vertical spread, plants threats above and below
const p1Delegator: CardDefinition = {
  id: 'p1-delegator',
  name: 'The Delegator',
  tier: 2,
  arrows: [
    { direction: 'N', color: 'red' },
    { direction: 'S', color: 'red' },
  ],
  effects: [{ type: 'push', magnitude: 1, color: 'red', trigger: 'onTargetAcquired' }],
};

// T2: Immediate diagonal burst, unfiltered — risky near allies
const p1Hustler: CardDefinition = {
  id: 'p1-hustler',
  name: 'The Hustler',
  tier: 2,
  arrows: [
    { direction: 'NE', color: 'red' },
    { direction: 'SE', color: 'red' },
  ],
  effects: [{ type: 'push', magnitude: 2, color: 'red', trigger: 'onPlay' }],
};

// T3: Persistent area denial, pushes enemies every round
const p1ScrumMaster: CardDefinition = {
  id: 'p1-scrum-master',
  name: 'Scrum Master',
  tier: 3,
  arrows: [
    { direction: 'N', color: 'red' },
    { direction: 'W', color: 'red' },
    { direction: 'E', color: 'red' },
  ],
  effects: [{
    type: 'push', magnitude: 1, color: 'red', trigger: 'eachTurn',
    filter: { team: 'enemy' },
  }],
};

// T3: East-facing wall of threats, enemies only so safe near allies
const p1Lead: CardDefinition = {
  id: 'p1-lead',
  name: 'The Lead',
  tier: 3,
  arrows: [
    { direction: 'NE', color: 'red' },
    { direction: 'E', color: 'red' },
    { direction: 'SE', color: 'red' },
  ],
  effects: [{
    type: 'push', magnitude: 2, color: 'red', trigger: 'onTargetAcquired',
    filter: { team: 'enemy' },
  }],
};

// T4: onTargetAcquired push + onHit retaliation — "don't feed me" zone
const p1Architect: CardDefinition = {
  id: 'p1-architect',
  name: 'The Architect',
  tier: 4,
  arrows: [
    { direction: 'N', color: 'red' },
    { direction: 'E', color: 'red' },
    { direction: 'S', color: 'red' },
  ],
  effects: [
    {
      type: 'push', magnitude: 2, color: 'red', trigger: 'onTargetAcquired',
      filter: { team: 'enemy' },
    },
    { type: 'push', magnitude: 1, color: 'red', trigger: 'onHit' },
  ],
};

// T1: South threat — companion to Intern, covers vertical lane
const p1Rookie: CardDefinition = {
  id: 'p1-rookie',
  name: 'The Rookie',
  tier: 1,
  arrows: [{ direction: 'S', color: 'red' }],
  effects: [{ type: 'push', magnitude: 2, color: 'red', trigger: 'onTargetAcquired' }],
};

// T2: Upward diagonal burst — mirror of Hustler, hits cards already above
const p1Enforcer: CardDefinition = {
  id: 'p1-enforcer',
  name: 'The Enforcer',
  tier: 2,
  arrows: [
    { direction: 'NW', color: 'red' },
    { direction: 'NE', color: 'red' },
  ],
  effects: [{ type: 'push', magnitude: 2, color: 'red', trigger: 'onPlay' }],
};

// T3: Horizontal sweep — enemy-only pressure across a row
const p1Director: CardDefinition = {
  id: 'p1-director',
  name: 'The Director',
  tier: 3,
  arrows: [
    { direction: 'W', color: 'red' },
    { direction: 'N', color: 'red' },
    { direction: 'E', color: 'red' },
  ],
  effects: [{
    type: 'push', magnitude: 2, color: 'red', trigger: 'onTargetAcquired',
    filter: { team: 'enemy' },
  }],
};

// =============================================================
// PLAYER 2 DECK
// =============================================================

// T1: West threat, mirror of P1 intern
const p2Intern: CardDefinition = {
  id: 'p2-intern',
  name: 'The Intern',
  tier: 1,
  arrows: [{ direction: 'W', color: 'red' }],
  effects: [{ type: 'push', magnitude: 2, color: 'red', trigger: 'onTargetAcquired' }],
};

// T1: Upward pull — cleans rukas off cards above
const p2Shadow: CardDefinition = {
  id: 'p2-shadow',
  name: 'The Shadow',
  tier: 1,
  arrows: [{ direction: 'N', color: 'blue' }],
  effects: [{ type: 'pull', magnitude: 2, color: 'blue', trigger: 'onTargetAcquired' }],
};

// T2: Horizontal pull, scrubs rukas off targets on both sides
const p2Mediator: CardDefinition = {
  id: 'p2-mediator',
  name: 'The Mediator',
  tier: 2,
  arrows: [
    { direction: 'E', color: 'blue' },
    { direction: 'W', color: 'blue' },
  ],
  effects: [{ type: 'pull', magnitude: 1, color: 'blue', trigger: 'onTargetAcquired' }],
};

// T2: Mixed — immediate push west, delayed pull east. Unfiltered, position matters.
const p2Mentor: CardDefinition = {
  id: 'p2-mentor',
  name: 'The Mentor',
  tier: 2,
  arrows: [
    { direction: 'W', color: 'red' },
    { direction: 'E', color: 'blue' },
  ],
  effects: [
    { type: 'push', magnitude: 2, color: 'red', trigger: 'onPlay' },
    { type: 'pull', magnitude: 2, color: 'blue', trigger: 'onTargetAcquired' },
  ],
};

// T3: Immediate ally support (pull) + slow offensive (push south on target)
const p2Firefighter: CardDefinition = {
  id: 'p2-firefighter',
  name: 'Firefighter',
  tier: 3,
  arrows: [
    { direction: 'W', color: 'blue' },
    { direction: 'E', color: 'blue' },
    { direction: 'S', color: 'red' },
  ],
  effects: [
    { type: 'pull', magnitude: 2, color: 'blue', trigger: 'onPlay' },
    { type: 'push', magnitude: 2, color: 'red', trigger: 'onTargetAcquired' },
  ],
};

// T3: Big onPlay burst north + sustained ally pull as board fills
const p2Manager: CardDefinition = {
  id: 'p2-manager',
  name: 'The Manager',
  tier: 3,
  arrows: [
    { direction: 'N', color: 'red' },
    { direction: 'W', color: 'blue' },
    { direction: 'E', color: 'blue' },
  ],
  effects: [
    { type: 'push', magnitude: 3, color: 'red', trigger: 'onPlay' },
    {
      type: 'pull', magnitude: 1, color: 'blue', trigger: 'onTargetAcquired',
      filter: { team: 'ally' },
    },
  ],
};

// T4: Landmine — onNeighbor push to enemies + immediate ally pull
const p2VP: CardDefinition = {
  id: 'p2-vp',
  name: 'The VP',
  tier: 4,
  arrows: [
    { direction: 'NW', color: 'red' },
    { direction: 'NE', color: 'red' },
    { direction: 'S', color: 'blue' },
  ],
  effects: [
    {
      type: 'push', magnitude: 2, color: 'red', trigger: 'onNeighbor',
      filter: { team: 'enemy' },
    },
    {
      type: 'pull', magnitude: 3, color: 'blue', trigger: 'onPlay',
      filter: { team: 'ally' },
    },
  ],
};

// T1: South pull — scrubs rukas off cards below
const p2Clerk: CardDefinition = {
  id: 'p2-clerk',
  name: 'The Clerk',
  tier: 1,
  arrows: [{ direction: 'S', color: 'blue' }],
  effects: [{ type: 'pull', magnitude: 2, color: 'blue', trigger: 'onTargetAcquired' }],
};

// T2: Diagonal pull — reactive across opposite corners
const p2Analyst: CardDefinition = {
  id: 'p2-analyst',
  name: 'The Analyst',
  tier: 2,
  arrows: [
    { direction: 'NE', color: 'blue' },
    { direction: 'SW', color: 'blue' },
  ],
  effects: [{ type: 'pull', magnitude: 2, color: 'blue', trigger: 'onTargetAcquired' }],
};

// T3: Persistent ally support — quietly cleans rukas off allies each round
const p2Coach: CardDefinition = {
  id: 'p2-coach',
  name: 'The Coach',
  tier: 3,
  arrows: [
    { direction: 'N', color: 'blue' },
    { direction: 'S', color: 'blue' },
  ],
  effects: [{
    type: 'pull', magnitude: 1, color: 'blue', trigger: 'eachTurn',
    filter: { team: 'ally' },
  }],
};

// --- Decks ---

export const PLAYER1_DECK: CardDefinition[] = [
  p1Intern, p1Helper, p1Rookie, p1Delegator, p1Hustler, p1Enforcer,
  p1ScrumMaster, p1Lead, p1Director, p1Architect,
];

export const PLAYER2_DECK: CardDefinition[] = [
  p2Intern, p2Shadow, p2Clerk, p2Mediator, p2Mentor, p2Analyst,
  p2Firefighter, p2Manager, p2Coach, p2VP,
];
