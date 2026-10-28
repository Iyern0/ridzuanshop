// Port the working storefront onto the CHAGEE-night skin.
// Every id, function and flow stays as it is: this rewrites colour literals and
// appends a stylesheet, it does not touch behaviour.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'drinks-order.html');
const OUT = path.join(ROOT, 'experiments', 'CHAGEE-ORDER.html');

let s = fs.readFileSync(SRC, 'utf8');
const before = s.length;

// CHAGEE's palette, measured off the live app: navy ground, gold ink, cream
// cards, orange call to action, oxblood red for warnings.
const map = [
  ['#00D4AA', '#C9A96A'], ['rgba(0,212,170,', 'rgba(201,169,106,'],
  ['#FFB347', '#E0A44E'], ['rgba(255,179,71,', 'rgba(224,164,78,'],
  ['#12100E', '#0A1B33'], ['#1B1713', '#0E2340'],
  ['#F0F0F0', '#FBF4E6'], ['#9A9385', '#9FB0C9'],
  ['#FF6B6B', '#E14B3D'], ['rgba(255,107,107,', 'rgba(225,75,61,'],
  // leftover warm neutrals from the charcoal theme, cooled to navy
  ['#2A2419', '#102A4E'], ['#1E1913', '#10254A'], ['#171412', '#08172C'],
  ['#131010', '#08172C'], ['#1B1815', '#0B1F3A'], ['#6B645A', '#8FA3BF'],
  ['#5E564C', '#7C90AD'], ['#8A8377', '#93A6C2'], ['#C9C4BA', '#D7E1F0'],
  ['#C9C3B8', '#D7E1F0'], ['#D8D2C8', '#E6EDF8'], ['#00E9C0', '#E9C87F'],
];
let log = [];
for (const [from, to] of map) {
  const n = s.split(from).length - 1;
  s = s.split(from).join(to);
  log.push(from + ' x' + n);
}

// display serif for the brand voice (CHAGEE sets its headlines in a Didone)
const fontOld = 'family=Nunito:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap';
if (!s.includes(fontOld)) throw new Error('font link not found');
s = s.replace(fontOld, 'family=Nunito:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap');

const SKIN = `
<style id="chagee-skin">
/* ---- CHAGEE night skin ------------------------------------------------
   Structure is untouched; this only re-dresses what already exists, and adds
   the bottom tab bar the reference design uses for navigation. */
:root{
  --fs:'Playfair Display',Georgia,'Times New Roman',serif;
  --cream:#FDF7EA;--navy-ink:#13294B;--gold-line:rgba(201,169,106,0.34);
  --cta:#F2A03D;
}
body{
  background:
    radial-gradient(900px 420px at 82% -8%, rgba(201,169,106,0.13), transparent 62%),
    radial-gradient(760px 460px at 8% 2%, rgba(80,132,196,0.16), transparent 58%),
    var(--bg);
}
.hero{
  background:linear-gradient(180deg, rgba(14,35,64,0.0) 0%, rgba(10,27,51,0.55) 100%);
  border-bottom:1px solid var(--line);padding:calc(34px + env(safe-area-inset-top)) 18px 26px;
}
.hero:before{
  content:"MINUM LATE-NIGHT";display:block;width:max-content;margin:0 auto 14px;
  font-size:10.5px;font-weight:900;letter-spacing:2.4px;color:#0A1B33;background:var(--mint);
  padding:5px 13px;border-radius:999px;
}
.hero h1{font-family:var(--fs);font-weight:700;font-size:clamp(30px,9vw,44px);letter-spacing:0.4px;line-height:1.02;text-transform:uppercase}
.hero h1 span{color:var(--mint);font-family:var(--fs);font-style:italic;font-weight:500}
.hero .sub{color:#C9D3E4;margin-top:12px;letter-spacing:0.3px;font-size:12px;text-transform:none}
.hero .sub:after{content:"";display:block;width:54px;height:1px;background:var(--gold-line);margin:14px auto 0}
.sec{padding:26px var(--gutter) 12px}
.sec h2{font-family:var(--fs);font-weight:600;font-size:23px;letter-spacing:0.4px;text-transform:uppercase}
.sec h2 span{color:var(--mint)}
.sec .l{background:linear-gradient(90deg,var(--gold-line),transparent)}
.card{background:var(--cream);border:1px solid rgba(19,41,75,0.10);border-radius:18px;
  box-shadow:0 10px 24px rgba(3,10,22,0.28);min-height:150px;gap:9px}
.card .n{color:var(--navy-ink);font-family:var(--fb);font-weight:800;letter-spacing:0}
.card .p{color:#A9772F;font-family:var(--fs);font-weight:700;font-size:21px;letter-spacing:0.2px}
.card .e{background:radial-gradient(circle at 50% 36%,rgba(201,169,106,0.22),rgba(19,41,75,0.05) 72%);
  border:1px solid rgba(201,169,106,0.4);box-shadow:inset 0 0 0 3px rgba(253,247,234,0.55)}
.card .badge{background:rgba(19,41,75,0.92);color:#F6E2B8;border:none;border-radius:0 17px 0 11px}
.card .badge-new{background:rgba(19,41,75,0.86);color:#F6E2B8;border:none;border-radius:0 17px 0 11px}
.card .qty{background:var(--cta);color:#20160A}
.card.in-cart{outline:2px solid var(--cta);outline-offset:-2px}
.bar{background:rgba(14,35,64,0.7);border-bottom:1px solid var(--line2)}
#cart-bar{background:var(--cta);color:#20160A;border:0;border-radius:16px;bottom:calc(86px + env(safe-area-inset-bottom));
  box-shadow:0 14px 30px rgba(3,10,22,0.45);left:12px;right:12px}
#cart-bar .count{color:rgba(32,22,10,0.72)}
#cart-bar .total{color:#20160A;font-family:var(--fs)}
#cart-bar button{background:#13294B;color:#FDF7EA}
#menu-root{padding-bottom:190px}
#my-order{background:rgba(201,169,106,0.10)!important;border-color:rgba(201,169,106,0.42)!important;color:var(--mint)!important}
.panel,.modal .box{background:linear-gradient(180deg,#122A4C,#0C1E3A);border-color:var(--gold-line)}
#checkout,.go{background:var(--cta)!important;color:#20160A!important}
/* the only green left in the palette is the WhatsApp send itself */
#wa-send{background:#25D366!important;color:#fff!important}
#cust .box>button,#confirm-modal #wa-send+.x{background:var(--cta)!important;color:#20160A!important}
#cust .copts button,#cust .copt{background:rgba(255,255,255,0.055)!important;border-color:rgba(201,169,106,0.22)!important}
.modal .box{backdrop-filter:blur(9px)}
.toast{top:calc(68px + env(safe-area-inset-top))!important;bottom:auto!important}
.panel{bottom:calc(74px + env(safe-area-inset-bottom))!important;max-height:calc(100vh - 200px);border-radius:22px 22px 0 0}
.panel .ft{padding-bottom:calc(30px + env(safe-area-inset-bottom))}
/* the tab bar owns the bottom strip, so dialogs stop above it */
.modal{padding:18px 18px calc(96px + env(safe-area-inset-bottom))}
@media(min-width:900px){
  #mm-tab{display:none!important}
  #cart-bar{bottom:20px;max-width:640px;margin:0 auto}
  .panel{bottom:0!important;max-height:92vh}
  #menu-root{padding-bottom:120px}
}
.ft .am{color:var(--mint)}
/* ---- bottom tab bar ------------------------------------------------- */
#mm-tab{position:fixed;left:0;right:0;bottom:0;z-index:700;display:flex;background:#FDF7EA;
  border-top:1px solid rgba(19,41,75,0.10);box-shadow:0 -10px 26px rgba(3,10,22,0.35);
  padding:7px 4px calc(7px + env(safe-area-inset-bottom));}
#mm-tab a{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;
  font-family:var(--fb);font-size:11px;font-weight:800;color:#7C8CA6;padding:4px 0;border-radius:12px;
  -webkit-tap-highlight-color:transparent;user-select:none}
#mm-tab a svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
#mm-tab a.on{color:#13294B}
#mm-tab a.on:after{content:"";width:16px;height:2.5px;border-radius:2px;background:#D2372B;margin-top:-1px}
</style>`;

const UI = require('./chagee-order-ui.cjs');

const TAB = `
<nav id="mm-tab">
<a data-t="utama" class="on" onclick="mmTab('utama')"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/></svg>Utama</a>
<a data-t="menu" onclick="mmTab('menu')"><svg viewBox="0 0 24 24"><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>Menu</a>
<a data-t="pesanan" onclick="mmTab('pesanan')"><svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 7.5h6M9 12h6M9 16.5h3"/></svg>Pesanan<span class="badge" style="display:none"></span></a>
<a data-t="kupon" onclick="mmTab('kupon')"><svg viewBox="0 0 24 24"><path d="M4 7h16a1 1 0 0 1 1 1v2.2a2 2 0 0 0 0 3.6V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.2a2 2 0 0 0 0-3.6V8a1 1 0 0 1 1-1Z"/></svg>Kupon<span class="badge gold" style="display:none"></span></a>
<a data-t="saya" onclick="mmTab('saya')"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c1.4-3.6 4-5.4 7.5-5.4s6.1 1.8 7.5 5.4"/></svg>Saya</a>
</nav>`;

if (!s.includes('</head>')) throw new Error('no head close');
s = s.replace('</head>', SKIN + UI.CSS + '\n</head>');

// The search field and category chips sit directly above the product grid.
const split = UI.HTML.indexOf('<div class="mm-sheet"');
if (split < 0) throw new Error('no sheet markup');
const TOOLS = UI.HTML.slice(0, split), SHEETS = UI.HTML.slice(split);
s = s.replace('<div id="menu-root"></div>', TOOLS + '\n<div id="menu-root"></div>');
if (!s.includes('<div class="page-foot">')) throw new Error('no page-foot');
s = s.replace('<div class="page-foot">', SHEETS + TAB + '\n<div class="page-foot">');
if (!s.includes('</body>')) throw new Error('no body close');
s = s.replace('</body>', UI.JS + '\n</body>');

fs.writeFileSync(OUT, s);
console.log(log.join(' · '));
console.log('bytes ' + before + ' -> ' + s.length);
console.log('written ' + OUT);
