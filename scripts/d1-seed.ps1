param(
  [string]$EnvFile = ".env",
  [string]$SeedsDir = "infra/d1/seeds",
  [string]$DatabaseName = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Load-EnvFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "No se encontro el archivo de entorno: $Path"
  }
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*([^#=\s][^=]*)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      [Environment]::SetEnvironmentVariable($k, $v)
    }
  }
}

Load-EnvFile -Path $EnvFile

if ([string]::IsNullOrWhiteSpace($DatabaseName)) {
  $DatabaseName = [Environment]::GetEnvironmentVariable("CLOUDFLARE_D1_DATABASE_NAME")
}

$token = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN")
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "Falta CLOUDFLARE_API_TOKEN en entorno."
}
if ([string]::IsNullOrWhiteSpace($DatabaseName)) {
  throw "Falta DatabaseName (parametro -DatabaseName o CLOUDFLARE_D1_DATABASE_NAME)."
}
if (-not (Test-Path $SeedsDir)) {
  throw "No existe carpeta de seeds: $SeedsDir"
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw "npx no esta disponible."
}

$env:CLOUDFLARE_API_TOKEN = $token
$seedFiles = Get-ChildItem -Path $SeedsDir -File -Filter "*.sql" | Sort-Object Name
if ($seedFiles.Count -eq 0) {
  Write-Host "No hay seeds SQL en $SeedsDir" -ForegroundColor Yellow
  exit 0
}

Write-Host ""
Write-Host "=== D1 Seed Runner ===" -ForegroundColor Cyan
Write-Host "Database: $DatabaseName"
Write-Host "Seeds: $($seedFiles.Count)"
Write-Host ""

foreach ($file in $seedFiles) {
  if ($DryRun) {
    Write-Host "[DRY-RUN] $($file.Name)"
    continue
  }
  Write-Host "Applying $($file.Name)..." -ForegroundColor Yellow
  & npx wrangler d1 execute $DatabaseName --remote --file $file.FullName
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo aplicando seed: $($file.Name)"
  }
  Write-Host "OK $($file.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Seeds completados." -ForegroundColor Green
