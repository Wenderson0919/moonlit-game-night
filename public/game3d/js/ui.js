// Interface: HUD, minimapa, painéis, diálogos de NPC, menu, controles de toque.
import * as THREE from './three.module.min.js';
import { clamp, fmt, TAU } from './util.js';
import { CLASSES } from './models.js';
import { CLASS_BASE, SKILLS, RARITY, SLOT_NAME, xpNeed, LEVEL_CAP, MOBS, BOSSES, genItem, genQuests, itemName, itemStats, BIOME_NAME } from './data.js';
import { heightAt, CITY_R, NPC_SPOTS, TITAN_ARENA, DRAGON_ARENA, SEA } from './world.js';

const $ = (id) => document.getElementById(id);
const SLOT_ICON = (cls, slot) => slot === 'weapon' ? { warrior: '⚔️', mage: '🪄', archer: '🏹' }[cls] : slot === 'armor' ? '🛡️' : '📿';
const WP = [['Floresta Esmeralda (sul)', 0, 95], ['Montanhas Geladas', -175, -175], ['Deserto Dourado', 175, 175], ['Pântano Sombrio', -175, 175], ['Sopé do Vulcão', 105, -95], ['Ruínas do Titã', -118, 48], ['Covil do Dragão', 128, -88]];
const W_ICON = { clear: '☀️', rain: '🌧️', storm: '⛈️', fog: '🌫️' };

export class UI {
  constructor(g) {
    this.g = g; this.modalOpen = false; this.render = null; this.tab = 'bag'; this.pops = []; this.mm = $('minimap').getContext('2d'); this.last = {}; this.selItem = null;
    this.buildHotbar(); this.bindStatic(); if (g.mobile) this.bindTouch(); document.body.classList.toggle('mobile', g.mobile);
  }
  buildHotbar() {
    const bar = $('hotbar'); bar.innerHTML = '';
    const slots = [['atk', '', 'LMB', 'atk'], ['s0', '', '1', 's'], ['s1', '', '2', 's'], ['s2', '', '3', 's'], ['ult', '', 'R', 'ult'], ['pot', '🧪', 'Q', 'pot'], ['mnt', '🐎', 'Z', 'mnt']];
    for (const [id, ic, key] of slots) { const d = document.createElement('div'); d.className = 'slot'; d.id = 'sl-' + id; d.innerHTML = `<span class="ic">${ic}</span><span class="key">${key}</span><i class="cd"></i><b class="cnt"></b>`; bar.appendChild(d); d.addEventListener('pointerdown', (e) => { e.preventDefault(); this.g.snd.unlock(); this.press(id); }); }
  }
  press(id) {
    const g = this.g; if (!g.running || this.modalOpen) return;
    if (id === 'atk') { g.basicAttack(); } else if (id[0] === 's') g.castSkill(+id[1]); else if (id === 'ult') g.castUlt(); else if (id === 'pot') g.usePotion(); else if (id === 'mnt') g.toggleMount(); else if (id === 'jump') g.jump(); else if (id === 'dodge') g.dodge(); else if (id === 'use') g.interact();
  }
  bindStatic() {
    const g = this.g;
    $('b-menu').onclick = () => this.openMenu(); $('b-bag').onclick = () => this.openPanel('bag'); $('b-map').onclick = () => this.openMap();
    $('modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') this.closeModal(); });
    $('btn-respawn').onclick = () => { g.snd.unlock(); g.respawn(); };
    document.addEventListener('keydown', (e) => { if (e.code === 'Enter' && $('start').style.display !== 'none' && document.activeElement?.id !== 'hero-name') $('btn-play').click(); });
    // tela inicial
    this.cls = 'warrior'; const cards = $('classes'); cards.innerHTML = '';
    for (const k in CLASSES) { const c = CLASSES[k], d = document.createElement('div'); d.className = 'card' + (k === this.cls ? ' sel' : ''); d.dataset.k = k; d.innerHTML = `<div class="big">${c.icon}</div><h3 style="color:${c.color}">${c.name}</h3><p>${c.desc}</p><small>${SKILLS[k].map((s) => s.icon + ' ' + s.name).join('<br>')}</small>`; d.onclick = () => { this.cls = k; cards.querySelectorAll('.card').forEach((x) => x.classList.toggle('sel', x.dataset.k === k)); g.snd.unlock(); g.snd.play('click'); }; cards.appendChild(d); }
    $('btn-play').onclick = () => { g.snd.unlock(); const n = $('hero-name').value.trim() || 'Herói'; if (g.hasSave() && !this.confirmNew) { this.confirmNew = true; $('btn-play').textContent = 'Apagar progresso e começar?'; return; } this.confirmNew = false; $('btn-play').textContent = 'Novo Herói'; g.newGame(this.cls, n); $('start').style.display = 'none'; };
    $('btn-continue').onclick = () => { g.snd.unlock(); if (g.load()) $('start').style.display = 'none'; };
    if (g.hasSave()) { try { const d = JSON.parse(localStorage.getItem('aventuria3d-save-v1')).s; $('btn-continue').style.display = 'block'; $('btn-continue').innerHTML = `▶ Continuar — ${d.name}, ${CLASSES[d.cls].name} Nv.${d.lvl}`; } catch (e) { } }
    if (!g.mobile) $('help-line').textContent = 'WASD mover · Mouse olhar · Clique atacar · 1-3 habilidades · R fúria · Shift esquiva · Espaço pular · E interagir · Q poção · Z montaria · I mochila · M mapa';
    else $('help-line').textContent = 'Joystick à esquerda · arraste a direita para olhar · botões de ação à direita';
  }
  onNewState() { this.buildHotbarIcons(); this.last = {}; this.refreshPanels(); }
  buildHotbarIcons() { const g = this.g, sk = SKILLS[g.s.cls], base = CLASS_BASE[g.s.cls]; $('sl-atk').querySelector('.ic').textContent = { warrior: '⚔️', mage: '🪄', archer: '🏹' }[g.s.cls]; for (let i = 0; i < 3; i++) { $('sl-s' + i).querySelector('.ic').textContent = sk[i].icon; $('sl-s' + i).title = sk[i].name + ' — ' + sk[i].desc + ` (${sk[i].cost} energia, ${sk[i].cd}s)`; } $('sl-ult').querySelector('.ic').textContent = '🔥'; $('sl-ult').title = sk[3].name + ' — ' + sk[3].desc; document.querySelectorAll('.tbtn[data-s]').forEach((b) => { const i = +b.dataset.s; b.querySelector('.ic').textContent = sk[i].icon; }); }
  showHud(on) { $('hud').style.display = on ? 'block' : 'none'; if (this.g.mobile) $('touch').style.display = on ? 'block' : 'none'; }

  /* ---------- Avisos ---------- */
  toast(msg, cls = '') { if (!msg) return; const box = $('toasts'), d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = msg; box.appendChild(d); while (box.children.length > 5) box.firstChild.remove(); setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 500); }, 3600); }
  flash(color) { const f = $('flash'); f.style.background = color; f.style.transition = 'none'; f.style.opacity = '0.45'; requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = '0'; }); }
  levelFlash() { const l = $('levelup'); l.classList.remove('go'); void l.offsetWidth; l.classList.add('go'); }
  zoneBanner(name, safe) { const z = $('zone'); z.textContent = (safe ? '🛡 ' : '') + name + (safe ? ' — Zona Segura' : ''); z.classList.remove('go'); void z.offsetWidth; z.classList.add('go'); }
  prompt(t) { const p = $('prompt'); if (t !== this.lastPrompt) { this.lastPrompt = t; p.style.display = t ? 'block' : 'none'; p.innerHTML = t ? (this.g.mobile ? '' : '<kbd>E</kbd> ') + t : ''; const u = $('tb-use'); if (u) u.style.display = t ? 'flex' : 'none'; } }
  popup(pos, text, cls = 'dmg') { if (this.pops.length > 26) { const o = this.pops.shift(); o.el.remove(); } const el = document.createElement('div'); el.className = 'pop ' + cls; el.textContent = typeof text === 'number' ? fmt(text) : text; $('popups').appendChild(el); this.pops.push({ el, pos: pos.clone(), t: 0, dx: (Math.random() - 0.5) * 30 }); }
  bossBar(b) { const w = $('boss'); if (!b) { if (w.style.display !== 'none') w.style.display = 'none'; return; } w.style.display = 'block'; if (this.last.boss !== b.def.name) { this.last.boss = b.def.name; $('boss-name').textContent = b.def.name + ' — Nv.' + b.def.lvl; } $('boss-fill').style.width = clamp(b.hp / b.max * 100, 0, 100) + '%'; $('boss-fill').style.background = b.phase === 2 ? 'linear-gradient(#ff5a3a,#a8201a)' : ''; }
  deathScreen(on) { $('death').style.display = on ? 'flex' : 'none'; if (on) { document.exitPointerLock && document.exitPointerLock(); $('death-sub').textContent = `Perderá 8% do ouro (${Math.floor(this.g.s.gold * 0.08)}🪙) ao renascer na cidade.`; } }

  /* ---------- Frame / HUD ---------- */
  frame(dt) {
    const g = this.g, cam = g.cam, v = new THREE.Vector3(), W = g.root.clientWidth, H = g.root.clientHeight; cam.updateMatrixWorld();
    for (let i = this.pops.length - 1; i >= 0; i--) { const o = this.pops[i]; o.t += dt; if (o.t > 1.1) { o.el.remove(); this.pops.splice(i, 1); continue; } v.copy(o.pos); v.y += o.t * 1.6; v.project(cam); if (v.z > 1) { o.el.style.display = 'none'; continue; } o.el.style.display = 'block'; o.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * W + o.dx * o.t}px,${(-v.y * 0.5 + 0.5) * H}px) translate(-50%,-50%)`; o.el.style.opacity = o.t > 0.7 ? 1 - (o.t - 0.7) / 0.4 : 1; }
  }
  update() {
    const g = this.g, s = g.s, p = g.p; if (!s || !p) return; const set = (id, v) => { if (this.last[id] !== v) { this.last[id] = v; $(id).textContent = v; } };
    $('hp-fill').style.width = clamp(p.hp / g.maxHp * 100, 0, 100) + '%'; $('mp-fill').style.width = clamp(p.mp / g.maxMp * 100, 0, 100) + '%'; $('xp-fill').style.width = (s.lvl >= LEVEL_CAP ? 100 : clamp(s.xp / xpNeed(s.lvl) * 100, 0, 100)) + '%'; $('fury-fill').style.width = clamp(s.fury, 0, 100) + '%'; $('fury').classList.toggle('full', s.fury >= 100);
    set('hp-txt', `${Math.ceil(p.hp)} / ${g.maxHp}`); set('mp-txt', `${Math.floor(p.mp)} / ${g.maxMp}`); set('lvl', s.lvl); set('pname', `${s.name} · ${CLASSES[s.cls].name}`); set('gold', fmt(s.gold)); set('xp-txt', s.lvl >= LEVEL_CAP ? 'MÁX' : `${fmt(s.xp)}/${fmt(xpNeed(s.lvl))}`);
    const h = g.hour, hh = Math.floor(h), mm = Math.floor((h - hh) * 60); set('clock', `${(g.night > 0.5 ? '🌙' : '☀️')} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${W_ICON[g.weather.kind] || ''}`); set('zone-mini', BIOME_NAME[g.biome] || '');
    const b = $('buffs'), bf = []; if (g.buffs.warcry) bf.push('📣 ' + Math.ceil(g.buffs.warcry) + 's'); if (s.blessing > 0) bf.push('✨ ' + Math.ceil(s.blessing / 60) + 'min'); if (p.mounted) bf.push('🐎'); const bs = bf.join('  '); if (this.last.buffs !== bs) { this.last.buffs = bs; b.textContent = bs; }
    const sk = SKILLS[s.cls]; for (let i = 0; i < 3; i++) { const el = $('sl-s' + i), cd = g.cd[i], mx = g.cdMax?.[i] || sk[i].cd; el.querySelector('.cd').style.height = cd > 0 ? (cd / mx * 100) + '%' : '0'; el.classList.toggle('nomp', p.mp < sk[i].cost); document.querySelectorAll(`.tbtn[data-s="${i}"]`).forEach((t) => { t.querySelector('.cd').style.height = cd > 0 ? (cd / mx * 100) + '%' : '0'; t.classList.toggle('nomp', p.mp < sk[i].cost); }); }
    $('sl-ult').classList.toggle('ready', s.fury >= 100); $('sl-pot').querySelector('.cnt').textContent = s.potions; $('sl-pot').querySelector('.cd').style.height = g.potionCd > 0 ? g.potionCd / 6 * 100 + '%' : '0'; $('sl-mnt').style.opacity = s.mount ? 1 : 0.3; $('sl-mnt').classList.toggle('on', p.mounted); $('sl-atk').querySelector('.cd').style.height = g.basicCd > 0 ? '100%' : '0';
    document.querySelectorAll('.tbtn[data-k="ult"]').forEach((t) => t.classList.toggle('ready', s.fury >= 100)); document.querySelectorAll('.tbtn[data-k="pot"] .cnt').forEach((t) => (t.textContent = s.potions));
    const q = s.quest; set('quest', q ? `📜 ${MOBS[q.mob].name}: ${q.got}/${q.n}${q.got >= q.n ? ' ✔ — volte ao Cronista' : ''}` : ''); $('quest').style.display = q ? 'block' : 'none';
    this.minimap(); if (g.boss && g.boss.aggro && !g.boss.dead) this.bossBar(g.boss);
    if (!g.mobile && this.last.pts !== s.pts) { this.last.pts = s.pts; $('b-bag').classList.toggle('alert', s.pts > 0); }
  }
  minimap() {
    const g = this.g, c = this.mm, S = 160, R = 95, base = g.mapBase, bs = g.mapS, p = g.p; if (!base) return;
    const px = (p.pos.x / 640 + 0.5) * bs, pz = (p.pos.z / 640 + 0.5) * bs, win = R / 640 * bs * 2; c.save(); c.clearRect(0, 0, S, S); c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 1, 0, TAU); c.clip(); c.fillStyle = '#2a7fb8'; c.fillRect(0, 0, S, S);
    c.save(); c.translate(S / 2, S / 2); c.rotate(g.cYaw); c.translate(-S / 2, -S / 2); c.drawImage(base, px - win / 2, pz - win / 2, win, win, 0, 0, S, S);
    const m = S / (R * 2), toM = (x, z) => [(x - p.pos.x) * m + S / 2, (z - p.pos.z) * m + S / 2], dot = (x, z, col, r) => { const [a, b] = toM(x, z); if (a < -4 || b < -4 || a > S + 4 || b > S + 4) return; c.fillStyle = col; c.beginPath(); c.arc(a, b, r, 0, TAU); c.fill(); };
    if (g.inCity || Math.hypot(p.pos.x, p.pos.z) < CITY_R + 60) for (const n of g.npcs) dot(n.pos.x, n.pos.z, '#ffe29a', 2.6);
    for (const ch of g.chests) if (!ch.open) dot(ch.pos.x, ch.pos.z, '#ff9d2a', 2.4);
    for (const e of g.enemies) if (!e.dead) dot(e.pos.x, e.pos.z, e.elite ? '#ffd36b' : '#ff4a3a', e.elite ? 3 : 2);
    if (g.boss) { const bb = g.boss; if (bb.dead) { if (bb.chest && !bb.chest.open) dot(bb.chest.pos.x, bb.chest.pos.z, '#ffd36b', 4); } else dot(bb.pos.x, bb.pos.z, '#ff2a2a', 5); }
    c.restore(); c.restore();
    c.save(); c.translate(S / 2, S / 2); c.rotate(g.cYaw - p.yaw); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 7); c.lineTo(5, -5); c.lineTo(0, -2); c.lineTo(-5, -5); c.closePath(); c.fill(); c.stroke(); c.restore();
    if (g.boss && !g.boss.dead) { const dx = g.boss.pos.x - p.pos.x, dz = g.boss.pos.z - p.pos.z, d = Math.hypot(dx, dz); if (d > R * 0.9) { const cs = Math.cos(g.cYaw), sn = Math.sin(g.cYaw), rx = (dx * cs - dz * sn) / d, ry = (dx * sn + dz * cs) / d; c.fillStyle = '#ff2a2a'; c.strokeStyle = '#000'; c.beginPath(); c.arc(S / 2 + rx * (S / 2 - 9), S / 2 + ry * (S / 2 - 9), 5, 0, TAU); c.fill(); c.stroke(); } }
  }

  /* ---------- Modais ---------- */
  showModal(title, body, bind, wide) { this.modalOpen = true; document.exitPointerLock && document.exitPointerLock(); const m = $('modal'); m.style.display = 'flex'; $('mbox').className = wide ? 'wide' : ''; $('mtitle').innerHTML = title; $('mbody').innerHTML = body; $('mclose').onclick = () => this.closeModal(); if (bind) bind($('mbody')); this.g.input.attack = false; this.g.input.jx = this.g.input.jy = 0; this.g.keys = {}; }
  closeModal() { this.modalOpen = false; this.render = null; $('modal').style.display = 'none'; this.g.save && this.g.save(); }
  refreshPanels() { if (this.modalOpen && this.render) this.render(); }
  open(fn) { this.render = fn; fn(); }
  tabs(list, cur, attr = 'tab') { return `<div class="tabs">${list.map(([k, l]) => `<button class="tab ${k === cur ? 'on' : ''}" data-${attr}="${k}">${l}</button>`).join('')}</div>`; }
  itemTip(it, cmp) {
    const R = RARITY[it.rarity], st = itemStats(it), c = cmp ? itemStats(cmp) : [], cv = (n) => { const o = c.find((x) => x[0] === n); return o ? parseFloat(o[1]) : 0; };
    return `<div class="tip"><b style="color:${R.color}">${itemName(it)}</b><div class="dim">${R.name} · ${SLOT_NAME[it.slot]} · Nv.${it.lvl}</div>${st.map(([n, v]) => { const d = cmp ? parseFloat(v) - cv(n) : 0; return `<div>${n}: <b>${v}</b>${cmp && d ? ` <span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>` : ''}</div>`; }).join('')}<div class="dim">Valor: ${it.value}🪙</div></div>`;
  }
  slotHtml(it, extra = '') { if (!it) return '<div class="islot empty"></div>'; const R = RARITY[it.rarity]; return `<div class="islot ${extra}" style="border-color:${R.color};box-shadow:inset 0 0 12px ${R.color}55" data-id="${it.id}"><span>${SLOT_ICON(this.g.s.cls, it.slot)}</span>${it.plus ? `<i>+${it.plus}</i>` : ''}</div>`; }
  openPanel(tab) { this.tab = tab || this.tab; this.open(() => this.renderPanel()); }
  renderPanel() {
    const g = this.g, s = g.s, tab = this.tab;
    const tabsHtml = this.tabs([['bag', '🎒 Mochila'], ['attr', '📊 Atributos'], ['quest', '📜 Missões']], tab);
    let body = '';
    if (tab === 'bag') {
      const eq = s.eq, sel = s.inv.find((i) => i.id === this.selItem) || (Object.values(eq).find((i) => i && i.id === this.selItem));
      body = `<div class="cols"><div class="col"><h4>Equipamento</h4><div class="eqrow">${['weapon', 'armor', 'trinket'].map((k) => `<div class="eqs"><small>${SLOT_NAME[k]}</small>${this.slotHtml(eq[k], 'eq')}</div>`).join('')}</div>
        <h4>Mochila <small>${s.inv.length}/30</small></h4><div class="grid">${s.inv.map((i) => this.slotHtml(i, i.id === this.selItem ? 'sel' : '')).join('')}${Array.from({ length: Math.max(0, 30 - s.inv.length) }, () => '<div class="islot empty"></div>').join('')}</div></div>
        <div class="col side"><div id="itemdetail">${sel ? this.itemTip(sel, eq[sel.slot] !== sel ? eq[sel.slot] : null) + (eq[sel.slot] === sel ? '<button class="btn" id="bt-un">Desequipar</button>' : '<button class="btn gold" id="bt-eq">Equipar</button> <button class="btn" id="bt-sell">Vender (' + sel.value + '🪙)</button>') : '<div class="dim">Selecione um item.</div>'}</div>
        <hr><div class="dim">Ataque <b>${Math.round(g.atk)}</b> · Defesa <b>${Math.round(g.def)}</b> · Crítico <b>${g.crit.toFixed(0)}%</b><br>Vida <b>${g.maxHp}</b> · Energia <b>${g.maxMp}</b><br>🪙 <b>${fmt(s.gold)}</b> · 🧪 <b>${s.potions}</b></div></div></div>`;
    } else if (tab === 'attr') {
      const a = s.attr, row = (k, n, d) => `<div class="arow"><div><b>${n}</b> <span class="dim">${d}</span></div><div><b>${a[k]}</b> <button class="btn sm" data-add="${k}" ${s.pts > 0 ? '' : 'disabled'}>+</button></div></div>`;
      body = `<div class="cols"><div class="col"><h4>Pontos disponíveis: <span class="gold">${s.pts}</span></h4>${row('pow', '💪 Poder', '+2,2 ataque')}${row('vit', '❤️ Vitalidade', '+14 vida, +2 energia')}${row('agi', '⚡ Agilidade', '+1% crítico, +0,4% velocidade')}<p class="dim">Você ganha 2 pontos por nível. O Mestre Aldric pode redistribuí-los.</p></div>
        <div class="col side"><h4>Habilidades</h4>${SKILLS[s.cls].map((k, i) => `<div class="skl"><span>${k.icon}</span><div><b>${k.name}</b> <small class="dim">${k.ult ? 'Fúria (R)' : 'tecla ' + (i + 1) + ' · ' + k.cost + ' energia · ' + k.cd + 's'}</small><br><small>${k.desc}</small></div></div>`).join('')}</div></div>`;
    } else {
      const q = s.quest;
      body = `<div class="col"><h4>Missão ativa</h4>${q ? `<div class="qcard"><b>Caçar ${q.n}× ${MOBS[q.mob].name}</b><div class="bar"><i style="width:${q.got / q.n * 100}%"></i></div><small>${q.got}/${q.n} · Recompensa: ${q.gold}🪙 e ${q.xp} XP</small><br><small class="dim">${q.got >= q.n ? 'Concluída! Volte ao Cronista Orin na cidade.' : 'Fale com o Cronista Orin para aceitar outra.'}</small></div><button class="btn" id="bt-abandon">Abandonar</button>` : '<div class="dim">Nenhuma missão. Fale com o Cronista Orin na cidade.</div>'}
        <h4>Registro de aventura</h4><div class="dim">Monstros abatidos: <b>${s.kills}</b> · Chefes: <b>${s.bossKills}</b> · Baús: <b>${s.opened}</b> · Quedas: <b>${s.deaths}</b><br>Tempo de jogo: <b>${Math.floor(s.playTime / 60)} min</b></div></div>`;
    }
    this.showModal('📖 ' + s.name, tabsHtml + body, (b) => {
      b.querySelectorAll('[data-tab]').forEach((t) => (t.onclick = () => { this.tab = t.dataset.tab; g.snd.play('click'); this.renderPanel(); }));
      b.querySelectorAll('.islot[data-id]').forEach((el) => (el.onclick = () => { this.selItem = el.dataset.id; g.snd.play('click'); this.renderPanel(); }));
      b.querySelectorAll('[data-add]').forEach((el) => (el.onclick = () => { if (s.pts > 0) { s.pts--; s.attr[el.dataset.add]++; g.stats(); g.snd.play('click'); this.renderPanel(); } }));
      const q = (id) => b.querySelector('#' + id);
      if (q('bt-eq')) q('bt-eq').onclick = () => g.equip(this.selItem); if (q('bt-un')) q('bt-un').onclick = () => { const slot = Object.keys(s.eq).find((k) => s.eq[k]?.id === this.selItem); g.unequip(slot); };
      if (q('bt-sell')) q('bt-sell').onclick = () => { const i = s.inv.findIndex((x) => x.id === this.selItem); if (i >= 0) { g.addGold(s.inv[i].value); s.inv.splice(i, 1); g.snd.play('coin'); this.selItem = null; this.renderPanel(); } };
      if (q('bt-abandon')) q('bt-abandon').onclick = () => { s.quest = null; this.renderPanel(); };
    }, true);
  }

  openMap() {
    const g = this.g; this.open(() => {
      this.showModal('🗺️ Mapa de Aventuria', '<canvas id="bigmap" width="560" height="560"></canvas><div class="legend dim">🟡 NPCs · 🟠 Baús · 🔴 Chefe · ⚪ Você</div>', (b) => {
        const c = b.querySelector('#bigmap'), x = c.getContext('2d'), S = 560; x.imageSmoothingEnabled = false; x.drawImage(g.mapBase, 0, 0, S, S); const m = S / 640, P = (a, z) => [(a + 320) * m, (z + 320) * m], dot = (a, z, col, r) => { const [u, v] = P(a, z); x.fillStyle = col; x.strokeStyle = '#000'; x.lineWidth = 1; x.beginPath(); x.arc(u, v, r, 0, TAU); x.fill(); x.stroke(); };
        x.strokeStyle = '#fff8'; x.lineWidth = 2; x.beginPath(); x.arc(...P(0, 0), CITY_R * m, 0, TAU); x.stroke();
        for (const ch of g.chests) if (!ch.open) dot(ch.pos.x, ch.pos.z, '#ff9d2a', 4); for (const n of g.npcs) dot(n.pos.x, n.pos.z, '#ffe29a', 3); for (const [nm, a, z] of [['Titã', TITAN_ARENA.x, TITAN_ARENA.z], ['Dragão', DRAGON_ARENA.x, DRAGON_ARENA.z]]) { dot(a, z, '#ff2a2a', g.boss && g.boss.type === (nm === 'Titã' ? 'titan' : 'dragon') && !g.boss.dead ? 8 : 4); x.fillStyle = '#fff'; x.font = 'bold 12px sans-serif'; const [u, v] = P(a, z); x.strokeText(nm, u + 8, v + 4); x.fillText(nm, u + 8, v + 4); }
        const [u, v] = P(g.p.pos.x, g.p.pos.z); x.save(); x.translate(u, v); x.rotate(-g.p.yaw); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.beginPath(); x.moveTo(0, 9); x.lineTo(7, -7); x.lineTo(0, -3); x.lineTo(-7, -7); x.closePath(); x.fill(); x.stroke(); x.restore();
      }, true);
    });
  }
  openMenu() {
    const g = this.g, o = g.opts; this.open(() => {
      this.showModal('⚙️ Menu', `<div class="menu">
        <label>Volume <input type="range" id="o-vol" min="0" max="1" step="0.05" value="${o.vol}"></label>
        <label>Sensibilidade da câmera <input type="range" id="o-sens" min="0.4" max="2.2" step="0.1" value="${o.sens}"></label>
        <label>Distância da câmera <input type="range" id="o-dist" min="0.7" max="1.5" step="0.05" value="${o.dist}"></label>
        <label><input type="checkbox" id="o-music" ${o.music ? 'checked' : ''}> Música ambiente</label>
        <label><input type="checkbox" id="o-shadow" ${o.shadows ? 'checked' : ''}> Sombras (usa mais GPU)</label>
        <div class="row"><button class="btn gold" id="m-resume">Continuar</button><button class="btn" id="m-save">💾 Salvar</button><button class="btn" id="m-fs">⛶ Tela cheia</button></div>
        <div class="row"><button class="btn" id="m-stuck">🆘 Estou preso (voltar à cidade)</button></div>
        <p class="dim">${g.mobile ? 'Joystick à esquerda, arraste a direita para girar a câmera.' : 'WASD mover · Mouse olhar (clique no jogo) · Clique atacar · 1-3 habilidades · R fúria · Shift esquiva · Espaço pular · E interagir · Q poção · Z montaria · I mochila · M mapa · Esc menu'}</p>
        <p class="dim">O jogo salva sozinho a cada 15 segundos e ao fechar.</p></div>`, (b) => {
        const q = (id) => b.querySelector('#' + id);
        q('o-vol').oninput = (e) => { o.vol = +e.target.value; g.snd.setVol(o.vol); g.saveOpts(); }; q('o-sens').oninput = (e) => { o.sens = +e.target.value; g.saveOpts(); }; q('o-dist').oninput = (e) => { o.dist = +e.target.value; g.saveOpts(); };
        q('o-music').onchange = (e) => { o.music = e.target.checked; g.snd.setMusic(o.music); g.saveOpts(); }; q('o-shadow').onchange = (e) => g.setShadows(e.target.checked);
        q('m-resume').onclick = () => this.closeModal(); q('m-save').onclick = () => { g.save(); this.toast('💾 Jogo salvo.'); };
        q('m-fs').onclick = () => { const de = document.documentElement; (de.requestFullscreen || de.webkitRequestFullscreen)?.call(de); }; q('m-stuck').onclick = () => { const p = g.p; p.pos.set(0, 1, 16); p.pos.y = heightAt(0, 16); p.vy = 0; this.closeModal(); };
      });
    });
  }

  /* ---------- NPCs ---------- */
  openNPC(id) { this.open(() => this['npc_' + id]()); }
  npcFrame(title, say, body, bind) { const g = this.g; this.showModal(title, `<div class="say">“${say}”</div>${body}`, bind); }
  npc_merchant() {
    const g = this.g, s = g.s, mode = this.mtab || 'buy', price = Math.round(25 + s.lvl * 3);
    if (!s.stock || s.stockLvl !== s.lvl) { s.stock = Array.from({ length: 4 }, () => genItem(s.lvl + ((Math.random() * 3) | 0), s.cls, 0.5)); s.stockLvl = s.lvl; }
    let body = this.tabs([['buy', 'Comprar'], ['sell', 'Vender']], mode, 'mt') + `<div class="dim">🪙 ${fmt(s.gold)}</div>`;
    if (mode === 'buy') body += `<div class="shop"><div class="srow"><span>🧪 Poção de Cura <small class="dim">(restaura 50% vida)</small></span><button class="btn gold" data-p="1">${price}🪙</button></div>${s.stock.map((it, i) => `<div class="srow"><div class="tipw">${this.slotHtml(it)}<div>${this.itemTip(it, s.eq[it.slot])}</div></div><button class="btn gold" data-b="${i}">${it.value * 3}🪙</button></div>`).join('') || '<div class="dim">Esgotado.</div>'}</div>`;
    else body += `<div class="shop"><div class="row"><button class="btn" id="sell-low">Vender Comuns e Incomuns</button></div>${s.inv.map((it) => `<div class="srow"><div class="tipw">${this.slotHtml(it)}<div>${this.itemTip(it, s.eq[it.slot])}</div></div><button class="btn" data-s="${it.id}">${it.value}🪙</button></div>`).join('') || '<div class="dim">Mochila vazia.</div>'}</div>`;
    this.npcFrame('🛒 Mercador Bram', 'Poções, armas e tralhas! Tudo pelo melhor preço de Aventuria.', body, (b) => {
      b.querySelectorAll('[data-mt]').forEach((t) => (t.onclick = () => { this.mtab = t.dataset.mt; g.snd.play('click'); this.npc_merchant(); }));
      b.querySelectorAll('[data-p]').forEach((t) => (t.onclick = () => { if (s.gold < price) return this.deny(); s.gold -= price; s.potions++; g.snd.play('coin'); this.npc_merchant(); }));
      b.querySelectorAll('[data-b]').forEach((t) => (t.onclick = () => { const it = s.stock[+t.dataset.b]; if (!it) return; const c = it.value * 3; if (s.gold < c) return this.deny(); if (s.inv.length >= 30) return this.toast('Mochila cheia.'); s.gold -= c; s.inv.push(it); s.stock.splice(+t.dataset.b, 1); g.snd.play('coin'); this.npc_merchant(); }));
      b.querySelectorAll('[data-s]').forEach((t) => (t.onclick = () => { const i = s.inv.findIndex((x) => x.id === t.dataset.s); if (i >= 0) { g.addGold(s.inv[i].value); s.inv.splice(i, 1); g.snd.play('coin'); this.npc_merchant(); } }));
      const sl = b.querySelector('#sell-low'); if (sl) sl.onclick = () => { let n = 0, tot = 0; s.inv = s.inv.filter((it) => { if (it.rarity <= 1) { tot += it.value; n++; return false; } return true; }); g.addGold(tot); g.snd.play('coin'); this.toast(`Vendeu ${n} itens por ${tot}🪙`); this.npc_merchant(); };
    });
  }
  deny() { this.g.snd.play('deny'); this.toast('Ouro insuficiente.'); }
  npc_smith() {
    const g = this.g, s = g.s, sel = this.smSel || 'weapon', it = s.eq[sel], CH = [100, 95, 90, 80, 70, 60, 50, 40, 30, 20];
    let body = this.tabs([['weapon', 'Arma'], ['armor', 'Armadura'], ['trinket', 'Amuleto']], sel, 'st');
    if (!it) body += '<div class="dim">Nada equipado neste espaço.</div>'; else {
      const cost = Math.round(20 + it.value * 0.7 * Math.pow(it.plus + 1, 1.35)), max = it.plus >= 10;
      body += `<div class="tipw">${this.slotHtml(it)}<div>${this.itemTip(it)}</div></div>${max ? '<div class="gold">Aprimoramento máximo (+10)!</div>' : `<p>Aprimorar para <b>+${it.plus + 1}</b> (+12% dos atributos base): chance <b>${CH[it.plus]}%</b>. Falhas só consomem o ouro.</p><button class="btn gold" id="bt-up">Aprimorar — ${cost}🪙</button>`}`;
      this.smCost = cost;
    }
    this.npcFrame('⚒️ Ferreira Helga', 'Traga seu equipamento. Eu o deixo afiado como dente de dragão.', body, (b) => {
      b.querySelectorAll('[data-st]').forEach((t) => (t.onclick = () => { this.smSel = t.dataset.st; g.snd.play('click'); this.npc_smith(); }));
      const u = b.querySelector('#bt-up'); if (u) u.onclick = () => { if (s.gold < this.smCost) return this.deny(); s.gold -= this.smCost; if (Math.random() * 100 < CH[it.plus]) { it.plus++; it.value = Math.round(it.value * 1.25); g.stats(); g.snd.play('level'); this.toast(`🔨 Sucesso! ${it.name} +${it.plus}`, 'gold'); g.fx.burst(g.p.pos.x, g.p.pos.y + 1.5, g.p.pos.z, 0xffd36b, 30, 5, 0.8, 0.8, 2); } else { g.snd.play('deny'); this.toast('💥 O aprimoramento falhou…'); } this.npc_smith(); };
    });
  }
  npc_healer() {
    const g = this.g, s = g.s, p = g.p, cost = 60 + s.lvl * 12;
    this.npcFrame('✚ Curandeira Lyra', 'Que a luz da lua proteja seus passos, viajante.', `<div class="row"><button class="btn gold" id="h-heal">Curar tudo (grátis)</button></div><div class="row"><button class="btn" id="h-bless">✨ Bênção de Aventuria — ${cost}🪙</button></div><p class="dim">Bênção: +20% de XP e dano por 10 minutos.${s.blessing > 0 ? ' <b>Ativa: ' + Math.ceil(s.blessing / 60) + ' min</b>' : ''}</p>`, (b) => {
      b.querySelector('#h-heal').onclick = () => { p.hp = g.maxHp; p.mp = g.maxMp; g.snd.play('potion'); g.fx.burst(p.pos.x, p.pos.y + 1, p.pos.z, 0x6aff9a, 30, 4, 0.7, 1, -1); this.toast('💚 Totalmente restaurado.'); };
      b.querySelector('#h-bless').onclick = () => { if (s.gold < cost) return this.deny(); s.gold -= cost; s.blessing = 600; g.snd.play('level'); this.toast('✨ Bênção recebida!', 'gold'); this.npc_healer(); };
    });
  }
  npc_chronicler() {
    const g = this.g, s = g.s, q = s.quest, today = new Date().toISOString().slice(0, 10), claimed = s.daily.last === today;
    let body = `<h4>🎁 Presente diário</h4>${claimed ? '<div class="dim">Já recebido hoje. Sequência: ' + s.daily.streak + ' dia(s).</div>' : '<button class="btn gold" id="c-daily">Receber presente (sequência: ' + (s.daily.streak + 1) + ')</button>'}<h4>📜 Missões de caça</h4>`;
    if (q) { body += `<div class="qcard"><b>Caçar ${q.n}× ${MOBS[q.mob].name}</b> — ${q.got}/${q.n}<div class="bar"><i style="width:${q.got / q.n * 100}%"></i></div><small>Recompensa: ${q.gold}🪙 · ${q.xp} XP</small></div>${q.got >= q.n ? '<button class="btn gold" id="c-claim">Entregar missão</button>' : ''}`; }
    else { s.offers ||= genQuests(s.lvl); body += s.offers.map((o, i) => `<div class="srow"><div><b>Caçar ${o.n}× ${MOBS[o.mob].name}</b><br><small class="dim">${o.gold}🪙 · ${o.xp} XP</small></div><button class="btn gold" data-q="${i}">Aceitar</button></div>`).join(''); }
    this.npcFrame('📜 Cronista Orin', 'Cada herói escreve sua lenda. Qual será a sua?', body, (b) => {
      const d = b.querySelector('#c-daily'); if (d) d.onclick = () => { const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); s.daily.streak = s.daily.last === y ? s.daily.streak + 1 : 1; s.daily.last = today; const n = s.daily.streak; g.addGold(40 * n + s.lvl * 10); s.potions += 2; this.toast(`🎁 Dia ${n}: ${40 * n + s.lvl * 10}🪙 + 2 poções`, 'gold'); if (n % 7 === 0) { g.giveItem(genItem(s.lvl + 3, s.cls, 2, 3)); this.toast('💜 Bônus semanal: item Épico!', 'gold'); } g.snd.play('win'); this.npc_chronicler(); };
      const c = b.querySelector('#c-claim'); if (c) c.onclick = () => { g.addGold(q.gold); g.addXp(q.xp); s.quest = null; s.offers = null; g.snd.play('win'); this.toast(`✅ +${q.gold}🪙 +${q.xp} XP`, 'gold'); this.npc_chronicler(); };
      b.querySelectorAll('[data-q]').forEach((t) => (t.onclick = () => { if (!s.offers) return; s.quest = Object.assign({}, s.offers[+t.dataset.q]); s.offers = null; g.snd.play('pick'); this.npc_chronicler(); }));
    });
  }
  npc_guardian() {
    const g = this.g, s = g.s, B = g.boss && !g.boss.dead, cost = 20;
    let body = `<h4>Invocar chefes ${B ? '<small class="dim">(já há um ativo)</small>' : ''}</h4>` + Object.entries(BOSSES).map(([k, d]) => `<div class="srow"><div><b style="color:${d.color}">${d.name}</b> <small class="dim">Nv.${d.lvl}</small><br><small class="dim">${k === 'titan' ? 'Ruínas a oeste da cidade' : 'Ao pé do vulcão, a nordeste'} · Tesouro lendário</small></div><button class="btn gold" data-boss="${k}" ${B || s.gold < d.cost ? 'disabled' : ''}>${d.cost}🪙</button></div>`).join('') + `<h4>Viagem rápida <small class="dim">(${cost}🪙)</small></h4><div class="grid2">${WP.map((w, i) => `<button class="btn" data-w="${i}">${w[0]}</button>`).join('')}</div>`;
    this.npcFrame('🛡 Guardião Kael', 'Os portões estão sob minha guarda. Além deles, só os bravos sobrevivem.', body, (b) => {
      b.querySelectorAll('[data-boss]').forEach((t) => (t.onclick = () => { const d = BOSSES[t.dataset.boss]; if (s.gold < d.cost) return this.deny(); s.gold -= d.cost; this.closeModal(); g.spawnBoss(t.dataset.boss, true); }));
      b.querySelectorAll('[data-w]').forEach((t) => (t.onclick = () => { if (s.gold < cost) return this.deny(); const w = WP[+t.dataset.w]; let x = w[1], z = w[2], tries = 0; while (heightAt(x, z) < 0.6 && tries++ < 40) { x *= 0.95; z *= 0.95; } s.gold -= cost; const p = g.p; p.pos.set(x, heightAt(x, z), z); p.vy = 0; g.camPos.set(x, p.pos.y + 6, z + 10); this.closeModal(); g.snd.play('mount'); g.fx.burst(x, p.pos.y + 1, z, 0x9fb4ff, 40, 6, 0.9, 1, 1); g.clearWorld && g.enemies.forEach((e) => g.scene.remove(e.mesh)); g.enemies = []; for (let i = 0; i < 10; i++) g.trySpawn(true); }));
    });
  }
  npc_trainer() {
    const g = this.g, s = g.s, used = s.attr.pow + s.attr.vit + s.attr.agi, rc = s.lvl * 20;
    this.npcFrame('⭐ Mestre Aldric', 'Treino, montarias e sabedoria — tudo que um herói precisa.', `<h4>🐎 Montaria</h4>${s.mount ? '<div class="dim">Você já possui um cavalo. Aperte <b>Z</b> (ou o botão 🐎) para montar.</div>' : '<p>Um corcel veloz (+85% de velocidade) para atravessar o mundo.</p><button class="btn gold" id="t-mount">Comprar cavalo — 400🪙</button>'}<h4>♻️ Redistribuir atributos</h4><p class="dim">Pontos gastos: ${used}. Custo: ${rc}🪙.</p><button class="btn" id="t-reset" ${used ? '' : 'disabled'}>Reiniciar atributos</button><h4>💡 Dicas</h4><ul class="dim"><li>A Fúria (barra) enche matando monstros; solte com R.</li><li>Elites ☠ dropam itens raros.</li><li>Chefes têm ataques telegrafados: saia dos círculos vermelhos — e pule sobre os anéis laranja!</li><li>À noite os monstros são mais perigosos.</li></ul>`, (b) => {
      const m = b.querySelector('#t-mount'); if (m) m.onclick = () => { if (s.gold < 400) return this.deny(); s.gold -= 400; s.mount = true; g.snd.play('win'); this.toast('🐎 Cavalo adquirido! Aperte Z.', 'gold'); this.npc_trainer(); };
      b.querySelector('#t-reset').onclick = () => { if (s.gold < rc) return this.deny(); s.gold -= rc; s.pts += used; s.attr = { pow: 0, vit: 0, agi: 0 }; g.stats(); g.snd.play('level'); this.npc_trainer(); };
    });
  }

  /* ---------- Controles de toque ---------- */
  bindTouch() {
    const g = this.g, root = $('touch'), joy = $('joy'), knob = $('knob'); let jid = null, lid = null, jc = null, lp = null;
    const area = $('touch-area');
    area.addEventListener('pointerdown', (e) => {
      g.snd.unlock(); if (this.modalOpen) return; area.setPointerCapture && 0;
      if (e.clientX < innerWidth * 0.42 && jid === null) { jid = e.pointerId; jc = { x: e.clientX, y: e.clientY }; joy.style.display = 'block'; joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; knob.style.transform = 'translate(-50%,-50%)'; }
      else if (lid === null) { lid = e.pointerId; lp = { x: e.clientX, y: e.clientY }; }
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerId === jid) { let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const l = Math.hypot(dx, dy), m = 56; if (l > m) { dx = dx / l * m; dy = dy / l * m; } knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`; const nx = dx / m, ny = dy / m, dz = 0.12; g.input.jx = Math.abs(nx) < dz ? 0 : nx; g.input.jy = Math.abs(ny) < dz ? 0 : -ny; }
      else if (e.pointerId === lid) { g.look((e.clientX - lp.x) * 1.4, (e.clientY - lp.y) * 1.4); lp = { x: e.clientX, y: e.clientY }; }
    });
    const up = (e) => { if (e.pointerId === jid) { jid = null; joy.style.display = 'none'; g.input.jx = g.input.jy = 0; } if (e.pointerId === lid) lid = null; };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    root.querySelectorAll('.tbtn').forEach((b) => {
      const k = b.dataset.k, s = b.dataset.s; let held = false;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); g.snd.unlock(); b.classList.add('down'); if (k === 'atk') { held = true; g.input.attack = true; } else if (s !== undefined) this.press('s' + s); else this.press(k); });
      const end = () => { b.classList.remove('down'); if (held) { held = false; g.input.attack = false; } }; b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('pointerleave', end);
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault()); document.addEventListener('gesturestart', (e) => e.preventDefault());
    let lt = 0; document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lt < 350 && !/INPUT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); lt = n; }, { passive: false });
  }
}
