Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\bbqdd\Documents\_my\japaneseproject\flame-spritesheet.jpg"
$outDir = "c:\Users\bbqdd\Documents\_my\japaneseproject\sprites"

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$width = $srcBmp.Width
$height = $srcBmp.Height

Write-Host "Loaded spritesheet: $width x $height"

# We will create a transparent 32bpp ARGB bitmap
$cleanBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Lock bits for high-speed direct memory processing
$rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$srcData = $srcBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dstData = $cleanBmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$bytes = $srcData.Stride * $height
$srcBuffer = New-Object byte[] $bytes
$dstBuffer = New-Object byte[] $bytes

[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBuffer, 0, $bytes)

# Process pixels: Format32bppArgb is BGRA in memory (B=0, G=1, R=2, A=3)
for ($y = 0; $y -lt $height; $y++) {
    $rowOffset = $y * $srcData.Stride
    for ($x = 0; $x -lt $width; $x++) {
        $idx = $rowOffset + ($x * 4)
        $b = [int]$srcBuffer[$idx]
        $g = [int]$srcBuffer[$idx + 1]
        $r = [int]$srcBuffer[$idx + 2]

        $diffRG = [Math]::Abs($r - $g)
        $diffGB = [Math]::Abs($g - $b)
        $diffRB = [Math]::Abs($r - $b)
        $maxDiff = [Math]::Max($diffRG, [Math]::Max($diffGB, $diffRB))

        # Check if pixel is part of the checkerboard background
        # Checkerboard is neutral gray (maxDiff <= 12) with luminance in [75..165]
        $isChecker = ($maxDiff -le 14) -and ($g -ge 70) -and ($g -le 175)

        if ($isChecker) {
            # Fully transparent
            $dstBuffer[$idx] = 0
            $dstBuffer[$idx + 1] = 0
            $dstBuffer[$idx + 2] = 0
            $dstBuffer[$idx + 3] = 0
        } else {
            # Keep original pixel
            $dstBuffer[$idx] = [byte]$b
            $dstBuffer[$idx + 1] = [byte]$g
            $dstBuffer[$idx + 2] = [byte]$r
            $dstBuffer[$idx + 3] = 255
        }
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($dstBuffer, 0, $dstData.Scan0, $bytes)
$srcBmp.UnlockBits($srcData)
$cleanBmp.UnlockBits($dstData)
$srcBmp.Dispose()

# Save full transparent spritesheet
$cleanPath = "c:\Users\bbqdd\Documents\_my\japaneseproject\flame-spritesheet-transparent.png"
$cleanBmp.Save($cleanPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved transparent spritesheet to $cleanPath"

# Now slice into 20 frames (4 rows x 5 columns)
$cols = 5
$rows = 4
$cellW = 1024.0 / 5.0 # 204.8
$cellH = 572.0 / 4.0  # 143.0

$frameIndex = 0
for ($r = 0; $r -lt $rows; $r++) {
    $y0 = [int][Math]::Round($r * $cellH)
    $y1 = [int][Math]::Round(($r + 1) * $cellH)
    $h = $y1 - $y0

    for ($c = 0; $c -lt $cols; $c++) {
        $x0 = [int][Math]::Round($c * $cellW)
        $x1 = [int][Math]::Round(($c + 1) * $cellW)
        $w = $x1 - $x0

        $frameRect = New-Object System.Drawing.Rectangle($x0, $y0, $w, $h)
        $frameBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($frameBmp)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
        $g.DrawImage($cleanBmp, $destRect, $frameRect, [System.Drawing.GraphicsUnit]::Pixel)
        $g.Dispose()

        $padIndex = "{0:D2}" -f $frameIndex
        $framePath = Join-Path $outDir "frame_$padIndex.png"
        $frameBmp.Save($framePath, [System.Drawing.Imaging.ImageFormat]::Png)
        $frameBmp.Dispose()

        $frameIndex++
    }
}

$cleanBmp.Dispose()
Write-Host "Sliced 20 frames successfully into $outDir"
