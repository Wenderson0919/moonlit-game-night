/* Aventuria Expansion Pack 1 — sistemas persistentes de aventura */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const state=()=>window.MMO?.localState;
const game=()=>window.game;
const ensure=()=>{
 const s=state();if(!s)return null;
 s.expansion??={day:0,pet:null,petEquipped:false,mount:false,professions:{},daily:null,claimed:{},weatherSeed:0};
 s.expansion.professions??={miner:{xp:0,level:1},lumberjack:{xp:0,level:1},forager:{xp:0,level:1},fisher:{xp:0,level:1}};
 const day=Math.floor(Date.now()/86400000);
 if(!s.expansion.daily||s.expansion.daily.day!==day){
  s.expansion.claimed={};s.expansion.dayStartTotal=Object.values(s.resources||{}).reduce((a,b)=>a+(Number(b)||0),0);
  s.expansion.daily={day,quests:[
   {id:'hunt',name:'Caçada diária',desc:'Derrote 8 criaturas',goal:8,progress:0,reward:100,type:'kills'},
   {id:'gather',name:'Coletor experiente',desc:'Reúna 20 recursos',goal:20,progress:0,reward:80,type:'gather'},
   {id:'raid',name:'Ameaça ancestral',desc:'Conclua 1 raid',goal:1,progress:0,reward:180,type:'raids'}
  ]};
 }
 return s.expansion;
};
const css=`
#av-exp-btn{position:fixed;right:18px;top:68px;z-index:55}
#av-exp-panel{position:fixed;right:18px;top:112px;z-index:56;width:min(390px,calc(100vw - 24px));max-height:78vh;overflow:auto;display:none}
.avx-card{background:#0b171b;border:1px solid #665638;border-radius:12px;padding:10px;margin:8px 0}
.avx-bar{height:7px;border-radius:9px;background:#26383a;overflow:hidden;margin-top:7px}.avx-bar>i{display:block;height:100%;background:linear-gradient(90deg,#b98736,#f2d27b)}
.avx-action{border:1px solid #8c6b36;background:#4b3519;color:#ffe8b1;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:800}
.avx-action:disabled{opacity:.35}
#av-exp-panel button{cursor:pointer}
@media(max-width:700px){#av-exp-btn{top:46px;right:8px;padding:7px 9px}#av-exp-panel{top:88px;right:8px;max-height:70vh}}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
const btn=document.createElement('button');btn.id='av-exp-btn';btn.className='glass-panel rounded-xl px-3 py-2 text-xs font-black text-amber-200';btn.innerHTML='✦ AVENTURA';
btn.onclick=()=>{const p=$('av-exp-panel');p.style.display=p.style.display==='block'?'none':'block';renderPanel()};
document.body.appendChild(btn);
const panel=document.createElement('section');panel.id='av-exp-panel';panel.className='glass-panel rounded-2xl p-3';
panel.innerHTML='<header class="flex items-center justify-between border-b border-amber-700/40 pb-2"><div><b class="text-amber-200">✦ Diário de Aventuria</b><div class="text-[10px] text-slate-400">Missões, mascotes, profissões e exploração</div></div><button class="avx-action" id="avx-close">Fechar</button></header><div id="avx-content"></div>';
document.body.appendChild(panel);$('avx-close').onclick=()=>panel.style.display='none';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function professionLevel(p){return Math.min(20,1+Math.floor(Math.sqrt((p.xp||0)/80)))}
function professionName(k){return ({miner:'Minerador',lumberjack:'Lenhador',forager:'Coletor',fisher:'Pescador'})[k]}
function renderPanel(){
 const s=state(),e=ensure();if(!s||!e)return;
 const q=e.daily.quests;
 const pets=[{id:'slime',name:'Slime companheiro',emoji:'🟢',desc:'Um pequeno aliado que segue você.'},{id:'fox',name:'Raposa mística',emoji:'🦊',desc:'Uma companheira ágil e curiosa.'},{id:'wisp',name:'Fada luminosa',emoji:'✨',desc:'Uma luz mágica que acompanha suas jornadas.'}];
 const pet=pets.find(x=>x.id===e.pet);
 const prof=Object.entries(e.professions).map(([k,v])=>'<div class="flex justify-between text-xs"><span>'+professionName(k)+'</span><b class="text-amber-200">Nv. '+professionLevel(v)+'</b></div><div class="avx-bar"><i style="width:'+((v.xp%80)/80*100)+'%"></i></div>').join('');
 $('avx-content').innerHTML=
 '<div class="avx-card"><div class="flex justify-between"><b class="text-amber-100 text-sm">📜 Missões diárias</b><span class="text-[10px] text-slate-400">Renovam diariamente</span></div>'+
 q.map(x=>'<div class="mt-3"><div class="flex justify-between gap-2 text-xs"><b>'+esc(x.name)+'</b><span class="text-amber-200">'+Math.min(x.goal,x.progress)+'/'+x.goal+'</span></div><div class="text-[10px] text-slate-400">'+esc(x.desc)+' · '+x.reward+' Gold</div><div class="avx-bar"><i style="width:'+Math.min(100,x.progress/x.goal*100)+'%"></i></div><div class="text-right mt-1"><button class="avx-action" data-claim="'+x.id+'" '+(x.progress<x.goal||e.claimed[x.id]?'disabled':'')+'>'+(e.claimed[x.id]?'Resgatada':'Resgatar recompensa')+'</button></div></div>').join('')+'</div>'+
 '<div class="avx-card"><b class="text-amber-100 text-sm">🐾 Mascotes</b><p class="text-[11px] text-slate-400 mt-1">'+(pet?pet.emoji+' '+pet.name:'Você ainda não possui mascotes.')+'</p><div class="flex flex-wrap gap-2 mt-2">'+(pet?'<button class="avx-action" id="avx-pet-toggle">'+(e.petEquipped?'Guardar mascote':'Invocar mascote')+'</button>':'<button class="avx-action" id="avx-pet-egg">Abrir ovo de mascote · 250 Gold</button>')+'</div><p class="text-[10px] text-slate-500 mt-2">Mascotes acompanham visualmente seu personagem. Mais espécies poderão ser encontradas em eventos e masmorras.</p></div>'+
 '<div class="avx-card"><b class="text-amber-100 text-sm">🛠 Profissões</b><div class="mt-2 space-y-2">'+prof+'</div><p class="text-[10px] text-slate-500 mt-2">Evoluem ao coletar materiais e explorar o mundo.</p></div>'+
 '<div class="avx-card"><b class="text-amber-100 text-sm">🐎 Montaria</b><p class="text-[11px] text-slate-400 mt-1">Montaria de viagem: aumenta a velocidade de deslocamento em 30%.</p><button id="avx-mount" class="avx-action mt-2">'+(e.mount?'Guardar montaria':'Invocar montaria · 500 Gold')+'</button></div>'+
 '<div class="avx-card"><b class="text-amber-100 text-sm">🏆 Conquistas de aventura</b><div id="avx-achievements" class="text-[11px] text-slate-300 mt-2"></div></div>';

 const w=e.world??=( {guild:null,friends:[],house:0,skills:{},spent:0,gear:0,seasonXp:0,seasonClaimed:[],treasures:0,dungeonWins:0,arenaWins:0,eventWins:0,marketLog:[]} );
 const skillDefs=[['power','Força','Aumenta o dano em 5% por nível',3],['vitality','Vitalidade','Aumenta a resistência em 5% por nível',3],['haste','Agilidade','Aumenta a velocidade em 3% por nível',3],['fortune','Fortuna','Melhora recompensas de exploração',3]];
 const skillHtml=skillDefs.map(x=>'<div class="flex items-center justify-between gap-2 py-1"><div><b>'+x[1]+'</b><div class="text-[10px] text-slate-400">'+x[2]+'</div></div><button class="avx-action" data-skill="'+x[0]+'">Evoluir ('+(w.skills[x[0]]||0)+'/'+x[3]+')</button></div>').join('');
 const featureHtml=
 '<div class="avx-card"><b class="text-amber-100">🛡 Guildas, grupos e amizades</b><p class="text-[11px] text-slate-400 mt-1">'+(w.guild?'Guilda local: '+esc(w.guild):'Crie a identidade da sua guilda. Convites e membros online serão conectados na etapa de servidor.')+'</p><button id="avx-guild" class="avx-action mt-2">'+(w.guild?'Guilda criada':'Fundar guilda · 200 Gold')+'</button><div class="text-[10px] text-slate-500 mt-2">Grupo cooperativo e lista de amigos preparados para integração multiplayer.</div></div>'+
 '<div class="avx-card"><b class="text-amber-100">🏰 Masmorras cooperativas</b><p class="text-[11px] text-slate-400 mt-1">Expedição de teste: 3 salas, inimigos e recompensa. Requer nível 3 e 50 Gold para suprimentos.</p><button id="avx-dungeon" class="avx-action mt-2">Entrar na masmorra</button><div class="text-[10px] text-slate-500">Vitórias: '+w.dungeonWins+'</div></div>'+
 '<div class="avx-card"><b class="text-amber-100">⚔ Arena PvP e torneios</b><p class="text-[11px] text-slate-400 mt-1">Treino contra adversário simulado para testar sua build. PvP entre jogadores exige conexão de servidor.</p><button id="avx-arena" class="avx-action mt-2">Participar do desafio</button><div class="text-[10px] text-slate-500">Vitórias de treino: '+w.arenaWins+'</div></div>'+
 '<div class="avx-card"><b class="text-amber-100">🛒 Mercado</b><p class="text-[11px] text-slate-400 mt-1">Banca de comerciante NPC com consumíveis e materiais. Negociação entre jogadores será ativada com backend seguro.</p><button id="avx-market" class="avx-action mt-2">Comprar kit de aventura · 120 Gold</button><div class="text-[10px] text-slate-500">Compras registradas: '+w.marketLog.length+'</div></div>'+
 '<div class="avx-card"><b class="text-amber-100">🏡 Casas e construção de vilas</b><p class="text-[11px] text-slate-400 mt-1">Melhore sua propriedade e desbloqueie níveis de construção.</p><button id="avx-house" class="avx-action mt-2">Melhorar casa · '+(300+w.house*250)+' Gold</button><div class="text-[10px] text-slate-500">Nível da casa: '+w.house+'</div></div>'+
 '<div class="avx-card"><b class="text-amber-100">🌟 Árvore de habilidades e subclasses</b><p class="text-[11px] text-slate-400 mt-1">Pontos disponíveis: '+Math.max(0,(s.level||1)-1-w.spent)+'</p>'+skillHtml+'<div class="text-[10px] text-slate-500">Subclasses serão liberadas após a progressão avançada.</div></div>'+
 '<div class="avx-card"><b class="text-amber-100">⚒ Equipamentos evolutivos</b><p class="text-[11px] text-slate-400 mt-1">Aprimore seu equipamento em até +10. Cada nível custa Gold e materiais.</p><button id="avx-gear" class="avx-action mt-2">Aprimorar equipamento +'+w.gear+' · '+(150+w.gear*100)+' Gold</button></div>'+
 '<div class="avx-card"><b class="text-amber-100">🐉 Chefes mundiais e eventos</b><p class="text-[11px] text-slate-400 mt-1">Evento de treinamento contra chefe mundial. A versão global terá vida compartilhada e janela de participação.</p><button id="avx-event" class="avx-action mt-2">Enfrentar chefe do evento</button><div class="text-[10px] text-slate-500">Eventos vencidos: '+w.eventWins+'</div></div>'+
 '<div class="avx-card"><b class="text-amber-100">🗺 Tesouros, ilhas secretas e exploração</b><p class="text-[11px] text-slate-400 mt-1">Procure um esconderijo antigo e encontre recompensas aleatórias.</p><button id="avx-treasure" class="avx-action mt-2">Explorar região · 40 Gold</button><div class="text-[10px] text-slate-500">Tesouros encontrados: '+w.treasures+'</div></div>'+
 '<div class="avx-card"><b class="text-amber-100">🏆 Ranking mundial e passe de temporada</b><p class="text-[11px] text-slate-400 mt-1">XP da temporada: '+w.seasonXp+' · Patamar '+(1+Math.floor(w.seasonXp/500))+'</p><div class="avx-bar"><i style="width:'+(w.seasonXp%500)/5+'%"></i></div><p class="text-[10px] text-slate-500 mt-2">Ranking pessoal local: nível '+(s.level||1)+' · '+(s.kills||0)+' criaturas derrotadas. Ranking global requer placar central.</p><button id="avx-season" class="avx-action mt-2">Resgatar prêmio de temporada</button></div>';
 $('avx-content').insertAdjacentHTML('beforeend',featureHtml);
 const bind=(id,fn)=>{const el=$(id);if(el)el.onclick=()=>{fn();persist();renderPanel();if(typeof updateUIStats==='function')updateUIStats()}};
 const spend=(n)=>{if((s.gold||0)<n){notify('Gold insuficiente.');return false}s.gold-=n;return true};
 bind('avx-guild',()=>{if(w.guild){notify('Sua guilda local já está criada.');return}if(!spend(200))return;w.guild='Ordem de Aventuria';notify('Guilda criada no seu perfil! A gestão multiplayer será conectada ao servidor.')});
 bind('avx-dungeon',()=>{if((s.level||1)<3){notify('É necessário alcançar o nível 3.');return}if(!spend(50))return;if(Math.random()<.72){w.dungeonWins++;w.seasonXp+=120;s.gold+=180;notify('Masmorra concluída! +180 Gold e 120 XP de temporada.')}else{notify('A masmorra foi difícil. Reorganize seus equipamentos e tente novamente.')}});
 bind('avx-arena',()=>{if((s.level||1)<5){notify('Arena desbloqueada no nível 5.');return}if(!spend(25))return;if(Math.random()<.55){w.arenaWins++;w.seasonXp+=80;s.gold+=75;notify('Vitória no treino! +75 Gold.')}else notify('Você perdeu o treino. Tente outra estratégia.')});
 bind('avx-market',()=>{if(!spend(120))return;s.gold+=0;s.resources??={};s.resources.berry=(s.resources.berry||0)+5;s.resources.wood=(s.resources.wood||0)+5;w.marketLog.push({item:'Kit de aventura',at:Date.now()});w.seasonXp+=20;notify('Kit comprado: +5 frutas e +5 madeiras.')});
 bind('avx-house',()=>{const cost=300+w.house*250;if(w.house>=10){notify('Sua casa já alcançou o nível máximo.');return}if(!spend(cost))return;w.house++;w.seasonXp+=60;notify('Sua propriedade evoluiu para o nível '+w.house+'!')});
 panel.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{const key=b.dataset.skill,def=skillDefs.find(x=>x[0]===key);if((s.level||1)-1-w.spent<=0){notify('Você não tem pontos de habilidade disponíveis.');return}if((w.skills[key]||0)>=def[3]){notify('Essa habilidade já está no nível máximo.');return}w.skills[key]=(w.skills[key]||0)+1;w.spent++;w.seasonXp+=35;persist();renderPanel()});
 bind('avx-gear',()=>{if(w.gear>=10){notify('Equipamento no nível máximo.');return}const cost=150+w.gear*100;if(!spend(cost))return;if((s.resources?.iron||0)<2){s.resources??={};s.resources.iron=s.resources.iron||0;notify('Aprimoramento comprado; reúna 2 minérios de ferro para a próxima evolução.');return}s.resources.iron-=2;w.gear++;w.seasonXp+=50;notify('Equipamento aprimorado para +'+w.gear+'!')});
 bind('avx-event',()=>{if(!spend(75))return;if(Math.random()<.6){w.eventWins++;w.seasonXp+=150;s.gold+=220;notify('Chefe do evento derrotado! +220 Gold.')}else notify('O chefe mundial resistiu. Reúna aliados e tente novamente.')});
 bind('avx-treasure',()=>{if(!spend(40))return;w.treasures++;w.seasonXp+=45;const reward=80+Math.floor(Math.random()*121);s.gold+=reward;notify('Tesouro encontrado! Você recebeu '+reward+' Gold.')});
 bind('avx-season',()=>{const tier=Math.floor(w.seasonXp/500);if(tier<=0||w.seasonClaimed.includes(tier)){notify('Ainda não há prêmio disponível.');return}w.seasonClaimed.push(tier);s.gold+=100+tier*25;notify('Prêmio do patamar '+tier+' resgatado!')});
 panel.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b.dataset.claim));
 const egg=$('avx-pet-egg');if(egg)egg.onclick=()=>{if(s.gold<250){notify('Você precisa de 250 Gold.');return}s.gold-=250;e.pet=['slime','fox','wisp'][Math.floor(Math.random()*3)];e.petEquipped=true;persist();notify('Um novo companheiro nasceu!');renderPanel();};
 const pt=$('avx-pet-toggle');if(pt)pt.onclick=()=>{e.petEquipped=!e.petEquipped;persist();renderPanel()};
 $('avx-mount').onclick=()=>{if(!e.mount&&s.gold<500){notify('Você precisa de 500 Gold.');return}if(!e.mount)s.gold-=500;e.mount=!e.mount;persist();renderPanel();notify(e.mount?'Montaria invocada!':'Montaria guardada.')};
 const ach=[['Primeiros passos',s.level>=5],['Caçador',s.kills>=25],['Desbravador',Object.keys(s.visited||{}).length>=5],['Lenda das raids',(s.raidsCleared||0)>=5],['Mestre coletor',Object.values(s.resources||{}).reduce((a,b)=>a+(b||0),0)>=300]];
 $('avx-achievements').innerHTML=ach.map(([n,ok])=>'<div class="flex justify-between py-1 border-b border-slate-800"><span>'+n+'</span><b class="'+(ok?'text-emerald-300':'text-slate-500')+'">'+(ok?'✓ Concluída':'Bloqueada')+'</b></div>').join('');
}
function claim(id){const s=state(),e=ensure(),q=e.daily.quests.find(x=>x.id===id);if(!q||q.progress<q.goal||e.claimed[id])return;s.gold+=q.reward;e.claimed[id]=true;persist();notify('Recompensa recebida: '+q.reward+' Gold!');renderPanel();if(typeof updateUIStats==='function')updateUIStats()}
function notify(m){if(typeof showNotification==='function')showNotification(m,'#f5d58c')}
function persist(){try{if(typeof saveGame==='function')saveGame(false)}catch{}}
let lastResources=null,lastClock=0,lastDraw=0;
function tick(){
 const s=state(),e=ensure(),g=game();if(!s||!e)return;
 const res=s.resources||{},total=Object.values(res).reduce((a,b)=>a+(Number(b)||0),0);
 if(lastResources){for(const k of Object.keys(res)){const d=Math.max(0,(res[k]||0)-(lastResources[k]||0));if(!d)continue;const prof=['wood','pine'].includes(k)?'lumberjack':['stone','iron','goldOre','diamond','obsidian'].includes(k)?'miner':['berry','mushroom','herb','cactus'].includes(k)?'forager':null;if(prof)e.professions[prof].xp+=d*5;}}
 lastResources={...res};
 const q=e.daily?.quests||[];
 const kills=s.animalKills||0,raids=s.raidsCleared||0;
 for(const x of q){if(x.type==='kills')x.progress=Math.min(x.goal,kills-(e.dayStartKills??(e.dayStartKills=kills)));if(x.type==='raid')x.progress=Math.min(x.goal,raids-(e.dayStartRaids??(e.dayStartRaids=raids)));}
 const gathered=Math.max(0,total-e.dayStartTotal);const gatherQ=q.find(x=>x.type==='gather');if(gatherQ)gatherQ.progress=Math.min(gatherQ.goal,gathered);
 if(g&&g.running){
  const phase=(g.t%360)/360,night=Math.max(0,Math.min(1,(Math.cos(phase*Math.PI*2-.2)+.12)/1.12));
  const weather=['Céu limpo','Chuva leve','Neblina','Vento forte'][Math.floor(g.t/150)%4];
  if(Math.floor(g.t/360)!==lastClock){lastClock=Math.floor(g.t/360);notify('O mundo entrou em um novo período do dia.')}
  const p=g.player;if(p){const base=p.baseSpd||p.speed||3.8;if(e.mount){p.baseSpd=base;p.speed=base*1.3}else if(p.baseSpd){p.speed=p.baseSpd}}
  if(e.petEquipped&&e.pet&&g.ctx&&Date.now()-lastDraw>80){lastDraw=Date.now();const c=g.ctx,W=g.canvas.width,H=g.canvas.height;c.save();c.font='18px serif';const em=e.pet==='slime'?'🟢':e.pet==='fox'?'🦊':'✨';c.fillText(em,W/2-30,H/2+17);c.restore()}
  const overlay=$('avx-world-overlay');if(overlay){overlay.style.background='rgba(7,12,35,'+(night*.24)+')';overlay.dataset.weather=weather}
  const clock=$('avx-world-clock');if(clock)clock.textContent=(night>.55?'🌙 Noite':'☀️ Dia')+' · '+weather;
 }
 if(panel.style.display==='block'&&Date.now()-lastDraw>900){lastDraw=Date.now();renderPanel()}
}
const overlay=document.createElement('div');overlay.id='avx-world-overlay';overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:12;background:transparent;transition:background 2s';
document.body.appendChild(overlay);
const clock=document.createElement('div');clock.id='avx-world-clock';clock.className='fixed left-1/2 -translate-x-1/2 bottom-3 z-10 glass-panel rounded-full px-3 py-1 text-[10px] font-bold text-amber-100 pointer-events-none';clock.textContent='☀️ Dia · Céu limpo';document.body.appendChild(clock);
setInterval(tick,1000);
window.AventuriaExpansion={open:()=>{panel.style.display='block';renderPanel()},refresh:renderPanel};
})();