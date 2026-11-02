/* Chronicles of Gaia — Living World v1
 * Simulação persistente local: calendário, rotinas, relações, conversas e eventos.
 * O relógio usa tempo real, portanto continua avançando enquanto a página está fechada.
 * Persistência global entre jogadores exige posteriormente uma tabela/worker no Supabase.
 */
(()=>{'use strict';
 const DAY_MS=60*60*1000, KEY='chronicles-living-world-v1', CX=2000, CY=2000;
 const $=id=>document.getElementById(id);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const safeRead=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
 const safeWrite=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){console.warn('[living-world] save failed',e)}};
 const names=['Mira','Tomas','Lina','Borin','Nara','Eron','Yara','Davi'];
 const defs=[
  {id:'mira',name:'Mira',role:'padeira',home:[CX-250,CY-210],work:[CX+145,CY-155],color:'#b86b55',hair:'#30231f',skin:'#d6a36e',schedule:[[6,'work'],[14,'plaza'],[19,'home'],[22,'sleep']]},
  {id:'tomas',name:'Tomas',role:'ferreiro',home:[CX+260,CY+220],work:[CX-150,CY-145],color:'#637c8c',hair:'#49372c',skin:'#b9784d',schedule:[[7,'work'],[17,'plaza'],[20,'home'],[23,'sleep']]},
  {id:'lina',name:'Lina',role:'curandeira',home:[CX-300,CY+220],work:[CX-150,CY+155],color:'#648b69',hair:'#6c4732',skin:'#e8b985',schedule:[[7,'work'],[13,'plaza'],[18,'home'],[21,'sleep']]},
  {id:'borin',name:'Borin',role:'guarda',home:[CX+300,CY-220],work:[CX,CY-300],color:'#8c754b',hair:'#292929',skin:'#8d563d',schedule:[[0,'work'],[6,'plaza'],[8,'work'],[18,'home'],[22,'sleep']]},
  {id:'nara',name:'Nara',role:'artesã',home:[CX-320,CY-20],work:[CX+160,CY+155],color:'#9a6caa',hair:'#251c2a',skin:'#f4d1b1',schedule:[[8,'work'],[15,'plaza'],[19,'home'],[22,'sleep']]},
  {id:'eron',name:'Eron',role:'pescador',home:[CX+320,CY+30],work:[CX+90,CY+260],color:'#547f91',hair:'#8a633f',skin:'#d6a36e',schedule:[[5,'work'],[12,'plaza'],[17,'home'],[21,'sleep']]},
  {id:'yara',name:'Yara',role:'mensageira',home:[CX+310,CY-20],work:[CX-80,CY+40],color:'#b07b45',hair:'#35252a',skin:'#b9784d',schedule:[[6,'work'],[11,'plaza'],[16,'work'],[20,'home'],[23,'sleep']]},
  {id:'davi',name:'Davi',role:'estudante',home:[CX-300,CY+20],work:[CX+15,CY-240],color:'#6d78a7',hair:'#392d25',skin:'#e8b985',schedule:[[8,'work'],[12,'plaza'],[16,'work'],[19,'home'],[21,'sleep']]}
 ];
 const routes={
  home:n=>n.home,work:n=>n.work,
  plaza:n=>[CX+Math.sin(n.phase)*95,CY+Math.cos(n.phase)*78],
  sleep:n=>n.home
 };
 const conversations=[
  ['Você ouviu? Estão preparando uma festa na praça.','Ouvi sim! Parece que vai durar alguns dias.'],
  ['Como está o movimento hoje?','A cidade está mais animada do que ontem.'],
  ['Passei pela estrada e vi viajantes chegando.','Talvez tragam notícias de outras regiões.'],
  ['Precisamos ajudar quem está construindo a ponte.','Vou falar com o pessoal depois do trabalho.'],
  ['Você ainda está chateado comigo?','Já passou. Vamos conversar na praça.'],
  ['Dizem que haverá música no festival.','Então não vou perder essa festa!']
 ];
 const eventTemplates=[
  {kind:'festival',title:'Festival da Aurora',desc:'Moradores decoram a praça, músicos chegam e comerciantes montam barracas.',duration:4},
  {kind:'market',title:'Feira dos Viajantes',desc:'Mercadores visitantes chegam à cidade com novidades e histórias.',duration:3},
  {kind:'construction',title:'Obras na Vila',desc:'Moradores se reúnem para ampliar as estruturas da cidade.',duration:4},
  {kind:'celebration',title:'Celebração da Colheita',desc:'A comunidade compartilha comida, música e pequenas competições.',duration:3},
  {kind:'rumor',title:'Rumores da Estrada',desc:'Viajantes relatam movimentação estranha perto dos caminhos da floresta.',duration:3}
 ];
 const saved=safeRead(),now=Date.now();
 const world=saved&&saved.version===1?saved:{
  version:1,createdAt:now,lastSimAt:now,day:1,
  npcs:defs.map((d,i)=>({...d,x:d.home[0],y:d.home[1],from:[...d.home],to:[...d.home],moveAt:now,moveUntil:now,phase:i*.8,friendship:{},mood:'calmo',lastTalkAt:0,bubble:'',bubbleUntil:0})),
  events:[],history:[],nextEventAt:now+DAY_MS*3,festivalCount:0
 };
 let lastSave=0,lastRendered=-1,lastHour=-1;
 world.npcs??=defs.map((d,i)=>({...d,x:d.home[0],y:d.home[1],from:[...d.home],to:[...d.home],moveAt:now,moveUntil:now,phase:i*.8,friendship:{},mood:'calmo',lastTalkAt:0,bubble:'',bubbleUntil:0}));
 world.lastNarrativeDay??=Math.floor(world.day||1);
 // Recupera o progresso decorrido mesmo se o navegador ficou fechado.
 function advanceCalendar(t){
  const elapsed=Math.max(0,t-(world.lastSimAt||t));
  world.day+=(elapsed/DAY_MS);
  world.lastSimAt=t;
  if(world.nextEventAt-t<=DAY_MS&&world.nextEventAt>t&&world.preannouncedAt!==world.nextEventAt){world.preannouncedAt=world.nextEventAt;announce('📣 Os moradores estão preparando um novo acontecimento. Confira o painel Mundo para saber quando começa!')}
  let catchup=0;
  while(t>=world.nextEventAt&&catchup++<20){
   const startAt=world.nextEventAt;
   const template=eventTemplates[(world.history.length+Math.floor(world.day)+catchup)%eventTemplates.length];
   const duration=template.duration+(Math.floor(world.day+catchup)%2);
   const event={id:'event-'+Math.floor(startAt/1000),...template,startAt,endAt:startAt+duration*DAY_MS,status:t>=startAt+duration*DAY_MS?'finished':'active'};
   world.events.push(event);world.history.unshift({title:event.title,at:startAt,desc:event.desc});
   if(event.kind==='market'&&event.status==='active'){
    const visitors=[
     {name:'Mercador Kael',role:'mercador viajante',color:'#a77b45',hair:'#34271f',skin:'#d6a36e'},
     {name:'Suri',role:'contadora de histórias',color:'#557f91',hair:'#392b50',skin:'#e8b985'}
    ];
    visitors.forEach((v,i)=>world.npcs.push({id:'visitor-'+event.id+'-'+i,...v,home:[CX+270+i*35,CY+230],work:[CX+155+i*55,CY-70],x:CX+155+i*55,y:CY-70,from:[CX+155+i*55,CY-70],to:[CX+155+i*55,CY-70],moveAt:t,moveUntil:t+30000,phase:i*1.7,schedule:[[0,'work'],[19,'home']],friendship:{},mood:'animado',lastTalkAt:0,bubble:'',bubbleUntil:0,visitorEventId:event.id}));
   }
   world.history=world.history.slice(0,20);
   world.nextEventAt=startAt+(6+Math.floor(((world.day+catchup)*7)%5))*DAY_MS;
   if(event.kind==='festival')world.festivalCount++;
   if(event.status==='active')announce('📣 '+event.title+' começou! '+event.desc);
  }
  world.events=world.events.filter(e=>e.endAt>t- DAY_MS);
  for(const e of world.events)if(e.status==='active'&&t>=e.endAt){e.status='finished';world.npcs=world.npcs.filter(n=>n.visitorEventId!==e.id);announce('🏁 '+e.title+' terminou. A cidade guarda as lembranças desses dias.')}
  // Histórias pessoais são geradas por dia do mundo, inclusive nos dias em que ninguém entrou.
  let narrativeCatchup=0;
  while(Math.floor(world.day)>world.lastNarrativeDay&&narrativeCatchup++<30){
   const day=++world.lastNarrativeDay;
   const n=world.npcs[(day*7)%world.npcs.length];
   const partnerId=n.partner||n.family[0]||n.rival;
   const other=world.npcs.find(x=>x.id===partnerId);
   const variants=[
    {title:n.name+' avançou em seu objetivo',desc:n.name+' dedicou parte do dia a: '+n.goal+'.'},
    {title:n.name+' visitou a família',desc:n.name+' passou um tempo com '+(other?.name||'pessoas queridas')+' e compartilhou novidades.'},
    {title:n.name+' recebeu notícias da estrada',desc:n.name+' ouviu relatos de viajantes e espalhou uma nova história pela cidade.'},
    {title:n.name+' teve um desentendimento',desc:n.name+' discordou de '+(other?.name||'um visitante')+'; os dois decidiram conversar depois.'},
    {title:n.name+' fez planos para a cidade',desc:n.name+' sugeriu uma atividade comunitária para os próximos dias.'}
   ];
   const story=variants[day%variants.length];
   world.history.unshift({...story,at:t});world.history.splice(20);
   world.stories??=[];world.stories.unshift({id:'daily-'+day,title:story.title,desc:story.desc,cast:other?[n.id,other.id]:[n.id],at:t,status:'concluída'});world.stories.splice(25);
   n.memories??=[];n.memories.unshift({text:story.desc,at:t,type:'história'});n.memories.splice(12);
  }
  world.npcs.forEach(updateNPC);
 }
 function hourOfDay(t){return (t%DAY_MS)/DAY_MS*24}
 function destination(n,t){
  const h=hourOfDay(t),s=n.schedule;
  let place=s[0][1];for(const [hour,p] of s)if(h>=hour)place=p;
  const active=world.events.find(e=>e.status==='active'&&t>=e.startAt&&t<e.endAt);
  if(active&&active.kind==='festival'&&h>=16&&h<22&&n.id!=='borin')place='plaza';
  if(active&&active.kind==='celebration'&&h>=15&&h<21)place='plaza';
  n.activity=place;
  return routes[place](n);
 }
 function updateNPC(n){
  const t=Date.now();
  if(!n.to||t>=n.moveUntil){
   n.from=[n.x,n.y];n.to=destination(n,t);n.moveAt=t;
   n.moveUntil=t+(n.to[0]===n.x&&n.to[1]===n.y?45000:18000+((n.id.charCodeAt(0)*997)%14000));
  }
  const f=clamp((t-n.moveAt)/Math.max(1,n.moveUntil-n.moveAt),0,1);
  n.x=n.from[0]+(n.to[0]-n.from[0])*f;n.y=n.from[1]+(n.to[1]-n.from[1])*f;
  n.phase+=.012;
  if(n.bubbleUntil<t)n.bubble='';
 }
 function announce(message){
  const feed=$('living-world-feed');if(!feed)return;
  feed.textContent=message;feed.style.opacity='1';
  clearTimeout(announce.timer);announce.timer=setTimeout(()=>feed.style.opacity='.55',9000);
 }
 function setBubble(n,message){
  n.bubble=message;n.bubbleUntil=Date.now()+9000;
 }
 function socialize(){
  const t=Date.now(),active=world.npcs.filter(n=>hourOfDay(t)>=7&&hourOfDay(t)<22);
  for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
   const a=active[i],b=active[j];if(Math.hypot(a.x-b.x,a.y-b.y)>95||t-a.lastTalkAt<45000||t-b.lastTalkAt<45000)continue;
   const lines=conversations[(Math.floor(t/60000)+i*3+j)%conversations.length];
   setBubble(a,lines[0]);setBubble(b,lines[1]);a.lastTalkAt=b.lastTalkAt=t;
   a.friendship[b.id]=clamp((a.friendship[b.id]||0)+1,-100,100);
   b.friendship[a.id]=clamp((b.friendship[a.id]||0)+1,-100,100);
   break;
  }
 }
 function drawBubble(c,text,x,y){
  c.font='10px Inter,sans-serif';const w=Math.min(190,c.measureText(text).width+16);
  c.fillStyle='rgba(9,18,22,.92)';c.beginPath();c.roundRect(x-w/2,y-48,w,24,7);c.fill();
  c.strokeStyle='#d6b15e';c.lineWidth=1;c.stroke();
  c.fillStyle='#fff1c8';c.textAlign='center';c.fillText(text.length>34?text.slice(0,32)+'…':text,x,y-32);
  c.beginPath();c.moveTo(x-4,y-24);c.lineTo(x,y-18);c.lineTo(x+4,y-24);c.fill();
 }
 function render(){
  const g=window.game;if(!g?.running||!g.ctx||!g.player||typeof window.drawCharacter!=='function')return;
  const c=g.ctx,W=g.canvas.width,H=g.canvas.height,camX=Math.round(g.player.x-W/2),camY=Math.round(g.player.y-H/2);
  c.save();c.translate(-camX,-camY);
  const t=Date.now(),h=hourOfDay(t);
  for(const n of world.npcs){
   if(n.x<camX-80||n.x>camX+W+80||n.y<camY-90||n.y>camY+H+90)continue;
   const moving=Math.hypot(n.to[0]-n.from[0],n.to[1]-n.from[1])>2&&t<n.moveUntil;
   window.drawCharacter(c,n.x,n.y,{dir:'down',name:n.name,title:n.role,cls:'Guerreiro',race:'Humano',hair:n.hair,eye:'#49372c',skin:n.skin,hairStyle:'Curto',beard:'Nenhuma',outfit:n.color,outfitStyle:'Armadura',cloak:'#252b45',accessory:'Nenhum',mark:'Nenhuma',moving,local:false});
   c.font='bold 10px Inter,sans-serif';c.textAlign='center';c.fillStyle='#fff0c2';c.fillText(n.name,n.x,n.y-30);
   if(n.activity==='sleep'){c.font='bold 12px Inter,sans-serif';c.fillStyle='#b8d7ff';c.fillText('Z z z',n.x+19,n.y-18)}
   else if(n.activity==='work'){c.font='10px Inter,sans-serif';c.fillStyle='#f4d68e';c.fillText('⚒',n.x+17,n.y-17)}
   if(n.bubble)drawBubble(c,n.bubble,n.x,n.y);
  }
  const festival=world.events.find(e=>e.status==='active'&&e.kind==='festival');
  if(festival){
   // Bandeirolas e pequenas barracas na praça durante o festival.
   for(let i=0;i<7;i++){const x=CX-150+i*50,y=CY-125+Math.sin(i)*8;c.strokeStyle='#7c6040';c.lineWidth=2;c.beginPath();c.moveTo(x,y-18);c.lineTo(x,y+18);c.stroke();c.fillStyle=['#b85b4b','#d7b45e','#6c9b72'][i%3];c.beginPath();c.moveTo(x,y-18);c.lineTo(x+22,y-10);c.lineTo(x,y-2);c.fill()}
   c.font='bold 15px Inter';c.textAlign='center';c.fillStyle='#ffe3a0';c.fillText('✦ FESTIVAL DA AURORA ✦',CX,CY-145);
  }
  c.restore();
 }
 function panel(){
  let el=$('living-world-panel');if(!el){el=document.createElement('section');el.id='living-world-panel';el.style.cssText='position:fixed;left:14px;top:90px;z-index:58;width:min(310px,calc(100vw - 28px));max-height:42vh;overflow:auto;padding:12px;border:1px solid #8b6b38;border-radius:13px;background:#0b171bf2;color:#f4ead5;font:12px Inter,sans-serif;display:none;box-shadow:0 12px 40px #0009';document.body.appendChild(el)}
  const active=world.events.filter(e=>e.status==='active'),upcoming=Math.max(0,Math.ceil((world.nextEventAt-Date.now())/DAY_MS));
  el.innerHTML='<header style="display:flex;justify-content:space-between;align-items:center"><b style="color:#f8df9a">🌍 CRÔNICAS DO MUNDO</b><button id="living-close" style="padding:4px 8px;border:1px solid #52636a;border-radius:6px">✕</button></header><p style="color:#b6c5c5;margin:7px 0">Dia '+Math.floor(world.day)+' · '+Math.floor(hourOfDay(Date.now()))+':'+String(Math.floor(hourOfDay(Date.now())%1*60)).padStart(2,'0')+' · '+world.npcs.length+' moradores</p><b>📅 Acontecimentos em andamento</b>'+(active.length?active.map(e=>'<article style="margin:7px 0;padding:8px;border:1px solid #665638;border-radius:8px"><b style="color:#f5d58b">'+e.title+'</b><p style="color:#bdcbd0;margin-top:3px">'+e.desc+'</p><small>Termina em '+Math.max(1,Math.ceil((e.endAt-Date.now())/DAY_MS))+' dia(s) do mundo</small></article>').join(''):'<p style="color:#9aabb2;margin:5px 0">A cidade está tranquila no momento.</p>')+'<p style="margin-top:8px;color:#c4b5fd">Próximo acontecimento: em '+upcoming+' dia(s) do mundo.</p><b>🗣 Últimas histórias</b>'+world.history.slice(0,5).map(e=>'<p style="margin-top:5px;color:#cbd5e1">• '+e.title+' — '+e.desc+'</p>').join('');
  $('living-close').onclick=()=>el.style.display='none';
  return el;
 }
 function setupUI(){
  const feed=document.createElement('div');feed.id='living-world-feed';feed.style.cssText='position:fixed;top:58px;left:50%;transform:translateX(-50%);z-index:35;max-width:min(560px,90vw);padding:8px 13px;border:1px solid #8b6b38;border-radius:10px;background:#0b171beF;color:#ffe7a8;font:11px Inter,sans-serif;text-align:center;pointer-events:none;opacity:.55;transition:opacity .5s';feed.textContent='🌍 O mundo continua vivendo enquanto você está fora.';document.body.appendChild(feed);
  const btn=document.createElement('button');btn.id='living-world-btn';btn.textContent='🌍 Mundo';btn.style.cssText='position:fixed;left:18px;top:68px;z-index:57;padding:8px 12px;border:1px solid #8b6b38;border-radius:9px;background:#172a2b;color:#f8df9a;font: bold 11px Inter,sans-serif';btn.onclick=()=>{const el=panel();el.style.display=el.style.display==='none'?'block':'none';if(el.style.display==='block')panel()};document.body.appendChild(btn);
 }
 function tick(){
  const t=Date.now();advanceCalendar(t);socialize();
  if(t-lastSave>15000){safeWrite(world);lastSave=t}
  const hour=Math.floor(hourOfDay(t));if(hour!==lastHour){lastHour=hour;world.npcs.forEach(updateNPC);safeWrite(world)}
  const el=$('living-world-feed');if(el&&t-lastRendered>120000){lastRendered=t;el.textContent='🌍 Dia '+Math.floor(world.day)+' · '+world.events.filter(e=>e.status==='active').length+' acontecimento(s) ativo(s) · '+world.npcs.length+' moradores com rotina';}
  if(t-lastSave<1000)render();
 }
 function attach(){
  if(!window.game||typeof window.game.render!=='function'){setTimeout(attach,500);return}
  const g=window.game;if(g.__livingWorldAttached)return;g.__livingWorldAttached=true;
  const original=g.render.bind(g);g.render=function(){original();render()};
 }

 // Camada social: vínculos familiares, casais, rivalidades, memórias e histórias pessoais.
 const socialProfiles={
  mira:{family:['davi'],partner:'tomas',traits:['generosa','alegre'],goal:'abrir uma segunda padaria'},
  tomas:{family:['mira'],partner:'mira',rival:'borin',traits:['orgulhoso','trabalhador'],goal:'forjar uma espada lendária'},
  lina:{family:['yara'],partner:null,traits:['cuidadosa','curiosa'],goal:'criar um jardim medicinal'},
  borin:{family:[],partner:null,rival:'tomas',traits:['protetor','reservado'],goal:'proteger todas as estradas'},
  nara:{family:[],partner:'eron',traits:['criativa','sonhadora'],goal:'organizar uma grande feira de artesanato'},
  eron:{family:[],partner:'nara',traits:['calmo','aventureiro'],goal:'mapear os rios de Gaia'},
  yara:{family:['lina'],partner:null,traits:['corajosa','falante'],goal:'entregar uma mensagem além das montanhas'},
  davi:{family:['mira'],partner:null,traits:['curioso','impulsivo'],goal:'tornar-se um grande explorador'}
 };
 const memories=world.memories??(world.memories=[]);
 const playerRelations=world.playerRelations??(world.playerRelations={});
 const stories=world.stories??(world.stories=[]);
 world.npcs.forEach(n=>{
  const p=socialProfiles[n.id]||{};
  n.family??=p.family||[];n.partner??=p.partner||null;n.rival??=p.rival||null;
  n.traits??=p.traits||['observador'];n.goal??=p.goal||'encontrar seu lugar na cidade';
  n.memories??=[];n.relationships??={};
 });
 function remember(n,text,type='vida'){
  n.memories.unshift({text,at:Date.now(),type});n.memories=n.memories.slice(0,12);
  memories.unshift({npc:n.name,text,at:Date.now(),type});memories.splice(40);
 }
 function socialStory(title,desc,cast){
  const item={id:'story-'+Date.now(),title,desc,cast,at:Date.now(),status:'em andamento'};
  stories.unshift(item);stories.splice(25);world.history.unshift({title,desc,at:item.at});world.history.splice(20);
  announce('📖 Nova história: '+title+' — '+desc);
 }
 function nearestNPC(){
  const p=window.game?.player;if(!p)return null;
  return world.npcs.map(n=>({n,d:Math.hypot(n.x-p.x,n.y-p.y)})).sort((a,b)=>a.d-b.d)[0]||null;
 }
 function talkToNPC(){
  const hit=nearestNPC();if(!hit||hit.d>115){announce('Chegue mais perto de um morador para conversar.');return}
  const n=hit.n,t=Date.now(),rel=playerRelations[n.id]??(playerRelations[n.id]={affinity:0,talks:0,gifts:0,trust:0});
  const lines=[
   'Olá! Que bom encontrar alguém disposto a conversar.',
   'A cidade muda um pouquinho a cada dia. Você percebeu?',
   'Tenho pensado bastante nos meus planos: '+n.goal+'.',
   n.partner?'Às vezes converso com '+(world.npcs.find(x=>x.id===n.partner)?.name||'uma pessoa querida')+' sobre o futuro.':'Ainda estou descobrindo o que o futuro reserva.',
   n.rival?'Prefiro evitar discussões com '+(world.npcs.find(x=>x.id===n.rival)?.name||'essa pessoa')+'.':'Gosto de conhecer pessoas novas.',
   'Minha família é importante para mim. Nem sempre concordamos, mas estamos juntos.'
  ];
  const line=lines[(rel.talks+Math.floor(t/60000))%lines.length];
  setBubble(n,line);rel.talks++;rel.affinity=clamp(rel.affinity+1,0,100);rel.trust=clamp(rel.trust+(rel.talks%3===0?1:0),0,100);
  remember(n,'Conversou com o aventureiro. '+line,'jogador');
  if(rel.talks===3)socialStory(n.name+' começou a confiar no aventureiro',n.name+' já reconhece o herói e compartilha mais sobre seus planos.',[n.id]);
  if(rel.affinity>=5&&rel.affinity%5===0){const eventLine=n.name+' agora considera o aventureiro uma pessoa próxima.';setBubble(n,eventLine);remember(n,eventLine,'amizade')}
  safeWrite(world);announce(n.name+' ('+n.role+'): '+line);
  renderSocialPanel();
 }
 function renderSocialPanel(){
  let el=$('living-social-panel');if(!el){el=document.createElement('section');el.id='living-social-panel';el.style.cssText='position:fixed;right:14px;top:90px;z-index:58;width:min(330px,calc(100vw - 28px));max-height:58vh;overflow:auto;padding:12px;border:1px solid #547d72;border-radius:13px;background:#0b171bf5;color:#f4ead5;font:12px Inter,sans-serif;display:none;box-shadow:0 12px 40px #0009';document.body.appendChild(el)}
  const hit=nearestNPC(),relation=hit&&hit.d<180?playerRelations[hit.n.id]||{affinity:0,talks:0,trust:0}:null;
  el.innerHTML='<header style="display:flex;justify-content:space-between"><b style="color:#9fe2bc">🤝 LAÇOS DE AVENTURIA</b><button id="living-social-close">✕</button></header>'+
   (relation?'<p style="margin:8px 0;color:#f8df9a">Mais próximo: '+hit.n.name+' · Afinidade '+relation.affinity+'/100 · Confiança '+relation.trust+'/100</p>':'<p style="margin:8px 0;color:#aab9bc">Aproxime-se de um morador para conversar. Pressione G.</p>')+
   '<b>👨‍👩‍👧 Famílias e vínculos</b>'+world.npcs.map(n=>'<p style="margin-top:6px">• <b>'+n.name+'</b> — '+n.role+'<br><span style="color:#b7c6c7">Família: '+(n.family.map(id=>world.npcs.find(x=>x.id===id)?.name||id).join(', ')||'sem parentes conhecidos')+' · '+(n.partner?'Relacionamento: '+(world.npcs.find(x=>x.id===n.partner)?.name||n.partner):'solteiro(a)')+(n.rival?' · Rival: '+(world.npcs.find(x=>x.id===n.rival)?.name||n.rival):'')+'</span><br><span style="color:#a7b7aa">Objetivo: '+n.goal+'</span></p>').join('')+
   '<b style="display:block;margin-top:12px">📚 Histórias recentes</b>'+stories.slice(0,5).map(s=>'<p style="margin-top:5px;color:#cbd5e1">• '+s.title+'</p>').join('');
  $('living-social-close').onclick=()=>el.style.display='none';return el;
 }
 function socialMilestones(){
  const t=Date.now();
  // Relacionamentos e rivalidades geram consequências narrativas ao longo do calendário.
  for(const n of world.npcs){
   if(!n.partner||n.id>n.partner)continue;
   const other=world.npcs.find(x=>x.id===n.partner);if(!other)continue;
   const key=[n.id,other.id].sort().join('-');
   const together=world.events.some(e=>e.kind==='festival'&&e.status==='active');
   if(together&&!world.socialMilestones?.[key]){
    world.socialMilestones??={};world.socialMilestones[key]=t;
    remember(n,'Passou o festival ao lado de '+other.name+'.','relacionamento');
    remember(other,'Passou o festival ao lado de '+n.name+'.','relacionamento');
    socialStory(n.name+' e '+other.name+' fortaleceram seu vínculo','Durante o festival, os dois passaram mais tempo juntos e fizeram planos.',[n.id,other.id]);
   }
  }
  for(const n of world.npcs){
   if(!n.rival||n.id>n.rival)continue;
   const other=world.npcs.find(x=>x.id===n.rival);if(!other)continue;
   const key=[n.id,other.id].sort().join('-');
   const day=Math.floor(world.day);
   world.rivalryDays??={};
   if(day%9===0&&world.rivalryDays[key]!==day){
    world.rivalryDays[key]=day;
    remember(n,'Teve um desentendimento com '+other.name+'.','rivalidade');
    remember(other,'Discutiu novamente com '+n.name+'.','rivalidade');
    socialStory('Uma velha rivalidade voltou à tona',n.name+' e '+other.name+' discordaram durante o trabalho. Os moradores comentam o assunto.',[n.id,other.id]);
   }
  }
 }
 const oldTick=tick;
 tick=function(){oldTick();socialMilestones();};
 const socialBtn=document.createElement('button');socialBtn.id='living-social-btn';socialBtn.textContent='🤝 Laços';socialBtn.style.cssText='position:fixed;left:18px;top:110px;z-index:57;padding:8px 12px;border:1px solid #547d72;border-radius:9px;background:#17332d;color:#b8f0d2;font:bold 11px Inter,sans-serif';socialBtn.onclick=()=>{const el=renderSocialPanel();el.style.display=el.style.display==='none'?'block':'none';if(el.style.display==='block')renderSocialPanel()};document.body.appendChild(socialBtn);
 const radioBtn=document.createElement('button');radioBtn.id='living-radio-btn';radioBtn.textContent='📻 Rádio';radioBtn.style.cssText='position:fixed;left:18px;top:152px;z-index:57;padding:8px 12px;border:1px solid #397c91;border-radius:9px;background:#17313b;color:#a8e8ff;font:bold 11px Inter,sans-serif';radioBtn.onclick=()=>window.openRadioPanel?.();document.body.appendChild(radioBtn);
 window.addEventListener('keydown',e=>{if(e.code==='KeyG'&&!e.repeat&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();e.stopImmediatePropagation();talkToNPC()}},true);
 window.AventuriaSocial={talk:talkToNPC,open:()=>{const el=renderSocialPanel();el.style.display='block'},getRelations:()=>playerRelations,getStories:()=>stories};

 setupUI();advanceCalendar(Date.now());attach();
 setInterval(tick,1000);window.addEventListener('pagehide',()=>safeWrite(world));
 window.AventuriaLivingWorld={getState:()=>world,open:()=>{const el=panel();el.style.display='block';panel()},save:()=>safeWrite(world)};
})();
