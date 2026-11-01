/* Explicit free-run loadouts. Campaign arsenal progression remains earned. */
(function(){
'use strict';
const R=$.raid;
R.vehicles=[
 {id:'ambulance',name:'Response ambulance',color:'#d9dfda',speed:1,handling:1,description:'Balanced speed and steering · emergency lights'},
 {id:'coupe',name:'Apex rally coupe',color:'#bc7455',speed:1.18,handling:1.3,description:'Faster approach · sharper steering'},
 {id:'suv',name:'Bastion armoured SUV',color:'#718a73',speed:.88,handling:.8,description:'Slower approach · steadier steering'}
];
R.weaponCatalog=[
 {id:'vanguard',name:'Vanguard XR-7 modular rifle',fireRate:5,speed:12,count:1,spread:.06,damage:1,piercing:0,size:28,lineWidth:3,color:'#e2b56e',homing:0,description:'Detailed modular rifle · recoil and carrying motion'},
 {id:'pulse',name:'Pulse carbine',fireRate:5,speed:10,count:1,spread:.1,damage:1,piercing:0,size:24,lineWidth:2.6,color:'#e3bb7c',homing:0,description:'Single round · 3 hits per drone'},
 {id:'twin',name:'Twin-burst SMG',fireRate:8,speed:12,count:2,spread:.08,damage:.75,piercing:0,size:24,lineWidth:2.6,color:'#9bce9b',homing:0,description:'Two rounds per burst · 2 bursts per drone'},
 {id:'rail',name:'Longshot rail rifle',fireRate:20,speed:18,count:1,spread:0,damage:3,piercing:1,size:36,lineWidth:3.6,color:'#84c8e3',homing:0,description:'Slow precision shot · 1 hit per drone'}
];
R.covertTools=[
 {id:'dart',name:'Stun dart pistol',range:5,duration:7,cooldown:4,description:'Stun one visible patrol · 4 second recharge'},
 {id:'emp',name:'EMP projector',range:3.5,duration:5,cooldown:9,description:'Disable nearby patrols together · 9 second recharge'}
];
R.vehicle=()=>R.vehicles.find(v=>v.id===(R.runLoadout||{}).vehicle)||R.vehicles[0];
R.covertTool=()=>R.covertTools.find(v=>v.id===(R.runLoadout||{}).tool)||R.covertTools[0];
R.applySelectedWeapon=()=>{const selected=R.weaponCatalog.find(w=>w.id===(R.runLoadout||{}).weapon);if(selected)$.arsenal={...$.arsenal,...selected};};
})();
