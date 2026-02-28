// physics.js - Ball and player physics

const Physics = {
  BALL_FRICTION: 0.985,
  BALL_BOUNCE: 0.6,
  GROUND_Y: 0.2,
  GRAVITY: -0.015,
  PITCH_HALF_W: 32,
  PITCH_HALF_L: 22,

  updateBall(ball) {
    // Apply gravity
    if (ball.position.y > this.GROUND_Y) {
      ball.velocity.y += this.GRAVITY;
    } else {
      ball.position.y = this.GROUND_Y;
      if (Math.abs(ball.velocity.y) > 0.05) {
        ball.velocity.y *= -this.BALL_BOUNCE;
      } else {
        ball.velocity.y = 0;
      }
      // Ground friction
      ball.velocity.x *= this.BALL_FRICTION;
      ball.velocity.z *= this.BALL_FRICTION;
    }

    // Update position
    ball.position.x += ball.velocity.x;
    ball.position.y += ball.velocity.y;
    ball.position.z += ball.velocity.z;

    // Rolling rotation
    ball.mesh.rotation.x += ball.velocity.z * 2;
    ball.mesh.rotation.z -= ball.velocity.x * 2;

    // Boundary bounce (sides)
    if (Math.abs(ball.position.x) > this.PITCH_HALF_W) {
      ball.position.x = Math.sign(ball.position.x) * this.PITCH_HALF_W;
      ball.velocity.x *= -0.5;
    }
    if (Math.abs(ball.position.z) > this.PITCH_HALF_L) {
      ball.position.z = Math.sign(ball.position.z) * this.PITCH_HALF_L;
      ball.velocity.z *= -0.5;
    }

    ball.mesh.position.copy(ball.position);
  },

  shoot(ball, shooter, targetGoalZ) {
    const dir = new THREE.Vector3(
      (targetGoalZ > 0 ? 0 : 0) + (Math.random() - 0.5) * 0.3,
      0.12,
      targetGoalZ > 0 ? 0.35 : -0.35
    );

    // Add shooter velocity influence
    dir.x += shooter.velocity.x * 0.3;

    ball.velocity.set(dir.x, dir.y, dir.z);
    ball.position.copy(shooter.mesh.position);
    ball.position.y = this.GROUND_Y;
    ball.lastKickedBy = shooter;
  },

  pass(ball, shooter, target) {
    if (!target) return;
    const dx = target.mesh.position.x - shooter.mesh.position.x;
    const dz = target.mesh.position.z - shooter.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const speed = Math.min(0.3, 0.12 + dist * 0.008);

    ball.velocity.set(
      (dx / dist) * speed,
      0.05,
      (dz / dist) * speed
    );
    ball.position.copy(shooter.mesh.position);
    ball.position.y = this.GROUND_Y;
    ball.lastKickedBy = shooter;
  },

  kickBall(ball, kicker, power, direction) {
    ball.velocity.x = direction.x * power;
    ball.velocity.z = direction.z * power;
    ball.velocity.y = power * 0.3;
    ball.lastKickedBy = kicker;
  },

  checkBallPlayerCollision(ball, player, radius = 1.2) {
    const dx = ball.position.x - player.mesh.position.x;
    const dz = ball.position.z - player.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist < radius;
  },

  checkGoal(ball) {
    // Goal posts: z=+/-22, x between -3 and 3, y < 2.5
    const bx = ball.position.x;
    const by = ball.position.y;
    const bz = ball.position.z;

    if (Math.abs(bx) < 3.5 && by < 3 && by > 0) {
      if (bz > 22.5) return 'player'; // Player scores (AI goal)
      if (bz < -22.5) return 'ai';    // AI scores (Player goal)
    }
    return null;
  }
};
