# Build web and direct-start offline packages without Python.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
function J($path) { [System.IO.File]::ReadAllText((Join-Path $here $path),[System.Text.Encoding]::UTF8) }
$utf8 = [System.Text.UTF8Encoding]::new($false)
$shell = J 'src/shell.html'
$cssMatch = [regex]::Match($shell,'<style>(.*?)</style>',[System.Text.RegularExpressions.RegexOptions]::Singleline)
$css = $cssMatch.Groups[1].Value
$shell = $shell.Remove($cssMatch.Index,$cssMatch.Length)
$images = ''
foreach ($pair in @(@('kestrel-flight','shipFlightAsset'),@('kestrel-hangar','shipHangarAsset'))) {
 $data = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes((Join-Path $here ("src/assets/"+$pair[0]+'.webp'))))
 $images += '<img hidden alt="" id="'+$pair[1]+'" src="data:image/webp;base64,'+$data+'">'
}
$deckJson = ((J 'src/deck.txt') | ConvertTo-Json -Compress) -replace '</','<\/'
$cssJson = ($css | ConvertTo-Json -Compress) -replace '</','<\/'
$parts = [System.Collections.Generic.List[string]]::new()
$parts.Add('<script>var $ = {};var gameStyle=document.createElement("style");gameStyle.textContent='+$cssJson+';document.head.appendChild(gameStyle);</script>')
$parts.Add('<script>window.FNPH_DECK='+$deckJson+';</script>')
$parts.Add("<script>(function(){`n"+(J 'vendor/radius-raid/jsfxr.js')+"`nwindow.jsfxr=jsfxr;})();</script>")
$parts.Add('<script>'+(J 'src/mapgeo.js')+'</script>')
$order=@('vendor/radius-raid/util.js','src/storage.js','vendor/radius-raid/definitions.js','vendor/radius-raid/text.js','src/hero.js','vendor/radius-raid/enemy.js','src/bullet.js','vendor/radius-raid/explosion.js','vendor/radius-raid/powerup.js','vendor/radius-raid/particle.js','vendor/radius-raid/particleemitter.js','vendor/radius-raid/textpop.js','vendor/radius-raid/levelpop.js','src/core.js','src/raid.js','src/mecha.js','src/campaign.js','src/operations.js','src/mobile.js','src/app.js')
foreach($file in $order){$parts.Add('<script>'+(J $file)+"`n</script>")}
$parts.Add('<script>window.FNPHBoot.finish();</script>')
$runtime=($parts | ForEach-Object {$_.Substring(8,$_.Length-17)}) -join "`n;`n"
$bytes=$utf8.GetBytes($runtime)
$memory=[System.IO.MemoryStream]::new()
$gzip=[System.IO.Compression.GZipStream]::new($memory,[System.IO.Compression.CompressionLevel]::Optimal,$true)
$gzip.Write($bytes,0,$bytes.Length);$gzip.Dispose()
$payload=[Convert]::ToBase64String($memory.ToArray());$memory.Dispose()
$early='<script>'+(J 'src/theme.js')+'</script><script>'+(J 'src/startup.js')+'</script>'
$head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+(J 'src/boot-shell.html')
$bundle=$images+'<script type="application/octet-stream" id="fnphPayload">'+$payload+'</script><script>'+(J 'src/unpack.js')+'</script>'
$html='<!doctype html><html lang="en"><head>'+$head+(J 'src/pwa/head.html')+'</head><body>'+$early+$shell.Replace('/*__SCRIPTS__*/',$bundle)+'</body></html>'
$direct=$images+'<script>window.FNPHBoot.stage("Starting the offline game...","All artwork, questions and sound are inside this file.",70);</script><script>'+$runtime+'</script>'
$offline='<!doctype html><html lang="en"><head>'+$head+'</head><body><script>window.FNPH_OFFLINE_EDITION=true;</script>'+$early+$shell.Replace('/*__SCRIPTS__*/',$direct)+'</body></html>'
$dist=Join-Path $here 'dist';[System.IO.Directory]::CreateDirectory($dist) | Out-Null
[System.IO.File]::WriteAllText((Join-Path $dist 'fnph-raid.html'),$html,$utf8)
[System.IO.File]::WriteAllText((Join-Path $dist 'fnph-raid-offline.html'),$offline,$utf8)
Add-Type -AssemblyName System.IO.Compression
$zipStream=[System.IO.File]::Create((Join-Path $dist 'FNPH-Raid-Offline.zip'))
$zip=[System.IO.Compression.ZipArchive]::new($zipStream,[System.IO.Compression.ZipArchiveMode]::Create)
foreach($pair in @(@('FNPH-Raid/fnph-raid.html',$offline),@('FNPH-Raid/READ-ME.txt',(J 'src/package-readme.txt')))){
 $entry=$zip.CreateEntry($pair[0],[System.IO.Compression.CompressionLevel]::Optimal)
 $stream=$entry.Open();$bytes=$utf8.GetBytes($pair[1]);$stream.Write($bytes,0,$bytes.Length);$stream.Dispose()
}
$zip.Dispose();$zipStream.Dispose()
$sha=[System.Security.Cryptography.SHA256]::Create();$versionBytes=[System.IO.MemoryStream]::new()
$prefix=$utf8.GetBytes($html+(J 'src/pwa/sw.js'));$versionBytes.Write($prefix,0,$prefix.Length)
foreach($name in @('manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png')){
 $bytes=[System.IO.File]::ReadAllBytes((Join-Path $here ("src/pwa/"+$name)));$versionBytes.Write($bytes,0,$bytes.Length)
 Copy-Item -LiteralPath (Join-Path $here ("src/pwa/"+$name)) -Destination (Join-Path $dist $name) -Force
}
$revision=([BitConverter]::ToString($sha.ComputeHash($versionBytes.ToArray()))).Replace('-','').ToLower().Substring(0,16)
$versionBytes.Dispose();$sha.Dispose()
[System.IO.File]::WriteAllText((Join-Path $dist 'sw.js'),(J 'src/pwa/sw.js').Replace('__VERSION__',$revision),$utf8)
Write-Host ('Built web '+[math]::Round($utf8.GetByteCount($html)/1KB)+' KB; direct offline '+[math]::Round($utf8.GetByteCount($offline)/1KB)+' KB')
