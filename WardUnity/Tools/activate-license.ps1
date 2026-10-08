# Activate Unity Personal/Plus via a .ulf from https://license.unity3d.com/manual
# 1) Generate ALF: Unity.exe -batchmode -nographics -quit -createManualActivationFile
# 2) Upload ALF on the license site, download .ulf
# 3) Run: powershell -File Tools/activate-license.ps1 -UlfPath path\to\Unity_v6.x.ulf
param(
  [Parameter(Mandatory = $true)][string]$UlfPath,
  [string]$UnityExe = ""
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $UlfPath)) { Write-Error "ULF not found: $UlfPath" }

function Find-Unity {
  if ($UnityExe -and (Test-Path $UnityExe)) { return $UnityExe }
  $candidate = Join-Path $env:LOCALAPPDATA "Programs\Unity\Hub\Editor\6000.6.4f1\Editor\Unity.exe"
  if (Test-Path $candidate) { return $candidate }
  return $null
}

$unity = Find-Unity
if (-not $unity) { Write-Error "Unity Editor not found" }

$log = Join-Path (Split-Path $PSScriptRoot) "Logs\license-activate.log"
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
& $unity -batchmode -nographics -quit -manualLicenseFile (Resolve-Path $UlfPath) -logfile $log
Write-Host "exit=$LASTEXITCODE (see $log)"
exit $LASTEXITCODE
