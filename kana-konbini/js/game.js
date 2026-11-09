// Kana Konbini: a customer asks for something, find it on the shelf, then pick its real spelling.
// In a room every player serves the same customers on their own screen, and the host keeps the scoreboard.
(function () {
  const KB = globalThis.KB;
  const Sound = globalThis.GameAudio;
  const Rooms = globalThis.Rooms;
  const romaji = (text) => globalThis.Kana.romajiVariants(text)[0];
  const SAVE_KEY = 'kana-konbini-save-v1';
  const PLAYER_COLORS = ['#e0452f', '#1f7ab8', '#b07a00', '#2f8a4a'];

  const STR = {
    tagline: { en: 'Customers ask in Japanese. Find the item, then pick its real spelling.', ja: 'お客さんの注文を聞いて、商品を探し、正しい文字を選ぼう。' },
    solo: { en: 'Play solo', ja: 'ひとりで遊ぶ' }, multi: { en: 'Play with friends (up to 4, each on their own computer)', ja: '友達と遊ぶ(最大4人、それぞれのパソコンで)' },
    start: { en: 'Open the shop', ja: '開店する' }, settings: { en: 'Settings', ja: '設定' }, back: { en: 'Back', ja: '戻る' }, allGames: { en: 'All games', ja: 'ゲーム一覧' },
    createRoom: { en: 'Create a room', ja: 'ルームを作る' }, join: { en: 'Join', ja: '入る' }, name: { en: 'Your name', ja: '名前' }, roomCode: { en: 'Room code', ja: 'ルームコード' },
    connecting: { en: 'Connecting…', ja: '接続中…' }, shareCode: { en: 'Send this code to your friends:', ja: 'このコードを友達に送ってください:' }, copyCode: { en: 'Copy', ja: 'コピー' }, copied: { en: 'Copied!', ja: 'コピーしました' },
    players: { en: 'Players', ja: 'プレイヤー' }, leaveRoom: { en: 'Leave room', ja: 'ルームを出る' },
    pickDay: { en: 'Choose a day', ja: '日を選ぶ' }, waitHost: { en: 'Waiting for the host to choose a day…', ja: 'ホストが日を選ぶのを待っています…' },
    waitStart: { en: 'Waiting for the host to open the shop…', ja: 'ホストの開店を待っています…' }, waitOthers: { en: 'Your shift is over. Waiting for the others…', ja: 'シフト終了。ほかの人を待っています…' },
    err_network: { en: 'Could not reach the connection service. Check your internet and try again.', ja: '接続サービスにつながりません。インターネットを確認してもう一度試してください。' },
    'err_not-found': { en: 'No room with that code. Check the code with your friend.', ja: 'そのコードのルームはありません。友達にコードを確認してください。' },
    err_timeout: { en: 'Could not connect to that room. A school or office network may be blocking it.', ja: 'ルームに接続できませんでした。学校や会社のネットワークが遮断している可能性があります。' },
    err_full: { en: 'That room is full.', ja: 'そのルームは満員です。' },
    err_started: { en: 'That room is in the middle of a shift. Try again when it ends.', ja: 'そのルームは営業中です。シフトが終わってからもう一度試してください。' },
    hostLeft: { en: 'The host left, so the room has closed.', ja: 'ホストが抜けたため、ルームが閉じました。' },
    day: { en: 'Day', ja: '' }, dayUnit: { en: '', ja: '日目' },
    s_hira: { en: 'Hiragana', ja: 'ひらがな' }, s_kata: { en: 'Katakana', ja: 'カタカナ' }, s_mix: { en: 'Mixed', ja: 'ミックス' },
    newItems: { en: 'New on the shelves today', ja: '今日から並ぶ商品' }, allItems: { en: 'On the shelves today', ja: '今日の商品' },
    howTo: { en: 'Find the item the customer wants, then choose its correct spelling. Only pictures are on the shelves. After 20 seconds the answer starts to glow, but then it scores nothing. Click a card to hear it.', ja: 'お客さんが欲しい商品を探し、正しい文字を選ぼう。棚には絵しかない。20秒たつと答えが光るが、そのときはポイントにならない。カードをクリックで音声。' },
    points: { en: 'pts', ja: 'ポイント' }, customer: { en: 'Customer', ja: 'お客さん' },
    listen: { en: 'Hear the order again (Space)', ja: 'もう一度聞く(スペース)' },
    notThat: { en: 'Not that one…', ja: 'それじゃないよ…' }, whichSpelling: { en: 'Which one is it?', ja: '正しい字はどれ?' },
    thanks: { en: 'Thank you!', ja: 'ありがとう!' }, leftShop: { en: 'Got tired of waiting and left…', ja: '待ちくたびれて帰ってしまった…' },
    shiftOver: { en: 'Shift over!', ja: 'シフト終了!' }, review: { en: 'Look again:', ja: 'もう一度見よう:' },
    rank: { en: 'Ranking', ja: 'ランキング' }, again: { en: 'Same day again', ja: 'もう一度' }, next: { en: 'Next day (Enter)', ja: '次の日へ (Enter)' }, list: { en: 'Choose a day', ja: '日を選ぶ' },
    language: { en: 'Language', ja: '言語' }, voice: { en: 'Japanese voice', ja: '日本語音声' }, sfx: { en: 'Sound effects', ja: '効果音' },
    unlockAll: { en: 'Unlock all days (preview)', ja: '全日程を解放(お試し用)' }, on: { en: 'On', ja: 'オン' }, off: { en: 'Off', ja: 'オフ' },
  };

  const save = (() => {
    const base = { settings: { lang: (navigator.language || 'en').startsWith('ja') ? 'ja' : 'en', voice: true, sfx: true, unlockAll: false }, stars: {} };
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (raw) return { ...base, ...raw, settings: { ...base.settings, ...raw.settings } };
    } catch (e) { /* private window or corrupt save: start fresh */ }
    return base;
  })();
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* lasts this session only */ } };
  const t = (k) => STR[k][save.settings.lang];
  const dayName = (day) => `${t('day')} ${day.index + 1}${t('dayUnit')}`.trim();

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
  let inLobby = false;
  const show = (...content) => { inLobby = false; root.replaceChildren(...content.flat().filter(Boolean)); window.scrollTo(0, 0); };
  const starRow = (n) => h('span', { class: 'stars' }, '★'.repeat(n), h('i', null, '★'.repeat(3 - n)));
  const header = (title, back) => h('header', { class: 'bar' }, h('button', { class: 'plain', onclick: back }, '← ', t('back')), h('h2', null, title));

  function applySettings() {
    Object.assign(Sound.settings, { sfx: save.settings.sfx, voice: save.settings.voice, music: false });
    document.documentElement.lang = save.settings.lang;
  }

  // ---------- Rooms ----------

  let room = null;
  let playerName = 'P1';
  let joinCode = '';
  let roomError = '';
  let shift = null;
  let board = null; // [{ name, served, points, done, gone }] while in a room
  const isGuest = () => !!room && !room.isHost;

  function leaveRoom() {
    inLobby = false;
    if (room) room.leave();
    room = null;
    board = null;
  }

  function roomFailed(err) {
    room = null;
    roomError = STR['err_' + err.message] ? t('err_' + err.message) : t('err_network');
    title();
  }

  function useRoom(r) {
    room = r;
    r.onPlayers = () => { if (inLobby) lobby(); };
    r.onPlayerLeft = (i) => {
      if (!board || !board[i]) return;
      board[i].gone = true;
      publishBoard();
    };
    r.onClosed = () => {
      room = null;
      shift = null;
      roomError = t('hostLeft');
      title();
    };
    r.onMessage = onRoomMessage;
  }

  async function connect(make) {
    show(h('div', { class: 'title' }, h('h2', null, t('connecting'))));
    Sound.unlock();
    try {
      useRoom(await make());
      lobby();
    } catch (err) { roomFailed(err); }
  }
  const createRoom = () => connect(() => Rooms.GameRoom.host('konbini', playerName.trim() || 'P1'));
  function joinRoom() {
    if (joinCode.length !== Rooms.CODE_LENGTH) { roomError = t('err_not-found'); title(); return Promise.resolve(); }
    return connect(() => Rooms.GameRoom.join('konbini', joinCode, playerName.trim() || 'P2'));
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
          ? h('button', { class: 'primary big', 'data-primary': true, onclick: dayList }, t('pickDay'))
          : h('p', { class: 'waiting' }, t('waitHost'))));
    inLobby = true;
  }

  function onRoomMessage(msg, from) {
    if (msg.t === 'intro') intro(KB.dayById(msg.day));
    else if (msg.t === 'start') beginShift(msg.shift);
    else if (msg.t === 'board') { board = msg.board; drawBoard(); }
    else if (msg.t === 'end') { board = msg.board; showResult(); }
    else if (room.isHost && board && board[from] && (msg.t === 'progress' || msg.t === 'done')) {
      Object.assign(board[from], { served: msg.served, points: msg.points, done: msg.t === 'done' });
      publishBoard();
    }
  }

  // The host shares the scoreboard, and ends the shift for everyone once all who are still here are done.
  function publishBoard() {
    if (!room || !room.isHost || !board) return;
    if (board.every((p) => p.done || p.gone)) {
      room.setStarted(false);
      room.broadcast({ t: 'end', board });
      if (shift && shift.finished) showResult();
      return;
    }
    room.broadcast({ t: 'board', board });
    drawBoard();
  }

  function reportProgress() {
    if (!room || !shift) return;
    const mine = { served: shift.index, points: shift.points, done: shift.finished };
    if (room.isHost) {
      Object.assign(board[room.me], mine);
      publishBoard();
    } else {
      room.send({ t: shift.finished ? 'done' : 'progress', ...mine });
    }
  }

  // ---------- Menus ----------

  function title() {
    leaveRoom();
    shift = null;
    show(h('div', { class: 'title' },
      h('div', { class: 'sign' }, h('span', null, '🏪'), h('b', null, 'カナコンビニ')),
      h('p', { class: 'en' }, 'KANA KONBINI'),
      h('p', null, t('tagline')),
      h('h3', null, t('solo')),
      h('div', { class: 'row' }, h('button', { class: 'primary big', 'data-primary': true, onclick: () => { Sound.unlock(); dayList(); } }, t('start'))),
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
        ['en', 'ja'].map((l) => h('button', { class: save.settings.lang === l ? 'plain on' : 'plain', onclick: () => { save.settings.lang = l; persist(); applySettings(); title(); } }, l === 'en' ? 'English' : '日本語')),
        h('a', { class: 'plain', href: '../index.html' }, t('allGames')))));
    roomError = '';
  }

  function dayList() {
    shift = null;
    const days = KB.days();
    const open = (i) => save.settings.unlockAll || i === 0 || (save.stars[days[i].id] || 0) > 0 || (save.stars[days[i - 1].id] || 0) > 0;
    show(header(t('pickDay'), room ? lobby : title),
      h('div', { class: 'day-grid' }, days.map((d, i) => h('button', { class: 'day-tile', disabled: !open(i), onclick: () => intro(d) },
        h('strong', null, dayName(d)),
        h('span', { class: 'day-pics' }, open(i) ? d.newItems.slice(0, 4).map((p) => p.picture).join('') : '🔒'),
        h('small', null, `${t('s_' + d.script)} · 🧍×${d.customers}`),
        starRow(save.stars[d.id] || 0)))));
  }

  function itemCard(p) {
    return h('button', { class: 'item-card', onclick: () => Sound.speak(p.text) },
      h('span', { class: 'pic' }, p.picture), h('b', null, p.text), h('span', { class: 'romaji' }, romaji(p.text)), h('small', null, p.zh));
  }

  function intro(day) {
    shift = null;
    if (room && room.isHost) {
      room.setStarted(false);
      room.broadcast({ t: 'intro', day: day.id });
    }
    const fresh = day.newItems.length > 0;
    show(header(dayName(day), isGuest() ? title : dayList),
      h('h3', { class: 'center' }, t(fresh ? 'newItems' : 'allItems')),
      h('div', { class: 'item-cards' }, (fresh ? day.newItems : day.pool).map(itemCard)),
      h('p', { class: 'note center' }, t('howTo')),
      h('div', { class: 'row' }, isGuest()
        ? h('p', { class: 'waiting' }, t('waitStart'))
        : h('button', { class: 'primary big', 'data-primary': true, onclick: () => openShop(day) }, t('start'))));
  }

  function settings() {
    const s = save.settings;
    const set = (k, v) => { s[k] = v; persist(); applySettings(); settings(); };
    const toggle = (k) => h('div', { class: 'setting' }, h('span', null, t(k)), h('button', { class: s[k] ? 'chip on' : 'chip', 'aria-pressed': String(!!s[k]), onclick: () => set(k, !s[k]) }, t(s[k] ? 'on' : 'off')));
    show(header(t('settings'), title),
      h('div', { class: 'settings' },
        h('div', { class: 'setting' }, h('span', null, t('language')), h('div', null, ['en', 'ja'].map((l) => h('button', { class: s.lang === l ? 'chip on' : 'chip', onclick: () => set('lang', l) }, l === 'en' ? 'English' : '日本語')))),
        toggle('voice'), toggle('sfx'), toggle('unlockAll')));
  }

  // ---------- The shift ----------

  function openShop(day) {
    Sound.unlock();
    const data = KB.makeShift(day);
    if (room) {
      room.setStarted(false);
      room.setStarted(true);
      board = room.names().map((name) => ({ name, served: 0, points: 0, done: false, gone: false }));
      room.broadcast({ t: 'start', shift: data });
      room.broadcast({ t: 'board', board });
    }
    beginShift(data);
  }

  function beginShift(data) {
    Sound.unlock();
    Sound.stopSpeech();
    const day = KB.dayById(data.day);
    shift = {
      day, data, index: 0, points: 0, max: data.customers.length * 2, finished: false,
      results: [], phase: 'next', wait: 0.4, el: {},
    };
    if (room && !board) board = room.names().map((name) => ({ name, served: 0, points: 0, done: false, gone: false }));
    drawStore();
  }

  function drawStore() {
    const s = shift;
    s.el = {
      customer: h('div', { class: 'customer' }),
      patience: h('i'),
      queue: h('div', { class: 'queue' }),
      shelf: h('div', { class: 'shelf' }),
      choices: h('div', { class: 'choices' }),
      score: h('span', { class: 'score' }),
      board: h('div', { class: 'board' }),
    };
    s.productEls = new Map(s.data.shelf.map((id, n) => {
      const p = KB.PRODUCTS[id];
      return [id, h('button', { class: 'product', 'aria-label': `${n + 1}`, onclick: () => pickProduct(id) },
        h('span', null, p.picture), h('small', { class: 'price' }, `¥${(80 + ((id * 37) % 9) * 30)}`))];
    }));
    s.el.shelf.append(...s.productEls.values());
    show(
      h('div', { class: 'store-top' },
        h('button', { class: 'plain', onclick: () => (room ? title() : dayList()) }, '← ', t(room ? 'leaveRoom' : 'back')),
        h('b', null, dayName(s.day)),
        s.el.score,
        s.el.board),
      h('div', { class: 'counter' }, s.el.customer, h('div', { class: 'patience' }, s.el.patience), s.el.queue),
      s.el.choices,
      s.el.shelf);
    drawScore();
    drawBoard();
  }

  function drawScore() {
    const s = shift;
    s.el.score.textContent = `${t('customer')} ${Math.min(s.index + 1, s.data.customers.length)}/${s.data.customers.length} · ⭐ ${s.points} ${t('points')}`;
  }

  function drawBoard() {
    if (!shift || !shift.el.board || !board) return;
    shift.el.board.replaceChildren(...board.map((p, i) => h('span', { class: p.gone ? 'gone' : '', style: `color:${PLAYER_COLORS[i]}` },
      `${p.name} ⭐${p.points}${p.done ? ' ✓' : ` (${p.served})`}`)));
  }

  const current = () => shift.data.customers[shift.index];

  function nextCustomer() {
    const s = shift;
    if (s.index >= s.data.customers.length) return endShift();
    const c = current();
    Object.assign(s, { phase: 'find', time: 0, spellTime: 0, findPoint: true, spellPoint: true, wrong: new Set() });
    for (const el of s.productEls.values()) el.classList.remove('glow', 'nope');
    s.el.customer.replaceChildren(
      h('div', { class: 'face' }, c.face),
      h('div', { class: 'bubble' }, h('b', null, KB.phrase(c))),
      h('button', { class: 'listen', 'aria-label': t('listen'), title: t('listen'), onclick: () => Sound.speak(KB.phrase(current())) }, '🔊'));
    s.el.queue.replaceChildren(...s.data.customers.slice(s.index + 1, s.index + 5).map((x) => h('span', null, x.face)));
    s.el.choices.replaceChildren();
    s.el.choices.className = 'choices';
    drawScore();
    Sound.speak(KB.phrase(c));
    return undefined;
  }

  function say(text, cls) {
    const bubble = shift.el.customer.querySelector('.bubble');
    bubble.replaceChildren(h('b', null, text));
    bubble.className = 'bubble ' + (cls || '');
  }

  function pickProduct(id) {
    const s = shift;
    if (!s || s.phase !== 'find') return;
    const c = current();
    const el = s.productEls.get(id);
    if (id !== c.item) {
      s.findPoint = false;
      Sound.play('miss');
      el.classList.remove('nope');
      void el.offsetWidth;
      el.classList.add('nope');
      say(t('notThat'), 'sad');
      setTimeout(() => { if (s.phase === 'find' && current() === c) say(KB.phrase(c)); }, 900);
      return;
    }
    if (s.findPoint) s.points++;
    Sound.play('key');
    el.classList.add('picked');
    setTimeout(() => el.classList.remove('picked'), 400);
    s.phase = 'spell';
    s.spellTime = 0;
    say(t('whichSpelling'));
    s.el.choices.className = 'choices open';
    s.el.choices.replaceChildren(
      h('div', { class: 'held' }, KB.PRODUCTS[c.item].picture),
      ...c.options.map((text, n) => h('button', { class: 'choice', 'data-text': text, onclick: () => pickSpelling(text) },
        h('small', null, String(n + 1)), text)));
    drawScore();
  }

  function pickSpelling(text) {
    const s = shift;
    if (!s || s.phase !== 'spell') return;
    const c = current();
    const answer = KB.PRODUCTS[c.item].text;
    const el = s.el.choices.querySelector(`[data-text="${text}"]`);
    if (text !== answer) {
      s.spellPoint = false;
      Sound.play('miss');
      el.disabled = true;
      el.classList.add('wrong');
      return;
    }
    if (s.spellPoint) s.points++;
    el.classList.add('right');
    finishCustomer(true);
  }

  function finishCustomer(served) {
    const s = shift;
    const c = current();
    const p = KB.PRODUCTS[c.item];
    const got = served ? Number(s.findPoint) + Number(s.spellPoint) : Number(s.phase === 'spell' && s.findPoint);
    s.results.push({ item: c.item, got });
    s.phase = 'next';
    s.wait = served ? 1.6 : 2.2;
    Sound.play(served ? 'coin' : 'gate');
    Sound.speak(p.text);
    say(served ? t('thanks') : t('leftShop'), served ? 'happy' : 'sad');
    s.el.choices.className = 'choices open reveal';
    s.el.choices.replaceChildren(
      h('div', { class: 'held' }, p.picture),
      h('div', { class: 'answer' }, h('b', null, p.text), h('span', null, `${romaji(p.text)} · ${p.zh}`)),
      h('div', { class: 'gain' }, served ? `+${got}` : '0'));
    s.index++;
    drawScore();
    reportProgress();
  }

  function endShift() {
    const s = shift;
    s.finished = true;
    s.phase = 'done';
    const stars = KB.starsFor(s.points, s.max);
    if (stars) { save.stars[s.day.id] = Math.max(save.stars[s.day.id] || 0, stars); persist(); }
    Sound.play(stars ? 'win' : 'lose');
    if (room) {
      reportProgress();
      if (!(room.isHost && board.every((p) => p.done || p.gone))) {
        show(h('div', { class: 'result' }, h('h2', null, t('waitOthers')), h('p', { class: 'center big-points' }, `⭐ ${s.points} / ${s.max}`), boardTable()));
      }
      return;
    }
    showResult();
  }

  function boardTable() {
    if (!board) return null;
    const ranked = board.map((p, i) => ({ ...p, color: PLAYER_COLORS[i] })).sort((a, b) => b.points - a.points);
    return h('table', { class: 'score-table' },
      h('caption', null, t('rank')),
      h('tbody', null, ranked.map((p, n) => h('tr', { class: p.gone ? 'gone' : '' },
        h('td', null, n === 0 && p.points > 0 ? '👑' : String(n + 1)),
        h('td', { style: `color:${p.color}` }, p.name),
        h('td', null, `⭐ ${p.points}`)))));
  }

  function showResult() {
    const s = shift;
    if (!s || !s.finished) return; // still serving; the ranking shows when this player is done
    const stars = KB.starsFor(s.points, s.max);
    const next = KB.days()[s.day.index + 1];
    const missed = s.results.filter((r) => r.got < 2).map((r) => KB.PRODUCTS[r.item]);
    const day = s.day;
    show(h('div', { class: 'result' },
      h('h2', null, t('shiftOver')),
      h('div', { class: 'big-stars' }, starRow(stars)),
      h('p', { class: 'center big-points' }, `⭐ ${s.points} / ${s.max}`),
      boardTable(),
      missed.length > 0 && h('div', null,
        h('h3', { class: 'center' }, t('review')),
        h('div', { class: 'item-cards small' }, [...new Set(missed)].map(itemCard))),
      isGuest()
        ? h('div', { class: 'row' }, h('p', { class: 'waiting' }, t('waitHost')), h('button', { onclick: title }, t('leaveRoom')))
        : h('div', { class: 'row' },
          stars > 0 && next && h('button', { class: 'primary big', 'data-primary': true, onclick: () => intro(next) }, t('next')),
          h('button', { class: stars > 0 && next ? '' : 'primary big', 'data-primary': stars > 0 && next ? undefined : true, onclick: () => openShop(day) }, t('again')),
          h('button', { onclick: dayList }, t('list')))));
  }

  // ---------- Timers and keys ----------

  function update(dt) {
    const s = shift;
    if (!s || s.finished) return;
    if (s.phase === 'next') {
      s.wait -= dt;
      if (s.wait <= 0) nextCustomer();
      return;
    }
    s.time += dt;
    s.el.patience.style.width = `${Math.max(0, 1 - s.time / KB.PATIENCE_SECONDS) * 100}%`;
    if (s.phase === 'find' && s.time >= KB.FIND_HINT_SECONDS) {
      if (s.findPoint) s.findPoint = false;
      s.productEls.get(current().item).classList.add('glow');
    }
    if (s.phase === 'spell') {
      s.spellTime += dt;
      if (s.spellTime >= KB.SPELL_HINT_SECONDS) {
        s.spellPoint = false;
        const right = s.el.choices.querySelector(`[data-text="${KB.PRODUCTS[current().item].text}"]`);
        if (right) right.classList.add('glow');
      }
    }
    if (s.time >= KB.PATIENCE_SECONDS) finishCustomer(false);
  }

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (shift && (shift.phase === 'find' || shift.phase === 'spell') && e.key === ' ') {
      e.preventDefault();
      Sound.speak(KB.phrase(current()));
      return;
    }
    if (shift && shift.phase === 'spell' && /^[1-3]$/.test(e.key)) {
      e.preventDefault();
      pickSpelling(current().options[Number(e.key) - 1]);
      return;
    }
    if ((!shift || shift.finished) && e.key === 'Enter' && !e.repeat) {
      const primary = root.querySelector('[data-primary]');
      if (primary) { e.preventDefault(); primary.click(); }
    }
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!document.hidden) update(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  applySettings();
  title();
  KB.app = {
    update, save, openShop, createRoom, joinRoom, pickProduct, pickSpelling,
    get shift() { return shift; },
    get room() { return room; },
    get board() { return board; },
    setJoin: (code, name) => { joinCode = code; playerName = name; },
  };
})();
