const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function engine(){
 const $={raid:{flight:{enabled:()=>true}},dt:1,screen:{x:0,y:0},cw:390,ch:844,ww:1920,wh:1200,twopi:Math.PI*2,hero:{x:195,y:620,radius:10,life:1},ctxmg:{},text:()=>({width:50,height:12}),powerups:[],powerupTimers:[0,0,0,0,0],powerupsCollected:0,particleEmitters:[],ParticleEmitter:function(o){Object.assign(this,o);},audio:{play(){}},util:{rand:()=>1,rectInRect:()=>true,arcIntersectingRect:(x,y,r,px,py,w,h)=>{const dx=x-Math.max(px,Math.min(px+w,x)),dy=y-Math.max(py,Math.min(py+h,y));return dx*dx+dy*dy<=r*r;}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/powerup.js'),'utf8'),{$,Math});return $;
}
test('pickups fall straight down at a frame-independent speed without horizontal drift',()=>{
 const $=engine(),p=new $.Powerup({x:120,y:200,title:'GIFT',type:2});$.powerups=[p];const x=p.x,y=p.y;
 p.update(0);assert.equal(p.x,x);assert.equal(p.y,y+2.4);$.dt=2;p.update(0);assert.equal(p.x,x);assert(Math.abs(p.y-y-7.2)<1e-8);
});
test('every pickup type reaches and rewards a ship that never moves vertically',()=>{
 for(let type=0;type<5;type++){const $=engine(),p=new $.Powerup({x:195,y:200,title:'UPGRADE',type});$.powerups=[p];for(let n=0;n<250&&$.powerups.length;n++)p.update(0);
 assert.equal($.powerups.length,0);assert.equal($.powerupsCollected,1);assert.equal($.powerupTimers[type],300);assert.equal($.hero.y,620);}
});
test('off-lane and below-ship drops are made collectible; missed drops expire at the bottom',()=>{
 const $=engine(),p=new $.Powerup({x:1900,y:900,title:'GIFT',type:3});$.powerups=[p];p.update(0);assert(p.x+p.width/2<=$.cw-40);assert(p.y<$.hero.y);$.hero.x=30;
 for(let n=0;n<250&&$.powerups.length;n++)p.update(0);assert.equal($.powerups.length,0);assert.equal($.powerupsCollected,0);
});
test('Orb Assault uses the same vertical pickup path',()=>{
 const $=engine();$.raid.flight.enabled=()=>false;$.raid.orbAssault=true;const p=new $.Powerup({x:100,y:200,title:'GIFT',type:1});$.powerups=[p];const x=p.x,y=p.y;p.update(0);assert.equal(p.x,x);assert.equal(p.y,y+2.4);
});
