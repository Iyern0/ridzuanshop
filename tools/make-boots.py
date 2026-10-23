"""Assemble app/src/js/boot-*.js from the v50 start-up statements.

The v50 file kept start-up code between the declarations. extract-src.py lifts
the declarations out and drops those statement files in .scratch/boot-stmts/;
this script files each statement under the page that needs it, applies the two
edits the split requires, and writes the two boot files.

Those two edits are the whole reason the boot files are hand-maintained:

  1. the dashboard is no longer a layer inside the order page, so the order
     page's "open the dashboard" paths navigate to admin.html instead of
     calling enterAdmin()
  2. the dashboard page gets its own sequence (open the dashboard, or ask for
     the password), because it no longer starts inside a shop page

Run once, from the workspace root, after extract-src.py:
    python app/tools/make-boots.py
"""
import io, os

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(APP)
STMS = os.path.join(ROOT, ".scratch", "boot-stmts")
OUT = os.path.join(APP, "src", "js")


def st(n):
    return io.open(os.path.join(STMS, "customer-%02d.js" % n), encoding="utf-8").read()


# ---- which start-up statement belongs to which page ----------------------
# (order within a page follows the v50 file, which is what the script assumes)
CUSTOMER_BOOT_STMTS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 18, 20]
ADMIN_BOOT_STMTS = [1, 2, 3, 14, 16, 17]

EXPECT = {
    1: "_seenClaims=JSON.parse",
    2: "data-mob",
    3: "admCloseSide()",
    4: "cpn-pop",
    5: "_menuFirst=false",
    6: "'del'",
    7: "pickup-time",
    8: "coupon-check",
    9: "inp-coupon",
    10: "'pay'",
    11: "'checkout'",
    12: "qr-claim-slot",
    13: "cartb",
    14: "adm-nav",
    16: "_admSetupOpen=localStorage",
    17: "admCloseBlocks",
    18: "loadCart()",
    20: "visibilitychange",
}
for n, needle in EXPECT.items():
    assert needle in st(n), "statement %d no longer looks like %r" % (n, needle)

# ---- the two rewritten statements ----------------------------------------
CUSTOMER_HERO = """// Five taps on the title is the owner's way in. It used to open the dashboard
// over this page; the dashboard is a separate page now, so it navigates there.
document.querySelector('.hero h1').addEventListener('click',function(){
  admClk++;clearTimeout(admTmr);admTmr=setTimeout(function(){admClk=0},1000);
  if(admClk>=5){admClk=0;location.href='admin.html'}
});
"""

CUSTOMER_DEEPLINK = """// A tap on the seller's notification lands here first. The dashboard is its own
// page now, so hand the tap over instead of trying to raise it over the menu.
(function(){
  let q=null;
  try{q=new URLSearchParams(location.search)}catch(e){}
  if(!q||q.get('admin')!=='1')return;
  location.replace('admin.html'+location.search);
})();
"""

ADMIN_HERO = """// Five taps on the title locks an open dashboard: the quick way out when the
// seller walks away from the phone.
document.querySelector('.hero h1').addEventListener('click',function(){
  admClk++;clearTimeout(admTmr);admTmr=setTimeout(function(){admClk=0},1000);
  if(admClk>=5){admClk=0;if(admin)lockAdmin('\U0001f512 Admin dikunci');else if(isAdmin()){enterAdmin()}else{showAdminLogin()}}
});
"""

ADMIN_BOOT = """// The dashboard page's own start-up: open the dashboard if a session is
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
"""

CUSTOMER_SEQ = st(18).replace(
    """const a=getAuth();
if(a)a.onAuthStateChanged(function(u){
  // Deliberately does NOT call enterAdmin(). A remembered session must never
  // open the dashboard by itself - it only offers the \U0001f527 button.
  if(u&&u.email){const e=document.getElementById('admin-email');if(e)e.value=u.email}
  else if(admin)closeAdminPanel();
  paintAdminBtn();
});""",
    """// A remembered session never opens anything here - on this page it only
// lights up the Admin link, which leads to admin.html.
const a=getAuth();
if(a)a.onAuthStateChanged(function(){paintAdminBtn()});""")
CUSTOMER_SEQ = CUSTOMER_SEQ.replace(
    "\n['pointerdown','keydown','wheel'].forEach(function(ev){window.addEventListener(ev,bumpIdle,{passive:true})});\n"
    "document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')bumpIdle()});})();",
    "\n})();")
assert "paintAdminBtn()}" in CUSTOMER_SEQ, "customer sequence: auth watcher not rewritten"
assert "bumpIdle" not in CUSTOMER_SEQ, "customer sequence: idle lock not removed"


def assemble(parts, header):
    return header + "".join(parts)


customer = assemble(
    [st(n) for n in CUSTOMER_BOOT_STMTS[:10]]          # 4..13, in file order
    + [CUSTOMER_HERO, CUSTOMER_SEQ, CUSTOMER_DEEPLINK, st(20)],
    """/* boot-customer.js - start-up for the order page.
   Hand-maintained: edit here, then run tools/build.py. Loaded last, after
   core.js and customer.js. */

""")

admin = assemble(
    [st(1), st(2), st(3), st(14), st(16), st(17), ADMIN_HERO, ADMIN_BOOT],
    """/* boot-admin.js - start-up for the dashboard page.
   Hand-maintained: edit here, then run tools/build.py. Loaded last, after
   core.js and admin.js. */

""")

for name, text in (("boot-customer.js", customer), ("boot-admin.js", admin)):
    io.open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n").write(text)
    print("  %-20s %6d chars" % (name, len(text)))
