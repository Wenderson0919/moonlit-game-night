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
 const state={event:null,nextAt:50,serial:0,npcs:[],weather:'clear',weatherT:0,lastUi:0,talks:{}};
 function rand(a,b){return a+Math.random()*(b-a)}
 function makeNPCs(g){const names=['Lina, a Cartógrafa','Borin, o Viajante','Mestre Oren','Mila, a Mensageira','Tomas, o Aprendiz'];state.npcs=names.map((name,i)=>({name,x:g.player.x+Math.cos(i*1.25)*rand(80,190),y:g.player.y+Math.sin(i*1.25)*rand(70,150),homeX:0,homeY:0,dir:1,speed:rand(9,17),wait:rand(0,3),phase:rand(0,6),tone:['#527d72','#9b7046','#526a9b','#9a5f77','#8b874d'][i]}));state.npcs.forEach(n=>{n.homeX=n.x;n.homeY=n.y})}
 function safeEventPoint(g){const p=g.player;for(let i=0;i<100;i++){const a=rand(0,Math.PI*2),d=rand(430,650),x=Math.max(120,Math.min(3990,p.x+Math.cos(a)*d)),y=Math.max(120,Math.min(3990,p.y+Math.sin(a)*d));const bio=g.biomeAt(x,y);if(bio&&Math.hypot(x-p.x,y-p.y)>360&&!g.pondAt(x,y,90)&&!g.blocked(x,y)&&!p.inSafeZone)return{x,y,bio}}return{x:Math.min(3900,p.x+480),y:Math.min(3900,p.y+300),bio:g.biomeAt(p.x+480,p.y+300)||'forest'}}
 
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
 function drawNPC(c,n,now){c.save();c.translate(n.x,n.y+Math.sin(now/260+n.phase)*1.2);c.fillStyle='#0006';c.beginPath();c.ellipse(0,12,9,3,0,0,Math.PI*2);c.fill();c.fillStyle=n.tone;c.fillRect(-6,-8,12,17);c.fillStyle='#d5ad83';c.fillRect(-5,-17,10,10);c.fillStyle='#302a25';c.fillRect(-5,-19,10,4);c.fillStyle='#f2d59b';c.fillRect(n.dir>0?1:-3,-13,2,2);c.fillStyle='#7b5736';c.fillRect(-7,7,5,5);c.fillRect(2,7,5,5);c.restore();c.font='9px Inter';c.textAlign='center';c.fillStyle='#e9d5a0';c.fillText(n.name,n.x,n.y-24)}
 function updateNPCs(g,dt){if(!state.npcs.length)makeNPCs(g);for(const n of state.npcs){n.wait-=dt;if(n.wait<=0){const a=rand(0,Math.PI*2),d=rand(28,95);n.tx=n.homeX+Math.cos(a)*d;n.ty=n.homeY+Math.sin(a)*d;n.wait=rand(4,10)}const dx=n.tx-n.x,dy=n.ty-n.y,d=Math.hypot(dx,dy);if(d>4){n.x+=dx/d*n.speed*dt;n.y+=dy/d*n.speed*dt;n.dir=dx>=0?1:-1}}}
 function update(g,dt){if(!g?.running||!g.player)return;updateNPCs(g,dt);if(state.event?.status==='active'){if(g.t>state.event.expires){state.event.status='expired';cleanupObjectives(g,state.event);notify('O acontecimento '+state.event.title+' desapareceu.','#d6b47b')}if(g.t-state.lastUi>1){state.lastUi=g.t;renderPanel()}}if(!state.event||state.event.status!=='active'){if(g.t>=state.nextAt){startEvent(g);state.nextAt=g.t+rand(270,390)}}if(state.weatherT>0)state.weatherT=Math.max(0,state.weatherT-dt)}
 function drawWorld(g){if(!g?.running||!g.ctx)return;const c=g.ctx,p=g.player,now=performance.now(),camX=p.x-g.canvas.width/2,camY=p.y-g.canvas.height/2;c.save();c.translate(-camX,-camY);
  for(const n of state.npcs)drawNPC(c,n,now);
  const e=state.event;if(e&&e.status==='active'){const pulse=.5+.5*Math.sin(now/330);c.save();c.strokeStyle='#f5d47a';c.fillStyle='rgba(245,212,122,.07)';c.lineWidth=4;c.setLineDash([12,8]);c.beginPath();c.arc(e.x,e.y,185,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);c.globalAlpha=.35+pulse*.55;c.strokeStyle='#fff0b0';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,205+pulse*9,0,Math.PI*2);c.stroke();c.globalAlpha=1;c.fillStyle='#33250e';c.strokeStyle='#f5d47a';c.lineWidth=2;c.beginPath();c.roundRect(e.x-85,e.y-236,170,28,8);c.fill();c.stroke();c.fillStyle='#ffe5a1';c.font='bold 12px Inter';c.textAlign='center';c.fillText(e.icon+' '+e.title,e.x,e.y-218);c.restore()}
  c.restore();
 }
 function install(g){if(!g||g.__echoesInstalled)return;g.__echoesInstalled=true;const oldLoop=g.loop.bind(g);g.loop=function(ts){const prev=this._echoPrev||ts,dt=Math.min(.05,Math.max(0,(ts-prev)/1000));this._echoPrev=ts;try{update(this,dt)}catch(e){console.warn('[Ecos de Gaia]',e)}return oldLoop(ts)};
  const oldRender=g.render.bind(g);g.render=function(){const r=oldRender();try{drawWorld(this)}catch(e){console.warn('[Ecos de Gaia render]',e)}return r};
  const oldInteract=g.interact.bind(g);g.interact=function(){const p=this.player;if(!p)return oldInteract();const near=state.npcs.map(n=>({n,d:Math.hypot(p.x-n.x,p.y-n.y)})).sort((a,b)=>a.d-b.d)[0];if(near&&near.d<52){const n=near.n,lines={
   'Lina, a Cartógrafa':['As trilhas mudam quando Gaia desperta. Observe os sinais dourados no horizonte.','Já desenhei mapas de cinco biomas, mas ainda existem lugares que nem os antigos conhecem.'],
   'Borin, o Viajante':['Ouvi passos enormes perto das montanhas. Não eram de um animal comum.','Uma boa mochila e olhos atentos salvam mais vidas que uma espada afiada.'],
   'Mestre Oren':['A energia de Gaia flui por toda criatura e pedra. Até uma simples erva pode guardar poder.','Não confunda força com coragem. Saber quando recuar também é uma habilidade.'],
   'Mila, a Mensageira':['Os mercadores estão inquietos. Eventos estranhos têm surgido longe da vila.','Se encontrar uma fenda brilhante, não toque nela antes de limpar a área!'],
   'Tomas, o Aprendiz':['Um dia vou explorar todos os biomas! Por enquanto, estou aprendendo a reconhecer os minérios.','Dizem que fragmentos caídos do céu ainda guardam calor.']
  };const arr=lines[n.name]||['Que os caminhos de Gaia estejam a seu favor.'];const idx=state.talks[n.name]||0;state.talks[n.name]=idx+1;notify('💬 '+n.name+': “'+arr[idx%arr.length]+'”','#f2d59b');return}return oldInteract()}; 
  const oldKill=g.killAnimal.bind(g);g.killAnimal=function(a,silent){if(!silent&&a&&activeNear(a.x,a.y))addProgress('hunt',a.x,a.y);return oldKill(a,silent)};
  const oldAttack=g.attack.bind(g);g.attack=function(){const p=this.player,before=this.nodes?.filter(n=>n.hp>0&&Math.hypot(n.x-p.x,n.y-p.y)<75).map(n=>({n,hp:n.hp}))||[];const r=oldAttack();for(const v of before)if(v.n.hp<=0&&v.hp>0&&activeNear(v.n.x,v.n.y))addProgress('gather',v.n.x,v.n.y);return r};
  g.start=(function(old){return function(){const r=old.apply(this,arguments);state.event=null;state.nextAt=45;state.npcs=[];state.lastUi=0;return r}})(g.start);
  g.addEventListener;
 }
 function key(e){if(e.code==='KeyJ'&&!['INPUT','TEXTAREA'].includes(e.target?.tagName)){toggle();e.preventDefault()}}
 window.addEventListener('keydown',key);
 function boot(){if(G())install(G())}
 window.addEventListener('aventuria:game-ready',boot);if(G())install(G());
})();
