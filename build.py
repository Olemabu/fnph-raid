"""Build FNPH Raid into one file: dist/fnph-raid.html (open it in Chrome to play).
Run:  python build.py
"""
import json, os, gzip, base64, hashlib, shutil, re, zipfile
HERE=os.path.dirname(os.path.abspath(__file__))
def J(p): return open(os.path.join(HERE,p),encoding='utf-8').read()
shell=J('src/shell.html')
css=re.search(r'<style>(.*?)</style>',shell,re.S).group(1)
shell=re.sub(r'<style>.*?</style>','',shell,count=1,flags=re.S)
ship_assets={name:'data:image/webp;base64,'+base64.b64encode(open(os.path.join(HERE,'src/assets/'+name+'.webp'),'rb').read()).decode('ascii') for name in ['kestrel-flight','kestrel-hangar']}
images=''.join('<img hidden alt="" id="'+ident+'" src="'+ship_assets[name]+'">' for name,ident in [('kestrel-flight','shipFlightAsset'),('kestrel-hangar','shipHangarAsset')])
parts=[
 '<script>var $ = {};var gameStyle=document.createElement("style");gameStyle.textContent='+json.dumps(css).replace('</','<\\/')+';document.head.appendChild(gameStyle);</script>',
 '<script>window.FNPH_DECK = '+json.dumps(J('src/deck.txt')).replace('</','<\\/')+';</script>',
 '<script>/* jsfxr */\n(function(){\n'+J('vendor/radius-raid/jsfxr.js')+'\nwindow.jsfxr = jsfxr;\n})();</script>',
 '<script>/* map geometry */\n'+J('src/mapgeo.js')+'</script>',
]
order=['vendor/radius-raid/util.js','src/storage.js','vendor/radius-raid/definitions.js','vendor/radius-raid/text.js','src/hero.js','vendor/radius-raid/enemy.js','src/bullet.js','vendor/radius-raid/explosion.js','vendor/radius-raid/powerup.js','vendor/radius-raid/particle.js','vendor/radius-raid/particleemitter.js','vendor/radius-raid/textpop.js','vendor/radius-raid/levelpop.js','src/core.js','src/raid.js','src/mecha.js','src/campaign.js','src/operations.js','src/mobile.js','src/app.js']
for f in order: parts.append('<script>/* '+f+' */\n'+J(f)+'\n</script>')
parts.append('<script>window.FNPHBoot.finish();</script>')
# Compress all executable content, including the syllabus, into the same HTML.
# Script boundaries are retained when joined; modules keep their existing scope.
runtime='\n;\n'.join(part[8:-9] for part in parts)
payload=base64.b64encode(gzip.compress(runtime.encode('utf-8'),mtime=0)).decode('ascii')
early='<script>'+J('src/theme.js')+'</script><script>'+J('src/startup.js')+'</script>'
bundle=images+'<script type="application/octet-stream" id="fnphPayload">'+payload+'</script><script>'+J('src/unpack.js')+'</script>'
def wrap(scripts,offline=False):
 head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+J('src/boot-shell.html')
 if not offline: head+=J('src/pwa/head.html')
 prefix=('<script>window.FNPH_OFFLINE_EDITION=true;</script>' if offline else '')+early
 return '<!doctype html><html lang="en"><head>'+head+'</head><body>'+prefix+shell.replace('/*__SCRIPTS__*/',scripts)+'</body></html>'
html=wrap(bundle)
offline=wrap(images+'<script>window.FNPHBoot.stage("Starting the offline game…","All artwork, questions and sound are inside this file.",70);</script><script>'+runtime+'</script>',True)
os.makedirs(os.path.join(HERE,'dist'),exist_ok=True)
open(os.path.join(HERE,'dist','fnph-raid.html'),'w',encoding='utf-8').write(html)
open(os.path.join(HERE,'dist','fnph-raid-offline.html'),'w',encoding='utf-8').write(offline)
readme=J('src/package-readme.txt')
with zipfile.ZipFile(os.path.join(HERE,'dist','FNPH-Raid-Offline.zip'),'w',zipfile.ZIP_DEFLATED,compresslevel=9) as package:
 package.writestr('FNPH-Raid/fnph-raid.html',offline)
 package.writestr('FNPH-Raid/READ-ME.txt',readme)
print('Built web: '+str(len(html.encode('utf-8'))//1024)+' KB; direct offline: '+str(len(offline.encode('utf-8'))//1024)+' KB; ZIP: '+str(os.path.getsize(os.path.join(HERE,'dist','FNPH-Raid-Offline.zip'))//1024)+' KB')


revision_hash=hashlib.sha256(html.encode('utf-8')+J('src/pwa/sw.js').encode('utf-8'))
for filename in ['manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png']:
 revision_hash.update(open(os.path.join(HERE,'src/pwa',filename),'rb').read())
revision=revision_hash.hexdigest()[:16]
for filename in ['manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png']:
 shutil.copyfile(os.path.join(HERE,'src/pwa',filename),os.path.join(HERE,'dist',filename))
open(os.path.join(HERE,'dist/sw.js'),'w',encoding='utf-8').write(J('src/pwa/sw.js').replace('__VERSION__',revision))
