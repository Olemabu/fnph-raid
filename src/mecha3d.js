/* Original real-time hard-surface 3D mecha. No external assets or renderer dependencies. */
(function(){
'use strict';
const R=$.raid,flat=R.drawFrame,cv=document.createElement('canvas');cv.width=cv.height=512;
const gl=cv.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:false});
R.mecha3D={available:false};if(!gl)return;
try{
const vertex=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;attribute float aGlow;uniform mat4 uProjection;uniform mat4 uView;varying vec3 vPosition;varying vec3 vNormal;varying vec3 vColor;varying float vGlow;void main(){vPosition=aPosition;vNormal=aNormal;vColor=aColor;vGlow=aGlow;gl_Position=uProjection*uView*vec4(aPosition,1.0);}`;
const fragment=`precision mediump float;varying vec3 vPosition;varying vec3 vNormal;varying vec3 vColor;varying float vGlow;uniform vec3 uEye;void main(){vec3 n=normalize(vNormal),v=normalize(uEye-vPosition);vec3 l=normalize(vec3(-3.0,5.0,6.0)),rim=normalize(vec3(4.0,2.0,-3.0));float diffuse=max(dot(n,l),0.0),edge=max(dot(n,rim),0.0),spec=pow(max(dot(n,normalize(l+v)),0.0),48.0);float fresnel=pow(1.0-max(dot(n,v),0.0),3.0);vec3 lit=vColor*(0.19+diffuse*0.78+edge*0.22)+vec3(0.80,0.88,0.96)*spec*0.65+vec3(0.25,0.49,0.62)*fresnel*0.35;lit=mix(lit,vColor*1.25,vGlow);gl_FragColor=vec4(lit,1.0);}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const stride=10*4;
for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,3],['aColor',3,6],['aGlow',1,9]]){const l=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,stride,offset*4);}
const proj=gl.getUniformLocation(program,'uProjection'),view=gl.getUniformLocation(program,'uView'),eyeLoc=gl.getUniformLocation(program,'uEye');gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
const rgb=hex=>{const n=parseInt(hex.slice(1,7),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
const norm=v=>{const k=Math.hypot(...v)||1;return v.map(x=>x/k);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];}
function lookAt(eye,target){const z=norm(eye.map((x,i)=>x-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
let mesh=[];
function tri(a,b,c,col,em=0){const n=norm(cross(b.map((x,i)=>x-a[i]),c.map((x,i)=>x-a[i])));for(const p of[a,b,c])mesh.push(...p,...n,...col,em);}
function quad(a,b,c,d,col,em=0){tri(a,b,c,col,em);tri(a,c,d,col,em);}
// Bevelled armour prisms retain real side faces and chamfers under rotation.
function armour(x,y,z,w,h,d,col,rz=0,ry=0,em=0){const b=Math.min(w,h)*.16,p=[[-w/2+b,-h/2],[w/2-b,-h/2],[w/2,-h/2+b],[w/2,h/2-b],[w/2-b,h/2],[-w/2+b,h/2],[-w/2,h/2-b],[-w/2,-h/2+b]];
 const transform=(px,py,pz)=>{const xx=px*Math.cos(rz)-py*Math.sin(rz),yy=px*Math.sin(rz)+py*Math.cos(rz);return[x+xx*Math.cos(ry)+pz*Math.sin(ry),y+yy,z-xx*Math.sin(ry)+pz*Math.cos(ry)];};
 const f=p.map(q=>transform(q[0],q[1],d/2)),back=p.map(q=>transform(q[0],q[1],-d/2)),fc=transform(0,0,d/2),bc=transform(0,0,-d/2);
 for(let k=0;k<8;k++){const j=(k+1)%8;tri(fc,f[k],f[j],col,em);tri(bc,back[j],back[k],col,em);quad(back[k],back[j],f[j],f[k],col,em);}
}
function cylinder(x,y,z,r,d,col,em=0,segments=12){const front=[x,y,z+d/2],back=[x,y,z-d/2];for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments,p=[x+Math.cos(a)*r,y+Math.sin(a)*r,z+d/2],q=[x+Math.cos(b)*r,y+Math.sin(b)*r,z+d/2],u=[p[0],p[1],z-d/2],v=[q[0],q[1],z-d/2];tri(front,p,q,col,em);tri(back,v,u,col,em);quad(p,u,v,q,col,em);}}
function makeModel(tier,time,f,recoil){mesh=[];const ink=rgb(f.ink),metal=rgb(f.metal),light=rgb(f.light),core=rgb(f.core),dark=rgb('#111b24'),chrome=rgb('#9eafb5');const breath=Math.sin(time*1.4)*.025;
 // Skeletal chassis, segmented abdomen and armoured pelvis.
 armour(0,.35+breath,0,1.05,1.35,.52,ink);armour(0,-.50,0,.95,.42,.56,metal);armour(0,-.69,.22,.56,.23,.29,ink);
 for(let k=0;k<3;k++)armour(0,-.12-k*.13+breath,.30,.55-k*.06,.1,.16,k%2?chrome:metal);
 armour(0,.65+breath,.28,1.04,.68,.38,metal);armour(-.25,.82+breath,.52,.48,.28,.18,light,.20);armour(.25,.82+breath,.52,.48,.28,.18,light,-.20);
 cylinder(0,.48+breath,.56,.22,.12,dark);cylinder(0,.48+breath,.64,.15,.08,core,1);cylinder(0,.48+breath,.69,.07,.025,light,.7);
 for(const s of[-1,1]){
  const stride=Math.sin(time*1.5+s)*.025;
  // Hips, articulated legs, machined knee caps, shin shells and boots.
  cylinder(s*.33,-.67,.02,.16,.38,chrome);armour(s*.34,-1.03,.01,.46,.68,.46,metal,s*.035);
  cylinder(s*.34,-1.40,.12,.16,.48,dark);cylinder(s*.34,-1.40,.39,.11,.07,chrome);
  armour(s*.35,-1.83+stride,.09,.49,.73,.49,metal,-s*.045);armour(s*.35,-1.77+stride,.36,.31,.42,.10,ink);
  armour(s*.35,-1.78+stride,.425,.055,.30,.035,core,0,0,.8);
  armour(s*.36,-2.27,.24,.61,.24,.86,ink);armour(s*.36,-2.14,.45,.48,.15,.46,light);
  for(const xx of[-.13,.13])cylinder(s*.35+xx,-1.56,.37,.025,.04,chrome,0,8);
  // Shoulder hinges, layered pauldrons, elbow bearings and forearm housings.
  cylinder(s*.65,.75,.02,.21,.5,dark);const a=s*(.89+tier*.025);
  armour(a,.85+breath,.04,.64+tier*.05,.64,.66,metal,-s*.14);armour(a,1.08+breath,.30,.46,.19,.13,light,-s*.14);
  armour(a,.83+breath,.41,.36,.17,.05,ink,-s*.14);armour(a,.81+breath,.45,.27,.035,.03,core,-s*.14,0,1);
  armour(s*.91,.28+breath,.01,.29,.63,.32,ink,s*.05);cylinder(s*.93,-.06,.06,.15,.47,chrome);
  armour(s*.98,-.43+breath,.10,.47,.64,.48,metal,-s*.07);armour(s*.98,-.40+breath,.37,.28,.38,.09,ink);
  armour(s*.98,-.39+breath,.43,.05,.28,.04,core,0,0,.8);armour(s*.99,-.84,.1,.28,.23,.34,dark);
  // Real gun housing and concentric muzzle geometry.
  const gz=.57-(recoil||0)*.08;armour(s*1.0,-.62,gz,.26,.35,.72,ink);armour(s*1.0,-.48,gz,.20,.06,.66,chrome);
  cylinder(s*1.0,-.63,gz+.42,.12,.18,metal);cylinder(s*1.0,-.63,gz+.52,.075,.03,dark);cylinder(s*1.0,-.63,gz+.54,.035,.01,core,.8);
  for(let k=0;k<3;k++)armour(s*1.145,-.61+k*.075,gz,.022,.03,.31,light);
  for(const dx of[-.17,.17])for(const dy of[-.18,.18])cylinder(a+dx,.86+dy+breath,.40,.027,.025,chrome,0,8);
  // Back-mounted thrusters and progressively larger hardware, not a palette swap.
  cylinder(s*.48,.43,-.43,.21,.42,dark);cylinder(s*.48,.43,-.66,.15,.04,core,.85);
  if(tier>=1){armour(s*.58,1.25,-.12,.27,.60,.32,ink);for(let k=0;k<3;k++)armour(s*.58,1.12+k*.13,.065,.18,.05,.04,core,0,0,.8);}
  if(tier>=2){armour(s*(1.02+tier*.08),.55,-.49,.46,1.65,.13,metal,-s*.51,-s*.10);armour(s*(1.05+tier*.08),.59,-.39,.055,1.40,.045,core,-s*.51,0,.8);}
  if(tier>=3){armour(s*1.56,-.03,-.54,.40,1.10,.10,ink,-s*.70);armour(s*1.64,-.02,-.46,.045,.84,.035,light,-s*.70);}
  if(tier>=4){armour(s*.85,1.58,-.36,.16,.70,.15,light,-s*.35);cylinder(s*1.20,.84,.49,.10,.06,core,.9);}
 }
 // Multi-part helmet, brow, emissive visor, faceplate and sensor antennae.
 cylinder(0,1.21,.02,.14,.28,dark);armour(0,1.48,.06,.46,.53,.46,ink);armour(0,1.61,.22,.50,.20,.22,metal);
 armour(0,1.49,.325,.36,.085,.05,core,0,0,1);armour(0,1.33,.31,.17,.24,.17,light);armour(0,1.76,.04,.16,.18,.26,metal);
 for(const s of[-1,1]){armour(s*.25,1.85,-.02,.055,.53,.07,light,-s*.30);cylinder(s*.25,1.48,.04,.10,.30,chrome);}
 if(tier===4){for(let k=0;k<32;k++){const a=k*Math.PI*2/32,b=(k+1)*Math.PI*2/32;quad([Math.cos(a)*.66,2.12,Math.sin(a)*.66],[Math.cos(b)*.66,2.12,Math.sin(b)*.66],[Math.cos(b)*.70,2.12,Math.sin(b)*.70],[Math.cos(a)*.70,2.12,Math.sin(a)*.70],core,.85);}}
}
let lost=false;cv.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;R.mecha3D.available=false});
R.mecha3D.available=true;R.mecha3D.renderer='WebGL mesh';
R.drawFrame=function(c,x,y,scale,tier,time,topDown,heading,recoil){
 if(lost)return flat(c,x,y,scale,tier,time,topDown,heading,recoil);
 try{const f=R.campaign&&tier===R.campaign.frameTier()?R.campaign.frameLook():R.frames[tier];makeModel(tier,time,f,recoil);
 gl.viewport(0,0,512,512);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh),gl.DYNAMIC_DRAW);
 const orbit=topDown?.12:(R.modelOrbit||.38)+Math.sin(time*.25)*.04,eye=topDown?[1.5,4.5,7.5]:[Math.sin(orbit)*8.3,1.9,Math.cos(orbit)*8.3];
 gl.uniformMatrix4fv(proj,false,new Float32Array(perspective(.64,1,.1,40)));gl.uniformMatrix4fv(view,false,new Float32Array(lookAt(eye,[0,-.12,0])));gl.uniform3fv(eyeLoc,new Float32Array(eye));gl.drawArrays(gl.TRIANGLES,0,mesh.length/10);
 c.save();c.translate(x,y);if(topDown){c.rotate((heading||0)+Math.PI/2);const size=78*scale;c.drawImage(cv,-size/2,-size/2,size,size);}else{const size=270*scale;c.drawImage(cv,-size/2,-size/2,size,size);}c.restore();
 }catch(e){lost=true;R.mecha3D.available=false;flat(c,x,y,scale,tier,time,topDown,heading,recoil);}
};
const hangar=document.querySelector('.hangar');if(hangar){hangar.addEventListener('pointermove',e=>{const r=hangar.getBoundingClientRect();R.modelOrbit=.38+(e.clientX-r.left-r.width*.7)/r.width*.8;});hangar.addEventListener('pointerleave',()=>R.modelOrbit=.38);}
}catch(e){R.mecha3D.available=false;}
})();
