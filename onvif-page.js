// Halaman "Kamera ONVIF" di server laporan (tahap 1: konfigurasi + tes koneksi + daftar).
// Catatan: isi halaman ada di dalam template literal; jangan pakai backtick atau ${ } atau backslash di skrip browser.
'use strict';
module.exports = (BASE_CSS) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kamera ONVIF - Bardi Monitor</title><style>${BASE_CSS}
header{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--card);border-bottom:1px solid var(--bd);position:sticky;top:0;z-index:2}
h1{font-size:17px;margin:0}h2{font-size:15px;margin:0 0 10px}main{max-width:1100px;margin:0 auto;padding:12px 16px 40px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:14px;margin:12px 0;overflow-x:auto}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.mut{color:var(--mut);font-size:13px}
a.btn,button{font:inherit;padding:7px 12px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--tx);cursor:pointer;text-decoration:none}
button:disabled{opacity:.5;cursor:default}.pri-b{background:var(--pri);border-color:var(--pri);color:#fff}.danger{color:#b42318;border-color:#b42318}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--bd);white-space:nowrap}th{color:var(--mut);font-weight:600}
.b{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;font-weight:600;color:#fff}
.on{background:var(--ok)}.off{background:var(--bad)}.wait{background:var(--warn)}.idle{background:var(--mut)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
label{display:block;font-size:12px;color:var(--mut);margin-bottom:3px}
input{font:inherit;width:100%;padding:7px 9px;border-radius:8px;border:1px solid var(--bd);background:var(--bg);color:var(--tx)}
.res{margin-top:12px;padding:10px 12px;border-radius:8px;border:1px solid var(--bd);display:none}.res.ok{border-color:var(--ok)}.res.bad{border-color:var(--bad)}
.warnbox{background:#fff4e5;color:#7a4b00;border:1px solid #f0c27a;border-radius:8px;padding:8px 12px;margin:8px 0;font-size:13px}
.small{font-size:12px;color:var(--mut)}code{font-family:ui-monospace,Consolas,monospace;font-size:12px}
</style></head><body>
<header><h1>Kamera ONVIF</h1><div class="row"><span class="mut" id="upd">memuat...</span><a class="btn" href="/multiview">Multiview</a><a class="btn" href="/displaycostum.html">Kembali ke laporan</a></div></header>
<main>
<div id="libwarn" class="warnbox" style="display:none"></div>

<div class="card"><h2 id="ftitle">Tambah kamera</h2>
<p class="mut" style="margin:0 0 10px">Isi data ONVIF kamera (IP, port, username, password). Kamera akan dicoba tersambung otomatis dan dicoba lagi sendiri kalau putus, jadi tidak perlu diatur ulang. Password hanya disimpan di PC ini dan tidak pernah ditampilkan lagi.</p>
<input type="hidden" id="fid">
<div class="grid">
<div><label for="fname">Nama kamera</label><input id="fname" maxlength="60" placeholder="mis. Lt2 Lorong A"></div>
<div><label for="ffloor">Lantai (opsional)</label><input id="ffloor" maxlength="30" placeholder="mis. Lantai 2"></div>
<div><label for="fhost">IP kamera</label><input id="fhost" inputmode="decimal" placeholder="192.168.18.51"></div>
<div><label for="fport">Port ONVIF</label><input id="fport" inputmode="numeric" value="80"></div>
<div><label for="fuser">Username ONVIF</label><input id="fuser" autocomplete="off"></div>
<div><label for="fpass">Password ONVIF</label><input id="fpass" type="password" autocomplete="new-password"></div>
</div>
<div class="row" style="margin-top:12px"><button id="ftest">Tes koneksi</button><button id="fsave" class="pri-b">Simpan</button><button id="fcancel" style="display:none">Batal ubah</button><span class="mut" id="fmsg"></span></div>
<div class="row" style="margin-top:8px"><button id="fdisc">Cari kamera di jaringan</button><button id="fscan">Cek port IP ini</button><span class="small">Tidak tahu port ONVIF-nya? Pakai dua tombol ini.</span></div>
<div id="fres" class="res"></div>
<div id="fsres" class="res"></div>
</div>

<div class="card" id="vcard" style="display:none"><div class="row" style="justify-content:space-between"><h2 id="vtitle">Live</h2><div class="row"><select id="vm" style="font:inherit;padding:6px 8px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--tx)"><option value="rt">Real-time (cepat)</option><option value="hls">Stabil (jeda beberapa detik)</option></select><select id="vq" style="font:inherit;padding:6px 8px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--tx)"><option value="auto">Otomatis (layar penuh = besar)</option><option value="sub">Selalu hemat (kecil)</option><option value="main">Selalu kualitas tinggi</option></select><button id="vsnd">Suara: mati</button><button id="vdiag">Diagnosa</button><button id="vclose">Tutup</button></div></div><p class="small" id="vst" style="margin:6px 0"></p><pre id="vdg" style="display:none;white-space:pre-wrap;font-size:12px;max-height:240px;overflow:auto;margin:8px 0 0"></pre><video id="vv" muted autoplay playsinline controls style="width:100%;max-height:72vh;background:#000;border-radius:8px"></video></div>

<div class="card"><div class="row" style="justify-content:space-between"><h2>Daftar kamera</h2><span class="small" id="est"></span></div>
<table><thead><tr><th>Nama</th><th>Lantai</th><th>Alamat</th><th>Status</th><th>Perangkat</th><th>Video utama</th><th>Terakhir tersambung</th><th></th></tr></thead><tbody id="lst"><tr><td colspan="8" class="mut">memuat...</td></tr></tbody></table>
<p class="small" id="empty" style="display:none">Belum ada kamera. Tambahkan lewat form di atas.</p>
</div>
</main>
<script src="/vendor/hls.min.js"></script>
<script>
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
async function api(u,body){
  var o=body===undefined?{cache:'no-store'}:{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  var r=await fetch(u,o);if(r.status===401){location.href='/login';throw 0}return r.json()}
function ago(ts){if(!ts)return '-';var s=Math.max(0,Math.round((Date.now()-ts)/1000));if(s<60)return s+' detik lalu';if(s<3600)return Math.round(s/60)+' menit lalu';if(s<86400)return Math.round(s/3600)+' jam lalu';return Math.round(s/86400)+' hari lalu'}
function mainProf(c){var best=null;(c.profiles||[]).forEach(function(p){if(!best||(p.width||0)*(p.height||0)>(best.width||0)*(best.height||0))best=p});return best}
function profTxt(p){if(!p)return '-';var t=[];if(p.codec)t.push(p.codec);if(p.width&&p.height)t.push(p.width+'x'+p.height);if(p.fps)t.push(p.fps+' fps');if(p.bitrateKbps)t.push(p.bitrateKbps+' kbps');return t.join(' · ')||'-'}
function badge(c){
  if(c.status==='online')return '<span class="b on">Tersambung</span>';
  if(c.status==='offline')return '<span class="b off">Putus</span> <span class="small">coba lagi '+(c.retryInSec==null?'':c.retryInSec+' dtk')+'</span>';
  if(c.status==='auth')return '<span class="b off">Login salah</span>';
  if(c.status==='lib')return '<span class="b off">Pustaka belum ada</span>';
  return '<span class="b wait">Memeriksa...</span>'}
function resBox(el,r){
  el.style.display='block';el.className='res '+(r.ok?'ok':'bad');
  if(!r.ok){el.innerHTML='<b>Gagal.</b> '+esc(r.error||'')+(r.detail?'<div class="small">Detail teknis: '+esc(r.detail)+'</div>':'');return}
  var h='<b>Tersambung</b> <span class="small">('+(r.ms||0)+' ms)</span>';
  var i=r.info||{};var d=[i.manufacturer,i.model,i.firmware?('fw '+i.firmware):''].filter(Boolean).join(' · ');
  if(d)h+='<div class="small">'+esc(d)+'</div>';
  h+='<table style="margin-top:8px"><thead><tr><th>Profil</th><th>Video</th><th>Alamat stream (RTSP)</th></tr></thead><tbody>';
  (r.profiles||[]).forEach(function(p){h+='<tr><td>'+esc(p.name)+'</td><td>'+esc(profTxt(p))+'</td><td><code>'+esc(p.rtsp||'tidak ada')+'</code></td></tr>'});
  h+='</tbody></table>';
  if((r.profiles||[]).some(function(p){return /265|hevc/i.test(p.codec||'')}))h+='<div class="warnbox">Kamera ini mengirim H.265. Browser biasanya tidak bisa memutarnya langsung, jadi live view nanti perlu pengolahan tambahan.</div>';
  el.innerHTML=h}
var CAMS=[];
function formVals(){return {id:$('fid').value||undefined,name:$('fname').value,floor:$('ffloor').value,host:$('fhost').value.trim(),port:$('fport').value.trim(),username:$('fuser').value,password:$('fpass').value}}
function resetForm(){$('fid').value='';['fname','ffloor','fhost','fuser','fpass'].forEach(function(k){$(k).value=''});$('fport').value='80';$('ftitle').textContent='Tambah kamera';$('fcancel').style.display='none';$('fpass').placeholder='';$('fres').style.display='none'}
function render(){
  var rows=CAMS.map(function(c){var p=mainProf(c);var inf=c.info||{};var dev=[inf.manufacturer,inf.model].filter(Boolean).join(' ')||'-';
    return '<tr><td><b>'+esc(c.name)+'</b></td><td>'+esc(c.floor||'-')+'</td><td>'+esc(c.host)+':'+c.port+'</td><td>'+badge(c)+(c.status!=='online'&&c.error?'<div class="small">'+esc(c.error)+'</div>':'')+'</td><td>'+esc(dev)+'</td><td>'+esc(profTxt(p))+'</td><td>'+esc(ago(c.lastOkAt))+'</td>'
      +'<td>'+(c.status==='online'?'<button class="pri-b" data-a="live" data-id="'+esc(c.id)+'">Lihat</button> ':'')+'<button data-a="test" data-id="'+esc(c.id)+'">Tes</button> <button data-a="edit" data-id="'+esc(c.id)+'">Ubah</button> <button class="danger" data-a="del" data-id="'+esc(c.id)+'">Hapus</button></td></tr>'}).join('');
  $('lst').innerHTML=rows||'';$('empty').style.display=CAMS.length?'none':'block';
  var kbps=0,n=0;CAMS.forEach(function(c){var p=mainProf(c);if(c.status==='online'&&p&&p.bitrateKbps){kbps+=p.bitrateKbps;n++}});
  $('est').textContent=n?('Perkiraan rekaman 7 hari untuk '+n+' kamera tersambung: maks. '+(kbps*1000/8*86400*7/1e12).toFixed(2)+' TB (dari batas bitrate yang dilaporkan kamera; angka asli biasanya lebih kecil)'):''}
async function load(){try{var d=await api('/api/onvif/cameras');CAMS=d.cameras||[];
  var w=$('libwarn');if(!d.libOk){w.style.display='block';w.textContent=d.libMessage}else w.style.display='none';
  render();$('upd').textContent='Diperbarui '+new Date().toLocaleTimeString('id-ID')}catch(e){$('upd').textContent='Gagal memuat'}}
$('ftest').onclick=async function(){var b=$('ftest');b.disabled=true;b.textContent='Menguji...';$('fres').style.display='none';
  try{var v=formVals();var r=await api('/api/onvif/test',v);resBox($('fres'),r)}catch(e){}b.disabled=false;b.textContent='Tes koneksi';load()};
$('fsave').onclick=async function(){$('fmsg').textContent='Menyimpan...';
  try{var r=await api('/api/onvif/save',formVals());if(r.ok){$('fmsg').textContent='Tersimpan. Kamera dicoba tersambung otomatis.';resetForm();load()}else $('fmsg').textContent=r.error||'Gagal menyimpan'}catch(e){$('fmsg').textContent='Gagal menyimpan'}};
$('fcancel').onclick=function(){resetForm();$('fmsg').textContent=''};
$('lst').onclick=async function(ev){var t=ev.target;if(!t||!t.getAttribute)return;var a=t.getAttribute('data-a'),id=t.getAttribute('data-id');if(!a)return;
  var c=CAMS.filter(function(x){return x.id===id})[0];if(!c)return;
  if(a==='live'){lvOpen(id,c.name);return}
  if(a==='edit'){$('fid').value=c.id;$('fname').value=c.name;$('ffloor').value=c.floor||'';$('fhost').value=c.host;$('fport').value=c.port;$('fuser').value=c.username;$('fpass').value='';
    $('fpass').placeholder='kosongkan jika tidak diganti';$('ftitle').textContent='Ubah kamera: '+c.name;$('fcancel').style.display='inline-block';$('fres').style.display='none';window.scrollTo(0,0)}
  if(a==='del'){if(!confirm('Hapus kamera '+c.name+' dari daftar?'))return;var r=await api('/api/onvif/delete',{id:id});if(!r.ok)alert(r.error||'Gagal menghapus');load()}
  if(a==='test'){t.disabled=true;var r2=await api('/api/onvif/test',{id:id});t.disabled=false;$('ftitle').scrollIntoView();resBox($('fres'),r2);$('fres').insertAdjacentHTML('afterbegin','<div class="small">Hasil tes untuk: '+esc(c.name)+'</div>');load()}};
function box(el,ok,html){el.style.display='block';el.className='res '+(ok?'ok':'bad');el.innerHTML=html}
var TYPES={onvif:'ONVIF (cocok!)',web:'Halaman web (bukan ONVIF)',rtsp:'RTSP (stream video)',lain:'Terbuka, jenis tidak dikenal'};
$('fdisc').onclick=async function(){var b=$('fdisc');b.disabled=true;b.textContent='Mencari (5 detik)...';$('fsres').style.display='none';
  try{var r=await api('/api/onvif/discover',{});
    if(!r.ok){box($('fsres'),false,'<b>Gagal.</b> '+esc(r.error||''))}
    else if(!r.devices.length){box($('fsres'),false,'<b>Tidak ada kamera yang menjawab.</b> Artinya ONVIF di kamera kemungkinan belum aktif, atau jaringan memblokir pencarian. Coba tombol "Cek port IP ini" untuk satu kamera.<div class="small">Antarmuka jaringan PC yang dipakai: '+esc((r.ifaces||[]).join(', '))+'</div>')}
    else{var h='<b>Ditemukan '+r.devices.length+' perangkat ONVIF.</b><table style="margin-top:8px"><thead><tr><th>IP</th><th>Port</th><th>Nama / perangkat</th><th></th></tr></thead><tbody>';
      r.devices.forEach(function(d){h+='<tr><td>'+esc(d.ip)+'</td><td>'+esc((d.ports||[]).join(', ')||'-')+'</td><td>'+esc([d.name,d.hardware].filter(Boolean).join(' / ')||'-')+'</td><td><button data-fill-ip="'+esc(d.ip)+'" data-fill-port="'+esc((d.ports||[])[0]||80)+'">Pakai</button></td></tr>'});
      box($('fsres'),true,h+'</tbody></table>')}}catch(e){}
  b.disabled=false;b.textContent='Cari kamera di jaringan'};
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
$('fsres').onclick=function(ev){var t=ev.target;if(!t||!t.getAttribute||!t.getAttribute('data-fill-ip'))return;$('fhost').value=t.getAttribute('data-fill-ip');$('fport').value=t.getAttribute('data-fill-port');$('fmsg').textContent='IP dan port terisi. Isi username/password lalu Tes koneksi.'};
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
        if(!window.MediaSource||!MediaSource.isTypeSupported(mime))throw new Error('Browser ini tidak mendukung mode real-time. Pakai mode Stabil.');
        var ms=new MediaSource();v.src=URL.createObjectURL(ms);
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
  if(window.Hls&&Hls.isSupported()){
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
function lvOpen(id,name){LV.id=id;LV.name=name;RT.wantAudio=false;RT.noAudioCam=false;$('vv').muted=true;sndUi();$('vtitle').textContent='Live: '+name;$('vcard').style.display='block';$('vcard').scrollIntoView();lvStart();
  if(!LV.timer)LV.timer=setInterval(function(){ // pemulih: video diam terlalu lama -> mulai ulang
    if(!LV.id)return;var v=$('vv');if(v.paused&&!v.ended){v.play().catch(function(){})}
    if(Math.abs(v.currentTime-LV.lastT)<0.01){LV.stuck++;if(LV.stuck>=4){LV.stuck=0;lvStart()}}else{LV.stuck=0;LV.lastT=v.currentTime}},4000)}
function lvClose(){var id=LV.id;LV.id=null;LV.tok++;lvDestroy();$('vcard').style.display='none';if(id){api('/api/onvif/live/stop',{id:id}).catch(function(){})}}
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
load();setInterval(load,3000);
</script></body></html>`;
