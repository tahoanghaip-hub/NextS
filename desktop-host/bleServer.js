import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { extractShortTitle } from './parsers/docSlideParser.js';

/**
 * Canonical BLE GATT Identifiers for NextS SlideSync
 */
export const BLE_DEVICE_NAME = 'SlideSync-Host';
export const BLE_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
export const BLE_CHAR_COMMAND_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb'; // Write / WriteWithoutResponse: Phone -> PC
export const BLE_CHAR_STATE_UUID = '0000ffe2-0000-1000-8000-00805f9b34fb';   // Notify / Read: PC -> Phone
export const BLE_MTU_CHUNK_SIZE = 160;                                       // Safe MTU chunk limit

/**
 * BleHostManager
 * Pure-JS Windows WinRT BLE GATT Advertisement Server & Chunked Packet Framer
 */
export class BleHostManager extends EventEmitter {
  constructor() {
    super();

    this.isAdvertising = true;
    this.adapterState = 'Simulated'; // 'PoweredOn' | 'Unsupported' | 'Simulated'
    this.connectedDevices = [];      // Array of { id, name, connectedAt, rssi }
    this.stats = {
      packetsReceived: 0,
      packetsSent: 0,
      lastCommandAt: null,
      lastCommandType: null
    };

    // Reassembly map: messageId -> { totalChunks, received: Map(index => data), deviceId, createdAt }
    this.reassemblySessions = new Map();
    // Device-specific pending notification chunk queues: deviceId -> string[]
    this.clientChunkQueues = new Map();
    // Background PowerShell process handle
    this.advertiserProcess = null;

    // Initialize radio check and advertising
    this.initRadio();

    // Clean up stale reassembly sessions every 60s
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.reassemblySessions.entries()) {
        if (now - session.createdAt > 45000) {
          this.reassemblySessions.delete(id);
        }
      }
    }, 30000);
  }

  /**
   * Non-blocking Windows PowerShell Bluetooth Hardware & WinRT Publisher check
   */
  initRadio() {
    if (process.platform !== 'win32') {
      console.log('[BleHostManager] Non-Windows OS detected. Running in Simulated BLE mode.');
      this.adapterState = 'Simulated';
      return;
    }

    try {
      // Check Bluetooth adapter status via PowerShell
      const psCommand = `
        $devices = Get-PnpDevice -Class Bluetooth -Status OK -ErrorAction SilentlyContinue;
        if ($devices) {
          Write-Output "BT_OK"
        } else {
          Write-Output "BT_NONE"
        }
      `;

      const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCommand], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && stdout.includes('BT_OK')) {
          this.adapterState = 'PoweredOn';
          console.log('[BleHostManager] Windows Bluetooth hardware detected & active (PoweredOn).');
          if (this.isAdvertising) {
            this.startWinRtPublisher();
          }
        } else {
          this.adapterState = 'Unsupported';
          console.log('[BleHostManager] No active Bluetooth adapter found. BLE fallback available.');
        }
      });

      child.on('error', (err) => {
        console.warn('[BleHostManager] PowerShell check error, falling back to Simulated:', err.message);
        this.adapterState = 'Simulated';
      });
    } catch (e) {
      console.warn('[BleHostManager] Radio init exception, falling back to Simulated:', e.message);
      this.adapterState = 'Simulated';
    }
  }

  /**
   * Spawns non-blocking WinRT BLE Advertisement publisher via PowerShell
   */
  startWinRtPublisher() {
    if (process.platform !== 'win32' || this.advertiserProcess) return;

    try {
      // Non-blocking WinRT publisher script
      const script = `
        try {
          Add-Type -AssemblyName 'System.Runtime.WindowsRuntime' -ErrorAction SilentlyContinue
          [Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementPublisher, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
          $pub = New-Object Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementPublisher
          $pub.Advertisement.LocalName = '${BLE_DEVICE_NAME}'
          $pub.Start()
          Write-Output "BLE_ADV_STARTED"
          while ($true) { Start-Sleep -Seconds 10 }
        } catch {
          Write-Output ("BLE_ADV_ERROR: " + $_.Exception.Message)
        }
      `;

      this.advertiserProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.advertiserProcess.stdout.on('data', (data) => {
        const text = data.toString().trim();
        if (text.includes('BLE_ADV_STARTED')) {
          console.log(`[BleHostManager] WinRT BLE Advertisement active: "${BLE_DEVICE_NAME}"`);
          this.adapterState = 'PoweredOn';
        } else if (text.includes('BLE_ADV_ERROR')) {
          // Peripheral role not supported by some Windows Bluetooth dongles; gracefully degrade to Simulated
          console.log(`[BleHostManager] WinRT BLE Advertisement notice: ${text}. Using hybrid/simulated BLE bridge.`);
          this.adapterState = 'Simulated';
        }
      });

      this.advertiserProcess.on('error', (err) => {
        console.warn('[BleHostManager] Advertiser process error:', err.message);
        this.advertiserProcess = null;
      });

      this.advertiserProcess.on('exit', () => {
        this.advertiserProcess = null;
      });
    } catch (err) {
      console.warn('[BleHostManager] Failed to launch WinRT advertiser:', err.message);
      this.adapterState = 'Simulated';
    }
  }

  stopWinRtPublisher() {
    if (this.advertiserProcess) {
      try {
        this.advertiserProcess.kill();
      } catch (e) {
        // Ignore
      }
      this.advertiserProcess = null;
    }
  }

  /**
   * Starts BLE advertising
   */
  startAdvertising() {
    this.isAdvertising = true;
    if (this.adapterState === 'PoweredOn' && process.platform === 'win32') {
      this.startWinRtPublisher();
    }
    console.log('[BleHostManager] BLE Advertising enabled.');
    return this.getStatus();
  }

  /**
   * Stops BLE advertising
   */
  stopAdvertising() {
    this.isAdvertising = false;
    this.stopWinRtPublisher();
    this.connectedDevices = [];
    console.log('[BleHostManager] BLE Advertising stopped.');
    return this.getStatus();
  }

  /**
   * Simulates or registers a client connection
   */
  simulateClientConnect(deviceName = 'Android Teleprompter (BLE)') {
    const existing = this.connectedDevices.find((d) => d.name === deviceName);
    if (existing) {
      existing.connectedAt = Date.now();
      existing.rssi = -48 + Math.floor(Math.random() * 8);
      return existing;
    }

    const device = {
      id: `ble-${Math.random().toString(36).substring(2, 9)}`,
      name: deviceName,
      connectedAt: Date.now(),
      rssi: -45
    };
    this.connectedDevices.push(device);
    console.log(`[BleHostManager] Registered BLE client: ${device.name} (${device.id})`);
    return device;
  }

  /**
   * Disconnects a client
   */
  disconnectClient(deviceId) {
    this.connectedDevices = this.connectedDevices.filter((d) => d.id !== deviceId);
    this.clientChunkQueues.delete(deviceId);
    console.log(`[BleHostManager] Disconnected BLE client: ${deviceId}`);
    return this.getStatus();
  }

  /**
   * Splits a JSON payload into MTU-safe chunks strictly <= 160 UTF-8 bytes
   * Handles multi-byte Unicode characters (e.g. Vietnamese diacritics) with 100% safety.
   * Format:
   * __BLE_START__:<totalChunks>:<messageId>
   * __BLE_CHUNK__:<index>:<chunkData>
   * __BLE_END__:<messageId>
   */
  splitIntoBleChunks(jsonString) {
    if (!jsonString) return [];

    const getByteLen = (str) => Buffer.byteLength(str, 'utf8');

    // Single frame if entire UTF-8 byte length is small enough
    if (getByteLen(jsonString) <= BLE_MTU_CHUNK_SIZE) {
      return [jsonString];
    }

    const messageId = `m${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;
    const dataChunks = [];
    const MAX_PAYLOAD_BYTES = 120; // Leaves >= 40 bytes headroom for __BLE_CHUNK__:<index>:

    let currentChunk = '';
    for (const char of jsonString) {
      if (getByteLen(currentChunk + char) > MAX_PAYLOAD_BYTES) {
        dataChunks.push(currentChunk);
        currentChunk = char;
      } else {
        currentChunk += char;
      }
    }
    if (currentChunk.length > 0) {
      dataChunks.push(currentChunk);
    }

    const totalChunks = dataChunks.length;
    const framedChunks = [];

    // Header Frame
    framedChunks.push(`__BLE_START__:${totalChunks}:${messageId}`);

    // Data Frames
    dataChunks.forEach((chunk, index) => {
      framedChunks.push(`__BLE_CHUNK__:${index}:${chunk}`);
    });

    // End Frame
    framedChunks.push(`__BLE_END__:${messageId}`);

    return framedChunks;
  }

  /**
   * Receives and processes a raw BLE MTU frame from a device
   */
  receiveBleRawFrame(rawFrameString, deviceId = 'ble-android-01') {
    if (!rawFrameString || typeof rawFrameString !== 'string') {
      return { success: false, error: 'Empty frame' };
    }

    const trimmed = rawFrameString.trim();
    this.stats.packetsReceived += 1;

    // Ensure client device is registered in connected list
    if (!this.connectedDevices.some((d) => d.id === deviceId)) {
      this.connectedDevices.push({
        id: deviceId,
        name: 'Android Teleprompter (BLE)',
        connectedAt: Date.now(),
        rssi: -48
      });
    }

    // 1. Direct single-frame JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        this.stats.lastCommandAt = Date.now();
        this.stats.lastCommandType = parsed.type;
        this.emit('message', parsed, deviceId);
        return { success: true, parsed: true, type: parsed.type, message: parsed };
      } catch (err) {
        return { success: false, error: 'Invalid JSON frame: ' + err.message };
      }
    }

    // 2. Chunk Header: __BLE_START__:<totalChunks>:<messageId>
    if (trimmed.startsWith('__BLE_START__:')) {
      const parts = trimmed.split(':');
      const totalChunks = parseInt(parts[1], 10);
      const messageId = parts[2];

      if (isNaN(totalChunks) || !messageId) {
        return { success: false, error: 'Malformed START frame' };
      }

      this.reassemblySessions.set(messageId, {
        totalChunks,
        received: new Map(),
        deviceId,
        createdAt: Date.now()
      });

      return { success: true, parsed: false, status: 'CHUNK_STARTED', messageId };
    }

    // 3. Chunk Body: __BLE_CHUNK__:<index>:<chunkData>
    if (trimmed.startsWith('__BLE_CHUNK__:')) {
      const match = trimmed.match(/^__BLE_CHUNK__:(\d+):([\s\S]*)$/);
      if (!match) {
        return { success: false, error: 'Malformed CHUNK frame' };
      }

      const index = parseInt(match[1], 10);
      const chunkData = match[2];

      // Match to the most recent active session for this device
      let targetSession = null;
      let targetId = null;
      for (const [id, session] of this.reassemblySessions.entries()) {
        if (session.deviceId === deviceId) {
          targetSession = session;
          targetId = id;
          break;
        }
      }

      if (targetSession) {
        targetSession.received.set(index, chunkData);
        return { success: true, parsed: false, status: 'CHUNK_SAVED', index, messageId: targetId };
      }

      return { success: false, error: 'No active reassembly session found for chunk' };
    }

    // 4. Chunk Footer: __BLE_END__:<messageId>
    if (trimmed.startsWith('__BLE_END__:')) {
      const parts = trimmed.split(':');
      const messageId = parts[1];
      const session = this.reassemblySessions.get(messageId);

      if (!session) {
        return { success: false, error: 'Unknown messageId for END frame' };
      }

      // Assemble all chunks in order
      const pieces = [];
      for (let i = 0; i < session.totalChunks; i++) {
        if (!session.received.has(i)) {
          this.reassemblySessions.delete(messageId);
          return { success: false, error: `Missing chunk ${i} of ${session.totalChunks}` };
        }
        pieces.push(session.received.get(i));
      }

      this.reassemblySessions.delete(messageId);
      const fullString = pieces.join('');

      try {
        const parsed = JSON.parse(fullString);
        this.stats.lastCommandAt = Date.now();
        this.stats.lastCommandType = parsed.type;
        this.emit('message', parsed, session.deviceId);
        return { success: true, parsed: true, type: parsed.type, message: parsed };
      } catch (err) {
        return { success: false, error: 'Reassembled payload is not valid JSON: ' + err.message };
      }
    }

    return { success: false, error: 'Unrecognized frame format' };
  }

  /**
   * Broadcasts lightweight, thumbnail-stripped state to BLE clients
   */
  broadcastBleState(lightweightPresentationData, keyMapping = 'ARROWS') {
    if (!lightweightPresentationData) return [];

    // Strip thumbnails and ensure 3-5 word concise titles
    const sanitizedSlides = (lightweightPresentationData.slides || []).map((slide, idx) => ({
      slideNumber: slide.slideNumber || (idx + 1),
      title: extractShortTitle(slide.title, slide.slideNumber || (idx + 1)),
      scriptContent: slide.scriptContent || '',
      qaContent: slide.qaContent || '',
      thumbnailBase64: null
    }));

    const payload = {
      ...lightweightPresentationData,
      slides: sanitizedSlides
    };

    const stateMessage = {
      type: 'STATE_SYNC',
      payload,
      connectionMode: 'BLE',
      keyMapping: keyMapping || 'ARROWS',
      timestamp: Date.now()
    };

    const jsonString = JSON.stringify(stateMessage);
    const chunks = this.splitIntoBleChunks(jsonString);

    this.stats.packetsSent += chunks.length;

    // Queue chunks for all connected or querying BLE clients
    for (const device of this.connectedDevices) {
      const q = this.clientChunkQueues.get(device.id) || [];
      q.push(...chunks);
      this.clientChunkQueues.set(device.id, q);
    }

    // Global queue fallback for tunnel clients
    const globalQ = this.clientChunkQueues.get('__global__') || [];
    globalQ.push(...chunks);
    this.clientChunkQueues.set('__global__', globalQ);

    return chunks;
  }

  /**
   * Retrieves and clears queued chunks for a device or tunnel client
   */
  drainPendingChunks(deviceId = '__global__') {
    const q = this.clientChunkQueues.get(deviceId) || this.clientChunkQueues.get('__global__') || [];
    this.clientChunkQueues.set(deviceId, []);
    this.clientChunkQueues.set('__global__', []);
    return q;
  }

  /**
   * Returns complete BLE GATT status snapshot
   */
  getStatus() {
    return {
      isAdvertising: this.isAdvertising,
      adapterState: this.adapterState,
      serviceUuid: BLE_SERVICE_UUID,
      commandCharUuid: BLE_CHAR_COMMAND_UUID,
      stateCharUuid: BLE_CHAR_STATE_UUID,
      deviceName: BLE_DEVICE_NAME,
      connectedDevices: this.connectedDevices,
      stats: { ...this.stats }
    };
  }

  destroy() {
    clearInterval(this.cleanupTimer);
    this.stopWinRtPublisher();
  }
}

export const bleHostManager = new BleHostManager();
export default bleHostManager;
