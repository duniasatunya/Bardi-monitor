# Memasang / menghapus shortcut "Bardi Monitor" di folder Startup Windows (nyala otomatis saat login).
param([ValidateSet('pasang','hapus')][string]$Aksi = 'pasang')
$startup = [Environment]::GetFolderPath('Startup')
$lnkPath = Join-Path $startup 'Bardi Monitor.lnk'
if ($Aksi -eq 'hapus') {
  if (Test-Path $lnkPath) { Remove-Item $lnkPath; Write-Host 'Nyala otomatis dihapus.' } else { Write-Host 'Tidak ada shortcut nyala otomatis.' }
  exit 0
}
$root = $PSScriptRoot
$s = New-Object -ComObject WScript.Shell
$l = $s.CreateShortcut($lnkPath)
$l.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$l.Arguments = '"' + (Join-Path $root 'START.vbs') + '"'
$l.WorkingDirectory = $root
$l.Description = 'Bardi Monitor (mode kios)'
$ico = Join-Path $root 'assets\bardi.ico'
if (Test-Path $ico) { $l.IconLocation = $ico }
$l.Save()
Write-Host "Selesai. Shortcut dipasang di: $lnkPath"
