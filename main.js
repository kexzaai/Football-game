// main.js - Core game setup and loop

let scene, camera, renderer;
let gameState = {
  running: false,
  paused: false,
  goalCooldown: 0,
  selectedTeam: 'red',
  difficulty: 'easy'
};

let timerInterval = null;
let audioCtx = null;

// ===== SCENE SETUP =====
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 40, 80);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 14, 20);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('gameCanvas'),
    antialias: window.devicePixelRatio < 2
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ===== PITCH =====
function buildPitch() {
  // Grass
  const grassGeo = new THREE.PlaneGeometry(66, 45);
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x2d8a2d });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  // Alternating stripes
  for (let i = 0; i < 6; i++) {
    if (i % 2 === 0) {
      const stripeGeo = new THREE.PlaneGeometry(66, 7.5);
      const stripeMat = new THREE.MeshLambertMaterial({ color: 0x267a26, transparent: true, opacity: 0.5 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.01, -18.75 + i * 7.5);
      scene.add(stripe);
    }
  }

  // Pitch lines (white)
  function addLine(points, width = 0.12) {
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 20, width, 4, false);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.02;
    scene.add(mesh);
  }

  // Boundary
  addLine([new THREE.Vector3(-32, 0, -22), new THREE.Vector3(32, 0, -22), new THREE.Vector3(32, 0, 22), new THREE.Vector3(-32, 0, 22), new THREE.Vector3(-32, 0, -22)]);
  // Center line
  addLine([new THREE.Vector3(-32, 0, 0), new THREE.Vector3(32, 0, 0)]);

  // Center circle
  const circlePoints = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    circlePoints.push(new THREE.Vector3(Math.cos(a) * 5, 0, Math.sin(a) * 5));
  }
  addLine(circlePoints, 0.1);

  // Penalty areas
  addLine([
    new THREE.Vector3(-9, 0, -22), new THREE.Vector3(-9, 0, -14),
    new THREE.Vector3(9, 0, -14), new THREE.Vector3(9, 0, -22)
  ]);
  addLine([
    new THREE.Vector3(-9, 0, 22), new THREE.Vector3(-9, 0, 14),
    new THREE.Vector3(9, 0, 14), new THREE.Vector3(9, 0, 22)
  ]);

  // Build goalposts
  buildGoal(1);
  buildGoal(-1);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(10, 25, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);

  // Floodlights (decorative)
  [-28, 28].forEach(x => {
    [-20, 20].forEach(z => {
      const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 12, 6);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 6, z);
      scene.add(pole);
    });
  });
}

function buildGoal(side) {
  // side: 1 = player goal (z+), -1 = ai goal (z-)
  const z = side * 22.5;
  const mat = new THREE.MeshPhongMaterial({ color: 0xffffff });

  const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 8);

  // Left post
  const leftPost = new THREE.Mesh(postGeo, mat);
  leftPost.position.set(-3.5, 1.25, z);
  scene.add(leftPost);

  // Right post
  const rightPost = new THREE.Mesh(postGeo, mat);
  rightPost.position.set(3.5, 1.25, z);
  scene.add(rightPost);

  // Crossbar
  const crossGeo = new THREE.CylinderGeometry(0.12, 0.12, 7, 8);
  const crossbar = new THREE.Mesh(crossGeo, mat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 2.5, z);
  scene.add(crossbar);

  // Net (simple grid)
  const netMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.4, side: THREE.DoubleSide, wireframe: true });
  const netGeo = new THREE.BoxGeometry(7, 2.5, 1.5);
  const net = new THREE.Mesh(netGeo, netMat);
  net.position.set(0, 1.25, z + side * 0.75);
  scene.add(net);
}

// ===== CAMERA =====
const cameraTarget = new THREE.Vector3();
const cameraPos = new THREE.Vector3();

function updateCamera() {
  const player = PlayerManager.activePlayer;
  if (!player) return;

  const px = player.mesh.position.x;
  const pz = player.mesh.position.z;

  cameraTarget.x += (px * 0.3 - cameraTarget.x) * 0.05;
  cameraTarget.z += (pz * 0.3 + Ball.position.z * 0.5 - cameraTarget.z) * 0.05;

  const desiredY = 14 + Math.abs(Ball.position.z - pz) * 0.2;
  const desiredZ = pz + 18;

  cameraPos.x += (cameraTarget.x - cameraPos.x) * 0.05;
  cameraPos.y += (desiredY - cameraPos.y) * 0.04;
  cameraPos.z += (desiredZ - cameraPos.z) * 0.04;

  camera.position.copy(cameraPos);
  camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
}

// ===== GOAL HANDLING =====
function handleGoal(scorer) {
  if (gameState.goalCooldown > 0) return;
  gameState.goalCooldown = 180; // 3 seconds

  if (scorer === 'player') {
    UI.score.player++;
  } else {
    UI.score.ai++;
  }

  UI.updateScore();
  UI.showGoal(scorer);
  playSound('goal');

  setTimeout(() => {
    Ball.reset();
    PlayerManager.resetPositions();
    gameState.goalCooldown = 0;
  }, 2500);
}

// ===== SOUND =====
function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}
}

function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'kick') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } else if (type === 'goal') {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15);
      g.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.3);
      o.start(audioCtx.currentTime + i * 0.15);
      o.stop(audioCtx.currentTime + i * 0.15 + 0.3);
    });
  } else if (type === 'whistle') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.setValueAtTime(900, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.6);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  }
}

// ===== ACTION HANDLING =====
window.onActionPress = function(action) {
  if (!gameState.running || gameState.paused) return;
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

  const active = PlayerManager.activePlayer;
  if (!active) return;

  switch (action) {
    case 'shoot':
      if (Physics.checkBallPlayerCollision(Ball, active, 3)) {
        Physics.shoot(Ball, active, 22); // shoot toward AI goal (z negative)
        playSound('kick');
      } else {
        // Dash toward ball then shoot
        const dx = Ball.position.x - active.mesh.position.x;
        const dz = Ball.position.z - active.mesh.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < 6) {
          const dir = new THREE.Vector3(dx / d, 0, dz / d);
          Ball.velocity.set(dir.x * 0.3, 0.1, -0.3);
          Ball.position.copy(active.mesh.position);
          Ball.lastKickedBy = active;
          playSound('kick');
        }
      }
      break;

    case 'pass':
      if (Physics.checkBallPlayerCollision(Ball, active, 4)) {
        const teammate = PlayerManager.getNearestTeammate(active);
        Physics.pass(Ball, active, teammate);
        playSound('kick');
      }
      break;

    case 'tackle':
      AI.handleTackle(active, Ball);
      playSound('kick');
      break;
  }
};

// ===== GAME LOOP =====
let lastTime = 0;
function gameLoop(timestamp) {
  if (!gameState.running) return;

  const delta = timestamp - lastTime;
  lastTime = timestamp;

  if (!gameState.paused && gameState.goalCooldown <= 0) {
    // Update controls / player
    PlayerManager.updateActivePlayer(Ball);
    PlayerManager.updateSupportPlayers(Ball);

    // Update AI
    AI.update(Ball, gameState);

    // Update ball physics
    Ball.update();

    // Check ball-player collision for player team
    PlayerManager.playerTeam.forEach(p => {
      if (Physics.checkBallPlayerCollision(Ball, p, 1.0) && Ball.lastKickedBy !== p) {
        // Deflect ball
        const dx = Ball.position.x - p.mesh.position.x;
        const dz = Ball.position.z - p.mesh.position.z;
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        Ball.velocity.x += (dx / d) * 0.05;
        Ball.velocity.z += (dz / d) * 0.05;
      }
    });

    // Check goal
    const goalResult = Physics.checkGoal(Ball);
    if (goalResult) {
      handleGoal(goalResult);
    }
  }

  if (gameState.goalCooldown > 0) {
    gameState.goalCooldown--;
  }

  updateCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}

// ===== START/STOP =====
function startGame() {
  document.getElementById('startScreen').classList.remove('active');
  document.getElementById('gameUI').classList.remove('hidden');

  initAudio();
  initScene();
  buildPitch();
  Ball.create(scene);
  PlayerManager.init(scene, gameState.selectedTeam);
  AI.setDifficulty(gameState.difficulty);
  UI.init();
  TouchControls.init();

  // Camera initial position
  cameraPos.set(0, 14, 20);
  cameraTarget.set(0, 0, 0);

  // Start timer
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameState.paused && gameState.running) {
      UI.timeLeft = Math.max(0, UI.timeLeft - 1);
      UI.updateTimer();
      if (UI.timeLeft <= 0) {
        endGame();
      }
    }
  }, 1000);

  gameState.running = true;
  gameState.paused = false;
  gameState.goalCooldown = 0;

  playSound('whistle');
  requestAnimationFrame(gameLoop);
}

function endGame() {
  gameState.running = false;
  clearInterval(timerInterval);
  playSound('whistle');

  setTimeout(() => {
    document.getElementById('gameUI').classList.add('hidden');
    UI.showGameOver(UI.score.player, UI.score.ai);
  }, 500);
}

function restartGame() {
  UI.hideGameOver();
  // Cleanup
  if (scene) {
    while (scene.children.length > 0) scene.remove(scene.children[0]);
  }
  clearInterval(timerInterval);
  gameState.running = false;

  document.getElementById('gameUI').classList.remove('hidden');
  document.getElementById('pauseOverlay').classList.add('hidden');

  initScene();
  buildPitch();
  Ball.create(scene);
  PlayerManager.init(scene, gameState.selectedTeam);
  AI.setDifficulty(gameState.difficulty);
  UI.init();

  cameraPos.set(0, 14, 20);
  cameraTarget.set(0, 0, 0);

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameState.paused && gameState.running) {
      UI.timeLeft = Math.max(0, UI.timeLeft - 1);
      UI.updateTimer();
      if (UI.timeLeft <= 0) endGame();
    }
  }, 1000);

  gameState.running = true;
  gameState.paused = false;
  gameState.goalCooldown = 0;
  playSound('whistle');
  requestAnimationFrame(gameLoop);
}

function showStart() {
  gameState.running = false;
  clearInterval(timerInterval);
  UI.hideGameOver();
  document.getElementById('gameUI').classList.add('hidden');
  document.getElementById('pauseOverlay').classList.add('hidden');
  document.getElementById('startScreen').classList.add('active');
  if (scene) {
    while (scene.children.length > 0) scene.remove(scene.children[0]);
  }
}

function togglePause() {
  gameState.paused = !gameState.paused;
  document.getElementById('pauseBtn').textContent = gameState.paused ? '▶' : '⏸';
  document.getElementById('pauseOverlay').classList.toggle('hidden', !gameState.paused);
}

function switchPlayer() {
  PlayerManager.switchToNearestPlayerToBall(Ball);
}

// Team / difficulty selection
function selectTeam(team) {
  gameState.selectedTeam = team;
  document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-team="${team}"]`).classList.add('active');
}

function selectDiff(diff) {
  gameState.difficulty = diff;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-diff="${diff}"]`).classList.add('active');
}
