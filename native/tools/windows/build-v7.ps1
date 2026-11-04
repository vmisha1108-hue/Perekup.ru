param([Parameter(Mandatory=$true)][string]$QtRoot,[string]$CompilerBin="",[string]$OutputRoot="")
$ErrorActionPreference="Stop"
$source=(Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$QtRoot=(Resolve-Path $QtRoot).Path
if (!$OutputRoot) { $OutputRoot=Join-Path $source "v7-output" }
if (Test-Path $OutputRoot) { throw "Choose a fresh OutputRoot to protect previous builds and saves." }
 $env:PATH=(Join-Path $source "third-party/webp-runtime")+";"+$env:PATH
$env:PATH=(Join-Path $QtRoot "bin")+";"+$env:PATH
if ($CompilerBin) { $env:PATH=(Resolve-Path $CompilerBin).Path+";"+$env:PATH }
function Run([string]$exe,[string[]]$arguments){ & $exe @arguments;if($LASTEXITCODE -ne 0){throw "$exe failed: $LASTEXITCODE"} }
$build=Join-Path $OutputRoot "build";$stage=Join-Path $OutputRoot "Perekyp"
Run "cmake" @("-S",$source,"-B",$build,"-G","Ninja","-DCMAKE_BUILD_TYPE=Release","-DPEREKUP_BUILD_UI=ON","-DCMAKE_PREFIX_PATH=$QtRoot")
Run "cmake" @("--build",$build,"--target","perekup_native_desktop","--parallel","2")
New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item (Join-Path $build "Perekyp.exe") $stage
foreach($folder in @("assets","data","licenses")){Copy-Item (Join-Path $source $folder) $stage -Recurse}
New-Item -ItemType Directory -Path (Join-Path $stage "tools") | Out-Null
Copy-Item (Join-Path $source "tools/media") (Join-Path $stage "tools") -Recurse
Copy-Item (Join-Path $source "third-party/webp-runtime/*.dll") $stage
Run (Join-Path $QtRoot "bin/windeployqt.exe") @("--release","--compiler-runtime","--no-translations","--dir",$stage,(Join-Path $stage "Perekyp.exe"))
@("[Paths]","Prefix=.","Plugins=.") | Set-Content -Encoding ASCII (Join-Path $stage "qt.conf")
New-Item -ItemType Directory -Path (Join-Path $stage "Music"),(Join-Path $stage "saves") | Out-Null
Copy-Item (Join-Path $source "V7-README.md") (Join-Path $stage "README.md")
Compress-Archive -Path $stage -DestinationPath (Join-Path $OutputRoot "Perekyp-V7-Portable.zip")
