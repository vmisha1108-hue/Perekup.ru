param(
 [Parameter(Mandatory=$true)][string]$QtRoot,
 [string]$CompilerBin = "",
 [string]$OutputRoot = ""
)
$ErrorActionPreference = "Stop"
$source = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
if (!$OutputRoot) { $OutputRoot = Join-Path $source "windows-output" }
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
$QtRoot = (Resolve-Path $QtRoot).Path
$env:PATH = (Join-Path $QtRoot "bin") + ";" + $env:PATH
if ($CompilerBin) { $env:PATH = (Resolve-Path $CompilerBin).Path + ";" + $env:PATH }
function Invoke-Checked([string]$Program, [string[]]$Arguments) {
 & $Program @Arguments
 if ($LASTEXITCODE -ne 0) { throw "$Program failed with code $LASTEXITCODE" }
}
$build = Join-Path $OutputRoot "build"
$stage = Join-Path $OutputRoot "Perekup"
if (Test-Path $stage) { throw "Output folder already exists: $stage. Choose a fresh OutputRoot to protect existing saves." }
Invoke-Checked "cmake" @("-S", $source, "-B", $build, "-G", "Ninja", "-DCMAKE_BUILD_TYPE=Release", "-DPEREKUP_BUILD_UI=ON", "-DCMAKE_PREFIX_PATH=$QtRoot")
Invoke-Checked "cmake" @("--build", $build, "--parallel", "2")
Invoke-Checked "ctest" @("--test-dir", $build, "--output-on-failure")
New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item (Join-Path $build "perekup_native_desktop.exe") (Join-Path $stage "Perekup.exe")
Copy-Item (Join-Path $source "data") $stage -Recurse
Copy-Item (Join-Path $source "assets") $stage -Recurse
Invoke-Checked (Join-Path $QtRoot "bin/windeployqt.exe") @("--release", "--compiler-runtime", "--no-translations", "--dir", $stage, (Join-Path $stage "Perekup.exe"))
if (!(Test-Path (Join-Path $stage "platforms/qwindows.dll"))) { throw "Missing Windows platform plugin" }
if (!(Test-Path (Join-Path $stage "imageformats/qwebp.dll"))) { throw "Missing WebP plugin. Install the matching Qt Image Formats module." }
@("[Paths]", "Prefix=.", "Plugins=.") | Set-Content -Encoding ASCII (Join-Path $stage "qt.conf")
New-Item -ItemType Directory -Path (Join-Path $stage "saves") | Out-Null
@("Perekup native C++ development build", "Built: $(Get-Date -Format o)", "Save folder: saves next to Perekup.exe", "This is an incomplete port; see STATUS.md in the source archive.") | Set-Content -Encoding UTF8 (Join-Path $stage "BUILD-INFO.txt")
$env:QT_QPA_PLATFORM = "offscreen"
try {
 $p = Start-Process -FilePath (Join-Path $stage "Perekup.exe") -ArgumentList @("`"$stage`"", "--smoke-test") -WorkingDirectory $stage -PassThru
 if (!$p.WaitForExit(60000)) { $p.Kill(); throw "Desktop smoke test timed out" }
 if ($p.ExitCode -ne 0) { throw "Desktop smoke test failed: $($p.ExitCode)" }
} finally { Remove-Item Env:QT_QPA_PLATFORM -ErrorAction SilentlyContinue }
Copy-Item (Join-Path $source "STATUS.md") (Join-Path $stage "PORT-STATUS.md")
$zip = Join-Path $OutputRoot "Perekup-Windows-Development.zip"
Compress-Archive -Path $stage -DestinationPath $zip
Write-Output "Portable development archive: $zip"
