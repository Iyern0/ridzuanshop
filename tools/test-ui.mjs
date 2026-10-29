// UI regression check: every sheet must close from its own ✕, and no inline
// handler may point at a function that is not on window.
//
//   node tools/test-ui.mjs                                   (local server)
//   node tools/test-ui.mjs https://iyern0.github.io/ridzuanshop/   (live)
import { spawn } from 'node:child_process';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
import os from 'node:os';
const OUT = os.tmpdir() + '/mm-ui-test';
const PORT = 9395;
const URLB = process.argv[2] || 'http://127.0.0.1:9001/drinks-order.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const proc = spawn(EDGE, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/prof`, '--headless=new',
    '--disable-gpu', '--window-size=390,844', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let list = null;
  for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.find(t => t.type === 'page')) break; } catch {} await sleep(300); }
  const t = list.find(x => x.type === 'page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); const errs = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errs.push(String((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text).split('\n')[0]); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URLB + '?x=' + Date.now() });
  await sleep(3500);
  await ev(`localStorage.setItem('mms_cust', JSON.stringify({n:'Aiman',ph:'0123456789',block:'Delima',room:'7B-12'}))`);
  const R = {};
  R.handlers = await ev(`(function(){
    var bad=[],seen={};
    var els=document.querySelectorAll('[onclick]');
    for(var i=0;i<els.length;i++){
      var code=els[i].getAttribute('onclick')||'';
      var m=code.match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
      if(!m)continue;
      var n=m[1]; if(seen[n])continue; seen[n]=1;
      if(typeof window[n]!=='function')bad.push(n);
    }
    return {checked:Object.keys(seen).length,missing:bad};
  })()`);
  const tabs = ['pesanan', 'kupon', 'saya'];
  R.closed = {};
  for (const tab of tabs) {
    await ev(`mmTab('${tab}')`); await sleep(700);
    const opened = await ev(`document.querySelectorAll('.mm-sheet.open').length`);
    await ev(`(document.querySelector('.mm-sheet.open .mm-hd .mm-x')||{click(){}}).click()`); await sleep(600);
    const after = await ev(`document.querySelectorAll('.mm-sheet.open').length`);
    R.closed[tab] = { opened, after };
  }
  R.errs = errs.slice(0, 3);
  console.log(JSON.stringify(R, null, 1));
  try { ws.close(); } catch {}
  proc.kill(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
