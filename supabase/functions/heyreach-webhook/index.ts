import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("HeyReach+Instantly→Slack relay running", { status: 200 });
  }

  try {
    const event = await req.json();
    let text = "";

    // Detect Instantly event (has email_reply_timestamp or from_address fields)
    if (event.event_type === "reply_received" || event.from_address || event.email_reply_timestamp) {
      const fromName = event.from_name || event.from_address || "Unknown";
      const fromEmail = event.from_address || "";
      const subject = event.subject || event.reply_subject || "";
      const body = (event.email_reply_body || event.reply_body || event.snippet || "").substring(0, 400);
      const campaign = event.campaign_name || event.campaign?.name || "";

      text = `*New Instantly Email Reply*\n`;
      text += `*From:* ${fromName}${fromEmail && fromEmail !== fromName ? ` <${fromEmail}>` : ""}\n`;
      if (campaign) text += `*Campaign:* ${campaign}\n`;
      if (subject) text += `*Subject:* ${subject}\n`;
      if (body) text += `*Message:* ${body}\n`;
    } else {
      // HeyReach event
      const lead = event.lead || event.leadData || {};
      const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown Lead";
      const profile = lead.linkedInUrl || lead.profileUrl || "";
      const message = event.message || event.replyMessage || event.messageText || event.content || "";
      const campaign = event.campaignName || event.campaign?.name || "";
      const type = event.eventType || "EVENT";

      text = `*New HeyReach Response* — \`${type}\`\n`;
      if (name !== "Unknown Lead") text += `*Lead:* ${name}${profile ? ` (<${profile}|LinkedIn>)` : ""}\n`;
      if (campaign) text += `*Campaign:* ${campaign}\n`;
      if (message) text += `*Message:* ${message}\n`;
      if (!message && name === "Unknown Lead") text += "```" + JSON.stringify(event, null, 2).substring(0, 500) + "```";
    }

    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ text }),
    });

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});
