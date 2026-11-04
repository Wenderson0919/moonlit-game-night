/* ============================================================================
   AVENTURIA — MEGA ATUALIZAÇÃO
   Masmorra Subterrânea · Torre Infinita · Titã Colossal · Leilão · Guerra de Guildas
   Prestígio · Erupções e Neblina · Pesca e Culinária · Histórias · Mini-mapa
   Botões de celular · Guia rápido
   Módulo independente: só depende do jogo (window.game / MMO.localState) e das
   pontes expostas por aventuria-expansion.js (AVENTURIA_REALM_API, AVENTURIA_SAFE_NPCS...).
   ========================================================================== */
(()=>{
'use strict';
if(window.__avMega)return;window.__avMega=true;
const $=id=>document.getElementById(id);
const G=()=>window.game, S=()=>window.MMO&&window.MMO.localState;
const rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[Math.floor(Math.random()*a.length)];
const TAU=Math.PI*2, CXW=2000;
const notify=(m,c)=>{try{(window.showNotification||console.log)(m,c||'#f5d58c')}catch{}};
const persist=()=>{try{window.saveGame&&window.saveGame(false)}catch{}};
const upd=()=>{try{window.updateUIStats&&window.updateUIStats()}catch{}};
const lvl=()=>(S()&&S().level)||1;

/* ---------------- estado persistente (dentro do save do personagem) ---------------- */
function M(){
 const s=S();if(!s)return null;
 const m=s.mega??={};
 m.tower??={best:0,runs:0};
 m.dungeon??={clears:0,runs:0,fastest:0};
 m.wb??={dmg:0,kills:0,joined:0};
 m.market??={listings:[],cash:0,sold:0,earned:0};
 m.prestige??={count:0,points:0,spent:{atk:0,hp:0,xp:0,gold:0,spd:0}};
 m.fish??={inv:{},caught:0,best:'',cooked:0};
 m.cook??={buff:null};
 m.story??={chapter:{},start:{},bonus:{atk:0,hp:0,gold:0}};
 m.war??={points:0,terr:{north:{own:false,until:0},east:{own:false,until:0},south:{own:false,until:0}},wins:0};
 m.tut??={seen:false};
 return m;
}

/* ---------------- estilos e utilitários de interface ---------------- */
const css=document.createElement('style');
css.textContent=`
.mg-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#061018dd;padding:12px;font-family:Inter,system-ui,sans-serif}
.mg-box{width:min(640px,100%);max-height:92vh;overflow:auto;background:linear-gradient(160deg,#18303a,#0d1822);border:1px solid #c6a66a;border-radius:16px;padding:16px;color:#fff}
.mg-box h2{font-weight:800;font-size:18px;margin:0}.mg-box h3{font-weight:800;font-size:14px;margin:14px 0 4px}
.mg-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.mg-row{display:flex;align-items:center;gap:10px;padding:9px;border:1px solid #52656a;border-radius:10px;margin-top:7px;background:#0f1d26aa}
.mg-btn{padding:7px 11px;border-radius:8px;background:#456c57;color:#fff;cursor:pointer;font-size:12px;border:0;font-weight:700}
.mg-btn.alt{background:#3a4a7a}.mg-btn.warn{background:#7a3b3b}.mg-btn:disabled{background:#38434a;opacity:.65;cursor:default}
.mg-sub{font-size:11px;color:#bdcbd0}.mg-grow{flex:1;min-width:0}.mg-tabs{display:flex;gap:6px;margin:10px 0 2px;flex-wrap:wrap}
.mg-tab{padding:6px 11px;border-radius:8px;background:#22343d;color:#cfe0e6;cursor:pointer;font-size:12px;font-weight:700;border:1px solid #3f5560}.mg-tab.on{background:#6a5326;border-color:#e6c26e;color:#fff}
.mg-chip{position:fixed;z-index:9990;padding:6px 12px;border-radius:10px;background:#0b1620ee;border:1px solid #c6a66a;color:#fff;font:700 12px Inter,system-ui,sans-serif}
#mg-touch{position:fixed;right:8px;top:34%;z-index:9995;display:none;flex-direction:column;gap:8px}
#mg-touch button{width:46px;height:46px;border-radius:50%;border:2px solid #c6a66a;background:#10212bd9;color:#fff;font-size:20px;touch-action:manipulation}
`;
document.head.appendChild(css);
function modal(id,html){
 let m=$(id);if(!m){m=document.createElement('div');m.id=id;m.className='mg-modal';document.body.appendChild(m)}
 m.innerHTML='<div class="mg-box">'+html+'</div>';m.onclick=e=>{if(e.target===m)m.remove()};
 const x=m.querySelector('[data-x]');if(x)x.onclick=()=>m.remove();return m;
}
const head=t=>'<div class="mg-head"><h2>'+t+'</h2><button class="mg-btn warn" data-x>✕</button></div>';
window.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.mg-modal').forEach(m=>m.remove())});
const inputBusy=e=>/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'');

/* ---------------- pontes com o resto do jogo ---------------- */
const api=()=>window.AVENTURIA_REALM_API;
const inRealm=()=>!!(G()&&G().player&&G().player.realmId);
function hostileKinds(){
 if(typeof ANIMALS==='undefined')return ['lobo'];
 const l=Object.entries(ANIMALS).filter(([k,d])=>d.dmg&&d.beh!=='passive'&&d.hp).sort((a,b)=>a[1].hp-b[1].hp).map(x=>x[0]);
 return l.length?l:['lobo'];
}
function kindForLevel(off){
 const l=hostileKinds(),base=Math.round(Math.min(1,lvl()/50)*(l.length-1)),i=Math.max(0,Math.min(l.length-1,base+off+ri(-2,1)));return l[i];
}
function spawnFoe(g,kind,mult,x,y){
 const a=g.spawnAnimal(kind,x,y,{mult});a.ins=true;a.aggroT=999;a.hx=x;a.hy=y;return a;
}
function spawnAround(g,kind,mult,n,rmin,rmax){
 const p=g.player,out=[];
 for(let i=0;i<n;i++){const an=rnd(0,TAU),r=rnd(rmin,rmax);out.push(spawnFoe(g,kind,mult,p.x+Math.cos(an)*r,p.y+Math.sin(an)*r))}
 return out;
}
function hazard(g,x,y,r,dur,dmg,col,rgb,src){g.hazards.push({x,y,r,t:dur,dur,dmg,col,rgb,src})}

/* ============================================================================
   CHEFE "LITE": padrões de ataque com telégrafo, fases e adds — usado pela
   Masmorra, pela Torre e pelo Titã Colossal.
   ========================================================================== */
function makeBoss(g,a,o){
 a.bl={ph:1,t:2.2,pow:o.pow||1,name:o.name,adds:o.adds||0,addKind:o.addKind,cap:o.cap||6,col:o.col||'#f43f5e',big:!!o.big};
 a.elite={name:o.name,col:a.bl.col};a.aggroT=999;
 if(o.sz)a.def=Object.assign({},a.def,{sz:Math.round(a.def.sz*o.sz),n:o.name});
 if(o.hp){a.hp=a.maxHp=o.hp}
 return a;
}
function bossTick(g,a,dt){
 const b=a.bl;if(!b||a.hp<=0)return;const p=g.player,L=lvl();
 b.t-=dt;const frac=a.hp/a.maxHp,ph=frac>.66?1:frac>.33?2:3,D=(8+L*1.5)*b.pow;
 if(ph>b.ph){
  b.ph=ph;b.t=1.4;g.shake&&g.shake(8,.6);g.floatText&&g.floatText(a.x,a.y-a.def.sz-50,'⚠ FASE '+ph+'!','#fbbf24');
  notify('⚠ '+b.name+' entra em fúria — fase '+ph+'!',b.col);
  for(let i=0;i<8;i++){const an=i/8*TAU;hazard(g,a.x+Math.cos(an)*170,a.y+Math.sin(an)*170,70,1.2,D*1.1,b.col,'251,191,36',b.name)}
  if(b.addKind)for(let i=0;i<2+ph;i++)summonAdd(g,a);
 }
 if(b.t>0)return;
 b.t=Math.max(1.5,3.8-b.ph*.6);
 const pat=pick(b.big?['slam','ring','rain','summon','slam','line']:['slam','ring','rain','summon']);
 const lab={slam:'💥 IMPACTO',ring:'⭕ ONDA',rain:'☄ CHUVA',summon:'👥 CONVOCA',line:'⚡ RAIO'}[pat];
 g.floatText&&g.floatText(a.x,a.y-a.def.sz-40,lab,b.col);
 if(pat==='slam'){hazard(g,p.x,p.y,95+(b.big?25:0),1.1,D*1.6,b.col,'239,68,68',b.name)}
 else if(pat==='ring'){const n=b.big?12:8,R=b.big?260:190;for(let i=0;i<n;i++){const an=i/n*TAU;hazard(g,a.x+Math.cos(an)*R,a.y+Math.sin(an)*R,68,1.25,D,b.col,'251,146,60',b.name)}}
 else if(pat==='rain'){for(let i=0;i<4+b.ph*2;i++){const an=rnd(0,TAU),d=rnd(0,240);hazard(g,p.x+Math.cos(an)*d,p.y+Math.sin(an)*d,58,1.1+i*.1,D*1.2,'#fb923c','251,146,60',b.name)}}
 else if(pat==='line'){const an=Math.atan2(p.y-a.y,p.x-a.x);for(let i=1;i<=7;i++)hazard(g,a.x+Math.cos(an)*i*85,a.y+Math.sin(an)*i*85,48,.9+i*.09,D*1.3,'#facc15','250,204,21',b.name)}
 else if(pat==='summon'&&b.addKind){const alive=g.animals.filter(x=>x.ins&&x!==a).length;if(alive<b.cap)for(let i=0;i<3;i++)summonAdd(g,a)}
}
function summonAdd(g,boss){
 const b=boss.bl,an=rnd(0,TAU),r=rnd(90,170);
 const m=spawnFoe(g,b.addKind,Math.max(.7,1+lvl()*.02),boss.x+Math.cos(an)*r,boss.y+Math.sin(an)*r);m.addOf=boss;return m;
}

/* ============================================================================
   INSTÂNCIAS: MASMORRA SUBTERRÂNEA e TORRE INFINITA (usam o sistema de
   dimensões do jogo para sair do mundo aberto e voltar com segurança)
   ========================================================================== */
const INS={on:false};
const DUNGEON_STEPS=[
 {l:'Andar 1 · Salão de Entrada',foes:4},
 {l:'Andar 1 · Antecâmara',foes:5},
 {l:'Andar 2 · Corredor de Armadilhas',foes:5,traps:1},
 {l:'Andar 3 · Câmara do Mini-Chefe',boss:'mini',foes:3,traps:1},
 {l:'Andar 4 · Salão dos Elites',foes:6,elites:2,traps:1},
 {l:'Andar 5 · Trono do Guardião',boss:'final',foes:0,traps:1}
];
function startInstance(kind){
 const g=G(),s=S();if(!g||!s||!g.running||!g.player)return;
 if(!api()){notify('Portais indisponíveis agora. Tente de novo em instantes.');return}
 if(g.player.realmId||api().active()){notify('Você já está em outra dimensão. Volte pelo portal primeiro.');return}
 if(g.player.inSafeZone!==true){notify('Entre pela Área Safe.');return}
 document.querySelectorAll('.mg-modal').forEach(m=>m.remove());
 api().enter({id:kind,name:kind==='tower'?'Torre Infinita':'Masmorra Subterrânea',seed:kind==='tower'?90909:70707,level:1,color:'#a78bfa',creatures:[]});
 if(!g.player.realmId){return}
 g.animals=[];g.raids=[];g.hazards=[];g.respawnT=1e9;g.raidT=1e9;g.player.x=2000;g.player.y=2800;
 Object.assign(INS,{on:true,kind,step:0,floor:1,state:'idle',foes:[],timer:1.6,trapT:0,boss:null,chest:null,done:false,death:g.lastDeathAt||0,t0:performance.now(),won:false,label:''});
 const m=M();if(kind==='tower'){m.tower.runs++;notify('🗼 Você entrou na Torre Infinita. Quantos andares aguenta?')}
 else{m.dungeon.runs++;notify('🕳️ Você desceu à Masmorra Subterrânea. Cinco andares, um Guardião no fim.')}
 persist();
}
function endInstance(msg,win){
 const g=G();if(!INS.on)return;INS.on=false;
 if(msg)notify(msg,win?'#86efac':'#fca5a5');
 try{if(g&&g.player&&g.player.realmId&&api()&&api().active())api().leave()}catch(e){console.error(e)}
}
function stepClear(){ // todos os inimigos da sala caíram?
 const g=G();return !g.animals.some(a=>a.ins&&a.hp>0);
}
function beginDungeonStep(g){
 const st=DUNGEON_STEPS[INS.step],L=lvl(),mult=1+L*.05+INS.step*.04;INS.label=st.l;INS.state='fight';INS.trap=!!st.traps;
 notify('🕳️ '+st.l);g.shake&&g.shake(4,.3);
 const idx=Math.floor(INS.step/2);
 if(st.foes)spawnAround(g,kindForLevel(idx),mult,st.foes,240,360);
 if(st.elites)for(const a of spawnAround(g,kindForLevel(idx+1),mult*1.3,st.elites,260,340)){a.hp*=2.4;a.maxHp*=2.4;a.elite={name:'Elite das Profundezas',col:'#a78bfa'}}
 if(st.boss){
  const kind=kindForLevel(idx+2),a=spawnFoe(g,kind,mult,g.player.x,g.player.y-300);
  const base=a.maxHp;
  makeBoss(g,a,st.boss==='mini'?{name:'Guardião Menor',pow:.9,sz:1.5,hp:base*6,addKind:kind,cap:5,col:'#f59e0b'}:{name:'Guardião das Profundezas',pow:1.25,sz:2,hp:base*16,addKind:kind,cap:7,col:'#c084fc',big:false});
  INS.boss=a;
 }
}
function beginTowerFloor(g){
 const f=INS.floor,L=lvl();INS.label='Andar '+f+(f%5===0?' · CHEFE':'');INS.state='fight';INS.trap=f>=6;
 const mult=1+f*.1+L*.03;g.hazards=[];
 notify('🗼 '+INS.label);
 if(f%5===0){
  const kind=kindForLevel(Math.floor(f/8)+1),a=spawnFoe(g,kind,mult,g.player.x,g.player.y-300);
  makeBoss(g,a,{name:'Sentinela do Andar '+f,pow:.8+f*.03,sz:1.7,hp:a.maxHp*(5+f*.5),addKind:kind,cap:6,col:'#38bdf8'});INS.boss=a;
 }else spawnAround(g,kindForLevel(Math.floor(f/6)),mult,Math.min(14,3+Math.floor(f*.7)),230,370);
}
function instanceReward(g,s){
 const m=M(),L=lvl();
 if(INS.kind==='dungeon'){
  m.dungeon.clears++;const t=(performance.now()-INS.t0)/1000;if(!m.dungeon.fastest||t<m.dungeon.fastest)m.dungeon.fastest=Math.round(t);
  INS.chest={x:g.player.x,y:g.player.y-90};INS.won=true;INS.state='chest';say('🏆 '+(S().name||'Um herói')+' derrotou o Guardião das Profundezas!');
 }
}
function openChest(g,s){
 const m=M(),L=lvl();INS.chest=null;
 const gold=700+L*40+ri(0,300),dia=2+ri(0,2);s.gold=(s.gold||0)+gold;s.resources??={};s.resources.diamond=(s.resources.diamond||0)+dia;
 try{const it=genItem(null,Math.min(4,2+ri(0,2)),L,'forest',true);giveItem(it)}catch(e){}
 g.gainExp&&g.gainExp(300+L*30);warPoints(25);
 g.floatText&&g.floatText(g.player.x,g.player.y-60,'+'+gold+' Gold','#fde047');
 notify('📦 Baú aberto: +'+gold+' Gold, +'+dia+' Diamantes e um equipamento!','#fde047');persist();upd();
 setTimeout(()=>endInstance('Você voltou à superfície com o butim.',true),4500);INS.state='leaving';
}
function instanceTick(g,dt){
 if(!INS.on)return;const s=S(),p=g.player;
 if(!p||!p.realmId||!api()||!api().active()){INS.on=false;return}   // saiu pelo portal
 if(g.lastDeathAt&&g.lastDeathAt!==INS.death){INS.death=g.lastDeathAt;endInstance(INS.kind==='tower'?'💀 Você caiu no andar '+INS.floor+' da Torre.':'💀 Você caiu na Masmorra.',false);return}
 g.respawnT=1e9;g.raidT=1e9;
 for(const a of g.animals)if(a.bl)bossTick(g,a,dt);
 INS.timer-=dt;
 if(INS.state==='idle'&&INS.timer<=0){INS.kind==='tower'?beginTowerFloor(g):beginDungeonStep(g)}
 else if(INS.state==='fight'){
  if(INS.trap){INS.trapT-=dt;if(INS.trapT<=0){INS.trapT=2.3;for(let i=0;i<2;i++){const an=rnd(0,TAU),d=rnd(0,140);hazard(g,p.x+Math.cos(an)*d,p.y+Math.sin(an)*d,58,1.4,8+lvl()*1.4,'#f97316','249,115,22','Armadilha')}}}
  if(stepClear()){
   g.hazards=[];
   if(INS.kind==='tower'){
    const m=M(),f=INS.floor,gold=40+f*14+lvl()*3;s.gold=(s.gold||0)+gold;g.gainExp&&g.gainExp(40+f*12);
    if(f>m.tower.best){m.tower.best=f;notify('🏅 Novo recorde pessoal: andar '+f+'!','#fde047');if(f%10===0)say('🗼 '+(s.name||'Um herói')+' chegou ao andar '+f+' da Torre Infinita!')}
    if(f%5===0){s.resources??={};s.resources.diamond=(s.resources.diamond||0)+(f%10===0?3:1);try{if(f%10===0)giveItem(genItem(null,Math.min(4,2+Math.floor(f/15)),lvl(),'forest',true))}catch{}}
    warPoints(f%5===0?10:1);
    s.hp=Math.min((s.maxHp||100)+((window.getRPGStats&&window.getRPGStats().hp)||0),s.hp+Math.round((s.maxHp||100)*.12));
    g.floatText&&g.floatText(p.x,p.y-50,'Andar '+f+' limpo! +'+gold,'#86efac');upd();persist();
    INS.floor++;INS.state='idle';INS.timer=2.6;
   }else{
    INS.step++;
    if(INS.step>=DUNGEON_STEPS.length){instanceReward(g,s)}
    else{s.hp=Math.min((s.maxHp||100)+((window.getRPGStats&&window.getRPGStats().hp)||0),s.hp+Math.round((s.maxHp||100)*.2));INS.state='idle';INS.timer=2.6;notify('Sala limpa! Recuperou um pouco de vida.')}
   }
  }
 }
 else if(INS.state==='chest'&&INS.chest&&Math.hypot(p.x-INS.chest.x,p.y-INS.chest.y)<75)openChest(g,s);
}
function instanceHud(){
 let h=$('mg-ins-hud');
 if(!INS.on){if(h)h.remove();return}
 if(!h){h=document.createElement('div');h.id='mg-ins-hud';h.className='mg-chip';h.style.cssText+=';left:50%;top:92px;transform:translateX(-50%);display:flex;gap:10px;align-items:center';document.body.appendChild(h);
  h.addEventListener('click',e=>{if(e.target.dataset.leave)endInstance('Você abandonou a instância.',false)})}
 const g=G(),left=g?g.animals.filter(a=>a.ins&&a.hp>0).length:0;
 const t=INS.kind==='tower'?'🗼 Torre · '+INS.label:'🕳️ '+(INS.label||'Masmorra');
 const html=t+' · inimigos: '+left+' <button class="mg-btn warn" data-leave="1" style="padding:3px 8px">Sair</button>';
 if(h._h!==html){h.innerHTML=html;h._h=html}
}

/* ============================================================================
   TITÃ COLOSSAL — chefe mundial no mapa aberto
   ========================================================================== */
const TT={a:null,slot:-1,doneSlot:-1,dmgOut:0,sendT:0,hpT:0,posT:0,tpos:null,apply:false};
const TIT_SLOT=12*60000, TIT_UP=7*60000, TIT_HP=30000;
const hr=(a,b)=>window.AVENTURIA_HRAND(a,b);
function titanInfo(now){const slot=Math.floor(now/TIT_SLOT),t0=slot*TIT_SLOT;return {slot,t0,up:now<t0+TIT_UP,until:t0+TIT_UP,next:t0+TIT_SLOT}}
const NETS=()=>window.AVENTURIA_NET_STATE;
const netSend=o=>{try{window.AVENTURIA_NET_SEND&&window.AVENTURIA_NET_SEND(o)}catch{}};
const netOn=(k,f)=>{if(window.AVENTURIA_NET_ON)window.AVENTURIA_NET_ON(k,f)};
const isHost=()=>{const n=NETS();return !n||!n.ready||!n.raidHost||n.raidHost===n.id};
const say=m=>{notify(m);netSend({k:'say',m})};
netOn('say',d=>{if(typeof d.m==='string')notify('🌍 '+d.m.slice(0,140))});
netOn('td',d=>{const g=G();if(!g||!TT.a||d.s!==TT.slot||!(d.d>0))return;TT.apply=true;try{g.damageTarget(TT.a,Math.min(d.d,TT_CAP()),0,false)}finally{TT.apply=false}});
netOn('thp',d=>{const g=G();if(!g||!TT.a||d.s!==TT.slot||!(d.h>=0))return;if(d.h<TT.a.hp){TT.apply=true;try{g.damageTarget(TT.a,TT.a.hp-d.h+.01,0,false)}finally{TT.apply=false}}});
netOn('tpos',d=>{if(TT.a&&d.s===TT.slot&&!isHost())TT.tpos={x:+d.x,y:+d.y}});
const TT_CAP=()=>TIT_HP*.2;
function spawnTitan(g,s,slot){
 const kinds=hostileKinds(),kind=kinds[kinds.length-1-Math.floor(hr(slot,50)*Math.min(3,kinds.length))];
 for(let i=0;i<20;i++){
  const an=hr(slot,60+i)*TAU,d=900+hr(slot,90+i)*700,x=CXW+Math.cos(an)*d,y=CXW+Math.sin(an)*d;
  if(x<300||y<300||x>3700||y>3700)continue;if(g.pondAt&&g.pondAt(x,y,70))continue;
  const a=g.spawnAnimal(kind,x,y,{mult:1});
  makeBoss(g,a,{name:'Titã Colossal',pow:1.5,sz:3.2,hp:TIT_HP,addKind:kind,cap:8,col:'#f43f5e',big:true});
  a.ins=false;a.titan=true;a.hx=x;a.hy=y;TT.a=a;TT.slot=slot;TT.tpos=null;TT.dmgOut=0;M().wb.dmg=0;M().wb.joined=slot;
  notify('🗿 O TITÃ COLOSSAL despertou no mapa — para todos os jogadores! Siga a seta vermelha. Dano combinado derruba o Titã.','#f43f5e');
  g.shake&&g.shake(8,.8);return true;
 }
 return false;
}
function titanTick(g,s,now,dt){
 const p=g.player;if(!p||p.realmId||INS.on)return;
 const info=titanInfo(now),T=TT;
 if(T.a){
  const gone=!g.animals.includes(T.a);
  if(gone||T.a.hp<=0||!info.up||info.slot!==T.slot){
   const m=M(),dmg=m.wb.dmg,need=TIT_HP*.03,killed=gone||T.a.hp<=0;
   if(killed&&info.slot===T.slot){
    if(dmg>=need){
     const gold=2500+lvl()*120,dia=8+ri(0,4);s.gold=(s.gold||0)+gold;s.resources??={};s.resources.diamond=(s.resources.diamond||0)+dia;
     try{giveItem(genItem(null,Math.min(4,3+ri(0,1)),lvl(),'forest',true))}catch{}
     m.wb.kills++;warPoints(40);notify('🗿 TITÃ DERROTADO! Sua participação: +'+gold+' Gold, +'+dia+' Diamantes e um item raro!','#fde047');g.shake&&g.shake(10,1);upd();persist();
    }else notify('🗿 O Titã caiu, mas sua participação foi baixa demais para recompensa (mínimo 3% da vida dele).');
    T.doneSlot=T.slot;
   }else{if(!gone)g.animals.splice(g.animals.indexOf(T.a),1);notify('🗿 O Titã voltou a dormir… Ele retornará em breve.')}
   T.a=null;T.tpos=null;return;
  }
  // sincronização com os outros jogadores
  T.sendT-=dt;T.hpT-=dt;T.posT-=dt;
  if(T.sendT<=0&&T.dmgOut>0){T.sendT=.5;netSend({k:'td',s:T.slot,d:Math.round(T.dmgOut)});T.dmgOut=0}
  if(T.hpT<=0){T.hpT=4;netSend({k:'thp',s:T.slot,h:Math.round(T.a.hp)})}
  if(isHost()){if(T.posT<=0){T.posT=.35;netSend({k:'tpos',s:T.slot,x:Math.round(T.a.x),y:Math.round(T.a.y)})}}
  else if(T.tpos){T.a.x+=(T.tpos.x-T.a.x)*.3;T.a.y+=(T.tpos.y-T.a.y)*.3}
  if(Math.hypot(p.x-T.a.x,p.y-T.a.y)<900&&p.inSafeZone!==true)bossTick(g,T.a,Math.min(.1,dt));
  return;
 }
 if(info.up&&info.slot!==T.doneSlot&&!g.animals.some(a=>a.titan)){spawnTitan(g,s,info.slot)}
}

/* ============================================================================
   CLIMA PERIGOSO: erupções no Vulcão e neblina espessa no Pântano
   ========================================================================== */
const WX={next:0,told:{},fog:0};
function hazardWeather(g,s,dt,now){
 const p=g.player;if(!p||p.realmId||p.inSafeZone===true){WX.fog=Math.max(0,WX.fog-dt*.8);return}
 const bio=p.biome;
 WX.fog=Math.max(0,Math.min(1,WX.fog+(bio==='swamp'?dt*.5:-dt*.8)));
 if(bio==='swamp'&&!WX.told.swamp){WX.told.swamp=1;notify('🌫️ Neblina espessa cobre o pântano: você só enxerga de perto!')}
 if(bio==='volcano'){
  if(!WX.told.volcano){WX.told.volcano=1;notify('🌋 O vulcão ruge! Fique atento às bombas de lava (círculos no chão).')}
  if(now>WX.next){WX.next=now+rnd(8000,13000);g.shake&&g.shake(4,.5);
   const n=3+ri(0,3);for(let i=0;i<n;i++){const an=rnd(0,TAU),d=rnd(40,260);hazard(g,p.x+Math.cos(an)*d,p.y+Math.sin(an)*d,56,1.5+i*.15,5+lvl()*1.2,'#f97316','249,115,22','Erupção')}}
 }
}
function drawOverlays(g){
 const c=g.ctx,W=g.canvas.width,H=g.canvas.height,p=g.player;if(!c||!p)return;
 if(WX.fog>.02&&!p.realmId){
  c.save();c.setTransform(1,0,0,1,0,0);const r=Math.min(W,H)*.2;
  const gr=c.createRadialGradient(W/2,H/2,r*.6,W/2,H/2,Math.max(W,H)*.62);gr.addColorStop(0,'rgba(120,150,130,0)');gr.addColorStop(.45,'rgba(120,150,130,'+(.55*WX.fog)+')');gr.addColorStop(1,'rgba(98,125,108,'+(.93*WX.fog)+')');
  c.fillStyle=gr;c.fillRect(0,0,W,H);c.restore();
 }
 if(INS.on){ // atmosfera de calabouço
  c.save();c.setTransform(1,0,0,1,0,0);
  const gr=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.28,W/2,H/2,Math.max(W,H)*.7);
  gr.addColorStop(0,'rgba(10,6,25,0)');gr.addColorStop(1,'rgba(6,3,18,.82)');c.fillStyle=gr;c.fillRect(0,0,W,H);c.restore();
 }
 // elementos no mundo (baú, seta do Titã, boia de pesca)
 const camX=Math.round(p.x-W/2+(g._shx||0)),camY=Math.round(p.y-H/2+(g._shy||0)),now=performance.now();
 c.save();c.translate(-camX,-camY);
 if(INS.on&&INS.chest){const ch=INS.chest,pu=.5+.5*Math.sin(now/200);c.fillStyle='rgba(253,224,71,'+(.12+.14*pu)+')';c.beginPath();c.arc(ch.x,ch.y,50+8*pu,0,TAU);c.fill();c.font='34px serif';c.textAlign='center';c.fillText('📦',ch.x,ch.y+12)}
 if(TT.a&&!p.realmId){
  const t=TT.a,d=Math.hypot(t.x-p.x,t.y-p.y);
  if(d>420){const an=Math.atan2(t.y-p.y,t.x-p.x);c.save();c.translate(p.x+Math.cos(an)*150,p.y+Math.sin(an)*150);c.rotate(an);c.fillStyle='rgba(244,63,94,.95)';c.beginPath();c.moveTo(16,0);c.lineTo(-8,-10);c.lineTo(-8,10);c.closePath();c.fill();c.restore()}
  else{const pc=Math.max(0,t.hp/t.maxHp);c.fillStyle='rgba(8,10,20,.8)';c.fillRect(t.x-90,t.y-t.def.sz-78,180,12);c.fillStyle='#f43f5e';c.fillRect(t.x-88,t.y-t.def.sz-76,176*pc,8)}
 }
 try{const NS=window.AVENTURIA_NET_STATE;if(NS&&NS.players&&window.AVENTURIA_DRAW_MOUNT&&!p.realmId)for(const q of NS.players.values()){if(q.mnt&&Math.abs(q.x-p.x)<W/2+80&&Math.abs(q.y-p.y)<H/2+80)window.AVENTURIA_DRAW_MOUNT(c,q,now)}}catch(e){}
 if(FISH.state!=='idle'&&FISH.pos){const f=FISH.pos,bob=Math.sin(now/200)*2;c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1;c.beginPath();c.moveTo(p.x,p.y-10);c.quadraticCurveTo((p.x+f.x)/2,Math.min(p.y,f.y)-30,f.x,f.y+bob);c.stroke();
  c.fillStyle=FISH.state==='bite'?'#ef4444':'#fff';c.beginPath();c.arc(f.x,f.y+bob,4,0,TAU);c.fill();
  if(FISH.state==='bite'){c.font='bold 20px Inter';c.textAlign='center';c.fillStyle='#fde047';c.fillText('!',f.x,f.y-14)}}
 c.restore();
}

/* ============================================================================
   PESCA (tecla N perto da água) e CULINÁRIA
   ========================================================================== */
const FISHES=[
 {id:'sardine',n:'Sardinha',icon:'🐟',w:50,v:12,rare:0},
 {id:'trout',n:'Truta',icon:'🐟',w:30,v:25,rare:0},
 {id:'salmon',n:'Salmão',icon:'🍣',w:14,v:55,rare:1},
 {id:'moonfish',n:'Peixe-Lua',icon:'🌙',w:5,v:140,rare:2},
 {id:'goldcarp',n:'Carpa Dourada',icon:'👑',w:1.5,v:400,rare:3},
 {id:'magmafish',n:'Peixe de Magma',icon:'🔥',w:0,v:120,rare:2,lava:1},
 {id:'icefish',n:'Peixe de Gelo',icon:'❄️',w:0,v:90,rare:1,ice:1}
];
const FISH={state:'idle',t:0,pos:null,pond:null};
function rollFish(pond){
 const pool=FISHES.filter(f=>pond.kind==='lava'?(f.lava||f.rare>=2):pond.kind==='ice'?(f.ice||f.w>0):f.w>0);
 const wts=pool.map(f=>f.lava&&pond.kind==='lava'?25:f.ice&&pond.kind==='ice'?22:f.w||8),tot=wts.reduce((a,b)=>a+b,0);
 let r=Math.random()*tot;for(let i=0;i<pool.length;i++){r-=wts[i];if(r<=0)return pool[i]}return pool[0];
}
function fishAction(){
 const g=G(),s=S();if(!g||!g.running||!g.player||!s)return;
 if(INS.on||g.player.realmId)return;
 const p=g.player,m=M();
 if(FISH.state==='idle'){
  const pond=g.pondAt&&g.pondAt(p.x,p.y,90);
  if(!pond){notify('🎣 Chegue perto de um lago ou rio e aperte N para pescar.');return}
  const an=Math.atan2(pond.y-p.y,pond.x-p.x),d=Math.max(20,Math.hypot(pond.x-p.x,pond.y-p.y)-pond.r*.4);
  FISH.pos={x:p.x+Math.cos(an)*Math.min(d,pond.r+40),y:p.y+Math.sin(an)*Math.min(d,pond.r+40)};
  FISH.state='wait';FISH.t=rnd(2,4.5);FISH.pond=pond;notify('🎣 Lançou a linha… espere a fisgada!');
 }else if(FISH.state==='wait'){FISH.state='idle';notify('Você puxou cedo demais. O peixe fugiu.')}
 else if(FISH.state==='bite'){
  const f=rollFish(FISH.pond);m.fish.inv[f.id]=(m.fish.inv[f.id]||0)+1;m.fish.caught++;
  const xp=6+f.rare*10;g.gainExp&&g.gainExp(xp);s.resources??={};s.resources.fish=(s.resources.fish||0)+1;
  g.floatText&&g.floatText(p.x,p.y-40,f.icon+' '+f.n,f.rare>=2?'#fde047':'#7dd3fc');
  notify(f.icon+' Você pescou: '+f.n+(f.rare>=2?' (raro!)':'')+'!',f.rare>=2?'#fde047':'#7dd3fc');
  if(f.rare>(FISHES.find(x=>x.id===m.fish.best)||{rare:-1}).rare)m.fish.best=f.id;
  storyProgress();persist();FISH.state='idle';
 }
}
function fishTick(g,dt){
 if(FISH.state==='idle')return;
 const p=g.player;if(!p||p.realmId||Math.hypot(p.x-FISH.pos.x,p.y-FISH.pos.y)>260){FISH.state='idle';return}
 FISH.t-=dt;
 if(FISH.state==='wait'&&FISH.t<=0){FISH.state='bite';FISH.t=1.3;notify('❗ Fisgou! Aperte N agora!','#fde047')}
 else if(FISH.state==='bite'&&FISH.t<=0){FISH.state='idle';notify('O peixe escapou…')}
}
const RECIPES=[
 {id:'grill',n:'Peixe Grelhado',icon:'🍤',desc:'Regenera 1,2% de vida por segundo por 5 min.',need:{any:2},dur:300,buff:{regen:1.2}},
 {id:'stew',n:'Ensopado do Pescador',icon:'🍲',desc:'+8 de ataque e +6 de defesa por 5 min.',need:{any:3},dur:300,buff:{atk:8,def:6}},
 {id:'feast',n:'Banquete Real',icon:'🍱',desc:'+25% ouro/XP e +10 de poder por 8 min.',need:{any:5,rare:1},dur:480,buff:{mul:1.25,power:10}},
 {id:'moon',n:'Prato da Lua',icon:'🌕',desc:'+20 de ataque, +12 vel. e +40 vida por 10 min.',need:{any:4,rare:2},dur:600,buff:{atk:20,speed:12,hp:40}}
];
function fishCounts(){
 const m=M(),inv=m.fish.inv;let any=0,r1=0,r2=0;
 for(const f of FISHES){const n=inv[f.id]||0;any+=n;if(f.rare>=1)r1+=n;if(f.rare>=2)r2+=n}
 return {any,rare1:r1,rare2:r2};
}
function consumeFish(need){
 const m=M(),inv=m.fish.inv;
 // consome primeiro as comuns; exige 'rare' peixes de raridade >= 1 (ou 2 para o Prato da Lua)
 const minRare=need.minRare||1;let req=need.rare||0;
 const order=[...FISHES].sort((a,b)=>b.rare-a.rare);
 for(const f of order){while(req>0&&f.rare>=minRare&&(inv[f.id]||0)>0){inv[f.id]--;req--}}
 let left=need.any-(need.rare||0);const common=[...FISHES].sort((a,b)=>a.rare-b.rare);
 for(const f of common){while(left>0&&(inv[f.id]||0)>0){inv[f.id]--;left--}}
}
function cookCan(r){const c=fishCounts(),n=r.need;return c.any>=n.any&&(!n.rare||(r.id==='moon'?c.rare2:c.rare1)>=n.rare)}
function cookBuff(){const m=M();const b=m&&m.cook.buff;return b&&b.until>Date.now()?b:null}
function openCookUI(){
 const m=M(),s=S();if(!m||!s)return;const c=fishCounts(),b=cookBuff();
 const inv=FISHES.filter(f=>(m.fish.inv[f.id]||0)>0).map(f=>f.icon+' '+f.n+' ×'+m.fish.inv[f.id]).join(' · ')||'<i>nenhum peixe ainda</i>';
 const value=FISHES.reduce((t,f)=>t+(m.fish.inv[f.id]||0)*f.v,0);
 modal('mg-cook',head('🍳 Chef & Pescador')+
  '<p class="mg-sub">Pesque com <b>N</b> perto da água (lagos, rios, lava e gelo têm peixes diferentes). Cozinhe pratos com buffs ou venda o peixe.</p>'+
  '<p style="font-size:13px;margin:8px 0"><b>Seu estoque:</b> '+inv+'</p>'+
  (b?'<p style="color:#86efac;font-size:12px">✅ Prato ativo: <b>'+b.name+'</b> · '+Math.ceil((b.until-Date.now())/1000)+'s</p>':'')+
  RECIPES.map(r=>'<div class="mg-row"><span style="font-size:26px">'+r.icon+'</span><div class="mg-grow"><b>'+r.n+'</b><div class="mg-sub">'+r.desc+'</div><div class="mg-sub">Requer '+r.need.any+' peixe(s)'+(r.need.rare?' (ao menos '+r.need.rare+' '+(r.id==='moon'?'muito raro(s)':'raro(s)')+')':'')+'</div></div><button class="mg-btn" data-cook="'+r.id+'" '+(cookCan(r)?'':'disabled')+'>Cozinhar</button></div>').join('')+
  '<div class="mg-row"><span style="font-size:24px">💰</span><div class="mg-grow"><b>Vender todos os peixes</b><div class="mg-sub">Valor total: '+value+' Gold</div></div><button class="mg-btn alt" id="mg-sellfish" '+(value?'':'disabled')+'>Vender</button></div>'+
  '<p class="mg-sub" style="margin-top:8px">Pescados: '+m.fish.caught+' · Pratos feitos: '+m.fish.cooked+'</p>');
 $('mg-sellfish').onclick=()=>{const v=FISHES.reduce((t,f)=>t+(m.fish.inv[f.id]||0)*f.v,0);if(!v)return;s.gold=(s.gold||0)+v;m.fish.inv={};notify('💰 Peixes vendidos: +'+v+' Gold');upd();persist();openCookUI()};
 document.querySelectorAll('[data-cook]').forEach(btn=>btn.onclick=()=>{
  const r=RECIPES.find(x=>x.id===btn.dataset.cook);if(!r||!cookCan(r))return;
  consumeFish(Object.assign({minRare:r.id==='moon'?2:1},r.need));
  m.cook.buff={id:r.id,name:r.icon+' '+r.n,until:Date.now()+r.dur*1000,...r.buff};m.fish.cooked++;
  notify(r.icon+' '+r.n+' pronto! '+r.desc,'#fde047');storyProgress();persist();upd();openCookUI();
 });
}

/* ============================================================================
   LEILÃO (compradores viajantes) · GUERRA DE GUILDAS · PRESTÍGIO
   ========================================================================== */
function itemName(it){try{return RARITY[it.rar].n+' '+it.name}catch{return it.name}}
function openMarketUI(){
 const m=M(),s=S();if(!m||!s)return;
 const L=m.market.listings,inv=(s.inventory||[]).slice().sort((a,b)=>b.rar-a.rar||b.ilvl-a.ilvl).slice(0,12);
 modal('mg-market',head('⚖️ Casa de Leilões')+
  '<p class="mg-sub">Liste um item e <b>compradores viajantes</b> farão ofertas com o tempo. Preço alto demais = venda demorada ou item devolvido. Taxa da casa: 8%.</p>'+
  '<div class="mg-row"><div class="mg-grow"><b>Caixa de vendas</b><div class="mg-sub">Pronto para sacar: <b>'+Math.floor(m.market.cash)+' Gold</b> · Vendas: '+m.market.sold+' · Total ganho: '+Math.floor(m.market.earned)+'</div></div><button class="mg-btn" id="mg-cash" '+(m.market.cash>0?'':'disabled')+'>Sacar</button></div>'+
  '<h3>📦 Seus anúncios ('+L.length+'/5)</h3>'+(L.length?L.map((l,i)=>'<div class="mg-row"><div class="mg-grow"><b style="color:'+((RARITY[l.item.rar]||{}).c||'#fff')+'">'+itemName(l.item)+'</b><div class="mg-sub">Preço '+l.price+' G · expira em '+Math.max(0,Math.ceil((l.until-Date.now())/1000))+'s</div></div><button class="mg-btn warn" data-cancel="'+i+'">Retirar</button></div>').join(''):'<div class="mg-sub">Nenhum anúncio ativo.</div>')+
  '<h3>🎒 Anunciar item da mochila</h3>'+(inv.length?inv.map(it=>{const v=it.sell||10;return '<div class="mg-row"><div class="mg-grow"><b style="color:'+((RARITY[it.rar]||{}).c||'#fff')+'">'+itemName(it)+'</b><div class="mg-sub">Nv '+it.ilvl+' · valor base '+v+' G</div></div>'+[[2,'Rápido'],[3,'Justo'],[4.5,'Ousado']].map(([k,l])=>'<button class="mg-btn alt" data-list="'+it.id+'|'+k+'" '+(L.length>=5?'disabled':'')+' title="'+l+'">'+Math.round(v*k)+' G</button>').join('')+'</div>'}).join(''):'<div class="mg-sub">Sua mochila está vazia.</div>'));
 $('mg-cash').onclick=()=>{s.gold=(s.gold||0)+Math.floor(m.market.cash);notify('💰 Sacou '+Math.floor(m.market.cash)+' Gold do leilão.');m.market.cash=0;upd();persist();openMarketUI()};
 document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{const l=L.splice(+b.dataset.cancel,1)[0];if(l)s.inventory.push(l.item);persist();openMarketUI()});
 document.querySelectorAll('[data-list]').forEach(b=>b.onclick=()=>{
  const [id,k]=b.dataset.list.split('|'),i=s.inventory.findIndex(x=>String(x.id)===id);if(i<0||L.length>=5)return;
  const it=s.inventory.splice(i,1)[0],price=Math.round((it.sell||10)*(+k)),chance=+k<=2?.95:+k<=3?.75:.45;
  L.push({item:it,price,chance,at:Date.now()+ri(15,45)*1000,until:Date.now()+150000});notify('⚖️ '+itemName(it)+' anunciado por '+price+' G.');persist();openMarketUI();
 });
}
function marketTick(){
 const m=M();if(!m)return;const L=m.market.listings,s=S(),now=Date.now();
 for(let i=L.length-1;i>=0;i--){
  const l=L[i];
  if(now>=l.at&&!l.checked){l.checked=true;
   if(Math.random()<l.chance){const net=Math.round(l.price*.92);m.market.cash+=net;m.market.sold++;m.market.earned+=net;L.splice(i,1);notify('⚖️ Um comprador levou '+itemName(l.item)+' por '+l.price+' G ('+net+' líquidos). Saque no Leiloeiro!','#86efac');persist()}
  }else if(now>l.until){L.splice(i,1);s.inventory.push(l.item);notify('⚖️ Ninguém quis '+itemName(l.item)+'. Item devolvido à mochila.');persist()}
 }
}
function warPoints(n){const m=M();if(m)m.war.points+=n}
const TERRS=[
 {id:'north',n:'Forte do Norte',icon:'🏰',cost:40,pow:140,bonus:'+8% ouro/XP',eff:{mul:1.08}},
 {id:'east',n:'Mina Leste',icon:'⛏️',cost:60,pow:220,bonus:'+6 ataque',eff:{atk:6}},
 {id:'south',n:'Porto Sul',icon:'⚓',cost:90,pow:320,bonus:'+60 vida e +6 vel.',eff:{hp:60,speed:6}}
];
function guildName(){const s=S(),g=s&&s.expansion&&s.expansion.world&&s.expansion.world.guild;return g?(typeof g==='string'?g:(g.name||'Sua guilda')):null}
function terrOwned(id){const t=M().war.terr[id];return t&&t.own&&t.until>Date.now()}
function openWarUI(){
 const m=M(),s=S();if(!m||!s)return;const gn=guildName();
 modal('mg-war',head('⚔️ General de Guerra')+
  '<p class="mg-sub">Territórios disputados por guildas rivais. Ganhe <b>Pontos de Guerra</b> derrotando feras (+1), Elites (+8), chefes e Titã. Conquistar um território dá bônus por 20 minutos.</p>'+
  '<div class="mg-row"><div class="mg-grow"><b>'+(gn?'🛡 Guilda: '+gn:'Sem guilda')+'</b><div class="mg-sub">'+(gn?'Você combate em nome dela.':'Entre em uma guilda com o Mestre das Guildas para conquistar territórios.')+'</div></div><div><b style="font-size:18px">'+m.war.points+'</b><div class="mg-sub">pontos</div></div></div>'+
  TERRS.map(t=>{const own=terrOwned(t.id),st=m.war.terr[t.id];
   return '<div class="mg-row"><span style="font-size:26px">'+t.icon+'</span><div class="mg-grow"><b>'+t.n+'</b> <span class="mg-sub">'+t.bonus+'</span><div class="mg-sub">'+(own?'✅ Sua guilda controla · '+Math.ceil((st.until-Date.now())/60000)+' min':'🏴 Guilda rival no controle · poder '+t.pow)+'</div></div><button class="mg-btn" data-atk="'+t.id+'" '+(own||!gn||m.war.points<t.cost?'disabled':'')+'>Atacar · '+t.cost+' pts</button></div>'}).join('')+
  '<p class="mg-sub" style="margin-top:8px">Vitórias: '+m.war.wins+' · Chance de vitória depende do seu ataque + defesa + nível.</p>');
 document.querySelectorAll('[data-atk]').forEach(b=>b.onclick=()=>{
  const t=TERRS.find(x=>x.id===b.dataset.atk);if(!t||m.war.points<t.cost||!guildName())return;
  const st=(window.getRPGStats&&window.getRPGStats())||{},power=(st.atk||0)+(st.def||0)+lvl()*3,chance=Math.max(.2,Math.min(.9,.25+power/(t.pow*1.5)));
  m.war.points-=t.cost;
  if(Math.random()<chance){m.war.terr[t.id]={own:true,until:Date.now()+20*60000};m.war.wins++;notify('🏆 '+t.n+' conquistado! '+t.bonus+' por 20 minutos.','#fde047');const g=G();g&&g.shake&&g.shake(6,.5);s.gold=(s.gold||0)+200+lvl()*10;upd()}
  else notify('💀 Seu ataque a '+t.n+' falhou ('+Math.round(chance*100)+'% de chance). Tente de novo!','#fca5a5');
  persist();openWarUI();
 });
}
function warTick(){
 const m=M();if(!m)return;
 for(const t of TERRS){const st=m.war.terr[t.id];if(st.own&&st.until<=Date.now()){st.own=false;notify('🏴 '+t.n+' foi retomado pela guilda rival.')}}
}
const PERKS=[
 {id:'atk',n:'Força Renascida',desc:'+3 ataque por nível',max:10,cost:1},
 {id:'hp',n:'Vitalidade Antiga',desc:'+20 vida por nível',max:10,cost:1},
 {id:'xp',n:'Sabedoria',desc:'+4% XP por nível',max:10,cost:1},
 {id:'gold',n:'Fortuna',desc:'+4% ouro por nível',max:10,cost:1},
 {id:'spd',n:'Pés Alados',desc:'+2 velocidade por nível',max:5,cost:2}
];
function openPrestigeUI(){
 const m=M(),s=S();if(!m||!s)return;const P=m.prestige,cap=typeof LEVEL_CAP!=='undefined'?LEVEL_CAP:50,can=lvl()>=cap;
 modal('mg-prestige',head('♾️ Anciã do Renascimento')+
  '<p class="mg-sub">No nível máximo ('+cap+') você pode <b>renascer</b>: volta ao nível 1 e ganha <b>2 Pontos de Prestígio</b> para bônus <b>permanentes</b>. Ouro, itens, montarias e conquistas permanecem.</p>'+
  '<div class="mg-row"><div class="mg-grow"><b>Renascimentos: '+P.count+'</b>'+(P.count?' <span style="color:#fde047">★'.repeat(Math.min(P.count,10))+'</span>':'')+'<div class="mg-sub">Pontos disponíveis: <b>'+P.points+'</b></div></div><button class="mg-btn warn" id="mg-reborn" '+(can?'':'disabled')+'>Renascer'+(can?'':' (Nv '+cap+')')+'</button></div>'+
  '<h3>🔱 Bônus permanentes</h3>'+PERKS.map(p=>'<div class="mg-row"><div class="mg-grow"><b>'+p.n+'</b> <span class="mg-sub">nível '+(P.spent[p.id]||0)+'/'+p.max+'</span><div class="mg-sub">'+p.desc+'</div></div><button class="mg-btn" data-perk="'+p.id+'" '+((P.spent[p.id]||0)>=p.max||P.points<p.cost?'disabled':'')+'>+1 · '+p.cost+' pt</button></div>').join(''));
 $('mg-reborn').onclick=()=>{
  if(lvl()<cap)return;if(!confirm('Renascer volta você ao nível 1 e zera seus pontos de habilidade (você ganha 2 Pontos de Prestígio). Continuar?'))return;
  const ci=(typeof CLASS_INFO!=='undefined'&&CLASS_INFO[s.className])||{hp:100};
  s.level=1;s.exp=0;s.maxExp=(typeof xpNeed==='function')?xpNeed(1):120;s.maxHp=ci.hp||100;s.skills={strength:0,vitality:0,wisdom:0,agility:0};s.skillPoints=3;
  const w=s.expansion&&s.expansion.world;if(w){w.skills={};w.spent=0}
  P.count++;P.points+=2;say('♾️ '+(s.name||'Um herói')+' renasceu pela '+(P.count)+'ª vez!');try{s.hp=s.maxHp}catch{}
  if(s.expansion)s.expansion.title='reborn';
  notify('♾️ RENASCIMENTO '+P.count+'! Você recomeça mais forte. +2 Pontos de Prestígio.','#fde047');const g=G();g&&g.shake&&g.shake(8,.8);upd();persist();openPrestigeUI();
 };
 document.querySelectorAll('[data-perk]').forEach(b=>b.onclick=()=>{
  const p=PERKS.find(x=>x.id===b.dataset.perk);if(!p||(P.spent[p.id]||0)>=p.max||P.points<p.cost)return;
  P.points-=p.cost;P.spent[p.id]=(P.spent[p.id]||0)+1;persist();upd();openPrestigeUI();
 });
}

/* ---------- bônus combinados (prestígio, territórios, histórias, prato ativo) ---------- */
window.AVENTURIA_EXTRA_STATS=()=>{
 const m=M();if(!m)return null;const o={atk:0,hp:0,def:0,power:0,speed:0},P=m.prestige.spent,b=cookBuff();
 o.atk+=(P.atk||0)*3+m.story.bonus.atk;o.hp+=(P.hp||0)*20+m.story.bonus.hp;o.speed+=(P.spd||0)*2;
 for(const t of TERRS)if(terrOwned(t.id)){const e=t.eff;o.atk+=e.atk||0;o.hp+=e.hp||0;o.speed+=e.speed||0}
 if(b){o.atk+=b.atk||0;o.def+=b.def||0;o.power+=b.power||0;o.speed+=b.speed||0;o.hp+=b.hp||0}
 return o;
};
window.AVENTURIA_MEGA_MUL=()=>{
 const m=M();if(!m)return 1;let k=1+(m.prestige.spent.xp||0)*.04;
 k*=1+(m.prestige.spent.gold||0)*.04+m.story.bonus.gold/100;
 for(const t of TERRS)if(terrOwned(t.id)&&t.eff.mul)k*=t.eff.mul;
 const b=cookBuff();if(b&&b.mul)k*=b.mul;return k;
};
function regenTick(g,s,dt){
 const b=cookBuff();if(!b||!b.regen||s.hp<=0)return;
 const cap=(s.maxHp||100)+((window.getRPGStats&&window.getRPGStats().hp)||0);if(s.hp<cap){s.hp=Math.min(cap,s.hp+cap*b.regen/100*dt)}
}

/* ============================================================================
   HISTÓRIAS COM ESCOLHAS (Bardo Errante)
   ========================================================================== */
const STORIES=[
 {id:'elder',n:'O Segredo do Ancião',icon:'📜',chapters:[
  {t:'O Bardo sussurra: "Sombras rondam a praça. Antes que eu conte mais, prove que a mata não te assusta: derrote 15 feras."',obj:{type:'kills',n:15,label:'Derrote 15 feras'},
   choices:[{l:'Contar tudo à Guarda',r:'+400 Gold',f:(s)=>{s.gold=(s.gold||0)+400}},{l:'Investigar sozinho',r:'+900 XP',f:(s,g)=>{g.gainExp&&g.gainExp(900)}}]},
  {t:'"As sombras são Elites… criaturas marcadas por uma relíquia. Caçe 2 deles e traga a prova."',obj:{type:'elites',n:2,label:'Derrote 2 monstros Elite'},
   choices:[{l:'Ficar com a relíquia',r:'+3 ataque permanente',f:(s,g,m)=>{m.story.bonus.atk+=3}},{l:'Vender a relíquia',r:'+1000 Gold',f:(s)=>{s.gold=(s.gold||0)+1000}}]},
  {t:'"A relíquia aponta para as Profundezas. Desça à Masmorra e derrote o Guardião; só assim a verdade vem à tona."',obj:{type:'dungeon',n:1,label:'Conclua a Masmorra Subterrânea'},
   choices:[{l:'Libertar o espírito',r:'+30 vida permanente e 3 💎',f:(s,g,m)=>{m.story.bonus.hp+=30;s.resources.diamond=(s.resources.diamond||0)+3}},{l:'Selar o espírito',r:'+6% ouro/XP permanente',f:(s,g,m)=>{m.story.bonus.gold+=6}}]}
 ]},
 {id:'fisher',n:'A Lenda do Pescador',icon:'🎣',chapters:[
  {t:'"Dizem que existe uma Carpa Dourada que realiza desejos. Comece pescando 5 peixes para mostrar paciência."',obj:{type:'fish',n:5,label:'Pesque 5 peixes (tecla N)'},
   choices:[{l:'Dividir com os vilarejos',r:'+700 XP',f:(s,g)=>{g.gainExp&&g.gainExp(700)}},{l:'Guardar para vender',r:'+350 Gold',f:(s)=>{s.gold=(s.gold||0)+350}}]},
  {t:'"Agora cozinhe 3 pratos no Chef para honrar a tradição."',obj:{type:'cook',n:3,label:'Cozinhe 3 pratos'},
   choices:[{l:'Oferecer ao rio',r:'+2 ataque permanente',f:(s,g,m)=>{m.story.bonus.atk+=2}},{l:'Comer o banquete',r:'+25 vida permanente',f:(s,g,m)=>{m.story.bonus.hp+=25}}]},
  {t:'"A prova final: suba até o andar 5 da Torre Infinita, onde o vento carrega a voz da Carpa."',obj:{type:'tower',n:5,label:'Chegue ao andar 5 da Torre'},
   choices:[{l:'Desejar riqueza',r:'+1500 Gold e +5% ouro/XP',f:(s,g,m)=>{s.gold=(s.gold||0)+1500;m.story.bonus.gold+=5}},{l:'Desejar força',r:'+5 ataque e +20 vida permanentes',f:(s,g,m)=>{m.story.bonus.atk+=5;m.story.bonus.hp+=20}}]}
 ]}
];
function storyCounter(type){
 const s=S(),m=M(),e=s.expansion||{};
 return ({kills:s.animalKills||0,elites:e.elitesKilled||0,dungeon:m.dungeon.clears,fish:m.fish.caught,cook:m.fish.cooked,tower:m.tower.best})[type]||0;
}
function storyState(st){const m=M();return m.story.chapter[st.id]??0}
function storyProg(st){
 const m=M(),ch=storyState(st),c=st.chapters[ch];if(!c)return null;
 const key=st.id+':'+ch;if(m.story.start[key]===undefined)m.story.start[key]=(c.obj.type==='tower'?0:storyCounter(c.obj.type));
 const cur=c.obj.type==='tower'?storyCounter('tower'):storyCounter(c.obj.type)-m.story.start[key];
 return {cur:Math.max(0,cur),n:c.obj.n,done:cur>=c.obj.n};
}
function storyProgress(){}
let storyDone=0;
function openStoryUI(){
 const m=M(),s=S();if(!m||!s)return;
 modal('mg-story',head('🎭 Bardo Errante')+'<p class="mg-sub">Histórias em capítulos: cumpra o objetivo e faça uma <b>escolha</b> que muda sua recompensa.</p>'+
  STORIES.map(st=>{
   const ch=storyState(st),c=st.chapters[ch],pr=storyProg(st);
   if(!c)return '<div class="mg-row"><span style="font-size:26px">'+st.icon+'</span><div class="mg-grow"><b>'+st.n+'</b><div class="mg-sub">✅ História concluída. A lenda será contada.</div></div></div>';
   return '<div class="mg-row" style="display:block"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:26px">'+st.icon+'</span><div class="mg-grow"><b>'+st.n+'</b> <span class="mg-sub">Capítulo '+(ch+1)+'/'+st.chapters.length+'</span></div></div><p style="font-size:12px;margin:8px 0;font-style:italic;color:#e8e0c8">'+c.t+'</p><div class="mg-sub">🎯 '+c.obj.label+': <b>'+Math.min(pr.cur,pr.n)+'/'+pr.n+'</b></div>'+
    (pr.done?'<div style="display:grid;gap:6px;margin-top:8px">'+c.choices.map((x,i)=>'<button class="mg-btn" data-choice="'+st.id+'|'+i+'" style="text-align:left">'+x.l+' <span style="opacity:.8;font-weight:400">— '+x.r+'</span></button>').join('')+'</div>':'')+'</div>';
  }).join('')+
  '<p class="mg-sub" style="margin-top:8px">Bônus permanentes de histórias: +'+m.story.bonus.atk+' ataque · +'+m.story.bonus.hp+' vida · +'+m.story.bonus.gold+'% ouro/XP</p>');
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{
  const [id,i]=b.dataset.choice.split('|'),st=STORIES.find(x=>x.id===id),ch=storyState(st),c=st.chapters[ch];if(!c)return;
  const pr=storyProg(st);if(!pr||!pr.done)return;s.resources??={};
  c.choices[+i].f(s,G()||{},m);m.story.chapter[id]=ch+1;notify('🎭 Escolha feita: '+c.choices[+i].l+' ('+c.choices[+i].r+')','#fde047');persist();upd();openStoryUI();
 });
}

/* ============================================================================
   O MONGE DAS PROFUNDEZAS: Masmorra / Torre / Titã
   ========================================================================== */
function openDungeonUI(tab){
 const m=M(),s=S();if(!m||!s)return;tab=tab||openDungeonUI._tab||'dungeon';openDungeonUI._tab=tab;
 const L=lvl();let body='';
 if(tab==='dungeon'){
  body='<p class="mg-sub">5 andares com salas, <b>armadilhas</b>, Elites, um <b>mini-chefe</b> e o <b>Guardião das Profundezas</b> (3 fases). No fim, um baú com Gold, Diamantes e equipamento. Se cair, você sai sem o baú.</p>'+
   '<div class="mg-row"><div class="mg-grow"><b>Recomendado: nível 8+</b><div class="mg-sub">Conclusões: '+m.dungeon.clears+' · Tentativas: '+m.dungeon.runs+(m.dungeon.fastest?' · Recorde: '+m.dungeon.fastest+'s':'')+'</div></div><button class="mg-btn" id="mg-go-d">🕳️ Descer</button></div>';
 }else if(tab==='tower'){
  body='<p class="mg-sub">Ondas cada vez mais fortes, sem fim. A cada 5 andares há um <b>Sentinela</b> (chefe). Recompensas a cada andar; Diamantes nos andares 5, 10, 15…; item raro a cada 10.</p>'+
   '<div class="mg-row"><div class="mg-grow"><b>🏅 Recorde pessoal: andar '+m.tower.best+'</b><div class="mg-sub">Subidas: '+m.tower.runs+' · Próxima marca: andar '+(Math.floor(m.tower.best/5)+1)*5+'</div></div><button class="mg-btn" id="mg-go-t">🗼 Subir</button></div>'+
   '<h3>🏆 Marcos</h3>'+[5,10,15,20,30].map(f=>'<div class="mg-row"><span>'+(m.tower.best>=f?'✅':'⬜')+'</span><div class="mg-grow"><b>Andar '+f+'</b><div class="mg-sub">'+(f%10===0?'Item raro + 3 💎':'+1 💎')+'</div></div></div>').join('');
 }else{
  const info=titanInfo(Date.now()),mins=Math.max(0,Math.ceil((info.up?info.until-Date.now():info.next-Date.now())/60000));
  body='<p class="mg-sub">Um <b>Titã Colossal</b> desperta no mapa aberto a cada 12 minutos e fica 7 minutos — <b>para todos os jogadores ao mesmo tempo, no mesmo lugar e com a vida compartilhada</b>. Todo dano somado derruba o Titã; quem causar ao menos 3% da vida dele recebe a recompensa. Quanto mais gente, mais rápido!</p>'+
   '<div class="mg-row"><div class="mg-grow"><b>'+(TT.a?'🗿 O Titã está desperto!':info.up?'🗿 O Titã despertou (siga a seta)':'🗿 O Titã dorme')+'</b><div class="mg-sub">'+(TT.a?'Vida: '+Math.round(TT.a.hp)+' / '+TIT_HP+' · seu dano: '+Math.round(m.wb.dmg)+' (mínimo '+Math.round(TIT_HP*.03)+')':info.up?'Fora da Área Safe, procure a seta vermelha no mapa. Termina em ~'+mins+' min.':'Desperta de novo em ~'+mins+' min.')+'</div></div></div>'+
   '<div class="mg-sub" style="margin-top:6px">Titãs derrotados por você: '+m.wb.kills+'</div>';
 }
 modal('mg-dungeon',head('🕳️ Guardião das Profundezas')+'<div class="mg-tabs">'+[['dungeon','Masmorra'],['tower','Torre Infinita'],['titan','Titã']].map(([k,l])=>'<div class="mg-tab '+(tab===k?'on':'')+'" data-tab="'+k+'">'+l+'</div>').join('')+'</div>'+body);
 document.querySelectorAll('#mg-dungeon [data-tab]').forEach(t=>t.onclick=()=>openDungeonUI(t.dataset.tab));
 const d=$('mg-go-d');if(d)d.onclick=()=>{if(L<5&&!confirm('Você está abaixo do nível recomendado. Quer descer mesmo assim?'))return;startInstance('dungeon')};
 const t=$('mg-go-t');if(t)t.onclick=()=>startInstance('tower');
 
}

/* ============================================================================
   MINI-MAPA MELHORADO, BOTÕES DE CELULAR, GUIA RÁPIDO
   ========================================================================== */
function minimapExtras(g){
 const m=g.mini;if(!m||!g.player)return;const MAPW=typeof MAP!=='undefined'?MAP:4000,k=160/MAPW,now=performance.now();
 if(g.player.realmId)return;
 for(const n of window.AVENTURIA_SAFE_NPCS||[]){m.fillStyle=n.color||'#fbbf24';m.strokeStyle='#000';m.lineWidth=.6;m.beginPath();m.arc(n.x*k,n.y*k,1.7,0,TAU);m.fill();m.stroke()}
 for(const a of g.animals||[]){if(a.elite&&!a.titan){m.fillStyle='#ef4444';m.fillRect(a.x*k-1.5,a.y*k-1.5,3,3)}}
 const sp=window.AVENTURIA_EVENT_STATE&&window.AVENTURIA_EVENT_STATE().spot;
 if(sp){m.fillStyle='#fde047';m.strokeStyle='#000';m.lineWidth=1;const x=sp.x*k,y=sp.y*k;m.beginPath();m.rect(x-3,y-3,6,6);m.fill();m.stroke()}
 if(TT.a){const x=TT.a.x*k,y=TT.a.y*k,pu=2+Math.sin(now/200)*1.2;m.fillStyle='#f43f5e';m.strokeStyle='#fff';m.lineWidth=1;m.beginPath();m.arc(x,y,4+pu,0,TAU);m.fill();m.stroke()}
}
let bigMap=false;
function toggleMap(){
 const c=$('minimap');if(!c)return;bigMap=!bigMap;
 c.style.cssText=bigMap?'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(86vmin,560px);height:min(86vmin,560px);z-index:9999;border:3px solid #c6a66a;border-radius:14px;box-shadow:0 0 0 100vmax #000a;image-rendering:pixelated':'';
 if(!bigMap)c.style.cssText='width:160px;height:160px;border-radius:10px';
}
function buildTouch(){
 let box=$('mg-touch');if(box)return;
 box=document.createElement('div');box.id='mg-touch';
 const btns=[['🔥','Fúria',()=>window.AVENTURIA_CAST_ULT&&window.AVENTURIA_CAST_ULT()],['🐎','Montaria',()=>window.AVENTURIA_TOGGLE_MOUNT&&window.AVENTURIA_TOGGLE_MOUNT()],['🧪','Poção',()=>window.usePotion&&window.usePotion()],['🎣','Pescar',fishAction],['🗺️','Mapa',toggleMap],['❓','Guia',()=>openGuide(0)]];
 for(const [i,t,f] of btns){const b=document.createElement('button');b.textContent=i;b.title=t;b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();f()});box.appendChild(b)}
 document.body.appendChild(box);
 const touch=('ontouchstart' in window)||(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||/[?&]mobile=1/.test(location.search);
 box.style.display=touch?'flex':'none';
}
const GUIDE=[
 {t:'Bem-vindo a Aventuria!',b:'Explore, cace, construa e evolua. A <b>Área Safe</b> no centro é sua cidade: lá ficam todos os NPCs, e nenhuma fera ataca você.'},
 {t:'Movimento e combate',b:'<b>WASD</b> ou setas movem · <b>clique/botão</b> ataca · <b>F</b> habilidade de classe · <b>Q</b> magia equipada · <b>Espaço/Shift</b> esquiva (conforme sua versão) · <b>H</b> poção.'},
 {t:'NPCs e serviços',b:'Chegue perto de um NPC e aperte <b>E</b> (ou o botão na tela). Mercado, forja, magias, mascotes, guildas, missões, <b>Cronista</b> (login diário e títulos) e muito mais.'},
 {t:'Montarias e Fúria',b:'<b>Z</b> monta/desmonta · <b>X</b> libera a <b>Fúria Desperta</b> (a barra enche com abates; Elites ☠ enchem mais).'},
 {t:'Masmorra, Torre e Titã',b:'Fale com o <b>Guardião das Profundezas</b>: Masmorra de 5 andares, Torre Infinita e o <b>Titã Colossal</b> que desperta no mapa.'},
 {t:'Pesca, cozinha e leilão',b:'<b>N</b> perto da água pesca · o <b>Chef</b> cozinha pratos com buffs · o <b>Leiloeiro</b> vende seus itens · o <b>General</b> lidera a guerra de guildas.'},
 {t:'Mapa e atalhos',b:'<b>M</b> amplia o mini-mapa (NPCs, Elites, baú caído, Titã) · <b>F1</b> ou <b>?</b> reabre este guia · <b>Esc</b> fecha janelas · <b>B</b> construção · <b>C</b> criação · <b>P</b> personagem.'},
 {t:'Perigos do mundo',b:'No <b>Vulcão</b> caem bombas de lava; no <b>Pântano</b> a neblina esconde monstros; à noite as feras ficam mais fortes (mas rendem mais). Fique de olho nos <b>acontecimentos</b> que surgem no topo da tela!'}
];
function openGuide(i){
 i=Math.max(0,Math.min(GUIDE.length-1,i||0));const g=GUIDE[i];
 modal('mg-guide',head('📘 Guia rápido <span class="mg-sub" style="font-weight:400">'+(i+1)+'/'+GUIDE.length+'</span>')+'<h3 style="font-size:16px">'+g.t+'</h3><p style="font-size:14px;line-height:1.5;margin:8px 0 14px">'+g.b+'</p><div style="display:flex;justify-content:space-between"><button class="mg-btn alt" id="mg-prev" '+(i?'':'disabled')+'>← Anterior</button><button class="mg-btn" id="mg-next">'+(i===GUIDE.length-1?'Começar!':'Próximo →')+'</button></div>');
 $('mg-prev').onclick=()=>openGuide(i-1);$('mg-next').onclick=()=>{if(i===GUIDE.length-1){$('mg-guide').remove()}else openGuide(i+1)};
}
window.addEventListener('keydown',e=>{
 if(inputBusy(e)||!G()||!G().running)return;
 if(e.code==='KeyN'&&!e.repeat){fishAction()}
 else if(e.code==='KeyM'&&!e.repeat){toggleMap()}
 else if((e.code==='F1'||(e.key==='?'))&&!e.repeat){e.preventDefault();$('mg-guide')?$('mg-guide').remove():openGuide(0)}
});

/* ============================================================================
   NPCs NOVOS NA PRAÇA + GANCHOS NO JOGO
   ========================================================================== */
const NEW_NPCS=[
 {id:'dungeon',name:'Guardião das Profundezas',role:'Masmorra, Torre e Titã',x:CXW-210,y:CXW-215,icon:'🕳️',color:'#8b7bea',greet:'Lá embaixo, só os bravos voltam.',open:()=>openDungeonUI()},
 {id:'market',name:'Leiloeiro',role:'Venda itens por Gold',x:CXW+210,y:CXW-215,icon:'⚖️',color:'#e0b84f',greet:'Itens bons, preços melhores.',open:()=>openMarketUI()},
 {id:'cook',name:'Chef & Pescador',role:'Pesca e culinária',x:CXW-215,y:CXW+215,icon:'🍳',color:'#6ec1d6',greet:'Pescou algo hoje?',open:()=>openCookUI()},
 {id:'war',name:'General de Guerra',role:'Guerra de guildas',x:CXW+215,y:CXW+215,icon:'⚔️',color:'#d1604d',greet:'Território não se ganha, se toma.',open:()=>openWarUI()},
 {id:'ascension',name:'Anciã do Renascimento',role:'Prestígio',x:CXW-470,y:CXW+60,icon:'♾️',color:'#c4a3ff',greet:'Todo fim é um começo mais forte.',open:()=>openPrestigeUI()},
 {id:'bard',name:'Bardo Errante',role:'Histórias com escolhas',x:CXW+470,y:CXW+60,icon:'🎭',color:'#f0a0c8',greet:'Quer ouvir uma lenda?',open:()=>openStoryUI()}
];
function registerNpcs(){
 const arr=window.AVENTURIA_SAFE_NPCS;if(!arr)return false;
 window.AVENTURIA_EXTRA_NPC=window.AVENTURIA_EXTRA_NPC||{};
 for(const n of NEW_NPCS){if(!arr.find(x=>x.id===n.id))arr.push(Object.assign({},n));window.AVENTURIA_EXTRA_NPC[n.id]=n.open}
 return true;
}
function installHooks(){
 const g=G(),C=g&&g.constructor;if(!C||C.prototype.__mgHooks)return false;
 const P=C.prototype;if(!P.updateAnimal||!P.killAnimal)return false;
 P.__mgHooks=true;
 const ok=P.killAnimal,od=P.damageTarget,om=P.drawMinimap,or=P.render;
 P.killAnimal=function(a,silent){
  const r=ok.call(this,a,silent);
  if(!silent&&a){try{
   const m=M();if(m){m.war.points+=a.elite?8:(a.ins?0:1)}
   if(a.addOf){}
  }catch(e){console.error(e)}}
  return r;
 };
 if(od)P.damageTarget=function(t,d){const r=od.apply(this,arguments);try{if(t&&t.titan&&!TT.apply){const m=M(),x=Math.max(0,d||0);if(m)m.wb.dmg+=x;TT.dmgOut+=x}}catch{}return r};
 if(om)P.drawMinimap=function(){om.call(this);try{minimapExtras(this)}catch(e){}};
 if(or)P.render=function(){or.call(this);try{drawOverlays(this)}catch(e){console.error('[mega] overlay',e)}};
 return true;
}

/* ---------------- laço principal (independente do render) ---------------- */
let last=performance.now(),slow=0,guideShown=false,tutAt=0;
setInterval(()=>{
 const g=G(),s=S();if(!g||!s)return;
 const now=performance.now(),dt=Math.min(.2,(now-last)/1000);last=now;g._mgDt=dt;
 if(!g.running||!g.player){return}
 M();
 try{
  instanceTick(g,dt);fishTick(g,dt);hazardWeather(g,s,dt,Date.now());regenTick(g,s,dt);
  if(!INS.on){titanTick(g,s,Date.now(),dt)}
  slow+=dt;if(slow>1){slow=0;marketTick();warTick();instanceHud();
}
  if(!guideShown&&now-tutAt>2500&&!M().tut.seen){guideShown=true;M().tut.seen=true;openGuide(0);persist()}
 }catch(e){if(!window.__mgErr){window.__mgErr=1;console.error('[mega]',e)}}
},100);
let tries=0;const boot=setInterval(()=>{
 tries++;const a=registerNpcs(),b=installHooks();
 if(!tutAt)tutAt=performance.now();
 if((a&&b)||tries>120)clearInterval(boot);
},500);
window.AVENTURIA_MEGA={INS,TT,M,startInstance,endInstance,openDungeonUI,openMarketUI,openCookUI,openWarUI,openPrestigeUI,openStoryUI,openGuide,spawnTitan,fishAction,toggleMap,FISH,WX,STORIES};
})();
