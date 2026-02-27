const fs = require('fs');
const path = require('path');
const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const DATA_FILE = path.join(__dirname, '..', 'allowedClients.json');
let allowedClients = {};
function loadAllowed() {
  try { allowedClients = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { allowedClients = {}; }
}
loadAllowed();

// In-memory sessions: token -> { pcName, expires }
const sessions = new Map();
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

app.post('/auth', (req, res) => {
  const { pcName, signature } = req.body || {};
  if (!pcName) return res.status(400).json({ error: 'pcName required' });

  const entry = allowedClients[pcName];
  if (!entry) return res.status(403).json({ error: 'pcName not allowed' });

  // If publicKey provided, verify signature (expects base64 signature over pcName)
  if (entry.publicKey) {
    if (!signature) return res.status(400).json({ error: 'signature required' });
    try {
      const verify = crypto.createVerify('sha256');
      verify.update(pcName);
      verify.end();
      const ok = verify.verify(entry.publicKey, signature, 'base64');
      if (!ok) return res.status(403).json({ error: 'invalid signature' });
    } catch (e) {
      return res.status(500).json({ error: 'verification error' });
    }
  }

  // Success: issue short-lived token
  const token = uuidv4();
  sessions.set(token, { pcName, expires: Date.now() + SESSION_TTL_MS });
  res.json({ token, expiresInMs: SESSION_TTL_MS });
});

// Simple endpoint to reload allowed clients without restarting
app.post('/reload-allowed', (req, res) => {
  loadAllowed();
  res.json({ ok: true, count: Object.keys(allowedClients).length });
});

const server = createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Broadcast to all connected clients
function broadcast(sender, message) {
  const payload = JSON.stringify({ from: sender, text: message, ts: Date.now() });
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(payload); });
}

wss.on('connection', (ws, req, session) => {
  ws.pcName = session.pcName;
  ws.send(JSON.stringify({ system: `Welcome ${session.pcName}` }));
  ws.on('message', (msg) => {
    try { const txt = msg.toString(); broadcast(ws.pcName, txt); } catch (e) { /* ignore */ }
  });
  ws.on('close', () => {});
});

server.on('upgrade', (req, socket, head) => {
  // expect token as query param
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (!token) { socket.destroy(); return; }
    const sess = sessions.get(token);
    if (!sess || sess.expires < Date.now()) { socket.destroy(); return; }

    // consume session (optional: keep it reusable for concurrent connections)
    // sessions.delete(token);

    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req, sess));
  } catch (e) { socket.destroy(); }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Chat server listening on http://0.0.0.0:${PORT}`));

// Periodic cleanup of expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions.entries()) if (v.expires < now) sessions.delete(k);
}, 60 * 1000);
