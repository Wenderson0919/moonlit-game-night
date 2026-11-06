// Utilidades: RNG com semente, ruído suave e helpers matemáticos.
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ruído de valor 2D com interpolação suave + fBm
export function makeNoise(seed) {
  const r = mulberry(seed), N = 256, perm = new Uint8Array(N * 2), val = new Float32Array(N);
  for (let i = 0; i < N; i++) { perm[i] = i; val[i] = r() * 2 - 1; }
  for (let i = N - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < N; i++) perm[i + N] = perm[i];
  const f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const a = val[perm[perm[X] + Y]], b = val[perm[perm[X + 1] + Y]], c = val[perm[perm[X] + Y + 1]], d = val[perm[perm[X + 1] + Y + 1]];
    const u = f(xf), v = f(yf);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
  const fbm = (x, y, oct = 4) => { let s = 0, amp = 0.5, fr = 1, norm = 0; for (let i = 0; i < oct; i++) { s += n2(x * fr, y * fr) * amp; norm += amp; amp *= 0.5; fr *= 2; } return s / norm; };
  return { n2, fbm };
}

export const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.floor(n)));
