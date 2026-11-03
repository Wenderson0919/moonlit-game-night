import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startWorldBridge, type BridgeStatus } from "@/lib/world-bridge";

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

function Play() {
  const ref = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const [st, setSt] = useState<BridgeStatus | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    return startWorldBridge(ref.current, setSt);
  }, []);

  return (
    <div className="fixed inset-0 bg-background">
      <iframe ref={ref} src="/game/index.html?v=9" title="Aventuria" className="h-full w-full border-0" allow="fullscreen; autoplay" />
      <div className="absolute left-3 bottom-3 rounded-md border border-border bg-card/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
        Online: {st ? `${st.state} · ${st.others} outro(s) · ${st.received} sinais` : "iniciando…"}
      </div>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/" });
        }}
        className="absolute right-3 bottom-3 rounded-md border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur hover:text-foreground"
      >
        Sair da conta
      </button>
    </div>
  );
}
