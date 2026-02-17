param(
  [string]$EnvFile = ".env",
  [string]$DatabaseName = "",
  [switch]$Force,
  [switch]$SkipSeed
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
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw "npx no esta disponible."
}

if (-not $Force) {
  Write-Host "Este comando elimina tablas de la base remota '$DatabaseName' y re-aplica migraciones." -ForegroundColor Red
  Write-Host "Ejecuta con -Force para confirmar."
  exit 1
}

$env:CLOUDFLARE_API_TOKEN = $token

$dropSql = @"
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS analyses;
DROP TABLE IF EXISTS knowledge_relations;
DROP TABLE IF EXISTS item_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS project_knowledge_links;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS guides;
DROP TABLE IF EXISTS knowledge_items;
DROP TABLE IF EXISTS learning_tasks;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS audit;
DROP TABLE IF EXISTS users;
PRAGMA foreign_keys = ON;
"@

Write-Host ""
Write-Host "=== D1 Fast Reset ===" -ForegroundColor Cyan
Write-Host "Database: $DatabaseName"
Write-Host "Step 1/3 - Dropping schema..."

& npx wrangler d1 execute $DatabaseName --remote --command $dropSql
if ($LASTEXITCODE -ne 0) {
  throw "Fallo al limpiar schema remoto."
}

Write-Host "Step 2/3 - Applying migrations..."
& powershell -ExecutionPolicy Bypass -File "scripts/d1-migrate.ps1" -EnvFile $EnvFile -DatabaseName $DatabaseName
if ($LASTEXITCODE -ne 0) {
  throw "Fallo al aplicar migraciones tras reset."
}

if (-not $SkipSeed) {
  Write-Host "Step 3/3 - Applying seeds..."
  & powershell -ExecutionPolicy Bypass -File "scripts/d1-seed.ps1" -EnvFile $EnvFile -DatabaseName $DatabaseName
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo al aplicar seeds tras reset."
  }
} else {
  Write-Host "Step 3/3 - Seeds omitidos por -SkipSeed."
}

Write-Host ""
Write-Host "Reset completado." -ForegroundColor Green
