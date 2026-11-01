/* Kestrel studio palette. Read before the main payload to avoid a dark flash. */
(function(){
 let value='light';try{value=localStorage.getItem('fnphraid.theme')||'light';}catch(e){}
 window.FNPHTheme={get light(){return document.documentElement.dataset.theme==='light';},set(value){document.documentElement.dataset.theme=value==='dark'?'dark':'light';try{localStorage.setItem('fnphraid.theme',document.documentElement.dataset.theme);}catch(e){}document.querySelectorAll('[data-theme-select]').forEach(s=>s.value=document.documentElement.dataset.theme);if(window.$&&$.raid&&$.raid.refreshTheme)$.raid.refreshTheme();}};
 document.documentElement.dataset.theme=value==='dark'?'dark':'light';
 document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('[data-theme-select]').forEach(s=>{s.value=document.documentElement.dataset.theme;s.onchange=()=>FNPHTheme.set(s.value);});});
})();
