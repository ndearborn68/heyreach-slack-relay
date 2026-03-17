const http = require('http');
const https = require('https');

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL; // set via environment variable
const PORT = 3456;

function postToSlack(payload) {
  const body = JSON.stringify(payload);
  const url = new URL(SLACK_WEBHOOK);
  const opts = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function formatMessage(event) {
  const type = event.eventType || event.event_type || 'EVENT';
  const lead = event.lead || event.leadData || {};
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.name || 'Unknown Lead';
  const profile = lead.linkedInUrl || lead.profileUrl || '';
  const message = event.message || event.replyMessage || event.messageText || event.content || '';
  const campaign = event.campaignName || event.campaign?.name || '';

  let text = `*New HeyReach Response* — \`${type}\`\n`;
  if (name !== 'Unknown Lead') text += `*Lead:* ${name}${profile ? ` (<${profile}|LinkedIn>)` : ''}\n`;
  if (campaign) text += `*Campaign:* ${campaign}\n`;
  if (message) text += `*Message:* ${message}\n`;
  if (!name && !message) text += '```' + JSON.stringify(event, null, 2).substring(0, 500) + '```';

  return { text };
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(200);
    res.end('HeyReach→Slack relay running');
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const event = JSON.parse(body);
      console.log('[HeyReach]', JSON.stringify(event, null, 2));
      const slackPayload = formatMessage(event);
      await postToSlack(slackPayload);
      console.log('[Slack] Posted:', slackPayload.text.substring(0, 80));
      res.writeHead(200);
      res.end('ok');
    } catch (err) {
      console.error('[Error]', err.message);
      res.writeHead(500);
      res.end('error');
    }
  });
});

server.listen(PORT, () => {
  console.log(`HeyReach→Slack relay listening on port ${PORT}`);
});
