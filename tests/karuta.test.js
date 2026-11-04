// Run with: node --test tests/karuta.test.js
const test = require('node:test');
const assert = require('node:assert');
const Kana = require('../shared/kana.js');
const WORDS = require('../shared/picture-words.js');
require('../kana-karuta/js/deck.js');
const KK = globalThis.KK;

test('picture words are well formed and start with one plain kana', () => {
  assert.ok(WORDS.length > 150);
  for (const w of WORDS) {
    assert.ok(w.text && w.picture && /[\u4e00-\u9fff]/.test(w.zh), JSON.stringify(w));
    assert.ok(Kana.romajiVariants(w.text).length, w.text);
    assert.ok(!/^.[ゃゅょャュョァィゥェォ]/.test(w.text), `${w.text} starts with a combined sound`);
  }
  assert.strictEqual(new Set(WORDS.map((w) => w.text)).size, WORDS.length);
});

test('every basic and voiced kana has a card, except those no word starts with', () => {
  const firsts = new Set(WORDS.map((w) => Array.from(Kana.toHiragana(w.text))[0]));
  const rows = ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'ga', 'za', 'da', 'ba', 'pa'];
  const missing = rows.flatMap((r) => Kana.rowChars(r)).filter((c) => !firsts.has(c));
  assert.deepStrictEqual(missing.sort(), ['ぢ', 'づ', 'を', 'ん'].sort());
});

test('some kana share several cards, like め and めがね', () => {
  const me = WORDS.filter((w) => w.text.startsWith('め') || w.text.startsWith('メ')).map((w) => w.text);
  assert.ok(me.includes('め') && me.includes('めがね'));
});

test('every deck can be finished: each card has a tile with enough count', () => {
  for (const script of KK.SCRIPTS) {
    for (const stage of KK.stages(script)) {
      assert.ok(stage.kana.length >= 3, stage.id);
      const { tiles, deck } = KK.buildDeck(stage);
      assert.ok(tiles.length <= 16 && tiles.length >= 3, stage.id);
      assert.ok(deck.length > tiles.length, `${stage.id} should have shared tiles`);
      assert.strictEqual(tiles.reduce((a, x) => a + x.cards, 0), deck.length, stage.id);
      for (const card of deck) {
        assert.strictEqual(card.tile.kana, card.kana);
        assert.ok(tiles.includes(card.tile));
      }
      assert.strictEqual(new Set(tiles.map((x) => x.primary)).size, tiles.length, `${stage.id} tiles must differ in sound`);
    }
  }
});

test('katakana stages write tiles and words in katakana', () => {
  const stage = KK.stages('kata')[14];
  const { tiles, deck } = KK.buildDeck(stage);
  assert.ok(tiles.every((x) => /^[ァ-ヶ]$/.test(x.text)));
  assert.ok(deck.every((c) => !/[ぁ-ゖ]/.test(c.text)));
});

test('room codes are short, readable and forgiving to type', () => {
  const Rooms = require('../shared/room.js');
  for (let i = 0; i < 200; i++) assert.match(Rooms.newCode(), /^[A-HJKMNP-Z2-9]{5}$/);
  assert.strictEqual(Rooms.normalizeCode(' ab-c 2d '), 'ABC2D');
});

test('stars: beat the tengu to pass', () => {
  assert.strictEqual(KK.starsFor(5, 10), 0);
  assert.strictEqual(KK.starsFor(6, 10), 1);
  assert.strictEqual(KK.starsFor(8, 10), 2);
  assert.strictEqual(KK.starsFor(10, 10), 3);
});
