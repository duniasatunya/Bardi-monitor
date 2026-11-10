# Bardi Monitor - installer (tahap 1)
# Dijalankan oleh INSTALL.bat sebagai Administrator.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Step($m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

try {
  # ---------- 1. Node.js ----------
  Step '1/7 Memeriksa Node.js'
  Refresh-Path
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    Write-Host ("Node.js sudah terpasang: " + (& node --version) + ". Lanjut ke tahap berikutnya.")
  } else {
    Write-Host 'Node.js belum terpasang. Memasang sekarang (butuh internet, bisa beberapa menit)...'
    $ok = $false
    if (Get-Command winget -ErrorAction SilentlyContinue) {
      Write-Host 'Mencoba lewat winget...'
      & winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
      if ($LASTEXITCODE -eq 0) { $ok = $true }
    }
    if (-not $ok) {
      Write-Host 'Mengunduh installer Node.js dari nodejs.org...'
      $idx = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
      $ver = ($idx | Where-Object { $_.lts } | Select-Object -First 1).version
      $msi = Join-Path $env:TEMP ("node-$ver-x64.msi")
      Invoke-WebRequest ("https://nodejs.org/dist/$ver/node-$ver-x64.msi") -OutFile $msi
      Write-Host "Memasang Node.js $ver ..."
      $p = Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Wait -PassThru
      if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) { throw "Installer Node.js gagal (kode $($p.ExitCode))." }
    }
    Refresh-Path
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { throw 'Node.js sudah dipasang tetapi belum terdeteksi. Restart PC lalu jalankan INSTALL.bat lagi.' }
    Write-Host ("Node.js terpasang: " + (& node --version))
  }

  # ---------- 2. Paket proyek ----------
  Step '2/7 Memasang paket proyek (npm install)'
  & npm.cmd install --no-fund --no-audit
  if ($LASTEXITCODE -ne 0) { throw 'npm install gagal. Periksa koneksi internet lalu coba lagi.' }

  # ---------- 3. Browser ----------
  Step '3/7 Mengunduh browser Chromium (sekitar 150 MB, harap tunggu)'
  & npx.cmd playwright install chromium
  if ($LASTEXITCODE -ne 0) { throw 'Unduh Chromium gagal. Periksa koneksi internet lalu coba lagi.' }

  # ---------- 4. Password laporan ----------
  Step '4/7 Password halaman laporan'
  if (Test-Path (Join-Path $root 'config.json')) {
    Write-Host 'Password laporan sudah pernah diatur. Dilewati. (Untuk mengganti: jalankan GANTI-PASSWORD.bat)'
  } else {
    & node set-password.js
    if ($LASTEXITCODE -ne 0) { throw 'Password laporan belum diatur. Jalankan INSTALL.bat lagi.' }
  }

  # ---------- 5. Firewall ----------
  Step '5/7 Mengizinkan halaman laporan lewat Windows Firewall (port 3000)'
  & netsh advfirewall firewall delete rule name="Bardi Monitor Laporan" | Out-Null
  & netsh advfirewall firewall add rule name="Bardi Monitor Laporan" dir=in action=allow protocol=TCP localport=3000 profile=any | Out-Null
  Write-Host 'Aturan firewall ditambahkan.'

  # ---------- 6. ffmpeg (untuk tombol Lihat layar PC) ----------
  Step '6/7 Memasang ffmpeg (untuk tombol Lihat layar PC)'
  $ffDir = Join-Path $root 'ffmpeg'
  $ffExe = Join-Path $ffDir 'ffmpeg.exe'
  if (Test-Path $ffExe) {
    Write-Host 'ffmpeg sudah ada. Dilewati.'
  } else {
    try {
      Write-Host 'Mengunduh ffmpeg (puluhan sampai ratusan MB, harap tunggu)...'
      $zip = Join-Path $env:TEMP 'bardi-ffmpeg.zip'
      $tmp = Join-Path $env:TEMP 'bardi-ffmpeg'
      if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
      Invoke-WebRequest 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $zip
      Expand-Archive -Path $zip -DestinationPath $tmp -Force
      $found = Get-ChildItem -Path $tmp -Recurse -Filter ffmpeg.exe | Select-Object -First 1
      if (-not $found) { throw 'ffmpeg.exe tidak ada di dalam berkas unduhan.' }
      New-Item -ItemType Directory -Force -Path $ffDir | Out-Null
      Copy-Item $found.FullName $ffExe -Force
      Remove-Item $zip -Force -ErrorAction SilentlyContinue
      Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
      Write-Host 'ffmpeg terpasang di folder ffmpeg\.'
    } catch {
      Write-Host ('PERHATIAN: ffmpeg gagal dipasang (' + $_.Exception.Message + ').') -ForegroundColor Yellow
      Write-Host 'Tombol Lihat layar PC mode video tidak akan jalan, tapi sistem lain tetap normal. Jalankan INSTALL.bat lagi saat internet stabil.' -ForegroundColor Yellow
    }
  }

  # ---------- 7. Ikon + shortcut ----------
  Step '7/7 Membuat shortcut di desktop'
  $logo = Join-Path $root 'assets\logo.png'
  $ico  = Join-Path $root 'assets\bardi.ico'
  if (Test-Path $logo) {
    Add-Type -AssemblyName System.Drawing
    $img = [System.Drawing.Image]::FromFile($logo)
    $bmp = New-Object System.Drawing.Bitmap 256, 256
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.SmoothingMode = 'HighQuality'
    $g.DrawImage($img, 0, 0, 256, 256)
    $g.Dispose(); $img.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $png = $ms.ToArray()
    $fs = [System.IO.File]::Open($ico, 'Create')
    $bw = New-Object System.IO.BinaryWriter $fs
    $bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]1)          # header: 1 gambar
    $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0)  # 256x256
    $bw.Write([uint16]1); $bw.Write([uint16]32)
    $bw.Write([uint32]$png.Length); $bw.Write([uint32]22)
    $bw.Write($png)
    $bw.Close(); $fs.Close()
    Write-Host 'Ikon dibuat dari assets\logo.png'
  } else {
    Write-Host 'PERHATIAN: assets\logo.png tidak ditemukan, shortcut memakai ikon bawaan.' -ForegroundColor Yellow
    Write-Host 'Taruh logo di assets\logo.png lalu jalankan INSTALL.bat lagi.' -ForegroundColor Yellow
  }

  $desktop = [Environment]::GetFolderPath('CommonDesktopDirectory')
  $shell = New-Object -ComObject WScript.Shell
  $lnk = $shell.CreateShortcut((Join-Path $desktop 'Bardi Monitor.lnk'))
  $lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
  $lnk.Arguments = "`"$root\START.vbs`""
  $lnk.WorkingDirectory = $root
  $lnk.Description = 'Bardi Monitor'
  if (Test-Path $ico) { $lnk.IconLocation = $ico }
  $lnk.Save()
  Write-Host 'Shortcut "Bardi Monitor" dibuat di Desktop.'

  $ipLocal = ''
  try { $ipLocal = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^(127|169\.254)' -and $_.InterfaceAlias -notmatch 'Loopback' } | Select-Object -First 1).IPAddress } catch {}
  Write-Host ""
  Write-Host "SELESAI. Klik shortcut 'Bardi Monitor' di Desktop untuk memulai." -ForegroundColor Green
  if ($ipLocal) { Write-Host ("Halaman laporan (dari jaringan yang sama): http://" + $ipLocal + ":3000/displaycostum.html") -ForegroundColor Green }
}
catch {
  Write-Host ""
  Write-Host "GAGAL: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Foto layar ini lalu kirim ke admin." -ForegroundColor Red
}
