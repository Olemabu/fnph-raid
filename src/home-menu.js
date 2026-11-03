/* One-screen hangar; existing controls move into menus without losing handlers. */
(function(){
'use strict';
const R=$.raid,Q=s=>document.querySelector(s),home=Q('#home');
home.classList.add('compactHome');
const nav=document.createElement('nav');nav.className='homeDock';nav.setAttribute('aria-label','Start page menus');
const dialog=document.createElement('dialog');dialog.id='homeOptions';dialog.setAttribute('aria-labelledby','homeMenuTitle');
dialog.innerHTML='<header class="homeMenuHeader"><h2 id="homeMenuTitle">Options</h2><button class="btn" id="homeMenuClose" aria-label="Close menu">Close ×</button></header><nav class="homeMenuTabs" aria-label="Options categories"></nav><div class="homeMenuBody"></div>';
home.append(nav,dialog);
const tabs=dialog.querySelector('.homeMenuTabs'),body=dialog.querySelector('.homeMenuBody'),entries=new Map();let opener=null;
function add(key,label,nodes){
 const pane=document.createElement('section');pane.id='homePane-'+key;pane.className='homeMenuPane';pane.hidden=true;pane.setAttribute('aria-label',label);
 for(const node of nodes)if(node)pane.append(node);body.append(pane);
 const buttons=[];for(const root of [nav,tabs]){const button=document.createElement('button');button.className='btn';button.textContent=label;button.dataset.homeMenu=key;button.setAttribute('aria-controls',pane.id);button.setAttribute('aria-haspopup','dialog');button.onclick=()=>open(key,button);root.append(button);buttons.push(button);}
 entries.set(key,{pane,buttons,label});
}
const study=Q('#studyQuery')?.closest('.appTools'),install=Q('#offlineStatus')?.closest('.appTools'),theme=Q('#home .themeSettings'),more=Q('#home .freeFlight');
if(more)more.open=true;
add('study','Study session',[study]);add('practice','Free flight',[Q('#home .operations')]);add('options','Options',[theme,more]);add('progress','Progress',[Q('#home .campaignLedger'),Q('#chapterRail')]);add('install','Install & saves',[install]);
function open(key,button){
 const entry=entries.get(key);if(!entry)return;
 if(!dialog.open)opener=button;
 for(const [name,item] of entries){item.pane.hidden=name!==key;for(const b of item.buttons)b.setAttribute('aria-expanded',String(name===key));}
 Q('#homeMenuTitle').textContent=entry.label;body.scrollTop=0;
 if(!dialog.open)dialog.showModal();
 const focus=entry.pane.querySelector('textarea,select,input:not([hidden]),button:not([disabled])');(focus||Q('#homeMenuClose')).focus({preventScroll:true});
}
function close(){if(dialog.open)dialog.close();}
Q('#homeMenuClose').onclick=close;
dialog.addEventListener('close',()=>{for(const entry of entries.values())for(const b of entry.buttons)b.setAttribute('aria-expanded','false');if(!home.hidden)opener?.focus({preventScroll:true});});
dialog.addEventListener('click',e=>{if(e.target===dialog)close();if(e.target.closest('[data-go],#bPad'))close();});
new MutationObserver(()=>{if(home.hidden)close();}).observe(home,{attributes:true,attributeFilter:['hidden']});
const start=R.start;R.start=function(){close();return start.apply(this,arguments);};
R.homeMenu={open,close,isOpen:()=>dialog.open};
})();
