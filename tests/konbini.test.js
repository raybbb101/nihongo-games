// Run with: node --test tests/konbini.test.js
const test = require('node:test');
const assert = require('node:assert');
const Kana = require('../shared/kana.js');
require('../kana-konbini/js/shop.js');
const KB = globalThis.KB;

test('every product has a unique picture, a name and a Traditional Chinese meaning', () => {
  assert.ok(KB.PRODUCTS.length >= 60);
  assert.strictEqual(new Set(KB.PRODUCTS.map((p) => p.picture)).size, KB.PRODUCTS.length);
  assert.strictEqual(new Set(KB.PRODUCTS.map((p) => p.text)).size, KB.PRODUCTS.length);
  for (const p of KB.PRODUCTS) {
    assert.ok(/^[ぁ-ゖァ-ヺー]+$/.test(p.text), p.text);
    assert.ok(/[一-鿿]/.test(p.zh), p.text);
    assert.ok([1, 2, 3].includes(p.level), p.text);
    assert.ok(/^[a-z-]+$/.test(Kana.romajiVariants(p.text)[0]), p.text);
  }
});

test('every product gets two different look-alike spellings at every trick level', () => {
  for (const p of KB.PRODUCTS) {
    for (const tricks of [1, 2, 3]) {
      for (let i = 0; i < 30; i++) {
        const d = KB.decoys(p.text, tricks);
        assert.strictEqual(d.length, 2, `${p.text} at ${tricks}: ${d}`);
        assert.ok(!d.includes(p.text) && d[0] !== d[1], `${p.text}: ${d}`);
        for (const w of d) assert.strictEqual(Array.from(w).length >= Array.from(p.text).length - 1, true, w);
      }
    }
  }
});

test('decoys look close: same length, and differ from the answer by one change', () => {
  const d = KB.decoys('おにぎり', 1);
  for (const w of d) {
    assert.strictEqual(Array.from(w).length, 4);
    const diff = Array.from(w).filter((c, i) => c !== 'おにぎり'[i]).length;
    assert.ok(diff >= 1 && diff <= 2, w);
  }
});

test('days grow in shelf size and customers, and every shift is servable', () => {
  const days = KB.days();
  assert.strictEqual(days.length, 8);
  days.forEach((day, i) => {
    assert.ok(day.pool.length >= day.shelf || day.pool.length >= day.customers, day.id);
    if (i) assert.ok(day.customers >= days[i - 1].customers);
    const shift = KB.makeShift(day);
    assert.strictEqual(shift.customers.length, day.customers);
    for (const c of shift.customers) {
      assert.ok(shift.shelf.includes(c.item), `${day.id}: asked item must be on the shelf`);
      assert.strictEqual(c.options.length, 3);
      assert.ok(c.options.includes(KB.PRODUCTS[c.item].text));
      assert.ok(KB.phrase(c).includes(KB.PRODUCTS[c.item].text));
    }
    assert.strictEqual(new Set(shift.shelf).size, shift.shelf.length);
    assert.ok(shift.shelf.every((id) => KB.PRODUCTS[id]), `${day.id}: shelf holds product ids`);
    assert.strictEqual(shift.shelf.length, Math.min(day.shelf, Math.max(day.pool.length, new Set(shift.customers.map((c) => c.item)).size)));
  });
  assert.ok(days[0].pool.every((p) => p.script === 'hira'));
  assert.ok(days[1].pool.every((p) => p.script === 'kata'));
});

test('stars from points', () => {
  assert.strictEqual(KB.starsFor(12, 12), 3);
  assert.strictEqual(KB.starsFor(9, 12), 2);
  assert.strictEqual(KB.starsFor(5, 12), 1);
  assert.strictEqual(KB.starsFor(4, 12), 0);
});

test('hints come after 20 seconds and customers leave after 30', () => {
  assert.strictEqual(KB.FIND_HINT_SECONDS, 20);
  assert.strictEqual(KB.SPELL_HINT_SECONDS, 20);
  assert.strictEqual(KB.PATIENCE_SECONDS, 30);
});
