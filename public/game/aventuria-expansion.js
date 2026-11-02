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
// A navegação de serviços acontece exclusivamente pelos NPCs físicos da cidade.
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

 const w=e.world??=( {guild:null,friends:[],house:0,skills:{},spent:0,gear:0,seasonXp:0,seasonClaimed:[],treasures:0,arenaWins:0,eventWins:0,marketLog:[]} );
 w.worldBoss??={hp:0,active:false,phase:0};w.seasonStarted??=Date.now();
 const skillDefs=[['power','Força','+5% de dano por nível',5],['vitality','Vitalidade','+8 de vida máxima por nível',5],['haste','Agilidade','+3% de velocidade por nível',5],['fortune','Fortuna','+4% de ouro em recompensas por nível',5]];
 const skillHtml=skillDefs.map(x=>'<div class="flex items-center justify-between gap-2 py-1"><div><b>'+x[1]+'</b><div class="text-[10px] text-slate-400">'+x[2]+'</div></div><button class="avx-action" data-skill="'+x[0]+'">Evoluir ('+(w.skills[x[0]]||0)+'/'+x[3]+')</button></div>').join('');
 const featureHtml=
 '<div class="avx-card" data-section="social"><b class="text-amber-100">🛡 Guildas, grupos e amizades</b><p class="text-[11px] text-slate-400 mt-1">'+(w.guild?'Guilda local: '+esc(w.guild):'Crie a identidade da sua guilda. Convites e membros online serão conectados na etapa de servidor.')+'</p><button id="avx-guild" class="avx-action mt-2">'+(w.guild?'Guilda criada':'Fundar guilda · 200 Gold')+'</button><div class="text-[10px] text-slate-500 mt-2">Grupo cooperativo e lista de amigos preparados para integração multiplayer.</div></div>'+

 '<div class="avx-card" data-section="social"><b class="text-amber-100">🛒 Mercado</b><p class="text-[11px] text-slate-400 mt-1">Banca de comerciante NPC com consumíveis e materiais. Negociação entre jogadores será ativada com backend seguro.</p><button id="avx-market" class="avx-action mt-2">Comprar kit de aventura · 120 Gold</button><div class="text-[10px] text-slate-500">Compras registradas: '+w.marketLog.length+'</div></div>'+
 '<div class="avx-card" data-section="growth"><b class="text-amber-100">🏡 Casas e construção de vilas</b><p class="text-[11px] text-slate-400 mt-1">Melhore sua propriedade e desbloqueie níveis de construção.</p><button id="avx-house" class="avx-action mt-2">Melhorar casa · '+(300+w.house*250)+' Gold</button><div class="text-[10px] text-slate-500">Nível da casa: '+w.house+'</div></div>'+
 '<div class="avx-card" data-section="growth"><b class="text-amber-100">🌟 Árvore de habilidades e subclasses</b><p class="text-[11px] text-slate-400 mt-1">Pontos disponíveis: '+Math.max(0,(s.level||1)-1-w.spent)+'</p>'+skillHtml+'<div class="text-[10px] text-slate-500">Subclasses serão liberadas após a progressão avançada.</div></div>'+
 '<div class="avx-card" data-section="growth"><b class="text-amber-100">⚒ Equipamentos evolutivos</b><p class="text-[11px] text-slate-400 mt-1">Aprimore seu equipamento em até +10. Cada nível custa Gold e materiais.</p><button id="avx-gear" class="avx-action mt-2">Aprimorar equipamento +'+w.gear+' · '+(150+w.gear*100)+' Gold</button></div>'+
 '<div class="avx-card" data-section="world"><b class="text-amber-100">🐉 Chefes mundiais e eventos</b><p class="text-[11px] text-slate-400 mt-1">Evento de treinamento contra chefe mundial. A versão global terá vida compartilhada e janela de participação.</p><button id="avx-event" class="avx-action mt-2">Enfrentar chefe do evento</button><div class="text-[10px] text-slate-500">Eventos vencidos: '+w.eventWins+'</div></div>'+
 '<div class="avx-card" data-section="world"><b class="text-amber-100">🗺 Tesouros, ilhas secretas e exploração</b><p class="text-[11px] text-slate-400 mt-1">Procure um esconderijo antigo e encontre recompensas aleatórias.</p><button id="avx-treasure" class="avx-action mt-2">Explorar região · 40 Gold</button><div class="text-[10px] text-slate-500">Tesouros encontrados: '+w.treasures+'</div></div>'+
 '<div class="avx-card" data-section="world"><b class="text-amber-100">🏆 Ranking mundial e passe de temporada</b><p class="text-[11px] text-slate-400 mt-1">XP da temporada: '+w.seasonXp+' · Patamar '+(1+Math.floor(w.seasonXp/500))+'</p><div class="avx-bar"><i style="width:'+(w.seasonXp%500)/5+'%"></i></div><p class="text-[10px] text-slate-500 mt-2">Ranking pessoal local: nível '+(s.level||1)+' · '+(s.kills||0)+' criaturas derrotadas. Ranking global requer placar central.</p><button id="avx-season" class="avx-action mt-2">Resgatar prêmio de temporada</button></div>';
 $('avx-content').insertAdjacentHTML('beforeend',featureHtml);

 // Sistemas avançados: elementos, forja, transmog, contratos, tesouros e despertar.
 e.advanced??={elements:[],contracts:{},treasure:null,duels:0};
 const adv=e.advanced;
 const advancedHtml=
 '<div class="avx-card" data-section="combat"><b class="text-amber-100">🔥 Combinação de elementos</b><p class="avx-muted mt-1">Aprenda elementos e combine dois para criar uma afinidade especial.</p><div class="flex flex-wrap gap-2 mt-2">'+[['fire','🔥 Fogo',4],['ice','❄️ Gelo',4],['storm','⚡ Raio',5],['nature','🌿 Natureza',3]].map(([id,n,c])=>'<button class="avx-action" data-element="'+id+'">'+n+' · '+(adv.elements.includes(id)?'Aprendido':c+' ferro')+'</button>').join('')+'</div><div class="text-[10px] text-amber-200 mt-2">Afinidades: '+(adv.elements.length?adv.elements.join(' + '):'nenhuma')+'</div><button id="avx-fusion" class="avx-action mt-2">Combinar elementos</button><div class="avx-muted">Combinações desbloqueiam bônus de poder nas magias.</div></div>'+
 '<div class="avx-card" data-section="growth"><b class="text-amber-100">⚒ Forja de equipamentos</b><p class="avx-muted mt-1">Aprimore sua arma equipada com ferro e ouro.</p><div class="text-xs mt-2">Arma: '+esc(s.equipment?.weapon?.name||'Nenhuma equipada')+' · '+(s.equipment?.weapon?.forgeLevel||0)+'/10</div><button id="avx-forge" class="avx-action mt-2">Forjar arma · '+(100+((s.equipment?.weapon?.forgeLevel||0)*90))+' Gold + 3 Ferro</button></div>'+
 '<div class="avx-card" data-section="growth"><b class="text-amber-100">🎭 Transmog e aparência</b><p class="avx-muted mt-1">Altere o visual da arma sem mudar seus atributos.</p><div class="flex flex-wrap gap-2 mt-2">'+[['default','Original'],['crystal','Cristal'],['flame','Chamas'],['shadow','Sombria']].map(([id,n])=>'<button class="avx-action" data-skin="'+id+'">'+n+'</button>').join('')+'</div><div class="avx-muted mt-2">Visual atual: '+esc(s.equipment?.weapon?.appearance||'default')+'</div></div>'+
 '<div class="avx-card" data-section="world"><b class="text-amber-100">📜 Contratos de caça</b><p class="avx-muted mt-1">Aceite contratos, derrote criaturas e resgate recompensas.</p><div class="text-xs mt-2">Abates desde o contrato: '+(adv.contracts.progress||0)+'/'+(adv.contracts.goal||0)+'</div><button id="avx-contract" class="avx-action mt-2">'+(adv.contracts.active?'Abandonar contrato':'Aceitar contrato · 5 criaturas')+'</button><button id="avx-contract-claim" class="avx-action mt-2" '+(!(adv.contracts.active&&adv.contracts.progress>=adv.contracts.goal)?'disabled':'')+'>Resgatar 180 Gold</button></div>'+
 '<div class="avx-card" data-section="world"><b class="text-amber-100">🧭 Caça ao tesouro</b><p class="avx-muted mt-1">Explore uma expedição e procure um baú perdido. A expedição usa sua posição atual como ponto de partida.</p><div class="text-xs mt-2">'+(adv.treasure?'Expedição ativa · procure o baú indicado no mapa':'Nenhuma expedição ativa')+'</div><button id="avx-treasure-hunt" class="avx-action mt-2">'+(adv.treasure?'Cancelar busca':'Iniciar busca · 60 Gold')+'</button></div>'+
 '<div class="avx-card" data-section="growth"><b class="text-amber-100">🌟 Despertar de armas</b><p class="avx-muted mt-1">Desperte a arma equipada para liberar poder adicional e efeitos especiais.</p><div class="text-xs mt-2">Despertar: '+(s.equipment?.weapon?.awakening||0)+'/5</div><button id="avx-awaken" class="avx-action mt-2">Despertar · '+(250+((s.equipment?.weapon?.awakening||0)*250))+' Gold + 1 Diamante</button></div>'
 $('avx-content').insertAdjacentHTML('beforeend',advancedHtml);
 // bind/spend precisam existir antes do primeiro uso (const não é içada: antes isso gerava ReferenceError
 // e derrubava o painel inteiro, deixando vários NPCs sem funcionar)
 const bind=(id,fn)=>{const el=$(id);if(el)el.onclick=()=>{fn();persist();renderPanel();if(typeof updateUIStats==='function')updateUIStats()}};
 const spend=(n)=>{if((s.gold||0)<n){notify('Gold insuficiente.');return false}s.gold-=n;return true};
 panel.querySelectorAll('[data-element]').forEach(b=>b.onclick=()=>{const id=b.dataset.element;if(adv.elements.includes(id))return notify('Esse elemento já foi aprendido.');if((s.resources?.iron||0)<4)return notify('Você precisa de 4 ferros.');s.resources.iron-=4;adv.elements.push(id);persist();notify('Elemento '+id+' aprendido!');renderPanel()});
 bind('avx-fusion',()=>{if(adv.elements.length<2){notify('Aprenda pelo menos dois elementos.');return}adv.fusion=adv.elements.slice(-2);adv.fusionBonus=(adv.fusionBonus||0)+1;notify('✨ Fusão '+adv.fusion.join(' + ')+' desbloqueada! Poder mágico aumentado.')});
 bind('avx-forge',()=>{const it=s.equipment?.weapon;if(!it){notify('Equipe uma arma primeiro.');return}it.forgeLevel=it.forgeLevel||0;if(it.forgeLevel>=10){notify('Sua arma já está no nível máximo de forja.');return}const cost=100+it.forgeLevel*90;if((s.resources?.iron||0)<3){notify('Você precisa de 3 ferros.');return}if(!spend(cost))return;s.resources.iron-=3;it.forgeLevel++;it.stats??={};it.stats.atk=(it.stats.atk||0)+3;notify('Forja concluída! Ataque +3.')});
 panel.querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>{const it=s.equipment?.weapon;if(!it){notify('Equipe uma arma primeiro.');return}it.appearance=b.dataset.skin;persist();notify('Aparência alterada: '+b.dataset.skin);renderPanel()});
 bind('avx-contract',()=>{if(adv.contracts.active){adv.contracts={};notify('Contrato abandonado.');return}adv.contracts={active:true,progress:0,goal:5,startKills:s.animalKills||0};notify('Contrato aceito: derrote 5 criaturas.')});
 bind('avx-contract-claim',()=>{const c=adv.contracts;if(!c.active||c.progress<c.goal)return;s.gold+=180;adv.contracts={};notify('Contrato concluído! +180 Gold.')});
 bind('avx-treasure-hunt',()=>{const g=game();if(adv.treasure){adv.treasure=null;notify('Busca cancelada.');return}if(!g?.player){notify('Entre no mundo para iniciar uma busca.');return}if(!spend(60))return;const a=Math.random()*Math.PI*2,d=420+Math.random()*260;adv.treasure={x:g.player.x+Math.cos(a)*d,y:g.player.y+Math.sin(a)*d,seed:Date.now()};notify('🧭 Mapa encontrado! Explore a região próxima para localizar o baú.')});
 bind('avx-awaken',()=>{const it=s.equipment?.weapon;if(!it){notify('Equipe uma arma primeiro.');return}it.awakening=it.awakening||0;if(it.awakening>=5){notify('Sua arma atingiu o despertar máximo.');return}if((s.resources?.diamond||0)<1){notify('Você precisa de 1 diamante.');return}if(!spend(250+it.awakening*250))return;s.resources.diamond--;it.awakening++;it.stats??={};it.stats.atk=(it.stats.atk||0)+6;it.stats.power=(it.stats.power||0)+3;notify('🌟 Arma despertada! Ataque +6 e poder +3.')});

 const tabs=panel.querySelectorAll('[data-tab]');
 tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.toggle('active',x===t));const v=t.dataset.tab;panel.querySelectorAll('#avx-content>.avx-card').forEach(card=>{const sec=card.dataset.section||'growth';card.style.display=v==='all'||sec===v?'':'none'})});
 bind('avx-guild',()=>{if(w.guild){notify('Sua guilda local já está criada.');return}const name=(prompt('Escolha o nome da sua guilda (3 a 20 caracteres):')||'').trim();if(name.length<3||name.length>20){notify('O nome precisa ter de 3 a 20 caracteres.');return}if(!spend(200))return;w.guild=name;w.guildLevel=1;w.guildRenown=0;w.seasonXp+=50;notify('🏰 '+name+' foi fundada! Sua guilda está salva neste personagem. Convites online ainda precisam do servidor.')});

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
 refreshServiceWindow();
}
function claim(id){const s=state(),e=ensure(),q=e.daily.quests.find(x=>x.id===id);if(!q||q.progress<q.goal||e.claimed[id])return;s.gold+=q.reward;e.claimed[id]=true;persist();notify('Recompensa recebida: '+q.reward+' Gold!');renderPanel();if(typeof updateUIStats==='function')updateUIStats()}
function notify(m){if(typeof showNotification==='function')showNotification(m,'#f5d58c')}
function persist(){try{if(typeof saveGame==='function')saveGame(false)}catch{}}
let lastResources=null,lastClock=0,lastDraw=0,lastSeasonKills=null,lastSeasonRaids=null;
function updateMobileNPCButton(){
 const g=game(),p=g?.player;if(!g?.running||!p||p.realmId){$('avx-mobile-interact')?.remove();return}
 const near=townNPCs.map(n=>({n,d:Math.hypot(p.x-n.x,p.y-n.y)})).sort((a,b)=>a.d-b.d)[0];
 let btn=$('avx-mobile-interact');
 if(!near||near.d>240){btn?.remove();return}
 if(!btn){btn=document.createElement('button');btn.id='avx-mobile-interact';btn.type='button';btn.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();const g=game(),p=g?.player;if(!p)return;const n=townNPCs.map(n=>({n,d:Math.hypot(p.x-n.x,p.y-n.y)})).sort((a,b)=>a.d-b.d)[0];if(n&&n.d<260)openTownNPC(n.n.id)});document.body.appendChild(btn)}
 btn.textContent='E · '+near.n.name;
 btn.style.cssText='position:fixed;right:18px;bottom:calc(env(safe-area-inset-bottom) + 190px);z-index:99999;padding:14px 18px;border-radius:16px;border:2px solid '+near.n.color+';background:#10212bea;color:#fff;font:800 13px system-ui;box-shadow:0 5px 22px #0009;touch-action:manipulation;pointer-events:auto';
}
function tick(){
 const s=state(),e=ensure(),g=game();if(!s||!e)return;
 updateMobileNPCButton();
 const treasureHud=$('avx-treasure-hud');
 if(e.advanced?.treasure&&g?.player){
  let hud=treasureHud;if(!hud){hud=document.createElement('div');hud.id='avx-treasure-hud';hud.style.cssText='position:fixed;left:50%;top:62px;transform:translateX(-50%);z-index:9998;padding:8px 13px;border:1px solid #d6ad62;border-radius:10px;background:#101d20ee;color:#ffe7ad;font:800 12px Inter,system-ui;pointer-events:none';document.body.appendChild(hud)}
  const dx=e.advanced.treasure.x-g.player.x,dy=e.advanced.treasure.y-g.player.y;hud.textContent='🧭 BAÚ: '+Math.round(Math.hypot(dx,dy))+'m · '+(Math.abs(dx)>Math.abs(dy)?(dx>0?'→':'←'):(dy>0?'↓':'↑'));
 }else treasureHud?.remove();
 if(e.advanced?.treasure&&g?.player){
  const t=e.advanced.treasure,d=Math.hypot(g.player.x-t.x,g.player.y-t.y);
  if(d<58){const reward=250+Math.floor(Math.random()*251);s.gold=(s.gold||0)+reward;e.advanced.treasure=null;e.world.treasures=(e.world.treasures||0)+1;e.world.seasonXp=(e.world.seasonXp||0)+90;notify('💎 Baú encontrado! Você recebeu '+reward+' Gold e 90 XP de temporada.');persist();if(typeof updateUIStats==='function')updateUIStats()}
 }
 $('avx-dungeon-timer')?.remove();
 const res=s.resources||{},total=Object.values(res).reduce((a,b)=>a+(Number(b)||0),0);
 if(lastResources){for(const k of Object.keys(res)){const d=Math.max(0,(res[k]||0)-(lastResources[k]||0));if(!d)continue;const prof=['wood','pine'].includes(k)?'lumberjack':['stone','iron','goldOre','diamond','obsidian'].includes(k)?'miner':['berry','mushroom','herb','cactus'].includes(k)?'forager':null;if(prof)e.professions[prof].xp+=d*5;}}
 lastResources={...res};
 const q=e.daily?.quests||[];
 if(e.advanced?.contracts?.active){const c=e.advanced.contracts;c.progress=Math.min(c.goal,Math.max(0,(s.animalKills||0)-(c.startKills||0)))}
 const kills=s.animalKills||0,raids=s.raidsCleared||0;
 if(e.petEquipped&&e.pet){e.petData??={level:1,xp:0,bond:0,skillReady:0};const pd=e.petData;pd.lastKills??=kills;const gained=Math.max(0,kills-pd.lastKills);if(gained){pd.xp+=gained*20;pd.bond+=gained;pd.lastKills=kills;const need=100+(pd.level-1)*75;if(pd.xp>=need){pd.xp-=need;pd.level++;notify('🐾 Seu mascote evoluiu para o nível '+pd.level+'!')}}}
 if(lastSeasonKills===null){lastSeasonKills=kills;lastSeasonRaids=raids}
 if(kills>lastSeasonKills){e.world.seasonXp+=(kills-lastSeasonKills)*5;lastSeasonKills=kills}
 if(raids>lastSeasonRaids){e.world.seasonXp+=(raids-lastSeasonRaids)*100;lastSeasonRaids=raids}
 if(e.dayStartDay!==e.daily.day||e.dayStartKills===undefined||e.dayStartRaids===undefined){e.dayStartDay=e.daily.day;e.dayStartKills=kills;e.dayStartRaids=raids}
 for(const x of q){if(x.type==='kills')x.progress=Math.min(x.goal,Math.max(0,kills-e.dayStartKills));if(x.type==='raid')x.progress=Math.min(x.goal,Math.max(0,raids-e.dayStartRaids))}
 const gathered=Math.max(0,total-(e.dayStartTotal??(e.dayStartTotal=total)));const gatherQ=q.find(x=>x.type==='gather');if(gatherQ)gatherQ.progress=Math.min(gatherQ.goal,gathered);
 if(g&&g.running){
  const safeT=Number.isFinite(g.t)?g.t:Date.now()/1000;
  const phase=((safeT%360)+360)%360/360,night=Math.max(0,Math.min(1,(Math.cos(phase*Math.PI*2+Math.PI-.2)+.12)/1.12));
  const weather=['Céu limpo','Chuva leve','Neblina','Vento forte'][Math.floor(g.t/150)%4];
  if(Math.floor(g.t/360)!==lastClock){lastClock=Math.floor(g.t/360);notify('O mundo entrou em um novo período do dia.')}
  const p=g.player;if(p){const base=p.baseSpd||p.speed||3.8;if(p.baseSpd){p.speed=p.baseSpd}}
  const overlay=$('avx-world-overlay');if(overlay){overlay.style.background='rgba(7,12,35,'+(night*.24)+')';overlay.dataset.weather=weather}
  const clock=$('avx-world-clock');if(clock)clock.textContent=(night>.55?'🌙 Noite':'☀️ Dia')+' · '+weather;
  $('avx-expedition-exit')?.remove();
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
 g.start(r.seed);
 g.animals=[];g.player.x=2000;g.player.y=2700;g.player.inSafeZone=false;g.player.realmId=r.id;
 g.player.realmSpawn={x:2000,y:2700};g.player.biome=({verdant:'forest',frost:'snow',mire:'swamp',ember:'volcano'})[r.id]||'forest';
 g.npc={x:2000,y:2000,name:'Portal de Retorno'};
 g.ponds=[];g.structs=[];g.crops=[];g.loot=[];g.projs=[];g.hazards=[];g.fx=[];g.raids=[];
 populateRealmCreatures(g,r);
 s.x=2000;s.y=2000;s.seed=r.seed;persist();
 notify('🌌 Dimensão '+r.name+' carregada! Explore livremente.');
}
function leaveRealm(){
 const g=game(),s=state();if(!g||!realmReturnSnapshot)return;
 restoreRealmWorld(g,realmReturnSnapshot);realmReturnSnapshot=null;
 s.x=g.player.x;s.y=g.player.y;persist();notify('Você voltou ao mundo principal.');
}
function interactRealmPortal(g){const p=g.player;if(realmReturnSnapshot&&p?.realmId&&Math.hypot(p.x-2000,p.y-2000)<150){leaveRealm();return true}return false}


/* NPCs de cidade, montaria e mascote integrados ao mundo.
   SAFE/MAP são const locais do index.html; este script externo usa coordenadas equivalentes. */
const EXP_MAP=32*125,EXP_CX=EXP_MAP/2,EXP_SAFE={x:EXP_CX,y:EXP_CX,radius:260};
const townNPCs=[
 {id:'merchant',name:'Mercador Geral',role:'Poções e suprimentos',x:EXP_SAFE.x+120,y:EXP_SAFE.y-360,icon:'🛒',color:'#d5a34c'},
 {id:'stable',name:'Armeiro Real',role:'Armas e armaduras',x:EXP_SAFE.x-120,y:EXP_SAFE.y-360,icon:'⚒️',color:'#d6a45e'},
 {id:'pet',name:'Cuidadora de Mascotes',role:'Companheiros e mascotes',x:EXP_SAFE.x+360,y:EXP_SAFE.y-120,icon:'🐾',color:'#8bcf9a'},
 {id:'guild',name:'Mestre das Guildas',role:'Guildas e grupos',x:EXP_SAFE.x-360,y:EXP_SAFE.y-120,icon:'🛡️',color:'#9cb9d8'},
 {id:'magic',name:'Mestre Arcano',role:'Magias e grimórios',x:EXP_SAFE.x,y:EXP_SAFE.y-420,icon:'✨',color:'#a78bfa'},
 {id:'element',name:'Sábia Elemental',role:'Combinação elemental',x:EXP_SAFE.x+360,y:EXP_SAFE.y+150,icon:'🔥',color:'#fb923c'},
 {id:'forge',name:'Mestre Ferreiro',role:'Forja e aprimoramento',x:EXP_SAFE.x-360,y:EXP_SAFE.y+150,icon:'🔨',color:'#f59e0b'},
 {id:'contract',name:'Capitã da Guarda',role:'Contratos e recompensas',x:EXP_SAFE.x+120,y:EXP_SAFE.y+390,icon:'📜',color:'#93c5fd'},
 {id:'treasure',name:'Cartógrafo',role:'Mapas e caça ao tesouro',x:EXP_SAFE.x-120,y:EXP_SAFE.y+390,icon:'🧭',color:'#d6ad62'},
 {id:'stylist',name:'Estilista',role:'Aparência do personagem',x:EXP_SAFE.x+420,y:EXP_SAFE.y-390,icon:'🎭',color:'#f0abfc'},
 {id:'awakening',name:'Oráculo das Armas',role:'Despertar de armas',x:EXP_SAFE.x-420,y:EXP_SAFE.y-390,icon:'🌟',color:'#c4b5fd'}
];
function mountAndPetDraw(g){
 if(!g?.running||!g.player)return;
 const c=g.ctx,p=g.player,s=state(),e=ensure();if(!s||!e)return;
 const camX=Math.round(p.x-g.canvas.width/2),camY=Math.round(p.y-g.canvas.height/2),now=performance.now();
 c.save();c.translate(-camX,-camY);
 if(p.realmId){
  c.save();c.translate(2000,2000);c.fillStyle='rgba(125,211,252,.2)';c.beginPath();c.arc(0,0,58,0,Math.PI*2);c.fill();c.strokeStyle='#a5f3fc';c.lineWidth=7;c.beginPath();c.arc(0,0,48,0,Math.PI*2);c.stroke();c.fillStyle='#e0f2fe';c.font='bold 13px Inter';c.textAlign='center';c.fillText('PORTAL DE RETORNO',0,-72);c.fillText('[ E ] Voltar',0,78);c.restore();
 }else{
  // Elementos de ambientação desenhados depois do mapa, sem cobrir o jogador.
  const cx=EXP_SAFE.x,cy=EXP_SAFE.y;
  // Caminhos largos em cruz e pequenos caminhos até cada serviço.
  // Praça e fonte.
  // Casas estilizadas com sombra, fundação, paredes, telhado, porta, janelas e letreiro.
  const buildings=[
   {x:-360,y:-360,w:150,h:112,roof:'#865a3a',label:'MERCADO'},
   {x:360,y:-360,w:150,h:112,roof:'#557b63',label:'ELEMENTOS'},
   {x:-360,y:360,w:150,h:112,roof:'#78694c',label:'CARTÓGRAFO'},
   {x:360,y:360,w:150,h:112,roof:'#75516f',label:'GUARDA'},
   {x:-650,y:0,w:150,h:112,roof:'#526b83',label:'GUILDAS'},
   {x:650,y:0,w:150,h:112,roof:'#6c7848',label:'MASCOTES'},
   {x:0,y:-650,w:150,h:112,roof:'#66528a',label:'MAGIA'},
   {x:0,y:650,w:150,h:112,roof:'#94663a',label:'FORJA'},
   {x:-515,y:-255,w:150,h:112,roof:'#705c50',label:'ESTILISTA'},
   {x:515,y:-255,w:150,h:112,roof:'#5c6885',label:'DESPERTAR'}
  ];
  for(const b of buildings){
   const bx=cx+b.x,by=cy+b.y,w=b.w,h=b.h;
   c.fillStyle='rgba(35,27,20,.25)';c.fillRect(bx-w/2+8,by-h/2+14,w,h);
   c.fillStyle='#554334';c.fillRect(bx-w/2-5,by-h/2,w+10,h+9);
   c.fillStyle='#d8c49b';c.fillRect(bx-w/2,by-h/2+7,w,h-7);
   c.fillStyle=b.roof;c.beginPath();c.moveTo(bx-w/2-13,by-h/2+9);c.lineTo(bx,by-h/2-42);c.lineTo(bx+w/2+13,by-h/2+9);c.closePath();c.fill();
   c.fillStyle='#493629';c.fillRect(bx-15,by+12,30, h/2-5);
   c.fillStyle='#9dd4d1';c.fillRect(bx-w/2+14,by-h/2+28,26,24);c.fillRect(bx+w/2-40,by-h/2+28,26,24);
   c.fillStyle='#3d3025';c.fillRect(bx-w/2+4,by-h/2+7,w-8,5);
   c.fillStyle='#f4e4bf';c.font='bold 11px Inter';c.textAlign='center';c.fillText(b.label,bx,by-h/2-48);
  }
  // Jardins, árvores, bancos e postes decorativos fora dos corredores.
  const trees=[[-850,-780],[-850,780],[850,-780],[850,780],[-920,300],[920,-300],[-280,-850],[280,850]];
  for(const [dx,dy] of trees){const tx=cx+dx,ty=cy+dy;c.fillStyle='#76583c';c.fillRect(tx-5,ty+8,10,23);c.fillStyle='#35694c';c.beginPath();c.arc(tx,ty,24,0,Math.PI*2);c.fill();c.fillStyle='#54875a';c.beginPath();c.arc(tx-8,ty-8,13,0,Math.PI*2);c.fill();}
  const benches=[[-190,0],[190,0],[0,-190],[0,190]];
  for(const [dx,dy] of benches){c.fillStyle='#64452e';c.fillRect(cx+dx-24,cy+dy-6,48,12);c.fillStyle='#9c7447';c.fillRect(cx+dx-22,cy+7+dy,5,10);c.fillRect(cx+dx+17,cy+7+dy,5,10)}
  c.font='900 24px Inter';c.textAlign='center';c.lineJoin='round';c.lineWidth=5;c.strokeStyle='rgba(30,22,14,.75)';c.strokeText('CIDADE SPAWN',cx,cy-130);c.fillStyle='#f8e6bd';c.fillText('CIDADE SPAWN',cx,cy-130);
  c.fillStyle='#5d4b36';c.font='bold 12px Inter';c.fillText('PRAÇA CENTRAL',cx,cy+125);
 }
 if(!p.realmId)for(const n of townNPCs){
  c.save();c.translate(n.x,n.y);
  c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.ellipse(0,14,17,6,0,0,Math.PI*2);c.fill();
  c.fillStyle=n.color;c.fillRect(-10,-3,20,17);c.fillStyle='#e7bd91';c.beginPath();c.arc(0,-12,9,0,Math.PI*2);c.fill();
  c.fillStyle='#26342e';c.fillRect(-6,-14,3,2);c.fillRect(3,-14,3,2);
  c.font='16px serif';c.textAlign='center';c.fillText(n.icon,0,-26);c.restore();
  // nome sempre visível; função + [E] e um anel pulsante só para o NPC ao alcance
  const near=Math.hypot(p.x-n.x,p.y-n.y)<230;
  if(near){const pu=.5+.5*Math.sin(now/260);c.strokeStyle='rgba(255,227,160,'+(.45+.35*pu)+')';c.lineWidth=2;c.beginPath();c.ellipse(n.x,n.y+14,26+pu*4,10+pu*2,0,0,Math.PI*2);c.stroke()}
  c.font='bold 10px Inter';c.textAlign='center';
  const tw=Math.max(70,c.measureText(n.name).width+18);c.fillStyle='rgba(7,19,17,.85)';c.fillRect(n.x-tw/2,n.y-61,tw,16);c.fillStyle=near?'#fff3c4':'#ffe3a0';c.fillText(n.name,n.x,n.y-49);
  if(near){const t='[ E ] '+n.role;c.font='9px Inter';const w2=c.measureText(t).width+14;c.fillStyle='rgba(7,19,17,.85)';c.fillRect(n.x-w2/2,n.y-79,w2,15);c.fillStyle='#fff';c.fillText(t,n.x,n.y-68)}
 }
 // baú da caça ao tesouro: brilha quando você chega perto
 const tr=e.advanced?.treasure;
 if(tr&&!p.realmId){const dt=Math.hypot(p.x-tr.x,p.y-tr.y);if(dt<520){const k=1-dt/520,pu=.5+.5*Math.sin(now/220);c.save();c.translate(tr.x,tr.y);c.fillStyle='rgba(255,215,120,'+(.10+.22*k*pu)+')';c.beginPath();c.arc(0,0,40+22*k,0,Math.PI*2);c.fill();c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(0,14,18,6,0,0,Math.PI*2);c.fill();c.fillStyle='#6b4423';c.fillRect(-14,-6,28,18);c.fillStyle='#8b5a2b';c.fillRect(-14,-12,28,8);c.fillStyle='#e7bd5c';c.fillRect(-3,-4,6,8);c.fillRect(-14,-3,28,2);c.restore()}}
 if(e.petEquipped&&e.pet){const bob=Math.sin(now/180)*4,emoji=e.pet==='slime'?'🟢':e.pet==='fox'?'🦊':'✨';c.font='20px serif';c.textAlign='center';c.fillText(emoji,p.x+30,p.y-24+bob)}
 c.restore();
}
const gameReady=()=>{const g=game();if(!g||!g.running)return false;g.townNPCs=townNPCs;return true};
/* O jogo é instanciado no evento load do index.html. Como este arquivo externo
   é carregado durante o parse, instalar os hooks imediatamente encontraria window.game vazio. */
function installGameHooks(){
 // Clique/toque diretamente no NPC no cenário (desktop e mobile).
 if(!window.__avxNpcPointerHook){
  window.__avxNpcPointerHook=true;
  const handleNpcPointer=ev=>{
   // Toques na tela são usados pelo analógico virtual e pelos controles móveis.
   // Nunca interpretar pointerdown touch como clique em NPC.
   if(ev.pointerType!=='mouse')return;
   if(ev.button!==undefined&&ev.button!==0)return;
   if(ev.target?.closest?.('button,a,input,textarea,select,[role="dialog"]'))return;
   const g=game(),p=g?.player,canvas=g?.canvas;if(!g?.running||!p||p.realmId||!canvas)return;
   const rect=canvas.getBoundingClientRect();
   if(ev.clientX<rect.left||ev.clientX>rect.right||ev.clientY<rect.top||ev.clientY>rect.bottom)return;
   const wx=p.x+(ev.clientX-(rect.left+rect.width/2))*(canvas.width/rect.width);
   const wy=p.y+(ev.clientY-(rect.top+rect.height/2))*(canvas.height/rect.height);
   const nearest=townNPCs.map(n=>({n,d:Math.hypot(wx-n.x,wy-n.y)})).sort((a,b)=>a.d-b.d)[0];
   if(nearest&&nearest.d<68){ev.preventDefault();ev.stopImmediatePropagation();openTownNPC(nearest.n.id)}
  };
  document.addEventListener('pointerdown',handleNpcPointer,true);
 }
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
 const proto=GameCtor.prototype,originalRender=proto.render,originalInteract=proto.interact,originalBlocked=proto.blocked;
 if(originalBlocked&&!proto.__avxHouseCollision){
  proto.blocked=function(x,y){
   if(originalBlocked.call(this,x,y))return true;
   if(!this.player?.realmId){
    const houses=[
     [-360,-360], [360,-360], [-360,360], [360,360],
     [-650,0], [650,0], [0,-650], [0,650], [-515,-255], [515,-255]
    ];
    for(const [dx,dy] of houses){
     const hx=EXP_SAFE.x+dx,hy=EXP_SAFE.y+dy;
     const left=hx-80,right=hx+80,top=hy-56,bottom=hy+56;
     if(x>=left-10&&x<=right+10&&y>=top-10&&y<=bottom+10){
      // Porta central aberta na fachada inferior; paredes e interior continuam sólidos.
      const inDoor=Math.abs(x-hx)<17&&y>hy+12&&y<bottom+11;
      if(!inDoor)return true;
     }
    }
   }
   return false;
  };
  proto.__avxHouseCollision=true;
 }
const AVX_WEATHER={kind:'clear',until:0,particles:[],last:0};
function weatherKind(biome){
 const pool={forest:['rain','rain','storm','clear','clear'],desert:['clear','clear','storm','rain'],snow:['snow','blizzard','snow','clear'],swamp:['rain','storm','rain','clear'],volcano:['storm','storm','clear','rain']};
 const a=pool[biome]||pool.forest;return a[Math.floor(Math.random()*a.length)];
}
function drawWeather(g){
 if(!g?.running||!g.ctx||!g.canvas||!g.player)return;
 const now=performance.now(),w=AVX_WEATHER;
 if(now>w.until){w.kind=weatherKind(g.player.realmId?({verdant:'forest',frost:'snow',mire:'swamp',ember:'volcano'}[g.player.realmId]||'forest'):g.player.biome||'forest');w.until=now+45000+Math.random()*45000;w.particles=[];}
 const c=g.ctx,W=g.canvas.width,H=g.canvas.height,dt=Math.min(.05,(now-(w.last||now))/1000);w.last=now;
 const snowy=w.kind==='snow'||w.kind==='blizzard',storm=w.kind==='storm'||w.kind==='blizzard',rain=w.kind==='rain'||w.kind==='storm';
 const count=snowy?95:rain?150:0;
 while(w.particles.length<count)w.particles.push({x:Math.random()*W,y:Math.random()*H,v: snowy?35+Math.random()*65:350+Math.random()*300,s:Math.random()*2+1});
 while(w.particles.length>count)w.particles.pop();
 c.save();c.setTransform(1,0,0,1,0,0);
 if(rain){c.strokeStyle='rgba(155,205,235,.42)';c.lineWidth=1;for(const p of w.particles){p.y+=p.v*dt;p.x-=storm?150*dt:55*dt;if(p.y>H+8){p.y=-8;p.x=Math.random()*W}if(p.x< -8)p.x=W+8;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-(storm?5:2),p.y+10);c.stroke()}}
 if(snowy){c.fillStyle='rgba(240,248,255,.8)';for(const p of w.particles){p.y+=p.v*dt;p.x+=Math.sin(now/900+p.s)*18*dt;if(p.y>H+4){p.y=-4;p.x=Math.random()*W}if(p.x<0)p.x=W;if(p.x>W)p.x=0;c.beginPath();c.arc(p.x,p.y,p.s,0,Math.PI*2);c.fill()}}
 if(storm){c.fillStyle='rgba(10,18,32,.16)';c.fillRect(0,0,W,H);if(Math.sin(now/1700)>0.997){c.fillStyle='rgba(220,235,255,.3)';c.fillRect(0,0,W,H)}}
 if(w.kind==='blizzard'){c.fillStyle='rgba(210,230,245,.12)';c.fillRect(0,0,W,H)}
 // Ciclo noturno cinematográfico: céu profundo, estrelas, lua, brilho e vinheta.
 const clock=((Number(g.t)||0)%360+360)%360/360;
 const night=Math.max(0,Math.min(1,(Math.cos(clock*Math.PI*2+Math.PI-.2)+.12)/1.12));
 if(night>.08){
  c.fillStyle='rgba(5,10,29,'+(night*.62)+')';c.fillRect(0,0,W,H);
  c.globalAlpha=night*.9;
  for(let i=0;i<58;i++){
   const sx=((i*97+31)%997)/997*W,sy=((i*53+17)%613)/613*H;
   const tw=.45+.55*Math.sin(now/500+i*2.1);
   c.fillStyle='rgba(220,235,255,'+(tw*.85)+')';c.beginPath();c.arc(sx,sy,((i%3)+1)*.55,0,Math.PI*2);c.fill();
  }
  const vg=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.18,W/2,H/2,Math.max(W,H)*.72);vg.addColorStop(0,'rgba(4,8,25,0)');vg.addColorStop(1,'rgba(2,5,20,'+(night*.42)+')');c.fillStyle=vg;c.fillRect(0,0,W,H);
  c.globalAlpha=1;
 }
 c.restore();
}
 if(originalRender)proto.render=function(){
  originalRender.call(this);
  // NPCs/efeitos ficam em camada própria; a praça central permanece livre para o spawn.
  mountAndPetDraw(this);
  drawWeather(this);
 };
 if(originalInteract)proto.interact=function(){
  if(interactRealmPortal(this))return;
  const p=this.player,n=townNPCs.slice().sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];
  if(n&&Math.hypot(p.x-n.x,p.y-n.y)<230){openTownNPC(n.id);return}
  return originalInteract.call(this);
 };
 proto.__avxTownHooks=true;
}
window.addEventListener('keydown',ev=>{if(ev.key!=='Escape')return;let any=false;for(const id of ['avx-merchant-modal','avx-armorer-modal','avx-magic-modal','avx-companion-modal','avx-npc-service','avx-style-modal']){const m=$(id);if(m){m.remove();any=true}}if(any)serviceKey=null});
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
function openCompanionUI(){
 const s=state(),ex=ensure();if(!s||!ex)return;
 const catalog=PET_CATALOG,owned=ex.petsOwned??=(ex.pet? [ex.pet]:['slime']),equipped=ex.petEquipped?ex.pet:null;
 const theme={a:'#42d6a0',b:'#123d38',title:'SANTUÁRIO DOS COMPANHEIROS',sub:'Cuide, evolua e escolha seu companheiro'};
 let m=$('avx-companion-modal');if(!m){m=document.createElement('div');m.id='avx-companion-modal';document.body.appendChild(m)}
 m.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;background:radial-gradient(ellipse at 50% 20%,#253d4ddd,#050b13f2);backdrop-filter:blur(8px)';
 m.innerHTML='<section style="width:min(900px,100%);max-height:92vh;overflow:auto;border:1px solid #42d6a088;border-radius:22px;background:linear-gradient(145deg,#172b35,#0a121c);box-shadow:0 24px 90px #000b;color:#f8fafc;font-family:Inter,system-ui"><header style="padding:22px;background:linear-gradient(110deg,#123d38,#14232d);display:flex;justify-content:space-between;gap:12px"><div><small style="letter-spacing:3px;color:#42d6a0;font-weight:900">SANTUÁRIO DOS COMPANHEIROS</small><h2 style="font-size:28px;margin:6px 0">🐾 Galeria de Mascotes</h2><p style="font-size:12px;color:#b9c9d0;margin:0">Seu companheiro de aventura.</p></div><button id="avx-comp-close" style="background:#ffffff12;color:white;border:1px solid #ffffff33;border-radius:12px;width:42px;height:42px">✕</button></header><div style="padding:14px 20px;display:flex;justify-content:space-between;border-bottom:1px solid #ffffff18"><span>Coleção: '+owned.length+'/'+catalog.length+'</span><b style="color:#f5d58f">◈ '+Math.floor(s.gold||0)+' Gold</b></div><div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:12px">'+catalog.map(x=>{const has=owned.includes(x.id),locked=x.realm&&(s.level||1)<x.realm,active=equipped===x.id;return '<article style="border:1px solid '+(active?'#42d6a0':'#536875')+'88;border-radius:16px;overflow:hidden;background:#14232d"><div style="height:112px;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#70cba455,#122d32);font-size:64px">'+x.emoji+'</div><div style="padding:13px"><b>'+x.name+'</b><p style="font-size:11px;color:#aebfc8;min-height:28px">'+x.desc+'</p><div style="font-size:11px;color:#e7ca8a;margin-bottom:10px">'+(x.bonus||'Companheiro fiel')+'</div>'+(has?'<button data-equip="'+x.id+'" style="width:100%;padding:9px;border-radius:9px;border:1px solid #42d6a0;background:'+(active?'#31534b':'#28664f')+';color:white;font-weight:800">'+(active?'Desequipar':'Equipar')+'</button><button data-sell="'+x.id+'" style="width:100%;margin-top:6px;padding:8px;border-radius:9px;background:#512d2b;color:#ffd6c9">Vender · '+Math.floor(x.price*.45)+' G</button>':'<button data-buy="'+x.id+'" '+(locked||s.gold<x.price?'disabled':'')+' style="width:100%;padding:9px;border-radius:9px;background:'+(locked||s.gold<x.price?'#38434a':'#28664f')+';color:white">'+(locked?'🔒 Nível '+x.realm+' necessário':s.gold<x.price?'Gold insuficiente':'Comprar · '+x.price+' G')+'</button>')+'</div></article>'}).join('')+'</div></section>';
 $('avx-comp-close').onclick=()=>m.remove();
 m.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const x=catalog.find(v=>v.id===b.dataset.buy);if(!x||owned.includes(x.id)||s.gold<x.price)return;s.gold-=x.price;owned.push(x.id);persist();if(typeof updateUIStats==='function')updateUIStats();openCompanionUI()});
 m.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{const id=b.dataset.equip;if(ex.pet===id&&ex.petEquipped){ex.petEquipped=false;ex.pet=null;notify('Mascote desequipado.')}else{ex.pet=id;ex.petEquipped=true;ex.petData??={level:1,xp:0,bond:0,skillReady:0};notify('Mascote equipado!')}ex.petsOwned=owned;persist();if(typeof updateUIStats==='function')updateUIStats();openCompanionUI()});
 m.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>{const id=b.dataset.sell;if(ex.pet===id&&ex.petEquipped){notify('Desequipe o mascote antes de vender.');return}const i=owned.indexOf(id);if(i<0)return;owned.splice(i,1);s.gold+=Math.floor((catalog.find(v=>v.id===id)?.price||0)*.45);persist();if(typeof updateUIStats==='function')updateUIStats();openCompanionUI()});
}
function openArmorerUI(){
 const s=state(),ex=ensure();if(!s||!ex)return;
 const stock=[
  {id:'bronze_sword',name:'Espada de Bronze',icon:'⚔️',price:180,slot:'weapon',ilvl:1,rar:0,stats:{atk:8,crit:1},sell:45,desc:'Lâmina inicial.'},
  {id:'iron_sword',name:'Espada de Ferro',icon:'🗡️',price:520,slot:'weapon',ilvl:5,rar:1,stats:{atk:19,crit:2},sell:130,desc:'Lâmina resistente.',level:4},
  {id:'crystal_blade',name:'Lâmina de Cristal',icon:'💎',price:1250,slot:'weapon',ilvl:9,rar:2,stats:{atk:30,power:12},sell:310,desc:'Energia arcana.',level:8},
  {id:'guardian_armor',name:'Armadura do Guardião',icon:'🛡️',price:850,slot:'armor',ilvl:6,rar:1,stats:{def:22,hp:25},sell:210,desc:'Proteção reforçada.',level:5},
  {id:'longbow',name:'Arco do Batedor',icon:'🏹',price:460,slot:'weapon',ilvl:4,rar:1,stats:{atk:15,speed:3},sell:115,desc:'Arco leve.',level:3},
  {id:'twin_daggers',name:'Adagas Gêmeas',icon:'🗡️',price:760,slot:'weapon',ilvl:6,rar:1,stats:{atk:17,crit:5,speed:2},sell:190,desc:'Ataques rápidos.',level:5},
  {id:'war_hammer',name:'Martelo de Guerra',icon:'🔨',price:980,slot:'weapon',ilvl:7,rar:2,stats:{atk:27,def:4},sell:245,desc:'Impacto pesado.',level:6},
  {id:'sage_staff',name:'Cajado do Sábio',icon:'🪄',price:1050,slot:'weapon',ilvl:8,rar:2,stats:{power:28,atk:9},sell:260,desc:'Amplifica magia.',level:7},
  {id:'shadow_blade',name:'Lâmina Sombria',icon:'🌑',price:1750,slot:'weapon',ilvl:12,rar:2,stats:{atk:38,crit:7,speed:4},sell:430,desc:'Arma de assassinos.',level:11},
  {id:'sun_spear',name:'Lança Solar',icon:'🌞',price:2450,slot:'weapon',ilvl:16,rar:3,stats:{atk:49,power:18},sell:610,desc:'Lança de luz antiga.',level:15},
  {id:'dragon_fang',name:'Presa do Dragão',icon:'🐉',price:4200,slot:'weapon',ilvl:22,rar:4,stats:{atk:72,crit:12,power:22},sell:1050,desc:'Relíquia lendária.',level:21},
  {id:'leather_armor',name:'Couraça de Couro',icon:'🥋',price:300,slot:'armor',ilvl:3,rar:0,stats:{def:12,hp:12},sell:75,desc:'Proteção flexível.',level:2},
  {id:'ranger_armor',name:'Traje do Patrulheiro',icon:'🧥',price:1100,slot:'armor',ilvl:8,rar:2,stats:{def:29,hp:40,speed:2},sell:275,desc:'Armadura leve.',level:7},
  {id:'crystal_plate',name:'Placas de Cristal',icon:'💠',price:2100,slot:'armor',ilvl:14,rar:3,stats:{def:48,hp:85},sell:525,desc:'Defesa cristalina.',level:13},
  {id:'guardian_helm',name:'Elmo do Guardião',icon:'⛑️',price:650,slot:'helmet',ilvl:6,rar:1,stats:{def:16,hp:15},sell:160,desc:'Elmo reforçado.',level:5},
  {id:'arcane_crown',name:'Coroa Arcana',icon:'👑',price:1550,slot:'helmet',ilvl:11,rar:2,stats:{power:24,def:12},sell:390,desc:'Coroa de poder mágico.',level:10},
  {id:'swift_boots',name:'Botas Velozes',icon:'🥾',price:720,slot:'boots',ilvl:7,rar:1,stats:{def:10,speed:5},sell:180,desc:'Aumenta mobilidade.',level:6},
  {id:'phoenix_ring',name:'Anel da Fênix',icon:'💍',price:1350,slot:'ring',ilvl:10,rar:2,stats:{power:17,hp:35},sell:335,desc:'Energia de renascimento.',level:9},
  {id:'moon_amulet',name:'Amuleto Lunar',icon:'📿',price:1950,slot:'accessory',ilvl:13,rar:3,stats:{power:25,hp:55},sell:485,desc:'Relíquia da noite.',level:12}
 ];
 let m=$('avx-armorer-modal');if(!m){m=document.createElement('div');m.id='avx-armorer-modal';document.body.appendChild(m)}
 m.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;background:#061018dd';
 m.innerHTML='<section style="width:min(620px,100%);max-height:90vh;overflow:auto;background:linear-gradient(145deg,#26313b,#101923);border:1px solid #c6a66a;border-radius:18px;padding:20px;color:white"><header style="display:flex;justify-content:space-between"><div><small style="letter-spacing:2px;color:#e7bd79">FORJA DE AVENTURIA</small><h2 style="margin:5px 0 12px">⚒️ Armeiro</h2></div><button id="avx-arm-close">✕</button></header><p>Gold disponível: <b>'+Math.floor(s.gold||0)+'</b></p><div style="display:grid;gap:9px">'+stock.map(x=>'<article style="display:flex;gap:12px;align-items:center;padding:12px;border:1px solid #ffffff22;border-radius:12px;background:#ffffff08"><span style="font-size:30px">'+x.icon+'</span><div style="flex:1"><b>'+x.name+'</b><div style="font-size:11px;color:#b9c8d1">'+x.desc+'</div><small style="color:#e7bd79">'+x.price+' Gold · '+(x.level?'Nível '+x.level:'Sem requisito')+'</small></div><button data-weapon="'+x.id+'" '+((s.level||1)<(x.level||1)||s.gold<x.price?'disabled':'')+' style="padding:9px;border-radius:8px;background:#315c49;color:white">'+((s.level||1)<(x.level||1)?'Bloqueado':s.gold<x.price?'Sem Gold':'Comprar')+'</button></article>').join('')+'</div><p style="font-size:11px;color:#b9c8d1;margin-top:12px">Após comprar, abra Personagem (P), vá até Bolsa e clique em Equipar.</p></section>';
 $('avx-arm-close').onclick=()=>m.remove();
 m.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>{
  const x=stock.find(v=>v.id===b.dataset.weapon);if(!x||s.gold<x.price||(s.level||1)<(x.level||1))return;
  if(!Array.isArray(s.inventory))s.inventory=[];
  if(s.inventory.length>=60){notify('Sua bolsa está cheia. Libere espaço antes de comprar.');return}
  s.gold-=x.price;
  s.inventory.push({id:'shop_'+x.id+'_'+Date.now().toString(36),slot:x.slot,name:x.name,rar:x.rar,ilvl:x.ilvl,stats:{...x.stats},sell:x.sell});
  persist();if(typeof updateUIStats==='function')updateUIStats();
  notify(x.name+' foi para sua Bolsa! Abra Personagem (P) e clique em Equipar.');
  openArmorerUI();
 });
}
function openMagicUI(){
 const s=state();if(!s)return;
 const stock=[
  {id:'arcane_bolt',name:'Projétil Arcano',icon:'🔮',price:220,desc:'Disparo arcano de longo alcance.'},
  {id:'frost_nova',name:'Nova Congelante',icon:'❄️',price:480,desc:'Explosão de gelo em área.'},
  {id:'healing_light',name:'Luz Restauradora',icon:'✨',price:650,desc:'Recupera sua vida.'},
  {id:'fireball',name:'Bola de Fogo',icon:'🔥',price:700,desc:'Projétil flamejante.'},
  {id:'thunder_strike',name:'Raio Celestial',icon:'⚡',price:950,desc:'Descarga elétrica poderosa.'},
  {id:'nature_roots',name:'Raízes Prisioneiras',icon:'🌿',price:900,desc:'Energia da natureza em área.'},
  {id:'shadow_burst',name:'Explosão Sombria',icon:'🌑',price:1200,desc:'Impacto de energia sombria.'},
  {id:'arcane_lance',name:'Lança Astral',icon:'💠',price:1450,desc:'Perfuração arcana de longo alcance.'},
  {id:'wind_blades',name:'Lâminas de Vento',icon:'🌪️',price:1100,desc:'Cortes rápidos de vento.'},
  {id:'holy_smite',name:'Julgamento Sagrado',icon:'☀️',price:1800,desc:'Impacto sagrado em área.'},
  {id:'poison_cloud',name:'Nuvem Venenosa',icon:'☠️',price:1600,desc:'Nuvem tóxica ao redor.'},
  {id:'meteor',name:'Chuva de Meteoros',icon:'☄️',price:3200,desc:'Magia suprema de fogo.'}
 ];
 s.learnedSpells??=[];
 let m=$('avx-magic-modal');if(!m){m=document.createElement('div');m.id='avx-magic-modal';document.body.appendChild(m)}
 m.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;background:#061018dd';
 m.innerHTML='<section style="width:min(560px,100%);max-height:90vh;overflow:auto;background:linear-gradient(145deg,#30264c,#101923);border:1px solid #a78bfa;border-radius:18px;padding:20px;color:white"><header style="display:flex;justify-content:space-between"><div><small style="letter-spacing:2px;color:#c4b5fd">SANTUÁRIO ARCANO</small><h2 style="margin:5px 0 12px">✨ Mestre das Magias</h2></div><button id="avx-magic-close">✕</button></header><p>Gold disponível: <b>'+Math.floor(s.gold||0)+'</b></p>'+stock.map(x=>'<article style="display:flex;gap:12px;align-items:center;padding:12px;margin:8px 0;border:1px solid #ffffff22;border-radius:12px"><span style="font-size:28px">'+x.icon+'</span><div style="flex:1"><b>'+x.name+'</b><div style="font-size:11px;color:#cbd5e1">'+x.desc+'</div><small style="color:#c4b5fd">'+x.price+' Gold</small></div><button data-spell="'+x.id+'" '+(s.learnedSpells.includes(x.id)||s.gold<x.price?'disabled':'')+' style="padding:8px;border-radius:8px;background:#514078">'+(s.learnedSpells.includes(x.id)?'Aprendida':s.gold<x.price?'Sem Gold':'Aprender')+'</button></article>').join('')+'</section>';
 $('avx-magic-close').onclick=()=>m.remove();
 m.querySelectorAll('[data-spell]').forEach(b=>b.onclick=()=>{const x=stock.find(v=>v.id===b.dataset.spell);if(!x||s.learnedSpells.includes(x.id)||s.gold<x.price)return;s.gold-=x.price;s.learnedSpells.push(x.id);persist();updateUIStats?.();notify('Magia aprendida: '+x.name+'!');openMagicUI()});
}
window.AVENTURIA_INTERACT_NPC=id=>openTownNPC(id);
window.AVENTURIA_SAFE_NPCS=townNPCs;
window.AVENTURIA_NPC_RANGE=230;
// bônus de mascote (aplicados em getRPGStats, no index.html)
window.AVENTURIA_PET_BONUS={slime:{def:8},fox:{atk:6},wisp:{power:8},lume:{power:12},crystal:{def:12},root:{hp:40},drake:{atk:15}};
function openMerchantUI(){
 const s=state(),e=ensure();if(!s||!e)return;
 s.items??={};s.resources??={};
 let m=$('avx-merchant-modal');if(!m){m=document.createElement('div');m.id='avx-merchant-modal';m.style.cssText='position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;background:#061018dd;padding:14px';document.body.appendChild(m)}
 const offers=[
  {id:'potion',name:'Poção de Vida',emoji:'🧪',price:60,desc:'Restaura 120 de vida. Beba aqui ou com a tecla H.'},
  {id:'egg',name:'Ovo de Mascote',emoji:'🥚',price:250,desc:'Receba um companheiro que você ainda não tem.'},
  {id:'kit',name:'Kit de Exploração',emoji:'🎒',price:120,desc:'5 madeiras e 2 ferros.'}
 ];
 const potions=s.items.potion||0;
 m.innerHTML='<div style="width:min(520px,100%);background:#14262c;border:1px solid #c6a66a;border-radius:16px;padding:20px;color:white"><div style="display:flex;justify-content:space-between"><h2>🛒 Loja de Aventuria</h2><button id="avx-merchant-close">✕</button></div><p style="color:#cbd5e1">Seu saldo: <b>'+Math.floor(s.gold||0)+' Gold</b> · Poções: <b>'+potions+'</b> <button id="avx-drink" '+(potions<=0?'disabled':'')+' style="margin-left:6px;padding:4px 10px;border-radius:8px;background:'+(potions>0?'#2f6b4f':'#38434a')+'">🧪 Beber</button></p><div style="display:grid;gap:9px">'+offers.map(x=>'<div style="padding:12px;border:1px solid #52656a;border-radius:10px;display:flex;align-items:center;gap:12px"><span style="font-size:26px">'+x.emoji+'</span><div style="flex:1"><b>'+x.name+'</b><div style="font-size:11px;color:#bdcbd0">'+x.desc+'</div></div><button data-offer="'+x.id+'" '+((s.gold||0)<x.price?'disabled':'')+' style="padding:8px;background:'+((s.gold||0)<x.price?'#38434a':'#456c57')+';border-radius:8px">Comprar · '+x.price+' G</button></div>').join('')+'</div></div>';
 $('avx-merchant-close').onclick=()=>m.remove();
 $('avx-drink').onclick=()=>{if(window.usePotion?.())openMerchantUI()};
 m.querySelectorAll('[data-offer]').forEach(b=>b.onclick=()=>{
  const x=offers.find(v=>v.id===b.dataset.offer);if(!x)return;
  if((s.gold||0)<x.price){notify('Gold insuficiente.');return}
  // valida primeiro, cobra depois: nada de perder Gold numa compra que não acontece
  if(x.id==='egg'){
   e.petsOwned??=(e.pet?[e.pet]:['slime']);
   const pool=['slime','fox','wisp'].filter(id=>!e.petsOwned.includes(id));
   if(!pool.length){notify('Você já tem todos os mascotes de ovo. Veja o Santuário para outros.');return}
   const id=pool[Math.floor(Math.random()*pool.length)];
   s.gold-=x.price;e.petsOwned.push(id);e.pet=id;e.petEquipped=true;e.petData={level:1,xp:0,bond:0,skillReady:0,lastKills:s.animalKills||0};
   notify('🥚 Um novo mascote nasceu e já está com você!');
  }else{
   s.gold-=x.price;
   if(x.id==='potion')s.items.potion=(s.items.potion||0)+1;
   if(x.id==='kit'){s.resources.wood=(s.resources.wood||0)+5;s.resources.iron=(s.resources.iron||0)+2}
   notify(x.name+' comprado!');
  }
  persist();if(typeof updateUIStats==='function')updateUIStats();openMerchantUI();
 });
}
/* Janela de serviço: mostra o cartão do painel dentro de um modal. O painel é redesenhado a cada
   ação, então o cartão exibido é trocado pelo novo (refreshServiceWindow) em vez de ficar velho. */
let serviceKey=null;
function refreshServiceWindow(){
 const modal=$('avx-npc-service');if(!modal||!serviceKey)return;
 const body=modal.querySelector('#avx-service-body');if(!body)return;
 const card=[...document.querySelectorAll('#avx-content [data-section="'+serviceKey.section+'"]')].find(c=>c.textContent.includes(serviceKey.title));
 if(card)body.replaceChildren(card);
}
function openNPCServiceWindow(card,key){
 let modal=$('avx-npc-service');if(!modal){modal=document.createElement('div');modal.id='avx-npc-service';document.body.appendChild(modal)}
 serviceKey=key||null;
 modal.style.cssText='position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;padding:14px;background:#020914e8';
 modal.innerHTML='<section style="width:min(560px,100%);max-height:88vh;overflow:auto;border:1px solid #d6ad62;border-radius:18px;background:linear-gradient(145deg,#20343b,#0b1420);padding:16px;color:white"><header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="color:#f4d68e">SERVIÇO DA CIDADE</b><button id="avx-service-close" style="padding:7px 12px;border:1px solid #60747b;border-radius:8px;cursor:pointer">Fechar ✕</button></header><div id="avx-service-body"></div></section>';
 modal.querySelector('#avx-service-body').appendChild(card);
 const close=()=>{serviceKey=null;modal.remove()};
 modal.querySelector('#avx-service-close').onclick=close;
 modal.onclick=ev=>{if(ev.target===modal)close()};
}
function openAppearanceEditor(){
 const s=state();if(!s)return;
 const d={cls:s.className,race:s.race,hair:s.hairColor,eye:s.eyeColor,skin:s.skinColor,hairStyle:s.hairStyle||'Curto',beardStyle:s.beardStyle||'Nenhuma',outfitColor:s.outfitColor||'#8b3430',outfitStyle:s.outfitStyle||'Armadura',cloakColor:s.cloakColor||'#252b45',accessory:s.accessory||'Nenhum',faceMark:s.faceMark||'Nenhuma'};
 const choices={
 hair:['#583a2b','#e6c66b','#171717','#e7e5e4','#a9472d','#7650a8','#2f6fb3','#ef9ac4'],
 eye:['#28211b','#3b82f6','#22a06b','#eabf45','#a78bfa','#ef4444'],
 skin:['#f4d1b1','#e8b985','#d6a36e','#b9784d','#8d563d','#633d32','#9c8bd0'],
 hairStyle:['Curto','Longo','Espetado','Moicano','Coque','Tranças','Careca'],
 beardStyle:['Nenhuma','Bigode','Cavanhaque','Cheia'],
 outfitColor:['#8b3430','#493b91','#245c43','#292d3a','#397b83','#d6a84b','#e8e1c9','#252b45'],
 outfitStyle:['Armadura','Capa'],cloakColor:['#252b45','#172b35','#5b2c50','#234d3c','#7c3f22'],
 accessory:['Nenhum','Capuz','Chifres','Coroa','Tiara','Óculos'],
 faceMark:['Nenhuma','Cicatriz','Pintura','Sardas']
 };
 let m=$('avx-style-modal');if(!m){m=document.createElement('div');m.id='avx-style-modal';document.body.appendChild(m)}
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const opts=(key,colors=false)=>choices[key].map(v=>'<button type="button" data-style="'+key+'" data-value="'+esc(v)+'" style="padding:6px 9px;border-radius:9px;border:1px solid '+(d[key]===v?'#f3c969':'#53636b')+';background:'+(colors?v:'#17272c')+';color:'+(colors?'transparent':'#f6e8c8')+';min-width:'+(colors?'30px':'auto')+';min-height:30px" title="'+esc(v)+'">'+(colors?'　':esc(v))+'</button>').join('');
 const field=(label,key,colors=false)=>'<div style="margin:12px 0"><div style="font-size:12px;color:#f4d68e;margin-bottom:6px">'+label+'</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+opts(key,colors)+'</div></div>';
 m.style.cssText='position:fixed;inset:0;z-index:10002;display:flex;align-items:center;justify-content:center;padding:12px;background:#020914eF';
 m.innerHTML='<section style="width:min(760px,100%);max-height:92vh;overflow:auto;border:1px solid #d6ad62;border-radius:18px;background:linear-gradient(145deg,#20343b,#0b1420);color:#fff;padding:18px"><header style="display:flex;justify-content:space-between;align-items:center"><div><small style="color:#e6c47d;letter-spacing:2px">ATELIÊ DE AVENTURIA</small><h2 style="font-size:24px;font-weight:900">🎭 Aparência do personagem</h2><p style="font-size:11px;color:#aebfc4">Visualização instantânea · mudanças sem alterar classe ou atributos</p></div><button id="avx-style-close">✕</button></header><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:14px"><div style="background:#081217;border:1px solid #34474e;border-radius:14px;padding:12px;display:grid;place-items:center"><canvas id="avx-style-preview" width="200" height="240" style="width:200px;height:240px;image-rendering:pixelated"></canvas><b style="font-size:12px">'+esc(s.name)+'</b><small style="color:#aebfc4">'+esc(s.className)+' · '+esc(s.race)+'</small></div><div>'+field('Cor do cabelo','hair',true)+field('Cor dos olhos','eye',true)+field('Tom de pele','skin',true)+field('Penteado','hairStyle')+field('Barba','beardStyle')+field('Marcas faciais','faceMark')+field('Cor da roupa','outfitColor',true)+field('Estilo da roupa','outfitStyle')+field('Cor da capa','cloakColor',true)+field('Acessório','accessory')+'</div></div><footer style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button id="avx-style-cancel" style="padding:10px 16px;border:1px solid #65777e;border-radius:9px">Cancelar</button><button id="avx-style-save" style="padding:10px 16px;background:#725326;border:1px solid #e3bd69;border-radius:9px;color:#fff1c8;font-weight:900">Salvar aparência</button></footer></section>';
 const preview=()=>{const c=$('avx-style-preview').getContext('2d');c.clearRect(0,0,200,240);c.save();c.translate(100,150);c.scale(4.4,4.4);drawCharacter(c,0,0,{dir:'down',cls:d.cls,race:d.race,hair:d.hair,eye:d.eye,skin:d.skin,hairStyle:d.hairStyle,beard:d.beardStyle,outfit:d.outfitColor,outfitStyle:d.outfitStyle,cloak:d.cloakColor,accessory:d.accessory,mark:d.faceMark,moving:false,local:true});c.restore()};
 m.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{d[b.dataset.style]=b.dataset.value;m.querySelectorAll('[data-style="'+b.dataset.style+'"]').forEach(q=>q.style.borderColor=q===b?'#f3c969':'#53636b');preview()});
 $('avx-style-close').onclick=$('avx-style-cancel').onclick=()=>m.remove();
 $('avx-style-save').onclick=()=>{s.hairColor=d.hair;s.eyeColor=d.eye;s.skinColor=d.skin;s.hairStyle=d.hairStyle;s.beardStyle=d.beardStyle;s.outfitColor=d.outfitColor;s.outfitStyle=d.outfitStyle;s.cloakColor=d.cloakColor;s.accessory=d.accessory;s.faceMark=d.faceMark;persist();if(typeof updateUIStats==='function')updateUIStats();notify('Aparência atualizada!');m.remove()};
 preview();
}
function openTownNPC(id){
 const s=state(),e=ensure();if(!s||!e)return;
 const openAdvanced=(section,title)=>{renderPanel();const cards=[...document.querySelectorAll('#avx-content [data-section="'+section+'"]')];const target=cards.find(c=>c.textContent.includes(title));if(!target){notify('Este serviço está indisponível no momento.');return}openNPCServiceWindow(target,{section,title})};
 const actions={
 merchant:()=>openMerchantUI(),
 stable:()=>openArmorerUI(),
 magic:()=>openMagicUI(),
 pet:()=>openCompanionUI(),
 guild:()=>openAdvanced('social','Guildas, grupos e amizades'),
 element:()=>openAdvanced('combat','Combinação de elementos'),
 forge:()=>openAdvanced('growth','Forja de equipamentos'),
 contract:()=>openAdvanced('world','Contratos de caça'),
 treasure:()=>openAdvanced('world','Caça ao tesouro'),
 awakening:()=>openAdvanced('growth','Despertar de armas'),
 stylist:()=>openAppearanceEditor()
 };
 actions[id]?.();
}

const overlay=document.createElement('div');overlay.id='avx-world-overlay';overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:12;background:transparent;transition:background 2s';
document.body.appendChild(overlay);
const clock=document.createElement('div');clock.id='avx-world-clock';clock.className='fixed left-1/2 -translate-x-1/2 bottom-3 z-10 glass-panel rounded-full px-3 py-1 text-[10px] font-bold text-amber-100 pointer-events-none';clock.textContent='☀️ Dia · Céu limpo';document.body.appendChild(clock);
setInterval(tick,1000);
window.AventuriaExpansion={open:()=>{panel.style.display='block';renderPanel()},refresh:renderPanel};
})();