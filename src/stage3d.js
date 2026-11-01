/* FNPH's dependency-free WebGL scene renderer. Geometry, materials and lighting
   are authored here; no network assets or libraries are needed by the build. */
(function(){
'use strict';
const R=$.raid,canvas=document.createElement('canvas');
const gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true});
const api=R.stage3d={available:false};if(!gl)return;
const vs=`attribute vec3 p;attribute vec3 n;attribute vec3 color;attribute float emission;
uniform mat4 vp;varying vec3 P;varying vec3 N;varying vec3 C;varying float E;
void main(){P=p;N=n;C=color;E=emission;gl_Position=vp*vec4(p,1.);}`;
const fs=`precision mediump float;varying vec3 P;varying vec3 N;varying vec3 C;varying float E;
uniform vec3 eye;uniform vec3 fog;uniform vec3 key;uniform float density;uniform float clock;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec3 n=normalize(N);vec3 v=normalize(eye-P);vec3 l=normalize(key);
float diffuse=max(dot(n,l),0.);float spec=pow(max(dot(n,normalize(l+v)),0.),64.);
float rim=pow(1.-max(dot(n,v),0.),3.);float grain=hash(floor(P.xz*28.))*.055;
vec3 lit=C*(.28+diffuse*.72+max(n.y,0.)*.16-grain)+vec3(.48,.68,.78)*spec*.3;
// Soft pools cast by ceiling strips and street fixtures, plus cool edge light.
float pool=pow(max(0.,cos(P.z*1.0472)),14.)*exp(-abs(P.x)*.11);
lit+=C*pool*.16+vec3(.12,.26,.32)*rim*.25;
// Brushed metal and soft ceiling-light reflections break up broad surfaces.
float brushing=sin(P.y*260.)*.008;
lit+=vec3(brushing);
if(n.y>.8&&P.y<.06){float reflection=pow(max(0.,cos(P.z*1.0472)),24.)*exp(-abs(P.x-eye.x)*.7);lit+=vec3(.24,.39,.42)*reflection*.22;}
lit=mix(lit,C*(1.15+.06*sin(clock*2.)),min(1.,E));
float f=1.-exp(-length(eye-P)*density);lit=mix(lit,fog,f);
gl_FragColor=vec4(pow(max(lit,vec3(0.)),vec3(.88)),1.);}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
try{
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
for(const [name,size,offset] of [['p',3,0],['n',3,3],['color',3,6],['emission',1,9]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,40,offset*4);}
const uniforms={};for(const name of ['vp','eye','fog','key','density','clock'])uniforms[name]=gl.getUniformLocation(program,name);
const rgb=hex=>{if(Array.isArray(hex))return hex;const i=parseInt(hex.slice(1),16);return[(i>>16&255)/255,(i>>8&255)/255,(i&255)/255];};
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function multiply(a,b){const o=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function projection(fov,aspect,near,far){const f=1/Math.tan(fov/2);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];}
function look(eye,target){const z=norm(eye.map((x,i)=>x-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
const mesh=new Float32Array(2400000);let used=0,matrix,eye,width,height;
function tri(a,b,c,col,e=0){const n=norm(cross(b.map((x,i)=>x-a[i]),c.map((x,i)=>x-a[i])));const cc=rgb(col);for(const p of [a,b,c]){for(let k=0;k<3;k++)mesh[used++]=p[k];for(let k=0;k<3;k++)mesh[used++]=n[k];for(let k=0;k<3;k++)mesh[used++]=cc[k];mesh[used++]=e;}}
function quad(a,b,c,d,col,e=0){tri(a,b,c,col,e);tri(a,c,d,col,e);}
function box(x,y,z,w,h,d,col,angle=0,e=0){
 const ca=Math.cos(angle),sa=Math.sin(angle);const p=[];
 for(const v of [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]){const xx=v[0]*w/2,zz=v[2]*d/2;p.push([x+xx*ca-zz*sa,y+v[1]*h/2,z+xx*sa+zz*ca]);}
 for(const q of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])quad(...q.map(i=>p[i]),col,e);
}
function cylinder(x,y,z,r,h,col,segments=12){for(let k=0;k<segments;k++){const a=k*Math.PI*2/segments,b=(k+1)*Math.PI*2/segments;const p=[x+r*Math.cos(a),y-h/2,z+r*Math.sin(a)],q=[x+r*Math.cos(b),y-h/2,z+r*Math.sin(b)],u=[p[0],y+h/2,p[2]],v=[q[0],y+h/2,q[2]];quad(p,u,v,q,col);tri([x,y+h/2,z],v,u,col);}}
function bevel(x,y,z,w,h,d,col,angle=0){
 const b=Math.min(w,d)*.13,outline=[[-w/2+b,-d/2],[w/2-b,-d/2],[w/2,-d/2+b],[w/2,d/2-b],[w/2-b,d/2],[-w/2+b,d/2],[-w/2,d/2-b],[-w/2,-d/2+b]],ca=Math.cos(angle),sa=Math.sin(angle);
 const point=(p,yy,k=1)=>[x+(p[0]*ca-p[1]*sa)*k,yy,z+(p[0]*sa+p[1]*ca)*k];
 for(let i=0;i<8;i++){const j=(i+1)%8,a=point(outline[i],y-h/2),b=point(outline[j],y-h/2),u=point(outline[i],y+h*.35),v=point(outline[j],y+h*.35),p=point(outline[i],y+h/2,.94),q=point(outline[j],y+h/2,.94);quad(a,b,v,u,col);quad(u,v,q,p,col);tri([x,y+h/2,z],p,q,col);}
}
function wheel(x,y,z,angle){const ca=Math.cos(angle),sa=Math.sin(angle),point=(dx,yy,zz)=>[x+dx*ca-zz*sa,yy,z+dx*sa+zz*ca];for(let k=0;k<16;k++){const a=k*Math.PI/8,b=(k+1)*Math.PI/8,p=point(-.14,y+Math.sin(a)*.39,Math.cos(a)*.39),q=point(-.14,y+Math.sin(b)*.39,Math.cos(b)*.39),u=point(.14,y+Math.sin(a)*.39,Math.cos(a)*.39),v=point(.14,y+Math.sin(b)*.39,Math.cos(b)*.39);quad(p,q,v,u,'#0a1219');tri(point(.15,y,0),u,v,k%2?'#7a8a92':'#334954');}}
function ring(x,y,z,r,col){for(let k=0;k<24;k++){const a=k*Math.PI/12,b=(k+1)*Math.PI/12;quad([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],[x+Math.cos(b)*(r+.035),y,z+Math.sin(b)*(r+.035)],[x+Math.cos(a)*(r+.035),y,z+Math.sin(a)*(r+.035)],col,1);}}
function shadow(x,z,w,d){for(let band=3;band>0;band--){const k=.55+band*.15,col=['#14232c','#1a2a33','#21343d'][band-1];for(let j=0;j<20;j++){const a=j*Math.PI/10,b=(j+1)*Math.PI/10;tri([x,.009+(4-band)*.002,z],[x+Math.cos(a)*w*.5*k,.009+(4-band)*.002,z+Math.sin(a)*d*.5*k],[x+Math.cos(b)*w*.5*k,.009+(4-band)*.002,z+Math.sin(b)*d*.5*k],col);}}}
function begin(w,h,cam,target,fov=.82,fog='#102332',density=.025){
 width=w;height=h;const scale=Math.min(1,1600/w);canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));eye=cam;
 matrix=multiply(projection(fov,w/h,.07,250),look(cam,target));used=0;
 gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(...rgb(fog),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(program);
 gl.uniformMatrix4fv(uniforms.vp,false,new Float32Array(matrix));gl.uniform3fv(uniforms.eye,cam);gl.uniform3fv(uniforms.fog,rgb(fog));gl.uniform3fv(uniforms.key,[-3,7,5]);gl.uniform1f(uniforms.density,density);gl.uniform1f(uniforms.clock,performance.now()/1000);
}
function end(c){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.subarray(0,used),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,used/10);c.drawImage(canvas,0,0,width,height);api.vertices=used/10;}
function bloom(c,p,r,col){const q=project(p);if(!q.visible||q.x< -r||q.x>width+r||q.y< -r||q.y>height+r)return;const g=c.createRadialGradient(q.x,q.y,0,q.x,q.y,r);g.addColorStop(0,col+'55');g.addColorStop(.15,col+'22');g.addColorStop(1,col+'00');c.save();c.globalCompositeOperation='screen';c.fillStyle=g;c.fillRect(q.x-r,q.y-r,r*2,r*2);c.restore();}
function project(p){const a=[...p,1],o=[0,0,0,0];for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[r]+=matrix[k*4+r]*a[k];return{x:(o[0]/o[3]*.5+.5)*width,y:(.5-o[1]/o[3]*.5)*height,visible:o[3]>0};}
function car(x,z,color='#e0ddd0',ambulance=false,angle=0,time=0){
 shadow(x,z,2.5,4.7);const part=(dx,y,dz,w,h,d,col,e=0)=>{const ca=Math.cos(angle),sa=Math.sin(angle);box(x+dx*ca-dz*sa,y,z+dx*sa+dz*ca,w,h,d,col,angle,e);};
 bevel(x,.68,z,2.05,.72,4.3,color,angle);part(0,.38,0,2.1,.18,4.5,'#14212b');
 bevel(x,1.20,z+(ambulance?-.35:0),1.85,.73,ambulance?3.3:2.6,color,angle);
 part(0,1.3,1.28,1.65,.47,.035,'#173345');part(0,1.32,-1.34,1.65,.42,.035,'#294857');
 for(const s of [-1,1]){for(const dz of [-1.3,1.3]){const ca=Math.cos(angle),sa=Math.sin(angle);wheel(x+s*.98*ca-dz*sa,.39,z+s*.98*sa+dz*ca,angle);}part(s*.73,.75,2.16,.42,.16,.03,'#ff4c47',1);part(s*.73,.75,-2.16,.42,.14,.03,'#e4f5ff',1);part(s*1.035,1.4,.7,.025,.29,.6,'#244756');part(s*1.12,1.13,-.92,.22,.18,.19,'#172a34');}
 if(ambulance){part(0,1.84,-.55,1.4,.16,.3,'#29343e');const blink=Math.sin(time*12)>0;part(-.46,1.88,-.55,.44,.17,.31,blink?'#ff3c56':'#293c52',blink?1:0);part(.46,1.88,-.55,.44,.17,.31,blink?'#294059':'#438bff',blink?0:1);
  // Rear doors, recessed glazing, latches, vents and reflective chevrons.
  for(const s of [-1,1]){part(s*.46,1.25,1.34,.78,.53,.035,'#203c49');part(s*.44,1.22,1.37,.61,.36,.02,'#375969');part(s*.10,1.0,1.4,.10,.045,.04,'#c3cbc3');part(s*.79,.58,2.19,.1,.12,.03,'#f3a75d',.5);for(let j=0;j<3;j++)part(s*.77,.99+j*.07,1.4,.15,.025,.025,'#1e333e');}
  part(0,1.05,1.39,.025,1.0,.025,'#637c87');part(0,.98,2.17,1.95,.16,.025,'#c33942');part(0,1.43,2.18,.12,.4,.03,'#dd4248');part(0,1.43,2.19,.38,.12,.03,'#dd4248');part(0,.58,2.18,.48,.12,.03,'#e8dfbd');
  for(const s of [-1,1])part(s*1.034,1.0,-.1,.02,.14,3.8,'#c33942');
 }
}
function building(x,z,w,h,d,seed){
 box(x,h/2,z,w,h,d,'#1e3444');box(x,h+.1,z,w+.2,.2,d+.2,'#354959');
 box(x+w*.49,h*.52,z,.16,h*.95,d+.1,'#324b5b');
 for(let yy=1;yy<h-.3;yy+=1.5)for(let xx=-w/2+.45;xx<w/2-.25;xx+=.85){const lit=(Math.floor(xx*13+yy*7+seed)*17)%7<4;box(x+xx,yy,z+d/2+.025,.43,.65,.025,lit?'#b99c6c':'#152b3b',0,lit?.7:0);}
 for(let yy=1;yy<h-.3;yy+=1.5)for(let zz=-d/2+.5;zz<d/2-.2;zz+=1.1){const side=x<0?1:-1;box(x+side*(w/2+.025),yy,z+zz,.025,.6,.5,(Math.floor(zz*7+yy+seed)%3)?'#6f96a2':'#183040',0,.4);}
}
api.race=function(c,w,h,r,theme){
 const tm=performance.now()/1000,px=r.x*5.3,curve=z=>Math.sin(r.curveT*.35)*Math.pow(Math.max(0,-z)/110,2)*13;
 begin(w,h,[px*.65,3.3,13],[px*.7,1.2,-24],.83,theme.tunnel?'#101b26':'#182d41',.017);
 box(0,-.2,-80,220,.3,220,'#172e34');
 // Segmented asphalt follows the bend; road markings occupy real world space.
 for(let i=0;i<40;i++){const z=-i*3+6,xx=curve(z),next=curve(z-3),a=Math.atan2(next-xx,3);box(xx,-.04,z,13,.08,3.2,'#202e39',-a);
  for(const s of [-1,1]){box(xx+s*6.7,.15,z,.3,.4,3.3,'#56646a',-a);box(xx+s*6.45,.02,z,.07,.025,3.2,'#afc6ba',-a,.4);box(xx+s*7.4,.5,z,.08,.07,3.3,'#66808d',-a);}
  const phase=(i*3+r.pos*.24)%6;if(phase<3)for(let lane=1;lane<r.n;lane++)box(xx-6+12*lane/r.n,.012,z,.09,.02,1.5,'#b9c1ba',-a);
  // Broken wet reflections, deliberately short so they read as reflected light.
  if(theme.wet&&i%2===0)for(const s of [-1,1])box(xx+s*4.8,.016,z,.07,.006,1.1,s<0?'#496774':'#86684f',-a,.2);
 }
 for(let k=0;k<15;k++){const z=-((k*12+r.pos*.24)%180)+10,xx=curve(z);for(const s of [-1,1]){
   const bx=xx+s*(13+(k%3)*3),height=5+(k*7%13);if(!theme.tunnel)building(bx,z,5+(k%3),height,6,k);
   const lx=xx+s*7.8;box(lx,2.8,z,.13,5.6,.14,'#4a5e6a');box(lx-s*.7,5.6,z,1.6,.12,.18,'#71828a');box(lx-s*1.15,5.51,z,.65,.035,.25,'#d9d5af',0,1);
   if(k%3===0){box(lx-s*1.1,.022,z,.2,.01,2.2,'#79755c',0,.25);}
  }
  if(theme.tunnel){box(xx,6.4,z,17,.45,.5,'#33444c');for(const s of [-1,1]){box(xx+s*8,3.1,z,.5,6.5,.6,'#344954');box(xx+s*6.8,6.12,z,1.8,.06,.18,'#a4e5e9',0,1);}}
 }
 if(theme.tunnel){box(0,6.8,-75,18,.35,190,'#152631');for(const s of [-1,1])box(s*9,3.3,-75,.4,7,190,'#263b48');}
 // Overhead structures, direction boards and roadside traffic.
 for(let k=0;k<4;k++){const z=-((k*41+r.pos*.18)%160)-7,xx=curve(z);for(const s of [-1,1])box(xx+s*7,3.1,z,.3,6.2,.35,'#67747c');box(xx,6.1,z,14.4,.28,.4,'#72828a');box(xx,5.2,z,5.5,1.25,.16,'#17474e');for(let j=0;j<3;j++)box(xx-1.4+j*1.4,5.2,z+.1,.5,.08,.02,'#d8e6cf',0,.5);}
 for(let k=0;k<7;k++){const z=-((k*23+r.pos*.12)%170)-10;car(curve(z)+(k%2?-9.4:9.4),z,k%2?'#916f5f':'#40536b',false,k%2?Math.PI:0,tm);}
 const gz=2.1-r.z*.095,xx=curve(gz);for(const s of [-1,1])box(xx+s*6.6,2.4,gz,.25,4.8,.3,'#a6a89a');box(xx,4.8,gz,13.5,.23,.35,'#82929b');
 const colors=['#e57aa1','#66c7dd','#e5c27d','#9bd6ab'];
 for(let i=0;i<r.n;i++){const x=xx-6+(i+.5)*12/r.n;box(x,4.1,gz,11/r.n,1.0,.2,'#172e3d');box(x,3.54,gz+.12,10/r.n,.055,.02,colors[i],0,1);for(let b=0;b<=i;b++)box(x+(b-i/2)*.15,4.12,gz+.12,.07,.4,.02,colors[i],0,1);}
 car(px,2.1,'#d9dfda',true,-Math.max(-.12,Math.min(.12,(r.target==null?0:r.target-r.x)*.2)),tm);
 end(c);
 c.save();c.textAlign='center';for(let i=0;i<r.n;i++){const p=project([xx-6+(i+.5)*12/r.n,4.1,gz+.15]);if(p.visible){c.font='bold '+Math.max(8,Math.min(80,h*.8/(13-gz)))+'px monospace';c.fillStyle=colors[i];c.fillText(String(i+1),p.x,p.y);}}c.restore();
 for(let k=0;k<7;k++){const z=-((k*12+r.pos*.24)%84)+10,xx=curve(z);for(const s of [-1,1])bloom(c,[xx+s*6.65,5.5,z],Math.max(8,180/(14-z*.7)),'#d3c4a2');}
 bloom(c,[px-.46,1.9,1.55],32,Math.sin(tm*12)>0?'#ff4967':'#407cff');bloom(c,[px+.46,1.9,1.55],32,Math.sin(tm*12)>0?'#407cff':'#ff4967');
 // Lens falloff, rain and restrained bloom remain inexpensive screen effects.
 const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#07132366');shade.addColorStop(.45,'#07132300');shade.addColorStop(1,'#02071088');c.fillStyle=shade;c.fillRect(0,0,w,h);
 if(theme.wet){c.strokeStyle='#c1daec44';c.lineWidth=.7;for(let k=0;k<100;k++){const x=(k*173+tm*38)%w,y=(k*91+tm*380)%h;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+13);c.stroke();}}
 c.fillStyle='#d3e7ef';c.font='11px monospace';c.fillText('NIGHT DISPATCH  /  '+String(Math.round(72*r.boost)).padStart(3,'0')+' KM/H',24,h*.66);
};
function bed(x,z,side){
 shadow(x,z,1.5,2.9);for(const a of [-.55,.55])for(const b of [-1.05,1.05]){box(x+a,.28,z+b,.07,.5,.07,'#74858d');box(x+a,.12,z+b,.15,.18,.16,'#18232b');}
 box(x,.55,z,1.35,.15,2.5,'#7f929d');box(x,.72,z,1.23,.24,2.35,'#b4b9b1');box(x,.87,z+.25,1.2,.08,1.6,'#517780');box(x,.9,z-.8,1.04,.16,.5,'#d2d5c8');
 for(const s of [-1,1]){box(x+s*.7,.91,z,.045,.6,2.5,'#9eabb0');box(x+s*.7,1.2,z,.05,.04,2.5,'#b7c6c7');}box(x,1.1,z-1.2,1.4,.8,.08,'#344b5a');
 box(x+side*.95,1.25,z-.65,.42,.8,.45,'#2e4553');box(x+side*.95,1.7,z-.65,.5,.35,.12,'#15222b');box(x+side*.95,1.7,z-.57,.4,.24,.015,'#60cbb5',0,.7);
}
api.fps=function(c,w,h,r){
 const focal=(w/2)/Math.tan(1.15/2),fovy=2*Math.atan(h/(2*focal)),cam=[8,1.65,13.2];
 begin(w,h,cam,[8+Math.cos(r.ang)*8,1.65,13.2+Math.sin(r.ang)*8],fovy,'#122530',.026);
 box(8,-.09,4,16,.18,23,'#334950');box(8,3.75,4,16,.15,24,'#263b46');
 for(let z=-7;z<16;z+=1.4){box(8,.004,z,16,.01,.015,'#1f333e');for(let x=0;x<17;x+=1.4)box(x,.005,z,.012,.012,1.4,'#1d343c');}
 for(const side of [-1,1]){const x=8+side*8;box(x,1.8,4,.3,3.6,24,'#5d7379');box(x-side*.18,.55,4,.15,1.1,24,'#2d4854');box(x-side*.22,1.1,4,.09,.07,24,'#97aaa8');
  for(let z=-5;z<15;z+=3){box(x-side*.23,2.7,z,.1,.35,1.5,'#78c9d1',0,.75);box(x-side*.28,2.4,z,.15,.18,1.8,'#293e49');box(x-side*.3,2.1,z,.1,.06,1.3,'#9dafaf');}}
 box(8,1.8,-7.5,16,3.6,.3,'#465d69');box(8,1.45,-7.28,2.8,2.9,.08,'#233e4c');for(const s of [-1,1]){box(8+s*1.55,1.55,-7.15,.14,3.1,.2,'#94bbc2');box(8+s*.07,1.5,-7.1,.04,2.5,.05,'#69c6ce',0,.8);}box(8,3.15,-7.1,3.2,.35,.12,'#467c77');
 for(let z=-5;z<15;z+=3){box(8,3.6,z,5.6,.12,.46,'#7f999f');box(8,3.52,z,4.7,.025,.27,'#c3e1de',0,1);for(const s of [-1,1])box(8+s*3.1,2.95,z,.16,1.4,.24,'#536976');}
 for(let z=-3;z<12;z+=3.5){bed(2,z,-1);bed(14,z,1);}
 // Layered autonomous target housings and rotor arms inhabit the actual room.
 for(const t of r.t){if(!t.alive)continue;const y=1.55+Math.sin(t.bob)*.035,col=['#d66e9b','#62bdcf','#d5b677','#8ebf97'][t.i];
  shadow(t.x,t.y,1.1,.6);box(t.x,y,t.y,.9,.55,.24,'#1c3342');box(t.x,y-.4,t.y,.18,.23,.24,'#8d9e9e');box(t.x,y,t.y+.14,.65,.31,.02,'#365668');box(t.x,y+.22,t.y+.16,.62,.035,.02,col,0,1);
  for(const s of [-1,1]){box(t.x+s*.63,y+.1,t.y,.45,.08,.14,'#748b96');cylinder(t.x+s*.86,y+.1,t.y,.22,.07,'#293d48');box(t.x+s*.86,y+.15,t.y,.42,.02,.04,'#a0b2b5',performance.now()*.02);}
 }
 // Weapon built from a machined receiver, rails, sight and articulated foregrip.
 const fwd=[Math.cos(r.ang),Math.sin(r.ang)],right=[-Math.sin(r.ang),Math.cos(r.ang)];
 const weapon=(rx,y,forward,ww,hh,dd,col,e=0)=>{const x=8+right[0]*rx+fwd[0]*(forward+.65),z=13.2+right[1]*rx+fwd[1]*(forward+.65),angle=-r.ang-Math.PI/2;if(!e&&Math.min(ww,hh,dd)>.045)bevel(x,y,z,ww,hh,dd,col,angle);else box(x,y,z,ww,hh,dd,col,angle,e);};
 const kick=r.recoil*.07;weapon(.26,1.03,.58-kick,.21,.24,.48,'#2a3f4e');weapon(.26,1.16,.69-kick,.15,.08,.47,'#819399');weapon(.26,1.09,.98-kick,.075,.08,.32,'#182b35');weapon(.26,1.20,.83-kick,.035,.04,.21,'#5faeb9',.8);weapon(.26,.9,.62-kick,.11,.25,.14,'#182b35');weapon(.32,.78,.4,.21,.24,.35,'#273c49');weapon(.10,.89,.78,.14,.18,.2,'#283e4a');
 for(let k=0;k<5;k++){weapon(.26,1.22,.6+k*.06,.17,.018,.018,'#a2b4b5');weapon(.375,1.07,.56+k*.065,.025,.05,.035,'#10252e');}
 for(const s of [-1,1])weapon(.26+s*.067,1.30,.72,.025,.14,.05,'#243d48');weapon(.26,1.37,.72,.16,.025,.05,'#8eaaa9');weapon(.26,1.24,.72,.16,.025,.05,'#718a91');weapon(.26,1.30,.75,.008,.008,.01,'#80d1ce',.8);weapon(.26,.96,.5,.14,.13,.14,'#85999b');
 if(r.recoil>.6)weapon(.26,1.09,1.17,.15,.15,.035,'#ffe4a2',1);
 end(c);
 for(let z=-5;z<14;z+=3)bloom(c,[8,3.45,z],Math.max(10,65/(1+Math.abs(13-z)*.16)),'#b9ebdf');
};
api.begin=begin;api.end=end;api.box=box;api.bevel=bevel;api.cylinder=cylinder;api.ring=ring;api.project=project;api.shadow=shadow;api.available=true;api.canvas=canvas;
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();api.available=false;});
}catch(e){api.error=e.message;api.available=false;}
})();
