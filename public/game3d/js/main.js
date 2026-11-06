import { Game } from './game.js';
const $ = (id) => document.getElementById(id);
const fail = (msg) => { $('loading').style.display = 'none'; const e = $('err'); e.style.display = 'flex'; e.innerHTML = '<div><h2>Não foi possível iniciar</h2><p>' + msg + '</p></div>'; };
window.addEventListener('error', (e) => { console.error(e.error || e.message); });
function boot() {
  let g;
  try { g = new Game($('view')); } catch (e) { return fail('Seu navegador não suporta WebGL, necessário para o jogo 3D.<br><small>' + e.message + '</small>'); }
  $('load-fill').style.width = '35%';
  setTimeout(() => {
    try { g.init(); } catch (e) { console.error(e); return fail('Erro ao construir o mundo: ' + e.message); }
    $('load-fill').style.width = '100%'; window.__g = g; g.start();
    setTimeout(() => { $('loading').style.opacity = 0; setTimeout(() => ($('loading').style.display = 'none'), 600); $('start').style.display = 'flex'; }, 250);
  }, 60);
}
boot();
