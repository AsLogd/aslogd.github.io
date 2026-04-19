import {
  type GameState, type Player, type Position, type CardDefinition,
  type ResolutionStep, type Direction,
  ROWS, COLS,
} from './types';
import { canPlace, getScores, getWinner, placeCard, previewPlacement, getEachTurnPreview } from './engine';

// --- Direction helpers ---

const DIR_GRID_POS: Record<Direction, [number, number]> = {
  NW: [0, 0], N: [0, 1], NE: [0, 2],
  W:  [1, 0],            E:  [1, 2],
  SW: [2, 0], S: [2, 1], SE: [2, 2],
};

function effectLabel(e: { type: string; magnitude: number; color: string; trigger: string; filter?: { team?: string }; target?: string }): string {
  const parts: string[] = [];
  parts.push(e.type === 'push' ? `Push ${e.magnitude}` : `Pull ${e.magnitude}`);
  if (e.target === 'self') parts.push('self');
  if (e.filter?.team) parts.push(e.filter.team);
  const triggerLabels: Record<string, string> = {
    onHit: 'on hit',
    eachTurn: 'each turn',
    onNeighbor: 'on neighbor',
    onTargetAcquired: 'on target',
  };
  if (e.trigger !== 'onPlay') parts.push(triggerLabels[e.trigger] ?? e.trigger);
  return parts.join(', ');
}

// --- Renderer ---

export class Renderer {
  private app: HTMLElement;
  private state: GameState;
  private logEntries: string[] = [];
  private onRestart: () => void;

  // DOM references for arrow overlay
  private boardContainer: HTMLElement | null = null;
  private svgOverlay: SVGSVGElement | null = null;
  private cellElements: Map<string, HTMLElement> = new Map();

  constructor(app: HTMLElement, state: GameState, onRestart: () => void) {
    this.app = app;
    this.state = state;
    this.onRestart = onRestart;
  }

  setState(state: GameState) {
    this.state = state;
  }

  clearLog() {
    this.logEntries = [];
  }

  render() {
    this.app.innerHTML = '';
    this.cellElements.clear();

    this.app.appendChild(this.renderHeader());
    this.app.appendChild(this.renderScoreboard());

    const layout = document.createElement('div');
    layout.className = 'game-layout';
    layout.appendChild(this.renderHand('p1'));
    layout.appendChild(this.renderBoard());
    layout.appendChild(this.renderHand('p2'));
    this.app.appendChild(layout);

    this.app.appendChild(this.renderLog());

    const winner = getWinner(this.state);
    if (winner !== null) {
      this.app.appendChild(this.renderGameOver(winner));
    }
  }

  private renderHeader(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'header';
    const h1 = document.createElement('h1');
    h1.textContent = 'Rukator';
    div.appendChild(h1);

    const info = document.createElement('div');
    info.className = 'turn-info';
    if (this.state.phase === 'playing') {
      const pLabel = this.state.currentPlayer === 'p1' ? 'Player 1' : 'Player 2';
      const pClass = this.state.currentPlayer === 'p1' ? 'p1-color' : 'p2-color';
      info.innerHTML = `Round ${this.state.round}/${this.state.totalRounds} &mdash; <span class="active-player ${pClass}">${pLabel}</span>'s turn`;
    } else {
      info.textContent = 'Game Over';
    }
    div.appendChild(info);
    return div;
  }

  private renderScoreboard(): HTMLElement {
    const scores = getScores(this.state);
    const div = document.createElement('div');
    div.className = 'scoreboard';

    for (const p of ['p1', 'p2'] as Player[]) {
      const box = document.createElement('div');
      box.className = `score ${p}`;
      const label = p === 'p1' ? 'Player 1' : 'Player 2';
      box.innerHTML = `${label}: <span class="rukas">${scores[p]}</span> rukas`;
      div.appendChild(box);
    }
    return div;
  }

  private renderHand(player: Player): HTMLElement {
    const div = document.createElement('div');
    div.className = 'hand';

    const title = document.createElement('div');
    title.className = `hand-title ${player}`;
    title.textContent = player === 'p1' ? 'Player 1 Hand' : 'Player 2 Hand';
    div.appendChild(title);

    const isActive = this.state.currentPlayer === player && this.state.phase === 'playing';

    this.state.hands[player].forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'hand-card';
      if (!isActive) el.classList.add('disabled');
      if (isActive && this.state.selectedCardIndex === i) el.classList.add('selected');

      el.innerHTML = `
        <div class="card-name">${card.name}</div>
        <div class="card-tier">Tier ${card.tier}</div>
        ${this.miniPatternHTML(card)}
        <div class="card-effects">${card.effects.map(effectLabel).join('<br>')}</div>
      `;

      if (isActive) {
        el.addEventListener('click', () => {
          this.state.selectedCardIndex = this.state.selectedCardIndex === i ? null : i;
          this.render();
        });
      }

      div.appendChild(el);
    });

    return div;
  }

  private miniPatternHTML(card: CardDefinition): string {
    const grid: string[][] = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => ''),
    );

    for (const arrow of card.arrows) {
      const [r, c] = DIR_GRID_POS[arrow.direction];
      grid[r][c] = arrow.color;
    }

    let html = '<div class="mini-pattern">';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (r === 1 && c === 1) {
          html += '<div class="cell center"></div>';
        } else if (grid[r][c]) {
          html += `<div class="cell arrow-${grid[r][c]}"></div>`;
        } else {
          html += '<div class="cell"></div>';
        }
      }
    }
    html += '</div>';
    return html;
  }

  private renderBoard(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'board-container';
    this.boardContainer = container;

    const board = document.createElement('div');
    board.className = 'board';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const pos: Position = { row: r, col: c };
        const cell = this.state.board[r][c];
        const el = document.createElement('div');
        el.className = 'board-cell';
        el.dataset.row = String(r);
        el.dataset.col = String(c);
        this.cellElements.set(`${r},${c}`, el);

        if (cell) {
          el.classList.add('occupied', cell.owner);
          el.innerHTML = `
            <div class="placed-name">${cell.definition.name}</div>
            <div class="placed-tier">T${cell.definition.tier}</div>
            ${this.miniPatternHTML(cell.definition)}
            <div class="placed-rukas">${cell.rukas}</div>
          `;

          // Tooltip on hover for placed cards
          const tooltip = this.createCardTooltip(cell.definition, cell.owner, cell.rukas);
          el.appendChild(tooltip);
          el.addEventListener('mouseenter', () => tooltip.classList.add('visible'));
          el.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
        } else {
          el.classList.add('empty');
          el.innerHTML = `<div style="color:#555;font-size:11px;">${r},${c}</div>`;

          if (this.state.selectedCardIndex !== null && this.state.phase === 'playing') {
            el.addEventListener('mouseenter', () => this.showPreview(pos));
            el.addEventListener('mouseleave', () => this.clearPreview());
            el.addEventListener('click', () => this.handlePlace(pos));
          }
        }

        board.appendChild(el);
      }
    }

    // SVG overlay for arrows
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('arrow-overlay');
    svg.innerHTML = `
      <defs>
        <marker id="arrowhead-push" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#e94560" />
        </marker>
        <marker id="arrowhead-pull" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
          <polygon points="8 0, 0 3, 8 6" fill="#66bb6a" />
        </marker>
        <marker id="arrowhead-push-dim" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#e94560" opacity="0.5" />
        </marker>
        <marker id="arrowhead-pull-dim" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
          <polygon points="8 0, 0 3, 8 6" fill="#66bb6a" opacity="0.5" />
        </marker>
      </defs>
      <g class="persistent-arrows"></g>
      <g class="hover-arrows"></g>
    `;
    this.svgOverlay = svg;

    container.appendChild(board);
    container.appendChild(svg);

    // Draw persistent arrows (eachTurn effects) after layout settles
    requestAnimationFrame(() => this.drawPersistentArrows());

    return container;
  }

  private createCardTooltip(card: CardDefinition, owner: Player, rukas: number): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = `card-tooltip ${owner}`;
    tooltip.innerHTML = `
      <div class="tooltip-header">${card.name} <span class="tooltip-tier">T${card.tier}</span></div>
      ${this.miniPatternHTML(card)}
      <div class="tooltip-effects">
        ${card.effects.map(effectLabel).join('<br>')}
      </div>
      <div class="tooltip-rukas">${rukas} rukas</div>
    `;
    return tooltip;
  }

  private getCellCenter(pos: Position): { x: number; y: number } | null {
    const el = this.cellElements.get(`${pos.row},${pos.col}`);
    if (!el || !this.boardContainer) return null;
    const boardRect = this.boardContainer.getBoundingClientRect();
    const cellRect = el.getBoundingClientRect();
    return {
      x: cellRect.left + cellRect.width / 2 - boardRect.left,
      y: cellRect.top + cellRect.height / 2 - boardRect.top,
    };
  }

  private showPreview(pos: Position) {
    if (this.state.selectedCardIndex === null) return;
    if (!canPlace(this.state, pos)) return;

    const hoverCell = this.cellElements.get(`${pos.row},${pos.col}`);
    if (hoverCell) hoverCell.classList.add('preview-active');

    const steps = previewPlacement(this.state, this.state.selectedCardIndex, pos);

    // Aggregate deltas per target for the number badges
    const deltas = new Map<string, number>();
    for (const step of steps) {
      const key = `${step.target.row},${step.target.col}`;
      deltas.set(key, (deltas.get(key) ?? 0) + step.rukasChange);
    }

    // Show delta badges on cells
    deltas.forEach((delta, key) => {
      const targetEl = this.cellElements.get(key);
      if (targetEl && delta !== 0) {
        const tag = document.createElement('div');
        tag.className = `preview-delta${delta < 0 ? ' negative' : ''}`;
        tag.textContent = delta > 0 ? `+${delta}` : `${delta}`;
        targetEl.appendChild(tag);
      }
    });

    // Draw SVG arrows for placement-specific effects
    this.drawHoverArrows(steps, pos);
  }

  private drawArrowsToGroup(
    group: SVGGElement,
    steps: ResolutionStep[],
    style: { opacity: number; strokeWidth: number; dash?: string; markerSuffix: string; fontSize: number },
    placedPos?: Position,
  ) {
    if (!this.boardContainer) return;
    const rect = this.boardContainer.getBoundingClientRect();
    this.svgOverlay?.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

    // Group steps by source→target
    const grouped = new Map<string, { source: Position; target: Position; totalChange: number; effectType: string }>();
    for (const step of steps) {
      const key = `${step.source.row},${step.source.col}->${step.target.row},${step.target.col}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.totalChange += step.rukasChange;
      } else {
        grouped.set(key, {
          source: step.source,
          target: step.target,
          totalChange: step.rukasChange,
          effectType: step.effectType,
        });
      }
    }

    for (const { source, target, totalChange, effectType } of grouped.values()) {
      const from = this.getCellCenter(source);
      const to = this.getCellCenter(target);
      if (!from || !to) continue;

      const isPush = effectType === 'push';
      const color = isPush ? '#e94560' : '#66bb6a';

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      const pad = 30;
      const ux = dx / len;
      const uy = dy / len;

      let x1: number, y1: number, x2: number, y2: number;
      if (isPush) {
        x1 = from.x + ux * pad;
        y1 = from.y + uy * pad;
        x2 = to.x - ux * pad;
        y2 = to.y - uy * pad;
      } else {
        x1 = to.x - ux * pad;
        y1 = to.y - uy * pad;
        x2 = from.x + ux * pad;
        y2 = from.y + uy * pad;
      }

      const markerId = isPush ? `arrowhead-push${style.markerSuffix}` : `arrowhead-pull${style.markerSuffix}`;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', String(style.strokeWidth));
      line.setAttribute('marker-end', `url(#${markerId})`);
      line.setAttribute('opacity', String(style.opacity));
      if (style.dash) line.setAttribute('stroke-dasharray', style.dash);
      group.appendChild(line);

      // Label at midpoint
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const perpX = -uy * 12;
      const perpY = ux * 12;

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(mx + perpX));
      label.setAttribute('y', String(my + perpY));
      label.setAttribute('fill', color);
      label.setAttribute('font-size', String(style.fontSize));
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('opacity', String(style.opacity));
      const sign = totalChange > 0 ? '+' : '';
      label.textContent = `${sign}${totalChange}`;
      group.appendChild(label);

      // Source name label
      if (placedPos) {
        const sourceCard = this.state.board[source.row]?.[source.col];
        const isFromPlaced = source.row === placedPos.row && source.col === placedPos.col;
        const sourceName = sourceCard?.definition.name
          ?? (isFromPlaced && this.state.selectedCardIndex !== null
            ? this.state.hands[this.state.currentPlayer][this.state.selectedCardIndex]?.name
            : null);
        if (sourceName) {
          const srcLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          const slx = from.x + ux * (pad + 10) + perpX;
          const sly = from.y + uy * (pad + 10) + perpY;
          srcLabel.setAttribute('x', String(slx));
          srcLabel.setAttribute('y', String(sly));
          srcLabel.setAttribute('fill', '#ffffff88');
          srcLabel.setAttribute('font-size', '10');
          srcLabel.setAttribute('text-anchor', 'middle');
          srcLabel.setAttribute('dominant-baseline', 'middle');
          srcLabel.textContent = sourceName;
          group.appendChild(srcLabel);
        }
      }
    }
  }

  private drawPersistentArrows() {
    if (!this.svgOverlay || !this.boardContainer) return;
    const group = this.svgOverlay.querySelector('.persistent-arrows') as SVGGElement;
    if (!group) return;
    group.innerHTML = '';

    const eachTurnSteps = getEachTurnPreview(this.state);
    if (eachTurnSteps.length === 0) return;

    this.drawArrowsToGroup(group, eachTurnSteps, {
      opacity: 0.45,
      strokeWidth: 2,
      dash: '6 4',
      markerSuffix: '-dim',
      fontSize: 11,
    });
  }

  private drawHoverArrows(steps: ResolutionStep[], placedPos: Position) {
    if (!this.svgOverlay) return;
    const group = this.svgOverlay.querySelector('.hover-arrows') as SVGGElement;
    if (!group) return;

    requestAnimationFrame(() => {
      group.innerHTML = '';
      this.drawArrowsToGroup(group, steps, {
        opacity: 0.85,
        strokeWidth: 2.5,
        markerSuffix: '',
        fontSize: 13,
      }, placedPos);
    });
  }

  private clearPreview() {
    // Remove delta badges
    this.cellElements.forEach(el => {
      el.classList.remove('preview-active');
      el.querySelectorAll('.preview-delta').forEach(d => d.remove());
    });

    // Clear only hover arrows, keep persistent
    if (this.svgOverlay) {
      const hoverGroup = this.svgOverlay.querySelector('.hover-arrows');
      if (hoverGroup) hoverGroup.innerHTML = '';
    }
  }

  private handlePlace(pos: Position) {
    if (this.state.selectedCardIndex === null) return;
    if (!canPlace(this.state, pos)) return;

    const player = this.state.currentPlayer;
    const card = this.state.hands[player][this.state.selectedCardIndex];
    const steps = placeCard(this.state, this.state.selectedCardIndex, pos);

    this.logSteps(player, card, pos, steps);
    this.render();
  }

  private logSteps(player: Player, card: CardDefinition, pos: Position, steps: ResolutionStep[]) {
    const pLabel = player === 'p1' ? 'P1' : 'P2';
    this.logEntries.push(
      `<b>${pLabel}</b> plays <b>${card.name}</b> at (${pos.row},${pos.col})`
    );
    for (const step of steps) {
      const sign = step.rukasChange > 0 ? '+' : '';
      const cls = step.rukasChange > 0 ? 'push' : 'pull';
      const triggerTag = step.trigger !== 'onPlay' ? ` <span class="trigger-tag">[${step.trigger}]</span>` : '';
      const sourceCard = this.state.board[step.source.row]?.[step.source.col];
      const targetCard = this.state.board[step.target.row]?.[step.target.col];
      const sourceName = sourceCard?.definition.name ?? '?';
      const targetName = targetCard?.definition.name ?? '?';
      this.logEntries.push(
        `&nbsp;&nbsp;${sourceName} &rarr; ${targetName}: <span class="${cls}">${sign}${step.rukasChange}</span>${triggerTag}`
      );
    }
  }

  private renderLog(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'log-section';

    const title = document.createElement('div');
    title.className = 'log-title';
    title.textContent = 'Effect Log';
    section.appendChild(title);

    const log = document.createElement('div');
    log.className = 'log';
    log.innerHTML = this.logEntries.length
      ? this.logEntries.map(e => `<div class="log-entry">${e}</div>`).join('')
      : '<div class="log-entry" style="color:#555;">No effects resolved yet.</div>';
    section.appendChild(log);

    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });

    return section;
  }

  private renderGameOver(winner: Player | 'tie'): HTMLElement {
    const div = document.createElement('div');
    div.className = 'game-over';
    const scores = getScores(this.state);

    const h2 = document.createElement('h2');
    if (winner === 'tie') {
      h2.textContent = 'Tie Game!';
    } else {
      h2.textContent = `${winner === 'p1' ? 'Player 1' : 'Player 2'} Wins!`;
    }
    div.appendChild(h2);

    const info = document.createElement('div');
    info.className = 'final-scores';
    info.innerHTML = `Player 1: ${scores.p1} rukas &mdash; Player 2: ${scores.p2} rukas<br><small>Fewer rukas wins!</small>`;
    div.appendChild(info);

    const btn = document.createElement('button');
    btn.textContent = 'Play Again';
    btn.addEventListener('click', this.onRestart);
    div.appendChild(btn);

    return div;
  }
}
