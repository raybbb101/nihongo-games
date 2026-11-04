// Chapters, stage difficulty, coin rewards and the shop catalogue.
(function () {
  const KD = (globalThis.KD = globalThis.KD || {});
  const { rowChars, toKatakana, toHiragana, romajiVariants } = globalThis.Kana;
  KD.Audio = globalThis.GameAudio;

  const kanaItem = (text) => {
    const variants = romajiVariants(text);
    return { text, speak: text, variants, primary: variants[0], meaning: null, readingFor: {} };
  };

  // `say` covers spellings that differ from the sound, such as the は in こんにちは.
  const wordItem = (w) => {
    const spoken = romajiVariants(w.say || w.text);
    const variants = [...new Set([...spoken, ...romajiVariants(w.text)])];
    return { text: w.text, speak: w.text, variants, primary: spoken[0], meaning: w.zh, readingFor: {} };
  };

  function kanjiItem(entry) {
    const variants = [];
    const readingFor = {};
    for (const reading of entry.r) {
      for (const v of romajiVariants(reading)) {
        if (!readingFor[v]) { variants.push(v); readingFor[v] = reading; }
      }
    }
    return { text: entry.text, speak: entry.r[0], variants, primary: variants[0], meaning: entry.zh, reading: entry.r[0], readingFor };
  }

  const BASE = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'];
  const VOICED = ['ga', 'za', 'da', 'ba', 'pa'];
  const WORDS = { words: true };
  const SINGLE_PLAN = [
    { rows: ['a'] }, { rows: ['ka'] }, { review: ['a', 'ka'] }, WORDS,
    { rows: ['sa'] }, { rows: ['ta'] }, { review: ['a', 'ka', 'sa', 'ta'] }, WORDS,
    { rows: ['na'] }, { rows: ['ha'] }, { rows: ['ma'] }, { review: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma'] }, WORDS,
    { rows: ['ya', 'ra'] }, { rows: ['wa'] }, { review: BASE }, WORDS,
    { rows: ['ga', 'za'] }, { rows: ['da', 'ba', 'pa'] }, WORDS, { rows: ['yoon'] }, WORDS,
    { review: [...BASE, ...VOICED, 'yoon'], final: true },
  ];
  const MIX_PLAN = [
    { rows: ['a', 'ka'] }, { rows: ['sa', 'ta'] }, WORDS, { rows: ['na', 'ha'] }, { rows: ['ma', 'ya'] }, WORDS, { rows: ['ra', 'wa'] },
    { review: BASE }, WORDS, { rows: ['ga', 'za'] }, { rows: ['da', 'ba', 'pa'] }, WORDS, { rows: ['yoon'] }, WORDS,
    { review: [...BASE, ...VOICED, 'yoon'], final: true },
  ];

  const lerp = (a, b, t) => a + (b - a) * t;

  // p runs from 0 (first stage of a chapter) to 1 (its final boss).
  function difficulty(p, offset, slow) {
    const d = Math.min(1, p * (1 - offset) + offset);
    return {
      count: Math.round(lerp(8, 34, d)),
      speed: lerp(2.6, 7, d) * slow,
      interval: lerp(3.4, 0.95, d) / slow,
      maxAlive: Math.round(lerp(3, 12, d)),
      runnerShare: Math.max(0, (d - 0.3) * 0.6),
      weaverShare: Math.max(0, (d - 0.15) * 0.5),
    };
  }

  const scriptFor = {
    hira: (c) => [c],
    kata: (c) => [toKatakana(c)],
    mix: (c) => [c, toKatakana(c)],
  };

  const wordListFor = {
    hira: () => globalThis.KANA_WORDS.hira,
    kata: () => globalThis.KANA_WORDS.kata,
    mix: () => [...globalThis.KANA_WORDS.hira, ...globalThis.KANA_WORDS.kata],
  };

  // A word is ready once every kana in it has been taught. Small っ arrives with the voiced rows.
  function knownWord(word, seen) {
    const known = new Set(seen.flatMap((r) => rowChars(r).flatMap((c) => Array.from(c))));
    if (seen.includes('ga')) known.add('っ');
    return Array.from(toHiragana(word.text)).every((c) => c === 'ー' || known.has(c));
  }

  // The rest of a large batch still turns up in play; the intro cards stay short enough to read.
  const MAX_INTRO_WORDS = 14;
  const evenSample = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));

  function buildKana(chapter, plan, offset) {
    const seen = [];
    const taughtWords = new Set();
    let stageNum = 0;
    let wordNum = 0;
    return plan.map((step, i) => {
      if (step.words) {
        const ready = wordListFor[chapter]().filter((w) => knownWord(w, seen));
        const fresh = ready.filter((w) => !taughtWords.has(w.text));
        fresh.forEach((w) => taughtWords.add(w.text));
        const base = difficulty(i / (plan.length - 1), offset, 1);
        return {
          id: `${chapter}-w${++wordNum}`, chapter, index: i, words: true, final: false, boss: 0, label: null, sub: null,
          params: {
            ...base,
            count: Math.max(Math.min(fresh.length, MAX_INTRO_WORDS), Math.round(base.count * 0.55)),
            speed: base.speed * 0.72,
            interval: base.interval * 1.6,
            maxAlive: Math.max(3, Math.round(base.maxAlive * 0.5)),
            runnerShare: 0,
            weaverShare: base.weaverShare * 0.5,
          },
          newItems: evenSample(fresh, MAX_INTRO_WORDS).map(wordItem),
          pool: ready.map((w) => ({ item: wordItem(w), weight: fresh.includes(w) ? 1 : 0.3 })),
        };
      }
      const toItems = (rows) => rows.flatMap((r) => rowChars(r)).flatMap(scriptFor[chapter]).map(kanaItem);
      const p = i / (plan.length - 1);
      const params = difficulty(p, offset, 1);
      const rows = step.rows || step.review;
      const first = (r) => scriptFor[chapter](rowChars(r)[0]).join('');
      const stage = {
        id: `${chapter}-${++stageNum}`, chapter, index: i, params, final: !!step.final,
        boss: step.review ? (step.final ? 14 : Math.round(lerp(4, 11, p))) : 0,
        label: step.review ? null : rows.map(first).join('・'),
        sub: step.review ? null : rows.map((r) => (r === 'yoon' ? 'kya…' : r === 'a' ? 'a i u e o' : r + '…')).join(' / '),
      };
      if (step.review) {
        stage.newItems = [];
        stage.pool = toItems(step.review).map((item) => ({ item, weight: 1 }));
      } else {
        stage.newItems = toItems(step.rows);
        stage.pool = [
          ...stage.newItems.map((item) => ({ item, weight: 1 })),
          ...toItems(seen).map((item) => ({ item, weight: 0.25 })),
        ];
        seen.push(...step.rows);
      }
      return stage;
    });
  }

  function buildKanji() {
    const G = globalThis.KANJI_GROUPS;
    const byId = Object.fromEntries(G.map((g) => [g.id, g]));
    const plan = [
      { g: ['num1'] }, { g: ['num2'] }, { g: ['week'] }, { g: ['nature'] },
      { review: ['num1', 'num2', 'week', 'nature'] },
      { g: ['body'] }, { g: ['place'] }, { g: ['family'] },
      { review: ['body', 'place', 'family'] },
      { g: ['school'] }, { g: ['time'] }, { g: ['life'] },
      { review: G.map((g) => g.id), final: true },
    ];
    const seen = [];
    return plan.map((step, i) => {
      const toItems = (ids) => ids.flatMap((id) => byId[id].items).map(kanjiItem);
      const p = i / (plan.length - 1);
      const stage = {
        id: `kanji-${i + 1}`, chapter: 'kanji', index: i, params: difficulty(p, 0.08, 0.8), final: !!step.final,
        boss: step.review ? (step.final ? 12 : 6) : 0,
        label: step.review ? null : byId[step.g[0]].items.slice(0, 3).map((x) => x.text).join(''),
        sub: step.review ? null : byId[step.g[0]],
      };
      if (step.review) {
        stage.newItems = [];
        stage.pool = toItems(step.review).map((item) => ({ item, weight: 1 }));
      } else {
        stage.newItems = toItems(step.g);
        stage.pool = [
          ...stage.newItems.map((item) => ({ item, weight: 1 })),
          ...toItems(seen).map((item) => ({ item, weight: 0.2 })),
        ];
        seen.push(...step.g);
      }
      return stage;
    });
  }

  KD.CHAPTERS = [
    { id: 'hira', glyph: 'あ', stages: buildKana('hira', SINGLE_PLAN, 0) },
    { id: 'kata', glyph: 'ア', stages: buildKana('kata', SINGLE_PLAN, 0.04) },
    { id: 'mix', glyph: 'あア', stages: buildKana('mix', MIX_PLAN, 0.22) },
    { id: 'kanji', glyph: '漢', stages: buildKanji() },
  ];
  KD.chapter = (id) => KD.CHAPTERS.find((c) => c.id === id);
  KD.stageById = (id) => KD.CHAPTERS.flatMap((c) => c.stages).find((s) => s.id === id);
  KD.START_HEARTS = 5;

  // speedScore: 0..1, how far from the gate enemies were on average when defeated.
  KD.computeCoins = function ({ won, kills, accuracy, speedScore, hearts, stage }) {
    const killCoins = kills * 2;
    if (!won) return { kill: killCoins, speed: 0, accuracy: 0, perfect: 0, clear: 0, total: killCoins };
    const clear = 15 + stage.index * 3 + (stage.boss || stage.words ? 15 : 0);
    const speed = Math.round(Math.max(0, Math.min(1, speedScore)) * 40);
    const acc = Math.round(Math.pow(Math.max(0, accuracy), 3) * 40);
    const perfect = hearts === KD.START_HEARTS ? 25 : 0;
    return { kill: killCoins, speed, accuracy: acc, perfect, clear, total: killCoins + speed + acc + perfect + clear };
  };

  // Weapons and hit effects are cosmetic on purpose: buying never replaces knowing the kana.
  KD.WEAPONS = [
    { id: 'fist', price: 0, icon: '👊', en: 'Fist', ja: '拳', desc: { en: 'Bam! Your starting punch.', ja: 'バーン!最初の武器。' } },
    { id: 'knife', price: 120, icon: '🔪', en: 'Throwing knife', ja: 'ナイフ', desc: { en: 'Fast and sharp.', ja: '速くて鋭い投げナイフ。' } },
    { id: 'shuriken', price: 250, icon: '✴️', en: 'Shuriken', ja: '手裏剣', desc: { en: 'Spinning ninja stars, three at a time.', ja: '三連の回転手裏剣。' } },
    { id: 'katana', price: 500, icon: '⚔️', en: 'Katana', ja: '刀', desc: { en: 'One giant slash splits the screen.', ja: '画面を裂く大斬撃。' } },
    { id: 'fire', price: 800, icon: '🔥', en: 'Fire staff', ja: '炎の杖', desc: { en: 'Fireballs with a burning trail.', ja: '尾を引く火の玉。' } },
    { id: 'ice', price: 1000, icon: '❄️', en: 'Ice staff', ja: '氷の杖', desc: { en: 'Freezes the enemy, then shatters it.', ja: '凍らせて粉々に砕く。' } },
    { id: 'thunder', price: 1400, icon: '⚡', en: 'Thunder staff', ja: '雷の杖', desc: { en: 'Lightning strikes from the sky.', ja: '天から落ちる雷。' } },
    { id: 'grenade', price: 1800, icon: '💣', en: 'Grenade', ja: 'グレネード', desc: { en: 'Lob it. Big boom.', ja: '放物線を描いて大爆発。' } },
    { id: 'meteor', price: 3000, icon: '☄️', en: 'Meteor', ja: '隕石', desc: { en: 'Overkill from outer space.', ja: '宇宙からのオーバーキル。' } },
  ];
  KD.EFFECTS = [
    { id: 'sparks', price: 0, icon: '✨', en: 'Sparks', ja: '火花', colors: [0xffd27a, 0xffffff, 0xff8a4c] },
    { id: 'sakura', price: 100, icon: '🌸', en: 'Sakura', ja: '桜吹雪', colors: [0xffb7d5, 0xffe4ef, 0xff7fb0] },
    { id: 'coins', price: 200, icon: '🪙', en: 'Gold rain', ja: '小判', colors: [0xffd700, 0xffb300, 0xfff2a8] },
    { id: 'ink', price: 350, icon: '🖌️', en: 'Sumi ink', ja: '墨しぶき', colors: [0x10101a, 0x34344a, 0xc0392b], normalBlend: true },
    { id: 'rainbow', price: 600, icon: '🌈', en: 'Rainbow', ja: '虹', colors: [0xff4d4d, 0xffa94d, 0xffe14d, 0x5dff7a, 0x4dc3ff, 0xb44dff], big: true },
  ];
})();
