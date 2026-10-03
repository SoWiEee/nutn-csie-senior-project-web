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
    $windSegments = 16
    # Art-directed slope routes use x start/end, y start/end and gentle curvature.
    $windRoutes = @(
        @(0, 420, 215, 340, -12),
        @(320, 740, 265, 220, -42),
        @(600, 1110, 370, 220, 20)
    )
    $groupCount = $bands + $windRoutes.Count * $windSegments
    $contours = @{}
    foreach ($route in $windRoutes) {
        $centers = [System.Collections.Generic.List[double]]::new()
        $previousY = [double]$route[2]
        for ($traceX = $route[0]; $traceX -le $route[1] + 6; $traceX += 6) {
            if ($route.Length -eq 5) {
                $progress = [Math]::Clamp(($traceX - $route[0]) / ($route[1] - $route[0]), 0.0, 1.0)
                $centers.Add($route[2] + ($route[3] - $route[2]) * $progress + $route[4] * [Math]::Sin($progress * [Math]::PI))
                continue
            }
            $bestScore = [double]::NegativeInfinity
            $bestY = $previousY
            for ($candidateY = $previousY - 24; $candidateY -le $previousY + 24; $candidateY += 3) {
                if ($candidateY -lt 100 -or $candidateY -gt 370) { continue }
                $contrast = 0.0
                # Average paired samples across a 12px slope-normal window,
                # suppressing the source print dots before edge following.
                for ($offsetX = -3; $offsetX -le 3; $offsetX += 3) {
                    for ($offsetY = -3; $offsetY -le 3; $offsetY += 3) {
                        $sourceY = 660 - (380 - $candidateY) / $HeightScale
                        $upper = $bitmap.GetPixel([Math]::Clamp([int]($traceX + $offsetX), 0, 1117), [Math]::Clamp([int]($sourceY + $offsetY - 6), 344, 660))
                        $lower = $bitmap.GetPixel([Math]::Clamp([int]($traceX + $offsetX), 0, 1117), [Math]::Clamp([int]($sourceY + $offsetY + 6), 344, 660))
                        $contrast += (0.2126 * ($lower.R - $upper.R) + 0.7152 * ($lower.G - $upper.G) + 0.0722 * ($lower.B - $upper.B)) / 255
                    }
                }
                $score = [Math]::Abs($contrast / 9) - [Math]::Abs($candidateY - $previousY) * 0.0015
                if ($score -gt $bestScore) { $bestScore = $score; $bestY = $candidateY }
            }
            # Limit curvature and smooth the trace so noise cannot create zigzags.
            $previousY += [Math]::Clamp(($bestY - $previousY) * 0.35, -4.5, 4.5)
            $centers.Add($previousY)
        }
        $contours[$route[0]] = $centers.ToArray()
    }
    $windRandom = [Random]::new(117)
    $movingDots = 0
    $totalDots = 0
    $levels = 48
    $histogram = [int[]]::new($levels)
    $random = [Random]::new(116)
    # Explicit doubles are required: PowerShell otherwise selects integer Clamp.
    if ([Math]::Clamp(0.37, 0.0, 1.0) -ne 0.37) { throw 'Fractional luminance was lost.' }
    $paths = @{}
    for ($b = 0; $b -lt $groupCount; $b++) {
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
            $sampleX = [int][Math]::Floor($x)
            $sampleY = [int][Math]::Floor($y)
            for ($dy = -$SampleRadius; $dy -le $SampleRadius; $dy++) {
                for ($dx = -$SampleRadius; $dx -le $SampleRadius; $dx++) {
                    $pixel = $bitmap.GetPixel([Math]::Clamp($sampleX + $dx, 0, 1117), [Math]::Clamp($sampleY + $dy, 344, 660))
                    $sum += (0.2126 * $pixel.R + 0.7152 * $pixel.G + 0.0722 * $pixel.B) / 255
                    $samples++
                }
            }
            $lightness = [Math]::Clamp(($sum / $samples - $BlackPoint) / ($WhitePoint - $BlackPoint), 0.0, 1.0)
            $level = [Math]::Clamp([int][Math]::Round($lightness * ($levels - 1)), 0, $levels - 1)
            $histogram[$level]++
            # Equal-phase bands run diagonally: the gust arrives from upper left.
            # A small overlap scatters their boundaries, avoiding moving strip seams.
            $phase = ($x / 1118 + ($y - 344) / 316 * 0.55) / 1.55
            $band = [Math]::Clamp([int][Math]::Floor($phase * $bands + ($random.NextDouble() - 0.5) * 0.35), 0, $bands - 1)
            $targetX = ($x + ($random.NextDouble() - 0.5) * $SampleStep * 0.65).ToString('0.0', [Globalization.CultureInfo]::InvariantCulture)
            $targetY = (380 - (660 - $y) * $HeightScale + ($random.NextDouble() - 0.5) * $SampleStep * 0.65).ToString('0.0', [Globalization.CultureInfo]::InvariantCulture)
            $terrainY = 380 - (660 - $y) * $HeightScale
            for ($routeIndex = 0; $routeIndex -lt $windRoutes.Count; $routeIndex++) {
                $route = $windRoutes[$routeIndex]
                if ($x -lt $route[0] -or $x -gt $route[1]) { continue }
                $progress = ($x - $route[0]) / ($route[1] - $route[0])
                $trace = $contours[$route[0]]
                $tracePosition = ($x - $route[0]) / 6
                $traceIndex = [int][Math]::Floor($tracePosition)
                $fraction = $tracePosition - $traceIndex
                $centerY = $trace[$traceIndex] * (1 - $fraction) + $trace[$traceIndex + 1] * $fraction
                $distance = [Math]::Abs($terrainY - $centerY)
                # Feather the corridor and its ends, rather than moving hard strips.
                $influence = [Math]::Exp(-$distance * $distance / 72.0) * [Math]::Sin($progress * [Math]::PI)
                if ($distance -lt 18 -and $windRandom.NextDouble() -lt $influence) {
                    $segment = [Math]::Min($windSegments - 1, [int][Math]::Floor($progress * $windSegments))
                    $band = $bands + $routeIndex * $windSegments + $segment
                    $movingDots++
                    break
                }
            }
            $totalDots++
            [void]$paths["$band-$level"].Append("M${targetX} ${targetY}h.01")
        }
    }
    $occupiedLevels = @($histogram | Where-Object { $_ -gt 0 }).Count
    if ($occupiedLevels -lt 12) { throw "Luminance collapsed: only $occupiedLevels populated levels." }
    $svg = [System.Text.StringBuilder]::new()
    [void]$svg.AppendLine('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1118 380" preserveAspectRatio="xMidYMax slice">')
    [void]$svg.AppendLine('<!-- Reference-sampled blue halftone terrain. Rebuild with scripts/build-footer-mountains.ps1 -ReferenceImage supplied-screenshot.png -->')
    # Keep sampled terrain static: no animation stylesheet or continuous repaint.
    [void]$svg.AppendLine('<defs><linearGradient id="mist" gradientUnits="userSpaceOnUse" x1="0" y1="64" x2="0" y2="160"><stop stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="white"/></linearGradient><mask id="fade"><rect width="1118" height="380" fill="url(#mist)"/></mask></defs>')
    $dotWidth = ($SampleStep * 0.9).ToString('0.0', [Globalization.CultureInfo]::InvariantCulture)
    [void]$svg.AppendLine("<g mask=`"url(#fade)`" fill=`"none`" stroke-width=`"$dotWidth`" stroke-linecap=`"round`">")
    for ($b = 0; $b -lt $groupCount; $b++) {
        if ($b -lt $bands) {
            [void]$svg.AppendLine('<g>')
        } else {
            $routeIndex = [int][Math]::Floor(($b - $bands) / $windSegments)
            $segment = ($b - $bands) % $windSegments
            $delay = (-9 + $routeIndex * 1.7 + $segment * 0.10).ToString('0.00', [Globalization.CultureInfo]::InvariantCulture)
            $route = $windRoutes[$routeIndex]
            $trace = $contours[$route[0]]
            $first = [int][Math]::Floor(($trace.Length - 1) * $segment / $windSegments)
            $last = [Math]::Max($first + 1, [int][Math]::Floor(($trace.Length - 1) * ($segment + 1) / $windSegments))
            $slope = ($trace[$last] - $trace[$first]) / (($last - $first) * 6)
            $moveX = 3.2 / [Math]::Sqrt(1 + $slope * $slope)
            $moveY = ($moveX * $slope).ToString('0.00', [Globalization.CultureInfo]::InvariantCulture)
            $moveXText = $moveX.ToString('0.00', [Globalization.CultureInfo]::InvariantCulture)
            [void]$svg.AppendLine("<g class=`"wind-dots`" data-route=`"$routeIndex`" style=`"animation-delay:${delay}s;--wind-x:${moveXText}px;--wind-y:${moveY}px`">")
        }
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
    [void]$svg.AppendLine('</g>')
    [void]$svg.AppendLine('</svg>')
    $root = Split-Path $PSScriptRoot -Parent
    foreach ($destination in @('assets/footer-mountains.svg', 'release/assets/footer-mountains.svg')) {
        [IO.File]::WriteAllText((Join-Path $root $destination), $svg.ToString(), [Text.UTF8Encoding]::new($false))
    }
    Write-Output "Rebuilt both SVGs from reference pixels: $($svg.Length) characters; $occupiedLevels of $levels luminance levels preserved."
    Write-Output "Localized wind: $movingDots of $totalDots dots move along $($windRoutes.Count) slope routes."
} finally {
    $bitmap.Dispose()
}
