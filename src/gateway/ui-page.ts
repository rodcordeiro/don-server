export function renderUiPage(): string {
	return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Don Server</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #111827; color: #f9fafb; }
    header, main { max-width: 1180px; margin: 0 auto; padding: 16px; }
    header { border-bottom: 1px solid #374151; }
    input, button, textarea { border-radius: 8px; border: 1px solid #4b5563; padding: 8px; background: #1f2937; color: #f9fafb; }
    button { cursor: pointer; background: #2563eb; border-color: #2563eb; }
    textarea { min-height: 72px; width: 100%; resize: vertical; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .panel { background: #172033; border: 1px solid #374151; border-radius: 12px; padding: 16px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
    .events { max-height: 520px; overflow: auto; display: grid; gap: 8px; }
    .event { border: 1px solid #374151; border-radius: 10px; padding: 10px; background: #111827; }
    .error { border-color: #dc2626; background: #2a1216; }
    .muted { color: #9ca3af; font-size: 12px; }
    pre { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <header>
    <h1>Don Server</h1>
    <div class="row">
      <input id="token" placeholder="DON_SERVER_TOKEN" type="password" />
      <input id="conversationId" placeholder="conversationId (opcional)" />
      <input id="projectId" placeholder="projectId (opcional)" />
      <button id="connect">Conectar WS</button>
      <button id="loadConversations">Listar conversas</button>
    </div>
  </header>
  <main class="grid">
    <section class="panel">
      <h2>Chat</h2>
      <textarea id="content" placeholder="@planner levante o backlog"></textarea>
      <div class="row">
        <button id="send">Enviar</button>
        <button id="loadTimeline">Carregar timeline</button>
      </div>
      <div id="status" class="muted">Desconectado.</div>
      <h3>Conversas</h3>
      <div id="conversations" class="events"></div>
    </section>
    <section class="panel">
      <h2>Timeline</h2>
      <div id="timeline" class="events"></div>
    </section>
  </main>
  <script>
    let socket;
    const byId = id => document.getElementById(id);
    const token = () => byId('token').value.trim();
    const conversationId = () => byId('conversationId').value.trim();
    const projectId = () => byId('projectId').value.trim();
    const headers = () => ({ authorization: 'Bearer ' + token(), 'content-type': 'application/json' });

    function setStatus(message) { byId('status').textContent = message; }
    function renderEvent(event) {
      const div = document.createElement('div');
      const isError = ['agent.error', 'tool.error', 'security.failure'].includes(event.type);
      div.className = 'event' + (isError ? ' error' : '');
      div.innerHTML = '<strong>' + event.type + '</strong> <span class="muted">' + (event.source || '') + ' -> ' + (event.target || 'none') + '</span><pre>' + escapeHtml(JSON.stringify(event.payload, null, 2)) + '</pre><div class="muted">task: ' + event.taskId + '</div>';
      div.onclick = () => { byId('conversationId').value = event.conversationId; loadTimeline(); };
      return div;
    }
    function escapeHtml(value) {
      return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    }
    function addEvent(event) {
      byId('timeline').prepend(renderEvent(event));
    }
    async function api(path, options = {}) {
      const response = await fetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
      if (!response.ok) throw new Error(await response.text());
      return await response.json();
    }
    async function loadTimeline() {
      const conv = conversationId();
      const path = conv ? '/conversations/' + encodeURIComponent(conv) + '/events' : '/events/export';
      const data = await api(path);
      byId('timeline').replaceChildren(...data.events.map(renderEvent).reverse());
    }
    async function loadConversations() {
      const data = await api('/events/export');
      const ids = [...new Set(data.events.map(event => event.conversationId))];
      byId('conversations').replaceChildren(...ids.map(id => {
        const button = document.createElement('button');
        button.textContent = id;
        button.onclick = () => { byId('conversationId').value = id; loadTimeline(); };
        return button;
      }));
    }
    byId('connect').onclick = () => {
      socket?.close();
      socket = new WebSocket(location.origin.replace(/^http/, 'ws') + '?token=' + encodeURIComponent(token()));
      socket.onopen = () => setStatus('WebSocket conectado.');
      socket.onclose = () => setStatus('WebSocket desconectado.');
      socket.onerror = () => setStatus('Erro no WebSocket.');
      socket.onmessage = event => {
        const parsed = JSON.parse(event.data);
        if (parsed.eventId) addEvent(parsed);
      };
    };
    byId('send').onclick = async () => {
      const body = { content: byId('content').value, ...(conversationId() ? { conversationId: conversationId() } : {}), ...(projectId() ? { projectId: projectId() } : {}) };
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(body));
      } else {
        await api('/commands', { method: 'POST', body: JSON.stringify(body) });
      }
      setStatus('Comando enviado.');
    };
    byId('loadTimeline').onclick = () => loadTimeline().catch(error => setStatus(error.message));
    byId('loadConversations').onclick = () => loadConversations().catch(error => setStatus(error.message));
  </script>
</body>
</html>`;
}
