Add-Type -AssemblyName System.Drawing

$imgDir = Join-Path $PSScriptRoot 'images'
if (-not (Test-Path $imgDir)) { New-Item -ItemType Directory -Path $imgDir | Out-Null }

function New-PlaceholderImage {
    param(
        [string]$Path,
        [int]$Width,
        [int]$Height,
        [string]$ColorTop,
        [string]$ColorBottom,
        [string]$Title,
        [string]$Subtitle,
        [switch]$Transparent,
        [switch]$Circle
    )

    $bmp = New-Object System.Drawing.Bitmap $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $cTop = [System.Drawing.ColorTranslator]::FromHtml($ColorTop)
    $cBottom = [System.Drawing.ColorTranslator]::FromHtml($ColorBottom)

    if ($Transparent) {
        $g.Clear([System.Drawing.Color]::Transparent)
        $rect = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTop, $cBottom, 90)
        if ($Circle) {
            $pad = [int]($Width * 0.06)
            $g.FillEllipse($brush, $pad, $pad, $Width - 2*$pad, $Height - 2*$pad)
            $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180,255,255,255)), 4
            $g.DrawEllipse($pen, $pad, $pad, $Width - 2*$pad, $Height - 2*$pad)
        } else {
            $margin = [int]($Width * 0.05)
            $rr = New-Object System.Drawing.Rectangle $margin, $margin, ($Width - 2*$margin), ($Height - 2*$margin)
            $g.FillRectangle($brush, $rr)
        }
    } else {
        $rect = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTop, $cBottom, 90)
        $g.FillRectangle($brush, $rect)
    }

    $titleSize = [Math]::Max(14, [int]($Width / 12))
    $subSize = [Math]::Max(10, [int]($Width / 26))
    $fontTitle = [System.Drawing.Font]::new('Malgun Gothic', [single]$titleSize, [System.Drawing.FontStyle]::Bold)
    $fontSub = [System.Drawing.Font]::new('Malgun Gothic', [single]$subSize, [System.Drawing.FontStyle]::Regular)
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235,255,255,255))
    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(140,0,0,0))

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $titleRect = [System.Drawing.RectangleF]::new(10, ($Height/2 - $titleSize*1.6), ($Width-20), ($titleSize*2))
    $subRect = [System.Drawing.RectangleF]::new(10, ($Height/2 + $titleSize*0.6), ($Width-20), ($subSize*3))

    $g.DrawString($Title, $fontTitle, $shadowBrush, $titleRect, $format)
    $g.DrawString($Title, $fontTitle, $textBrush, $titleRect, $format)
    if ($Subtitle) {
        $g.DrawString($Subtitle, $fontSub, $textBrush, $subRect, $format)
    }

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

# 배경 (전체 화면을 채우는 메인 망둥어 이미지)
New-PlaceholderImage -Path (Join-Path $imgDir 'bg_main.png') -Width 1920 -Height 1080 `
    -ColorTop '#0b3d4a' -ColorBottom '#04141a' `
    -Title '배경 이미지 자리' -Subtitle 'bg_main.png / 망둥어가 크게 보이는 가로형 메인 배경 (1920x1080 권장)'

# 비주얼노벨 배경
New-PlaceholderImage -Path (Join-Path $imgDir 'vn_bg.png') -Width 1920 -Height 1080 `
    -ColorTop '#123545' -ColorBottom '#05161c' `
    -Title '대화 장면 배경' -Subtitle 'vn_bg.png / 대화창 뒤에 깔리는 배경 (갯벌 또는 해수어항, 1920x1080 권장)'

# 타일 이미지들 (정사각형, 투명배경, 원형 실루엣)
$tiles = @(
    @{ file = 'tile_diamond_goby.png'; top='#7fd8ff'; bottom='#2a6f8f'; title='다이아몬드'; sub='고비 타일' },
    @{ file = 'tile_randall_goby.png'; top='#ffd27f'; bottom='#8f5a2a'; title='랜달'; sub='고비 타일' },
    @{ file = 'tile_fire_goby.png'; top='#ff8a7f'; bottom='#8f2a2a'; title='파이어'; sub='고비 타일' },
    @{ file = 'tile_yellow_watchman_goby.png'; top='#fff27f'; bottom='#8f7a2a'; title='옐로우와치맨'; sub='고비 타일' },
    @{ file = 'tile_yellow_rock_goby.png'; top='#e0ff7f'; bottom='#6f8f2a'; title='옐로우락'; sub='고비 타일' },
    @{ file = 'tile_helfrich_goby.png'; top='#c47fff'; bottom='#5a2a8f'; title='헬프리치'; sub='고비 타일' },
    @{ file = 'tile_pistol_shrimp.png'; top='#ff7fd0'; bottom='#8f2a6f'; title='피스톨쉬림프'; sub='스페셜 타일' }
)
foreach ($t in $tiles) {
    New-PlaceholderImage -Path (Join-Path $imgDir $t.file) -Width 256 -Height 256 `
        -ColorTop $t.top -ColorBottom $t.bottom -Title $t.title -Subtitle $t.sub -Transparent -Circle
}

# 비주얼노벨 인물 초상화 (인간 정민 / 고비 정민)
New-PlaceholderImage -Path (Join-Path $imgDir 'vn_portrait_human.png') -Width 900 -Height 1400 `
    -ColorTop '#9fd8ff' -ColorBottom '#2a6f8f' -Title '정민 (인간)' -Subtitle 'vn_portrait_human.png / 전신 또는 상반신, 투명배경 PNG 권장' -Transparent

New-PlaceholderImage -Path (Join-Path $imgDir 'vn_portrait_goby.png') -Width 900 -Height 1400 `
    -ColorTop '#c4a0ff' -ColorBottom '#4a2a8f' -Title '정민 (고비)' -Subtitle 'vn_portrait_goby.png / 전신 또는 상반신, 투명배경 PNG 권장' -Transparent

Write-Host 'Placeholder images generated in' $imgDir
