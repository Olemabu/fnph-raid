# Build script for Windows PowerShell
$ErrorActionPreference = 'Stop'
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$here = $PSScriptRoot

function J($relPath) {
    return [System.IO.File]::ReadAllText((Join-Path $here $relPath), [System.Text.Encoding]::UTF8)
}

$deck = J('src/deck.txt')
$deckJson = ($deck | ConvertTo-Json -Compress) -replace '</', '<\/'

$parts = [System.Collections.Generic.List[string]]::new()
$shipAssets = @{}
foreach ($name in @('kestrel-flight', 'kestrel-hangar')) {
    $shipAssets[$name] = 'data:image/webp;base64,' + [Convert]::ToBase64String([System.IO.File]::ReadAllBytes((Join-Path $here ("src/assets/" + $name + ".webp"))))
}
$shipJson = $shipAssets | ConvertTo-Json -Compress
$parts.Add('<script>var $ = {};window.FNPH_SHIP_ASSETS=' + $shipJson + ';</script>')
$parts.Add("<script>window.FNPH_DECK = $deckJson;</script>")
$parts.Add("<script>/* jsfxr (sound synthesis), wrapped so its globals stay private */`n(function(){`n" + (J('vendor/radius-raid/jsfxr.js')) + "`nwindow.jsfxr = jsfxr;`n})();</script>")
$parts.Add("<script>/* FNPH map geometry */`n" + (J('src/mapgeo.js')) + "`n</script>")

$order = @(
    'vendor/radius-raid/util.js',
    'src/storage.js',
    'vendor/radius-raid/definitions.js',
    'vendor/radius-raid/text.js',
    'src/hero.js',
    'vendor/radius-raid/enemy.js',
    'src/bullet.js',
    'vendor/radius-raid/explosion.js',
    'vendor/radius-raid/powerup.js',
    'vendor/radius-raid/particle.js',
    'vendor/radius-raid/particleemitter.js',
    'vendor/radius-raid/textpop.js',
    'vendor/radius-raid/levelpop.js',
    'src/core.js',
    'src/raid.js',
    'src/mecha.js',
    'src/campaign.js',
    'src/operations.js',
    'src/mobile.js',
    'src/app.js'
)

foreach ($f in $order) {
    $content = J($f)
    $parts.Add("<script>/* $f */`n$content`n</script>")
}

$parts.Add('<script>window.FNPHBoot.finish();</script>')

$runtime = ($parts | ForEach-Object { $_.Substring(8, $_.Length - 17) }) -join "`n;`n"
$runtimeBytes = [System.Text.Encoding]::UTF8.GetBytes($runtime)
$compressed = [System.IO.MemoryStream]::new()
$gzip = [System.IO.Compression.GZipStream]::new($compressed, [System.IO.Compression.CompressionLevel]::Optimal, $true)
$gzip.Write($runtimeBytes, 0, $runtimeBytes.Length)
$gzip.Dispose()
$payload = [Convert]::ToBase64String($compressed.ToArray())
$compressed.Dispose()
$scripts = '<script>' + (J('src/theme.js')) + '</script><script>' + (J('src/startup.js')) + '</script><script type="application/octet-stream" id="fnphPayload">' + $payload + '</script><script>' + (J('src/unpack.js')) + '</script>'
$shell = J('src/shell.html')
$body = $shell.Replace('/*__SCRIPTS__*/', $scripts)
$html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + $body + '</body></html>'

$distDir = Join-Path $here 'dist'
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$html = $html.Replace('</head>', (J('src/pwa/head.html')) + '</head>')
$outFile = Join-Path $distDir 'fnph-raid.html'
[System.IO.File]::WriteAllText($outFile, $html, [System.Text.Encoding]::UTF8)
Write-Host "Built dist/fnph-raid.html ($([Math]::Floor($html.Length / 1024)) KB)"

$sha = [System.Security.Cryptography.SHA256]::Create()
$versionBytes = [System.IO.MemoryStream]::new()
$versionPrefix = [System.Text.Encoding]::UTF8.GetBytes($html + (J('src/pwa/sw.js')))
$versionBytes.Write($versionPrefix,0,$versionPrefix.Length)
foreach ($filename in @('manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png')) { $bytes = [System.IO.File]::ReadAllBytes((Join-Path $here ("src/pwa/" + $filename))); $versionBytes.Write($bytes,0,$bytes.Length) }
$revision = ([BitConverter]::ToString($sha.ComputeHash($versionBytes.ToArray()))).Replace('-', '').ToLower().Substring(0,16)
$versionBytes.Dispose()
$sha.Dispose()
foreach ($filename in @('manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png')) { Copy-Item -LiteralPath (Join-Path $here ("src/pwa/" + $filename)) -Destination (Join-Path $distDir $filename) -Force }
[System.IO.File]::WriteAllText((Join-Path $distDir 'sw.js'), (J('src/pwa/sw.js')).Replace('__VERSION__',$revision), [System.Text.UTF8Encoding]::new($false))
