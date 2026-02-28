// ui.js - UI management

const UI = {
  score: { player: 0, ai: 0 },
  timeLeft: 90,
  goalTimeout: null,

  init() {
    this.score = { player: 0, ai: 0 };
    this.timeLeft = 90;
    this.updateScore();
    this.updateTimer();
  },

  updateScore() {
    document.getElementById('playerScore').textContent = this.score.player;
    document.getElementById('aiScore').textContent = this.score.ai;
  },

  updateTimer() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = Math.floor(this.timeLeft % 60);
    document.getElementById('timer').textContent =
      `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  showGoal(team) {
    const banner = document.getElementById('goalBanner');
    banner.querySelector('.goal-text').textContent = team === 'player' ? '⚽ GOAL! ⚽' : '😤 GOAL! 😤';
    banner.classList.remove('hidden');
    if (this.goalTimeout) clearTimeout(this.goalTimeout);
    this.goalTimeout = setTimeout(() => {
      banner.classList.add('hidden');
    }, 2500);
  },

  showGameOver(playerScore, aiScore) {
    const screen = document.getElementById('gameOverScreen');
    const title = document.getElementById('gameOverTitle');
    const score = document.getElementById('finalScore');
    const msg = document.getElementById('gameOverMsg');

    score.textContent = `${playerScore} - ${aiScore}`;

    if (playerScore > aiScore) {
      title.textContent = '🏆 YOU WIN!';
      msg.textContent = 'Brilliant performance!';
    } else if (playerScore < aiScore) {
      title.textContent = '😔 DEFEAT';
      msg.textContent = 'Better luck next time!';
    } else {
      title.textContent = '🤝 DRAW!';
      msg.textContent = 'A closely fought match!';
    }

    screen.classList.add('active');
  },

  hideGameOver() {
    document.getElementById('gameOverScreen').classList.remove('active');
  }
};
