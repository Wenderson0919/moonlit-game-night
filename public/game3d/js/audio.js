// Áudio sintetizado (sem arquivos): efeitos + trilha ambiente procedural.
export class Sound {
  constructor() { this.ctx = null; this.vol = 0.6; this.music = true; this.mTimer = null; this.step = 0; }
  unlock() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination); this.noiseBuf = this._noise(); } catch (e) { return; } }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.music && !this.mTimer) this.startMusic();
  }
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  setMusic(on) { this.music = on; if (on) this.startMusic(); else { clearInterval(this.mTimer); this.mTimer = null; } }
  _noise() { const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.6, this.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  tone(f, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0, dest) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, vol = 0.2, f0 = 1800, f1 = 300, type = 'lowpass', delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.05);
  }
  play(n) {
    if (!this.ctx) return;
    switch (n) {
      case 'swing': this.noise(0.18, 0.12, 2600, 500, 'bandpass'); break;
      case 'hit': this.noise(0.1, 0.22, 1500, 200); this.tone(140, 0.1, 'square', 0.1, -60); break;
      case 'crit': this.noise(0.14, 0.26, 2500, 200); this.tone(520, 0.14, 'square', 0.12, 300); this.tone(220, 0.16, 'sawtooth', 0.1, -100); break;
      case 'hurt': this.tone(200, 0.22, 'sawtooth', 0.16, -120); this.noise(0.12, 0.15, 900, 200); break;
      case 'cast': this.tone(380, 0.3, 'triangle', 0.14, 500); this.noise(0.25, 0.06, 4000, 1500, 'highpass'); break;
      case 'shoot': this.tone(700, 0.1, 'triangle', 0.1, -400); this.noise(0.08, 0.06, 3000, 1000, 'bandpass'); break;
      case 'boom': this.noise(0.6, 0.35, 700, 60); this.tone(70, 0.5, 'sine', 0.3, -40); break;
      case 'coin': this.tone(1200, 0.08, 'square', 0.07); this.tone(1700, 0.14, 'square', 0.07, 0, 0.06); break;
      case 'pick': this.tone(660, 0.1, 'triangle', 0.12); this.tone(990, 0.14, 'triangle', 0.12, 0, 0.07); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.16, 0, i * 0.11)); break;
      case 'potion': this.tone(400, 0.3, 'sine', 0.14, 500); this.tone(600, 0.3, 'sine', 0.1, 400, 0.1); break;
      case 'click': this.tone(800, 0.04, 'square', 0.05); break;
      case 'deny': this.tone(160, 0.18, 'square', 0.1, -40); break;
      case 'roar': this.noise(0.9, 0.3, 500, 80); this.tone(90, 0.9, 'sawtooth', 0.22, -30); this.tone(60, 0.9, 'square', 0.12, -10); break;
      case 'thunder': this.noise(1.6, 0.4, 500, 50); this.tone(50, 1.2, 'sine', 0.25, -10); break;
      case 'dodge': this.noise(0.18, 0.1, 1200, 3000, 'bandpass'); break;
      case 'win': [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.16, 0, i * 0.14)); break;
      case 'mount': this.tone(300, 0.12, 'triangle', 0.1, 200); this.noise(0.2, 0.06, 800, 400); break;
    }
  }
  startMusic() {
    if (!this.ctx || this.mTimer) return;
    const scale = [0, 3, 5, 7, 10, 12, 15, 17], root = 110; let bar = 0;
    const chords = [[0, 7, 12], [-2, 5, 10], [-4, 3, 8], [-5, 2, 7]];
    this.mTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const ch = chords[bar++ % 4], f = (s) => root * Math.pow(2, s / 12);
      for (const n of ch) this.tone(f(n), 3.6, 'sine', 0.035, 0, 0, this.master);
      for (let i = 0; i < 4; i++) if (Math.random() < 0.7) this.tone(f(12 + scale[(Math.random() * scale.length) | 0]), 0.9, 'triangle', 0.022, 0, i * 0.9);
    }, 3600);
  }
}
