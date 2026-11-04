// Kana tables and romaji matching. Shared by every game in this repository.
(function (root) {
  const ROWS = {
    a: 'あいうえお', ka: 'かきくけこ', sa: 'さしすせそ', ta: 'たちつてと', na: 'なにぬねの',
    ha: 'はひふへほ', ma: 'まみむめも', ya: 'やゆよ', ra: 'らりるれろ', wa: 'わをん',
    ga: 'がぎぐげご', za: 'ざじずぜぞ', da: 'だぢづでど', ba: 'ばびぶべぼ', pa: 'ぱぴぷぺぽ',
    yoon: 'きゃ きゅ きょ しゃ しゅ しょ ちゃ ちゅ ちょ にゃ にゅ にょ ひゃ ひゅ ひょ みゃ みゅ みょ りゃ りゅ りょ ぎゃ ぎゅ ぎょ じゃ じゅ じょ びゃ びゅ びょ ぴゃ ぴゅ ぴょ',
  };

  // The first spelling of each entry is the one shown to the player; the rest are also accepted.
  const TABLE = {
    あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
    か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
    さ: 'sa', し: 'shi/si', す: 'su', せ: 'se', そ: 'so',
    た: 'ta', ち: 'chi/ti', つ: 'tsu/tu', て: 'te', と: 'to',
    な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
    は: 'ha', ひ: 'hi', ふ: 'fu/hu', へ: 'he', ほ: 'ho',
    ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
    や: 'ya', ゆ: 'yu', よ: 'yo',
    ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
    わ: 'wa', を: 'wo/o',
    が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
    ざ: 'za', じ: 'ji/zi', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
    だ: 'da', ぢ: 'ji/di', づ: 'zu/du', で: 'de', ど: 'do',
    ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
    ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
    きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
    しゃ: 'sha/sya', しゅ: 'shu/syu', しょ: 'sho/syo',
    ちゃ: 'cha/tya', ちゅ: 'chu/tyu', ちょ: 'cho/tyo',
    にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
    ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
    みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
    りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
    ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
    じゃ: 'ja/jya/zya', じゅ: 'ju/jyu/zyu', じょ: 'jo/jyo/zyo',
    びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
    ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  };

  const shift = (s, from, to, delta) => Array.from(s).map((c) => {
    const code = c.charCodeAt(0);
    return code >= from && code <= to ? String.fromCharCode(code + delta) : c;
  }).join('');
  const toKatakana = (s) => shift(s, 0x3041, 0x3096, 0x60);
  const toHiragana = (s) => shift(s, 0x30a1, 0x30f6, -0x60);

  function rowChars(row) {
    return row === 'yoon' ? ROWS.yoon.split(' ') : Array.from(ROWS[row]);
  }

  function tokenize(hira) {
    const chars = Array.from(hira);
    const tokens = [];
    for (let i = 0; i < chars.length; i++) {
      const pair = chars[i] + (chars[i + 1] || '');
      if (TABLE[pair]) { tokens.push(pair); i++; } else tokens.push(chars[i]);
    }
    return tokens;
  }

  // All accepted romaji spellings of a kana string, display spelling first.
  function romajiVariants(kana) {
    const tokens = tokenize(toHiragana(kana));
    let out = [''];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      let opts;
      if (t === 'ん') {
        const next = tokens[i + 1];
        if (!next) opts = ['n', 'nn'];
        else if (next === 'ん' || /^[aiueoy]/.test(TABLE[next] || '')) opts = ['nn'];
        else opts = ['n', 'nn'];
      } else if (t === 'っ') {
        const next = tokens[++i];
        if (!TABLE[next]) throw new Error('No romaji after っ in ' + kana);
        opts = [];
        for (const v of TABLE[next].split('/')) {
          if (v.startsWith('ch')) opts.push('t' + v, 'c' + v);
          else opts.push(v[0] + v);
        }
      } else {
        if (!TABLE[t]) throw new Error('No romaji for ' + t + ' in ' + kana);
        opts = TABLE[t].split('/');
      }
      const merged = [];
      for (const head of out) for (const o of opts) merged.push(head + o);
      out = merged;
    }
    return out;
  }

  const api = { ROWS, rowChars, toKatakana, toHiragana, romajiVariants };
  root.Kana = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
