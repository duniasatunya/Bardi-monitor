// Halaman "Kamera ONVIF" di server laporan: tambah/cari kamera (kiri) dan daftar kamera (kanan); live view di jendela.
// Di HP: dua tab (Daftar dan Tambah). Satu layar tanpa gulir panjang. Khusus iPhone: live view otomatis pakai mode Stabil (HLS asli Safari).
// Catatan: isi halaman ada di dalam template literal; jangan pakai backtick atau ${ } atau backslash di skrip browser.
'use strict';
const UIKIT = require('./ui-kit');
module.exports = (BASE_CSS) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Kamera ONVIF - Bardi Monitor</title><style>${BASE_CSS}${UIKIT.css}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fg .full{grid-column:1/3}
#vst{margin:0 0 6px}
.vwrap{flex:1;min-height:0;position:relative;background:#000;border-radius:8px;overflow:hidden}
.vwrap video{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;background:#000}
.modal select{padding:4px 6px;font-size:13px}
@media (max-width:820px){.modal select{font-size:14px}}
</style></head><body>
${UIKIT.header('Kamera ONVIF', 'onvif')}
<div class="tabs"><button data-p="pB">Daftar kamera</button><button data-p="pA">Tambah / cari</button></div>
<main class="shell" style="grid-template-columns:minmax(300px,390px) minmax(0,1fr)">
<section class="panel" id="pA"><div class="ph"><h2 id="ftitle">Tambah kamera</h2></div>
<div class="pbody scroll">
<p class="mut" style="margin:0 0 8px">Isi data ONVIF kamera. Kamera dicoba tersambung otomatis dan dicoba lagi sendiri kalau putus. Password hanya disimpan di PC ini dan tidak pernah ditampilkan lagi.</p>
<input type="hidden" id="fid">
<div class="fg">
<div class="full"><label for="fname">Nama kamera</label><input id="fname" maxlength="60" placeholder="mis. Kamar Jakarta 1 (Anak baru)" style="width:100%"></div>
<div><label for="ffloor">Lantai (opsional)</label><input id="ffloor" maxlength="30" placeholder="mis. Lantai 2" style="width:100%"></div>
<div><label for="fport">Port ONVIF</label><input id="fport" inputmode="numeric" value="80" style="width:100%"></div>
<div class="full"><label for="fhost">IP kamera</label><input id="fhost" inputmode="decimal" placeholder="192.168.18.51" style="width:100%"></div>
<div><label for="fuser">Username ONVIF</label><input id="fuser" autocomplete="off" style="width:100%"></div>
<div><label for="fpass">Password ONVIF</label><input id="fpass" type="password" autocomplete="new-password" style="width:100%"></div>
</div>
<div class="row" style="margin-top:10px"><button class="btn" id="ftest">Tes koneksi</button><button class="btn pri" id="fsave">Simpan</button><button class="btn" id="fcancel" style="display:none">Batal ubah</button></div>
<div class="mut" id="fmsg" style="min-height:16px;margin-top:6px"></div>
<div class="row" style="margin-top:8px"><button class="btn" id="fsweep">Pindai jaringan (disarankan)</button><button class="btn" id="fdisc">Cari kamera</button><button class="btn" id="fscan">Cek port IP ini</button></div>
<p class="small" style="margin:8px 0 0">Tidak tahu IP/port ONVIF-nya? "Pindai jaringan" mengetuk semua alamat satu per satu dan biasanya lebih lengkap daripada "Cari kamera".</p>
</div></section>
<section class="panel" id="pB"><div class="ph"><h2>Daftar kamera</h2><span class="small" id="upd2"></span></div>
<div id="libwarn" class="warnbox" style="display:none"></div>
<div class="small" id="est" style="margin-bottom:6px;min-height:15px"></div>
<div class="pbody" id="lsHost"></div><div class="pg" id="lsCtl"></div>
<p class="small" id="empty" style="display:none">Belum ada kamera. Tambahkan lewat tab "Tambah / cari".</p></section>
</main>
<div class="modal" id="mRes"><div class="box" style="max-width:860px;max-height:92%"><div class="row" style="justify-content:space-between;margin-bottom:6px"><b>Hasil</b><button class="btn" id="rx">Tutup</button></div>
<div class="mb"><div id="fres" class="res" style="display:none"></div><div id="fsres" class="res" style="display:none"></div></div></div></div>
<div class="modal" id="mLv"><div class="box full"><div class="row" style="justify-content:space-between;margin-bottom:6px"><b id="vtitle">Live</b><div class="row"><select id="vm"><option value="rt">Real-time (cepat)</option><option value="hls">Stabil (jeda beberapa detik)</option></select><select id="vq"><option value="auto">Otomatis (layar penuh = besar)</option><option value="sub">Selalu hemat (kecil)</option><option value="main">Selalu kualitas tinggi</option></select><button class="btn sm" id="vsnd">Suara: mati</button><button class="btn sm" id="vdiag">Diagnosa</button><button class="btn sm" id="vclose">Tutup</button></div></div>
<p class="small" id="vst"></p><pre id="vdg" style="display:none;white-space:pre-wrap;font-size:12px;max-height:110px;overflow:auto;margin:0 0 6px"></pre>
<div class="vwrap"><video id="vv" muted autoplay playsinline controls></video></div></div></div>
<script src="/vendor/hls.min.js"></script>
<script>${UIKIT.js}</script>
<script>
var $=function(i){return document.getElementById(i)};
var esc=UI.esc;
async function api(u,body){
  var o=body===undefined?{cache:'no-store'}:{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  var r=await fetch(u,o);if(r.status===401){location.href='/login';throw 0}return r.json()}
function ago(ts){if(!ts)return '-';var s=Math.max(0,Math.round((Date.now()-ts)/1000));if(s<60)return s+' detik lalu';if(s<3600)return Math.round(s/60)+' menit lalu';if(s<86400)return Math.round(s/3600)+' jam lalu';return Math.round(s/86400)+' hari lalu'}
function mainProf(c){var best=null;(c.profiles||[]).forEach(function(p){if(!best||(p.width||0)*(p.height||0)>(best.width||0)*(best.height||0))best=p});return best}
function profTxt(p){if(!p)return '-';var t=[];if(p.codec)t.push(p.codec);if(p.width&&p.height)t.push(p.width+'x'+p.height);if(p.fps)t.push(p.fps+' fps');return t.join(' · ')||'-'}
function badgeS(c){
  if(c.status==='online')return '<span class="b on">Tersambung</span>';
  if(c.status==='offline')return '<span class="b off">Putus</span>';
  if(c.status==='auth')return '<span class="b off">Login salah</span>';
  if(c.status==='lib')return '<span class="b off">Pustaka belum ada</span>';
  return '<span class="b wait">Memeriksa...</span>'}
function resBox(el,r){
  el.style.display='block';el.className='res '+(r.ok?'ok':'bad');
  var o=el.id==='fres'?$('fsres'):$('fres');o.style.display='none';UI.show('mRes');
  if(!r.ok){el.innerHTML='<b>Gagal.</b> '+esc(r.error||'')+(r.detail?'<div class="small">Detail teknis: '+esc(r.detail)+'</div>':'');return}
  var h='<b>Tersambung</b> <span class="small">('+(r.ms||0)+' ms)</span>';
  var i=r.info||{};var d=[i.manufacturer,i.model,i.firmware?('fw '+i.firmware):''].filter(Boolean).join(' · ');
  if(d)h+='<div class="small">'+esc(d)+'</div>';
  h+='<table class="t" style="margin-top:8px"><thead><tr><th>Profil</th><th>Video</th><th>Alamat stream (RTSP)</th></tr></thead><tbody>';
  (r.profiles||[]).forEach(function(p){h+='<tr><td>'+esc(p.name)+'</td><td>'+esc(profTxt(p))+'</td><td><code>'+esc(p.rtsp||'tidak ada')+'</code></td></tr>'});
  h+='</tbody></table>';
  if((r.profiles||[]).some(function(p){return /265|hevc/i.test(p.codec||'')}))h+='<div class="warnbox" style="margin-top:8px">Kamera ini mengirim H.265. Browser biasanya tidak bisa memutarnya langsung, jadi live view nanti perlu pengolahan tambahan.</div>';
  el.innerHTML=h}
var CAMS=[],RATE={};
function formVals(){return {id:$('fid').value||undefined,name:$('fname').value,floor:$('ffloor').value,host:$('fhost').value.trim(),port:$('fport').value.trim(),username:$('fuser').value,password:$('fpass').value}}
function resetForm(){$('fid').value='';['fname','ffloor','fhost','fuser','fpass'].forEach(function(k){$(k).value=''});$('fport').value='80';$('ftitle').textContent='Tambah kamera';$('fcancel').style.display='none';$('fpass').placeholder='';$('fres').style.display='none'}
function num(x,d){return (Math.round(x*Math.pow(10,d))/Math.pow(10,d)).toFixed(d).replace('.',',')}
var pg=UI.paged($('lsHost'),$('lsCtl'),{mode:'tiles',tw:270,th:136,gap:8,label:'kamera',empty:'',render:function(c){
  var p=mainProf(c),inf=c.info||{},dev=[inf.manufacturer,inf.model].filter(Boolean).join(' ');
  var r=RATE[c.id],rt=(r&&r.avgMbps!=null)?(' · <b>'+num(r.avgMbps,2)+' Mbps</b>'):'';
  var l3=c.status==='online'?('Terakhir tersambung '+ago(c.lastOkAt)):(c.error||('coba lagi '+(c.retryInSec==null?'':c.retryInSec+' dtk')));
  return '<div class="tile"><div class="row" style="flex-wrap:nowrap"><div class="tn" style="flex:1;min-width:0" title="'+esc(c.name)+'">'+esc(c.name)+'</div>'+badgeS(c)+'</div>'
   +'<div class="tm">'+esc(c.host)+':'+c.port+(c.floor?' &middot; '+esc(c.floor):'')+(dev?' &middot; '+esc(dev):'')+'</div>'
   +'<div class="tm">'+esc(profTxt(p))+rt+'</div>'
   +'<div class="tm">'+esc(l3)+'</div>'
   +'<div class="ta">'+(c.status==='online'?'<button class="btn sm pri" data-a="live" data-id="'+esc(c.id)+'">Lihat</button>':'')+'<button class="btn sm" data-a="test" data-id="'+esc(c.id)+'">Tes</button><button class="btn sm" data-a="edit" data-id="'+esc(c.id)+'">Ubah</button><button class="btn sm danger" data-a="del" data-id="'+esc(c.id)+'">Hapus</button></div></div>'}});
function render(){
  pg.set(CAMS);$('empty').style.display=CAMS.length?'none':'block';
  var sum=0,n=0,peak=0;CAMS.forEach(function(c){var r=RATE[c.id];if(c.status==='online'&&r&&r.avgMbps!=null){sum+=r.avgMbps;peak+=(r.peakMbps||r.avgMbps);n++}});
  $('est').textContent=n?('Beban rekaman sekarang: '+num(sum,1)+' Mbps dari '+n+' kamera (puncak gabungan sekitar '+num(peak,1)+' Mbps; port 100 Mbps nyaman sampai sekitar 70-80). Perkiraan 7 hari: '+num(sum*1e6/8*86400*7/1e12,2)+' TB.'):'Bitrate per kamera muncul setelah perekam kejadian berjalan beberapa menit.'}
async function load(){try{var d=await api('/api/onvif/cameras');CAMS=d.cameras||[];RATE={};(d.recorder||[]).forEach(function(x){if(x.rate)RATE[x.id]=x.rate});
  var w=$('libwarn');if(!d.libOk){w.style.display='block';w.textContent=d.libMessage}else w.style.display='none';
  render();$('upd').textContent='Diperbarui '+new Date().toLocaleTimeString('id-ID')}catch(e){$('upd').textContent='Gagal memuat'}}
$('ftest').onclick=async function(){var b=$('ftest');b.disabled=true;b.textContent='Menguji...';$('fres').style.display='none';
  try{var v=formVals();var r=await api('/api/onvif/test',v);resBox($('fres'),r)}catch(e){}b.disabled=false;b.textContent='Tes koneksi';load()};
$('fsave').onclick=async function(){$('fmsg').textContent='Menyimpan...';
  try{var r=await api('/api/onvif/save',formVals());if(r.ok){$('fmsg').textContent='Tersimpan. Kamera dicoba tersambung otomatis.';resetForm();load();if(UI.pickTab)UI.pickTab('pB')}else $('fmsg').textContent=r.error||'Gagal menyimpan'}catch(e){$('fmsg').textContent='Gagal menyimpan'}};
$('fcancel').onclick=function(){resetForm();$('fmsg').textContent=''};
$('rx').onclick=function(){UI.hide('mRes')};
$('lsHost').onclick=async function(ev){var t=ev.target;if(!t||!t.getAttribute)return;var a=t.getAttribute('data-a'),id=t.getAttribute('data-id');if(!a)return;
  var c=CAMS.filter(function(x){return x.id===id})[0];if(!c)return;
  if(a==='live'){lvOpen(id,c.name);return}
  if(a==='edit'){$('fid').value=c.id;$('fname').value=c.name;$('ffloor').value=c.floor||'';$('fhost').value=c.host;$('fport').value=c.port;$('fuser').value=c.username;$('fpass').value='';
    $('fpass').placeholder='kosongkan jika tidak diganti';$('ftitle').textContent='Ubah kamera: '+c.name;$('fcancel').style.display='inline-flex';$('fres').style.display='none';if(UI.pickTab)UI.pickTab('pA')}
  if(a==='del'){if(!confirm('Hapus kamera '+c.name+' dari daftar?'))return;var r=await api('/api/onvif/delete',{id:id});if(!r.ok)alert(r.error||'Gagal menghapus');load()}
  if(a==='test'){t.disabled=true;var r2=await api('/api/onvif/test',{id:id});t.disabled=false;resBox($('fres'),r2);$('fres').insertAdjacentHTML('afterbegin','<div class="small">Hasil tes untuk: '+esc(c.name)+'</div>');load()}};
function box(el,ok,html){el.style.display='block';el.className='res '+(ok?'ok':'bad');el.innerHTML=html;var o=el.id==='fres'?$('fsres'):$('fres');o.style.display='none';UI.show('mRes')}
var TYPES={onvif:'ONVIF (cocok!)',web:'Halaman web (bukan ONVIF)',rtsp:'RTSP (stream video)',lain:'Terbuka, jenis tidak dikenal'};
$('fdisc').onclick=async function(){var b=$('fdisc');b.disabled=true;b.textContent='Mencari (5 detik)...';$('fsres').style.display='none';
  try{var r=await api('/api/onvif/discover',{});
    if(!r.ok){box($('fsres'),false,'<b>Gagal.</b> '+esc(r.error||''))}
    else if(!r.devices.length){box($('fsres'),false,'<b>Tidak ada kamera yang menjawab.</b> Artinya ONVIF di kamera kemungkinan belum aktif, atau jaringan memblokir pencarian. Coba tombol "Cek port IP ini" untuk satu kamera.<div class="small">Antarmuka jaringan PC yang dipakai: '+esc((r.ifaces||[]).join(', '))+'</div>')}
    else{var h='<b>Ditemukan '+r.devices.length+' perangkat ONVIF.</b><table style="margin-top:8px"><thead><tr><th>IP</th><th>Port</th><th>Nama / perangkat</th><th></th></tr></thead><tbody>';
      r.devices.forEach(function(d){h+='<tr><td>'+esc(d.ip)+'</td><td>'+esc((d.ports||[]).join(', ')||'-')+'</td><td>'+esc([d.name,d.hardware].filter(Boolean).join(' / ')||'-')+'</td><td><button data-fill-ip="'+esc(d.ip)+'" data-fill-port="'+esc((d.ports||[])[0]||80)+'">Pakai</button></td></tr>'});
      box($('fsres'),true,h+'</tbody></table>')}}catch(e){}
  b.disabled=false;b.textContent='Cari kamera di jaringan'};
$('fsweep').onclick=async function(){var b=$('fsweep');b.disabled=true;b.textContent='Memindai jaringan (sekitar 10-30 detik)...';$('fsres').style.display='none';
  try{var r=await api('/api/onvif/sweep',{});
    if(!r.ok){box($('fsres'),false,'<b>Gagal.</b> '+esc(r.error||''))}
    else{var h='<b>Dipindai '+r.scanned+' alamat ('+esc((r.subnets||[]).join(', '))+') dalam '+Math.round((r.ms||0)/1000)+' detik. '+r.alive+' perangkat menjawab, '+r.devices.length+' di antaranya ONVIF.</b>';
      if(r.devices.length){h+='<table style="margin-top:8px"><thead><tr><th>IP</th><th>Port ONVIF</th><th>Status</th><th></th></tr></thead><tbody>';
        r.devices.forEach(function(d){h+='<tr><td>'+esc(d.ip)+'</td><td>'+esc(d.ports.join(', '))+'</td><td>'+(d.registered?'sudah terdaftar':'belum terdaftar')+'</td><td><button data-fill-ip="'+esc(d.ip)+'" data-fill-port="'+esc(d.ports[0])+'">Pakai</button></td></tr>'});
        h+='</tbody></table>'}
      h+='<div class="small" style="margin-top:6px">Perangkat yang menjawab tapi bukan ONVIF: '+r.others+' (router, HP, komputer, dll). Kamera yang mati, atau yang memblokir semua port umum, tidak akan terlihat.</div>';
      box($('fsres'),r.devices.length>0,h)}}catch(e){box($('fsres'),false,'<b>Gagal.</b> Pemindaian terputus.')}
  b.disabled=false;b.textContent='Pindai jaringan (disarankan)'};
$('fscan').onclick=async function(){var host=$('fhost').value.trim();if(!host){box($('fsres'),false,'Isi dulu kolom <b>IP kamera</b>.');return}
  var b=$('fscan');b.disabled=true;b.textContent='Memeriksa port...';$('fsres').style.display='none';
  try{var r=await api('/api/onvif/scan',{host:host});
    if(!r.ok){box($('fsres'),false,'<b>Gagal.</b> '+esc(r.error||''))}
    else if(!r.open.length){box($('fsres'),false,'<b>Tidak ada port umum yang terbuka di '+esc(r.host)+'</b> (diperiksa '+r.scanned+' port). Kamera mungkin mati, IP salah, atau ONVIF belum diaktifkan di kamera.')}
    else{var h='<b>Port terbuka di '+esc(r.host)+':</b><table style="margin-top:8px"><thead><tr><th>Port</th><th>Jenis</th><th></th></tr></thead><tbody>';
      var hasOnvif=false;r.open.forEach(function(o){if(o.type==='onvif')hasOnvif=true;h+='<tr><td>'+o.port+'</td><td>'+esc(TYPES[o.type]||o.type)+'</td><td>'+(o.type==='onvif'?'<button data-fill-ip="'+esc(r.host)+'" data-fill-port="'+o.port+'">Pakai port ini</button>':'')+'</td></tr>'});
      h+='</tbody></table>';if(!hasOnvif)h+='<div class="small" style="margin-top:6px">Tidak ada port yang menjawab sebagai ONVIF. Kemungkinan ONVIF belum aktif di kamera, atau memakai port di luar daftar umum.</div>';
      box($('fsres'),hasOnvif,h)}}catch(e){}
  b.disabled=false;b.textContent='Cek port IP ini'};
$('fsres').onclick=function(ev){var t=ev.target;if(!t||!t.getAttribute||!t.getAttribute('data-fill-ip'))return;$('fhost').value=t.getAttribute('data-fill-ip');$('fport').value=t.getAttribute('data-fill-port');$('fmsg').textContent='IP dan port terisi. Isi username/password lalu Tes koneksi.';UI.hide('mRes');if(UI.pickTab)UI.pickTab('pA')};
// ----- mode real-time: fMP4 mengalir lewat HTTP ke MediaSource -----
var RT={abort:null,sb:null,q:[],lagTimer:null,tok:0,tries:0,info:'',bytes:0,hist:[],stalls:0,audio:false,wantAudio:false,noAudioCam:false};
function curQ(){var q=$('vq').value;if(q==='auto')return document.fullscreenElement?'main':'sub';return q}
function hasAudio(b){for(var i=0;i<b.length-4;i++){if(b[i]===0x6d&&b[i+1]===0x70&&b[i+2]===0x34&&b[i+3]===0x61)return true}return false}
function snd(){return $('vm').value==='hls'?!$('vv').muted:RT.wantAudio}
function sndUi(){var b=$('vsnd');b.disabled=!!RT.noAudioCam;b.textContent=RT.noAudioCam?'Kamera tanpa suara':('Suara: '+(snd()?'hidup':'mati'))}
function hx(n){return (n<16?'0':'')+n.toString(16)}
function cat(a,b){var c=new Uint8Array(a.length+b.length);c.set(a,0);c.set(b,a.length);return c}
function u32(b,o){return ((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0}
function typ(b,o){return String.fromCharCode(b[o],b[o+1],b[o+2],b[o+3])}
function initEnd(b){var o=0;while(o+8<=b.length){var sz=u32(b,o);if(sz<8)return -1;if(typ(b,o+4)==='moov'){return o+sz<=b.length?o+sz:-1}o+=sz;if(o>b.length)return -1}return -1}
function avcCodec(b){for(var i=4;i<b.length-9;i++){if(b[i]===0x61&&b[i+1]===0x76&&b[i+2]===0x63&&b[i+3]===0x43){return 'avc1.'+hx(b[i+5])+hx(b[i+6])+hx(b[i+7])}}return null}
function rtStop(){RT.tok++;if(RT.abort){try{RT.abort.abort()}catch(e){}RT.abort=null}if(RT.lagTimer){clearInterval(RT.lagTimer);RT.lagTimer=null}RT.q=[];RT.sb=null;
  var v=$('vv');try{if(v.src){v.pause();var u=v.src;v.removeAttribute('src');v.load();if(u.indexOf('blob:')===0)URL.revokeObjectURL(u)}}catch(e){}}
function rtPump(){var sb=RT.sb;if(!sb||sb.updating||!RT.q.length)return;
  try{sb.appendBuffer(RT.q.shift())}catch(e){if(e&&e.name==='QuotaExceededError'){rtTrim(true)}else{throw e}}}
function rtTrim(force){var sb=RT.sb,v=$('vv');if(!sb||sb.updating||!sb.buffered.length)return;var st=sb.buffered.start(0);
  if(force||v.currentTime-st>6){try{sb.remove(st,Math.max(st,v.currentTime-2))}catch(e){}}}
function rtStart(tok){
  api('/api/onvif/live/stop',{id:LV.id}).catch(function(){}); // pastikan siaran mode Stabil tidak ikut jalan
  var ctrl=new AbortController();RT.abort=ctrl;var myTok=RT.tok;
  var q=curQ();var v=$('vv');v.muted=!RT.wantAudio;RT.t0=Date.now();RT.bytes=0;RT.hist=[];RT.stalls=0;
  (async function(){
    var r=await fetch('/onvif-live/'+LV.id+'/rt.mp4?a='+(RT.wantAudio?'1':'0')+'&q='+encodeURIComponent(q),{signal:ctrl.signal,cache:'no-store'});
    if(r.status===401){location.href='/login';return}
    if(!r.ok){var t=await r.text();throw new Error(t||('HTTP '+r.status))}
    var rd=r.body.getReader(),head=new Uint8Array(0),ready=false;
    for(;;){
      var x=await rd.read();if(x.done)break;if(myTok!==RT.tok||tok!==LV.tok)return;
      if(!ready){head=cat(head,x.value);var e=initEnd(head);if(e<0)continue;
        var codec=avcCodec(head.subarray(0,e));RT.audio=hasAudio(head.subarray(0,e));if(RT.wantAudio&&!RT.audio){RT.noAudioCam=true;RT.wantAudio=false;v.muted=true}RT.codec=codec;var mime='video/mp4; codecs="'+(codec||'avc1.42E01E')+(RT.audio?',mp4a.40.2':'')+'"';
        var MS=window.MediaSource||window.ManagedMediaSource;if(!MS||!MS.isTypeSupported(mime))throw new Error('Browser ini tidak mendukung mode real-time. Pakai mode Stabil.');
        var ms=new MS();if(!window.MediaSource)v.disableRemotePlayback=true;v.src=URL.createObjectURL(ms);
        await new Promise(function(res){ms.addEventListener('sourceopen',res,{once:true})});
        if(myTok!==RT.tok)return;
        var sb=ms.addSourceBuffer(mime);sb.mode='sequence';RT.sb=sb;
        sb.addEventListener('updateend',function(){rtPump();rtTrim(false)});
        sndUi();RT.q.push(head.subarray(0,e));if(head.length>e)RT.q.push(head.subarray(e));head=null;ready=true;RT.tries=0;rtPump();
        v.play().catch(function(){});
        RT.lagTimer=setInterval(function(){var vb=v.buffered;if(!vb.length)return;var end=vb.end(vb.length-1),lag=end-v.currentTime;
          if(v.paused&&!document.hidden)v.play().catch(function(){});
          if(lag>1.5){v.currentTime=end-0.3}else if(lag>0.8){v.playbackRate=1.1}else{v.playbackRate=1}
          var now=Date.now();RT.hist.push([now,RT.bytes]);while(RT.hist.length>1&&now-RT.hist[0][0]>5000)RT.hist.shift();var h0=RT.hist[0],mb=RT.hist.length>1?((RT.bytes-h0[1])*8/1e6)/((now-h0[0])/1000):0;
          lvSay('Live real-time: '+(LV.name||'')+' · '+(q==='main'?'kualitas tinggi':'hemat')+' · '+mb.toFixed(2)+' Mbps masuk · tersendat '+RT.stalls+'x · buffer '+Math.round(lag*1000)+' ms · '+(RT.audio?'suara hidup':'tanpa suara'))},500);
        continue}
      RT.bytes+=x.value.length;RT.q.push(x.value);if(RT.q.length>150)throw new Error('Pemutar tertinggal terlalu jauh');rtPump();
    }
    throw new Error('Siaran berakhir');
  })().catch(function(e){
    if(myTok!==RT.tok||tok!==LV.tok||(e&&e.name==='AbortError'))return;
    var life=Date.now()-(RT.t0||0);RT.quick=(life<4000)?(RT.quick||0)+1:0;var ve=$('vv').error;RT.tries++;var wait=Math.min(1500*RT.tries,10000);
    var em=String(e&&e.message?e.message:'galat').split(String.fromCharCode(10)).filter(function(x){return x.trim()}).pop()||'galat';if(em.length>90)em=em.slice(0,90)+'...';
    if(/Kamera tidak ditemukan/.test(em)){LV.id=null;rtStop();lvSay('Kamera ini sudah dihapus. Tutup panel ini.',true);return}
    var dg=' [codec '+(RT.codec||'?')+(ve?', video error '+ve.code+(ve.message?': '+ve.message:''):'')+']';
    if(RT.quick>=3){RT.quick=0;rtStop();$('vm').value='hls';lvStart();lvSay('Mode real-time gagal berulang untuk kamera ini'+dg+'. Otomatis pindah ke mode Stabil.',true);return}
    lvSay('Terputus: '+em+dg+'. Mencoba lagi '+Math.round(wait/1000)+' dtk...',true);
    rtStop();var t=LV.tok;setTimeout(function(){if(LV.id&&t===LV.tok){lvStart()}},wait)});
}
// ----- live view satu kamera -----
var LV={id:null,name:'',hls:null,tok:0,lastT:-1,stuck:0,timer:null};
function lvSay(t,bad){var e=$('vst');e.textContent=t;e.style.color=bad?'#d33a2c':''}
function lvDestroy(){rtStop();if(LV.hls){try{LV.hls.destroy()}catch(e){}LV.hls=null}var v=$('vv');try{v.pause();v.removeAttribute('src');v.load()}catch(e){}}
async function lvStart(){
  var tok=++LV.tok;lvDestroy();LV.lastT=-1;LV.stuck=0;lvSay('Menyambung ke kamera...');
  if($('vm').value==='rt'){rtStart(tok);return}
  var r;try{r=await api('/api/onvif/live/start',{id:LV.id,quality:curQ()})}catch(e){return}
  if(tok!==LV.tok)return;
  if(!r.ok){lvSay('Gagal: '+(r.error||'tidak diketahui'),true);if(/tidak ditemukan/i.test(r.error||'')){LV.id=null}return}
  var v=$('vv'),src=r.url;
  if(!UI.ios&&window.Hls&&Hls.isSupported()){
    var h=new Hls({liveSyncDuration:5,liveMaxLatencyDuration:15,maxBufferLength:20,lowLatencyMode:false,manifestLoadingMaxRetry:6,levelLoadingMaxRetry:6,fragLoadingMaxRetry:6});
    LV.hls=h;h.loadSource(src);h.attachMedia(v);
    h.on(Hls.Events.ERROR,function(e,d){if(!d.fatal)return;
      if(d.type===Hls.ErrorTypes.NETWORK_ERROR){lvSay('Jaringan/kamera terputus, mencoba lagi...',true);h.startLoad()}
      else if(d.type===Hls.ErrorTypes.MEDIA_ERROR){h.recoverMediaError()}
      else{lvSay('Pemutar berhenti, memulai ulang...',true);setTimeout(function(){if(tok===LV.tok)lvStart()},2000)}});
  }else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src=src}
  else{lvSay('Browser ini tidak bisa memutar siaran.',true);return}
  v.play().catch(function(){});
  sndUi();lvSay('Live: '+(r.profile||'')+' '+(r.info||'')+' (tertunda beberapa detik dari aslinya)')}
function lvOpen(id,name){LV.id=id;LV.name=name;RT.wantAudio=false;RT.noAudioCam=false;$('vv').muted=true;sndUi();$('vtitle').textContent='Live: '+name;UI.show('mLv');lvStart();
  if(!LV.timer)LV.timer=setInterval(function(){ // pemulih: video diam terlalu lama -> mulai ulang
    if(!LV.id)return;var v=$('vv');if(v.paused&&!v.ended){v.play().catch(function(){})}
    if(Math.abs(v.currentTime-LV.lastT)<0.01){LV.stuck++;if(LV.stuck>=4){LV.stuck=0;lvStart()}}else{LV.stuck=0;LV.lastT=v.currentTime}},4000)}
function lvClose(){var id=LV.id;LV.id=null;LV.tok++;lvDestroy();UI.hide('mLv');if(id){api('/api/onvif/live/stop',{id:id}).catch(function(){})}}
$('vclose').onclick=lvClose;
$('vdiag').onclick=async function(){if(!LV.id)return;var d=$('vdg'),b=this;d.style.display='block';d.textContent='Membaca stream kamera (sekitar 5 detik)...';b.disabled=true;
  try{var r=await api('/api/onvif/diag',{id:LV.id,quality:curQ()});var nl=String.fromCharCode(10);
    d.textContent=r.ok?('Profil: '+r.profile+nl+r.lines.join(nl)):('Gagal: '+r.error)}catch(e){d.textContent='Gagal menjalankan diagnosa'}
  b.disabled=false};
$('vq').onchange=function(){if(LV.id)lvStart()};
$('vsnd').onclick=function(){var v=$('vv');
  if($('vm').value==='hls'){v.muted=!v.muted;sndUi();return}
  RT.wantAudio=!RT.wantAudio;v.muted=!RT.wantAudio;sndUi();if(LV.id)lvStart()}; // mode real-time: suara ikut/tidak ikut dikirim, siaran disambung ulang
$('vv').addEventListener('waiting',function(){if(LV.id&&RT.lagTimer&&$('vv').currentTime>1)RT.stalls++});
$('vv').addEventListener('volumechange',function(){sndUi()});
document.addEventListener('fullscreenchange',function(){if(LV.id&&$('vq').value==='auto'){lvStart()}});
$('vm').onchange=function(){if(LV.id)lvStart()};
document.addEventListener('visibilitychange',function(){if(!document.hidden&&LV.id){$('vv').play().catch(function(){})}});
window.addEventListener('pagehide',function(){if(LV.id){try{navigator.sendBeacon('/api/onvif/live/stop',new Blob([JSON.stringify({id:LV.id})],{type:'application/json'}))}catch(e){}}});
if(UI.ios)$('vm').value='hls';
UI.tabs('pB');
load();setInterval(load,3000);
</script></body></html>`;
