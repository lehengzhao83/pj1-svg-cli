$ErrorActionPreference = 'Stop'
$taskNode = Get-Command node -ErrorAction SilentlyContinue
if ($taskNode) {
    $taskNodeBin = Split-Path $taskNode.Source
} else {
    $taskPortableNode = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'codex-tools') -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $taskPortableNode) { throw 'Please install Node.js 22 or later, then reopen the terminal.' }
    $taskNodeBin = Split-Path $taskPortableNode.FullName
}
$env:Path = $taskNodeBin + ';' + $env:Path
Push-Location $PSScriptRoot
try {
    if (-not (Test-Path -LiteralPath 'node_modules')) {
        & (Join-Path $taskNodeBin 'npm.cmd') ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
    }
    & (Join-Path $taskNodeBin 'npm.cmd') run cli
    if ($LASTEXITCODE -ne 0) { throw 'CLI failed' }
} finally {
    Pop-Location
}
