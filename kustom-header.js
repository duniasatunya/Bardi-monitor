// Tampilan kustom untuk halaman web IPC Bardi (header: logo dan tulisan). Mirip kolom CSS di vMix.
// Dibaca monitor.js saat mulai. Ubah file ini atau kustom.css lalu jalankan ulang program.
// Hanya mengubah TAMPILAN di browser; tidak mengklik apa pun dan tidak menyentuh data.
'use strict';
const fs = require('fs');
const path = require('path');

const PENGATURAN = {
  aktif: true,
  judul: 'Pondok Pesantren Daarul Rahman Jakarta',  // pengganti tulisan "BARDI Smart home"
  cari: 'bardi\\s*smart\\s*home',                    // tulisan yang dicari (tidak peduli besar/kecil huruf)
  logoFile: 'assets/pondok-logo.png',                // pengganti logo Bardi di header
  areaAtasPx: 220,                                   // hanya bagian atas halaman yang diperiksa
};

function build(dir) {
  let css = '.kustom-logo::before,.kustom-logo::after{display:none!important}\n';
  try { css += fs.readFileSync(path.join(dir, 'kustom.css'), 'utf8'); } catch (_) {}
  if (!PENGATURAN.aktif) return { css, init: null };
  let logo = '';
  try { logo = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, PENGATURAN.logoFile)).toString('base64'); } catch (_) {}
  // Fungsi ini dijalankan DI DALAM halaman Bardi (tidak boleh memakai variabel dari luar).
  const init = (cfg) => {
    const re = new RegExp('^\\s*' + cfg.cari + '\\s*$', 'i');
    let said = 0;
    const note = (m) => { if (said < 6) { said++; try { console.info('[kustom] ' + m); } catch (e) {} } };
    function top(el) { try { const r = el.getBoundingClientRect(); return r.top < cfg.areaAtasPx && r.height > 0; } catch (e) { return false; } }
    function run() {
      if (!document.body) return;
      // 1) tulisan
      const all = document.body.querySelectorAll('*'); let titleEl = null;
      for (let i = 0; i < all.length; i++) {
        const el = all[i]; if (!el.children || el.dataset.kustomT) continue;
        const t = (el.textContent || '').trim(); if (t.length > 60 || !t) continue;
        const own = re.test(t);
        if (!own) continue;
        let childHas = false; for (let k = 0; k < el.children.length; k++) { if (re.test((el.children[k].textContent || '').trim())) childHas = true; }
        if (childHas || !top(el)) continue;
        el.textContent = cfg.judul; el.dataset.kustomT = '1'; titleEl = el; note('tulisan diganti pada <' + el.tagName.toLowerCase() + ' class="' + String(el.className).slice(0, 80) + '">');
      }
      // 2) logo: hanya yang berada di baris yang sama, di sebelah kiri tulisan judul (gambar lain di halaman tidak disentuh)
      if (!cfg.logo || !titleEl) return;
      const tr = titleEl.getBoundingClientRect(); if (!tr.height) return;
      const cy = tr.top + tr.height / 2;
      function sameRow(el) { const r = el.getBoundingClientRect(); return r.width >= 16 && r.width <= 260 && r.height >= 16 && r.height <= 160 && r.right <= tr.left + 8 && r.top < cy && r.bottom > cy; }
      function swap(el) {
        if (el.dataset.kustomL) return true;
        const tag = el.tagName.toLowerCase();
        if (tag === 'img') { el.dataset.kustomL = '1'; el.removeAttribute('srcset'); el.src = cfg.logo; el.style.objectFit = 'contain'; note('logo (img) diganti: ' + String(el.className).slice(0, 80)); return true; }
        const sv = el.closest ? el.closest('svg') : null;
        if (sv) { if (sv.dataset.kustomL) return true; const r = sv.getBoundingClientRect(); const ni = document.createElement('img'); ni.src = cfg.logo; ni.dataset.kustomL = '1'; ni.style.cssText = 'width:' + r.width + 'px;height:' + r.height + 'px;object-fit:contain'; sv.dataset.kustomL = '1'; sv.style.display = 'none'; sv.parentNode.insertBefore(ni, sv); note('logo (svg) diganti'); return true; }
        const inner = el.querySelector && el.querySelector('img'); if (inner && inner !== el) return swap(inner);
        el.dataset.kustomL = '1'; el.classList.add('kustom-logo');
        el.style.setProperty('background', 'url("' + cfg.logo + '") center / contain no-repeat', 'important'); note('logo (latar) diganti: <' + tag + ' class="' + String(el.className).slice(0, 80) + '">'); return true;
      }
      let done = false;
      const near = (titleEl.parentElement && titleEl.parentElement.parentElement && titleEl.parentElement.parentElement.parentElement) || document.body;
      const cand = near.querySelectorAll('img,svg,div,span,i,a');
      for (let i = 0; i < cand.length && !done; i++) {
        const el = cand[i]; if (el === titleEl || el.contains(titleEl) || titleEl.contains(el)) continue;
        if (el.closest && el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
        if (!sameRow(el)) continue;
        const cs = getComputedStyle(el); const isImg = el.tagName === 'IMG' || el.tagName.toLowerCase() === 'svg';
        if (isImg || (cs.backgroundImage && cs.backgroundImage.indexOf('url(') >= 0) || el.querySelector('img,svg')) done = swap(el);
      }
      if (!done) { // cadangan: elemen tepat di kiri tulisan (mis. logo dari ::before)
        const e0 = document.elementFromPoint(Math.max(0, tr.left - 14), cy);
        if (e0 && e0 !== document.body && e0 !== document.documentElement && !e0.contains(titleEl) && sameRow(e0)) swap(e0);
        else note('logo tidak ditemukan di sebelah tulisan. Elemen di titik itu: ' + (e0 ? e0.tagName + ' ' + String(e0.className).slice(0, 80) : '-'));
      }
    }
    let timer = null;
    const sched = () => { if (timer) return; timer = setTimeout(() => { timer = null; try { run(); } catch (e) {} }, 400); };
    const start = () => { try { run(); new MutationObserver(sched).observe(document.body, { childList: true, subtree: true }); } catch (e) {} };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  };
  return { css, init, arg: { cari: PENGATURAN.cari, judul: PENGATURAN.judul, logo, areaAtasPx: PENGATURAN.areaAtasPx } };
}

module.exports = { build, PENGATURAN };
