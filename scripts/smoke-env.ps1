param(
  [string]$EnvFile = ".env",
  [string]$ExpectedSupabaseProjectRef = "hzvojttkhjqsbejmudqz",
  [string]$Connections = "all",
  [switch]$Interactive
)

$ErrorActionPreference = "Stop"
$results = New-Object System.Collections.Generic.List[object]
$failCount = 0

function Add-Result {
  param(
    [string]$Check,
    [string]$Status,
    [string]$Details
  )
  $script:results.Add([pscustomobject]@{
      check   = $Check
      status  = $Status
      details = $Details
    })
  if ($Status -eq "FAIL") {
    $script:failCount++
  }
}

function Load-EnvFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "No se encontró el archivo de entorno: $Path"
  }

  $vars = @{}
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*([^#=\s][^=]*)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2]
      if ($v -match '^\s*"(.*)"\s*$') {
        $v = $matches[1]
      } else {
        $v = $v.Trim()
      }
      $vars[$k] = $v
      [Environment]::SetEnvironmentVariable($k, $v)
    }
  }
  return $vars
}

function Select-ConnectionsInteractive {
  $options = @("env", "github", "vercel", "supabase", "cloudflare")
  $selected = @{
    env      = $true
    github   = $true
    vercel   = $true
    supabase = $true
    cloudflare = $true
  }

  while ($true) {
    Clear-Host
    Write-Host "=== Seleccion de conexiones para smoke test ===" -ForegroundColor Cyan
    Write-Host ""
    for ($i = 0; $i -lt $options.Count; $i++) {
      $name = $options[$i]
      $mark = if ($selected[$name]) { "x" } else { " " }
      Write-Host ("{0}. [{1}] {2}" -f ($i + 1), $mark, $name)
    }
    Write-Host ""
    Write-Host "Comandos: 1-5 toggle, A=all, N=none, R=run, Q=cancel" -ForegroundColor Yellow
    $inputValue = Read-Host "Seleccion"
    if ([string]::IsNullOrWhiteSpace($inputValue)) { continue }

    $tokens = $inputValue.Trim().ToUpperInvariant() -split '[,; ]+'
    foreach ($t in $tokens) {
      switch ($t) {
        "1" { $selected["env"] = -not $selected["env"] }
        "2" { $selected["github"] = -not $selected["github"] }
        "3" { $selected["vercel"] = -not $selected["vercel"] }
        "4" { $selected["supabase"] = -not $selected["supabase"] }
        "5" { $selected["cloudflare"] = -not $selected["cloudflare"] }
        "A" {
          foreach ($k in $options) { $selected[$k] = $true }
        }
        "N" {
          foreach ($k in $options) { $selected[$k] = $false }
        }
        "Q" {
          throw "Operacion cancelada por el usuario."
        }
        "R" {
          $picked = @()
          foreach ($k in $options) {
            if ($selected[$k]) { $picked += $k }
          }
          if ($picked.Count -eq 0) {
            Write-Host "Debes seleccionar al menos una conexion para ejecutar." -ForegroundColor Red
            Start-Sleep -Seconds 2
          } else {
            return ($picked -join ",")
          }
        }
        default {
          Write-Host ("Entrada no valida: {0}" -f $t) -ForegroundColor Red
          Start-Sleep -Seconds 1
        }
      }
    }
  }
}

function Test-Cloudflare {
  param(
    [string]$ApiToken,
    [string]$AccountId,
    [string]$D1DatabaseId,
    [string]$D1DatabaseName
  )
  if ([string]::IsNullOrWhiteSpace($ApiToken)) {
    Add-Result -Check "cloudflare.token" -Status "SKIP" -Details "CLOUDFLARE_API_TOKEN no definido"
    return
  }
  if ([string]::IsNullOrWhiteSpace($AccountId)) {
    Add-Result -Check "cloudflare.account_id" -Status "SKIP" -Details "CLOUDFLARE_ACCOUNT_ID no definido"
    return
  }

  try {
    $verify = Invoke-RestMethod -Headers @{ Authorization = "Bearer $ApiToken" } -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/tokens/verify" -Method Get
    if ($verify.success -eq $true) {
      Add-Result -Check "cloudflare.token_verify" -Status "OK" -Details "ok"
    } else {
      Add-Result -Check "cloudflare.token_verify" -Status "FAIL" -Details "verify returned success=false"
    }
  } catch {
    Add-Result -Check "cloudflare.token_verify" -Status "FAIL" -Details $_.Exception.Message
  }

  if (-not [string]::IsNullOrWhiteSpace($D1DatabaseId)) {
    try {
      $db = Invoke-RestMethod -Headers @{ Authorization = "Bearer $ApiToken" } -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/d1/database/$D1DatabaseId" -Method Get
      if ($db.success -eq $true) {
        Add-Result -Check "cloudflare.d1_lookup" -Status "OK" -Details $db.result.name
      } else {
        Add-Result -Check "cloudflare.d1_lookup" -Status "FAIL" -Details "lookup returned success=false"
      }
    } catch {
      Add-Result -Check "cloudflare.d1_lookup" -Status "FAIL" -Details $_.Exception.Message
    }
  } else {
    Add-Result -Check "cloudflare.d1_lookup" -Status "SKIP" -Details "CLOUDFLARE_D1_DATABASE_ID no definido"
  }

  if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Add-Result -Check "cloudflare.wrangler" -Status "SKIP" -Details "npx no disponible"
    return
  }

  try {
    [Environment]::SetEnvironmentVariable("CLOUDFLARE_API_TOKEN", $ApiToken)
    $d1Output = & npx wrangler d1 list 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw ($d1Output | Out-String)
    }
    Add-Result -Check "cloudflare.wrangler_d1_list" -Status "OK" -Details "ok"

    if (-not [string]::IsNullOrWhiteSpace($D1DatabaseName)) {
      if ($d1Output -match [regex]::Escape($D1DatabaseName)) {
        Add-Result -Check "cloudflare.d1_name_present" -Status "OK" -Details $D1DatabaseName
      } else {
        Add-Result -Check "cloudflare.d1_name_present" -Status "FAIL" -Details "no aparece $D1DatabaseName"
      }
    }
  } catch {
    Add-Result -Check "cloudflare.wrangler_d1_list" -Status "FAIL" -Details $_.Exception.Message
  }
}

function Test-HttpUrl {
  param([string]$Url)
  try {
    Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 15 | Out-Null
    return @{ ok = $true; msg = "reachable" }
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $code = [int]$_.Exception.Response.StatusCode
      if ($code -in @(401, 403, 404)) {
        return @{ ok = $true; msg = "reachable(http $code)" }
      }
    }
    try {
      Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 15 | Out-Null
      return @{ ok = $true; msg = "reachable(get)" }
    } catch {
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $code = [int]$_.Exception.Response.StatusCode
        if ($code -in @(401, 403, 404)) {
          return @{ ok = $true; msg = "reachable(http $code)" }
        }
      }
      return @{ ok = $false; msg = $_.Exception.Message }
    }
  }
}

function Test-GenericVariable {
  param([string]$Name, [string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    Add-Result -Check "env.$Name" -Status "FAIL" -Details "vacía"
    return
  }

  Add-Result -Check "env.$Name" -Status "OK" -Details "definida"

  if ($Name -match '(_URL|URL)$' -and $Value -match '^https?://') {
    $http = Test-HttpUrl -Url $Value
    if ($http.ok) {
      Add-Result -Check "env.$Name.http" -Status "OK" -Details $http.msg
    } else {
      Add-Result -Check "env.$Name.http" -Status "FAIL" -Details $http.msg
    }
  }

  if ($Name -match '(TOKEN|KEY|SECRET)') {
    if ($Value.Length -lt 16) {
      Add-Result -Check "env.$Name.length" -Status "FAIL" -Details "longitud muy corta (<16)"
    } else {
      Add-Result -Check "env.$Name.length" -Status "OK" -Details "longitud valida"
    }
  }
}

function Test-GitHubToken {
  param([string]$Token)
  if ([string]::IsNullOrWhiteSpace($Token)) {
    Add-Result -Check "github.token" -Status "SKIP" -Details "GITHUB_TOKEN no definido"
    return
  }
  try {
    $u = Invoke-RestMethod -Headers @{
      Authorization = "Bearer $Token"
      "User-Agent"  = "env-smoke"
      Accept         = "application/vnd.github+json"
    } -Uri "https://api.github.com/user"
    Add-Result -Check "github.api_user" -Status "OK" -Details $u.login
  } catch {
    Add-Result -Check "github.api_user" -Status "FAIL" -Details $_.Exception.Message
  }
}

function Test-VercelToken {
  param([string]$Token)
  if ([string]::IsNullOrWhiteSpace($Token)) {
    Add-Result -Check "vercel.token" -Status "SKIP" -Details "VERCEL_TOKEN no definido"
    return
  }
  try {
    $r = Invoke-RestMethod -Headers @{ Authorization = "Bearer $Token" } -Uri "https://api.vercel.com/v2/user"
    Add-Result -Check "vercel.api_user" -Status "OK" -Details $r.user.username
  } catch {
    Add-Result -Check "vercel.api_user" -Status "FAIL" -Details $_.Exception.Message
  }
}

function Test-Supabase {
  param(
    [string]$Url,
    [string]$AnonKey,
    [string]$ServiceRoleKey,
    [string]$AccessToken,
    [string]$ExpectedRef
  )
  if ([string]::IsNullOrWhiteSpace($Url)) {
    Add-Result -Check "supabase.url" -Status "SKIP" -Details "SUPABASE_URL no definido"
    return
  }

  if (-not [string]::IsNullOrWhiteSpace($AnonKey)) {
    try {
      Invoke-RestMethod -Headers @{ apikey = $AnonKey; Authorization = "Bearer $AnonKey" } -Uri "$Url/auth/v1/settings" -Method Get | Out-Null
      Add-Result -Check "supabase.api_anon" -Status "OK" -Details "auth settings reachable"
    } catch {
      Add-Result -Check "supabase.api_anon" -Status "FAIL" -Details $_.Exception.Message
    }
  } else {
    Add-Result -Check "supabase.api_anon" -Status "SKIP" -Details "SUPABASE_KEY no definido"
  }

  if (-not [string]::IsNullOrWhiteSpace($ServiceRoleKey)) {
    try {
      Invoke-RestMethod -Headers @{ apikey = $ServiceRoleKey; Authorization = "Bearer $ServiceRoleKey" } -Uri "$Url/auth/v1/settings" -Method Get | Out-Null
      Add-Result -Check "supabase.api_service_role" -Status "OK" -Details "auth settings reachable"
    } catch {
      Add-Result -Check "supabase.api_service_role" -Status "FAIL" -Details $_.Exception.Message
    }
  } else {
    Add-Result -Check "supabase.api_service_role" -Status "SKIP" -Details "SUPABASE_SERVICE_ROLE_KEY no definido"
  }

  if ([string]::IsNullOrWhiteSpace($AccessToken)) {
    Add-Result -Check "supabase.cli_token" -Status "SKIP" -Details "SUPABASE_ACCESS_TOKEN no definido"
    return
  }

  if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Add-Result -Check "supabase.cli" -Status "FAIL" -Details "supabase CLI no instalado"
    return
  }

  try {
    [Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", $AccessToken)
    $projectsOutput = & supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw ($projectsOutput | Out-String)
    }
    Add-Result -Check "supabase.cli_projects_list" -Status "OK" -Details "ok"

    if (-not [string]::IsNullOrWhiteSpace($ExpectedRef)) {
      if ($projectsOutput -match [regex]::Escape($ExpectedRef)) {
        Add-Result -Check "supabase.cli_project_ref" -Status "OK" -Details $ExpectedRef
      } else {
        Add-Result -Check "supabase.cli_project_ref" -Status "FAIL" -Details "no aparece $ExpectedRef"
      }
    }
  } catch {
    Add-Result -Check "supabase.cli" -Status "FAIL" -Details $_.Exception.Message
  }
}

try {
  if ($Interactive) {
    $Connections = Select-ConnectionsInteractive
  }

  $envVars = Load-EnvFile -Path $EnvFile
  Add-Result -Check "env.load" -Status "OK" -Details "$($envVars.Count) variables cargadas"

  $tokens = @()
  foreach ($t in ($Connections -split '[,; ]+')) {
    if (-not [string]::IsNullOrWhiteSpace($t)) {
      $tokens += $t.Trim().ToLowerInvariant()
    }
  }
  if ($tokens.Count -eq 0) { $tokens = @("all") }

  $all = $tokens -contains "all"
  $runEnv = $all -or ($tokens -contains "env")
  $runGitHub = $all -or ($tokens -contains "github")
  $runVercel = $all -or ($tokens -contains "vercel")
  $runSupabase = $all -or ($tokens -contains "supabase")
  $runCloudflare = $all -or ($tokens -contains "cloudflare")

  Add-Result -Check "smoke.connections" -Status "OK" -Details (($tokens -join ","))

  if ($runEnv) {
    foreach ($item in $envVars.GetEnumerator()) {
      Test-GenericVariable -Name $item.Key -Value $item.Value
    }
  } else {
    Add-Result -Check "env.generic_checks" -Status "SKIP" -Details "deshabilitado por -Connections"
  }

  if ($runGitHub) {
    Test-GitHubToken -Token $envVars["GITHUB_TOKEN"]
  } else {
    Add-Result -Check "github" -Status "SKIP" -Details "deshabilitado por -Connections"
  }

  if ($runVercel) {
    Test-VercelToken -Token $envVars["VERCEL_TOKEN"]
  } else {
    Add-Result -Check "vercel" -Status "SKIP" -Details "deshabilitado por -Connections"
  }

  if ($runSupabase) {
    Test-Supabase -Url $envVars["SUPABASE_URL"] `
      -AnonKey $envVars["SUPABASE_KEY"] `
      -ServiceRoleKey $envVars["SUPABASE_SERVICE_ROLE_KEY"] `
      -AccessToken $envVars["SUPABASE_ACCESS_TOKEN"] `
      -ExpectedRef $ExpectedSupabaseProjectRef
  } else {
    Add-Result -Check "supabase" -Status "SKIP" -Details "deshabilitado por -Connections"
  }

  if ($runCloudflare) {
    Test-Cloudflare -ApiToken $envVars["CLOUDFLARE_API_TOKEN"] `
      -AccountId $envVars["CLOUDFLARE_ACCOUNT_ID"] `
      -D1DatabaseId $envVars["CLOUDFLARE_D1_DATABASE_ID"] `
      -D1DatabaseName $envVars["CLOUDFLARE_D1_DATABASE_NAME"]
  } else {
    Add-Result -Check "cloudflare" -Status "SKIP" -Details "deshabilitado por -Connections"
  }
} catch {
  Add-Result -Check "smoke.execution" -Status "FAIL" -Details $_.Exception.Message
}

Write-Host ""
Write-Host "=== ENV SMOKE TEST ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize
Write-Host ""
if ($failCount -gt 0) {
  Write-Host "Resultado final: FAIL ($failCount checks con error)" -ForegroundColor Red
  exit 1
}
Write-Host "Resultado final: OK" -ForegroundColor Green
exit 0
