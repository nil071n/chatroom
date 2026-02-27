const { app, BrowserWindow, session } = require("electron");

// ── Config ──────────────────────────────────────────────
// Change SERVER_URL to your domain when you deploy, e.g.:
//   const SERVER_URL = "https://yourdomain.com";
const SERVER_URL = "http://localhost:3000";
const LAUNCHER_TOKEN = "cHaT-lAuNcH3r-S3CR3T-2026";
// ────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 620,
    title: "Chatroom Launcher",
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // ── Inject the secret header into every outgoing request ──
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["*://*/*"] },
    (details, callback) => {
      details.requestHeaders["X-Launcher-Token"] = LAUNCHER_TOKEN;
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  win.loadURL(SERVER_URL);

  // Open DevTools in development (remove for production)
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
