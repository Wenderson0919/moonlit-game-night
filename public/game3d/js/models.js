// Modelos low-poly procedurais: heróis, NPCs, monstros, chefes, montaria, partículas.
import * as THREE from './three.module.min.js';
import { TAU, clamp, lerp, rand } from './util.js';

const matCache = new Map();
export const mat = (c, e = 0) => { const k = c + ':' + e; if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color: c, flatShading: true, emissive: e ? c : 0, emissiveIntensity: e })); return matCache.get(k); };
const geoCache = new Map();
const boxG = (w, h, d) => { const k = w + 'x' + h + 'x' + d; if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d)); return geoCache.get(k); };
export function B(parent, w, h, d, c, x = 0, y = 0, z = 0, e = 0) { const m = new THREE.Mesh(boxG(w, h, d), mat(c, e)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function S(parent, r, c, x = 0, y = 0, z = 0, e = 0, sy = 1, detail = 1) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(c, e)); m.position.set(x, y, z); m.scale.y = sy; m.castShadow = true; parent.add(m); return m; }
function C(parent, rt, rb, h, c, x = 0, y = 0, z = 0, seg = 6, e = 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c, e)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function K(parent, r, h, c, x = 0, y = 0, z = 0, seg = 6, e = 0) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(c, e)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

/* ---------- Herói / NPC humanoide ---------- */
export const CLASSES = {
  warrior: { name: 'Guerreiro', icon: '⚔️', desc: 'Resistente, ataca de perto com espada. Giro, investida e grito de guerra.', skin: 0xf0c59a, shirt: 0x8d99a6, pants: 0x4a4f5a, hair: 0x4b2e1a, color: '#ff9d5c' },
  mage: { name: 'Mago', icon: '🔮', desc: 'Frágil, mas devastador à distância. Bola de fogo, nova de gelo e raio.', skin: 0xf3d2b0, shirt: 0x5b3fa0, pants: 0x3a2a68, hair: 0xe8e8f0, color: '#8fa7ff' },
  archer: { name: 'Arqueiro', icon: '🏹', desc: 'Ágil e preciso. Flechas, chuva de flechas e armadilha explosiva.', skin: 0xe8b98c, shirt: 0x3f7a45, pants: 0x5a4630, hair: 0x2b1b10, color: '#7ddc6f' },
};
export function makeHumanoid(o) {
  const g = new THREE.Group(), P = {};
  P.legL = pivot(g, -0.18, 0.9, 0); P.legR = pivot(g, 0.18, 0.9, 0);
  B(P.legL, 0.3, 0.9, 0.32, o.pants, 0, -0.45, 0); B(P.legR, 0.3, 0.9, 0.32, o.pants, 0, -0.45, 0);
  B(P.legL, 0.32, 0.18, 0.4, o.boots || 0x3b2a1e, 0, -0.86, 0.04); B(P.legR, 0.32, 0.18, 0.4, o.boots || 0x3b2a1e, 0, -0.86, 0.04);
  P.torso = pivot(g, 0, 0.9, 0); B(P.torso, 0.74, 0.85, 0.42, o.shirt, 0, 0.45, 0);
  if (o.belt !== false) B(P.torso, 0.78, 0.12, 0.46, o.belt || 0x4a3220, 0, 0.05, 0);
  P.head = pivot(P.torso, 0, 0.95, 0); B(P.head, 0.44, 0.44, 0.44, o.skin, 0, 0.22, 0);
  B(P.head, 0.07, 0.07, 0.02, 0x1a1a22, -0.1, 0.26, 0.225); B(P.head, 0.07, 0.07, 0.02, 0x1a1a22, 0.1, 0.26, 0.225);
  if (o.hair !== null) { B(P.head, 0.48, 0.14, 0.48, o.hair, 0, 0.46, 0); B(P.head, 0.48, 0.3, 0.1, o.hair, 0, 0.3, -0.2); }
  P.armL = pivot(P.torso, -0.5, 0.82, 0); P.armR = pivot(P.torso, 0.5, 0.82, 0);
  B(P.armL, 0.22, 0.72, 0.24, o.sleeve || o.shirt, 0, -0.34, 0); B(P.armR, 0.22, 0.72, 0.24, o.sleeve || o.shirt, 0, -0.34, 0);
  B(P.armL, 0.2, 0.2, 0.22, o.skin, 0, -0.76, 0); B(P.armR, 0.2, 0.2, 0.22, o.skin, 0, -0.76, 0);
  if (o.cape) { P.cape = pivot(P.torso, 0, 0.85, -0.24); B(P.cape, 0.66, 1.05, 0.06, o.cape, 0, -0.52, -0.02); }
  if (o.shoulders) { B(P.torso, 0.36, 0.16, 0.5, o.shoulders, -0.5, 0.9, 0); B(P.torso, 0.36, 0.16, 0.5, o.shoulders, 0.5, 0.9, 0); }
  if (o.hat === 'wizard') { K(P.head, 0.42, 0.9, 0x4a2f8a, 0, 0.9, 0, 6); C(P.head, 0.6, 0.6, 0.06, 0x4a2f8a, 0, 0.5, 0, 8); }
  if (o.hat === 'hood') { B(P.head, 0.52, 0.5, 0.52, 0x2f6b3a, 0, 0.26, -0.02); B(P.head, 0.4, 0.38, 0.1, o.skin, 0, 0.22, 0.2); }
  if (o.hat === 'helm') { B(P.head, 0.5, 0.3, 0.5, 0x9aa5b1, 0, 0.42, 0); B(P.head, 0.06, 0.3, 0.52, 0xc23b3b, 0, 0.62, 0); }
  if (o.hat === 'straw') { C(P.head, 0.55, 0.55, 0.05, 0xd8b560, 0, 0.5, 0, 10); C(P.head, 0.25, 0.28, 0.22, 0xd8b560, 0, 0.6, 0, 8); }
  if (o.hat === 'crown') { C(P.head, 0.26, 0.28, 0.2, 0xffd36b, 0, 0.55, 0, 6, 0.3); }
  if (o.apron) B(P.torso, 0.6, 0.7, 0.08, o.apron, 0, 0.35, 0.25);
  if (o.beard) B(P.head, 0.4, 0.3, 0.1, o.beard, 0, 0.05, 0.22);
  g.userData.parts = P; g.userData.o = o; g.userData.phase = rand(0, 6);
  return g;
}
export function addWeapon(model, kind, tier = 0) {
  const P = model.userData.parts; if (P.weapon) P.weapon.parent.remove(P.weapon);
  const w = new THREE.Group(), bladeC = [0xc9d1d9, 0x9fe0ff, 0xffd36b, 0xff7ad9][clamp(tier, 0, 3)], glow = tier >= 1 ? 0.35 : 0;
  if (kind === 'sword') { B(w, 0.1, 1.15, 0.04, bladeC, 0, 0.65, 0, glow); B(w, 0.34, 0.08, 0.1, 0x8a6a2e, 0, 0.05, 0); B(w, 0.08, 0.3, 0.08, 0x4a3220, 0, -0.14, 0); w.rotation.x = Math.PI / 2; w.position.set(0, -0.8, 0.1); }
  if (kind === 'staff') { C(w, 0.05, 0.06, 1.9, 0x6b4a2b, 0, 0.55, 0, 6); S(w, 0.2, [0x8fa7ff, 0xff7a4a, 0x7affc8, 0xff7ad9][clamp(tier, 0, 3)], 0, 1.6, 0, 0.9, 1, 0); w.position.set(0, -0.76, 0.05); w.userData.orb = w.children[1]; }
  if (kind === 'bow') { const arc = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 5, 14, Math.PI), mat(0x7a4a22)); arc.rotation.z = -Math.PI / 2; arc.position.set(0, 0.0, 0); arc.castShadow = true; w.add(arc); B(w, 0.01, 1.1, 0.01, 0xe8e8e8, -0.0, 0.0, 0); w.children[1].position.x = 0.02; w.rotation.y = Math.PI / 2; w.position.set(0, -0.76, 0.1); }
  P.armR.add(w); P.weapon = w; return w;
}
// animação de caminhada/ataque. s = {speed (0..1), t, atk (0..1 progresso, -1 = nenhum), kind, mounted}
export function animateHumanoid(model, s) {
  const P = model.userData.parts, sw = Math.sin(s.t * 9) * 0.9 * s.speed;
  if (s.mounted) { P.legL.rotation.x = -1.2; P.legR.rotation.x = -1.2; P.legL.rotation.z = 0.35; P.legR.rotation.z = -0.35; }
  else { P.legL.rotation.x = sw; P.legR.rotation.x = -sw; P.legL.rotation.z = P.legR.rotation.z = 0; }
  P.armL.rotation.x = -sw * 0.8; P.armR.rotation.x = sw * 0.8; P.armL.rotation.z = 0; P.armR.rotation.z = 0;
  P.torso.position.y = 0.9 + Math.abs(Math.sin(s.t * 9)) * 0.05 * s.speed; P.torso.rotation.y = 0; P.torso.rotation.x = 0;
  if (s.atk >= 0 && s.atk <= 1) {
    const a = s.atk, e = Math.sin(a * Math.PI);
    if (s.kind === 'sword') { P.armR.rotation.x = lerp(-2.4, 1.2, a); P.armR.rotation.z = -0.3; P.torso.rotation.y = lerp(0.5, -0.6, a); }
    else if (s.kind === 'bow') { P.armR.rotation.x = -1.5; P.armL.rotation.x = -1.5; P.torso.rotation.y = 0.4 * (1 - a); }
    else { P.armR.rotation.x = -1.4 - e * 0.5; P.torso.rotation.x = -e * 0.15; }
  } else if (s.cast > 0) { P.armL.rotation.x = -2.6; P.armR.rotation.x = -2.6; P.armL.rotation.z = 0.4; P.armR.rotation.z = -0.4; }
  if (P.cape) P.cape.rotation.x = 0.15 + s.speed * 0.5 + Math.sin(s.t * 5) * 0.05;
  const orb = P.weapon && P.weapon.userData.orb; if (orb) orb.position.y = 1.6 + Math.sin(s.t * 3) * 0.06;
}

export const NPC_LOOKS = {
  merchant: { skin: 0xe8b98c, shirt: 0x8a3b2e, pants: 0x4a3a2a, hair: 0x3a2a1a, hat: 'straw', apron: 0xe8dcc0, beard: 0x3a2a1a, tag: '🛒' },
  smith: { skin: 0xd9a37a, shirt: 0x5a5a62, pants: 0x3a3a42, hair: 0x7a3a1a, apron: 0x4a3220, shoulders: 0x6a6a72, tag: '⚒️' },
  healer: { skin: 0xf3d2b0, shirt: 0xf0f0f0, pants: 0x9fd6c0, hair: 0xe8c36b, cape: 0x6fc7a0, tag: '✚' },
  chronicler: { skin: 0xe0b896, shirt: 0x3a4f7a, pants: 0x2a3a5a, hair: 0xc8c8d0, hat: 'wizard', beard: 0xc8c8d0, tag: '📜' },
  guardian: { skin: 0xd9a37a, shirt: 0xb8902e, pants: 0x4a4f5a, hair: null, hat: 'helm', cape: 0x8a2e2e, shoulders: 0xd8b24a, tag: '🛡' },
  trainer: { skin: 0xd0a07a, shirt: 0x8a5a2e, pants: 0x3a3a3a, hair: 0x1a1a1a, hat: 'crown', cape: 0x2e3a8a, tag: '⭐' },
};

/* ---------- Montaria ---------- */
export function makeHorse(coat = 0x8a5a32) {
  const g = new THREE.Group(), P = { legs: [] };
  B(g, 0.9, 0.95, 1.9, coat, 0, 1.25, 0); B(g, 0.5, 0.9, 0.5, coat, 0, 1.9, 0.9).rotation.x = -0.5;
  P.head = pivot(g, 0, 2.3, 1.2); B(P.head, 0.36, 0.38, 0.8, coat, 0, 0, 0.3); B(P.head, 0.38, 0.3, 0.1, 0x2b1b10, 0, -0.05, 0.72);
  B(g, 0.1, 0.3, 0.1, coat, 0.14, 2.6, 1.1); B(g, 0.1, 0.3, 0.1, coat, -0.14, 2.6, 1.1);
  B(g, 0.14, 0.9, 0.22, 0x2b1b10, 0, 2.25, 0.62);
  P.tail = pivot(g, 0, 1.6, -0.95); B(P.tail, 0.18, 1.0, 0.18, 0x2b1b10, 0, -0.5, -0.1);
  B(g, 0.95, 0.12, 0.8, 0x7a2e2e, 0, 1.76, -0.05); B(g, 0.9, 0.1, 0.5, 0xd8b24a, 0, 1.64, 0.4, 0.2);
  for (const [x, z] of [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]]) { const l = pivot(g, x, 0.85, z); B(l, 0.22, 0.85, 0.24, coat, 0, -0.42, 0); B(l, 0.24, 0.16, 0.26, 0x2b1b10, 0, -0.8, 0); P.legs.push(l); }
  g.userData.parts = P; return g;
}
export function animateHorse(h, speed, t) { const P = h.userData.parts; P.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 11 + (i % 2 ? Math.PI : 0) + (i > 1 ? 1 : 0)) * 0.9 * speed; }); P.tail.rotation.x = 0.3 + Math.sin(t * 6) * 0.15 * speed; P.head.rotation.x = Math.sin(t * 5.5) * 0.08 * speed; h.position.y = Math.abs(Math.sin(t * 11)) * 0.12 * speed; }

/* ---------- Monstros ---------- */
function quad(g, body, w, h, d, legC, legH, headSz, headC, y0 = 0) {
  const P = { legs: [] };
  B(g, w, h, d, body, 0, legH + h / 2 + y0, 0);
  P.head = pivot(g, 0, legH + h * 0.8 + y0, d / 2); B(P.head, headSz, headSz * 0.9, headSz * 1.1, headC, 0, 0, headSz * 0.4);
  for (const [x, z] of [[-w / 2.6, d / 2.6], [w / 2.6, d / 2.6], [-w / 2.6, -d / 2.6], [w / 2.6, -d / 2.6]]) { const l = pivot(g, x, legH + y0, z); B(l, 0.18, legH, 0.2, legC, 0, -legH / 2, 0); P.legs.push(l); }
  return P;
}
export const MOB_BUILD = {
  wolf(g, v) { const c = v === 'snow' ? 0xe8eef2 : 0x6f7378, P = quad(g, c, 0.55, 0.55, 1.1, c, 0.55, 0.42, c); B(P.head, 0.14, 0.14, 0.2, 0x2a2a2a, 0, -0.02, 0.9); B(P.head, 0.1, 0.18, 0.08, c, -0.14, 0.28, 0); B(P.head, 0.1, 0.18, 0.08, c, 0.14, 0.28, 0); B(P.head, 0.06, 0.06, 0.02, 0xff5a3a, -0.1, 0.08, 0.5, 1); B(P.head, 0.06, 0.06, 0.02, 0xff5a3a, 0.1, 0.08, 0.5, 1);
    P.tail = pivot(g, 0, 1.0, -0.55); B(P.tail, 0.14, 0.14, 0.7, c, 0, 0, -0.3); return { P, r: 0.7, h: 1.2 }; },
  boar(g) { const c = 0x6b4a32, P = quad(g, c, 0.8, 0.75, 1.2, 0x4a3222, 0.45, 0.55, c); B(P.head, 0.2, 0.2, 0.1, 0xd8c8a0, -0.22, -0.1, 0.62); B(P.head, 0.2, 0.2, 0.1, 0xd8c8a0, 0.22, -0.1, 0.62); B(P.head, 0.06, 0.06, 0.02, 0xffd36b, -0.14, 0.1, 0.62, 1); B(P.head, 0.06, 0.06, 0.02, 0xffd36b, 0.14, 0.1, 0.62, 1); B(g, 0.3, 0.12, 0.7, 0x4a3222, 0, 1.3, 0.0); return { P, r: 0.85, h: 1.3 }; },
  slime(g, v) { const c = v === 'swamp' ? 0x6aa84a : 0x4acb7a; const b = S(g, 0.7, c, 0, 0.55, 0, 0.15, 0.8, 1); b.material = new THREE.MeshLambertMaterial({ color: c, flatShading: true, transparent: true, opacity: 0.85, emissive: c, emissiveIntensity: 0.15 }); B(g, 0.12, 0.2, 0.05, 0x10331a, -0.2, 0.7, 0.55); B(g, 0.12, 0.2, 0.05, 0x10331a, 0.2, 0.7, 0.55); return { P: { body: b }, r: 0.7, h: 1.1 }; },
  skeleton(g) { const m = makeHumanoid({ skin: 0xe8e4d0, shirt: 0xd8d4c0, pants: 0xc8c4b0, hair: null, belt: false, boots: 0xc8c4b0 }); g.add(m); addWeapon(m, 'sword'); g.userData.humanoid = m; return { P: {}, r: 0.55, h: 2.0, hum: m }; },
  yeti(g) { const m = makeHumanoid({ skin: 0x9fd0e8, shirt: 0xf2f6f8, pants: 0xe8eef2, hair: 0xffffff, belt: false, boots: 0xf2f6f8 }); m.scale.setScalar(1.45); g.add(m); return { P: {}, r: 0.9, h: 2.8, hum: m }; },
  scorpion(g) { const c = 0xb5602a, P = quad(g, c, 0.8, 0.35, 1.0, 0x8a4a1e, 0.3, 0.35, c); B(g, 0.35, 0.35, 0.4, c, -0.55, 0.4, 0.6); B(g, 0.35, 0.35, 0.4, c, 0.55, 0.4, 0.6); P.tail = pivot(g, 0, 0.7, -0.5); B(P.tail, 0.22, 0.22, 0.6, c, 0, 0.3, -0.2); B(P.tail, 0.2, 0.5, 0.2, c, 0, 0.7, -0.45); B(P.tail, 0.1, 0.3, 0.1, 0xffd36b, 0, 1.0, -0.2, 0.6); return { P, r: 0.8, h: 1.2 }; },
  golem(g, v) { const c = v === 'desert' ? 0xc8a45a : 0x8a8a92, m = makeHumanoid({ skin: c, shirt: c, pants: 0xa8844a, hair: null, belt: false, boots: c, shoulders: 0x6e6e76 }); m.scale.set(1.7, 1.55, 1.7); g.add(m); B(m.userData.parts.head, 0.1, 0.06, 0.02, 0xffa83a, 0, 0.26, 0.23, 1); return { P: {}, r: 1.0, h: 3.0, hum: m }; },
  frog(g) { const c = 0x4f8a3a, P = quad(g, c, 0.9, 0.6, 0.9, 0x3d6e2c, 0.3, 0.7, c); S(P.head, 0.17, 0xffe14a, -0.22, 0.32, 0.1, 0.5, 1, 0); S(P.head, 0.17, 0xffe14a, 0.22, 0.32, 0.1, 0.5, 1, 0); B(P.head, 0.6, 0.1, 0.3, 0xc2504a, 0, -0.15, 0.45); P.head.rotation.x = 0; return { P, r: 0.8, h: 1.2 }; },
  imp(g) { const m = makeHumanoid({ skin: 0xd8452a, shirt: 0x8a2a1a, pants: 0x5a1a10, hair: null, belt: false, boots: 0x3a1008 }); m.scale.setScalar(0.85); g.add(m); const H = m.userData.parts.head; K(H, 0.07, 0.3, 0x2a1008, -0.17, 0.52, 0, 4); K(H, 0.07, 0.3, 0x2a1008, 0.17, 0.52, 0, 4); B(H, 0.1, 0.05, 0.02, 0xffe14a, -0.1, 0.27, 0.23, 1); B(H, 0.1, 0.05, 0.02, 0xffe14a, 0.1, 0.27, 0.23, 1); return { P: {}, r: 0.6, h: 1.7, hum: m }; },
  magma(g) { const m = makeHumanoid({ skin: 0x2a2024, shirt: 0x2a2024, pants: 0x3a2a2e, hair: null, belt: false, boots: 0x2a2024, shoulders: 0xff5a14 }); m.scale.set(1.9, 1.7, 1.9); g.add(m); const T = m.userData.parts.torso; B(T, 0.4, 0.5, 0.05, 0xff6a1a, 0, 0.45, 0.24, 1.2); B(m.userData.parts.head, 0.3, 0.06, 0.02, 0xffa83a, 0, 0.26, 0.23, 1.2); return { P: {}, r: 1.1, h: 3.4, hum: m }; },
};
export function makeMob(type, variant) {
  const g = new THREE.Group(), res = MOB_BUILD[type](g, variant); g.userData.parts = res.P; g.userData.hum = res.hum; g.userData.r = res.r; g.userData.h = res.h; g.userData.type = type; g.userData.phase = rand(0, 6); return g;
}
export function animateMob(g, speed, t, atk) {
  const u = g.userData, P = u.parts, ph = u.phase + t;
  if (u.hum) { animateHumanoid(u.hum, { speed, t: ph, atk: atk >= 0 ? atk : -1, kind: 'sword' }); return; }
  if (P.legs) P.legs.forEach((l, i) => { l.rotation.x = Math.sin(ph * 10 + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.2 : 0)) * 0.8 * speed; });
  if (P.tail) P.tail.rotation.x = Math.sin(ph * 6) * 0.2 + (u.type === 'scorpion' ? -0.3 - (atk >= 0 ? Math.sin(atk * Math.PI) * 1.2 : 0) : 0);
  if (P.head && atk >= 0) P.head.rotation.x = Math.sin(atk * Math.PI) * 0.7;
  else if (P.head) P.head.rotation.x = 0;
  if (P.body) { const b = Math.abs(Math.sin(ph * (speed > 0.1 ? 6 : 2.5))); P.body.scale.set(1 + (1 - b) * 0.12, 0.8 + b * 0.35, 1 + (1 - b) * 0.12); P.body.position.y = 0.45 + b * 0.35; }
}

/* ---------- Chefes ---------- */
export function makeTitan() {
  const g = new THREE.Group(), P = {}, rock = 0x7d8088, moss = 0x4f7a3c, glow = 0x7ad7ff;
  P.legL = pivot(g, -0.9, 2.6, 0); P.legR = pivot(g, 0.9, 2.6, 0); B(P.legL, 1.3, 2.7, 1.4, rock, 0, -1.3, 0); B(P.legR, 1.3, 2.7, 1.4, rock, 0, -1.3, 0); B(P.legL, 1.5, 0.5, 1.8, 0x5a5d64, 0, -2.6, 0.2); B(P.legR, 1.5, 0.5, 1.8, 0x5a5d64, 0, -2.6, 0.2);
  P.torso = pivot(g, 0, 2.6, 0); B(P.torso, 3.6, 3.4, 2.2, rock, 0, 1.8, 0); B(P.torso, 3.7, 0.5, 2.3, moss, 0, 3.4, 0); B(P.torso, 1.4, 1.4, 0.3, glow, 0, 2.0, 1.1, 1.0);
  for (let i = 0; i < 4; i++) B(P.torso, 0.5, 0.5, 0.35, glow, -1.2 + i * 0.8, 3.0 - (i % 2) * 0.1, 1.12, 0.8);
  P.head = pivot(P.torso, 0, 3.7, 0.1); B(P.head, 1.5, 1.3, 1.4, 0x8d9098, 0, 0.6, 0); B(P.head, 0.35, 0.2, 0.1, glow, -0.4, 0.7, 0.72, 1.4); B(P.head, 0.35, 0.2, 0.1, glow, 0.4, 0.7, 0.72, 1.4); B(P.head, 1.1, 0.2, 0.2, moss, 0, 1.3, 0.2);
  P.armL = pivot(P.torso, -2.3, 3.2, 0); P.armR = pivot(P.torso, 2.3, 3.2, 0);
  for (const a of [P.armL, P.armR]) { B(a, 1.1, 2.8, 1.2, rock, 0, -1.4, 0); B(a, 1.5, 1.4, 1.5, 0x8d9098, 0, -3.1, 0); }
  g.scale.setScalar(1.25); g.userData.parts = P; g.userData.r = 3.2; g.userData.h = 10.5; return g;
}
export function makeDragon() {
  const g = new THREE.Group(), P = {}, sc = 0xa8321e, belly = 0xe8a050, dark = 0x5a1a10;
  P.body = pivot(g, 0, 3.2, 0); B(P.body, 2.4, 2.2, 5.2, sc, 0, 0, 0); B(P.body, 1.8, 0.6, 4.6, belly, 0, -0.9, 0.1);
  for (let i = 0; i < 6; i++) K(P.body, 0.3, 0.8, dark, 0, 1.3, -2 + i * 0.8, 4);
  P.neck = pivot(P.body, 0, 0.7, 2.4); B(P.neck, 1.1, 1.1, 2.2, sc, 0, 0.8, 0.8).rotation.x = -0.5;
  P.head = pivot(P.neck, 0, 1.7, 1.6); B(P.head, 1.4, 1.1, 1.8, sc, 0, 0, 0.5); B(P.head, 1.0, 0.5, 1.0, 0xb8452a, 0, -0.35, 1.2); B(P.head, 0.25, 0.2, 0.1, 0xffe14a, -0.45, 0.35, 0.95, 1.6); B(P.head, 0.25, 0.2, 0.1, 0xffe14a, 0.45, 0.35, 0.95, 1.6);
  K(P.head, 0.2, 0.9, 0xe8dcc0, -0.5, 0.75, -0.1, 4); K(P.head, 0.2, 0.9, 0xe8dcc0, 0.5, 0.75, -0.1, 4);
  P.tail = pivot(P.body, 0, 0, -2.5); B(P.tail, 0.9, 0.9, 3.4, sc, 0, 0, -1.4); B(P.tail, 0.5, 0.5, 2.4, sc, 0, 0, -4); K(P.tail, 0.5, 1.2, dark, 0, 0, -5.8, 4).rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) { const w = pivot(P.body, s * 1.1, 0.8, 0.2); const wing = new THREE.Group(); B(wing, 4.8, 0.14, 2.4, 0x7a2416, s * 2.4, 0, 0); B(wing, 2.6, 0.14, 1.6, 0x7a2416, s * 1.4, 0, -1.6); B(wing, 4.8, 0.2, 0.2, dark, s * 2.4, 0.05, 1.1); w.add(wing); P[s < 0 ? 'wingL' : 'wingR'] = w; }
  for (const x of [-1.1, 1.1]) { const l = pivot(g, x, 2.4, 1.4); B(l, 0.7, 2.4, 0.8, sc, 0, -1.2, 0); B(l, 0.9, 0.3, 1.2, dark, 0, -2.4, 0.2); }
  g.scale.setScalar(1.15); g.userData.parts = P; g.userData.r = 3.2; g.userData.h = 7; return g;
}

/* ---------- Etiquetas e barras de vida ---------- */
export function makeLabel(text, color = '#ffffff', sub = '') {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.font = 'bold 26px Inter, Arial, sans-serif'; x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.85)'; x.fillStyle = color;
  const full = sub ? text + '  ' + sub : text; x.strokeText(full, 128, 40); x.fillText(full, 128, 40);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false })); sp.scale.set(4, 1, 1); sp.renderOrder = 20; return sp;
}
export function makeBar(w = 2.2, color = 0xe5483a) {
  const g = new THREE.Group(), bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x101418, depthTest: false, transparent: true, opacity: 0.85, fog: false })), fill = new THREE.Sprite(new THREE.SpriteMaterial({ color, depthTest: false, fog: false }));
  bg.scale.set(w + 0.1, 0.22, 1); fill.scale.set(w, 0.14, 1); bg.center.set(0.5, 0.5); fill.center.set(0, 0.5); fill.position.x = -w / 2; bg.renderOrder = 21; fill.renderOrder = 22;
  g.add(bg, fill); g.userData = { fill, w }; g.setHp = (r) => { fill.scale.x = Math.max(0.001, w * clamp(r, 0, 1)); }; return g;
}

/* ---------- Partículas (shader de pontos) ---------- */
export class Particles {
  constructor(scene, max = 700) {
    this.max = max; this.n = 0; this.p = new Float32Array(max * 3); this.c = new Float32Array(max * 3); this.sz = new Float32Array(max); this.al = new Float32Array(max);
    this.v = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max); this.grav = new Float32Array(max); this.s0 = new Float32Array(max);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.c, 3)); g.setAttribute('size', new THREE.BufferAttribute(this.sz, 1)); g.setAttribute('alpha', new THREE.BufferAttribute(this.al, 1));
    this.mesh = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { scale: { value: 600 } },
      vertexShader: 'attribute float size;attribute float alpha;attribute vec3 color;varying float a;varying vec3 c;uniform float scale;void main(){a=alpha;c=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*scale/-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying float a;varying vec3 c;void main(){float d=length(gl_PointCoord-.5)*2.;float f=smoothstep(1.,.2,d);gl_FragColor=vec4(c,a*f);}' }));
    this.mesh.frustumCulled = false; scene.add(this.mesh); this.g = g;
  }
  spawn(x, y, z, vx, vy, vz, color, size, life, grav = 0) {
    const i = this.n < this.max ? this.n++ : (Math.random() * this.max) | 0, c = this._c || (this._c = new THREE.Color()); c.set(color);
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z; this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.c[i * 3] = c.r; this.c[i * 3 + 1] = c.g; this.c[i * 3 + 2] = c.b; this.s0[i] = size; this.sz[i] = size; this.life[i] = life; this.age[i] = 0; this.grav[i] = grav; this.al[i] = 1;
  }
  burst(x, y, z, color, n = 12, speed = 4, size = 0.5, life = 0.6, grav = 6) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), e = rand(-0.2, 1), s = rand(0.3, 1) * speed; this.spawn(x, y, z, Math.cos(a) * s * (1 - e * 0.5), e * s + 1, Math.sin(a) * s * (1 - e * 0.5), color, size * rand(0.6, 1.2), life * rand(0.6, 1.1), grav); } }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) { this.al[i] = 0; this.sz[i] = 0; continue; }
      this.age[i] += dt; const t = this.age[i] / this.life[i];
      this.v[i * 3 + 1] -= this.grav[i] * dt; this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      this.al[i] = 1 - t; this.sz[i] = this.s0[i] * (1 - t * 0.6);
    }
    const a = this.g.attributes; a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = true;
  }
}
