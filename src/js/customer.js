/* customer.js - MINUM MALAM SISWA. Built from src/ by tools/build.py; edit the source parts, not this file. */
const DEFAULT_MENU=[{name:'Minuman',items:[
{name:'Milo Ais',price:3.50,pop:true},{name:'Extrajoss Susu Mangga',price:2.50,pop:true},{name:'Extrajoss Susu Anggur',price:2.50,pop:false},{name:'Indocafe Ais',price:3.50,pop:false},{name:'Belgian Chocolate',price:4.00,pop:false},{name:'Horlicks Ais',price:3.50,pop:false},{name:'Hazelnut Latte',price:4.00,pop:false},{name:'Mocha',price:4.00,pop:false},{name:'Teh Tarik Air Asia',price:4.00,pop:false},
]}];
function computeCheapest(){let c=Infinity;(MENU||[]).forEach(function(cat){var it=(cat&&cat.items)||[];it.forEach(function(v){if(typeof v.price==='number'&&v.price>0&&v.price<c)c=v.price})});CHEAPEST_PRICE=(c===Infinity?0:c)}
let CHEAPEST_PRICE=0;
// A QR order that has not attached a receipt yet is the one job on the done
// screen. Used by the receipt panel and by the stamp prompt, so they cannot
// disagree about whether anything is still pending.
function claimPending(o){return !!o&&o.pay==='qr'&&!o._claim}
// ---------------------------------------------------------------------------
// The stamp ask.
//
// Shown once per device, on the done screen, and only when nothing else there
// is outstanding - a prompt on top of the receipt upload would hide the one
// thing the customer still has to do. Either answer, a number or "not
// interested", is remembered, so it asks once and never again.
//
// The number goes to members/{digits}, which only the seller can read, and is
// kept on the device so the next order carries it - which is what keeps the
// Customers tab's order counts working now the form no longer asks.
// ---------------------------------------------------------------------------
const STAMP_ASK_KEY='mms_stamp_ask';     // '1' once a number has been given
const STAMP_SKIP_KEY='mms_stamp_skip';   // the order code that was declined
function stampAccepted(){try{return localStorage.getItem(STAMP_ASK_KEY)==='1'}catch(e){return false}}
function stampSkipped(code){try{return !!code&&localStorage.getItem(STAMP_SKIP_KEY)===String(code)}catch(e){return false}}
function maybeAskStamp(){
  const dn=document.getElementById('done');
  const o=(dn&&dn._msg)||null;
  if(!o||o.warn)return;
  // A number, once given, is the end of it - the stamps just accumulate.
  if(stampAccepted())return;
  // Declining is remembered against THIS order and nothing more, so the next
  // order asks again.
  if(stampSkipped(o.code))return;
  if(claimPending(o))return;
  openStampAsk();
}
function openStampAsk(){
  const m=document.getElementById('stamp-ask');
  if(!m)return;
  const c=getLoy().c;
  const left=(5-(c%5))%5;
  const row=document.getElementById('stamp-ask-row');
  if(row)row.innerHTML=stampRowHtml(c);
  const cnt=document.getElementById('stamp-ask-count');
  if(cnt)cnt.textContent=c;
  const lbl=document.getElementById('stamp-ask-progress');
  if(lbl)lbl.textContent=c===0?'Kumpul 5 untuk 1 percuma':(left===0?'Boleh tebus minuman percuma sekarang!':left+' lagi untuk minuman percuma');
  m.style.display='flex';
}
function closeStampAsk(){const m=document.getElementById('stamp-ask');if(m)m.style.display='none'}
function dismissStampAsk(){
  const dn=document.getElementById('done');
  const o=(dn&&dn._msg)||{};
  // Against this order, not forever. The next order asks again.
  try{if(o.code)localStorage.setItem(STAMP_SKIP_KEY,String(o.code))}catch(e){}
  closeStampAsk();
  toast('Baik, kami tanya lain kali');
}
function saveStampNumber(){
  const raw=String((document.getElementById('stamp-phone')||{}).value||'').trim();
  const digits=raw.replace(/[^0-9]/g,'');
  if(digits.length<9){toast('⚠ Nombor tidak sah');return}
  try{localStorage.setItem(STAMP_ASK_KEY,'1')}catch(e){}
  try{const c=loadCustomer()||{};c.ph=digits;localStorage.setItem('mms_cust',JSON.stringify(c))}catch(e){}
  const db=getDb();
  // The member record carries the name as well as the number, and the rules
  // refuse a name shorter than two characters. A device with nothing to give
  // had its write turned away while the customer was told the number was
  // saved, which is a promise the seller's list would never keep. Say what
  // actually happened: the number is on the device either way, so the next
  // order still carries it.
  const stampName=clip((loadCustomer()||{}).n||'',40);
  if(!db||stampName.length<2){closeStampAsk();toast('✓ Nombor disimpan pada peranti ini');return}
  {
    // Best effort, and deliberately silent. A customer must never be shown an
    // error about a rule they cannot see or do anything about.
    db.collection('members').doc(digits)
      .set({phone:digits,name:stampName,at:firebase.firestore.FieldValue.serverTimestamp()})
      .catch(function(){toast('✓ Nombor disimpan pada peranti ini')});
  }
  closeStampAsk();
  toast('✓ Nombor disimpan - terima kasih!');
}
function saveLoy(l){localStorage.setItem('mms_loy',JSON.stringify(l))}
// ---- coupon wallet -------------------------------------------------
  // The code lives on the order's tracking document, which the customer can
  // read by its own id. It is cached here so the banner survives a reload, and
  // the cache never invents a code: it is only ever filled from that document.
  function cpns(){try{const a=JSON.parse(localStorage.getItem('mms_coupons')||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
  function saveCpns(a){try{localStorage.setItem('mms_coupons',JSON.stringify(a.slice(0,10)))}catch(e){}}
  function addCpn(code,exp){code=String(code||'').toUpperCase();if(!code)return false;const a=cpns();if(a.some(function(c){return c.code===code}))return false;a.unshift({code:code,exp:exp||0,at:Date.now()});saveCpns(a);drawCpnBtn();return true}
  function dropCpn(code){saveCpns(cpns().filter(function(c){return c.code!==code}));drawCpnBtn()}
  function liveCpns(){const now=Date.now();return cpns().filter(function(c){return !c.exp||c.exp>now})}
  // A code is a bearer token: sharing is allowed, so the only truth is the
  // coupon document. Anything used - by this phone or another - leaves the
  // wallet, and so does anything expired or missing.
  async function verifyWallet(){
    const db=getDb();if(!db)return;const a=cpns();if(!a.length)return;
    let dropped=0;
    for(let i=0;i<a.length;i++){
      try{
        const snap=await db.collection('coupons').doc(a[i].code).get();
        if(!snap.exists){dropCpn(a[i].code);dropped++;continue}
        const d=snap.data()||{};
        const expMs=d.exp&&d.exp.toMillis?d.exp.toMillis():0;
        if(d.used===true||(expMs&&expMs<=Date.now())){dropCpn(a[i].code);dropped++}
      }catch(e){}
    }
    if(dropped)toast('Kupon yang sudah digunakan telah dikeluarkan');
  }
  function drawCpnBtn(){
    const b=document.getElementById('cpn-btn'),pop=document.getElementById('cpn-pop'),dot=document.getElementById('cpn-dot');
    if(!b)return;const a=liveCpns();
    // Always there. A ticket that vanishes is indistinguishable from a feature
    // that is broken, which is exactly what the empty state was read as.
    b.style.display='flex';
    b.classList.toggle('mute',!a.length);
    if(dot){dot.style.display=a.length?'flex':'none';dot.textContent=String(a.length)}
    if(pop&&pop.style.display==='block')drawCpnPop();
  }
  function drawCpnPop(){
    const pop=document.getElementById('cpn-pop');if(!pop)return;const a=liveCpns();
    if(!a.length){
      const done=(getLoy()||{}).c||0;
      const step=done%5;
      pop.innerHTML='<h4>You have 0 coupons</h4>'
        +'<div class="sub">Setiap 5 pesanan yang siap, anda dapat 1 minuman percuma. Kupon akan muncul di sini sendiri.</div>'
        +'<div style="display:flex;gap:5px;margin-top:10px">'
        +[0,1,2,3,4].map(function(i){return '<span style="flex:1;height:6px;border-radius:3px;background:'+(i<step?'#101A16':'rgba(16,26,22,0.12)')+'"></span>'}).join('')
        +'</div>'
        +'<div style="font-size:11.5px;color:var(--muted);margin-top:6px">'+step+'/5 setakat ini</div>';
      return;
    }
    pop.innerHTML='<h4>You have '+a.length+' coupon'+(a.length>1?'s':'')+'</h4>'
      +'<div class="sub">Satu minuman percuma untuk setiap kupon. Add-on tetap dibayar.</div>'
      +a.map(function(c){return '<div class="cpn-row"><span class="code">'+esc(c.code)+'</span>'
        +'<button onclick="cpnCopy(\''+c.code+'\')">Salin</button>'
        +'<button class="go" onclick="cpnUse(\''+c.code+'\')">Guna</button></div>'}).join('');
  }
  function toggleCpnPop(){
    const pop=document.getElementById('cpn-pop');if(!pop)return;
    if(pop.style.display==='block'){pop.style.display='none';return}
    const btn=document.getElementById('cpn-btn');
    if(btn){
      const r=btn.getBoundingClientRect();
      pop.style.top=Math.round(r.bottom+10)+'px';
      pop.style.right=Math.max(8,Math.round(innerWidth-r.right))+'px';
      pop.style.left='auto';
    }
    verifyWallet();
    drawCpnPop();pop.style.display='block';
  }
  function cpnUse(code){
    const _p=document.getElementById('cpn-pop');if(_p)_p.style.display='none';
    code=String(code||'').toUpperCase();
    const btn=document.querySelector('#pay button[data-method=coupon]');
    if(btn)btn.click();
    const inp=document.getElementById('inp-coupon');
    if(inp){inp.value=code}
    if(typeof couponCheck==='function')couponCheck();
    const sec=document.getElementById('pay-section');
    if(sec&&sec.scrollIntoView)sec.scrollIntoView({behavior:'smooth',block:'center'});
  }
  // Read the code the seller's mint wrote onto this order's tracking document.
  async function loadMyCoupons(){
    const db=getDb();if(!db)return;
    const o=loadMyOrder();if(!o||!o.code)return;
    try{
      const snap=await db.collection('tracking').doc(o.code).get();
      if(!snap.exists)return;
      const d=snap.data()||{};
      if(d.coupon)addCpn(d.coupon,d.couponExp&&d.couponExp.toMillis?d.couponExp.toMillis():0);
    }catch(e){}
  }
function highlight(id,msg){const el=document.getElementById(id);if(!el){toast(msg);return}el.style.borderColor='#C6381E';el.style.boxShadow='0 0 12px rgba(198,56,30,0.4)';el.focus();toast(msg);setTimeout(()=>{el.style.borderColor='';el.style.boxShadow=''},2000)}
function waUrl(t){return'https://wa.me/'+WA.replace(/[^0-9]/g,'')+'?text='+encodeURIComponent(t)}
// Tell the seller an order landed, on their phone, with every browser closed.
// Deliberately omits the customer's name and number - this text passes through
// a third-party server, and a block plus an order number is enough to act on.
const NTFY_TOPIC='kcDyPbfadiKFnhRhRHGKivWDvoLvdFgrxy6YjjJkOBn';
const SITE_URL='https://iyern0.github.io/ridzuanshop/';
// Read any file as a data URL, unchanged. Used for PDFs, which we cannot
// rasterise in the browser without shipping a PDF library.
function fileToDataUrl(file){
  return new Promise(function(resolve,reject){
    const fr=new FileReader();
    fr.onerror=function(){reject(new Error('Gagal baca fail'))};
    fr.onload=function(){resolve(String(fr.result||''))};
    fr.readAsDataURL(file);
  });
}
// base64 inflates by ~4/3, and the rules cap the stored string at 700000
// characters. 480 KB of PDF stays comfortably inside that.
const PDF_MAX_BYTES=480000;
function isPdfFile(f){return !!f&&(/^application\/pdf$/i.test(f.type)||/\.pdf$/i.test(f.name||''))}
function shrinkImage(file,maxPx,quality){
  return new Promise(function(resolve,reject){
    if(!file||!/^image\//.test(file.type)){reject(new Error('Bukan gambar'));return}
    const fr=new FileReader();
    fr.onerror=function(){reject(new Error('Gagal baca fail'))};
    fr.onload=function(){
      const img=new Image();
      img.onerror=function(){reject(new Error('Gagal buka gambar'))};
      img.onload=function(){
        let w=img.width,h=img.height;
        const sc=Math.min(1,maxPx/Math.max(w,h));
        w=Math.max(1,Math.round(w*sc));h=Math.max(1,Math.round(h*sc));
        const c=document.createElement('canvas');c.width=w;c.height=h;
        const cx=c.getContext('2d');
        cx.fillStyle='#fff';cx.fillRect(0,0,w,h);
        cx.drawImage(img,0,0,w,h);
        try{resolve(c.toDataURL('image/jpeg',quality||0.72))}catch(e){reject(e)}
      };
      img.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}
// Tell the seller, on their phone, with every browser closed.
//
// The payload is deliberately thin. The topic name is the only thing a
// customer's browser can hold, and this one ships in the source of a public
// site - ntfy's own docs say the topic IS the password, which only holds if
// the password is not published. So: an order number and whether it is a
// delivery, and nothing else. No name, no block, no room, no amount, no
// items. A stranger who finds the topic learns that some order needs
// checking, and that is all.
//
// What makes a thin alert useful is landing on the thing it is about, so the
// tap carries the order id. That id is meaningless without the login - the
// order itself still sits behind it.
// A header value must be ISO-8859-1, and an emoji is not. Putting one in the
// Title made the request fail to construct, and the empty catch below swallowed
// it - so every alert vanished with nothing in the console and nothing arriving
// anywhere. That is what this function looked like while the shop was live.
//
// Header values are ASCII now, and anything that is not gets stripped by
// asciiHeader rather than throwing. The visual comes from Tags instead, which
// is ASCII by definition: money_with_wings already renders as a money emoji on
// the phone, so the alert still catches the eye.
//
// In the body, non-ASCII is fine - a body is UTF-8. Only headers are restricted.
function asciiHeader(s){return String(s==null?'':s).replace(/[^\x20-\x7E]+/g,' ').replace(/\s+/g,' ').trim()}
function notifyOwnerClaim(o){
  try{
    if(typeof fetch!=='function')return;
    const no=(o.no?'#'+fmtNo(o.no):'#?');
    // A pickup order carries no room: the rules require one for COD and none
    // for collection, which is the same convention the rest of the app uses.
    const kind=o.room?'COD':'Ambil sendiri';
    // The order as a docket: which order, how it arrives, how many drinks and
    // what it comes to. No name, no block, no room.
    //
    // That is not squeamishness. This alert travels on an ntfy topic whose name
    // sits in the page's own source, so anything sent here is readable by
    // whoever looks. Order facts read like a real business notification without
    // handing out a customer's name and address to do it.
    const title=asciiHeader('Pesanan '+no+' - '+kind+(o.total?(' - RM'+Number(o.total).toFixed(2)):''));
    const body='Bayaran perlu semak'+(o.items?(' - '+o.items+' minuman'):'')+'. Pelanggan dah tekan "Saya dah bayar". Tekan untuk buka resit.';
    const click=asciiHeader(SITE_URL+'?admin=1'+(o.code?'&order='+encodeURIComponent(o.code):''));
    var ctrl=null;
    try{if(typeof AbortController!=='undefined')ctrl=new AbortController()}catch(e){}
    var timer=null;
    if(ctrl){timer=setTimeout(function(){try{ctrl.abort()}catch(e){}},6000)}
    fetch('https://ntfy.sh/'+NTFY_TOPIC,{
      method:'POST',
      headers:{
        'Content-Type':'text/plain; charset=utf-8',
        'Title':title,
        'Priority':'urgent',
        'Tags':'money_with_wings',
        'Click':click,
        'Icon':asciiHeader(SITE_URL+'icons/icon-192.png')
      },
      body:body,
      signal:ctrl?ctrl.signal:undefined
    }).catch(function(err){
      // Never silent again. This exact silence is why the alert disappeared for
      // an afternoon and nobody could tell from the app.
      console.warn('notifikasi penjual gagal:',err);
      if(timer)clearTimeout(timer);
    }).then(function(){if(timer)clearTimeout(timer)});
  }catch(e){
    console.warn('notifikasi penjual gagal (sync):',e);
  }
}

// A new order, pushed to the seller's phone. The claim alert is about money
// that needs checking; this one is about a drink that needs making, so they
// carry different titles and colours and a glance tells them apart.
//
// Same rule on the payload: order facts only. The order id rides in Click so a
// tap opens that order, and that id is worthless without the login.
//
// "Reliable" here means one retry and a bounded wait, so a flaky connection does
// not lose the alert with nothing in the console.
function notifyOrderPush(o){
  if(typeof fetch!=='function')return;
  const no=(o.no?'#'+fmtNo(o.no):'#?');
  const kind=o.pay==='coupon'?'Kupon':(o.room?'COD':'Ambil sendiri');
  const title=asciiHeader('Pesanan baru '+no+' - '+kind+(o.total!=null?(' - RM'+Number(o.total).toFixed(2)):''));
  const body=(o.items?o.items+' minuman':'Pesanan baru')+'. Belum dibayar - tekan untuk buka pesanan.';
  const click=asciiHeader(SITE_URL+'?admin=1'+(o.code?('&order='+encodeURIComponent(o.code)):''));
  const send=function(){
    var ctrl=null,timer=null;
    try{if(typeof AbortController!=='undefined')ctrl=new AbortController()}catch(e){}
    if(ctrl)timer=setTimeout(function(){try{ctrl.abort()}catch(e){}},7000);
    return fetch('https://ntfy.sh/'+NTFY_TOPIC,{
      method:'POST',
      headers:{'Content-Type':'text/plain; charset=utf-8','Title':title,'Priority':'high','Tags':'shopping_cart',
               'Click':click,'Icon':asciiHeader(SITE_URL+'icons/icon-192.png')},
      body:body,signal:ctrl?ctrl.signal:undefined
    }).then(function(r){if(timer)clearTimeout(timer);if(!r.ok)throw new Error('ntfy '+r.status);return true})
      .catch(function(e){if(timer)clearTimeout(timer);throw e});
  };
  send().catch(function(){return new Promise(function(res){setTimeout(res,1200)}).then(send)})
        .catch(function(err){console.warn('notifikasi pesanan gagal:',err)});
}

let _actx=null;
function beep(freq,dur,vol){try{if(!_actx)_actx=new(window.AudioContext||window.webkitAudioContext)();if(_actx.state==='suspended')_actx.resume();const o=_actx.createOscillator(),g=_actx.createGain();o.connect(g);g.connect(_actx.destination);o.type='sine';o.frequency.value=freq||880;const now=_actx.currentTime;g.gain.setValueAtTime(vol||0.10,now);g.gain.exponentialRampToValueAtTime(0.001,now+(dur||0.12));o.start(now);o.stop(now+(dur||0.12))}catch(e){}}
function buzz(ms){try{if(navigator.vibrate)navigator.vibrate(ms||15)}catch(e){}}
function chime(){beep(660,0.12,0.11);setTimeout(function(){beep(880,0.14,0.11)},110);setTimeout(function(){beep(1180,0.24,0.09)},230)}
function buzzOk(){try{if(navigator.vibrate)navigator.vibrate([18,50,18])}catch(e){}}

// ---------------------------------------------------------------------------
// Per-day order numbering: counters/YYYY-MM-DD, shown as 001, 002, ...
// Resets by itself at midnight because the date is part of the document id.
// ---------------------------------------------------------------------------
function dayKey(d){d=d||new Date();const z=function(n){return n<10?'0'+n:''+n};return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())}
function watchOrders(cb,err){const db=getDb();const q=db?ordersQ(db):null;if(!q)return null;return q.onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))),err)}
async function saveOrder(order){const db=getDb();if(!db)return false;try{await db.collection('orders').add({...order,createdAt:firebase.firestore.FieldValue.serverTimestamp()});if(!document.hidden)toast('Pesanan disimpan');return true}catch(e){console.warn('Firestore write gagal:',e);return false}}

async function loadMenu(){const d=await fsGet(MENU_DOC);if(d&&Array.isArray(d.items)&&d.items.length>0){MENU=d.items;computeCheapest();}else{MENU=JSON.parse(JSON.stringify(DEFAULT_MENU));await fsSet(MENU_DOC,{items:MENU})}draw();const db=getDb();if(db)db.doc(MENU_DOC).onSnapshot(snap=>{if(snap.exists&&snap.data().items){MENU=snap.data().items;computeCheapest();draw()}})}
async function initDis(){const d=await fsGet(DIS_DOC);if(d)dis=d;draw();const db=getDb();if(db)db.doc(DIS_DOC).onSnapshot(snap=>{if(snap.exists){dis=snap.data();draw()}})}

let _menuFirst=true;

/* "Pilih untuk saya": the stall's own habit when a customer can't decide. */
function pickForMe(){
  if(!MENU||!MENU.length){toast('Menu belum dimuatkan.');return}
  const pool=[];
  MENU.forEach((cat,ci)=>cat.items.forEach((v,vi)=>{const id='c'+ci+'v'+vi;if(!isDis(id))pool.push({id:id,name:v.name})}));
  if(!pool.length){toast('Semua dah habis malam ini.');return}
  const p=pool[Math.floor(Math.random()*pool.length)];
  addToCart(p.id);
  toast('Kami pilih '+p.name+' untuk anda.');
}
function toggleTimePick(){const d=document.getElementById('time-pick');if(!d)return;const open=d.style.display==='block';d.style.display=open?'none':'block';if(open)selTime='ASAP';drawTimes();syncTimeButton()}
function confirmCust(){if(!custItem)return;const hasSweet=custAdds.some(id=>{const a=findAdd(id);return a&&a.grp==='s'});const anySweetAvail=ADDS.some(a=>a.grp==='s'&&!disAdds.includes(a.id));if(!hasSweet&&anySweetAvail){toast('⚠ Sila pilih pemanis');return}const id='c'+custItem.ci+'v'+custItem.vi;if(!cart[id])cart[id]=[];cart[id].push({adds:[...custAdds]});saveCart();track('add_cart');buzz(15);closeCust();draw();toast('✓ Ditambah')}
function openCart(){document.getElementById('overlay').classList.add('open');document.getElementById('panel').classList.add('open')}
/* Re-order from the last saved order (design pass 3). Repeat customers are the
   norm at a stall, and rebuilding the same basket by hand was the longest part
   of the funnel. Matching is by drink NAME, not by cart key: keys are positional
   ('c0v3') and a menu edit would silently point them at the wrong drink. Names
   that no longer exist, or are sold out, are skipped and reported instead of
   being added as something else. */
function repeatLastOrder(){
  const o=loadMyOrder();
  if(!o||!Array.isArray(o.items)||!o.items.length){toast('Tiada pesanan lepas');return}
  if(!MENU||!MENU.length){toast('Menu belum dimuatkan');return}
  const flat=[];MENU.forEach((cat,ci)=>cat.items.forEach((v,vi)=>flat.push({ci,vi,v})));
  const norm=s=>String(s||'').trim().toLowerCase();
  let added=0;const missing=[];
  o.items.forEach(entry=>{
    const hit=flat.find(f=>norm(f.v.name)===norm(entry.name));
    const key=hit?('c'+hit.ci+'v'+hit.vi):null;
    if(!hit||isDis(key)){missing.push(entry.name);return}
    const adds=(entry.adds||[]).map(n=>{const a=ADDS.find(x=>norm(x.name)===norm(n));return a&&!disAdds.includes(a.id)?a.id:null}).filter(Boolean);
    if(!cart[key])cart[key]=[];
    const qty=Math.max(1,Math.min(20,Number(entry.qty)||1));
    for(let i=0;i<qty;i++)cart[key].push({adds:[...adds]});
    added+=qty;
  });
  if(!added){toast('Tiada item yang masih tersedia');return}
  saveCart();draw();upCart();
  toast('✓ '+added+' item ditambah');
  if(missing.length)setTimeout(()=>toast('Tidak tersedia: '+missing.slice(0,3).join(', ')),1500);
}
let codFreeUp=false;
// Confirms, at the moment COD is chosen, the details this device already knows.
// A returning customer otherwise sees a form filled in for them with no
// explanation of where it came from.
function saySavedAs(){
  const c=loadCustomer();
  if(!c||!c.n)return;
  toast('📌 Disimpan sebagai '+c.n+(c.block?(' · '+c.block+(c.room?' '+c.room:'')):''));
}
function cpnNorm(x){return String(x==null?'':x).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)}
async function couponCheck(){
  const inp=document.getElementById('inp-coupon'),msg=document.getElementById('coupon-msg');
  if(!inp||!msg)return;
  const code=cpnNorm(inp.value);
  cpnOk=false;cpnLine=-1;cpnCode='';
  if(code.length!==8){msg.style.color='#C6381E';msg.textContent='Kod mesti 8 aksara - semak semula kupon itu.';return}
  const db=getDb();
  if(!db){msg.style.color='#C6381E';msg.textContent='Tiada sambungan. Cuba lagi.';return}
  msg.style.color='var(--muted)';msg.textContent='Menyemak kupon...';
  try{
    const snap=await db.collection('coupons').doc(code).get();
    if(!snap.exists){msg.style.color='#C6381E';msg.textContent='Kupon tidak dijumpai. Semak huruf dan nombor.';return}
    const c=snap.data()||{};
    if(c.used){msg.style.color='#C6381E';msg.textContent='Kupon ini sudah digunakan.';return}
    const expMs=(c.exp&&c.exp.toMillis)?c.exp.toMillis():0;
    if(!expMs||expMs<=Date.now()){msg.style.color='#C6381E';msg.textContent='Kupon ini sudah tamat tempoh.';return}
    cpnCode=code;cpnOk=true;
    if(couponOnly()&&isCod===null){isCod=false}drawDel();
    msg.style.color='#101A16';
    msg.textContent='Kupon sah. Minuman termahal dalam bakul akan ditolak harganya (tanpa add-on).';
    toast('\u2713 Kupon sah');
  }catch(err){
    msg.style.color='#C6381E';msg.textContent='Kupon tidak dapat disemak. Cuba lagi.';
    console.warn('kupon:',err);
  }
}
function clip(s,max){return String(s==null?'':s).trim().slice(0,max)}
// The loyalty count needs one thing: a way to know that five orders belong to
// the same person. It used to be the phone number, which meant asking for one.
// A device id does the same job without collecting anything about anybody - it
// is generated here, never leaves this browser except as a field on the order,
// and says nothing about who is holding the phone.
function deviceId(){
  try{
    let v=localStorage.getItem('mms_dev');
    if(!v){v='d'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);localStorage.setItem('mms_dev',v)}
    return v;
  }catch(e){return ''}
}
function loadCart(){try{const c=JSON.parse(localStorage.getItem('mms_cart'));if(c&&typeof c==='object'){cart=c;return true}}catch(e){}return false}
function orderCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=A[Math.floor(Math.random()*A.length)];return s}
function fmtTimeLabel(t){return (t==='ASAP'||noTime(t))?'Secepat mungkin (~15-30 min)':t}
let _sending=false;
async function sendWa(){
  if(_sending)return;
  const items=Object.values(cart).reduce((s,v)=>s+v.length,0);
  if(!items){toast('Tiada item dalam bakul');closeConfirm();return}
  // The checkout button refuses these already, but this is the last gate before
  // anything is written. A guard that lives in one place and not the other is
  // how an order gets created for a customer who never chose a delivery method
  // or a way to pay - it silently became an "ambil sendiri" order, and the
  // seller had no idea how it was meant to arrive.
  if(isCod===null){toast('⚠ Sila pilih cara penghantaran');closeConfirm();return}
  if(!payM){toast('⚠ Sila pilih cara bayar');closeConfirm();return}
if(payM==='qr'&&!stagedProof){toast('⚠ Hantar resit dahulu');closeConfirm();return}
  if(payM==='coupon'&&!cpnOk){toast('Sahkan kupon dahulu');closeConfirm();return}
  if(payM==='coupon'&&cpnLine<0){toast('Pilih minuman percuma di Review');closeConfirm();return}
  const btn=document.getElementById('wa-send');
  const n=clip(document.getElementById('inp-name2').value,40);
  const roomIn=clip(document.getElementById('inp-room').value,20);
  const r=isCod?(clip(selBlock,30)+(roomIn?' '+roomIn:'')):'';
  if(!n){highlight('inp-name2','Sila masukkan nama');return}
  if(isCod&&!selBlock){toast('Sila pilih blok');return}
  if(isCod&&!roomIn){highlight('inp-room','Sila masukkan nombor bilik');return}
  // No time, no order. The customer picks a slot or states their own; an
  // order that named neither used to be stored with the placeholder sentence
  // as its time, which then read like a real time in the admin panel. Never
  // again - and this guard lives here as well as on the checkout button,
  // because a gate that exists in one place and not the other is how that
  // got through to begin with.
  if(!isCod&&!selTime)selTime='Bila siap';if(!selTime){highlight('pickup-time','⚠ Sila pilih masa dahulu');return}
  const when=selTime;
  let msg='Hi '+SHOP+'! Pesanan:\n',total=0;const ordMap={};const _prices=[],_labels=[],_bases=[];
  Object.entries(cart).forEach(([id,list])=>{
    const ci=parseInt(id.match(/c(\d+)/)[1]),vi=parseInt(id.match(/v(\d+)/)[1]);
    if(!MENU[ci]||!MENU[ci].items[vi])return;
    const item=MENU[ci].items[vi];
    list.forEach(inst=>{
      const ac=inst.adds.reduce((s,aid)=>{const a=findAdd(aid);return s+(a?a.price:0)},0);
      const al=inst.adds.map(aid=>{const a=findAdd(aid);return a?a.name:''}).filter(Boolean);
      const okey=item.name+'|'+al.join(',');
      ordMap[okey]=ordMap[okey]||{name:clip(item.name,60),price:+(item.price+ac).toFixed(2),adds:al.slice(0,10).map(x=>clip(x,40)),qty:0};
      ordMap[okey].qty++;
      total+=item.price+ac;_prices.push(+(item.price+ac).toFixed(2));_bases.push(+item.price.toFixed(2));_labels.push(item.name+(al.length?' + '+al.join(', '):''))
    })
  });
  if(payM==='coupon'&&cpnOk){let _bi=-1,_bb=-1;_bases.forEach(function(b,i){if(b>_bb){_bb=b;_bi=i}});cpnLine=_bi}
  if(!Object.keys(ordMap).length){toast('Bakul tidak sah - pilih minuman semula');cart={};saveCart();upCart();closeConfirm();return}
  const cod=isCod?delFee('cod'):0;total+=cod;if(payM==='coupon'&&_bases[cpnLine]==null){toast('Pilih semula minuman percuma di Review');closeConfirm();_sending=false;btn.disabled=false;btn.textContent='Hantar Pesanan';return}const freeAmt=(payM==='coupon'&&_bases[cpnLine]!=null)?_bases[cpnLine]:0;total-=freeAmt;if(total<0)total=0;
  _sending=true;btn.disabled=true;btn.textContent='Menghantar...';

  // Off the device, not off the form: the stamp prompt is where a number comes
  // from now, and this is the order after the one that collected it.
  const phone=clip((loadCustomer()||{}).ph||'',20);
  const payload={name:n,room:r,delivery:isCod?'cod':'pickup',time:clip(when,40),payment:payM,items:Object.values(ordMap).slice(0,50),subtotal:+(total+freeAmt-cod).toFixed(2),total:+total.toFixed(2),status:'baru'};
  if(phone)payload.phone=phone;
  {const _dev=deviceId();if(_dev)payload.dev=_dev}
  if(payM==='coupon'){payload.coupon=cpnCode;payload.free=+freeAmt.toFixed(2);payload.freeItem=clip(_labels[cpnLine]||'',60)}

  let code=null,saved=false,orderNo=null;
  const db=getDb();
  if(db){
    for(let attempt=0;attempt<3&&!saved;attempt++){
      code=orderCode();
      try{
        await db.runTransaction(async function(tx){
          const cRef=db.collection('counters').doc(dayKey());
          const cs=await tx.get(cRef);
          const n=(cs.exists?(cs.data().n||0):0)+1;
          tx.set(cRef,{n:n});
          tx.set(db.collection('orders').doc(code),{...payload,no:n,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
          tx.set(db.collection('tracking').doc(code),{status:'baru',no:n,at:firebase.firestore.FieldValue.serverTimestamp()});
          if(payM==='coupon'&&cpnCode)tx.update(db.collection('coupons').doc(cpnCode),{used:true,usedAt:firebase.firestore.FieldValue.serverTimestamp(),ord:code});
          orderNo=n
        });
        saved=true
      }catch(e){console.warn('order write gagal ('+code+'):',e)}
    }
  }

  if(!saved&&payM==='coupon'&&cpnCode&&db){
    try{
      const cs=await db.collection('coupons').doc(cpnCode).get();
      const cd=cs.exists?cs.data():null;
      if(!cd||cd.used===true){dropCpn(cpnCode);toast('Kupon ini sudah digunakan');cpnCode='';cpnOk=false;cpnLine=-1}
      else toast('Kupon tidak dapat digunakan - cuba lagi');
    }catch(e){toast('Pesanan gagal - cuba lagi')}
  }
  _sending=false;btn.disabled=false;btn.textContent='Hantar Pesanan';

  if(orderNo)msg+='No. Pesanan: #'+fmtNo(orderNo)+'\n';
  Object.values(ordMap).forEach(o=>{
    const al=o.adds.join(', ');
    msg+=o.qty+'x '+o.name+' = RM'+o.price.toFixed(2)+(o.adds.length?' ('+al+')':'')+'\n'
  });
  msg+='\n'+(isCod?('COD (+RM'+delFee('cod').toFixed(2)+')'):'Ambil sendiri');
  msg+='\nMasa: '+fmtTimeLabel(when);
  msg+='\nBayar: '+(payM==='coupon'?'Kupon':payM==='cash'?'Tunai':'QR Pay');
  msg+='\nNama: '+n+(isCod?' ('+r+')':'');
  msg+='\nJumlah: RM'+total.toFixed(2);

  // A resit attached under the QR rides up with the order. It was held back
  // because there was no order to attach it to; now there is, so it goes in and
  // the seller is told once. _claim records it, so nothing asks again.
  const proof=(payM==='qr'&&stagedProof)?stagedProof:'';
  const disp={code:code,no:orderNo,items:OrdDisplay(ordMap),total:total,isCod:isCod,r:r,n:n,when:when,pay:payM,_claim:!!proof};
  if(!saved){showDone({...disp,warn:true});return}
  notifyOrderPush({code:code,no:orderNo,items:items,total:total,room:r,pay:payM});
  track('order_sent');chime();buzzOk();
  // Two pushes by design: this one says a drink needs making, the claim alert
  // (notifyOwnerClaim) says money needs checking. They carry different titles
  // and tags so a glance tells them apart. An earlier silence pass removed the
  // order push; b77d07f deliberately brought it back.
  showDone({...disp,warn:false});
  saveMyOrder(disp);saveCustomer();
  if(proof)submitClaim(code,proof,orderNo,r,null,{items:items,total:total});
  toast('✓ Pesanan dihantar!');
  const l=getLoy();l.c++;if(l.c%5===0)setTimeout(()=>toast('Congrats! Minuman percuma seterusnya!'),900);saveLoy(l);drawLoy();
  cart={};saveCart();selTime='';selBlock='';isCod=null;payM='';
  if(cpnCode)dropCpn(cpnCode);
  cpnCode='';cpnOk=false;cpnLine=-1;
  {const _ci=document.getElementById('inp-coupon');if(_ci)_ci.value='';
   const _cs=document.getElementById('coupon-section');if(_cs)_cs.style.display='none';
   const _cm=document.getElementById('coupon-msg');if(_cm){_cm.style.color='var(--muted)';_cm.textContent='Masukkan kod yang penjual beri. Satu kod untuk satu minuman percuma (add-on tetap dikenakan).'}}
  // The checkout receipt block goes back to blank for the next order, and the
  // payment choice is cleared on screen as well as in state, so the QR section
  // does not linger showing a resit that has already been sent.
  stagedProof='';
  const qs=document.getElementById('qr-section');if(qs)qs.style.display='none';
  document.querySelectorAll('#pay button').forEach(function(b){b.classList.remove('active')});
  const qf=document.getElementById('qr-claim-file');if(qf)qf.value='';
  const qn=document.getElementById('qr-claim-file-name');
  if(qn){qn.style.display='none';qn.textContent='✓ Resit dipilih'}
  const pt=document.getElementById('pickup-time');if(pt)pt.value='';
  const ph=document.getElementById('inp-phone');if(ph)ph.value='';
  const rr=document.getElementById('room-row');if(rr)rr.style.display='none';
  closeConfirm();closeCart();draw();
}
function OrdDisplay(map){return Object.values(map)}
function saveCustomer(){
  try{
    const prev=loadCustomer()||{};
    localStorage.setItem('mms_cust',JSON.stringify({
      n:clip(document.getElementById('inp-name2').value,25),
      // The number is no longer typed on the form - the stamp prompt collects
      // it after the order. Carrying the stored one forward is what lets the
      // NEXT order send it, without ever asking a second time.
      ph:prev.ph||'',
      block:selBlock||'',
      room:clip(document.getElementById('inp-room').value,20)
    }));
  }catch(e){}
}
function clearCustomer(){
  try{localStorage.removeItem('mms_cust')}catch(e){}
  const a=document.getElementById('inp-name2');if(a)a.value='';
  const b=document.getElementById('inp-phone');if(b)b.value='';
  const c=document.getElementById('inp-room');if(c)c.value='';
  selBlock='';drawBlocks();
  const r=document.getElementById('room-row');if(r)r.style.display='none';
  const ns=document.getElementById('name-section');if(ns)ns.style.display='block';
  const w=document.getElementById('cust-note');if(w)w.style.display='none';
  toast('Maklumat dikosongkan');
}
function saveMyOrder(o){try{localStorage.setItem('mms_last',JSON.stringify({code:o.code,no:o.no,at:Date.now(),total:o.total,items:o.items,isCod:o.isCod,r:o.r,when:o.when,pay:o.pay,_claim:!!o._claim}));showMyOrderBtn()}catch(e){}}
let _lastSt='';
function notifySupported(){return typeof window.Notification!=='undefined'}

// Asked once per device. If the browser ignores or refuses, nothing breaks.
function autoAskNotify(){
  if(!notifySupported())return;
  let asked=false;
  try{asked=localStorage.getItem('mms_notif_asked')==='1'}catch(e){}
  if(asked||Notification.permission!=='default')return;
  try{localStorage.setItem('mms_notif_asked','1')}catch(e){}
  try{Notification.requestPermission().then(function(){}).catch(function(){})}catch(e){}
}
function fireNotify(title,body){
  try{
    if(!notifySupported()||Notification.permission!=='granted')return;
    if(document.visibilityState==='visible')return;
    new Notification(title,{body:body,tag:'mms-order',renotify:false});
  }catch(e){}
}
// The guaranteed part: sound, vibration and a visible highlight. Requires no
// permission, works in every browser, and is what most customers will actually
// experience.
function alertDone(st){
  try{beep(st==='done'?1180:760,0.2,0.12)}catch(e){}
  try{if(navigator.vibrate)navigator.vibrate(st==='done'?[70,60,70,60,140]:[50,60,110])}catch(e){}
  const el=document.getElementById('done');
  if(el){el.classList.remove('alert');void el.offsetWidth;el.classList.add('alert')}
}
// ---------------------------------------------------------------------------
// The live order, kept on screen while it is live.
//
// The status used to be reachable only by tapping a small pill, which is easy
// to miss and easy to forget. This sits at the top of the page, follows the
// tracking listener, and carries the way to order again.
//
// Built in JS and prepended to the body so it needs no markup edit and cannot
// disturb the page it sits above.
// ---------------------------------------------------------------------------
function paintMyBar(st){
  let b=document.getElementById('mybar');
  if(!b){
    b=document.createElement('div');
    b.id='mybar';
    b.innerHTML='<span class="mb-who"></span><span class="mb-st"></span>'
      +'<button class="mb-see" onclick="openMyOrder()">Lihat</button>';
    document.body.insertBefore(b,document.body.firstChild);
  }
  const o=loadMyOrder();
  if(!o||!o.code){b.classList.remove('on');return}
  const eff=st||o._st||'baru';
  // Delivered means finished: the bar is not a trophy, it is a to-do.
  if(eff==='done'){b.classList.remove('on');return}
  b.classList.add('on');
  b.querySelector('.mb-who').textContent='📦 #'+fmtNo(o.no);
  // The live status if we have one, otherwise whatever the device last knew.
  b.querySelector('.mb-st').textContent=admStatusText(st||o._st||'baru',!!o.isCod);
}
// Back to the menu with an empty cart: a fresh order rather than the last one
// repeated. The bar stays up, because the order it describes is still live.
function orderMore(){
  cart={};saveCart();draw();upCart();closeDone();
  // custItem, not curItem - the first version named a variable that does not
  // exist, so it threw here and the toast never ran.
  if(custItem)closeCust();
  try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){window.scrollTo(0,0)}
  toast('Pilih minuman untuk pesanan baru');
}
function showMyOrderBtn(){const b=document.getElementById('my-order');if(!b)return;const o=loadMyOrder();const fin=!!(o&&o._st==='done');b.style.display=(o&&!fin)?'inline-flex':'none';if(o&&!fin)b.textContent='📦 Pesanan saya · #'+fmtNo(o.no);paintMyBar()}
function openMyOrder(){const o=loadMyOrder();if(!o)return;_lastSt='';showDone({...o,warn:false})}
function showDone(o){
  const el=document.getElementById('done');if(!el)return;
  el._msg=o;
  const rows=(o.items||[]).map(i=>'<div class="r"><span>'+i.qty+'x '+esc(i.name)+(i.adds&&i.adds.length?' <span style="color:#39443F">· '+esc(i.adds.join(', '))+'</span>':'')+'</span><b>RM'+(i.price*i.qty).toFixed(2)+'</b></div>').join('');
  el.innerHTML='<div class="tick">'+(o.warn?'⚠':'✓')+'</div>'
    +'<h2>'+(o.warn?'Pesanan disimpan':'Pesanan Diterima')+'</h2>'
    +'<div class="code">'+(o.no?'Pesanan #'+fmtNo(o.no):(o.code?'#'+esc(o.code):''))+(o.no&&o.code?'<span class="done-chip">'+esc(o.code)+'</span>':'')+'</div>'
    +(o.warn?'<div class="warnbox">Rekod pesanan gagal disimpan. Hantar melalui WhatsApp supaya penjual tetap terima pesanan anda.</div>':'')
    +'<div class="box2">'+rows
      +'<div class="r tot"><span>Jumlah</span><b>RM'+Number(o.total).toFixed(2)+'</b></div>'
      +'<div class="r"><span>Penghantaran</span><b>'+(o.isCod?('COD (+RM'+delFee('cod').toFixed(2)+')'):'Ambil sendiri')+'</b></div>'
      +(o.isCod?'<div class="r"><span>Lokasi</span><b>'+esc(o.r)+'</b></div>':'')
      +'<div class="r"><span>Masa</span><b>'+esc(fmtTimeLabel(o.when))+'</b></div>'
    +'</div>'
    +stepsHtml(o)
    +'<div id="done-status"></div>'
    +'<div id="paid-mark" style="display:none">✓ Bayaran diterima</div>'
    +'<div id="claim-state" style="display:none">⏳ Menunggu penjual semak bayaran anda</div>'
    +'<button class="go2" onclick="closeDone()">Selesai</button>'
    +(o.warn?'<button class="alt" onclick="reopenWa()">Hantar melalui WhatsApp</button>':'');
  el.classList.add('show');
  if(!o.warn&&o.code)trackOrder(o.code);
  autoAskNotify();
  paintClaim();
  paintSteps(o.warn?'':(o._st||'baru'));
}
// The four pills map onto three real statuses, so processing has to light
// Dibuat and Dalam perjalanan together - the order is being made and carried
// at once. The stagger below is what stops that double-light looking like a
// jump: the two steps pop one after the other.
// The strip follows the delivery method. An order being ridden out ends when it
// arrives; one being collected ends when the customer comes for it. Both open
// the same way, so only the tail differs.
//
// processing lights two steps on a COD order, because one status has to cover
// making the drink and carrying it and there is no separate button for the
// ride. On a pickup order making it is the whole job, so it lights one.
const STEP_SETS={
  cod:{labels:['Diterima','Dibuat','Dalam perjalanan','Sampai'],
       rank:{baru:0,processing:2,done:3},
       text:['Menunggu pengesahan penjual','Sedang dibuat','Sedang dibuat / dalam perjalanan','Siap! Terima kasih 🍹']},
  ambil:{labels:['Diterima','Dibuat','Sila ambil'],
       rank:{baru:0,processing:1,done:2},
       text:['Menunggu pengesahan penjual','Sedang dibuat','Siap! Sila ambil 🍹']}
};
function stepKey(o){return (o&&o.isCod)?'cod':'ambil'}
function stepsHtml(o){
  const k=stepKey(o),L=STEP_SETS[k].labels;
  // data-mode is what paintSteps reads back, so the labels and the ranks can
  // never drift apart
  return '<div class="steps" id="done-steps" data-mode="'+k+'">'
    +L.map(function(t,i){return (i?'<span class="arw">›</span>':'')+'<span class="st" data-i="'+i+'">'+t+'</span>'}).join('')
    +'</div>';
}
let _labSwapT=null;
function paintSteps(st){
  const el=document.getElementById('done-steps');
  if(!el)return;
  const set=STEP_SETS[el.dataset.mode]||STEP_SETS.cod;
  let r=set.rank[st];
  if(r===undefined)r=0;
  // the last step of whichever set is in play is the one that means landed
  const fin=(r>=set.labels.length-1);
  const hadRank=el.dataset.rank!==undefined;
  const prev=hadRank?Number(el.dataset.rank):r;
  let prevLit=false,prevCur=false;
  Array.prototype.forEach.call(el.children,function(k){
    if(k.classList.contains('arw')){
      // a chevron lights once the step behind it is reached, and the one
      // leaving the frontier keeps nudging so the row has a direction
      k.classList.toggle('on',prevLit);
      k.classList.toggle('next',prevCur&&!fin);
      return;
    }
    const i=Number(k.dataset.i);
    const lit=i<=r;
    const cur=lit&&i===r&&!fin;
    k.classList.toggle('on',lit);
    k.classList.toggle('cur',cur);
    if(lit&&hadRank&&i>prev){
      k.classList.remove('pop');
      void k.offsetWidth;
      k.style.animationDelay=((i-prev-1)*0.12)+'s';
      k.classList.add('pop');
      setTimeout(function(){k.classList.remove('pop');k.style.animationDelay=''},900);
    }
    prevLit=lit;prevCur=cur;
  });
  // added once, so the settle plays when the order lands and not again on
  // every later snapshot
  if(fin&&!el.classList.contains('fin'))el.classList.add('fin');
  else if(!fin)el.classList.remove('fin');
  el.dataset.rank=String(r);
  const lab=document.getElementById('done-status');
  if(lab){
    const txt=set.text[r]||set.text[0];
    if(lab.textContent!==txt){
      clearTimeout(_labSwapT);
      lab.classList.add('swap');
      _labSwapT=setTimeout(function(){lab.textContent=txt;lab.classList.remove('swap')},170);
    }
  }
}
let _trackUnsub=null;
function trackOrder(code){
  if(_trackUnsub){_trackUnsub();_trackUnsub=null}
  // A new subscription has no history. Without this the first snapshot was
  // compared against whatever the previous order had last been, so placing an
  // order after an earlier one had been marked made or on its way lit the
  // stepper, beeped and pushed a notification about an order nothing had
  // happened to yet.
  _lastSt='';
  const db=getDb();if(!db||!code)return;
  _trackUnsub=db.collection('tracking').doc(code).onSnapshot(function(s){
    if(!s.exists)return;
    const d=s.data()||{};
    const ns=d.status||'baru';
    if(_lastSt&&_lastSt!==ns){
      const dn=document.getElementById('done');
      const o=(dn&&dn._msg)||{};
      fireNotify('Pesanan '+orderRef(o),admStatusText(ns,!!o.isCod));
      alertDone(ns);
    }
    _lastSt=ns;
    if(ns==='done'){const _o=loadMyOrder();if(_o){_o._st='done';try{localStorage.setItem('mms_last',JSON.stringify(_o))}catch(e){}}loadMyCoupons();}
    paintSteps(ns);paintMyBar(ns);showMyOrderBtn();
    const el=document.getElementById('done');
    if(el&&el._msg)el._msg._st=d.status||'baru';
    const o=loadMyOrder();
    if(o&&o.code===code){
      o._st=d.status;o._paid=!!d.paid;
      const pm=document.getElementById('paid-mark');
      if(pm)pm.style.display=d.paid?'block':'none';
      try{localStorage.setItem('mms_last',JSON.stringify(o))}catch(e){}
    }
  },function(){});
}
function reopenWa(){const o=document.getElementById('done')._msg;if(!o)return;let msg='Hi '+SHOP+'! Pesanan:\n';if(o.code)msg+='No. Pesanan: #'+o.code+'\n';(o.items||[]).forEach(i=>{msg+=i.qty+'x '+i.name+' = RM'+(i.price*i.qty).toFixed(2)+(i.adds&&i.adds.length?' ('+i.adds.join(', ')+')':'')+'\n'});msg+='\nJumlah: RM'+Number(o.total).toFixed(2);window.open(waUrl(msg),'_blank')}
// ---------------------------------------------------------------------------
// The receipt block, at CHECKOUT, underneath the QR the customer is about to
// pay from.
//
// This is the only placement. The proof is attached while the order is being
// filled in and it rides up with the order: attaching it is what makes this a
// paid order, and placing the order is the moment the seller is told. There is
// deliberately no second ask once the order has been made.
//
// p is the id prefix, so these ids cannot collide with anything else.
// ---------------------------------------------------------------------------
function claimBlockHtml(p){
  p=p||'';
  // Always shown - the QR section it lives in is what gets hidden.
  const box=p?'block':'none';
  return '<div id="'+p+'claim-panel" style="display:'+box+';background:rgba(16,26,22,0.04);border:1px solid rgba(16,26,22,0.1);border-radius:12px;padding:14px;margin-bottom:12px;text-align:left">'
    +'<div style="font-size:13px;font-weight:800;color:#101A16;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">💰 Bayar sekarang</div>'
    +'<div style="font-size:13px;color:var(--muted);font-weight:600;margin-bottom:12px;line-height:1.5">Scan QR di atas, kemudian hantar resit (gambar atau PDF) supaya penjual boleh sahkan bayaran anda.</div>'
    +'<input type="file" id="'+p+'claim-file" accept="image/*,application/pdf" style="display:none" onchange="claimPicked(\''+p+'\')">'
    +'<label for="'+p+'claim-file" class="filelbl">📎 Pilih resit — gambar atau PDF <span style="color:var(--red-ink)">(wajib)</span></label>'
    +'<div id="'+p+'claim-file-name" style="display:none;font-size:13px;color:#101A16;font-weight:700;margin-bottom:10px">✓ Resit dipilih</div>'
    +'<button id="'+p+'claim-send" onclick="sendClaim(\''+p+'\')" style="width:100%;background:#101A16;color:#F7FAF5;border:none;font-weight:800;font-size:14px;padding:13px;border-radius:10px;cursor:pointer">Saya dah bayar</button></div>';
}
// Held in memory only, and only until the order exists. Nothing is written and
// the seller is not told at this point; the file is simply waiting with the
// order. A refresh means picking it again, which is the right trade for not
// parking a customer's receipt in localStorage.
let stagedProof='';
function claimPicked(p){
  p=p||'';
  const f=document.getElementById(p+'claim-file');
  const n=document.getElementById(p+'claim-file-name');
  const file=f&&f.files&&f.files[0];
  // Refuse an oversized PDF up front instead of ticking it green and failing
  // later at submit time. Clear the input so a stale selection cannot ride
  // along with the order.
  if(file&&isPdfFile(file)&&file.size>PDF_MAX_BYTES){
    if(f)f.value='';
    if(n){n.style.color='#C6381E';n.style.display='block';n.textContent='❌ PDF terlalu besar (maks 480KB)'}
    toast('❌ PDF terlalu besar (maks 480KB)');
    if(p)stagedProof='';
    return;
  }
  const has=!!file;
  if(n){n.style.color='#101A16';n.style.display=has?'block':'none';if(has)n.textContent='✓ '+file.name.slice(0,35)}
  // un-picking at checkout drops the staged copy, so an order can never carry a
  // proof the customer backed out of
  if(p&&!has)stagedProof='';
}
// Turns a picked file into a data URL, or throws the message to show the
// customer. Shared by both placements.
async function readProof(f){
  const pdf=isPdfFile(f);
  if(pdf&&f.size>PDF_MAX_BYTES)throw new Error('❌ PDF terlalu besar (maks 480KB) - hantar sebagai gambar, atau PDF yang lebih kecil');
  toast(pdf?'Memproses PDF...':'Memproses gambar...');
  const img=pdf?await fileToDataUrl(f):await shrinkImage(f,1000,0.72);
  // the rules cap this at 700000 chars, so check before spending a write
  if(img.length>680000)throw new Error((pdf?'PDF':'Gambar')+' terlalu besar - guna fail lain');
  if(!pdf&&img.length<2000)throw new Error('Gambar kelihatan kosong - cuba gambar lain');
  return img;
}
// The single place a claim is written. Both routes end up here, so the promise
// the seller leans on - told only once proof is attached AND the customer has
// said they paid - holds no matter which placement they used.
function submitClaim(code,img,no,room,onDone,info){
  const db=getDb();
  if(!db||!code||!img){if(onDone)onDone(false);return}
  const nfo=info||{};
  db.collection('payments').doc(code).set({img:img,at:firebase.firestore.FieldValue.serverTimestamp()})
    .then(function(){notifyOwnerClaim({no:no,room:room,code:code,items:nfo.items,total:nfo.total});if(onDone)onDone(true)})
    .catch(function(err){console.warn('claim gagal:',err);if(onDone)onDone(false)});
}
async function sendClaim(p){
  p=p||'';
  const atCheckout=!!p;
  const btn=document.getElementById(p+'claim-send');
  const fileIn=document.getElementById(p+'claim-file');
  const btnLabel='Saya dah bayar';
  const f=fileIn&&fileIn.files&&fileIn.files[0];
  // No proof, no alert. Refuse before anything is written or staged, so an
  // empty tap cannot reach the seller at all.
  if(!f){
    const panel=document.getElementById(p+'claim-panel');
    const lbl=panel?panel.querySelector('.filelbl'):null;
    if(lbl){lbl.style.borderColor='#C6381E';setTimeout(function(){lbl.style.borderColor=''},1600)}
    toast('📎 Pilih resit dahulu');
    return;
  }
  const dn=document.getElementById('done');
  const o=(dn&&dn._msg)||{};
  if(!atCheckout&&!o.code){toast('Rujukan pesanan tidak dijumpai');return}
  btn.disabled=true;btn.textContent=atCheckout?'Menyediakan...':'Menghantar...';
  let img='';
  try{img=await readProof(f)}
  catch(e){btn.disabled=false;btn.textContent=btnLabel;toast(String((e&&e.message)||'Fail tidak boleh dibaca'));return}
  if(atCheckout){
    // The order does not exist yet, so there is nothing to attach the proof to.
    // It waits here and goes up with the order instead.
    stagedProof=img;
    btn.disabled=false;btn.textContent=btnLabel;
    const n=document.getElementById(p+'claim-file-name');
    if(n){n.style.display='block';n.textContent='✓ Resit sedia - tekan Hantar Pesanan'}
    toast('✓ Resit sedia - tekan Hantar Pesanan');
    return;
  }
  submitClaim(o.code,img,o.no,o.r,function(ok){
    btn.disabled=false;btn.textContent=btnLabel;
    if(!ok){toast('Gagal hantar resit');return}
    o._claim=true;dn._msg=o;
    saveMyOrder(o);
    paintClaim();
    toast('✓ Resit dihantar - penjual akan semak');
  },{items:(o.items||[]).reduce(function(s,i){return s+(i.qty||0)},0),total:o.total});
}
function paintClaim(){
  const dn=document.getElementById('done');
  const o=(dn&&dn._msg)||{};
  const qr=o.pay==='qr';
  const st=document.getElementById('claim-state');
  // The receipt is asked for at checkout now, not here. What remains on the
  // done screen is the waiting state, for a QR order that came with a proof.
  if(st)st.style.display=(qr&&o._claim)?'block':'none';
}
function closeDone(){const el=document.getElementById('done');if(el)el.classList.remove('show')}
function setOrderStatus(id,st){const db=getDb();if(!db)return;db.collection('orders').doc(id).update({status:st}).catch(e=>console.warn('Firestore update gagal:',e))}
