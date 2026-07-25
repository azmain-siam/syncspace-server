# SyncSpace API — Realtime Module (Phase 12) Testing Guide

This guide provides step-by-step instructions for testing the **Socket.IO Realtime Module** in SyncSpace API, including JWT authentication, online presence tracking, room subscriptions (`workspace`, `board`, `task`), and live event broadcasting.

---

## Prerequisites

1. **Running Backend Server**:
   Ensure SyncSpace API is running locally:
   ```bash
   pnpm start:dev
   ```
   *Default URL*: `http://localhost:5000` (or `http://localhost:5005` depending on your `.env` `PORT`).

2. **Running Redis**:
   Ensure Redis is running (via Docker or local Redis):
   ```bash
   docker-compose up -d redis
   ```

---

## Testing Options

You can test the Realtime Module using any of the following methods:

- **Option A**: Interactive HTML Web Client (Included below)
- **Option B**: Postman / Insomnia WebSocket Client
- **Option C**: Node.js Script (`socket.io-client`)

---

## Option A: Interactive HTML Testing Page

Create a file named `test-realtime.html` on your machine and open it directly in your browser.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SyncSpace Realtime Module Tester</title>
  <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    input, button, select { padding: 10px; margin: 5px 0; border-radius: 6px; border: 1px solid #475569; background: #334155; color: white; width: 100%; box-sizing: border-box; }
    button { background: #2563eb; font-weight: bold; cursor: pointer; border: none; }
    button:hover { background: #1d4ed8; }
    #log { background: #020617; padding: 15px; border-radius: 6px; height: 300px; overflow-y: auto; font-family: monospace; font-size: 13px; color: #38bdf8; }
  </style>
</head>
<body>

  <h1>⚡ SyncSpace Realtime Tester</h1>

  <div class="card">
    <h3>1. Connect to WebSocket</h3>
    <input type="text" id="serverUrl" value="http://localhost:5000" placeholder="Server Base URL">
    <input type="text" id="token" placeholder="Paste JWT Access Token here">
    <button onclick="connectSocket()">Connect to /realtime</button>
    <button onclick="disconnectSocket()" style="background:#dc2626; margin-top:5px;">Disconnect</button>
  </div>

  <div class="card">
    <h3>2. Join / Leave Room</h3>
    <select id="roomType">
      <option value="workspace">Workspace</option>
      <option value="board">Board</option>
      <option value="task">Task</option>
    </select>
    <input type="text" id="targetId" placeholder="Target UUID (Workspace ID, Board ID, or Task ID)">
    <button onclick="joinRoom()">Join Room</button>
    <button onclick="leaveRoom()" style="background:#d97706; margin-top:5px;">Leave Room</button>
  </div>

  <div class="card">
    <h3>3. Workspace Presence Check</h3>
    <input type="text" id="presenceWorkspaceId" placeholder="Workspace ID">
    <button onclick="getOnlineUsers()" style="background:#059669;">Get Workspace Online Users</button>
  </div>

  <div class="card">
    <h3>Live Event Stream</h3>
    <div id="log">Logs will appear here...</div>
  </div>

  <script>
    let socket = null;

    function log(msg, obj = null) {
      const logDiv = document.getElementById('log');
      const time = new Date().toLocaleTimeString();
      let text = `[${time}] ${msg}`;
      if (obj) text += '\n' + JSON.stringify(obj, null, 2);
      logDiv.innerText += '\n' + text;
      logDiv.scrollTop = logDiv.scrollHeight;
    }

    function connectSocket() {
      const serverUrl = document.getElementById('serverUrl').value.trim();
      const token = document.getElementById('token').value.trim();

      if (!token) { alert('Please enter a valid JWT token'); return; }

      log('Connecting to ' + serverUrl + '/realtime...');

      socket = io(`${serverUrl}/realtime`, {
        auth: { token: `Bearer ${token}` }
      });

      socket.on('connect', () => log('✅ Connected! Socket ID: ' + socket.id));
      socket.on('disconnect', (reason) => log('❌ Disconnected: ' + reason));
      socket.on('connect_error', (err) => log('⚠️ Connection Error: ' + err.message));

      // Presence Events
      socket.on('user:online', (data) => log('🟢 User Online:', data));
      socket.on('user:offline', (data) => log('🔴 User Offline:', data));
      socket.on('presence:online_users', (data) => log('👥 Online Workspace Users:', data));

      // Room Events
      socket.on('room:joined', (data) => log('🚪 Joined Room:', data));
      socket.on('room:left', (data) => log('🚪 Left Room:', data));

      // Domain Realtime Updates
      socket.on('task:created', (data) => log('📌 Realtime Task Created:', data));
      socket.on('task:moved', (data) => log('🚀 Realtime Task Moved:', data));
      socket.on('task:updated', (data) => log('✏️ Realtime Task Updated:', data));
      socket.on('task:deleted', (data) => log('🗑️ Realtime Task Deleted:', data));
      socket.on('comment:created', (data) => log('💬 Realtime Comment Created:', data));
      socket.on('comment:updated', (data) => log('💬 Realtime Comment Updated:', data));
      socket.on('comment:deleted', (data) => log('💬 Realtime Comment Deleted:', data));
      socket.on('notification:created', (data) => log('🔔 Realtime Notification Received:', data));
    }

    function disconnectSocket() {
      if (socket) { socket.disconnect(); log('Disconnected by user.'); }
    }

    function joinRoom() {
      const roomType = document.getElementById('roomType').value;
      const targetId = document.getElementById('targetId').value.trim();
      if (!targetId) { alert('Please enter a target ID'); return; }
      socket.emit('room:join', { roomType, targetId }, (res) => log('Response:', res));
    }

    function leaveRoom() {
      const roomType = document.getElementById('roomType').value;
      const targetId = document.getElementById('targetId').value.trim();
      socket.emit('room:leave', { roomType, targetId }, (res) => log('Response:', res));
    }

    function getOnlineUsers() {
      const workspaceId = document.getElementById('presenceWorkspaceId').value.trim();
      if (!workspaceId) { alert('Please enter a workspace ID'); return; }
      socket.emit('presence:get_online', { workspaceId }, (res) => log('Response:', res));
    }
  </script>
</body>
</html>
```

---

## Step-by-Step Test Procedure

### Step 1: Login & Get Access Token
Use cURL, Postman, or Swagger (`http://localhost:5000/api/v1/docs`) to log in:

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email@example.com","password":"your_password"}'
```

Copy the returned `accessToken`.

---

### Step 2: Test WebSocket Connection & Handshake
1. Open `test-realtime.html` in your browser.
2. Paste the `accessToken`.
3. Click **Connect to /realtime**.
4. Observe the log output:
   - `✅ Connected! Socket ID: <socket-id>`
   - `🟢 User Online: { userId: "..." }`

---

### Step 3: Test Room Subscriptions
1. Copy a **Workspace ID**, **Board ID**, or **Task ID** from your database/Swagger.
2. Select room type (e.g. `workspace`) and paste the ID.
3. Click **Join Room**.
4. You will receive a `room:joined` event:
   ```json
   {
     "room": "workspace:1234-abcd-...",
     "roomType": "workspace",
     "targetId": "1234-abcd-..."
   }
   ```

---

### Step 4: Test Real-Time Event Broadcasting
Keep your WebSocket client connected and open to room `board:<board-id>` or `workspace:<workspace-id>`.

Now execute REST API calls in Swagger or cURL:

1. **Move a Task**:
   Call `POST /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/move`
   - Your WebSocket will instantly log:
     ```json
     📌 Realtime Task Moved: {
       "taskId": "...",
       "sourceColumnId": "...",
       "destinationColumnId": "...",
       "newOrder": 1
     }
     ```

2. **Add a Task Comment**:
   Call `POST /api/v1/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns/:columnId/tasks/:taskId/comments`
   - Your WebSocket will instantly log:
     ```json
     💬 Realtime Comment Created: {
       "comment": { "id": "...", "content": "Hello Realtime!" }
     }
     ```

---

### Step 5: Test Presence & Multi-User Tracking
1. Open a second browser window (or Incognito mode).
2. Connect using a different user's JWT token.
3. Observe `user:online` events firing in both windows in real time!
