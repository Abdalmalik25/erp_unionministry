# توليد الأيقونات الرسمية الموحدة من شعار الوزارة على خلفية الهوية الكحلية
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$logo = [System.Drawing.Image]::FromFile((Join-Path $root 'public\logo_yemen.jpg'))

function New-BrandBitmap([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0x0f, 0x1c, 0x31))
    $g.FillRectangle($bg, 0, 0, $size, $size)
    $box = [Math]::Round($size * 0.78)
    $ratio = [Math]::Min($box / $logo.Width, $box / $logo.Height)
    $w = [int]($logo.Width * $ratio); $h = [int]($logo.Height * $ratio)
    $x = [int](($size - $w) / 2)
    $y = [int](($size * 0.47) - ($h / 2))
    $g.DrawImage($logo, $x, $y, $w, $h)
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
    $b = New-BrandBitmap $spec.s
    $b.Save((Join-Path $root "public\$($spec.out)"), [System.Drawing.Imaging.ImageFormat]::Png)
    $b.Dispose()
    Write-Host "$($spec.out): $($spec.s)x$($spec.s)"
}

$b48 = New-BrandBitmap 48
$pngMs = New-Object System.IO.MemoryStream
$b48.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $pngMs.ToArray(); $b48.Dispose(); $pngMs.Dispose()
$bw = New-Object System.IO.BinaryWriter([System.IO.File]::Create((Join-Path $root 'public\favicon.ico')))
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
$bw.Write([Byte]48); $bw.Write([Byte]48); $bw.Write([Byte]0); $bw.Write([Byte]0)
$bw.Write([UInt16]1); $bw.Write([UInt16]32)
$bw.Write([UInt32]$pngBytes.Length); $bw.Write([UInt32]22)
$bw.Write($pngBytes); $bw.Close()
Write-Host "favicon.ico: 48x48 (PNG-embedded)"
$logo.Dispose()
