# HeyReach + Instantly → Slack Relay

Forwards LinkedIn replies (HeyReach) and email replies (Instantly) to the `#leadresponses-campaigns-` Slack channel in the Swyft workspace.

## Architecture

```
HeyReach (LinkedIn replies)  ──┐
                               ├──► Supabase Edge Function ──► Slack #leadresponses-campaigns-
Instantly (email replies)    ──┘
```

## Supabase Edge Function

- **Project:** `lead-gen-webhooks` (ref: `smggsrympfbjpkxgfpvb`)
- **Function:** `heyreach-webhook`
- **URL:** `https://smggsrympfbjpkxgfpvb.supabase.co/functions/v1/heyreach-webhook`
- **Secret:** `SLACK_WEBHOOK_URL` (set via `supabase secrets set`)

### Deploy

```bash
supabase functions deploy heyreach-webhook --project-ref smggsrympfbjpkxgfpvb
```

## Slack

- **Workspace:** Swyft (T0AFK4RAUG0)
- **App:** Lead Gen Notifier (A0AMHKZ5BU1)
- **Channel:** `#leadresponses-campaigns-` (C0AM2K6PZGW)
- **Incoming Webhook URL:** stored as `SLACK_WEBHOOK_URL` secret in Supabase

## HeyReach Webhook

- **Webhook ID:** 29123
- **Name:** SlackLeadReplies
- **Event:** `MESSAGE_REPLY_RECEIVED`
- **Scope:** All campaigns
- **Target:** Supabase Edge Function URL

To update:
```bash
# Via HeyReach MCP: mcp__heyreach__update_webhook
```

## Instantly Webhook

- **Webhook ID:** `019cfc94-a787-7c0b-9848-9bc24d38850d`
- **Event:** `reply_received`
- **Target:** Supabase Edge Function URL
- **API Key used:** `webhook-relay` (all:all scope) — stored securely, do not commit

To recreate:
```bash
curl -X POST "https://api.instantly.ai/api/v2/webhooks" \
  -H "Authorization: Bearer <INSTANTLY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "target_hook_url": "https://smggsrympfbjpkxgfpvb.supabase.co/functions/v1/heyreach-webhook",
    "event_type": "reply_received"
  }'
```

## MCP Servers (Claude Desktop)

All configured in `~/Library/Application Support/Claude/claude_desktop_config.json`:

- `heyreach` — HeyReach MCP via remote SSE
- `instantly` — Instantly account 1 (Swyft)
- `instantly-2` — Instantly account 2
- `slack` — Slack MCP with bot token for Swyft workspace

## Files

| File | Purpose |
|------|---------|
| `supabase/functions/heyreach-webhook/index.ts` | Active Edge Function — handles both HeyReach and Instantly payloads |
| `relay.cjs` | Local relay (superseded, no longer used) |
| `start.sh` | Starts local relay + localtunnel (superseded) |
| `api/webhook.js` | Vercel function (not deployed, abandoned) |
| `vercel.json` | Vercel config (not deployed, abandoned) |
