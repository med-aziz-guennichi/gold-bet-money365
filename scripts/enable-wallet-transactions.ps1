#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$ConfigPath = 'C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg',
    [ValidatePattern('^[A-Za-z0-9_-]+$')][string]$ServiceName = 'MongoDB'
)

$ErrorActionPreference = 'Stop'
$walletRepo = Split-Path -Parent $PSScriptRoot
$walletConfig = (Resolve-Path -LiteralPath $ConfigPath).Path
$walletService = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'"
if (-not $walletService -or -not $walletService.PathName.Contains($walletConfig)) {
    throw 'The selected service does not use the selected configuration. No changes were made.'
}
$walletOriginal = [IO.File]::ReadAllText($walletConfig)
if ($walletOriginal -match '(?m)^\s+authorization:\s*enabled') {
    throw 'Authenticated replica sets require a keyFile configuration. Review this deployment manually; no changes were made.'
}
if ($walletOriginal -match '(?m)^replication:' -and $walletOriginal -notmatch '(?m)^\s+replSetName:\s*goldbet-wallets\s*$') {
    throw 'An existing replication configuration must be reviewed manually. No changes were made.'
}

$walletNodeCandidates = @(
    (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'),
    (Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
)
$walletNode = $walletNodeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $walletNode) { throw 'Configure Node.js in PATH before running this setup.' }
$env:PATH = (Split-Path -Parent $walletNode) + [IO.Path]::PathSeparator + $env:PATH
Push-Location (Join-Path $walletRepo 'apps\server')
try {
    & $walletNode --import tsx src/enable-wallet-transactions.ts --check-only
    if ($LASTEXITCODE -ne 0) { throw 'Local application configuration validation failed. No service changes were made.' }
} finally { Pop-Location }

if ($walletOriginal -notmatch '(?m)^replication:') {
    $walletBackup = "$walletConfig.before-wallets.$(Get-Date -Format 'yyyyMMdd-HHmmss').$([guid]::NewGuid().ToString('N')).bak"
    Copy-Item -LiteralPath $walletConfig -Destination $walletBackup
    $walletUpdated = $walletOriginal + "`r`nreplication:`r`n  replSetName: goldbet-wallets`r`n"
    try {
        [IO.File]::WriteAllText($walletConfig, $walletUpdated, [Text.UTF8Encoding]::new($false))
        Restart-Service -Name $ServiceName
        (Get-Service -Name $ServiceName).WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    } catch {
        Copy-Item -LiteralPath $walletBackup -Destination $walletConfig -Force
        Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
        throw "MongoDB configuration was restored from $walletBackup. $($_.Exception.Message)"
    }
    Write-Host "Original MongoDB configuration saved to $walletBackup"
}

Push-Location (Join-Path $walletRepo 'apps\server')
try {
    & $walletNode --import tsx src/enable-wallet-transactions.ts
    if ($LASTEXITCODE -ne 0) { throw 'Replica initialization failed. Review the error and rerun this same script; it is safe to retry.' }
} finally { Pop-Location }
