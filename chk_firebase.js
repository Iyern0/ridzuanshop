const fs = require('fs');
const html = fs.readFileSync('drinks-order.html', 'utf8');
// Block 1: firebase config + getDb + saveOrder (ends right before let _dirty)
const i = html.indexOf('// 🔥 FIREBASE');
const e1 = html.indexOf('let _dirty=false', i);
// Block 2: dashboard funcs (ends right before cartb listener)
const d0 = html.indexOf('let _ordersUnsub=null');
const db_idx = html.indexOf("document.getElementById('cartb')", d0);
const code = html.slice(i, e1) + '\n' + html.slice(d0, db_idx);

const els = {};
function el(id) { if (!els[id]) els[id] = { innerHTML: '', style: {} }; return els[id]; }

const fakeDb = {
  collection() {
    return {
      add: async () => ({}),
      orderBy() { return { onSnapshot() { return () => {}; } }; },
      doc() { return { update: async () => {}, delete: async () => {} }; },
    };
  },
};
const firebase = {
  firestore: () => fakeDb,
  initializeApp: () => {},
};
firebase.firestore.FieldValue = { serverTimestamp: () => 'TS' };

const stubs = {
  document: { hidden: false, getElementById: el },
  firebase,
  toast: () => {},
  esc: s => s,
  confirm: () => true,
  console: { warn: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} },
};

const api = new Function(...Object.keys(stubs), code + ';return{FB_READY,getDb,saveOrder,fsGet,fsSet}')(...Object.values(stubs));

let pass = 0, fail = 0;
function chk(name, cond) { if (cond) pass++; else { fail++; console.log('FAIL:', name); } }

// 1. real config -> FB_READY true
chk('FB_READY true with real config', api.FB_READY === true);

// 2. getDb returns db
chk('getDb returns db when configured', api.getDb() !== null);

// 3. saveOrder doesn't throw
api.saveOrder({ items: [] });
chk('saveOrder no throw with real config', true);

// 4. fsGet and fsSet are functions
chk('fsGet is function', typeof api.fsGet === 'function');
chk('fsSet is function', typeof api.fsSet === 'function');

// 6. configured path: init once, add() called with order + timestamp
let initCalls = 0, addPayload = null;
const cfgDb = { collection: () => ({ add: async o => { addPayload = o; return {}; } }) };
const cfgFirebase = {
  firestore: () => cfgDb,
  initializeApp: () => { initCalls++; },
};
cfgFirebase.firestore.FieldValue = { serverTimestamp: () => 'TS' };
const cfgStubs = {
  document: { hidden: false, getElementById: el },
  firebase: cfgFirebase,
  toast: () => {},
  esc: s => s,
  confirm: () => true,
  console: { warn: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} },
};
const cfgCode = code.replace(/AIzaSy/g, 'testkey');
const cfg = new Function(...Object.keys(cfgStubs), cfgCode + ';return{FB_READY,getDb,saveOrder,fsGet}')(...Object.values(cfgStubs));
chk('FB_READY true when configured', cfg.FB_READY === true);
const d1 = cfg.getDb(), d2 = cfg.getDb();
chk('getDb caches same db', d1 === d2 && d1 !== null);
chk('initializeApp called once', initCalls === 1);
cfg.saveOrder({ name: 'Ali', total: 5.5, items: [{ name: 'Milo', price: 5.5, qty: 1, adds: [] }] });
chk('saveOrder writes payload', addPayload !== null && addPayload.name === 'Ali');
chk('saveOrder adds serverTimestamp', addPayload && addPayload.createdAt === 'TS');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
