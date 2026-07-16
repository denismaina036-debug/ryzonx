# Ryvonx - Friendly Supabase status (avoids confusing JSON/PostHog errors)
# Usage: npm run db:status

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "=== Ryvonx Supabase Status ===" -ForegroundColor Cyan
Write-Host ""

# Suppress PostHog noise - command often succeeds despite timeout message
$projectsJson = npx supabase projects list --output json 2>$null
if ($LASTEXITCODE -ne 0 -or -not $projectsJson) {
    Write-Host "Could not fetch projects. Are you logged in?" -ForegroundColor Red
    Write-Host "Run: npx supabase login --token YOUR_TOKEN" -ForegroundColor Yellow
    Write-Host "(Get token from https://supabase.com/dashboard/account/tokens)" -ForegroundColor Yellow
    exit 1
}

try {
    $parsed = $projectsJson | ConvertFrom-Json
    if ($parsed.projects) {
        $projects = $parsed.projects
    } elseif ($parsed -is [array]) {
        $projects = $parsed
    } else {
        $projects = @($parsed)
    }
    if (-not $projects -or $projects.Count -eq 0) {
        Write-Host "Logged in, but no projects found on this account." -ForegroundColor Yellow
        Write-Host "Make sure you used the token from the ryzofund Supabase account." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Projects on your account:" -ForegroundColor Green
    foreach ($p in $projects) {
        $linked = if ($p.linked) { "LINKED" } else { "not linked" }
        Write-Host ("  - {0}  (ref: {1})  [{2}]" -f $p.name, $p.ref, $linked) -ForegroundColor White
    }
} catch {
    Write-Host "Raw output:" -ForegroundColor Yellow
    Write-Host $projectsJson
}

Write-Host ""
Write-Host "Migrations:" -ForegroundColor Cyan
$migOut = npx supabase migration list 2>$null
if ($migOut) {
    $migOut | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "  (not linked yet - run npm run db:migrate)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "If you only see PostHog timeout errors, ignore them - run: npm run db:status" -ForegroundColor DarkGray
Write-Host ""
