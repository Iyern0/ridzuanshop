// Telegram relay for MINUM MALAM SISWA.
// Deployed once on Vercel (free). The storefront posts here instead of calling
// api.telegram.org, which some phone networks refuse to reach from a browser.
// Only the owner's chat id is accepted, so the endpoint cannot be used as a
// spam relay even though it is public.
const TG = 'https://api.telegram.org/bot' + process.env.TG_TOKEN + '/sendMessage';
const ALLOW = String(process.env.TG_CHAT || '');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, description: 'POST sahaja' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  // The only destination is the owner's chat. Whatever chat_id the page sends
  // (an old value, a typo, a wrong account) is ignored, so the storefront never
  // has to be re-deployed to fix a bad id.
  if (!ALLOW) return res.status(500).json({ ok: false, description: 'TG_CHAT belum diset' });

  try {
    const r = await fetch(TG, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: ALLOW,
        text: String(body.text || ''),
        parse_mode: body.parse_mode || 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const j = await r.json().catch(() => ({ ok: false, description: 'respons telegram tidak sah' }));
    return res.status(r.status).json(j);
  } catch (e) {
    return res.status(502).json({ ok: false, description: String((e && e.message) || e) });
  }
}
