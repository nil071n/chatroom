const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ── Shared secret (change this & keep it in sync with the launcher) ──
const LAUNCHER_TOKEN = "cHaT-lAuNcH3r-S3CR3T-2026";

// ── Middleware: block every HTTP request that doesn't carry the token ──
app.use((req, res, next) => {
  const token = req.headers["x-launcher-token"];
  if (token === LAUNCHER_TOKEN) return next();

  // Serve a rejection page for browser visitors
  res.status(403).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Access Denied</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #0a0a0a;
          color: #00ff41;
          font-family: "Courier New", monospace;
          display: flex; align-items: center; justify-content: center;
          height: 100vh; text-align: center;
        }
        .box { max-width: 520px; }
        h1 { font-size: 1.6rem; margin-bottom: 1rem; }
        p  { color: #00cc33; font-size: 0.95rem; line-height: 1.6; }
        .blink { animation: blink 1s steps(1) infinite; }
        @keyframes blink { 50% { opacity: 0; } }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>&#9608; ACCESS DENIED &#9608;</h1>
        <p>This chatroom can only be accessed through the official launcher.</p>
        <p style="margin-top:1rem" class="blink">_ awaiting launcher connection...</p>
      </div>
    </body>
    </html>
  `);
});

// ── Serve the chatroom static files ──
app.use(express.static(path.join(__dirname, "public")));

// ── Socket.IO: validate token on handshake ──
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token === LAUNCHER_TOKEN) return next();
  next(new Error("Unauthorized – launcher required"));
});

// ── Chat logic ──
const users = new Map(); // socket.id → username

io.on("connection", (socket) => {
  console.log(`[+] socket connected: ${socket.id}`);

  socket.on("set-username", (username, callback) => {
    const name = (username || "anon").trim().substring(0, 20);
    users.set(socket.id, name);
    io.emit("system-message", `${name} joined the chat`);
    io.emit("user-count", users.size);
    callback({ ok: true, name });
    console.log(`[+] ${name} joined`);
  });

  socket.on("chat-message", (msg) => {
    const name = users.get(socket.id) || "anon";
    const text = (msg || "").trim().substring(0, 500);
    if (!text) return;
    io.emit("chat-message", { name, text, time: Date.now() });
  });

  socket.on("disconnect", () => {
    const name = users.get(socket.id);
    if (name) {
      io.emit("system-message", `${name} left the chat`);
      users.delete(socket.id);
      io.emit("user-count", users.size);
      console.log(`[-] ${name} left`);
    }
  });
});

// ── Start ──
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n  ██ Chatroom server running on http://localhost:${PORT}\n`);
});
