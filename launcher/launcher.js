#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

// Use global fetch if available (Node 18+), otherwise dynamic import node-fetch
async function myFetch(...args) {
  if (typeof fetch === 'function') return fetch(...args);
  const nf = await import('node-fetch');
  return nf.default(...args);
}

const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = { server: 'http://localhost:3000', privateKeyPath: null };
try { config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }; } catch (e) { /* use defaults */ }

const pcName = os.hostname();

(async function main(){
  try {
    let signature = null;
    if (config.privateKeyPath && fs.existsSync(config.privateKeyPath)) {
      const key = fs.readFileSync(config.privateKeyPath, 'utf8');
      const sign = crypto.createSign('sha256');
      sign.update(pcName);
      sign.end();
      signature = sign.sign(key, 'base64');
    }

    const res = await myFetch(config.server.replace(/\/$/, '') + '/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pcName, signature })
    });

    if (!res.ok) {
      console.error('Auth failed:', res.status, await res.text());
      process.exit(1);
    }

    const body = await res.json();
    const token = body.token;
    if (!token) { console.error('No token received'); process.exit(1); }

    const serverUrl = config.server.replace(/https?:\/\//, '');
    const wsProto = config.server.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${wsProto}://${serverUrl}/?token=${token}`;

    const socket = new WebSocket(wsUrl);
    socket.on('open', () => {
      console.log('Connected to chat. Type messages and press Enter.');
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', d => {
        const txt = d.toString().trim();
        if (!txt) return;
        socket.send(txt);
      });
    });

    socket.on('message', (data) => {
      try { const msg = JSON.parse(data.toString()); console.log(`[${msg.from||'system'}] ${msg.text||msg.system||data.toString()}`); } catch (e) { console.log('<<', data.toString()); }
    });

    socket.on('close', () => { console.log('Disconnected'); process.exit(0); });
    socket.on('error', (err) => { console.error('Socket error', err.message); process.exit(1); });

  } catch (err) {
    console.error('Launcher error:', err.message || err);
    process.exit(1);
  }
})();
