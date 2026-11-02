<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Multiplayer: the original game lives untouched (plus a WebSocket shim) in public/game/index.html; src/lib/world-bridge.ts replaces the old Node server.js using Lovable Cloud Realtime broadcast/presence — Workers can't host a persistent WebSocket server.
- /jogar is behind the _authenticated gate; accounts use Cloud auth (email, Google, Lovable).
