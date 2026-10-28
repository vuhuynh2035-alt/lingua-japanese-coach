$ErrorActionPreference = "Stop"

Set-Location (Split-Path -Parent $PSScriptRoot)
$env:NEXT_PUBLIC_BASE_PATH = "/lingua-japanese-coach"

npm run build
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

if (-not (Test-Path "docs")) {
  New-Item -ItemType Directory -Path "docs" | Out-Null
}

if (Test-Path "docs\_next") {
  Remove-Item "docs\_next" -Recurse -Force
}

Copy-Item -Path "out\*" -Destination "docs" -Recurse -Force
