// Halaman "Multiview": daftar kamera melayang, kotak video 16:9, toolbar per kamera (mengikuti tata letak IPC Bardi).
// Stream tiap kamera dibuat sekali dan dipakai terus: pindah grid / layar penuh hanya menata ulang, tidak memuat ulang.
// Catatan: isi halaman ada di dalam template literal; jangan pakai backtick atau ${ } atau backslash di skrip browser.
'use strict';
module.exports = (BASE_CSS) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Multiview - Bardi Monitor</title><style>${BASE_CSS}
html,body{margin:0;height:100%}
body{background:#eef0f4;color:#222;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
#app{display:flex;flex-direction:row;height:100vh;padding:10px;box-sizing:border-box;position:relative}
#main{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}
#sp{flex:none;width:12px;cursor:col-resize;position:relative;touch-action:none}
#sp:after{content:'';position:absolute;left:5px;top:42%;height:16%;width:3px;background:#c3c8d0;border-radius:2px}
#sp:hover:after{background:#f26a1b}
#wrap{flex:1;min-height:0;background:#1b1d22;border-radius:6px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
#wrap:fullscreen{border-radius:0}
#g{display:grid;gap:2px;position:relative;background:#8a8d93}
.t{position:relative;background:#4b5262;overflow:hidden;min-width:0;min-height:0;cursor:pointer;user-select:none}
.t video{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;display:block;background:#000}
.t.hole{background:#4b5262}
.t.sel:after{content:'';position:absolute;left:0;right:0;top:0;bottom:0;border:2px solid #2b7bff;pointer-events:none;z-index:7}
.pill{position:absolute;right:8px;top:8px;max-width:75%;padding:2px 10px;border-radius:14px;background:rgba(40,40,40,.6);color:#fff;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;z-index:2}
.st{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;color:#e5e7eb;font-size:13px;text-align:center;padding:8px;pointer-events:none;z-index:1}
.st.bad{color:#ffb4ae}
.tb{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);display:none;gap:2px;align-items:center;background:rgba(30,30,30,.78);border-radius:20px;padding:3px 8px;z-index:6;white-space:nowrap}
.t:hover .tb{display:flex}
.tb button{width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:#fff;cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;font:inherit;font-size:11px;font-weight:700}
.tb button:hover{background:rgba(255,255,255,.18)}
.tb button.on{color:#6fb0ff}
.tb button.q{width:auto;min-width:30px;border-radius:5px;border:1.5px solid #fff;padding:0 5px;height:20px;margin:0 3px}
.t:fullscreen .tb button{width:36px;height:36px}.t:fullscreen .tb button.q{height:26px}
#g.all .xb{display:none}
.t.tiny:not(:fullscreen) .tb,.t.tiny:not(:fullscreen) .ptz{display:none!important}
.ptz{position:absolute;left:var(--px,50%);top:var(--py,62%);transform:translate(-50%,-50%);height:44%;display:none;align-items:center;gap:14px;z-index:5}
.t.pz .ptz{display:flex}
.grip{position:absolute;left:50%;top:-14px;transform:translateX(-50%);width:54px;height:14px;border-radius:8px 8px 0 0;background:rgba(32,32,32,.72);cursor:move;touch-action:none}
.grip:after{content:'';position:absolute;left:14px;right:14px;top:5px;height:3px;border-top:1px solid #aaa;border-bottom:1px solid #aaa}
.pad{height:100%;max-height:170px;aspect-ratio:1;border-radius:50%;background:rgba(32,32,32,.72);position:relative}
.pad i{position:absolute;width:30%;height:30%;cursor:pointer;display:flex;align-items:center;justify-content:center}
.pad i:after{content:'';border-style:solid;border-color:transparent}
.pad .u{top:6%;left:35%}.pad .u:after{border-width:0 7px 11px 7px;border-bottom-color:#fff}
.pad .d{bottom:6%;left:35%}.pad .d:after{border-width:11px 7px 0 7px;border-top-color:#fff}
.pad .l{left:6%;top:35%}.pad .l:after{border-width:7px 11px 7px 0;border-right-color:#fff}
.pad .r{right:6%;top:35%}.pad .r:after{border-width:7px 0 7px 11px;border-left-color:#fff}
.pad b{position:absolute;left:33%;top:33%;width:34%;height:34%;border-radius:50%;background:rgba(95,95,95,.9);cursor:move;touch-action:none}
.zm{height:26%;max-height:56px;aspect-ratio:2.6;border-radius:99px;background:rgba(32,32,32,.72);display:flex;align-items:center;justify-content:space-around}
.zm button{height:62%;aspect-ratio:1;border-radius:50%;border:2px solid rgba(255,255,255,.55);background:transparent;color:#fff;font-size:15px;line-height:1;padding:0;cursor:pointer}
.pcl{width:22px;height:22px;border-radius:50%;background:rgba(32,32,32,.72);color:#fff;border:0;cursor:pointer;align-self:flex-start;padding:0;font-size:14px}
.toast{position:absolute;left:10px;right:10px;top:36px;background:rgba(170,40,40,.92);color:#fff;font-size:12px;padding:4px 8px;border-radius:8px;z-index:8;text-align:center}
#tool{height:54px;flex:none;background:#fff;border-radius:14px;display:flex;align-items:center;padding:0 12px;gap:10px;position:relative}
#live{width:40px;height:40px;border-radius:50%;background:#f26a1b;color:#fff;font-weight:700;font-size:10px;border:0;display:flex;align-items:center;justify-content:center}
#hint{flex:1;color:#777;font-size:13px;padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ib{width:38px;height:38px;border-radius:10px;border:0;background:transparent;cursor:pointer;color:#444;display:flex;align-items:center;justify-content:center}
.ib:hover{background:#f1f2f4}
#pop{position:absolute;right:56px;bottom:62px;background:#fff;border-radius:12px;box-shadow:0 4px 22px rgba(0,0,0,.28);padding:14px 16px;display:none;z-index:40}
#pop .gr{display:grid;grid-template-columns:repeat(4,70px);gap:12px 12px}
.lo{text-align:center;font-size:13px;color:#888;cursor:pointer}
.lo .ic{display:grid;width:60px;height:38px;margin:0 auto 4px;border:1px solid #9aa0a6;gap:0;background:#fff}
.lo .ic div{border:1px solid #9aa0a6;box-sizing:border-box}
.lo.on{color:#f26a1b}.lo.on .ic,.lo.on .ic div{border-color:#f26a1b}
#pop label{display:flex;gap:8px;align-items:center;margin-top:12px;font-size:12px;color:#555;border-top:1px solid #eee;padding-top:10px;max-width:290px}
#empty{display:none!important}
#lw{flex:none;width:300px;background:#fff;border-radius:12px;display:flex;flex-direction:column;overflow:hidden}
#lh{display:flex;align-items:center;padding:12px 14px;background:#f6f7f9;border-bottom:1px solid #e6e8ec;user-select:none}
#lh b{flex:1;font-size:16px;color:#e8590c}
#list{flex:1;overflow-y:auto;padding:6px 8px 10px}
.li{display:flex;align-items:center;gap:12px;padding:11px 10px;border-radius:8px;cursor:pointer;font-size:16px;color:#2b2f36}
.li:hover{background:#f3f4f6}.li.sel{background:#e7f0ff}
.li span.n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dot{width:18px;height:18px;border-radius:50%;border:2px solid #bbb;box-sizing:border-box;position:relative;flex:none}
.dot:after{content:'';position:absolute;left:3px;top:3px;width:8px;height:8px;border-radius:50%;background:#bbb}
.dot.on{border-color:#35c24a}.dot.on:after{background:#35c24a}
.dot.bad{border-color:#e5484d}.dot.bad:after{background:#e5484d}
#lf{padding:8px 14px;font-size:12px;color:#777;border-top:1px solid #eee;display:flex;gap:10px}
#lf a{color:#555}

/* ---- tampilan HP (potret): mengikuti referensi, hanya CSS + elemen tambahan; desktop tidak berubah ---- */
#main{position:relative}
#phh,#phChip,#phb,#phScrim,#phMenu,#phFsX{display:none}
@media all{
  body{background:#000;color:#fff}
  #app{flex-direction:column;height:100vh;height:100dvh;padding:0;background:#000}
  #main{gap:0;flex:1;min-height:0}
  #sp,#tool{display:none!important}
  #phh{display:flex;align-items:center;justify-content:space-between;padding:calc(10px + env(safe-area-inset-top)) 16px 6px;flex:none}
  #phT{display:flex;align-items:center;gap:8px;min-height:48px;padding:0 4px;border:0;background:none;color:#fff;font-family:inherit;font-weight:700;font-size:22px;line-height:1.1;cursor:pointer}
  #phT svg{width:18px;height:18px}
  #phR{display:flex;align-items:center;height:48px;border-radius:999px;background:#1a1b1e;border:1px solid #2a2c31}
  #phR>*{width:56px;height:48px;display:flex;align-items:center;justify-content:center;border:0;background:none;color:#fff;cursor:pointer;text-decoration:none;padding:0}
  #phR b{width:1px;height:20px;background:#3a3d44}
  #phR svg{width:22px;height:22px}
  #phChip{display:flex;align-items:center;gap:8px;align-self:flex-start;margin:6px 16px;max-width:calc(100% - 32px);min-height:36px;padding:0 14px;border-radius:999px;background:#1a1b1e;color:#e8eaed;font-size:15px;flex:none}
  #phChip i{width:10px;height:10px;border-radius:50%;background:#7a828c;flex:none}
  #phChip i.on{background:#2fbf71}#phChip i.bad{background:#e5484d}
  #phChip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #wrap{flex:1;min-height:0;border-radius:0;background:#000;align-items:flex-end;padding-bottom:8px;box-sizing:border-box}
  #g{background:#2a2d33}
  .t{background:#15171b}.t.hole{background:#15171b}
  .t.hole:after{content:'+';position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:#5b6068;font-size:26px;font-weight:300}
  .t.sel:after{border-color:#2b7bff}
  .t.hole.sel:after{content:'+';border:2px solid #2b7bff;inset:0;transform:none;top:0;display:flex;align-items:center;justify-content:center}
  .pill{left:4px;right:auto;top:4px;font-size:10px;padding:1px 7px;max-width:92%}
  .st{font-size:10px;padding-top:24px;line-height:1.25}
  .ptz{display:none!important}
  .t:not(:fullscreen) .tb{display:none!important}
  .t:fullscreen .tb{display:flex}
  .t.tfx{position:fixed!important;left:0!important;top:0!important;right:0!important;bottom:0!important;width:100%!important;height:100%!important;margin:0!important;z-index:90;transform:none!important}
  .t.tfx .tb{display:flex!important}.t.tfx .tb button{width:40px;height:40px}.t.tfx .tb button.q{height:28px}.t.tfx .xb{display:flex!important}
  .t.tfx video{object-fit:contain}
  #phb{display:block;flex:none;padding:0 0 0}
  #phPadW{position:relative;display:flex;justify-content:center;padding:10px 0 14px}
  #phPad{position:relative;width:176px;height:176px;border-radius:50%;background:#0c0d0f;border:1px solid #1d1f24;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
  #phPad i{position:absolute;width:6px;height:6px;border-radius:50%;background:#4a56ff}
  #phPad .a1{top:12px;left:calc(50% - 3px)}#phPad .a2{bottom:12px;left:calc(50% - 3px)}#phPad .a3{left:12px;top:calc(50% - 3px)}#phPad .a4{right:12px;top:calc(50% - 3px)}
  #phKn{position:absolute;left:calc(50% - var(--kn,60px)/2);top:calc(50% - var(--kn,60px)/2);width:var(--kn,60px);height:var(--kn,60px);border-radius:50%;background:#15171b;border:1px solid #2a2d33;pointer-events:none;transition:transform .12s}
  #phPad.on #phKn{transition:none;background:#1e2228}
  #phPad.dis{opacity:.35}
  #phZm{position:absolute;right:20px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px}
  #phZm button{width:48px;height:48px;border-radius:50%;border:1px solid #2a2d33;background:#15171b;color:#fff;font-size:22px;line-height:1;padding:0;touch-action:none;user-select:none;-webkit-user-select:none}
  #phZm.dis{opacity:.35}
  #phRow{display:flex;align-items:center;gap:12px;padding:0 14px 12px}
  #phSeg{flex:1;display:flex;height:56px;border-radius:999px;background:#1a1b1e;padding:4px;gap:2px}
  #phSeg button{flex:1;border:0;border-radius:999px;background:none;color:#e8eaed;font-family:inherit;font-weight:500;font-size:16px;line-height:1;cursor:pointer}
  #phSeg button.on{background:#2a2d33;color:#4aa3ff}
  #phFs{width:56px;height:56px;border-radius:50%;border:0;background:#1a1b1e;color:#fff;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer}
  #phFs svg{width:24px;height:24px}
  #phAct{display:flex;background:#16171a;padding:8px 4px calc(8px + env(safe-area-inset-bottom))}
  #phAct button{flex:1;min-height:56px;border:0;background:none;color:#e8eaed;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:11px;cursor:pointer;padding:0}
  #phAct button svg{width:26px;height:26px}
  #phAct button b{font-size:15px;font-weight:700;height:26px;line-height:26px}
  #phAct button.on{color:#4aa3ff}
  #phb.nosel #phAct .need{opacity:.35}
  #phScrim{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:60}
  #lw,#pop{max-width:560px;margin:0 auto}
  #phRow,#phPadW{max-width:640px;margin-left:auto;margin-right:auto;width:100%;box-sizing:border-box}
  #lw{position:fixed;left:0;right:0;bottom:0;top:auto;width:auto!important;max-height:72vh;max-height:72dvh;display:flex!important;border-radius:20px 20px 0 0;background:#1a1b1e;color:#e8eaed;z-index:70;transform:translateY(105%);transition:transform .25s ease;padding-bottom:env(safe-area-inset-bottom)}
  #lw.open{transform:none}
  #lh{background:#1a1b1e;border-bottom:1px solid #2a2d33;padding:16px}
  #lh b{color:#fff;font-size:18px}
  .li{color:#e8eaed;min-height:52px}.li:hover{background:#22252a}.li.sel{background:#1d3558}
  #lf{border-top:1px solid #2a2d33;color:#9aa0a6}#lf a{color:#9aa0a6}
  #pop{position:fixed;left:0;right:0;bottom:0;top:auto;border-radius:20px 20px 0 0;background:#1a1b1e;color:#e8eaed;z-index:70;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:none}
  #pop .gr{grid-template-columns:repeat(4,1fr)}
  .lo{color:#9aa0a6}.lo .ic{background:#1a1b1e;border-color:#6b7280}.lo .ic div{border-color:#6b7280}
  .lo.on{color:#4aa3ff}.lo.on .ic,.lo.on .ic div{border-color:#4aa3ff}
  #pop label{color:#c4c9d0;border-top-color:#2a2d33;max-width:none}
  #phMenu{display:none;position:fixed;right:16px;top:calc(70px + env(safe-area-inset-top));min-width:220px;background:#1a1b1e;border:1px solid #2a2d33;border-radius:16px;padding:6px;z-index:70}
  #phMenu.open{display:block}
  #phMenu a{display:flex;align-items:center;min-height:48px;padding:0 14px;color:#e8eaed;text-decoration:none;border-radius:10px;font-size:16px}
  #phMenu a:active{background:#22252a}
  #phFsX{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top));width:44px;height:44px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;z-index:9;align-items:center;justify-content:center;padding:0}
  .fsx #phFsX,#wrap:fullscreen #phFsX{display:flex}
  .fsx #wrap{position:fixed;left:0;top:0;right:0;bottom:0;z-index:90;align-items:center;padding:0}
  #wrap:fullscreen{align-items:center;padding:0}
}
@media (min-width:900px) and (min-height:521px){
  #phb{position:relative}
  #phPadW{position:absolute;right:28px;bottom:100%;margin:0 0 18px;padding:0;width:auto;max-width:none;z-index:30;filter:drop-shadow(0 8px 24px rgba(0,0,0,.5))}
  #phPad{width:150px;height:150px;--kn:54px;background:rgba(12,13,15,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  #phZm{right:auto;left:-62px;top:50%}
  #phZm button{width:44px;height:44px;background:rgba(21,23,27,.78)}
  #phb.nosel #phPadW{display:none}
}
@media (orientation:landscape) and (max-height:520px){
  #main{display:grid;grid-template-columns:minmax(0,1fr) 300px;grid-template-rows:auto auto minmax(0,1fr)}
  #phh,#phChip{grid-column:1/3}#phChip{margin-top:0;margin-bottom:4px;min-height:30px}
  #phh{padding-top:calc(4px + env(safe-area-inset-top))}#phT{min-height:40px;font-size:18px}#phR,#phR>*{height:40px}
  #wrap{grid-column:1;grid-row:3;padding-bottom:0}
  #phb{grid-column:2;grid-row:3;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden}
  #phPad{width:112px;height:112px;--kn:40px}#phPadW{padding:0 0 6px}#phZm{right:10px;flex-direction:row;top:auto;bottom:6px;transform:none}#phZm button{width:40px;height:40px}
  #phSeg,#phFs{height:44px}#phFs{width:44px}#phRow{padding:0 10px 6px}#phSeg button{font-size:13px}
  #phAct{padding-bottom:calc(4px + env(safe-area-inset-bottom))}#phAct button{min-height:44px;font-size:10px}
}
@media (max-height:700px){#phPad{width:132px;height:132px;--kn:46px}#phPadW{padding:6px 0 8px}#phZm button{width:42px;height:42px}#phSeg,#phFs{height:48px}#phFs{width:48px}#phAct button{min-height:48px}#phh{padding-top:calc(4px + env(safe-area-inset-top))}}
</style></head><body>
<div id="app">
<div id="lw"><div id="lh"><b>Kamera</b></div><div id="list"></div><div id="lf"><a href="/onvif">Kelola kamera</a><a href="/displaycostum.html">Laporan</a></div></div><div id="sp" title="Tarik untuk mengubah lebar daftar"></div>
<div id="main">
<div id="phh"><button id="phT" type="button" aria-label="Pilih kamera"><span>Semua Kamera</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div id="phR"><button id="phMore" type="button" aria-label="Menu lainnya"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></svg></button><b></b><a id="phX" href="/displaycostum.html" aria-label="Tutup, kembali ke Beranda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a></div></div>
<div id="phChip"><i></i><span></span></div>
<div id="wrap"><div id="g"></div><div id="empty">Belum ada kamera. Tambahkan dulu di halaman Kelola kamera.</div><button id="phFsX" type="button" aria-label="Keluar dari layar penuh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
<div id="tool"><button id="live" title="Siaran langsung">LIVE</button>
<button class="ib" id="lsh" title="Tampilkan / sembunyikan daftar kamera"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6h14M4 11h14M4 16h14"/></svg></button>
<div id="hint"></div>

<button class="ib" id="lbtn" title="Pilih tampilan"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="2" width="18" height="18" rx="2"/><line x1="11" y1="2" x2="11" y2="20"/><line x1="2" y1="11" x2="20" y2="11"/></svg></button>
<button class="ib" id="fs" title="Layar penuh seluruh grid"><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8V3h5M14 3h5v5M19 14v5h-5M8 19H3v-5"/></svg></button></div>

<div id="phb" class="nosel"><div id="phPadW"><div id="phPad" role="group" aria-label="Kontrol arah kamera"><i class="a1"></i><i class="a2"></i><i class="a3"></i><i class="a4"></i><b id="phKn"></b></div><div id="phZm"><button id="phZi" type="button" aria-label="Zoom masuk">+</button><button id="phZo" type="button" aria-label="Zoom keluar">&minus;</button></div></div>
<div id="phRow"><div id="phSeg"><button type="button" data-l="4">4 kanal</button><button type="button" data-l="9">9 kanal</button><button type="button" data-l="16">16 kanal</button></div><button id="phFs" type="button" aria-label="Layar penuh seluruh tampilan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg></button></div>
<div id="phAct"><button id="phSpk" type="button" class="need" aria-label="Suara hidup atau mati"></button><button id="phSnap" type="button" class="need" aria-label="Ambil foto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/></svg><span>Foto</span></button><button id="phQ" type="button" class="need" aria-label="Kualitas gambar SD atau HD"><b>SD</b><span>Kualitas</span></button><button id="phTf" type="button" class="need" aria-label="Layar penuh kamera ini"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M9 3H5v3M15 3h4v3M9 21H5v-3M15 21h4v-3"/></svg><span>Kamera ini</span></button><button id="phSet" type="button" aria-label="Pengaturan tampilan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg><span>Atur</span></button></div></div>
<div id="pop"><div class="gr" id="popg"></div><label><input type="checkbox" id="small"> Hemat CPU: perkecil kotak ke 360p (untuk kamera yang hanya punya stream besar)</label></div>
<div id="phMenu" role="menu"><a href="/displaycostum.html">Beranda</a><a href="/kejadian">Kejadian</a><a href="/onvif">Kelola kamera</a><a href="/klip">Papan klip</a><a href="/layar">Layar PC</a></div>
<div id="phScrim"></div>

</div>
</div>
<script>
var $=function(i){return document.getElementById(i)};
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
// ---- pemutar fMP4 (MediaSource) satu kamera ----
function hx(n){return (n<16?'0':'')+n.toString(16)}
function cat(a,b){var c=new Uint8Array(a.length+b.length);c.set(a,0);c.set(b,a.length);return c}
function u32(b,o){return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0}
function typ(b,o){return String.fromCharCode(b[o],b[o+1],b[o+2],b[o+3])}
function initEnd(b){var o=0;while(o+8<=b.length){var sz=u32(b,o);if(sz<8)return -1;if(typ(b,o+4)==='moov'){return o+sz<=b.length?o+sz:-1}o+=sz;if(o>b.length)return -1}return -1}
function avcCodec(b){for(var i=4;i<b.length-9;i++){if(b[i]===0x61&&b[i+1]===0x76&&b[i+2]===0x63&&b[i+3]===0x43){return 'avc1.'+hx(b[i+5])+hx(b[i+6])+hx(b[i+7])}}return null}
function hasAudio(b){for(var i=0;i<b.length-4;i++){if(b[i]===0x6d&&b[i+1]===0x70&&b[i+2]===0x34&&b[i+3]===0x61)return true}return false}
// Stream lewat WebSocket (browser membatasi 6 sambungan HTTP per alamat, WebSocket tidak kena batas itu)
function wsOpen(path){return new Promise(function(resolve,reject){
  var ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+path);ws.binaryType='arraybuffer';
  var q=[],waiters=[],ended=false,err=null;
  function wake(){while(waiters.length&&(q.length||ended)){var w=waiters.shift();if(q.length)w.res({done:false,value:q.shift()});else if(err)w.rej(err);else w.res({done:true})}}
  ws.onopen=function(){resolve({read:function(){return new Promise(function(res,rej){waiters.push({res:res,rej:rej});wake()})},close:function(){try{ws.close()}catch(e){}}})};
  ws.onmessage=function(ev){if(typeof ev.data==='string'){err=new Error(ev.data);ended=true;wake();return}q.push(new Uint8Array(ev.data));wake()};
  ws.onclose=function(){ended=true;wake()};
  ws.onerror=function(){if(!ended){err=err||new Error('Sambungan ke server gagal');ended=true;wake();reject(err)}}})}
function mkPlayer(v,say,opt){
  var P={tok:0,abort:null,sb:null,q:[],lag:null,tries:0,timer:null,on:false,last:-1,stuck:0,audio:false};
  function play(){var r=v.play();if(r&&r.catch)r.catch(function(){if(!v.muted){v.muted=true;v.play().catch(function(){})}})}
  P.applyMute=function(){var m=!(opt.audio&&opt.audio()&&P.audio);if(v.muted!==m){v.muted=m;if(!m&&v.paused)play()}};
  function pump(tok){var sb=P.sb;if(tok!==P.tok||!sb||sb.updating||!P.q.length)return;
    try{sb.appendBuffer(P.q.shift())}catch(e){if(e&&e.name==='QuotaExceededError'){trim(true)}else{fail(e,tok)}}}
  function trim(force){var sb=P.sb;if(!sb||sb.updating||!sb.buffered.length)return;var st=sb.buffered.start(0);
    if(force||v.currentTime-st>6){try{sb.remove(st,Math.max(st,v.currentTime-2))}catch(e){}}}
  function clean(){P.tok++;if(P.abort){try{P.abort.abort()}catch(e){}P.abort=null}
    if(P.lag){clearInterval(P.lag);P.lag=null}if(P.timer){clearTimeout(P.timer);P.timer=null}
    P.q=[];P.sb=null;P.last=-1;P.stuck=0;
    try{if(v.src){v.pause();var u=v.src;v.removeAttribute('src');v.load();if(u.indexOf('blob:')===0)URL.revokeObjectURL(u)}}catch(e){}}
  function fail(e,tok){if(tok!==P.tok)return;P.tries++;var wait=Math.min(2000*P.tries,15000);
    var m=String(e&&e.message?e.message:'galat').split(String.fromCharCode(10)).filter(function(x){return x.trim()}).pop()||'galat';
    if(m.length>80)m=m.slice(0,80)+'...';var perm=/tidak ditemukan/.test(m);
    clean();say(perm?'Kamera sudah dihapus':('Terputus: '+m),true);if(perm)return;
    P.timer=setTimeout(function(){if(P.on)run()},wait)}
  function startLag(tok){P.lag=setInterval(function(){if(tok!==P.tok)return;var b=v.buffered;if(!b.length)return;var end=b.end(b.length-1),lag=end-v.currentTime;
    if(v.paused&&!document.hidden)play();
    if(lag>1.5){v.currentTime=end-0.3}else if(lag>0.8){v.playbackRate=1.1}else{v.playbackRate=1}
    if(!document.hidden){if(Math.abs(v.currentTime-P.last)<0.01){P.stuck++;if(P.stuck>=8){P.stuck=0;P.tries++;run()}}else{P.stuck=0;P.last=v.currentTime}}},1000)}
  function run(){clean();var tok=P.tok;var ctrl=new AbortController();P.abort=ctrl;say('Menyambung...');
    (async function(){
      var rd=await wsOpen(opt.url());
      if(tok!==P.tok){rd.close();return}
      P.abort={abort:function(){rd.close()}};
      var head=new Uint8Array(0),ready=false;
      for(;;){var x=await rd.read();if(x.done)break;if(tok!==P.tok)return;
        if(!ready){head=cat(head,x.value);var e=initEnd(head);if(e<0)continue;
          var codec=avcCodec(head.subarray(0,e));P.audio=hasAudio(head.subarray(0,e));
          var mime='video/mp4; codecs="'+(codec||'avc1.42E01E')+(P.audio?',mp4a.40.2':'')+'"';
          var MS=window.MediaSource||window.ManagedMediaSource;if(!MS||!MS.isTypeSupported(mime))throw new Error('Browser tidak mendukung pemutaran ini');
          P.applyMute();
          var ms=new MS();if(!window.MediaSource)v.disableRemotePlayback=true;v.src=URL.createObjectURL(ms);
          await new Promise(function(res){ms.addEventListener('sourceopen',res,{once:true})});
          if(tok!==P.tok)return;
          var sb=ms.addSourceBuffer(mime);sb.mode='sequence';P.sb=sb;
          sb.addEventListener('updateend',function(){pump(tok);trim(false)});
          P.q.push(head.subarray(0,e));if(head.length>e)P.q.push(head.subarray(e));head=null;ready=true;P.tries=0;pump(tok);if(opt.onInit)opt.onInit(P.audio);
          play();startLag(tok);continue}
        P.q.push(x.value);if(P.q.length>150)throw new Error('Pemutar tertinggal terlalu jauh');pump(tok)}
      throw new Error('Siaran berakhir');
    })().catch(function(e){if(tok!==P.tok||(e&&e.name==='AbortError'))return;fail(e,tok)})}
  P.start=function(){P.on=true;P.tries=0;run()};
  P.stop=function(){P.on=false;clean()};
  return P}

// ---- multiview ----
var CAMS=[],LAY=ls('mvlay')||'16',SMALL=ls('mvsmall')==='1',SEL=-1,SLOTS=[],SLOTSET=false;
var TILES={},HOLES=[],QUAL={},AUD={},NOAUD={},GM=ls('mvmute')==='1',PTZON={},NOPTZ={},PTZPOS={x:50,y:62},SIG=null;
var DIMS={'1':[1,1],'4':[2,2],'6':[3,2],'9':[3,3],'13':[4,4],'16':[4,4]};
var NUM={'1':1,'4':4,'6':6,'9':9,'13':13,'16':16};
var NAMES=['1','4','6','9','13','16','all'];
var GAP=2,SELID=null;
function PH(){return true}
if(NAMES.indexOf(LAY)<0)LAY='16';
var IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(IOS&&!ls('mvlay'))LAY='4'; // iPhone: awal 4 kotak supaya tidak berat
try{var sv=JSON.parse(ls('mvslots')||'null');if(Array.isArray(sv)){SLOTS=sv;SLOTSET=true}}catch(e){}
try{var pp=JSON.parse(ls('mvptz')||'null');if(pp&&isFinite(pp.x)&&isFinite(pp.y))PTZPOS=pp}catch(e){}
try{var qq=JSON.parse(ls('mvqual')||'null');if(qq&&typeof qq==='object')QUAL=qq}catch(e){}
function saveSlots(){ls('mvslots',JSON.stringify(SLOTS))}
async function api(u){var r=await fetch(u,{cache:'no-store'});if(r.status===401){location.href='/login';throw 0}return r.json()}
function post(u,b){return fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json()}).catch(function(){return {ok:false,error:'Gagal menghubungi server'}})}
function camById(id){for(var i=0;i<CAMS.length;i++){if(CAMS[i].id===id)return CAMS[i]}return null}
function stText(c){if(c.status==='online')return '';if(c.status==='offline')return 'Putus. Mencoba tersambung lagi...';if(c.status==='auth')return 'Login kamera salah';return 'Menunggu tersambung...'}
function dotCls(c){return c.status==='online'?'on':(c.status==='auth'?'bad':'')}
function label(c){return c.name+(c.floor?' ('+c.floor+')':'')}
// ---- ikon ----
function ic(d){return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>'}
var I_SPK_ON=ic('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11"/>');
var I_SPK_OFF=ic('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/>');
var I_SNAP=ic('<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>');
var I_PTZ=ic('<circle cx="12" cy="12" r="8" stroke-dasharray="2.2 2.8"/><circle cx="12" cy="12" r="2.2"/>');
var I_FS=ic('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>');
var I_X=ic('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>');
// ---- antrean mulai stream (jeda antar kamera supaya PC tidak kaget) ----
var Q=[],QT=null;
function enqueue(T){if(T.queued||T.on)return;T.queued=true;Q.push(T);if(!QT)QT=setTimeout(pumpQ,0)}
function pumpQ(){QT=null;var T=Q.shift();if(!T)return;T.queued=false;
  if(TILES[T.id]===T&&!T.on&&T.cam&&T.cam.status==='online'){T.on=true;say(T,'Menyambung...');T.p.start()}
  if(Q.length)QT=setTimeout(pumpQ,250)}
function say(T,t,bad){T.st.style.display='flex';T.st.textContent=t;T.st.className='st'+(bad?' bad':'')}
function toast(T,t){var e=document.createElement('div');e.className='toast';e.textContent=t;T.el.appendChild(e);setTimeout(function(){if(e.parentNode)e.parentNode.removeChild(e)},3500)}
function aud(id){return !NOAUD[id]&&(AUD[id]===undefined?!GM:!!AUD[id])}
function streamUrl(T){var q=QUAL[T.id]==='main'?'main':'sub';return '/onvif-live/'+T.id+'/rt.ws?a='+(T.aOn=aud(T.id),T.aOn?'1':'0')+'&q='+q+'&s='+((SMALL&&q==='sub')?'1':'0')}
function restart(T){if(!T.cam||T.cam.status!=='online')return;T.p.stop();T.on=true;say(T,'Menyambung...');T.p.start()}
// ---- satu tile per kamera, dibuat sekali ----
function slotOf(id){return SLOTS.indexOf(id)}
function paintBtns(T){T.bSpk.innerHTML=aud(T.id)?I_SPK_ON:I_SPK_OFF;T.bSpk.className=aud(T.id)?'on':'';
  T.bQ.textContent=QUAL[T.id]==='main'?'HD':'SD';T.bPtz.className=PTZON[T.id]?'on':'';T.el.classList.toggle('pz',!!PTZON[T.id]&&!NOPTZ[T.id]);if(window.phPaint)phPaint()}
function mkTile(cam){var id=cam.id;var d=document.createElement('div');d.className='t';d.setAttribute('data-id',id);
  var v=document.createElement('video');v.muted=true;v.autoplay=true;v.playsInline=true;
  var pill=document.createElement('div');pill.className='pill';pill.textContent=label(cam);
  var st=document.createElement('div');st.className='st';
  var tb=document.createElement('div');tb.className='tb';
  function btn(h,tt,fn,cls){var b=document.createElement('button');b.innerHTML=h;b.title=tt;if(cls)b.className=cls;b.onclick=function(ev){ev.stopPropagation();fn()};b.ondblclick=function(ev){ev.stopPropagation()};tb.appendChild(b);return b}
  var T={id:id,el:d,v:v,st:st,pill:pill,cam:cam,on:false,queued:false,p:null};
  T.bSpk=btn(I_SPK_OFF,'Suara kamera ini hidup/mati',function(){AUD[id]=!aud(id);applyAud(T);paintBtns(T)});
  T.bSnap=btn(I_SNAP,'Ambil foto dari kamera ini',function(){snap(T)});
  T.bQ=btn('SD','Kualitas: SD (hemat) / HD (besar). Kamera ini disambung ulang.',function(){QUAL[id]=QUAL[id]==='main'?'sub':'main';ls('mvqual',JSON.stringify(QUAL));paintBtns(T);restart(T)},'q');
  T.bPtz=btn(I_PTZ,'Tampilkan / sembunyikan kontrol PTZ',function(){PTZON[id]=!PTZON[id];paintBtns(T)});
  T.bFs=btn(I_FS,'Layar penuh kamera ini',function(){fsTile(T)});
  T.bX=btn(I_X,'Kosongkan kotak ini (di layar penuh: keluar)',function(){xTile(T)},'xb');
  d.appendChild(v);d.appendChild(st);d.appendChild(pill);d.appendChild(tb);d.appendChild(mkPtz(T));
  T.p=mkPlayer(v,function(t,bad){say(T,t,bad)},{url:function(){return streamUrl(T)},audio:function(){return aud(id)},
    onInit:function(hasA){if(!hasA){NOAUD[id]=true;paintBtns(T)}}});
  v.addEventListener('playing',function(){st.style.display='none'});
  d.onclick=function(){var i=slotOf(id);if(LAY!=='all'&&i>=0)select(i);else if(LAY==='all'&&PH()){SELID=id;sync()}};
  d.ondblclick=function(){fsTile(T)};
  paintBtns(T);var s=stText(cam);if(s)say(T,s,cam.status==='auth');else say(T,'Menyambung...');
  return T}
function applyAud(T){if(!T.on)return;if(aud(T.id)&&!T.aOn){restart(T);return}T.p.applyMute()}
function setAllAud(on){GM=!on;ls('mvmute',GM?'1':'0');AUD={};Object.keys(TILES).forEach(function(k){applyAud(TILES[k]);paintBtns(TILES[k])});if(window.phPaint)phPaint()}
// browser menolak suara sebelum ada sentuhan pertama: setelah itu semua kamera yang suaranya hidup dibunyikan
function firstTouch(){Object.keys(TILES).forEach(function(k){TILES[k].p.applyMute()});if(window.phPaint)phPaint()}
['pointerdown','touchend','keydown','click'].forEach(function(ev){document.addEventListener(ev,function f(){document.removeEventListener(ev,f,true);firstTouch()},true)});
function disposeTile(id){var T=TILES[id];if(!T)return;T.p.stop();T.on=false;if(T.el.parentNode)T.el.parentNode.removeChild(T.el);delete TILES[id]}
function tfxOff(){var e=document.querySelector('.t.tfx');if(e)e.classList.remove('tfx');document.body.classList.remove('tfxb')}
function fsTile(T){if(T.el.classList.contains('tfx')){tfxOff();return}
  if(document.fullscreenElement===T.el){document.exitFullscreen().catch(function(){});return}
  var fn=T.el.requestFullscreen||T.el.webkitRequestFullscreen;
  function fake(){tfxOff();T.el.classList.add('tfx');document.body.classList.add('tfxb')}
  if(!fn){fake();return}
  try{var r=fn.call(T.el);if(r&&r.catch)r.catch(fake)}catch(e){fake()}}
function xTile(T){if(T.el.classList.contains('tfx')){tfxOff();return}if(document.fullscreenElement===T.el){document.exitFullscreen().catch(function(){});return}
  var i=slotOf(T.id);if(LAY==='all'||i<0)return;SLOTS[i]=null;saveSlots();sync()}
function snap(T){var v=T.v;if(!v.videoWidth){toast(T,'Belum ada gambar');return}
  try{var c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);
    c.toBlob(function(b){if(!b){toast(T,'Gagal mengambil foto');return}var d=new Date();function p2(n){return (n<10?'0':'')+n}
      var nm=T.cam.name.replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'kamera';
      var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nm+'_'+d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+'_'+p2(d.getHours())+p2(d.getMinutes())+p2(d.getSeconds())+'.png';
      document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);if(a.parentNode)a.parentNode.removeChild(a)},1500)},'image/png')}
  catch(e){toast(T,'Gagal mengambil foto')}}
// ---- kontrol PTZ melayang ----
var PT={id:null,timer:null};
function ptzBegin(T,x,y,z){ptzEnd();var id=T.id;PT.id=id;
  var send=function(){return post('/api/onvif/ptz',{id:id,x:x,y:y,zoom:z})};
  send().then(function(r){if(!r.ok){ptzEnd();if(r.noPtz){NOPTZ[id]=true;paintBtns(T)}toast(T,r.error||'PTZ gagal')}});
  PT.timer=setInterval(send,1000)}
function ptzEnd(){if(PT.timer){clearInterval(PT.timer);PT.timer=null}if(PT.id){var id=PT.id;PT.id=null;post('/api/onvif/ptz',{id:id,action:'stop'})}}
document.addEventListener('pointerup',function(){ptzEnd()});document.addEventListener('pointercancel',function(){ptzEnd()});
window.addEventListener('blur',function(){ptzEnd()});
function applyPtzPos(){var g=$('g');g.style.setProperty('--px',PTZPOS.x+'%');g.style.setProperty('--py',PTZPOS.y+'%')}
function dragPtz(T,ev){ev.preventDefault();ev.stopPropagation();var rect=T.el.getBoundingClientRect();var h=ev.currentTarget;try{h.setPointerCapture(ev.pointerId)}catch(e){}
  function mv(e){var x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100;PTZPOS={x:Math.max(12,Math.min(88,x)),y:Math.max(20,Math.min(85,y))};applyPtzPos()}
  function up(){h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);ls('mvptz',JSON.stringify(PTZPOS))}
  h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)}
function mkPtz(T){var w=document.createElement('div');w.className='ptz';w.onclick=function(ev){ev.stopPropagation()};w.ondblclick=function(ev){ev.stopPropagation()};
  var grip=document.createElement('div');grip.className='grip';grip.title='Geser panel ini';grip.onpointerdown=function(ev){dragPtz(T,ev)};w.appendChild(grip);
  var pad=document.createElement('div');pad.className='pad';
  var S=0.6,dirs=[['u',0,S],['d',0,-S],['l',-S,0],['r',S,0]];
  dirs.forEach(function(a){var b=document.createElement('i');b.className=a[0];b.onpointerdown=function(ev){ev.preventDefault();ptzBegin(T,a[1],a[2],0)};pad.appendChild(b)});
  var mid=document.createElement('b');mid.title='Tarik untuk memindahkan panel';mid.onpointerdown=function(ev){dragPtz(T,ev)};pad.appendChild(mid);
  var zm=document.createElement('div');zm.className='zm';
  var zo=document.createElement('button');zo.textContent=String.fromCharCode(0x2212);zo.title='Zoom keluar';zo.onpointerdown=function(ev){ev.preventDefault();ptzBegin(T,0,0,-S)};
  var zi=document.createElement('button');zi.textContent='+';zi.title='Zoom masuk';zi.onpointerdown=function(ev){ev.preventDefault();ptzBegin(T,0,0,S)};
  zm.appendChild(zo);zm.appendChild(zi);
  var cl=document.createElement('button');cl.className='pcl';cl.textContent=String.fromCharCode(215);cl.title='Sembunyikan kontrol';cl.onclick=function(ev){ev.stopPropagation();PTZON[T.id]=false;paintBtns(T)};
  w.appendChild(pad);w.appendChild(zm);w.appendChild(cl);return w}
// ---- susunan grid ----
function cellInfo(){var n,c,r;
  if(LAY==='all'){n=Math.max(1,CAMS.length);var W=$('wrap').clientWidth,H=$('wrap').clientHeight,best=0;c=1;
    for(var k=1;k<=n;k++){var rr=Math.ceil(n/k);var tw=Math.min((W-(k-1)*GAP)/k,((H-(rr-1)*GAP)/rr)*16/9);if(tw>best){best=tw;c=k}}
    r=Math.ceil(n/c);return {c:c,r:r,n:n}}
  var d=DIMS[LAY];return {c:d[0],r:d[1],n:NUM[LAY]}}
function fitGrid(){var dm=cellInfo();var W=$('wrap').clientWidth,H=$('wrap').clientHeight;if(W<10||H<10)return;
  var tw=Math.floor(Math.min((W-(dm.c-1)*GAP)/dm.c,((H-(dm.r-1)*GAP)/dm.r)*16/9));if(tw<20)tw=20;var th=Math.floor(tw*9/16);
  var g=$('g');g.style.width=(dm.c*tw+(dm.c-1)*GAP)+'px';g.style.height=(dm.r*th+(dm.r-1)*GAP)+'px';
  g.style.gridTemplateColumns='repeat('+dm.c+','+tw+'px)';g.style.gridTemplateRows='repeat('+dm.r+','+th+'px)';
  g.className=LAY==='all'?'all':'';
  var tiny=tw<190;for(var id in TILES){TILES[id].el.classList.toggle('tiny',tiny)}}
function sync(){ // tata ulang: tile dibuat/dibuang sesuai kamera yang dipilih; yang sudah ada tidak dimuat ulang
  var dm=cellInfo(),want={},list=[];
  if(LAY==='all'){CAMS.forEach(function(c){want[c.id]=true})}
  else{for(var i=0;i<SLOTS.length;i++){var id=SLOTS[i];if(id&&camById(id))want[id]=true}}
  for(var k in TILES){if(!want[k])disposeTile(k)}
  var g=$('g');
  for(var id2 in want){if(!TILES[id2]){var T=mkTile(camById(id2));TILES[id2]=T;g.appendChild(T.el);if(T.cam.status==='online')enqueue(T)}}
  if(SEL>=dm.n||LAY==='all')SEL=-1;
  if(PH()&&LAY!=='all'&&SEL<0)SEL=0;
  if(SELID&&!TILES[SELID])SELID=null;
  for(var j=0;j<16;j++){if(!HOLES[j]){var h=document.createElement('div');h.className='t hole';(function(jj){h.onclick=function(){select(jj);if(PH())listOpen(true)}})(j);HOLES[j]=h;g.appendChild(h)}}
  var order=0;
  CAMS.forEach(function(c,ci){var T=TILES[c.id];if(!T)return;var vis,ord;
    if(LAY==='all'){vis=true;ord=ci}else{var s=slotOf(c.id);vis=s>=0&&s<dm.n;ord=s}
    T.el.style.display=vis?'':'none';T.el.style.order=ord;T.el.classList.toggle('sel',LAY==='all'?(PH()&&c.id===SELID):slotOf(c.id)===SEL)});
  for(var j2=0;j2<16;j2++){var hh=HOLES[j2];var show=LAY!=='all'&&j2<dm.n&&!(SLOTS[j2]&&camById(SLOTS[j2]));
    hh.style.display=show?'':'none';hh.style.order=j2;hh.classList.toggle('sel',show&&j2===SEL)}
  $('empty').style.display=CAMS.length?'none':'block';
  applyPtzPos();fitGrid();paintList()}
function select(i){if(LAY==='all')return;var dm=cellInfo();if(i>=dm.n)return;SEL=(SEL===i&&!PH())?-1:i;sync()}
function assign(camId){
  if(LAY==='all')return;if(SEL<0){hintFlash('Klik dulu satu kotak di layar, baru klik nama kamera ini');return}
  var i=SEL,old=SLOTS[i]||null;var j=SLOTS.indexOf(camId);
  if(j>=0&&j!==i){SLOTS[j]=old}
  SLOTS[i]=camId;SLOTSET=true;saveSlots();sync()}
var HF=null;
function hintFlash(t){$('hint').textContent=t;$('hint').style.color='#c2410c';if(HF)clearTimeout(HF);HF=setTimeout(function(){$('hint').style.color='';paintList()},3500)}
function paintList(){
  var shown={};for(var id in TILES){var T=TILES[id];if(T.el.style.display!=='none')shown[id]=true}
  var h=$('list');h.textContent='';
  CAMS.forEach(function(c){var r=document.createElement('div');r.className='li'+(shown[c.id]?' sel':'');
    var dt=document.createElement('span');dt.className='dot '+dotCls(c);var n=document.createElement('span');n.className='n';n.textContent=label(c);
    r.appendChild(dt);r.appendChild(n);r.title=c.name;r.onclick=function(){assign(c.id);if(PH())listOpen(false)};h.appendChild(r)});
  var on=CAMS.filter(function(c){return c.status==='online'}).length;
  var hint=on+' dari '+CAMS.length+' kamera tersambung';
  if(LAY!=='all'){hint+=SEL>=0?' - Kotak '+(SEL+1)+' dipilih: klik kamera di daftar untuk menaruhnya di sini':' - Klik satu kotak, lalu klik kamera di daftar untuk menaruhnya'}
  if(!HF)$('hint').textContent=hint;
  Array.prototype.forEach.call($('popg').children,function(b){b.className='lo'+(b.getAttribute('data-l')===LAY?' on':'')});if(window.phPaint)phPaint()}
// ---- pilihan tampilan ----
function mkPop(){var g=$('popg');NAMES.forEach(function(n){var b=document.createElement('div');b.setAttribute('data-l',n);b.className='lo';
  var ib=document.createElement('div');ib.className='ic';var c,r,cnt;if(n==='all'){c=3;r=3;cnt=9}else{c=DIMS[n][0];r=DIMS[n][1];cnt=NUM[n]}
  ib.style.gridTemplateColumns='repeat('+c+',1fr)';ib.style.gridTemplateRows='repeat('+r+',1fr)';
  for(var i=0;i<c*r;i++){var cell=document.createElement('div');if(i>=cnt)cell.style.visibility='hidden';ib.appendChild(cell)}
  var lb=document.createElement('div');lb.textContent=n==='all'?'Semua':n;b.appendChild(ib);b.appendChild(lb);
  b.onclick=function(){setLay(n);$('pop').style.display='none';phScr()};g.appendChild(b)})}
function setLay(n){LAY=n;ls('mvlay',n);SEL=-1;SELID=null;sync()}
$('lbtn').onclick=function(ev){ev.stopPropagation();var p=$('pop');p.style.display=p.style.display==='block'?'none':'block'};
document.addEventListener('click',function(ev){var p=$('pop');if(p.style.display==='block'&&!p.contains(ev.target))p.style.display='none'});
$('small').checked=SMALL;$('small').onchange=function(){SMALL=$('small').checked;ls('mvsmall',SMALL?'1':'0');for(var id in TILES)restart(TILES[id])};
$('fs').onclick=function(){if(document.fullscreenElement){document.exitFullscreen()}else{var w=$('wrap');if(w.requestFullscreen)w.requestFullscreen().catch(function(){})}};
if(window.ResizeObserver){new ResizeObserver(function(){fitGrid()}).observe($('wrap'))}else{window.addEventListener('resize',fitGrid)}
// ---- daftar kamera di kiri: lebarnya bisa ditarik lewat garis pembatas ----
var LW={w:300,hide:false};
try{var lv=JSON.parse(ls('mvlw')||'null');if(lv&&typeof lv==='object'){if(isFinite(lv.w))LW.w=lv.w;LW.hide=!!lv.hide}}catch(e){}
function lwApply(){var e=$('lw');LW.w=Math.max(200,Math.min(Math.max(200,window.innerWidth-320),LW.w));e.style.width=LW.w+'px';e.style.display=LW.hide?'none':'flex';$('sp').style.display=LW.hide?'none':'block'}
function lwSave(){ls('mvlw',JSON.stringify({w:LW.w,hide:LW.hide}))}
$('sp').onpointerdown=function(ev){ev.preventDefault();var h=ev.currentTarget;try{h.setPointerCapture(ev.pointerId)}catch(e){}var sx=ev.clientX,ow=LW.w;
  function mv(e){LW.w=ow+(e.clientX-sx);lwApply()}
  function up(){h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);lwSave()}
  h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)};
$('lsh').onclick=function(){LW.hide=!LW.hide;lwApply();lwSave()};
window.addEventListener('resize',lwApply);lwApply();
// ---- muat daftar kamera, perbarui status berkala ----
function initSlots(){ // pertama kali: isi kotak berurutan dengan kamera yang ada
  if(SLOTSET)return;SLOTS=CAMS.slice(0,16).map(function(c){return c.id});SLOTSET=true;saveSlots()}
async function load(){try{var d=await api('/api/onvif/cameras');var list=d.cameras||[];
  var sig=list.map(function(c){return c.id+'|'+c.name+'|'+(c.floor||'')}).join(',');
  CAMS=list;initSlots();
  if(sig!==SIG){SIG=sig;for(var id in TILES){var c0=camById(id);if(c0){TILES[id].cam=c0;TILES[id].pill.textContent=label(c0)}}sync();return}
  for(var id2 in TILES){var T=TILES[id2],c=camById(id2);if(!c)continue;T.cam=c;
    if(c.status==='online'){if(!T.on)enqueue(T)}
    else{if(T.on){T.on=false;T.p.stop()}say(T,stText(c),c.status==='auth')}}
  paintList()}catch(e){if(!HF)$('hint').textContent='Gagal memuat daftar kamera'}}

// ---- tampilan HP (potret) ----
function selTile(){var id=null;if(LAY==='all')id=SELID;else if(SEL>=0)id=SLOTS[SEL];return id&&TILES[id]?TILES[id]:null}
function phScr(){var on=$('lw').classList.contains('open')||$('pop').style.display==='block'||$('phMenu').classList.contains('open');$('phScrim').style.display=(on&&PH())?'block':'none'}
function listOpen(o){$('lw').classList.toggle('open',!!o);phScr()}
function phCloseAll(){$('lw').classList.remove('open');$('pop').style.display='none';$('phMenu').classList.remove('open');phScr()}
function phPaint(){if(!$('phb'))return;var T=selTile(),chip=$('phChip');
  var txt=T?label(T.cam):(LAY!=='all'&&SEL>=0?'Kotak '+(SEL+1)+' kosong - pilih kamera':'Ketuk satu kotak video');
  chip.querySelector('span').textContent=txt;chip.querySelector('i').className=T?dotCls(T.cam):'';
  var b=$('phb');b.classList.toggle('nosel',!T);
  var id=T?T.id:null;
  $('phSpk').innerHTML=(GM?I_SPK_OFF:I_SPK_ON)+'<span>'+(GM?'Suara mati':'Suara hidup')+'</span>';
  $('phSpk').className=GM?'':'on';
  $('phQ').querySelector('b').textContent=id&&QUAL[id]==='main'?'HD':'SD';
  var nop=!T||!!NOPTZ[id];$('phPad').classList.toggle('dis',nop);$('phZm').classList.toggle('dis',nop);
  Array.prototype.forEach.call($('phSeg').children,function(x){x.className=x.getAttribute('data-l')===LAY?'on':''})}
function phPtzReset(){var kn=$('phKn');if(kn)kn.style.transform='';var pd=$('phPad');if(pd)pd.classList.remove('on')}
(function(){
  var pad=$('phPad'),kn=$('phKn'),cur='',act=false;
  function dirOf(e){var r=pad.getBoundingClientRect(),R=r.width/2,dx=e.clientX-(r.left+R),dy=e.clientY-(r.top+R),d=Math.sqrt(dx*dx+dy*dy),m=R-kn.offsetWidth/2,k=d>m&&d>0?m/d:1;
    kn.style.transform='translate('+(dx*k)+'px,'+(dy*k)+'px)';
    if(d<R*0.22)return '';return Math.abs(dx)>Math.abs(dy)?(dx>0?'r':'l'):(dy>0?'d':'u')}
  function upd(e){var T=selTile();if(!T||!act)return;var nd=dirOf(e);if(nd===cur)return;cur=nd;
    if(!nd){ptzEnd();return}
    var S=0.6;ptzBegin(T,nd==='r'?S:nd==='l'?-S:0,nd==='u'?S:nd==='d'?-S:0,0)}
  function stop(){act=false;cur='';ptzEnd();phPtzReset()}
  pad.addEventListener('pointerdown',function(e){e.preventDefault();var T=selTile();if(!T)return;if(NOPTZ[T.id]){toast(T,'Kamera ini tidak punya PTZ');return}
    try{pad.setPointerCapture(e.pointerId)}catch(x){}act=true;pad.classList.add('on');upd(e)});
  pad.addEventListener('pointermove',function(e){if(act)upd(e)});
  pad.addEventListener('pointerup',stop);pad.addEventListener('pointercancel',stop);pad.addEventListener('lostpointercapture',stop);
  pad.addEventListener('contextmenu',function(e){e.preventDefault()});
  document.addEventListener('visibilitychange',function(){if(document.hidden)stop()});
  window.addEventListener('pagehide',stop);window.addEventListener('blur',stop);
  function zoom(btn,z){btn.addEventListener('pointerdown',function(e){e.preventDefault();var T=selTile();if(!T)return;if(NOPTZ[T.id]){toast(T,'Kamera ini tidak punya PTZ');return}ptzBegin(T,0,0,z*0.6)});
    btn.addEventListener('contextmenu',function(e){e.preventDefault()})}
  zoom($('phZi'),1);zoom($('phZo'),-1);
  document.addEventListener('touchcancel',function(){ptzEnd();phPtzReset()});
})();
$('phT').onclick=function(ev){ev.stopPropagation();listOpen(!$('lw').classList.contains('open'))};
$('phMore').onclick=function(ev){ev.stopPropagation();var m=$('phMenu');m.classList.toggle('open');phScr()};
$('phSet').onclick=function(ev){ev.stopPropagation();var p=$('pop');p.style.display=p.style.display==='block'?'none':'block';phScr()};
$('phScrim').onclick=function(ev){ev.stopPropagation();phCloseAll()};
Array.prototype.forEach.call($('phSeg').children,function(b){b.onclick=function(){setLay(b.getAttribute('data-l'))}});
$('phSpk').onclick=function(){setAllAud(GM)};
$('phSnap').onclick=function(){var T=selTile();if(T)T.bSnap.click()};
$('phQ').onclick=function(){var T=selTile();if(T)T.bQ.click()};
$('phTf').onclick=function(){var T=selTile();if(T)fsTile(T)};
function fsAny(){return document.fullscreenElement||document.webkitFullscreenElement}
function gridFs(){var w=$('wrap');
  if(document.body.classList.contains('fsx')){document.body.classList.remove('fsx');return}
  if(fsAny()){try{document.exitFullscreen()}catch(e){}return}
  if(w.requestFullscreen){w.requestFullscreen().catch(function(){document.body.classList.add('fsx')})}else{document.body.classList.add('fsx')}}
$('phFs').onclick=gridFs;$('phFsX').onclick=gridFs;
document.addEventListener('keydown',function(e){if(e.key==='Escape'){phCloseAll();tfxOff()}});
try{var mqp=matchMedia('(max-width:899px) and (orientation:portrait)');var mqf=function(){sync();phScr()};if(mqp.addEventListener)mqp.addEventListener('change',mqf);else if(mqp.addListener)mqp.addListener(mqf)}catch(e){}
mkPop();load();setInterval(load,4000);
</script></body></html>`;
