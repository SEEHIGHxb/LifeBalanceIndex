param([switch]$Force, [switch]$WhatIf)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$boundary = $projectRoot.TrimEnd('\') + '\'
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'rollback-manifest.json') -Raw | ConvertFrom-Json
$allFiles = @($manifest.modified) + @($manifest.added)
foreach ($entry in $allFiles) {
    $target = [IO.Path]::GetFullPath((Join-Path $projectRoot $entry.path))
    if (-not $target.StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase)) { throw "Path outside project: $target" }
    if ((Test-Path -LiteralPath $target) -and -not $Force) {
        $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        $normalized = $actual
        if ($entry.afterNormalized) {
            $bytes = [IO.File]::ReadAllBytes($target)
            $clean = [Collections.Generic.List[byte]]::new()
            for ($i = 0; $i -lt $bytes.Length; $i++) {
                if ($bytes[$i] -eq 13 -and $i + 1 -lt $bytes.Length -and $bytes[$i + 1] -eq 10) { continue }
                $clean.Add($bytes[$i])
            }
            $hasher = [Security.Cryptography.SHA256]::Create()
            try { $normalized = [BitConverter]::ToString($hasher.ComputeHash($clean.ToArray())).Replace('-', '').ToLowerInvariant() }
            finally { $hasher.Dispose() }
        }
        if ($actual -ne $entry.after -and $normalized -ne $entry.afterNormalized) { throw "File changed after the redesign: $($entry.path). Review it before using -Force." }
    }
}
foreach ($entry in $manifest.modified) {
    $source = Join-Path $PSScriptRoot $entry.path
    $target = Join-Path $projectRoot $entry.path
    $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($sourceHash -ne $entry.before) { throw "Backup file changed: $($entry.path)" }
    if ($WhatIf) { Write-Output "Restore $($entry.path)" } else { Copy-Item -LiteralPath $source -Destination $target -Force }
}
foreach ($entry in $manifest.added) {
    $target = [IO.Path]::GetFullPath((Join-Path $projectRoot $entry.path))
    if ($WhatIf) { Write-Output "Remove new welcome file $($entry.path)" }
    elseif (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target }
}
if ($WhatIf) { Write-Output 'Preview only. No files were changed.' }
else { Write-Output 'Previous welcome design restored. The backup folder and existing user assets were kept.' }
