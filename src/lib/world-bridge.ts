import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Substitui o antigo server.js: o jogo (no iframe) fala "WebSocket" com esta ponte,
 * que usa canais em tempo real da Lovable Cloud para sincronizar todos os jogadores.
 */
const SEED = 20260101;
const CX = (32 * 125) / 2;
const SAFE_R = 260;
const SNAP_MS = 50;
const SEND_MS = 100;
// O serviço de presença derruba o canal se "track" for chamado demais; atualiza no máximo a cada 20s.
const TRACK_MS = 20000;
const STALE_MS = 6000;

type Remote = {
  id: number; name: string; cls: string; race: string; hair: string; eye: string;
  skin: string; hairStyle: string; beard: string; outfit: string; outfitStyle: string; cloak: string; accessory: string; mark: string; mnt: string; ttl: string;
  x: number; y: number; dir: string; m: boolean; lvl: number; hp: number; mh: number; pv: boolean; last: number;
};

type Bag = {
  t?: unknown; id?: unknown; name?: unknown; cls?: unknown; race?: unknown; hair?: unknown; eye?: unknown;
  mnt?: unknown; ttl?: unknown; skin?: unknown; hairStyle?: unknown; beard?: unknown; outfit?: unknown; outfitStyle?: unknown; cloak?: unknown; accessory?: unknown; mark?: unknown;
  x?: unknown; y?: unknown; dir?: unknown; d?: unknown; m?: unknown; lvl?: unknown; hp?: unknown; mh?: unknown;
  pv?: unknown; k?: unknown; l?: unknown; by?: unknown; n?: unknown; to?: unknown; from?: unknown; raw?: unknown;
  world?: unknown;
};

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown, n: number, d = "") => (typeof v === "string" ? v.slice(0, n) : d);
const outsideSafe = (p: { x: number; y: number }) => Math.hypot(p.x - CX, p.y - CX) > SAFE_R;

export type BridgeStatus = { state: string; others: number; received: number };

export function startWorldBridge(frame: HTMLIFrameElement, onStatus?: (s: BridgeStatus) => void) {
  let state = "desconectado";
  let received = 0;
  let presTimer: number | undefined;
  const report = () => onStatus?.({ state, others: others.size, received });
  const origin = window.location.origin;
  const myId = 1 + Math.floor(Math.random() * 2_000_000_000);
  const others = new Map<number, Remote>();
  let me: Remote | null = null;
  let channel: RealtimeChannel | null = null;
  let lastSend = 0;
  let lastTrack = 0;
  let lastWarn = 0;
  let mgTokens = 20;
  let mgRefill = Date.now();
  function track() {
    if (!channel || !me) return;
    lastTrack = Date.now();
    const { last: _l, ...pl } = me;
    void channel.track(pl);
  }
  let snapTimer: number | undefined;

  const post = (o: unknown) => frame.contentWindow?.postMessage(o, origin);
  const deliver = (m: unknown) => post({ av: "msg", d: JSON.stringify(m) });

  function toRemote(id: number, a: Bag): Remote {
    return {
      id, name: str(a.name, 24, "Herói"), cls: str(a.cls, 24), race: str(a.race, 24),
      hair: str(a.hair, 16), eye: str(a.eye, 16), skin: str(a.skin,16), hairStyle: str(a.hairStyle,16), beard: str(a.beard,16), outfit: str(a.outfit,16), outfitStyle: str(a.outfitStyle,16), cloak: str(a.cloak,16), accessory: str(a.accessory,16), mark: str(a.mark,16), mnt: str(a.mnt,16), ttl: str(a.ttl,24), x: num(a.x, CX), y: num(a.y, CX + 110),
      dir: str(a.dir, 8, "down"), m: !!a.m, lvl: Math.max(1, Math.min(60, num(a.lvl, 1) | 0)),
      hp: num(a.hp, 100), mh: num(a.mh, 100), pv: !!a.pv, last: Date.now(),
    };
  }

  function roster() {
    const list = [...others.values()].map((p) => ({ id: p.id, name: p.name, lvl: p.lvl }));
    if (me) list.unshift({ id: me.id, name: me.name, lvl: me.lvl });
    deliver({ t: "roster", roster: list });
  }

  function snap() {
    const now = Date.now();
    const p: unknown[] = [];
    for (const o of others.values()) {
      if (now - o.last > STALE_MS) { others.delete(o.id); continue; }
      p.push([o.id, o.name, o.cls, o.race, o.hair, o.eye, o.x, o.y, o.dir, o.m ? 1 : 0, o.lvl, o.hp, o.mh, o.pv ? 1 : 0, o.skin, o.hairStyle, o.beard, o.outfit, o.outfitStyle, o.cloak, o.accessory, o.mark, o.mnt, o.ttl]);
    }
    const raidHost = Math.min(myId, ...others.keys());
    deliver({ t: "snap", p, b: [], m: [], n: p.length + 1, rh: raidHost });
  }

  function broadcastState(force = false) {
    if (!channel || !me) return;
    const t = Date.now();
    if (!force && t - lastSend < SEND_MS) return;
    lastSend = t;
    const { last: _l, ...payload } = me;
    void channel.send({ type: "broadcast", event: "p", payload });
  }

  function open() {
    if (channel) return;
    const ch = supabase.channel("aventuria-world", {
      config: { broadcast: { self: false }, presence: { key: String(myId) } },
    });
    channel = ch;
    ch.on("broadcast", { event: "p" }, ({ payload }: { payload: Bag }) => {
      const id = num(payload?.id, 0);
      if (!id || id === myId) return;
      received++;
      const isNew = !others.has(id);
      others.set(id, toRemote(id, payload));
      if (isNew) roster();
    })
      .on("broadcast", { event: "raid" }, ({ payload }: { payload: Bag }) => {
        if (num(payload?.from, 0) === myId) return;
        deliver({ t: "raid_evt", ...payload });
      })
      .on("broadcast", { event: "chat" }, ({ payload }: { payload: Bag }) => {
        deliver({ t: "chat", id: num(payload?.id, 0), n: str(payload?.n, 24, "Jogador"), m: str(payload?.m, 120) });
      })
      .on("broadcast", { event: "mg" }, ({ payload }: { payload: Bag }) => {
        // Mensagens do mundo compartilhado (Titã, eventos, avisos). O conteúdo é limitado e só é entregue ao jogo.
        const from = num(payload?.from, 0);
        if (!from || from === myId) return;
        deliver({ t: "mg", from, d: payload?.d });
      })
      .on("broadcast", { event: "sys" }, ({ payload }: { payload: Bag }) => deliver({ t: "sys", m: str(payload?.m, 160) }))
      .on("broadcast", { event: "hurt" }, ({ payload }: { payload: Bag }) => {
        if (num(payload?.to, 0) !== myId || !me) return;
        const from = others.get(num(payload?.from, 0));
        // Validação local: PvP só vale se os dois estiverem com PvP ligado e fora da Área Safe.
        if (!from || !from.pv || !me.pv || !outsideSafe(me) || !outsideSafe(from)) return;
        if (Math.hypot(from.x - me.x, from.y - me.y) > 560) return;
        const raw = Math.max(0, Math.min(500, num(payload?.raw, 0)));
        deliver({ t: "hurt", raw, src: from.name, from: from.id, kind: "pvp" });
      })
      .on("broadcast", { event: "world" }, ({ payload }: { payload: Bag }) => {
        const from = num(payload?.from, 0);
        // Somente o líder determinístico do mundo publica o snapshot autoritativo.
        const leader = Math.min(myId, ...others.keys());
        if (!from || from !== leader || !payload.world || typeof payload.world !== "object") return;
        deliver({ t: "world", from, world: payload.world });
      })
      .on("broadcast", { event: "fx" }, ({ payload }: { payload: Bag }) => {
        const id = num(payload?.id, 0);
        if (!id || id === myId || !Array.isArray(payload?.l)) return;
        deliver({ t: "fx", id, l: (payload.l as unknown[]).slice(0, 24) });
      })
      .on("broadcast", { event: "kill" }, ({ payload }: { payload: Bag }) => {
        if (num(payload?.to, 0) !== myId) return;
        deliver({ t: "kill", name: str(payload?.n, 24, "Jogador"), lvl: num(payload?.lvl, 1) });
      })
      .on("presence", { event: "sync" }, () => {
        // Reserva: posição também vai na presença, caso alguma mensagem rápida se perca.
        const st = ch.presenceState() as Record<string, Array<Bag>>;
        for (const list of Object.values(st)) for (const pr of list) {
          const id = num(pr?.id, 0);
          if (!id || id === myId || pr?.x === undefined) continue;
          const o = others.get(id);
          if (!o || Date.now() - o.last > 1500) others.set(id, toRemote(id, pr));
        }
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        for (const lp of leftPresences) {
          const id = Number((lp as { id?: number }).id);
          const o = others.get(id);
          if (o) { others.delete(id); deliver({ t: "sys", m: `${o.name} saiu.` }); }
        }
        roster();
      })
      .subscribe((status, err) => {
        if (status !== "SUBSCRIBED") console.warn("[mundo] conexão:", status, err?.message ?? "");
        if (ch !== channel) return; // canal antigo (já removido): ignora
        if (status === "SUBSCRIBED") {
          state = "conectado";
          post({ av: "opened" });
          if (snapTimer) window.clearInterval(snapTimer);
          if (presTimer) window.clearInterval(presTimer);
          snapTimer = window.setInterval(snap, SNAP_MS);
          presTimer = window.setInterval(() => {
            if (me && channel && Date.now() - lastTrack > TRACK_MS) track();
            report();
          }, 1000);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          state = "erro: " + status;
          report();
          close(true);
        }
      });
  }

  function close(notifyGame: boolean) {
    if (snapTimer) window.clearInterval(snapTimer);
    if (presTimer) window.clearInterval(presTimer);
    presTimer = undefined;
    snapTimer = undefined;
    const old = channel;
    channel = null; // zera antes de remover, para o aviso "CLOSED" não chamar close() de novo
    if (old) void supabase.removeChannel(old);
    others.clear();
    me = null;
    if (notifyGame) post({ av: "closed" });
  }

  function handleGame(m: Bag) {
    switch (m.t) {
      case "join": {
        me = toRemote(myId, { ...m, x: CX, y: CX + 110 });
        deliver({ t: "welcome", id: myId, x: me.x, y: me.y, seed: SEED, raids: [] });
        track();
        void channel?.send({ type: "broadcast", event: "sys", payload: { m: `${me.name} entrou no mundo.` } });
        broadcastState(true);
        roster();
        break;
      }
      case "p": {
        if (!me) return;
        Object.assign(me, toRemote(myId, { ...me, ...m, dir: m.d, m: m.m, pv: m.pv, name: me.name, cls: me.cls }));
        broadcastState();
        break;
      }
      case "world": {
        if (!me || !channel || !m.world || typeof m.world !== "object") return;
        const leader = Math.min(myId, ...others.keys());
        if (leader !== myId) return;
        const world = m.world as Record<string, unknown>;
        // Limites rígidos para evitar snapshots excessivos ou dados arbitrários.
        const animals = Array.isArray(world.animals) ? world.animals.slice(0, 180) : [];
        const loot = Array.isArray(world.loot) ? world.loot.slice(0, 100) : [];
        void channel.send({ type: "broadcast", event: "world", payload: { from: myId, world: { animals, loot, tick: num(world.tick, 0) } } });
        break;
      }
      case "fx": {
        if (!me || !channel || !Array.isArray(m.l)) return;
        void channel.send({ type: "broadcast", event: "fx", payload: { id: myId, l: (m.l as unknown[]).slice(0, 24) } });
        break;
      }
      case "raid_sync":
      case "raid_hit":
      case "raid_reward":
      case "raid_hurt": {
        if (!me || !channel) return;
        const { t: _raidMessageType, ...body } = m;
        const payload = { ...body, from: myId };
        void channel.send({ type: "broadcast", event: "raid", payload });
        break;
      }
      case "mg": {
        if (!me || !channel) return;
        const now = Date.now();
        // balde de fichas: ~20 mensagens/s em média, com rajadas curtas
        mgTokens = Math.min(20, mgTokens + ((now - mgRefill) / 1000) * 20);
        mgRefill = now;
        if (mgTokens < 1) return;
        mgTokens -= 1;
        const d = (m as { d?: unknown }).d;
        let ok = false;
        try { ok = JSON.stringify(d ?? null).length <= 700; } catch { ok = false; }
        if (!ok) return;
        void channel.send({ type: "broadcast", event: "mg", payload: { from: myId, d } });
        break;
      }
      case "chat": {
        if (!me) return;
        const text = str(m.m, 120).trim();
        if (!text) return;
        const mutedUntil = num((frame.contentWindow as { MMO?: { localState?: { mutedUntil?: number } } } | null)?.MMO?.localState?.mutedUntil, 0);
        if (mutedUntil > Date.now()) {
          deliver({ t: "sys", m: `Você está silenciado por mais ${Math.ceil((mutedUntil - Date.now()) / 60000)} min.` });
          return;
        }
        const payload = { id: myId, n: me.name, m: text };
        void channel?.send({ type: "broadcast", event: "chat", payload });
        deliver({ t: "chat", ...payload });
        break;
      }
      case "hit": {
        if (!me || m.k !== "p") return;
        const target = others.get(num(m.id, 0));
        if (!target) return;
        const warn = (text: string) => {
          if (Date.now() - lastWarn < 3000) return;
          lastWarn = Date.now();
          deliver({ t: "sys", m: text });
        };
        if (!me.pv || !target.pv) return warn("Os dois jogadores precisam estar com PvP ligado.");
        if (!outsideSafe(me) || !outsideSafe(target)) return warn("PvP não funciona na Área Safe.");
        if (Math.hypot(me.x - target.x, me.y - target.y) > 560) return;
        void channel?.send({ type: "broadcast", event: "hurt", payload: { to: target.id, from: myId, raw: num(m.d, 0) } });
        break;
      }
      case "died": {
        if (!me) return;
        const killer = others.get(num(m.by, 0));
        if (killer) void channel?.send({ type: "broadcast", event: "kill", payload: { to: killer.id, n: me.name, lvl: me.lvl } });
        const text = killer ? `⚔ ${killer.name} derrotou ${me.name} no PvP!` : `${me.name} caiu em combate.`;
        void channel?.send({ type: "broadcast", event: "sys", payload: { m: text } });
        deliver({ t: "sys", m: text });
        break;
      }
      case "trade_invite":
      case "trade_offer":
      case "trade_accept":
      case "trade_cancel":
        deliver({ t: "trade_error", message: "Trocas ainda não estão disponíveis no mundo online." });
        break;
    }
  }

  function onMessage(e: MessageEvent) {
    if (e.origin !== origin || e.source !== frame.contentWindow) return;
    const d = e.data as { av?: string; d?: string };
    if (!d?.av) return;
    if (d.av === "open") open();
    else if (d.av === "close") close(false);
    else if (d.av === "send" && typeof d.d === "string") {
      try { handleGame(JSON.parse(d.d)); } catch { /* mensagem inválida */ }
    }
  }

  window.addEventListener("message", onMessage);
  return () => {
    window.removeEventListener("message", onMessage);
    close(false);
  };
}
