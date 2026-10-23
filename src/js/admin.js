/* admin.js - MINUM MALAM SISWA. Built from src/ by tools/build.py; edit the source parts, not this file. */
// Set when the site is opened from the seller's notification, which carries
// the order it is about. Consumed once, by the first dashboard that opens.
let _pendingAdminOrder='';

// Auto-lock after this long with no interaction, so a phone left on the table
// stops being an open dashboard.
const IDLE_LOCK_MS=15*60*1000;
let _idleT=null;
function bumpIdle(){
  if(!admin)return;
  clearTimeout(_idleT);
  _idleT=setTimeout(function(){lockAdmin('🔒 Auto-kunci (15 min idle)')},IDLE_LOCK_MS);
}

// Watch receipts for the whole admin session, not just while the Resit tab is
// open, so a receipt that arrives is on screen the moment you look.
const SEEN_CLAIMS_KEY='mms_seen_claims';
let _seenClaims={};
// "Unseen" is per device, so a receipt checked on the phone still glows on a
// second screen that has never opened it. That is the honest reading of it.
function clamCls(id){return 'o-clam'+(_seenClaims[id]?'':' unseen')}
function markClaimSeen(id){
  if(!id||_seenClaims[id])return;
  _seenClaims[id]=Date.now();
  try{localStorage.setItem(SEEN_CLAIMS_KEY,JSON.stringify(_seenClaims))}catch(e){}
  const hits=document.querySelectorAll('[data-claim="'+id+'"]');
  for(let i=0;i<hits.length;i++)hits[i].classList.remove('unseen');
}
// Looking at the receipt is the payment check, so it settles the flag rather
// than leaving it for a manual tap that no longer exists. Both writes are the
// same pair the old toggle made: the order, which the admin views read, and
// tracking, which is what the customer is watching for their live status.
//
// Deliberately quiet on failure. This is a side effect of opening something,
// and opening it must never fail because a background write did.
function admSettlePaid(id){
  if(!id)return;
  const pool=(_admOrdersCache&&_admOrdersCache.length?_admOrdersCache:(_admVisDocs||[]))||[];
  const o=pool.find(function(x){return x.id===id});
  if(o&&o.paid)return;
  const db=getDb();if(!db)return;
  const at=firebase.firestore.FieldValue.serverTimestamp();
  // Optimistic, so the count on the list agrees without waiting for the round
  // trip. The snapshot still lands and overwrites this with the real thing.
  if(o)o.paid=true;
  db.collection('orders').doc(id).update({paid:true,paidAt:at}).catch(function(){});
  db.collection('tracking').doc(id).update({paid:true,paidAt:at}).catch(function(){});
}
let _admClaimLoading=true,_admPhoneCount=0,_admClaims={},_admClaimUnsub=null;
function admWatchClaims(){
  if(_admClaimUnsub||!isAdmin())return;
  const db=getDb();if(!db)return;
  // Raised from 100: this is a view in its own right now, and a receipt past
  // that limit would be invisible with no way to tell it was there.
  _admClaimUnsub=db.collection('payments').orderBy('at','desc').limit(300).onSnapshot(function(snap){
    const m={};
    snap.docs.forEach(function(d){const f=d.data()||{};m[d.id]={at:f.at,img:f.img}});
    _admClaims=m;_admClaimLoading=false;
    const pg=document.getElementById('adm-pg');
    if(!pg)return;
    if(admTab==='receipts')admReceipts(pg);
    else if(admTab==='orders')_admRenderOrders(pg,_admOrdersCache||[]);
  },function(){_admClaimLoading=false});
}

// Every receipt, newest first, whether or not its order still exists.
function admReceipts(pg){
  const db=getDb();
  if(!db){pg.innerHTML='<div style="padding:20px;color:#8A5A00;font-weight:700">Firebase tidak tersedia.</div>';return}
  if(!isAdmin()){pg.innerHTML='<div style="padding:20px;color:#8A5A00;font-weight:700">🔒 Login admin diperlukan.</div>';return}
  admWatchClaims();
  if(!admUnsub)admOrders(pg);   // needed to resolve receipt -> order name
  const ids=Object.keys(_admClaims);
  if(!ids.length){
    pg.innerHTML=(_admClaimLoading
      ?'<div style="color:#6B7A73;text-align:center;padding:30px">Memuatkan...</div>'
      :'<div class="a-empty"><span class="big">📭</span>Tiada resit lagi.<br><br><span style="font-size:14px">Resit muncul di sini bila pelanggan menekan &ldquo;Saya dah bayar&rdquo;.</span></div>');
    return;
  }
  const ord={};
  (_admOrdersCache||[]).forEach(function(o){ord[o.id]=o});
  ids.sort(function(a,b){
    const ta=_admClaims[a].at,tb=_admClaims[b].at;
    return ((tb&&tb.toDate?tb.toDate():0)-(ta&&ta.toDate?ta.toDate():0));
  });
  const rows=ids.map(function(id){
    const c=_admClaims[id],o=ord[id];
    const at=c.at&&c.at.toDate?c.at.toDate():null;
    const when=at?at.toLocaleString('ms-MY',{hour:'2-digit',minute:'2-digit'})+' · '+timeAgo(at):'';
    const who=o
      ?'<b style="color:'+(o.status==='deleted'?'#8A5A00':'#101A16')+'">#'+(o.no!=null?fmtNo(o.no):'?')+' '+esc(o.name||'?')+'</b>'
       +'<div style="font-size:12px;color:#6B7A73;font-weight:700;margin-top:2px">'
       +(o.delivery==='pickup'?'🏪 Ambil sendiri':'🏠 '+esc(o.room||'-'))+' · RM'+Number(o.total||0).toFixed(2)+'</div>'
       +(o.status==='deleted'
         ?'<div style="font-size:12px;color:#8A5A00;font-weight:800;margin-top:3px">🗑 Pesanan ini dipadam — pulihkan dalam tab Pesanan › 🗑 Dipadam</div>'
         :'')
      :'<b style="color:#8A5A00">Pesanan tidak dijumpai</b>'
       +'<div style="font-size:12px;color:#6B7A73;font-weight:700;margin-top:2px">Rujukan <span style="color:#101A16">'+esc(id)+'</span> · pesanan asal sudah dipadam</div>';
    return '<div class="a-row" style="align-items:flex-start;cursor:pointer" onclick="admViewClaim(\''+id+'\')">'
      +'<span class="n">'+who+'<div style="font-size:12px;color:#6B7A73;font-weight:700;margin-top:3px">'+when+'</div></span>'
      +'<span style="display:flex;gap:10px;align-items:center;flex-shrink:0">'
      +(o&&o.paid
        ?'<span style="font-size:12px;color:#101A16;font-weight:800">✓ Sudah ditanda bayar</span>'
        :'<span style="font-size:12px;color:#8A5A00;font-weight:800">Belum ditanda bayar</span>')
      +'<button class="o-clam" onclick="event.stopPropagation();admViewClaim(\''+id+'\')">📎 Buka resit</button>'
      +'</span></div>';
  });
  pg.innerHTML='<div style="max-width:760px">'
    +'<div class="a-sec">📎 '+ids.length+' resit</div>'
    +rows.join('')
    +'<div style="margin-top:16px;padding:14px;background:rgba(16,26,22,0.03);border:1px solid rgba(16,26,22,0.08);border-radius:12px;font-size:13px;color:#6B7A73;line-height:1.7">Tekan mana-mana baris untuk melihat gambar resit penuh. Resit kekal di sini walaupun pesanan asal sudah dipadam.</div>'
    +'</div>';
}
function admStopClaims(){if(_admClaimUnsub){_admClaimUnsub();_admClaimUnsub=null}_admClaims={}}
let _claimBlobUrl='';
function closeClaimView(){
  const m=document.getElementById('claim-view');
  if(m)m.style.display='none';
  // blob URLs pin the whole file in memory until revoked
  if(_claimBlobUrl){try{URL.revokeObjectURL(_claimBlobUrl)}catch(e){};_claimBlobUrl=''}
}
function admViewClaim(id){
  const box=document.getElementById('claim-view');
  const c=_admClaims[id];
  if(!box||!c)return;
  markClaimSeen(id);
  admSettlePaid(id);
  box.style.display='flex';
  let media;
  if(c.img&&claimIsPdf(c.img)){
    // An <img> silently shows nothing for a PDF, so a data URL would look like
    // an empty receipt. A blob URL renders in the browser's PDF viewer and can
    // also be saved, which is what you actually want for an archived receipt.
    let url='';
    try{url=URL.createObjectURL(dataUrlToBlob(c.img));_claimBlobUrl=url}catch(e){}
    media=url
      ?'<iframe src="'+url+'" title="Resit PDF" style="width:100%;height:70vh;border:0;border-radius:10px;background:#fff"></iframe>'
       +'<a href="'+url+'" download="resit-'+esc(id)+'.pdf" style="display:block;margin-top:10px;text-align:center;background:rgba(16,26,22,0.12);border:1px solid rgba(16,26,22,0.3);color:#101A16;font-weight:800;font-size:14px;padding:11px;border-radius:10px;text-decoration:none">⬇ Muat turun PDF</a>'
      :'<div style="padding:30px;text-align:center;color:#8A5A00;font-weight:700">PDF tidak boleh dipaparkan. Cuba muat turun dari konsol.</div>';
  }else if(c.img&&c.img.length>40){
    media='<img src="'+esc(c.img)+'" alt="Resit bayaran">';
  }else{
    media='<div style="padding:30px;text-align:center;color:#6B7A73;font-weight:700">Pelanggan hantar rujukan sahaja, tiada gambar.</div>';
  }
  box.innerHTML='<div class="cv-bg" onclick="closeClaimView()"></div><div class="cv-box"><div class="cv-hd">📎 Resit bayaran<button onclick="closeClaimView()">✕</button></div>'
   +media
   +'</div>';
  // cached snapshot already holds the image; this is only a fallback
  if(!c.img||c.img.length<=40){
    const db=getDb();
    if(db)db.collection('payments').doc(id).get().then(function(s){
      if(s.exists){const f=s.data()||{};
        if(f.img){c.img=f.img;admViewClaim(id)}
      }
    }).catch(function(){});
  }
}
// The seller is told about a payment claim, not about an order landing. A new
// order still appears at the top of the list the instant it is written (the
// orders listener is untouched), it just does not make a sound. If you ever
// want the in-app chime back while the panel is open, this is the seam.
function admStopWatch(){admStopClaims()}
// The dashboard used to be an overlay on the shop page, so closing it only had
// to hide a layer. It is a page of its own now: hiding the panel would leave an
// empty screen, so closing goes back to the password prompt and "customer view"
// leaves for the shop.
const IS_ADMIN_PAGE=document.body.getAttribute('data-page')==='admin';
function closeAdminPanel(){
  if(admUnsub){admUnsub();admUnsub=null}
  admStopWatch();
  admin=false;clearTimeout(_idleT);
  const p=document.getElementById('admin-panel');if(p)p.classList.remove('show');
  if(IS_ADMIN_PAGE){showAdminLogin();return}
  paintAdminBtn();
  draw();drawTimes();drawDel();
}
// Close the dashboard but stay signed in, so the 🔧 button comes back.
function exitAdmin(){
  if(IS_ADMIN_PAGE){location.href='index.html';return}
  closeAdminPanel();toast('Customer view')
}
// Lock the screen, NOT the account.
//
// This used to sign out, which is why a tap on a notification always ended at
// the password prompt: by then there was no session left to use. Protecting an
// unattended screen is what this is for, and closing the dashboard does exactly
// that. The session staying alive is what lets the notification link open the
// order the tap was about, with nothing to type.
//
// Signing out is still deliberate and still available - it lives in Settings.
function lockAdmin(msg){
  closeAdminPanel();
  toast(msg||'🔒 Admin dikunci');
}
// Open the order the notification was about.
//
// Driven from the list render rather than a timer. A timer races the login:
// the dashboard renders, the id arrives, and whether the orders are in hand yet
// depends on the second. The render IS the moment they are in hand, so this is
// called from the end of it - first attempt clears whatever filter would hide
// the row, and the re-render calls straight back in with the row present.
function admFulfilPending(){
  const id=_pendingAdminOrder;
  if(!id)return;
  if(!(_admOrdersCache||[]).some(function(x){return x.id===id}))return;   // not delivered yet
  if(!(_admVisDocs||[]).some(function(x){return x.id===id})){
    // Everything already cleared and it is still not on screen - it is deleted,
    // or otherwise unreachable. Stop rather than looping.
    if(_admFilter==='all'&&_admDelFilter==='all'&&!_admClaimOnly&&!_admSearch&&!_admBlockFilter){
      _pendingAdminOrder='';
      return;
    }
    _admFilter='all';_admDelFilter='all';_admClaimOnly=false;_admSearch='';_admBlockFilter='';
    _admRenderOrders(document.getElementById('adm-pg'),_admOrdersCache);
    return;
  }
  _pendingAdminOrder='';
  admOpenDetail(id);
}
function enterAdmin(){
  if(!adminUser()){toast('⛔ Akaun ini bukan admin');return}
  admin=true;closeAdminLogin();admSetupOpen(_admSetupOpen);
  admStopWatch();setTimeout(admWatchClaims,1800);
  document.getElementById('admin-panel').classList.add('show');
  switchAdmin('orders');paintAdminBtn();bumpIdle();
  admFulfilPending();
  toast('🔧 Admin ON');
}
// Mobile layout. The sidebar becomes a drawer and the filter bar folds away, so
// the orders get the screen; both come back from the header. _barFold is null
// until the owner touches it, so the default follows the screen width instead
// of being decided on load and then wrong after a rotation.
let _barFold=(function(){try{return new URLSearchParams(location.search).get('mob')==='1'?true:null}catch(e){return null}})();
function admFolded(){return _barFold===null?window.innerWidth<=760:_barFold}
function admApplyFold(){const b=document.querySelector('.a-bar');if(b)b.classList.toggle('fold',admFolded())}
function admToggleBar(){_barFold=!admFolded();admApplyFold()}
function admToggleSide(open){
  const s=document.querySelector('.adm-side'),k=document.getElementById('adm-backdrop');
  if(!s)return;
  const want=(open===0)?false:(open===1?true:!s.classList.contains('open'));
  s.classList.toggle('open',want);
  if(k)k.classList.toggle('show',want);
}
// Taking a tab should put the drawer away - it has done its job, and on a phone
// it would otherwise sit over the screen the owner just navigated to.
function admCloseSide(){admToggleSide(0)}
function closeAdminLogin(){document.getElementById('admin-login').style.display='none'}
// Dismissing the password prompt means leaving: on the dashboard page there is
// nothing behind it to look at, so it goes back to the shop.
function admLeaveLogin(){
  if(IS_ADMIN_PAGE){location.href='index.html';return}
  closeAdminLogin();
}
function showAdminLogin(){closeCart();closeCust();closeConfirm();document.getElementById('admin-login').style.display='flex';const e=document.getElementById('admin-email');if(e){e.value='';setTimeout(()=>e.focus(),60)}}
const AUTH_ERR={'auth/invalid-email':'Email tidak sah','auth/missing-password':'Masukkan password','auth/wrong-password':'Email atau password salah','auth/invalid-credential':'Email atau password salah','auth/invalid-login-credentials':'Email atau password salah','auth/user-not-found':'Email atau password salah','auth/user-disabled':'Akaun dinyahaktifkan','auth/too-many-requests':'Terlalu banyak cubaan. Tunggu sebentar.','auth/operation-not-allowed':'Email/Password belum diaktifkan dalam Firebase Console','auth/network-request-failed':'Tiada internet. Periksa sambungan.','auth/user-token-expired':'Sesi tamat. Cuba lagi.','auth/internal-error':'Ralat pelayan. Cuba lagi.'};
async function verifyAdminLogin(){const em=document.getElementById('admin-email').value.trim(),pw=document.getElementById('admin-pw').value;const btn=document.getElementById('admin-login-btn');if(!em||!pw){toast('⚠ Email dan password diperlukan');return}btn.disabled=true;btn.textContent='Memeriksa…';const a=getAuth();if(!a){btn.disabled=false;btn.textContent='Masuk';toast('❌ Auth tidak tersedia');return}try{await a.signInWithEmailAndPassword(em,pw);await a.currentUser.getIdToken(true);enterAdmin()}catch(err){toast('❌ '+(AUTH_ERR[err.code]||'Gagal masuk'));document.getElementById('admin-pw').value='';document.getElementById('admin-pw').focus()}finally{btn.disabled=false;btn.textContent='Masuk'}}
function admConfirm(msg,yesLabel,onYes){
  const box=document.getElementById('adm-confirm');
  if(!box){if(window.confirm(msg))onYes();return}
  box.innerHTML='<div class="c-bg" onclick="admConfirmClose()"></div><div class="c-box">'
   +'<div class="c-msg">'+esc(msg)+'</div>'
   +'<div class="c-row"><button class="c-no" onclick="admConfirmClose()">Batal</button>'
   +'<button class="c-yes" id="adm-confirm-yes">'+esc(yesLabel||'Ya, padam')+'</button></div></div>';
  box.style.display='flex';
  const b=document.getElementById('adm-confirm-yes');
  if(b)b.onclick=function(){admConfirmClose();try{onYes()}catch(e){}};
}
function admConfirmClose(){const b=document.getElementById('adm-confirm');if(b)b.style.display='none'}
function toastAction(msg,label,fn){
  const t=document.getElementById('toast');
  t.innerHTML=esc(msg)+' <button id="toast-act" style="background:#101A16;color:#F7FAF5;border:none;font-size:14px;font-weight:800;padding:6px 14px;border-radius:8px;cursor:pointer;margin-left:10px">'+esc(label)+'</button>';
  t.classList.add('show');clearTimeout(t._t);
  const b=document.getElementById('toast-act');
  if(b)b.onclick=function(){try{fn()}catch(e){}};
  t._t=setTimeout(()=>t.classList.remove('show'),8000);
}
function isAdmin(){return !!adminUser()}

// ---------------------------------------------------------------------------
// Funnel analytics. Anonymous step counters only: no names, phones, IPs or
// cookies. A random per-tab id lets us de-duplicate, nothing more. Written to
// the events collection, readable by the admin only.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Sound + haptics. Audio needs a user gesture first; every call site here is
// already inside a tap, so the context is allowed to start.
// ---------------------------------------------------------------------------
// Normalise a Malaysian number for wa.me: 0123456789 / +60123456789 -> 60123456789
function waNum(p){p=String(p==null?'':p).replace(/[^0-9]/g,'');if(!p)return'';if(p.charAt(0)==='0')p='60'+p.slice(1);return p}
function dataUrlToBlob(u){
  const s=String(u||''),i=s.indexOf(',');
  const mime=(s.slice(0,i).match(/^data:([^;]+)/)||[])[1]||'application/octet-stream';
  const bin=atob(s.slice(i+1));
  const arr=new Uint8Array(bin.length);
  for(let k=0;k<bin.length;k++)arr[k]=bin.charCodeAt(k);
  return new Blob([arr],{type:mime});
}
function claimIsPdf(v){return /^data:application\/pdf/i.test(String(v||''))}

const FUNNEL=['page_view','menu_view','item_open','add_cart','checkout_open','order_sent'];
const ORDER_LIMIT=200;
function ordersQ(db){if(!isAdmin())return null;return db.collection('orders').orderBy('createdAt','desc').limit(ORDER_LIMIT)}
async function saveMenu(){const ok=await fsSet(MENU_DOC,{items:MENU});draw();return ok}
async function togDis(id){if(dis[id])delete dis[id];else dis[id]=true;draw();await fsSet(DIS_DOC,dis)}
async function enAll(){dis={};unrTimes=[];disAdds=[];disDel=[];disBlocks=[];draw();drawTimes();drawDel();drawBlocks();await fsSet(DIS_DOC,dis);await saveConfig();toast('✓ Semua diaktifkan')}
let admTab='orders',admUnsub=null;
// The last snapshot of the orders collection. Declared here because it was
// being written as an implicit global, which works only while the script is
// sloppy-mode.
let _admOrdersCache=[];
const ADM_T={orders:'📥 Pesanan',customers:'👥 Pelanggan',receipts:'📎 Resit Bayaran',stats:'📊 Analitis',menu:'🧋 Minuman',addons:'🍬 Pemanis',schedule:'⏰ Masa',delivery:'🚗 Penghantaran',coupons:'\u{1F39F}\uFE0F Kupon',settings:'⚙️ Settings'};
const ADM_SETUP=['menu','addons','schedule','delivery','settings'];
let _admSetupOpen=false;
function admSetupOpen(open){
  _admSetupOpen=open;
  const b=document.querySelector('.adm-side .toggle'),n=document.getElementById('adm-setup');
  if(b)b.classList.toggle('open',open);
  if(n)n.classList.toggle('open',open);
  try{localStorage.setItem('mms_adm_setup',open?'1':'0')}catch(e){}
}
function admSetupToggle(){admSetupOpen(!_admSetupOpen)}
function switchAdmin(t){admTab=t;
// The orders listener renders into the shared #adm-pg. Left running while
// another tab owns that node, the next order update would repaint the orders
// list over the receipts, customers or analytics screen. Drop it on the way
// out; the callback below is the second half of the same guard.
if(t!=='orders'&&t!=='receipts'&&admUnsub){admUnsub();admUnsub=null}
document.getElementById('adm-hd').textContent=ADM_T[t]||t;document.querySelectorAll('#adm-nav a').forEach(a=>{a.classList.toggle('active',a.dataset.tab===t)});
if(ADM_SETUP.indexOf(t)>-1)admSetupOpen(true);const pg=document.getElementById('adm-pg');if(t==='orders')admOrders(pg);else if(t==='menu')admMenu(pg);else if(t==='addons')admAddons(pg);else if(t==='schedule')admSchedule(pg);else if(t==='delivery')admDelivery(pg);else if(t==='customers')admCustomers(pg);else if(t==='receipts')admReceipts(pg);else if(t==='coupons')admCoupons(pg);else if(t==='stats')admAnalytics(pg);else if(t==='settings')admSettings(pg)}
let _admFilter='aktif',_admDelFilter='all',_admClaimOnly=false,_admSearch='',_admPrevCount=0,_admVisDocs=[];
// Block filter for the order list. Set by the chips under the search box, so a
// block can be picked without typing anything. _blkOpen is "the search box has
// been clicked", which is what reveals the row.
let _admBlockFilter='',_blkNames=[],_blkOpen=false;
function admBeep(){try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;g.gain.value=0.3;o.start();o.stop(ctx.currentTime+0.15);if(navigator.vibrate)navigator.vibrate(200)}catch(e){}}
function timeAgo(d){if(!d)return'';const diff=(Date.now()-d.getTime())/1000;if(diff<60)return'Masih baru';if(diff<3600)return Math.floor(diff/60)+' min lalu';if(diff<86400)return Math.floor(diff/3600)+' jam lalu';return Math.floor(diff/86400)+' hari lalu'}
function admOrders(pg){if(admUnsub){admUnsub();admUnsub=null}_admSearch='';const db=getDb();if(!isAdmin()){pg.innerHTML='<div style="padding:20px;color:#8A5A00;font-weight:700">🔒 Login admin diperlukan.</div>';return}if(!db){pg.innerHTML='<div style="padding:20px;color:#8A5A00;font-weight:700">⚠ Firebase tidak tersedia.</div>';return}pg.innerHTML='<div style="color:#6B7A73;text-align:center;padding:30px">Memuatkan...</div>';admUnsub=ordersQ(db).onSnapshot(snap=>{const docs=snap.docs.map(d=>({id:d.id,...d.data()}));_admPrevCount=docs.length;_admOrdersCache=docs;if(admTab==='receipts'){admReceipts(pg);return}if(admTab!=='orders')return;_admRenderOrders(pg,docs)},e=>{pg.innerHTML='<div style="color:#C6381E;padding:20px">Error: '+esc(e.message)+'</div>'})}
function _admSelect(f,live){
  if(f==='aktif')return live.filter(o=>o.status==='baru'||o.status==='processing');
  if(f==='all')return live;
  return live.filter(o=>o.status===f);
}
function _admOrderRow(o,idx){
  const isCod=o.delivery!=='pickup';
  const cl=_admClaims[o.id];
  const stCol=o.status==='done'?'#101A16':o.status==='processing'?'#8A5A00':'#C6381E';
  return '<div class="o-row'+(o.status==='done'?' is-done':'')+(o.status==='deleted'?' is-gone':'')+'" onclick="admOpenDetail(\''+o.id+'\')">'
   +'<div class="o-main"><span class="o-rail" style="background:'+stCol+'"></span>'
   +(o.no!=null
      ?'<span class="o-num">#'+fmtNo(o.no)+'</span>'
      :'<span class="o-num legacy">'+(o.createdAt&&o.createdAt.toDate?o.createdAt.toDate().toLocaleTimeString('ms-MY',{hour:'2-digit',minute:'2-digit'}):'•')+'</span>')
   +'<span class="o-nm">'+esc(o.name||'')+'</span>'
   +(isCod&&o.room?'<span class="o-where">🏠 '+esc(o.room)+'</span>':'<span class="o-where muted">🏪 Ambil sendiri</span>')
   +(cl?'<button class="'+clamCls(o.id)+'" data-claim="'+o.id+'" onclick="event.stopPropagation();admViewClaim(\''+o.id+'\')" title="Lihat resit bayaran pelanggan">📎 Resit</button>':'')
   +'<span class="o-money">RM'+Number(o.total||0).toFixed(2)+'</span></div>'
   +'<div class="o-ctrls" onclick="event.stopPropagation()">'
   +(o.status==='deleted'
     ?'<button class="o-restore" onclick="admRestore(\''+o.id+'\')">↩ Pulihkan pesanan ini</button>'
      +'<span class="o-note">dipadam'+(o.prevStatus?' · asalnya '+(o.prevStatus==='done'?'Siap':o.prevStatus==='processing'?'Proses':'Baru'):'')+'</span>'
     :'<div class="o-step">'+[['baru','Baru'],['processing','Proses'],['done','Siap']].map(function(x){return '<button class="'+(o.status===x[0]?'on':'')+'" onclick="admUpdOrder(\''+o.id+'\',\''+x[0]+'\')">'+x[1]+'</button>'}).join('')+'</div>'
      +'<button class="o-del" onclick="event.stopPropagation();admDelOrder(\''+o.id+'\')" title="Padam pesanan ini"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>')
   +'<span class="o-more">›</span></div></div>';
}
// One place decides a drink's emoji, so the panel the seller reads and the
// receipt the customer sees agree on what a Milo looks like.
function drinkEmoji(n){
  n=String(n||'');
  if(n.includes('Milo'))return '🥤';
  if(n.includes('Extrajoss'))return '🍹';
  if(n.includes('Indocafe'))return '☕';
  if(n.includes('Chocolate'))return '🍫';
  if(n.includes('Horlicks'))return '🥛';
  if(n.includes('Hazelnut'))return '🌰';
  if(n.includes('Mocha'))return '🍵';
  return '🧋';
}
function admOpenDetail(id){
  const o=_admVisDocs.find(function(x){return x.id===id});
  const box=document.getElementById('adm-detail');
  if(!o||!box)return;
  box._id=id;
  const isCod=o.delivery!=='pickup';
  const cl=_admClaims[id];
  const dt=o.createdAt&&o.createdAt.toDate?o.createdAt.toDate():null;
  const when=dt?dt.toLocaleString('ms-MY',{hour:'2-digit',minute:'2-digit'})+(timeAgo(dt)?' · '+timeAgo(dt):''):'';
  const items=(o.items||[]).map(function(i){
    const addChips=(i.adds&&i.adds.length)
      ?'<div class="d-adds">'+i.adds.map(function(a){return '<span class="d-add">'+esc(a)+'</span>'}).join('')+'</div>'
      :'';
    const line=Number(i.price||0)*Number(i.qty||1);
    return '<div class="d-it">'
      +'<span class="d-q">'+i.qty+'&times;</span>'
      +'<div><div class="d-nm"><i>'+drinkEmoji(i.name)+'</i>'+esc(i.name)+'</div>'+addChips+'</div>'
      +'<span class="d-line">RM'+line.toFixed(2)+'</span>'
      +'</div>';
  }).join('');
  box.innerHTML='<div class="d-bg" onclick="closeDetail()"></div><div class="d-box">'
   +'<div class="d-hd"><span class="d-t">#'+(o.no!=null?fmtNo(o.no):'')+' '+esc(o.name||'')+'</span><button onclick="closeDetail()">✕</button></div>'
   +(when?'<div class="d-when">'+when+'</div>':'')
   +'<div class="o-step big">'+[['baru','Baru'],['processing','Proses'],['done','Siap']].map(function(x){return '<button class="'+(o.status===x[0]?'on':'')+'" onclick="admUpdOrder(\''+o.id+'\',\''+x[0]+'\')">'+x[1]+'</button>'}).join('')+'</div>'
   +'<div class="d-sec">Minuman</div><div class="d-items">'+items+'</div>'
   +'<div class="d-sec">Butiran</div>'
   +'<div class="d-grid">'
   +'<div><span>Masa</span><b>'+(noTime(o.time)?'<span style="color:#8A5A00">Tiada masa dinyatakan</span>':esc(o.time))+'</b></div>'
   +'<div><span>Bayar</span><b>'+(o.payment==='coupon'?'\u{1F39F}\uFE0F Kupon':o.payment==='cash'?'\u{1F4B5} Tunai':'\u{1F4F1} QR Pay')+'</b></div>'
   +'<div><span>Hantar</span><b>'+(isCod?'📦 COD':'🏪 Ambil sendiri')+'</b></div>'
   +(isCod&&o.room?'<div><span>Lokasi</span><b>🏠 '+esc(o.room)+'</b></div>':'')
   +'<div><span>Nama</span><b>'+esc(o.name||'-')+'</b></div>'+(o.phone?'<div><span>Kad setia</span><b id="d-loy">-</b></div>':'')
   +(o.phone?'<div><span>WhatsApp</span><b>'+esc(o.phone)+'</b></div>':'')
   +'</div>'
   +'<div class="d-total"><span>Jumlah</span><b>RM'+Number(o.total||0).toFixed(2)+'</b></div>'+(o.payment==='coupon'?'<div id="d-cpn-audit" style="font-size:12.5px;font-weight:700;line-height:1.5;margin:10px 0">Menyemak kupon...</div>':'')
   +(cl?'<div class="d-claim"><div>📎 Pelanggan hantar resit bayaran'+(cl.at&&cl.at.toDate?' · '+cl.at.toDate().toLocaleTimeString('ms-MY',{hour:'2-digit',minute:'2-digit'}):'')+'</div><button onclick="admViewClaim(\''+o.id+'\')">Lihat resit</button></div>':'')
   +'<div class="d-acts">'
   +(o.phone?'<button class="d-wa" onclick="admWaNotif(\''+o.id+'\')">📤 WhatsApp pelanggan</button>':'<button class="d-wa" onclick="admWaNotif(\''+o.id+'\')">📱 Simpan nombor &amp; maklumkan</button>')
   +'<button class="d-alt" onclick="maybeMintCoupon(\''+o.id+'\')">Kira kad setia</button>'+'<button class="d-del" onclick="admDelOrder(\''+o.id+'\');closeDetail()">🗑 Padam</button>'
   +'</div></div>';
  box.style.display='flex';
  if(o.phone)loadLoyalty('d-loy',o.phone);
  if(o.payment==='coupon')checkCouponBurn(o);
}
// The same count the mint uses: orders this number has completed, minus the
// free ones. Read from Firestore so it cannot disagree with the mint.
// Rules can check that a coupon is live when the order is written, but they
// cannot prove the burn happened in the same commit. This is how a seller sees
// the difference: the coupon must be used, and used for THIS order.
async function checkCouponBurn(o){
  const el=document.getElementById('d-cpn-audit');if(!el)return;
  const db=getDb();if(!db||!isAdmin()||!o.coupon)return;
  try{
    const s=await db.collection('coupons').doc(o.coupon).get();
    if(!s.exists){el.textContent='Kupon '+o.coupon+' tidak dijumpai';el.style.color='#C6381E';return}
    const d=s.data()||{};
    if(d.used===true&&d.ord===o.id){el.textContent='Kupon '+o.coupon+' sudah dibakar untuk pesanan ini';el.style.color='#101A16'}
    else{el.textContent='Amaran: kupon '+o.coupon+' tidak dibakar untuk pesanan ini. Jangan lepaskan minuman percuma.';el.style.color='#C6381E'}
  }catch(e){el.textContent='Kupon tidak dapat disemak';el.style.color='#8A5A00'}
}
async function loadLoyalty(elId,ph){
  const db=getDb();if(!db||!isAdmin())return;
  const el=document.getElementById(elId);if(!el)return;
  try{
    const q=await db.collection('orders').where('phone','==',String(ph==null?'':ph).trim()).limit(1000).get();
    const n=q.docs.filter(function(x){const v=x.data()||{};return v.status==='done'&&!v.free}).length;
    el.textContent=n+'/5'+(n>0&&n%5===0?' · kupon sedia':'');
    el.style.color=(n>0&&n%5===0)?'#101A16':'#101A16';
  }catch(e){console.warn('kad setia:',e)}
}
function closeDetail(){const b=document.getElementById('adm-detail');if(b){b.style.display='none';b._id=null}}
function admRefreshDetail(){
  const b=document.getElementById('adm-detail');
  if(b&&b.style.display!=='none'&&b._id)admOpenDetail(b._id);
}
function _admRenderOrders(pg,docs){
  const f=_admFilter;
  const live=docs.filter(o=>o.status!=='deleted');
  const gone=docs.filter(o=>o.status==='deleted');
  let filtered=_admSelect(f,(f==='deleted'?gone:live));
  const hasCod=function(o){return o.delivery!=='pickup'};
  const nStatus=filtered.length;
  const nCod=filtered.filter(hasCod).length,nPick=nStatus-nCod;
  if(_admDelFilter!=='all')filtered=filtered.filter(function(o){return (_admDelFilter==='cod')===hasCod(o)});
  const nReceipt=filtered.filter(function(o){return !!_admClaims[o.id]}).length;
  // "perlu semak" is allowed to mean what it says: receipts you have not opened.
  const nUnseen=filtered.filter(function(o){return _admClaims[o.id]&&!_seenClaims[o.id]}).length;
  if(_admClaimOnly)filtered=filtered.filter(function(o){return !!_admClaims[o.id]});
  // The chip counts are taken here, before the typed name narrows anything, so
  // the numbers do not collapse as a search is typed.
  const blockPool=filtered;
  // Whether the search box holds the caret right now. The rows are rebuilt from
  // scratch below, which throws the input away, so this has to be remembered
  // before that happens or typing can only ever be one character long.
  const hadSearchFocus=!!(document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('a-search'));
  if(_admSearch&&(f==='done'||f==='all')){
    const q=_admSearch.toLowerCase();
    filtered=filtered.filter(o=>(o.name||'').toLowerCase().includes(q)||(o.room||'').toLowerCase().includes(q));
  }
  if(_admBlockFilter)filtered=filtered.filter(function(o){return blockOf(o)===_admBlockFilter});
  _admVisDocs=filtered;_admOrdersCache=docs;
  const nB=live.filter(o=>o.status==='baru').length,nP=live.filter(o=>o.status==='processing').length,nD=live.filter(o=>o.status==='done').length;
  const segs=[['aktif','Aktif',nB+nP],['baru','Baru',nB],['processing','Proses',nP],['done','Siap',nD],['all','Semua',live.length]];
  if(gone.length)segs.push(['deleted','🗑 Dipadam',gone.length]);

  const now=new Date(),todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()),weekStart=new Date(todayStart);
  weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  const sum=(start)=>{
    const m=live.filter(o=>{const t=o.createdAt&&o.createdAt.toDate?o.createdAt.toDate():null;return t&&t>=start});
    return{n:m.length,v:m.reduce((s,o)=>s+Number(o.total||0),0)};
  };
  const T=sum(todayStart),W=sum(weekStart);
  const unpaid=live.filter(function(o){return !o.paid&&o.status!=='done'}).length;

  const dsegs=[['all','Semua',nStatus],['cod','📦 COD',nCod],['pickup','🏪 Ambil',nPick]];
  let h='<div class="a-bar"><div class="a-seg">'+segs.map(x=>'<button class="'+(f===x[0]?'on':'')+'" onclick="admSetFilter(\''+x[0]+'\')">'+x[1]+'<span class="c">'+x[2]+'</span></button>').join('')+'</div>'
   +'<div class="a-seg del"><span class="dlb">Hantar</span>'+dsegs.map(x=>'<button class="'+(_admDelFilter===x[0]?'on':'')+'" onclick="admSetDelFilter(\''+x[0]+'\')">'+x[1]+'<span class="c">'+x[2]+'</span></button>').join('')+'</div>'
   +(nReceipt?'<button class="a-receipt'+(nReceipt&&_admClaimOnly?' on':'')+'" onclick="admClaimFilter()" title="Tunjuk pesanan yang ada resit">📎 Resit<span class="c">'+nReceipt+'</span></button>':'')
   +'<div class="sum">'
   +'<span>'+(T.n?'Malam ini <b>'+T.n+'</b> · <b>RM'+T.v.toFixed(2)+'</b>':'Belum ada pesanan malam ini')+'</span>'
   +(W.n?'<span>Minggu ini <i>'+W.n+'</i> · <i>RM'+W.v.toFixed(2)+'</i></span>':'')
   +(unpaid?'<span class="warnText">'+unpaid+' belum bayar</span>':'')
   +(nUnseen&&!_admClaimOnly?'<span class="warnText">📎 '+nUnseen+' resit perlu semak</span>':'')
   +'</div></div>';

  if(f==='done'||f==='all')h+='<input class="a-search" placeholder="🔍 Cari nama atau blok..." value="'+esc(_admSearch)+'" oninput="admDoSearch(this.value)" onfocus="admOpenBlocks()" onclick="admOpenBlocks()">'+blockBarHtml(blockPool);
  if(f==='deleted'&&filtered.length)h+='<div class="a-bulk"><button onclick="admRestoreAll()">↩ Pulihkan semua ('+filtered.length+')</button></div>';
  if(f==='aktif'&&filtered.length)h+='<div class="a-bulk"><button onclick="admBulkDone()">✅ Tandakan semua siap ('+filtered.length+')</button></div>';
  if((f==='done'||f==='all')&&filtered.some(function(o){return o.status==='done'}))h+='<div class="a-bulk"><button class="danger" onclick="admBulkDelDone()">🗑 Padam yang sudah siap ('+filtered.filter(function(o){return o.status==='done'}).length+')</button></div>';

  if(!filtered.length){
    h+='<div class="a-empty"><span class="big">'+(f==='aktif'||f==='baru'||f==='processing'?'🎉':'📭')+'</span>'
      +(f==='aktif'?'Semua pesanan sudah siap. Rehat sebentar.':
        f==='all'?((_admSearch||_admBlockFilter)?'Tiada pesanan padan dengan tapisan ini.':'Tiada pesanan langsung.'):
        f==='done'?'Tiada pesanan selesai.':
        'Tiada pesanan untuk status ini.')+'</div>';
    pg.innerHTML=h;admRefocusSearch(pg,hadSearchFocus);return;
  }
  h+=filtered.map(_admOrderRow).join('');
  h+='<div class="o-foot">'+filtered.length+' pesanan</div>';
  pg.innerHTML=h;
  admRefocusSearch(pg,hadSearchFocus);
  admRefreshDetail();
  admFulfilPending();
  admApplyFold();
}
function admClaimFilter(){_admClaimOnly=!_admClaimOnly;const pg=document.getElementById('adm-pg');if(pg)_admRenderOrders(pg,_admOrdersCache||[])}
function admSetDelFilter(d){_admDelFilter=d;const pg=document.getElementById('adm-pg');if(pg)_admRenderOrders(pg,_admOrdersCache||[])}
function admSetFilter(f){_admFilter=f;if(f==='done')_admSearch='';const pg=document.getElementById('adm-pg');if(admUnsub){admUnsub();admUnsub=null}const db=getDb();if(!db||!isAdmin())return;admUnsub=ordersQ(db).onSnapshot(snap=>{const docs=snap.docs.map(d=>({id:d.id,...d.data()}));_admOrdersCache=docs;if(admTab!=='orders')return;_admRenderOrders(pg,docs)})}
function admNote(html){const box=document.getElementById('adm-confirm');if(!box)return;box.innerHTML='<div class="c-bg" onclick="admConfirmClose()"></div><div class="c-box">'+html+'<div class="c-row"><button class="c-no" onclick="admConfirmClose()">Tutup</button></div></div>';box.style.display='flex'}
async function maybeMintCoupon(orderId,silent){
  const db=getDb();if(!db||!isAdmin())return;
  try{
    const o=await db.collection('orders').doc(orderId).get();
    if(!o.exists)return;
    const d=o.data()||{};
    if(d.free)return;
    const ph=String(d.phone==null?'':d.phone).trim();
    const dev=String(d.dev==null?'':d.dev).trim();
    if(!ph&&!dev){
      if(!silent)admNote('<div style="font-family:var(--fd);font-weight:800;font-size:18px;color:#8A5A00;margin-bottom:8px">Tiada pengenalan pelanggan</div><div style="font-size:14px;color:#6B7A73;line-height:1.6">Pesanan ini tiada nombor dan tiada id peranti, jadi kad setia tidak dapat dikira.</div>');
      return;
    }
    const q=dev?await db.collection('orders').where('dev','==',dev).limit(1000).get():await db.collection('orders').where('phone','==',ph).limit(1000).get();
    const n=q.docs.filter(function(x){const v=x.data()||{};return v.status==='done'&&!v.free}).length;
    if(n<1)return;
    const due=Math.floor(n/5);
    const idKey=(dev||ph.replace(/\D/g,'')||ph);
    const mRef=db.collection('milestones').doc(idKey);
    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code='',awarded=0;
    await db.runTransaction(async function(tx){
      code='';awarded=0;
      const ms=await tx.get(mRef);
      const last=ms.exists?Number((ms.data()||{}).last||0):0;
      if(due<=last)return;
      let tries=0;
      do{code='';for(let i=0;i<8;i++)code+=A[Math.floor(Math.random()*A.length)];tries++}
      while(tries<5&&(await tx.get(db.collection('coupons').doc(code))).exists);
      if((await tx.get(db.collection('coupons').doc(code))).exists){code='';return}
      tx.set(db.collection('coupons').doc(code),{used:false,at:firebase.firestore.FieldValue.serverTimestamp(),exp:new Date(Date.now()+30*86400000),ord:orderId,earnedBy:orderId,by:due*5});
      tx.set(mRef,{last:due,code:code,n:n,at:firebase.firestore.FieldValue.serverTimestamp()});
      awarded=due-last;
    });
    if(!code){if(!silent)toast('\u2B50 Kad setia: '+(n%5)+'/5');return}
    try{await db.collection('tracking').doc(orderId).update({coupon:code,couponExp:new Date(Date.now()+30*86400000)})}catch(e){console.warn('kupon tracking:',e)}
    admNote('<div style="font-family:var(--fd);font-weight:800;font-size:21px;color:#101A16;margin-bottom:10px">Kupon · kad setia '+(due*5)+'/5 &#127903;</div>'+'<div style="font-size:14px;color:#6B7A73;line-height:1.6;margin-bottom:14px">'+(awarded>1?('Pelanggan ini layak '+awarded+' kupon. Satu kod di bawah, beri kod seterusnya selepas ini digunakan.'):'Pelanggan ini sudah lengkap '+(due*5)+' pesanan. Beri kod ini kepadanya: satu minuman percuma, sah 30 hari.')+'</div>'+'<div style="font-family:var(--fd);font-weight:800;font-size:30px;letter-spacing:3px;color:#101A16;text-align:center;background:rgba(16,26,22,0.1);border:1px dashed rgba(16,26,22,0.5);border-radius:12px;padding:14px;margin-bottom:14px">'+code+'</div>'+'<div style="font-size:13px;color:#6B7A73;line-height:1.5">Hantar melalui WhatsApp pesanan ini, atau salin kod di atas.</div>');
  }catch(e){console.warn('kupon gagal:',e)}
}
function admUpdOrder(id,status){const db=getDb();if(!db)return;db.collection('orders').doc(id).update({status}).then(function(){if(status==='done')maybeMintCoupon(id)}).catch(e=>console.warn(e));db.collection('tracking').doc(id).update({status:status,at:firebase.firestore.FieldValue.serverTimestamp()}).catch(function(){})}
function admDelOrder(id){
  const o=_admVisDocs.find(function(x){return x.id===id});
  const prev=o?(o.status||'baru'):'baru';
  const who=o&&o.name?('"'+o.name+'"'):'ini';
  const db=getDb();if(!db){toast('Tiada sambungan');return}
  admConfirm('Padam pesanan '+who+'?','Ya, padam',function(){
    db.collection('orders').doc(id).update({status:'deleted',deletedAt:firebase.firestore.FieldValue.serverTimestamp(),prevStatus:prev})
     .then(function(){
      toastAction('Pesanan dipadam','Buang',function(){
        db.collection('orders').doc(id).update({status:prev}).catch(function(){});
        toast('Pesanan dikembalikan');
      });
     })
     .catch(function(){toast('Gagal padam - cuba lagi')});
  });
}

// Clear out everything already finished. Soft delete, so undo restores the
// exact status each order had rather than guessing.
function admRestore(id){
  const db=getDb();if(!db){toast('Tiada sambungan');return}
  const o=(_admOrdersCache||[]).find(function(x){return x.id===id})||{};
  db.collection('orders').doc(id).update({
    status:o.prevStatus||'done',
    deletedAt:firebase.firestore.FieldValue.delete(),
    prevStatus:firebase.firestore.FieldValue.delete()
  }).then(function(){toast('↩ Pesanan dipulihkan')})
   .catch(function(){toast('Gagal pulihkan')});
}
function admRestoreAll(){
  const del=(_admOrdersCache||[]).filter(function(o){return o.status==='deleted'});
  if(!del.length){toast('Tiada pesanan dipadam');return}
  admConfirm('Pulihkan '+del.length+' pesanan?','Ya, pulihkan',function(){
    const db=getDb();if(!db)return;
    Promise.all(del.map(function(o){
      return db.collection('orders').doc(o.id).update({
        status:o.prevStatus||'done',
        deletedAt:firebase.firestore.FieldValue.delete(),
        prevStatus:firebase.firestore.FieldValue.delete()
      }).catch(function(){});
    })).then(function(){toast('↩ '+del.length+' pesanan dipulihkan')});
  });
}
function admBulkDelDone(){
  const done=_admVisDocs.filter(function(o){return o.status==='done'});
  if(!done.length){toast('Tiada pesanan siap dipadam');return}
  const db=getDb();if(!db){toast('Tiada sambungan');return}
  admConfirm('Padam '+done.length+' pesanan yang sudah siap?','Ya, padam semua',function(){
    const prev=done.map(function(o){return {id:o.id,status:o.status}});
    Promise.all(done.map(function(o){
      return db.collection('orders').doc(o.id).update({status:'deleted',deletedAt:firebase.firestore.FieldValue.serverTimestamp(),prevStatus:o.status}).catch(function(){});
    })).then(function(){
      toastAction(done.length+' pesanan siap dipadam','Buang',function(){
        prev.forEach(function(p){db.collection('orders').doc(p.id).update({status:p.status}).catch(function(){})});
        toast(prev.length+' pesanan dikembalikan');
      });
    });
  });
}
// ---------------------------------------------------------------------------
// Blocks in the order list.
//
// There is no block field on an order: the seller's block list is glued onto
// the room string at checkout ("Kristal B" + "11" -> "Kristal B 11"). So the
// block is recovered by matching the configured names, longest match winning so
// that "Kristal B" cannot be mistaken for a shorter prefix. A free-typed block
// ("Lain lain") falls back to everything before the trailing room number.
// ---------------------------------------------------------------------------
function blockOf(o){
  const room=String((o&&o.room)||'').trim();
  if(!room)return '';
  let best='';
  for(let i=0;i<BLOCKS.length;i++){
    const b=BLOCKS[i];
    if(!b)continue;
    if(room===b||room.indexOf(b+' ')===0){if(b.length>best.length)best=b}
  }
  if(best)return best;
  const m=room.match(/^(.*?)\s+\S+$/);
  return (m?m[1]:room).slice(0,30);
}
// The row is built from blockPool, the list captured before the typed name was
// applied, so the counts describe the view rather than the search.
function blockBarHtml(pool){
  const counts={};
  (pool||[]).forEach(function(o){const b=blockOf(o);if(b)counts[b]=(counts[b]||0)+1});
  _blkNames=Object.keys(counts);
  // An active block is always offered back, even at zero, or narrowing to a
  // block whose orders all finished would leave no chip left to clear it with.
  if(_admBlockFilter&&_blkNames.indexOf(_admBlockFilter)<0)_blkNames.push(_admBlockFilter);
  if(!_blkNames.length)return '';
  _blkNames.sort(function(a,b){const ia=BLOCKS.indexOf(a),ib=BLOCKS.indexOf(b);if(ia<0&&ib<0)return a.localeCompare(b);if(ia<0)return 1;if(ib<0)return -1;return ia-ib});
  return '<div class="a-blocks" id="adm-blocks" style="display:'+((_blkOpen||_admBlockFilter)?'flex':'none')+'">'
    +'<button class="blk'+(!_admBlockFilter?' on':'')+'" onclick="admPickBlock(-1)">Semua<span class="c">'+(pool||[]).length+'</span></button>'
    // Chips carry an index, never the block name, so a name with an apostrophe
    // in it cannot break out of the handler.
    +_blkNames.map(function(b,i){
      return '<button class="blk'+(_admBlockFilter===b?' on':'')+'" onclick="admPickBlock('+i+')">'+esc(b)+'<span class="c">'+(counts[b]||0)+'</span></button>'
    }).join('')
    +'</div>';
}
function admPickBlock(i){
  _admBlockFilter=i<0?'':(_blkNames[i]||'');
  _blkOpen=true;
  const pg=document.getElementById('adm-pg');
  if(pg)_admRenderOrders(pg,_admOrdersCache||[]);
}
function admOpenBlocks(){
  _blkOpen=true;
  const b=document.getElementById('adm-blocks');
  if(b)b.style.display='flex';
}
function admCloseBlocks(){
  if(!_blkOpen)return;
  _blkOpen=false;
  // An active block holds the row open. Hiding it would leave the list narrowed
  // with nothing on screen explaining why, or offering a way back out.
  if(_admBlockFilter)return;
  const b=document.getElementById('adm-blocks');
  if(b)b.style.display='none';
}
// The list is rebuilt from innerHTML on every keystroke, which discards the
// input element and with it the caret. Without this, a search is one character
// long and the second key lands on the page.
function admRefocusSearch(pg,had){
  if(!had)return;
  const si=pg.querySelector('input.a-search');
  if(!si)return;
  si.focus();
  try{si.setSelectionRange(si.value.length,si.value.length)}catch(e){}
}
function admDoSearch(v){
  _admSearch=v;
  // Re-render from the documents the listener already delivered. Rebuilding the
  // listener on every keystroke was slow, and its fresh snapshot then arrived
  // after the next character had already been typed.
  const pg=document.getElementById('adm-pg');
  if(pg)_admRenderOrders(pg,_admOrdersCache||[]);
}
function admBulkDone(){if(!_admVisDocs.length)return;admConfirm('Tandakan semua '+_admVisDocs.length+' sebagai Siap?','Ya, tandakan',function(){const db=getDb();if(!db)return;_admVisDocs.forEach(function(o){db.collection('orders').doc(o.id).update({status:'done'}).catch(function(){});db.collection('tracking').doc(o.id).update({status:'done',at:firebase.firestore.FieldValue.serverTimestamp()}).catch(function(){})});toast('✓ '+_admVisDocs.length+' pesanan ditandakan siap');const _ids=_admVisDocs.map(function(o){return o.id});(async function(){for(let i=0;i<_ids.length;i++){try{await maybeMintCoupon(_ids[i],true)}catch(e){}}})()})}
function admWaNotif(id){
  const o=_admVisDocs.find(x=>x.id===id);if(!o)return;
  const st=o.status||'baru';
  const msg='Hi '+o.name+', pesanan anda '+orderRef(o)+' '+admStatusText(st,o.delivery!=='pickup')+' - MINUM MALAM SISWA';
  const go=function(num){window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank')};
  const num=waNum(o.phone);
  if(num){go(num);return}
  const v=prompt('Nombor WhatsApp pelanggan (cth 0123456789)\n\nKita akan simpan untuk pesanan ini supaya anda boleh maklumkan sekali klik.')
  if(!v)return;
  const n2=waNum(v);
  if(!n2){toast('Nombor tidak sah');return}
  const db=getDb();
  if(db)db.collection('orders').doc(id).update({phone:v.trim()}).catch(function(){});
  setTimeout(function(){go(n2)},350)
}
let _aei=null,_aec=0;
function admMenu(pg){_aei=null;_aec=0;let h='<div style="max-width:700px">';(MENU||[]).forEach((cat,ci)=>{cat.items.forEach((v,i)=>{const id='c'+ci+'v'+i;const d=isDis(id);const last=i===cat.items.length-1;if(i===0&&cat.name)h+='<div class="a-sec">'+esc(cat.name)+'</div>';h+='<div class="a-row" style="'+(d?'opacity:0.4':'')+'"><span class="n" style="'+(d?'text-decoration:line-through':'')+'">'+(v.pop?'🔥 ':'')+esc(v.name)+'</span><span class="p">RM'+(Number(v.price)||0).toFixed(2)+'</span><div class="b"><button style="background:rgba(16,26,22,0.05);color:#6B7A73'+(i===0?';opacity:0.3':'')+'" onclick="admMoveMI('+ci+','+i+',-1)"'+(i===0?' disabled':'')+'>▲</button><button style="background:rgba(16,26,22,0.05);color:#6B7A73'+(last?';opacity:0.3':'')+'" onclick="admMoveMI('+ci+','+i+',1)"'+(last?' disabled':'')+'>▼</button><button style="background:'+(d?'rgba(198,56,30,0.15)':'rgba(16,26,22,0.1)')+';color:'+(d?'#C6381E':'#101A16')+'" onclick="togDis(\''+id+'\');admMenu(document.getElementById(\'adm-pg\'))">'+(d?'✕':'✓')+'</button><button style="background:rgba(16,26,22,0.1);color:#101A16" onclick="admEditMI('+ci+','+i+')">✎</button><button style="background:rgba(198,56,30,0.1);color:#C6381E" onclick="admDelMI('+ci+','+i+')">✕</button></div></div>'})});h+='</div><div class="a-form"><div class="row"><input class="inp" id="am-name" placeholder="Nama minuman" style="flex:1"><input class="inp" id="am-price" placeholder="Harga" type="number" step="0.10" style="max-width:90px"></div><div class="row"><input class="inp" id="am-img" placeholder="URL gambar (pilihan)" style="flex:1"></div><label style="display:flex;align-items:center;gap:6px;font-size:14px;color:#6B7A73;font-weight:700;margin-bottom:14px"><input type="checkbox" id="am-pop"> Popular</label><div style="display:flex;gap:8px"><button onclick="admSaveMI()" id="am-save" style="flex:1;background:#101A16;color:#F7FAF5;border:none;font-family:var(--fd);font-weight:800;font-size:15px;padding:12px;border-radius:10px;cursor:pointer">➕ Tambah</button><button onclick="admCancelMI()" id="am-cancel" style="display:none;background:rgba(16,26,22,0.08);color:#6B7A73;border:none;font-size:14px;padding:12px;border-radius:10px;cursor:pointer">Batal</button></div></div>';pg.innerHTML=h}
function admEditMI(ci,i){const v=MENU[ci]&&MENU[ci].items[i];if(!v)return;_aei=i;_aec=ci;document.getElementById('am-name').value=v.name;document.getElementById('am-price').value=v.price;document.getElementById('am-pop').checked=v.pop||false;document.getElementById('am-img').value=v.img||'';document.getElementById('am-save').textContent='💾 Simpan';document.getElementById('am-cancel').style.display='block'}
function admDelMI(ci,i){const cat=MENU[ci];if(!cat||!cat.items[i])return;if(!confirm('Padam "'+cat.items[i].name+'"?'))return;cat.items.splice(i,1);admMenu(document.getElementById('adm-pg'));saveMenu();toast('✓ Dipadam')}
function admSaveMI(){const n=document.getElementById('am-name').value.trim(),p=parseFloat(document.getElementById('am-price').value);if(!n){toast('⚠ Nama');return}if(!p||p<=0){toast('⚠ Harga');return}const item={name:n,price:p,pop:document.getElementById('am-pop').checked};const _img=document.getElementById('am-img').value.trim();if(_img)item.img=_img;const cat=MENU[_aec]||MENU[0];if(!cat)return;if(_aei!==null&&cat.items[_aei])cat.items[_aei]=item;else cat.items.push(item);_aei=null;admMenu(document.getElementById('adm-pg'));saveMenu();toast('✓ Disimpan')}
function admCancelMI(){_aei=null;admMenu(document.getElementById('adm-pg'))}
function admMoveMI(ci,i,dir){const cat=MENU[ci];if(!cat)return;const items=cat.items;const j=i+dir;if(j<0||j>=items.length)return;[items[i],items[j]]=[items[j],items[i]];admMenu(document.getElementById('adm-pg'));saveMenu()}
let _eai=null,_eag='s';
function admAddons(pg){_eai=null;_eag='s';const gs=[{k:'s',l:'🍬 Pemanis',items:[]},{k:'l',l:'🌿 Level',items:[]},{k:'e',l:'➕ Extra',items:[]}];ADDS.forEach((a,i)=>{const g=gs.find(x=>x.k===a.grp);if(g)g.items.push({...a,idx:i})});let h='';gs.forEach(g=>{if(!g.items.length)return;h+='<div class="a-sec">'+g.l+'</div>';g.items.forEach(a=>{const dis=disAdds.includes(a.id);h+='<div class="a-row" style="'+(dis?'opacity:0.4':'')+'"><span class="n" style="'+(dis?'text-decoration:line-through':'')+'">'+esc(a.name)+'</span><span class="p">'+(a.price>0?'RM'+a.price.toFixed(2):'Free')+'</span><div class="b"><button style="background:'+(dis?'rgba(198,56,30,0.15)':'rgba(16,26,22,0.1)')+';color:'+(dis?'#C6381E':'#101A16')+'" onclick="admTogDis(\''+a.id+'\')">'+(dis?'✕':'✓')+'</button><button style="background:rgba(16,26,22,0.1);color:#101A16" onclick="admEditAI('+a.idx+')">✎</button><button style="background:rgba(198,56,30,0.1);color:#C6381E" onclick="admDelAI('+a.idx+')">✕</button></div></div>'})});h+='<div class="a-form"><div class="row"><input class="inp" id="aa-name" placeholder="Nama" style="flex:1"><input class="inp" id="aa-price" placeholder="Harga" type="number" step="0.10" style="max-width:90px"></div><div class="chips"><button class="a-chip'+(_eag==='s'?' on':'')+'" onclick="admPickG(this,\'s\')">🍬 Pemanis</button><button class="a-chip'+(_eag==='l'?' on':'')+'" onclick="admPickG(this,\'l\')">🌿 Level</button><button class="a-chip'+(_eag==='e'?' on':'')+'" onclick="admPickG(this,\'e\')">➕ Extra</button></div><div style="display:flex;gap:8px"><button onclick="admSaveAI()" id="aa-save" style="flex:1;background:#101A16;color:#F7FAF5;border:none;font-family:var(--fd);font-weight:800;font-size:15px;padding:12px;border-radius:10px;cursor:pointer">➕ Tambah</button><button onclick="admCancelAI()" id="aa-cancel" style="display:none;background:rgba(16,26,22,0.08);color:#6B7A73;border:none;font-size:14px;padding:12px;border-radius:10px;cursor:pointer">Batal</button></div></div>';pg.innerHTML=h}
function admPickG(el,g){_eag=g;el.closest('.chips').querySelectorAll('.a-chip').forEach(c=>c.classList.remove('on'));el.classList.add('on')}
function admTogDis(id){if(disAdds.includes(id))disAdds=disAdds.filter(x=>x!==id);else disAdds.push(id);saveConfig();admAddons(document.getElementById('adm-pg'))}
function admEditAI(i){const a=ADDS[i];_eai=i;_eag=a.grp;document.getElementById('aa-name').value=a.name;document.getElementById('aa-price').value=a.price||'';document.getElementById('aa-save').textContent='💾 Simpan';document.getElementById('aa-cancel').style.display='block';document.querySelectorAll('.a-chip').forEach(c=>{c.classList.toggle('on',c.textContent.includes({s:'Pemanis',l:'Level',e:'Extra'}[a.grp]))})}
function admDelAI(i){if(!confirm('Padam "'+ADDS[i].name+'"?'))return;ADDS.splice(i,1);saveConfig();admAddons(document.getElementById('adm-pg'));toast('✓ Dipadam')}
function admSaveAI(){const n=document.getElementById('aa-name').value.trim(),p=parseFloat(document.getElementById('aa-price').value)||0;if(!n){toast('⚠ Nama');return}const id=n.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'addon_'+Date.now();if(_eai!==null){ADDS[_eai]={...ADDS[_eai],name:n,price:p,grp:_eag}}else{if(ADDS.some(x=>x.id===id)){toast('⚠ Nama ini sudah ada - guna nama lain');return}ADDS.push({id,name:n,price:p,grp:_eag})}_eai=null;saveConfig();admAddons(document.getElementById('adm-pg'));toast('✓ Disimpan')}
function admCancelAI(){_eai=null;admAddons(document.getElementById('adm-pg'))}
function admSchedule(pg){let h='<div style="max-width:500px">';SLOTS.forEach((s,i)=>{h+='<div class="a-row"><span class="n">⏰ '+esc(s)+'</span><div class="b"><button style="background:rgba(198,56,30,0.1);color:#C6381E" onclick="admDelSI('+i+')">✕</button></div></div>'});h+='</div><div class="a-form" style="max-width:500px"><div class="row"><input class="inp" id="as-name" placeholder="cth: 2:30AM" style="flex:1"><button onclick="admAddSI()" style="background:#101A16;color:#F7FAF5;border:none;font-family:var(--fd);font-weight:800;font-size:15px;padding:10px 18px;border-radius:10px;cursor:pointer;flex-shrink:0">➕</button></div></div>';pg.innerHTML=h}
function admAddSI(){const n=document.getElementById('as-name').value.trim().toUpperCase();if(!n){toast('⚠ Masa');return}if(SLOTS.includes(n)){toast('❌ Sudah ada');return}SLOTS.push(n);saveConfig();admSchedule(document.getElementById('adm-pg'));toast('✓ Ditambah')}
function admDelSI(i){if(!confirm('Padam "'+SLOTS[i]+'"?'))return;SLOTS.splice(i,1);saveConfig();admSchedule(document.getElementById('adm-pg'));toast('✓ Dipadam')}
function admDelivery(pg){let h='<div class="a-sec">🚗 Delivery Methods</div><div style="max-width:500px">';DELS.forEach((d,i)=>{h+='<div class="a-row"><span class="n">'+esc(d.l)+'</span><div class="b"><button style="background:rgba(198,56,30,0.1);color:#C6381E" onclick="admDelDI('+i+')">✕</button></div></div>'});h+='</div><div class="a-form" style="max-width:500px"><div class="row"><input class="inp" id="ad-label" placeholder="Label" style="flex:1"><input class="inp" id="ad-type" placeholder="ID" style="max-width:80px"><input class="inp" id="ad-fee" placeholder="Fee" type="number" step="0.50" style="max-width:70px"><button onclick="admAddDI()" style="background:#101A16;color:#F7FAF5;border:none;font-family:var(--fd);font-weight:800;font-size:15px;padding:10px 18px;border-radius:10px;cursor:pointer;flex-shrink:0">➕</button></div></div>';h+='<div class="a-sec" style="margin-top:20px">🏠 Blok (COD)</div><div style="max-width:500px">';BLOCKS.forEach((b,i)=>{const dis=disBlocks.includes(b);h+='<div class="a-row" style="'+(dis?'opacity:0.4':'')+'"><span class="n" style="'+(dis?'text-decoration:line-through':'')+'">'+esc(b)+'</span><div class="b"><button style="background:'+(dis?'rgba(198,56,30,0.15)':'rgba(16,26,22,0.1)')+';color:'+(dis?'#C6381E':'#101A16')+'" onclick="admTogBlockDis('+i+')">'+(dis?'✕':'✓')+'</button><button style="background:rgba(198,56,30,0.1);color:#C6381E" onclick="admDelBlock('+i+')">✕</button></div></div>'});h+='</div><div class="a-form" style="max-width:500px"><div class="row"><input class="inp" id="ab-name" placeholder="Nama blok (cth: Kristal C)" style="flex:1"><button onclick="admAddBlock()" style="background:#101A16;color:#F7FAF5;border:none;font-family:var(--fd);font-weight:800;font-size:15px;padding:10px 18px;border-radius:10px;cursor:pointer;flex-shrink:0">➕</button></div></div>';pg.innerHTML=h}
function admAddDI(){const l=document.getElementById('ad-label').value.trim(),t=document.getElementById('ad-type').value.trim().toLowerCase(),f=parseFloat(document.getElementById('ad-fee').value)||0;if(!l||!t){toast('⚠ Label + ID');return}if(DELS.find(d=>d.t===t)){toast('❌ ID ada');return}DELS.push({t,l:f>0?'📦 '+l+' (+RM'+f.toFixed(2)+')':l,f});saveConfig();admDelivery(document.getElementById('adm-pg'));toast('✓ Ditambah')}
function admDelDI(i){if(DELS.length<=1){toast('❌ Mesti ada satu cara penghantaran');return}if(!confirm('Padam "'+DELS[i].l+'"?'))return;DELS.splice(i,1);saveConfig();admDelivery(document.getElementById('adm-pg'));toast('✓ Dipadam')}
function admTogBlockDis(i){const b=BLOCKS[i];if(!b)return;if(disBlocks.includes(b))disBlocks=disBlocks.filter(x=>x!==b);else{if(disBlocks.length>=BLOCKS.length){toast('❌ Mesti ada satu blok');return}disBlocks.push(b)}saveConfig();admDelivery(document.getElementById('adm-pg'))}
function admAddBlock(){const n=document.getElementById('ab-name').value.trim();if(!n){toast('⚠ Nama blok');return}if(BLOCKS.includes(n)){toast('❌ Sudah ada');return}BLOCKS.push(n);saveConfig();admDelivery(document.getElementById('adm-pg'));toast('✓ Ditambah')}
function admDelBlock(i){const name=BLOCKS[i];if(!confirm('Padam "'+name+'"?'))return;BLOCKS.splice(i,1);if(disBlocks.includes(name))disBlocks=disBlocks.filter(x=>x!==name);saveConfig();admDelivery(document.getElementById('adm-pg'));toast('✓ Dipadam')}

function admSettings(pg){const u=(getAuth()&&getAuth().currentUser)?getAuth().currentUser:null;pg.innerHTML='<div style="max-width:500px"><div class="a-form"><div class="a-sec" style="border:none;padding-top:0">🔐 Akaun Admin</div><div style="font-size:14px;margin-bottom:8px;color:#6B7A73">Log masuk sebagai</div><div style="font-size:14px;font-weight:800;color:#101A16;margin-bottom:4px">'+esc(u?u.email:'—')+'</div><div style="font-size:12px;color:#6B7A73;margin-bottom:12px">Tukar password melalui Firebase Console.</div><button onclick="admSignOutNow()" style="width:100%;background:rgba(198,56,30,0.1);border:1px solid rgba(198,56,30,0.25);color:#C6381E;font-weight:800;font-size:14px;padding:11px;border-radius:10px;cursor:pointer">🔒 Log Keluar</button></div><div class="a-form" style="margin-top:14px"><div class="a-sec" style="border:none;padding-top:0">☁️ Storage</div><div style="font-size:14px;margin-bottom:12px;color:#101A16;font-weight:700">Firestore — real-time sync, rules locked</div></div><div class="a-form" style="margin-top:14px"><div class="a-sec" style="border:none;padding-top:0">🕐 Waktu Buka</div><div class="row"><input class="inp" id="st-open" placeholder="10:30PM" style="flex:1"><input class="inp" id="st-close" placeholder="2:00AM" style="flex:1"></div><div style="font-size:12px;color:#6B7A73;margin-bottom:12px">Format: 10:30PM / 2:00AM</div><button onclick="admSaveHours()" style="background:#101A16;color:#F7FAF5;border:none;font-weight:800;font-size:14px;padding:10px 18px;border-radius:10px;cursor:pointer">Simpan Waktu</button></div><div class="a-form" style="margin-top:14px"><div class="a-sec" style="border:none;padding-top:0">🙋 Siapa Kami</div><div class="row"><input class="inp" id="st-wn" placeholder="Nama (cth: Zul)" style="flex:1"></div><div class="row"><input class="inp" id="st-wb" placeholder="Blok (cth: Blok Zamrud, Sem 5)" style="flex:1"></div><div class="row"><input class="inp" id="st-wnote" placeholder="Balasan biasa (cth: reply ~2 min)" style="flex:1"></div><div class="row"><input class="inp" id="st-wimg" placeholder="URL gambar (pilihan)" style="flex:1"></div><button onclick="admSaveWho()" style="background:#101A16;color:#F7FAF5;border:none;font-weight:800;font-size:14px;padding:10px 18px;border-radius:10px;cursor:pointer">Simpan</button></div><div class="a-form" style="margin-top:14px"><div class="a-sec" style="border:none;padding-top:0">💾 Data</div><div style="font-size:14px;color:#6B7A73;margin-bottom:12px">Muat turun semua pesanan sebagai fail (backup).</div><button onclick="admExport()" style="background:rgba(16,26,22,0.1);border:1px solid rgba(16,26,22,0.3);color:#101A16;font-weight:800;font-size:14px;padding:10px 18px;border-radius:10px;cursor:pointer">⬇ Export Pesanan (JSON)</button></div><div class="a-form" style="margin-top:14px"><div class="a-sec" style="border:none;padding-top:0">🔄 Reset</div><div style="font-size:14px;color:#6B7A73;margin-bottom:12px">Enable all items + time slots + blocks</div><button onclick="exitAdmin();enAll()" style="background:rgba(198,56,30,0.1);border:1px solid rgba(198,56,30,0.2);color:#C6381E;font-weight:800;font-size:14px;padding:10px 18px;border-radius:10px;cursor:pointer">🔄 Reset Semua</button></div></div>';admFillSettings()}
function admCustomers(pg){
  const db=getDb();
  if(!db){pg.innerHTML='<div style="padding:20px;color:#8A5A00;font-weight:700">Firebase tidak tersedia.</div>';return}
  pg.innerHTML='<div style="color:#6B7A73;text-align:center;padding:30px">Memuatkan...</div>';
  db.collection('orders').limit(2000).get().then(function(snap){
    const byPhone={};let nPhone=0;
    snap.forEach(function(d){const o=d.data();if(o.status==='deleted')return;if(o.phone)nPhone++;const p=(o.phone||'').replace(/[^0-9]/g,'');if(!p)return;if(!byPhone[p])byPhone[p]={phone:o.phone,n:o.name,count:0,spend:0,last:null};byPhone[p].count++;byPhone[p].spend+=Number(o.total||0);const t2=o.createdAt&&o.createdAt.toDate?o.createdAt.toDate():null;if(t2&&(!byPhone[p].last||t2>byPhone[p].last))byPhone[p].last=t2;if(o.name)byPhone[p].n=o.name});
    const rows=Object.values(byPhone).sort(function(a,b){return b.count-a.count});
    _admPhoneCount=nPhone;
    let h='<div style="max-width:700px">';
    h+='<div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
      +(nPhone
        ?'<button onclick="admAskPurgePhones()" style="background:rgba(198,56,30,0.1);border:1px solid rgba(198,56,30,0.25);color:#C6381E;font-weight:800;font-size:13px;padding:9px 16px;border-radius:10px;cursor:pointer">🔒 Padam nombor telefon ('+nPhone+')</button>'
         +'<span style="font-size:12px;color:#6B7A73;font-weight:700">Buang semua nombor telefon. Pesanan dan nama kekal, senarai Pelanggan jadi kosong.</span>'
        :'<span style="font-size:13px;color:#101A16;font-weight:800">✓ Tiada nombor telefon disimpan</span>')
      +'</div>';
    if(!rows.length){h+='<div style="text-align:center;padding:40px;color:#6B7A73;font-weight:700;font-size:15px">Belum ada nombor telefon dikumpul.<br><br><span style="font-size:14px">Ia diisi oleh pelanggan (pilihan) semasa order.</span></div>';pg.innerHTML=h+'</div>';return}
    h+='<div class="a-sec">Stamps — '+rows.length+' pelanggan</div>';
    rows.forEach(function(c){
      const stamps=c.count%5,free=Math.floor(c.count/5);
      const ready=free>0;
      h+='<div class="a-row"><span class="n">'+esc(c.n||'-')+'<div style="font-size:12px;color:#6B7A73;font-weight:700;margin-top:2px">'+esc(c.phone)+' · RM'+c.spend.toFixed(2)+' · '+(c.last?c.last.toLocaleDateString('ms-MY'):'')+'</div></span>'+
         '<span style="font-family:var(--fd);font-weight:800;font-size:22px;color:'+(ready?'#101A16':'#8A5A00')+'">'+c.count+'x'+(ready?' 🎉':'')+'</span>'+
         '<span style="font-size:12px;color:#6B7A73;font-weight:800;margin-left:10px">'+stamps+'/5</span></div>';
    });
    h+='<div style="margin-top:16px;padding:14px;background:rgba(16,26,22,0.03);border:1px solid rgba(16,26,22,0.08);border-radius:12px;font-size:13px;color:#6B7A73;line-height:1.7"><b style="color:#101A16">Cara guna:</b> setiap pelanggan yang tinggalkan nombor akan dikira di sini. Bila cukup 5, minuman seterusnya percuma — beritahu mereka melalui WhatsApp.</div></div>';
    pg.innerHTML=h;
  }).catch(function(e){pg.innerHTML='<div style="color:#C6381E;padding:20px">Gagal baca: '+esc(e.message)+'</div>'});
}
let _anWin=1;
async function admResetAnalytics(){
  const db=getDb();if(!db)return;
  toast('Memadam...');
  let last=null,total=0;
  // Paginate by document id. Pulling the whole collection and slicing it in
  // memory fails past a few hundred docs and trips the 500-op batch limit.
  for(;;){
    let q=db.collection('events').orderBy('__name__').limit(400);
    if(last)q=q.startAfter(last);
    const snap=await q.get();
    if(snap.empty)break;
    const b=db.batch();
    snap.docs.forEach(function(d){b.delete(d.ref)});
    await b.commit();
    last=snap.docs[snap.docs.length-1];
    total+=snap.docs.length;
    toast('Memadam... '+total);
  }
  toast(total?('🗑 Analitik direset - '+total+' rekod dihapus'):'Tiada rekod analitik untuk dipadam');
  switchAdmin('stats');
}
function admAskResetAnalytics(){
  admConfirm('Padam SEMUA rekod analitik, termasuk page view, troli, checkout dan order. Ini tidak boleh dibatalkan. Nombor pesanan kekal.','Ya, reset analitik',admResetAnalytics);
}
async function admPurgePhones(){
  const db=getDb();if(!db)return;
  toast('Mencari nombor telefon...');
  const snap=await db.collection('orders').limit(2000).get();
  const targets=snap.docs.filter(function(d){const o=d.data();return o.status!=='deleted'&&o.phone});
  if(!targets.length){toast('Tiada nombor telefon untuk dipadam');return}
  let done=0;
  for(let i=0;i<targets.length;i+=400){
    const b=db.batch();
    targets.slice(i,i+400).forEach(function(d){b.update(d.ref,{phone:firebase.firestore.FieldValue.delete()})});
    await b.commit();
    done+=Math.min(i+400,targets.length)-i;
    toast('Memadam... '+done+'/'+targets.length);
  }
  toast('🔒 '+done+' nombor telefon dipadam');
  switchAdmin('customers');
}
function admAskPurgePhones(){
  admConfirm('Padam nombor telefon dari '+_admPhoneCount+' pesanan? Senarai Pelanggan akan jadi kosong. Pesanan dan nama pelanggan kekal.','Ya, padam nombor',admPurgePhones);
}
const AN_LBL={page_view:'Buka laman',menu_view:'Nampak menu',item_open:'Buka minuman',add_cart:'Masuk troli',checkout_open:'Buka checkout',order_sent:'Hantar order'};
let _cpnRows=[],_cpnMap={},_cpnFilter='all';
// A coupon records the order that earned it in `ord` at mint time; the burn then
// overwrites `ord` with the order that spent it, which is why the mint also
// stamps `earnedBy`. For coupons minted before that stamp existed, the owner of
// a spent coupon is simply unknown - better than a guess.
// Catch every customer the shop already owes, without the seller having to open
// each order. Same function the "Siap" button calls, so it can never disagree
// with it - it simply walks the completed orders and asks.
async function sweepCoupons(){
  const db=getDb();if(!db||!isAdmin()){toast('Login admin diperlukan');return}
  try{
    const q=await db.collection('orders').orderBy('createdAt','desc').limit(120).get();
    const done=q.docs.filter(function(d){const v=d.data()||{};return v.status==='done'&&!v.free});
    toast('Menyemak ' + done.length + ' pesanan siap...');
    for(let i=0;i<done.length;i++){try{await maybeMintCoupon(done[i].id,true)}catch(e){}}
    toast('Selesai - kupon dikemas kini');
    admCoupons(document.getElementById('adm-pg'));
  }catch(e){toast('Gagal: '+e.message)}
}
async function admCoupons(pg){
  if(!isAdmin()){pg.innerHTML='<div style="padding:20px;color:#8A5A00;font-weight:700">Login admin diperlukan.</div>';return}
  const db=getDb();if(!db){pg.innerHTML='<div style="padding:20px;color:#8A5A00;font-weight:700">Firebase tidak tersedia.</div>';return}
  pg.innerHTML='<div style="color:#6B7A73;text-align:center;padding:30px">Memuatkan kupon...</div>';
  try{
    const res=await Promise.all([
      db.collection('coupons').orderBy('at','desc').limit(300).get(),
      db.collection('orders').orderBy('createdAt','desc').limit(400).get()
    ]);
    _cpnMap={};
    res[1].docs.forEach(function(d){_cpnMap[d.id]=d.data()||{}});
    _cpnRows=res[0].docs.map(function(d){return Object.assign({id:d.id},d.data()||{})});
    renderCoupons(pg);
  }catch(e){
    pg.innerHTML='<div style="padding:20px;color:#C6381E;font-weight:700">Kupon tidak dapat dimuatkan: '+esc(e.message)+'</div>';
  }
}
function cpnState(r){
  if(r.used===true)return 'used';
  const exp=r.exp&&r.exp.toMillis?r.exp.toMillis():0;
  if(exp&&exp<=Date.now())return 'expired';
  return 'avail';
}
function cpnWho(id){
  if(!id)return null;
  const o=_cpnMap[id];
  if(!o)return null;
  return { name:o.name||'', phone:o.phone||'', room:o.room||'', no:o.no||0 };
}
function setCpnFilter(f){_cpnFilter=f;renderCoupons(document.getElementById('adm-pg'))}
function cpnWhoText(w,unknown){
  if(!w)return unknown?'tidak diketahui':'—';
  return esc(w.name||'-')+(w.phone?' · '+esc(w.phone):'')+(w.no?' · #'+fmtNo(w.no):'')+(w.room?' · '+esc(w.room):'');
}
function renderCoupons(pg){
  const all=_cpnRows;
  const avail=all.filter(function(r){return cpnState(r)==='avail'}).length;
  const used=all.filter(function(r){return cpnState(r)==='used'}).length;
  const chips='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
    +'<span class="c-chip">Jumlah '+all.length+'</span>'
    +'<span class="c-chip ok">Tersedia '+avail+'</span>'
    +'<span class="c-chip dim">Dituntut '+used+'</span></div>';
  const tabs=[['all','Semua'],['avail','Tersedia'],['used','Dituntut'],['expired','Tamat']].map(function(t){
    return '<button class="c-tab'+(_cpnFilter===t[0]?' on':'')+'" onclick="setCpnFilter(\''+t[0]+'\')">'+t[1]+'</button>';
  }).join('');
  const list=all.filter(function(r){return _cpnFilter==='all'||cpnState(r)===_cpnFilter}).map(function(r){
    const st=cpnState(r);
    const ownerId=r.used?(r.earnedBy||null):r.ord;
    const claimId=r.used?r.ord:null;
    const ow=cpnWho(ownerId),cl=cpnWho(claimId);
    const pill=st==='avail'?'<span class="c-pill ok">Tersedia</span>'
      :(st==='used'?'<span class="c-pill dim">Sudah dituntut</span>'
      :'<span class="c-pill warn">Tamat tempoh</span>');
    const issued=r.at&&r.at.toDate?r.at.toDate().toLocaleDateString('ms-MY',{day:'2-digit',month:'short'}):'';
    const spent=r.usedAt&&r.usedAt.toDate?r.usedAt.toDate().toLocaleString('ms-MY',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
    return '<div class="c-card"><div class="c-top"><b class="c-code">'+esc(r.id)+'</b>'+pill
      +'<button class="c-cp" onclick="cpnCopy(\''+esc(r.id)+'\')">Salin</button></div>'
      +'<div class="c-row"><span>Pemilik</span><b>'+cpnWhoText(ow,r.used)+'</b></div>'
      +'<div class="c-row"><span>Dituntut oleh</span><b>'+cpnWhoText(cl,r.used)+'</b></div>'
      +'<div class="c-row"><span>Dikeluarkan</span><b>'+esc(issued||'—')+(r.by?' · pesanan ke-'+r.by:'')+'</b></div>'
      +(r.used?'<div class="c-row"><span>Masa tuntutan</span><b>'+esc(spent||'—')+'</b></div>':'')
      +'</div>';
  }).join('');
  pg.innerHTML='<div style="max-width:760px"><div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="c-tab on" onclick="sweepCoupons()">Kira semua pesanan siap</button></div>'+chips
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+tabs+'</div>'
    +'<div style="display:grid;gap:10px">'+(list||'<div style="color:#6B7A73;padding:14px">Tiada kupon dalam senarai ini.</div>')+'</div>'
    +'<div style="margin-top:14px;font-size:12px;color:#6B7A73;line-height:1.7">Satu kupon, satu tuntutan. <b>Pemilik</b> ialah pelanggan yang pesanan ke-5, ke-10, ke-15 dan seterusnya telah siap; <b>Dituntut oleh</b> ialah pesanan yang menggunakan kod itu.</div></div>';
}
function admAnalytics(pg){
  const db=getDb();
  if(!db){pg.innerHTML='<div style="padding:20px;color:#8A5A00;font-weight:700">Firebase tidak tersedia.</div>';return}
  const wins=[[1,'Hari ini'],[7,'7 hari'],[30,'30 hari'],[0,'Semua']];
  let h='<div style="max-width:760px">';
  h+='<div class="a-filter">'+wins.map(function(w){return '<button class="'+(_anWin===w[0]?'on':'')+'" onclick="admAnWin('+w[0]+')">'+w[1]+'</button>'}).join('')+'</div>';
  h+='<div style="margin-top:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
    +'<button onclick="admAskResetAnalytics()" style="background:rgba(198,56,30,0.1);border:1px solid rgba(198,56,30,0.25);color:#C6381E;font-weight:800;font-size:13px;padding:9px 16px;border-radius:10px;cursor:pointer">🗑 Reset analitik</button>'
    +'<span style="font-size:12px;color:#6B7A73;font-weight:700">Kosongkan semua angka. Nombor pesanan kekal.</span></div>';
  h+='<div id="an-body"><div style="color:#6B7A73;text-align:center;padding:30px">Memuatkan...</div></div></div>';
  pg.innerHTML=h;
  const start=_anWin===0?new Date(0):new Date(Date.now()-_anWin*86400000);
  db.collection('events').where('at','>=',start).limit(5000).get().then(function(snap){
    const counts={};const sids={};let total=0;
    snap.forEach(function(d){const e=d.data();counts[e.step]=(counts[e.step]||0)+1;total++;if(e.step==='page_view')sids[e.sid||'?']=1});
    const visitors=Object.keys(sids).length;
    const body=document.getElementById('an-body');
    if(!body)return;
    if(!total){body.innerHTML='<div style="text-align:center;padding:40px;color:#6B7A73;font-weight:700;font-size:15px">Belum ada data untuk tempoh ini.<br><br><span style="font-size:14px">Data terkumpul bila orang buka link anda.</span></div>';return}
    const top=counts['page_view']||1;
    let rows='';let prev=null;
    FUNNEL.forEach(function(step){
      const c=counts[step]||0;
      const pct=Math.round(c/top*100);
      const drop=prev===null?null:(prev>0?Math.round((prev-c)/prev*100):0);
      const w=Math.max(2,pct);
      rows+='<div style="margin-bottom:14px">'
        +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">'
        +'<span style="font-weight:800;font-size:14px;color:#101A16">'+AN_LBL[step]+'</span>'
        +'<span style="font-family:var(--fd);font-weight:800;font-size:22px;color:#101A16">'+c+'</span>'
        +'</div>'
        +'<div style="height:12px;background:rgba(16,26,22,0.05);border-radius:999px;overflow:hidden">'
        +'<div style="height:100%;width:'+w+'%;background:linear-gradient(90deg,#101A16,#00A88A);border-radius:999px"></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;margin-top:5px;font-size:12px;color:#6B7A73;font-weight:700">'
        +'<span>'+pct+'% dari pelawat</span>'
        +(drop===null?'':'<span style="color:'+(drop>=50?'#C6381E':'#8A5A00')+'">-'+drop+'% dari langkah sebelum</span>')
        +'</div></div>';
      prev=c;
    });
    const sent=counts['order_sent']||0;const failed=counts['order_fail']||0;
    const rate=visitors?Math.round(sent/visitors*100):0;
    body.innerHTML='<div class="a-stats" style="grid-template-columns:repeat(3,1fr)">'
      +'<div class="a-stat"><div class="label">Pelawat</div><div class="count">'+visitors+'</div><div class="rev">unik</div></div>'
      +'<div class="a-stat"><div class="label">Order</div><div class="count">'+sent+'</div><div class="rev">'+failed+' gagal</div></div>'
      +'<div class="a-stat"><div class="label">Kadar</div><div class="count">'+rate+'%</div><div class="rev">pelawat ke order</div></div>'
      +'</div>'+rows
      +'<div style="margin-top:18px;padding:14px;background:rgba(16,26,22,0.03);border:1px solid rgba(16,26,22,0.08);border-radius:12px;font-size:13px;color:#6B7A73;line-height:1.7">'
      +'<b style="color:#101A16">Cara baca:</b> kalau ramai <b>Buka laman</b> tapi sikit <b>Nampak menu</b>, masalahnya kelajuan muat. Kalau ramai <b>Nampak menu</b> tapi sikit <b>Buka minuman</b>, menu tak menarik. Kalau ramai <b>Buka checkout</b> tapi sikit <b>Hantar order</b>, ada sesuatu yang menyekat borang.</div>';
  }).catch(function(e){
    const body=document.getElementById('an-body');
    if(body)body.innerHTML='<div style="color:#C6381E;padding:20px">Gagal baca: '+esc(e.message)+'</div>';
  });
}
function admAnWin(w){_anWin=w;admAnalytics(document.getElementById('adm-pg'))}
function admSaveHours(){const o=parseClock(document.getElementById('st-open').value),c=parseClock(document.getElementById('st-close').value);if(o===null||c===null){toast('Format: 10:30PM');return}HOURS=[o,c];saveConfig();drawStatus();toast('Waktu disimpan')}
function admSaveWho(){WHO={n:document.getElementById('st-wn').value.trim(),b:document.getElementById('st-wb').value.trim(),note:document.getElementById('st-wnote').value.trim(),img:document.getElementById('st-wimg').value.trim()};saveConfig();drawFounder();toast('Disimpan')}
function admFillSettings(){const so=document.getElementById('st-open');if(!so)return;so.value=fmtMin(HOURS[0]);document.getElementById('st-close').value=fmtMin(HOURS[1]);const w=WHO||{};document.getElementById('st-wn').value=w.n||'';document.getElementById('st-wb').value=w.b||'';document.getElementById('st-wnote').value=w.note||'';document.getElementById('st-wimg').value=w.img||''}
function parseClock(s){const m=String(s||'').trim().toUpperCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);if(!m)return null;let h=parseInt(m[1],10),mi=m[2]?parseInt(m[2],10):0;const ap=m[3];if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;if(h>23||mi>59)return null;return h*60+mi}
function admExport(){const db=getDb();if(!db){toast('Firebase tidak tersedia');return}toast('Menyediakan fail...');db.collection('orders').get().then(function(snap){const rows=[];snap.forEach(function(d){const o=d.data();o._id=d.id;if(o.createdAt&&o.createdAt.toDate)o._createdAt=o.createdAt.toDate().toISOString();delete o.createdAt;rows.push(o)});const blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mms-orders-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(a.href)},3000);toast('Fail dimuat turun ('+rows.length+' pesanan)')}).catch(function(e){toast('Gagal export')})}
function admSignOutNow(){const a=getAuth();if(a)a.signOut().then(()=>{exitAdmin();toast('🔒 Log keluar')})}
