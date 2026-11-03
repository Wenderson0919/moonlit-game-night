/* Ecos de Gaia — mundo vivo, eventos dinâmicos e habitantes itinerantes.
   Camada independente: não substitui combate, salvamento, controles ou multiplayer. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),S=()=>window.MMO?.localState,G=()=>window.game;
 const biomes={forest:{name:'Floresta',color:'#78c66a'},desert:{name:'Deserto',color:'#e6bd68'},snow:{name:'Neve',color:'#9ee8f5'},swamp:{name:'Pântano',color:'#9bd16b'},volcano:{name:'Vulcão',color:'#ff8952'}};
 const eventDefs=[
  {id:'rift',title:'Fenda do Véu',desc:'Criaturas estão atravessando uma fenda instável. Derrote os invasores na área marcada.',kind:'hunt',goal:6,icon:'✦',reward:260,xp:180,resource:'crystal'},
  {id:'bloom',title:'Florescimento Ancestral',desc:'Colete recursos despertados pela energia de Gaia dentro do círculo.',kind:'gather',goal:5,icon:'❀',reward:190,xp:130,resource:'herb'},
  {id:'ambush',title:'Emboscada dos Saqueadores',desc:'Um grupo hostil tomou a estrada. Elimine os saqueadores antes que fujam.',kind:'hunt',goal:8,icon:'⚔',reward:320,xp:220,resource:'iron'},
  {id:'meteor',title:'Chuva de Fragmentos',desc:'Fragmentos caíram nesta região. Recupere os materiais antes que a energia desapareça.',kind:'gather',goal:7,icon:'☄',reward:360,xp:240,resource:'ember'},
  {id:'beacon',title:'Farol de Gaia',desc:'Proteja o antigo farol: criaturas corrompidas estão tentando apagar sua luz.',kind:'hunt',goal:10,icon:'♜',reward:420,xp:300,resource:'diamond'}
 ];
 const css=`
 #eg-launch{position:fixed;right:18px;top:118px;z-index:58;border:1px solid #9d824e;background:linear-gradient(135deg,#253f36,#101d20);color:#f5dfaa;border-radius:12px;padding:9px 13px;font:800 11px Inter;letter-spacing:.04em;box-shadow:0 8px 25px #0008}
 #eg-panel{position:fixed;right:18px;top:164px;z-index:59;width:min(360px,calc(100vw - 24px));max-height:68vh;overflow:auto;display:none;color:#f5ead1;background:linear-gradient(155deg,#1b342f,#0b171b 72%);border:1px solid #9b7942;border-radius:16px;padding:15px;box-shadow:0 20px 60px #000b;font:12px Inter}
 #eg-panel h3{font:900 16px Georgia;color:#f4d58f;margin:0 0 4px}#eg-panel .muted{color:#a9b7a9;font-size:11px;line-height:1.5}
 #eg-panel .eg-progress{height:8px;background:#07100f;border:1px solid #52604b;border-radius:20px;overflow:hidden;margin:10px 0}
 #eg-panel .eg-progress span{display:block;height:100%;background:linear-gradient(90deg,#7dbb65,#e5ca79);transition:width .25s}
 #eg-panel .eg-tag{display:inline-block;padding:4px 7px;border:1px solid #76613d;border-radius:20px;color:#f1d18a;font-size:10px;font-weight:800}
 #eg-panel button{background:#70552d;border:1px solid #c09a55;border-radius:8px;padding:7px 10px;color:#fff2cc;font-weight:800}
 #eg-panel .eg-row{display:flex;justify-content:space-between;gap:8px;align-items:center}
 @media(pointer:coarse){#eg-launch{top:88px;right:8px}#eg-panel{top:130px;right:8px;max-height:60vh}}
 `;
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 const launch=document.createElement('button');launch.id='eg-launch';launch.innerHTML='✧ ECOS DE GAIA <span style="opacity:.7">[J]</span>';
 const panel=document.createElement('section');panel.id='eg-panel';panel.innerHTML='<div class="eg-row"><span class="eg-tag">ATIVIDADES DO MUNDO</span><button id="eg-close">✕</button></div><h3>O mundo não está parado</h3><p class="muted">Acontecimentos surgem enquanto você explora. Viaje até o marcador dourado para participar.</p><div id="eg-content"></div><div class="muted" style="margin-top:12px;border-top:1px solid #ffffff18;padding-top:10px">As atividades são individuais nesta versão. O progresso não altera os dados de outros jogadores.</div>';
 document.body.append(launch,panel);
 const toggle=()=>{panel.style.display=panel.style.display==='block'?'none':'block';renderPanel()};
 launch.onclick=toggle;panel.querySelector('#eg-close').onclick=toggle;
 const state={event:null,nextAt:50,serial:0,npcs:[],weather:'clear',weatherT:0,lastUi:0,talks:{},encounters:[],encounterAt:35,encounterSerial:0,secrets:[],secretAt:18,weatherParticles:[],weatherCycle:0,weatherKind:'clear',weatherChange:0,lastPlayer:{x:0,y:0}};
 function rand(a,b){return a+Math.random()*(b-a)}
 function makeNPCs(g){const names=['Lina, a Cartógrafa','Borin, o Viajante','Mestre Oren','Mila, a Mensageira','Tomas, o Aprendiz','Nara, a Herbalista','Darin, o Caçador','Ivo, o Mercador'];state.npcs=names.map((name,i)=>({name,x:g.player.x+Math.cos(i*1.25)*rand(65,210),y:g.player.y+Math.sin(i*1.25)*rand(60,170),homeX:0,homeY:0,dir:1,speed:rand(12,22),wait:rand(0,3),phase:rand(0,6),tone:['#527d72','#9b7046','#526a9b','#9a5f77','#8b874d','#58865d','#9b754f','#a17b42'][i]}));state.npcs.forEach(n=>{n.homeX=n.x;n.homeY=n.y})}
 function safeEventPoint(g){const p=g.player;for(let i=0;i<100;i++){const a=rand(0,Math.PI*2),d=rand(430,650),x=Math.max(120,Math.min(3990,p.x+Math.cos(a)*d)),y=Math.max(120,Math.min(3990,p.y+Math.sin(a)*d));const bio=g.biomeAt(x,y);if(bio&&Math.hypot(x-p.x,y-p.y)>360&&!g.pondAt(x,y,90)&&!g.blocked(x,y)&&!inSafe(x,y,120))return{x,y,bio}}return{x:Math.min(3900,p.x+480),y:Math.min(3900,p.y+300),bio:g.biomeAt(p.x+480,p.y+300)||'forest'}}
 
 const huntKinds={forest:['slime','lobo'],desert:['escorpiao','chacal'],snow:['lobo_gelo','urso'],swamp:['crocodilo','slime'],volcano:['lobo_infernal','salamandra_igne']};
 const gatherKinds={forest:['bush','herb'],desert:['cactus','sandstone'],snow:['ice_crystal','pine'],swamp:['mushroom','herb'],volcano:['ember_vent','obsidian']};
 function seedObjectives(g,e){
  e.spawnedAnimals=[];e.spawnedNodes=[];
  if(e.kind==='hunt'){
   const kinds=huntKinds[e.biome]||huntKinds.forest;
   for(let i=0;i<e.goal;i++){const a=rand(i*2.399, i*2.399+1.4),d=rand(45,155),x=e.x+Math.cos(a)*d,y=e.y+Math.sin(a)*d,kind=kinds[i%kinds.length];if(typeof g.spawnAnimal==='function'&&window.AVENTURIA_CREATURE_DEFS?.[kind]&&!g.blocked(x,y)&&!g.pondAt(x,y,24)){const mob=g.spawnAnimal(kind,x,y);if(mob){mob.eventSerial=e.serial;e.spawnedAnimals.push(mob)}}}
  }else{
   const kinds=gatherKinds[e.biome]||gatherKinds.forest,defs={bush:{hp:20},herb:{hp:12},cactus:{hp:35},sandstone:{hp:55},ice_crystal:{hp:65},pine:{hp:55},mushroom:{hp:15},ember_vent:{hp:40},obsidian:{hp:90}};
   for(let i=0;i<e.goal;i++){const a=i*2.399,d=rand(35,165),x=e.x+Math.cos(a)*d,y=e.y+Math.sin(a)*d,kind=kinds[i%kinds.length],def=defs?.[kind];if(!def)continue;const node={type:kind,x,y,hp:def.hp,maxHp:def.hp,respawn:0,biome:e.biome,eventSerial:e.serial};g.nodes.push(node);e.spawnedNodes.push(node)}
   g.buildNodeGrid?.();
  }
 }
 function cleanupObjectives(g,e){if(!g||!e)return;const nodes=new Set(e.spawnedNodes||[]);if(nodes.size){g.nodes=g.nodes.filter(n=>!nodes.has(n));g.buildNodeGrid?.()}for(const a of e.spawnedAnimals||[]){const i=g.animals?.indexOf(a)??-1;if(i>=0)g.animals.splice(i,1)}}
 function startEvent(g){if(state.event&&state.event.status==='active')return;const d=eventDefs[Math.floor(Math.random()*eventDefs.length)],pt=safeEventPoint(g);state.serial++;state.event={...d,serial:state.serial,x:pt.x,y:pt.y,biome:pt.bio,radius:220,progress:0,status:'active',started:g.t,expires:g.t+240,notified:false};state.weather=['clear','mist','embers','spores'][Math.floor(Math.random()*4)];state.weatherT=55;seedObjectives(g,state.event);notify('✧ Novo acontecimento: '+d.title+'! Vá até o marcador no mapa.','#f4d58f');renderPanel()}
 function notify(msg,color){if(typeof window.showNotification==='function')window.showNotification(msg,color);else console.info(msg)}
 function activeNear(x,y){const e=state.event,g=G();return !!(e&&e.status==='active'&&g&&Math.hypot(x-e.x,y-e.y)<e.radius)}
 function addProgress(kind,x,y){const e=state.event;if(!e||e.status!=='active'||e.kind!==kind||!activeNear(x,y))return;e.progress=Math.min(e.goal,e.progress+1);if(e.progress>=e.goal)completeEvent()}
 function completeEvent(){const e=state.event,s=S(),g=G();if(!s||!g)return;e.status='complete';cleanupObjectives(g,e);s.gold=(s.gold||0)+e.reward;s.resources??={};s.resources[e.resource]=(s.resources[e.resource]||0)+3+Math.floor(e.goal/2);if(typeof g.gainExp==='function')g.gainExp(e.xp);notify('✧ '+e.title+' concluído! +'+e.reward+' ouro, materiais e EXP.','#8ee39b');if(typeof window.updateUIStats==='function')window.updateUIStats();renderPanel()}
 function renderPanel(){const root=$('eg-content');if(!root)return;const e=state.event;if(!e){root.innerHTML='<div class="eg-tag">PRÓXIMO ACONTECIMENTO</div><p class="muted" style="margin-top:8px">Os rumores dizem que algo está para acontecer...</p>';return}
  const pct=Math.round(e.progress/e.goal*100),g=G(),dist=g?Math.round(Math.hypot(g.player.x-e.x,g.player.y-e.y)):'—';
  root.innerHTML='<div class="eg-row" style="margin-top:13px"><span class="eg-tag">'+(e.status==='active'?'EM ANDAMENTO':e.status==='complete'?'CONCLUÍDO':'ENCERRADO')+'</span><span style="color:#e7cb8a;font-weight:800">'+e.icon+' '+biomes[e.biome]?.name+'</span></div><h3 style="margin-top:10px">'+e.title+'</h3><p class="muted">'+e.desc+'</p><div class="eg-row" style="margin-top:12px"><b>Progresso</b><b>'+e.progress+'/'+e.goal+'</b></div><div class="eg-progress"><span style="width:'+pct+'%"></span></div><div class="eg-row"><span class="muted">Distância: '+dist+' m</span><span class="muted">Recompensa: '+e.reward+' ouro</span></div>'+(e.status==='active'?'<p class="muted" style="margin-top:8px">Tempo restante: '+Math.max(0,Math.ceil(e.expires-(g?.t||0)))+'s</p>':'<p class="muted" style="margin-top:8px">O mundo prepara novos acontecimentos.</p>')+'<div style="margin-top:10px"><span class="eg-tag">+ '+e.xp+' EXP</span> <span class="eg-tag">+ materiais</span></div>';
 }
 function drawNPC(c,n,now){
  const bob=Math.sin(now/210+n.phase)*1.4,walk=Math.sin(now/85+n.phase)*2;
  c.save();c.translate(Math.round(n.x),Math.round(n.y+bob));
  c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(0,13,10,3.5,0,0,6.28);c.fill();
  c.fillStyle='#302a25';c.fillRect(-7,6+walk,5,8);c.fillRect(2,6-walk,5,8);
  c.fillStyle='#b88a55';c.fillRect(-8,12+walk,6,2);c.fillRect(2,12-walk,6,2);
  c.fillStyle=n.tone;c.fillRect(-8,-8,16,15);c.fillStyle='#d7b46a';c.fillRect(-7,-3,14,3);
  c.fillStyle='#49362c';c.fillRect(-10,-6,3,11);c.fillRect(7,-6,3,11);
  c.fillStyle='#d5ad83';c.fillRect(-6,-19,12,11);c.fillRect(-8,-16,2,5);c.fillRect(6,-16,2,5);
  c.fillStyle='#30251e';c.fillRect(-7,-21,14,4);c.fillRect(-6,-23,12,3);
  c.fillStyle='#f2d59b';c.fillRect(n.dir>0?1:-4,-15,2,2);
  c.fillStyle='#5d3e2c';c.fillRect(-7,-9,14,2);
  c.fillStyle='#b88d54';c.fillRect(-11,-5,3,8);c.fillRect(8,-5,3,8);
  c.restore();
  c.save();c.font='bold 9px Inter';c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(20,18,15,.8)';c.strokeText(n.name,n.x,n.y-28);c.fillStyle='#f5dfb1';c.fillText(n.name,n.x,n.y-28);c.restore()
 }
 function updateNPCs(g,dt){if(!state.npcs.length)makeNPCs(g);for(const n of state.npcs){n.wait-=dt;if(n.wait<=0){const a=rand(0,Math.PI*2),d=rand(90,260);n.tx=Math.max(70,Math.min(3930,n.homeX+Math.cos(a)*d));n.ty=Math.max(70,Math.min(3930,n.homeY+Math.sin(a)*d));n.wait=rand(7,17)}const dx=n.tx-n.x,dy=n.ty-n.y,d=Math.hypot(dx,dy);if(d>4){const nx=n.x+dx/d*n.speed*dt,ny=n.y+dy/d*n.speed*dt;if(!g.blocked(nx,ny)&&!g.pondAt(nx,ny,10)){n.x=nx;n.y=ny}else n.wait=0;n.dir=dx>=0?1:-1}}}
 function spawnEncounter(g){
  const p=g.player;for(let tries=0;tries<45;tries++){
   const a=rand(0,Math.PI*2),d=rand(280,440),x=Math.max(100,Math.min(3990,p.x+Math.cos(a)*d)),y=Math.max(100,Math.min(3990,p.y+Math.sin(a)*d));
   if(inSafe(x,y,130)||g.blocked(x,y)||g.pondAt(x,y,55))continue;
   const types=['cache','traveler','caravan','tracks'],type=types[Math.floor(Math.random()*types.length)];
   const e={id:++state.encounterSerial,type,x,y,life:210,used:false,phase:rand(0,6),biome:g.biomeAt(x,y)};
   if(type==='caravan'){e.name='Caravana abandonada';e.icon='⚑';e.desc='Uma caravana foi deixada na estrada.'}
   if(type==='cache'){e.name='Esconderijo antigo';e.icon='✧';e.desc='Algo parece brilhar entre as pedras.'}
   if(type==='traveler'){e.name='Viajante ferido';e.icon='♙';e.desc='Um viajante precisa de ajuda.'}
   if(type==='tracks'){e.name='Rastros misteriosos';e.icon='➤';e.desc='Pegadas recentes seguem para este ponto.'}
   state.encounters.push(e);notify('Algo chamou sua atenção nas proximidades: '+e.name+'.','#e8cb8b');return;
  }
 }
 function resolveEncounter(g,e){
  if(e.used)return;e.used=true;const s=S();if(!s)return;
  if(e.type==='cache'){const gold=rand(35,75)|0;s.gold=(s.gold||0)+gold;s.resources??={};s.resources.crystal=(s.resources.crystal||0)+1;notify('✧ Você encontrou '+gold+' ouro e um cristal!','#f5d58c')}
  else if(e.type==='traveler'){const gold=55;s.gold=(s.gold||0)+gold;s.resources??={};s.resources.herb=(s.resources.herb||0)+2;notify('♡ Você ajudou o viajante: +55 ouro e ervas.','#9be2ad')}
  else if(e.type==='caravan'){const gold=rand(65,115)|0;s.gold=(s.gold||0)+gold;notify('⚑ Você recuperou '+gold+' ouro da caravana.','#f5d58c');const kinds=Object.keys(window.AVENTURIA_CREATURE_DEFS||{}).filter(k=>g.biomeAt(e.x,e.y));if(kinds.length){const k=kinds[Math.floor(Math.random()*kinds.length)];try{g.spawnAnimal(k,e.x+35,e.y+25,{mult:1.15})}catch{}}}
  else {const gold=40;s.gold=(s.gold||0)+gold;notify('➤ Você seguiu os rastros e encontrou suprimentos: +40 ouro.','#f5d58c')}
  if(typeof g.gainExp==='function')g.gainExp(35);if(typeof window.updateUIStats==='function')window.updateUIStats();
 }
 function spawnSecret(g){
  const p=g.player;for(let i=0;i<55;i++){const a=rand(0,Math.PI*2),d=rand(360,780),x=Math.max(100,Math.min(3990,p.x+Math.cos(a)*d)),y=Math.max(100,Math.min(3990,p.y+Math.sin(a)*d));
   if(inSafe(x,y,150)||g.blocked(x,y)||g.pondAt(x,y,60)||state.secrets.some(q=>Math.hypot(q.x-x,q.y-y)<260))continue;
   state.secrets.push({x,y,kind:['shrine','ancient_stone','fairy_circle'][Math.floor(Math.random()*3)],found:false,phase:rand(0,6),life:480});return;
  }
 }
 function drawWeather(g,now){
  const c=g.ctx,W=g.canvas.width,H=g.canvas.height,p=g.player;if(!c||!p)return;
  const kind=state.weatherKind;if(kind==='clear')return;
  c.save();c.setTransform(1,0,0,1,0,0);
  if(kind==='rain'||kind==='snow'||kind==='embers'){
   c.lineWidth=1.2;for(const q of state.weatherParticles){const sx=q.x,sy=q.y;c.globalAlpha=q.a;
    if(kind==='rain'){c.strokeStyle='#b9d9e8';c.beginPath();c.moveTo(sx,sy);c.lineTo(sx-5,sy+13);c.stroke()}
    else{c.fillStyle=kind==='snow'?'#f2fbff':'#ff9b52';c.beginPath();c.arc(sx,sy,q.r,0,Math.PI*2);c.fill()}
   }
  }
  if(kind==='mist'){const grad=c.createLinearGradient(0,0,W,H);grad.addColorStop(0,'rgba(180,205,190,.03)');grad.addColorStop(.5,'rgba(180,205,190,.15)');grad.addColorStop(1,'rgba(180,205,190,.04)');c.fillStyle=grad;c.fillRect(0,0,W,H)}
  if(kind==='spores'){c.fillStyle='rgba(160,215,115,.045)';c.fillRect(0,0,W,H);for(const q of state.weatherParticles){c.globalAlpha=q.a;c.fillStyle='#d6f2a2';c.beginPath();c.arc(q.x,q.y,q.r,0,6.28);c.fill()}}
  c.restore();
 }
 function updateWeather(g,dt){
  state.weatherChange-=dt;if(state.weatherChange<=0){const b=g.biomeAt(g.player.x,g.player.y);const pool=b==='snow'?['clear','snow','mist']:b==='volcano'?['clear','embers','mist']:b==='swamp'?['clear','rain','mist','spores']:['clear','rain','mist','spores'];state.weatherKind=pool[Math.floor(Math.random()*pool.length)];state.weatherChange=rand(75,130);state.weatherParticles=[];for(let i=0;i<90;i++)state.weatherParticles.push({x:rand(0,g.canvas.width),y:rand(0,g.canvas.height),a:rand(.25,.75),r:rand(1,2.5),v:rand(45,120)})}
  for(const q of state.weatherParticles){q.y+=q.v*dt;q.x+=(state.weatherKind==='rain'?-25:Math.sin(q.y/40)*8)*dt;if(q.y>g.canvas.height+12){q.y=-12;q.x=rand(0,g.canvas.width)}if(q.x< -12)q.x=g.canvas.width+12}
 }
 function drawSecret(c,q,now,p){
  const d=Math.hypot(p.x-q.x,p.y-q.y);if(d>340)return;const reveal=d<190,pulse=.5+.5*Math.sin(now/420+q.phase);
  c.save();c.globalAlpha=reveal?.96:.2+pulse*.2;c.translate(Math.round(q.x),Math.round(q.y));
  c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(0,15,30,9,0,0,6.28);c.fill();
  if(q.kind==='shrine'){
   c.fillStyle='#586d5a';c.fillRect(-23,-2,46,18);c.fillStyle='#8ba78a';c.fillRect(-18,-8,36,8);c.fillStyle='#304d3c';c.fillRect(-14,-25,7,22);c.fillRect(7,-25,7,22);c.fillStyle='#a8e9bc';c.fillRect(-3,-34,6,25);c.fillStyle='#e1ffd0';c.fillRect(-1,-39,2,7)
  }else if(q.kind==='ancient_stone'){
   c.fillStyle='#59616a';c.fillRect(-18,-23,36,38);c.fillStyle='#87949a';c.fillRect(-14,-27,28,5);c.fillStyle='#b6e4c0';c.fillRect(-2,-17,4,21);c.fillRect(-9,-10,18,3);c.fillRect(-6,-3,12,3)
  }else{
   c.fillStyle='#4b6848';c.beginPath();c.ellipse(0,6,29,12,0,0,6.28);c.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;c.fillStyle=i%2?'#b4d982':'#e0eaa0';c.beginPath();c.arc(Math.cos(a)*22,Math.sin(a)*9-5,5,0,6.28);c.fill()}c.fillStyle='#f3f6c2';c.beginPath();c.arc(0,-5,5,0,6.28);c.fill()
  }
  c.strokeStyle='#b8f1c4';c.lineWidth=2;c.globalAlpha=.35+pulse*.5;c.beginPath();c.arc(0,-7,30+pulse*5,0,6.28);c.stroke();
  c.restore();
  if(reveal){c.save();c.font='bold 10px Inter';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#17251d';c.strokeText('SEGREDO DESCOBERTO',q.x,q.y-48);c.fillStyle='#e6f5d7';c.fillText('SEGREDO DESCOBERTO',q.x,q.y-48);if(d<70){c.fillStyle='#14231b';c.fillRect(q.x-43,q.y+28,86,18);c.fillStyle='#eaffd8';c.fillText('[E] INVESTIGAR',q.x,q.y+41)}c.restore()}
 }
 function resolveSecret(g,q){if(q.found)return;q.found=true;const s=S();if(!s)return;const gold=rand(45,95)|0;s.gold=(s.gold||0)+gold;s.resources??={};const key=q.kind==='shrine'?'crystal':q.kind==='ancient_stone'?'iron':'herb';s.resources[key]=(s.resources[key]||0)+2;if(typeof g.gainExp==='function')g.gainExp(55);notify('✧ Segredo ancestral encontrado! +'+gold+' ouro e materiais raros.','#b9e9bd');if(typeof window.updateUIStats==='function')window.updateUIStats()}
 function update(g,dt){if(!g?.running||!g.player)return;updateNPCs(g,dt);updateWeather(g,dt);
  state.secretAt-=dt;if(state.secretAt<=0&&state.secrets.filter(q=>!q.found).length<3){spawnSecret(g);state.secretAt=rand(75,115)}state.secrets=state.secrets.filter(q=>!q.found&&q.life>0);for(const q of state.secrets)q.life-=dt;
  state.encounters=state.encounters.filter(e=>!e.used&&e.life>0);for(const e of state.encounters)e.life-=dt;
  state.encounterAt-=dt;if(state.encounterAt<=0&&state.encounters.length<2){spawnEncounter(g);state.encounterAt=rand(48,78)}
  if(state.event?.status==='active'){if(g.t>state.event.expires){state.event.status='expired';cleanupObjectives(g,state.event);notify('O acontecimento '+state.event.title+' desapareceu.','#d6b47b')}if(g.t-state.lastUi>1){state.lastUi=g.t;renderPanel()}}
  if(!state.event||state.event.status!=='active'){if(g.t>=state.nextAt){startEvent(g);state.nextAt=g.t+rand(180,260)}}
  if(state.weatherT>0)state.weatherT=Math.max(0,state.weatherT-dt)
 }
 function drawWorld(g){if(!g?.running||!g.ctx)return;const c=g.ctx,p=g.player,now=performance.now(),camX=p.x-g.canvas.width/2,camY=p.y-g.canvas.height/2;c.save();c.translate(-camX,-camY);
  if(p.dashT>0){const pulse=p.dashT/.18;c.save();for(let i=1;i<=4;i++){c.globalAlpha=.16*(1-i/5)*pulse;c.fillStyle='#b8f2dc';c.beginPath();c.ellipse(p.x-p.dvx*i*2.2,p.y-p.dvy*i*2.2,13-i,18-i,0,0,6.28);c.fill()}c.restore()}
  if(p.moving&&p.dashT<=0&&Math.floor(now/150)%3===0){c.save();c.globalAlpha=.18;c.fillStyle='#d8c9a2';c.beginPath();c.arc(p.x-5,p.y+13,2.5,0,6.28);c.arc(p.x+6,p.y+14,2,0,6.28);c.fill();c.restore()}
  for(const n of state.npcs)drawNPC(c,n,now);
  for(const q of state.secrets)drawSecret(c,q,now,p);
  for(const e of state.encounters){const pulse=.5+.5*Math.sin(now/260+e.phase),d=Math.hypot(p.x-e.x,p.y-e.y);c.save();c.translate(Math.round(e.x),Math.round(e.y));
   c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(0,13,24,7,0,0,6.28);c.fill();
   if(e.type==='cache'){c.fillStyle='#76502d';c.fillRect(-17,-12,34,24);c.fillStyle='#b98542';c.fillRect(-18,-14,36,7);c.fillStyle='#e9c16f';c.fillRect(-3,-12,6,24);c.fillStyle='#ffe7a2';c.fillRect(-2,-2,4,5)}
   else if(e.type==='caravan'){c.fillStyle='#68452d';c.fillRect(-22,-15,44,23);c.fillStyle='#9c7045';c.fillRect(-18,-22,36,9);c.fillStyle='#d5b57c';c.fillRect(-15,-19,30,4);c.fillStyle='#302a25';c.beginPath();c.arc(-13,12,6,0,6.28);c.arc(14,12,6,0,6.28);c.fill();c.strokeStyle='#c8a06a';c.lineWidth=2;c.strokeRect(-22,-15,44,23)}
   else if(e.type==='traveler'){c.fillStyle='#252c31';c.fillRect(-8,-2,16,13);c.fillStyle='#d4a47a';c.fillRect(-6,-15,12,12);c.fillStyle='#7b4239';c.fillRect(-10,-4,20,7);c.fillStyle='#3b2c26';c.fillRect(-9,10,7,5);c.fillRect(2,10,7,5);c.fillStyle='#e6d7b6';c.fillRect(9,-8,3,18)}
   else{c.strokeStyle='#d8e4f2';c.lineWidth=3;c.beginPath();c.moveTo(-19,3);c.lineTo(-7,-7);c.lineTo(2,1);c.lineTo(17,-12);c.stroke();c.fillStyle='#c4d5e7';c.beginPath();c.arc(-19,3,3,0,6.28);c.arc(17,-12,3,0,6.28);c.fill()}
   c.globalAlpha=.35+pulse*.6;c.strokeStyle=e.type==='traveler'?'#8dd6c0':e.type==='cache'?'#f5d47a':e.type==='caravan'?'#d5a56d':'#b6c9e8';c.lineWidth=2;c.beginPath();c.arc(0,-8,29+pulse*5,0,6.28);c.stroke();c.restore();
   if(d<135){c.save();c.font='bold 10px Inter';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#201a12';c.strokeText(e.name,e.x,e.y-37);c.fillStyle='#fff1c5';c.fillText(e.name,e.x,e.y-37);if(d<58){c.fillStyle='#171d18';c.fillRect(e.x-43,e.y+20,86,18);c.fillStyle='#ffe5a1';c.fillText('[E] INTERAGIR',e.x,e.y+33)}c.restore()}
  }
  const e=state.event;if(e&&e.status==='active'){const pulse=.5+.5*Math.sin(now/330);c.save();c.strokeStyle='#f5d47a';c.fillStyle='rgba(245,212,122,.07)';c.lineWidth=4;c.setLineDash([12,8]);c.beginPath();c.arc(e.x,e.y,185,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);c.globalAlpha=.35+pulse*.55;c.strokeStyle='#fff0b0';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,205+pulse*9,0,Math.PI*2);c.stroke();c.globalAlpha=1;c.fillStyle='#33250e';c.strokeStyle='#f5d47a';c.lineWidth=2;c.beginPath();c.roundRect(e.x-85,e.y-236,170,28,8);c.fill();c.stroke();c.fillStyle='#ffe5a1';c.font='bold 12px Inter';c.textAlign='center';c.fillText(e.icon+' '+e.title,e.x,e.y-218);c.restore()}
  c.restore();drawWeather(g,now);
 }
 function install(g){if(!g||g.__echoesInstalled)return;g.__echoesInstalled=true;const oldLoop=g.loop.bind(g);g.loop=function(ts){const prev=this._echoPrev||ts,dt=Math.min(.05,Math.max(0,(ts-prev)/1000));this._echoPrev=ts;try{update(this,dt)}catch(e){console.warn('[Ecos de Gaia]',e)}return oldLoop(ts)};
  const oldRender=g.render.bind(g);g.render=function(){const r=oldRender();try{drawWorld(this)}catch(e){console.warn('[Ecos de Gaia render]',e)}return r};
  const oldInteract=g.interact.bind(g);g.interact=function(){const p=this.player;if(!p)return oldInteract();const secret=state.secrets.filter(q=>!q.found&&Math.hypot(p.x-q.x,p.y-q.y)<70).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];if(secret){resolveSecret(this,secret);return}const found=state.encounters.filter(e=>!e.used&&Math.hypot(p.x-e.x,p.y-e.y)<58).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];if(found){resolveEncounter(this,found);return}const near=state.npcs.map(n=>({n,d:Math.hypot(p.x-n.x,p.y-n.y)})).sort((a,b)=>a.d-b.d)[0];if(near&&near.d<52){const n=near.n,lines={
   'Lina, a Cartógrafa':['As trilhas mudam quando Gaia desperta. Observe os sinais dourados no horizonte.','Já desenhei mapas de cinco biomas, mas ainda existem lugares que nem os antigos conhecem.'],
   'Borin, o Viajante':['Ouvi passos enormes perto das montanhas. Não eram de um animal comum.','Uma boa mochila e olhos atentos salvam mais vidas que uma espada afiada.'],
   'Mestre Oren':['A energia de Gaia flui por toda criatura e pedra. Até uma simples erva pode guardar poder.','Não confunda força com coragem. Saber quando recuar também é uma habilidade.'],
   'Mila, a Mensageira':['Os mercadores estão inquietos. Eventos estranhos têm surgido longe da vila.','Se encontrar uma fenda brilhante, não toque nela antes de limpar a área!'],
   'Tomas, o Aprendiz':['Um dia vou explorar todos os biomas! Por enquanto, estou aprendendo a reconhecer os minérios.','Dizem que fragmentos caídos do céu ainda guardam calor.']
  };const arr=lines[n.name]||['Que os caminhos de Gaia estejam a seu favor.'];const idx=state.talks[n.name]||0;state.talks[n.name]=idx+1;notify('💬 '+n.name+': “'+arr[idx%arr.length]+'”','#f2d59b');return}return oldInteract()}; 
  const oldAnimalUpdate=g.updateAnimal.bind(g);g.updateAnimal=function(a,dt){oldAnimalUpdate(a,dt);if(!a||a.raid||a.def?.beh!=='passive'||a.aggroT>0||a.hitT>0)return;const herd=this.animals.filter(o=>o!==a&&!o.raid&&o.kind===a.kind&&Math.hypot(o.x-a.x,o.y-a.y)<190);if(herd.length){const cx=herd.reduce((v,o)=>v+o.x,0)/herd.length,cy=herd.reduce((v,o)=>v+o.y,0)/herd.length,dx=cx-a.x,dy=cy-a.y,d=Math.hypot(dx,dy);if(d>95){const pace=a.def.spd*.24*dt*60;this.stepEntity(a,dx/d*pace,dy/d*pace);a.moving=true;a.face=dx>=0?1:-1}}};
  const oldKill=g.killAnimal.bind(g);g.killAnimal=function(a,silent){if(!silent&&a&&activeNear(a.x,a.y))addProgress('hunt',a.x,a.y);return oldKill(a,silent)};
  const oldAttack=g.attack.bind(g);g.attack=function(){const p=this.player,before=this.nodes?.filter(n=>n.hp>0&&Math.hypot(n.x-p.x,n.y-p.y)<75).map(n=>({n,hp:n.hp}))||[];const r=oldAttack();for(const v of before)if(v.n.hp<=0&&v.hp>0&&activeNear(v.n.x,v.n.y))addProgress('gather',v.n.x,v.n.y);return r};
  g.start=(function(old){return function(){const r=old.apply(this,arguments);state.event=null;state.nextAt=35;state.npcs=[];state.encounters=[];state.encounterAt=25;state.secrets=[];state.secretAt=15;state.weatherParticles=[];state.weatherChange=0;state.weatherKind='clear';state.lastUi=0;return r}})(g.start);
  g.addEventListener;
 }
 function key(e){if(e.code==='KeyJ'&&!['INPUT','TEXTAREA'].includes(e.target?.tagName)){toggle();e.preventDefault()}}
 window.addEventListener('keydown',key);
 function boot(){const g=G();if(g?.canvas&&g?.ctx){install(g);return}requestAnimationFrame(boot)}
 window.addEventListener('aventuria:game-ready',()=>requestAnimationFrame(boot));
 window.addEventListener('load',()=>requestAnimationFrame(boot),{once:true});
 if(G())requestAnimationFrame(boot);
})();
