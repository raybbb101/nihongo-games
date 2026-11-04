// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const Kana = require('../shared/kana.js');
require('../shared/kanji.js');
require('../shared/words.js');
require('../kana-defense/js/stages.js');
const KD = globalThis.KD;

test('romaji spellings: display form first, alternates accepted', () => {
  assert.deepStrictEqual(Kana.romajiVariants('し'), ['shi', 'si']);
  assert.deepStrictEqual(Kana.romajiVariants('ん'), ['n', 'nn']);
  assert.deepStrictEqual(Kana.romajiVariants('ジャ'), ['ja', 'jya', 'zya']);
  assert.strictEqual(Kana.romajiVariants('を')[0], 'wo');
  assert.ok(Kana.romajiVariants('を').includes('o'));
});

test('words: small tsu, n and long vowels', () => {
  assert.strictEqual(Kana.romajiVariants('がっこう')[0], 'gakkou');
  assert.strictEqual(Kana.romajiVariants('でんしゃ')[0], 'densha');
  assert.ok(Kana.romajiVariants('おんな').includes('onna'));
  assert.ok(Kana.romajiVariants('きょう').includes('kyou'));
  assert.ok(Kana.romajiVariants('おちゃ').includes('ocha'));
});

test('every stage has a playable pool and rising difficulty', () => {
  for (const ch of KD.CHAPTERS) {
    assert.ok(ch.stages.length >= 10, ch.id);
    ch.stages.forEach((s, i) => {
      assert.ok(s.pool.length > 0, s.id);
      for (const { item } of s.pool) assert.ok(item.variants.length > 0 && /^[a-z]+$/.test(item.primary), item.text);
    });
    const regular = ch.stages.filter((s) => !s.words);
    regular.forEach((s, i) => {
      if (i) {
        assert.ok(s.params.count >= regular[i - 1].params.count, s.id);
        assert.ok(s.params.speed >= regular[i - 1].params.speed, s.id);
      }
    });
    assert.ok(ch.stages[ch.stages.length - 1].final, ch.id);
  }
});

test('katakana chapter contains katakana only, mixed contains both', () => {
  const texts = (id) => KD.chapter(id).stages.flatMap((s) => s.pool.map((x) => x.item.text)).join('');
  assert.ok(!/[ぁ-ゖ]/.test(texts('kata')));
  assert.ok(/[ぁ-ゖ]/.test(texts('mix')) && /[ァ-ヶ]/.test(texts('mix')));
});

test('long vowel mark and は pronounced wa', () => {
  assert.strictEqual(Kana.romajiVariants('コーヒー')[0], 'koohii');
  assert.ok(Kana.romajiVariants('コーヒー').includes('ko-hi-'));
  const hello = KD.chapter('hira').stages.flatMap((s) => s.pool).find((x) => x.item.text === 'こんにちは').item;
  assert.strictEqual(hello.primary, 'konnichiwa');
  assert.ok(hello.variants.includes('konnichiha'));
});

test('word stages only use kana that were already taught', () => {
  for (const id of ['hira', 'kata', 'mix']) {
    const ch = KD.chapter(id);
    const taught = new Set();
    ch.stages.forEach((s) => {
      if (s.words) {
        assert.ok(s.newItems.length >= 6, `${s.id} has ${s.newItems.length} new words`);
        for (const { item } of s.pool) {
          for (const c of Kana.toHiragana(item.text)) {
            assert.ok(c === 'ー' || c === 'っ' || taught.has(c), `${s.id}: ${item.text} uses untaught ${c}`);
          }
        }
      } else {
        for (const { item } of s.pool) for (const c of Kana.toHiragana(item.text)) taught.add(c);
      }
    });
  }
});

test('every word is written in the right script and listed once', () => {
  const { hira, kata } = globalThis.KANA_WORDS;
  assert.ok(hira.every((w) => /^[\u3041-\u3096]+$/.test(w.text)));
  assert.ok(kata.every((w) => /^[\u30a1-\u30f6ー]+$/.test(w.text)));
  for (const list of [hira, kata]) assert.strictEqual(new Set(list.map((w) => w.text)).size, list.length);
});

test('coins reward speed and accuracy, and defeat still pays for kills', () => {
  const stage = KD.chapter('hira').stages[0];
  const base = { won: true, kills: 10, hearts: 3, stage };
  const slow = KD.computeCoins({ ...base, accuracy: 0.6, speedScore: 0.1 });
  const fast = KD.computeCoins({ ...base, accuracy: 0.6, speedScore: 0.9 });
  const sharp = KD.computeCoins({ ...base, accuracy: 1, speedScore: 0.1 });
  assert.ok(fast.total > slow.total);
  assert.ok(sharp.total > slow.total);
  const lost = KD.computeCoins({ won: false, kills: 4, accuracy: 1, speedScore: 1, hearts: 0, stage });
  assert.strictEqual(lost.total, 8);
});

test('shop has fist free and prices ascending', () => {
  assert.strictEqual(KD.WEAPONS[0].id, 'fist');
  assert.strictEqual(KD.WEAPONS[0].price, 0);
  for (let i = 1; i < KD.WEAPONS.length; i++) assert.ok(KD.WEAPONS[i].price > KD.WEAPONS[i - 1].price);
});
