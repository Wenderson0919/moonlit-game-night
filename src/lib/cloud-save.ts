import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { applyGrant, type Grant } from "./grants";

/**
 * O jogo (iframe, mesma origem) salva em localStorage. Esta camada copia esse save
 * para a conta do jogador na Lovable Cloud e o restaura ao entrar em qualquer aparelho.
 */
export const SAVE_KEY = "aventuria-save-v2";
const OWNER_KEY = "aventuria-save-owner";
const GRANT_POLL_MS = 8000;
const SYNC_POLL_MS = 15000;

/* eslint-disable @typescript-eslint/no-explicit-any */
type GameWin = any;

/** Coloca o personagem da conta no armazenamento do jogo antes de o jogo abrir. */
export async function prepareCloudSave(userId: string) {
  const { data, error } = await supabase.from("characters").select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  const owner = localStorage.getItem(OWNER_KEY);
  const cloud = data?.data as any;
  if (cloud && typeof cloud === "object" && cloud.name) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(cloud));
  } else if (owner && owner !== userId) {
    // save deste aparelho é de outra conta
    localStorage.removeItem(SAVE_KEY);
  }
  // save antigo sem dono (de antes do salvamento na conta) é adotado por esta conta
  localStorage.setItem(OWNER_KEY, userId);
}

export function startCloudSync(frame: HTMLIFrameElement, userId: string, email: string | null) {
  let lastSent = "";
  let pending: number | undefined;
  let stopped = false;

  async function push() {
    pending = undefined;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw || raw === lastSent || localStorage.getItem(OWNER_KEY) !== userId) return;
    let s: any;
    try { s = JSON.parse(raw); } catch { return; }
    if (!s?.name) return;
    lastSent = raw;
    const { error } = await supabase.from("characters").upsert({
      user_id: userId,
      email,
      name: String(s.name).slice(0, 40),
      class_name: String(s.className ?? "").slice(0, 40),
      level: Math.trunc(Number(s.level) || 1),
      gold: Math.trunc(Number(s.gold) || 0),
      data: s as Json,
      updated_at: new Date().toISOString(),
    });
    if (error) { lastSent = ""; console.warn("[save] falhou:", error.message); }
  }
  const schedule = () => { if (!pending) pending = window.setTimeout(push, 1500); };

  const onStorage = (e: StorageEvent) => { if (e.key === SAVE_KEY) schedule(); };
  window.addEventListener("storage", onStorage);
  const syncTimer = window.setInterval(schedule, SYNC_POLL_MS);
  lastSent = localStorage.getItem(SAVE_KEY) ?? "";

  async function applyGrants() {
    const w = frame.contentWindow as GameWin | null;
    if (stopped || !w || typeof w.genItem !== "function") return;
    const hasHero = () => {
      if (w.game?.running && w.MMO?.localState?.name) return true;
      try { return !!JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null")?.name; } catch { return false; }
    };
    if (!hasHero()) return; // presente fica guardado até o personagem existir
    const { data: rows } = await supabase
      .from("admin_grants").select("id, kind, payload")
      .eq("target_user_id", userId).is("applied_at", null).order("created_at");
    for (const row of rows ?? []) {
      // marca como aplicado antes (só um aparelho aplica cada presente)
      const { data: claimed } = await supabase.from("admin_grants")
        .update({ applied_at: new Date().toISOString() })
        .eq("id", row.id).is("applied_at", null).select("id");
      if (!claimed?.length) continue;
      const g = { kind: row.kind, payload: (row.payload ?? {}) as Record<string, unknown> } as Grant;
      const running = !!w.game?.running && w.MMO?.localState?.name;
      if (running) {
        const msg = applyGrant(w.MMO.localState, g, w.genItem);
        try {
          if (g.kind === "teleport" && w.game.player) {
            const pt = w.game.safeSpawnPoint?.() ?? null;
            if (pt) { w.game.player.x = pt.x; w.game.player.y = pt.y; }
          }
          w.updateUIStats?.(); w.saveGame?.(false);
        } catch { /* jogo ocupado */ }
        if (msg) w.showNotification?.((g.kind === "kick" || g.kind === "mute" ? "⚠️ " : "🎁 ") + msg, "#fbbf24");
        if (g.kind === "kick") {
          schedule();
          window.setTimeout(() => { window.location.href = "/"; }, 2500);
          return;
        }
      } else {
        if (g.kind === "kick" || g.kind === "teleport") { schedule(); continue; }
        let s: any | null = null;
        try { s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null"); } catch { s = null; }
        if (!s?.name) continue;
        applyGrant(s, g, w.genItem);
        localStorage.setItem(SAVE_KEY, JSON.stringify(s));
        const box = w.document.getElementById("continue-text");
        if (box) box.textContent = `Salvo: ${s.name} — ${s.className} ${s.race}, Nível ${s.level}`;
      }
      schedule();
    }
  }

  // Avisos globais e eventos do admin (valem só para quem está online a partir de agora)
  let since = new Date().toISOString();
  async function pollBroadcasts() {
    const w = frame.contentWindow as GameWin | null;
    if (stopped || !w?.game?.running) return;
    const { data: rows } = await supabase.from("admin_broadcasts")
      .select("id, kind, message, payload, created_at").gt("created_at", since).order("created_at");
    for (const r of rows ?? []) {
      since = r.created_at;
      try {
        if (r.kind === "announce") w.showNotification?.("📢 Admin: " + r.message, "#fbbf24");
        if (r.kind === "raid") {
          const tier = Number((r.payload as any)?.tier);
          w.game.spawnRaid?.(Number.isInteger(tier) && tier >= 0 && tier <= 4 ? tier : null, null, false);
          w.showNotification?.("⚔️ O admin invocou uma raid! Veja o painel de raids.", "#f87171");
        }
      } catch { /* jogo ocupado */ }
    }
  }

  const grantTimer = window.setInterval(() => { void applyGrants(); void pollBroadcasts(); }, GRANT_POLL_MS);
  const onLoad = () => void applyGrants();
  frame.addEventListener("load", onLoad);

  return () => {
    stopped = true;
    window.removeEventListener("storage", onStorage);
    frame.removeEventListener("load", onLoad);
    window.clearInterval(syncTimer);
    window.clearInterval(grantTimer);
    try { (frame.contentWindow as GameWin | null)?.saveGame?.(false); } catch { /* ignore */ }
    void push();
  };
}
