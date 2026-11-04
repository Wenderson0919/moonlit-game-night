import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { BUILDS, GEAR_SLOTS, LEVEL_CAP, MOUNTS, PETS, RARITIES, RESOURCES, TOOLS } from "@/lib/game-catalog";
import { CLASSES, describeGrant, type Grant, type GrantKind } from "@/lib/grants";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel Admin — Aventuria Online" },
      { name: "description", content: "Gerencie níveis, Gold e presentes dos jogadores de Aventuria Online." },
      { property: "og:title", content: "Painel Admin — Aventuria Online" },
      { property: "og:description", content: "Ferramentas de administração do mundo de Aventuria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/jogar" });
    return { adminId: data.user.id };
  },
  component: AdminPage,
});

type Player = { user_id: string; email: string | null; name: string; class_name: string; level: number; gold: number; updated_at: string };
type GrantRow = { id: string; target_user_id: string; kind: string; payload: Json; created_at: string; applied_at: string | null };

const GIFT_KINDS: { id: GrantKind; name: string; list?: { id: string; name: string }[]; qty?: boolean }[] = [
  { id: "resource", name: "Material", list: RESOURCES, qty: true },
  { id: "gear", name: "Equipamento" },
  { id: "tool", name: "Ferramenta", list: TOOLS },
  { id: "build", name: "Construção", list: BUILDS, qty: true },
  { id: "pet", name: "Mascote", list: PETS },
  { id: "mount", name: "Montaria", list: MOUNTS },
];

function AdminPage() {
  const { adminId } = Route.useRouteContext();
  const [players, setPlayers] = useState<Player[]>([]);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Player | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: p }, { data: g }] = await Promise.all([
      supabase.from("characters").select("user_id,email,name,class_name,level,gold,updated_at").order("updated_at", { ascending: false }),
      supabase.from("admin_grants").select("id,target_user_id,kind,payload,created_at,applied_at").order("created_at", { ascending: false }).limit(40),
    ]);
    setPlayers(p ?? []);
    setGrants(g ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? players.filter((p) => p.name.toLowerCase().includes(t) || (p.email ?? "").toLowerCase().includes(t)) : players;
  }, [players, q]);
  const nameById = useMemo(() => new Map(players.map((p) => [p.user_id, p.name])), [players]);

  async function send(kind: GrantKind, payload: Record<string, unknown>) {
    if (!sel) return;
    setMsg(null);
    const { error } = await supabase.from("admin_grants").insert({ target_user_id: sel.user_id, kind, payload: payload as Json, created_by: adminId });
    setMsg(error ? "Não foi possível enviar: " + error.message : `Enviado para ${sel.name}: ${describeGrant({ kind, payload })}`);
    void load();
  }

  return (
    <main className="realm-bg min-h-screen px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl text-primary">Painel Admin</h1>
          <Link to="/jogar" className="btn-ghost">Voltar ao jogo</Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Mudanças chegam em poucos segundos se o jogador estiver online; se não, na próxima vez que ele entrar.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <section className="rounded-xl border border-border bg-card/90 p-4">
            <input className="field" placeholder="Buscar jogador por nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
            <ul className="mt-3 max-h-[60vh] space-y-1 overflow-auto">
              {shown.map((p) => (
                <li key={p.user_id}>
                  <button
                    onClick={() => { setSel(p); setMsg(null); }}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${sel?.user_id === p.user_id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                  >
                    <div className="font-semibold text-foreground">{p.name} <span className="text-xs text-muted-foreground">· {p.class_name} · Nível {p.level}</span></div>
                    <div className="text-xs text-muted-foreground">{p.email ?? "sem e-mail"} · {p.gold} Gold</div>
                  </button>
                </li>
              ))}
              {!shown.length && <li className="text-sm text-muted-foreground">Nenhum jogador com personagem salvo ainda.</li>}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card/90 p-4">
            {sel ? <PlayerTools key={sel.user_id} p={sel} send={send} /> : <p className="text-sm text-muted-foreground">Escolha um jogador na lista.</p>}
            {msg && <p className="mt-3 text-sm text-accent">{msg}</p>}
          </section>
        </div>

        <GlobalTools adminId={adminId} onSent={setMsg} />

        <section className="mt-6 rounded-xl border border-border bg-card/90 p-4">
          <h2 className="font-display text-xl text-primary">Últimos envios</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {grants.map((g) => (
              <li key={g.id} className="flex justify-between gap-3 border-b border-border/50 py-1">
                <span>{nameById.get(g.target_user_id) ?? "Jogador"} — {describeGrant({ kind: g.kind, payload: g.payload } as Grant)}</span>
                <span className={g.applied_at ? "text-primary" : "text-muted-foreground"}>{g.applied_at ? "entregue" : "aguardando"}</span>
              </li>
            ))}
            {!grants.length && <li className="text-muted-foreground">Nada enviado ainda.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}

function PlayerTools({ p, send }: { p: Player; send: (k: GrantKind, payload: Record<string, unknown>) => Promise<void> }) {
  const [level, setLevel] = useState(p.level);
  const [gold, setGold] = useState(0);
  const [kind, setKind] = useState<GrantKind>("resource");
  const def = GIFT_KINDS.find((k) => k.id === kind)!;
  const [item, setItem] = useState(RESOURCES[0]!.id);
  const [qty, setQty] = useState(10);
  const [slot, setSlot] = useState(GEAR_SLOTS[0]!.id);
  const [rar, setRar] = useState(4);
  const [ilvl, setIlvl] = useState(Math.max(1, p.level));
  const [sp, setSp] = useState(5);
  const [cls, setCls] = useState(p.class_name || CLASSES[0]!);
  const [mute, setMute] = useState(10);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl text-primary">{p.name}</h2>
        <p className="text-xs text-muted-foreground">{p.email} · Nível {p.level} · {p.gold} Gold</p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Nível (1 a {LEVEL_CAP})</label>
        <div className="mt-1 flex gap-2">
          <input className="field" type="number" min={1} max={LEVEL_CAP} value={level} onChange={(e) => setLevel(+e.target.value)} />
          <button className="btn-gold shrink-0" onClick={() => send("level", { level: Math.max(1, Math.min(LEVEL_CAP, Math.trunc(level))) })}>Definir</button>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Gold</label>
        <div className="mt-1 flex gap-2">
          <input className="field" type="number" value={gold} onChange={(e) => setGold(+e.target.value)} />
          <button className="btn-gold shrink-0" onClick={() => send("gold", { mode: "add", amount: Math.trunc(gold) })}>Somar</button>
          <button className="btn-ghost shrink-0" onClick={() => send("gold", { mode: "set", amount: Math.max(0, Math.trunc(gold)) })}>Definir</button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">"Somar" aceita número negativo para tirar Gold.</p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Dar presente</label>
        <select className="field mt-1" value={kind} onChange={(e) => { const k = e.target.value as GrantKind; setKind(k); const l = GIFT_KINDS.find((x) => x.id === k)?.list; if (l?.[0]) setItem(l[0].id); }}>
          {GIFT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        {def.list && (
          <select className="field mt-2" value={item} onChange={(e) => setItem(e.target.value)}>
            {def.list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
        {def.qty && <input className="field mt-2" type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} placeholder="Quantidade" />}
        {kind === "gear" && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <select className="field" value={slot} onChange={(e) => setSlot(e.target.value)}>
              {GEAR_SLOTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <select className="field" value={rar} onChange={(e) => setRar(+e.target.value)}>
              {RARITIES.map((r, i) => <option key={r} value={i}>{r}</option>)}
            </select>
            <input className="field" type="number" min={1} max={LEVEL_CAP} value={ilvl} onChange={(e) => setIlvl(+e.target.value)} title="Nível do item" />
          </div>
        )}
        <button
          className="btn-gold mt-3 w-full"
          onClick={() => {
            if (kind === "gear") return send("gear", { slot, rar, ilvl: Math.trunc(ilvl) });
            return send(kind, def.qty ? { id: item, qty: Math.max(1, Math.trunc(qty)) } : { id: item });
          }}
        >
          Enviar presente
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Poderes de personagem</label>
        <div className="mt-1 flex gap-2">
          <button className="btn-gold flex-1" onClick={() => send("heal", {})}>Curar 100%</button>
          <input className="field w-20" type="number" min={1} max={100} value={sp} onChange={(e) => setSp(+e.target.value)} />
          <button className="btn-ghost shrink-0" onClick={() => send("skillpoints", { amount: Math.max(1, Math.trunc(sp)) })}>+ Pontos</button>
        </div>
        <div className="mt-2 flex gap-2">
          <select className="field" value={cls} onChange={(e) => setCls(e.target.value)}>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-ghost shrink-0" onClick={() => send("class", { id: cls })}>Trocar classe</button>
        </div>
        <button className="btn-ghost mt-2 w-full" onClick={() => { if (confirm(`Reiniciar ${p.name}? Nível, Gold e itens voltam ao começo.`)) void send("reset", {}); }}>
          Reiniciar personagem
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Moderação</label>
        <div className="mt-1 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => send("teleport", {})}>Levar à Área Safe</button>
          <button className="btn-ghost flex-1" onClick={() => send("kick", {})}>Desconectar</button>
        </div>
        <div className="mt-2 flex gap-2">
          <input className="field" type="number" min={0} value={mute} onChange={(e) => setMute(+e.target.value)} title="Minutos" />
          <button className="btn-ghost shrink-0" onClick={() => send("mute", { minutes: Math.max(0, Math.trunc(mute)) })}>Silenciar (min)</button>
          <button className="btn-ghost shrink-0" onClick={() => send("mute", { minutes: 0 })}>Liberar</button>
        </div>
      </div>
    </div>
  );
}

function GlobalTools({ adminId, onSent }: { adminId: string; onSent: (m: string) => void }) {
  const [text, setText] = useState("");
  const [tier, setTier] = useState(-1);
  async function post(kind: string, message: string, payload: Record<string, unknown> = {}) {
    const { error } = await supabase.from("admin_broadcasts").insert({ kind, message, payload: payload as Json, created_by: adminId });
    onSent(error ? "Não foi possível enviar: " + error.message : kind === "raid" ? "Raid invocada para todos os jogadores online." : "Aviso enviado para todos online.");
  }
  return (
    <section className="mt-6 rounded-xl border border-border bg-card/90 p-4">
      <h2 className="font-display text-xl text-primary">Eventos para todos</h2>
      <div className="mt-2 flex gap-2">
        <input className="field" maxLength={140} placeholder="Aviso na tela de todos os jogadores online" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn-gold shrink-0" disabled={!text.trim()} onClick={() => { void post("announce", text.trim()); setText(""); }}>Anunciar</button>
      </div>
      <div className="mt-2 flex gap-2">
        <select className="field" value={tier} onChange={(e) => setTier(+e.target.value)}>
          <option value={-1}>Raridade aleatória</option>
          {["Comum", "Incomum", "Rara", "Épica", "Lendária"].map((r, i) => <option key={r} value={i}>{r}</option>)}
        </select>
        <button className="btn-gold shrink-0" onClick={() => post("raid", "", tier >= 0 ? { tier } : {})}>Invocar raid</button>
      </div>
    </section>
  );
}
