param(
  [string]$EnvFile = ".env",
  [string]$DatabaseName = ""
)

$ErrorActionPreference = "Stop"
$failCount = 0
$results = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param([string]$Name, [string]$Status, [string]$Details)
  $script:results.Add([pscustomobject]@{
      check   = $Name
      status  = $Status
      details = $Details
    })
  if ($Status -eq "FAIL") { $script:failCount++ }
}

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

function Run-D1SqlJson {
  param([string]$Db, [string]$Sql)
  $raw = & npx wrangler d1 execute $Db --remote --json --command $Sql 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw ($raw | Out-String)
  }
  return ($raw | ConvertFrom-Json)
}

Load-EnvFile -Path $EnvFile
$env:CLOUDFLARE_API_TOKEN = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN")
if ([string]::IsNullOrWhiteSpace($DatabaseName)) {
  $DatabaseName = [Environment]::GetEnvironmentVariable("CLOUDFLARE_D1_DATABASE_NAME")
}
if ([string]::IsNullOrWhiteSpace($env:CLOUDFLARE_API_TOKEN) -or [string]::IsNullOrWhiteSpace($DatabaseName)) {
  throw "Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_D1_DATABASE_NAME"
}

try {
  $requiredTables = @(
    "users", "tasks", "learning_tasks", "audit",
    "knowledge_items", "guides", "attachments", "projects",
    "project_knowledge_links", "tags", "item_tags", "knowledge_relations", "analyses"
  )
  $tableRows = (Run-D1SqlJson -Db $DatabaseName -Sql "SELECT name FROM sqlite_master WHERE type='table';")[0].results
  $tableNames = @($tableRows | ForEach-Object { $_.name })

  foreach ($t in $requiredTables) {
    if ($tableNames -contains $t) {
      Add-Check -Name "table.$t" -Status "OK" -Details "exists"
    } else {
      Add-Check -Name "table.$t" -Status "FAIL" -Details "missing"
    }
  }

  $countKnowledge = (Run-D1SqlJson -Db $DatabaseName -Sql "SELECT COUNT(*) AS c FROM knowledge_items;")[0].results[0].c
  if ([int]$countKnowledge -gt 0) {
    Add-Check -Name "data.knowledge_items" -Status "OK" -Details "$countKnowledge rows"
  } else {
    Add-Check -Name "data.knowledge_items" -Status "FAIL" -Details "0 rows"
  }

  $countProjects = (Run-D1SqlJson -Db $DatabaseName -Sql "SELECT COUNT(*) AS c FROM projects;")[0].results[0].c
  if ([int]$countProjects -gt 0) {
    Add-Check -Name "data.projects" -Status "OK" -Details "$countProjects rows"
  } else {
    Add-Check -Name "data.projects" -Status "FAIL" -Details "0 rows"
  }

  $countLinks = (Run-D1SqlJson -Db $DatabaseName -Sql "SELECT COUNT(*) AS c FROM project_knowledge_links;")[0].results[0].c
  if ([int]$countLinks -gt 0) {
    Add-Check -Name "data.project_knowledge_links" -Status "OK" -Details "$countLinks rows"
  } else {
    Add-Check -Name "data.project_knowledge_links" -Status "FAIL" -Details "0 rows"
  }

  $sample = Run-D1SqlJson -Db $DatabaseName -Sql "SELECT p.name AS project_name, k.title AS item_title FROM project_knowledge_links l JOIN projects p ON p.id = l.project_id JOIN knowledge_items k ON k.id = l.item_id LIMIT 1;"
  if ($sample[0].results.Count -gt 0) {
    Add-Check -Name "query.project_item_join" -Status "OK" -Details "join returns data"
  } else {
    Add-Check -Name "query.project_item_join" -Status "FAIL" -Details "join empty"
  }
} catch {
  Add-Check -Name "execution" -Status "FAIL" -Details $_.Exception.Message
}

Write-Host ""
Write-Host "=== D1 TEST REPORT ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize
Write-Host ""

if ($failCount -gt 0) {
  Write-Host "Resultado final: FAIL ($failCount checks con error)" -ForegroundColor Red
  exit 1
}
Write-Host "Resultado final: OK" -ForegroundColor Green
exit 0
