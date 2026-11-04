(function () {
  const KD = globalThis.KD;
  const world = new KD.World(document.getElementById('world'));
  const save = new KD.Save();
  const ui = new KD.UI(world, save);
  const game = ui.game;

  // Read physical keys as a fallback so a Japanese IME or kana layout cannot swallow romaji input.
  function letterFrom(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return null;
    if (/^[a-zA-Z]$/.test(e.key)) return e.key.toLowerCase();
    if (e.code === 'Minus') return '-';
    const m = /^Key([A-Z])$/.exec(e.code || '');
    return m ? m[1].toLowerCase() : null;
  }

  window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    const playing = game.state === 'playing';
    if (e.key === 'Escape') {
      if (game.state === 'paused' || ui.roomMenuOpen) ui.resume(); else ui.pause();
      return;
    }
    if (playing) {
      if (e.repeat) return;
      if (e.key === 'Backspace') { e.preventDefault(); game.onBackspace(); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); game.onConfirm(); return; }
      const c = letterFrom(e);
      if (c) { e.preventDefault(); game.onLetter(c); }
      return;
    }
    if (e.key === 'Enter' && !e.repeat) {
      const primary = document.querySelector('#screen [data-primary]');
      if (primary) { e.preventDefault(); primary.click(); }
    }
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden && !ui.room) ui.pause(); });

  // Hidden tabs get no animation frames. A host must keep the stage running for everyone else.
  let lastBackgroundTick = performance.now();
  setInterval(() => {
    const now = performance.now();
    if (document.hidden && ui.room && ui.room.isHost) game.update(Math.min(1.5, (now - lastBackgroundTick) / 1000));
    lastBackgroundTick = now;
  }, 200);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    if (ui.dummy) world.poseEnemy(ui.dummy, dt * 0.25);
    world.render(game.state === 'paused' ? 0 : dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  KD.app = { world, save, ui, game };
})();
