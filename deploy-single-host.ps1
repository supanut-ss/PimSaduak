[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$corePath = Join-Path $PSScriptRoot "deploy-single-host.core.ps1"
if (-not (Test-Path -LiteralPath $corePath -PathType Leaf)) {
    throw "Deployment core is missing: $corePath"
}

& $corePath -DryRun:$DryRun
