#!/bin/bash
# HeyReach → Slack relay starter
# Starts the relay server and localtunnel

cd "$(dirname "$0")"

# Kill any existing instances
pkill -f "relay.cjs" 2>/dev/null
pkill -f "localtunnel.*3456" 2>/dev/null
sleep 1

# Start relay
node relay.cjs &
RELAY_PID=$!
echo "Relay started (PID $RELAY_PID)"

# Start tunnel
npx localtunnel --port 3456 --subdomain heyreach-slack-relay &
TUNNEL_PID=$!
echo "Tunnel started (PID $TUNNEL_PID)"

echo "HeyReach → Slack relay is live at https://heyreach-slack-relay.loca.lt"
wait
