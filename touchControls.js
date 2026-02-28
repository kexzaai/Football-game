// touchControls.js - Handles all touch input

const TouchControls = {
  joystick: {
    active: false,
    touchId: null,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    magnitude: 0,
    angle: 0,
    maxRadius: 45
  },

  buttons: {
    shoot: false,
    pass: false,
    tackle: false,
    sprint: false
  },

  init() {
    const joystickZone = document.getElementById('joystickZone');
    const knob = document.getElementById('joystickKnob');
    const base = document.getElementById('joystickBase');

    // Joystick touch events
    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystick.active = true;
      this.joystick.touchId = touch.identifier;
      const rect = base.getBoundingClientRect();
      this.joystick.startX = rect.left + rect.width / 2;
      this.joystick.startY = rect.top + rect.height / 2;
      this._updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let t of e.changedTouches) {
        if (t.identifier === this.joystick.touchId) {
          this._updateJoystick(t.clientX, t.clientY);
        }
      }
    }, { passive: false });

    joystickZone.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (let t of e.changedTouches) {
        if (t.identifier === this.joystick.touchId) {
          this._resetJoystick();
        }
      }
    }, { passive: false });

    // Action buttons
    this._bindActionBtn('shootBtn', 'shoot');
    this._bindActionBtn('passBtn', 'pass');
    this._bindActionBtn('tackleBtn', 'tackle');
    this._bindActionBtn('sprintBtn', 'sprint');
  },

  _updateJoystick(clientX, clientY) {
    const dx = clientX - this.joystick.startX;
    const dy = clientY - this.joystick.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, this.joystick.maxRadius);
    const angle = Math.atan2(dy, dx);

    this.joystick.dx = (dx / dist || 0) * (clamped / this.joystick.maxRadius);
    this.joystick.dy = (dy / dist || 0) * (clamped / this.joystick.maxRadius);
    this.joystick.magnitude = clamped / this.joystick.maxRadius;
    this.joystick.angle = angle;

    // Move knob
    const knob = document.getElementById('joystickKnob');
    knob.style.transform = `translate(${(this.joystick.dx * this.joystick.maxRadius) - 25}px, ${(this.joystick.dy * this.joystick.maxRadius) - 25}px)`;
  },

  _resetJoystick() {
    this.joystick.active = false;
    this.joystick.touchId = null;
    this.joystick.dx = 0;
    this.joystick.dy = 0;
    this.joystick.magnitude = 0;
    const knob = document.getElementById('joystickKnob');
    knob.style.transform = 'translate(-25px, -25px)';
  },

  _bindActionBtn(id, action) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.buttons[action] = true;
      // Trigger once
      if (typeof window.onActionPress === 'function') window.onActionPress(action);
    }, { passive: false });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.buttons[action] = false;
    }, { passive: false });
    // Also allow mouse clicks for desktop testing
    btn.addEventListener('mousedown', () => {
      this.buttons[action] = true;
      if (typeof window.onActionPress === 'function') window.onActionPress(action);
    });
    btn.addEventListener('mouseup', () => { this.buttons[action] = false; });
  },

  getMovement() {
    return {
      x: this.joystick.dx,
      y: this.joystick.dy,
      magnitude: this.joystick.magnitude,
      active: this.joystick.active
    };
  }
};
