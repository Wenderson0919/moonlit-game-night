// Combate: inimigos, habilidades, projéteis, telegrafias, chefes e saque.
import * as THREE from './three.module.min.js';
import { clamp, lerp, rand, pick, TAU, angDiff } from './util.js';
import { heightAt, biomeAt, SEA, CITY_R, HALF, TITAN_ARENA, DRAGON_ARENA } from './world.js';
import { makeMob, animateMob, makeLabel, makeBar, makeTitan, makeDragon, B, mat } from './models.js';
import { MOBS, BIOME_MOBS, mobLevel, CLASS_BASE, SKILLS, genItem, RARITY, BOSSES } from './data.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const labelCache = new Map();
const projGeo = new THREE.IcosahedronGeometry(1, 1), projMats = new Map();
const pm = (c) => { if (!projMats.has(c)) projMats.set(c, new THREE.MeshBasicMaterial({ color: c })); return projMats.get(c); };
const tmpD = new THREE.Vector3();

const methods = {
  later(t, fn) { (this.timers ||= []).push({ t, fn }); },
  updateTimers(dt) { if (!this.timers) return; for (let i = this.timers.length - 1; i >= 0; i--) { const q = this.timers[i]; q.t -= dt; if (q.t <= 0) { this.timers.splice(i, 1); try { q.fn(); } catch (e) { console.error(e); } } } },
  targets() { const a = this.enemies.filter((e) => !e.dead); if (this.boss && !this.boss.dead && this.boss.aggro !== undefined) a.push(this.boss); return a; },

  /* ---------- Dano ---------- */
  rollDamage(mult) {
    let d = this.atk * mult * (this.buffs.warcry ? 1.35 : 1) * (this.s.blessing > 0 ? 1.2 : 1) * rand(0.92, 1.08);
    const crit = Math.random() * 100 < this.crit; if (crit) d *= 1.8; return { dmg: Math.max(1, Math.round(d)), crit };
  },
  strike(t, mult, o = {}) {
    const r = this.rollDamage(mult); if (t.isBoss) this.hurtBoss(r.dmg, r.crit); else this.hurtEnemy(t, r.dmg, r.crit, o);
    if (o.slow) t.slowT = Math.max(t.slowT || 0, o.slow); if (o.stun && !t.isBoss) t.stunT = Math.max(t.stunT || 0, o.stun);
    if (o.knock && !t.isBoss) { const dx = t.pos.x - this.p.pos.x, dz = t.pos.z - this.p.pos.z, l = Math.hypot(dx, dz) || 1; t.kb.x += dx / l * o.knock; t.kb.z += dz / l * o.knock; }
    return r;
  },
  aoe(c, radius, mult, o = {}) { let n = 0; for (const t of this.targets()) { const d = Math.hypot(t.pos.x - c.x, t.pos.z - c.z) - (t.r || 0.6); if (d <= radius) { this.strike(t, mult, o); n++; } } return n; },
  hurtEnemy(e, dmg, crit, o = {}) {
    if (e.dead) return; e.hp -= dmg; e.aggro = true; e.flash = 0.15; this.ui.popup(V(e.pos.x, e.pos.y + e.h, e.pos.z), dmg, crit ? 'crit' : 'dmg'); e.bar.visible = true; e.bar.setHp(e.hp / e.maxHp);
    this.fx.burst(e.pos.x, e.pos.y + e.h * 0.6, e.pos.z, crit ? 0xffd36b : 0xff6a4a, crit ? 12 : 6, 4, 0.45, 0.4, 8); if (!this._hs || this.time - this._hs > 0.05) { this._hs = this.time; this.snd.play(crit ? 'crit' : 'hit'); }
    if (crit) this.hitStop = 0.05; this.s.fury = Math.min(100, this.s.fury + 0.6);
    if (e.hp <= 0) this.killEnemy(e);
  },
  killEnemy(e) {
    e.dead = true; e.deathT = 0; e.bar.visible = false; const s = this.s, d = e.def, mult = e.elite ? 3 : 1;
    this.addXp(d.xp * (1 + (e.lvl - 1) * 0.22) * mult * (this.evXp || 1)); s.kills++; s.fury = Math.min(100, s.fury + (e.elite ? 22 : 6));
    const gold = Math.round(rand(d.gold[0], d.gold[1]) * (1 + e.lvl * 0.25) * (e.elite ? 3 : 1)); this.dropGold(e.pos, gold);
    if (Math.random() < (e.elite ? 1 : 0.2 + e.lvl * 0.002)) { const it = genItem(e.lvl, s.cls, e.elite ? 1.2 : 0, e.elite ? Math.max(1, (Math.random() < 0.4 ? 3 : 2)) : null); this.dropItem(e.pos, it); }
    if (Math.random() < 0.09) this.dropPotion(e.pos);
    const q = s.quest; if (q && q.mob === e.type && q.got < q.n) { q.got++; if (q.got >= q.n) { this.ui.toast('✅ Missão concluída! Fale com o Cronista.', 'gold'); this.snd.play('pick'); } }
    this.fx.burst(e.pos.x, e.pos.y + 0.8, e.pos.z, e.elite ? 0xffd36b : 0xcfd6dd, 16, 5, 0.6, 0.6, 4);
  },
  hurtPlayer(dmg, src) {
    const p = this.p; if (p.dead || p.iframes > 0) return false; const red = 60 / (60 + this.def); let d = Math.max(1, Math.round(dmg * red * (this.buffs.warcry ? 0.8 : 1)));
    p.hp -= d; this.lastHurt = this.time; this.shake = Math.max(this.shake, 0.35); this.snd.play('hurt'); this.ui.popup(V(p.pos.x, p.pos.y + 2.2, p.pos.z), d, 'hurt'); this.ui.flash('#ff2a2a');
    this.fx.burst(p.pos.x, p.pos.y + 1.2, p.pos.z, 0xff3a2a, 8, 3.5, 0.45, 0.4, 7);
    if (p.hp <= 0) this.die(src); return true;
  },
  die() {
    const p = this.p; if (p.dead) return; p.dead = true; p.hp = 0; this.s.deaths++; this.input.attack = false; this.snd.play('roar'); p.dash = null; this.fx.burst(p.pos.x, p.pos.y + 1, p.pos.z, 0xaa2222, 30, 6, 0.8, 1, 4);
    if (this.boss && !this.boss.dead) { this.boss.aggro = false; } this.ui.deathScreen(true);
  },
  respawn() {
    const p = this.p, s = this.s; const loss = Math.floor(s.gold * 0.08); s.gold -= loss; p.dead = false; p.mounted = false; this.horse.visible = false; this.model.rotation.x = 0; p.pos.set(rand(-3, 3), 1, 16 + rand(0, 3)); p.pos.y = heightAt(p.pos.x, p.pos.z); p.vy = 0; p.hp = this.maxHp; p.mp = this.maxMp; s.fury = 0; p.dash = null; p.vel.set(0, 0, 0);
    this.cYaw = 0; this.camPos.set(p.pos.x, p.pos.y + 6, p.pos.z + 12); this.ui.deathScreen(false); this.ui.toast(loss ? `Você perdeu ${loss}🪙 ao cair.` : 'Você renasceu na cidade.'); this.save();
  },
  usePotion() {
    const p = this.p, s = this.s; if (p.dead) return; if (this.potionCd > 0) return; if (s.potions <= 0) { this.snd.play('deny'); return this.ui.toast('Sem poções! Compre com o Mercador.'); } if (p.hp >= this.maxHp - 1 && p.mp >= this.maxMp - 1) return;
    s.potions--; this.potionCd = 6; p.hp = Math.min(this.maxHp, p.hp + this.maxHp * 0.5 + 30); p.mp = Math.min(this.maxMp, p.mp + this.maxMp * 0.35); this.snd.play('potion'); this.fx.burst(p.pos.x, p.pos.y + 1, p.pos.z, 0x6aff9a, 18, 3, 0.6, 0.8, -1); this.ui.popup(V(p.pos.x, p.pos.y + 2.4, p.pos.z), '+HP', 'heal');
  },

  /* ---------- Mira e ataque básico ---------- */
  aim(range) {
    const p = this.p, camF = V(-Math.sin(this.cYaw), 0, -Math.cos(this.cYaw)), face = V(Math.sin(p.yaw), 0, Math.cos(p.yaw)); const ref = this.mobile ? (p.moving > 0.3 ? face : camF) : camF; let best = null, bs = -9;
    for (const t of this.targets()) { const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z, d = Math.hypot(dx, dz) - (t.r || 0.6); if (d > range || d < -2) continue; const dot = (dx * ref.x + dz * ref.z) / (Math.hypot(dx, dz) || 1); const ok = this.mobile ? true : dot > 0.5 || d < 3.4; if (!ok) continue; const sc = (this.mobile ? 0 : dot * 1.2) - d / range; if (sc > bs) { bs = sc; best = t; } }
    let dir = ref.clone(); if (best) { dir.set(best.pos.x - p.pos.x, 0, best.pos.z - p.pos.z).normalize(); }
    this.aimYaw = Math.atan2(dir.x, dir.z); p.atkFace = 0.35; return { dir, target: best };
  },
  basicAttack() {
    const p = this.p; if (this.basicCd > 0 || p.dead || p.dash || p.spin > 0 || p.dodgeT > 0) return; const B = CLASS_BASE[this.s.cls].basic, a = this.aim(B.range);
    this.basicCd = B.cd / (this.buffs.warcry ? 1.15 : 1); p.atkAnim = 0; this.atkDur = 0.32; this.combo = (this.time - (this.comboT || -9) < 0.9) ? (this.combo + 1) % 3 : 0; this.comboT = this.time;
    if (B.kind === 'sword') {
      this.snd.play('swing'); const big = this.combo === 2, dir = a.dir.clone(), o = p.pos.clone();
      this.later(0.1, () => { let hit = 0; for (const t of this.targets()) { const dx = t.pos.x - o.x, dz = t.pos.z - o.z, dl = Math.hypot(dx, dz), d = dl - (t.r || 0.6); if (d > B.range + (big ? 1 : 0) || dl < 1e-3) continue; const dot = (dx * dir.x + dz * dir.z) / dl; if (dot < Math.cos(B.arc / 2) && d > 1) continue; this.strike(t, big ? 1.6 : 1, { knock: big ? 5 : 1.5 }); hit++; }
        for (let i = 0; i < 10; i++) { const an = Math.atan2(dir.x, dir.z) + (i / 9 - 0.5) * B.arc, r = 2 + (big ? 1 : 0); this.fx.spawn(o.x + Math.sin(an) * r, o.y + 1.2, o.z + Math.cos(an) * r, Math.sin(an) * 2, 0.5, Math.cos(an) * 2, big ? 0xffd36b : 0xe6f1ff, 0.55, 0.28); } if (big) this.shake = Math.max(this.shake, 0.15); });
    } else {
      this.snd.play(B.kind === 'bow' ? 'shoot' : 'cast'); p.cast = 0;
      this.later(0.08, () => { const o = V(p.pos.x + a.dir.x * 0.8, p.pos.y + 1.45, p.pos.z + a.dir.z * 0.8), d = a.dir.clone(); if (a.target && !a.target.dead) { const ty = a.target.pos.y + (a.target.h || 1.2) * 0.5; d.set(a.target.pos.x - o.x, ty - o.y, a.target.pos.z - o.z).normalize(); }
        this.fireProj({ pos: o, dir: d, speed: B.proj.speed, mult: B.mult * (this.combo === 2 ? 1.4 : 1), color: B.proj.color, size: B.proj.r, life: 1.1, arrow: B.kind === 'bow' }); });
    }
  },

  /* ---------- Habilidades ---------- */
  updateSkills(dt) { for (let i = 0; i < 3; i++) this.cd[i] = Math.max(0, this.cd[i] - dt); this.updateTimers(dt); },
  castSkill(i) {
    const p = this.p, s = this.s; if (p.dead || p.dash || p.spin > 0) return; const sk = SKILLS[s.cls][i]; if (!sk) return;
    if (this.cd[i] > 0) return; if (p.mp < sk.cost) { this.ui.toast('Sem energia!'); this.snd.play('deny'); return; }
    p.mp -= sk.cost; this.cd[i] = sk.cd; this.cdMax = this.cdMax || [0, 0, 0]; this.cdMax[i] = sk.cd; p.atkAnim = 0; this.atkDur = 0.3;
    const id = sk.id, P = p.pos, a = this.aim(id === 'rain' ? 26 : 30), dir = a.dir, o = V(P.x, P.y + 1.4, P.z);
    switch (id) {
      case 'whirl': p.spin = 0.45; p.cast = 0.4; this.snd.play('swing'); this.later(0.1, () => this.aoe(p.pos, 5.5, 1.5, { knock: 4 })); this.later(0.3, () => this.aoe(p.pos, 5.5, 1.5, { knock: 4 })); for (let k = 0; k < 40; k++) { const an = k / 40 * TAU; this.fx.spawn(P.x + Math.sin(an) * 1.5, P.y + 1, P.z + Math.cos(an) * 1.5, Math.sin(an + 1.4) * 9, 0.4, Math.cos(an + 1.4) * 9, 0xe6f1ff, 0.7, 0.5); } break;
      case 'charge': { const hit = new Set(); p.iframes = 0.3; this.snd.play('dodge'); p.dash = { dir: dir.clone(), t: 0.3, speed: 32, onTick: () => { for (const t of this.targets()) { if (hit.has(t)) continue; if (Math.hypot(t.pos.x - p.pos.x, t.pos.z - p.pos.z) < 2.4 + (t.r || 0.6)) { hit.add(t); this.strike(t, 1.9, { knock: 7, stun: 0.6 }); } } this.fx.spawn(p.pos.x, p.pos.y + 0.6, p.pos.z, rand(-1, 1), rand(0, 1), rand(-1, 1), 0xffe9a8, 0.6, 0.4); } }; break; }
      case 'warcry': this.buffs.warcry = 10; p.hp = Math.min(this.maxHp, p.hp + this.maxHp * 0.15); p.cast = 0.5; this.snd.play('roar'); this.shake = 0.3; for (let k = 0; k < 36; k++) { const an = k / 36 * TAU; this.fx.spawn(P.x, P.y + 0.5, P.z, Math.sin(an) * 8, 1, Math.cos(an) * 8, 0xffa23a, 0.7, 0.6); } this.ui.toast('📣 Grito de Guerra! +35% ataque'); break;
      case 'fireball': { this.snd.play('cast'); p.cast = 0.25; const d = dir.clone(); if (a.target) d.set(a.target.pos.x - o.x, a.target.pos.y + (a.target.h || 1.2) * 0.5 - o.y, a.target.pos.z - o.z).normalize(); this.fireProj({ pos: o.clone().addScaledVector(d, 1), dir: d, speed: 26, mult: 2.2, color: 0xff7a2a, size: 0.7, life: 1.6, explode: { r: 4.2, mult: 1.3 }, trail: 0xffb24a }); break; }
      case 'frost': this.snd.play('cast'); p.cast = 0.4; this.aoe(p.pos, 8.5, 1.5, { stun: 0.9, slow: 3.5, knock: 2 }); for (let k = 0; k < 60; k++) { const an = rand(0, TAU), r = rand(0.5, 8); this.fx.spawn(P.x + Math.sin(an) * r * 0.3, P.y + 0.4, P.z + Math.cos(an) * r * 0.3, Math.sin(an) * r * 1.4, rand(0, 2), Math.cos(an) * r * 1.4, 0xbfe8ff, 0.8, 0.7); } this.shake = 0.2; this.snd.play('boom'); break;
      case 'chain': { let t0 = a.target; if (!t0) { let bd = 24; for (const t of this.targets()) { const d = Math.hypot(t.pos.x - P.x, t.pos.z - P.z); if (d < bd) { bd = d; t0 = t; } } } if (!t0) { p.mp += sk.cost; this.cd[i] = 0; this.ui.toast('Sem alvo.'); return; }
        this.snd.play('cast'); p.cast = 0.3; const used = new Set(), pts = [o.clone()]; let cur = t0, k = 0; while (cur && k < 4) { used.add(cur); this.strike(cur, 1.9 * Math.pow(0.85, k), {}); pts.push(V(cur.pos.x, cur.pos.y + (cur.h || 1.4) * 0.6, cur.pos.z)); let nx = null, bd = 11; for (const t of this.targets()) { if (used.has(t)) continue; const d = Math.hypot(t.pos.x - cur.pos.x, t.pos.z - cur.pos.z); if (d < bd) { bd = d; nx = t; } } cur = nx; k++; }
        this.addZap(pts); break; }
      case 'triple': this.snd.play('shoot'); for (const ang of [-0.22, 0, 0.22]) { const d = dir.clone().applyAxisAngle(V(0, 1, 0), ang); this.fireProj({ pos: o.clone().addScaledVector(d, 0.8), dir: d, speed: 42, mult: 1.15, color: 0xffe9a8, size: 0.22, life: 0.9, arrow: true }); } break;
      case 'rain': { const c = a.target ? V(a.target.pos.x, 0, a.target.pos.z) : V(P.x + dir.x * 14, 0, P.z + dir.z * 14); this.snd.play('shoot'); p.cast = 0.4;
        for (let k = 0; k < 10; k++) this.later(k * 0.18, () => { const an = rand(0, TAU), r = Math.sqrt(Math.random()) * 5.5, x = c.x + Math.cos(an) * r, z = c.z + Math.sin(an) * r, y = heightAt(x, z); for (let j = 0; j < 3; j++) this.fx.spawn(x + rand(-0.3, 0.3), y + 24 + j, z + rand(-0.3, 0.3), 0, -52, 0, 0xffe9a8, 0.35, 0.45); this.later(0.4, () => { this.fx.burst(x, y + 0.3, z, 0xffe9a8, 6, 3, 0.45, 0.35, 5); this.aoe({ x, z }, 2.4, 0.9); }); });
        break; }
      case 'leap': { this.snd.play('dodge'); p.iframes = 0.35; p.vy = 8; p.grounded = false; p.dash = { dir: dir.clone().multiplyScalar(-1), t: 0.34, speed: 24 }; for (const t of this.targets()) { if (t.isBoss) continue; if (Math.hypot(t.pos.x - P.x, t.pos.z - P.z) < 9) { t.slowT = 3; t.stunT = 0.5; } } for (let k = 0; k < 20; k++) this.fx.spawn(P.x, P.y + 0.3, P.z, rand(-3, 3), rand(0, 2), rand(-3, 3), 0xcfe8ff, 0.6, 0.5); break; }
    }
  },
  castUlt() {
    const p = this.p, s = this.s; if (p.dead || p.dash) return; if (s.fury < 100) { this.snd.play('deny'); this.ui.toast('A Fúria ainda não está cheia (' + Math.floor(s.fury) + '%).'); return; }
    s.fury = 0; this.ui.flash('#ffb23a'); const a = this.aim(30), P = p.pos, dir = a.dir; p.cast = 0.7; p.atkAnim = 0; this.atkDur = 0.5; this.shake = 0.4; this.snd.play('roar'); p.iframes = Math.max(p.iframes, 0.8); this.ui.toast('🔥 FÚRIA DESPERTA!', 'gold');
    if (s.cls === 'warrior') { this.later(0.5, () => { this.aoe(p.pos, 12, 5.5, { stun: 2, knock: 9 }); this.shake = 1; this.snd.play('boom'); for (let k = 0; k < 110; k++) { const an = rand(0, TAU), sp = rand(2, 16); this.fx.spawn(P.x, P.y + 0.3, P.z, Math.cos(an) * sp, rand(0, 6), Math.sin(an) * sp, k % 2 ? 0xffd36b : 0xff7a2a, 1, 0.9, 4); } }); }
    else if (s.cls === 'mage') { const c = a.target ? V(a.target.pos.x, 0, a.target.pos.z) : V(P.x + dir.x * 13, 0, P.z + dir.z * 13); for (let k = 0; k < 12; k++) this.later(0.3 + k * 0.2, () => { const an = rand(0, TAU), r = Math.sqrt(Math.random()) * 12, x = c.x + Math.cos(an) * r, z = c.z + Math.sin(an) * r, y = heightAt(x, z); for (let j = 0; j < 6; j++) this.fx.spawn(x, y + 30 + j * 1.2, z, 0, -34, 0, j % 2 ? 0xffb24a : 0xff5a1a, 1.2, 0.9); this.addTele({ x, z, r: 4.2, dur: 0.9, team: 'p', mult: 2.8, color: 0xff7a2a }); }); }
    else { for (let k = 0; k < 32; k++) { const an = k / 32 * TAU, d = V(Math.sin(an), 0, Math.cos(an)); this.fireProj({ pos: V(P.x, P.y + 1.3, P.z).addScaledVector(d, 1), dir: d, speed: 36, mult: 1.9, color: 0xffe9a8, size: 0.25, life: 0.9, arrow: true, pierce: 3 }); } this.later(0.25, () => { for (let k = 0; k < 24; k++) { const an = (k + 0.5) / 24 * TAU, d = V(Math.sin(an), 0, Math.cos(an)); this.fireProj({ pos: V(P.x, P.y + 1.3, P.z).addScaledVector(d, 1), dir: d, speed: 30, mult: 1.9, color: 0xff7a2a, size: 0.25, life: 0.9, arrow: true, pierce: 3 }); } }); }
  },
  addZap(pts) { const g = new THREE.BufferGeometry(), arr = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; for (let k = 0; k < 6; k++) { const t = k / 6; arr.push(lerp(a.x, b.x, t) + (k ? rand(-0.3, 0.3) : 0), lerp(a.y, b.y, t) + (k ? rand(-0.3, 0.3) : 0), lerp(a.z, b.z, t) + (k ? rand(-0.3, 0.3) : 0)); } } const l = pts[pts.length - 1]; arr.push(l.x, l.y, l.z); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const ln = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xbfe0ff })); ln.frustumCulled = false; this.scene.add(ln); this.zaps.push({ ln, t: 0.28 }); for (const q of pts.slice(1)) this.fx.burst(q.x, q.y, q.z, 0xbfe0ff, 8, 3, 0.5, 0.3, 2); this.snd.play('crit'); },
  updateZaps(dt) { for (let i = this.zaps.length - 1; i >= 0; i--) { const z = this.zaps[i]; z.t -= dt; z.ln.material.opacity = 1; if (z.t <= 0) { this.scene.remove(z.ln); z.ln.geometry.dispose(); this.zaps.splice(i, 1); } } },

  /* ---------- Projéteis ---------- */
  fireProj(o) {
    const m = new THREE.Mesh(projGeo, pm(o.color)); m.scale.set(o.size, o.size, o.arrow ? o.size * 3.2 : o.size); m.position.copy(o.pos); if (o.arrow) m.lookAt(o.pos.clone().add(o.dir)); this.scene.add(m);
    const q = { mesh: m, pos: m.position, vel: o.dir.clone().multiplyScalar(o.speed), team: o.team || 'p', life: o.life || 1.5, r: o.size + 0.35, color: o.trail || o.color, pierce: o.pierce || 0, hit: new Set(), explode: o.explode, arrow: o.arrow, grav: o.grav || 0, dmg: 0, size: o.size };
    if (q.team === 'p') q.roll = this.rollDamage(o.mult); else q.dmg = o.dmg; this.projs.push(q); return q;
  },
  updateProjs(dt) {
    const p = this.p;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const q = this.projs[i]; q.life -= dt; q.vel.y -= q.grav * dt; q.pos.addScaledVector(q.vel, dt); if (q.arrow) q.mesh.lookAt(q.pos.x + q.vel.x, q.pos.y + q.vel.y, q.pos.z + q.vel.z);
      if (Math.random() < 0.7) this.fx.spawn(q.pos.x, q.pos.y, q.pos.z, rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3), q.color, q.size * 1.6, 0.25);
      let done = q.life <= 0, boom = false; const gy = heightAt(q.pos.x, q.pos.z);
      if (q.pos.y < gy + 0.1) { done = true; boom = true; }
      if (!done) {
        if (q.team === 'p') {
          for (const t of this.targets()) { if (q.hit.has(t)) continue; const d = Math.hypot(t.pos.x - q.pos.x, t.pos.z - q.pos.z), top = t.pos.y + (t.h || 1.5) + 0.5; if (d < (t.r || 0.6) + q.r && q.pos.y > t.pos.y - 0.5 && q.pos.y < top) {
            q.hit.add(t); if (t.isBoss) this.hurtBoss(q.roll.dmg, q.roll.crit); else this.hurtEnemy(t, q.roll.dmg, q.roll.crit, {}); if (q.explode) { done = true; boom = true; break; } if (q.pierce-- <= 0) { done = true; break; } } }
        } else if (!p.dead && p.iframes <= 0) { const d = Math.hypot(p.pos.x - q.pos.x, p.pos.z - q.pos.z); if (d < 0.9 + q.r && q.pos.y > p.pos.y - 0.3 && q.pos.y < p.pos.y + 2.2) { this.hurtPlayer(q.dmg); done = true; this.fx.burst(q.pos.x, q.pos.y, q.pos.z, q.color, 8, 3, 0.5, 0.4, 3); } }
      }
      if (done) { if (boom && q.explode && q.team === 'p') { this.fx.burst(q.pos.x, q.pos.y, q.pos.z, q.color, 40, 9, 1, 0.8, 4); this.snd.play('boom'); this.shake = Math.max(this.shake, 0.25); this.aoe(q.pos, q.explode.r, q.explode.mult * 0.9); } else if (boom && q.team === 'e') this.fx.burst(q.pos.x, q.pos.y, q.pos.z, q.color, 10, 3, 0.6, 0.5, 3); this.scene.remove(q.mesh); this.projs.splice(i, 1); }
    }
  },

  /* ---------- Telegrafias ---------- */
  addTele(o) {
    const col = o.color ?? 0xff3a2a, g = new THREE.Group(), ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false })), fill = new THREE.Mesh(new THREE.CircleGeometry(1, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.32, depthWrite: false }));
    const base = new THREE.Mesh(new THREE.CircleGeometry(1, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, depthWrite: false })); for (const m of [base, ring, fill]) m.renderOrder = 2; g.add(base, ring, fill);
    g.position.set(o.x, heightAt(o.x, o.z) + 0.25, o.z); base.scale.setScalar(o.r); ring.scale.setScalar(o.r); fill.scale.setScalar(0.01); this.scene.add(g);
    const t = Object.assign({ t: 0, mesh: g, fill, ring, base, done: false, tick: 0 }, o); this.tele.push(t); return t;
  },
  updateTele(dt) {
    const p = this.p;
    for (let i = this.tele.length - 1; i >= 0; i--) {
      const t = this.tele[i]; t.t += dt;
      if (!t.done) { t.fill.scale.setScalar(Math.max(0.01, t.r * clamp(t.t / t.dur, 0, 1))); if (t.t >= t.dur) { t.done = true; this.resolveTele(t); if (!t.linger) { this.scene.remove(t.mesh); this.tele.splice(i, 1); continue; } t.lt = 0; t.fill.scale.setScalar(t.r); t.fill.material.color.setHex(0xff7a1a); t.ring.material.color.setHex(0xff9a3a); t.base.material.color.setHex(0xff5a1a); } }
      else { t.lt += dt; t.tick -= dt; t.fill.material.opacity = 0.28 + Math.sin(t.lt * 12) * 0.08; if (Math.random() < 0.5) this.fx.spawn(t.x + rand(-t.r, t.r) * 0.8, t.mesh.position.y, t.z + rand(-t.r, t.r) * 0.8, 0, rand(1.5, 4), 0, 0xff8a2a, 0.7, 0.6);
        if (t.tick <= 0) { t.tick = 0.5; if (!p.dead && Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < t.r) this.hurtPlayer(t.dmg * 0.3); }
        if (t.lt >= t.linger) { this.scene.remove(t.mesh); this.tele.splice(i, 1); } }
    }
  },
  resolveTele(t) {
    const p = this.p, y = heightAt(t.x, t.z);
    if (t.team === 'p') { this.aoe({ x: t.x, z: t.z }, t.r, t.mult); this.fx.burst(t.x, y + 0.5, t.z, t.color, 50, 10, 1.1, 0.8, 4); this.snd.play('boom'); this.shake = Math.max(this.shake, 0.3); return; }
    this.fx.burst(t.x, y + 0.5, t.z, 0xff7a3a, 36, 9, 1, 0.7, 5); this.shake = Math.max(this.shake, t.r > 8 ? 0.55 : 0.3); this.snd.play('boom');
    if (!p.dead && Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < t.r) { if (t.airDodge && p.pos.y > heightAt(p.pos.x, p.pos.z) + 1.1) { this.ui.popup(V(p.pos.x, p.pos.y + 2.4, p.pos.z), 'Desviou!', 'heal'); } else this.hurtPlayer(t.dmg, t); }
    if (t.onHit) t.onHit();
  },

  /* ---------- Saque ---------- */
  dropGold(pos, n) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10), mat(0xffd36b, 0.5)); m.position.set(pos.x + rand(-0.8, 0.8), pos.y + 1, pos.z + rand(-0.8, 0.8)); this.scene.add(m); this.drops.push({ mesh: m, pos: m.position, kind: 'gold', n, t: 0, vy: 5, life: 90 }); },
  dropPotion(pos) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), mat(0xff4a6a, 0.7)); m.position.set(pos.x + rand(-1, 1), pos.y + 1, pos.z + rand(-1, 1)); this.scene.add(m); this.drops.push({ mesh: m, pos: m.position, kind: 'potion', t: 0, vy: 5, life: 90 }); },
  dropItem(pos, it) { const R = RARITY[it.rarity], c = new THREE.Color(R.color), g = new THREE.Group(), m = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: c })); g.add(m); const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 9, 6, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 4.5; g.add(beam); g.position.set(pos.x + rand(-1, 1), pos.y + 1, pos.z + rand(-1, 1)); this.scene.add(g); this.drops.push({ mesh: g, spin: m, pos: g.position, kind: 'item', item: it, t: 0, vy: 6, life: 150 }); },
  updateDrops(dt) {
    const p = this.p;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]; d.t += dt; d.life -= dt; const gy = heightAt(d.pos.x, d.pos.z) + 0.7 + Math.sin(this.time * 3 + i) * 0.12; d.vy -= 22 * dt; d.pos.y += d.vy * dt; if (d.pos.y < gy) { d.pos.y = gy; d.vy = 0; }
      (d.spin || d.mesh).rotation.y += dt * 3; const dist = Math.hypot(p.pos.x - d.pos.x, p.pos.z - d.pos.z);
      if (d.t > 0.5 && !p.dead) { if (dist < 6) { const k = Math.min(1, dt * (14 - dist * 1.5)); d.pos.x += (p.pos.x - d.pos.x) * k; d.pos.z += (p.pos.z - d.pos.z) * k; } if (dist < 1.6) { this.collect(d); this.scene.remove(d.mesh); this.drops.splice(i, 1); continue; } }
      if (d.life <= 0) { this.scene.remove(d.mesh); this.drops.splice(i, 1); }
    }
  },
  collect(d) {
    if (d.kind === 'gold') { this.addGold(d.n); this.snd.play('coin'); this.ui.popup(V(this.p.pos.x, this.p.pos.y + 2.2, this.p.pos.z), '+' + d.n + '🪙', 'gold'); }
    else if (d.kind === 'potion') { this.s.potions++; this.snd.play('pick'); this.ui.toast('🧪 +1 poção'); }
    else { const R = RARITY[d.item.rarity]; if (this.giveItem(d.item)) { this.snd.play('pick'); this.ui.toast(`<b style="color:${R.color}">${d.item.name}</b> (${R.name})`, d.item.rarity >= 3 ? 'gold' : ''); this.ui.refreshPanels(); } }
  },

  /* ---------- Inimigos ---------- */
  updateSpawns(dt) {
    this.spawnT -= dt; if (this.spawnT > 0) return; this.spawnT = 0.35; const cap = (this.mobile ? 20 : 30) + (this.night > 0.5 ? 6 : 0); if (this.enemies.length < cap) this.trySpawn(false);
  },
  trySpawn(initial) {
    const p = this.p; for (let k = 0; k < 8; k++) {
      const a = rand(0, TAU), d = initial ? rand(30, 95) : rand(62, 100), x = p.pos.x + Math.cos(a) * d, z = p.pos.z + Math.sin(a) * d, od = Math.hypot(x, z);
      if (od < CITY_R + 8 || od > HALF - 40) continue; const h = heightAt(x, z); if (h < 0.3) continue; if (Math.hypot(x - TITAN_ARENA.x, z - TITAN_ARENA.z) < TITAN_ARENA.r + 6 || Math.hypot(x - DRAGON_ARENA.x, z - DRAGON_ARENA.z) < DRAGON_ARENA.r + 6) continue;
      const biome = biomeAt(x, z), types = BIOME_MOBS[biome]; if (!types) continue; const type = pick(types), lvl = mobLevel(od, biome), elite = lvl >= 3 && Math.random() < 0.05;
      return this.spawnEnemy(type, x, z, lvl, elite, biome);
    } return null;
  },
  spawnEnemy(type, x, z, lvl, elite = false, biome = 'forest') {
    const def = MOBS[type], mesh = makeMob(type, biome), sc = elite ? 1.35 : 1; mesh.scale.setScalar(sc); mesh.position.set(x, heightAt(x, z), z); mesh.rotation.y = rand(0, TAU); this.scene.add(mesh);
    const key = def.name + lvl + (elite ? 'e' : ''); let lab = labelCache.get(key); if (!lab) { lab = makeLabel((elite ? '☠ ' : '') + def.name, elite ? '#ffd36b' : '#ffffff', 'Nv.' + lvl); labelCache.set(key, lab); }
    const L = lab.clone(); L.position.y = mesh.userData.h + 0.9; mesh.add(L); L.scale.set(4 / sc, 1 / sc, 1); const bar = makeBar(2.2, elite ? 0xffb23a : 0xe5483a); bar.position.y = mesh.userData.h + 0.45; bar.visible = false; mesh.add(bar); bar.scale.setScalar(1 / sc);
    const hp = Math.round(def.hp * (1 + (lvl - 1) * 0.3) * (elite ? 3.2 : 1)), e = { type, def, lvl, elite, mesh, pos: mesh.position, hp, maxHp: hp, atk: def.atk * (1 + (lvl - 1) * 0.17) * (elite ? 1.5 : 1), spd: def.spd * (elite ? 1.1 : 1), r: mesh.userData.r * sc, h: mesh.userData.h * sc, home: new THREE.Vector3(x, 0, z), aggro: false, state: 'idle', cd: rand(0.3, 1.2), wind: 0, windMax: 0, wander: rand(1, 4), tgt: null, kb: V(), flash: 0, slowT: 0, stunT: 0, bar, label: L, dead: false, deathT: 0, yaw: mesh.rotation.y, moving: 0, sc, atkAnim: -1, bio: biome };
    this.enemies.push(e); return e;
  },
  removeEnemy(e) { this.scene.remove(e.mesh); e.mesh.traverse((o) => { if (o.isSprite) { } }); },
  updateEnemies(dt) {
    const p = this.p, t = this.time, aggroMul = 1 + (this.night || 0) * 0.35;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i], dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, dist = Math.hypot(dx, dz);
      if (e.dead) { e.deathT += dt; e.mesh.rotation.z = Math.min(1.45, e.deathT * 4) * (e.type === 'slime' ? 0 : 1); e.mesh.scale.setScalar(e.sc * (e.type === 'slime' ? Math.max(0.01, 1 - e.deathT * 1.4) : 1)); if (e.deathT > (e.type === 'slime' ? 0.8 : 2.2)) { this.removeEnemy(e); this.enemies.splice(i, 1); } continue; }
      if (dist > 135 && !e.elite) { this.removeEnemy(e); this.enemies.splice(i, 1); continue; } if (dist > 200) { this.removeEnemy(e); this.enemies.splice(i, 1); continue; }
      e.flash = Math.max(0, e.flash - dt); e.slowT = Math.max(0, e.slowT - dt); e.stunT = Math.max(0, e.stunT - dt); e.cd -= dt;
      if (e.hp < e.maxHp && e.state === 'return') { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.2 * dt); }
      const safe = this.inCity || p.dead; let move = null, speed = 0;
      if (e.kb.lengthSq() > 0.01) { e.pos.x += e.kb.x * dt * 4; e.pos.z += e.kb.z * dt * 4; e.kb.multiplyScalar(Math.max(0, 1 - dt * 6)); }
      if (e.stunT > 0) { e.moving = 0; }
      else if (e.wind > 0) { e.wind -= dt; e.atkAnim = 1 - e.wind / e.windMax; e.yaw += angDiff(e.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 8); if (e.wind <= 0) { e.atkAnim = -1; this.enemyStrike(e, dist); } }
      else {
        const range = e.def.aggro * aggroMul;
        if (!safe && (e.aggro || dist < range)) { if (!e.aggro) { e.aggro = true; } e.state = 'chase'; } else if (e.state === 'chase') { e.state = 'return'; e.aggro = false; }
        if (e.state === 'chase') {
          const atkR = e.def.ranged ? e.def.range * 0.85 : e.def.range + e.r * 0.5 + 0.4;
          if (dist > range * 2.2 && e.def.aggro < 40) { e.state = 'return'; e.aggro = false; }
          else if (dist <= atkR) { e.yaw += angDiff(e.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 10); if (e.cd <= 0) { e.windMax = e.wind = e.def.ranged ? 0.55 : 0.45; e.cd = e.def.cd + rand(0, 0.4); } e.moving = 0; if (e.def.ranged && dist < atkR * 0.45) { move = V(-dx, 0, -dz).normalize(); speed = e.spd * 0.7; } }
          else { move = V(dx, 0, dz).normalize(); speed = e.spd; }
        } else if (e.state === 'return') { const hx = e.home.x - e.pos.x, hz = e.home.z - e.pos.z, hd = Math.hypot(hx, hz); if (hd < 2) { e.state = 'idle'; } else { move = V(hx, 0, hz).normalize(); speed = e.spd * 0.9; } }
        else { e.wander -= dt; if (e.wander <= 0) { e.wander = rand(2.5, 6); if (Math.random() < 0.6) { const a = rand(0, TAU), r = rand(2, 8); e.tgt = V(e.home.x + Math.cos(a) * r, 0, e.home.z + Math.sin(a) * r); } else e.tgt = null; } if (e.tgt) { const wx = e.tgt.x - e.pos.x, wz = e.tgt.z - e.pos.z, wd = Math.hypot(wx, wz); if (wd < 1) e.tgt = null; else { move = V(wx, 0, wz).normalize(); speed = e.spd * 0.35; } } }
      }
      if (move) {
        if (e.slowT > 0) speed *= 0.45; const nx = e.pos.x + move.x * speed * dt, nz = e.pos.z + move.z * speed * dt, nh = heightAt(nx, nz);
        if (nh > SEA - 0.1 && Math.hypot(nx, nz) > CITY_R + 1.5 && Math.hypot(nx, nz) < HALF - 20) { e.pos.x = nx; e.pos.z = nz; } e.yaw += angDiff(e.yaw, Math.atan2(move.x, move.z)) * Math.min(1, dt * 9); e.moving = clamp(speed / e.def.spd, 0, 1.2);
      } else if (e.wind <= 0) e.moving = lerp(e.moving, 0, dt * 8);
      this.colliders.resolve(e.pos, e.r * 0.6);
      for (let j = i - 1; j >= 0; j--) { const o = this.enemies[j]; if (o.dead) continue; const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, m = (e.r + o.r) * 0.7, d2 = ox * ox + oz * oz; if (d2 < m * m && d2 > 1e-4) { const d = Math.sqrt(d2), push = (m - d) * 0.5; e.pos.x += ox / d * push; e.pos.z += oz / d * push; o.pos.x -= ox / d * push; o.pos.z -= oz / d * push; } }
      e.pos.y = Math.max(heightAt(e.pos.x, e.pos.z), SEA - 0.5); e.mesh.rotation.y = e.yaw;
      const fl = e.flash > 0 ? 1 + e.flash * 0.6 : 1; e.mesh.scale.setScalar(e.sc * fl); animateMob(e.mesh, e.moving, t, e.atkAnim);
      if (e.bar.visible && e.hp >= e.maxHp) e.bar.visible = false; if (e.elite && Math.random() < 0.25) this.fx.spawn(e.pos.x + rand(-0.6, 0.6), e.pos.y + rand(0.2, e.h), e.pos.z + rand(-0.6, 0.6), 0, 1.4, 0, 0xffd36b, 0.5, 0.7);
    }
  },
  enemyStrike(e, dist) {
    const p = this.p; if (p.dead) return; const d = e.def;
    if (d.ranged) { const o = V(e.pos.x, e.pos.y + e.h * 0.6, e.pos.z), tx = p.pos.x, ty = p.pos.y + 1.2, tz = p.pos.z, dir = V(tx - o.x, ty - o.y, tz - o.z).normalize(); this.snd.play('shoot'); this.fireProj({ pos: o, dir, speed: d.ranged.speed, team: 'e', dmg: e.atk, color: d.ranged.color, size: 0.45, life: 2, grav: 0 }); return; }
    const hitR = d.range + e.r * 0.5 + 1.1; if (dist <= hitR + (p.mounted ? 0.5 : 0)) { if (this.hurtPlayer(e.atk, e)) { const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, l = Math.hypot(dx, dz) || 1; p.pos.x += dx / l * 0.8; p.pos.z += dz / l * 0.8; } }
  },

  /* ---------- Chefes ---------- */
  spawnBoss(type, byPlayer) {
    if (this.boss && !this.boss.dead) return false; if (this.boss) { this.scene.remove(this.boss.mesh); if (this.boss.chest) this.scene.remove(this.boss.chest.g); }
    const def = BOSSES[type], A = type === 'titan' ? TITAN_ARENA : DRAGON_ARENA, mesh = type === 'titan' ? makeTitan() : makeDragon(); mesh.position.set(A.x, heightAt(A.x, A.z), A.z); this.scene.add(mesh); mesh.rotation.y = Math.atan2(-A.x, -A.z);
    const hp = Math.round(def.hp * (1 + this.s.lvl * 0.01)); this.boss = { type, def, mesh, pos: mesh.position, hp, max: hp, r: mesh.userData.r * mesh.scale.x, h: mesh.userData.h * mesh.scale.x, isBoss: true, aggro: false, home: V(A.x, 0, A.z), arena: A, phase: 1, busy: 0, atkT: 2, yaw: mesh.rotation.y, anim: null, animT: 0, moving: 0, dead: false, deathT: 0, dashT: 0, summoned: false, spawnT: 0, sinceHit: 0 };
    this.snd.play('roar'); this.ui.toast(`${type === 'titan' ? '🗿' : '🐉'} <b>${def.name}</b> despertou ${type === 'titan' ? 'nas ruínas a oeste' : 'ao pé do vulcão'}!`, 'gold'); this.ui.flash('#ffb23a'); this.shake = 0.6; return true;
  },
  hurtBoss(dmg, crit) {
    const b = this.boss; if (!b || b.dead) return; b.hp -= dmg; b.aggro = true; b.sinceHit = 0; this.ui.popup(V(b.pos.x + rand(-1.5, 1.5), b.pos.y + b.h * 0.8, b.pos.z), dmg, crit ? 'crit' : 'dmg'); this.s.fury = Math.min(100, this.s.fury + 0.5);
    this.fx.burst(b.pos.x + rand(-1.5, 1.5), b.pos.y + b.h * 0.5, b.pos.z + rand(-1.5, 1.5), crit ? 0xffd36b : 0xff6a4a, 6, 4, 0.7, 0.4, 6); if (!this._hs || this.time - this._hs > 0.05) { this._hs = this.time; this.snd.play(crit ? 'crit' : 'hit'); }
    if (b.phase === 1 && b.hp < b.max * 0.5) { b.phase = 2; b.busy = 1.6; b.anim = 'roar'; b.animT = 0; this.snd.play('roar'); this.shake = 0.8; this.ui.toast('⚠️ ' + b.def.name + ' entrou em FÚRIA!', 'gold'); if (b.type === 'titan' && !b.summoned) { b.summoned = true; this.later(1.2, () => { for (let k = 0; k < 2; k++) { const an = rand(0, TAU); this.spawnEnemy('golem', b.pos.x + Math.cos(an) * 8, b.pos.z + Math.sin(an) * 8, 12, false, 'desert'); } }); } }
    if (b.hp <= 0) this.killBoss();
  },
  killBoss() {
    const b = this.boss, s = this.s; b.dead = true; b.deathT = 0; this.ui.bossBar(null); this.snd.play('win'); this.addXp(b.def.xp); this.addGold(b.def.gold); s.bossKills++; s.fury = 100; this.shake = 1; this.ui.flash('#ffffff');
    for (const t of this.tele) { this.scene.remove(t.mesh); } this.tele = [];
    const g = new THREE.Group(); g.position.copy(b.pos).add(V(6, 0, 0)); g.position.y = heightAt(g.position.x, g.position.z); B(g, 1.8, 1.1, 1.2, 0x7a4a22, 0, 0.55, 0); B(g, 1.84, 0.14, 1.24, 0xffd36b, 0, 0.8, 0, 0.6); B(g, 1.8, 0.4, 1.2, 0x8a5a2e, 0, 1.3, 0); const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1, 22, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 11; g.add(beam); this.scene.add(g);
    b.chest = { pos: g.position, g, open: false }; this.ui.toast(`🏆 <b>${b.def.name}</b> foi derrotado! Abra o tesouro.`, 'gold'); this.fx.burst(b.pos.x, b.pos.y + 3, b.pos.z, 0xffd36b, 120, 14, 1.4, 1.6, 3);
    this.bossTimer = 420;
  },
  openBossChest() {
    const b = this.boss; if (!b || !b.chest || b.chest.open) return; const c = b.chest; c.open = true; this.snd.play('win'); const n = 3; for (let i = 0; i < n; i++) { const it = genItem(b.def.lvl + 2, this.s.cls, 3, Math.random() < (b.type === 'dragon' ? 0.5 : 0.3) ? 4 : 3); this.giveItem(it); this.ui.toast(`<b style="color:${RARITY[it.rarity].color}">${it.name}</b> (${RARITY[it.rarity].name})`, 'gold'); }
    this.s.potions += 3; this.fx.burst(c.pos.x, c.pos.y + 1.5, c.pos.z, 0xffd36b, 60, 8, 1, 1.2, 3); this.scene.remove(c.g); this.ui.refreshPanels(); this.later(6, () => { if (this.boss === b) { this.scene.remove(b.mesh); this.boss = null; } });
  },
  bossTele(b, o) { return this.addTele(Object.assign({ dmg: b.def.atk }, o)); },
  updateBoss(dt) {
    const p = this.p;
    if (!this.boss) { if (this.s.lvl >= 10) { this.bossTimer -= dt; if (this.bossTimer <= 0) { this.spawnBoss(this.s.lvl >= 24 && Math.random() < 0.5 ? 'dragon' : 'titan'); this.bossTimer = 480; } } return; }
    const b = this.boss, m = b.mesh, P = m.userData.parts, t = this.time;
    if (b.dead) { b.deathT += dt; m.rotation.x = Math.min(0.6, b.deathT * 0.4); m.position.y = b.pos.y - Math.min(3, b.deathT * 0.9); if (b.chest) { b.chest.g.children[b.chest.g.children.length - 1].material.opacity = 0.2 + Math.sin(t * 3) * 0.08; } if (b.deathT > 180 && !b.chest?.open) { this.scene.remove(m); if (b.chest) this.scene.remove(b.chest.g); this.boss = null; } return; }
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, dist = Math.hypot(dx, dz), ad = Math.hypot(p.pos.x - b.arena.x, p.pos.z - b.arena.z);
    b.sinceHit += dt; if (!b.aggro && dist < 42 && !p.dead && !this.inCity) { b.aggro = true; this.snd.play('roar'); }
    if (b.aggro && (p.dead || ad > 95 || this.inCity)) { b.aggro = false; b.hp = Math.min(b.max, b.hp + 1); }
    if (!b.aggro) { b.hp = Math.min(b.max, b.hp + b.max * 0.03 * dt); const hx = b.home.x - b.pos.x, hz = b.home.z - b.pos.z, hd = Math.hypot(hx, hz); if (hd > 2) { b.pos.x += hx / hd * 6 * dt; b.pos.z += hz / hd * 6 * dt; b.yaw += angDiff(b.yaw, Math.atan2(hx, hz)) * dt * 4; b.moving = 1; } else b.moving = 0; this.ui.bossBar(null); }
    else {
      this.ui.bossBar(b); b.atkT -= dt; b.busy -= dt; b.animT += dt; const fast = b.phase === 2 ? 1.35 : 1;
      if (b.dash) { const d = b.dash; d.t -= dt; b.pos.x += d.dx * dt; b.pos.z += d.dz * dt; if (d.t <= 0) { b.dash = null; } }
      else if (b.busy <= 0) { b.yaw += angDiff(b.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * (b.type === 'titan' ? 2.2 : 3)); const want = b.type === 'titan' ? 8 : 12;
        if (dist > want) { const sp = (b.type === 'titan' ? 4.2 : 5.4) * fast; b.pos.x += dx / dist * sp * dt; b.pos.z += dz / dist * sp * dt; b.moving = 1; } else b.moving = 0;
        if (b.atkT <= 0) this.bossAttack(b, dist, dx, dz); }
      this.colliders.resolve(b.pos, b.r * 0.4); const bd = Math.hypot(b.pos.x - b.arena.x, b.pos.z - b.arena.z); if (bd > b.arena.r + 30) { b.pos.x = b.arena.x + (b.pos.x - b.arena.x) * (b.arena.r + 30) / bd; b.pos.z = b.arena.z + (b.pos.z - b.arena.z) * (b.arena.r + 30) / bd; }
    }
    const gy = heightAt(b.pos.x, b.pos.z); if (b.type === 'dragon') { const hover = b.leap ? Math.sin(Math.min(1, b.leap.t / b.leap.dur) * Math.PI) * 9 : 0; b.pos.y = gy + hover; } else b.pos.y = gy;
    m.rotation.y = b.yaw; this.animateBoss(b, dt, t);
  },
  bossAttack(b, dist, dx, dz) {
    const p = this.p, ph = b.phase, atk = b.def.atk, dir = V(dx, 0, dz).normalize(), F = ph === 2 ? 0.75 : 1; b.anim = null;
    if (b.type === 'titan') {
      const opts = ['slam', 'rocks', 'stomp']; if (ph === 2) opts.push('charge', 'rocks'); const a = dist < 13 ? pick(opts) : pick(['rocks', 'charge', 'rocks']);
      if (a === 'slam') { b.busy = 1.9 * F; b.atkT = 2.6 * F; b.anim = 'slam'; b.animT = 0; this.ui.toast('Cuidado: pancada!'); this.bossTele(b, { x: b.pos.x + dir.x * 7, z: b.pos.z + dir.z * 7, r: 8.5, dur: 1.4 * F, dmg: atk * 1.5 }); this.snd.play('roar'); }
      else if (a === 'rocks') { b.busy = 1.3; b.atkT = 3.2 * F; b.anim = 'roar'; b.animT = 0; for (let i = 0; i < 8; i++) { const an = rand(0, TAU), r = i ? rand(2, 14) : 0; this.bossTele(b, { x: p.pos.x + Math.cos(an) * r, z: p.pos.z + Math.sin(an) * r, r: 3.6, dur: 1.2 + i * 0.18 * F, dmg: atk * 0.9 }); } }
      else if (a === 'stomp') { b.busy = 2.2 * F; b.atkT = 3 * F; b.anim = 'slam'; b.animT = 0; this.ui.toast('⬆️ Pule para desviar do anel!'); this.bossTele(b, { x: b.pos.x, z: b.pos.z, r: 16, dur: 1.7 * F, dmg: atk * 1.2, airDodge: true, color: 0xffa23a }); }
      else if (a === 'charge') { b.busy = 1.2; b.atkT = 3 * F; b.anim = 'roar'; b.animT = 0; const tx = p.pos.x, tz = p.pos.z; this.bossTele(b, { x: tx, z: tz, r: 5.5, dur: 1.1, dmg: atk * 1.4 }); this.later(1.1, () => { if (b.dead || !b.aggro) return; const ddx = tx - b.pos.x, ddz = tz - b.pos.z, l = Math.hypot(ddx, ddz) || 1; b.dash = { dx: ddx / l * 24, dz: ddz / l * 24, t: Math.min(0.9, l / 24) }; b.busy = 0.5; }); }
    } else {
      const a = dist < 14 ? pick(ph === 2 ? ['tail', 'breath', 'pools', 'meteors'] : ['tail', 'breath', 'pools']) : pick(ph === 2 ? ['breath', 'pools', 'dive', 'meteors'] : ['breath', 'pools', 'dive']);
      if (a === 'tail') { b.busy = 1.5; b.atkT = 2.4 * F; b.anim = 'slam'; b.animT = 0; this.bossTele(b, { x: b.pos.x, z: b.pos.z, r: 12, dur: 1.2 * F, dmg: atk * 1.3, airDodge: true, color: 0xffa23a }); this.ui.toast('⬆️ Pule sobre a cauda!'); }
      else if (a === 'breath') { b.busy = 1.9; b.atkT = 3 * F; b.anim = 'breath'; b.animT = 0; this.snd.play('roar'); const base = Math.atan2(dir.x, dir.z); for (let i = 0; i < 9; i++) this.later(0.7 + i * 0.09, () => { if (b.dead) return; const an = base + (i - 4) * 0.12, d = V(Math.sin(an), -0.04, Math.cos(an)); this.fireProj({ pos: V(b.pos.x + d.x * 5, b.pos.y + 4.4, b.pos.z + d.z * 5), dir: d, speed: 21, team: 'e', dmg: atk * 0.65, color: 0xff7a2a, size: 0.8, life: 2.2 }); }); }
      else if (a === 'pools') { b.busy = 1.2; b.atkT = 3 * F; b.anim = 'roar'; b.animT = 0; for (let i = 0; i < 6; i++) { const an = rand(0, TAU), r = i ? rand(3, 12) : 0; this.bossTele(b, { x: p.pos.x + Math.cos(an) * r, z: p.pos.z + Math.sin(an) * r, r: 4, dur: 1.3 + i * 0.15, dmg: atk * 0.9, linger: 4.5 }); } }
      else if (a === 'dive') { b.busy = 2.1; b.atkT = 3.2 * F; b.anim = 'roar'; b.animT = 0; const tx = p.pos.x, tz = p.pos.z; this.bossTele(b, { x: tx, z: tz, r: 7, dur: 1.7, dmg: atk * 1.6, color: 0xff2a2a }); const sx = b.pos.x, sz = b.pos.z; b.leap = { t: 0, dur: 1.7 }; this.later(0.01, () => { }); const step = (k) => { if (b.dead || !b.leap) return; b.leap.t += 0.05; const u = Math.min(1, b.leap.t / b.leap.dur); b.pos.x = lerp(sx, tx, u); b.pos.z = lerp(sz, tz, u); if (u < 1) this.later(0.05, () => step()); else b.leap = null; }; this.later(0.4, () => step()); }
      else if (a === 'meteors') { b.busy = 1.4; b.atkT = 3.6 * F; b.anim = 'roar'; b.animT = 0; this.snd.play('roar'); for (let i = 0; i < 10; i++) { const an = rand(0, TAU), r = i < 3 ? rand(0, 5) : rand(4, 20); this.bossTele(b, { x: p.pos.x + Math.cos(an) * r, z: p.pos.z + Math.sin(an) * r, r: 4.2, dur: 1.5 + i * 0.2, dmg: atk * 1.1, onHit: null }); } }
    }
  },
  animateBoss(b, dt, t) {
    const P = b.mesh.userData.parts, an = b.anim, k = b.animT;
    if (b.type === 'titan') {
      P.legL.rotation.x = Math.sin(t * 4) * 0.5 * b.moving; P.legR.rotation.x = -Math.sin(t * 4) * 0.5 * b.moving; P.torso.position.y = 2.6 + Math.abs(Math.sin(t * 4)) * 0.15 * b.moving + Math.sin(t * 1.4) * 0.05;
      let aL = Math.sin(t * 4) * 0.3 * b.moving, aR = -aL, hd = 0;
      if (an === 'slam') { const u = clamp(k / 1.3, 0, 1); aL = aR = u < 0.85 ? lerp(0, -3, u / 0.85) : lerp(-3, 0.4, (u - 0.85) / 0.15); }
      else if (an === 'roar') { aL = aR = -2 + Math.sin(k * 14) * 0.15; hd = -0.4; }
      P.armL.rotation.x += (aL - P.armL.rotation.x) * Math.min(1, dt * 10); P.armR.rotation.x += (aR - P.armR.rotation.x) * Math.min(1, dt * 10); P.head.rotation.x += (hd - P.head.rotation.x) * Math.min(1, dt * 8);
    } else {
      const flap = Math.sin(t * 5) * (b.leap ? 0.9 : 0.35); P.wingL.rotation.z = flap; P.wingR.rotation.z = -flap; P.body.position.y = 3.2 + Math.sin(t * 2.2) * 0.2; P.tail.rotation.y = Math.sin(t * 1.6) * 0.25;
      let nh = 0, hh = 0; if (an === 'breath') { nh = -0.3; hh = k > 0.5 && k < 1.5 ? 0.5 : -0.2; } else if (an === 'roar') { hh = -0.5; } P.neck.rotation.x += (nh - P.neck.rotation.x) * Math.min(1, dt * 8); P.head.rotation.x += (hh - P.head.rotation.x) * Math.min(1, dt * 8);
      if (an === 'breath' && k > 0.6 && k < 1.5 && Math.random() < 0.8) { const d = V(Math.sin(b.yaw), 0, Math.cos(b.yaw)); this.fx.spawn(b.pos.x + d.x * 6, b.pos.y + 4.5, b.pos.z + d.z * 6, d.x * 10 + rand(-2, 2), rand(-1, 2), d.z * 10 + rand(-2, 2), 0xff8a2a, 1.4, 0.5); }
    }
    if (b.anim && k > 2.4) b.anim = null;
  },
};
export function installCombat(Game) { Object.assign(Game.prototype, methods); }
