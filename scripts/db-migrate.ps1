# Ryvonx - Automatic Supabase migration script
# Usage: npm run db:migrate

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Read-EnvLocal {
    param([string]$Key)
    $envFile = Join-Path $ProjectRoot ".env.local"
    if (-not (Test-Path $envFile)) { return $null }
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        if ($line -match "^\s*$Key\s*=\s*(.*)\s*$") {
            $value = $Matches[1].Trim().Trim('"').Trim("'")
            if ($value) { return $value }
        }
    }
    return $null
}

$projectRef = Read-EnvLocal "SUPABASE_PROJECT_REF"
if (-not $projectRef) {
    $supabaseUrl = Read-EnvLocal "NEXT_PUBLIC_SUPABASE_URL"
    if ($supabaseUrl -match "https://([a-z0-9]+)\.supabase\.co") {
        $projectRef = $Matches[1]
    }
}

if (-not $projectRef) {
    Write-Host "ERROR: Could not determine Supabase project ref." -ForegroundColor Red
    Write-Host "Add SUPABASE_PROJECT_REF=your-ref to .env.local" -ForegroundColor Yellow
    exit 1
}

$dbPassword = Read-EnvLocal "SUPABASE_DB_PASSWORD"
$projectRefFile = Join-Path $ProjectRoot "supabase\.temp\project-ref"
$isLinked = $false
if (Test-Path $projectRefFile) {
    $linkedRef = (Get-Content $projectRefFile -Raw).Trim()
    $isLinked = $linkedRef -eq $projectRef
}

Write-Host "Ryvonx Supabase - project ref: $projectRef" -ForegroundColor Cyan

if (-not $isLinked) {
    Write-Host ""
    Write-Host "Linking to Supabase project..." -ForegroundColor Yellow
    if (-not $dbPassword) {
        Write-Host "ERROR: SUPABASE_DB_PASSWORD is missing from .env.local" -ForegroundColor Red
        Write-Host ""
        Write-Host "Get your database password from Supabase Dashboard:" -ForegroundColor Yellow
        Write-Host "  Project Settings -> Database -> Database password" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Then add to .env.local:" -ForegroundColor Yellow
        Write-Host "  SUPABASE_DB_PASSWORD=your-database-password" -ForegroundColor White
        Write-Host ""
        Write-Host "Also run: npm run supabase:login" -ForegroundColor Yellow
        exit 1
    }
    npx supabase link --project-ref $projectRef --password $dbPassword --yes
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Link failed. Run: npm run supabase:login" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "Linked successfully." -ForegroundColor Green
} else {
    Write-Host "Already linked to $projectRef" -ForegroundColor Green
}

Write-Host ""
Write-Host "Pushing migrations..." -ForegroundColor Yellow
npx supabase db push --yes
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Migrations applied." -ForegroundColor Green

Write-Host ""
Write-Host "Generating TypeScript types..." -ForegroundColor Yellow
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$typesOutput = npx supabase gen types typescript --linked 2>&1 | Out-String
$typesExitCode = $LASTEXITCODE
$ErrorActionPreference = $prevEAP

if ($typesExitCode -ne 0 -or $typesOutput -notmatch "export type Database") {
    Write-Host "Type generation skipped (no privileges or CLI error). Keeping existing database.types.ts." -ForegroundColor Yellow
    if ($typesOutput.Trim()) {
        $typesOutput.Trim().Split("`n") | Select-Object -Last 5 | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow }
    }
} else {
    $typesOutput | Out-File -Encoding utf8 "src/types/database.types.ts"
    Write-Host "Types updated." -ForegroundColor Green
}

Write-Host ""
Write-Host "Done! Database is in sync." -ForegroundColor Green
exit 0
