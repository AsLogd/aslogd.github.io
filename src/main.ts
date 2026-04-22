import './style.css';
import { createInitialState } from './engine';
import { PLAYER1_DECK, PLAYER2_DECK } from './cards';
import { Renderer } from './ui';
import { ROWS, COLS } from './types';

console.log('[main.ts] LOADED, ROWS:', ROWS, 'COLS:', COLS, 'P1 deck size:', PLAYER1_DECK.length, 'P2 deck size:', PLAYER2_DECK.length);

function startGame() {
  const app = document.getElementById('app')!;
  const state = createInitialState(PLAYER1_DECK, PLAYER2_DECK);

  const renderer = new Renderer(app, state, () => {
    renderer.clearLog();
    const fresh = createInitialState(PLAYER1_DECK, PLAYER2_DECK);
    renderer.setState(fresh);
    renderer.render();
  });

  console.log('[main.ts] board dimensions:', state.board.length, 'x', state.board[0]?.length);
  console.log('[main.ts] cells in DOM before render:', document.querySelectorAll('.board-cell').length);
  renderer.render();
  console.log('[main.ts] cells in DOM after render:', document.querySelectorAll('.board-cell').length);
}

startGame();
