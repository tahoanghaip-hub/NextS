import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import qrcode from 'qrcode';

import { defaultPresentationData } from './mockData.js';
import { keyController } from './keyController.js';
import { getAvailableIPv4Addresses } from './networkUtils.js';
import {
  extractShortTitle,
  parseScriptBufferOrText,
  parsePptxBuffer,
  mergeScriptAndSlideDeck
} from './parsers/docSlideParser.js';
import { bleHostManager as bleManager } from './bleServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

// Enable CORS and configure high-capacity JSON parsing for WebP client thumbnails
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Configure multer memory storage with 50MB file size limit for .pdf, .pptx, and .docx
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// In-memory presentation state and active key mapping
let presentationData = structuredClone(defaultPresentationData);
let currentKeyMapping = 'ARROWS';
keyController.setCurrentSlide(presentationData.currentSlide);

// Create HTTP Server & WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/**
 * 5. Bandwidth-Aware Sync Helper: getPayloadForTransport
 * Strips thumbnails and caps titles at 3-5 words for BLE transport
 */
export function getPayloadForTransport(data, transportMode = 'WIFI') {
  if (!data) return null;

  if (transportMode === 'BLE') {
    return {
      ...data,
      slides: (data.slides || []).map((slide, idx) => ({
        slideNumber: slide.slideNumber || (idx + 1),
        title: extractShortTitle(slide.title, slide.slideNumber || (idx + 1)),
        scriptContent: slide.scriptContent || '',
        qaContent: slide.qaContent || '',
        thumbnailBase64: null
      }))
    };
  }

  return data;
}

/**
 * Computes presentation statistics
 */
function computePresentationStats(data) {
  const slides = data?.slides || [];
  const totalSlides = slides.length;
  const slidesWithQA = slides.filter((s) => s.qaContent && s.qaContent.trim().length > 0).length;
  const slidesWithThumbnails = slides.filter((s) => Boolean(s.thumbnailBase64)).length;
  const hasGeneralQA = Boolean(data?.generalQA && data.generalQA.trim().length > 0);

  const totalWords = slides.reduce((acc, s) => {
    const words = (s.scriptContent || '').trim().split(/\s+/).filter(Boolean);
    return acc + words.length;
  }, 0);
  const estimatedMinutes = Math.max(1, Math.ceil(totalWords / 130));

  return {
    totalSlides,
    slidesWithQA,
    slidesWithThumbnails,
    hasGeneralQA,
    estimatedMinutes,
    totalWords
  };
}

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
 * Dual-Transport Broadcast:
 * 1. Sends full payload with WebP thumbnails to Wi-Fi WebSocket clients
 * 2. Sends thumbnail-free, MTU-chunked lightweight payload to Bluetooth BLE clients
 */
function broadcastStateSync() {
  broadcast({
    type: 'STATE_SYNC',
    payload: getPayloadForTransport(presentationData, 'WIFI'),
    connectionMode: 'WIFI',
    keyMapping: currentKeyMapping
  });

  bleManager.broadcastBleState(
    getPayloadForTransport(presentationData, 'BLE'),
    currentKeyMapping
  );
}

/**
 * Unified Command Handler
 * Executes identically whether command originates from Wi-Fi WebSocket or Bluetooth BLE GATT
 */
async function handleUnifiedCommand(msg, source = 'WIFI') {
  if (!msg || !msg.type) return;
  console.log(`[Unified Command] Source: ${source}, Type: ${msg.type}`);

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
        keyController.setCurrentSlide(clampedTarget);
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
        keyController.setCurrentSlide(presentationData.currentSlide);
      } else if (direction === 'PREV' && presentationData.currentSlide > 1) {
        presentationData.currentSlide -= 1;
        presentationData.updatedAt = Date.now();
        keyController.setCurrentSlide(presentationData.currentSlide);
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
        keyController.setCurrentSlide(presentationData.currentSlide);
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
        if (typeof global.onElectronWindowAction === 'function') {
          global.onElectronWindowAction('MINIMIZE');
        }
      }

      broadcastStateSync();
      break;
    }

    case 'MINI_PILL':
    case 'SET_VIEW_MODE': {
      if (msg.viewMode === 'MINI_PILL' || msg.type === 'MINI_PILL') {
        if (typeof global.onElectronWindowAction === 'function') {
          global.onElectronWindowAction('MINI_PILL');
        }
      } else if (msg.viewMode === 'DESKTOP') {
        if (typeof global.onElectronWindowAction === 'function') {
          global.onElectronWindowAction('RESTORE');
        }
      }
      break;
    }

    case 'RESTORE_WINDOW': {
      if (typeof global.onElectronWindowAction === 'function') {
        global.onElectronWindowAction('RESTORE');
      }
      break;
    }

    case 'GET_STATE': {
      const mode = msg.connectionMode === 'BLE' ? 'BLE' : 'WIFI';
      if (source.startsWith('WIFI')) {
        broadcastStateSync();
      } else {
        bleManager.broadcastBleState(getPayloadForTransport(presentationData, 'BLE'), currentKeyMapping);
      }
      break;
    }

    default:
      console.warn(`[Unified Command] Unrecognized message type: ${msg.type}`);
  }
}

// -------------------------------------------------------------
// BLE Manager Event Wiring
// -------------------------------------------------------------
bleManager.on('message', async (msg, deviceId) => {
  await handleUnifiedCommand(msg, `BLE (${deviceId})`);
});

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

/**
 * GET /api/network-info
 * Returns available IPv4 adapters, currently selected IP, connection URL, QR code, and BLE status.
 */
app.get('/api/network-info', async (req, res) => {
  try {
    const interfaces = getAvailableIPv4Addresses();
    const requestedIp = req.query.ip;

    let selected = interfaces[0];
    if (requestedIp) {
      const match = interfaces.find((item) => item.address === requestedIp);
      if (match) selected = match;
    }

    // Determine connection URL (Points to Vite dev server port 5173 or static production host on 3000)
    const clientDistPath = path.join(__dirname, '../mobile-client/dist');
    const clientIndexPath = path.join(clientDistPath, 'index.html');
    const isServingStatic = fs.existsSync(clientIndexPath);

    let targetPort = '5173';
    if (req.query.clientPort) {
      targetPort = req.query.clientPort;
    } else if (isServingStatic) {
      targetPort = PORT;
    }

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
      isServingStatic,
      bleStatus: bleManager.getStatus()
    });
  } catch (err) {
    console.error('[Server] Error generating network info:', err);
    res.status(500).json({ error: 'Failed to generate network info' });
  }
});

/**
 * GET /api/state
 * Returns current presentation state, active settings, and BLE status
 */
app.get('/api/state', (req, res) => {
  const transport = req.query.transport === 'BLE' ? 'BLE' : 'WIFI';
  res.json({
    presentationData: getPayloadForTransport(presentationData, transport),
    keyMapping: currentKeyMapping,
    connectedClients: wss.clients.size,
    bleStatus: bleManager.getStatus()
  });
});

/**
 * GET /api/ble/status
 * Returns live status of Windows WinRT BLE GATT Advertisement server
 */
app.get('/api/ble/status', (req, res) => {
  res.json(bleManager.getStatus());
});

/**
 * POST /api/ble/toggle
 * Enables or disables Host BLE advertising
 */
app.post('/api/ble/toggle', (req, res) => {
  const enabled = req.body?.enabled !== false;
  const status = enabled ? bleManager.startAdvertising() : bleManager.stopAdvertising();
  res.json(status);
});

/**
 * POST /api/ble/connect
 * Registers a BLE client handshake and returns initial sync chunks
 */
app.post('/api/ble/connect', (req, res) => {
  const { deviceId, deviceName } = req.body || {};
  const device = bleManager.simulateClientConnect(deviceName || 'Android Teleprompter (BLE)');
  if (deviceId) {
    device.id = deviceId;
  }
  const initialSyncChunks = bleManager.broadcastBleState(
    getPayloadForTransport(presentationData, 'BLE'),
    currentKeyMapping
  );

  res.json({
    success: true,
    device,
    status: bleManager.getStatus(),
    initialSyncChunks
  });
});

/**
 * POST /api/ble/frame
 * Receives raw MTU frames (single or chunked) and returns pending notification frames
 */
app.post('/api/ble/frame', (req, res) => {
  const { rawFrame, deviceId } = req.body || {};
  if (!rawFrame) {
    return res.status(400).json({ error: 'rawFrame is required' });
  }

  const targetDeviceId = deviceId || 'ble-web-tunnel-01';
  const result = bleManager.receiveBleRawFrame(rawFrame, targetDeviceId);
  const pendingChunks = bleManager.drainPendingChunks(targetDeviceId);

  res.json({
    ...result,
    pendingChunks
  });
});

/**
 * GET /api/ble/pending
 * Polls queued notification chunks for tunnel clients
 */
app.get('/api/ble/pending', (req, res) => {
  const deviceId = req.query.deviceId || '__global__';
  const pendingChunks = bleManager.drainPendingChunks(deviceId);
  res.json({ pendingChunks });
});

/**
 * POST /api/parse-files
 * Multipart file intake supporting scriptFile (.docx, .txt, .md), slideFile (.pptx, .pdf),
 * mergeMode ('MERGE' | 'REPLACE'), and clientSlidesJson (for client-rendered WebP thumbnails & text).
 */
app.post(
  '/api/parse-files',
  upload.fields([
    { name: 'scriptFile', maxCount: 1 },
    { name: 'slideFile', maxCount: 1 },
    { name: 'file', maxCount: 1 } // Legacy single file fallback
  ]),
  async (req, res) => {
    try {
      const scriptUploaded = req.files?.scriptFile?.[0] || (req.files?.file?.[0] && !req.files.file[0].originalname.match(/\.(pptx|pdf)$/i) ? req.files.file[0] : null);
      const slideUploaded = req.files?.slideFile?.[0] || (req.files?.file?.[0] && req.files.file[0].originalname.match(/\.(pptx|pdf)$/i) ? req.files.file[0] : null);

      const mergeMode = (req.body.mergeMode || 'MERGE').toUpperCase();
      const rawText = req.body.rawText || '';

      // Check clientSlidesJson (from client-side PDF/PPTX WebP generator)
      let clientSlidesData = null;
      if (req.body.clientSlidesJson) {
        try {
          const parsed = typeof req.body.clientSlidesJson === 'string'
            ? JSON.parse(req.body.clientSlidesJson)
            : req.body.clientSlidesJson;
          if (parsed && Array.isArray(parsed.slides)) {
            clientSlidesData = parsed;
          }
        } catch (e) {
          console.warn('[Server] Error parsing clientSlidesJson:', e.message);
        }
      }

      let parsedScript = null;
      let parsedDeck = clientSlidesData;

      // 1. Parse Script File or Raw Text
      if (scriptUploaded) {
        parsedScript = await parseScriptBufferOrText({
          buffer: scriptUploaded.buffer,
          fileName: scriptUploaded.originalname
        });
      } else if (rawText && rawText.trim()) {
        parsedScript = await parseScriptBufferOrText({
          rawText: rawText.trim(),
          fileName: 'Văn bản kịch bản'
        });
      }

      // 2. Parse Slide Deck File (.pptx on server, or if PDF was uploaded without clientSlidesJson)
      if (slideUploaded) {
        const ext = path.extname(slideUploaded.originalname).toLowerCase();
        if (ext === '.pptx') {
          const pptxDeck = await parsePptxBuffer(slideUploaded.buffer, slideUploaded.originalname);
          // If client already rendered WebP thumbnails for pptx, blend them
          if (parsedDeck && Array.isArray(parsedDeck.slides)) {
            pptxDeck.slides = pptxDeck.slides.map((s, idx) => ({
              ...s,
              thumbnailBase64: parsedDeck.slides[idx]?.thumbnailBase64 || s.thumbnailBase64
            }));
          }
          parsedDeck = pptxDeck;
        } else if (ext === '.pdf' && !parsedDeck) {
          console.log(`[Server] Received PDF ${slideUploaded.originalname} (${slideUploaded.size} bytes).`);
        }
      }

      // 3. Smart Merge using Smart Script-to-Slide Alignment Algorithm
      const merged = mergeScriptAndSlideDeck(
        parsedScript,
        parsedDeck,
        presentationData,
        mergeMode
      );

      // 4. Update in-memory state and broadcast
      presentationData = {
        ...merged,
        currentSlide: Math.max(1, Math.min(merged.totalSlides || merged.slides.length, presentationData.currentSlide || 1)),
        totalSlides: merged.slides.length,
        updatedAt: Date.now()
      };

      broadcastStateSync();

      const stats = computePresentationStats(presentationData);
      console.log(`[Server] /api/parse-files completed successfully. Mode: ${mergeMode}, Total Slides: ${presentationData.totalSlides}`);

      res.json({
        success: true,
        mergeMode,
        presentationData,
        stats
      });
    } catch (err) {
      console.error('[Server] Error in /api/parse-files:', err);
      res.status(500).json({ error: 'Lỗi bóc tách tài liệu: ' + err.message });
    }
  }
);

/**
 * Helper to fetch and extract from Google Docs or Google Slides link
 */
async function handleGoogleLinkImport(req, res) {
  try {
    const rawUrl = req.query.url || req.body?.url;
    const directDocId = req.query.docId || req.body?.docId;
    const mergeMode = (req.body?.mergeMode || req.query.mergeMode || 'MERGE').toUpperCase();

    if (!rawUrl && !directDocId) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đường link Google Docs hoặc Google Slides.' });
    }

    const testString = rawUrl || directDocId;

    // Detect Google Slides: docs.google.com/presentation/d/<ID>
    const isSlides = /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i.test(testString);
    const isDocs = /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i.test(testString);

    if (isSlides) {
      // Extract Presentation ID
      const match = testString.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i) ||
        testString.match(/[-\w]{25,}/);
      const presId = match ? (match[1] || match[0]) : null;

      if (!presId) {
        return res.status(400).json({ error: 'Không tìm thấy ID bài trình chiếu Google Slides hợp lệ.' });
      }

      console.log(`[Server] Fetching public Google Slides export for ID: ${presId}`);
      const exportUrl = `https://docs.google.com/presentation/d/${presId}/export/pptx`;
      const response = await fetch(exportUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NextS/1.0'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Không thể tải Google Slides (Mã lỗi ${response.status}). Vui lòng đảm bảo bài thuyết trình đã bật chia sẻ công khai ("Bất kỳ ai có liên kết đều có thể xem").`
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsedDeck = await parsePptxBuffer(buffer, 'Google Slides');

      const merged = mergeScriptAndSlideDeck(
        null,
        parsedDeck,
        presentationData,
        mergeMode
      );

      presentationData = {
        ...merged,
        currentSlide: Math.max(1, Math.min(merged.totalSlides || merged.slides.length, presentationData.currentSlide || 1)),
        totalSlides: merged.slides.length,
        updatedAt: Date.now()
      };

      broadcastStateSync();
      const stats = computePresentationStats(presentationData);

      return res.json({
        success: true,
        type: 'GOOGLE_SLIDES',
        id: presId,
        presentationData,
        stats
      });
    }

    // Default or Google Docs: docs.google.com/document/d/<ID>
    const match = testString.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i) ||
      testString.match(/[-\w]{25,}/);
    const docId = match ? (match[1] || match[0]) : null;

    if (!docId) {
      return res.status(400).json({ error: 'Không tìm thấy Document ID hợp lệ trong liên kết Google Docs.' });
    }

    console.log(`[Server] Fetching public Google Docs export for ID: ${docId}`);
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
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
    const parsedScript = await parseScriptBufferOrText({
      rawText,
      fileName: 'Google Docs Kịch bản'
    });

    const merged = mergeScriptAndSlideDeck(
      parsedScript,
      null,
      presentationData,
      mergeMode
    );

    presentationData = {
      ...merged,
      currentSlide: Math.max(1, Math.min(merged.totalSlides || merged.slides.length, presentationData.currentSlide || 1)),
      totalSlides: merged.slides.length,
      updatedAt: Date.now()
    };

    broadcastStateSync();
    const stats = computePresentationStats(presentationData);

    return res.json({
      success: true,
      type: 'GOOGLE_DOCS',
      id: docId,
      rawText,
      presentationData,
      stats
    });
  } catch (err) {
    console.error('[Server] Error fetching Google Link:', err);
    res.status(500).json({ error: 'Lỗi khi tải Google Link: ' + err.message });
  }
}

/**
 * POST & GET /api/fetch-google-link
 */
app.all('/api/fetch-google-link', handleGoogleLinkImport);
app.all('/api/fetch-google-doc', handleGoogleLinkImport);

/**
 * POST /api/test-key
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

  // Send initial state snapshot on connection (WIFI by default)
  ws.send(JSON.stringify({
    type: 'STATE_SYNC',
    payload: getPayloadForTransport(presentationData, 'WIFI'),
    connectionMode: 'WIFI',
    keyMapping: currentKeyMapping
  }));

  ws.on('message', async (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage.toString());
      await handleUnifiedCommand(msg, 'WIFI');
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
// Static File Hosting & SPA Fallback (Production Single-Port Hosting)
// -------------------------------------------------------------
const clientDistPath = path.join(__dirname, '../mobile-client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');
const isServingStatic = fs.existsSync(clientIndexPath);

if (isServingStatic) {
  console.log(`[Server] Serving production static files from ${clientDistPath}`);
  app.use(express.static(clientDistPath));
}

app.get('*', (req, res) => {
  if (isServingStatic) {
    res.sendFile(clientIndexPath);
  } else {
    res.status(200).json({
      status: 'NEXTS_HOST_RUNNING',
      mode: 'DEV_BACKEND_ONLY',
      serverPort: PORT,
      message: 'NextS Host Server is active on port 3000. In development mode, access the Vite client at http://localhost:5173. For production single-port hosting, run "npm run build:client".',
      endpoints: {
        networkInfo: '/api/network-info',
        state: '/api/state',
        ws: '/ws',
        bleStatus: '/api/ble/status'
      }
    });
  }
});

// Start Server listening on 0.0.0.0:3000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  NextS Desktop Host Server running at http://0.0.0.0:${PORT}`);
  console.log(`  WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
  console.log(`  BLE GATT Server: "${bleManager.getStatus().deviceName}" (State: ${bleManager.getStatus().adapterState})`);
  console.log(`=======================================================`);
});

// Process cleanup
process.on('SIGINT', () => {
  keyController.destroy();
  bleManager.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  keyController.destroy();
  bleManager.destroy();
  process.exit(0);
});
