// Núcleo do jogo: renderer, mundo, jogador, câmera, NPCs, baús, salvamento.
import * as THREE from './three.module.min.js';
import { clamp, lerp, rand, pick, smooth, TAU, angDiff, mulberry } from './util.js';
import { buildTerrain, buildWater, buildProps, buildCity, buildArenas, Sky, Weather, Colliders, heightAt, biomeAt, weights, SEA, CITY_R, HALF, NPC_SPOTS, TITAN_ARENA, DRAGON_ARENA, VOLC } from './world.js';
import { CLASSES, makeHumanoid, addWeapon, animateHumanoid, makeHorse, animateHorse, NPC_LOOKS, makeLabel, Particles, B, mat } from './models.js';
import { CLASS_BASE, SKILLS, xpNeed, LEVEL_CAP, genItem, BIOME_NAME } from './data.js';
import { Sound } from './audio.js';
import { installCombat } from './combat.js';
import { UI } from './ui.js';

const SAVE_KEY = 'aventuria3d-save-v1', OPT_KEY = 'aventuria3d-opts-v1';
export const IS_MOBILE = (window.matchMedia && matchMedia('(pointer:coarse)').matches) || /iPhone|iPad|Android/i.test(navigator.userAgent);
const DAY_SEC = 600;

export class Game {
  constructor(root) {
    this.root = root; this.mobile = IS_MOBILE; this.snd = new Sound();
    this.opts = Object.assign({ shadows: !IS_MOBILE, music: true, vol: 0.6, sens: 1, dist: 1, lowfx: IS_MOBILE }, this.readJSON(OPT_KEY));
    this.snd.vol = this.opts.vol; this.snd.music = this.opts.music;
    this.keys = {}; this.input = { jx: 0, jy: 0, attack: false, lookDX: 0, lookDY: 0 };
    this.enemies = []; this.projs = []; this.tele = []; this.drops = []; this.npcs = []; this.chests = []; this.zaps = []; this.boss = null; this.pop = [];
    this.running = false; this.hour = 10; this.night = 0; this.time = 0; this.last = 0; this.cYaw = 0.0; this.cPitch = 0.38; this.camDist = 8.5; this.shake = 0; this.hitStop = 0;
    this.cd = [0, 0, 0]; this.basicCd = 0; this.potionCd = 0; this.buffs = {}; this.lastHurt = -99; this.biome = 'city'; this.inCity = true; this.bossTimer = 480; this.spawnT = 0; this.saveT = 0; this.uiT = 0;
  }
  readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } }
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }

  /* ---------- Inicialização do mundo ---------- */
  init() {
    const mob = this.mobile;
    this.renderer = new THREE.WebGLRenderer({ antialias: !mob, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mob ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.shadowMap.enabled = !!this.opts.shadows;
    this.root.appendChild(this.renderer.domElement); this.canvas = this.renderer.domElement;
    this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(62, 1, 0.3, 1400); this.camPos = new THREE.Vector3(0, 6, 20);
    this.colliders = new Colliders(); this.cityLights = [];
    this.terrain = buildTerrain(); this.scene.add(this.terrain); this.water = buildWater(); this.scene.add(this.water);
    buildProps(this.scene, this.colliders); this.city = buildCity(this.scene, this.colliders, this.cityLights); buildArenas(this.scene, this.colliders);
    this.sky = new Sky(this.scene, mob); this.weather = new Weather(this.scene, mob); this.fx = new Particles(this.scene, mob ? 500 : 900);
    this.weather.onChange = (k) => this.ui && this.ui.toast({ clear: '☀️ O tempo abriu.', rain: '🌧️ Começou a chover.', storm: '⛈️ Uma tempestade se aproxima!', fog: '🌫️ Uma névoa densa cobre a terra.' }[k] || '');
    this.sky.dir.castShadow = !!this.opts.shadows; this.setupShadow();
    // lava do vulcão
    const lava = new THREE.Mesh(new THREE.CircleGeometry(11, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff5a14 })); lava.position.set(VOLC.x, heightAt(VOLC.x, VOLC.z) + 0.6, VOLC.z); this.scene.add(lava); this.lava = lava;
    this.lavaLight = new THREE.PointLight(0xff6a2a, 2, 90, 1.5); this.lavaLight.position.set(VOLC.x, lava.position.y + 4, VOLC.z); this.scene.add(this.lavaLight);
    this.buildNPCs(); this.buildChests(); this.buildMinimapBase();
    this.player = null; this.ui = new UI(this);
    this.bind(); this.resize(); window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    this.compile();
  }
  compile() { try { this.renderer.compile(this.scene, this.cam); } catch (e) { } }
  setupShadow() { const d = this.sky.dir; d.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048); const c = d.shadow.camera; c.left = -48; c.right = 48; c.top = 48; c.bottom = -48; c.near = 5; c.far = 260; d.shadow.bias = -0.0006; d.shadow.normalBias = 0.5; }
  setShadows(on) { this.opts.shadows = on; this.renderer.shadowMap.enabled = on; this.sky.dir.castShadow = on; this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); this.saveOpts(); }
  saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(this.opts)); } catch (e) { } }
  resize() { const w = this.root.clientWidth || innerWidth, h = this.root.clientHeight || innerHeight; this.renderer.setSize(w, h, false); this.canvas.style.width = '100%'; this.canvas.style.height = '100%'; this.cam.aspect = w / h; this.cam.fov = w / h < 1 ? 74 : 62; this.cam.updateProjectionMatrix(); this.fx.mesh.material.uniforms.scale.value = h * 0.9; }

  buildNPCs() {
    for (const id in NPC_SPOTS) {
      const sp = NPC_SPOTS[id], m = makeHumanoid(NPC_LOOKS[id]); m.position.set(sp.x, heightAt(sp.x, sp.z), sp.z); m.rotation.y = sp.face; this.scene.add(m);
      const lab = makeLabel(sp.label, '#ffe29a'); lab.position.set(0, 3.0, 0); m.add(lab);
      const ic = makeLabel(NPC_LOOKS[id].tag, '#ffffff'); ic.scale.set(2.4, 0.6, 1); ic.position.set(0, 3.7, 0); m.add(ic);
      this.npcs.push({ id, model: m, pos: m.position, label: sp.label, face: sp.face, ic });
    }
  }
  buildChests() {
    const r = mulberry(4242); let tries = 0;
    while (this.chests.length < 22 && tries++ < 600) {
      const x = (r() - 0.5) * 560, z = (r() - 0.5) * 560, d = Math.hypot(x, z); if (d < CITY_R + 25) continue; const h = heightAt(x, z); if (h < 0.6) continue;
      if (Math.hypot(x - TITAN_ARENA.x, z - TITAN_ARENA.z) < 34 || Math.hypot(x - DRAGON_ARENA.x, z - DRAGON_ARENA.z) < 34) continue;
      const g = new THREE.Group(); g.position.set(x, h, z); g.rotation.y = r() * TAU;
      B(g, 1.3, 0.8, 0.9, 0x7a4a22, 0, 0.4, 0); B(g, 1.34, 0.1, 0.94, 0xd8b24a, 0, 0.55, 0, 0.3); const lid = new THREE.Group(); lid.position.set(0, 0.8, -0.45); g.add(lid); B(lid, 1.3, 0.3, 0.9, 0x8a5a2e, 0, 0.12, 0.45); B(lid, 0.2, 0.3, 0.2, 0xd8b24a, 0, 0.0, 0.92, 0.4);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.7, 14, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 7; g.add(beam);
      this.scene.add(g); this.chests.push({ pos: g.position, g, lid, beam, open: false, t: 0 });
    }
  }
  buildMinimapBase() {
    const S = 320, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), im = c.createImageData(S, S), col = { forest: [78, 150, 62], snow: [225, 238, 245], desert: [220, 190, 120], swamp: [75, 105, 60], volcano: [70, 50, 48] };
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = (i / S - 0.5) * 640, z = (j / S - 0.5) * 640, h = heightAt(x, z); let rgb;
      if (h < SEA) rgb = [42, 120, 180]; else { const w = weights(x, z); rgb = [0, 0, 0]; for (const k in col) for (let q = 0; q < 3; q++) rgb[q] += col[k][q] * w[k]; if (Math.hypot(x, z) < CITY_R) rgb = [190, 180, 160]; const sh = 0.78 + clamp(h / 40, 0, 0.3); rgb = rgb.map((v) => v * sh); if (Math.hypot(x - VOLC.x, z - VOLC.z) < 11) rgb = [255, 100, 30]; }
      const o = (j * S + i) * 4; im.data[o] = rgb[0]; im.data[o + 1] = rgb[1]; im.data[o + 2] = rgb[2]; im.data[o + 3] = 255;
    }
    c.putImageData(im, 0, 0); this.mapBase = cv; this.mapS = S;
  }

  /* ---------- Novo jogo / salvamento ---------- */
  newGame(cls, name) {
    this.s = { name: (name || 'Herói').slice(0, 14), cls, lvl: 1, xp: 0, gold: 60, inv: [], eq: { weapon: null, armor: null, trinket: null }, potions: 3, fury: 0, pts: 0, attr: { pow: 0, vit: 0, agi: 0 }, quest: null, offers: null, kills: 0, bossKills: 0, deaths: 0, mount: false, blessing: 0, daily: { last: '', streak: 0 }, stock: null, stockLvl: 0, hour: 9, playTime: 0, opened: 0 };
    const w = genItem(1, cls, 0, 0, 'weapon'); w.name = { warrior: 'Espada de Treino', mage: 'Cajado de Apr.', archer: 'Arco de Caçador' }[cls]; w.atk = 4; w.value = 5; this.s.eq.weapon = w;
    this.p = null; this.afterLoad(true);
  }
  load() {
    let d; try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { d = null; } if (!d || !d.s) return false;
    this.s = d.s; this.s.attr ||= { pow: 0, vit: 0, agi: 0 }; this.s.eq ||= { weapon: null, armor: null, trinket: null }; this.s.daily ||= { last: '', streak: 0 };
    this.savedPos = d.pos; this.savedHp = d.hp; this.afterLoad(false); return true;
  }
  save() { if (!this.s || !this.p) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify({ s: this.s, pos: [this.p.pos.x, this.p.pos.z], hp: this.p.hp })); } catch (e) { } }
  afterLoad(fresh) {
    const s = this.s; this.stats(); const p = (this.p = { pos: new THREE.Vector3(0, 1, 16), vy: 0, yaw: Math.PI, hp: this.maxHp, mp: this.maxMp, vel: new THREE.Vector3(), dodgeT: 0, dodgeCd: 0, dash: null, atkAnim: -1, atkFace: 0, cast: 0, spin: 0, dead: false, mounted: false, grounded: true, iframes: 0, swim: false, moving: 0, walkT: 0 });
    if (!fresh && this.savedPos) { const [x, z] = this.savedPos; if (Math.hypot(x, z) < HALF - 30 && heightAt(x, z) > -0.4) { p.pos.x = x; p.pos.z = z; } p.hp = clamp(this.savedHp || this.maxHp, 1, this.maxHp); }
    p.pos.y = heightAt(p.pos.x, p.pos.z);
    if (this.hero) this.scene.remove(this.hero);
    this.hero = new THREE.Group(); this.model = makeHumanoid(CLASSES[s.cls]); this.hero.add(this.model); this.scene.add(this.hero); this.horse = makeHorse(); this.horse.visible = false; this.hero.add(this.horse);
    this.refreshWeapon(); this.hour = s.hour ?? 9; this.cYaw = 0; this.cPitch = 0.38;
    this.ui.onNewState(); this.running = true; this.ui.showHud(true); this.clearWorld(); this.save();
    for (const e of this.enemies) this.scene.remove(e.mesh); this.enemies = [];
    for (let i = 0; i < 14; i++) this.trySpawn(true);
  }
  clearWorld() { for (const e of this.enemies) this.scene.remove(e.mesh); this.enemies = []; for (const q of this.projs) this.scene.remove(q.mesh); this.projs = []; for (const d of this.drops) this.scene.remove(d.mesh); this.drops = []; for (const t of this.tele) this.scene.remove(t.mesh); this.tele = []; if (this.boss) { this.scene.remove(this.boss.mesh); this.boss = null; this.ui.bossBar(null); } }
  refreshWeapon() { const k = { warrior: 'sword', mage: 'staff', archer: 'bow' }[this.s.cls], w = this.s.eq.weapon; addWeapon(this.model, k, w ? w.tier || 0 : 0); this.wkind = k; }

  /* ---------- Atributos derivados ---------- */
  stats() {
    const s = this.s, b = CLASS_BASE[s.cls], eq = s.eq, f = (it, k) => (it && it[k] ? it[k] * (1 + (it.plus || 0) * 0.12) : 0), a = s.attr;
    this.maxHp = Math.round(b.hp + s.lvl * 18 + a.vit * 14 + f(eq.armor, 'hp') + f(eq.trinket, 'hp') + f(eq.weapon, 'hp'));
    this.maxMp = Math.round(b.mp + s.lvl * 4 + a.vit * 2);
    this.atk = b.atk + s.lvl * 2.4 + a.pow * 2.2 + f(eq.weapon, 'atk') + f(eq.trinket, 'atk') + f(eq.armor, 'atk');
    this.def = b.def + s.lvl * 0.9 + f(eq.armor, 'def') + f(eq.weapon, 'def') + f(eq.trinket, 'def');
    this.crit = 5 + a.agi * 1.0 + f(eq.weapon, 'crit') + f(eq.trinket, 'crit') + f(eq.armor, 'crit');
    this.speedMul = b.speed * (1 + a.agi * 0.004);
    if (this.p) { this.p.hp = Math.min(this.p.hp, this.maxHp); this.p.mp = Math.min(this.p.mp, this.maxMp); }
  }
  addXp(n) {
    const s = this.s; if (s.lvl >= LEVEL_CAP) return; if (s.blessing > 0) n *= 1.2; s.xp += Math.round(n);
    while (s.lvl < LEVEL_CAP && s.xp >= xpNeed(s.lvl)) { s.xp -= xpNeed(s.lvl); s.lvl++; s.pts += 2; this.stats(); this.p.hp = this.maxHp; this.p.mp = this.maxMp; this.snd.play('level'); this.ui.toast(`⭐ Nível ${s.lvl}! +2 pontos de atributo`, 'gold'); this.fx.burst(this.p.pos.x, this.p.pos.y + 1, this.p.pos.z, 0xffe08a, 40, 7, 0.9, 1.1, 2); this.ui.levelFlash(); s.stock = null; }
    if (s.lvl >= LEVEL_CAP) s.xp = 0;
  }
  addGold(n) { this.s.gold += Math.round(n); }
  giveItem(it) { if (this.s.inv.length >= 30) { this.addGold(it.value); this.ui.toast(`Mochila cheia — vendeu ${it.name} por ${it.value}🪙`); return false; } this.s.inv.push(it); return true; }
  equip(id) { const s = this.s, i = s.inv.findIndex((x) => x.id === id); if (i < 0) return; const it = s.inv[i], old = s.eq[it.slot]; s.eq[it.slot] = it; s.inv.splice(i, 1); if (old) s.inv.push(old); this.stats(); if (it.slot === 'weapon') this.refreshWeapon(); this.snd.play('pick'); this.ui.refreshPanels(); }
  unequip(slot) { const s = this.s, it = s.eq[slot]; if (!it) return; if (s.inv.length >= 30) return this.ui.toast('Mochila cheia.'); s.eq[slot] = null; s.inv.push(it); this.stats(); if (slot === 'weapon') this.refreshWeapon(); this.ui.refreshPanels(); }

  /* ---------- Entrada ---------- */
  bind() {
    const cv = this.canvas, down = (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.snd.unlock(); this.keys[e.code] = true; if (!this.running) return;
      const k = e.code;
      if (k === 'Escape') { if (this.ui.modalOpen) this.ui.closeModal(); else this.ui.openMenu(); return; }
      if (this.ui.modalOpen) { if (k === 'KeyI') this.ui.closeModal(); return; }
      if (e.repeat) return;
      if (k === 'KeyE') this.interact(); else if (k === 'Space') this.jump(); else if (k === 'ShiftLeft' || k === 'ShiftRight') this.dodge();
      else if (k === 'Digit1') this.castSkill(0); else if (k === 'Digit2') this.castSkill(1); else if (k === 'Digit3') this.castSkill(2); else if (k === 'Digit4' || k === 'KeyR') this.castUlt();
      else if (k === 'KeyQ' || k === 'KeyH') this.usePotion(); else if (k === 'KeyZ') this.toggleMount();
      else if (k === 'KeyI') this.ui.openPanel('bag'); else if (k === 'KeyC') this.ui.openPanel('attr'); else if (k === 'KeyJ') this.ui.openPanel('quest'); else if (k === 'KeyM') this.ui.openMap();
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(k)) e.preventDefault();
    };
    window.addEventListener('keydown', down); window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.input.attack = false; });
    cv.addEventListener('mousedown', (e) => { this.snd.unlock(); if (!this.running || this.ui.modalOpen) return; if (e.button === 0) { this.input.attack = true; if (!this.pointerLocked() && this.canvas.requestPointerLock && !this.mobile) { try { this.canvas.requestPointerLock(); } catch (er) { } } } if (e.button === 2) this.drag = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.input.attack = false; if (e.button === 2) this.drag = null; });
    window.addEventListener('mousemove', (e) => { if (this.ui.modalOpen) return; if (this.pointerLocked()) this.look(e.movementX, e.movementY); else if (this.drag) { this.look(e.clientX - this.drag.x, e.clientY - this.drag.y); this.drag = { x: e.clientX, y: e.clientY }; } });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('wheel', (e) => { this.camDist = clamp(this.camDist + Math.sign(e.deltaY) * 0.8, 4, 15); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { if (!this.pointerLocked()) this.input.attack = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.keys = {}; this.input.attack = false; this.input.jx = this.input.jy = 0; this.save(); } });
    window.addEventListener('beforeunload', () => this.save());
  }
  pointerLocked() { return document.pointerLockElement === this.canvas; }
  look(dx, dy) { const k = 0.0024 * this.opts.sens; this.cYaw -= dx * k; this.cPitch = clamp(this.cPitch + dy * k, -0.25, 1.15); }

  /* ---------- Loop ---------- */
  start() { this.last = performance.now(); const loop = (t) => { requestAnimationFrame(loop); const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t; this.frame(dt); }; requestAnimationFrame(loop); }
  frame(dt) {
    this.time += dt;
    if (this.running && this.p) { if (!this.ui.modalOpen) { if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.15; } this.update(dt); } else this.camUpdate(dt); }
    else this.idleOrbit(dt);
    this.renderer.render(this.scene, this.cam);
  }
  idleOrbit(dt) { this.cYaw += dt * 0.05; const t = this.time, x = Math.sin(t * 0.05) * 20, z = Math.cos(t * 0.05) * 20 + 90, y = heightAt(x, z) + 14; this.cam.position.set(x, y, z); this.cam.lookAt(0, 8, 0); this.night = this.sky.update(this.hour = (this.hour + dt * 24 / DAY_SEC) % 24, this.weather, this.cam, new THREE.Vector3(0, 0, 0), dt, this.time); this.weather.update(dt, this.cam, 'city', this.hour); this.envLights(dt); this.fx.update(dt); this.animateScenery(dt); }
  update(dt) {
    const p = this.p, s = this.s; s.playTime += dt;
    this.hour = (this.hour + dt * 24 / DAY_SEC) % 24; s.hour = this.hour;
    this.biomeCheck(dt); this.playerUpdate(dt);
    const night = this.sky.update(this.hour, this.weather, this.cam, p.pos, dt, this.time);
    this.night = night; this.wx = this.weather.update(dt, this.cam, this.biome, this.hour, () => { this.snd.play('thunder'); this.ui.flash('#ffffff'); });
    this.envLights(dt); this.updateEnemies(dt); this.updateSpawns(dt); this.updateBoss(dt); this.updateProjs(dt); this.updateTele(dt); this.updateDrops(dt); this.updateZaps(dt); this.updateSkills(dt);
    this.updateWorldObjects(dt); this.fx.update(dt); this.camUpdate(dt); this.ui.frame(dt);
    this.saveT += dt; if (this.saveT > 15) { this.saveT = 0; this.save(); }
    this.uiT += dt; if (this.uiT > 0.08) { this.uiT = 0; this.ui.update(); }
  }
  envLights(dt) {
    const dark = this.night || 0, on = clamp(dark * 1.4, 0, 1); for (const L of this.cityLights) L.intensity = on * 14;
    for (const b of this.city.userData.lamps) b.material.emissiveIntensity = 0.15 + on * 1.6; for (const w of this.city.userData.windows) w.material.emissiveIntensity = 0.1 + on * 0.9;
    this.city.userData.rune.material.opacity = 0.25 + Math.sin(this.time * 1.5) * 0.1; this.lavaLight.intensity = 2 + Math.sin(this.time * 7) * 0.4 + Math.sin(this.time * 3.1) * 0.3;
    this.renderer.toneMappingExposure = 1.05 + this.weather.flash * 1.2;
  }
  animateScenery(dt) { this.water.position.y = SEA + Math.sin(this.time * 0.8) * 0.06; for (const n of this.npcs) { const P = n.model.userData.parts; P.torso.position.y = 0.9 + Math.sin(this.time * 1.6 + n.model.userData.phase) * 0.012; } }
  biomeCheck(dt) {
    this.bcT = (this.bcT || 0) - dt; const p = this.p; this.inCity = Math.hypot(p.pos.x, p.pos.z) < CITY_R - 1;
    if (this.bcT > 0) return; this.bcT = 0.4; const b = biomeAt(p.pos.x, p.pos.z);
    if (b !== this.biome) { this.biome = b; this.ui.zoneBanner(BIOME_NAME[b], b === 'city'); }
  }
  updateWorldObjects(dt) {
    this.animateScenery(dt); const p = this.p, t = this.time;
    for (const n of this.npcs) { const d = Math.hypot(n.pos.x - p.pos.x, n.pos.z - p.pos.z), P = n.model.userData.parts; if (d < 14) { const want = Math.atan2(p.pos.x - n.pos.x, p.pos.z - n.pos.z); n.model.rotation.y += angDiff(n.model.rotation.y, want) * Math.min(1, dt * 4); P.head.rotation.y = 0; } else n.model.rotation.y += angDiff(n.model.rotation.y, n.face) * Math.min(1, dt * 2); n.ic.position.y = 3.7 + Math.sin(t * 2 + n.pos.x) * 0.1; }
    let near = null, nd = 4.5; for (const n of this.npcs) { const d = Math.hypot(n.pos.x - p.pos.x, n.pos.z - p.pos.z); if (d < nd) { nd = d; near = { type: 'npc', n, label: 'Falar com ' + n.label }; } }
    for (const c of this.chests) { c.beam.visible = !c.open; c.beam.material.opacity = 0.16 + Math.sin(t * 3 + c.pos.x) * 0.06; if (c.open) { c.t -= dt; c.lid.rotation.x = lerp(c.lid.rotation.x, -1.9, dt * 6); if (c.t <= 0) { c.open = false; c.lid.rotation.x = 0; } } const d = Math.hypot(c.pos.x - p.pos.x, c.pos.z - p.pos.z); if (!c.open && d < Math.min(nd, 3.4)) { nd = d; near = { type: 'chest', c, label: 'Abrir baú' }; } }
    if (this.boss && this.boss.dead && this.boss.chest) { const bc = this.boss.chest; if (!bc.open && Math.hypot(bc.pos.x - p.pos.x, bc.pos.z - p.pos.z) < 3.4) near = { type: 'bosschest', label: 'Abrir tesouro do chefe' }; }
    this.near = near; this.ui.prompt(near ? near.label : '');
  }
  interact() {
    const n = this.near; if (!n) return; this.snd.play('click');
    if (n.type === 'npc') this.ui.openNPC(n.n.id);
    else if (n.type === 'chest') this.openChest(n.c);
    else if (n.type === 'bosschest') this.openBossChest();
  }
  openChest(c) {
    c.open = true; c.t = 240; this.snd.play('pick'); const d = Math.hypot(c.pos.x, c.pos.z), lvl = Math.max(1, Math.floor(this.s.lvl * 0.5 + d / 22)), g = Math.round(lvl * rand(12, 22));
    this.addGold(g); this.fx.burst(c.pos.x, c.pos.y + 1, c.pos.z, 0xffd36b, 30, 6, 0.7, 1, 4); this.s.opened++;
    const it = genItem(lvl, this.s.cls, 0.8); this.giveItem(it); this.ui.toast(`🎁 Baú: ${g}🪙 + ${it.name}`, 'gold'); this.ui.refreshPanels();
    if (Math.random() < 0.5) { this.s.potions++; this.ui.toast('🧪 +1 poção'); }
  }

  /* ---------- Jogador ---------- */
  jump() { const p = this.p; if (p.dead) return; if (p.grounded) { p.vy = 10.5; p.grounded = false; this.snd.play('dodge'); } }
  dodge() { const p = this.p; if (p.dead || p.dodgeCd > 0 || p.mp < 8 || p.dodgeT > 0) return; p.mp -= 8; p.dodgeCd = 0.9; p.dodgeT = 0.34; p.iframes = 0.3; const d = this.moveDir(); if (d.lengthSq() < 0.01) { d.set(Math.sin(p.yaw), 0, Math.cos(p.yaw)); } p.dodgeDir = d.normalize(); p.yaw = Math.atan2(d.x, d.z); this.snd.play('dodge'); for (let i = 0; i < 8; i++) this.fx.spawn(p.pos.x, p.pos.y + 0.3, p.pos.z, rand(-1, 1), rand(0, 1), rand(-1, 1), 0xcfe8ff, 0.5, 0.4); }
  toggleMount() { const p = this.p, s = this.s; if (p.dead) return; if (!s.mount) { this.ui.toast('Compre uma montaria com o Mestre Aldric.'); this.snd.play('deny'); return; } p.mounted = !p.mounted; this.snd.play('mount'); this.horse.visible = p.mounted; this.fx.burst(p.pos.x, p.pos.y + 1, p.pos.z, 0xffffff, 14, 3, 0.6, 0.5, 2); }
  moveDir() {
    const k = this.keys, ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + this.input.jx, iy = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + this.input.jy;
    const fx = -Math.sin(this.cYaw), fz = -Math.cos(this.cYaw), rx = -fz, rz = fx; const v = new THREE.Vector3(fx * iy + rx * ix, 0, fz * iy + rz * ix); const l = v.length(); if (l > 1) v.divideScalar(l); return v;
  }
  playerUpdate(dt) {
    const p = this.p, m = this.model; p.iframes = Math.max(0, p.iframes - dt); p.dodgeCd = Math.max(0, p.dodgeCd - dt); p.cast = Math.max(0, p.cast - dt);
    for (const k in this.buffs) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) delete this.buffs[k]; } if (this.s.blessing > 0) this.s.blessing = Math.max(0, this.s.blessing - dt);
    if (p.dead) { m.rotation.x = lerp(m.rotation.x, -1.5, dt * 6); return; }
    const ground = heightAt(p.pos.x, p.pos.z); p.swim = ground < SEA + 0.1 && p.pos.y <= SEA + 0.3;
    let v = this.moveDir(), speed = 6.4 * this.speedMul * (p.mounted ? 1.85 : 1) * (this.buffs.warcry ? 1.12 : 1) * (p.swim ? 0.55 : 1) * (this.buffs.slow ? 0.5 : 1);
    if (this.biome === 'swamp' && !p.mounted) speed *= 0.9;
    const prev = p.pos.clone();
    if (p.dash) { const d = p.dash; d.t -= dt; p.pos.x += d.dir.x * d.speed * dt; p.pos.z += d.dir.z * d.speed * dt; if (d.onTick) d.onTick(dt); if (d.t <= 0) { const f = d.onEnd; p.dash = null; f && f(); } }
    else if (p.dodgeT > 0) { p.dodgeT -= dt; p.pos.x += p.dodgeDir.x * 15 * dt; p.pos.z += p.dodgeDir.z * 15 * dt; }
    else if (p.spin > 0) { p.spin -= dt; }
    else { const a = Math.min(1, dt * 12); p.vel.x = lerp(p.vel.x, v.x * speed, a); p.vel.z = lerp(p.vel.z, v.z * speed, a); p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt; }
    if (p.atkFace > 0) p.atkFace -= dt;
    const spd = Math.hypot(p.pos.x - prev.x, p.pos.z - prev.z) / Math.max(dt, 1e-4); p.moving = clamp(spd / 6.4, 0, 1.4);
    this.colliders.resolve(p.pos, 0.5);
    const lim = HALF - 25, d0 = Math.hypot(p.pos.x, p.pos.z); if (d0 > lim) { p.pos.x *= lim / d0; p.pos.z *= lim / d0; }
    const g2 = heightAt(p.pos.x, p.pos.z); if (g2 < SEA - 1.6) { p.pos.x = prev.x; p.pos.z = prev.z; p.vel.multiplyScalar(0); }
    const gy = Math.max(heightAt(p.pos.x, p.pos.z), SEA - 0.85);
    p.vy -= 30 * dt; p.pos.y += p.vy * dt; if (p.pos.y <= gy) { p.pos.y = gy; if (p.vy < -14) this.fx.burst(p.pos.x, gy + 0.2, p.pos.z, 0xcdbf9a, 8, 3, 0.5, 0.4, 5); p.vy = 0; p.grounded = true; } else p.grounded = p.pos.y - gy < 0.08;
    if (this.input.attack || this.keys.Mouse0) this.basicAttack();
    // direção do corpo
    if (p.dash || p.spin > 0) { } else if (p.atkFace > 0) { const target = this.aimYaw ?? p.yaw; p.yaw += angDiff(p.yaw, target) * Math.min(1, dt * 18); }
    else if (v.lengthSq() > 0.02 && p.dodgeT <= 0) { p.yaw += angDiff(p.yaw, Math.atan2(v.x, v.z)) * Math.min(1, dt * 14); }
    if (p.spin > 0) p.yaw += dt * 20;
    // regeneração
    const since = this.time - this.lastHurt, rate = this.inCity ? 0.08 : since > 5 ? 0.012 : 0; p.hp = Math.min(this.maxHp, p.hp + this.maxHp * rate * dt); p.mp = Math.min(this.maxMp, p.mp + (4 + this.maxMp * 0.03 + (this.inCity ? 8 : 0)) * dt);
    this.potionCd = Math.max(0, this.potionCd - dt); this.basicCd = Math.max(0, this.basicCd - dt);
    // modelo
    this.hero.position.set(p.pos.x, p.pos.y + (p.swim ? -0.35 : 0), p.pos.z); this.hero.rotation.y = p.yaw; p.walkT += dt * (0.4 + p.moving);
    m.rotation.x = lerp(m.rotation.x, 0, dt * 10); m.position.y = p.mounted ? 1.25 : 0;
    if (p.atkAnim >= 0) { p.atkAnim += dt / (this.atkDur || 0.35); if (p.atkAnim > 1) p.atkAnim = -1; }
    animateHumanoid(m, { speed: p.mounted ? 0 : clamp(p.moving, 0, 1), t: p.walkT * 1.0, atk: p.atkAnim, kind: this.wkind, cast: p.cast, mounted: p.mounted });
    if (p.mounted) animateHorse(this.horse, clamp(p.moving, 0, 1.2), this.time);
    if (p.dodgeT > 0) { m.rotation.x = 0.7; } if (p.swim && p.moving > 0.2 && Math.random() < 0.3) this.fx.spawn(p.pos.x + rand(-0.4, 0.4), SEA + 0.1, p.pos.z + rand(-0.4, 0.4), 0, 1.2, 0, 0xffffff, 0.4, 0.5, 4);
    if (!p.mounted && p.moving > 0.6 && p.grounded && Math.random() < 0.12 && !p.swim) this.fx.spawn(p.pos.x, p.pos.y + 0.1, p.pos.z, rand(-0.4, 0.4), 0.6, rand(-0.4, 0.4), 0xb9ad8a, 0.35, 0.45, 1);
    if (this.buffs.warcry && Math.random() < 0.4) this.fx.spawn(p.pos.x + rand(-0.5, 0.5), p.pos.y + 0.2, p.pos.z + rand(-0.5, 0.5), 0, 2.2, 0, 0xffa23a, 0.45, 0.6);
  }
  camUpdate(dt) {
    const p = this.p; if (!p) return; const d = this.camDist * (p.mounted ? 1.2 : 1) * this.opts.dist, cp = this.cPitch, cy = this.cYaw;
    const tgt = new THREE.Vector3(p.pos.x, p.pos.y + (p.mounted ? 2.5 : 1.75), p.pos.z), des = new THREE.Vector3(tgt.x + Math.sin(cy) * Math.cos(cp) * d, tgt.y + Math.sin(cp) * d, tgt.z + Math.cos(cy) * Math.cos(cp) * d);
    const gy = Math.max(heightAt(des.x, des.z), SEA) + 0.9; if (des.y < gy) des.y = gy;
    // oclusão do terreno: aproxima a câmera se houver colina entre ela e o herói
    for (let k = 1; k <= 10; k++) { const u = k / 10, x = lerp(tgt.x, des.x, u), z = lerp(tgt.z, des.z, u), y = lerp(tgt.y, des.y, u), gh = Math.max(heightAt(x, z), SEA) + 0.6; if (y < gh || (u > 0.4 && y < gh + 6 && this.colliders.near(x, z, 1.1))) { const uu = Math.max(0.12, (k - 1) / 10); des.set(lerp(tgt.x, des.x, uu), Math.max(lerp(tgt.y, des.y, uu), gh), lerp(tgt.z, des.z, uu)); break; } }
    this.camPos.lerp(des, 1 - Math.exp(-16 * dt)); this.cam.position.copy(this.camPos);
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt * 2.5); this.cam.position.x += rand(-1, 1) * this.shake * 0.5; this.cam.position.y += rand(-1, 1) * this.shake * 0.5; }
    this.cam.lookAt(tgt.x, tgt.y + 0.3, tgt.z);
  }
}

installCombat(Game);
