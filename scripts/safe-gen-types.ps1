# Safe wrapper — never overwrites database.types.ts with empty output.
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$typesPath = Join-Path $ProjectRoot "src\types\database.types.ts"
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"

$output = npx supabase gen types typescript --linked 2>&1 | Out-String
$exitCode = $LASTEXITCODE
$ErrorActionPreference = $prevEAP

if ($exitCode -ne 0 -or $output -notmatch "export type Database") {
    Write-Host "Type generation failed or unavailable. Keeping existing database.types.ts." -ForegroundColor Yellow
    if ($output.Trim()) {
        $output.Trim().Split("`n") | Select-Object -Last 5 | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow }
    }
    exit 1
}

$output | Out-File -Encoding utf8 $typesPath
Write-Host "Types updated at src/types/database.types.ts" -ForegroundColor Green
exit 0
