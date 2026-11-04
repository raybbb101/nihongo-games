// All sound is synthesized, so the game ships with no audio files.
(function () {
  const KD = (globalThis.KD = globalThis.KD || {});
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let noiseBuf = null;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(freq, dur, { type = 'triangle', vol = 0.3, at = 0, slide = 0 } = {}) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur);
  }

  function noise(dur, { vol = 0.3, at = 0, freq = 2000, q = 0.7, type = 'lowpass' } = {}) {
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur);
  }

  const SCALE = [146.83, 155.56, 196, 220, 233.08, 293.66, 311.13, 392, 440]; // D miyako-bushi

  const SFX = {
    key: () => tone(1400, 0.04, { type: 'square', vol: 0.05 }),
    miss: () => tone(130, 0.18, { type: 'sawtooth', vol: 0.18, slide: 0.7 }),
    hit: () => { tone(180, 0.18, { vol: 0.5, slide: 0.4 }); noise(0.1, { vol: 0.2, freq: 3000 }); },
    fist: () => { tone(120, 0.22, { type: 'sine', vol: 0.8, slide: 0.35 }); noise(0.09, { vol: 0.35, freq: 1500 }); },
    knife: () => { noise(0.1, { vol: 0.25, freq: 6000, type: 'bandpass', q: 3 }); tone(2200, 0.06, { vol: 0.08 }); },
    shuriken: () => { [0, 0.05, 0.1].forEach((at) => noise(0.08, { vol: 0.2, at, freq: 7000, type: 'bandpass', q: 4 })); },
    katana: () => { noise(0.28, { vol: 0.4, freq: 5000, type: 'bandpass', q: 1.5 }); tone(3000, 0.3, { type: 'sine', vol: 0.1, slide: 0.6 }); },
    fire: () => { noise(0.5, { vol: 0.5, freq: 900 }); tone(200, 0.35, { type: 'sawtooth', vol: 0.15, slide: 0.4 }); },
    ice: () => { [1800, 2600, 3400, 2200].forEach((f, i) => tone(f, 0.25, { type: 'sine', vol: 0.12, at: i * 0.035 })); noise(0.15, { vol: 0.2, freq: 8000, type: 'highpass' }); },
    thunder: () => { noise(0.6, { vol: 0.7, freq: 3500 }); tone(70, 0.6, { type: 'sawtooth', vol: 0.4, slide: 0.5 }); },
    boom: () => { noise(0.8, { vol: 0.9, freq: 700 }); tone(70, 0.7, { type: 'sine', vol: 0.9, slide: 0.3 }); },
    gate: () => { tone(90, 0.5, { type: 'sawtooth', vol: 0.4, slide: 0.5 }); noise(0.3, { vol: 0.3, freq: 500 }); },
    count: () => tone(660, 0.15, { vol: 0.25 }),
    go: () => tone(990, 0.35, { vol: 0.3 }),
    coin: () => { tone(1320, 0.08, { type: 'square', vol: 0.08 }); tone(1760, 0.2, { type: 'square', vol: 0.08, at: 0.07 }); },
    win: () => [0, 2, 3, 5, 7, 8].forEach((n, i) => tone(SCALE[n] * 2, 0.5, { at: i * 0.12, vol: 0.25 })),
    lose: () => [7, 4, 3, 1, 0].forEach((n, i) => tone(SCALE[n], 0.5, { at: i * 0.2, vol: 0.25 })),
    boss: () => { for (let i = 0; i < 4; i++) tone(70, 0.4, { type: 'sine', vol: 0.8, at: i * 0.28, slide: 0.5 }); },
  };

  KD.Audio = {
    settings: { sfx: true, music: true, voice: true },
    unlock: ensure,
    play(name) {
      if (!this.settings.sfx || !ensure()) return;
      SFX[name] && SFX[name]();
    },
    startMusic(intensity) {
      this.stopMusic();
      if (!this.settings.music || !ensure()) return;
      const stepTime = 60 / (84 + intensity * 56) / 2;
      let step = 0;
      let phrase = 0;
      musicTimer = setInterval(() => {
        if (ctx.state !== 'running') return;
        if (step % 8 === 0) tone(62, 0.35, { type: 'sine', vol: 0.5, slide: 0.55 });
        if (step % 8 === 5 && intensity > 0.2) tone(90, 0.15, { type: 'sine', vol: 0.3, slide: 0.6 });
        if (step % 2 === 0 && intensity > 0.5) noise(0.03, { vol: 0.06, freq: 5000, type: 'highpass' });
        if (Math.random() < 0.34 && step % 2 === 0) {
          tone(SCALE[(phrase + Math.floor(Math.random() * 5)) % SCALE.length], 0.7, { vol: 0.1 });
        }
        step++;
        if (step % 32 === 0) phrase = (phrase + 2) % 4;
      }, stepTime * 1000);
    },
    stopMusic() {
      if (musicTimer) clearInterval(musicTimer);
      musicTimer = null;
    },
    speak(text, queue) {
      if (!this.settings.voice || !window.speechSynthesis) return;
      if (!queue) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.95;
      const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.replace('_', '-').startsWith('ja'));
      if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    },
    stopSpeech() {
      if (window.speechSynthesis) speechSynthesis.cancel();
    },
  };
})();
