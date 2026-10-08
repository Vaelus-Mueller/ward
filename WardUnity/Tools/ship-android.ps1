# After Unity Personal license is active: build debug APK + signed AAB to Drive.
param(
  [string]$UnityExe = "$env:LOCALAPPDATA\Programs\Unity\Hub\Editor\6000.6.4f1\Editor\Unity.exe",
  [switch]$SkipApk,
  [switch]$SkipAab
)

$ErrorActionPreference = "Stop"
$cli = "$env:LOCALAPPDATA\Unity\bin\unity.exe"
$project = Resolve-Path (Join-Path $PSScriptRoot "..")

if (Test-Path $cli) {
  & $cli auth status
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Not signed in. Starting browser login..."
    & $cli auth login
  }
  & $cli license activate --personal --accept-eula
  & $cli license status
}

if (-not (Test-Path $UnityExe)) {
  Write-Error "Unity Editor missing at $UnityExe"
}

function Invoke-UnityMethod([string]$method, [string]$logName) {
  $log = Join-Path $project "Logs\$logName"
  New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
  if (Test-Path $log) { Remove-Item $log -Force }
  $args = @(
    "-batchmode", "-nographics", "-quit",
    "-projectPath", $project,
    "-executeMethod", $method,
    "-logFile", $log
  )
  $proc = Start-Process -FilePath $UnityExe -ArgumentList $args -PassThru
  $deadline = (Get-Date).AddMinutes(50)
  while ((Get-Date) -lt $deadline) {
    $alive = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    $done = $false
    if (Test-Path $log) {
      $tail = Get-Content $log -Tail 30 -ErrorAction SilentlyContinue
      if ($tail -match "return code|Exiting batchmode successfully|Scripts have compiler errors|build failed") {
        $done = -not $alive
        if (-not $alive) { break }
      }
    }
    if (-not $alive -and (Test-Path $log)) { break }
    Start-Sleep 5
  }
  $code = 1
  if (Test-Path $log) {
    $tailText = (Get-Content $log -Tail 40) -join "`n"
    $matches = [regex]::Matches($tailText, "return code (\d+)")
    if ($matches.Count -gt 0) { $code = [int]$matches[$matches.Count - 1].Groups[1].Value }
    elseif ($tailText -match "Exiting batchmode successfully|Ward APK ready|Ward AAB ready") { $code = 0 }
  }
  if ($code -ne 0) {
    Write-Host "----- $logName tail (code $code) -----"
    Get-Content $log -Tail 40 -EA SilentlyContinue
    exit $code
  }
}

if (-not $SkipApk) {
  Invoke-UnityMethod "Ward.EditorTools.AndroidBuilder.BuildDebugApk" "android-build.log"
  $drive = "G:\My Drive\Ward\releases\apk\ward-debug.apk"
  if (Test-Path $drive) {
    $size = [math]::Round((Get-Item $drive).Length / 1MB, 1)
    Write-Host "Drive APK: $drive ($size MB)"
  }
}

if (-not $SkipAab) {
  Invoke-UnityMethod "Ward.EditorTools.AndroidBuilder.BuildReleaseAab" "android-aab-build.log"
  $driveAab = "G:\My Drive\Ward\releases\apk\ward-release.aab"
  if (Test-Path $driveAab) {
    $size = [math]::Round((Get-Item $driveAab).Length / 1MB, 1)
    Write-Host "Drive AAB: $driveAab ($size MB)"
  }
}

Write-Host "Ship pipeline finished."
