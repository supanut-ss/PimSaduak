[CmdletBinding()]
param(
    [string]$Server = $env:D2D_DEPLOY_FTP_SERVER,
    [string]$Username = $env:D2D_DEPLOY_FTP_USERNAME,
    [string]$Password = $env:D2D_DEPLOY_FTP_PASSWORD,
    [string]$RemotePath = "pimsaduak.drivetodev.online",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$targetHost = $RemotePath.Trim('/').ToLowerInvariant()
if ($targetHost -ne "pimsaduak.drivetodev.online") {
    throw "Deployment is restricted to pimsaduak.drivetodev.online."
}

$npmCommand = Get-Command "npm.cmd" -ErrorAction Stop
& $npmCommand.Source --prefix $PSScriptRoot run build
if ($LASTEXITCODE -ne 0) {
    throw "The production build failed with exit code $LASTEXITCODE."
}

$distRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "dist")).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$entryFile = Join-Path $distRoot "index.html"
if (-not (Test-Path -LiteralPath $entryFile -PathType Leaf)) {
    throw "Production entry file is missing: $entryFile"
}

$entryHtml = [System.IO.File]::ReadAllText($entryFile)
if ($entryHtml -notmatch "<title>\s*PimSaduak") {
    throw "The production entry file does not contain the PimSaduak title."
}

$files = @(Get-ChildItem -LiteralPath $distRoot -Recurse -File | Sort-Object @{ Expression = { if ($_.Name -eq "index.html") { 1 } else { 0 } } }, FullName)
if ($files.Count -eq 0) {
    throw "The production folder contains no files to deploy."
}

if ($DryRun) {
    Write-Host "Dry run: no remote files will be changed."
    Write-Host "Target: https://$targetHost/"
    Write-Host "Transfer: FTP; index.html uploads last."
    Write-Host "Remote directory: $targetHost"
    Write-Host "Files: $($files.Count)"
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($distRoot.Length).TrimStart([char[]]@([char]92, [char]47))
        Write-Host "  $relativePath"
    }
    return
}

$missingVariables = @(
    if ([string]::IsNullOrWhiteSpace($Server)) { "D2D_DEPLOY_FTP_SERVER" }
    if ([string]::IsNullOrWhiteSpace($Username)) { "D2D_DEPLOY_FTP_USERNAME" }
    if ([string]::IsNullOrWhiteSpace($Password)) { "D2D_DEPLOY_FTP_PASSWORD" }
)
if ($missingVariables.Count -gt 0) {
    throw "Set these deployment variables in the local environment, then rerun: $($missingVariables -join ', ')"
}

$serverValue = $Server.Trim()
if ($serverValue.StartsWith("ftp://", [System.StringComparison]::OrdinalIgnoreCase)) {
    $serverValue = $serverValue.Substring(6)
}
if ($serverValue.StartsWith("ftps://", [System.StringComparison]::OrdinalIgnoreCase) -or $serverValue -notmatch '^(?:[A-Za-z0-9.-]+|\[[0-9A-Fa-f:]+\])(?::[0-9]{1,5})?$') {
    throw "D2D_DEPLOY_FTP_SERVER must contain an FTP host and optional port."
}
if (($Username + $Password) -match '[\r\n]') {
    throw "Deployment credentials cannot contain line breaks."
}

function ConvertTo-CurlConfigValue {
    param([Parameter(Mandatory = $true)][string]$Value)

    $slash = [string][char]92
    $quote = [string][char]34
    $escaped = $Value.Replace($slash, $slash + $slash).Replace($quote, $slash + $quote)
    return $quote + $escaped + $quote
}

function ConvertTo-QuotedProcessArgument {
    param([Parameter(Mandatory = $true)][string]$Value)

    $quote = [char]34
    $slash = [char]92
    $builder = [System.Text.StringBuilder]::new()
    [void]$builder.Append($quote)
    $backslashCount = 0
    foreach ($character in $Value.ToCharArray()) {
        if ([int]$character -eq 92) {
            $backslashCount++
            continue
        }
        if ([int]$character -eq 34) {
            [void]$builder.Append([string]::new($slash, ($backslashCount * 2) + 1))
            [void]$builder.Append($quote)
            $backslashCount = 0
            continue
        }
        if ($backslashCount -gt 0) {
            [void]$builder.Append([string]::new($slash, $backslashCount))
            $backslashCount = 0
        }
        [void]$builder.Append($character)
    }
    if ($backslashCount -gt 0) {
        [void]$builder.Append([string]::new($slash, $backslashCount * 2))
    }
    [void]$builder.Append($quote)
    return $builder.ToString()
}

function Invoke-FtpUpload {
    param(
        [Parameter(Mandatory = $true)][string]$CurlPath,
        [Parameter(Mandatory = $true)][string]$LocalFile,
        [Parameter(Mandatory = $true)][string]$RemoteUrl,
        [Parameter(Mandatory = $true)][string]$FtpUser,
        [Parameter(Mandatory = $true)][string]$FtpPassword
    )

    $curlArguments = @("--config", "-", "--silent", "--show-error", "--fail", "--connect-timeout", "20", "--max-time", "120", "--ftp-create-dirs", "--upload-file", $LocalFile, $RemoteUrl)
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $CurlPath
    $startInfo.Arguments = (($curlArguments | ForEach-Object { ConvertTo-QuotedProcessArgument -Value $_ }) -join " ")
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    try {
        if (-not $process.Start()) {
            throw "Could not start curl.exe."
        }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.StandardInput.WriteLine("user = $(ConvertTo-CurlConfigValue -Value ($FtpUser + ':' + $FtpPassword))")
        $process.StandardInput.Close()
        $process.WaitForExit()
        $null = $stdoutTask.GetAwaiter().GetResult()
        $curlError = $stderrTask.GetAwaiter().GetResult().Trim()
        if ($process.ExitCode -ne 0) {
            foreach ($secret in @($FtpUser, $FtpPassword)) {
                if (-not [string]::IsNullOrEmpty($secret)) {
                    $curlError = $curlError.Replace($secret, "[redacted]")
                }
            }
            throw "FTP upload failed for '$([System.IO.Path]::GetFileName($LocalFile))': $curlError"
        }
    } finally {
        $process.Dispose()
    }
}

$curlCommand = Get-Command "curl.exe" -ErrorAction Stop
$remoteBasePath = [System.Uri]::EscapeDataString($targetHost)
foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($distRoot.Length).TrimStart([char[]]@([char]92, [char]47))
    $portablePath = $relativePath.Replace([char]92, [char]47)
    $encodedRelativePath = @($portablePath.Split([char]47) | ForEach-Object { [System.Uri]::EscapeDataString($_) }) -join '/'
    $remoteUrl = "ftp://$serverValue/$remoteBasePath/$encodedRelativePath"
    Write-Host "Uploading $relativePath"
    Invoke-FtpUpload -CurlPath $curlCommand.Source -LocalFile $file.FullName -RemoteUrl $remoteUrl -FtpUser $Username -FtpPassword $Password
}

Write-Host "FTP upload completed: $($files.Count) files sent to https://$targetHost/."
