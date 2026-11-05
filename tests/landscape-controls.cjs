const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8');
function setup(width=844,height=390,cold=false){const nodes={},classes=new Set(),events={},raf=[];
 const node=id=>nodes[id]||(nodes[id]={hidden:false,style:{},handlers:{},classList:{contains:n=>classes.has(n),toggle:(n,on)=>on?classes.add(n):classes.delete(n)},querySelector:s=>node(id+s),appendChild(){},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),addEventListener(type,fn){this.handlers[type]=fn;}});
 node('#cardWrap').hidden=true;const R={active:true,paused:false,flight:{enabled:()=>true},pause(){this.paused=true;}},$={raid:R,state:'play',resizecb(){},mouse:{}};
 const c={$,innerWidth:width,innerHeight:height,matchMedia:()=>({matches:false}),requestAnimationFrame:f=>raf.push(f),window:{addEventListener:(n,f)=>events[n]=f},document:{querySelector:node,getElementById:id=>node('#'+id),createElement:()=>node('#touchFlight'),addEventListener:(n,f)=>events[n]=f},Math};vm.createContext(c);if(cold){const core=read('core.js');vm.runInContext(core.slice(core.indexOf('$.resizecb = function()'),core.indexOf('$.blurcb = function')),c);}vm.runInContext(read('mobile.js'),c);
 const e=(id,x=50)=>({pointerId:id,clientX:x,clientY:50,preventDefault(){},stopPropagation(){}});return {R,$,c,node,e,events,frame:()=>raf.shift()()};}
test('landscape reserves side rails, portrait and desktop keep their own layout',()=>{let t=setup();assert(t.R.sideControls);t.frame();assert(!t.node('#touchFlight').hidden);t=setup(390,844);assert(!t.R.sideControls);t=setup(1920,1080);assert(!t.R.sideControls);});
test('movement and rapid fire accept separate fingers; cancellation and pause release both',()=>{const t=setup(),move=t.node('#touchMove'),fire=t.node('#touchFire');move.onpointerdown(t.e(1,90));fire.onpointerdown(t.e(2));assert(t.$.touch.mx>0);assert(t.$.touch.fire);fire.onpointerdown(t.e(3));fire.handlers.pointerup(t.e(3));assert(t.$.touch.fire);move.handlers.pointerup(t.e(1));assert.equal(t.$.touch.mx,0);fire.handlers.pointercancel(t.e(2));assert(!t.$.touch.fire);fire.onpointerdown(t.e(4));t.node('#touchPause').onclick();assert(t.R.paused);assert(!t.$.touch.fire);assert.equal(t.$.touch.mx,0);});
test('orientation changes and lost focus cannot leave movement or firing stuck',()=>{const t=setup();t.node('#touchMove').onpointerdown(t.e(1,90));t.node('#touchFire').onpointerdown(t.e(2));t.events.orientationchange();assert(t.R.paused);assert.equal(t.$.touch.mx,0);assert(!t.$.touch.fire);});

test('cold landscape startup never calls the actual canvas resize before engine initialization',()=>{
 const t=setup(844,390,true);assert(t.R.sideControls);assert.equal(t.$.cmg,undefined);assert.equal(t.$.cfg,undefined);
 t.c.innerWidth=390;t.c.innerHeight=844;t.events.resize();t.c.innerWidth=844;t.c.innerHeight=390;t.events.resize();assert(t.R.sideControls);
 t.$.cmg={};t.$.cfg={};t.$.renderForeground=()=>{};t.$.ww=1920;t.$.wh=1200;t.$.resizecb();t.$.initialized=true;
 t.c.innerWidth=390;t.c.innerHeight=844;t.events.resize();assert.equal(t.$.cmg.width,320);assert.equal(t.$.cfg.height,240);
});
