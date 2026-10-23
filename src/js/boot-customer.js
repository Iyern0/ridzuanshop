/* boot-customer.js - start-up for the order page.
   Hand-maintained: edit here, then run tools/build.py. Loaded last, after
   core.js and customer.js. */

  // tap anywhere else and the bubble folds away
  document.addEventListener('click',function(){const p=document.getElementById('cpn-pop');if(p&&p.style.display==='block')p.style.display='none'});
setTimeout(function(){_menuFirst=false},1100);
document.getElementById('del').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const t=b.dataset.type;if(couponOnly())codFreeUp=(t==='cod');if(admin){const i=disDel.indexOf(t);if(i>-1){if(disDel.length>=DELS.length){toast('❌ Mesti ada satu cara penghantaran');return}disDel.splice(i,1)}else disDel.push(t);saveConfig();drawDel();return}if(disDel.includes(t)){toast('❌ Tidak tersedia');return}document.querySelectorAll('#del button').forEach(b=>b.classList.remove('active'));b.classList.add('active');isCod=t==='cod';document.getElementById('time-more').style.display='none';document.getElementById('time-pickup').style.display=isCod?'none':'block';document.getElementById('times').style.display=isCod?'flex':'none';document.getElementById('pickup-note').style.display='none';document.getElementById('block-section').style.display=isCod?'block':'none';if(isCod){restoreLocation();if(!selBlock){const _c=loadCustomer();if(_c&&_c.block)toast('Blok '+_c.block+' tidak tersedia sekarang - pilih semula')}}document.getElementById('pickup-note').style.display='none';setTimeout(()=>document.getElementById('inp-name2').focus(),100);document.getElementById('time-label').textContent=isCod?'⏰ When did you want it?':'⏰ Masa Ambil';selTime=isCod?'':((document.getElementById('pickup-time').value||'').trim()||'Bila siap');if(!isCod){selBlock='';const _cb=document.getElementById('inp-custom-block');if(_cb)_cb.value=''}drawTimes();drawBlocks();upCart();if(isCod)saySavedAs();});
document.getElementById('pickup-time').addEventListener('input',function(){selTime=this.value.trim();drawTimes()});
if(document.getElementById('coupon-check'))document.getElementById('coupon-check').addEventListener('click',couponCheck);
if(document.getElementById('inp-coupon'))document.getElementById('inp-coupon').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();couponCheck()}});
document.getElementById('pay').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#pay button').forEach(b=>b.classList.remove('active'));b.classList.add('active');payM=b.dataset.method;const qs=document.getElementById('qr-section');qs.style.display=payM==='qr'?'block':'none';const cpnSec=document.getElementById('coupon-section');if(cpnSec)cpnSec.style.display=payM==='coupon'?'block':'none';if(payM!=='coupon'){cpnLine=-1;cpnOk=false;cpnCode=''}
// The QR opens underneath the payment buttons, which on a phone is already past
// the bottom of the panel - so a customer taps QR Pay, nothing appears to move,
// and it reads as "no QR". Bring it into view instead of trusting them to scroll.
if(payM==='qr')setTimeout(function(){
  // Scroll the panel body itself rather than calling scrollIntoView: the panel
  // is the scroll container, and an explicit offset lands the QR at the top of
  // it every time, with no dependence on smooth-scroll timing.
  try{
    const bd=document.querySelector('#panel .bd');
    if(!bd)return;
    const off=qs.getBoundingClientRect().top-bd.getBoundingClientRect().top;
    bd.scrollTop=bd.scrollTop+off-8;
  }catch(err){}
},60)});
document.getElementById('checkout').addEventListener('click',function(){if(pruneCart()){saveCart();upCart()}const e=Object.entries(cart);let totalItems=0;e.forEach(([_,v])=>totalItems+=v.length);if(totalItems===0){toast('⚠ Tiada pesanan');return}if(isCod===null){toast('⚠ Sila pilih cara penghantaran');return}const n=document.getElementById('inp-name2').value.trim(),blockR=isCod?(selBlock==='other'?((document.getElementById('inp-custom-block')||{}).value||'').trim():selBlock):'',roomR=isCod?(document.getElementById('inp-room').value||'').trim():'',r=isCod?(blockR+(roomR?' '+roomR:'')):'';if(!n){highlight('inp-name2','⚠ Sila masukkan nama');return}if(isCod&&!selBlock){toast('⚠ Sila pilih blok');return}if(isCod&&selBlock&&!document.getElementById('inp-room').value.trim()){toast('⚠ Sila masukkan nombor bilik');return}if(!isCod&&!selTime)selTime='Bila siap';if(!selTime){highlight('pickup-time','⚠ Sila pilih masa dahulu');return}if(!payM){highlight('pay-section','⚠ Sila pilih cara bayar');return}
if(payM==='coupon'&&!cpnOk){toast('\u274C Sahkan kupon dahulu');return}if(couponOnly()&&isCod&&!codFreeUp){isCod=false;drawDel()}if(payM==='qr'&&!stagedProof){const cp=document.getElementById('qr-claim-panel');if(cp){cp.style.borderColor='#C6381E';setTimeout(function(){cp.style.borderColor=''},2000)}toast('⚠ Hantar resit dahulu');return}if(payM==='coupon'&&cpnOk){let _bi=-2,_bb=-1,_k=-1;Object.entries(cart).forEach(function(en){const mm=/^c(\d+)v(\d+)$/.exec(en[0]);if(!mm)return;const item=MENU[parseInt(mm[1],10)]&&MENU[parseInt(mm[1],10)].items[parseInt(mm[2],10)];if(!item)return;en[1].forEach(function(inst){_k++;const b=Number(item.price)||0;if(b>_bb){_bb=b;_bi=_k}})});cpnLine=_bi}
let html='',total=0,idx=0;_revPrice=[];_revLabel=[];_revBase=[];_revAdd=[];e.forEach(([id,items])=>{const ci=parseInt(id.match(/c(\d+)/)[1]),vi=parseInt(id.match(/v(\d+)/)[1]);if(!MENU[ci]||!MENU[ci].items[vi])return;const item=MENU[ci].items[vi];items.forEach(inst=>{idx++;const ac=inst.adds.reduce((s,aid)=>{const a=findAdd(aid);return s+(a?a.price:0)},0);const base=Number(item.price)||0;total+=base+ac;const al=addsLine(inst.adds);const emoji=drinkEmoji(item.name);_revPrice.push(+(base+ac).toFixed(2));_revBase.push(+base.toFixed(2));_revAdd.push(+ac.toFixed(2));const li=idx-1,pickable=false,isFree=(payM==='coupon'&&cpnOk&&cpnLine===li);const rowStyle='display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(16,26,22,0.06)'+(pickable?';cursor:pointer;border-radius:8px;padding-left:8px;padding-right:8px;'+(isFree?'background:rgba(16,26,22,0.12);outline:1px solid rgba(16,26,22,0.5)':''):'');const priceHtml=isFree?'<s style="color:#6B7A73;font-size:15px">RM'+base.toFixed(2)+'</s><b style="color:#101A16;font-family:var(--fd);font-size:15px;margin-left:6px">PERCUMA</b>'+(ac>0?'<span style="color:#8A5A00;font-family:var(--fd);font-weight:800;font-size:14px;margin-left:6px">+RM'+ac.toFixed(2)+'</span>':''):'<span style="font-family:var(--fd);font-weight:800;font-size:19px;color:#101A16">RM'+(base+ac).toFixed(2)+'</span>';html+='<div data-li="'+li+'" style="'+rowStyle+'"><span style="font-size:20px">'+emoji+'</span><div style="flex:1"><div style="font-weight:800;font-size:14px;color:#101A16">'+esc(item.name)+'</div>'+(al?'<div style="font-size:12px;color:#6B7A73;margin-top:2px">\u2795 '+esc(al)+'</div>':'')+'</div>'+priceHtml+'</div>';});});document.getElementById('confirm-items').innerHTML=html;const _fr=(payM==='coupon'&&cpnOk&&cpnLine>=0&&_revBase[cpnLine]!=null)?_revBase[cpnLine]:0;const _fEl=document.getElementById('confirm-free');if(_fEl){_fEl.style.display=_fr>0?'flex':'none';document.getElementById('confirm-free-val').textContent=_fr>0?'-RM'+_fr.toFixed(2):''}document.getElementById('confirm-delivery').innerHTML='🚗 '+(isCod?('COD (+RM'+delFee('cod').toFixed(2)+')'):'Ambil Sendiri')+' · ⏰ '+esc(selTime)+' · 👤 '+esc(n)+(isCod?' '+esc(r):'');document.getElementById('confirm-pay').innerHTML='\u{1F4B3} '+(payM==='coupon'?'\u{1F39F}\uFE0F Kupon':payM==='cash'?'\u{1F4B5} Tunai':'\u{1F4F1} QR Pay')+(payM==='qr'&&!stagedProof?' \u00B7 <span style="color:#8A5A00">\u26A0 tiada resit - penjual tak dapat sahkan bayaran</span>':'');document.getElementById('confirm-sub').textContent='RM'+total.toFixed(2);document.getElementById('confirm-cod').style.display=isCod?'flex':'none';document.getElementById('confirm-total').textContent='RM'+Math.max(0,total+(isCod?delFee('cod'):0)-_fr).toFixed(2);if(document.getElementById('confirm-modal').style.display!=='flex')track('checkout_open');document.getElementById('confirm-modal').style.display='flex';});
(function(){
  const slot=document.getElementById('qr-claim-slot');
  if(slot)slot.innerHTML=claimBlockHtml('qr-');
})();
document.getElementById('cartb').addEventListener('click',openCart);
// Five taps on the title is the owner's way in. It used to open the dashboard
// over this page; the dashboard is a separate page now, so it navigates there.
document.querySelector('.hero h1').addEventListener('click',function(){
  admClk++;clearTimeout(admTmr);admTmr=setTimeout(function(){admClk=0},1000);
  if(admClk>=5){admClk=0;location.href='admin.html'}
});





(async()=>{track('page_view',true);loadCart();drawStatus();drawFounder();showMyOrderBtn();await loadMenu();await initConfig();initDis();fillCustomer();drawCpnBtn();loadMyCoupons();verifyWallet();
  document.addEventListener('visibilitychange',function(){if(!document.hidden){loadMyCoupons();verifyWallet()}});
  window.addEventListener('focus',function(){loadMyCoupons();verifyWallet()});drawLoy();drawDel();// A remembered session never opens anything here - on this page it only
// lights up the Admin link, which leads to admin.html.
const a=getAuth();
if(a)a.onAuthStateChanged(function(){paintAdminBtn()});
})();
// A tap on the seller's notification lands here first. The dashboard is its own
// page now, so hand the tap over instead of trying to raise it over the menu.
(function(){
  let q=null;
  try{q=new URLSearchParams(location.search)}catch(e){}
  if(!q||q.get('admin')!=='1')return;
  location.replace('admin.html'+location.search);
})();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw()});