import { BUILDS, GEAR_SLOTS, LEVEL_CAP, MOUNTS, PETS, RESOURCES, TOOLS } from "./game-catalog";

export type GrantKind =
  | "level" | "gold" | "resource" | "tool" | "build" | "gear" | "pet" | "mount"
  | "heal" | "skillpoints" | "class" | "reset" | "mute" | "teleport" | "kick";
export type Grant = { kind: GrantKind; payload: Record<string, unknown> };

/* eslint-disable @typescript-eslint/no-explicit-any */
type State = any;
type GenItem = (slot: string, rar: number, ilvl: number) => any;

const int = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : d);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const xpNeed = (l: number) => Math.floor(120 * Math.pow(l, 1.85));
const nameOf = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name;

/** Aplica uma alteração/presente do admin no estado salvo do personagem. Retorna a mensagem mostrada ao jogador. */
export function applyGrant(s: State, g: Grant, genItem?: GenItem): string | null {
  const p: any = g.payload ?? {};
  switch (g.kind) {
    case "level": {
      const old = clamp(int(s.level, 1), 1, LEVEL_CAP);
      const lv = clamp(int(p.level, old), 1, LEVEL_CAP);
      s.level = lv;
      s.exp = 0;
      s.maxExp = xpNeed(lv);
      s.maxHp = Math.max(50, int(s.maxHp, 100) + (lv - old) * 12);
      if (lv > old) s.skillPoints = int(s.skillPoints, 0) + (lv - old);
      s.hp = s.maxHp;
      return `Seu nível agora é ${lv}!`;
    }
    case "gold": {
      const amount = int(p.amount, 0);
      const cur = int(s.gold, 0);
      s.gold = Math.max(0, p.mode === "add" ? cur + amount : amount);
      return p.mode === "add" ? `${amount >= 0 ? "+" : ""}${amount} Gold do admin!` : `Seu Gold agora é ${s.gold}.`;
    }
    case "resource": {
      const id = String(p.id ?? "");
      const name = nameOf(RESOURCES, id);
      if (!name) return null;
      const qty = clamp(int(p.qty, 1), 1, 100000);
      s.resources = s.resources ?? {};
      s.resources[id] = int(s.resources[id], 0) + qty;
      return `Presente: ${qty}x ${name}`;
    }
    case "tool": {
      const id = String(p.id ?? "");
      const name = nameOf(TOOLS, id);
      if (!name) return null;
      if (id === "sword_diamond") s.diamondSword = true;
      else { s.tools = s.tools ?? {}; s.tools[id] = true; }
      return `Presente: ${name}`;
    }
    case "build": {
      const id = String(p.id ?? "");
      const name = nameOf(BUILDS, id);
      if (!name) return null;
      const qty = clamp(int(p.qty, 1), 1, 1000);
      s.items = s.items ?? {};
      s.items[id] = int(s.items[id], 0) + qty;
      return `Presente: ${qty}x ${name}`;
    }
    case "gear": {
      const slot = String(p.slot ?? "weapon");
      if (!nameOf(GEAR_SLOTS, slot) || !genItem) return null;
      const rar = clamp(int(p.rar, 0), 0, 4);
      const ilvl = clamp(int(p.ilvl, int(s.level, 1)), 1, LEVEL_CAP);
      const it = genItem(slot, rar, ilvl);
      s.inventory = Array.isArray(s.inventory) ? s.inventory : [];
      s.inventory.push(it);
      return `Presente: ${it.name}`;
    }
    case "pet": {
      const id = String(p.id ?? "");
      const name = nameOf(PETS, id);
      if (!name) return null;
      const ex = (s.expansion = s.expansion ?? {});
      ex.petsOwned = Array.isArray(ex.petsOwned) ? ex.petsOwned : ex.pet ? [ex.pet] : [];
      if (!ex.petsOwned.includes(id)) ex.petsOwned.push(id);
      return `Presente: mascote ${name}`;
    }
    case "mount": {
      const id = String(p.id ?? "");
      const name = nameOf(MOUNTS, id);
      if (!name) return null;
      const ex = (s.expansion = s.expansion ?? {});
      const ms = (ex.mounts = ex.mounts ?? { owned: [], active: null, dist: 0 });
      ms.owned = Array.isArray(ms.owned) ? ms.owned : [];
      if (!ms.owned.includes(id)) ms.owned.push(id);
      return `Presente: montaria ${name}`;
    }
    case "heal": {
      s.hp = int(s.maxHp, 100);
      return "O admin curou você por completo!";
    }
    case "skillpoints": {
      const n = clamp(int(p.amount, 1), 1, 100);
      s.skillPoints = int(s.skillPoints, 0) + n;
      return `+${n} pontos de habilidade do admin!`;
    }
    case "class": {
      const c = String(p.id ?? "");
      if (!CLASSES.includes(c)) return null;
      s.className = c;
      return `Sua classe agora é ${c}!`;
    }
    case "reset": {
      s.level = 1; s.exp = 0; s.maxExp = xpNeed(1); s.gold = 0; s.skillPoints = 3;
      s.inventory = []; s.resources = {}; s.items = {};
      s.maxHp = 100; s.hp = 100;
      return "Seu personagem foi reiniciado pelo admin.";
    }
    case "mute": {
      const min = clamp(int(p.minutes, 10), 0, 60 * 24 * 30);
      s.mutedUntil = min ? Date.now() + min * 60000 : 0;
      return min ? `Você foi silenciado no chat por ${min} minuto(s).` : "Você pode falar no chat de novo.";
    }
    case "teleport": return "O admin levou você para a Área Safe.";
    case "kick": return "Você foi desconectado pelo admin.";
  }
  return null;
}

export const CLASSES = ["Guerreiro", "Mago", "Arqueiro", "Assassino", "Curandeiro"];

export function describeGrant(g: Grant): string {
  const p: any = g.payload ?? {};
  const id = String(p.id ?? "");
  switch (g.kind) {
    case "level": return `Nível → ${int(p.level, 1)}`;
    case "gold": return p.mode === "add" ? `Gold ${int(p.amount) >= 0 ? "+" : ""}${int(p.amount)}` : `Gold → ${int(p.amount)}`;
    case "resource": return `${int(p.qty, 1)}x ${nameOf(RESOURCES, id) ?? id}`;
    case "tool": return nameOf(TOOLS, id) ?? id;
    case "build": return `${int(p.qty, 1)}x ${nameOf(BUILDS, id) ?? id}`;
    case "gear": return `${nameOf(GEAR_SLOTS, String(p.slot)) ?? "Equipamento"} ${["Comum", "Incomum", "Raro", "Épico", "Lendário"][int(p.rar)] ?? ""}`;
    case "pet": return `Mascote ${nameOf(PETS, id) ?? id}`;
    case "mount": return `Montaria ${nameOf(MOUNTS, id) ?? id}`;
    case "heal": return "Cura completa";
    case "skillpoints": return `+${int(p.amount, 1)} pontos de habilidade`;
    case "class": return `Classe → ${id}`;
    case "reset": return "Reiniciar personagem";
    case "mute": return int(p.minutes, 0) ? `Silenciado ${int(p.minutes)} min` : "Fim do silêncio";
    case "teleport": return "Levado à Área Safe";
    case "kick": return "Desconectado";
  }
  return g.kind;
}
