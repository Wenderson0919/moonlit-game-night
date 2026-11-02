import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aventuria Online — um mundo só para todos" },
      { name: "description", content: "MMORPG sandbox no navegador: explore biomas, converse no chat e enfrente outros heróis no mesmo mundo." },
      { property: "og:title", content: "Aventuria Online" },
      { property: "og:description", content: "Um mundo compartilhado: chat e PvP em tempo real, direto no navegador." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="realm-bg flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.4em] text-accent uppercase">MMORPG sandbox</p>
      <h1 className="font-display mt-3 text-6xl text-primary md:text-8xl">Aventuria</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Um mundo só. Todos os heróis no mesmo mapa, conversando e lutando em tempo real.
      </p>
      <Link to="/jogar" className="btn-gold mt-10 px-10 text-lg">Jogar agora</Link>
    </main>
  );
}
