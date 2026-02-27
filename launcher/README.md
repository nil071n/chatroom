Launcher guidance

Auth flow (recommended):
1) Launcher obtains the local PC name (hostname) and prepares a signature over it using its private key (if using asymmetric signing), then POSTs to https://n14.se/auth with JSON: { "pcName": "Alice-PC", "signature": "<base64>" }.
2) Server verifies the signature against allowedClients.json (publicKey) and returns a short-lived token.
3) Launcher connects to the WebSocket endpoint: wss://n14.se/?token=<token> and sends/receives chat messages.

Weak mode (not recommended): if allowedClients.json contains a null publicKey for a pcName, the server will accept the pcName alone (this is spoofable).

Distribution: provision each launcher with a unique private key or use a secure provisioning step to install a client cert/public-key pair and register the public key on the server.

Security: never commit private keys to repositories. Use a secure channel to deliver per-user keys/certs.
