# Rebuild 1024² PBR packages (Oniro-class mobile detail) from 4k/8k sources.
Add-Type -AssemblyName System.Drawing
$srcDir = Join-Path $PSScriptRoot "..\public\textures\pbr" | Resolve-Path
$made = 0

function Write-1k([string]$sourcePath, [string]$outPath) {
  $img = [System.Drawing.Image]::FromFile($sourcePath)
  $bmp = New-Object System.Drawing.Bitmap 1024, 1024
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, 1024, 1024)
  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $props = New-Object System.Drawing.Imaging.EncoderParameters 1
  $props.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, 85L)
  $bmp.Save($outPath, $encoder, $props)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}

Get-ChildItem $srcDir -Filter "*_4k.jpg" | ForEach-Object {
  $out = Join-Path $srcDir ($_.Name -replace '_4k\.jpg$', '_1k.jpg')
  Write-1k $_.FullName $out
  $script:made++
  Write-Host "wrote $out"
}
Get-ChildItem $srcDir -Filter "*_8k.jpg" | ForEach-Object {
  $out = Join-Path $srcDir ($_.Name -replace '_8k\.jpg$', '_1k.jpg')
  if ($_.Name -match '_4k') { return }
  # Only generate from 8k when no 4k sibling produced a 1k (walls, disp).
  if ((Test-Path $out) -and $_.Name -notmatch '^wall_') { return }
  Write-1k $_.FullName $out
  $script:made++
  Write-Host "wrote $out"
}
Write-Host "generated/updated $made 1k textures"
