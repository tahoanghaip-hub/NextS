import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import qrcode from 'qrcode';

import { defaultPresentationData } from './mockData.js';
import { keyController } from './keyController.js';
import { getAvailableIPv4Addresses } from './networkUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// In-memory presentation state and active key mapping
let presentationData = structuredClone(defaultPresentationData);
let currentKeyMapping = 'ARROWS';

// Create HTTP Server & WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/**
 * Broadcast message to all connected and open WebSocket clients
 */
function broadcast(message) {
  const json = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

/**
 * Broadcast current state sync snapshot
 */
function broadcastStateSync() {
  broadcast({
    type: 'STATE_SYNC',
    payload: presentationData,
    connectionMode: 'WIFI',
    keyMapping: currentKeyMapping
  });
}

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

/**
 * GET /api/network-info
 * Returns available IPv4 adapters, currently selected IP, connection URL, and QR code data URL.
 */
app.get('/api/network-info', async (req, res) => {
  try {
    const interfaces = getAvailableIPv4Addresses();
    const clientPort = req.query.clientPort || '5173';
    const requestedIp = req.query.ip;

    let selected = interfaces[0];
    if (requestedIp) {
      const match = interfaces.find((item) => item.address === requestedIp);
      if (match) selected = match;
    }

    // Determine connection URL (Points to client Vite dev server on port 5173 or static host on 3000)
    const distPath = path.join(__dirname, '../mobile-client/dist');
    const isServingStatic = fs.existsSync(distPath);
    const targetPort = isServingStatic ? PORT : clientPort;
    const connectUrl = `http://${selected.address}:${targetPort}`;

    // Generate crisp QR code
    const qrDataUrl = await qrcode.toDataURL(connectUrl, {
      margin: 1,
      width: 280,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      interfaces,
      selectedIp: selected.address,
      selectedInterface: selected,
      connectUrl,
      qrDataUrl,
      serverPort: PORT,
      isServingStatic
    });
  } catch (err) {
    console.error('[Server] Error generating network info:', err);
    res.status(500).json({ error: 'Failed to generate network info' });
  }
});

/**
 * GET /api/state
 * Returns current presentation state and active settings
 */
app.get('/api/state', (req, res) => {
  res.json({
    presentationData,
    keyMapping: currentKeyMapping,
    connectedClients: wss.clients.size
  });
});

/**
 * GET or POST /api/fetch-google-doc
 * Fetches exported plain text from a public Google Doc URL or docId without OAuth2
 */
app.all('/api/fetch-google-doc', async (req, res) => {
  try {
    const docUrl = req.query.url || req.body?.url;
    const docId = req.query.docId || req.body?.docId;
    let targetId = docId;

    if (!targetId && docUrl) {
      const match = docUrl.match(/[-\w]{25,}/);
      if (match) targetId = match[0];
    }

    if (!targetId) {
      return res.status(400).json({ error: 'Không tìm thấy Document ID hợp lệ trong liên kết Google Docs.' });
    }

    const exportUrl = `https://docs.google.com/document/d/${targetId}/export?format=txt`;
    const response = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NextS/1.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Không thể tải Google Doc (Mã lỗi ${response.status}). Vui lòng đảm bảo tài liệu được bật chia sẻ công khai ("Bất kỳ ai có đường liên kết đều có thể xem").`
      });
    }

    const rawText = await response.text();
    res.json({ success: true, docId: targetId, rawText });
  } catch (err) {
    console.error('[Server] Error fetching Google Doc:', err);
    res.status(500).json({ error: 'Lỗi khi tải Google Doc: ' + err.message });
  }
});

/**
 * POST /api/parse-files
 * File intake endpoint prepared for Milestone 4 binary parsing
 */
app.post('/api/parse-files', (req, res) => {
  res.json({ success: true, message: 'Đã nhận file. Trình bóc tách nhị phân chuyên sâu được tối ưu cho Milestone 4.' });
});

/**
 * POST /api/test-key
 * Direct endpoint to test a keypress
 */
app.post('/api/test-key', (req, res) => {
  const { action } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  const result = keyController.sendSingleKey(action, currentKeyMapping);
  res.json(result);
});

// -------------------------------------------------------------
// WebSocket Protocol (/ws)
// -------------------------------------------------------------

wss.on('connection', (ws, req) => {
  const remoteIp = req.socket.remoteAddress;
  console.log(`[WebSocket] Client connected from ${remoteIp}. Total active clients: ${wss.clients.size}`);

  // Send initial state snapshot on connection
  ws.send(JSON.stringify({
    type: 'STATE_SYNC',
    payload: presentationData,
    connectionMode: 'WIFI',
    keyMapping: currentKeyMapping
  }));

  ws.on('message', async (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage.toString());
      console.log(`[WebSocket Message] Type: ${msg.type}`, msg);

      switch (msg.type) {
        case 'GOTO_SLIDE': {
          const target = Number(msg.targetSlide);
          if (isNaN(target)) break;

          const clampedTarget = Math.max(1, Math.min(presentationData.totalSlides, target));
          const shouldJump = presentationData.isSyncLocked || msg.force === true;

          if (shouldJump) {
            const jumpResult = await keyController.jumpToSlide(
              presentationData.currentSlide,
              clampedTarget,
              currentKeyMapping
            );

            presentationData.currentSlide = clampedTarget;
            presentationData.updatedAt = Date.now();

            broadcastStateSync();
            broadcast({
              type: 'KEY_EXEC_RESULT',
              success: true,
              action: 'GOTO_SLIDE',
              currentSlide: presentationData.currentSlide,
              stepsSent: jumpResult.stepsSent,
              timestamp: Date.now()
            });
          } else {
            // Free preview mode without emulating hardware keys
            presentationData.currentSlide = clampedTarget;
            presentationData.updatedAt = Date.now();
            broadcastStateSync();
          }
          break;
        }

        case 'STEP_SLIDE': {
          const direction = msg.direction; // 'NEXT' | 'PREV' | 'BLACKOUT'
          const keyResult = keyController.sendSingleKey(direction, currentKeyMapping);

          if (direction === 'NEXT' && presentationData.currentSlide < presentationData.totalSlides) {
            presentationData.currentSlide += 1;
            presentationData.updatedAt = Date.now();
          } else if (direction === 'PREV' && presentationData.currentSlide > 1) {
            presentationData.currentSlide -= 1;
            presentationData.updatedAt = Date.now();
          }

          broadcastStateSync();
          broadcast({
            type: 'KEY_EXEC_RESULT',
            success: keyResult.success,
            action: direction,
            currentSlide: presentationData.currentSlide,
            timestamp: Date.now()
          });
          break;
        }

        case 'ADJUST_DESYNC': {
          const offset = Number(msg.offset);
          const direction = offset > 0 ? 'NEXT' : 'PREV';
          const keyResult = keyController.sendSingleKey(direction, currentKeyMapping);

          console.log(`[Anti-Desync] Nudged projector by ${offset > 0 ? '+1' : '-1'} (${direction}). Slide pointer unchanged: ${presentationData.currentSlide}`);

          broadcast({
            type: 'KEY_EXEC_RESULT',
            success: keyResult.success,
            action: 'ADJUST_DESYNC',
            offset,
            currentSlide: presentationData.currentSlide,
            timestamp: Date.now()
          });
          break;
        }

        case 'TOGGLE_SYNC_LOCK': {
          presentationData.isSyncLocked = Boolean(msg.isSyncLocked);
          presentationData.updatedAt = Date.now();
          broadcastStateSync();
          break;
        }

        case 'UPDATE_SCRIPT': {
          if (msg.payload && Array.isArray(msg.payload.slides)) {
            presentationData = {
              ...msg.payload,
              currentSlide: Math.max(1, Math.min(msg.payload.totalSlides || msg.payload.slides.length, msg.payload.currentSlide || 1)),
              totalSlides: msg.payload.slides.length,
              updatedAt: Date.now()
            };
            broadcastStateSync();
          }
          break;
        }

        case 'UPDATE_KEYMAP': {
          if (['ARROWS', 'PAGEDOWN', 'SPACE'].includes(msg.keyMapping)) {
            currentKeyMapping = msg.keyMapping;
            broadcastStateSync();
          }
          break;
        }

        case 'START_PRESENTATION': {
          presentationData.isSyncLocked = true;
          presentationData.updatedAt = Date.now();

          if (msg.autoMinimize) {
            keyController.restorePresentationFocus();
          }

          broadcastStateSync();
          break;
        }

        default:
          console.warn(`[WebSocket] Unrecognized message type: ${msg.type}`);
      }
    } catch (err) {
      console.error('[WebSocket] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected. Remaining active clients: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Error on socket:', err.message);
  });
});

// -------------------------------------------------------------
// Static File Hosting (When client is built in production)
// -------------------------------------------------------------
const clientDistPath = path.join(__dirname, '../mobile-client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Server] Serving production static files from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Start Server listening on 0.0.0.0:3000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  NextS Desktop Host Server running at http://0.0.0.0:${PORT}`);
  console.log(`  WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
  console.log(`=======================================================`);
});

// Process cleanup
process.on('SIGINT', () => {
  keyController.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  keyController.destroy();
  process.exit(0);
});
