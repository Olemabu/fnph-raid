const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');
function setup(){
 const $={mouse:{down:0},pad:{fire:0,rawFire:false},touch:{fire:false},bullets:[]},R={active:true,phase:'fight'};
 vm.runInNewContext(read('raid.js').slice(read('raid.js').indexOf('R.resetAnswerFire=function'),read('raid.js').indexOf('// Layered rifle')),{R,$});return {$,R};
}
test('held confirmation cannot fire until release and a fresh press, on all input devices',()=>{
 for(const device of ['pad','mouse','touch','key']){
  const {$,R}=setup(),hold=v=>{if(device==='pad')$.pad.rawFire=v;else if(device==='key')$.keyFire=v;else $[device][device==='mouse'?'down':'fire']=v;};
  hold(true);R.resetAnswerFire();for(let i=0;i<30;i++)assert.equal(R.canFire(),false);
  hold(false);assert.equal(R.canFire(),false);assert.equal(R.canFire(),false);
  hold(true);assert.equal(R.canFire(),true);assert.equal(R.canFire(),true);
  R.resetAnswerFire();assert.equal(R.canFire(),false);
 }
});
test('automatic fire cannot start a new question without deliberate input',()=>{
 const {$,R}=setup();$.autofire=true;R.resetAnswerFire();for(let i=0;i<30;i++)assert.equal(R.canFire(),false);
 $.pad.fire=1;assert.equal(R.canFire(),true);R.phase='resolve';assert.equal(R.canFire(),false);
});
test('remaining bullets become harmless immediately after an answer, before the next wave',()=>{
 const {$,R}=setup();$.raid=R;$.particleEmitters=[];$.ParticleEmitter=function(){};let hits=0;
 vm.runInNewContext(read('bullet.js'),{$,Math});
 const old=new $.Bullet({x:0,y:0});$.bullets.push(old);R.resetAnswerFire(false);
 $.carriers=[{alive:true,hit(){hits++;}}];$.enemies=[];old.update(0);
 assert.equal(hits,0);assert.equal($.bullets.length,0);
 $.bullets.push(new $.Bullet({x:0,y:0}));R.resetAnswerFire();assert.equal($.bullets.length,0);
});
test('real hero honours the safety gate even with autofire and a held controller button',()=>{
 const {$,R}=setup();Object.assign($,{raid:R,ww:1920,wh:1200,dt:1,keys:{state:{}},enemies:[],powerupTimers:[],autofire:true});
 R.flight={enabled:()=>true};$.pad.mx=$.pad.my=0;$.touch.mx=$.touch.my=0;
 vm.runInNewContext(read('hero.js'),{$,Math});const h=new $.Hero();R.resetAnswerFire();$.pad.rawFire=$.pad.fire=1;
 for(let i=0;i<30;i++)h.update();assert.equal($.bullets.length,0);
});
test('controller X confirmation is consumed while its held state remains visible to the fire gate',()=>{
 const {$,R}=setup();let closes=0;
 const p={id:'test',axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===0,value:i===0?1:0}))};
 const c={R,$,readPad:()=>p,padId:'test',padBase:{id:'test',v:[0,0,0,0],n:100},padPrev:[],wiz:null,padMap:null,performance:{now:()=>1000},Q:()=>({hidden:false}),closeCard(){closes++;R.resetAnswerFire();},Math};
 const s=read('raid.js');vm.createContext(c);vm.runInContext(s.slice(s.indexOf('R.pollPad=function'),s.indexOf('/* ---------- controller setup wizard')),c);
 R.pollPad();assert.equal(closes,1);assert.equal($.pad.fire,0);assert.equal($.pad.rawFire,true);assert.equal(R.canFire(),false);
 R.pollPad();assert.equal(closes,1);assert.equal(R.canFire(),false);
 p.buttons[0]={pressed:false,value:0};R.pollPad();assert.equal($.pad.rawFire,false);assert.equal(R.canFire(),false);
});
