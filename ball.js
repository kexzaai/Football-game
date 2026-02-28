// ball.js - Ball creation and management

const Ball = {
  mesh: null,
  position: new THREE.Vector3(0, 0.2, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  lastKickedBy: null,

  create(scene) {
    const geo = new THREE.SphereGeometry(0.22, 16, 16);

    // Create ball with panels look
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    // Draw pentagons pattern
    ctx.fillStyle = '#111111';
    const centers = [
      [128, 128], [128, 30], [220, 90], [190, 210], [66, 210], [36, 90]
    ];
    centers.forEach(([cx, cy]) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * 22;
        const y = cy + Math.sin(angle) * 22;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshPhongMaterial({ map: texture });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;

    // Shadow under ball
    const shadowGeo = new THREE.CircleGeometry(0.25, 12);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.01;
    scene.add(this.shadow);

    scene.add(this.mesh);
    this.reset();
    return this.mesh;
  },

  reset() {
    this.position.set(0, 0.2, 0);
    this.velocity.set(0, 0, 0);
    this.mesh.position.copy(this.position);
    this.lastKickedBy = null;
  },

  update() {
    Physics.updateBall(this);
    // Update shadow
    if (this.shadow) {
      this.shadow.position.x = this.position.x;
      this.shadow.position.z = this.position.z;
      const heightFactor = Math.max(0, 1 - this.position.y / 5);
      this.shadow.material.opacity = 0.3 * heightFactor;
    }
  }
};
