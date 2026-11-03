const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');
function game(width=1200){
 const R={active:true,phase:'fight',wave:{},cleared:0,orbAssault:false,modeName:()=>'',start(){},update(){},beginCombat(){},renderMap(){},renderWorld(){},renderLighting(){},topSafe:()=>80,toast(){}};
 const $={raid:R,Hero:function(){},Enemy:function(){},spawnEnemy(){return Object.assign(new $.Enemy(),{index:$.enemies.length,radius:15,t:0});},spawnEnemies(){},updateScreen(){},renderMinimap(){},mouse:{down:0},pad:{mx:0,my:0,fire:0,aim:null},touch:{fire:false},screen:{x:0,y:0},cw:width,ch:800,dt:1,tick:0,rumble:{},audio:{play(){}},carriers:[],enemies:[],bullets:[],hero:{x:width/2,y:600,radius:10,life:1}};
 for(const T of [$.Hero,$.Enemy]){T.prototype.update=function(){};T.prototype.render=function(){};}
 vm.runInNewContext(read('raid.js').slice(read('raid.js').indexOf('R.resetAnswerFire=function'),read('raid.js').indexOf('// Layered rifle')),{R,$});
 vm.runInNewContext(read('flight.js'),{$,Math,Number,localStorage:{getItem:()=>null,setItem(){}},document:{createElement:()=>({}),querySelector:()=>null}});return {$,R,F:R.flight};
}
test('reading grace, burst pacing, difficulty caps and pause apply to swarms',()=>{
 for(const width of [390,1200]){const {$,R}=game(width);for(let i=0;i<179;i++)$.spawnEnemies();assert.equal($.enemies.length,0);$.spawnEnemies();assert.equal($.enemies.length,3);assert.equal($.enemies.filter(e=>e.blocker).length,1);assert.equal($.enemies[0].life,4);assert.equal($.enemies[1].life,1);
 R.cleared=100;for(let i=0;i<2000;i++)$.spawnEnemies();assert.equal($.enemies.length,width<600?12:20);
 R.paused=true;const age=R.flight.combat.age;for(let i=0;i<500;i++)$.spawnEnemies();assert.equal(R.flight.combat.age,age);
 R.paused=false;R.wave={};$.spawnEnemies();assert.equal($.enemies.length,0);
 }
});
test('swarms weave, chase and exit instead of remaining on the ship forever',()=>{
 const {$}=game();for(let i=0;i<180;i++)$.spawnEnemies();const e=$.enemies[1],x=e.x;for(let i=0;i<200;i++)e.update($.enemies.indexOf(e));assert.notEqual(e.x,x);assert(e.y>0);assert(e.inView);
 for(let i=0;i<700&&$.enemies.includes(e);i++)e.update($.enemies.indexOf(e));assert(!$.enemies.includes(e));
});
test('contact cooldown prevents overlapping enemies from multiplying damage; repeated contact kills',()=>{
 const {$,F}=game();F.combat.age=200;$.enemies=Array.from({length:10},()=>({raidSwarm:true,inView:true,x:$.hero.x,y:$.hero.y,radius:15}));F.contact($.hero);assert.equal($.hero.life,.88);
 for(let i=0;i<32;i++)F.contact($.hero);assert.equal($.hero.life,.88);F.contact($.hero);assert.equal($.hero.life,.76);
 $.hero.x+=100;for(let i=0;i<100;i++)F.contact($.hero);assert.equal($.hero.life,.76);$.hero.x-=100;for(let i=0;i<400;i++)F.contact($.hero);assert.equal($.hero.life,0);
});
test('clearing, release-to-ready and fresh answer press remain separate with autofire',()=>{
 const {$,R,F}=game();R.resetAnswerFire();$.autofire=true;assert.equal(R.canFire(),false);$.pad.fire=1;assert(R.canFire());assert.equal(F.answerFire(),false);
 for(let i=0;i<100;i++){R.canFire();assert.equal(F.answerFire(),false);}
 $.pad.fire=0;R.canFire();assert.equal(F.combat.stage,'ready');assert.equal(F.answerFire(),false);
 $.pad.fire=1;R.canFire();assert.equal(F.answerFire(),true);R.resetAnswerFire(false);assert.equal(F.answerFire(),false);
});
test('clearing bullets ignore answer ships, and even piercing answer bullets stop at blockers',()=>{
 const {$,R,F}=game();let hits=0,damage=0;Object.assign($,{particleEmitters:[],ParticleEmitter:function(){},util:{distance:()=>0,rand:()=>1,pointInRect:()=>true},ww:1920,wh:1200,pi:Math.PI});
 vm.runInNewContext(read('bullet.js'),{$,Math});$.carriers=[{alive:true,x:0,y:0,radius:26,num:1,hit(){hits++;}}];
 const make=()=>new $.Bullet({x:0,y:0,direction:0,speed:10,size:24,damage:1,piercing:1});const clearing=make();$.bullets=[clearing];clearing.update(0);assert.equal(hits,0);
 F.combat.stage='answer';const armed=make();$.bullets=[armed];$.enemies=[{raidSwarm:true,x:0,y:0,radius:15,index:1,receiveDamage(){damage++;}}];armed.update(0);assert.equal(damage,1);assert.equal(hits,0);assert.equal($.bullets.length,0);
 $.enemies=[];const openShot=make();$.bullets=[openShot];openShot.update(0);assert.equal(hits,1);
 // A clearing round already in flight stays harmless even after answer fire is armed.
 $.bullets=[clearing];clearing.update(0);assert.equal(hits,1);
});
