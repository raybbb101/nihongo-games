// The 3D scene: shrine road, yokai models, weapons and particles. No game rules live here.
(function () {
  const KD = (globalThis.KD = globalThis.KD || {});
  const T = globalThis.THREE;

  const THEMES = {
    menu: { top: '#120c2c', mid: '#3a1f55', low: '#b5536c', fog: 0x4a2f55, ground: 0x2a3a2e, road: 0x6b6470, leaf: 0x1f4a35, petal: 0xffb7d5, sun: 0xffd7c2 },
    hira: { top: '#2b1b4d', mid: '#8c3f6b', low: '#f59a62', fog: 0x9a5f68, ground: 0x3f5238, road: 0x7a7078, leaf: 0x2a5e3b, petal: 0xffb7d5, sun: 0xffd2a8 },
    kata: { top: '#040820', mid: '#0f2350', low: '#2f5c8f', fog: 0x16305a, ground: 0x1c3044, road: 0x4c5670, leaf: 0x12343f, petal: 0xa8f0ff, sun: 0xa8c8ff },
    mix: { top: '#2e0f1c', mid: '#8a2a22', low: '#f07a2b', fog: 0x8f4427, ground: 0x5c3d1c, road: 0x6f5c50, leaf: 0xa8441a, petal: 0xff9a3c, sun: 0xffc98a },
    kanji: { top: '#22324d', mid: '#5a7596', low: '#c3d5e4', fog: 0xa6bbcd, ground: 0xd8e2ec, road: 0x8d97a6, leaf: 0x34524f, petal: 0xffffff, sun: 0xeaf2ff },
  };

  const SPAWN_Z = -46;
  const GATE_Z = 2;
  const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo","Noto Sans CJK JP",sans-serif';

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  const std = (color, extra) => new T.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

  class World {
    constructor(canvas) {
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(55, 16 / 9, 0.1, 600);
      this.camBase = new T.Vector3(0, 3.4, 10);
      this.camera.position.copy(this.camBase);
      this.camera.lookAt(0, 2.3, -20);
      this.baseQuat = this.camera.quaternion.clone();
      this.scene.add(this.camera);
      this.shakeAmt = 0;
      this.time = 0;
      this.menuDrift = true;
      this.signTextures = new Map();
      this.hintTextures = new Map();
      this.effects = [];
      this.effectStyle = KD.EFFECTS[0];
      this.weaponId = 'fist';
      this.mats = {};
      this.geos = {};

      this.buildLights();
      this.buildEnvironment();
      this.buildParticles();
      this.buildViewModel();
      this.setTheme('menu');
      window.addEventListener('resize', () => this.resize());
      this.resize();
    }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    buildLights() {
      this.hemi = new T.HemisphereLight(0xffffff, 0x444444, 1.5);
      this.scene.add(this.hemi);
      this.sun = new T.DirectionalLight(0xffffff, 2.2);
      this.sun.position.set(-14, 26, 12);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
      Object.assign(this.sun.shadow.camera, { left: -24, right: 24, top: 30, bottom: -50, far: 110 });
      this.scene.add(this.sun);
      this.gateLight = new T.PointLight(0xff6a3a, 40, 26);
      this.gateLight.position.set(0, 4, 0);
      this.scene.add(this.gateLight);
      this.flashLight = new T.PointLight(0xffffff, 0, 45);
      this.scene.add(this.flashLight);
    }

    buildEnvironment() {
      const s = this.scene;
      this.groundMat = std(0x333333);
      const ground = new T.Mesh(new T.PlaneGeometry(500, 500), this.groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      s.add(ground);

      const roadTex = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#8f8f8f'; g.lineWidth = 5;
        for (let row = 0; row < 4; row++) {
          const y = (row * h) / 4;
          g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
          for (let col = 0; col < 3; col++) {
            const x = ((col + (row % 2) * 0.5) * w) / 3;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h / 4); g.stroke();
          }
        }
      });
      roadTex.wrapS = roadTex.wrapT = T.RepeatWrapping;
      roadTex.repeat.set(4, 24);
      this.roadMat = new T.MeshStandardMaterial({ map: roadTex, roughness: 1 });
      const road = new T.Mesh(new T.PlaneGeometry(24, 120), this.roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.02, -46);
      road.receiveShadow = true;
      s.add(road);

      s.add(this.makeTorii(1, 0xc8281e));
      this.gate = s.children[s.children.length - 1];
      this.gate.position.z = GATE_Z - 2.5;
      const far = this.makeTorii(1.3, 0x8a1f1a);
      far.position.z = SPAWN_Z - 2;
      s.add(far);

      // Lanterns along the road.
      const stone = std(0x8d8d92);
      const glow = new T.MeshBasicMaterial({ color: 0xffc46b });
      for (let i = 0; i < 7; i++) {
        for (const side of [-1, 1]) {
          const l = new T.Group();
          const base = new T.Mesh(new T.CylinderGeometry(0.3, 0.42, 1.3, 6), stone); base.position.y = 0.65;
          const light = new T.Mesh(new T.BoxGeometry(0.62, 0.55, 0.62), glow); light.position.y = 1.55;
          const roof = new T.Mesh(new T.ConeGeometry(0.72, 0.5, 6), stone); roof.position.y = 2.08;
          l.add(base, light, roof);
          l.position.set(side * 13, 0, -4 - i * 8);
          l.traverse((m) => { if (m.isMesh) m.castShadow = m.material !== glow; });
          s.add(l);
        }
      }

      // Forest on either side of the road.
      this.leafMat = std(0x224422);
      const cone = new T.ConeGeometry(2.6, 8, 6);
      const COUNT = 140;
      const trees = new T.InstancedMesh(cone, this.leafMat, COUNT);
      const m = new T.Matrix4();
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < COUNT; i++) {
        const side = rnd() < 0.5 ? -1 : 1;
        const scale = 0.8 + rnd() * 1.1;
        m.makeScale(scale, scale, scale);
        m.setPosition(side * (17 + rnd() * 40), 4 * scale, 12 - rnd() * 95);
        trees.setMatrixAt(i, m);
      }
      trees.castShadow = true;
      s.add(trees);

      // Far mountain and moon ignore fog so the horizon stays readable.
      const fuji = new T.Mesh(new T.ConeGeometry(120, 76, 8), new T.MeshBasicMaterial({ color: 0x3a3f66, fog: false }));
      fuji.position.set(-40, 37, -300);
      s.add(fuji);
      this.fuji = fuji;
      const cap = new T.Mesh(new T.ConeGeometry(38, 24, 8), new T.MeshBasicMaterial({ color: 0xf2f4fa, fog: false }));
      cap.position.set(-40, 63.5, -299);
      s.add(cap);
      const moon = new T.Mesh(new T.CircleGeometry(16, 32), new T.MeshBasicMaterial({ color: 0xfff3cf, fog: false }));
      moon.position.set(70, 92, -320);
      s.add(moon);

      s.fog = new T.Fog(0x333333, 28, 125);
    }

    makeTorii(scale, color) {
      const g = new T.Group();
      const red = std(color);
      const black = std(0x1a1414);
      const pillar = new T.CylinderGeometry(0.34, 0.42, 6, 10);
      for (const x of [-6.8, 6.8]) {
        const p = new T.Mesh(pillar, red); p.position.set(x, 3, 0); p.castShadow = true; g.add(p);
        const foot = new T.Mesh(new T.CylinderGeometry(0.5, 0.56, 0.5, 10), black); foot.position.set(x, 0.25, 0); g.add(foot);
      }
      const nuki = new T.Mesh(new T.BoxGeometry(15.4, 0.34, 0.34), red); nuki.position.y = 4.8; g.add(nuki);
      const kasagi = new T.Mesh(new T.BoxGeometry(17, 0.5, 0.7), red); kasagi.position.y = 6.1; g.add(kasagi);
      const top = new T.Mesh(new T.BoxGeometry(18, 0.26, 0.9), black); top.position.y = 6.45; g.add(top);
      g.scale.setScalar(scale);
      return g;
    }

    buildParticles() {
      const dot = canvasTex(64, 64, (g) => {
        const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
        r.addColorStop(0, 'rgba(255,255,255,1)');
        r.addColorStop(0.4, 'rgba(255,255,255,0.8)');
        r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r; g.fillRect(0, 0, 64, 64);
      });
      const make = (n, size, blending, opacity) => {
        const geo = new T.BufferGeometry();
        const pos = new Float32Array(n * 3).fill(-200);
        const col = new Float32Array(n * 3);
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('color', new T.BufferAttribute(col, 3));
        const mat = new T.PointsMaterial({ size, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending, opacity });
        const pts = new T.Points(geo, mat);
        pts.frustumCulled = false;
        this.scene.add(pts);
        return { pts, pos, col, geo, n, vel: new Float32Array(n * 3), life: new Float32Array(n), cursor: 0 };
      };
      this.glowFx = make(700, 0.55, T.AdditiveBlending, 1);
      this.inkFx = make(300, 0.6, T.NormalBlending, 1);

      // Ambient drifting petals / snow.
      const N = 170;
      this.petals = make(N, 0.22, T.NormalBlending, 0.9);
      for (let i = 0; i < N; i++) {
        this.petals.pos[i * 3] = (Math.random() - 0.5) * 50;
        this.petals.pos[i * 3 + 1] = Math.random() * 18;
        this.petals.pos[i * 3 + 2] = 8 - Math.random() * 60;
        this.petals.vel[i * 3] = Math.random() * 6.28;
      }
    }

    setTheme(id) {
      const t = THEMES[id] || THEMES.menu;
      this.scene.background = canvasTex(4, 512, (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, t.top); grad.addColorStop(0.55, t.mid); grad.addColorStop(0.8, t.low);
        g.fillStyle = grad; g.fillRect(0, 0, w, h);
      });
      this.scene.fog.color.setHex(t.fog);
      this.groundMat.color.setHex(t.ground);
      this.roadMat.color.setHex(t.road);
      this.leafMat.color.setHex(t.leaf);
      this.sun.color.setHex(t.sun);
      this.hemi.color.setHex(t.sun);
      const c = new T.Color(t.petal);
      for (let i = 0; i < this.petals.n; i++) {
        this.petals.col[i * 3] = c.r; this.petals.col[i * 3 + 1] = c.g; this.petals.col[i * 3 + 2] = c.b;
      }
      this.petals.geo.attributes.color.needsUpdate = true;
    }

    // ---------- Enemies ----------

    signTexture(text) {
      if (this.signTextures.has(text)) return this.signTextures.get(text);
      const len = Array.from(text).length;
      const W = len > 1 ? 256 + (len - 1) * 150 : 256;
      const tex = canvasTex(W, 256, (g, w, h) => {
        g.fillStyle = '#f4e6c4'; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(120,80,40,0.14)';
        for (let y = 12; y < h; y += 26) g.fillRect(0, y, w, 3);
        g.strokeStyle = '#5c3a1c'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
        g.fillStyle = '#17110b';
        const size = Math.min(190, (w - 36) / Math.max(1, len));
        g.font = `800 ${Math.max(size, 110)}px ${FONT}`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(text, w / 2, h / 2 + 8, w - 28);
      });
      this.signTextures.set(text, tex);
      return tex;
    }

    hintTexture(lines) {
      const key = lines.join('\n');
      if (this.hintTextures.has(key)) return this.hintTextures.get(key);
      const measure = document.createElement('canvas').getContext('2d');
      measure.font = `700 54px ${FONT}`;
      const width = Math.min(640, Math.max(...lines.map((line) => measure.measureText(line).width)) + 56);
      const tex = canvasTex(Math.ceil(width), 72 * lines.length + 20, (g, w, h) => {
        g.fillStyle = 'rgba(10,8,20,0.82)';
        g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 22); g.fill();
        g.textAlign = 'center'; g.textBaseline = 'middle';
        lines.forEach((line, i) => {
          g.fillStyle = i === lines.length - 1 && lines.length > 1 ? '#ffe27a' : (lines.length === 1 ? '#ffe27a' : '#ffffff');
          g.font = `700 54px ${FONT}`;
          g.fillText(line, w / 2, 10 + 72 * i + 38, w - 30);
        });
      });
      this.hintTextures.set(key, tex);
      return tex;
    }

    material(key, make) {
      return this.mats[key] || (this.mats[key] = make());
    }

    makeEnemy(type) {
      const root = new T.Group();
      const body = new T.Group();
      root.add(body);
      const e = { type, root, body, legs: [], arms: [], walk: Math.random() * 6, spawnT: 0, deathT: -1, signW: 0 };
      const mesh = (geo, mat, x, y, z, parent = body) => {
        const m = new T.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        parent.add(m);
        return m;
      };
      if (type === 'oni' || type === 'boss') {
        const palette = type === 'boss' ? [0x5b2a86] : [0xc93a30, 0x2f6fc2, 0x3f9a4c, 0xd98b24];
        const hex = palette[Math.floor(Math.random() * palette.length)];
        const skin = this.material('skin' + hex, () => std(hex));
        const cloth = this.material('tiger', () => std(0xe0b030));
        const bone = this.material('bone', () => std(0xf2ecd8));
        const eye = this.material('eye', () => new T.MeshBasicMaterial({ color: 0xffee55 }));
        mesh(new T.CylinderGeometry(0.62, 0.72, 1.3, 7), skin, 0, 1.55, 0);
        mesh(new T.CylinderGeometry(0.76, 0.66, 0.44, 7), cloth, 0, 0.95, 0);
        mesh(new T.IcosahedronGeometry(0.62, 0), skin, 0, 2.62, 0);
        for (const s of [-1, 1]) {
          const horn = mesh(new T.ConeGeometry(0.13, 0.5, 5), bone, s * 0.34, 3.2, 0);
          horn.rotation.z = -s * 0.3;
          mesh(new T.SphereGeometry(0.1, 6, 5), eye, s * 0.24, 2.7, 0.53);
          const leg = new T.Group(); leg.position.set(s * 0.32, 0.85, 0); body.add(leg);
          mesh(new T.BoxGeometry(0.36, 0.85, 0.4), skin, 0, -0.42, 0, leg);
          e.legs.push(leg);
          const arm = new T.Group(); arm.position.set(s * 0.82, 2.0, 0); body.add(arm);
          mesh(new T.BoxGeometry(0.3, 0.95, 0.32), skin, 0, -0.42, 0.18, arm).rotation.x = -0.7;
          e.arms.push(arm);
        }
        if (type === 'boss') {
          const club = mesh(new T.CylinderGeometry(0.22, 0.1, 2.2, 6), this.material('club', () => std(0x2c2c30)), 0.1, 0.2, 0.5, e.arms[1]);
          club.rotation.x = 1.0;
        }
      } else if (type === 'runner') {
        const black = this.material('ninja', () => std(0x1d2030));
        const band = this.material('band', () => new T.MeshBasicMaterial({ color: 0xff4d4d }));
        const eye = this.material('eyeW', () => new T.MeshBasicMaterial({ color: 0xffffff }));
        mesh(new T.CylinderGeometry(0.42, 0.5, 1.3, 6), black, 0, 1.5, 0);
        mesh(new T.IcosahedronGeometry(0.46, 0), black, 0, 2.5, 0);
        mesh(new T.BoxGeometry(0.96, 0.12, 0.96), band, 0, 2.66, 0);
        mesh(new T.BoxGeometry(0.5, 0.09, 0.08), eye, 0, 2.5, 0.42);
        for (const s of [-1, 1]) {
          const leg = new T.Group(); leg.position.set(s * 0.24, 0.9, 0); body.add(leg);
          mesh(new T.BoxGeometry(0.28, 0.9, 0.3), black, 0, -0.45, 0, leg);
          e.legs.push(leg);
          const arm = new T.Group(); arm.position.set(s * 0.56, 2.0, 0); body.add(arm);
          mesh(new T.BoxGeometry(0.22, 0.85, 0.24), black, 0, -0.4, -0.1, arm).rotation.x = 0.6;
          e.arms.push(arm);
        }
      } else {
        const ghost = this.material('ghost', () => std(0xe8f2ff, { transparent: true, opacity: 0.86, emissive: 0x5a7aa8, emissiveIntensity: 0.6 }));
        const black = this.material('ghostEye', () => new T.MeshBasicMaterial({ color: 0x14141f }));
        const tongue = this.material('tongue', () => new T.MeshBasicMaterial({ color: 0xff5a7a }));
        mesh(new T.ConeGeometry(0.85, 2.7, 9), ghost, 0, 2.05, 0).rotation.x = Math.PI;
        mesh(new T.SphereGeometry(0.72, 9, 7), ghost, 0, 3.0, 0);
        for (const s of [-1, 1]) mesh(new T.SphereGeometry(0.12, 6, 5), black, s * 0.26, 3.08, 0.62);
        mesh(new T.BoxGeometry(0.22, 0.1, 0.32), tongue, 0, 2.76, 0.66);
      }

      // Sign held on the chest; unlit so the kana stays readable in every theme.
      e.signFront = new T.MeshBasicMaterial({ toneMapped: false });
      const wood = this.material('wood', () => std(0x5c3a1c));
      e.sign = new T.Mesh(new T.BoxGeometry(1, 1, 0.12), [wood, wood, wood, wood, e.signFront, wood]);
      e.sign.position.set(0, type === 'ghost' ? 2.0 : 1.65, type === 'boss' ? 1.0 : 0.92);
      e.sign.castShadow = true;
      body.add(e.sign);

      e.hint = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthTest: false, fog: false }));
      e.hint.renderOrder = 10;
      e.hint.visible = false;
      root.add(e.hint);

      e.ring = new T.Mesh(
        new T.RingGeometry(1.25, 1.6, 28),
        new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: T.DoubleSide, depthWrite: false }),
      );
      e.ring.rotation.x = -Math.PI / 2;
      e.ring.position.y = 0.07;
      e.ring.visible = false;
      root.add(e.ring);

      e.scale = type === 'boss' ? 2.3 : type === 'runner' ? 1.2 : 1.32;
      this.scene.add(root);
      return e;
    }

    setEnemySign(e, text) {
      const tex = this.signTexture(text);
      e.signFront.map = tex;
      e.signFront.needsUpdate = true;
      const h = Array.from(text).length >= 4 ? 1.35 : 1.72;
      const w = (tex.image.width / tex.image.height) * h;
      e.sign.scale.set(w, h, 1);
    }

    setEnemyHint(e, lines) {
      if (!lines || !lines.length) { e.hint.visible = false; e.hintKey = null; return; }
      const key = lines.join('\n');
      if (e.hintKey === key) return;
      e.hintKey = key;
      const tex = this.hintTexture(lines);
      e.hint.material.map = tex;
      e.hint.material.needsUpdate = true;
      const h = 0.62 * lines.length + 0.2;
      e.hint.scale.set((h * tex.image.width) / tex.image.height, h, 1);
      e.hint.position.y = (e.type === 'boss' ? 8.6 : e.type === 'ghost' ? 5.3 : 4.9) + (lines.length - 1) * 0.3;
      e.hint.visible = true;
    }

    poseEnemy(e, dt, moving = 1) {
      e.walk += dt * moving;
      const run = e.type === 'runner' ? 13 : e.type === 'boss' ? 4 : 7.5;
      const swing = Math.sin(e.walk * run) * (e.type === 'boss' ? 0.4 : 0.65);
      if (e.legs.length) { e.legs[0].rotation.x = swing; e.legs[1].rotation.x = -swing; }
      if (e.arms.length) { e.arms[0].rotation.x = -swing * 0.5; e.arms[1].rotation.x = swing * 0.5; }
      e.body.position.y = e.type === 'ghost' ? 0.35 + Math.sin(e.walk * 3) * 0.28 : Math.abs(Math.sin(e.walk * run)) * 0.12;
      e.root.rotation.y = Math.atan2(this.camera.position.x - e.root.position.x, this.camera.position.z - e.root.position.z);
      if (e.spawnT < 1) e.spawnT = Math.min(1, e.spawnT + dt * 2.5);
      if (e.deathT < 0) e.body.scale.setScalar(e.scale * e.spawnT);
    }

    removeEnemy(e) {
      this.scene.remove(e.root);
      e.signFront.dispose();
      e.hint.material.dispose();
      e.ring.material.dispose();
      e.ring.geometry.dispose();
    }

    // ---------- Weapons ----------

    buildViewModel() {
      this.vm = new T.Group();
      this.vm.scale.setScalar(0.8);
      this.camera.add(this.vm);
      this.vmKick = 0;
      this.setWeapon('fist');
    }

    setWeapon(id) {
      this.weaponId = id;
      this.vm.clear();
      const model = this.weaponModel(id);
      if (id === 'fist') model.rotation.set(0.75, 0.45, 0);
      this.vm.add(model);
    }

    setEffect(id) {
      this.effectStyle = KD.EFFECTS.find((x) => x.id === id) || KD.EFFECTS[0];
    }

    fistModel() {
      const g = new T.Group();
      const skin = this.material('fist', () => std(0xeec39a));
      const palm = new T.Mesh(new T.BoxGeometry(0.2, 0.2, 0.2), skin);
      g.add(palm);
      for (let i = 0; i < 4; i++) {
        const k = new T.Mesh(new T.BoxGeometry(0.052, 0.07, 0.07), skin);
        k.position.set(-0.075 + i * 0.05, 0.05, -0.11);
        g.add(k);
      }
      const thumb = new T.Mesh(new T.BoxGeometry(0.17, 0.05, 0.06), skin); thumb.position.set(0, -0.03, -0.11); g.add(thumb);
      const sleeve = new T.Mesh(new T.CylinderGeometry(0.1, 0.13, 0.36, 7), this.material('sleeve', () => std(0x3f5a8a)));
      sleeve.rotation.x = Math.PI / 2; sleeve.position.z = 0.27; g.add(sleeve);
      return g;
    }

    bladeModel(len, width) {
      const g = new T.Group();
      const steel = this.material('steel', () => new T.MeshStandardMaterial({ color: 0xe8eef5, metalness: 0.7, roughness: 0.25, flatShading: true }));
      const wrap = this.material('wrap', () => std(0x1b1b24));
      const blade = new T.Mesh(new T.BoxGeometry(width, len, 0.016), steel); blade.position.y = len / 2 + 0.08; g.add(blade);
      const tip = new T.Mesh(new T.ConeGeometry(width * 0.72, width * 1.5, 4), steel); tip.scale.z = 0.06; tip.position.y = len + 0.08 + width * 0.7; g.add(tip);
      const guard = new T.Mesh(new T.CylinderGeometry(width * 1.2, width * 1.2, 0.02, 10), this.material('guard', () => std(0xc9a13c))); guard.position.y = 0.07; g.add(guard);
      const hilt = new T.Mesh(new T.CylinderGeometry(0.018, 0.022, 0.16, 6), wrap); g.add(hilt);
      g.rotation.set(-0.5, 0, -0.35);
      return g;
    }

    starModel() {
      const shape = new T.Shape();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? 0.05 : 0.17;
        const a = (i / 8) * Math.PI * 2;
        if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(r, 0);
      }
      shape.closePath();
      const geo = (this.geos.star = this.geos.star || new T.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }));
      return new T.Mesh(geo, this.material('star', () => new T.MeshStandardMaterial({ color: 0xcfd6e2, metalness: 0.8, roughness: 0.3, flatShading: true })));
    }

    staffModel(color) {
      const g = new T.Group();
      const shaft = new T.Mesh(new T.CylinderGeometry(0.018, 0.022, 0.8, 6), this.material('staff', () => std(0x4c3019)));
      shaft.position.y = 0.25; g.add(shaft);
      const orb = new T.Mesh(new T.IcosahedronGeometry(0.08, 1), new T.MeshBasicMaterial({ color }));
      orb.position.y = 0.72; g.add(orb);
      g.rotation.set(-0.4, 0, -0.25);
      return g;
    }

    weaponModel(id) {
      switch (id) {
        case 'knife': return this.bladeModel(0.24, 0.05);
        case 'katana': return this.bladeModel(0.8, 0.036);
        case 'shuriken': return this.starModel();
        case 'fire': return this.staffModel(0xff7a2a);
        case 'ice': return this.staffModel(0x7fe4ff);
        case 'thunder': return this.staffModel(0xfff36b);
        case 'grenade': {
          const g = new T.Group();
          const shell = new T.Mesh(new T.IcosahedronGeometry(0.12, 1), this.material('gren', () => std(0x3f5a2c)));
          const pin = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.06, 6), this.material('steel2', () => std(0xb0b0b8)));
          pin.position.y = 0.14; g.add(shell, pin);
          return g;
        }
        case 'meteor': {
          const g = new T.Group();
          g.add(new T.Mesh(new T.IcosahedronGeometry(0.1, 0), this.material('rock', () => std(0x4a3a35, { emissive: 0xff5a1a, emissiveIntensity: 0.9 }))));
          return g;
        }
        default: return this.fistModel();
      }
    }

    // Plays the equipped weapon at `target`; onHit fires when the blow lands.
    attack(target, onHit) {
      this.vmKick = 1;
      const id = this.weaponId;
      const to = target.clone();
      const from = new T.Vector3(0.9, 1.9, 8);
      const land = (fn) => () => { fn && fn(); onHit && onHit(); };

      if (id === 'fist') {
        KD.Audio.play('hit');
        // lookAt points +z at the target, so turn the fist around to lead with the knuckles.
        const fist = new T.Group();
        const hand = this.fistModel();
        hand.rotation.y = Math.PI;
        hand.scale.setScalar(4);
        fist.add(hand);
        this.flyer(fist, from, to, 0.13, { aim: true, onDone: land(() => {
          KD.Audio.play('fist');
          this.shock(to, 0xffffff, 3);
          this.burst(to, 22, 9);
          this.shake(0.22);
        }) });
      } else if (id === 'knife') {
        KD.Audio.play('knife');
        this.flyer(this.weaponModel('knife'), from, to, 0.12, { scale: 2.2, spin: [18, 0, 0], onDone: land(() => this.burst(to, 18, 8)) });
      } else if (id === 'shuriken') {
        KD.Audio.play('shuriken');
        [[0, 0], [-0.8, 0.05], [0.8, 0.1]].forEach(([dx, delay], i) => {
          const dst = to.clone().add(new T.Vector3(dx, (i - 1) * 0.3, 0));
          this.flyer(this.starModel(), from, dst, 0.14, { delay, scale: 2.4, spin: [0, 0, 34], trail: 0xcfe6ff, onDone: i === 2 ? land(() => { this.burst(to, 26, 10); this.shake(0.12); }) : () => this.burst(dst, 8, 6) });
        });
      } else if (id === 'katana') {
        KD.Audio.play('katana');
        this.slash(to);
        this.burst(to, 34, 12);
        this.shake(0.28);
        land()();
      } else if (id === 'fire') {
        const ball = new T.Mesh(new T.IcosahedronGeometry(0.55, 1), new T.MeshBasicMaterial({ color: 0xff8a2a }));
        this.flyer(ball, from, to, 0.2, { spin: [5, 7, 0], trail: 0xff6a1a, onDone: land(() => {
          KD.Audio.play('fire');
          this.burst(to, 60, 12, [0xff5a1a, 0xffc04d, 0xff2a00]);
          this.shock(to, 0xff7a2a, 5);
          this.flash(to, 0xff7a2a, 90);
          this.shake(0.3);
        }) });
      } else if (id === 'ice') {
        const shard = new T.Mesh(new T.ConeGeometry(0.3, 1.5, 5), new T.MeshBasicMaterial({ color: 0xa8efff }));
        this.flyer(shard, from, to, 0.17, { aim: true, trail: 0xa8efff, onDone: land(() => {
          KD.Audio.play('ice');
          this.iceBloom(to);
          this.burst(to, 50, 11, [0xdffaff, 0x7fe4ff, 0xffffff]);
          this.flash(to, 0x9fe8ff, 70);
          this.shake(0.2);
        }) });
      } else if (id === 'thunder') {
        KD.Audio.play('thunder');
        this.bolt(to);
        this.burst(to, 55, 14, [0xfff36b, 0xffffff, 0x8ad4ff]);
        this.shock(to, 0xfff36b, 5);
        this.flash(to, 0xeef4ff, 260);
        this.shake(0.42);
        land()();
      } else if (id === 'grenade') {
        const m = this.weaponModel('grenade');
        this.flyer(m, from, to, 0.42, { arc: 7, scale: 2.8, spin: [9, 5, 0], onDone: land(() => {
          KD.Audio.play('boom');
          this.burst(to, 90, 16, [0xff8a1a, 0xffd24d, 0x552a10]);
          this.shock(to, 0xffa84d, 8);
          this.flash(to, 0xffa84d, 200);
          this.shake(0.55);
        }) });
      } else if (id === 'meteor') {
        const rock = new T.Mesh(new T.IcosahedronGeometry(1.8, 0), this.material('rock', () => std(0x4a3a35, { emissive: 0xff5a1a, emissiveIntensity: 0.9 })));
        const high = to.clone().add(new T.Vector3(16, 42, -14));
        this.flyer(rock, high, to, 0.5, { spin: [6, 4, 2], trail: 0xff7a2a, trailBig: true, onDone: land(() => {
          KD.Audio.play('boom');
          this.burst(to, 150, 22, [0xff5a1a, 0xffd24d, 0xffffff, 0x552a10]);
          this.shock(to, 0xff7a2a, 12);
          this.flash(to, 0xffa060, 400);
          this.shake(0.85);
        }) });
      }
    }

    flyer(obj, from, to, dur, opts = {}) {
      obj.position.copy(from);
      if (opts.scale) obj.scale.setScalar(opts.scale);
      obj.visible = !opts.delay;
      this.scene.add(obj);
      this.effects.push({ kind: 'fly', obj, from: from.clone(), to: to.clone(), t: -(opts.delay || 0) / dur, dur, ...opts });
    }

    slash(at) {
      const shape = new T.Shape();
      shape.absarc(0, 0, 5.2, -0.9, 0.9, false);
      shape.absarc(1.3, 0, 4.5, 0.75, -0.75, true);
      const mesh = new T.Mesh(new T.ShapeGeometry(shape, 18), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: T.DoubleSide, depthTest: false, fog: false }));
      mesh.position.copy(at);
      mesh.rotation.z = 0.9 + Math.random() * 0.6;
      mesh.renderOrder = 8;
      this.scene.add(mesh);
      this.effects.push({ kind: 'fade', obj: mesh, t: 0, dur: 0.24, grow: 1.5 });
    }

    shock(at, color, size) {
      const mesh = new T.Mesh(new T.RingGeometry(0.72, 1, 36), new T.MeshBasicMaterial({ color, transparent: true, side: T.DoubleSide, depthWrite: false, fog: false }));
      mesh.position.copy(at);
      mesh.quaternion.copy(this.camera.quaternion);
      this.scene.add(mesh);
      this.effects.push({ kind: 'fade', obj: mesh, t: 0, dur: 0.32, grow: size });
    }

    iceBloom(at) {
      const mat = new T.MeshBasicMaterial({ color: 0xb8f2ff, transparent: true, opacity: 0.9 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const m = new T.Mesh(new T.ConeGeometry(0.34, 3, 5), mat.clone());
        m.position.set(at.x + Math.cos(a) * 1.3, at.y - 1.2, at.z + Math.sin(a) * 1.3);
        m.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
        this.scene.add(m);
        this.effects.push({ kind: 'fade', obj: m, t: 0, dur: 0.5, grow: 1.3 });
      }
    }

    bolt(at) {
      const pts = [];
      let x = at.x + (Math.random() - 0.5) * 6;
      let z = at.z;
      for (let i = 0; i <= 12; i++) {
        const k = i / 12;
        pts.push(new T.Vector3(x + (at.x - x) * k + (i < 12 ? (Math.random() - 0.5) * 2.4 : 0), 44 * (1 - k) + at.y * k, z));
      }
      const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0);
      const mesh = new T.Mesh(new T.TubeGeometry(curve, 60, 0.3, 5), new T.MeshBasicMaterial({ color: 0xfafcff, transparent: true, fog: false, toneMapped: false }));
      this.scene.add(mesh);
      this.effects.push({ kind: 'fade', obj: mesh, t: 0, dur: 0.26, flicker: true });
    }

    flash(at, color, power) {
      this.flashLight.position.set(at.x, at.y + 3, at.z + 2);
      this.flashLight.color.setHex(color);
      this.flashLight.intensity = Math.max(this.flashLight.intensity, power);
    }

    burst(pos, count, speed, colors) {
      const style = this.effectStyle;
      const palette = style.id === 'sparks' && colors ? colors : style.colors;
      const pool = style.normalBlend ? this.inkFx : this.glowFx;
      const n = Math.round(count * (style.big ? 1.6 : 1));
      const c = new T.Color();
      for (let i = 0; i < n; i++) {
        const k = (pool.cursor = (pool.cursor + 1) % pool.n);
        pool.pos[k * 3] = pos.x; pool.pos[k * 3 + 1] = pos.y; pool.pos[k * 3 + 2] = pos.z;
        const a = Math.random() * Math.PI * 2;
        const u = Math.random() * 2 - 1;
        const r = Math.sqrt(1 - u * u) * speed * (0.35 + Math.random() * 0.8);
        pool.vel[k * 3] = Math.cos(a) * r;
        pool.vel[k * 3 + 1] = u * speed * (0.35 + Math.random() * 0.8) + speed * 0.3;
        pool.vel[k * 3 + 2] = Math.sin(a) * r;
        pool.life[k] = 0.5 + Math.random() * 0.6;
        c.setHex(palette[Math.floor(Math.random() * palette.length)]);
        pool.col[k * 3] = c.r; pool.col[k * 3 + 1] = c.g; pool.col[k * 3 + 2] = c.b;
      }
    }

    shake(amount) {
      this.shakeAmt = Math.min(1.1, Math.max(this.shakeAmt, amount));
    }

    gateHit() {
      this.shake(0.75);
      this.flash(new T.Vector3(0, 3, GATE_Z), 0xff2a2a, 180);
    }

    project(v) {
      const p = v.clone().project(this.camera);
      return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
    }

    updateEffects(dt) {
      // A landing weapon can start new effects, so they must survive this pass.
      const current = this.effects;
      this.effects = [];
      const kept = current.filter((fx) => {
        fx.t += dt / fx.dur;
        if (fx.t < 0) return true;
        if (fx.kind === 'fly') {
          fx.obj.visible = true;
          const t = Math.min(1, fx.t);
          fx.obj.position.lerpVectors(fx.from, fx.to, t);
          if (fx.arc) fx.obj.position.y += Math.sin(t * Math.PI) * fx.arc;
          if (fx.aim) {
            fx.obj.lookAt(fx.to);
            if (fx.obj.geometry) fx.obj.rotateX(Math.PI / 2);
          }
          if (fx.spin) {
            fx.obj.rotation.x += fx.spin[0] * dt;
            fx.obj.rotation.y += fx.spin[1] * dt;
            fx.obj.rotation.z += fx.spin[2] * dt;
          }
          if (fx.trail) this.trailPuff(fx.obj.position, fx.trail, fx.trailBig ? 6 : 2);
          if (fx.t >= 1) {
            this.scene.remove(fx.obj);
            fx.onDone && fx.onDone();
            return false;
          }
          return true;
        }
        const t = Math.min(1, fx.t);
        fx.obj.material.opacity = fx.flicker ? (Math.random() > 0.3 ? 1 - t : 0.1) : 1 - t;
        if (fx.grow) fx.obj.scale.setScalar(1 + (fx.grow - 1) * t);
        if (t >= 1) {
          this.scene.remove(fx.obj);
          fx.obj.geometry.dispose();
          fx.obj.material.dispose();
          return false;
        }
        return true;
      });
      this.effects = kept.concat(this.effects);
    }

    trailPuff(pos, hex, n) {
      const pool = this.glowFx;
      const c = new T.Color(hex);
      for (let i = 0; i < n; i++) {
        const k = (pool.cursor = (pool.cursor + 1) % pool.n);
        pool.pos[k * 3] = pos.x + (Math.random() - 0.5) * 0.5;
        pool.pos[k * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.5;
        pool.pos[k * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.5;
        pool.vel[k * 3] = pool.vel[k * 3 + 1] = pool.vel[k * 3 + 2] = 0;
        pool.life[k] = 0.25;
        pool.col[k * 3] = c.r; pool.col[k * 3 + 1] = c.g; pool.col[k * 3 + 2] = c.b;
      }
    }

    updateParticlePool(pool, dt) {
      for (let i = 0; i < pool.n; i++) {
        if (pool.life[i] <= 0) continue;
        pool.life[i] -= dt;
        if (pool.life[i] <= 0) { pool.pos[i * 3 + 1] = -200; continue; }
        pool.vel[i * 3 + 1] -= 14 * dt;
        pool.pos[i * 3] += pool.vel[i * 3] * dt;
        pool.pos[i * 3 + 1] += pool.vel[i * 3 + 1] * dt;
        pool.pos[i * 3 + 2] += pool.vel[i * 3 + 2] * dt;
      }
      pool.geo.attributes.position.needsUpdate = true;
      pool.geo.attributes.color.needsUpdate = true;
    }

    render(dt) {
      this.time += dt;
      this.updateEffects(dt);
      this.updateParticlePool(this.glowFx, dt);
      this.updateParticlePool(this.inkFx, dt);

      const pt = this.petals;
      for (let i = 0; i < pt.n; i++) {
        const j = i * 3;
        pt.vel[j] += dt;
        pt.pos[j] += Math.sin(pt.vel[j]) * dt * 0.8;
        pt.pos[j + 1] -= dt * 1.1;
        if (pt.pos[j + 1] < 0) pt.pos[j + 1] = 16 + Math.random() * 3;
      }
      pt.geo.attributes.position.needsUpdate = true;

      this.flashLight.intensity *= Math.pow(0.0015, dt);
      this.gateLight.intensity = 34 + Math.sin(this.time * 7) * 5;

      this.vmKick = Math.max(0, this.vmKick - dt * 6);
      const kick = Math.sin(this.vmKick * Math.PI);
      this.vm.position.set(0.72 - kick * 0.14, -0.56 + kick * 0.22 + Math.sin(this.time * 2) * 0.008, -1.45 - kick * 0.5);
      this.vm.rotation.x = -kick * 0.6;
      this.vm.visible = !this.menuDrift;

      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
      const s = this.shakeAmt * this.shakeAmt;
      const drift = this.menuDrift ? Math.sin(this.time * 0.25) * 1.3 : 0;
      this.camera.position.set(
        this.camBase.x + drift + (Math.random() - 0.5) * s * 1.1,
        this.camBase.y + (Math.random() - 0.5) * s * 1.1,
        this.camBase.z,
      );
      this.renderer.render(this.scene, this.camera);
    }
  }

  KD.World = World;
  KD.SPAWN_Z = SPAWN_Z;
  KD.GATE_Z = GATE_Z;
})();
