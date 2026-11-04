// Menus, HUD and result screens (plain DOM over the 3D canvas).
(function () {
  const KD = (globalThis.KD = globalThis.KD || {});
  const t = (k) => KD.t(k);
  const { rowChars, toKatakana, romajiVariants } = globalThis.Kana;

  function h(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      node.append(kid.nodeType ? kid : String(kid));
    }
    return node;
  }
  const starRow = (n, max = 3) => h('span', { class: 'stars', 'aria-label': `${n}/${max}` }, '★'.repeat(n), h('i', null, '★'.repeat(max - n)));

  class UI {
    constructor(world, save) {
      this.world = world;
      this.save = save;
      this.root = document.getElementById('screen');
      this.hudEl = document.getElementById('hud');
      this.game = new KD.Game(world, this, save);
      this.mode = 'solo';
      this.names = ['P1', 'P2', 'P3', 'P4'];
      this.playerCount = 2;
      this.dummy = null;
      this.applySettings();
      this.hudEl.append(
        h('div', { class: 'hud-top' },
          h('div', { id: 'hearts', class: 'hearts' }),
          h('div', { id: 'stage-name', class: 'stage-name' }),
          h('div', { id: 'left', class: 'left-count' })),
        h('div', { id: 'boss', class: 'boss-bar', hidden: true }, h('b', null, 'BOSS'), h('span', null, h('i', { id: 'boss-fill' }))),
        h('div', { id: 'center', class: 'center-msg' }),
        h('div', { id: 'teach', class: 'teach', hidden: true }),
        h('div', { id: 'pops' }),
        h('div', { id: 'flash' }),
        h('div', { id: 'player-row', class: 'player-row' }),
      );
      this.title();
    }

    applySettings() {
      const s = this.save.settings;
      KD.setLang(s.lang);
      Object.assign(KD.Audio.settings, { sfx: s.sfx, music: s.music, voice: s.voice });
      this.world.setWeapon(this.save.data.weapon);
      this.world.setEffect(this.save.data.effect);
    }

    show(cls, ...content) {
      this.hudEl.hidden = true;
      this.removeDummy();
      this.world.menuDrift = true;
      this.root.className = 'screen ' + cls;
      this.root.replaceChildren(...content.flat().filter(Boolean));
      this.root.scrollTop = 0;
    }

    coinBadge() {
      return h('div', { class: 'coin-badge' }, '🪙 ', String(this.save.coins));
    }

    header(titleText, backFn) {
      return h('header', { class: 'bar' },
        h('button', { class: 'ghost', onclick: backFn }, '← ', t('back')),
        h('h2', null, titleText),
        this.coinBadge());
    }

    // ---------- Menus ----------

    title() {
      this.game.stop();
      KD.Audio.stopMusic();
      this.world.setTheme('menu');
      this.show('title-screen',
        h('div', { class: 'logo' },
          h('div', { class: 'logo-kana' }, 'カナ', h('span', null, 'ディフェンス')),
          h('div', { class: 'logo-en' }, 'KANA DEFENSE')),
        h('p', { class: 'tagline' }, t('tagline')),
        h('nav', { class: 'menu' },
          h('button', { class: 'primary big', 'data-primary': true, onclick: () => { KD.Audio.unlock(); this.playersScreen(); } }, t('play')),
          h('button', { onclick: () => this.shop() }, '🛒 ', t('shop')),
          h('button', { onclick: () => this.dex('hira') }, '📖 ', t('dex')),
          h('button', { onclick: () => this.settings() }, '⚙ ', t('settings'))),
        h('div', { class: 'lang-pick' },
          ['en', 'ja'].map((l) => h('button', {
            class: this.save.settings.lang === l ? 'ghost on' : 'ghost',
            onclick: () => { this.save.settings.lang = l; this.save.write(); this.applySettings(); this.title(); },
          }, l === 'en' ? 'English' : '日本語')),
          h('a', { class: 'ghost link', href: '../index.html' }, t('allGames'))),
      );
    }

    playersScreen() {
      const modes = [['solo', '🥷'], ['relay', '🔁'], ['simul', '⌨️']];
      const needNames = this.mode === 'solo' ? 0 : this.mode === 'simul' ? 2 : this.playerCount;
      this.show('',
        this.header(t('whoPlays'), () => this.title()),
        h('div', { class: 'cards three' }, modes.map(([id, icon]) => h('button', {
          class: 'card mode' + (this.mode === id ? ' selected' : ''),
          onclick: () => { this.mode = id; this.playersScreen(); },
        }, h('div', { class: 'card-icon' }, icon), h('h3', null, t(id)), h('p', null, t(id + 'Desc'))))),
        this.mode === 'relay' && h('div', { class: 'row center' }, h('span', null, t('players')), [2, 3, 4].map((n) => h('button', {
          class: this.playerCount === n ? 'chip on' : 'chip', onclick: () => { this.playerCount = n; this.playersScreen(); },
        }, String(n)))),
        needNames > 0 && h('div', { class: 'row center' }, Array.from({ length: needNames }, (_, i) => h('input', {
          value: this.names[i], maxlength: 10, 'aria-label': `${t('name')} ${i + 1}`,
          oninput: (e) => { this.names[i] = e.target.value || `P${i + 1}`; },
        }))),
        h('div', { class: 'row center' }, h('button', { class: 'primary big', 'data-primary': true, onclick: () => this.chapters() }, t('next'))),
      );
    }

    chapters() {
      this.world.setTheme('menu');
      const cards = KD.CHAPTERS.map((ch) => {
        const locked = ch.id === 'kanji' && !this.save.kanjiOpen();
        const got = ch.stages.reduce((a, s) => a + this.save.stars(s.id), 0);
        const done = ch.stages.filter((s) => this.save.stars(s.id)).length;
        return h('button', {
          class: 'card chapter' + (locked ? ' locked' : ''), disabled: locked,
          onclick: () => this.stages(ch.id),
        },
          h('div', { class: 'glyph' }, locked ? '🔒' : ch.glyph),
          h('h3', null, t('ch_' + ch.id)),
          h('p', null, locked ? t('kanjiLocked') : t('chd_' + ch.id)),
          h('div', { class: 'progress' }, h('i', { style: `width:${(done / ch.stages.length) * 100}%` })),
          h('small', null, `${done}/${ch.stages.length} · ★ ${got}/${ch.stages.length * 3}`));
      });
      this.show('', this.header(t('pickChapter'), () => this.playersScreen()), h('div', { class: 'cards four' }, cards));
    }

    stageLabel(stage) {
      if (stage.final) return t('final');
      if (stage.boss) return t('review');
      return stage.label;
    }

    stageSub(stage) {
      if (!stage.sub) return stage.boss ? '👹' : '';
      return typeof stage.sub === 'string' ? stage.sub : KD.pick(stage.sub);
    }

    stages(chapterId) {
      const ch = KD.chapter(chapterId);
      this.world.setTheme(chapterId);
      this.chapterId = chapterId;
      this.show('', this.header(t('ch_' + chapterId), () => this.chapters()),
        h('div', { class: 'stage-grid' }, ch.stages.map((stage, i) => {
          const open = this.save.stageOpen(ch, i);
          return h('button', {
            class: 'stage-tile' + (stage.boss ? ' boss' : '') + (open ? '' : ' locked'), disabled: !open,
            onclick: () => this.intro(stage),
          },
            h('span', { class: 'num' }, String(i + 1)),
            h('strong', null, open ? this.stageLabel(stage) : '🔒'),
            h('small', null, open ? this.stageSub(stage) : ''),
            starRow(this.save.stars(stage.id)));
        })));
    }

    itemCard(item) {
      return h('button', { class: 'kana-card', onclick: () => KD.Audio.speak(item.speak) },
        h('b', null, item.text),
        item.reading && item.reading !== item.text && h('em', null, item.reading),
        h('span', null, item.primary),
        item.meaning && h('small', null, item.meaning));
    }

    intro(stage) {
      this.stage = stage;
      this.world.setTheme(stage.chapter);
      const isNew = stage.newItems.length > 0;
      const items = isNew ? stage.newItems : stage.pool.map((x) => x.item);
      this.show('',
        this.header(`${t('stage')} ${stage.index + 1} · ${this.stageLabel(stage)}`, () => this.stages(stage.chapter)),
        h('h3', { class: 'section' }, t(isNew ? 'newKana' : 'reviewKana')),
        h('div', { class: isNew ? 'kana-cards' : 'kana-cards small' }, items.map((x) => this.itemCard(x))),
        h('p', { class: 'note' }, t('howTo'),
          this.mode === 'simul' ? ' ' + t('howSimul') : '',
          this.mode === 'relay' ? ' ' + t('howRelay') : ''),
        h('div', { class: 'row center' }, h('button', {
          class: 'primary big', 'data-primary': true,
          onclick: () => this.startStage(stage),
        }, t('start'))),
      );
      if (isNew && items.length <= 7) items.forEach((x) => KD.Audio.speak(x.speak, true));
    }

    activeNames() {
      if (this.mode === 'solo') return [this.names[0]];
      if (this.mode === 'simul') return this.names.slice(0, 2);
      return this.names.slice(0, this.playerCount);
    }

    startStage(stage) {
      KD.Audio.unlock();
      KD.Audio.stopSpeech();
      this.root.className = 'screen hidden';
      this.root.replaceChildren();
      this.removeDummy();
      this.hudEl.hidden = false;
      this.world.setWeapon(this.save.data.weapon);
      this.world.setEffect(this.save.data.effect);
      this.game.start(stage, this.mode, this.activeNames());
    }

    // ---------- Shop ----------

    addDummy() {
      if (this.dummy) return;
      const d = this.world.makeEnemy('oni');
      d.root.position.set(4.5, 0, -7);
      this.world.setEnemySign(d, 'あ');
      this.dummy = d;
    }

    removeDummy() {
      if (!this.dummy) return;
      this.world.removeEnemy(this.dummy);
      this.dummy = null;
    }

    previewAttack() {
      if (!this.dummy) return;
      const at = this.dummy.root.position.clone();
      at.y = 2.2;
      this.world.attack(at);
    }

    shop() {
      const data = this.save.data;
      const list = (entries, slot) => entries.map((item) => {
        const owned = this.save.owns(item.id);
        const isOn = data[slot] === item.id;
        const canBuy = this.save.coins >= item.price;
        return h('div', { class: 'shop-item' + (isOn ? ' on' : '') },
          h('div', { class: 'shop-icon' }, item.icon),
          h('div', { class: 'shop-text' }, h('b', null, KD.pick(item)), item.desc && h('small', null, KD.pick(item.desc))),
          owned
            ? h('button', {
              class: isOn ? 'chip on' : 'chip', disabled: isOn,
              onclick: () => {
                data[slot] = item.id;
                this.save.write();
                this.applySettings();
                this.shop();
                this.previewAttack();
              },
            }, t(isOn ? 'equipped' : 'equip'))
            : h('button', {
              class: 'chip buy', disabled: !canBuy, title: canBuy ? '' : t('notEnough'),
              onclick: () => {
                if (!this.save.buy(item.id, item.price)) return;
                KD.Audio.play('coin');
                data[slot] = item.id;
                this.save.write();
                this.applySettings();
                this.shop();
                this.previewAttack();
              },
            }, `🪙 ${item.price}`));
      });
      this.show('shop-screen',
        h('div', { class: 'shop-panel' },
          this.header(t('shop'), () => this.title()),
          h('p', { class: 'note' }, t('shopNote')),
          h('h3', { class: 'section' }, t('weapons')), list(KD.WEAPONS, 'weapon'),
          h('h3', { class: 'section' }, t('effects')), list(KD.EFFECTS, 'effect')),
        h('button', { class: 'primary try-it', onclick: () => { KD.Audio.unlock(); this.previewAttack(); } }, '▶ ', t('tryIt')));
      this.world.setTheme('hira');
      this.world.menuDrift = false;
      this.addDummy();
    }

    // ---------- Chart ----------

    dex(tab) {
      const script = (fn) => Object.keys(globalThis.Kana.ROWS).flatMap((r) => rowChars(r)).map(fn).map((text) => ({ text, primary: romajiVariants(text)[0], speak: text }));
      const kanji = () => globalThis.KANJI_GROUPS.flatMap((g) => g.items).map((e) => ({ text: e.text, primary: romajiVariants(e.r[0])[0], speak: e.r[0], meaning: e.en }));
      const items = tab === 'hira' ? script((c) => c) : tab === 'kata' ? script(toKatakana) : kanji();
      const cls = (text) => {
        const m = this.save.mastery(text);
        if (m.l >= 3 && m.l > m.c / 3) return 'weak';
        if (m.c >= 8) return 'good';
        if (m.c > 0 || m.l > 0) return 'learning';
        return '';
      };
      this.show('',
        this.header(t('dex'), () => this.title()),
        h('div', { class: 'row center' }, ['hira', 'kata', 'kanji'].map((id) => h('button', {
          class: tab === id ? 'chip on' : 'chip', onclick: () => this.dex(id),
        }, t('ch_' + id)))),
        h('p', { class: 'note' }, t('dexNote')),
        h('div', { class: 'dex-grid' }, items.map((item) => h('button', {
          class: 'dex-cell ' + cls(item.text), onclick: () => { KD.Audio.speak(item.speak); },
        }, h('b', null, item.text), h('span', null, item.primary), item.meaning && h('small', null, item.meaning)))));
    }

    // ---------- Settings ----------

    settings() {
      const s = this.save.settings;
      const set = (k, v) => { s[k] = v; this.save.write(); this.applySettings(); this.settings(); };
      const toggle = (k, label) => h('div', { class: 'setting' }, h('span', null, label),
        h('button', { class: s[k] ? 'chip on' : 'chip', 'aria-pressed': String(!!s[k]), onclick: () => set(k, !s[k]) }, t(s[k] ? 'on' : 'off')));
      this.show('',
        this.header(t('settings'), () => this.title()),
        h('div', { class: 'settings' },
          h('div', { class: 'setting' }, h('span', null, t('language')), h('div', null,
            ['en', 'ja'].map((l) => h('button', { class: s.lang === l ? 'chip on' : 'chip', onclick: () => set('lang', l) }, l === 'en' ? 'English' : '日本語')))),
          h('div', { class: 'setting column' }, h('span', null, t('hints')), h('div', null,
            ['auto', 'always', 'off'].map((v) => h('button', { class: s.hint === v ? 'chip on' : 'chip', onclick: () => set('hint', v) }, t('hint_' + v))))),
          toggle('voice', t('voice')), toggle('sfx', t('sfx')), toggle('music', t('music')), toggle('unlockAll', t('unlockAll')),
          h('div', { class: 'setting' }, h('span', null), h('button', {
            class: 'chip danger',
            onclick: () => { if (window.confirm(t('resetConfirm'))) { this.save.reset(); this.applySettings(); this.settings(); } },
          }, t('resetSave')))));
    }

    // ---------- HUD callbacks from Game ----------

    begin(game) {
      this.hearts(game.hearts);
      document.getElementById('stage-name').textContent = `${t('ch_' + game.stage.chapter)} ${game.stage.index + 1} · ${this.stageLabel(game.stage)}`;
      this.remaining(game.remaining());
      this.bossHp(null);
      document.getElementById('teach').hidden = true;
      document.getElementById('pops').replaceChildren();
      document.getElementById('center').replaceChildren();
      this.players(game);
    }

    hearts(n) {
      document.getElementById('hearts').replaceChildren(...Array.from({ length: KD.START_HEARTS }, (_, i) => h('i', { class: i < n ? '' : 'lost' }, '⛩')));
    }

    remaining(n) {
      document.getElementById('left').textContent = `👹 ${n} ${t('remaining')}`;
    }

    players(game) {
      const row = document.getElementById('player-row');
      row.replaceChildren(...game.players.map((p, i) => {
        const on = game.mode !== 'relay' || game.active === i;
        const panel = h('div', { class: 'player-box' + (on ? ' active' : ' idle'), style: `--c:${p.color}` },
          h('div', { class: 'player-head' },
            h('b', null, p.name + (game.mode === 'simul' && i === 1 ? ' ⇧' : '')),
            h('span', null, `👹 ${p.kills}`),
            p.combo > 1 && h('em', null, `${p.combo} combo`)),
          h('div', { class: 'typed' }, p.buf || h('span', { class: 'placeholder' }, on ? t('typeHere') : '')),
          game.mode === 'relay' && on && h('div', { class: 'relay-bar' }, h('i', { id: 'relay-fill' })));
        return panel;
      }));
    }

    typo(p) {
      const boxes = document.querySelectorAll('.player-box');
      const box = boxes[this.game.players.indexOf(p)];
      if (!box) return;
      box.classList.remove('shake');
      void box.offsetWidth;
      box.classList.add('shake');
    }

    pop(at, text, typed, color) {
      const s = this.world.project(at);
      const n = h('div', { class: 'pop', style: `left:${s.x}px;top:${s.y}px;color:${color}` }, h('b', null, text), h('span', null, typed));
      n.addEventListener('animationend', () => n.remove());
      document.getElementById('pops').append(n);
    }

    gateHit(item, hearts) {
      this.hearts(hearts);
      const f = document.getElementById('flash');
      f.classList.remove('on');
      void f.offsetWidth;
      f.classList.add('on');
      const teach = document.getElementById('teach');
      teach.replaceChildren(h('b', null, item.text), h('span', null, '= ', item.reading ? `${item.reading} ${item.primary}` : item.primary), item.meaning && h('small', null, item.meaning));
      teach.hidden = false;
      clearTimeout(this.teachTimer);
      this.teachTimer = setTimeout(() => { teach.hidden = true; }, 2200);
    }

    centerText(text, cls, ms) {
      const c = document.getElementById('center');
      c.replaceChildren(h('div', { class: 'center-pop ' + (cls || '') }, text));
      clearTimeout(this.centerTimer);
      this.centerTimer = setTimeout(() => c.replaceChildren(), ms);
    }

    count(n) {
      this.centerText(n > 0 ? String(n) : t('go'), 'count', n > 0 ? 900 : 700);
    }

    bossWarning() {
      this.centerText(t('bossWarn'), 'boss-warn', 1800);
      this.bossHp(1);
    }

    bossHp(fraction) {
      const b = document.getElementById('boss');
      b.hidden = fraction === null;
      if (fraction !== null) document.getElementById('boss-fill').style.width = `${fraction * 100}%`;
    }

    relaySwitch(player) {
      this.centerText(`${player.name}${t('yourTurn')}`, 'relay', 1300);
      KD.Audio.play('count');
    }

    relayTime(fraction) {
      const fill = document.getElementById('relay-fill');
      if (fill) fill.style.width = `${fraction * 100}%`;
    }

    // ---------- Results ----------

    end(r) {
      this.hudEl.hidden = true;
      this.world.menuDrift = true;
      this.bossHp(null);
      const accuracy = (p) => (p.correct + p.wrong ? Math.round((p.correct / (p.correct + p.wrong)) * 100) : 0);
      const top = Math.max(1, ...r.players.map((p) => p.kills));
      const multi = r.players.length > 1;
      const mvp = multi && r.players.reduce((a, b) => (b.kills > a.kills ? b : a));

      const chapter = KD.chapter(r.stage.chapter);
      const next = chapter.stages[r.stage.index + 1];
      const chapterDone = r.won && !next && r.firstClear;
      const kanjiJustOpened = r.won && r.firstClear && r.stage.chapter !== 'kanji' && this.save.kanjiOpen() && !this.save.settings.unlockAll;

      const coinRows = ['kill', 'clear', 'speed', 'accuracy', 'perfect'].filter((k) => r.coins[k] > 0);

      this.show('result-screen',
        h('div', { class: 'result-card ' + (r.won ? 'win' : 'lose') },
          h('h2', null, t(r.won ? 'cleared' : 'defeated')),
          r.won ? h('div', { class: 'big-stars' }, starRow(r.stars)) : h('p', { class: 'note' }, t('defeatedTip')),
          chapterDone && h('p', { class: 'banner' }, '🎉 ', t('chapterDone')),
          kanjiJustOpened && h('p', { class: 'banner' }, '🔓 ', t('kanjiUnlocked')),
          h('table', { class: 'score' },
            h('thead', null, h('tr', null, h('th', null), h('th', null, t('kills')), h('th', null, t('accuracy')), h('th', null, t('bestCombo')), h('th', null, t('typos')))),
            h('tbody', null, r.players.map((p) => h('tr', { style: `--c:${p.color}` },
              h('td', { class: 'who' }, p.name, mvp === p && p.kills > 0 && h('span', { class: 'mvp' }, t('mvp'))),
              h('td', { class: 'bar-cell' }, h('span', { class: 'kill-bar', style: `width:${(p.kills / top) * 100}%` }), h('b', null, String(p.kills))),
              h('td', null, `${accuracy(p)}%`),
              h('td', null, String(p.best)),
              h('td', null, String(p.wrong)))))),
          h('div', { class: 'coin-sum' },
            coinRows.map((k) => h('span', null, `${t('c_' + k)} +${r.coins[k]}`)),
            h('b', null, `🪙 +${r.coins.total}`), h('em', null, `(${this.save.coins})`)),
          r.leaked.length > 0 && h('div', null,
            h('h3', { class: 'section' }, t('reviewThese')),
            h('div', { class: 'kana-cards small' }, r.leaked.map((x) => this.itemCard(x)))),
          h('div', { class: 'row center' },
            r.won && next
              ? h('button', { class: 'primary big', 'data-primary': true, onclick: () => this.intro(next) }, t('nextStage'))
              : !r.won && h('button', { class: 'primary big', 'data-primary': true, onclick: () => this.startStage(r.stage) }, t('again')),
            r.won && h('button', { 'data-primary': next ? undefined : true, onclick: () => this.startStage(r.stage) }, t('replay')),
            h('button', { onclick: () => this.shop() }, '🛒 ', t('toShop')),
            h('button', { onclick: () => this.stages(r.stage.chapter) }, t('quit')))),
      );
      KD.Audio.play('coin');
    }

    // ---------- Pause ----------

    pause() {
      const g = this.game;
      if (g.state !== 'playing' && g.state !== 'countdown') return;
      this.pausedFrom = g.state;
      g.state = 'paused';
      KD.Audio.stopMusic();
      KD.Audio.stopSpeech();
      this.root.className = 'screen pause-screen';
      this.root.replaceChildren(h('div', { class: 'result-card' },
        h('h2', null, t('paused')),
        h('nav', { class: 'menu' },
          h('button', { class: 'primary big', 'data-primary': true, onclick: () => this.resume() }, t('resume')),
          h('button', { onclick: () => this.startStage(g.stage) }, t('retry')),
          h('button', { onclick: () => { g.stop(); this.stages(g.stage.chapter); } }, t('quit')))));
    }

    resume() {
      const g = this.game;
      if (g.state !== 'paused') return;
      g.state = this.pausedFrom;
      this.root.className = 'screen hidden';
      this.root.replaceChildren();
      if (g.state === 'playing') KD.Audio.startMusic(g.stage.index / Math.max(1, KD.chapter(g.stage.chapter).stages.length - 1));
    }
  }

  KD.UI = UI;
})();
