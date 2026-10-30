// The CHAGEE-order UI layer: five destinations, a three-step checkout, a reward
// cabinet and a profile the first-time buyer has to fill in. It is injected by
// tools/build-chagee-order.cjs and drives the existing controls programmatically
// (clicks the real buttons, writes the real inputs), so order creation stays in
// one place — the code that already ships.
'use strict';

const CSS = `
<style id="mm-skin">
/* ---------- tab bar (five) ---------- */
#mm-tab{z-index:700;justify-content:space-between}
#mm-tab a.mm-press{transform:scale(.92)}
#mm-tab a{transition:transform .16s var(--eo),color .16s var(--eo)}
#mm-tab a .badge{position:absolute;top:2px;right:calc(50% - 22px);min-width:17px;height:17px;border-radius:99px;
 background:#D2372B;color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;padding:0 4px}
#mm-tab a .badge.gold{background:#C9A96A;color:#20160A}
#mm-tab a.on svg{stroke-width:2.1}
/* ---------- full screen sheets ---------- */
.mm-sheet{position:fixed;inset:0;z-index:1400;display:flex;flex-direction:column;background:var(--bg);
 transform:translateY(102%);transition:transform .30s var(--eo);visibility:hidden}
.mm-sheet.open{transform:translateY(0);visibility:visible}
.mm-sheet .mm-hd{display:flex;align-items:center;gap:10px;padding:calc(16px + env(safe-area-inset-top)) 16px 12px;
 border-bottom:1px solid var(--line)}
.mm-sheet .mm-hd h2{font-family:var(--fs);font-weight:600;font-size:24px;letter-spacing:.4px;color:var(--mint);flex:1}
.mm-sheet .mm-x{width:36px;height:36px;border-radius:50%;border:1px solid var(--line2);background:rgba(255,255,255,.05);
 color:var(--ink);font-size:16px;cursor:pointer;flex-shrink:0}
.mm-sheet .mm-bd{flex:1;overflow-y:auto;padding:14px 16px 150px;-webkit-overflow-scrolling:touch}
.mm-sheet .mm-ft{position:absolute;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));
 background:var(--cta);color:#20160A;border-radius:16px;padding:12px 14px;display:flex;align-items:center;
 gap:12px;box-shadow:0 14px 30px rgba(3,10,22,.5)}
.mm-sheet .mm-ft .l{font-size:10.5px;font-weight:900;letter-spacing:1.2px;opacity:.72}
.mm-sheet .mm-ft .v{font-family:var(--fs);font-weight:700;font-size:22px;line-height:1.1}
.mm-sheet .mm-ft button{margin-left:auto;background:#13294B;color:#FDF7EA;border:0;border-radius:12px;
 font-family:var(--fb);font-weight:900;font-size:13px;padding:12px 16px;cursor:pointer}
.mm-sheet .mm-ft.wa{background:#25D366}
.mm-sheet .mm-ft.wa button{background:#062B14;color:#E9FFEF}
.mm-sheet .mm-ft button:disabled{opacity:.5}
/* ---------- search + chips ---------- */
#mm-menu-tools{padding:0 var(--gutter);max-width:640px;margin:0 auto}
#mm-q{width:100%;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:14px;
 padding:12px 14px;color:var(--ink);font-family:var(--fb);font-weight:700;font-size:13.5px;outline:none}
#mm-q::placeholder{color:#8FA3BF}
#mm-chips{display:flex;gap:8px;overflow-x:auto;padding:10px 18px 14px 0;scrollbar-width:none}
#mm-chips::-webkit-scrollbar{display:none}
#mm-chips button{white-space:nowrap;font-family:var(--fb);font-weight:800;font-size:11.5px;padding:8px 14px;
 border-radius:999px;border:1px solid var(--line);background:transparent;color:#C9D3E4;cursor:pointer}
#mm-chips button.on{background:var(--mint);border-color:var(--mint);color:#0A1B33}
#mm-chips button:last-child{margin-right:18px}
/* Engine overlays sit at 600, under the tab bar (700): the drink sheet, the
   cart panel and the receipt would slide *behind* the tabs. Lift them. */
.modal{z-index:1300}
/* the engine cart panel is replaced by the Bakul sheet */
.overlay,.panel{display:none !important}
.overlay{z-index:1290}
.done{z-index:1320}
#notif-ask{z-index:1340}

/* Desktop: this is a phone app. Rather than stretch it, stand it on a plinth. */
@media(min-width:760px){
  html{background:#071324}
  body{max-width:600px;margin:0 auto;min-height:100vh;background:var(--bg);
       box-shadow:0 0 0 1px rgba(255,255,255,.07),0 40px 90px rgba(0,0,0,.65)}
  #mm-tab,#cart-bar{left:50%;right:auto;width:600px;transform:translateX(-50%)}
  #mm-tab.show{transform:translateX(-50%)}
  .mm-sheet,.modal,.panel,.overlay,#notif-ask{left:50%;right:auto;margin-left:-300px;width:600px}
}
/* ---------- step rail ---------- */
.mm-steps{display:flex;gap:8px;margin:2px 0 16px}
.mm-steps div{flex:1;text-align:center;font-size:10px;font-weight:900;letter-spacing:1.3px;color:#6E86A8}
.mm-steps div i{display:block;height:3px;border-radius:3px;background:rgba(255,255,255,.12);margin-top:7px}
.mm-steps div.mm-on{color:var(--mint)}
.mm-steps div.mm-on i{background:var(--mint)}
body.mm-lock #cart-bar,body.mm-lock #notif-ask{display:none !important}
.mm-steps div.mm-done i{background:rgba(201,169,106,.55)}
/* ---------- basket rows ---------- */
.mm-row{display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);
 border-radius:16px;padding:11px 12px;margin-bottom:10px}
.mm-row .th{width:44px;height:44px;border-radius:13px;background:radial-gradient(circle at 50% 36%,rgba(201,169,106,.3),rgba(19,41,75,.1) 75%);
 border:1px solid rgba(201,169,106,.38);display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0}
.mm-row .nm{font-size:13px;font-weight:800;color:#FBF4E6}
.mm-row .mt{font-size:11px;color:#9FB0C9;font-weight:700;margin-top:3px}
.mm-row .pr{font-family:var(--fs);font-weight:700;font-size:16px;color:var(--mint);margin-left:auto;flex-shrink:0}
.mm-step2{display:flex;align-items:center;gap:9px;background:rgba(242,160,61,.13);border:1px solid rgba(242,160,61,.32);
 border-radius:999px;padding:4px 9px;flex-shrink:0}
.mm-step2 b{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;
 background:rgba(255,255,255,.10);color:var(--cta);font-size:15px;font-weight:900;cursor:pointer}
.mm-step2 span{font-size:13px;font-weight:900;color:#F6D79F;min-width:12px;text-align:center}
.mm-rm{background:none;border:0;color:#8FA3BF;font-size:15px;cursor:pointer;padding:4px 2px}
.mm-lbl{font-size:10.5px;font-weight:900;letter-spacing:1.5px;color:#7C90AD;margin:16px 2px 8px}
.mm-inp{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:13px;
 padding:13px 14px;color:var(--ink);font-family:var(--fb);font-weight:700;font-size:13.5px;outline:none;margin-bottom:9px}
.mm-inp:focus{border-color:var(--gold)}
.mm-pick{display:flex;flex-wrap:wrap;gap:8px}
.mm-pick button{flex:1;min-width:calc(33.3% - 8px);padding:12px 8px;border-radius:13px;border:1px solid rgba(255,255,255,.1);
 background:rgba(255,255,255,.04);color:#C9D3E4;font-family:var(--fb);font-weight:800;font-size:11.5px;cursor:pointer}
.mm-pick button.on{border-color:var(--mint);background:rgba(201,169,106,.16);color:#F6D79F}
.mm-pick button:disabled{opacity:.32;text-decoration:line-through}
.mm-empty{text-align:center;color:#8FA3BF;font-weight:700;font-size:13px;padding:46px 10px;line-height:1.7}
.mm-empty .big{font-size:34px;display:block;margin-bottom:10px}
.mm-note{font-size:11.5px;color:#7C90AD;font-weight:800;line-height:1.6;margin-top:10px}
/* ---------- reward cabinet / profile cards ---------- */
.mm-card{background:var(--cream);border-radius:20px;padding:16px;color:#13294B;box-shadow:0 12px 26px rgba(3,10,22,.42);margin-bottom:12px}
.mm-empty{text-align:center;padding:40px 10px}
.mm-empty .ico{font-size:40px;line-height:1}
.mm-empty .t{font-family:var(--fs);font-size:22px;color:var(--mint);margin-top:8px}
.mm-empty .h{font-size:12.5px;font-weight:700;color:#9FB0C9;margin-top:6px}
.mm-go{margin-top:18px;width:100%;padding:13px;border:0;border-radius:14px;background:var(--gold);color:#20160A;font-family:var(--fb);font-weight:900;font-size:13px;cursor:pointer}
.mm-ghost{width:100%;padding:12px;border:1px solid var(--line2);border-radius:14px;background:rgba(255,255,255,.04);color:var(--ink);font-family:var(--fb);font-weight:800;font-size:12.5px;cursor:pointer}
.mm-card .cap{font-size:10px;font-weight:900;letter-spacing:1.6px;color:#A9772F}
.mm-card .code{font-family:var(--fs);font-size:27px;letter-spacing:2px;margin-top:6px}
.mm-card .mm-lbl{color:#5A6B85}
.mm-card .mm-inp{background:#fff;color:#13294B;border:1px solid rgba(19,41,75,.18)}
.mm-card .mm-inp::placeholder{color:#8A94A6}
.mm-card .mm-pick button{background:#EEF3FA;color:#13294B;border:1px solid rgba(19,41,75,.14)}
.mm-card .mm-pick button.on{background:#13294B;color:#fff;border-color:#13294B}
.mm-card .mm-kv span{color:#5A6B85}
.mm-card .mm-kv b{color:#13294B}
.mm-card .hint{font-size:11px;font-weight:700;color:#6B7B95;margin-top:6px;line-height:1.5}
.mm-card .btns{display:flex;gap:8px;margin-top:14px}
.mm-card .btns button{flex:1;border:0;border-radius:12px;padding:11px;font-family:var(--fb);font-weight:900;font-size:11.5px;cursor:pointer}
.mm-card .btns .ghost{background:rgba(19,41,75,.07);color:#13294B}
.mm-card .btns .solid{background:#13294B;color:#FDF7EA}
.mm-bar{height:8px;border-radius:99px;background:rgba(19,41,75,.14);margin-top:12px;overflow:hidden}
.mm-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--mint),var(--cta))}
.mm-stamps{display:flex;gap:7px;margin-top:10px}
.mm-stamps span{width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(19,41,75,.25);display:flex;
 align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#8FA3BF}
.mm-stamps span.f{background:var(--mint);border-color:var(--mint);color:#20160A}
.mm-kv{display:flex;justify-content:space-between;font-size:12.5px;font-weight:800;color:#9FB0C9;padding:7px 0}
.mm-kv b{color:#FBF4E6;font-family:var(--fs);font-size:16px}
/* the engine toast is z-index 600, under the sheets at 1400, so a save made
   from inside the Saya sheet looked like it did nothing */
#toast{z-index:1900}
.mm-saved{display:flex;align-items:center;gap:8px;margin-top:10px;padding:10px 12px;border-radius:12px;
 background:rgba(0,212,170,.12);border:1px solid rgba(0,212,170,.34);color:#7BE0B0;
 font-family:var(--fb);font-weight:800;font-size:12.5px}
.mm-saved[hidden]{display:none}
/* ---------- owner notes, 2026-10-29 ---------- */
/* 2. the MINUM MALAM SISWA 10:30PM - 2:00AM / COD line is gone */
/* The shop's own full-bleed hero, back to the engine's layout: no card, no
   box, just the band with the name and the opening hours. */
.hero{background:radial-gradient(130% 150% at 12% -10%,#1E3D6B 0%,#0F2546 52%,#0A1B33 100%);
 border-bottom:1px solid rgba(255,255,255,.08);padding:calc(22px + env(safe-area-inset-top)) 18px 18px;
 text-align:center}
.hero h1{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:22px;line-height:1.2;
 letter-spacing:.6px;margin:0;color:#FDF7EA;text-transform:uppercase}
.hero h1 span{color:#C9A96A}
.hero .sub{margin-top:7px;font-size:11.5px;line-height:1.4;letter-spacing:.3px;color:rgba(253,247,234,.66)}
/* 1. status bar: one centred pill instead of a full-bleed coloured band */
.status-bar{margin:10px auto 0;max-width:calc(100% - 28px);justify-content:center;align-items:flex-start;
 gap:8px;padding:9px 14px;border-radius:14px;font-size:11px;font-weight:700;letter-spacing:0;
 line-height:1.4;text-align:left;border:1px solid rgba(255,255,255,.09)}
.status-bar .st{font-weight:900;letter-spacing:1.2px;flex-shrink:0}
.status-bar .dt{opacity:.86;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.status-bar.open{background:rgba(0,212,170,.10);color:#5BE3C8;border-color:rgba(0,212,170,.22)}
.status-bar.closed{background:rgba(255,107,107,.10);color:#FF9C9C;border-color:rgba(255,107,107,.22)}
.status-bar .dot{margin-top:0}
/* 5. the sugar / ice / extra groups read as one tidy grid instead of a
   column of full-width pills that runs off the bottom of the sheet. */
/* 5. Sugar and ice labels are long ("Change to Condensed Milk"), so those two
   groups stay one per row; only the short add-ons sit side by side. */
#c-sweet,#c-level{display:grid;grid-template-columns:1fr;gap:7px;margin-top:2px}
#c-extra{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px;margin-top:2px}
#c-sweet .opt-btn,#c-level .opt-btn,#c-extra .opt-btn{width:100%;min-width:0;align-items:center;
 justify-content:flex-start;gap:10px;padding:11px 13px;border-radius:13px;font-size:13px;line-height:1.25;
 background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.09);color:#FDF7EA}
#c-sweet .opt-btn>span:not(.ob-dot):not(.ob-price),
#c-level .opt-btn>span:not(.ob-dot):not(.ob-price),
#c-extra .opt-btn>span:not(.ob-dot):not(.ob-price){flex:1;min-width:0;text-align:left}
#c-sweet .opt-btn.sel,#c-level .opt-btn.sel,#c-extra .opt-btn.sel{background:rgba(0,212,170,.13);
 border-color:rgba(0,212,170,.6);color:#FDF7EA;font-weight:900}
#c-sweet .opt-btn .ob-dot,#c-level .opt-btn .ob-dot,#c-extra .opt-btn .ob-dot{width:16px;height:16px;border-width:1.5px;flex:0 0 16px}
#c-sweet .opt-btn.sel .ob-dot,#c-level .opt-btn.sel .ob-dot,#c-extra .opt-btn.sel .ob-dot{background:#00D4AA;border-color:#00D4AA}
.opt{padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.opt:last-child{border-bottom:0}
.opt .l{font-size:10.5px;font-weight:900;letter-spacing:1.3px;margin-bottom:7px;color:rgba(253,247,234,.55)}

/* 4. sold out reads as a dead card, not a small corner tag */, not a small corner tag */
.card.disabled{opacity:.5;filter:grayscale(1) contrast(.92);animation:none}
.card.disabled .n,.card.disabled .p{opacity:.55}
.card .sold{position:absolute;inset:-1px;display:grid;place-items:center;border-radius:var(--r-card);
 background:rgba(8,14,26,.6);color:#fff;font-size:12px;font-weight:900;letter-spacing:1.8px;
 text-transform:uppercase;padding:0}
</style>`;

const HTML = `
<div id="mm-menu-tools">
  <input id="mm-q" placeholder="Cari minuman…" oninput="mmFilter()" autocomplete="off">
</div>

<div class="mm-sheet" id="mm-checkout" role="dialog" aria-label="Pesanan">
  <div class="mm-hd"><h2 id="mm-ck-title">Bakul</h2><button class="mm-x" onclick="mmClose()" aria-label="Tutup">✕</button></div>
  <div class="mm-bd">
    <div class="mm-steps" id="mm-rail"></div>
    <div id="mm-step1"></div>
    <div id="mm-step2" style="display:none"></div>
    <div id="mm-step3" style="display:none"></div>
  </div>
  <div class="mm-ft" id="mm-ft"></div>
</div>

<div class="mm-sheet" id="mm-reward" role="dialog" aria-label="Kupon">
  <div class="mm-hd"><h2>Kupon</h2><button class="mm-x" onclick="mmClose()" aria-label="Tutup">✕</button></div>
  <div class="mm-bd" id="mm-reward-bd"></div>
</div>

<div class="mm-sheet" id="mm-me" role="dialog" aria-label="Saya">
  <div class="mm-hd"><h2>Saya</h2><button class="mm-x" onclick="mmClose()" aria-label="Tutup">✕</button></div>
  <div class="mm-bd" id="mm-me-bd"></div>
</div>
`;

const JS = `
<script>
/* ===== CHAGEE-order UI =====================================================
   Five destinations over the existing engine. Nothing here re-implements an
   order: it fills the real inputs and clicks the real buttons (#checkout,
   #wa-send, remInst, pickBlock, selT, couponCheck, cpnUse), so what ships is
   still one order path. */
(function(){
  var $=function(id){return document.getElementById(id)};
  var esc2=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};

  // ---- profile -----------------------------------------------------------
  function pro(){try{var c=loadCustomer();return c&&c.n?c:null}catch(e){return null}}
  function needPro(){return !pro()}
  // The basket can be filled without a profile; checkout cannot. This is the
  // gate the first-time buyer meets, and it is where their details get kept.
  function gateMe(reason){
    mmOpen('mm-me');
    var n=$('mm-me-hint');
    if(n){n.textContent=reason||'Isi maklumat anda sekali sahaja — pesanan seterusnya akan guna maklumat ini.';n.style.display='block'}
  }

  // ---- routing -----------------------------------------------------------
  var TABS=['utama','menu','pesanan','kupon','saya'];
  function mmClose2(id){var el=$(id);if(el)el.classList.remove('open')}
  function mmTab(t){
    var links=document.querySelectorAll('#mm-tab a');
    for(var i=0;i<links.length;i++){
      var on=links[i].getAttribute('data-t')===t;
      links[i].classList.toggle('on',on);
      if(on){links[i].classList.remove('mm-press');void links[i].offsetWidth;links[i].classList.add('mm-press');
        setTimeout(function(el){return function(){el.classList.remove('mm-press')}}(links[i]),220)}
    }
    if(t==='utama'){mmClose();window.scrollTo({top:0,behavior:'smooth'})}
    else if(t==='menu'){mmClose();var m=$('menu-root');if(m)m.scrollIntoView({behavior:'smooth',block:'start'})}
    else if(t==='pesanan'){mmClose();mmCheckout(1)}
    else if(t==='kupon'){mmOpen('mm-reward')}
    else if(t==='saya'){mmOpen('mm-me')}
  }
  function mmOpen(id){
    var s=$(id);if(!s)return;
    var all=document.querySelectorAll('.mm-sheet');
    for(var i=0;i<all.length;i++)if(all[i]!==s)all[i].classList.remove('open');
    if(id==='mm-me')drawMe();
    if(id==='mm-reward')drawReward();
    s.classList.add('open');
    document.documentElement.style.overflow='hidden';
    document.body.classList.add('mm-lock');
  }
  function mmClose(){
    var all=document.querySelectorAll('.mm-sheet');
    for(var i=0;i<all.length;i++)all[i].classList.remove('open');
    document.documentElement.style.overflow='';
    document.body.classList.remove('mm-lock');
  }
  // back gesture / hardware back closes the sheet first
  window.mmClose=mmClose;
  window.addEventListener('popstate',function(){var o=document.querySelector('.mm-sheet.open');if(o){mmClose();history.pushState(null,'',location.href)}});

  // ---- badges ------------------------------------------------------------
  function count(){try{var n=0;Object.keys(cart||{}).forEach(function(k){n+=(cart[k]||[]).length});return n}catch(e){return 0}}
  function mmBadges(){
    var p=document.querySelector('#mm-tab a[data-t=pesanan] .badge');
    var n=count();
    if(p){p.textContent=String(n);p.style.display=n?'flex':'none'}
    var k=document.querySelector('#mm-tab a[data-t=kupon] .badge');
    var c=0;try{c=(liveCpns()||[]).length}catch(e){}
    if(k){k.textContent=String(c);k.style.display=c?'flex':'none'}
  }
  // upCart is the one place every cart change passes through
  var _up=upCart;
  upCart=function(){_up.apply(null,arguments);mmBadges();mmRenderBasket()};

  // ---- menu: search only --------------------------------------------------
  // 3. Category chips were removed on the owner's note; the search box is the
  //    only filter now, so every drink stays in one grid. Both hooks stay
  //    defined because the engine still calls them on every menu redraw.
  var mmChip='';
  function drawChips(){}
  window.mmChipSet=function(v){mmChip=v||'';mmFilter()};

  /* Owner note 1: the status line read as one long wrapped sentence. Split it
     into a bold status word plus a quiet detail, and keep it to two lines.
     The engine re-renders that node, so the element is looked up on every tick
     instead of being captured once. */
  (function(){
    function tidy(){
      var bar=document.getElementById('status-bar');
      if(!bar)return;
      var txt=(bar.textContent||'').replace(/\\s+/g,' ').trim();
      var m=txt.match(/^(BUKA|TUTUP|OPEN|CLOSED)\\b[\\s\\u00b7:,-]*(.*)$/i);
      if(!m)return;
      var st=m[1].toUpperCase(), dt=m[2];
      // The engine overwrites this node's content on every poll, so a cached
      // shape is not proof the markup is still ours - check the children.
      var stEl=bar.querySelector('.st'), dtEl=bar.querySelector('.dt');
      if(stEl&&dtEl&&stEl.textContent===st&&dtEl.textContent===dt)return;
      bar.dataset.shape=st+dt;
      bar.innerHTML='<span class="dot"></span><b class="st">'+st+'</b>'
        +'<span class="dt">'+dt+'</span>';
    }
    tidy();
    setInterval(tidy,1200);
  })();
  window.mmFilter=function(){
    var q=String(($('mm-q')||{}).value||'').toLowerCase().trim();
    var words=mmChip?mmChip.split(' '):[];
    var cards=document.querySelectorAll('#menu-root .card');
    var shown=0;
    for(var i=0;i<cards.length;i++){
      var c=cards[i];
      var name=String((c.querySelector('.n')||{}).textContent||'').toLowerCase();
      var inChip=!words.length||words.some(function(w){return name.indexOf(w)>-1});
      var ok=(!q||name.indexOf(q)>-1)&&inChip;
      c.style.display=ok?'':'none';
      if(ok)shown++;
    }
    var n=$('mm-count');if(n)n.textContent=shown+' item';
  };

  // ---- basket ------------------------------------------------------------
  function rawItems(){
    var out=[];
    Object.keys(cart||{}).forEach(function(key){
      (cart[key]||[]).forEach(function(inst,idx){
        var ci=parseInt(key.match(/c(\\d+)/)[1]),vi=parseInt(key.match(/v(\\d+)/)[1]);
        var it=MENU&&MENU[ci]&&MENU[ci].items&&MENU[ci].items[vi];
        if(!it)return;
        var add=0,names=[];
        (inst.adds||[]).forEach(function(a){var f=findAdd(a);if(f){add+=Number(f.price)||0;names.push(f.name)}});
        out.push({key:key,idx:idx,name:it.name,price:(Number(it.price)||0)+add,
          adds:Array.from(new Set(names))});
      });
    });
    return out;
  }
  // Two Milo with the same options are one row of 2, not two rows — that is how
  // a shop receipt reads, and it keeps a long order to one screen.
  function items(){
    var seen={},out=[];
    rawItems().forEach(function(it){
      var sig=it.key+'|'+it.adds.join(',')+'|'+it.price;
      if(seen[sig]){seen[sig].qty++;seen[sig].idxs.push(it.idx);return}
      it.qty=1;it.idxs=[it.idx];seen[sig]=it;out.push(it);
    });
    return out;
  }
  function unitCount(){return rawItems().length}
  function total(){var t=0;rawItems().forEach(function(i){t+=i.price});return t}
  function codFee(){return isCod===true?(typeof delFee==='function'?delFee('cod'):1):0}
  function dupInst(key,idx){
    if(!cart[key]||!cart[key][idx])return;
    cart[key].push({adds:(cart[key][idx].adds||[]).slice()});
    saveCart();draw();upCart();
  }
  function mmRenderBasket(){
    var box=$('mm-step1');if(!box)return;
    if(count()===0){
      box.innerHTML='<div class="mm-empty"><div class="ico">🧺</div>'
        +'<div class="t">Bakul kosong</div>'
        +'<div class="h">Pilih minuman dari menu untuk mula pesan.</div>'
        +'<button class="mm-go" data-mm-tab="menu">Lihat menu</button>'
        +(loadMyOrder()?'<button class="mm-ghost" style="margin-top:10px" data-mm-repeat="1">↻ Ulang pesanan lepas</button>':'')
        +'</div>';
      // bind through data attributes: inline onclick with quotes inside a
      // single-quoted JS string is how the page shipped broken once
      var go=box.querySelectorAll('[data-mm-tab]');
      for(var gi=0;gi<go.length;gi++)(function(b){b.onclick=function(){mmTab(b.getAttribute('data-mm-tab'))}})(go[gi]);
      var rp=box.querySelectorAll('[data-mm-repeat]');
      for(var ri=0;ri<rp.length;ri++)(function(b){b.onclick=function(){try{repeatLastOrder()}catch(e){}}})(rp[ri]);
      var ft=$('mm-ft'); ft.innerHTML=''; ft.style.display='none';
      return;
    }
    var list=items();
    if(!list.length){
      box.innerHTML='<div class="mm-empty"><span class="big">🧺</span>Bakul kosong.<br>Pilih minuman dari menu.'
        +'<div style="margin-top:16px"><button class="mm-x" data-go-menu style="width:auto;padding:10px 18px;font-size:12.5px;font-weight:900">Lihat menu</button></div></div>';
      var g=box.querySelector('[data-go-menu]');if(g)g.onclick=function(){mmTab('menu')};
    }else{
      box.innerHTML=list.map(function(it){
        return '<div class="mm-row" data-k="'+esc2(it.key)+'" data-i="'+it.idxs[it.idxs.length-1]+'" data-f="'+it.idxs[0]+'">'
          +'<div class="th">'+esc2(typeof drinkEmoji==='function'?drinkEmoji(it.name):'🥤')+'</div>'
          +'<div style="min-width:0"><div class="nm">'+esc2(it.name)+'</div>'
          +'<div class="mt">'+esc2(it.adds.length?it.adds.join(' · '):'Biasa')+'</div></div>'
          +'<div class="mm-step2"><b class="dec">−</b><span>'+it.qty+'</span><b class="inc">+</b></div>'
          +'<div class="pr">RM'+(it.price*it.qty).toFixed(2)+'</div>'
          +'<button class="mm-rm" aria-label="Buang">✕</button></div>';
      }).join('')+'<div class="mm-note">Setiap baris boleh ditambah atau dibuang. Harga add-on sudah dikira.</div>';
      [].forEach.call(box.querySelectorAll('.mm-row'),function(row){
        var k=row.getAttribute('data-k'),last=Number(row.getAttribute('data-i')),first=Number(row.getAttribute('data-f'));
        row.querySelector('.inc').onclick=function(){dupInst(k,last)};
        row.querySelector('.dec').onclick=function(){remInst(k,last)};
        row.querySelector('.mm-rm').onclick=function(){remInst(k,last)};
      });
    }
    var t=total();
    var ft=$('mm-ft');
    var skip=mmCanSkipSaya();
    if(ft)ft.innerHTML='<div><div class="l">'+unitCount()+' ITEM · SUBTOTAL</div><div class="v">RM'+t.toFixed(2)+'</div></div>'
      +'<button '+(list.length?'':'disabled')+'>'+(skip?'Bayar →':'Saya →')+'</button>';
    if(ft&&list.length)ft.querySelector('button').onclick=function(){mmCheckout(skip?3:2)};
  }
  window.mmAddItem=function(n){
    var card=document.querySelectorAll('#menu-root .card')[n];if(!card)return;
    if(typeof closeCust==='function')closeCust();
    card.click();
    setTimeout(function(){if(typeof confirmCust==='function')confirmCust()},450);
  };
  window.mmPlus=function(k,i){dupInst(k,i)};
  window.mmMinus=function(k,i){remInst(k,i)};

  // ---- checkout steps ----------------------------------------------------
  var step=1;
  function mmRail(){
    var r=$('mm-rail');if(!r)return;
    var names=mmCanSkipSaya()?['BAKUL','BAYAR']:['BAKUL','SAYA','BAYAR'];
    var pos=names.length===2?(step>=3?1:0):step-1;
    r.innerHTML=names.map(function(n,i){
      var c=i<pos?'mm-done':(i===pos?'mm-on':'');
      return '<div class="'+c+'">'+n+'<i></i></div>';
    }).join('');
  }
  var pendingSaya=false;   // true while the Saya page is standing in for step 2
  function mmApplyProfile(){
    var c=pro()||{};
    if(!selBlock&&c.block&&typeof BLOCKS!=='undefined'&&BLOCKS.indexOf(c.block)>-1)selBlock=c.block;
    if(!selTime&&typeof SLOTS!=='undefined'&&SLOTS.length){selTime=SLOTS[0];var pt=$('pickup-time');if(pt)pt.value=selTime}
    // A profile with an address means the usual answer is COD; anything else
    // still has to be chosen once on the Saya page.
    if(isCod===null&&c.block&&c.room)isCod=true;
  }
  // A repeat buyer never opens the Saya page, so the engine's own inputs are
  // still empty after a fresh page load. Seed them from the stored profile.
  function mmSeedEngine(){
    var c=pro()||{};
    if(c.n&&$('inp-name2')&&!$('inp-name2').value)$('inp-name2').value=c.n;
    if(c.ph&&$('inp-phone')&&!$('inp-phone').value)$('inp-phone').value=c.ph;
    if(c.room&&$('inp-room')&&!$('inp-room').value)$('inp-room').value=c.room;
  }
  function mmCanSkipSaya(){
    var c=pro();
    return !!(c&&c.n&&c.ph&&c.block&&c.room);
  }
  function mmCheckout(s){
    if(s===undefined)s=1;
    // Payment can be reached straight from the basket on a repeat order, so the
    // stored defaults (time slot, delivery, block/room) are applied here too -
    // otherwise the engine refuses the order with "Sila pilih masa".
    if(s===3) mmApplyProfile();
    if(s>1&&count()===0){s=1;toast('⚠ Bakul kosong')}
    if(s===2){
      mmApplyProfile();
      if(needPro()){pendingSaya=true;mmOpen('mm-me');toast('Isi maklumat dulu');return}
      if(mmCanSkipSaya()){s=3}          // repeat buyer: straight to payment
      else pendingSaya=true;            // profile exists but is incomplete
    }
    step=s;
    if($('mm-ft'))$('mm-ft').style.display='';
    var titles={1:'Bakul',2:'Saya',3:'Bayar'};
    if($('mm-ck-title'))$('mm-ck-title').textContent=titles[s];
    $('mm-step1').style.display=s===1?'':'none';
    $('mm-step2').style.display=s===2?'':'none';
    $('mm-step3').style.display=s===3?'':'none';
    mmRail();
    mmOpen('mm-checkout');
    if(s===1)mmRenderBasket();
    if(s===2)mmRenderDetails();
    if(s===3){mmSeedEngine();mmRenderPay();}
  }
  window.mmCheckout=mmCheckout;
  window.mmStepBack=function(){mmCheckout(Math.max(1,step-1))};

  function mmRenderDetails(){
    var box=$('mm-step2');if(!box)return;
    var c=pro()||{};
    var dels=(typeof DELS!=='undefined'?DELS:[]).map(function(d){
      var dis=(typeof disDel!=='undefined'?disDel:[]).indexOf(d.t)>-1;
      var on=(isCod===true&&d.t==='cod')||(isCod===false&&d.t==='pickup');
      return '<button class="'+(on?'on':'')+'" '+(dis?'disabled':'')+' data-t="'+esc2(d.t)+'" onclick="mmPickDel(this.dataset.t)">'+esc2(d.l)+'</button>';
    }).join('');
    var blocks=(typeof BLOCKS!=='undefined'?BLOCKS:[]).map(function(b,i){
      var dis=(typeof disBlocks!=='undefined'?disBlocks:[]).indexOf(b)>-1;
      return '<button class="'+(selBlock===b?'on':'')+'" '+(dis?'disabled':'')+' onclick="mmPickBlock('+i+')">'+esc2(b)+'</button>';
    }).join('');
    var slots=(typeof SLOTS!=='undefined'?SLOTS:[]).map(function(t,i){
      return '<button class="'+(selTime===t?'on':'')+'" data-i="'+i+'" onclick="mmPickTime(+this.dataset.i)">'+esc2(t)+'</button>';
    }).join('');
    box.innerHTML=
      '<div class="mm-lbl">PENGHANTARAN</div><div class="mm-pick">'+dels+'</div>'
      +'<div class="mm-lbl">SIAPA</div>'
      +'<input class="mm-inp" id="mm-name" placeholder="Nama anda" maxlength="25" value="'+esc2(c.n||'')+'">'
      +'<input class="mm-inp" id="mm-phone" placeholder="No. WhatsApp · cth 0123456789" inputmode="tel" maxlength="20" value="'+esc2(c.ph||'')+'">'
      +'<div class="mm-lbl">DI MANA'+(isCod===false?' · tidak perlu untuk ambil sendiri':'')+'</div>'
      +'<div class="mm-pick">'+blocks+'</div>'
      +'<input class="mm-inp" id="mm-room" style="margin-top:9px" placeholder="Nombor bilik · cth 7B-12" maxlength="20" value="'+esc2(c.room||'')+'">'
      +'<div class="mm-lbl">BILA</div><div class="mm-pick">'+(slots||'<button class="on">Bila siap</button>')+'</div>'
      +'<input class="mm-inp" id="mm-time" style="margin-top:9px" placeholder="Atau taip masa (cth 11:15PM)" maxlength="30">'
      +'<div class="mm-note">Maklumat ini disimpan pada peranti anda dan digunakan untuk pesanan seterusnya.</div>'
      +'<div style="margin-top:14px"><button class="mm-x" style="width:100%;padding:12px;font-size:12.5px;font-weight:900" onclick="mmStepBack()">← Kembali ke bakul</button></div>';
    var t=total()+codFee();
    $('mm-ft').innerHTML='<div><div class="l">JUMLAH SETAKAT INI</div><div class="v">RM'+t.toFixed(2)+'</div></div>'
      +'<button onclick="mmToPay()">Bayar →</button>';
  }
  var payRoom='';   // survives the re-render that a delivery/block tap triggers
  window.mmPickDel=function(t){
    var r=$('mm-room'); if(r)payRoom=r.value;
    var b=document.querySelector('#del .dt-btn[data-type='+t+']');
    if(b)b.click();
    if(step===3)mmRenderPay(); else mmRenderDetails();
  };
  window.mmPickBlock=function(i){pickBlock(i);if(step===3)mmRenderPay();else mmRenderDetails()};
  window.mmPickTime=function(i){selT(i);if(step===3)mmRenderPay();else mmRenderDetails()};

  // copy the step-2 form into the real inputs, then let the engine validate
  function mmSyncDetails(){
    var n=$('mm-name'),p=$('mm-phone'),r=$('mm-room'),tm=$('mm-time');
    if(n&&$('inp-name2'))$('inp-name2').value=n.value;
    if(p&&$('inp-phone'))$('inp-phone').value=p.value;
    if(r&&$('inp-room'))$('inp-room').value=r.value;
    if(tm&&tm.value.trim()){selTime=tm.value.trim();var pt=$('pickup-time');if(pt)pt.value=selTime}
    if(n&&String(n.value).trim().length>=2&&String((p||{}).value||'').replace(/[^0-9]/g,'').length>=9){
      try{saveCustomer()}catch(e){}
    }
  }
  window.mmToPay=function(){
    mmSyncDetails();
    var n=String(($('mm-name')||{}).value||'').trim();
    var ph=String(($('mm-phone')||{}).value||'').replace(/[^0-9]/g,'');
    if(n.length<2){toast('⚠ Sila masukkan nama');return}
    if(ph.length<9){toast('⚠ Sila masukkan no. WhatsApp');return}
    if(isCod===null){toast('⚠ Sila pilih cara penghantaran');return}
    if(isCod===true&&!selBlock){toast('⚠ Sila pilih blok');return}
    var room=String(($('mm-room')||{}).value||'').trim();
    if(isCod===true&&!room){toast('⚠ Sila masukkan nombor bilik');return}
    if(isCod===true&&room.length<3){toast('⚠ Nombor bilik terlalu pendek · cth 7B-12');return}
    if(!selTime){toast('⚠ Sila pilih masa');return}
    mmCheckout(3);
  };

  // The QR section is the engine's live DOM, not a copy: moving it keeps the
  // image, the download link and the receipt upload all wired to the same code.
  function mmQrMount(on){
    var sec=$('qr-section'); if(!sec)return;
    if(!sec._home){sec._home=sec.parentNode;sec._next=sec.nextSibling;}
    if(on){
      var host=$('mm-qr-host');
      if(host){host.appendChild(sec);sec.style.display='block';}
    }else if(sec.parentNode!==sec._home){
      sec._home.insertBefore(sec,sec._next||null);
      sec.style.display='none';
    }
  }
  function mmRenderPay(){
    var box=$('mm-step3');if(!box)return;
    mmQrMount(false);
    var methods=[['cash','💵 Tunai'],['qr','📱 QR Pay'],['coupon','🎟 Kupon']];
    var dels=(typeof DELS!=='undefined'?DELS:[]).map(function(d){
      var dis=(typeof disDel!=='undefined'?disDel:[]).indexOf(d.t)>-1;
      var on=(isCod===true&&d.t==='cod')||(isCod===false&&d.t==='pickup');
      return '<button class="'+(on?'on':'')+'" '+(dis?'disabled':'')+' data-t="'+esc2(d.t)+'" onclick="mmPickDel(this.dataset.t)">'+esc2(d.l)+'</button>';
    }).join('');
    var slots=(typeof SLOTS!=='undefined'?SLOTS:[]).map(function(t,i){
      return '<button class="'+(selTime===t?'on':'')+'" data-i="'+i+'" onclick="mmPickTime(+this.dataset.i)">'+esc2(t)+'</button>';
    }).join('');
    var roomVal=payRoom||((pro()||{}).room||'');
    box.innerHTML='<div class="mm-lbl">PENGHANTARAN</div><div class="mm-pick">'+dels+'</div>'
      +'<div class="mm-note">'+(isCod===false?'Ambil sendiri di kaunter — tiada caj penghantaran.':'Penghantaran ke bilik'+(isCod===true?' · caj RM'+codFee().toFixed(2):''))+'</div>'
      +(isCod===true?'<div class="mm-lbl">NO. BILIK</div><input class="mm-inp" id="mm-room" style="margin-top:6px" placeholder="cth 7B-12" maxlength="20" value="'+esc2(roomVal)+'">':'')
      +'<div class="mm-lbl">BILA</div><div class="mm-pick">'+(slots||'<button class="on">Bila siap</button>')+'</div>'
      +'<div class="mm-lbl">KAEDAH BAYAR</div><div class="mm-pick">'
      +methods.map(function(m){return '<button data-method="'+m[0]+'" class="'+(payM===m[0]?'on':'')+'" onclick="mmPickPay(\\''+m[0]+'\\')">'+m[1]+'</button>'}).join('')
      +'</div>'
      +'<div id="mm-qr-host" style="margin-top:12px;padding-bottom:104px"></div>'
      +'<div class="mm-lbl">KOD KUPON</div>'
      +'<div style="display:flex;gap:8px"><input class="mm-inp" id="mm-cpn" style="margin:0;letter-spacing:2px;text-transform:uppercase" placeholder="Kod kupon" maxlength="12">'
      +'<button class="mm-x" style="width:auto;padding:0 18px;font-size:12.5px;font-weight:900;flex-shrink:0" onclick="mmUseCode()">Guna</button></div>'
      +'<div class="mm-note" id="mm-cpn-msg">Satu kod untuk satu minuman percuma (add-on tetap dikenakan).</div>'
      +'<div class="mm-lbl">RINGKASAN</div>'
      +'<div class="mm-kv"><span>Subtotal ('+count()+' item)</span><span>RM'+total().toFixed(2)+'</span></div>'
      +(isCod===true?'<div class="mm-kv"><span>COD</span><span>+RM'+codFee().toFixed(2)+'</span></div>':'')
      +'<div class="mm-kv" style="border-top:1px solid var(--line);margin-top:6px;padding-top:10px"><span style="font-weight:900">Jumlah</span><b>RM'+(total()+codFee()).toFixed(2)+'</b></div>'
      +'<div style="margin-top:14px"><button class="mm-x" style="width:100%;padding:12px;font-size:12.5px;font-weight:900" onclick="mmCheckout(1)">← Kembali ke bakul</button></div>';
    var ft=$('mm-ft');
    ft.className='mm-ft wa';
    ft.innerHTML='<div><div class="l">JUMLAH</div><div class="v">RM'+(total()+codFee()).toFixed(2)+'</div></div>'
      +'<button onclick="mmSend()">Hantar Pesanan</button>';
    if(payM==='qr')mmQrMount(true);
    var cp=liveCpns?liveCpns():[];
    if(cp.length&&$('mm-cpn-msg'))$('mm-cpn-msg').textContent='Anda ada '+cp.length+' kupon — tekan Kupon di bar bawah untuk guna.';
  }
  window.mmPickPay=function(m){
    var b=document.querySelector('#pay button[data-method='+m+']');if(b)b.click();
    mmRenderPay();
  };
  window.mmUseCode=function(){
    var v=String(($('mm-cpn')||{}).value||'').trim().toUpperCase();
    if(!v){toast('⚠ Masukkan kod');return}
    var inp=$('inp-coupon');if(inp)inp.value=v;
    var b=$('coupon-check');if(b)b.click();
    setTimeout(function(){var m=$('coupon-msg');if(m&&$('mm-cpn-msg'))$('mm-cpn-msg').textContent=m.textContent},600);
  };
  // The last mile is the engine's: it validates, builds the receipt, and the
  // WhatsApp button is still the only thing that sends.
  window.mmSend=function(){
    mmSeedEngine();
    var r=$('mm-room'); if(r)payRoom=r.value;
    if(isCod===null){toast('⚠ Sila pilih cara penghantaran');return}
    if(!selTime){toast('⚠ Sila pilih masa');return}
    if(isCod===true&&String(payRoom).trim().length<3){toast('⚠ Nombor bilik terlalu pendek · cth 7B-12');return}
    if(isCod===true&&!selBlock){toast('⚠ Sila pilih blok');return}
    if($('inp-room'))$('inp-room').value=payRoom;
    mmSyncDetails();
    // The engine refuses to build a receipt without a payment method; a first
    // order with none chosen would otherwise bounce back with no explanation.
    if(typeof payM!=='undefined'&&!payM){
      var cb=document.querySelector('#pay button[data-method=cash]');
      if(cb)cb.click();
    }
    var chk=$('checkout');if(!chk){toast('⚠ Tidak dapat meneruskan');return}
    mmClose();
    chk.click();
    setTimeout(function(){
      var m=$('confirm-modal');
      if(m&&getComputedStyle(m).display!=='none'){
        var t=$('confirm-total');var wa=$('wa-send');
        if(wa)wa.click();
      }else{
        toast('⚠ Sila semak butiran anda');
        mmCheckout(2);
      }
    },350);
  };

  // ---- reward cabinet ----------------------------------------------------
  function drawReward(){
    var box=$('mm-reward-bd');if(!box)return;
    var cp=(liveCpns?liveCpns():[])||[];
    var loy=(getLoy?getLoy():{c:0})||{c:0};
    var done=Number(loy.c)||0, stepN=done%5;
    var html='';
    if(cp.length){
      html+=cp.map(function(c){
        return '<div class="mm-card"><div class="cap">KUPON ANDA · SAH 30 HARI</div>'
          +'<div class="code">'+esc2(c.code)+'</div>'
          +'<div class="hint">Satu minuman percuma (add-on tetap dikenakan)</div>'
          +'<div class="btns"><button class="ghost" onclick="mmCopy(\\''+esc2(c.code)+'\\')">Salin</button>'
          +'<button class="solid" onclick="mmUseFromCabinet(\\''+esc2(c.code)+'\\')">Guna sekarang</button></div></div>';
      }).join('');
    }else{
      html+='<div class="mm-card"><div class="cap">TIADA KUPON LAGI</div>'
        +'<div class="hint" style="margin-top:8px">Setiap 5 pesanan yang siap, anda dapat 1 minuman percuma. Kupon muncul di sini sendiri — tak perlu minta kod dari penjual.</div></div>';
    }
    html+='<div class="mm-card"><div class="cap">SETEM · '+stepN+' / 5</div>'
      +'<div class="mm-bar"><i style="width:'+(stepN/5*100)+'%"></i></div>'
      +'<div class="mm-stamps">'+(function(){var s='';for(var i=0;i<5;i++)s+='<span class="'+(i<stepN?'f':'')+'">'+(i<stepN?'✓':(i+1))+'</span>';return s})()+'</div>'
      +'<div class="hint" style="margin-top:10px">Kumpul 5 → kupon percuma automatik.</div></div>';
    box.innerHTML=html;
  }
  window.mmCopy=function(code){try{cpnCopy(code)}catch(e){toast('Kod: '+code)}};
  window.mmUseFromCabinet=function(code){
    mmClose();
    var b=document.querySelector('#pay button[data-method=coupon]');if(b)b.click();
    var i=$('inp-coupon');if(i)i.value=code;
    try{if(typeof couponCheck==='function')couponCheck()}catch(e){}
    mmCheckout(count()?3:1);
    if($('mm-cpn'))$('mm-cpn').value=code;
  };

  // ---- profile ("Saya") --------------------------------------------------
  function drawMe(){
    var box=$('mm-me-bd');if(!box)return;
    var c=pro()||{};
    var loy=(getLoy?getLoy():{c:0})||{c:0};
    box.innerHTML=
      '<div class="mm-card" style="padding:14px 16px"><div class="cap">PROFIL ANDA</div>'
      +'<div class="hint" id="mm-me-hint">Maklumat disimpan pada peranti ini sahaja dan digunakan untuk pesanan seterusnya.</div>'
      +'<div class="mm-inp" style="display:none" id="mm-me-x"></div>'
      +'<div class="mm-lbl" style="margin-top:12px">NAMA</div>'
      +'<input class="mm-inp" id="me-name" placeholder="Nama anda" maxlength="25" value="'+esc2(c.n||'')+'">'
      +'<div class="mm-lbl">NO. WHATSAPP</div>'
      +'<input class="mm-inp" id="me-phone" placeholder="cth 0123456789" inputmode="tel" maxlength="20" value="'+esc2(c.ph||'')+'">'
      +'<div class="mm-lbl">BLOK</div><div class="mm-pick" id="me-blocks">'
      +(typeof BLOCKS!=='undefined'?BLOCKS:[]).map(function(b,i){
        return '<button class="'+(c.block===b?'on':'')+'" onclick="mePickBlock('+i+',this)">'+esc2(b)+'</button>'}).join('')
      +'</div>'
      +'<input class="mm-inp" id="me-room" style="margin-top:9px" placeholder="Nombor bilik · cth 7B-12" maxlength="20" value="'+esc2(c.room||'')+'">'
      +'<div class="btns"><button class="solid" onclick="meSave()">Simpan</button></div>'
      +'<div class="mm-saved" id="me-saved" hidden><span>\u2705<\/span>Maklumat anda disimpan</div></div>'
      +'<div class="mm-card"><div class="cap">RINGKASAN</div>'
      +'<div class="mm-kv"><span>Setem</span><b>'+((Number(loy.c)||0)%5)+' / 5</b></div>'
      +'<div class="mm-kv"><span>Kupon tersedia</span><b>'+(liveCpns?liveCpns().length:0)+'</b></div>'
      +'<div class="btns"><button class="ghost" onclick="mmTab(\\'kupon\\')">Buka kupon</button>'
      +'<button class="ghost" onclick="mmOrder()">Pesanan saya</button></div></div>';
  }
  window.mePickBlock=function(i,el){
    var bs=document.querySelectorAll('#me-blocks button');
    for(var k=0;k<bs.length;k++)bs[k].classList.remove('on');
    if(el)el.classList.add('on');
    try{pickBlock(i)}catch(e){}
  };
  function showSaved(){
    var el=$('me-saved');if(!el)return;
    el.hidden=false;
    clearTimeout(el._t);
    el._t=setTimeout(function(){var e2=$('me-saved');if(e2)e2.hidden=true},4500);
  }
  window.meSave=function(){
    var n=String(($('me-name')||{}).value||'').trim();
    var ph=String(($('me-phone')||{}).value||'').replace(/[^0-9]/g,'');
    if(n.length<2){toast('⚠ Nama terlalu pendek');return}
    if(ph.length<9){toast('⚠ No. WhatsApp tidak sah');return}
    if($('inp-name2'))$('inp-name2').value=n;
    if($('inp-phone'))$('inp-phone').value=ph;
    if($('inp-room'))$('inp-room').value=String(($('me-room')||{}).value||'');
    try{saveCustomer()}catch(e){}
    toast('✅ Maklumat anda disimpan');
    drawMe();mmBadges();
    // drawMe rebuilds the card, so the tick is shown on the fresh element
    showSaved();
    var ck=$('mm-checkout');
    if(ck&&ck.style.display!=='none'&&step===1)mmRenderBasket();
    if(pendingSaya){pendingSaya=false;mmClose2('mm-me');mmCheckout(2);return}
  };
  window.mmOrder=function(){mmClose();try{if(typeof openMyOrder==='function')openMyOrder()}catch(e){}};

  // ---- boot --------------------------------------------------------------
  function boot(){
    drawChips();mmFilter();mmBadges();
    // every route into the old cart panel now lands in the Bakul sheet
    try{
      window.openCart=function(){mmCheckout(1)};
      var cb=document.getElementById('cartb');
      if(cb)cb.setAttribute('onclick','event.stopPropagation();mmCheckout(1)');
      var bar=document.getElementById('cart-bar');
      if(bar)bar.onclick=function(){mmCheckout(1)};
    }catch(e){}
    if(needPro()){
      // first-time buyer: the tab bar nudges them to Saya rather than failing
      // at checkout with no explanation
      var s=document.querySelector('#mm-tab a[data-t=saya]');
      if(s)s.style.color='#C9A96A';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,0);
  window.mmTab=mmTab;
})();
</script>`;

module.exports = { CSS, HTML, JS };
