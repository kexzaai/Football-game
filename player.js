// player.js - Player creation and management

function createPlayerMesh(color, scene) {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.7, 8);
  const bodyMat = new THREE.MeshPhongMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.65;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.2, 12, 12);
  const headMat = new THREE.MeshPhongMaterial({ color: 0xffcc99 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.2;
  head.castShadow = true;
  group.add(head);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.5, 6);
  const legMat = new THREE.MeshPhongMaterial({ color: 0x222222 });

  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.13, 0.25, 0);
  group.add(legL);

  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.13, 0.25, 0);
  group.add(legR);

  scene.add(group);
  return group;
}

const PlayerManager = {
  playerTeam: [],
  aiTeam: [],
  activePlayer: null,
  playerColor: 0xe74c3c,
  aiColor: 0x3498db,
  scene: null,

  init(scene, playerColorHex) {
    this.scene = scene;
    this.playerTeam = [];
    this.aiTeam = [];

    const colorMap = { red: 0xe74c3c, blue: 0x3498db, green: 0x2ecc71 };
    this.playerColor = colorMap[playerColorHex] || 0xe74c3c;
    this.aiColor = playerColorHex === 'blue' ? 0xe74c3c : 0x3498db;

    // Create 5 player team
    const playerPositions = [
      { x: 0, z: 15 },    // GK
      { x: -6, z: 8 },    // DEF
      { x: 6, z: 8 },     // DEF
      { x: -4, z: 2 },    // MID
      { x: 4, z: 2 },     // FWD
    ];

    playerPositions.forEach((pos, i) => {
      const mesh = createPlayerMesh(this.playerColor, scene);
      mesh.position.set(pos.x, 0, pos.z);
      const p = {
        mesh,
        velocity: new THREE.Vector3(),
        speed: 0.12,
        maxSpeed: 0.18,
        stamina: 1.0,
        team: 'player',
        role: ['gk', 'def', 'def', 'mid', 'fwd'][i],
        basePos: { x: pos.x, z: pos.z },
        hasBall: false,
        isActive: i === 4
      };
      // Mark active player with ring
      if (i === 4) {
        this._addActiveRing(mesh, this.playerColor);
        this.activePlayer = p;
      }
      this.playerTeam.push(p);
    });

    // Create 5 AI team
    const aiPositions = [
      { x: 0, z: -15 },
      { x: -6, z: -8 },
      { x: 6, z: -8 },
      { x: -4, z: -2 },
      { x: 4, z: -2 },
    ];

    aiPositions.forEach((pos, i) => {
      const mesh = createPlayerMesh(this.aiColor, scene);
      mesh.position.set(pos.x, 0, pos.z);
      const p = {
        mesh,
        velocity: new THREE.Vector3(),
        speed: 0.1,
        maxSpeed: 0.16,
        stamina: 1.0,
        team: 'ai',
        role: ['gk', 'def', 'def', 'mid', 'fwd'][i],
        basePos: { x: pos.x, z: pos.z },
        hasBall: false
      };
      this.aiTeam.push(p);
    });

    // Update HUD dots
    document.getElementById('playerDot').style.background = `#${this.playerColor.toString(16).padStart(6, '0')}`;
    document.getElementById('aiDot').style.background = `#${this.aiColor.toString(16).padStart(6, '0')}`;
  },

  _addActiveRing(mesh, color) {
    if (this._activeRingMesh) {
      this.scene.remove(this._activeRingMesh);
    }
    const ringGeo = new THREE.TorusGeometry(0.4, 0.05, 6, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    mesh.add(ring);
    this._activeRingMesh = ring;
  },

  setActivePlayer(player) {
    if (this.activePlayer === player) return;
    // Remove ring from old
    if (this.activePlayer && this.activePlayer.mesh) {
      const oldRing = this.activePlayer.mesh.children.find(c => c.geometry && c.geometry.type === 'TorusGeometry');
      if (oldRing) this.activePlayer.mesh.remove(oldRing);
    }
    this.activePlayer = player;
    this._addActiveRing(player.mesh, this.playerColor);
  },

  switchToNearestPlayerToBall(ball) {
    let nearest = null;
    let minDist = Infinity;
    this.playerTeam.forEach(p => {
      const dx = p.mesh.position.x - ball.position.x;
      const dz = p.mesh.position.z - ball.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) { minDist = d; nearest = p; }
    });
    if (nearest) this.setActivePlayer(nearest);
  },

  updateActivePlayer(ball) {
    if (!this.activePlayer) return;
    const p = this.activePlayer;
    const move = TouchControls.getMovement();
    const isSprinting = TouchControls.buttons.sprint && p.stamina > 0.05;

    const speedMult = isSprinting ? 1.8 : 1.0;

    if (move.active && move.magnitude > 0.05) {
      const speed = p.speed * speedMult * move.magnitude;
      p.velocity.x = move.x * speed;
      p.velocity.z = move.y * speed;

      // Face direction
      p.mesh.rotation.y = Math.atan2(move.x, move.y);

      if (isSprinting) {
        p.stamina = Math.max(0, p.stamina - 0.008);
      }
    } else {
      p.velocity.x *= 0.8;
      p.velocity.z *= 0.8;
      // Recover stamina
      p.stamina = Math.min(1, p.stamina + 0.003);
    }

    p.mesh.position.x += p.velocity.x;
    p.mesh.position.z += p.velocity.z;

    // Clamp to pitch
    p.mesh.position.x = Math.max(-31, Math.min(31, p.mesh.position.x));
    p.mesh.position.z = Math.max(-21, Math.min(21, p.mesh.position.z));

    // Animate legs
    const speed = Math.sqrt(p.velocity.x ** 2 + p.velocity.z ** 2);
    if (speed > 0.01) {
      const t = Date.now() * 0.01;
      const legL = p.mesh.children[2];
      const legR = p.mesh.children[3];
      if (legL) legL.rotation.x = Math.sin(t) * 0.5;
      if (legR) legR.rotation.x = Math.sin(t + Math.PI) * 0.5;
    }

    // Update stamina bar
    document.getElementById('staminaFill').style.width = (p.stamina * 100) + '%';
  },

  updateSupportPlayers(ball) {
    this.playerTeam.forEach(p => {
      if (p === this.activePlayer) return;

      // Move toward strategic position
      const ballInfluence = p.role === 'fwd' ? 0.7 : 0.3;
      const targetX = p.basePos.x + (ball.position.x - p.basePos.x) * ballInfluence;
      const targetZ = p.basePos.z + (ball.position.z - p.basePos.z) * ballInfluence;

      const dx = targetX - p.mesh.position.x;
      const dz = targetZ - p.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.3) {
        p.mesh.position.x += (dx / dist) * 0.06;
        p.mesh.position.z += (dz / dist) * 0.06;
        p.mesh.rotation.y = Math.atan2(dx, dz);
      }
    });
  },

  resetPositions() {
    const playerPos = [
      { x: 0, z: 15 }, { x: -6, z: 8 }, { x: 6, z: 8 },
      { x: -4, z: 2 }, { x: 4, z: 2 }
    ];
    const aiPos = [
      { x: 0, z: -15 }, { x: -6, z: -8 }, { x: 6, z: -8 },
      { x: -4, z: -2 }, { x: 4, z: -2 }
    ];

    this.playerTeam.forEach((p, i) => {
      p.mesh.position.set(playerPos[i].x, 0, playerPos[i].z);
      p.velocity.set(0, 0, 0);
    });
    this.aiTeam.forEach((p, i) => {
      p.mesh.position.set(aiPos[i].x, 0, aiPos[i].z);
      p.velocity.set(0, 0, 0);
    });
  },

  getNearestTeammate(fromPlayer) {
    let nearest = null;
    let minDist = Infinity;
    this.playerTeam.forEach(p => {
      if (p === fromPlayer) return;
      const dx = p.mesh.position.x - fromPlayer.mesh.position.x;
      const dz = p.mesh.position.z - fromPlayer.mesh.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) { minDist = d; nearest = p; }
    });
    return nearest;
  }
};
