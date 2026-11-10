// Tangkap layar Windows (monitor utama) untuk tombol "Lihat layar PC" di halaman laporan.
// Satu proses PowerShell dijaga hidup selama ada yang menonton, lalu dimatikan sendiri saat sepi.
// Hanya berjalan di Windows, di sesi desktop yang sedang aktif (layar terkunci = gambar hitam).
const { spawn } = require('child_process');

function psScript(quality, maxWidth) {
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class BmDpi { [DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); }'
[void][BmDpi]::SetProcessDPIAware()
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters -ArgumentList 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter -ArgumentList ([System.Drawing.Imaging.Encoder]::Quality), ([long]${quality})
[Console]::Out.WriteLine('READY')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  try {
    $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList $b.Width, $b.Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
    $g.Dispose()
    $w = [Math]::Min(${maxWidth}, $b.Width)
    $h = [int]($b.Height * $w / $b.Width)
    $sm = New-Object System.Drawing.Bitmap -ArgumentList $bmp, $w, $h
    $bmp.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $sm.Save($ms, $codec, $ep)
    $sm.Dispose()
    [Console]::Out.WriteLine([Convert]::ToBase64String($ms.ToArray()))
    $ms.Dispose()
  } catch {
    [Console]::Out.WriteLine('ERR ' + $_.Exception.Message)
  }
}
`;
}

function createCapturer({ log, quality = 60, maxWidth = 1280, idleMs = 20000, minGapMs = 400, spawnSpec }) {
  let proc = null, buf = '', ready = false, inflight = null, pending = null;
  let lastFrame = null, lastAt = 0, idleTimer = null;

  const stop = (why) => {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (proc) { try { proc.kill(); } catch (_) {} proc = null; }
    ready = false; buf = '';
    if (pending) { const p = pending; pending = null; clearTimeout(p.timer); p.reject(new Error(why || 'dihentikan')); }
  };
  const touchIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { log('INFO', 'Lihat layar PC: tidak ada penonton, pengambil layar dimatikan'); stop('idle'); }, idleMs);
    idleTimer.unref();
  };

  function start() {
    let cmd, args;
    if (spawnSpec) { cmd = spawnSpec.cmd; args = spawnSpec.args; }
    else if (process.platform === 'win32') {
      const enc = Buffer.from(psScript(quality, maxWidth), 'utf16le').toString('base64');
      cmd = 'powershell.exe';
      args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', enc];
    } else throw new Error('Tangkap layar hanya tersedia di Windows');
    proc = spawn(cmd, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let errTxt = '';
    proc.stderr.on('data', (d) => { errTxt = (errTxt + d).slice(-500); });
    proc.stdout.on('data', (d) => {
      buf += d.toString('latin1');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (line === 'READY') { ready = true; continue; }
        if (!pending) continue;
        const p = pending; pending = null; clearTimeout(p.timer);
        if (line.startsWith('ERR')) p.reject(new Error(line));
        else { try { p.resolve(Buffer.from(line, 'base64')); } catch (e) { p.reject(e); } }
      }
    });
    const me = proc;
    proc.on('error', (e) => { log('WARN', `Pengambil layar gagal jalan: ${e.message}`); if (proc === me) stop('gagal jalan'); });
    proc.on('exit', (code) => {
      if (proc === me) { if (errTxt.trim()) log('WARN', `Pengambil layar berhenti (kode ${code}): ${errTxt.trim().slice(0, 300)}`); stop('berhenti'); }
    });
  }

  // Ambil satu gambar JPEG. Beberapa penonton berbagi hasil yang sama.
  async function grab() {
    touchIdle();
    if (lastFrame && Date.now() - lastAt < minGapMs) return lastFrame;
    if (inflight) return inflight;
    inflight = new Promise((resolve, reject) => {
      try { if (!proc) start(); } catch (e) { return reject(e); }
      const first = !ready;
      const timer = setTimeout(() => { stop('timeout'); reject(new Error('timeout mengambil layar')); }, first ? 20000 : 8000);
      pending = { resolve, reject, timer };
      const send = () => { try { proc.stdin.write('x\n'); } catch (e) { reject(e); } };
      if (ready) send();
      else { const w = setInterval(() => { if (ready) { clearInterval(w); send(); } else if (!proc) clearInterval(w); }, 50); w.unref(); }
    }).then((b) => { lastFrame = b; lastAt = Date.now(); return b; })
      .finally(() => { inflight = null; });
    return inflight;
  }

  return { grab, stop };
}

module.exports = { createCapturer, psScript };
