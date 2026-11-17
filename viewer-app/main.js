// Bardi Viewer: jendela khusus untuk membuka server Bardi Monitor (lewat Tailscale). Program di PC program tidak berubah.
'use strict';
const { app, BrowserWindow, Menu, ipcMain, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');

// Pemutar video langsung (WebCodecs) dan putar otomatis tanpa klik.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;
const cfgFile = () => path.join(app.getPath('userData'), 'viewer.json');
function loadCfg() { try { return JSON.parse(fs.readFileSync(cfgFile(), 'utf8')) || {}; } catch (_) { return {}; } }
function saveCfg(c) { try { fs.mkdirSync(path.dirname(cfgFile()), { recursive: true }); fs.writeFileSync(cfgFile(), JSON.stringify(c)); } catch (_) {} }

// "100.96.132.96:3000" atau "http://100.96.132.96:3000/apa-saja" -> "http://100.96.132.96:3000"
function normAddr(s) {
  let t = String(s || '').trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) t = 'http://' + t;
  try { const u = new URL(t); if (!u.hostname) return null; return u.protocol + '//' + u.host; } catch (_) { return null; }
}

function showSetup() { if (win) win.loadFile(path.join(__dirname, 'setup.html'), { query: { addr: loadCfg().addr || '' } }); }
function openServer() {
  const addr = loadCfg().addr;
  if (!addr) return showSetup();
  win.loadURL(addr + '/displaycostum.html');
}

function createWindow() {
  const c = loadCfg();
  const b = c.bounds || { width: 1400, height: 850 };
  win = new BrowserWindow({
    width: b.width, height: b.height, x: b.x, y: b.y, backgroundColor: '#0b0d10', title: 'Bardi Viewer', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, partition: 'persist:bardi' }
  });
  if (c.max) win.maximize();
  // Identitas aplikasi: halaman multi-view memakai ini untuk memilih pemutar langsung.
  win.webContents.setUserAgent(win.webContents.getUserAgent() + ' BardiViewer/' + app.getVersion());
  const keep = () => { if (!win || win.isDestroyed()) return; const cc = loadCfg(); cc.max = win.isMaximized(); if (!win.isMaximized() && !win.isFullScreen()) cc.bounds = win.getBounds(); saveCfg(cc); };
  win.on('close', keep);
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMain) => {
    if (!isMain || code === -3) return; // -3 = dibatalkan (pindah halaman)
    if (/^file:/i.test(url)) return;
    win.loadFile(path.join(__dirname, 'offline.html'), { query: { addr: loadCfg().addr || '', why: desc || '' } });
  });
  win.webContents.on('render-process-gone', () => { setTimeout(() => { if (win && !win.isDestroyed()) openServer(); }, 1500); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Aplikasi', submenu: [
      { label: 'Ganti alamat server', accelerator: 'CmdOrCtrl+Shift+S', click: showSetup },
      { label: 'Muat ulang', accelerator: 'F5', click: () => { if (/^file:/i.test(win.webContents.getURL())) openServer(); else win.webContents.reload(); } },
      { label: 'Layar penuh', accelerator: 'F11', click: () => win.setFullScreen(!win.isFullScreen()) },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' }, { role: 'quit', label: 'Keluar' }
    ] }
  ]));
  openServer();
}

ipcMain.handle('bv:get', () => ({ addr: loadCfg().addr || '' }));
ipcMain.handle('bv:save', (_e, raw) => { const a = normAddr(raw); if (!a) return { ok: false, error: 'Alamat tidak valid. Contoh: 100.96.132.96:3000' }; const c = loadCfg(); c.addr = a; saveCfg(c); setTimeout(openServer, 0); return { ok: true, addr: a }; });
ipcMain.handle('bv:change', () => { showSetup(); return true; });
ipcMain.handle('bv:retry', () => { openServer(); return true; });

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  createWindow();
  // Komputer bangun dari tidur: muat ulang supaya video menyambung lagi.
  powerMonitor.on('resume', () => { setTimeout(() => { if (win && !win.isDestroyed() && !/^file:/i.test(win.webContents.getURL())) win.webContents.reload(); }, 4000); });
});
app.on('window-all-closed', () => app.quit());
