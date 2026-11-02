import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Aventuria Online" },
      { name: "description", content: "Crie sua conta ou entre para jogar Aventuria Online." },
      { property: "og:title", content: "Entrar — Aventuria Online" },
      { property: "og:description", content: "Crie sua conta de herói e entre no mundo global." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/jogar" });
    });
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/jogar" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/auth" } });
      setMsg(error ? error.message : "Conta criada! Confira seu e-mail para confirmar e depois entre.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("E-mail ou senha incorretos.");
    }
    setBusy(false);
  }

  async function social(p: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setMsg("Não foi possível entrar. Tente novamente.");
  }

  return (
    <main className="realm-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card/90 p-7 shadow-[var(--shadow-glow)] backdrop-blur">
        <h1 className="font-display text-3xl text-primary">{mode === "in" ? "Entrar" : "Criar conta"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sua conta guarda seu acesso ao mundo global.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input className="field" type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="field" type="password" required minLength={6} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={busy} className="btn-gold w-full">{mode === "in" ? "Entrar" : "Criar conta"}</button>
        </form>
        <div className="my-4 text-center text-xs text-muted-foreground">ou</div>
        <div className="space-y-2">
          <button type="button" onClick={() => social("google")} className="btn-ghost w-full">Continuar com Google</button>
          <button type="button" onClick={() => social("lovable")} className="lovable-auth-button w-full">Continue with Lovable</button>
        </div>
        {msg && <p className="mt-4 text-sm text-accent">{msg}</p>}
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-5 w-full text-sm text-muted-foreground hover:text-primary">
          {mode === "in" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
