param(
    [string]$ReferenceImage = (Join-Path $PSScriptRoot 'references/footer-reference.png'),
    [ValidateRange(1, 4)][double]$SampleStep = 1.5,
    [ValidateRange(0, 8)][int]$SampleRadius = 3,
    [ValidateRange(0.5, 1.5)][double]$HeightScale = 1.0,
    [ValidateRange(0.4, 2.5)][double]$Gamma = 1.8,
    [ValidateRange(0, 0.4)][double]$BlackPoint = 0.04,
    [ValidateRange(0.6, 1)][double]$WhitePoint = 0.98
)
# Reconstruct the supplied mountain artwork as blue SVG dots, preserving its shading.
# The crop excludes all reference-site text, logos and the right-hand page border.
Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $ReferenceImage).Path)
try {
    if ($bitmap.Width -ne 1142 -or $bitmap.Height -ne 661) {
        throw 'Expected the supplied 1142 x 661 reference screenshot.'
    }
    $bands = 32
    $levels = 48
    $histogram = [int[]]::new($levels)
    $random = [Random]::new(116)
    # Explicit doubles are required: PowerShell otherwise selects integer Clamp.
    if ([Math]::Clamp(0.37, 0.0, 1.0) -ne 0.37) { throw 'Fractional luminance was lost.' }
    $paths = @{}
    for ($b = 0; $b -lt $bands; $b++) {
        for ($l = 0; $l -lt $levels; $l++) {
            $paths["$b-$l"] = [System.Text.StringBuilder]::new()
        }
    }
    # A 7x7 descreening window preserves shallow central slopes while removing print dots.
    # HeightScale is anchored at the bottom; 1.0 preserves the reference proportions.
    for ($y = 344; $y -lt 660; $y += $SampleStep) {
        for ($x = 0; $x -lt 1118; $x += $SampleStep) {
            $sum = 0.0
            $samples = 0
            for ($dy = -$SampleRadius; $dy -le $SampleRadius; $dy++) {
                for ($dx = -$SampleRadius; $dx -le $SampleRadius; $dx++) {
                    $pixel = $bitmap.GetPixel([Math]::Clamp([int][Math]::Floor($x) + $dx, 0, 1117), [Math]::Clamp([int][Math]::Floor($y) + $dy, 344, 660))
                    $sum += (0.2126 * $pixel.R + 0.7152 * $pixel.G + 0.0722 * $pixel.B) / 255
                    $samples++
                }
            }
            $lightness = [Math]::Clamp(($sum / $samples - $BlackPoint) / ($WhitePoint - $BlackPoint), 0.0, 1.0)
            $level = [Math]::Clamp([int][Math]::Round($lightness * ($levels - 1)), 0, $levels - 1)
            $histogram[$level]++
            $band = [Math]::Min($bands - 1, [int][Math]::Floor($x / 1118 * $bands))
            $targetX = ($x + ($random.NextDouble() - 0.5) * $SampleStep * 0.65).ToString('0.0', [Globalization.CultureInfo]::InvariantCulture)
            $targetY = (380 - (660 - $y) * $HeightScale + ($random.NextDouble() - 0.5) * $SampleStep * 0.65).ToString('0.0', [Globalization.CultureInfo]::InvariantCulture)
            [void]$paths["$band-$level"].Append("M${targetX} ${targetY}h.01")
        }
    }
    $occupiedLevels = @($histogram | Where-Object { $_ -gt 0 }).Count
    if ($occupiedLevels -lt 12) { throw "Luminance collapsed: only $occupiedLevels populated levels." }
    $svg = [System.Text.StringBuilder]::new()
    [void]$svg.AppendLine('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1118 380" preserveAspectRatio="xMidYMax slice">')
    [void]$svg.AppendLine('<!-- Reference-sampled blue halftone terrain. Rebuild with scripts/build-footer-mountains.ps1 -ReferenceImage supplied-screenshot.png -->')
    [void]$svg.AppendLine('<defs><linearGradient id="mist" gradientUnits="userSpaceOnUse" x1="0" y1="64" x2="0" y2="160"><stop stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="white"/></linearGradient><mask id="fade"><rect width="1118" height="380" fill="url(#mist)"/></mask></defs>')
    $dotWidth = ($SampleStep * 0.9).ToString('0.0', [Globalization.CultureInfo]::InvariantCulture)
    [void]$svg.AppendLine("<g mask=`"url(#fade)`" fill=`"none`" stroke-width=`"$dotWidth`" stroke-linecap=`"round`">")
    for ($b = 0; $b -lt $bands; $b++) {
        [void]$svg.AppendLine('<g>')
        for ($l = 0; $l -lt $levels; $l++) {
            if ($paths["$b-$l"].Length -eq 0) { continue }
            $t = [Math]::Pow(1.0 - $l / ($levels - 1), $Gamma)
            # Saturated deep navy -> blue -> very pale ice blue; not neutral gray.
            $r = [int][Math]::Round(3 + 165 * $t)
            $g = [int][Math]::Round(27 + 191 * $t)
            $blue = [int][Math]::Round(83 + 172 * $t)
            $color = '#{0:x2}{1:x2}{2:x2}' -f $r, $g, $blue
            # The source's pale paper/haze must not become an opaque bright sheet.
            # Feather only its upper tonal range; keep shaded mountain faces intact.
            $paper = [Math]::Clamp(($l / ($levels - 1) - 0.68) / 0.32, 0.0, 1.0)
            $opacity = (1 - 0.9 * $paper * $paper * (3 - 2 * $paper)).ToString('0.000', [Globalization.CultureInfo]::InvariantCulture)
            [void]$svg.AppendLine("<path stroke=`"$color`" opacity=`"$opacity`" d=`"$($paths["$b-$l"])`"/>")
        }
        [void]$svg.AppendLine('</g>')
    }
    [void]$svg.AppendLine('</g></svg>')
    $root = Split-Path $PSScriptRoot -Parent
    foreach ($destination in @('assets/footer-mountains.svg', 'release/assets/footer-mountains.svg')) {
        [IO.File]::WriteAllText((Join-Path $root $destination), $svg.ToString(), [Text.UTF8Encoding]::new($false))
    }
    Write-Output "Rebuilt both SVGs from reference pixels: $($svg.Length) characters; $occupiedLevels of $levels luminance levels preserved."
} finally {
    $bitmap.Dispose()
}
