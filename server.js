const http = require('http');
const path = require('path');
const send = require('send');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  const requestedFilePath = req.url === '/' ? path.join(__dirname, 'index.html') : path.join(__dirname, req.url);

  send(req, requestedFilePath)
    .on('error', (err) => {
      console.error(err);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    })
    .pipe(res);
});

const wss = new WebSocket.Server({ server });

// Maintain a map to store connected clients and their nicknames
const connectedClients = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'setNickname') {
      // Set the nickname for the client
      connectedClients.set(ws, data.nickname);

      // Broadcast a system message about the new nickname
      broadcastSystemMessage(`${data.nickname} has joined the chat.`);
    } else if (data.type === 'chatMessage') {
      // Broadcast the chat message with the sender's nickname
      broadcastChatMessage(ws, data.message);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    const nickname = connectedClients.get(ws);
    connectedClients.delete(ws);

    // Broadcast a system message about the disconnected user
    broadcastSystemMessage(`${nickname} has left the chat.`);
  });
});

function broadcastChatMessage(sender, message) {
  const senderNickname = connectedClients.get(sender);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'chatMessage', sender: senderNickname, message }));
    }
  });
}

function broadcastSystemMessage(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'systemMessage', message }));
    }
  });
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running at http://192.168.1.64:${PORT}/`);
});
