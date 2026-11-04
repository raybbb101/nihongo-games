// Kana Karuta: see the picture, take the tile of its first kana before the tengu does.
(function () {
  const KK = globalThis.KK;
  const Sound = globalThis.GameAudio;
  const SAVE_KEY = 'kana-karuta-save-v1';
  const PLAYER_COLORS = ['#c8281e', '#1f6fb2'];
  const WRONG_LOCK = 1.2;

  const STR = {
    tagline: { en: 'See the picture. Take its first kana. Beat the tengu.', ja: '絵を見て、頭文字の札を取れ。天狗に勝て。' },
    solo: { en: '1 player', ja: '1人' }, duo: { en: '2 players', ja: '2人' },
    duoNote: { en: 'P2 holds Shift while typing. Race each other, and the tengu!', ja: 'P2はShiftを押しながら入力。お互いと天狗で競争!' },
    settings: { en: 'Settings', ja: '設定' }, back: { en: 'Back', ja: '戻る' }, allGames: { en: 'All games', ja: 'ゲーム一覧' },
    hira: { en: 'Hiragana', ja: 'ひらがな' }, kata: { en: 'Katakana', ja: 'カタカナ' }, mix: { en: 'Mixed', ja: 'ミックス' },
    stage: { en: 'Stage', ja: 'ステージ' }, reviewStage: { en: 'Review', ja: '復習' },
    howTo: { en: 'A picture appears. Answer the first kana of its word by typing the romaji or clicking the tile. Too slow and the tengu takes it. A wrong tile freezes you for a moment.', ja: '絵が出たら、その言葉の頭文字を答えよう。ローマ字を打つか札をクリック。遅いと天狗に取られ、お手つきすると少し動けない。' },
    howToDuo: { en: 'A picture appears. Type the romaji of its first kana. P2 holds Shift. A wrong tile locks you out of that card.', ja: '絵が出たら頭文字のローマ字を入力。P2はShiftを押しながら。お手つきするとその札は取れない。' },
    tilesHere: { en: 'Tiles in this stage', ja: 'このステージの札' }, start: { en: 'Start (Enter)', ja: 'スタート (Enter)' },
    tengu: { en: 'Tengu', ja: '天狗' }, wrongTile: { en: 'Wrong tile!', ja: 'お手つき!' },
    win: { en: 'You beat the tengu!', ja: '天狗に勝った!' }, lose: { en: 'The tengu won…', ja: '天狗の勝ち…' },
    winner: { en: 'wins!', ja: 'の勝ち!' }, cards: { en: 'Cards', ja: '取った札' }, wrong: { en: 'Wrong tiles', ja: 'お手つき' },
    reviewCards: { en: 'The tengu took these. Look again:', ja: '天狗に取られた札。もう一度見よう:' },
    next: { en: 'Next stage (Enter)', ja: '次のステージ (Enter)' }, again: { en: 'Try again (Enter)', ja: 'もう一度 (Enter)' }, replay: { en: 'Replay', ja: 'もう一度' }, list: { en: 'Stage select', ja: 'ステージ選択へ' },
    language: { en: 'Language', ja: '言語' }, hints: { en: 'Hints', ja: 'ヒント' },
    hint_auto: { en: 'Auto: fade as you learn', ja: '自動:覚えたら減らす' }, hint_always: { en: 'Always', ja: '常に' }, hint_off: { en: 'Off', ja: 'なし' },
    voice: { en: 'Japanese voice', ja: '日本語音声' }, sfx: { en: 'Sound effects', ja: '効果音' }, music: { en: 'Music', ja: '音楽' }, on: { en: 'On', ja: 'オン' }, off: { en: 'Off', ja: 'オフ' },
    unlockAll: { en: 'Unlock all stages (preview)', ja: '全ステージ解放(お試し用)' },
  };

  const save = (() => {
    const base = { settings: { lang: (navigator.language || 'en').startsWith('ja') ? 'ja' : 'en', hint: 'auto', voice: true, sfx: true, music: false, unlockAll: false }, stars: {}, mastery: {} };
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (raw) return { ...base, ...raw, settings: { ...base.settings, ...raw.settings } };
    } catch (e) { /* private window or corrupt save: start fresh */ }
    return base;
  })();
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* lasts this session only */ } };
  const t = (k) => STR[k][save.settings.lang];
  const mastery = (kana) => save.mastery[kana] || 0;

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
  const root = document.getElementById('app');
  const show = (...content) => { root.replaceChildren(...content.flat().filter(Boolean)); window.scrollTo(0, 0); };
  const starRow = (n) => h('span', { class: 'stars' }, '★'.repeat(n), h('i', null, '★'.repeat(3 - n)));
  const header = (title, back) => h('header', { class: 'bar' }, h('button', { class: 'plain', onclick: back }, '← ', t('back')), h('h2', null, title));

  function applySound() {
    Object.assign(Sound.settings, { sfx: save.settings.sfx, music: save.settings.music, voice: save.settings.voice });
    document.documentElement.lang = save.settings.lang;
  }

  // ---------- Menus ----------

  let playerCount = 1;
  let game = null;

  function title() {
    stopGame();
    show(
      h('div', { class: 'title' },
        h('div', { class: 'title-card' }, h('span', null, '🐭'), h('b', null, 'ね')),
        h('h1', null, 'カナカルタ'),
        h('p', { class: 'en' }, 'KANA KARUTA'),
        h('p', null, t('tagline')),
        h('div', { class: 'row' }, [1, 2].map((n) => h('button', { class: playerCount === n ? 'chip on' : 'chip', onclick: () => { playerCount = n; title(); } }, t(n === 1 ? 'solo' : 'duo')))),
        playerCount === 2 && h('p', { class: 'small' }, t('duoNote')),
        h('div', { class: 'row' }, KK.SCRIPTS.map((s, i) => h('button', { class: 'primary big', 'data-primary': i === 0 ? true : undefined, onclick: () => { Sound.unlock(); stageList(s); } }, t(s)))),
        h('div', { class: 'row' },
          h('button', { class: 'plain', onclick: settings }, '⚙ ', t('settings')),
          ['en', 'ja'].map((l) => h('button', { class: save.settings.lang === l ? 'plain on' : 'plain', onclick: () => { save.settings.lang = l; persist(); applySound(); title(); } }, l === 'en' ? 'English' : '日本語')),
          h('a', { class: 'plain', href: '../index.html' }, t('allGames')))));
  }

  function stageList(script) {
    stopGame();
    const stages = KK.stages(script);
    const open = (i) => save.settings.unlockAll || i === 0 || save.stars[stages[i].id] > 0 || save.stars[stages[i - 1].id] > 0;
    show(header(t(script), title),
      h('div', { class: 'stage-grid' }, stages.map((s, i) => h('button', {
        class: 'stage-tile', disabled: !open(i), onclick: () => intro(s),
      },
        h('small', null, `${t('stage')} ${i + 1}`),
        h('strong', null, !open(i) ? '🔒' : s.review ? t('reviewStage') : s.kana.slice(0, 3).map((k) => (script === 'kata' ? globalThis.Kana.toKatakana(k) : k)).join('')),
        starRow(save.stars[s.id] || 0)))));
  }

  function intro(stage) {
    stopGame();
    const toText = (k) => (stage.script === 'kata' ? globalThis.Kana.toKatakana(k) : k);
    show(header(`${t(stage.script)} ${stage.index + 1}`, () => stageList(stage.script)),
      h('h3', { class: 'center' }, t('tilesHere')),
      h('div', { class: 'tiles preview' }, stage.kana.map((k) => h('button', { class: 'tile', onclick: () => Sound.speak(k) },
        h('b', null, toText(k)), h('span', null, globalThis.Kana.romajiVariants(k)[0])))),
      h('p', { class: 'center note' }, t(playerCount === 2 ? 'howToDuo' : 'howTo')),
      h('div', { class: 'row' }, h('button', { class: 'primary big', 'data-primary': true, onclick: () => startGame(stage) }, t('start'))));
  }

  function settings() {
    const s = save.settings;
    const set = (k, v) => { s[k] = v; persist(); applySound(); settings(); };
    const toggle = (k) => h('div', { class: 'setting' }, h('span', null, t(k)), h('button', { class: s[k] ? 'chip on' : 'chip', 'aria-pressed': String(!!s[k]), onclick: () => set(k, !s[k]) }, t(s[k] ? 'on' : 'off')));
    show(header(t('settings'), title),
      h('div', { class: 'settings' },
        h('div', { class: 'setting' }, h('span', null, t('language')), h('div', null, ['en', 'ja'].map((l) => h('button', { class: s.lang === l ? 'chip on' : 'chip', onclick: () => set('lang', l) }, l === 'en' ? 'English' : '日本語')))),
        h('div', { class: 'setting' }, h('span', null, t('hints')), h('div', null, ['auto', 'always', 'off'].map((v) => h('button', { class: s.hint === v ? 'chip on' : 'chip', onclick: () => set('hint', v) }, t('hint_' + v))))),
        toggle('voice'), toggle('sfx'), toggle('music'), toggle('unlockAll')));
  }

  // ---------- The match ----------

  function startGame(stage) {
    Sound.unlock();
    const { tiles, deck } = KK.buildDeck(stage);
    game = {
      stage, tiles, deck, total: deck.length, card: null, phase: 'card', timeLeft: 0, wait: 0,
      players: Array.from({ length: playerCount }, (_, i) => ({ name: `P${i + 1}`, color: PLAYER_COLORS[i], buf: '', cards: 0, wrong: 0, lock: 0 })),
      tengu: 0, tenguCards: [],
    };
    if (save.settings.music) Sound.startMusic(0.15);
    drawTable();
    nextCard();
  }

  function stopGame() {
    game = null;
    Sound.stopMusic();
  }

  function drawTable() {
    const g = game;
    g.el = {
      reader: h('div', { class: 'reader' }),
      time: h('i'),
      scores: h('div', { class: 'scores' }),
      tiles: h('div', { class: 'tiles' }),
      typed: h('div', { class: 'typed-row' }),
    };
    g.tileEls = new Map(g.tiles.map((tile) => [tile, h('button', {
      class: 'tile', 'aria-label': tile.text, onclick: () => { if (playerCount === 1) answer(g.players[0], tile); },
    }, h('b', null, tile.text), h('span', null, tile.primary))]));
    g.el.tiles.append(...KK.shuffle(g.tiles).map((tile) => g.tileEls.get(tile)));
    show(
      h('div', { class: 'match-top' },
        h('button', { class: 'plain', onclick: () => stageList(g.stage.script) }, '← ', t('back')),
        h('span', null, `${t(g.stage.script)} ${g.stage.index + 1}`),
        g.el.scores),
      g.el.reader,
      h('div', { class: 'timebar' }, g.el.time),
      g.el.tiles,
      g.el.typed);
  }

  function hintLevel(kana) {
    const mode = save.settings.hint;
    if (mode === 'always') return 2;
    if (mode === 'off') return 0;
    return mastery(kana) < 3 ? 2 : mastery(kana) < 8 ? 1 : 0;
  }

  const wordWithFirst = (text) => {
    const chars = Array.from(text);
    return h('span', { class: 'word' }, h('em', null, chars[0]), chars.slice(1).join(''));
  };

  function drawReader(revealed, note) {
    const g = game;
    const c = g.card;
    const level = revealed ? 2 : hintLevel(c.kana);
    const halfway = g.timeLeft < g.stage.seconds / 2;
    g.el.reader.replaceChildren(h('div', { class: 'read-card' + (revealed ? ' revealed' : '') },
      h('div', { class: 'picture' }, c.picture),
      h('div', { class: 'read-text' },
        h('p', { class: 'meaning' }, c.en),
        (revealed || level === 2 || (level === 1 && halfway)) ? wordWithFirst(c.text) : h('span', { class: 'word hidden-word' }, '？'),
        revealed && h('p', { class: 'answer' }, `${c.tile.text} = ${c.tile.primary}`),
        note && h('p', { class: 'note-line' }, note))));
  }

  function drawScores() {
    const g = game;
    g.el.scores.replaceChildren(
      ...g.players.map((p) => h('span', { style: `color:${p.color}` }, `${p.name} `, h('b', null, String(p.cards)))),
      h('span', null, `👺 `, h('b', null, String(g.tengu))),
      h('span', { class: 'deck-left' }, `🂠 ${g.deck.length}`));
  }

  function drawTyped() {
    const g = game;
    g.el.typed.replaceChildren(...g.players.map((p, i) => h('div', { class: 'typed' + (p.lock > 0 ? ' locked' : ''), style: `--c:${p.color}` },
      h('small', null, p.name + (i === 1 ? ' ⇧' : '')), h('b', null, p.buf || ' '))));
  }

  function drawTileHints() {
    const g = game;
    for (const [tile, el] of g.tileEls) {
      el.classList.toggle('show-romaji', hintLevel(tile.kana) === 2);
      el.classList.remove('nudge');
    }
  }

  function nextCard() {
    const g = game;
    if (!g.deck.length) return finish();
    g.card = g.deck.pop();
    g.phase = 'card';
    g.timeLeft = g.stage.seconds;
    g.hinted = false;
    for (const p of g.players) { p.buf = ''; p.lock = 0; }
    drawReader(false);
    drawScores();
    drawTyped();
    drawTileHints();
    Sound.speak(g.card.speak);
  }

  function takeCard(tile) {
    const g = game;
    tile.cards--;
    if (tile.cards <= 0) g.tileEls.get(tile).classList.add('gone');
  }

  function answer(p, tile) {
    const g = game;
    if (!g || g.phase !== 'card' || p.lock > 0 || tile.cards <= 0) return;
    p.buf = '';
    if (tile === g.card.tile) {
      p.cards++;
      save.mastery[tile.kana] = mastery(tile.kana) + 1;
      persist();
      takeCard(tile);
      g.phase = 'reveal';
      g.wait = 1.1;
      Sound.play('coin');
      Sound.speak(tile.kana);
      const el = g.tileEls.get(tile);
      el.style.setProperty('--c', p.color);
      el.classList.add('taken');
      setTimeout(() => el.classList.remove('taken'), 500);
      drawReader(true, playerCount > 1 ? `${p.name} +1` : null);
      drawScores();
    } else {
      p.wrong++;
      p.lock = playerCount === 1 ? WRONG_LOCK : Infinity;
      Sound.play('miss');
      const el = g.tileEls.get(tile);
      el.classList.remove('wrong');
      void el.offsetWidth;
      el.classList.add('wrong');
      el.classList.add('show-romaji');
      flashNote(t('wrongTile'));
      if (playerCount > 1 && g.players.every((x) => x.lock > 0)) g.timeLeft = Math.min(g.timeLeft, 0.6);
    }
    drawTyped();
  }

  function flashNote(text) {
    const n = h('div', { class: 'flash-note' }, text);
    n.addEventListener('animationend', () => n.remove());
    document.body.append(n);
  }

  function timeUp() {
    const g = game;
    g.tengu++;
    g.tenguCards.push(g.card);
    takeCard(g.card.tile);
    g.phase = 'reveal';
    g.wait = 2;
    Sound.play('gate');
    Sound.speak(g.card.speak);
    drawReader(true, `👺 ${t('tengu')} +1`);
    drawScores();
    for (const p of g.players) p.buf = '';
    drawTyped();
  }

  function finish() {
    const g = game;
    const best = g.players.reduce((a, b) => (b.cards > a.cards ? b : a));
    const taken = g.players.reduce((a, p) => a + p.cards, 0);
    const stars = KK.starsFor(taken, g.total);
    const won = stars > 0;
    if (won) { save.stars[g.stage.id] = Math.max(save.stars[g.stage.id] || 0, stars); persist(); }
    Sound.stopMusic();
    Sound.play(won ? 'win' : 'lose');
    const stages = KK.stages(g.stage.script);
    const next = stages[g.stage.index + 1];
    const stage = g.stage;
    const tie = g.players.length > 1 && g.players[0].cards === g.players[1].cards;
    const results = g.players;
    const missed = g.tenguCards;
    const tengu = g.tengu;
    game = null;
    show(h('div', { class: 'result ' + (won ? 'win' : 'lose') },
      h('h2', null, won ? (results.length > 1 && !tie ? `${best.name} ${t('winner')}` : t('win')) : t('lose')),
      won && h('div', { class: 'big-stars' }, starRow(stars)),
      h('table', { class: 'score' },
        h('thead', null, h('tr', null, h('th', null), h('th', null, t('cards')), h('th', null, t('wrong')))),
        h('tbody', null,
          results.map((p) => h('tr', null, h('td', { style: `color:${p.color}` }, p.name), h('td', null, String(p.cards)), h('td', null, String(p.wrong)))),
          h('tr', null, h('td', null, `👺 ${t('tengu')}`), h('td', null, String(tengu)), h('td', null, '-')))),
      missed.length > 0 && h('div', null,
        h('h3', { class: 'center' }, t('reviewCards')),
        h('div', { class: 'missed' }, missed.map((c) => h('button', { class: 'missed-card', onclick: () => Sound.speak(c.speak) },
          h('span', null, c.picture), wordWithFirst(c.text), h('small', null, `${c.tile.primary} · ${c.en}`))))),
      h('div', { class: 'row' },
        won && next && h('button', { class: 'primary big', 'data-primary': true, onclick: () => intro(next) }, t('next')),
        !won && h('button', { class: 'primary big', 'data-primary': true, onclick: () => startGame(stage) }, t('again')),
        won && h('button', { 'data-primary': next ? undefined : true, onclick: () => startGame(stage) }, t('replay')),
        h('button', { onclick: () => stageList(stage.script) }, t('list')))));
  }

  // ---------- Input ----------

  function letterFrom(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return null;
    if (/^[a-zA-Z]$/.test(e.key)) return e.key.toLowerCase();
    const m = /^Key([A-Z])$/.exec(e.code || '');
    return m ? m[1].toLowerCase() : null;
  }

  function typeLetter(p, c) {
    const g = game;
    if (p.lock > 0) return;
    const onTable = g.tiles.filter((tile) => tile.cards > 0);
    const candidate = p.buf + c;
    const matches = onTable.filter((tile) => tile.variants.some((v) => v.startsWith(candidate)));
    if (!matches.length) {
      const hadWord = p.buf !== '';
      p.buf = '';
      Sound.play('miss');
      if (hadWord && onTable.some((tile) => tile.variants.some((v) => v.startsWith(c)))) typeLetter(p, c);
      else drawTyped();
      return;
    }
    p.buf = candidate;
    Sound.play('key');
    const done = matches.find((tile) => tile.variants.includes(candidate));
    if (done) answer(p, done);
    else drawTyped();
  }

  window.addEventListener('keydown', (e) => {
    if (game && game.phase === 'card') {
      const c = letterFrom(e);
      if (c && !e.repeat) {
        e.preventDefault();
        typeLetter(game.players[playerCount === 2 && e.shiftKey ? 1 : 0], c);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        const p = game.players[playerCount === 2 && e.shiftKey ? 1 : 0];
        p.buf = p.buf.slice(0, -1);
        drawTyped();
      }
      return;
    }
    if (!game && e.key === 'Enter' && !e.repeat) {
      const primary = root.querySelector('[data-primary]');
      if (primary) { e.preventDefault(); primary.click(); }
    }
  });

  function update(dt) {
    const g = game;
    if (!g) return;
    if (g.phase === 'card') {
      g.timeLeft -= dt;
      for (const p of g.players) {
        if (p.lock > 0 && p.lock !== Infinity) {
          p.lock -= dt;
          if (p.lock <= 0) drawTyped();
        }
      }
      g.el.time.style.width = `${Math.max(0, g.timeLeft / g.stage.seconds) * 100}%`;
      if (!g.hinted && g.timeLeft < g.stage.seconds / 2) {
        g.hinted = true;
        if (hintLevel(g.card.kana) === 1) drawReader(false);
        if (hintLevel(g.card.kana) >= 1) g.tileEls.get(g.card.tile).classList.add('nudge');
      }
      if (g.timeLeft <= 0) timeUp();
    } else if (g.phase === 'reveal') {
      g.wait -= dt;
      if (g.wait <= 0) nextCard();
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!document.hidden) update(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  applySound();
  title();
  KK.app = { update, save, get game() { return game; }, startGame, setPlayers: (n) => { playerCount = n; } };
})();
