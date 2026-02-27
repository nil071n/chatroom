(function(){
  function qs(name){ const u=new URL(window.location.href); return u.searchParams.get(name); }
  const token = qs('token') || prompt('Enter token from launcher:');
  if (!token) { document.getElementById('status').textContent = 'No token provided'; return; }
  const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
  const sock = new WebSocket(wsProto + '://' + location.host + '/?token=' + encodeURIComponent(token));
  const messages = document.getElementById('messages');
  const status = document.getElementById('status');
  const input = document.getElementById('input');
  const send = document.getElementById('send');
  function add(msg){ const d=document.createElement('div'); d.textContent = msg; messages.appendChild(d); messages.scrollTop = messages.scrollHeight; }
  sock.addEventListener('open', ()=> status.textContent='Connected');
  sock.addEventListener('message', e=> {
    try{ const m=JSON.parse(e.data); add(`[${new Date(m.ts).toLocaleTimeString()}] ${m.from||'system'}: ${m.text||m.system}`); }catch{ add(e.data); }
  });
  sock.addEventListener('close', ()=> status.textContent='Disconnected');
  sock.addEventListener('error', (err)=> { status.textContent = 'Socket error'; console.error(err); });
  send.addEventListener('click', ()=>{ if(input.value.trim()){ sock.send(input.value); input.value=''; } });
  input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ send.click(); } });
})();