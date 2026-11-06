// Mundo 3D: terreno procedural, biomas, props instanciados, cidade segura, céu, clima.
import * as THREE from './three.module.min.js';
import { makeNoise, mulberry, clamp, lerp, smooth, TAU, rand } from './util.js';

export const SIZE = 640, HALF = SIZE / 2, CITY_R = 56, SEA = -1.4;
export const VOLC = { x: 175, z: -175 };
export const TITAN_ARENA = { x: -118, z: 22, r: 26 };
export const DRAGON_ARENA = { x: 128, z: -112, r: 26 };
const noise = makeNoise(20260101);
const ARENAS = [
  { ...TITAN_ARENA, y: 2.0 }, { ...DRAGON_ARENA, y: 4.0 },
];

export function weights(x, z) {
  const d = Math.hypot(x, z);
  const qx = x + noise.n2(x * 0.01, z * 0.01) * 50, qz = z + noise.n2(x * 0.01 + 9, z * 0.01 + 9) * 50;
  const B = 22, sx = smooth(-B, B, qx), sz = smooth(-B, B, qz), outer = smooth(105, 150, d);
  const w = { forest: 1 - outer + outer * sx * (1 - sz), snow: outer * (1 - sx) * (1 - sz), desert: outer * sx * sz, swamp: outer * (1 - sx) * sz, volcano: 0 };
  const dv = Math.hypot(x - VOLC.x, z - VOLC.z), vw = smooth(95, 60, dv);
  for (const k in w) w[k] *= 1 - vw;
  w.volcano = vw;
  return w;
}
export function biomeAt(x, z) {
  if (Math.hypot(x, z) < CITY_R) return 'city';
  const w = weights(x, z); let best = 'forest', bv = -1;
  for (const k in w) if (w[k] > bv) { bv = w[k]; best = k; }
  return best;
}
export function heightAt(x, z) {
  const d = Math.hypot(x, z), w = weights(x, z);
  let h = noise.fbm(x * 0.008, z * 0.008, 4) * 16 + noise.fbm(x * 0.03 + 40, z * 0.03, 3) * 3.2 + 2;
  h += (Math.abs(noise.fbm(x * 0.012 + 70, z * 0.012 - 30, 3)) * 28) * w.snow;
  h += (Math.sin(x * 0.05 + noise.n2(x * 0.02, z * 0.02) * 4) * 1.6 + 1.2) * w.desert;
  h = lerp(h, -0.35 + noise.n2(x * 0.1, z * 0.1) * 0.3, w.swamp * 0.8);
  const dv = Math.hypot(x - VOLC.x, z - VOLC.z), cone = clamp(1 - dv / 78, 0, 1);
  h += Math.pow(cone, 1.35) * 46; if (dv < 13) h -= (13 - dv) * 1.5;
  h -= smooth(235, 315, d) * 34;
  const c = 1 - smooth(CITY_R + 4, 98, d); h = lerp(h, 1.0, c);
  for (const a of ARENAS) { const da = Math.hypot(x - a.x, z - a.z), t = 1 - smooth(a.r, a.r + 18, da); if (t > 0) h = lerp(h, a.y, t); }
  return h;
}

const COL = {
  forest: [0x4f9a3f, 0x5aa646, 0x468a38], snow: [0xe9f1f6, 0xdbe7ef, 0xf4f8fb], desert: [0xdcc07a, 0xd1b36a, 0xe6cc8a],
  swamp: [0x4b6a3c, 0x3f5a35, 0x58743f], volcano: [0x3b3030, 0x2e2626, 0x4a3a34], sand: 0xd8c68c, rock: 0x7b7770, lava: 0xff5a14, plaza: 0xb7b1a2,
};
const _c = new THREE.Color(), _c2 = new THREE.Color();

export function buildTerrain() {
  const seg = 256, geo = new THREE.PlaneGeometry(SIZE, SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), keys = ['forest', 'snow', 'desert', 'swamp', 'volcano'];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = heightAt(x, z); pos.setY(i, h);
    const w = weights(x, z), vn = noise.n2(x * 0.15, z * 0.15);
    _c.setRGB(0, 0, 0);
    for (const k of keys) { if (w[k] <= 0.001) continue; _c2.setHex(COL[k][(((vn + 1) * 1.5) | 0) % 3]); _c.r += _c2.r * w[k]; _c.g += _c2.g * w[k]; _c.b += _c2.b * w[k]; }
    if (w.volcano > 0.3) { const dv = Math.hypot(x - VOLC.x, z - VOLC.z), lava = smooth(0.15, 0.4, noise.fbm(x * 0.05, z * 0.05, 3)) * smooth(0.3, 0.9, w.volcano) * (dv < 70 ? 1 : 0); if (lava > 0.4 || dv < 12) { _c2.setHex(COL.lava); _c.lerp(_c2, dv < 12 ? 1 : lava * 0.8); } }
    const d = Math.hypot(x, z);
    if (d < CITY_R + 6) { _c2.setHex(0x5c9a48); _c.lerp(_c2, 1 - smooth(CITY_R - 4, CITY_R + 6, d)); }
    if (h < 0.5 && h > SEA - 1.2) { _c2.setHex(COL.sand); _c.lerp(_c2, smooth(0.5, -0.4, h) * 0.9 * (1 - w.swamp * 0.6)); }
    if (h <= SEA - 1.2) { _c2.setHex(0x8a7a52); _c.lerp(_c2, 0.8); }
    const bright = 0.92 + vn * 0.08; col[i * 3] = _c.r * bright; col[i * 3 + 1] = _c.g * bright; col[i * 3 + 2] = _c.b * bright;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  // pedra nas encostas íngremes
  const nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) { const s = 1 - nrm.getY(i); if (s > 0.3) { _c2.setHex(COL.rock); const t = clamp((s - 0.3) * 3, 0, 0.7); col[i * 3] = lerp(col[i * 3], _c2.r, t); col[i * 3 + 1] = lerp(col[i * 3 + 1], _c2.g, t); col[i * 3 + 2] = lerp(col[i * 3 + 2], _c2.b, t); } }
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.receiveShadow = true; return mesh;
}

export function buildWater() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshPhongMaterial({ color: 0x2a86c0, transparent: true, opacity: 0.8, shininess: 110, specular: 0x9fd6ff }));
  m.position.y = SEA; m.renderOrder = 1; return m;
}

/* ---------- geometria mesclada (vertex colors) para props ---------- */
function merge(parts) {
  const P = [], N = [], C = [];
  for (const { g, m, c } of parts) {
    const ng = g.index ? g.toNonIndexed() : g.clone(); ng.applyMatrix4(m);
    const p = ng.attributes.position.array, n = ng.attributes.normal.array, col = new THREE.Color(c);
    for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) C.push(col.r, col.g, col.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return g;
}
const M4 = (x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, ry = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
const cyl = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
const cone = (r, h, s = 7) => new THREE.ConeGeometry(r, h, s);
const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

const PROP = {
  oak: () => merge([{ g: cyl(0.3, 0.45, 3, 6), m: M4(0, 1.5, 0), c: 0x6b4a2b }, { g: ico(2.1, 0), m: M4(0, 4, 0, 1, 0.85, 1), c: 0x3f8f35 }, { g: ico(1.5, 0), m: M4(1.1, 3.2, 0.5), c: 0x4aa13d }, { g: ico(1.4, 0), m: M4(-1, 3.4, -0.6), c: 0x378230 }]),
  pine: () => merge([{ g: cyl(0.25, 0.4, 2, 6), m: M4(0, 1, 0), c: 0x5b3f26 }, { g: cone(2.2, 3, 7), m: M4(0, 3, 0), c: 0x2f6b45 }, { g: cone(1.7, 2.6, 7), m: M4(0, 4.6, 0), c: 0x37794f }, { g: cone(1.1, 2.2, 7), m: M4(0, 6.1, 0), c: 0x3f875a }]),
  snowpine: () => merge([{ g: cyl(0.25, 0.4, 2, 6), m: M4(0, 1, 0), c: 0x5b3f26 }, { g: cone(2.2, 3, 7), m: M4(0, 3, 0), c: 0xdfeaf0 }, { g: cone(1.7, 2.6, 7), m: M4(0, 4.6, 0), c: 0xeaf3f7 }, { g: cone(1.1, 2.2, 7), m: M4(0, 6.1, 0), c: 0xffffff }]),
  cactus: () => merge([{ g: cyl(0.45, 0.5, 3.6, 8), m: M4(0, 1.8, 0), c: 0x3f8a4a }, { g: cyl(0.28, 0.3, 1.4, 7), m: M4(0.9, 2.2, 0), c: 0x3f8a4a }, { g: cyl(0.3, 0.3, 1.0, 7), m: M4(-0.9, 1.6, 0), c: 0x3f8a4a }, { g: cyl(0.28, 0.28, 1.0, 7), m: new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(0.45, 1.7, 0), c: 0x3f8a4a }]),
  dead: () => merge([{ g: cyl(0.14, 0.4, 4.2, 5), m: M4(0, 2.1, 0), c: 0x3d3128 }, { g: cyl(0.06, 0.15, 2, 4), m: new THREE.Matrix4().makeRotationZ(0.9).setPosition(0.8, 3.2, 0), c: 0x3d3128 }, { g: cyl(0.06, 0.15, 1.7, 4), m: new THREE.Matrix4().makeRotationZ(-0.9).setPosition(-0.7, 2.8, 0), c: 0x3d3128 }]),
  rock: () => merge([{ g: ico(1.1, 0), m: M4(0, 0.5, 0, 1, 0.7, 1), c: 0x8a867e }, { g: ico(0.6, 0), m: M4(0.9, 0.25, 0.3), c: 0x6f6b64 }]),
  obsidian: () => merge([{ g: cone(0.9, 4, 5), m: M4(0, 2, 0), c: 0x1d1a24 }, { g: cone(0.5, 2.6, 5), m: M4(0.9, 1.3, 0.2), c: 0x2b2634 }]),
  bush: () => merge([{ g: ico(0.9, 0), m: M4(0, 0.6, 0, 1, 0.75, 1), c: 0x3a8a34 }, { g: ico(0.6, 0), m: M4(0.7, 0.4, 0.2), c: 0x47a03e }]),
  flower: () => merge([{ g: cyl(0.03, 0.03, 0.5, 4), m: M4(0, 0.25, 0), c: 0x3f8a3a }, { g: ico(0.16, 0), m: M4(0, 0.55, 0), c: 0xffffff }]),
  mushroom: () => merge([{ g: cyl(0.25, 0.3, 1.2, 6), m: M4(0, 0.6, 0), c: 0xe8dcc0 }, { g: new THREE.SphereGeometry(0.9, 8, 5, 0, TAU, 0, Math.PI / 2), m: M4(0, 1.2, 0), c: 0xc4392f }]),
  reed: () => merge([{ g: cyl(0.04, 0.05, 1.8, 4), m: M4(0, 0.9, 0), c: 0x6a8a3a }, { g: cyl(0.04, 0.05, 1.5, 4), m: M4(0.2, 0.75, 0.1), c: 0x7a9a45 }, { g: cyl(0.09, 0.09, 0.4, 5), m: M4(0, 1.8, 0), c: 0x6b4a2b }]),
};
const FLOWER_COLS = [0xff6b8a, 0xffd36b, 0xffffff, 0xb28dff, 0xff9d4d];

export class Colliders {
  constructor() { this.cell = 12; this.map = new Map(); }
  add(x, z, r) { const k = Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell); (this.map.get(k) || this.map.set(k, []).get(k)).push([x, z, r]); }
  near(x, z, m) { const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = this.map.get((cx + i) + ',' + (cz + j)); if (!a) continue; for (const [px, pz, r] of a) if (Math.hypot(x - px, z - pz) < r + m) return true; } return false; }
  // empurra (x,z) para fora de colisões; devolve true se houve contato
  resolve(p, r) {
    let hit = false; const cx = Math.floor(p.x / this.cell), cz = Math.floor(p.z / this.cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = this.map.get(((cx + i)) + ',' + ((cz + j))); if (!a) continue;
      for (const [x, z, rr] of a) { const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz), m = rr + r; if (d < m && d > 1e-4) { p.x = x + dx / d * m; p.z = z + dz / d * m; hit = true; } }
    }
    return hit;
  }
}
export function buildProps(scene, colliders) {
  const rng = mulberry(777), group = new THREE.Group(); scene.add(group);
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const make = (type, count, accept, opt = {}) => {
    const geo = PROP[type](), mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), count);
    mesh.castShadow = !opt.noShadow; mesh.receiveShadow = false; mesh.frustumCulled = false;
    let n = 0, tries = 0;
    while (n < count && tries++ < count * 40) {
      const x = (rng() - 0.5) * (SIZE - 30), z = (rng() - 0.5) * (SIZE - 30), d = Math.hypot(x, z);
      if (d < CITY_R + 7) continue;
      const h = heightAt(x, z); if (h < 0.2) continue;
      if (Math.hypot(x - TITAN_ARENA.x, z - TITAN_ARENA.z) < TITAN_ARENA.r + 4 || Math.hypot(x - DRAGON_ARENA.x, z - DRAGON_ARENA.z) < DRAGON_ARENA.r + 4) continue;
      const w = weights(x, z); if (!accept(w, x, z, h, rng)) continue;
      const s = (opt.s || 1) * (0.75 + rng() * 0.7);
      dummy.position.set(x, h - 0.1, z); dummy.rotation.set(0, rng() * TAU, 0); dummy.scale.set(s, s * (0.9 + rng() * 0.3), s); dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      if (opt.flower) col.setHex(FLOWER_COLS[(rng() * FLOWER_COLS.length) | 0]); else col.setScalar(0.85 + rng() * 0.3);
      mesh.setColorAt(n, col);
      if (opt.r) colliders.add(x, z, opt.r * s);
      n++;
    }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; group.add(mesh); return mesh;
  };
  make('oak', 900, (w, x, z, h, r) => w.forest > 0.7 && r() < 0.55, { r: 0.7, s: 1.1 });
  make('pine', 350, (w, x, z, h, r) => w.forest > 0.7 && r() < 0.3, { r: 0.6, s: 1.1 });
  make('snowpine', 700, (w, x, z, h, r) => w.snow > 0.6 && r() < 0.5, { r: 0.6, s: 1.2 });
  make('cactus', 300, (w, x, z, h, r) => w.desert > 0.7 && r() < 0.25, { r: 0.7 });
  make('dead', 380, (w, x, z, h, r) => (w.swamp > 0.6 || w.volcano > 0.5) && r() < 0.35, { r: 0.5 });
  make('mushroom', 160, (w, x, z, h, r) => w.swamp > 0.6 && r() < 0.2, { r: 0.8, s: 1.2 });
  make('reed', 450, (w, x, z, h, r) => w.swamp > 0.5 && h < 0.8 && r() < 0.6, { noShadow: true });
  make('obsidian', 160, (w, x, z, h, r) => w.volcano > 0.5 && r() < 0.25, { r: 0.7, s: 1.2 });
  make('rock', 520, (w, x, z, h, r) => r() < (w.snow > 0.5 || w.volcano > 0.4 ? 0.22 : 0.1), { r: 1.0, s: 1.3 });
  make('bush', 380, (w, x, z, h, r) => w.forest > 0.7 && r() < 0.35, { noShadow: true });
  make('flower', 900, (w, x, z, h, r) => w.forest > 0.8 && r() < 0.5, { noShadow: true, flower: true });
  return group;
}

/* ---------- Cidade segura ---------- */
export const NPC_SPOTS = {
  merchant: { x: -16, z: 12, face: 0.6, label: 'Mercador Bram' },
  smith: { x: 18, z: 12, face: -0.7, label: 'Ferreira Helga' },
  healer: { x: 0, z: -22, face: 0, label: 'Curandeira Lyra' },
  chronicler: { x: -22, z: -10, face: 1.0, label: 'Cronista Orin' },
  guardian: { x: 22, z: -8, face: -1.0, label: 'Guardião Kael' },
  trainer: { x: 0, z: 26, face: Math.PI, label: 'Mestre Aldric' },
};
export function buildCity(scene, colliders, lights) {
  const g = new THREE.Group(); scene.add(g);
  const mat = (c, e = 0) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, emissive: e ? c : 0x000000, emissiveIntensity: e });
  const add = (geo, m, x, y, z, ry = 0, cast = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = cast; o.receiveShadow = true; g.add(o); return o; };
  // praça
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(CITY_R - 1, 64).rotateX(-Math.PI / 2), mat(COL.plaza)); plaza.position.y = 1.03; plaza.receiveShadow = true; g.add(plaza);
  for (const [r, c] of [[44, 0x9d968a], [30, 0xb7b1a2], [14, 0x8e877b]]) { const ring = new THREE.Mesh(new THREE.RingGeometry(r - 1.1, r, 64).rotateX(-Math.PI / 2), mat(c)); ring.position.y = 1.06; g.add(ring); }
  // cruzamento de caminhos
  for (let i = 0; i < 4; i++) { const p = add(box(8, 0.08, CITY_R - 8), mat(0x8a6f4d), 0, 1.07, 0, i * Math.PI / 2, false); p.position.set(Math.sin(i * Math.PI / 2) * (CITY_R / 2 + 2), 1.07, Math.cos(i * Math.PI / 2) * (CITY_R / 2 + 2)); }
  // fonte
  add(cyl(7, 7.6, 1.2, 20), mat(0xaaa396), 0, 1.6, 0); add(cyl(6.2, 6.2, 0.4, 20), mat(0x3b93d0, 0.25), 0, 2.15, 0, 0, false);
  add(cyl(1.1, 1.4, 4, 10), mat(0xc2bbad), 0, 3.4, 0); add(cyl(3, 1.6, 0.8, 14), mat(0xaaa396), 0, 5.2, 0); add(cyl(2.4, 2.4, 0.3, 14), mat(0x3b93d0, 0.3), 0, 5.65, 0, 0, false);
  add(ico(0.8, 1), mat(0x7ad7ff, 0.9), 0, 6.8, 0, 0, false);
  colliders.add(0, 0, 7.8);
  // muralha com 4 portões
  const gates = [0, Math.PI / 2, Math.PI, Math.PI * 1.5], wallMat = mat(0x9b948a), towerMat = mat(0x8a847a), N = 56, R = CITY_R - 0.5;
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * TAU; let inGate = false; for (const ga of gates) { const d = Math.abs(((a - ga + Math.PI) % TAU + TAU) % TAU - Math.PI); if (d < 0.115) inGate = true; }
    if (inGate) continue;
    const x = Math.sin(a) * R, z = Math.cos(a) * R, len = TAU * R / N + 0.4;
    const w = add(box(len, 4.2, 1.6), wallMat, x, 1 + 2.1, z, a + Math.PI / 2);
    for (let k = -1; k <= 1; k += 2) { const m = add(box(1.1, 0.8, 1.7), wallMat, x + Math.cos(a) * k * len * 0.32, 1 + 4.6, z - Math.sin(a) * k * len * 0.32, a + Math.PI / 2); }
    colliders.add(x, z, 1.9);
  }
  for (const ga of gates) for (const s of [-1, 1]) { // torres nos portões
    const a = ga + s * 0.135, x = Math.sin(a) * R, z = Math.cos(a) * R;
    add(cyl(2.3, 2.6, 9, 10), towerMat, x, 5.5, z); add(cone(3.2, 3.2, 10), mat(0x8a3b2e), x, 11.5, z);
    const torch = add(ico(0.45, 0), mat(0xffa840, 1), x + Math.sin(a) * 2.8, 4.5, z + Math.cos(a) * 2.8, 0, false);
    colliders.add(x, z, 2.7);
  }
  // casas
  const houseCols = [0xc9a36a, 0xb8c1c9, 0xd1b48a, 0xa8b8a0, 0xd6a58a, 0xbfa7c9], roofCols = [0x9a3b2e, 0x3b5f9a, 0x8a5a2e, 0x2e6b4a, 0x7a2e6b, 0x9a7a2e];
  const hp = [[-34, -24, 0.5], [-38, 2, 1.5], [36, -22, -0.5], [38, 4, -1.6], [-30, 30, 2.4], [32, 30, -2.4]];
  hp.forEach(([x, z, ry], i) => {
    const hg = new THREE.Group(); hg.position.set(x, 1, z); hg.rotation.y = ry; g.add(hg);
    const body = new THREE.Mesh(box(9, 5.5, 8), mat(houseCols[i])), roof = new THREE.Mesh(new THREE.ConeGeometry(7.4, 3.8, 4), mat(roofCols[i])), door = new THREE.Mesh(box(1.6, 3, 0.2), mat(0x5b3f26)), win = new THREE.Mesh(box(1.4, 1.4, 0.2), mat(0xffd27a, 0.15));
    body.position.y = 2.75; roof.position.y = 7.4; roof.rotation.y = Math.PI / 4; door.position.set(0, 1.5, 4.05); win.position.set(2.8, 3.2, 4.05); const win2 = win.clone(); win2.position.x = -2.8;
    for (const o of [body, roof]) { o.castShadow = true; o.receiveShadow = true; }
    hg.add(body, roof, door, win, win2); hg.userData.win = [win, win2]; (g.userData.windows ||= []).push(win, win2);
    colliders.add(x, z, 6.2);
  });
  // barracas do mercado
  for (const [x, z, c] of [[-16, 16, 0xc23b3b], [18, 16, 0x3b6fc2]]) {
    for (const [dx, dz] of [[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5]]) add(cyl(0.12, 0.12, 3.2, 5), mat(0x5b3f26), x + dx, 2.6, z + dz);
    add(box(5.4, 0.25, 4), mat(c), x, 4.3, z); add(box(3.6, 1, 1.4), mat(0x8a6f4d), x, 1.55, z - 0.4); colliders.add(x, z - 0.4, 2);
  }
  // postes de luz
  const lampPos = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.26, r = 46; lampPos.push([Math.sin(a) * r, Math.cos(a) * r]); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12, r = 21; lampPos.push([Math.sin(a) * r, Math.cos(a) * r]); }
  (g.userData.lamps = []);
  lampPos.forEach(([x, z], i) => {
    add(cyl(0.12, 0.16, 4.4, 6), mat(0x2e2a26), x, 3.2, z); const bulb = add(ico(0.38, 0), mat(0xffc86a, 0.6), x, 5.6, z, 0, false); g.userData.lamps.push(bulb);
    colliders.add(x, z, 0.3);
    if (i % 3 === 0) { const L = new THREE.PointLight(0xffb066, 0, 26, 1.6); L.position.set(x, 6, z); g.add(L); lights.push(L); }
  });
  // anel rúnico da zona segura
  const rune = new THREE.Mesh(new THREE.RingGeometry(CITY_R - 0.6, CITY_R + 0.4, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  rune.position.y = 1.12; g.add(rune); g.userData.rune = rune;
  // árvores decorativas na praça
  const tg = PROP.oak(), tm = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  for (const [x, z] of [[-10, -34], [10, -34], [-48, -10], [48, -8], [-12, 40], [12, 40]]) { const t = new THREE.Mesh(tg, tm); t.position.set(x, 1, z); t.scale.setScalar(1.3); t.castShadow = true; g.add(t); colliders.add(x, z, 0.9); }
  return g;
}

/* ---------- Arenas dos chefes (ruínas) ---------- */
export function buildArenas(scene, colliders) {
  const g = new THREE.Group(); scene.add(g);
  const stone = new THREE.MeshLambertMaterial({ color: 0x8d887f, flatShading: true });
  for (const a of ARENAS) {
    const dark = a === ARENAS[1];
    const floor = new THREE.Mesh(new THREE.CircleGeometry(a.r - 2, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: dark ? 0x3a2f2f : 0x77726a, flatShading: true }));
    floor.position.set(a.x, a.y + 0.06, a.z); floor.receiveShadow = true; g.add(floor);
    const sym = new THREE.Mesh(new THREE.RingGeometry(a.r * 0.45, a.r * 0.5, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: dark ? 0xff6a2a : 0x7ad7ff, transparent: true, opacity: 0.5 }));
    sym.position.set(a.x, a.y + 0.12, a.z); g.add(sym); a.sym = sym;
    for (let i = 0; i < 12; i++) {
      const ang = i / 12 * TAU, x = a.x + Math.cos(ang) * (a.r - 1), z = a.z + Math.sin(ang) * (a.r - 1), tall = i % 3 !== 0, hgt = tall ? 7 : 3.2;
      const p = new THREE.Mesh(cyl(1.1, 1.3, hgt, 8), stone); p.position.set(x, a.y + hgt / 2, z); p.rotation.z = tall ? 0 : 0.12; p.castShadow = true; g.add(p); colliders.add(x, z, 1.3);
    }
  }
  return g;
}

/* ---------- Céu, luz, nuvens ---------- */
const KEYS = [ // hora, topo, horizonte, intensidade do sol, hemisfério
  [0, 0x050a1c, 0x101a38, 0.0, 0.8], [5, 0x0a1230, 0x2a2f55, 0.0, 0.8], [6.3, 0x4a6fa5, 0xf29e6b, 0.55, 0.55], [8, 0x3f7fd0, 0xa9d4f5, 1.0, 0.85],
  [12, 0x3b82d6, 0xbfe3ff, 1.15, 0.95], [16.5, 0x3f7fd0, 0xb5d6f0, 1.0, 0.85], [18.3, 0x4a4a8a, 0xff7a4d, 0.5, 0.6], [19.6, 0x151a40, 0x5a3a5a, 0.0, 0.7], [21, 0x050a1c, 0x101a38, 0.0, 0.8], [24, 0x050a1c, 0x101a38, 0.0, 0.8],
];
export class Sky {
  constructor(scene, mobile) {
    this.scene = scene; this.top = new THREE.Color(); this.bot = new THREE.Color();
    this.uni = { top: { value: this.top }, bot: { value: this.bot } };
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 14), new THREE.ShaderMaterial({ uniforms: this.uni, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vp;void main(){vp=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 top;uniform vec3 bot;varying vec3 vp;void main(){float t=clamp(vp.y*1.6,0.,1.);gl_FragColor=vec4(mix(bot,top,pow(t,.7)),1.);}' }));
    this.dome.renderOrder = -10; scene.add(this.dome);
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(30, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1b8, fog: false })); scene.add(this.sun);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(20, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false })); scene.add(this.moon);
    const sp = new Float32Array(900 * 3); const r = mulberry(5);
    for (let i = 0; i < 900; i++) { const a = r() * TAU, e = Math.acos(r()), R = 820; sp[i * 3] = Math.sin(e) * Math.cos(a) * R; sp[i * 3 + 1] = Math.cos(e) * R; sp[i * 3 + 2] = Math.sin(e) * Math.sin(a) * R; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(this.stars);
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a5a3a, 0.9); scene.add(this.hemi);
    this.dir = new THREE.DirectionalLight(0xffffff, 1); this.dir.castShadow = false; scene.add(this.dir, this.dir.target);
    this.fog = new THREE.Fog(0x9cc8ee, 60, 340); scene.fog = this.fog;
    // nuvens
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, flatShading: true, fog: false });
    this.clouds = new THREE.Group(); const cr = mulberry(31);
    for (let i = 0; i < (mobile ? 16 : 28); i++) {
      const c = new THREE.Group(); for (let k = 0; k < 4 + (cr() * 3 | 0); k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(9 + cr() * 8, 0), cm); m.position.set((k - 2) * 12 + cr() * 6, cr() * 4, cr() * 8); m.scale.y = 0.55; c.add(m); }
      c.position.set((cr() - 0.5) * 1200, 130 + cr() * 40, (cr() - 0.5) * 1200); this.clouds.add(c);
    }
    scene.add(this.clouds); this.cm = cm; this.lamps = []; this.cityLights = [];
  }
  sample(h) {
    let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
    return { top: new THREE.Color(a[1]).lerp(new THREE.Color(b[1]), t), bot: new THREE.Color(a[2]).lerp(new THREE.Color(b[2]), t), sun: lerp(a[3], b[3], t), hemi: lerp(a[4], b[4], t) };
  }
  update(hour, wx, cam, player, dt, now) {
    const s = this.sample(hour), gray = new THREE.Color(0x6f7782).multiplyScalar(0.25 + 0.75 * s.sun / 1.15);
    const dull = wx.dull; // 0..1 (tempestade/chuva escurecem)
    this.top.copy(s.top).lerp(gray, dull * 0.7); this.bot.copy(s.bot).lerp(gray, dull * 0.8);
    this.dome.position.copy(cam.position);
    const ang = (hour - 6) / 12 * Math.PI, sd = new THREE.Vector3(Math.cos(ang) * 0.9, Math.sin(ang), 0.45).normalize(), md = sd.clone().multiplyScalar(-1);
    this.sun.position.copy(cam.position).addScaledVector(sd, 780); this.moon.position.copy(cam.position).addScaledVector(md, 780);
    this.sun.visible = sd.y > -0.1; this.moon.visible = md.y > -0.1;
    const night = clamp(1 - s.sun * 1.6, 0, 1);
    this.stars.material.opacity = clamp(night * (1 - dull), 0, 1); this.stars.position.copy(cam.position);
    const lightDir = sd.y > 0 ? sd : md;
    this.dir.position.copy(player).addScaledVector(lightDir, 90); this.dir.target.position.copy(player);
    this.dir.color.set(sd.y > 0 ? new THREE.Color(0xfff0d8).lerp(new THREE.Color(0xff9a5a), clamp(1 - sd.y * 2.2, 0, 1)) : 0x9fb4ff);
    this.dir.intensity = (sd.y > 0 ? Math.max(s.sun * 1.05, 0.12) : 0.5) * (1 - dull * 0.55);
    this.hemi.intensity = s.hemi * (1 - dull * 0.25) * 0.95; this.hemi.color.copy(this.top).lerp(new THREE.Color(0xffffff), 0.5); this.hemi.groundColor.set(0x3a4a2e).multiplyScalar(0.8 + s.sun * 0.3);
    this.fog.color.copy(this.bot); this.fog.near = lerp(60, 8, wx.fogK); this.fog.far = lerp(340, 110, Math.max(wx.fogK, dull * 0.5));
    this.cm.color.copy(new THREE.Color(0xffffff)).multiplyScalar(0.35 + 0.65 * s.sun / 1.1).lerp(new THREE.Color(0x667078), dull * 0.6);
    this.cm.opacity = 0.75 + dull * 0.2;
    for (const c of this.clouds.children) { c.position.x += dt * (3 + wx.wind * 6); if (c.position.x - cam.position.x > 650) c.position.x -= 1300; }
    this.clouds.position.set(Math.floor(cam.position.x / 1300) * 0, 0, 0);
    this.night = night; return night;
  }
}

/* ---------- Clima ---------- */
export class Weather {
  constructor(scene, mobile) {
    this.kind = 'clear'; this.k = 0; this.target = 0; this.next = 40; this.dull = 0; this.fogK = 0; this.wind = 0.3; this.flash = 0; this.nextStrike = 0;
    this.nDrop = mobile ? 900 : 2200; const p = new Float32Array(this.nDrop * 6), v = new Float32Array(this.nDrop);
    for (let i = 0; i < this.nDrop; i++) { const x = rand(-40, 40), y = rand(0, 40), z = rand(-40, 40); p.set([x, y, z, x, y - 1.2, z], i * 6); v[i] = rand(0.7, 1.2); }
    this.vel = v; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaecbe8, transparent: true, opacity: 0.5, fog: false })); this.rain.frustumCulled = false; scene.add(this.rain);
    const sp = new Float32Array(this.nDrop * 3); for (let i = 0; i < this.nDrop; i++) sp.set([rand(-40, 40), rand(0, 40), rand(-40, 40)], i * 3);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.9 })); this.snow.frustumCulled = false; scene.add(this.snow);
    this.rain.visible = this.snow.visible = false;
  }
  set(kind) { this.kind = kind; this.target = kind === 'clear' ? 0 : 1; }
  update(dt, cam, biome, hour, onThunder) {
    this.next -= dt;
    if (this.next <= 0) { const r = Math.random(); this.set(r < 0.5 ? 'clear' : r < 0.72 ? 'rain' : r < 0.84 ? 'storm' : r < 0.94 ? 'fog' : 'clear'); this.next = 70 + Math.random() * 110; this.onChange && this.onChange(this.kind); }
    this.k += clamp(this.target - this.k, -dt * 0.15, dt * 0.15);
    const wet = (this.kind === 'rain' || this.kind === 'storm') ? this.k : 0, fogw = this.kind === 'fog' ? this.k : 0;
    this.dull = lerp(this.dull, (this.kind === 'storm' ? 0.9 : this.kind === 'rain' ? 0.55 : this.kind === 'fog' ? 0.3 : 0) * this.k, 0.05);
    this.fogK = lerp(this.fogK, fogw * 0.8 + (biome === 'swamp' ? 0.25 : 0), 0.03); this.wind = this.kind === 'storm' ? 1 : this.kind === 'rain' ? 0.6 : 0.25;
    const snowy = biome === 'snow', R = this.rain, S = this.snow;
    R.visible = wet > 0.05 && !snowy; S.visible = (wet > 0.05 && snowy) || (biome === 'snow' && this.kind === 'clear' && false);
    R.material.opacity = 0.15 + wet * 0.45;
    const ptr = (obj, fall, drift) => {
      const a = obj.geometry.attributes.position, arr = a.array, stride = obj === R ? 6 : 3, n = this.nDrop;
      for (let i = 0; i < n; i++) {
        const o = i * stride, dy = fall * this.vel[i] * dt, dx = drift * dt;
        for (let k = 0; k < stride; k += 3) { arr[o + k] -= dx; arr[o + k + 1] -= dy; }
        if (arr[o + 1] < cam.position.y - 12) { const x = cam.position.x + rand(-40, 40), z = cam.position.z + rand(-40, 40), y = cam.position.y + rand(12, 36); arr[o] = x; arr[o + 1] = y; arr[o + 2] = z; if (stride === 6) { arr[o + 3] = x; arr[o + 4] = y - 1.2; arr[o + 5] = z; } }
      }
      a.needsUpdate = true;
    };
    if (R.visible) ptr(R, 38, 5 * this.wind); if (S.visible) ptr(S, 4, 1.5);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    if (this.kind === 'storm' && this.k > 0.6 && hour != null) { this.nextStrike -= dt; if (this.nextStrike <= 0) { this.nextStrike = 5 + Math.random() * 12; this.flash = 1; onThunder && onThunder(); } }
    return { wet, snowy };
  }
}
