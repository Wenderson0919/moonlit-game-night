// Dados do jogo: raridades, itens, habilidades, monstros, chefes, missões.
import { clamp, rand, pick } from './util.js';

export const LEVEL_CAP = 40;
export const xpNeed = (l) => Math.floor(40 * Math.pow(l, 1.55));
export const RARITY = [
  { id: 'common', name: 'Comum', color: '#c9d1d9', mul: 1, w: 60 }, { id: 'uncommon', name: 'Incomum', color: '#5ddc6f', mul: 1.25, w: 26 },
  { id: 'rare', name: 'Raro', color: '#4da3ff', mul: 1.6, w: 10 }, { id: 'epic', name: 'Épico', color: '#b26bff', mul: 2.1, w: 3.4 }, { id: 'legend', name: 'Lendário', color: '#ffb23a', mul: 3, w: 0.6 },
];
export const SLOT_NAME = { weapon: 'Arma', armor: 'Armadura', trinket: 'Amuleto' };
const WEAPON_NAMES = { warrior: ['Espada', 'Lâmina', 'Montante', 'Alfanje'], mage: ['Cajado', 'Bastão', 'Cetro', 'Orbe'], archer: ['Arco', 'Arco Longo', 'Arco Curvo', 'Arco Rúnico'] };
const ARMOR_NAMES = ['Couraça', 'Manto', 'Túnica Reforçada', 'Peitoral', 'Brigantina'];
const TRINKET_NAMES = ['Amuleto', 'Talismã', 'Anel', 'Pingente', 'Relíquia'];
const SUFFIX = ['da Floresta', 'do Lobo', 'da Aurora', 'do Vulcão', 'das Neves', 'do Pântano', 'da Lua', 'do Dragão', 'do Titã', 'da Fúria'];
const PREFIX = ['Desgastada', 'Sólida', 'Afiada', 'Brilhante', 'Antiga', 'Encantada', 'Majestosa'];

export function rollRarity(boost = 0) {
  const w = RARITY.map((r, i) => r.w * (i === 0 ? Math.max(0.2, 1 - boost * 0.8) : 1 + boost * i * 1.2));
  let t = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0) return i; } return 0;
}
let uid = 1;
export function genItem(level, cls = 'warrior', boost = 0, forceRarity = null, forceSlot = null) {
  const ri = forceRarity ?? rollRarity(boost), R = RARITY[ri], slot = forceSlot || pick(['weapon', 'weapon', 'armor', 'armor', 'trinket']);
  const lv = Math.max(1, level), v = rand(0.9, 1.12), base = 4 + lv * 2.4;
  const it = { id: Date.now().toString(36) + (uid++), slot, rarity: ri, lvl: lv, plus: 0 };
  const suf = pick(SUFFIX);
  if (slot === 'weapon') { const n = pick(WEAPON_NAMES[cls]); it.name = (ri > 1 ? n : pick(PREFIX) + ' ' + n).replace(/^(\w)/, (c) => c.toUpperCase()) + (ri > 1 ? ' ' + suf : ''); it.atk = Math.round(base * 1.15 * R.mul * v); if (ri >= 2) it.crit = Math.round(ri * 2 + rand(0, 3)); it.tier = clamp(ri - 1, 0, 3); }
  else if (slot === 'armor') { it.name = pick(ARMOR_NAMES) + (ri > 0 ? ' ' + suf : ''); it.def = Math.round((2 + lv * 1.1) * R.mul * v); it.hp = Math.round((10 + lv * 6) * R.mul * v); }
  else { it.name = pick(TRINKET_NAMES) + ' ' + suf; it.crit = Math.round((2 + lv * 0.12) * R.mul * v); it.atk = Math.round(base * 0.35 * R.mul * v); it.hp = Math.round(lv * 3 * R.mul); }
  it.value = Math.round((6 + lv * 5) * R.mul * R.mul * (slot === 'weapon' ? 1.3 : 1));
  return it;
}
export const itemName = (it) => it.name + (it.plus ? ' +' + it.plus : '');
export const itemStats = (it) => { const o = []; const p = 1 + (it.plus || 0) * 0.12; if (it.atk) o.push(['Ataque', Math.round(it.atk * p)]); if (it.def) o.push(['Defesa', Math.round(it.def * p)]); if (it.hp) o.push(['Vida', Math.round(it.hp * p)]); if (it.crit) o.push(['Crítico', it.crit + '%']); return o; };

/* ---------- Classes: base e habilidades ---------- */
export const CLASS_BASE = {
  warrior: { hp: 130, mp: 70, atk: 9, def: 6, speed: 1, basic: { range: 3.4, arc: 2.1, mult: 1, cd: 0.5, kind: 'sword' } },
  mage: { hp: 85, mp: 120, atk: 12, def: 2, speed: 1, basic: { range: 26, mult: 0.9, cd: 0.55, kind: 'staff', proj: { speed: 26, color: 0x9fb4ff, r: 0.35 } } },
  archer: { hp: 100, mp: 90, atk: 10, def: 3, speed: 1.06, basic: { range: 30, mult: 0.95, cd: 0.45, kind: 'bow', proj: { speed: 40, color: 0xffe9a8, r: 0.22 } } },
};
export const SKILLS = {
  warrior: [
    { id: 'whirl', name: 'Giro de Lâminas', icon: '🌀', cost: 20, cd: 5, desc: 'Gira e atinge todos ao redor.' },
    { id: 'charge', name: 'Investida', icon: '💨', cost: 16, cd: 7, desc: 'Avança ferindo inimigos no caminho.' },
    { id: 'warcry', name: 'Grito de Guerra', icon: '📣', cost: 25, cd: 18, desc: '+35% ataque e defesa por 10s, cura 15%.' },
    { id: 'ult', name: 'Impacto Titânico', icon: '☄️', cost: 0, cd: 0, desc: 'Fúria: esmaga o chão com dano gigante.', ult: true },
  ],
  mage: [
    { id: 'fireball', name: 'Bola de Fogo', icon: '🔥', cost: 18, cd: 3, desc: 'Explode ao atingir, queimando em área.' },
    { id: 'frost', name: 'Nova de Gelo', icon: '❄️', cost: 24, cd: 8, desc: 'Explosão gélida que atordoa e retarda.' },
    { id: 'chain', name: 'Raio em Cadeia', icon: '⚡', cost: 22, cd: 6, desc: 'Salta entre até 4 inimigos.' },
    { id: 'ult', name: 'Chuva de Meteoros', icon: '☄️', cost: 0, cd: 0, desc: 'Fúria: meteoros caem sobre a área.', ult: true },
  ],
  archer: [
    { id: 'triple', name: 'Tiro Triplo', icon: '🏹', cost: 14, cd: 4, desc: 'Três flechas em leque.' },
    { id: 'rain', name: 'Chuva de Flechas', icon: '🌧️', cost: 26, cd: 9, desc: 'Cobre uma área com flechas.' },
    { id: 'leap', name: 'Salto Ágil', icon: '🦘', cost: 12, cd: 6, desc: 'Salta para trás e retarda perseguidores.' },
    { id: 'ult', name: 'Barragem Total', icon: '🎆', cost: 0, cd: 0, desc: 'Fúria: flechas em todas as direções.', ult: true },
  ],
};

/* ---------- Monstros ---------- */
export const MOBS = {
  wolf: { name: 'Lobo', hp: 42, atk: 7, spd: 5.4, range: 2.0, aggro: 20, xp: 9, gold: [2, 6], cd: 1.1 },
  boar: { name: 'Javali', hp: 66, atk: 9, spd: 4.3, range: 2.1, aggro: 15, xp: 12, gold: [3, 8], cd: 1.3 },
  slime: { name: 'Gosma', hp: 48, atk: 6, spd: 2.6, range: 1.8, aggro: 12, xp: 8, gold: [1, 5], cd: 1.2 },
  skeleton: { name: 'Esqueleto', hp: 60, atk: 11, spd: 3.7, range: 2.4, aggro: 20, xp: 14, gold: [4, 10], cd: 1.2 },
  yeti: { name: 'Yeti', hp: 150, atk: 19, spd: 3.5, range: 3.0, aggro: 18, xp: 28, gold: [8, 18], cd: 1.6 },
  scorpion: { name: 'Escorpião', hp: 84, atk: 15, spd: 4.4, range: 2.4, aggro: 18, xp: 20, gold: [6, 14], cd: 1.2 },
  golem: { name: 'Golem de Areia', hp: 210, atk: 23, spd: 2.8, range: 3.4, aggro: 16, xp: 36, gold: [10, 22], cd: 1.9 },
  frog: { name: 'Sapo Venenoso', hp: 72, atk: 13, spd: 3.8, range: 18, aggro: 20, xp: 18, gold: [5, 12], cd: 2.0, ranged: { color: 0x7ad84a, speed: 16 } },
  imp: { name: 'Diabrete', hp: 95, atk: 21, spd: 4.8, range: 20, aggro: 24, xp: 30, gold: [8, 18], cd: 1.8, ranged: { color: 0xff7a2a, speed: 18 } },
  magma: { name: 'Golem de Magma', hp: 330, atk: 36, spd: 2.9, range: 3.8, aggro: 18, xp: 60, gold: [20, 40], cd: 2.0 },
};
export const BIOME_MOBS = { forest: ['wolf', 'boar', 'slime'], snow: ['yeti', 'skeleton', 'wolf'], desert: ['scorpion', 'golem', 'skeleton'], swamp: ['frog', 'slime', 'skeleton'], volcano: ['imp', 'magma'] };
export const BIOME_LVL = { forest: 0, snow: 3, desert: 5, swamp: 7, volcano: 12 };
export const BIOME_NAME = { city: 'Cidade de Aventuria', forest: 'Floresta Esmeralda', snow: 'Montanhas Geladas', desert: 'Deserto Dourado', swamp: 'Pântano Sombrio', volcano: 'Vulcão Infernal' };
export const mobLevel = (dist, biome) => clamp(Math.floor(1 + (dist - 55) / 15 + (BIOME_LVL[biome] || 0)), 1, 38);

export const BOSSES = {
  titan: { name: 'Titã de Pedra', lvl: 18, hp: 9000, atk: 46, xp: 900, gold: 420, cost: 150, color: '#7ad7ff' },
  dragon: { name: 'Dragão Ígneo', lvl: 30, hp: 18000, atk: 78, xp: 2200, gold: 950, cost: 400, color: '#ff7a3a' },
};

/* ---------- Missões ---------- */
export function genQuests(level) {
  const pool = level < 8 ? ['wolf', 'boar', 'slime'] : level < 16 ? ['wolf', 'skeleton', 'yeti', 'scorpion', 'frog'] : ['yeti', 'golem', 'imp', 'magma', 'scorpion', 'frog'];
  const out = []; const used = new Set();
  while (out.length < 3) {
    const m = pick(pool); if (used.has(m)) continue; used.add(m);
    const n = 6 + ((Math.random() * 8) | 0), d = MOBS[m];
    out.push({ mob: m, n, got: 0, gold: Math.round(n * (d.gold[1] + level * 1.2) * 1.4), xp: Math.round(n * d.xp * (1 + level * 0.1) * 1.6) });
  }
  return out;
}
