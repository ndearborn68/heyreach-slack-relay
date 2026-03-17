# Lead Gen Slack Relay Skill

Route LinkedIn replies (HeyReach) and email replies (Instantly) into a single Slack channel using a Supabase Edge Function as a permanent webhook relay.

Works for **any company, any HeyReach workspace, any Instantly account, any Slack workspace** — just swap credentials.

---

## What This Skill Does

Sets up a zero-maintenance, always-on pipeline:

```
HeyReach (LinkedIn replies)  ──┐
                               ├──► Supabase Edge Function ──► Slack channel
Instantly (email replies)    ──┘
```

No ngrok. No Make/Zapier. No Vercel. Just a serverless function that lives forever.

---

## When to Use

- Connecting a **new HeyReach workspace** (any client/company) to Slack
- Connecting a new Instantly account to Slack
- Adding a new Slack channel for a different workspace or campaign group
- Recreating the relay if the Supabase project is deleted
- Onboarding a new client who needs lead response notifications

---

## Live Deployments

### Swyft / GoSwift (Primary)

| Component | Value |
|-----------|-------|
| Supabase project | `lead-gen-webhooks` (ref: `smggsrympfbjpkxgfpvb`) |
| Edge Function URL | `https://smggsrympfbjpkxgfpvb.supabase.co/functions/v1/heyreach-webhook` |
| Slack workspace | Swyft (T0AFK4RAUG0) |
| Slack channel | `#leadresponses-campaigns-` (C0AM2K6PZGW) |
| Slack app | Lead Gen Notifier (A0AMHKZ5BU1) |
| HeyReach webhook (main acct) | ID 29123 — "SlackLeadReplies" — `MESSAGE_REPLY_RECEIVED` |
| HeyReach webhook (Swyft acct) | ID 29203 — "SlackLeadReplies" — `MESSAGE_REPLY_RECEIVED` |
| Instantly webhook ID | `019cfc94-a787-7c0b-9848-9bc24d38850d` — `reply_received` |
| GitHub repo | `https://github.com/ndearborn68/heyreach-slack-relay` |
| Local folder | `/Users/isaacmarks/heyreach-slack-relay` |

---

## How to Set Up from Scratch (Any Company)

### Step 1 — Create Slack App & Incoming Webhook

1. Go to https://api.slack.com/apps → Create App → From Manifest
2. Add scopes: `incoming-webhook`, `channels:read`, `channels:join`, `channels:manage`, `chat:write`
3. Install to workspace → pick the target channel → copy the Incoming Webhook URL

### Step 2 — Deploy Supabase Edge Function

```bash
# Create project at supabase.com, then:
supabase link --project-ref <PROJECT_REF>
supabase secrets set SLACK_WEBHOOK_URL=<INCOMING_WEBHOOK_URL>

# IMPORTANT: deploy with --no-verify-jwt so HeyReach/Instantly can POST without auth
supabase functions deploy heyreach-webhook --project-ref <PROJECT_REF> --no-verify-jwt
```

Edge Function source: `/Users/isaacmarks/heyreach-slack-relay/supabase/functions/heyreach-webhook/index.ts`

The function auto-detects HeyReach vs Instantly payloads:
- **HeyReach**: looks for `eventType`, `lead.firstName/lastName`, `message`
- **Instantly**: looks for `event_type === "reply_received"`, `from_address`, `email_reply_body`

### Step 3 — Create HeyReach Webhook

**Via MCP** (if `mcp__heyreach__` or `mcp__heyreach-<name>__` is connected):
```
mcp__heyreach__create_webhook with:
  - webhookName: "SlackLeadReplies"
  - webhookUrl: <SUPABASE_FUNCTION_URL>
  - eventType: "MESSAGE_REPLY_RECEIVED"
  (omit campaignIds to cover all campaigns)
```

**Via direct REST API** (if MCP is unavailable — use the HeyReach API key from the account's Settings page):
```bash
curl -X POST "https://api.heyreach.io/api/public/webhooks/CreateWebhook" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: <HEYREACH_API_KEY>" \
  -d '{
    "webhookName": "SlackLeadReplies",
    "webhookUrl": "<SUPABASE_FUNCTION_URL>",
    "eventType": "MESSAGE_REPLY_RECEIVED",
    "campaignIds": []
  }'
```

Verify creation:
```bash
curl -X POST "https://api.heyreach.io/api/public/webhooks/GetAllWebhooks" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: <HEYREACH_API_KEY>" \
  -d '{"limit":10,"offset":0}'
```

> **Note:** The MCP key (used in `xMcpKey=` in the MCP URL) is NOT the same as the HeyReach API key. For direct API calls, use the API key from HeyReach Settings → Integrations → API Keys.

### Step 4 — Create Instantly Webhook

Get an API key first: Instantly → Settings → Integrations → API Keys → Create (scope: `all:all`)

```bash
curl -X POST "https://api.instantly.ai/api/v2/webhooks" \
  -H "Authorization: Bearer <INSTANTLY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "target_hook_url": "<SUPABASE_FUNCTION_URL>",
    "event_type": "reply_received"
  }'
```

### Step 5 — Test

```bash
# No auth header needed (function deployed with --no-verify-jwt)
FUNC_URL="https://<PROJECT_REF>.supabase.co/functions/v1/heyreach-webhook"

# HeyReach test
curl -X POST "$FUNC_URL" \
  -H "Content-Type: application/json" \
  -d '{"eventType":"MESSAGE_REPLY_RECEIVED","lead":{"firstName":"Test","lastName":"Lead","linkedInUrl":"https://linkedin.com/in/test"},"campaignName":"Test Campaign","message":"This is a test reply."}'

# Instantly test
curl -X POST "$FUNC_URL" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"reply_received","from_name":"Test User","from_address":"test@example.com","subject":"Re: Test","email_reply_body":"This is a test email reply.","campaign_name":"Test Campaign"}'
```

Check the Slack channel — both messages should appear within seconds.

---

## Adding a New HeyReach Workspace to an Existing Relay

Any HeyReach account (new company, new LinkedIn sender, different workspace) can point to the same Supabase function and Slack channel:

1. Get the HeyReach API key for the new workspace (HeyReach Settings → Integrations → API Keys)
2. Run the `CreateWebhook` REST call above pointing to the existing `SUPABASE_FUNCTION_URL`
3. Verify with `GetAllWebhooks`
4. Test with a mock payload

No redeploy needed — the function handles any HeyReach payload regardless of which workspace it came from.

---

## Adding a New Instantly Account to an Existing Relay

Any Instantly account can point to the same Supabase function and Slack channel:

1. Get an API key: Instantly → Settings → Integrations → API Keys → Create (scope: `all:all`)
2. Create the webhook:
```bash
curl -X POST "https://api.instantly.ai/api/v2/webhooks" \
  -H "Authorization: Bearer <INSTANTLY_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "target_hook_url": "<SUPABASE_FUNCTION_URL>",
    "event_type": "reply_received"
  }'
```
3. Verify: `GET https://api.instantly.ai/api/v2/webhooks` with the same Bearer token
4. Test with a mock payload (see Step 5 above)

No redeploy needed — the function auto-detects Instantly payloads by their field shape.

---

## Redeploy After Code Changes

```bash
cd /Users/isaacmarks/heyreach-slack-relay
supabase functions deploy heyreach-webhook --project-ref smggsrympfbjpkxgfpvb --no-verify-jwt
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `401 Missing authorization header` from Supabase | Redeploy with `--no-verify-jwt` flag — HeyReach/Instantly don't send auth headers |
| `Invalid API key` when calling HeyReach REST API | Use the API key from HeyReach Settings, NOT the MCP `xMcpKey` value |
| `invalid_payload` from Slack | Ensure `Content-Type: application/json; charset=utf-8` |
| Messages not appearing in Slack | Check Supabase Function logs in dashboard |
| Instantly webhook not firing | Verify webhook status=1 via `GET https://api.instantly.ai/api/v2/webhooks` |
| HeyReach webhook not firing | Check webhook isActive=true via `GetAllWebhooks` API call |
| `heyreach-swyft` MCP not connecting | Session may need restart; use direct REST API as fallback |
