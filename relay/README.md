# Telegram relay

The browser cannot reach `api.telegram.org` on this network, so the storefront
posts to this tiny function instead and the function talks to Telegram.

## Deploy (one time, ~5 minutes)

```bash
cd relay
npx vercel login          # or: npx vercel --token $VERCEL_TOKEN
npx vercel --prod
```

Then in the Vercel dashboard → Project → Settings → Environment Variables:

| Name | Value |
|---|---|
| `TG_TOKEN` | the bot token from @BotFather |
| `TG_CHAT`  | your numeric chat id (from @userinfobot) |

Redeploy after adding the variables (`npx vercel --prod` again), then copy the
production URL (ends with `/api/tg`) into:

**Admin panel → Settings → ✈️ Telegram → Relay URL** → Simpan → Hantar ujian.

The function refuses any `chat_id` other than `TG_CHAT`, so a leaked URL cannot
be used to spam anyone else.
