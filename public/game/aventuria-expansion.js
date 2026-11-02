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
#av-exp-panel{position:fixed;right:18px;top:112px;z-index:56;width:min(470px,calc(100vw - 24px));max-height:82vh;overflow:auto;display:none;background:radial-gradient(ellipse at 50% 0%,#203c3a 0%,#0b171b 65%);border:1px solid #8b6b38;box-shadow:0 18px 70px #000b}
.avx-card{background:linear-gradient(145deg,#14272a,#0b171b);border:1px solid #665638;border-radius:13px;padding:12px;margin:9px 0;box-shadow:inset 0 1px #ffffff0b}
.avx-tabs{display:flex;gap:5px;overflow:auto;padding:9px 0;position:sticky;top:0;background:#0b171bf2;z-index:3}
.avx-tab{white-space:nowrap;border:1px solid #45565b;border-radius:9px;padding:7px 10px;font-size:10px;color:#cbd5e1;background:#172326}
.avx-tab.active{background:#59421f;border-color:#e4b85c;color:#ffe5a1}
.avx-card h4{font-size:13px;font-weight:900;color:#f8df9a}
.avx-muted{font-size:11px;color:#9aabb2}
.avx-action{transition:transform .12s,filter .12s}.avx-action:hover{filter:brightness(1.2);transform:translateY(-1px)}
.avx-action:active{transform:scale(.97)}
.avx-reward{color:#9fe5bb;font-weight:800}
.avx-stat{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.avx-stat>div{background:#071114;border:1px solid #34494b;border-radius:9px;padding:7px;text-align:center}
.avx-stat b{display:block;color:#f4d68e;font-size:14px}
.avx-stat span{font-size:9px;color:#9aabb2}
.avx-bar{height:7px;border-radius:9px;background:#26383a;overflow:hidden;margin-top:7px}.avx-bar>i{display:block;height:100%;background:linear-gradient(90deg,#b98736,#f2d27b)}
.avx-action{border:1px solid #8c6b36;background:#4b3519;color:#ffe8b1;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:800}
.avx-action:disabled{opacity:.35}
#av-exp-panel button{cursor:pointer}
@media(max-width:700px){#av-exp-btn{top:46px;right:8px;padding:7px 9px}#av-exp-panel{top:88px;right:8px;max-height:70vh}}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
// O menu global foi substituído por NPCs físicos no centro da cidade.
const panel=document.createElement('section');panel.id='av-exp-panel';panel.className='glass-panel rounded-2xl p-3';
panel.innerHTML='<header class="flex items-center justify-between border-b border-amber-700/40 pb-2"><div><b class="text-amber-200 text-base">✦ CRÔNICAS DE AVENTURIA</b><div class="text-[10px] text-slate-400">Central de aventura · progressão · desafios</div></div><button class="avx-action" id="avx-close">✕</button></header><div class="avx-tabs" id="avx-tabs"><button class="avx-tab active" data-tab="all">Tudo</button><button class="avx-tab" data-tab="social">Social</button><button class="avx-tab" data-tab="combat">Combate</button><button class="avx-tab" data-tab="growth">Progressão</button><button class="avx-tab" data-tab="world">Mundo</button></div><div id="avx-content"></div>';
document.body.appendChild(panel);$('avx-close').onclick=()=>panel.style.display='none';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function professionLevel(p){return Math.min(20,1+Math.floor(Math.sqrt((p.xp||0)/80)))}
function professionName(k){return ({miner:'Minerador',lumberjack:'Lenhador',forager:'Coletor',fisher:'Pescador'})[k]}
function renderPanel(){
 const s=state(),e=ensure();if(!s||!e)return;
 const q=e.daily.quests;
 const pets=[{id:'slime',name:'Slime companheiro',emoji:'🟢',desc:'Um pequeno aliado que segue você.'},{id:'fox',name:'Raposa mística',emoji:'🦊',desc:'Uma companheira ágil e curiosa.'},{id:'wisp',name:'Fada luminosa',emoji:'✨',desc:'Uma luz mágica que acompanha suas jornadas.'}];
 const pet=pets.find(x=>x.id===e.pet);
 e.petData??={level:1,xp:0,bond:0,skillReady:0};const pd=e.petData,petNeed=100+(pd.level-1)*75;
 const prof=Object.entries(e.professions).map(([k,v])=>'<div class="flex justify-between text-xs"><span>'+professionName(k)+'</span><b class="text-amber-200">Nv. '+professionLevel(v)+'</b></div><div class="avx-bar"><i style="width:'+((v.xp%80)/80*100)+'%"></i></div>').join('');
 $('avx-content').innerHTML=
 '<div class="avx-card"><div class="flex justify-between"><b class="text-amber-100 text-sm">📜 Missões diárias</b><span class="text-[10px] text-slate-400">Renovam diariamente</span></div>'+
 q.map(x=>'<div class="mt-3"><div class="flex justify-between gap-2 text-xs"><b>'+esc(x.name)+'</b><span class="text-amber-200">'+Math.min(x.goal,x.progress)+'/'+x.goal+'</span></div><div class="text-[10px] text-slate-400">'+esc(x.desc)+' · '+x.reward+' Gold</div><div class="avx-bar"><i style="width:'+Math.min(100,x.progress/x.goal*100)+'%"></i></div><div class="text-right mt-1"><button class="avx-action" data-claim="'+x.id+'" '+(x.progress<x.goal||e.claimed[x.id]?'disabled':'')+'>'+(e.claimed[x.id]?'Resgatada':'Resgatar recompensa')+'</button></div></div>').join('')+'</div>'+
 '<div class="avx-card"><b class="text-amber-100 text-sm">🐾 Santuário de Mascotes</b><p class="text-[11px] text-slate-300 mt-1">'+(pet?pet.emoji+' <b>'+pet.name+'</b>':'Nenhum mascote. Compre um ovo para começar.')+'</p>'+(pet?'<p class="text-[10px] text-amber-200 mt-1">Nível '+pd.level+' · XP '+pd.xp+'/'+petNeed+' · Afinidade '+pd.bond+'</p><div class="avx-bar"><i style="width:'+Math.min(100,pd.xp/petNeed*100)+'%"></i></div><p class="text-[10px] text-slate-400 mt-1">'+({slime:'+8 Defesa · Escudo viscoso',fox:'+6 Ataque · Investida feroz',wisp:'+8 Poder · Pulso arcano'}[e.pet]||'')+'</p>':'')+'<div class="flex flex-wrap gap-2 mt-2">'+(pet?'<button class="avx-action" id="avx-pet-toggle">'+(e.petEquipped?'Guardar':'Invocar')+'</button><button class="avx-action" id="avx-pet-skill" '+(!e.petEquipped?'disabled':'')+'>Habilidade especial</button>':'<button class="avx-action" id="avx-pet-egg">Comprar ovo · 250 Gold</button>')+'</div><p class="text-[10px] text-slate-500 mt-2">Mascotes evoluem ao derrotar criaturas e oferecem bônus enquanto invocados.</p></div>'+ 
 '<div class="avx-card"><b class="text-amber-100 text-sm">🛠 Profissões</b><div class="mt-2 space-y-2">'+prof+'</div><p class="text-[10px] text-slate-500 mt-2">Evoluem ao coletar materiais e explorar o mundo.</p></div>'+
 '<div class="avx-card"><b class="text-amber-100 text-sm">🐎 Montaria</b><p class="text-[11px] text-slate-400 mt-1">Montaria de viagem: aumenta a velocidade de deslocamento em 30%.</p><button id="avx-mount" class="avx-action mt-2">'+(e.mount?'Guardar montaria':'Invocar montaria · 500 Gold')+'</button></div>'+
 '<div class="avx-card"><b class="text-amber-100 text-sm">🏆 Conquistas de aventura</b><div id="avx-achievements" class="text-[11px] text-slate-300 mt-2"></div></div>';

 const w=e.world??=( {guild:null,friends:[],house:0,skills:{},spent:0,gear:0,seasonXp:0,seasonClaimed:[],treasures:0,dungeonWins:0,arenaWins:0,eventWins:0,marketLog:[]} );
 w.dungeon??={room:0,hp:0,active:false,guard:0};w.worldBoss??={hp:0,active:false,phase:0};w.seasonStarted??=Date.now();
 const skillDefs=[['power','Força','+5% de dano por nível',5],['vitality','Vitalidade','+8 de vida máxima por nível',5],['haste','Agilidade','+3% de velocidade por nível',5],['fortune','Fortuna','+4% de ouro em recompensas por nível',5]];
 const skillHtml=skillDefs.map(x=>'<div class="flex items-center justify-between gap-2 py-1"><div><b>'+x[1]+'</b><div class="text-[10px] text-slate-400">'+x[2]+'</div></div><button class="avx-action" data-skill="'+x[0]+'">Evoluir ('+(w.skills[x[0]]||0)+'/'+x[3]+')</button></div>').join('');
 const featureHtml=
 '<div class="avx-card" data-section="social"><b class="text-amber-100">🛡 Guildas, grupos e amizades</b><p class="text-[11px] text-slate-400 mt-1">'+(w.guild?'Guilda local: '+esc(w.guild):'Crie a identidade da sua guilda. Convites e membros online serão conectados na etapa de servidor.')+'</p><button id="avx-guild" class="avx-action mt-2">'+(w.guild?'Guilda criada':'Fundar guilda · 200 Gold')+'</button><div class="text-[10px] text-slate-500 mt-2">Grupo cooperativo e lista de amigos preparados para integração multiplayer.</div></div>'+
 '<div class="avx-card" data-section="combat"><b class="text-amber-100">🏰 Masmorras cooperativas</b><p class="text-[11px] text-slate-400 mt-1">Expedição de teste: 3 salas, inimigos e recompensa. Requer nível 3 e 50 Gold para suprimentos.</p><button id="avx-dungeon" class="avx-action mt-2">Entrar na masmorra</button><div class="text-[10px] text-slate-500">Vitórias: '+w.dungeonWins+'</div></div>'+
 '<div class="avx-card" data-section="combat"><b class="text-amber-100">⚔ Arena PvP e torneios</b><p class="text-[11px] text-slate-400 mt-1">Treino contra adversário simulado para testar sua build. PvP entre jogadores exige conexão de servidor.</p><button id="avx-arena" class="avx-action mt-2">Participar do desafio</button><div class="text-[10px] text-slate-500">Vitórias de treino: '+w.arenaWins+'</div></div>'+
 '<div class="avx-card" data-section="social"><b class="text-amber-100">🛒 Mercado</b><p class="text-[11px] text-slate-400 mt-1">Banca de comerciante NPC com consumíveis e materiais. Negociação entre jogadores será ativada com backend seguro.</p><button id="avx-market" class="avx-action mt-2">Comprar kit de aventura · 120 Gold</button><div class="text-[10px] text-slate-500">Compras registradas: '+w.marketLog.length+'</div></div>'+
 '<div class="avx-card" data-section="growth"><b class="text-amber-100">🏡 Casas e construção de vilas</b><p class="text-[11px] text-slate-400 mt-1">Melhore sua propriedade e desbloqueie níveis de construção.</p><button id="avx-house" class="avx-action mt-2">Melhorar casa · '+(300+w.house*250)+' Gold</button><div class="text-[10px] text-slate-500">Nível da casa: '+w.house+'</div></div>'+
 '<div class="avx-card" data-section="growth"><b class="text-amber-100">🌟 Árvore de habilidades e subclasses</b><p class="text-[11px] text-slate-400 mt-1">Pontos disponíveis: '+Math.max(0,(s.level||1)-1-w.spent)+'</p>'+skillHtml+'<div class="text-[10px] text-slate-500">Subclasses serão liberadas após a progressão avançada.</div></div>'+
 '<div class="avx-card" data-section="growth"><b class="text-amber-100">⚒ Equipamentos evolutivos</b><p class="text-[11px] text-slate-400 mt-1">Aprimore seu equipamento em até +10. Cada nível custa Gold e materiais.</p><button id="avx-gear" class="avx-action mt-2">Aprimorar equipamento +'+w.gear+' · '+(150+w.gear*100)+' Gold</button></div>'+
 '<div class="avx-card" data-section="world"><b class="text-amber-100">🐉 Chefes mundiais e eventos</b><p class="text-[11px] text-slate-400 mt-1">Evento de treinamento contra chefe mundial. A versão global terá vida compartilhada e janela de participação.</p><button id="avx-event" class="avx-action mt-2">Enfrentar chefe do evento</button><div class="text-[10px] text-slate-500">Eventos vencidos: '+w.eventWins+'</div></div>'+
 '<div class="avx-card" data-section="world"><b class="text-amber-100">🗺 Tesouros, ilhas secretas e exploração</b><p class="text-[11px] text-slate-400 mt-1">Procure um esconderijo antigo e encontre recompensas aleatórias.</p><button id="avx-treasure" class="avx-action mt-2">Explorar região · 40 Gold</button><div class="text-[10px] text-slate-500">Tesouros encontrados: '+w.treasures+'</div></div>'+
 '<div class="avx-card" data-section="world"><b class="text-amber-100">🏆 Ranking mundial e passe de temporada</b><p class="text-[11px] text-slate-400 mt-1">XP da temporada: '+w.seasonXp+' · Patamar '+(1+Math.floor(w.seasonXp/500))+'</p><div class="avx-bar"><i style="width:'+(w.seasonXp%500)/5+'%"></i></div><p class="text-[10px] text-slate-500 mt-2">Ranking pessoal local: nível '+(s.level||1)+' · '+(s.kills||0)+' criaturas derrotadas. Ranking global requer placar central.</p><button id="avx-season" class="avx-action mt-2">Resgatar prêmio de temporada</button></div>';
 $('avx-content').insertAdjacentHTML('beforeend',featureHtml);
 const tabs=panel.querySelectorAll('[data-tab]');
 tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.toggle('active',x===t));const v=t.dataset.tab;panel.querySelectorAll('#avx-content>.avx-card').forEach(card=>{const sec=card.dataset.section||'growth';card.style.display=v==='all'||sec===v?'':'none'})});
 const bind=(id,fn)=>{const el=$(id);if(el)el.onclick=()=>{fn();persist();renderPanel();if(typeof updateUIStats==='function')updateUIStats()}};
 const spend=(n)=>{if((s.gold||0)<n){notify('Gold insuficiente.');return false}s.gold-=n;return true};
 bind('avx-guild',()=>{if(w.guild){notify('Sua guilda local já está criada.');return}const name=(prompt('Escolha o nome da sua guilda (3 a 20 caracteres):')||'').trim();if(name.length<3||name.length>20){notify('O nome precisa ter de 3 a 20 caracteres.');return}if(!spend(200))return;w.guild=name;w.guildLevel=1;w.guildRenown=0;w.seasonXp+=50;notify('🏰 '+name+' foi fundada! Sua guilda está salva neste personagem. Convites online ainda precisam do servidor.')});
 bind('avx-dungeon',()=>openDungeonPortal());
 bind('avx-arena',()=>{if((s.level||1)<5){notify('Arena desbloqueada no nível 5.');return}if(!spend(25))return;const st=window.getRPGStats?window.getRPGStats():{atk:0,def:0,power:0};const power=(s.level||1)*12+(st.atk||0)*3+(st.def||0)*1.5+(st.power||0)*2+(w.gear||0)*8;const rival=(s.level||1)*13+35+Math.random()*70;const score=power+Math.random()*55;if(score>=rival){w.arenaWins++;w.seasonXp+=110;s.gold+=100+Math.floor((s.level||1)*4);notify('🏅 Vitória na arena! Sua build superou o rival. +Gold e 110 XP de temporada.')}else{w.seasonXp+=25;notify('Derrota honrosa! O rival venceu por '+Math.ceil(rival-score)+' pontos. Você ganhou 25 XP de temporada.')}});
 bind('avx-market',()=>{if(!spend(120))return;s.gold+=0;s.resources??={};s.resources.berry=(s.resources.berry||0)+5;s.resources.wood=(s.resources.wood||0)+5;w.marketLog.push({item:'Kit de aventura',at:Date.now()});w.seasonXp+=20;notify('Kit comprado: +5 frutas e +5 madeiras.')});
 bind('avx-house',()=>{const cost=300+w.house*250;if(w.house>=10){notify('Sua casa já alcançou o nível máximo.');return}if(!spend(cost))return;w.house++;w.seasonXp+=60;notify('Sua propriedade evoluiu para o nível '+w.house+'!')});
 panel.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{const key=b.dataset.skill,def=skillDefs.find(x=>x[0]===key);if((s.level||1)-1-w.spent<=0){notify('Você não tem pontos de habilidade disponíveis.');return}if((w.skills[key]||0)>=def[3]){notify('Essa habilidade já está no nível máximo.');return}w.skills[key]=(w.skills[key]||0)+1;w.spent++;w.seasonXp+=35;persist();renderPanel()});
 bind('avx-gear',()=>{if(w.gear>=10){notify('Equipamento no nível máximo.');return}if((s.resources?.iron||0)<2){notify('Você precisa de 2 minérios de ferro para aprimorar.');return}const cost=150+w.gear*100;if(!spend(cost))return;s.resources.iron-=2;w.gear++;w.seasonXp+=50;notify('Equipamento aprimorado para +'+w.gear+'!')});
 bind('avx-event',()=>{const st=window.getRPGStats?window.getRPGStats():{atk:0,def:0,power:0};if(!w.worldBoss.active){if(!spend(75))return;w.worldBoss={active:true,hp:240+(s.level||1)*95,maxHp:240+(s.level||1)*95,phase:1};notify('🐉 O Colosso despertou! Ataque novamente para continuar a batalha.');return}const hit=35+(s.level||1)*5+(st.atk||0)*2+(st.power||0)*3+(w.gear||0)*5+Math.floor(Math.random()*30);w.worldBoss.hp-=hit;w.worldBoss.phase=Math.min(3,1+Math.floor((1-w.worldBoss.hp/w.worldBoss.maxHp)*3));if(w.worldBoss.hp>0){notify('Você causou '+hit+' de dano! Vida do Colosso: '+Math.max(0,Math.ceil(w.worldBoss.hp))+'/'+w.worldBoss.maxHp+'. Fase '+w.worldBoss.phase+'/3.');return}w.worldBoss.active=false;w.eventWins++;w.seasonXp+=220;s.gold+=300+Math.floor((s.level||1)*8);notify('🐉 Colosso derrotado! +Gold e 220 XP de temporada. Evento individual; versão mundial compartilhada virá com servidor.')});
 bind('avx-treasure',()=>{if(!spend(40))return;w.treasures++;w.seasonXp+=45;const reward=80+Math.floor(Math.random()*121);s.gold+=reward;notify('Tesouro encontrado! Você recebeu '+reward+' Gold.')});
 bind('avx-season',()=>{const tier=Math.floor(w.seasonXp/500);if(tier<=0||w.seasonClaimed.includes(tier)){notify('Ainda não há prêmio disponível.');return}w.seasonClaimed.push(tier);s.gold+=100+tier*25;notify('Prêmio do patamar '+tier+' resgatado!')});
 panel.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b.dataset.claim));
 const egg=$('avx-pet-egg');if(egg)egg.onclick=()=>{if(s.gold<250){notify('Você precisa de 250 Gold.');return}s.gold-=250;e.pet=['slime','fox','wisp'][Math.floor(Math.random()*3)];e.petsOwned??=[];if(!e.petsOwned.includes(e.pet))e.petsOwned.push(e.pet);e.petData={level:1,xp:0,bond:0,skillReady:0,lastKills:s.animalKills||0};e.petEquipped=true;persist();notify('🥚 Novo mascote nasceu!');renderPanel()};
 const pt=$('avx-pet-toggle');if(pt)pt.onclick=()=>{e.petEquipped=!e.petEquipped;persist();renderPanel()};
 const ps=$('avx-pet-skill');if(ps)ps.onclick=()=>{if(Date.now()<(e.petData.skillReady||0)){notify('Habilidade em recarga.');return}if(e.pet==='slime'){s.hp=Math.min(s.maxHp||100,(s.hp||0)+35);notify('🟢 Escudo viscoso: vida recuperada!')}else if(e.pet==='fox'){e.petBuffUntil=Date.now()+12000;notify('🦊 Investida feroz: bônus de dano por 12 segundos!')}else{s.hp=Math.min(s.maxHp||100,(s.hp||0)+20);e.petBuffUntil=Date.now()+12000;notify('✨ Pulso arcano: energia restaurada e poder ampliado!')}e.petData.skillReady=Date.now()+30000;persist();renderPanel()};
 $('avx-mount').onclick=()=>{if(!e.mount&&s.gold<500){notify('Você precisa de 500 Gold.');return}if(!e.mount)s.gold-=500;e.mount=!e.mount;persist();renderPanel();notify(e.mount?'Montaria invocada!':'Montaria guardada.')};
 const ach=[['Primeiros passos',s.level>=5],['Caçador',s.kills>=25],['Desbravador',Object.keys(s.visited||{}).length>=5],['Lenda das raids',(s.raidsCleared||0)>=5],['Mestre coletor',Object.values(s.resources||{}).reduce((a,b)=>a+(b||0),0)>=300]];
 $('avx-achievements').innerHTML=ach.map(([n,ok])=>'<div class="flex justify-between py-1 border-b border-slate-800"><span>'+n+'</span><b class="'+(ok?'text-emerald-300':'text-slate-500')+'">'+(ok?'✓ Concluída':'Bloqueada')+'</b></div>').join('');
}
function claim(id){const s=state(),e=ensure(),q=e.daily.quests.find(x=>x.id===id);if(!q||q.progress<q.goal||e.claimed[id])return;s.gold+=q.reward;e.claimed[id]=true;persist();notify('Recompensa recebida: '+q.reward+' Gold!');renderPanel();if(typeof updateUIStats==='function')updateUIStats()}
function notify(m){if(typeof showNotification==='function')showNotification(m,'#f5d58c')}
function persist(){try{if(typeof saveGame==='function')saveGame(false)}catch{}}
let lastResources=null,lastClock=0,lastDraw=0,lastSeasonKills=null,lastSeasonRaids=null;
function tick(){
 const s=state(),e=ensure(),g=game();if(!s||!e)return;
 const res=s.resources||{},total=Object.values(res).reduce((a,b)=>a+(Number(b)||0),0);
 if(lastResources){for(const k of Object.keys(res)){const d=Math.max(0,(res[k]||0)-(lastResources[k]||0));if(!d)continue;const prof=['wood','pine'].includes(k)?'lumberjack':['stone','iron','goldOre','diamond','obsidian'].includes(k)?'miner':['berry','mushroom','herb','cactus'].includes(k)?'forager':null;if(prof)e.professions[prof].xp+=d*5;}}
 lastResources={...res};
 const q=e.daily?.quests||[];
 const kills=s.animalKills||0,raids=s.raidsCleared||0;
 if(e.petEquipped&&e.pet){e.petData??={level:1,xp:0,bond:0,skillReady:0};const pd=e.petData;pd.lastKills??=kills;const gained=Math.max(0,kills-pd.lastKills);if(gained){pd.xp+=gained*20;pd.bond+=gained;pd.lastKills=kills;const need=100+(pd.level-1)*75;if(pd.xp>=need){pd.xp-=need;pd.level++;notify('🐾 Seu mascote evoluiu para o nível '+pd.level+'!')}}}
 if(lastSeasonKills===null){lastSeasonKills=kills;lastSeasonRaids=raids}
 if(kills>lastSeasonKills){e.world.seasonXp+=(kills-lastSeasonKills)*5;lastSeasonKills=kills}
 if(raids>lastSeasonRaids){e.world.seasonXp+=(raids-lastSeasonRaids)*100;lastSeasonRaids=raids}
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


const AVENTURIA_REALMS=[
{id:'verdant',name:'Ruínas de Lúmen',level:3,seed:31031,theme:'Pradarias luminosas',desc:'Ruínas élficas, flores gigantes e rios cristalinos.',color:'#8cf0b2',creatures:['lume_wisp','cervo_lunar']},
{id:'frost',name:'Cidadela de Cristal',level:8,seed:81081,theme:'Vale congelado',desc:'Templos de gelo azul e cristais vivos.',color:'#8de4ff',creatures:['raposa_cristal','golem_cristal']},
{id:'mire',name:'Templo das Raízes',level:15,seed:151515,theme:'Selva ancestral',desc:'Santuários tomados por raízes colossais.',color:'#b6ef70',creatures:['lince_raiz','tartaruga_ancestral']},
{id:'ember',name:'Domínio das Cinzas',level:22,seed:222222,theme:'Catedrais de obsidiana e rios de magma.',desc:'Fortalezas vulcânicas e criaturas de fogo.',color:'#ffad70',creatures:['salamandra_igne','draco_obsidiana']}

];

let realmReturnSnapshot=null;
const REALM_KEYS=['seed','rng','tb','miniBase','ponds','nodes','ng','structs','crops','animals','loot','projs','hazards','fx','raids','npc','player','respawnT','raidT','raidInfoT','miniT','saveT'];
function saveRealmWorld(g){const o={};for(const k of REALM_KEYS)o[k]=g[k];return o}
function restoreRealmWorld(g,o){for(const k of REALM_KEYS)g[k]=o[k];g.player.inSafeZone=true;renderHotbar();updateUIStats()}
function populateRealmCreatures(g,r){
 if(!g?.animals)return;
 for(const kind of r.creatures){const d=window.AVENTURIA_CREATURE_DEFS?.[kind];if(!d)continue;
  const count=Math.min(4,d.cap);for(let i=0;i<count;i++){const ang=Math.random()*Math.PI*2,dist=550+Math.random()*1250,x=2000+Math.cos(ang)*dist,y=2000+Math.sin(ang)*dist;g.spawnAnimal(kind,x,y,{mult:1.15})}
 }
}
function enterRealm(r){
 const g=game(),s=state();if(!g||!s||!r)return;
 if(realmReturnSnapshot){notify('Você já está em outra dimensão.');return}
 realmReturnSnapshot=saveRealmWorld(g);
 g.start(r.seed,{realmId:r.id});
 g.animals=[];g.player.x=2000;g.player.y=2350;g.player.inSafeZone=false;g.player.realmId=r.id;
 populateRealmCreatures(g,r);
 s.x=2000;s.y=2000;s.seed=r.seed;persist();
 notify('🌌 Dimensão '+r.name+' carregada! Explore livremente.');
}
function leaveRealm(){
 const g=game(),s=state();if(!g||!realmReturnSnapshot)return;
 restoreRealmWorld(g,realmReturnSnapshot);realmReturnSnapshot=null;
 s.x=g.player.x;s.y=g.player.y;persist();notify('Você voltou ao mundo principal.');
}
function openDungeonPortal(){
 const s=state();if(!s)return;let m=$('avx-dungeon-modal');if(!m){m=document.createElement('div');m.id='avx-dungeon-modal';m.style.cssText='position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:#061018dd;padding:16px';document.body.appendChild(m)}
 m.innerHTML='<div style="width:min(650px,100%);max-height:90vh;overflow:auto;background:linear-gradient(145deg,#172c36,#101522);border:1px solid #c6a66a;border-radius:20px;padding:22px;color:#fff"><small style="color:#f1d18c;letter-spacing:2px">PORTAIS DE AVENTURIA</small><h2 style="font-size:25px;font-weight:900">🌌 Dimensões desconhecidas</h2><p style="color:#bdcbd0;font-size:13px;margin:10px 0">Cada portal abre um mundo independente, com terreno, criaturas e exploração próprios. O nível mínimo protege os aventureiros despreparados.</p>'+AVENTURIA_REALMS.map(r=>{const ok=(s.level||1)>=r.level;return '<div style="display:flex;gap:12px;align-items:center;padding:13px;margin:10px 0;border:1px solid '+r.color+'66;border-radius:13px;background:#172630"><div style="font-size:28px">'+({verdant:'🌺',frost:'💎',mire:'🌿',ember:'🌋'}[r.id])+'</div><div style="flex:1"><b style="color:'+r.color+'">'+r.name+'</b><div style="font-size:11px;color:#aab9c0">'+r.theme+' · Nível '+r.level+'+</div><div style="font-size:11px;color:#c5d0d4">'+r.desc+'</div><div style="font-size:10px;color:#9cc">Criaturas: '+r.creatures.join(', ')+'</div></div><button data-world="'+r.id+'" '+(!ok?'disabled':'')+' style="padding:9px 12px;border-radius:9px;background:'+(ok?'#386d61':'#374151')+'">'+(ok?'Entrar':'🔒 Bloqueado')+'</button></div>'}).join('')+'<button id="avx-world-close" style="padding:9px 14px;background:#30424a;border-radius:9px">Fechar</button></div>';
 $('avx-world-close').onclick=()=>m.remove();m.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>{const r=AVENTURIA_REALMS.find(x=>x.id===b.dataset.world);if(r&&(s.level||1)>=r.level){enterRealm(r);m.remove()}});
}
function interactRealmPortal(g){const p=g.player;if(realmReturnSnapshot&&p.realmId&&Math.hypot(p.x-2000,p.y-2000)<115){leaveRealm();return true}return false}

function openDungeonPortal(){
 const s=state();if(!s)return;let m=$('avx-dungeon-modal');if(!m){m=document.createElement('div');m.id='avx-dungeon-modal';m.style.cssText='position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:#061018dd;padding:16px';document.body.appendChild(m)}
 m.innerHTML='<div style="width:min(650px,100%);max-height:90vh;overflow:auto;background:linear-gradient(145deg,#172c36,#101522);border:1px solid #c6a66a;border-radius:20px;padding:22px;color:#fff"><small style="color:#f1d18c;letter-spacing:2px">PORTAIS DE AVENTURIA</small><h2 style="font-size:25px;font-weight:900">🌌 Mundos além do véu</h2><p style="color:#bdcbd0;font-size:13px;margin:10px 0">Cada portal leva a um mundo aberto. Explore, lute, colete recursos e descubra ruínas no seu ritmo. Sem expedições ou salas instanciadas.</p>'+AVENTURIA_REALMS.map(r=>{const ok=(s.level||1)>=r.level;return '<div style="display:flex;gap:12px;align-items:center;padding:13px;margin:10px 0;border:1px solid '+r.color+'66;border-radius:13px;background:#172630"><div style="font-size:28px">'+({verdant:'🌺',frost:'💎',mire:'🌿',ember:'🌋'}[r.id])+'</div><div style="flex:1"><b style="color:'+r.color+'">'+r.name+'</b><div style="font-size:11px;color:#aab9c0">'+r.theme+' · Nível '+r.level+'+</div><div style="font-size:11px;color:#c5d0d4">'+r.desc+'</div></div><button data-world="'+r.id+'" '+(!ok?'disabled':'')+' style="padding:9px 12px;border-radius:9px;background:'+(ok?'#386d61':'#374151')+'">'+(ok?'Viajar':'🔒 Bloqueado')+'</button></div>'}).join('')+'<button id="avx-world-close" style="padding:9px 14px;background:#30424a;border-radius:9px">Fechar</button></div>';
 $('avx-world-close').onclick=()=>m.remove();m.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>{const r=AVENTURIA_REALMS.find(x=>x.id===b.dataset.world);if(!r||(s.level||1)<r.level)return;teleportRealm(r,r.x+r.w/2,r.y+r.h/2+110);m.remove()});
}
function interactRealmPortal(g){const p=g.player,s=state(),r=window.AVENTURIA_REALM_AT(p.x,p.y);if(r&&Math.hypot(p.x-(r.x+r.w/2),p.y-(r.y+r.h/2))<100){teleportRealm(null,EXP_SAFE.x,EXP_SAFE.y+175);return true}const near=AVENTURIA_REALMS.find(x=>Math.hypot(p.x-(x.x+x.w/2),p.y-(x.y+x.h/2+110))<90);if(near){if((s.level||1)<near.level){notify('Este mundo exige nível '+near.level+'.');return true}teleportRealm(near,near.x+near.w/2,near.y+near.h/2+110);return true}return false}

/* NPCs de cidade, montaria e mascote integrados ao mundo.
   SAFE/MAP são const locais do index.html; este script externo usa coordenadas equivalentes. */
const EXP_MAP=32*125,EXP_CX=EXP_MAP/2,EXP_SAFE={x:EXP_CX,y:EXP_CX,radius:260};
const townNPCs=[
 {id:'merchant',name:'Mercador de Aventuria',role:'Loja geral',x:EXP_SAFE.x+105,y:EXP_SAFE.y-75,icon:'🛒',color:'#d5a34c'},
 {id:'stable',name:'Mestre das Montarias',role:'Estábulo',x:EXP_SAFE.x-105,y:EXP_SAFE.y-75,icon:'🐎',color:'#b88b65'},
 {id:'pet',name:'Cuidadora de Mascotes',role:'Mascotes',x:EXP_SAFE.x+105,y:EXP_SAFE.y+75,icon:'🐾',color:'#8bcf9a'},
 {id:'guild',name:'Mestre das Guildas',role:'Guildas',x:EXP_SAFE.x-105,y:EXP_SAFE.y+75,icon:'🛡️',color:'#9cb9d8'},
 {id:'dungeon',name:'Guardião do Portal',role:'Masmorras',x:EXP_SAFE.x,y:EXP_SAFE.y-175,icon:'🌀',color:'#b99aff'}
];
const dungeonRooms=[
 {name:'Vestíbulo das Ruínas',x:EXP_MAP-560,y:EXP_MAP-560,w:360,h:260,enemy:'Sentinela das Ruínas',hp:100,reward:100},
 {name:'Galeria dos Ecos',x:EXP_MAP-560,y:EXP_MAP-260,w:360,h:260,enemy:'Cavaleiro Espectral',hp:180,reward:180},
 {name:'Câmara do Guardião',x:EXP_MAP-560,y:EXP_MAP-80,w:360,h:260,enemy:'Guardião Ancestral',hp:300,reward:350}
];
function mountAndPetDraw(g){
 if(!g?.running||!g.player)return;
 const c=g.ctx,p=g.player,s=state(),e=ensure();if(!s||!e)return;
 const camX=Math.round(p.x-g.canvas.width/2),camY=Math.round(p.y-g.canvas.height/2),now=performance.now();
 c.save();c.translate(-camX,-camY);
 if(p.realmId){c.save();c.translate(2000,2000);c.fillStyle='rgba(125,211,252,.2)';c.beginPath();c.arc(0,0,58,0,Math.PI*2);c.fill();c.strokeStyle='#a5f3fc';c.lineWidth=7;c.beginPath();c.arc(0,0,48,0,Math.PI*2);c.stroke();c.fillStyle='#e0f2fe';c.font='bold 13px Inter';c.textAlign='center';c.fillText('PORTAL DE RETORNO',0,-72);c.fillText('[ E ] Voltar',0,78);c.restore();}
 if(!p.realmId)for(const n of townNPCs){
  c.save();c.translate(n.x,n.y);
  c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.ellipse(0,14,17,6,0,0,Math.PI*2);c.fill();
  c.fillStyle=n.color;c.fillRect(-10,-3,20,17);c.fillStyle='#e7bd91';c.beginPath();c.arc(0,-12,9,0,Math.PI*2);c.fill();
  c.fillStyle='#26342e';c.fillRect(-6,-14,3,2);c.fillRect(3,-14,3,2);
  c.font='16px serif';c.textAlign='center';c.fillText(n.icon,0,-26);
  c.restore();
  c.font='bold 10px Inter';c.textAlign='center';c.fillStyle='#071311';c.fillRect(n.x-65,n.y-49,130,16);c.fillStyle='#ffe3a0';c.fillText(n.name,n.x,n.y-37);
  c.fillStyle='#fff';c.font='9px Inter';c.fillText('[ E ] '+n.role,n.x,n.y-25);
 }
 if(e.mount){
  c.save();c.translate(p.x-20,p.y+12);
  c.fillStyle='#573b27';c.beginPath();c.ellipse(0,0,18,10,0,0,Math.PI*2);c.fill();
  c.fillStyle='#9b6b42';c.fillRect(-11,-14,20,15);c.beginPath();c.arc(9,-14,8,0,Math.PI*2);c.fill();
  c.fillStyle='#3d2a1c';c.beginPath();c.moveTo(10,-20);c.lineTo(7,-29);c.lineTo(14,-22);c.fill();
  c.fillStyle='#d8b47a';c.fillRect(-8,-4,4,15);c.fillRect(5,-4,4,15);c.restore();
 }
 if(e.petEquipped&&e.pet){
  const bob=Math.sin(now/180)*4,emoji=e.pet==='slime'?'🟢':e.pet==='fox'?'🦊':'✨';
  c.font='20px serif';c.textAlign='center';c.fillText(emoji,p.x+30,p.y-24+bob);
 }
 if(e.dungeon?.active){
  const d=e.dungeon,room=dungeonRooms[Math.max(0,Math.min(2,d.room-1))];
  c.fillStyle='rgba(7,10,20,.18)';c.fillRect(room.x,room.y,room.w,room.h);
  c.strokeStyle='#a78bfa';c.lineWidth=8;c.strokeRect(room.x,room.y,room.w,room.h);
  c.fillStyle='#ddd6fe';c.font='bold 15px Inter';c.textAlign='center';c.fillText(room.name,room.x+room.w/2,room.y+28);
  c.fillStyle='#1f2937';c.fillRect(room.x+room.w/2-48,room.y+room.h/2-28,96,56);
  c.fillStyle='#a78bfa';c.fillRect(room.x+room.w/2-36,room.y+room.h/2-18,72,36);
  c.fillStyle='#fff';c.font='11px Inter';c.fillText(d.enemyName||room.enemy,room.x+room.w/2,room.y+room.h/2+54);
 }
 c.restore();
}
const gameReady=()=>{const g=game();if(!g||!g.running)return false;g.townNPCs=townNPCs;return true};
/* O jogo é instanciado no evento load do index.html. Como este arquivo externo
   é carregado durante o parse, instalar os hooks imediatamente encontraria window.game vazio. */
function installGameHooks(){
 // Keyboard handling is installed independently of the Game constructor.
 if(!window.__avxNpcKeyHook){
  window.__avxNpcKeyHook=true;
  window.addEventListener('keydown',ev=>{
   if((ev.code!=='KeyE'&&ev.key?.toLowerCase()!=='e')||ev.repeat)return;
   if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
   const g=game(),p=g?.player;if(!g||!p||!g.running)return;
   if(interactRealmPortal(g)){ev.preventDefault();ev.stopImmediatePropagation();return}
   if(p.realmId)return;
   const nearest=townNPCs.map(n=>({n,d:Math.hypot(p.x-n.x,p.y-n.y)})).sort((a,b)=>a.d-b.d)[0];
   if(nearest&&nearest.d<230){ev.preventDefault();ev.stopImmediatePropagation();openTownNPC(nearest.n.id);return}
  },true);
 }
 const g=game(),GameCtor=g?.constructor;
 if(!GameCtor||GameCtor.prototype.__avxTownHooks)return;
 const proto=GameCtor.prototype,originalRender=proto.render,originalInteract=proto.interact;
 if(originalRender)proto.render=function(){originalRender.call(this);mountAndPetDraw(this)};
 if(originalInteract)proto.interact=function(){
  if(interactRealmPortal(this))return;
  const p=this.player,n=townNPCs.slice().sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];
  if(n&&Math.hypot(p.x-n.x,p.y-n.y)<230){openTownNPC(n.id);return}
  if(ensure()?.dungeon?.active&&Math.hypot(p.x-(EXP_MAP-380),p.y-(EXP_MAP-430))<75){advanceDungeon();return}
  return originalInteract.call(this);
 };
 proto.__avxTownHooks=true;
}
window.addEventListener('aventuria:game-ready',installGameHooks);
window.addEventListener('load',installGameHooks);
installGameHooks();
const PET_CATALOG=[
{id:'slime',name:'Slime',emoji:'🟢',price:250,desc:'Companheiro resistente',bonus:'Defesa +8'},
{id:'fox',name:'Raposa Mística',emoji:'🦊',price:450,desc:'Ágil e companheira',bonus:'Ataque +6'},
{id:'wisp',name:'Fagulha Arcana',emoji:'✨',price:600,desc:'Espírito de energia',bonus:'Poder +8'},
{id:'lume',name:'Vagalume de Lúmen',emoji:'🌟',price:900,desc:'Nativo de Lúmen',bonus:'Poder +12',realm:3},
{id:'crystal',name:'Raposa Cristalina',emoji:'💠',price:1400,desc:'Nativa da Cidadela',bonus:'Defesa +12',realm:8},
{id:'root',name:'Filhote das Raízes',emoji:'🌱',price:1900,desc:'Guardião da selva',bonus:'Vida +40',realm:15},
{id:'drake',name:'Draco Jovem',emoji:'🐉',price:3000,desc:'Dragão de estimação',bonus:'Ataque +15',realm:22}];
const MOUNT_CATALOG=[
{id:'horse',name:'Cavalo',emoji:'🐎',price:500,speed:1.3,desc:'Montaria equilibrada'},
{id:'deer',name:'Cervo Élfico',emoji:'🦌',price:1200,speed:1.4,desc:'Montaria de Lúmen',realm:3},
{id:'wolf',name:'Lobo Glacial',emoji:'🐺',price:1800,speed:1.5,desc:'Montaria da Cidadela',realm:8},
{id:'boar',name:'Javali de Guerra',emoji:'🐗',price:2400,speed:1.45,desc:'Montaria das Raízes',realm:15},
{id:'drake',name:'Draco de Sela',emoji:'🐲',price:4000,speed:1.65,desc:'Montaria vulcânica',realm:22}];
function openCompanionUI(type){
 const s=state(),e=ensure(),pets=type==='pet',catalog=pets?PET_CATALOG:MOUNT_CATALOG;if(!s||!e)return;
 const owned=pets?(e.petsOwned??=(e.pet? [e.pet]:['slime'])):(e.mountsOwned??=(e.mount?['horse']:[]));
 let m=$('avx-companion-modal');if(!m){m=document.createElement('div');m.id='avx-companion-modal';m.style.cssText='position:fixed;inset:0;z-index:110;display:flex;align-items:center;justify-content:center;background:#061018dd;padding:14px';document.body.appendChild(m)}
 m.innerHTML='<div style="width:min(760px,100%);max-height:90vh;overflow:auto;background:linear-gradient(145deg,#182f36,#101522);border:1px solid #c6a66a;border-radius:18px;padding:18px;color:#fff"><div style="display:flex;justify-content:space-between"><div><small style="color:#e5bd72;letter-spacing:2px">COLEÇÃO DE AVENTURIA</small><h2 style="font-size:24px;font-weight:900">'+(pets?'🐾 Santuário de Mascotes':'🐎 Estábulo Real')+'</h2></div><button id="avx-comp-close">✕</button></div><p style="font-size:12px;color:#b6c6ca;margin:7px 0 13px">Compre, equipe, guarde ou venda. Companheiros dimensionais só podem ser adquiridos após alcançar o nível de seu mundo.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">'+catalog.map(x=>{const has=owned.includes(x.id),locked=x.realm&&(s.level||1)<x.realm;return '<div style="border:1px solid '+(has?'#6dbb91':'#42565e')+';border-radius:12px;padding:12px;background:#1b2b32"><div style="font-size:28px">'+x.emoji+'</div><b>'+x.name+'</b><div style="font-size:11px;color:#afc0c5;margin:4px 0">'+x.desc+'</div><div style="font-size:11px;color:#e9cc8d">'+x.bonus+'</div><div style="font-size:10px;color:#9daeb5;margin:4px 0">'+(x.realm?'Nível '+x.realm+'+':'Cidade')+'</div><div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">'+(has?'<button data-equip="'+x.id+'" style="background:#356a58;padding:7px 9px;border-radius:7px">Equipar</button><button data-sell="'+x.id+'" style="background:#714b3e;padding:7px 9px;border-radius:7px">Vender · '+Math.floor(x.price*.45)+' G</button>':'<button data-buy="'+x.id+'" '+(locked||s.gold<x.price?'disabled':'')+' style="background:#356a58;padding:7px 9px;border-radius:7px">Comprar · '+x.price+' G</button>')+'</div></div>'}).join('')+'</div></div>';
 $('avx-comp-close').onclick=()=>m.remove();
 m.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const x=catalog.find(z=>z.id===b.dataset.buy);if(!x||s.gold<x.price)return;s.gold-=x.price;owned.push(x.id);persist();openCompanionUI(type)});
 m.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{if(pets){e.pet=b.dataset.equip;e.petEquipped=true;e.petData??={level:1,xp:0,bond:0,skillReady:0}}else{e.mountType=b.dataset.equip;e.mount=true}persist();openCompanionUI(type)});
 m.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>{const id=b.dataset.sell;if((pets?e.pet:e.mountType)===id){notify('Desequipe antes de vender.');return}const i=owned.indexOf(id);if(i<0)return;owned.splice(i,1);s.gold+=Math.floor(catalog.find(z=>z.id===id).price*.45);persist();openCompanionUI(type)});
}
window.AVENTURIA_INTERACT_NPC=id=>openTownNPC(id);
window.AVENTURIA_SAFE_NPCS=townNPCs;
function openTownNPC(id){
 const s=state(),e=ensure();if(!s||!e)return;
 const w=e.world??=( {guild:null,friends:[],house:0,skills:{},spent:0,gear:0,seasonXp:0,seasonClaimed:[],treasures:0,dungeonWins:0,arenaWins:0,eventWins:0,marketLog:[]} );
 const actions={
 merchant:()=>{const choice=prompt('LOJA DE AVENTURIA\\n1 - Poção (+vida) · 60 Gold\\n2 - Ovo de mascote · 250 Gold\\n3 - Kit de exploração · 120 Gold');if(choice==='1'&&s.gold>=60){s.gold-=60;s.items.potion=(s.items.potion||0)+1;notify('Poção adicionada ao inventário!')}else if(choice==='2'&&s.gold>=250){s.gold-=250;e.pet=['slime','fox','wisp'][Math.floor(Math.random()*3)];e.petEquipped=true;notify('Novo mascote!')}else if(choice==='3'&&s.gold>=120){s.gold-=120;s.resources.wood+=5;s.resources.iron+=2;notify('Kit de exploração comprado!')}else notify('Opção inválida ou Gold insuficiente.');persist()},
 stable:()=>openCompanionUI('mount'),
 pet:()=>openCompanionUI('pet'),
 guild:()=>{if(!w.guild){const name=(prompt('Nome da sua guilda (3 a 20 caracteres):')||'').trim();if(name.length<3||name.length>20){notify('Nome inválido.');return}if(s.gold<200){notify('Fundar uma guilda custa 200 Gold.');return}s.gold-=200;w.guild=name;w.members=[{name:s.name||'Líder',role:'Líder',joined:Date.now()}];notify('Guilda '+name+' fundada!')}else{const online=window.AVENTURIA_ONLINE?.players||[];const list=online.filter(x=>x.name!==s.name).map(x=>x.name).join(', ');const who=prompt('Guilda: '+w.guild+'\\nMembros: '+w.members.map(m=>m.name).join(', ')+'\\nJogadores visíveis: '+(list||'nenhum detectado')+'\\nDigite nome de membro para registrar convite local:');if(who){w.members.push({name:who,role:'Recruta',joined:Date.now(),pending:true});notify('Convite anotado. Para convite real entre contas precisamos persistir guildas no servidor.')}}persist()},
 dungeon:()=>{if((s.level||1)<3){notify('O portal exige nível 3.');return}if(e.dungeon?.active){notify('Você já está em uma expedição.');return}e.dungeon={active:true,room:1,hp:Math.max(80,s.hp||100),maxHp:Math.max(80,s.hp||100),enemyHp:100,enemyName:dungeonRooms[0].enemy};const g=game();if(g?.player){g.player.x=EXP_MAP-380;g.player.y=EXP_MAP-430;s.x=g.player.x;s.y=g.player.y}notify('🌀 Você atravessou o portal! Derrote o guardião e avance pelas três salas.');persist()}
 };
 actions[id]?.();if(panel.style.display==='block')renderPanel();
}
function openDungeonPortal(){
 const s=state(),e=ensure();if(!s||!e)return;
 let m=$('avx-dungeon-modal');if(!m){m=document.createElement('div');m.id='avx-dungeon-modal';m.style.cssText='position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:#02090ddd;padding:16px';document.body.appendChild(m)}
 const opts=[['crypt','Cripta Esquecida',3,50,'Mortos-vivos e relíquias',1],['ember','Catacumbas Ígneas',8,100,'Guardião flamejante e tesouros',1.7],['abyss','Abismo dos Ecos',15,180,'Desafio extremo e itens raros',2.5]];
 m.innerHTML='<div style="width:min(540px,100%);max-height:90vh;overflow:auto;background:linear-gradient(145deg,#172b32,#080f18);border:1px solid #b68b48;border-radius:18px;padding:20px;color:#fff"><div style="display:flex;justify-content:space-between"><div><small style="color:#e5bc70;letter-spacing:2px">SANTUÁRIO DOS PORTAIS</small><h2 style="font-size:24px;font-weight:900">🌀 Escolha sua masmorra</h2></div><button id="avx-dm-close">✕</button></div><p style="font-size:12px;color:#a9bbc3;margin:8px 0">Cada expedição possui três salas. Derrote os guardiões para avançar e conquistar recompensas.</p>'+(e.dungeon?.active?'<div style="padding:12px;border:1px solid #c59b55;border-radius:10px;margin:10px 0"><b>Expedição em andamento · Sala '+e.dungeon.room+'/3</b><p style="font-size:12px">Vida: '+Math.ceil(e.dungeon.hp)+' · '+e.dungeon.enemyName+'</p><button id="avx-dm-resume" style="background:#926b32;padding:8px;border-radius:7px">Retomar</button> <button id="avx-dm-abandon" style="background:#713d3d;padding:8px;border-radius:7px">Abandonar</button></div>':'')+opts.map(d=>'<div style="padding:12px;margin:9px 0;border:1px solid #40545b;border-radius:10px"><b style="color:#f6d79b">'+d[1]+'</b><p style="font-size:11px;color:#a9bbc3">'+d[4]+' · Nível '+d[2]+'+ · Entrada '+d[3]+' Gold · Recompensa x'+d[5]+'</p><button data-dun="'+d[0]+'" style="background:#315c59;padding:8px 12px;border-radius:7px" '+((s.level||1)<d[2]||e.dungeon?.active?'disabled':'')+'>Entrar no portal</button></div>').join('')+'</div>';
 $('avx-dm-close').onclick=()=>m.remove();const resume=$('avx-dm-resume');if(resume)resume.onclick=()=>m.remove();const abandon=$('avx-dm-abandon');if(abandon)abandon.onclick=()=>{e.dungeon.active=false;const g=game();if(g?.player){g.player.x=EXP_SAFE.x;g.player.y=EXP_SAFE.y;s.x=g.player.x;s.y=g.player.y}persist();m.remove();notify('Expedição abandonada.')};
 m.querySelectorAll('[data-dun]').forEach(b=>b.onclick=()=>{const d=opts.find(x=>x[0]===b.dataset.dun);if((s.gold||0)<d[3]){notify('Gold insuficiente.');return}s.gold-=d[3];e.dungeon={active:true,type:d[0],name:d[1],mult:d[5],room:1,hp:s.maxHp||100,maxHp:s.maxHp||100,enemyHp:Math.round((100+(s.level||1)*18)*d[5]),enemyName:'Guardião da '+d[1]};const g=game();if(g?.player){g.player.x=EXP_MAP-380;g.player.y=EXP_MAP-430;s.x=g.player.x;s.y=g.player.y}persist();m.remove();notify('Portal aberto! Pressione E perto do guardião para atacar.')});
}
function advanceDungeon(){
 const e=ensure(),s=state(),d=e?.dungeon;if(!d?.active)return;
 const room=dungeonRooms[d.room-1],st=window.getRPGStats?.()||{atk:10,power:5,def:3};
 const hit=30+(s.level||1)*5+(st.atk||0)*2+(st.power||0)*2+(e.gear||0)*5+Math.random()*24+(e.petEquipped?8:0);
 d.enemyHp=Math.max(0,(d.enemyHp??room.hp)-hit);d.hp-=Math.max(2,10+d.room*3-(st.def||0)*.35);
 if(d.hp<=0){d.active=false;const g=game();if(g?.player){g.player.x=EXP_SAFE.x;g.player.y=EXP_SAFE.y}s.x=EXP_SAFE.x;s.y=EXP_SAFE.y;notify('Você foi derrotado! O guardião expulsou você da masmorra.');persist();return}
 if(d.enemyHp>0){notify('⚔ '+d.enemyName+' recebeu '+Math.floor(hit)+' de dano. HP restante: '+Math.ceil(d.enemyHp)+' · Sua vida: '+Math.ceil(d.hp));persist();return}
 if(d.room<3){d.room++;const next=dungeonRooms[d.room-1];d.enemyName=next.enemy;d.enemyHp=Math.round(next.hp*(d.mult||1));d.hp=Math.min(d.maxHp,d.hp+25);const g=game();if(g?.player){g.player.x=next.x+next.w/2;g.player.y=next.y+next.h/2;s.x=g.player.x;s.y=g.player.y}notify('Sala '+d.room+'/3 concluída! Você avançou para '+next.name+'.');}
 else{d.active=false;e.world.dungeonWins++;e.world.seasonXp+=Math.round(200*(d.mult||1));s.gold+=Math.round((room.reward+150)*(d.mult||1));s.resources.iron=(s.resources.iron||0)+3;const g=game();if(g?.player){g.player.x=EXP_SAFE.x;g.player.y=EXP_SAFE.y}s.x=EXP_SAFE.x;s.y=EXP_SAFE.y;notify('🏆 Masmorra conquistada! Recompensas: Gold, 3 ferros e XP de temporada.');}
 persist();if(panel.style.display==='block')renderPanel();
}
const overlay=document.createElement('div');overlay.id='avx-world-overlay';overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:12;background:transparent;transition:background 2s';
document.body.appendChild(overlay);
const clock=document.createElement('div');clock.id='avx-world-clock';clock.className='fixed left-1/2 -translate-x-1/2 bottom-3 z-10 glass-panel rounded-full px-3 py-1 text-[10px] font-bold text-amber-100 pointer-events-none';clock.textContent='☀️ Dia · Céu limpo';document.body.appendChild(clock);
setInterval(tick,1000);
window.AventuriaExpansion={open:()=>{panel.style.display='block';renderPanel()},refresh:renderPanel};
})();