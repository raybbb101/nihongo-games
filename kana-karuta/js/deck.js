// Stages and deck building for Kana Karuta. No DOM here, so the rules can be tested in Node.
(function () {
  const KK = (globalThis.KK = globalThis.KK || {});
  const { rowChars, toKatakana, toHiragana, romajiVariants } = globalThis.Kana;

  const firstKana = (word) => Array.from(toHiragana(word.text))[0];
  const byKana = new Map();
  for (const word of globalThis.PICTURE_WORDS) {
    const k = firstKana(word);
    if (!byKana.has(k)) byKana.set(k, []);
    byKana.get(k).push(word);
  }

  const BASE = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa'];
  const VOICED = ['ga', 'za', 'da', 'ba', 'pa'];
  const PLAN = [
    ['a'], ['ka'], ['a', 'ka'],
    ['sa'], ['ta'], ['a', 'ka', 'sa', 'ta'],
    ['na'], ['ha'], ['ma'], ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma'],
    ['ya', 'ra', 'wa'], BASE,
    ['ga', 'za', 'da'], ['ba', 'pa'], [...BASE, ...VOICED],
  ];
  const MAX_TILES = 16;
  const lerp = (a, b, t) => a + (b - a) * t;

  KK.SCRIPTS = ['hira', 'kata', 'mix'];
  KK.stages = (script) => PLAN.map((rows, i) => {
    const d = Math.min(1, (i / (PLAN.length - 1)) * 0.85 + (script === 'mix' ? 0.15 : 0));
    return {
      id: `${script}-${i + 1}`, script, index: i, rows,
      review: rows.length > 2 || (i === 2),
      kana: rows.flatMap((r) => rowChars(r)).filter((c) => byKana.has(c)),
      seconds: lerp(14, 5, d),
    };
  });

  const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  KK.shuffle = shuffle;

  // In every script the player sees one tile per sound; mixed mode picks hiragana or katakana per tile.
  const writeAs = (hira, script) => {
    if (script === 'kata') return toKatakana(hira);
    if (script === 'hira') return toHiragana(hira);
    return Math.random() < 0.5 ? hira : toKatakana(hira);
  };

  // Several cards can share one tile: めがね and め are both taken with め, so a tile only leaves when its cards are gone.
  KK.buildDeck = function (stage) {
    const chosen = shuffle(stage.kana).slice(0, MAX_TILES);
    const tiles = chosen.map((kana) => {
      const text = writeAs(kana, stage.script);
      const variants = romajiVariants(kana);
      return { kana, text, variants, primary: variants[0], cards: 0 };
    });
    const pools = new Map(chosen.map((k) => [k, shuffle(byKana.get(k))]));
    const deck = [];
    const draw = (tile) => {
      const word = pools.get(tile.kana).pop();
      if (!word) return;
      tile.cards++;
      const script = stage.script === 'mix' ? (tile.text === tile.kana ? 'hira' : 'kata') : stage.script;
      const text = script === 'kata' ? toKatakana(word.text) : toHiragana(word.text);
      deck.push({ ...word, text, speak: word.text, kana: tile.kana, tile });
    };
    tiles.forEach(draw);
    const extras = Math.max(2, Math.round(tiles.length * 0.35));
    shuffle(tiles).slice(0, extras).forEach(draw);
    return { tiles, deck: shuffle(deck) };
  };

  KK.starsFor = (playerCards, total) => {
    const share = total ? playerCards / total : 0;
    if (share <= 0.5) return 0;
    if (share === 1) return 3;
    return share >= 0.75 ? 2 : 1;
  };
})();
