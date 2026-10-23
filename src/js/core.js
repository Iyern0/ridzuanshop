/* core.js - MINUM MALAM SISWA. Built from src/ by tools/build.py; edit the source parts, not this file. */
const SHOP='MINUM MALAM SISWA',WA='601116470212';
let SLOTS=['11:30PM','12:30AM','1:30AM'],unrTimes=[],selTime='';
let HOURS=[1350,120];
let WHO={n:'',b:'',note:'',img:''};
let MENU=[];
let ADDS=[
{id:'gula',name:'Gula',price:0,grp:'s'},{id:'susukm',name:'Susu Kental Manis',price:0,grp:'s'},
{id:'kurang_manis',name:'Kurang Manis (50%)',price:0,grp:'l'},
{id:'extra_gula',name:'Extra Gula',price:0.50,grp:'e'},{id:'extra_susu',name:'Extra Susu',price:0.50,grp:'e'},{id:'extra_kaw',name:'Extra Kaw',price:0.50,grp:'e'},
];
let DELS=[{t:'cod',l:'📦 COD (+RM1)',f:1},{t:'pickup',l:'🏪 Ambil Sendiri',f:0}];
// The admin can change a delivery method's fee. Read it from DELS instead of
// hardcoding RM1: a configured fee that the order math ignores is worse than
// no setting at all, because the review shows one number and the seller's
// message another.
function delFee(t){const d=DELS.find(function(x){return x.t===t});const f=d?Number(d.f):NaN;return isFinite(f)?f:(t==='cod'?1:0)}
let cart={},disAdds=[],disDel=[],isCod=null;
let admin=false,admClk=0,admTmr=null,custItem=null,custAdds=[];

// Must match isAdmin() in firestore.rules. Change both together.
const ADMIN_EMAIL='zjasneh5@gmail.com';

function adminUser(){
  const a=getAuth();const u=a&&a.currentUser;
  return (u&&u.email&&String(u.email).toLowerCase()===ADMIN_EMAIL)?u:null;
}
function paintAdminBtn(){
  const b=document.getElementById('admin-btn');
  const w=document.getElementById('admin-btn-wrap');
  const show=adminUser();
  if(b)b.style.display=show?'inline-flex':'none';
  // collapse the wrapper too, or it leaves a gap above the menu for customers
  if(w)w.style.display=show?'block':'none';
}
function findAdd(id){return ADDS.find(a=>a.id===id)}
function stampRowHtml(count){
  const p=count%5;let h='';
  for(let i=0;i<5;i++)h+='<div class="stamp'+(i<p?' filled':'')+'">'+(i<p?'⭐':'')+'</div>';
  return h;
}
function getLoy(){try{return JSON.parse(localStorage.getItem('mms_loy'))||{c:0}}catch(e){return{c:0}}}
  function cpnCopy(code){
    const done=function(){toast('\u2705 Kod '+code+' disalin')};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(code).then(done).catch(function(){toast('Kod: '+code)});
    else toast('Kod: '+code);
  }
  function drawLoy(){const el=document.getElementById('loy-count'),st=document.getElementById('stamps');if(!el||!st)return;const l=getLoy();el.textContent=l.c;st.innerHTML=stampRowHtml(l.c)}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2000)}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}

// 🔥 FIREBASE — Everything on Firestore: menu, config, disabled items, orders.
// Console: console.firebase.google.com → minum-malam-siswa
// Rules: allow read, write on /orders/{docId} and /settings/{docId}
const FIREBASE_CONFIG={apiKey:'AIzaSyCigQpzEiu8bVxJ9u0IWVCQ7qYMrCWJ9_g',authDomain:'minum-malam-siswa.firebaseapp.com',projectId:'minum-malam-siswa',storageBucket:'minum-malam-siswa.firebasestorage.app',messagingSenderId:'779932197479',appId:'1:779932197479:web:77d58967ab7d059c8c6ac2'};
const FB_READY=!!(FIREBASE_CONFIG.apiKey&&FIREBASE_CONFIG.apiKey.indexOf('PASTE')<0);
let _db=null,_auth=null;
function getDb(){try{if(!FB_READY)return null;if(_db)return _db;firebase.initializeApp(FIREBASE_CONFIG);_db=firebase.firestore();return _db}catch(e){console.warn('Firebase init gagal:',e);return null}}
function getAuth(){try{if(!FB_READY||!firebase.auth)return null;if(!_auth)_auth=firebase.auth();return _auth}catch(e){console.warn('Auth gagal:',e);return null}}
function orderRef(o){if(!o)return'#';if(o.no)return'#'+fmtNo(o.no);if(o.code)return'#'+o.code;return o.id?'#'+String(o.id).slice(0,6):'#'}
function fmtNo(n){n=Number(n)||0;return String(n).padStart(3,'0')}
let _sid=null;
function sid(){if(_sid)return _sid;try{_sid=sessionStorage.getItem('mms_sid')||''}catch(e){}if(!_sid)_sid=Date.now().toString(36)+Math.random().toString(36).slice(2,10);try{sessionStorage.setItem('mms_sid',_sid)}catch(e){}return _sid}
const _evOnce={};
function track(step,once){try{if(once&&_evOnce[step])return;_evOnce[step]=1;const db=getDb();if(!db)return;db.collection('events').add({step:step,at:firebase.firestore.FieldValue.serverTimestamp(),sid:sid()}).catch(function(){})}catch(e){}}

// Firestore settings — single doc per collection
const MENU_DOC='settings/menu',CONFIG_DOC='settings/config',DIS_DOC='settings/disabled';
async function fsGet(path){const db=getDb();if(!db)return null;try{const s=await db.doc(path).get();return s.exists?s.data():null}catch(e){return null}}
async function fsSet(path,data){const db=getDb();if(!db)return false;try{await db.doc(path).set(data);return true}catch(e){console.warn(e);return false}}

let dis={};
function isDis(id){return dis[id]===true}

function getConfig(){return{adds:ADDS,slots:SLOTS,dels:DELS,blocks:BLOCKS,disAdds,unrTimes,disDel,disBlocks,hours:HOURS,who:WHO}}
// The seller's config can end up holding two add-ons under one id: rename an
// add-on, then add another under the name it used to have, and the new one
// slugs to the id the old one still carries. Everything downstream keys
// add-ons by id, so a duplicate makes two buttons drive one choice - tapping
// either lights both, and the second one's order is recorded under the first
// one's name. The first entry keeps the id, because existing orders refer to
// it; a later one is given a distinct one.
function addSlug(name,i){return String(name==null?'':name).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||('addon_'+i)}
function normAdds(list){
  const seen={},out=[];
  (list||[]).forEach(function(a,i){
    a=a||{};
    let id=a.id||addSlug(a.name,i);
    if(seen[id]){const base=addSlug(a.name,i);let n=2,c=base;while(seen[c])c=base+'_'+(n++);id=c}
    seen[id]=true;
    out.push({...a,id:id});
  });
  return out;
}
// Applied to the first read and to every realtime update alike. They used to
// differ, so a change pushed from the seller's other device landed in a shape
// only the initial load could cope with: add-ons without ids, or disabled
// add-ons still keyed by index.
function applyCfg(d){
  if(!d)return;
  if(d.adds)ADDS=normAdds(d.adds);
  if(d.slots)SLOTS=d.slots;
  if(d.dels)DELS=d.dels;
  if(d.disAdds){if(d.disAdds.length>0&&typeof d.disAdds[0]==='number')disAdds=d.disAdds.map(i=>ADDS[i]?ADDS[i].id:null).filter(Boolean);else disAdds=d.disAdds}
  if(d.unrTimes)unrTimes=d.unrTimes;
  if(d.disDel)disDel=d.disDel;
  if(d.blocks)BLOCKS=d.blocks;
  if(d.disBlocks)disBlocks=d.disBlocks;
  if(Array.isArray(d.hours)&&d.hours.length===2)HOURS=d.hours;
  if(d.who&&typeof d.who==='object')WHO=d.who;
}
async function loadConfig(){const d=await fsGet(CONFIG_DOC);if(d)applyCfg(d)}
async function saveConfig(){return await fsSet(CONFIG_DOC,getConfig())}

// settings/menu — the drink list. It is edited from the dashboard and read by the
// shop, so the loader lives here rather than in the shop page: without it the
// dashboard's Minuman tab draws its add form over an empty list.
let CHEAPEST_PRICE=0;
function computeCheapest(){let c=Infinity;(MENU||[]).forEach(function(cat){var it=(cat&&cat.items)||[];it.forEach(function(v){if(typeof v.price==='number'&&v.price>0&&v.price<c)c=v.price})});CHEAPEST_PRICE=(c===Infinity?0:c)}
function menuCats(list){return (Array.isArray(list)?list:[]).filter(function(c){return c&&Array.isArray(c.items)})}
async function loadMenu(){const d=await fsGet(MENU_DOC);const cats=menuCats(d&&d.items);if(cats.length>0){MENU=cats}else if(typeof DEFAULT_MENU!=='undefined'){MENU=JSON.parse(JSON.stringify(DEFAULT_MENU));await fsSet(MENU_DOC,{items:MENU})}else{MENU=[]}computeCheapest();paintMenu()}
// One repaint for both pages: the shop redraws its grid and the cart bar (a new
// price must not wait for a reload to reach the cart), the dashboard listens for
// the event and refreshes its Minuman tab.
// Shared by the dashboard's order detail and the shop's order confirmation.
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
function paintMenu(){if(document.getElementById('menu-root')){draw();if(document.getElementById('cart-bar'))upCart()}document.dispatchEvent(new Event('mms:menu'))}
async function initConfig(){await loadConfig();await loadMenu();const db=getDb();if(db)db.doc(CONFIG_DOC).onSnapshot(snap=>{if(!snap.exists)return;const d=snap.data();applyCfg(d);drawStatus();
    // The snapshot is shared by both pages. This half of it paints the shop
    // window, which the dashboard page does not own; without the check the
    // dashboard throws on the first config push.
    const shopPage=!!document.getElementById('menu-root');
    if(shopPage){if(loadCustomer())fillCustomer();if(d.who&&typeof d.who==='object')drawFounder();draw();drawTimes();drawDel();drawCust()}
    drawBlocks()})
  // The menu is edited from the dashboard, often while a phone sits on the shop
  // page with the app already open. Push it, so a new drink or a new price shows
  // up there without a reload.
  if(db)db.doc(MENU_DOC).onSnapshot(snap=>{if(!snap.exists)return;const d=snap.data();const cats=menuCats(d&&d.items);if(!cats.length){console.warn('settings/menu has no drink list');return}MENU=cats;computeCheapest();paintMenu()})}
/* ---- v3: the counter's copy ------------------------------------------------
   One line per drink, written to be true of an iced, freshly-mixed cup sold at
   a night stall. The owner edits these in MENU_NOTES; anything unlisted falls
   back to the house line rather than to an empty space. */
const MENU_NOTES={
  'Extrajoss':'Ais pekat, manis kaw.','Milo':'Milo kaw atas ais.','Indocafe':'Kopi susu, ais penuh.',
  'Chocolate':'Coklat pekat, sejuk.','Horlicks':'Malty, manis sederhana.','Hazelnut':'Kacang panggang, manis.',
  'Mocha':'Kopi dan coklat, sejuk.','Bandung':'Sirap ros dan susu.','Teh':'Teh tarik, ais banyak.'
};
function noteFor(n){for(const k in MENU_NOTES){if(String(n).indexOf(k)>=0)return MENU_NOTES[k]}return 'Ais sejuk, bancuh segar.'}
function slugFor(n){return String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}

/* The stand-in when a drink has no photograph yet: a flat glass, tinted from
   the name so the menu still reads as drinks rather than as empty boxes. A real
   photo at photos/<slug>.jpg replaces it the moment it is added. */
/* The colour of the drink, not of the word: Milo is brown, anggur is purple. */
function liquidHue(name){
  const t=' '+String(name||'').toLowerCase()+' ';
  const map=[
    [['milo','coklat','chocolate','belgian','nutella'],'hsl(26,44%,31%)'],
    [['hazelnut','latte','kopi','coffee','indocafe','nescafe'],'hsl(27,48%,40%)'],
    [['mocha'],'hsl(24,38%,34%)'],
    [['horlicks','malt'],'hsl(34,58%,57%)'],
    [['anggur','grape','ribena','blueberry'],'hsl(287,52%,50%)'],
    [['mangga','mango','oren','orange','sunkist','limau'],'hsl(36,90%,55%)'],
    [['teh','tea','tealive'],'hsl(30,64%,49%)'],
    [['lemon','nanas','pineapple'],'hsl(52,84%,58%)'],
    [['soya','susu','milk'],'hsl(40,34%,90%)'],
    [['bandung'],'hsl(342,48%,72%)'],
    [['sirap','bak','merah','strawberry','tembikai'],'hsl(356,72%,52%)'],
    [['air'],'hsl(190,18%,88%)']
  ];
  for(const [keys,col] of map){ if(keys.some(k=>t.indexOf(k)>-1)) return col; }
  const h=String(name||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return 'hsl('+h+',66%,54%)';
}

function glassSVG(name){
  const col=liquidHue(name);
  return '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
    '<rect width="100" height="100" fill="#1B1713"/>'+
    '<ellipse cx="50" cy="93.5" rx="19" ry="3.6" fill="rgba(0,0,0,0.38)"/>'+
    '<path d="M29.5 17.5h41L64.6 85.6A6.4 6.4 0 0 1 58.2 91.4H41.8A6.4 6.4 0 0 1 35.4 85.6Z" fill="rgba(242,239,233,0.10)"/>'+
    '<path d="M31.9 44h36.2l-3.5 40.9a5 5 0 0 1-5 4.5H40.4a5 5 0 0 1-5-4.5Z" fill="'+col+'"/>'+
    '<ellipse cx="50" cy="44" rx="18.1" ry="3.3" fill="'+col+'" opacity="0.62"/>'+
    '<rect x="39" y="49" width="13" height="13" rx="2.5" fill="rgba(255,255,255,0.42)" transform="rotate(12 45.5 55.5)"/>'+
    '<rect x="55.8" y="12" width="5.6" height="40" rx="2.8" fill="#C6F53C" transform="rotate(9 58.6 32)"/>'+
    '<path d="M29.5 17.5h41l-0.9 4.6h-39.2Z" fill="rgba(242,239,233,0.07)"/>'+
    '<path d="M29.5 17.5h41L64.6 85.6A6.4 6.4 0 0 1 58.2 91.4H41.8A6.4 6.4 0 0 1 35.4 85.6Z" fill="none" stroke="rgba(242,239,233,0.22)" stroke-width="1.3"/>'+
    '</svg>';
}

function draw(){
  // The dashboard page loads this file but owns no menu: nothing to draw there.
  const r=document.getElementById('menu-root');
  if(!r)return;
  if(MENU&&MENU.length){track('menu_view',true)}
  if(!MENU||MENU.length===0){r.innerHTML='';upCart();drawLoy();drawDel();return}
  if(pruneCart()){saveCart();upCart()}
  let h='<div class="grid">';
  MENU.forEach((cat,ci)=>{cat.items.forEach((v,vi)=>{
    const id='c'+ci+'v'+vi, d=isDis(id), items=cart[id]||[], cq=items.length;
    const src=v.img||('photos/'+slugFor(v.name)+'.jpg');
    h+='<div class="card'+(d?' is-off':'')+(cq?' is-in':'')+'" data-drink="'+id+'" onclick="addToCart(\''+esc(id)+'\')">'+
       '<div class="plate">'+
         '<div class="art">'+glassSVG(v.name)+'</div>'+
         '<img class="photo" src="'+esc(src)+'" alt="'+esc(v.name)+'" loading="lazy" onerror="this.remove()">'+
         (d?'<span class="tag is-off">Habis</span>':'<span class="tag">RM'+(Number(v.price)||0).toFixed(2)+'</span>')+
         (cq?'<span class="cnt">'+cq+'</span>':'')+
       '</div>'+
       '<div class="nm">'+esc(v.name)+'</div>'+
       '<div class="nt">'+esc(noteFor(v.name))+'</div>'+
       '</div>';
  })});
  h+='</div>';
  r.innerHTML=h;upCart();drawLoy();drawDel();
}

function fmtMin(m){m=((m%1440)+1440)%1440;const h=Math.floor(m/60),mm=m%60,ap=h<12?'AM':'PM';let hh=h%12;if(hh===0)hh=12;return hh+':'+(mm<10?'0':'')+mm+ap}
function isOpenNow(){const n=new Date(),m=n.getHours()*60+n.getMinutes();const o=HOURS[0],c=HOURS[1];return o<=c?(m>=o&&m<c):(m>=o||m<c)}
function minsUntilClose(){const n=new Date(),m=n.getHours()*60+n.getMinutes();const c=HOURS[1];let d=c-m;if(d<=0)d+=1440;return d}
function drawFounder(){const el=document.getElementById('founder');if(!el)return;const w=WHO||{};if(!w.n){el.style.display='none';return}el.style.display='flex';el.innerHTML=(w.img?'<img src="'+esc(w.img)+'" alt="" onerror="this.style.display=\'none\'">':'')+'<div class="fi"><div class="fn">'+esc(w.n)+'</div><div class="fs">'+esc(w.b||'')+(w.note?' · '+esc(w.note):'')+'</div></div>'+(WA?'<a class="fb" href="https://wa.me/'+WA.replace(/[^0-9]/g,'')+'" target="_blank" rel="noopener">WhatsApp</a>':'')}
function syncTimeButton(){const b=document.getElementById('time-toggle');if(!b)return;b.textContent=(selTime==='ASAP'||!selTime?'ASAP':selTime)+' ▾'}
function drawStatus(){const el=document.getElementById('status-bar');if(!el)return;const o=HOURS[0],c=HOURS[1];if(isOpenNow()){const left=minsUntilClose();const lft=left<60?left+' minit':Math.floor(left/60)+' jam '+(left%60)+' min';el.className='status-bar open';el.innerHTML='<span class="dot"></span> BUKA SEKARANG · tutup dalam '+lft+' ('+fmtMin(c)+')'}else{el.className='status-bar closed';el.innerHTML='<span class="dot"></span> TUTUP · buka '+fmtMin(o)+' — anda masih boleh lihat menu'}clearTimeout(window._statusTmr);window._statusTmr=setTimeout(drawStatus,30000)}
function drawTimes(){const _el=document.getElementById('times');
  if(!SLOTS.length){_el.innerHTML='<div style="font-size:13px;color:var(--muted);font-weight:700;padding:4px 2px;line-height:1.5">Tiada slot masa tersedia sekarang. Taip masa yang anda mahu di bawah, atau pesan bila siap.</div>';return}
  _el.innerHTML=SLOTS.map((t,i)=>{const u=unrTimes.includes(t),a=selTime===t?' active':'';return'<button class="t-btn'+a+(u?' unavail':'')+(admin?' admin-mode':'')+'" onclick="selT('+i+')"'+(u&&!admin?' disabled':'')+'>'+esc(t)+'</button>'}).join('')}
function selT(i){const t=SLOTS[i];if(t===undefined)return;if(admin){const k=unrTimes.indexOf(t);if(k>-1)unrTimes.splice(k,1);else unrTimes.push(t);saveConfig();drawTimes();return}if(unrTimes.includes(t)){toast('❌ Time not available');return}selTime=t;const _pi=document.getElementById('pickup-time');if(_pi)_pi.value='';drawTimes()}
function drawCust(){if(!custItem||!MENU[custItem.ci]||!MENU[custItem.ci].items[custItem.vi]){closeCust();return}const sw=document.getElementById('c-sweet'),lv=document.getElementById('c-level'),ex=document.getElementById('c-extra');sw.innerHTML='';lv.innerHTML='';ex.innerHTML='';ADDS.forEach(a=>{const s=custAdds.includes(a.id),d=disAdds.includes(a.id);const ch='<button type="button" class="opt-btn'+(s?' sel':'')+(d?' dis':'')+'" onclick="togC(\''+a.id+'\')">'
    +'<span class="ob-dot"></span>'
    +'<span class="ob-name">'+esc(a.name)+'</span>'
    +(a.price>0?'<span class="ob-price">+RM'+a.price.toFixed(2)+'</span>':'<span class="ob-price free">percuma</span>')
    +'</button>';if(a.grp==='s')sw.innerHTML+=ch;else if(a.grp==='l')lv.innerHTML+=ch;else ex.innerHTML+=ch;});const at=custAdds.reduce((s,id)=>{const a=findAdd(id);return s+(a?a.price:0)},0);document.getElementById('c-price').textContent=(at+(custItem?MENU[custItem.ci].items[custItem.vi].price:0)).toFixed(2);}
let _addClicks={},_addTmr={};
function togC(addId){const a=findAdd(addId);if(!a)return;if(disAdds.includes(addId)&&!admin){toast('❌ '+a.name+' habis');return}if(admin){_addClicks[addId]=(_addClicks[addId]||0)+1;clearTimeout(_addTmr[addId]);_addTmr[addId]=setTimeout(()=>{_addClicks[addId]=0},2000);if(_addClicks[addId]>=4){_addClicks[addId]=0;if(disAdds.includes(addId)){disAdds=disAdds.filter(x=>x!==addId);toast('✓ '+a.name+' diaktifkan')}else{disAdds.push(addId);toast('❌ '+a.name+' dilumpuhkan')}saveConfig();drawCust();return}}const idx=custAdds.indexOf(addId);if(idx>-1){custAdds.splice(idx,1)}else{if(a.grp==='s'||a.grp==='l'){custAdds=custAdds.filter(id=>{const x=findAdd(id);return x&&x.grp!==a.grp})}custAdds.push(addId)}drawCust()}
/* Defaults are pre-selected on purpose (design pass 3). `defaultAdds()` already
   existed but was never called, so opening a drink meant two mandatory taps —
   one for the sweetener, one for the level — before "Add to cart" would even
   accept the tap, because confirmCust rejects a missing sweetener. Preselecting
   the first available option of each required group removes those taps and the
   rejection toast with them. Anything the customer picks replaces the default. */
function openCust(ci,vi){track('item_open');custItem={ci,vi};custAdds=defaultAdds();document.getElementById('c-title').textContent=MENU[ci].items[vi].name;drawCust();document.getElementById('cust').style.display='flex'}
function closeCust(){const el=document.getElementById('cust');custItem=null;custAdds=[];if(el)el.style.display='none'}
function defaultAdds(){const out=[];const s=ADDS.find(a=>a.grp==='s'&&!disAdds.includes(a.id));const l=ADDS.find(a=>a.grp==='l'&&!disAdds.includes(a.id));if(s)out.push(s.id);if(l)out.push(l.id);return out}
function addToCart(id){if(isDis(id)){toast('❌ Item habis');return}const ci=parseInt(id.match(/c(\d+)/)[1]),vi=parseInt(id.match(/v(\d+)/)[1]);if(!MENU[ci]||!MENU[ci].items[vi])return;openCust(ci,vi)}
/* What the customer chose, said once: the sweetener and the level are usually
   the same word ("Normal" / "Normal (100%)"), so printing both just doubles the
   line. Extras keep their plus. */
function addsLine(adds){
  const g={s:[],l:[],e:[]};
  (adds||[]).forEach(aid=>{const a=findAdd(aid);if(!a)return;(g[a.grp]||g.e).push(a.name)});
  const out=[];
  if(g.s.length&&g.l.length&&g.l[0].indexOf(g.s[0])===0)out.push(g.l[0]);
  else out.push.apply(out,g.s.concat(g.l));
  g.e.forEach(nm=>out.push('+'+nm));
  return out.join(' · ');
}
function remInst(key,idx){if(cart[key]){cart[key].splice(idx,1);if(cart[key].length===0)delete cart[key];saveCart();draw()}}
function upCart(){if(!document.getElementById('cart-bar'))return;drawDel();const e=Object.entries(cart);let totalItems=0;e.forEach(([_,v])=>totalItems+=v.length);const bar=document.getElementById('cart-bar');if(totalItems>0){bar.classList.add('show');document.getElementById('cart-count').textContent=totalItems+' item';}else{bar.classList.remove('show');}document.getElementById('checkout').disabled=totalItems===0;drawTimes();drawDel();syncTimeButton();let total=0,html='';e.forEach(([id,items])=>{if(!MENU)return;const ci=parseInt(id.match(/c(\d+)/)[1]),vi=parseInt(id.match(/v(\d+)/)[1]);if(!MENU[ci]||!MENU[ci].items[vi])return;const item=MENU[ci].items[vi];items.forEach((inst,i)=>{const ac=inst.adds.reduce((s,aid)=>{const a=findAdd(aid);return s+(a?a.price:0)},0);const base=Number(item.price)||0;total+=base+ac;const al=addsLine(inst.adds);html+='<div class="item"><div class="ii"><div class="nm">'+esc(item.name)+'</div><div class="sb">RM'+(base+ac).toFixed(2)+(al?' <span style="color:var(--muted)">· '+esc(al)+'</span>':'')+'</div></div><div class="iq"><button onclick="remInst(\''+id+'\','+i+')" style="color:var(--red-ink)">−</button><button onclick="addToCart(\''+id+'\')" style="color:#101A16">+</button></div></div>';});});document.getElementById('items').innerHTML=html;document.getElementById('items-summary').textContent=totalItems+' item · RM'+total.toFixed(2);const cod=(isCod===true?delFee('cod'):0);const _cfv=document.getElementById('cod-fee-val');if(_cfv)_cfv.textContent='RM'+delFee('cod').toFixed(2);document.getElementById('sub').textContent='RM'+total.toFixed(2);document.getElementById('total').textContent='RM'+(total+cod).toFixed(2);document.getElementById('cart-total').textContent='RM'+(total+cod).toFixed(2);document.getElementById('empty').style.display=totalItems?'none':'block';document.getElementById('cod-row').style.display=isCod===true?'flex':'none';const _rw=document.getElementById('repeat-wrap');if(_rw){const _lo=loadMyOrder();_rw.style.display=(_lo&&Array.isArray(_lo.items)&&_lo.items.length)?'block':'none'}
/* An empty basket should not show a delivery method, a name field, a time
   picker and a disabled Semak pesanan button — that is a form for nothing. The
   panel gets .is-empty and CSS hides everything but the empty state. */
document.getElementById('panel').classList.toggle('is-empty',totalItems===0)}
function closeCart(){const o=document.getElementById('overlay'),p=document.getElementById('panel');if(!o||!p)return;o.classList.remove('open');p.classList.remove('open')}
function cartInstances(){let k=0;Object.keys(cart).forEach(function(id){const c=cart[id];if(c&&c.length)k+=c.length});return k}
// The cart holds nothing but the coupon's own drink.
function couponOnly(){return payM==='coupon'&&cpnOk&&cartInstances()===1}
function drawDel(){
  const box=document.getElementById('del');
  const onlyFree=couponOnly();
  box.innerHTML=DELS.map(function(d){
    const di=disDel.includes(d.t);
    const a=(isCod===true&&d.t==='cod')||(isCod===false&&d.t==='pickup');
    const label=d.t==='cod'&&onlyFree?'&#128230; COD +RM1':esc(d.l);
    return '<button class="dt-btn'+(a?' active':'')+(di?' unavail':'')+(admin?' admin-mode':'')+'" data-type="'+d.t+'">'+label+'</button>';
  }).join('')
  +(onlyFree?'<div style="margin-top:8px;font-size:12px;color:var(--muted);line-height:1.5">&#127903; Minuman percuma diambil sendiri. Nak dihantar ke bilik? Tekan COD dan RM1 penghantaran dikenakan.</div>':'');
}
let selBlock='';
let BLOCKS=['Intan','Delima','Baiduri Wing A','Baiduri Wing B'];let disBlocks=[];
function drawBlocks(){
  // The block picker is part of the shop page's cart; the dashboard has none.
  const g=document.getElementById('block-grid');
  if(!g)return;
  // Whenever the grid is drawn and nothing is chosen yet, try the memory once.
  // This is what makes the restore timing-proof: it no longer depends on which
  // of the boot tasks finished first.
  if(!selBlock&&BLOCKS.length&&!_restoring){_restoring=true;try{restoreLocation()}catch(e){}_restoring=false}g.innerHTML=BLOCKS.map((b,i)=>{const dis=disBlocks.includes(b);return'<button onclick="pickBlock('+i+')"'+(selBlock===b?' class="active"':'')+(dis?' style="opacity:0.3;cursor:not-allowed;text-decoration:line-through"':'')+'>'+esc(b)+'</button>'}).join('')}
function pickBlock(i){const b=BLOCKS[i];if(b===undefined)return;if(disBlocks.includes(b)){toast('❌ Blok tidak tersedia');return}selBlock=b;drawBlocks();upCart();document.getElementById('room-row').style.display='block';setTimeout(()=>document.getElementById('inp-room').focus(),100)}
let payM='';
let cpnCode='',cpnOk=false,cpnLine=-1,_revPrice=[],_revLabel=[];
function closeConfirm(){const m=document.getElementById('confirm-modal');if(m)m.style.display='none'}
function saveCart(){try{localStorage.setItem('mms_cart',JSON.stringify(cart))}catch(e){}}
// An id is c<category>v<item>. Anything that no longer resolves is dropped:
// a saved cart outlives the menu it was built from.
function pruneCart(){const bad=[];Object.keys(cart).forEach(function(id){const m=/^c(\d+)v(\d+)$/.exec(id);const ci=m?parseInt(m[1],10):-1,vi=m?parseInt(m[2],10):-1;if(!m||!MENU[ci]||!MENU[ci].items[vi])bad.push(id)});bad.forEach(function(id){delete cart[id]});return bad.length}
// A placeholder is not a time. The pickup path used to store the sentence
// "(nyatakan masa)" - later "(state a time)" - when the customer never picked
// one, and it reads like a time once it lands in a table. Two live orders carry
// it. The value stays in the document; it is simply not shown as though the
// customer had asked for it.
function noTime(t){const s=String(t==null?'':t).trim();return !s||/^\(?(state a time|nyatakan masa)\)?$/i.test(s)}
// ---------------------------------------------------------------------------
// Per-device customer memory. localStorage only - it never leaves this browser
// and no other device can see it. We deliberately remember DETAILS (name,
// number, block, room) but NOT the order options (delivery, payment, time),
// which stay blank so the customer chooses fresh each time.
// ---------------------------------------------------------------------------
function loadCustomer(){try{const c=JSON.parse(localStorage.getItem('mms_cust'));return (c&&c.n)?c:null}catch(e){return null}}
// Put the remembered block and room back on the form. Idempotent, and it will
// not overwrite a block the customer has already chosen this session.
let _restoring=false;
function restoreLocation(){
  if(selBlock)return false;
  const c=loadCustomer();if(!c||!c.block)return false;
  if(!BLOCKS.length)return false;                     // the list is not here yet
  let name=c.block;
  if(BLOCKS.indexOf(name)<0){
    // The list can change under a saved customer. Match loosely first, then
    // keep their block rather than silently forget it - a room the seller can
    // read is better than a form that asks the same question again.
    const lc=String(name).toLowerCase();
    // 1. the same name, different case
    let hit=BLOCKS.filter(function(b){return b.toLowerCase()===lc})[0];
    // 2. the saved name is the more specific one ("Baiduri Wing A" vs "Baiduri"):
    //    keep the customer's wording, it is the better address.
    const longer=BLOCKS.filter(function(b){return lc.indexOf(b.toLowerCase())===0})[0];
    if(!hit&&longer)hit=name;
    // 3. only otherwise accept a block that extends what was saved
    if(!hit)hit=BLOCKS.filter(function(b){return b.toLowerCase().indexOf(lc)===0})[0];
    if(hit)name=hit;else BLOCKS.push(name);
  }
  if(disBlocks.includes(name))return false;           // that block is closed now
  selBlock=name;drawBlocks();
  const r=document.getElementById('room-row');if(r)r.style.display='block';
  const rm=document.getElementById('inp-room');if(rm&&c.room&&!rm.value)rm.value=c.room;
  return true;
}
function fillCustomer(){
  const c=loadCustomer();
  if(!c)return;
  const a=document.getElementById('inp-name2');if(a&&c.n)a.value=c.n;
  const b=document.getElementById('inp-phone');if(b&&c.ph)b.value=c.ph;
  restoreLocation();
  // A returning customer does not give their name a second time - it was given
  // already, and the field is only somewhere for a typo to happen. "Bukan anda?"
  // puts it back and clears the memory.
  if(c.n){const ns=document.getElementById('name-section');if(ns)ns.style.display='none'}
  const tx=document.getElementById('cust-note-txt');
  if(tx)tx.textContent=c.n?('✓ '+c.n+(c.block?(' · '+c.block+(c.room?' '+c.room:'')):'')):'✓ Maklumat anda diingati pada peranti ini';
  const w=document.getElementById('cust-note');if(w)w.style.display='flex';
}
function loadMyOrder(){try{const j=JSON.parse(localStorage.getItem('mms_last'));return j&&j.code?j:null}catch(e){return null}}
// isCod defaults to true so a caller that forgets still gets delivery wording
// rather than telling a delivery customer to come and collect.
function admStatusText(s,isCod){
  if(isCod===undefined)isCod=true;
  if(s==='done')return isCod?'Pesanan sampai! Terima kasih 🙏':'Siap! Boleh ambil ya 🙏';
  // A new order is waiting to be confirmed, not being made. The stepper already
  // said so; this is the same sentence for the bar and for the WhatsApp message.
  if(s==='baru')return 'Menunggu pengesahan penjual';
  if(s==='processing')return isCod?'Sedang dalam perjalanan!':'Sedang dibuat...';
  return 'Sedang dibuat...';
}
