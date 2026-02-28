// ai.js - AI team logic

const AI = {
  difficulty: 'medium',
  shootCooldown: 0,
  passCooldown: 0,
  decisionTimer: 0,

  diffSettings: {
    easy:   { speed: 0.07, reactionTime: 60, shootAccuracy: 0.4, shootRange: 10 },
    medium: { speed: 0.10, reactionTime: 30, shootAccuracy: 0.7, shootRange: 14 },
    hard:   { speed: 0.13, reactionTime: 15, shootAccuracy: 0.9, shootRange: 20 }
  },

  setDifficulty(diff) {
    this.difficulty = diff;
    const s = this.diffSettings[diff];
    PlayerManager.aiTeam.forEach(p => {
      p.speed = s.speed;
      p.maxSpeed = s.speed * 1.3;
    });
  },

  update(ball, gameState) {
    if (gameState.paused || gameState.goalCooldown > 0) return;

    const settings = this.diffSettings[this.difficulty];
    this.shootCooldown = Math.max(0, this.shootCooldown - 1);
    this.passCooldown = Math.max(0, this.passCooldown - 1);
    this.decisionTimer = Math.max(0, this.decisionTimer - 1);

    // Find AI player closest to ball
    let closestAI = null;
    let minDist = Infinity;
    PlayerManager.aiTeam.forEach(p => {
      const dx = p.mesh.position.x - ball.position.x;
      const dz = p.mesh.position.z - ball.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) { minDist = d; closestAI = p; }
    });

    if (!closestAI) return;

    // Ball chaser logic
    if (minDist > 1.2) {
      // Move toward ball
      this._moveToward(closestAI, ball.position.x, ball.position.z, settings.speed * 1.1);
    } else {
      // Has ball - decide what to do
      if (this.decisionTimer <= 0) {
        this.decisionTimer = settings.reactionTime;

        // Check distance to player goal (z positive = player goal)
        const distToGoal = Math.sqrt(
          closestAI.mesh.position.x ** 2 +
          (closestAI.mesh.position.z - 22) ** 2
        );

        if (distToGoal < settings.shootRange && this.shootCooldown <= 0) {
          // Shoot
          this._aiShoot(closestAI, ball, settings.shootAccuracy);
          this.shootCooldown = 90;
        } else {
          // Dribble toward goal
          this._moveToward(closestAI, 0, 22, settings.speed);
          // Kick ball along
          if (Physics.checkBallPlayerCollision(ball, closestAI, 1.5)) {
            const dx = 0 - ball.position.x;
            const dz = 22 - ball.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            ball.velocity.x = (dx / d) * 0.15;
            ball.velocity.z = (dz / d) * 0.15;
            ball.velocity.y = 0.02;
            ball.lastKickedBy = closestAI;
          }
        }
      } else {
        // Dribble
        this._moveToward(closestAI, 0, 22, settings.speed * 0.8);
        if (Physics.checkBallPlayerCollision(ball, closestAI, 1.5)) {
          ball.velocity.x += (closestAI.velocity.x || 0) * 0.5;
          ball.velocity.z += (closestAI.velocity.z || 0) * 0.5;
        }
      }
    }

    // Support AI players - move to strategic positions
    PlayerManager.aiTeam.forEach(p => {
      if (p === closestAI) return;
      const targetZ = -22 + (p.basePos.z + 22) * 0.6 + (ball.position.z + 22) * 0.3;
      const targetX = p.basePos.x * 0.7 + ball.position.x * 0.3;
      this._moveToward(p, targetX, targetZ, settings.speed * 0.6);
    });
  },

  _moveToward(player, tx, tz, speed) {
    const dx = tx - player.mesh.position.x;
    const dz = tz - player.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.2) {
      player.velocity = player.velocity || new THREE.Vector3();
      player.velocity.x = (dx / dist) * speed;
      player.velocity.z = (dz / dist) * speed;
      player.mesh.position.x += player.velocity.x;
      player.mesh.position.z += player.velocity.z;
      player.mesh.rotation.y = Math.atan2(dx, dz);

      // Animate
      const t = Date.now() * 0.01;
      const legs = player.mesh.children;
      if (legs[2]) legs[2].rotation.x = Math.sin(t) * 0.5;
      if (legs[3]) legs[3].rotation.x = Math.sin(t + Math.PI) * 0.5;
    }

    // Clamp
    player.mesh.position.x = Math.max(-31, Math.min(31, player.mesh.position.x));
    player.mesh.position.z = Math.max(-21, Math.min(21, player.mesh.position.z));
  },

  _aiShoot(shooter, ball, accuracy) {
    // Aim at player goal with accuracy variance
    const spread = (1 - accuracy) * 4;
    ball.velocity.x = (Math.random() - 0.5) * spread;
    ball.velocity.z = 0.32 + (Math.random() - 0.5) * (1 - accuracy) * 0.1;
    ball.velocity.y = 0.1 + Math.random() * 0.1;
    ball.position.copy(shooter.mesh.position);
    ball.position.y = 0.2;
    ball.lastKickedBy = shooter;
  },

  handleTackle(tackler, ball) {
    // Check if tackling AI has ball nearby
    PlayerManager.aiTeam.forEach(p => {
      if (Physics.checkBallPlayerCollision(ball, p, 1.5)) {
        // Tackle successful - knock ball away
        ball.velocity.x = (Math.random() - 0.5) * 0.3;
        ball.velocity.z = -0.15 - Math.random() * 0.1;
        ball.velocity.y = 0.1;
        ball.lastKickedBy = tackler;
      }
    });
  }
};
