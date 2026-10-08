# Batch-build WardUnity signed Android App Bundle (Play upload).
param(
  [string]$UnityExe = ""
)

$ErrorActionPreference = "Stop"
$project = Resolve-Path (Join-Path $PSScriptRoot "..")

function Find-Unity {
  if ($UnityExe -and (Test-Path $UnityExe)) { return $UnityExe }
  $roots = @(
    "$env:ProgramFiles\Unity\Hub\Editor",
    "$env:LOCALAPPDATA\Programs\Unity\Hub\Editor"
  )
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    $editor = Get-ChildItem $root -Directory | Sort-Object Name -Descending |
      ForEach-Object { Join-Path $_.FullName "Editor\Unity.exe" } |
      Where-Object { Test-Path $_ } |
      Select-Object -First 1
    if ($editor) { return $editor }
  }
  return $null
}

$unity = Find-Unity
if (-not $unity) {
  Write-Error "Unity Editor not found. Install Unity 6000 LTS + Android Build Support, then re-run."
}

$log = Join-Path $project "Logs\android-aab-build.log"
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
Write-Host "Unity: $unity"
Write-Host "Project: $project"

& $unity `
  -batchmode -nographics -quit `
  -projectPath $project `
  -executeMethod Ward.EditorTools.AndroidBuilder.BuildReleaseAab `
  -logFile $log

if ($LASTEXITCODE -ne 0) {
  Write-Host "----- log tail -----"
  if (Test-Path $log) { Get-Content $log -Tail 80 }
  exit $LASTEXITCODE
}
Write-Host "AAB build finished OK"
