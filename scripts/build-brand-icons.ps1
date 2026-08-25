# توليد الأيقونات الرسمية الموحدة من شعار المنظومة (favicon.ico — إطار 48)
# القاعدة: النسر (logo_yemen.jpg) لا يدخل الأيقونات إطلاقاً — حكر على المستندات والشاشات الرئيسية
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$mark = ([System.Drawing.Icon]::new((Join-Path $root 'public\favicon.ico'), 48, 48)).ToBitmap()

function New-MarkTile([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0x0f, 0x1c, 0x31))
    $g.FillRectangle($bg, 0, 0, $size, $size)
    # حلقة رفيعة تؤطر الشعار على البلاطة الكحلية
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(90, 255, 255, 255), [Math]::Max(1, $size / 64))
    $inset = [Math]::Round($size * 0.035)
    $g.DrawRectangle($ringPen, $inset, $inset, $size - 2 * $inset - 1, $size - 2 * $inset - 1)
    $box = [Math]::Round($size * 0.62)
    $ratio = [Math]::Min($box / $mark.Width, $box / $mark.Height)
    $w = [int]($mark.Width * $ratio); $h = [int]($mark.Height * $ratio)
    $x = [int](($size - $w) / 2); $y = [int](($size - $h) / 2)
    $g.DrawImage($mark, $x, $y, $w, $h)
    $g.Dispose()
    return $bmp
}

foreach ($spec in @(
    @{ s = 512; out = 'android-chrome-512x512.png' },
    @{ s = 192; out = 'android-chrome-192x192.png' },
    @{ s = 180; out = 'apple-touch-icon.png' },
    @{ s = 32;  out = 'favicon-32x32.png' },
    @{ s = 16;  out = 'favicon-16x16.png' }
)) {
    $b = New-MarkTile $spec.s
    $b.Save((Join-Path $root "public\$($spec.out)"), [System.Drawing.Imaging.ImageFormat]::Png)
    $b.Dispose()
    Write-Host "$($spec.out): $($spec.s)x$($spec.s)"
}

$mark.Dispose()
Write-Host "favicon.ico: untouched (المصدر الرسمي لشعار المنظومة)"
