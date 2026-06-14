$ErrorActionPreference = 'Stop'
$binDir = Join-Path $PSScriptRoot 'bin'
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

if (Test-Path (Join-Path $binDir 'tectonic.exe')) {
  Write-Host 'Tectonic already installed in pdf-service/bin.'
  exit 0
}

$zip = Join-Path $env:TEMP 'tectonic.zip'
$url = 'https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.16.9/tectonic-0.16.9-x86_64-pc-windows-msvc.zip'
Write-Host 'Downloading Tectonic LaTeX engine...'
Invoke-WebRequest -Uri $url -OutFile $zip
Expand-Archive -Path $zip -DestinationPath $binDir -Force
Write-Host 'Installed tectonic.exe to pdf-service/bin.'
