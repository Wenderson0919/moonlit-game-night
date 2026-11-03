import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startWorldBridge, type BridgeStatus } from "@/lib/world-bridge";
import { prepareCloudSave, startCloudSync } from "@/lib/cloud-save";

export const Route = createFileRoute("/_authenticated/jogar")({
  head: () => ({
    meta: [
      { title: "Jogar — Aventuria Online" },
      { name: "description", content: "Entre no mundo compartilhado de Aventuria e jogue com outros heróis em tempo real." },
      { property: "og:title", content: "Jogar — Aventuria Online" },
      { property: "og:description", content: "Um mundo só, todos juntos: chat e PvP em tempo real." },
    ],
  }),
  component: Play,
});

type Who = { id: string; email: string | null; admin: boolean };

function Play() {
  const ref = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const [st, setSt] = useState<BridgeStatus | null>(null);
  const [who, setWho] = useState<Who | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      try {
        await prepareCloudSave(u.id);
      } catch {
        if (alive) setErr("Não foi possível carregar seu personagem. Recarregue a página.");
        return;
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
      if (alive) setWho({ id: u.id, email: u.email ?? null, admin: !!roles?.some((r) => r.role === "admin") });
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!who || !ref.current) return;
    const stopBridge = startWorldBridge(ref.current, setSt);
    const stopSync = startCloudSync(ref.current, who.id, who.email);
    return () => { stopSync(); stopBridge(); };
  }, [who]);

  if (err) return <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-muted-foreground">{err}</div>;
  if (!who) return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Carregando seu personagem…</div>;

  return (
    <div className="fixed inset-0 bg-background">
      <iframe ref={ref} src="/game/index.html?v=12" title="Aventuria" className="h-full w-full border-0" allow="fullscreen; autoplay" />
      <div className="absolute left-3 bottom-3 rounded-md border border-border bg-card/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
        Online: {st ? `${st.state} · ${st.others} outro(s) · ${st.received} sinais` : "iniciando…"}
      </div>
      <div className="absolute right-3 bottom-3 flex gap-2">
        {who.admin && (
          <Link to="/admin" className="rounded-md border border-primary/60 bg-card/80 px-3 py-1.5 text-xs text-primary backdrop-blur hover:bg-card">
            Painel admin
          </Link>
        )}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
          className="rounded-md border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur hover:text-foreground"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
