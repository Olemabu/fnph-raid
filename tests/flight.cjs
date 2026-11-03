const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function flight(initial){
 const saved={},R={active:true,orbAssault:false,modeName:()=>'',start(){},update(){},beginCombat(){},renderMap(){},renderWorld(){},renderLighting(){},topSafe:()=>180,campaign:{render(){}},toast(){}};
 const $={raid:R,Hero:function(){},Enemy:function(){},spawnEnemy(){return{};},updateScreen(){},renderMinimap(){},mouse:{moved:1},pad:{aim:1},touch:{aim:1},screen:{x:0,y:0},cw:1200,ch:800,dt:1,tick:1,rumble:{},mousescreen(){},carriers:[]};$.Enemy.prototype.update=function(){};$.Enemy.prototype.render=function(){};$.Hero.prototype.update=function(){};$.Hero.prototype.render=function(){};
 const c={$,Math,Number,document:{createElement:()=>({}),querySelector:s=>s==='#campaignStory'?{}:null},localStorage:{getItem:()=>initial?JSON.stringify(initial):null,setItem:(k,v)=>saved[k]=JSON.parse(v)}};
 const originalHero=$.Hero.prototype.render,originalEnemy=$.Enemy.prototype.render;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/flight.js'),'utf8'),c);return{R,$,saved,originalHero,originalEnemy};
}
test('flight checkpoints advance only once per completed set, change region after three, survive reload',()=>{
 const {R,saved}=flight();for(let i=1;i<=3;i++){R.beginCombat();R.flight.completeSet();R.flight.completeSet();assert.equal(R.flight.progress().sets,i);}
 assert.equal(R.flight.progress().region,1);assert.equal(flight(saved['fnphraid.flight.v1']).R.flight.progress().region,1);
 R.orbAssault=true;R.beginCombat();R.flight.completeSet();assert.equal(R.flight.progress().sets,3);
});
test('enemy aircraft enter from ahead and settle into separate readable formations',()=>{
 const {R,$}=flight();const a={num:1,t:0},b={num:3,t:0};$.carriers=[a,{num:2},b,{num:4}];
 R.flight.moveEnemy(a);R.flight.moveEnemy(b);const first=a.y;
 for(let i=0;i<240;i++){R.flight.moveEnemy(a);R.flight.moveEnemy(b);}
 assert(a.y>first);assert(a.y>200);assert.equal(b.flightAnchor.y,a.flightAnchor.y);assert.equal(b.y,a.y);assert(b.x>a.x);assert(Math.abs(a.x-a.flightAnchor.x)<20);assert.equal(R.flight.progress().sets,0);
});
test('manual movement banks and settles without awarding a completed set',()=>{
 const {R,$}=flight();$.hero=new $.Hero();Object.assign($.hero,{x:600,y:600,vx:6,vy:0,life:1});$.hero.update();assert($.hero.flightBank>0);const bank=$.hero.flightBank;$.hero.vx=0;for(let i=0;i<30;i++)$.hero.update();assert($.hero.flightBank<bank*.1);
 assert.equal(R.flight.progress().sets,0);
});
test('interceptors enter ahead, fly through and leave the field rather than orbit the player',()=>{
 const {R,$}=flight();const e=$.spawnEnemy();Object.assign(e,{index:1,speed:2,radius:12});$.enemies=[e];
 assert(e.y<0);for(let i=0;i<60;i++)$.Enemy.prototype.update.call(e,0);assert(e.y>0);assert(e.inView);for(let i=0;i<500;i++)$.Enemy.prototype.update.call(e,0);assert.equal($.enemies.length,0);
});
test('target selection does not rotate the aircraft; manual right-stick heading turns at a limited rate',()=>{
 const $={ww:1920,wh:1200,dt:1,keys:{state:{}},pad:{mx:0,my:0,aim:null},touch:{mx:0,my:0,aim:null},mouse:{moved:0},raid:{flight:{enabled:()=>true}},enemies:[],powerupTimers:[],aimLock:{alive:true,x:1700,y:600},util:{distance:()=>100}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/hero.js'),'utf8'),{$,Math});const h=new $.Hero();h.weapon.fireRateTick=0;h.prevDirection=h.direction=-Math.PI/2;h.update();assert.equal(h.direction,-Math.PI/2);assert.equal(h.vx,0);assert.equal(h.vy,0);
 $.pad.aim=0;h.update();assert(h.direction>-Math.PI/2);assert(h.direction<=-Math.PI/2+.075001);
});

test('a fresh flight clears stale aim commands without applying automatic steering',()=>{
 const {R,$}=flight();$.hero={};R.start();assert.equal($.mouse.moved,0);assert.equal($.pad.aim,null);assert.equal($.touch.aim,null);assert.equal($.hero.direction,-Math.PI/2);
});

test('flight preserves the original player and enemy artwork renderers',()=>{
 const {$,originalHero,originalEnemy}=flight();assert.equal($.Hero.prototype.render,originalHero);assert.equal($.Enemy.prototype.render,originalEnemy);
});

test('all four answer ships stay in one horizontal row at desktop and phone widths',()=>{
 for(const width of [390,844,1920]){const {R,$}=flight();$.cw=width;$.carriers=Array.from({length:4},(_,i)=>({num:i+1,t:i,label:{h:70}}));
 for(let frame=0;frame<250;frame++)for(const e of $.carriers)R.flight.moveEnemy(e);
 assert.equal(new Set($.carriers.map(e=>e.y)).size,1);for(let i=1;i<4;i++)assert($.carriers[i].x>$.carriers[i-1].x);
 }
});
