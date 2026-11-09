// Products, days and the look-alike spellings for Kana Konbini. No DOM here, so it can be tested in Node.
(function () {
  const KB = (globalThis.KB = globalThis.KB || {});

  // word picture Traditional-Chinese level. Every picture is unique, because the shelf shows nothing else.
  const PRODUCTS = `
    おにぎり 🍙 飯糰 1|おちゃ 🍵 茶 1|たまご 🥚 雞蛋 1|すし 🍣 壽司 1|りんご 🍎 蘋果 1|みかん 🍊 橘子 1|あめ 🍬 糖果 1|だんご 🍡 糰子 1|いちご 🍓 草莓 1
    おべんとう 🍱 便當 2|ぎゅうにゅう 🥛 牛奶 2|からあげ 🍗 炸雞 2|おでん 🍢 關東煮 2|せんべい 🍘 仙貝 2|ぎょうざ 🥟 煎餃 2|かさ ☂️ 雨傘 2|くすり 💊 藥 2|はさみ ✂️ 剪刀 2|ぶどう 🍇 葡萄 2|もも 🍑 桃子 2|すいか 🍉 西瓜 2
    しんぶん 📰 報紙 3|ざっし 📖 雜誌 3|でんち 🔋 電池 3|せっけん 🧼 肥皂 3|ばんそうこう 🩹 OK繃 3|はちみつ 🍯 蜂蜜 3|しお 🧂 鹽 3|こおり 🧊 冰塊 3|さけ 🍶 日本酒 3
    パン 🍞 麵包 1|コーヒー ☕ 咖啡 1|ジュース 🧃 果汁 1|コーラ 🥤 可樂 1|アイス 🍦 冰淇淋 1|チョコ 🍫 巧克力 1|ケーキ 🍰 蛋糕 1|バナナ 🍌 香蕉 1|ピザ 🍕 披薩 1
    サンドイッチ 🥪 三明治 2|プリン 🍮 布丁 2|ドーナツ 🍩 甜甜圈 2|クッキー 🍪 餅乾 2|ラーメン 🍜 拉麵 2|カレー 🍛 咖哩 2|ハンバーガー 🍔 漢堡 2|ホットドッグ 🌭 熱狗 2|ポテト 🍟 薯條 2|チーズ 🧀 起司 2|レモン 🍋 檸檬 2|メロン 🍈 哈密瓜 2
    ティッシュ 🧻 面紙 3|マスク 😷 口罩 3|ペン 🖊️ 筆 3|ノート 📓 筆記本 3|ビール 🍺 啤酒 3|ワイン 🍷 葡萄酒 3|クロワッサン 🥐 可頌 3|パンケーキ 🥞 鬆餅 3|ポップコーン 🍿 爆米花 3|ベーグル 🥯 貝果 3|トマト 🍅 番茄 3
  `.trim().split(/[|\n]/).map((entry, id) => {
    const [text, picture, zh, level] = entry.trim().split(' ');
    return { id, text, picture, zh, level: Number(level), script: /[ァ-ヺ]/.test(text) ? 'kata' : 'hira' };
  });
  KB.PRODUCTS = PRODUCTS;

  const DAYS = [
    { script: 'hira', level: 1, shelf: 9, customers: 6, tricks: 1 },
    { script: 'kata', level: 1, shelf: 9, customers: 6, tricks: 1 },
    { script: 'mix', level: 1, shelf: 14, customers: 8, tricks: 1 },
    { script: 'hira', level: 2, shelf: 16, customers: 8, tricks: 2 },
    { script: 'kata', level: 2, shelf: 16, customers: 8, tricks: 2 },
    { script: 'mix', level: 2, shelf: 20, customers: 10, tricks: 2 },
    { script: 'mix', level: 3, shelf: 24, customers: 10, tricks: 3 },
    { script: 'mix', level: 3, shelf: 32, customers: 12, tricks: 3 },
  ];
  KB.days = () => DAYS.map((d, i) => {
    const pool = PRODUCTS.filter((p) => p.level <= d.level && (d.script === 'mix' || p.script === d.script));
    const earlier = new Set(DAYS.slice(0, i).flatMap((e) => PRODUCTS.filter((p) => p.level <= e.level && (e.script === 'mix' || p.script === e.script)).map((p) => p.id)));
    return { ...d, id: `day-${i + 1}`, index: i, pool, newItems: pool.filter((p) => !earlier.has(p.id)) };
  });
  KB.dayById = (id) => KB.days().find((d) => d.id === id);

  // ---------- Look-alike spellings ----------

  const LOOKALIKES = [
    'あおめ', 'いりこ', 'うらつ', 'きさち', 'ぬめね', 'われね', 'はほけ', 'るろ', 'たな', 'まも', 'にこた', 'ゆよ', 'しつ', 'くへ', 'そて', 'ぎざ',
    'ソンリ', 'シツミ', 'クケタワウ', 'コユロ', 'チテ', 'ナメノ', 'スヌフ', 'アマヤ', 'ルレ', 'ヒセ', 'ラフヲ', 'ドジ', 'ポボ',
  ];
  const near = new Map();
  for (const group of LOOKALIKES) {
    for (const c of group) {
      const others = Array.from(group).filter((x) => x !== c);
      near.set(c, [...new Set([...(near.get(c) || []), ...others])]);
    }
  }
  const VOICEABLE = 'かきくけこさしすせそたちつてとはひふへほ';
  const HA_ROW = 'はひふへほ';
  function voicings(c) {
    const hira = c.charCodeAt(0) >= 0x30a1 ? String.fromCharCode(c.charCodeAt(0) - 0x60) : c;
    const back = (s) => (hira === c ? s : String.fromCharCode(s.charCodeAt(0) + 0x60));
    const code = hira.charCodeAt(0);
    const at = (d) => back(String.fromCharCode(code + d));
    if (VOICEABLE.includes(hira)) return HA_ROW.includes(hira) ? [at(1), at(2)] : [at(1)];
    const base = String.fromCharCode(code - 1);
    if (VOICEABLE.includes(base)) return HA_ROW.includes(base) ? [at(-1), at(1)] : [at(-1)];
    if (HA_ROW.includes(String.fromCharCode(code - 2))) return [at(-2), at(-1)];
    return [];
  }
  const SMALL = { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ', ャ: 'ヤ', ュ: 'ユ', ョ: 'ヨ', ッ: 'ツ', ィ: 'イ', ェ: 'エ', ァ: 'ア' };
  const toggleSmall = (c) => SMALL[c] || Object.keys(SMALL).find((k) => SMALL[k] === c);
  const isMark = (c) => c === 'ー' || !!SMALL[c];

  // Every single-step change of a word, grouped by kind. Higher `tricks` levels allow the sneakier kinds.
  function changes(word) {
    const chars = Array.from(word);
    const at = (i, c) => chars.map((x, j) => (j === i ? c : x)).join('');
    const out = { look: [], voice: [], small: [], order: [] };
    chars.forEach((c, i) => {
      for (const n of near.get(c) || []) out.look.push(at(i, n));
      for (const v of voicings(c)) out.voice.push(at(i, v));
      const s = toggleSmall(c);
      if (s) out.small.push(at(i, s));
      if (c === 'ー') out.small.push(chars.filter((_, j) => j !== i).join(''));
      const next = chars[i + 1];
      if (next && next !== c && !isMark(c) && !isMark(next)) {
        const swapped = [...chars];
        [swapped[i], swapped[i + 1]] = [next, c];
        out.order.push(swapped.join(''));
      }
    });
    return out;
  }
  const KINDS_BY_TRICKS = { 1: ['look', 'voice'], 2: ['look', 'voice', 'small', 'order'], 3: ['order', 'small', 'look', 'voice'] };
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  KB.decoys = function (word, tricks) {
    const all = changes(word);
    const chosen = [];
    const add = (w) => { if (w && w !== word && !chosen.includes(w)) chosen.push(w); };
    // Use two different kinds of trick when the word allows it, so the choices are not all the same mistake.
    const kinds = KINDS_BY_TRICKS[tricks].filter((k) => all[k].length);
    const order = tricks === 1 ? kinds.sort(() => Math.random() - 0.5) : kinds;
    for (const k of order) if (chosen.length < 2) add(pick(all[k].filter((w) => !chosen.includes(w))));
    const rest = Object.values(all).flat().filter((w) => w !== word && !chosen.includes(w));
    while (chosen.length < 2 && rest.length) add(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
    return chosen;
  };

  const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const FACES = ['👩', '👨', '👵', '👴', '🧑‍💼', '👩‍🎓', '🧒', '👮', '🧑‍🍳', '👷', '🧑‍🎤', '👩‍⚕️', '🧔', '👱‍♀️'];
  const PHRASES = [(w) => `${w}をください`, (w) => `${w}はありますか?`, (w) => `${w}、ひとつください`];

  // One whole shift is decided up front, so every player in a room serves the same customers.
  KB.makeShift = function (day) {
    const wanted = shuffle(day.newItems).concat(shuffle(day.pool));
    const customers = [];
    for (let i = 0; i < day.customers; i++) {
      const item = wanted[i % wanted.length];
      const options = shuffle([item.text, ...KB.decoys(item.text, day.tricks)]);
      customers.push({ item: item.id, options, phrase: Math.floor(Math.random() * PHRASES.length), face: pick(FACES) });
    }
    const asked = new Set(customers.map((c) => c.item));
    const others = shuffle(day.pool.filter((p) => !asked.has(p.id))).slice(0, Math.max(0, day.shelf - asked.size)).map((p) => p.id);
    return { day: day.id, shelf: shuffle([...asked, ...others]), customers };
  };
  KB.phrase = (customer) => PHRASES[customer.phrase](PRODUCTS[customer.item].text);

  KB.FIND_HINT_SECONDS = 10;
  KB.SPELL_HINT_SECONDS = 10;
  KB.PATIENCE_SECONDS = 35;
  KB.starsFor = (points, max) => {
    const share = max ? points / max : 0;
    return share >= 0.9 ? 3 : share >= 0.7 ? 2 : share >= 0.4 ? 1 : 0;
  };
})();
