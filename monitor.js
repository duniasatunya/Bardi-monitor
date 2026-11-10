// Bardi IPC web portal auto-recovery monitor (v1)
// Usage:
//   node monitor.js --login   -> buka browser, scan QR sekali, lalu tutup jendela
//   node monitor.js --dry     -> pantau & catat saja, TIDAK mengklik apa pun
//   node monitor.js           -> pantau + pulihkan otomatis
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { startReportServer } = require('./report-server');

// ---------- Konfigurasi ----------
const CFG = {
  url: 'https://ipc.bardi.co.id/',
  profileDir: path.join(__dirname, 'profile'),
  logFile: path.join(__dirname, 'monitor.log'),
  csvFile: path.join(__dirname, 'kamera-bermasalah.csv'), // catatan kamera bermasalah (buka di Excel)
  floorsFile: path.join(__dirname, 'kamera-lantai.json'), // pemetaan kamera -> lantai untuk halaman laporan
  pollMs: 2500,            // seberapa sering layar Bardi dibaca (status di halaman laporan ikut secepat ini)
  frozenAfterS: 60,        // PLAY tapi currentTime tidak naik selama ini -> Retry
  connectingAfterS: 45,    // CONNECTING selama ini -> Close lalu buka ulang
  errorRetryEveryS: 20,    // kamera ERROR di-Retry tiap sekian detik, TANPA batas percobaan
  maxAttempts: 5,          // (hanya FROZEN/CONNECTING) percobaan sebelum ditandai OFFLINE
  cooldownBaseS: 60,       // jeda antar-percobaan = base * nomor percobaan
  offlineRecheckS: 600,    // kamera OFFLINE dicoba lagi 1x per 10 menit
  healthyResetS: 60,       // PLAY normal selama ini -> reset hitungan percobaan
  noTilesWarnS: 180,       // tidak ada tile sama sekali -> peringatan (mungkin logout)
  memLogEveryMin: 10,      // catat pemakaian memori halaman tiap sekian menit (untuk cek kebocoran 24/7)
  reloadEveryH: 0,         // 0 = mati. Isi mis. 12 untuk reload halaman terjadwal (BELUM teruji: layout grid mungkin hilang)
};
const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry');
const LOGIN = args.has('--login');
const FULL = args.has('--fullscreen'); // layar penuh ala F11 (tanpa tab/address bar)
const STATE = { dry: DRY, cams: {} };   // status terkini tiap kamera, dibaca server laporan

// Selector memakai potongan nama class (akhiran hash Next.js bisa berubah saat Bardi update)
const SEL = {
  tile: '[class*="gridShow_common-grid-item"]',
  name: '[class*="device-name"]',
  err: '[class*="error-show"]',
  retry: '[class*="rtcVideo_retry"]',
  menuItem: '[class*="videoClosed_common-item"]',
  deviceItem: '[class*="deviceItem_box"]',
  roomTitle: '[class*="home_roomTitle"]',
};

function log(level, msg) {
  const line = `${new Date().toISOString()} [${level}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(CFG.logFile, line + '\n'); } catch (_) {}
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// CSS ringan: matikan animasi spinner & transisi di area player saja.
// Sengaja tidak mematikan animasi global, karena pohon daftar kamera (antd) bisa macet kalau animasinya dimatikan.
const LIGHT_CSS = `
.anticon-spin, [class*="anticon-spin"] { animation: none !important; }
[class*="rtcVideo_"], [class*="gridShow_"], [class*="commonTool_"], [class*="videoTool_"] { transition: none !important; animation: none !important; }
`;

// ---------- Catatan kamera bermasalah (CSV, buka di Excel) ----------
const CSV_HEADER = 'waktu,kamera,kejadian,kode_error,percobaan,durasi_detik,hasil,mode\n';
let csvWarned = false;
const errCode = (txt) => ((String(txt || '').match(/(\d+)/) || [])[1]) || '';
function localTime(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function rec(camera, event, code, attempt, secs, result) {
  const esc = (v) => `"${String(v === undefined || v === null ? '' : v).replace(/"/g, '""')}"`;
  const row = [localTime(), camera, event, code, attempt, secs, result, DRY ? 'DRY' : 'LIVE'].map(esc).join(',') + '\n';
  const write = (file) => {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '\ufeff' + CSV_HEADER, 'utf8'); // BOM supaya Excel baca UTF-8
    fs.appendFileSync(file, row, 'utf8');
  };
  try { write(CFG.csvFile); }
  catch (e) {
    // biasanya file sedang terbuka di Excel -> simpan ke file cadangan
    try { write(CFG.csvFile.replace(/\.csv$/, '.cadangan.csv')); } catch (_) {}
    if (!csvWarned) { log('WARN', `Tidak bisa menulis ${path.basename(CFG.csvFile)} (${e.code || e.message}); sementara ke file .cadangan.csv. Tutup file di Excel.`); csvWarned = true; }
  }
}

// Dijalankan di dalam halaman: baca status semua tile yang punya nama kamera.
function readTiles(sel) {
  return [...document.querySelectorAll(sel.tile)]
    .filter((t) => t.querySelector(sel.name))
    .map((t) => {
      const v = t.querySelector('video');
      let state = 'PLAY';
      if (t.querySelector(sel.err)) state = 'ERROR';
      else if (/Connecting video/i.test(t.innerText)) state = 'CONNECTING';
      return {
        name: t.querySelector(sel.name).innerText.trim(),
        state,
        ct: v ? v.currentTime : 0,
        errText: state === 'ERROR' ? (t.querySelector('[class*="error-code"]') || {}).textContent || '' : '',
      };
    });
}

// ---------- Aksi ----------
async function tileByName(page, name) {
  const tiles = page.locator(SEL.tile).filter({ has: page.locator(SEL.name, { hasText: name }) });
  const n = await tiles.count();
  for (let i = 0; i < n; i++) {
    const t = tiles.nth(i);
    const txt = (await t.locator(SEL.name).first().innerText()).trim();
    if (txt === name) return t;   // cocokkan nama PERSIS (Surabaya 2 != Surabaya 3)
  }
  return null;
}

async function doRetry(page, name) {
  const tile = await tileByName(page, name);
  if (!tile) return false;
  const btn = tile.locator(SEL.retry).filter({ hasText: /^Retry$/ }); // bukan "Copy Error Code"
  if (!(await btn.count())) return false;
  await btn.first().click({ timeout: 5000 });
  return true;
}

async function dismissMenu(page) {
  // Escape tidak menutup menu; klik area kosong di bawah grid
  await page.mouse.click(5, 5).catch(() => {});
}

async function doCloseAndReopen(page, name) {
  const tile = await tileByName(page, name);
  if (!tile) return false;
  await tile.click({ button: 'right', timeout: 5000 });
  // PENTING: hanya item bertulis persis "Close", JANGAN "Close All"
  const closeItem = page.locator(SEL.menuItem).filter({ hasText: /^Close$/ });
  if ((await closeItem.count()) !== 1) { await dismissMenu(page); log('WARN', `menu Close tidak unik (${await closeItem.count()}), dibatalkan`); return false; }
  await closeItem.first().click({ timeout: 5000 });
  await sleep(1500);

  // Buka ulang lewat daftar kiri (grup "All Devices"); klik 1x pada nama kamera
  let item = page.locator(SEL.deviceItem).filter({ hasText: name });
  const exact = async () => {
    const n = await item.count();
    for (let i = 0; i < n; i++) {
      if ((await item.nth(i).innerText()).trim() === name) return item.nth(i);
    }
    return null;
  };
  let target = await exact();
  if (!target) {
    // grup mungkin tertutup: buka "All Devices"
    await page.locator(SEL.roomTitle).filter({ hasText: /^All Devices/ }).first().click({ timeout: 5000 }).catch(() => {});
    await sleep(800);
    target = await exact();
  }
  if (!target) { log('WARN', `${name}: tidak ketemu di daftar kiri setelah Close`); return false; }
  await target.scrollIntoViewIfNeeded();
  await target.click({ timeout: 5000 });
  return true;
}

// ---------- Loop utama ----------
async function monitor(page) {
  const cams = new Map(); // name -> state tracking
  // Kamera yang sudah tidak tampil di layar Bardi (ditutup) dihapus dari status, supaya daftar di halaman laporan
  // sama dengan yang tampil. Dihapus setelah 2 pembacaan berturut-turut tidak ada DAN minimal 10 detik
  // (supaya kamera yang sedang dibuka ulang oleh script tidak berkedip hilang).
  const absent = new Map(); // name -> { reads, since }
  const pruneAbsent = (present) => {
    const t = Date.now();
    for (const name of Object.keys(STATE.cams)) {
      if (present.has(name)) { absent.delete(name); continue; }
      const a = absent.get(name) || { reads: 0, since: t };
      a.reads++; absent.set(name, a);
      if (a.reads >= 2 && t - a.since >= 5000) {
        delete STATE.cams[name]; cams.delete(name); absent.delete(name);
        log('INFO', `${name}: tidak tampil lagi di layar Bardi, dihapus dari status`);
      }
    }
  };
  let noTilesSince = null;
  let warnedNoTiles = false;
  let lastView = '';
  let lastReload = Date.now();

  for (;;) {
    let tiles;
    try { tiles = await page.evaluate(readTiles, SEL); }
    catch (e) { log('WARN', `gagal baca halaman: ${e.message}`); await sleep(CFG.pollMs); continue; }
    const now = Date.now();

    if (CFG.reloadEveryH > 0 && Date.now() - lastReload > CFG.reloadEveryH * 3600 * 1000) {
      lastReload = Date.now();
      log('INFO', `Reload terjadwal (tiap ${CFG.reloadEveryH} jam)`);
      try { await page.reload({ waitUntil: 'domcontentloaded' }); } catch (e) { log('WARN', `reload terjadwal gagal: ${e.message}`); }
      await sleep(15000); continue;
    }

    // catat perubahan mode layar penuh & keterlihatan daftar kamera di kiri (untuk uji tombol layar penuh Bardi)
    try {
      const v = await page.evaluate((s) => ({
        fs: !!document.fullscreenElement,
        sidebar: [...document.querySelectorAll(s.deviceItem)].some((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0),
      }), SEL);
      const key = `layarPenuh=${v.fs} daftarKiriTerlihat=${v.sidebar}`;
      if (key !== lastView) { log('VIEW', key); lastView = key; }
    } catch (_) {}

    if (tiles.length === 0) {
      noTilesSince = noTilesSince || now;
      if (!warnedNoTiles && now - noTilesSince > CFG.noTilesWarnS * 1000) {
        log('ALERT', `Tidak ada tile kamera selama ${CFG.noTilesWarnS}s. Kemungkinan sesi logout (QR) atau layout kosong. URL: ${page.url()}`);
        warnedNoTiles = true;
      }
      pruneAbsent(new Set());
      await sleep(CFG.pollMs); continue;
    }
    noTilesSince = null; warnedNoTiles = false;
    pruneAbsent(new Set(tiles.map((t) => t.name)));

    // Tahap 1: perbarui status SEMUA kamera lebih dulu (cepat). Tahap 2: baru jalankan klik/tindakan (lambat),
    // supaya halaman laporan tidak tertunda oleh klik.
    const pending = [];
    for (const t of tiles) {
      const c = cams.get(t.name) || { status: 'INIT', since: now, lastCt: t.ct, attempts: 0, lastAttempt: 0, okSince: now, offline: false, problemSince: null };
      cams.set(t.name, c);

      let eff = t.state;
      if (t.state === 'PLAY') {
        // pembacaan pertama (INIT) belum ada pembanding, jadi anggap PLAY
        eff = (c.status !== 'INIT' && t.ct <= c.lastCt + 0.01) ? 'FROZEN' : 'PLAY';
        c.lastCt = t.ct;
      } else c.lastCt = t.ct;

      if (eff !== c.status) {
        log('STATE', `${t.name}: ${c.status} -> ${eff}${t.errText ? ' (' + t.errText + ')' : ''}`);
        const prev = c.status;
        c.status = eff; c.since = now;
        if (eff === 'PLAY') c.okSince = now;
        if (eff !== 'PLAY' && !c.problemSince) c.problemSince = now;
        const secsBad = Math.round((now - (c.problemSince || now)) / 1000);
        if (eff === 'ERROR') rec(t.name, 'ERROR', errCode(t.errText), c.attempts, secsBad, t.errText);
        if (eff === 'PLAY') {
          if (prev === 'ERROR' || prev === 'FROZEN' || c.attempts > 0) rec(t.name, 'PULIH', '', c.attempts, secsBad, 'tersambung kembali');
          c.problemSince = null;
        }
      }
      const inState = (now - c.since) / 1000;
      STATE.cams[t.name] = {
        name: t.name, status: c.status, since: c.since, attempts: c.attempts, offline: c.offline, seen: now,
        code: eff === 'ERROR' ? errCode(t.errText) : ((STATE.cams[t.name] || {}).code || ''),
      };

      if (eff === 'PLAY') {
        if ((now - c.okSince) / 1000 > CFG.healthyResetS && (c.attempts || c.offline)) {
          if (c.offline) log('INFO', `${t.name}: pulih, status OFFLINE dicabut`);
          c.attempts = 0; c.offline = false;
        }
        continue;
      }
      pending.push({ t, c, eff, inState });
    }

    for (const { t, c, eff, inState } of pending) {
      // butuh tindakan?
      let action = null;
      if (eff === 'ERROR') action = 'retry';
      else if (eff === 'FROZEN' && inState >= CFG.frozenAfterS) action = 'reopen'; // tile beku tidak punya tombol Retry
      else if (eff === 'CONNECTING' && inState >= CFG.connectingAfterS) action = 'reopen';
      if (!action) continue;

      // batas percobaan & jeda
      const sinceLast = (now - c.lastAttempt) / 1000;
      if (eff === 'ERROR') {
        // ERROR ("Failed to connect", kode apa pun): Retry terus, tanpa batas percobaan
        if (sinceLast < CFG.errorRetryEveryS) continue;
        if (c.attempts > 0 && c.attempts % 20 === 0) log('WARN', `${t.name}: masih ERROR setelah ${c.attempts} kali Retry (tetap dicoba terus)`);
      } else if (c.offline) {
        if (sinceLast < CFG.offlineRecheckS) continue;
      } else {
        if (c.attempts >= CFG.maxAttempts) {
          c.offline = true;
          log('OFFLINE', `${t.name}: ${CFG.maxAttempts} percobaan gagal, ditandai OFFLINE (cek ulang tiap ${CFG.offlineRecheckS / 60} menit)`);
          rec(t.name, 'OFFLINE', '', c.attempts, Math.round((now - (c.problemSince || now)) / 1000), `ditandai OFFLINE, cek ulang tiap ${CFG.offlineRecheckS / 60} menit`);
          c.lastAttempt = now; continue;
        }
        if (sinceLast < CFG.cooldownBaseS * Math.max(1, c.attempts)) continue;
      }

      c.attempts += 1; c.lastAttempt = now;
      log('ACT', `${t.name}: ${action} (percobaan ${c.attempts}, state ${eff} ${Math.round(inState)}s)${DRY ? ' [DRY-RUN, tidak diklik]' : ''}`);
      const code = eff === 'ERROR' ? errCode(t.errText) : '';
      if (DRY) { rec(t.name, action.toUpperCase(), code, c.attempts, Math.round(inState), 'dry-run (tidak diklik)'); continue; }
      try {
        const ok = action === 'retry' ? await doRetry(page, t.name) : await doCloseAndReopen(page, t.name);
        log(ok ? 'INFO' : 'WARN', `${t.name}: ${action} ${ok ? 'dikirim' : 'GAGAL (elemen tidak ketemu)'}`);
        rec(t.name, action.toUpperCase(), code, c.attempts, Math.round(inState), ok ? 'klik terkirim' : 'GAGAL: elemen tidak ketemu');
        c.status = 'ACTED'; c.since = Date.now();
      } catch (e) {
        log('WARN', `${t.name}: ${action} error: ${e.message}`);
        rec(t.name, action.toUpperCase(), code, c.attempts, Math.round(inState), 'GAGAL: ' + String(e.message).split('\n')[0].slice(0, 100));
        await dismissMenu(page);
      }
      await sleep(1500); // jeda antar-tindakan supaya UI tidak kewalahan
    }
    await sleep(CFG.pollMs);
  }
}

(async () => {
  const ctx = await chromium.launchPersistentContext(CFG.profileDir, {
    headless: false,
    viewport: null, // halaman mengikuti ukuran jendela (bukan ukuran tetap)
    args: [FULL ? '--start-fullscreen' : '--start-maximized'],
    permissions: [],
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(CFG.url, { waitUntil: 'domcontentloaded' });

  if (LOGIN) {
    log('INFO', 'Mode login: scan QR di jendela browser, pastikan halaman kamera tampil, lalu TUTUP jendela browser.');
    await new Promise((res) => ctx.on('close', res));
    log('INFO', 'Profil tersimpan. Jalankan lagi tanpa --login.');
    return;
  }
  await ctx.addInitScript((css) => {
    const add = () => { const st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st); };
    if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add);
  }, LIGHT_CSS);
  await page.addStyleTag({ content: LIGHT_CSS }).catch(() => {});

  // pulihkan otomatis kalau tab crash
  page.on('crash', async () => {
    log('ALERT', 'Halaman crash. Mencoba reload...');
    try { await page.reload({ waitUntil: 'domcontentloaded' }); } catch (e) { log('WARN', `reload setelah crash gagal: ${e.message}`); }
  });

  // catat memori halaman berkala (untuk melihat kebocoran saat jalan 24/7)
  (async () => {
    let cdp;
    try { cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable'); } catch (e) { log('WARN', `pencatat memori tidak aktif: ${e.message}`); return; }
    for (;;) {
      await sleep(CFG.memLogEveryMin * 60 * 1000);
      try {
        const { metrics } = await cdp.send('Performance.getMetrics');
        const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
        const vids = await page.evaluate(() => document.querySelectorAll('video').length);
        log('MEM', `JS heap ${Math.round(m.JSHeapUsedSize / 1048576)} MB, DOM nodes ${m.Nodes}, elemen video ${vids}`);
      } catch (_) {}
    }
  })();

  // Mulai ulang setelah pembaruan dari GitHub (tombol "Perbarui" di halaman laporan):
  // jalankan program baru dengan jeda ~10 dtk (menunggu browser & port lama benar-benar tutup), lalu tutup yang lama.
  const relaunch = () => {
    const { spawn } = require('child_process');
    let p;
    if (process.platform === 'win32') {
      const vbs = path.join(__dirname, 'START.vbs');
      const cmd = fs.existsSync(vbs)
        ? `/c ping -n 11 127.0.0.1 >nul & wscript.exe "${vbs}"`
        : `/c ping -n 11 127.0.0.1 >nul & "${process.execPath}" monitor.js ${process.argv.slice(2).join(' ')}`;
      p = spawn('cmd.exe', [cmd], { cwd: __dirname, detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true });
    } else {
      p = spawn('/bin/sh', ['-c', 'sleep 10; exec "$@" >> start.log 2>&1', 'sh', process.execPath, 'monitor.js', ...process.argv.slice(2)], { cwd: __dirname, detached: true, stdio: 'ignore' });
    }
    p.unref();
  };
  const restart = async () => {
    log('INFO', 'Memulai ulang setelah pembaruan...');
    try { relaunch(); } catch (e) { log('WARN', `Gagal menjadwalkan mulai ulang: ${e.message}. Buka Bardi Monitor manual.`); }
    try { await Promise.race([ctx.close(), sleep(5000)]); } catch (_) {}
    process.exit(0);
  };
  startReportServer({ dir: __dirname, csvFile: CFG.csvFile, floorsFile: CFG.floorsFile, getState: () => STATE, log, restart });
  log('INFO', `Monitor jalan${DRY ? ' (DRY-RUN)' : ''}. Pastikan grid kamera yang mau dipantau sudah tampil di halaman.`);
  ctx.on('close', () => { log('INFO', 'Browser ditutup, monitor berhenti.'); process.exit(0); });
  await monitor(page);
})().catch((e) => { log('FATAL', e.stack || e.message); process.exit(1); });
