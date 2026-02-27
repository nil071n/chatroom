(() => {
  // ── Launcher token (injected into Socket.IO auth) ──
  const LAUNCHER_TOKEN = "cHaT-lAuNcH3r-S3CR3T-2026";

  // ── DOM refs ──
  const loginScreen  = document.getElementById("login-screen");
  const chatScreen   = document.getElementById("chat-screen");
  const usernameIn   = document.getElementById("username-input");
  const joinBtn      = document.getElementById("join-btn");
  const loginStatus  = document.getElementById("login-status");
  const messagesDiv  = document.getElementById("messages");
  const messageIn    = document.getElementById("message-input");
  const sendBtn      = document.getElementById("send-btn");
  const userCountEl  = document.getElementById("user-count");
  const chatPrompt   = document.getElementById("chat-prompt");

  let myName = "guest";

  // ── Connect with auth token ──
  const socket = io({ auth: { token: LAUNCHER_TOKEN } });

  socket.on("connect_error", (err) => {
    loginStatus.textContent = `[ERROR] ${err.message}`;
    loginStatus.style.color = "#ff3c3c";
  });

  // ── Join ──
  function join() {
    const name = usernameIn.value.trim() || "guest";
    joinBtn.disabled = true;
    loginStatus.textContent = "connecting...";
    loginStatus.style.color = "#f5c842";

    socket.emit("set-username", name, (res) => {
      if (res.ok) {
        myName = res.name;
        chatPrompt.textContent = `${myName} $`;
        loginScreen.classList.add("hidden");
        chatScreen.classList.remove("hidden");
        addWelcome();
        messageIn.focus();
      } else {
        loginStatus.textContent = "[ERROR] could not join";
        joinBtn.disabled = false;
      }
    });
  }

  joinBtn.addEventListener("click", join);
  usernameIn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") join();
  });

  // ── Send message ──
  function sendMessage() {
    const text = messageIn.value.trim();
    if (!text) return;
    socket.emit("chat-message", text);
    messageIn.value = "";
  }

  sendBtn.addEventListener("click", sendMessage);
  messageIn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // ── Incoming events ──
  socket.on("chat-message", ({ name, text, time }) => {
    addMessage(name, text, time);
  });

  socket.on("system-message", (text) => {
    addSystem(text);
  });

  socket.on("user-count", (count) => {
    userCountEl.textContent = `${count} online`;
  });

  // ── Rendering helpers ──
  function addWelcome() {
    const el = document.createElement("div");
    el.className = "welcome";
    el.textContent =
`╔══════════════════════════════════════╗
║  Welcome to the chatroom, ${myName.padEnd(10)}║
║  Type a message below to chat.      ║
╚══════════════════════════════════════╝`;
    messagesDiv.appendChild(el);
    scrollToBottom();
  }

  function addMessage(name, text, time) {
    const el = document.createElement("div");
    el.className = "msg";

    const ts = new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    el.innerHTML =
      `<span class="timestamp">[${ts}]</span>` +
      `<span class="username">${esc(name)}&gt;</span> ` +
      `<span class="text">${esc(text)}</span>`;

    messagesDiv.appendChild(el);
    scrollToBottom();
  }

  function addSystem(text) {
    const el = document.createElement("div");
    el.className = "msg system";
    el.innerHTML = `<span class="prefix">»</span> ${esc(text)}`;
    messagesDiv.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }
})();
