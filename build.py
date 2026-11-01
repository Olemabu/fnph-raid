"""Build FNPH Raid into one file: dist/fnph-raid.html (open it in Chrome to play).
Run:  python build.py
"""
import json, os, gzip, base64
HERE=os.path.dirname(os.path.abspath(__file__))
def J(p): return open(os.path.join(HERE,p),encoding='utf-8').read()
deck=J('src/deck.txt')
parts=[
 '<script>var $ = {};</script>',
 '<script>window.FNPH_DECK = '+json.dumps(deck).replace('</','<\\/')+';</script>',
 '<script>/* jsfxr (sound synthesis), wrapped so its globals stay private */\n(function(){\n'+J('vendor/radius-raid/jsfxr.js')+'\nwindow.jsfxr = jsfxr;\n})();</script>',
 '<script>/* FNPH map geometry */\n'+J('src/mapgeo.js')+'</script>',
]
order=['vendor/radius-raid/util.js','src/storage.js','vendor/radius-raid/definitions.js','vendor/radius-raid/text.js','src/hero.js','vendor/radius-raid/enemy.js','src/bullet.js','vendor/radius-raid/explosion.js','vendor/radius-raid/powerup.js','vendor/radius-raid/particle.js','vendor/radius-raid/particleemitter.js','vendor/radius-raid/textpop.js','vendor/radius-raid/levelpop.js','src/core.js','src/raid.js','src/loadouts.js','src/stage3d.js','src/mode-race.js','src/mode-fps.js','src/mode-stealth.js','src/mecha.js','src/campaign.js','src/operations.js']
for f in order: parts.append('<script>/* '+f+' */\n'+J(f)+'\n</script>')
parts.append('<script>window.FNPHBoot.finish();</script>')
# Compress all executable content, including the syllabus, into the same HTML.
# Script boundaries are retained when joined; modules keep their existing scope.
runtime='\n;\n'.join(part[8:-9] for part in parts)
payload=base64.b64encode(gzip.compress(runtime.encode('utf-8'),mtime=0)).decode('ascii')
bundle='<script>'+J('src/startup.js')+'</script><script type="application/octet-stream" id="fnphPayload">'+payload+'</script><script>'+J('src/unpack.js')+'</script>'
body=J('src/shell.html').replace('/*__SCRIPTS__*/',bundle)
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>'+body+'</body></html>'
os.makedirs(os.path.join(HERE,'dist'),exist_ok=True)
open(os.path.join(HERE,'dist','fnph-raid.html'),'w',encoding='utf-8').write(html)
print('Built dist/fnph-raid.html ('+str(len(html)//1024)+' KB)')
