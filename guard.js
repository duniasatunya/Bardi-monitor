// Pengawas Bardi Monitor (mode kios 24/7).
// - Menjalankan monitor.js dan membukanya lagi otomatis kalau tertutup/mati (mis. Alt+F4).
// - Berhenti HANYA kalau ada file "berhenti.flag" (dibuat tombol "Hentikan pemantauan" di halaman laporan, yang dilindungi password).
// - Hanya satu pengawas yang boleh jalan sekaligus (klik shortcut dua kali tidak membuat dobel).
'use strict';
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const FLAG = path.join(DIR, 'berhenti.flag');
const LOGF = path.join(DIR, 'guard.log');
const LOCK_PORT = parseInt(process.env.BM_GUARD_PORT || '47831', 10);
const MONITOR = process.env.BM_MONITOR_FILE || path.join(DIR, 'monitor.js');
const MON_ARGS = process.env.BM_MONITOR_ARGS ? process.env.BM_MONITOR_ARGS.split(' ') : ['--fullscreen', '--kiosk'];
const RESTART_DELAY = parseInt(process.env.BM_RESTART_MS || '3000', 10);
const QUICK_MS = parseInt(process.env.BM_QUICK_MS || '20000', 10);
const SLOW_DELAY = parseInt(process.env.BM_SLOW_MS || '30000', 10);

const log = (m) => { try { fs.appendFileSync(LOGF, `${new Date().toISOString()} ${m}\n`); } catch (_) {} };

// Kunci satu-instans: port lokal. Kalau sudah dipakai, berarti pengawas lain sudah jalan.
const lock = net.createServer();
lock.on('error', (e) => { if (e.code === 'EADDRINUSE') { log('Pengawas lain sudah berjalan, keluar.'); process.exit(0); } log('lock error ' + e.message); process.exit(1); });
lock.listen(LOCK_PORT, '127.0.0.1', () => start());

let child = null;
let quick = 0;

function start() {
  // Dijalankan oleh pengguna (shortcut / nyala PC): hapus penanda berhenti lama.
  try { fs.unlinkSync(FLAG); } catch (_) {}
  log('Pengawas mulai.');
  loop();
}

function loop() {
  if (fs.existsSync(FLAG)) { log('berhenti.flag ada, pengawas berhenti.'); process.exit(0); }
  const t0 = Date.now();
  child = spawn(process.execPath, [MONITOR, ...MON_ARGS], { cwd: DIR, stdio: 'ignore', windowsHide: true, env: { ...process.env, BM_GUARD: '1' } });
  log(`monitor jalan (pid ${child.pid})`);
  const done = (why) => {
    if (!child) return; child = null;
    const ran = Date.now() - t0;
    if (fs.existsSync(FLAG)) { log(`monitor berhenti (${why}); berhenti.flag ada, pengawas berhenti.`); process.exit(0); }
    quick = ran < QUICK_MS ? quick + 1 : 0;
    const wait = quick >= 3 ? SLOW_DELAY : RESTART_DELAY; // jangan berputar cepat kalau terus gagal
    log(`monitor berhenti (${why}) setelah ${Math.round(ran / 1000)} dtk; dibuka lagi dalam ${Math.round(wait / 1000)} dtk.`);
    setTimeout(loop, wait);
  };
  child.on('exit', (code, sig) => done(`exit ${code ?? sig}`));
  child.on('error', (e) => done('error ' + e.message));
}

const bye = () => { try { if (child) child.kill(); } catch (_) {} process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
