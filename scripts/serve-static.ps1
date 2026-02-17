param(
  [string]$Root = "app/web",
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"

$rootPath = Resolve-Path $Root
$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Serving $rootPath on $prefix"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $path = $req.Url.AbsolutePath.TrimStart("/")
    if ([string]::IsNullOrWhiteSpace($path)) {
      $path = "index.html"
    }

    $fullPath = Join-Path $rootPath $path
    if (-not (Test-Path $fullPath)) {
      $res.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }

    $ext = [IO.Path]::GetExtension($fullPath).ToLowerInvariant()
    $contentType = switch ($ext) {
      ".html" { "text/html; charset=utf-8" }
      ".css" { "text/css; charset=utf-8" }
      ".js" { "application/javascript; charset=utf-8" }
      ".json" { "application/json; charset=utf-8" }
      ".png" { "image/png" }
      ".jpg" { "image/jpeg" }
      ".jpeg" { "image/jpeg" }
      ".gif" { "image/gif" }
      default { "application/octet-stream" }
    }

    $res.ContentType = $contentType
    $bytes = [IO.File]::ReadAllBytes($fullPath)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
