<#
.SYNOPSIS
  PNG의 투명한 여백을 자동으로 찾아 캐릭터/타일 주변으로 딱 맞게 잘라낸다.

.EXAMPLE
  .\trim_transparent.ps1
  # images 폴더의 초상화/타일 PNG를 전부 트림 (배경용 bg_main.png, vn_bg.png는 제외)

.EXAMPLE
  .\trim_transparent.ps1 -Path .\images\vn_portrait_human.png
  # 특정 파일 하나만 트림

.EXAMPLE
  .\trim_transparent.ps1 -Path .\images\vn_portrait_human.png -PaddingPercent 8
  # 여백을 좀 더 넉넉하게 남기고 트림

.EXAMPLE
  .\trim_transparent.ps1 -Path .\images\vn_portrait_human.png,.\images\vn_portrait_goby.png -KeepTopPercent 62
  # 전신 그림에서 위쪽 62%만 남기고 아래(허벅지 아래~발)는 잘라내서 "머리~허벅지" 구도로 확대
#>
param(
    [string[]]$Path,
    [double]$PaddingPercent = 4,
    [int]$AlphaThreshold = 10,
    [double]$KeepTopPercent = 100
)

Add-Type -AssemblyName System.Drawing

$imgDir = Join-Path $PSScriptRoot 'images'

if (-not $Path -or $Path.Count -eq 0) {
    $exclude = @('bg_main.png', 'vn_bg.png')
    $Path = Get-ChildItem -Path $imgDir -Filter '*.png' |
        Where-Object { $exclude -notcontains $_.Name -and $_.Name -notlike '*.original.png' } |
        ForEach-Object { $_.FullName }
}

function Get-AlphaBounds {
    param([byte[]]$Bytes, [int]$Stride, [int]$Width, [int]$Height, [int]$Threshold, [int]$YStart = 0, [int]$YEnd = -1)

    if ($YEnd -lt 0) { $YEnd = $Height - 1 }
    $minX = -1; $maxX = -1; $minY = -1; $maxY = -1

    for ($y = $YStart; $y -le $YEnd; $y++) {
        $rowStart = $y * $Stride
        for ($x = 0; $x -lt $Width; $x++) {
            $alpha = $Bytes[$rowStart + ($x * 4) + 3]
            if ($alpha -gt $Threshold) {
                if ($minY -lt 0) { $minY = $y }
                $maxY = $y
                if ($minX -lt 0 -or $x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
            }
        }
    }

    if ($minX -lt 0) { return $null }
    return [PSCustomObject]@{ MinX = $minX; MinY = $minY; MaxX = $maxX; MaxY = $maxY }
}

foreach ($file in $Path) {
    if (-not (Test-Path $file)) {
        Write-Warning "파일을 찾을 수 없음: $file"
        continue
    }

    $full = (Resolve-Path $file).Path
    $bmp = [System.Drawing.Bitmap]::new($full)

    if ($bmp.PixelFormat -notmatch 'Argb') {
        $converted = New-Object System.Drawing.Bitmap $bmp.Width, $bmp.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($converted)
        $g.DrawImage($bmp, 0, 0, $bmp.Width, $bmp.Height)
        $g.Dispose()
        $bmp.Dispose()
        $bmp = $converted
    }

    $rect = New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
    $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $byteCount = $data.Stride * $bmp.Height
    $bytes = New-Object byte[] $byteCount
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $byteCount)
    $bmp.UnlockBits($data)

    $bounds = Get-AlphaBounds -Bytes $bytes -Stride $data.Stride -Width $bmp.Width -Height $bmp.Height -Threshold $AlphaThreshold

    if ($null -eq $bounds) {
        Write-Warning "완전히 투명한 이미지라 건너뜀: $full"
        $bmp.Dispose()
        continue
    }

    if ($KeepTopPercent -lt 100) {
        $fullH = $bounds.MaxY - $bounds.MinY + 1
        $keepH = [int][Math]::Ceiling($fullH * ($KeepTopPercent / 100.0))
        $newMaxY = [Math]::Min($bounds.MaxY, $bounds.MinY + $keepH - 1)
        $subBounds = Get-AlphaBounds -Bytes $bytes -Stride $data.Stride -Width $bmp.Width -Height $bmp.Height -Threshold $AlphaThreshold -YStart $bounds.MinY -YEnd $newMaxY
        if ($subBounds) {
            $bounds = [PSCustomObject]@{ MinX = $subBounds.MinX; MinY = $bounds.MinY; MaxX = $subBounds.MaxX; MaxY = $newMaxY }
        } else {
            $bounds = [PSCustomObject]@{ MinX = $bounds.MinX; MinY = $bounds.MinY; MaxX = $bounds.MaxX; MaxY = $newMaxY }
        }
    }

    $w = $bounds.MaxX - $bounds.MinX + 1
    $h = $bounds.MaxY - $bounds.MinY + 1

    if ($KeepTopPercent -eq 100 -and $w -eq $bmp.Width -and $h -eq $bmp.Height) {
        Write-Host "이미 꽉 차 있어 트림 불필요: $full"
        $bmp.Dispose()
        continue
    }

    $pad = [int][Math]::Round(([Math]::Max($w, $h)) * ($PaddingPercent / 100.0))

    $cropX = [Math]::Max(0, $bounds.MinX - $pad)
    $cropY = [Math]::Max(0, $bounds.MinY - $pad)
    $cropRight = [Math]::Min($bmp.Width, $bounds.MaxX + 1 + $pad)
    $cropBottom = [Math]::Min($bmp.Height, $bounds.MaxY + 1 + $pad)
    $cropW = $cropRight - $cropX
    $cropH = $cropBottom - $cropY

    $backup = [System.IO.Path]::ChangeExtension($full, $null).TrimEnd('.') + '.original.png'
    if (-not (Test-Path $backup)) {
        Copy-Item -Path $full -Destination $backup
    }

    $origW = $bmp.Width
    $origH = $bmp.Height

    $cropped = New-Object System.Drawing.Bitmap $cropW, $cropH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g2 = [System.Drawing.Graphics]::FromImage($cropped)
    $g2.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH), (New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH), [System.Drawing.GraphicsUnit]::Pixel)
    $g2.Dispose()
    $bmp.Dispose()

    $cropped.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()

    Write-Host "트림 완료: $full  (${origW}x${origH} -> ${cropW}x${cropH})"
}
