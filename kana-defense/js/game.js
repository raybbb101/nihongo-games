// Rules of one stage: spawning, typing, scoring. Rendering is delegated to World, text to the HUD.
(function () {
  const KD = (globalThis.KD = globalThis.KD || {});
  const PENDING_WAIT = 0.45;
  const RELAY_SECONDS = 20;
  const PLAYER_COLORS = ['#ff5a4d', '#4dc3ff', '#ffd24d', '#7dff8a'];

  class Game {
    constructor(world, hud, save) {
      this.world = world;
      this.hud = hud;
      this.save = save;
      this.state = 'idle';
      this.enemies = [];
    }

    start(stage, mode, names) {
      this.clearField();
      this.stage = stage;
      this.mode = mode;
      this.players = names.map((name, i) => ({
        name, color: PLAYER_COLORS[i], buf: '', pendingAt: 0,
        kills: 0, correct: 0, wrong: 0, combo: 0, best: 0, lastNEndAt: -1,
      }));
      this.active = 0;
      this.relayLeft = RELAY_SECONDS;
      this.hearts = KD.START_HEARTS;
      this.leaked = new Map();
      this.distanceSum = 0;
      this.distanceCount = 0;
      this.clock = 0;

      const p = stage.params;
      const boost = mode === 'simul' ? 1.5 : 1;
      this.spawnLeft = Math.round(p.count * boost);
      this.interval = p.interval / (mode === 'simul' ? 1.3 : 1);
      this.maxAlive = Math.round(p.maxAlive * boost);
      this.bossLeft = stage.boss ? 1 : 0;
      this.spawnTimer = 0.2;
      this.intro = [...stage.newItems].sort(() => Math.random() - 0.5);

      this.world.setTheme(stage.chapter);
      this.world.menuDrift = false;
      this.state = 'countdown';
      this.countdown = 3.2;
      this.lastCount = 4;
      this.hud.begin(this);
    }

    clearField() {
      for (const e of this.enemies) this.world.removeEnemy(e);
      this.enemies = [];
    }

    stop() {
      this.clearField();
      this.state = 'idle';
      this.world.menuDrift = true;
    }

    remaining() {
      return this.spawnLeft + this.bossLeft + this.enemies.filter((e) => !e.dying).length;
    }

    // ---------- Spawning ----------

    masteryWeight(text) {
      const m = this.save.mastery(text);
      return Math.max(0.35, 1 + m.l * 1.2 - m.c * 0.08);
    }

    pickItem() {
      if (this.intro.length) return this.intro.pop();
      const onField = new Set(this.enemies.filter((e) => !e.dying).map((e) => e.item.primary));
      let pool = this.stage.pool.filter((x) => !onField.has(x.item.primary));
      if (!pool.length) pool = this.stage.pool;
      const weights = pool.map((x) => x.weight * this.masteryWeight(x.item.text));
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) return pool[i].item;
      }
      return pool[pool.length - 1].item;
    }

    spawn(type) {
      const e = this.world.makeEnemy(type);
      e.item = this.pickItem();
      e.hp = type === 'boss' ? this.stage.boss * (this.mode === 'simul' ? 2 : 1) : 1;
      e.maxHp = e.hp;
      const speedMul = type === 'runner' ? 1.45 : type === 'boss' ? 0.42 : type === 'ghost' ? 0.95 : 0.85 + Math.random() * 0.3;
      e.speed = this.stage.params.speed * speedMul;
      e.x0 = type === 'boss' ? 0 : (Math.random() * 2 - 1) * 9;
      e.z = KD.SPAWN_Z;
      e.wave = Math.random() * 6.28;
      e.root.position.set(e.x0, 0, e.z);
      this.world.setEnemySign(e, e.item.text);
      this.enemies.push(e);
      if (type === 'boss') {
        KD.Audio.play('boss');
        this.hud.bossWarning();
      }
      return e;
    }

    updateSpawning(dt) {
      if (this.spawnLeft > 0) {
        const alive = this.enemies.filter((e) => !e.dying).length;
        this.spawnTimer -= dt;
        if (alive === 0 && this.spawnTimer > 0.5) this.spawnTimer = 0.5;
        if (this.spawnTimer <= 0 && alive < this.maxAlive) {
          const p = this.stage.params;
          const r = Math.random();
          const type = r < p.runnerShare ? 'runner' : r < p.runnerShare + p.weaverShare ? 'ghost' : 'oni';
          this.spawn(type);
          this.spawnLeft--;
          this.spawnTimer = this.interval * (0.8 + Math.random() * 0.4);
          this.hud.remaining(this.remaining());
        }
      } else if (this.bossLeft && !this.enemies.some((e) => !e.dying)) {
        this.bossLeft = 0;
        this.spawn('boss');
        this.hud.remaining(this.remaining());
      }
    }

    // ---------- Typing ----------

    currentPlayer(shift) {
      if (this.mode === 'simul') return this.players[shift ? 1 : 0];
      return this.players[this.active];
    }

    targets() {
      return this.enemies.filter((e) => !e.dying);
    }

    onLetter(c, shift) {
      if (this.state !== 'playing') return;
      this.typeLetter(this.currentPlayer(shift), c);
      this.hud.players(this);
    }

    typeLetter(p, c) {
      const justSpelledN = c === 'n' && !p.buf && this.clock - p.lastNEndAt < 0.45;
      const candidate = p.buf + c;
      const targets = this.targets();
      const matches = targets.filter((e) => e.item.variants.some((v) => v.startsWith(candidate)));

      if (!matches.length) {
        if (p.pendingAt) {
          this.resolvePending(p);
          return this.typeLetter(p, c);
        }
        if (justSpelledN) { p.lastNEndAt = -1; return; } // the second n of "nn"
        p.wrong++;
        p.combo = 0;
        p.buf = '';
        KD.Audio.play('miss');
        this.hud.typo(p);
        // The wrong letter may be the start of another enemy's word; give it a fresh try.
        if (targets.some((e) => e.item.variants.some((v) => v.startsWith(c)))) this.typeLetter(p, c);
        return;
      }

      p.buf = candidate;
      p.correct++;
      KD.Audio.play('key');
      const complete = matches.filter((e) => e.item.variants.includes(candidate));
      if (!complete.length) { p.pendingAt = 0; return; }
      const others = matches.filter((e) => !complete.includes(e));
      if (others.length) p.pendingAt = this.clock + PENDING_WAIT;
      else this.strike(p, complete);
    }

    // Enter/space or the timeout confirm "n" when another enemy could still become "na".
    resolvePending(p) {
      const complete = this.targets().filter((e) => e.item.variants.includes(p.buf));
      p.pendingAt = 0;
      if (complete.length) this.strike(p, complete);
      else p.buf = '';
    }

    onConfirm(shift) {
      if (this.state !== 'playing') return;
      const p = this.currentPlayer(shift);
      if (p.pendingAt) this.resolvePending(p);
      this.hud.players(this);
    }

    onBackspace(shift) {
      if (this.state !== 'playing') return;
      const p = this.currentPlayer(shift);
      p.buf = p.buf.slice(0, -1);
      p.pendingAt = 0;
      this.hud.players(this);
    }

    strike(p, complete) {
      const e = complete.reduce((a, b) => (b.z > a.z ? b : a));
      const typed = p.buf;
      p.buf = '';
      p.pendingAt = 0;
      if (typed.endsWith('n')) p.lastNEndAt = this.clock;
      p.combo++;
      p.best = Math.max(p.best, p.combo);
      const reading = e.item.readingFor[typed] || e.item.speak;
      KD.Audio.speak(reading);
      this.save.markCorrect(e.item.text);
      this.distanceSum += (KD.GATE_Z - e.z) / (KD.GATE_Z - KD.SPAWN_Z);
      this.distanceCount++;

      const at = e.root.position.clone();
      at.y += e.type === 'boss' ? 3.6 : 2.2;
      this.hud.pop(at, e.item.text, typed, p.color);
      e.hp--;
      if (e.hp > 0) {
        const previous = e.item.primary;
        e.item = this.pickItem();
        if (e.item.primary === previous) e.item = this.pickItem();
        this.world.setEnemySign(e, e.item.text);
        this.world.attack(at, () => { e.z = Math.max(KD.SPAWN_Z, e.z - 1.8); });
        this.hud.bossHp(e.hp / e.maxHp);
      } else {
        e.dying = true;
        e.ring.visible = false;
        e.hint.visible = false;
        p.kills++;
        if (e.type === 'boss') this.hud.bossHp(null);
        this.world.attack(at, () => { if (e.deathT < 0) e.deathT = 0; });
      }
      this.revalidate();
      this.hud.remaining(this.remaining());
    }

    // A player's half-typed word can lose its target to a teammate or to the gate.
    revalidate() {
      for (const p of this.players) {
        if (!p.buf) continue;
        if (!this.targets().some((e) => e.item.variants.some((v) => v.startsWith(p.buf)))) {
          p.buf = '';
          p.pendingAt = 0;
        }
      }
    }

    // ---------- Frame update ----------

    hintLinesFor(e) {
      const hint = this.save.settings.hint;
      const item = e.item;
      const progress = (e.z - KD.SPAWN_Z) / (KD.GATE_Z - KD.SPAWN_Z);
      const isNew = this.save.mastery(item.text).c < 3;
      const show = hint === 'always' || (hint === 'auto' && (isNew || progress > 0.5));
      const lines = [];
      if (item.meaning) lines.push(item.meaning);
      if (show) lines.push(item.reading ? `${item.reading} ${item.primary}` : item.primary);
      return lines;
    }

    update(dt) {
      if (this.state === 'countdown') {
        this.countdown -= dt;
        const n = Math.ceil(this.countdown);
        if (n !== this.lastCount && n >= 0) {
          this.lastCount = n;
          KD.Audio.play(n > 0 ? 'count' : 'go');
          this.hud.count(n);
        }
        if (this.countdown <= 0) {
          this.state = 'playing';
          KD.Audio.startMusic(this.stage.index / Math.max(1, KD.chapter(this.stage.chapter).stages.length - 1));
          this.hud.players(this);
        }
        return;
      }
      if (this.state !== 'playing' && this.state !== 'ending') return;
      this.clock += dt;

      if (this.state === 'playing') {
        for (const p of this.players) {
          if (p.pendingAt && this.clock >= p.pendingAt) { this.resolvePending(p); this.hud.players(this); }
        }
        this.updateSpawning(dt);
        if (this.mode === 'relay') {
          this.relayLeft -= dt;
          if (this.relayLeft <= 0) {
            this.players[this.active].buf = '';
            this.active = (this.active + 1) % this.players.length;
            this.relayLeft = RELAY_SECONDS;
            this.hud.relaySwitch(this.players[this.active]);
            this.hud.players(this);
          }
          this.hud.relayTime(this.relayLeft / RELAY_SECONDS);
        }
      }

      const buffers = this.players.filter((p) => p.buf);
      const stillAlive = [];
      for (const e of this.enemies) {
        if (e.deathT >= 0) {
          e.deathT += dt / 0.4;
          e.root.position.z -= dt * 16;
          e.root.position.y = Math.sin(e.deathT * Math.PI) * 2.4;
          e.body.rotation.x = -e.deathT * 5;
          e.body.scale.setScalar(e.scale * Math.max(0.01, 1 - e.deathT));
          if (e.deathT >= 1) { this.world.removeEnemy(e); continue; }
          stillAlive.push(e);
          continue;
        }
        this.world.poseEnemy(e, dt);
        if (!e.dying) {
          e.z += e.speed * dt;
          const progress = (e.z - KD.SPAWN_Z) / (KD.GATE_Z - KD.SPAWN_Z);
          let x = e.x0 * (1 - progress * 0.4);
          if (e.type === 'ghost') x += Math.sin(this.clock * 2.2 + e.wave) * 3.2 * (1 - progress * 0.5);
          e.root.position.set(x, 0, e.z);
          this.world.setEnemyHint(e, this.hintLinesFor(e));
          const target = buffers.find((p) => e.item.variants.some((v) => v.startsWith(p.buf)));
          e.ring.visible = !!target;
          if (target) e.ring.material.color.set(target.color);
          if (e.z >= KD.GATE_Z && this.state === 'playing') {
            this.leak(e);
            this.world.removeEnemy(e);
            continue;
          }
        }
        stillAlive.push(e);
      }
      this.enemies = stillAlive;

      if (this.state === 'playing' && this.hearts > 0 && this.spawnLeft === 0 && !this.bossLeft && !this.targets().length) {
        this.finish(true);
      }
      if (this.state === 'ending') {
        this.endDelay -= dt;
        if (this.endDelay <= 0) {
          const won = this.pendingWin;
          this.clearField();
          this.state = 'done';
          this.hud.end(this.result(won));
        }
      }
    }

    leak(e) {
      const dmg = e.type === 'boss' ? 3 : 1;
      this.hearts = Math.max(0, this.hearts - dmg);
      this.save.markLeak(e.item.text);
      this.leaked.set(e.item.text, e.item);
      for (const p of this.players) p.combo = 0;
      this.world.gateHit();
      KD.Audio.play('gate');
      KD.Audio.speak(e.item.speak);
      this.hud.gateHit(e.item, this.hearts);
      if (e.type === 'boss') this.hud.bossHp(null);
      this.revalidate();
      this.hud.remaining(this.remaining());
      if (this.hearts <= 0) this.finish(false);
    }

    finish(won) {
      this.state = 'ending';
      this.pendingWin = won;
      this.endDelay = 1.3;
      KD.Audio.stopMusic();
      KD.Audio.play(won ? 'win' : 'lose');
    }

    result(won) {
      const correct = this.players.reduce((a, p) => a + p.correct, 0);
      const wrong = this.players.reduce((a, p) => a + p.wrong, 0);
      const kills = this.players.reduce((a, p) => a + p.kills, 0);
      const accuracy = correct + wrong ? correct / (correct + wrong) : 0;
      const speedScore = this.distanceCount ? this.distanceSum / this.distanceCount : 0;
      const coins = KD.computeCoins({ won, kills, accuracy, speedScore, hearts: this.hearts, stage: this.stage });
      const stars = !won ? 0 : this.hearts === KD.START_HEARTS ? 3 : this.hearts >= 3 ? 2 : 1;
      this.save.addCoins(coins.total);
      const firstClear = won && !this.save.stars(this.stage.id);
      if (won) this.save.setStars(this.stage.id, stars);
      return { won, stars, coins, accuracy, firstClear, stage: this.stage, players: this.players, leaked: [...this.leaked.values()], mode: this.mode };
    }
  }

  KD.Game = Game;
  KD.RELAY_SECONDS = RELAY_SECONDS;
})();
