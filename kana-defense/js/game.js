// Rules of one stage: spawning, typing, scoring. Rendering is delegated to World, text to the HUD.
// In a room the host's copy decides everything; guests mirror it and ask the host to confirm hits.
(function () {
  const KD = (globalThis.KD = globalThis.KD || {});
  const PENDING_WAIT = 0.45;
  const CLAIM_SECONDS = 0.8;
  const SYNC_SECONDS = 1;
  const PLAYER_COLORS = ['#ff5a4d', '#4dc3ff', '#ffd24d', '#7dff8a'];

  class Game {
    constructor(world, hud, save) {
      this.world = world;
      this.hud = hud;
      this.save = save;
      this.state = 'idle';
      this.enemies = [];
    }

    start(stage, names, room = null) {
      this.clearField();
      this.stage = stage;
      this.room = room;
      this.isGuest = !!room && !room.isHost;
      this.me = room ? room.me : 0;
      this.players = names.map((name, i) => ({
        name, color: PLAYER_COLORS[i], buf: '', pendingAt: 0, gone: false,
        kills: 0, correct: 0, wrong: 0, combo: 0, best: 0, lastNEndAt: -1,
      }));
      this.hearts = KD.START_HEARTS;
      this.leaked = new Map();
      this.distanceSum = 0;
      this.distanceCount = 0;
      this.clock = 0;
      this.nextId = 1;
      this.syncTimer = SYNC_SECONDS;
      this.netLeft = null;
      this.itemByText = new Map(stage.pool.map((x) => [x.item.text, x.item]));

      const p = stage.params;
      const extra = names.length - 1;
      this.spawnLeft = Math.round(p.count * (1 + extra * 0.5));
      this.interval = p.interval / (1 + extra * 0.3);
      this.maxAlive = Math.round(p.maxAlive * (1 + extra * 0.5));
      this.bossLeft = stage.boss ? 1 : 0;
      this.bossHp = stage.boss * names.length;
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
      this.room = null;
      this.isGuest = false;
      this.world.menuDrift = true;
    }

    broadcast(msg) {
      if (this.room && !this.isGuest) this.room.broadcast(msg);
    }

    remaining() {
      if (this.isGuest && this.netLeft !== null) return this.netLeft;
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
      const speedMul = type === 'runner' ? 1.45 : type === 'boss' ? 0.42 : type === 'ghost' ? 0.95 : 0.85 + Math.random() * 0.3;
      const spec = {
        id: this.nextId++, type, text: this.pickItem().text,
        hp: type === 'boss' ? this.bossHp : 1,
        speed: this.stage.params.speed * speedMul,
        x0: type === 'boss' ? 0 : (Math.random() * 2 - 1) * 9,
        wave: Math.random() * 6.28,
      };
      this.broadcast({ t: 'spawn', ...spec, left: this.remaining() + 1 });
      return this.addEnemy(spec);
    }

    addEnemy(spec) {
      const e = this.world.makeEnemy(spec.type);
      e.id = spec.id;
      e.item = this.itemByText.get(spec.text);
      e.hp = spec.hp;
      e.maxHp = spec.hp;
      e.speed = spec.speed;
      e.x0 = spec.x0;
      e.wave = spec.wave;
      e.z = KD.SPAWN_Z;
      e.claimedUntil = 0;
      e.root.position.set(e.x0, 0, e.z);
      this.world.setEnemySign(e, e.item.text);
      this.enemies.push(e);
      if (spec.type === 'boss') {
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
          this.spawnLeft--;
          this.spawn(type);
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

    get local() {
      return this.players[this.me];
    }

    targets() {
      return this.enemies.filter((e) => !e.dying && e.claimedUntil <= this.clock);
    }

    onLetter(c) {
      if (this.state !== 'playing') return;
      this.typeLetter(this.local, c);
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
        this.reportStats();
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

    onConfirm() {
      if (this.state !== 'playing') return;
      if (this.local.pendingAt) this.resolvePending(this.local);
      this.hud.players(this);
    }

    onBackspace() {
      if (this.state !== 'playing') return;
      this.local.buf = this.local.buf.slice(0, -1);
      this.local.pendingAt = 0;
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
      if (this.isGuest) {
        // Hide it from this player until the host answers; a teammate may have got there first.
        e.claimedUntil = this.clock + CLAIM_SECONDS;
        this.room.send({ t: 'strike', id: e.id, typed, ...this.statsOf(p) });
        this.revalidate();
        return;
      }
      this.applyHit(e, p, typed);
    }

    applyHit(e, p, typed, nextText) {
      const mine = p === this.local;
      if (mine) {
        KD.Audio.speak(e.item.readingFor[typed] || e.item.speak);
        this.save.markCorrect(e.item.text);
      }
      if (!this.isGuest) {
        this.distanceSum += (KD.GATE_Z - e.z) / (KD.GATE_Z - KD.SPAWN_Z);
        this.distanceCount++;
      }
      e.claimedUntil = 0;
      const at = e.root.position.clone();
      at.y += e.type === 'boss' ? 3.6 : 2.2;
      this.hud.pop(at, e.item.text, typed, p.color);
      e.hp--;
      if (e.hp > 0) {
        if (nextText) {
          e.item = this.itemByText.get(nextText);
        } else {
          const previous = e.item.primary;
          e.item = this.pickItem();
          if (e.item.primary === previous) e.item = this.pickItem();
        }
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
      this.broadcast({ t: 'hit', id: e.id, p: this.players.indexOf(p), typed, next: e.hp > 0 ? e.item.text : null, left: this.remaining() });
      this.revalidate();
      this.hud.remaining(this.remaining());
      this.hud.players(this);
    }

    // A half-typed word can lose its target to a teammate or to the gate.
    revalidate() {
      const p = this.local;
      if (p.buf && !this.targets().some((e) => e.item.variants.some((v) => v.startsWith(p.buf)))) {
        p.buf = '';
        p.pendingAt = 0;
      }
    }

    // ---------- Room messages ----------

    statsOf(p) {
      return { correct: p.correct, wrong: p.wrong, best: p.best };
    }

    reportStats() {
      if (this.isGuest) this.room.send({ t: 'stats', ...this.statsOf(this.local) });
    }

    receive(msg, from) {
      if (this.state === 'idle' || this.state === 'done') return;
      if (this.isGuest) this.receiveAsGuest(msg);
      else this.receiveAsHost(msg, from);
    }

    receiveAsHost(msg, from) {
      const p = this.players[from];
      if (!p) return;
      if (msg.t === 'stats' || msg.t === 'strike') Object.assign(p, { correct: msg.correct, wrong: msg.wrong, best: msg.best });
      if (msg.t === 'strike' && this.state === 'playing') {
        const e = this.enemies.find((x) => x.id === msg.id && !x.dying);
        if (e && e.item.variants.includes(msg.typed)) this.applyHit(e, p, msg.typed);
      }
    }

    receiveAsGuest(msg) {
      if (msg.left !== undefined) { this.netLeft = msg.left; this.hud.remaining(msg.left); }
      if (msg.t === 'spawn') {
        this.addEnemy(msg);
      } else if (msg.t === 'hit') {
        const e = this.enemies.find((x) => x.id === msg.id && !x.dying);
        if (e) this.applyHit(e, this.players[msg.p], msg.typed, msg.next);
      } else if (msg.t === 'leak') {
        const e = this.enemies.find((x) => x.id === msg.id);
        if (e) {
          this.hearts = msg.hearts + (e.type === 'boss' ? 3 : 1); // leak() takes the damage off again
          this.leak(e);
          this.world.removeEnemy(e);
          this.enemies = this.enemies.filter((x) => x !== e);
        }
      } else if (msg.t === 'sync') {
        this.clock = Math.max(this.clock, msg.clock);
        for (const [id, z] of msg.e) {
          const e = this.enemies.find((x) => x.id === id);
          if (e && Math.abs(e.z - z) > 1.2) e.z = z;
        }
      } else if (msg.t === 'finish') {
        this.state = 'ending';
        KD.Audio.stopMusic();
        KD.Audio.play(msg.won ? 'win' : 'lose');
      } else if (msg.t === 'end') {
        msg.stats.forEach((s, i) => {
          if (i === this.me) this.players[i].kills = s.kills;
          else Object.assign(this.players[i], s);
        });
        this.hearts = msg.hearts;
        this.distanceSum = msg.speedScore;
        this.distanceCount = 1;
        msg.leaked.forEach((text) => this.leaked.set(text, this.itemByText.get(text)));
        this.clearField();
        this.state = 'done';
        this.hud.end(this.result(msg.won));
      }
    }

    playerLeft(i) {
      if (this.players && this.players[i]) {
        this.players[i].gone = true;
        this.hud.players(this);
      }
    }

    // ---------- Frame update ----------

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
        const p = this.local;
        if (p.pendingAt && this.clock >= p.pendingAt) { this.resolvePending(p); this.hud.players(this); }
        if (!this.isGuest) this.updateSpawning(dt);
      }

      const buf = this.local.buf;
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
          if (this.isGuest) e.z = Math.min(e.z, KD.GATE_Z); // the host says when it actually got through
          const progress = (e.z - KD.SPAWN_Z) / (KD.GATE_Z - KD.SPAWN_Z);
          let x = e.x0 * (1 - progress * 0.4);
          if (e.type === 'ghost') x += Math.sin(this.clock * 2.2 + e.wave) * 3.2 * (1 - progress * 0.5);
          e.root.position.set(x, 0, e.z);
          this.world.setEnemyHint(e, e.item.meaning ? [e.item.meaning] : null);
          const targeted = buf && e.item.variants.some((v) => v.startsWith(buf));
          e.ring.visible = !!targeted;
          if (targeted) e.ring.material.color.set(this.local.color);
          if (!this.isGuest && e.z >= KD.GATE_Z && this.state === 'playing') {
            this.leak(e);
            this.world.removeEnemy(e);
            continue;
          }
        }
        stillAlive.push(e);
      }
      this.enemies = stillAlive;

      if (this.room && !this.isGuest) {
        this.syncTimer -= dt;
        if (this.syncTimer <= 0) {
          this.syncTimer = SYNC_SECONDS;
          this.broadcast({ t: 'sync', clock: this.clock, left: this.remaining(), e: this.enemies.filter((e) => !e.dying).map((e) => [e.id, e.z]) });
        }
      }

      if (this.isGuest) return;
      if (this.state === 'playing' && this.hearts > 0 && this.spawnLeft === 0 && !this.bossLeft && !this.targets().length) {
        this.finish(true);
      }
      if (this.state === 'ending') {
        this.endDelay -= dt;
        if (this.endDelay <= 0) {
          const won = this.pendingWin;
          this.broadcast({
            t: 'end', won, hearts: this.hearts,
            speedScore: this.distanceCount ? this.distanceSum / this.distanceCount : 0,
            stats: this.players.map((p) => ({ kills: p.kills, ...this.statsOf(p) })),
            leaked: [...this.leaked.keys()],
          });
          this.clearField();
          this.state = 'done';
          this.hud.end(this.result(won));
        }
      }
    }

    leak(e) {
      const dmg = e.type === 'boss' ? 3 : 1;
      this.hearts = Math.max(0, this.hearts - dmg);
      this.broadcast({ t: 'leak', id: e.id, hearts: this.hearts, left: this.remaining() - 1 });
      this.save.markLeak(e.item.text);
      this.leaked.set(e.item.text, e.item);
      this.local.combo = 0;
      this.world.gateHit();
      KD.Audio.play('gate');
      KD.Audio.speak(e.item.speak);
      this.hud.gateHit(e.item, this.hearts);
      if (e.type === 'boss') this.hud.bossHp(null);
      e.dying = true; // no longer typable once it is through the gate
      this.revalidate();
      this.hud.remaining(this.remaining());
      if (this.hearts <= 0 && !this.isGuest) this.finish(false);
    }

    finish(won) {
      this.state = 'ending';
      this.pendingWin = won;
      this.endDelay = 1.3;
      this.broadcast({ t: 'finish', won });
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
      return { won, stars, coins, accuracy, firstClear, stage: this.stage, players: this.players, leaked: [...this.leaked.values()], guest: this.isGuest };
    }
  }

  KD.Game = Game;
})();
