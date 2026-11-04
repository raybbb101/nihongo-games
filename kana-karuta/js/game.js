// Kana Karuta: see the picture, take the tile of its first kana before the tengu does.
(function () {
  const KK = globalThis.KK;
  const Sound = globalThis.GameAudio;
  const SAVE_KEY = 'kana-karuta-save-v1';
  const PLAYER_COLORS = ['#c8281e', '#1f6fb2', '#b07a00', '#2f7a3a'];
  const WRONG_LOCK = 1.2;

  const STR = {
    tagline: { en: 'See the picture. Take its first kana. Beat the tengu.', ja: '絵を見て、頭文字の札を取れ。天狗に勝て。' },
    solo: { en: 'Play solo', ja: 'ひとりで遊ぶ' }, multi: { en: 'Play with friends (up to 4, each on their own computer)', ja: '友達と遊ぶ(最大4人、それぞれのパソコンで)' },
    createRoom: { en: 'Create a room', ja: 'ルームを作る' }, join: { en: 'Join', ja: '入る' },
    name: { en: 'Your name', ja: '名前' }, roomCode: { en: 'Room code', ja: 'ルームコード' }, connecting: { en: 'Connecting…', ja: '接続中…' },
    shareCode: { en: 'Send this code to your friends:', ja: 'このコードを友達に送ってください:' }, copyCode: { en: 'Copy', ja: 'コピー' }, copied: { en: 'Copied!', ja: 'コピーしました' },
    players: { en: 'Players', ja: 'プレイヤー' }, leaveRoom: { en: 'Leave room', ja: 'ルームを出る' },
    waitHost: { en: 'Waiting for the host to choose a stage…', ja: 'ホストがステージを選ぶのを待っています…' },
    waitStart: { en: 'Waiting for the host to start…', ja: 'ホストの開始を待っています…' },
    err_network: { en: 'Could not reach the connection service. Check your internet and try again.', ja: '接続サービスにつながりません。インターネットを確認してもう一度試してください。' },
    'err_not-found': { en: 'No room with that code. Check the code with your friend.', ja: 'そのコードのルームはありません。友達にコードを確認してください。' },
    err_timeout: { en: 'Could not connect to that room. A school or office network may be blocking it.', ja: 'ルームに接続できませんでした。学校や会社のネットワークが遮断している可能性があります。' },
    err_full: { en: 'That room is full.', ja: 'そのルームは満員です。' },
    err_started: { en: 'That room is in the middle of a stage. Try again when it ends.', ja: 'そのルームはプレイ中です。ステージが終わってからもう一度試してください。' },
    hostLeft: { en: 'The host left, so the room has closed.', ja: 'ホストが抜けたため、ルームが閉じました。' },
    settings: { en: 'Settings', ja: '設定' }, back: { en: 'Back', ja: '戻る' }, allGames: { en: 'All games', ja: 'ゲーム一覧' },
    hira: { en: 'Hiragana', ja: 'ひらがな' }, kata: { en: 'Katakana', ja: 'カタカナ' }, mix: { en: 'Mixed', ja: 'ミックス' },
    stage: { en: 'Stage', ja: 'ステージ' }, reviewStage: { en: 'Review', ja: '復習' },
    howTo: { en: 'A picture appears. Answer the first kana of its word by typing the romaji or clicking the tile. Too slow and the tengu takes it. A wrong tile freezes you for a moment.', ja: '絵が出たら、その言葉の頭文字を答えよう。ローマ字を打つか札をクリック。遅いと天狗に取られ、お手つきすると少し動けない。' },
    howToDuo: { en: 'A picture appears. Answer its first kana before your friends and the tengu do. A wrong tile locks you out of that card.', ja: '絵が出たら頭文字を答えよう。友達と天狗より先に取ろう。お手つきするとその札は取れない。' },
    tilesHere: { en: 'Tiles in this stage', ja: 'このステージの札' }, start: { en: 'Start (Enter)', ja: 'スタート (Enter)' },
    tengu: { en: 'Tengu', ja: '天狗' }, wrongTile: { en: 'Wrong tile!', ja: 'お手つき!' },
    win: { en: 'You beat the tengu!', ja: '天狗に勝った!' }, lose: { en: 'The tengu won…', ja: '天狗の勝ち…' },
    winner: { en: 'wins!', ja: 'の勝ち!' }, cards: { en: 'Cards', ja: '取った札' }, wrong: { en: 'Wrong tiles', ja: 'お手つき' },
    reviewCards: { en: 'The tengu took these. Look again:', ja: '天狗に取られた札。もう一度見よう:' },
    next: { en: 'Next stage (Enter)', ja: '次のステージ (Enter)' }, again: { en: 'Try again (Enter)', ja: 'もう一度 (Enter)' }, replay: { en: 'Replay', ja: 'もう一度' }, list: { en: 'Stage select', ja: 'ステージ選択へ' },
    language: { en: 'Language', ja: '言語' },
    voice: { en: 'Japanese voice', ja: '日本語音声' }, sfx: { en: 'Sound effects', ja: '効果音' }, music: { en: 'Music', ja: '音楽' }, on: { en: 'On', ja: 'オン' }, off: { en: 'Off', ja: 'オフ' },
    unlockAll: { en: 'Unlock all stages (preview)', ja: '全ステージ解放(お試し用)' },
  };

  const save = (() => {
    const base = { settings: { lang: (navigator.language || 'en').startsWith('ja') ? 'ja' : 'en', voice: true, sfx: true, music: false, unlockAll: false }, stars: {} };
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (raw) return { ...base, ...raw, settings: { ...base.settings, ...raw.settings } };
    } catch (e) { /* private window or corrupt save: start fresh */ }
    return base;
  })();
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* lasts this session only */ } };
  const t = (k) => STR[k][save.settings.lang];

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
  const show = (...content) => { inLobby = false; root.replaceChildren(...content.flat().filter(Boolean)); window.scrollTo(0, 0); };
  const starRow = (n) => h('span', { class: 'stars' }, '★'.repeat(n), h('i', null, '★'.repeat(3 - n)));
  const header = (title, back) => h('header', { class: 'bar' }, h('button', { class: 'plain', onclick: back }, '← ', t('back')), h('h2', null, title));

  function applySound() {
    Object.assign(Sound.settings, { sfx: save.settings.sfx, music: save.settings.music, voice: save.settings.voice });
    document.documentElement.lang = save.settings.lang;
  }

  // ---------- Menus ----------

  let room = null;
  let game = null;
  let inLobby = false;
  let playerName = 'P1';
  let joinCode = '';
  let roomError = '';
  const Rooms = globalThis.Rooms;
  const isGuest = () => !!room && !room.isHost;

  function leaveRoom() {
    inLobby = false;
    if (room) room.leave();
    room = null;
  }

  function title() {
    leaveRoom();
    stopGame();
    show(
      h('div', { class: 'title' },
        h('div', { class: 'title-card' }, h('span', null, '🐭'), h('b', null, 'ね')),
        h('h1', null, 'カナカルタ'),
        h('p', { class: 'en' }, 'KANA KARUTA'),
        h('p', null, t('tagline')),
        h('h3', null, t('solo')),
        h('div', { class: 'row' }, KK.SCRIPTS.map((s, i) => h('button', {
          class: 'primary big', 'data-primary': i === 0 ? true : undefined, onclick: () => { Sound.unlock(); stageList(s); },
        }, t(s)))),
        h('h3', null, t('multi')),
        h('div', { class: 'row room-row' },
          h('label', null, t('name'), ' ', h('input', { value: playerName, maxlength: 10, oninput: (e) => { playerName = e.target.value; } })),
          h('button', { onclick: createRoom }, '🏠 ', t('createRoom')),
          h('input', {
            class: 'code-input', value: joinCode, maxlength: Rooms.CODE_LENGTH, 'aria-label': t('roomCode'), placeholder: t('roomCode'), autocomplete: 'off',
            oninput: (e) => { joinCode = Rooms.normalizeCode(e.target.value); e.target.value = joinCode; },
            onkeydown: (e) => { if (e.key === 'Enter') joinRoom(); },
          }),
          h('button', { onclick: joinRoom }, '🔑 ', t('join'))),
        roomError && h('p', { class: 'room-error', role: 'alert' }, roomError),
        h('div', { class: 'row' },
          h('button', { class: 'plain', onclick: settings }, '⚙ ', t('settings')),
          ['en', 'ja'].map((l) => h('button', { class: save.settings.lang === l ? 'plain on' : 'plain', onclick: () => { save.settings.lang = l; persist(); applySound(); title(); } }, l === 'en' ? 'English' : '日本語')),
          h('a', { class: 'plain', href: '../index.html' }, t('allGames')))));
    roomError = '';
  }

  function roomFailed(err) {
    room = null;
    roomError = STR['err_' + err.message] ? t('err_' + err.message) : t('err_network');
    title();
  }

  function useRoom(r) {
    room = r;
    r.onPlayers = () => { if (inLobby) lobby(); };
    r.onPlayerLeft = (i) => { if (game && game.players[i]) { game.players[i].gone = true; checkAllLocked(); } };
    r.onClosed = () => {
      room = null;
      stopGame();
      roomError = t('hostLeft');
      title();
    };
    r.onMessage = onRoomMessage;
  }

  async function createRoom() {
    show(h('div', { class: 'title' }, h('h2', null, t('connecting'))));
    Sound.unlock();
    try {
      useRoom(await Rooms.GameRoom.host('karuta', playerName.trim() || 'P1'));
      lobby();
    } catch (err) { roomFailed(err); }
  }

  async function joinRoom() {
    if (joinCode.length !== Rooms.CODE_LENGTH) { roomError = t('err_not-found'); title(); return; }
    show(h('div', { class: 'title' }, h('h2', null, t('connecting'))));
    Sound.unlock();
    try {
      useRoom(await Rooms.GameRoom.join('karuta', joinCode, playerName.trim() || 'P2'));
      lobby();
    } catch (err) { roomFailed(err); }
  }

  function lobby() {
    show(
      header(t('players'), title),
      h('div', { class: 'lobby' },
        room.isHost && h('p', null, t('shareCode')),
        h('div', { class: 'room-code', 'aria-label': t('roomCode') }, room.code),
        room.isHost && h('button', {
          class: 'chip',
          onclick: (e) => { if (navigator.clipboard) navigator.clipboard.writeText(room.code); e.target.textContent = t('copied'); },
        }, t('copyCode')),
        h('ul', { class: 'lobby-players' }, room.names().map((n, i) => h('li', { class: i === room.me ? 'you' : '' }, `${i === 0 ? '👑 ' : ''}${n}`))),
        room.isHost
          ? h('div', { class: 'row' }, KK.SCRIPTS.map((s, i) => h('button', { class: 'primary big', 'data-primary': i === 0 ? true : undefined, onclick: () => stageList(s) }, t(s))))
          : h('p', { class: 'waiting' }, t('waitHost'))));
    inLobby = true;
  }

  function onRoomMessage(msg, from) {
    if (msg.t === 'intro') intro(KK.stageById(msg.stage));
    else if (msg.t === 'start') beginAsGuest(msg);
    else if (msg.t === 'end') showResult(KK.stageById(msg.stage), msg.players, msg.tengu, msg.missed);
    else if (!game) return;
    else if (msg.t === 'card') showCard(msg);
    else if (msg.t === 'taken') showTaken(msg.p);
    else if (msg.t === 'timeup') showTimeUp();
    else if (msg.t === 'take') {
      if (game.phase === 'card' && msg.kana === game.card.kana) grant(from);
    } else if (msg.t === 'wrong') {
      game.players[from].wrong++;
      game.players[from].lock = Infinity;
      checkAllLocked();
    }
  }

  function stageList(script) {
    stopGame();
    const stages = KK.stages(script);
    const open = (i) => save.settings.unlockAll || i === 0 || save.stars[stages[i].id] > 0 || save.stars[stages[i - 1].id] > 0;
    show(header(t(script), room ? lobby : title),
      h('div', { class: 'stage-grid' }, stages.map((s, i) => h('button', {
        class: 'stage-tile', disabled: !open(i), onclick: () => intro(s),
      },
        h('small', null, `${t('stage')} ${i + 1}`),
        h('strong', null, !open(i) ? '🔒' : s.review ? t('reviewStage') : s.kana.slice(0, 3).map((k) => (script === 'kata' ? globalThis.Kana.toKatakana(k) : k)).join('')),
        starRow(save.stars[s.id] || 0)))));
  }

  function intro(stage) {
    stopGame();
    if (room && room.isHost) {
      room.setStarted(false);
      room.broadcast({ t: 'intro', stage: stage.id });
    }
    const toText = (k) => (stage.script === 'kata' ? globalThis.Kana.toKatakana(k) : k);
    show(header(`${t(stage.script)} ${stage.index + 1}`, isGuest() ? title : () => stageList(stage.script)),
      h('h3', { class: 'center' }, t('tilesHere')),
      h('div', { class: 'tiles preview' }, stage.kana.map((k) => h('button', { class: 'tile', onclick: () => Sound.speak(k) },
        h('b', null, toText(k)), h('span', null, globalThis.Kana.romajiVariants(k)[0])))),
      h('p', { class: 'center note' }, t(room ? 'howToDuo' : 'howTo')),
      h('div', { class: 'row' }, isGuest()
        ? h('p', { class: 'waiting' }, t('waitStart'))
        : h('button', { class: 'primary big', 'data-primary': true, onclick: () => startGame(stage) }, t('start'))));
  }

  function settings() {
    const s = save.settings;
    const set = (k, v) => { s[k] = v; persist(); applySound(); settings(); };
    const toggle = (k) => h('div', { class: 'setting' }, h('span', null, t(k)), h('button', { class: s[k] ? 'chip on' : 'chip', 'aria-pressed': String(!!s[k]), onclick: () => set(k, !s[k]) }, t(s[k] ? 'on' : 'off')));
    show(header(t('settings'), title),
      h('div', { class: 'settings' },
        h('div', { class: 'setting' }, h('span', null, t('language')), h('div', null, ['en', 'ja'].map((l) => h('button', { class: s.lang === l ? 'chip on' : 'chip', onclick: () => set('lang', l) }, l === 'en' ? 'English' : '日本語')))),
        toggle('voice'), toggle('sfx'), toggle('music'), toggle('unlockAll')));
  }

  // ---------- The match ----------

  function makeGame(stage, tiles, total) {
    const names = room ? room.names() : [playerName.trim() || 'P1'];
    game = {
      stage, tiles, total, left: total, deck: [], card: null, phase: 'waiting', timeLeft: 0, wait: 0, me: room ? room.me : 0,
      players: names.map((name, i) => ({ name, color: PLAYER_COLORS[i], buf: '', cards: 0, wrong: 0, lock: 0, gone: false })),
      tengu: 0, tenguCards: [],
    };
    if (save.settings.music) Sound.startMusic(0.15);
    drawTable();
    drawScores();
    drawTyped();
  }

  function startGame(stage) {
    Sound.unlock();
    const { tiles, deck } = KK.buildDeck(stage);
    if (room) {
      room.setStarted(false);
      room.setStarted(true);
      room.broadcast({ t: 'start', stage: stage.id, total: deck.length, tiles: tiles.map((x) => ({ kana: x.kana, text: x.text, cards: x.cards })) });
    }
    makeGame(stage, tiles, deck.length);
    game.deck = deck;
    nextCard();
  }

  function beginAsGuest(msg) {
    Sound.unlock();
    Sound.stopSpeech();
    const tiles = msg.tiles.map((x) => {
      const variants = globalThis.Kana.romajiVariants(x.kana);
      return { ...x, variants, primary: variants[0] };
    });
    makeGame(KK.stageById(msg.stage), tiles, msg.total);
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
      class: 'tile', 'aria-label': tile.text, onclick: () => answer(tile),
    }, h('b', null, tile.text))]));
    g.el.tiles.append(...KK.shuffle(g.tiles).map((tile) => g.tileEls.get(tile)));
    show(
      h('div', { class: 'match-top' },
        h('button', { class: 'plain', onclick: () => (room ? title() : stageList(g.stage.script)) }, '← ', t(room ? 'leaveRoom' : 'back')),
        h('span', null, `${t(g.stage.script)} ${g.stage.index + 1}`),
        g.el.scores),
      g.el.reader,
      h('div', { class: 'timebar' }, g.el.time),
      g.el.tiles,
      g.el.typed);
  }

  const wordWithFirst = (text) => {
    const chars = Array.from(text);
    return h('span', { class: 'word' }, h('em', null, chars[0]), chars.slice(1).join(''));
  };

  // While a card is up only the picture and its translation show; the word and romaji come with the answer.
  function drawReader(revealed, note) {
    const c = game.card;
    game.el.reader.replaceChildren(h('div', { class: 'read-card' + (revealed ? ' revealed' : '') },
      h('div', { class: 'picture' }, c.picture),
      h('div', { class: 'read-text' },
        h('p', { class: 'meaning' }, c.zh),
        revealed && wordWithFirst(c.text),
        revealed && h('p', { class: 'answer' }, `${c.tile.text} = ${c.tile.primary}`),
        note && h('p', { class: 'note-line' }, note))));
  }

  function drawScores() {
    const g = game;
    g.el.scores.replaceChildren(
      ...g.players.map((p) => h('span', { style: `color:${p.color}` }, `${p.name} `, h('b', null, String(p.cards)))),
      h('span', null, `👺 `, h('b', null, String(g.tengu))),
      h('span', { class: 'deck-left' }, `🂠 ${g.left}`));
  }

  function drawTyped() {
    const g = game;
    const p = g.players[g.me];
    g.el.typed.replaceChildren(h('div', { class: 'typed' + (p.lock > 0 ? ' locked' : ''), style: `--c:${p.color}` },
      h('small', null, p.name), h('b', null, p.buf || '\u00a0')));
  }

  function nextCard() {
    const g = game;
    if (!g.deck.length) return finish();
    const card = g.deck.pop();
    if (room) room.broadcast({ t: 'card', text: card.text, speak: card.speak, picture: card.picture, zh: card.zh, kana: card.kana });
    return showCard(card);
  }

  function showCard(card) {
    const g = game;
    g.card = { ...card, tile: g.tiles.find((x) => x.kana === card.kana) };
    g.left--;
    g.phase = 'card';
    g.timeLeft = g.stage.seconds;
    for (const p of g.players) { p.buf = ''; p.lock = 0; }
    drawReader(false);
    drawScores();
    drawTyped();
    Sound.speak(g.card.speak);
  }

  function takeCard(tile) {
    const g = game;
    tile.cards--;
    if (tile.cards <= 0) g.tileEls.get(tile).classList.add('gone');
  }

  // The local player's answer, from a key or a click.
  function answer(tile) {
    const g = game;
    const p = g && g.players[g.me];
    if (!g || g.phase !== 'card' || p.lock > 0 || tile.cards <= 0) return;
    p.buf = '';
    if (tile === g.card.tile) {
      if (isGuest()) room.send({ t: 'take', kana: tile.kana });
      else grant(g.me);
    } else {
      p.wrong++;
      p.lock = room ? Infinity : WRONG_LOCK;
      Sound.play('miss');
      const el = g.tileEls.get(tile);
      el.classList.remove('wrong');
      void el.offsetWidth;
      el.classList.add('wrong');
      flashNote(t('wrongTile'));
      if (isGuest()) room.send({ t: 'wrong' });
      else checkAllLocked();
    }
    drawTyped();
  }

  // Only the host calls this: whoever's answer reached it first has the card.
  function grant(index) {
    const g = game;
    g.phase = 'reveal';
    g.wait = 1.1;
    if (room) room.broadcast({ t: 'taken', p: index });
    showTaken(index);
  }

  function showTaken(index) {
    const g = game;
    const p = g.players[index];
    const tile = g.card.tile;
    p.cards++;
    g.phase = 'reveal';
    takeCard(tile);
    Sound.play('coin');
    Sound.speak(tile.kana);
    const el = g.tileEls.get(tile);
    el.style.setProperty('--c', p.color);
    el.classList.add('taken');
    setTimeout(() => el.classList.remove('taken'), 500);
    drawReader(true, room ? `${p.name} +1` : null);
    drawScores();
    for (const x of g.players) x.buf = '';
    drawTyped();
  }

  // Nobody left who can answer, so do not make everyone wait out the clock.
  function checkAllLocked() {
    const g = game;
    if (g && room && room.isHost && g.phase === 'card' && g.players.every((x) => x.gone || x.lock > 0)) g.timeLeft = Math.min(g.timeLeft, 0.6);
  }

  function flashNote(text) {
    const n = h('div', { class: 'flash-note' }, text);
    n.addEventListener('animationend', () => n.remove());
    document.body.append(n);
  }

  function timeUp() {
    const g = game;
    g.wait = 2;
    if (room) room.broadcast({ t: 'timeup' });
    showTimeUp();
  }

  function showTimeUp() {
    const g = game;
    g.tengu++;
    g.tenguCards.push(g.card);
    takeCard(g.card.tile);
    g.phase = 'reveal';
    Sound.play('gate');
    Sound.speak(g.card.speak);
    drawReader(true, `👺 ${t('tengu')} +1`);
    drawScores();
    for (const p of g.players) p.buf = '';
    drawTyped();
  }

  function finish() {
    const g = game;
    const players = g.players.map((p) => ({ name: p.name, color: p.color, cards: p.cards, wrong: p.wrong }));
    const missed = g.tenguCards.map((c) => ({ picture: c.picture, text: c.text, speak: c.speak, zh: c.zh, primary: c.tile.primary }));
    if (room) {
      room.setStarted(false);
      room.broadcast({ t: 'end', stage: g.stage.id, players, tengu: g.tengu, missed });
    }
    showResult(g.stage, players, g.tengu, missed);
  }

  function showResult(stage, players, tengu, missed) {
    const best = players.reduce((a, b) => (b.cards > a.cards ? b : a));
    const taken = players.reduce((a, p) => a + p.cards, 0);
    const stars = KK.starsFor(taken, taken + tengu);
    const won = stars > 0;
    if (won) { save.stars[stage.id] = Math.max(save.stars[stage.id] || 0, stars); persist(); }
    Sound.stopMusic();
    Sound.play(won ? 'win' : 'lose');
    const next = KK.stages(stage.script)[stage.index + 1];
    const tie = players.filter((p) => p.cards === best.cards).length > 1;
    game = null;
    show(h('div', { class: 'result ' + (won ? 'win' : 'lose') },
      h('h2', null, won ? (players.length > 1 && !tie ? `${best.name} ${t('winner')}` : t('win')) : t('lose')),
      won && h('div', { class: 'big-stars' }, starRow(stars)),
      h('table', { class: 'score' },
        h('thead', null, h('tr', null, h('th', null), h('th', null, t('cards')), h('th', null, t('wrong')))),
        h('tbody', null,
          players.map((p) => h('tr', null, h('td', { style: `color:${p.color}` }, p.name), h('td', null, String(p.cards)), h('td', null, String(p.wrong)))),
          h('tr', null, h('td', null, `👺 ${t('tengu')}`), h('td', null, String(tengu)), h('td', null, '-')))),
      missed.length > 0 && h('div', null,
        h('h3', { class: 'center' }, t('reviewCards')),
        h('div', { class: 'missed' }, missed.map((c) => h('button', { class: 'missed-card', onclick: () => Sound.speak(c.speak) },
          h('span', null, c.picture), wordWithFirst(c.text), h('small', null, `${c.primary} · ${c.zh}`))))),
      isGuest()
        ? h('div', { class: 'row' }, h('p', { class: 'waiting' }, t('waitHost')), h('button', { onclick: title }, t('leaveRoom')))
        : h('div', { class: 'row' },
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
    if (done) answer(done);
    else drawTyped();
  }

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (game && game.phase === 'card') {
      const c = letterFrom(e);
      if (c && !e.repeat) {
        e.preventDefault();
        typeLetter(game.players[game.me], c);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        const p = game.players[game.me];
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
      if (g.timeLeft <= 0 && !isGuest()) timeUp();
    } else if (g.phase === 'reveal' && !isGuest()) {
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

  // Hidden tabs get no animation frames. A host must keep the round going for everyone else.
  let lastBackgroundTick = performance.now();
  setInterval(() => {
    const now = performance.now();
    if (document.hidden && room && room.isHost) update(Math.min(1.5, (now - lastBackgroundTick) / 1000));
    lastBackgroundTick = now;
  }, 200);

  applySound();
  title();
  KK.app = {
    update, save, startGame, createRoom, joinRoom,
    get game() { return game; },
    get room() { return room; },
    setJoin: (code, name) => { joinCode = code; playerName = name; },
  };
})();
