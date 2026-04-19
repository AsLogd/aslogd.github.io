import './style.css';
import { createInitialState } from './engine';
import { PLAYER1_DECK, PLAYER2_DECK } from './cards';
import { Renderer } from './ui';

function startGame() {
  const app = document.getElementById('app')!;
  const state = createInitialState(PLAYER1_DECK, PLAYER2_DECK);

  const renderer = new Renderer(app, state, () => {
    renderer.clearLog();
    const fresh = createInitialState(PLAYER1_DECK, PLAYER2_DECK);
    renderer.setState(fresh);
    renderer.render();
  });

  renderer.render();
}

startGame();
