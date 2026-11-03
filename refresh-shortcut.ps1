# Refreshes the Paramtool desktop shortcut icon. No admin rights.
# -CreateIfMissing: setup. Without it, do nothing when the shortcut is absent.
param([switch]$CreateIfMissing)
$ErrorActionPreference = 'Stop'
$dir = Join-Path $env:LOCALAPPDATA 'Paramtool'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$ico = Join-Path $dir 'paramtool.ico'
$url = 'https://sealink68.github.io/Paramtool/icons/paramtool.ico'
try {
  Invoke-WebRequest -Uri $url -OutFile $ico -UseBasicParsing
} catch {
  if (-not (Test-Path -LiteralPath $ico)) { exit 1 }
}
$pub = Join-Path $env:PUBLIC 'Documents\projecten'
New-Item -ItemType Directory -Force -Path $pub | Out-Null
Copy-Item -LiteralPath $ico -Destination (Join-Path $pub 'paramtool.ico') -Force

function Find-Chrome {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )
  foreach ($p in $candidates) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  return $null
}

$desk = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desk 'Paramtool.lnk'
$exists = Test-Path -LiteralPath $lnkPath
if (-not $exists -and -not $CreateIfMissing) { exit 0 }
$chrome = Find-Chrome
$sh = New-Object -ComObject WScript.Shell
$sc = $sh.CreateShortcut($lnkPath)
$target = [string]$sc.TargetPath
if ($target -like '*chrome.exe') { $chromeTarget = $target } else { $chromeTarget = $chrome }
if (-not $chromeTarget) { exit 1 }
$args = [string]$sc.Arguments
if ($args -notlike '*sealink68.github.io/Paramtool*') {
  $args = '--app=https://sealink68.github.io/Paramtool/'
}
$want = $ico + ',0'
$sc.TargetPath = $chromeTarget
$sc.Arguments = $args
$sc.WorkingDirectory = $desk
$sc.Description = 'Paramtool'
$sc.IconLocation = $want
$sc.Save()
try {
  Add-Type -Namespace ParamtoolIcon -Name Shell -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("shell32.dll")] public static extern void SHChangeNotify(int e, uint f, System.IntPtr a, System.IntPtr b);
'@
  [ParamtoolIcon.Shell]::SHChangeNotify(0x8000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
} catch {}
exit 0
