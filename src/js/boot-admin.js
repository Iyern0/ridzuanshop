/* boot-admin.js - start-up for the dashboard page.
   Hand-maintained: edit here, then run tools/build.py. Loaded last, after
   core.js and admin.js. */

try{_seenClaims=JSON.parse(localStorage.getItem(SEEN_CLAIMS_KEY)||'{}')||{}}catch(e){_seenClaims={}}
try{if(new URLSearchParams(location.search).get('mob')==='1')document.documentElement.setAttribute('data-mob','1')}catch(e){}
document.addEventListener('keydown',function(e){if(e.key==='Escape')admCloseSide()});
// Delegated so the grouped nav keeps working no matter how the markup is
// restructured - the items carry data-tab and nothing else.
document.getElementById('adm-nav').addEventListener('click',function(e){
  var a=e.target.closest?e.target.closest('a[data-tab]'):null;
  // Taking a tab must put the drawer away. Without this the drawer stayed open
  // over the screen the owner had just navigated to, with no obvious way back.
  if(a){switchAdmin(a.dataset.tab);admCloseSide();}
});
try{_admSetupOpen=localStorage.getItem('mms_adm_setup')==='1'}catch(e){}
// Registered once for the session. Closing on "the click was somewhere else"
// rather than on blur is what lets a chip's own click land: blur fires first,
// and hiding the row on blur would swallow the tap that chose the block.
document.addEventListener('mousedown',function(e){
  const el=e.target;
  if(!el||!el.closest)return;
  if(el.closest('.a-search')||el.closest('#adm-blocks'))return;
  admCloseBlocks();
},true);
// Five taps on the customer page title is the way in (see boot-customer.js).
// The dashboard page needs no such gesture: it is already the dashboard, and
// .hero h1 only exists on the shop page.
// The dashboard page's own start-up: open the dashboard if a session is
// already live and belongs to the seller, otherwise ask for the password.
(async()=>{
  track('page_view',true);
  await initConfig();

  // ?order=<id> - the seller tapped a notification. Hold the id until the list
  // has the order in hand, then open it. The query is cleared so a reload or a
  // shared link does not repeat it.
  let want='';
  try{
    const q=new URLSearchParams(location.search);
    want=String(q.get('order')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,40);
    if(q.get('admin')==='1'||want)history.replaceState(null,'',location.pathname+location.hash);
  }catch(e){}
  if(want)_pendingAdminOrder=want;

  function open(){
    if(admin){admFulfilPending();return}
    if(isAdmin()){enterAdmin();return}
    showAdminLogin();
  }
  const a=getAuth();
  if(a)a.onAuthStateChanged(function(u){
    const e=document.getElementById('admin-email');if(u&&u.email&&e)e.value=u.email;
    open();
  });
  else open();

  // Idle lock: movement means the owner is still there.
  ['pointerdown','keydown','wheel'].forEach(function(ev){window.addEventListener(ev,bumpIdle,{passive:true})});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')bumpIdle()});
})();
