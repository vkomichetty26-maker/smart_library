$projectName = "SmartLib"
$outputZip = Join-Path (Split-Path $PSScriptRoot -Parent) "${projectName}_share.zip"
$sourceDir = $PSScriptRoot

$excludePatterns = @("node_modules", ".git", "dist", ".env")

Write-Host "SmartLib Clean Export Tool" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

if (Test-Path $outputZip) {
    Remove-Item $outputZip -Force
    Write-Host "Removed old zip file." -ForegroundColor Yellow
}

Write-Host "Collecting files (excluding node_modules, .git, dist, .env)..." -ForegroundColor White

$filesToZip = Get-ChildItem -Path $sourceDir -Recurse -File | Where-Object {
    $filePath = $_.FullName
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($filePath -match [regex]::Escape("\$pattern\") -or $filePath -match [regex]::Escape("\$pattern") -or $_.Name -eq $pattern) {
            $shouldExclude = $true
            break
        }
        $segments = $filePath.Split("\")
        if ($segments -contains $pattern) {
            $shouldExclude = $true
            break
        }
    }
    -not $shouldExclude
}

Write-Host "Found $($filesToZip.Count) files to include." -ForegroundColor Green

$tempFolder = Join-Path $env:TEMP "${projectName}_export"
if (Test-Path $tempFolder) { Remove-Item $tempFolder -Recurse -Force }
New-Item -ItemType Directory -Path $tempFolder | Out-Null

foreach ($file in $filesToZip) {
    $relativePath = $file.FullName.Substring($sourceDir.Length + 1)
    $destPath = Join-Path $tempFolder $relativePath
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
    Copy-Item $file.FullName $destPath
}

Compress-Archive -Path "$tempFolder\*" -DestinationPath $outputZip -Force
Remove-Item $tempFolder -Recurse -Force

Write-Host ""
Write-Host "ZIP CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "Saved at: $outputZip" -ForegroundColor Yellow
