// Progress, coins, purchases and settings, kept in this browser's localStorage.
(function () {
  const KD = (globalThis.KD = globalThis.KD || {});
  const KEY = 'kana-defense-save-v1';

  const fresh = () => ({
    settings: {
      lang: (navigator.language || 'en').startsWith('ja') ? 'ja' : 'en',
      hint: 'auto', voice: true, sfx: true, music: true, unlockAll: false,
    },
    stars: {},
    coins: 0,
    owned: { fist: true, sparks: true },
    weapon: 'fist',
    effect: 'sparks',
    mastery: {},
  });

  function load() {
    const base = fresh();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw) return { ...base, ...raw, settings: { ...base.settings, ...raw.settings } };
    } catch (e) { /* private window or corrupt save: start fresh */ }
    return base;
  }

  class Save {
    constructor() { this.data = load(); }
    get settings() { return this.data.settings; }
    get coins() { return this.data.coins; }
    write() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* progress lasts this session only */ }
    }
    stars(id) { return this.data.stars[id] || 0; }
    setStars(id, n) { this.data.stars[id] = Math.max(this.stars(id), n); this.write(); }
    addCoins(n) { this.data.coins += n; this.write(); }
    owns(id) { return !!this.data.owned[id]; }
    buy(id, price) {
      if (this.owns(id) || this.coins < price) return false;
      this.data.coins -= price;
      this.data.owned[id] = true;
      this.write();
      return true;
    }
    mastery(text) { return this.data.mastery[text] || { c: 0, l: 0 }; }
    markCorrect(text) { const m = this.mastery(text); this.data.mastery[text] = { c: m.c + 1, l: m.l }; this.write(); }
    markLeak(text) { const m = this.mastery(text); this.data.mastery[text] = { c: m.c, l: m.l + 1 }; this.write(); }
    stageOpen(chapter, i) {
      return this.settings.unlockAll || i === 0 || this.stars(chapter.stages[i].id) > 0 || this.stars(chapter.stages[i - 1].id) > 0;
    }
    chapterCleared(chapter) { return chapter.stages.every((s) => this.stars(s.id) > 0); }
    kanjiOpen() {
      return this.settings.unlockAll || ['hira', 'kata', 'mix'].every((id) => this.chapterCleared(KD.chapter(id)));
    }
    reset() {
      const lang = this.settings.lang;
      this.data = fresh();
      this.settings.lang = lang;
      this.write();
    }
  }
  KD.Save = Save;
})();
