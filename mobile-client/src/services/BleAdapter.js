/**
 * BleAdapter.js
 * Comprehensive Client-Side Bluetooth Low Energy GATT Adapter
 * 
 * Supports 3 environments:
 * 1. Environment A: Capacitor Native Android APK (window.Capacitor.Plugins.BluetoothLe)
 * 2. Environment B: Android Chrome Web Bluetooth API (navigator.bluetooth)
 * 3. Environment C: Local BLE GATT Tunnel (/api/ble/frame) for testing without HTTPS restrictions
 */

export const BLE_DEVICE_NAME = 'SlideSync-Host';
export const BLE_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
export const BLE_CHAR_COMMAND_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
export const BLE_CHAR_STATE_UUID = '0000ffe2-0000-1000-8000-00805f9b34fb';
export const BLE_MTU_CHUNK_SIZE = 160;

export class BleAdapter {
  constructor() {
    this.deviceId = 'ble-client-' + Math.random().toString(36).substring(2, 8);
    this.statusListeners = new Set();
    this.messageListeners = new Set();

    this.state = {
      connected: false,
      deviceName: null,
      environment: null, // 'CAPACITOR' | 'WEB_BLUETOOTH' | 'GATT_TUNNEL' | null
      rssi: null
    };

    // Web Bluetooth GATT handles
    this.bluetoothDevice = null;
    this.gattServer = null;
    this.commandChar = null;
    this.stateChar = null;

    // GATT Tunnel polling timer
    this.tunnelPollInterval = null;

    // Incoming chunk reassembly session map: messageId -> { totalChunks, received: Map, createdAt }
    this.reassemblySessions = new Map();
  }

  /**
   * Returns hardware and browser capability flags
   */
  getSupportInfo() {
    const webBluetoothSupported = typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
    const capacitorBleSupported = typeof window !== 'undefined' && Boolean(window.Capacitor?.Plugins?.BluetoothLe);
    const isSecure = typeof window !== 'undefined' ? (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') : false;

    return {
      webBluetoothSupported,
      capacitorBleSupported,
      isSecureContext: isSecure,
      tunnelAvailable: true,
      serviceUuid: BLE_SERVICE_UUID,
      deviceName: BLE_DEVICE_NAME
    };
  }

  /**
   * Splits a JSON string into strictly <= 160 UTF-8 bytes MTU-safe framed chunks
   * Safe for multi-byte Unicode characters (e.g. Vietnamese diacritics).
   */
  splitIntoBleChunks(jsonString) {
    if (!jsonString) return [];

    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    const getByteLen = (str) => encoder ? encoder.encode(str).length : str.length;

    if (getByteLen(jsonString) <= BLE_MTU_CHUNK_SIZE) {
      return [jsonString];
    }

    const messageId = `m${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;
    const dataChunks = [];
    const MAX_PAYLOAD_BYTES = 120;

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
   * Receives a raw frame and reassembles multi-chunk payloads
   */
  receiveRawFrame(rawFrameString) {
    if (!rawFrameString || typeof rawFrameString !== 'string') return;
    const trimmed = rawFrameString.trim();

    // 1. Single Frame JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        this.notifyMessage(parsed);
        return;
      } catch (e) {
        console.warn('[BleAdapter] Error parsing single frame JSON:', e);
        return;
      }
    }

    // 2. Start Frame
    if (trimmed.startsWith('__BLE_START__:')) {
      const parts = trimmed.split(':');
      const totalChunks = parseInt(parts[1], 10);
      const messageId = parts[2];
      if (!isNaN(totalChunks) && messageId) {
        this.reassemblySessions.set(messageId, {
          totalChunks,
          received: new Map(),
          createdAt: Date.now()
        });
      }
      return;
    }

    // 3. Chunk Frame
    if (trimmed.startsWith('__BLE_CHUNK__:')) {
      const match = trimmed.match(/^__BLE_CHUNK__:(\d+):([\s\S]*)$/);
      if (match) {
        const index = parseInt(match[1], 10);
        const chunkData = match[2];
        // Store in the most recently created reassembly session
        const sessions = Array.from(this.reassemblySessions.values());
        if (sessions.length > 0) {
          const latestSession = sessions[sessions.length - 1];
          latestSession.received.set(index, chunkData);
        }
      }
      return;
    }

    // 4. End Frame
    if (trimmed.startsWith('__BLE_END__:')) {
      const parts = trimmed.split(':');
      const messageId = parts[1];
      const session = this.reassemblySessions.get(messageId);
      if (session) {
        const pieces = [];
        for (let i = 0; i < session.totalChunks; i++) {
          if (!session.received.has(i)) {
            console.warn(`[BleAdapter] Missing chunk ${i} of ${session.totalChunks}`);
            this.reassemblySessions.delete(messageId);
            return;
          }
          pieces.push(session.received.get(i));
        }
        this.reassemblySessions.delete(messageId);
        try {
          const fullJson = pieces.join('');
          const parsed = JSON.parse(fullJson);
          this.notifyMessage(parsed);
        } catch (e) {
          console.error('[BleAdapter] Failed to parse reassembled JSON:', e);
        }
      }
    }
  }

  /**
   * Connect to BLE GATT Server across Environment A, B, or C
   */
  async connect(options = {}) {
    const { forceTunnel = false } = options;
    const support = this.getSupportInfo();

    // -----------------------------------------------------------
    // Environment A: Capacitor Native Android Bluetooth Plugin
    // -----------------------------------------------------------
    if (!forceTunnel && support.capacitorBleSupported) {
      try {
        console.log('[BleAdapter] Connecting via Capacitor BluetoothLe plugin...');
        const ble = window.Capacitor.Plugins.BluetoothLe;
        await ble.initialize();

        const device = await ble.requestDevice({
          services: [BLE_SERVICE_UUID]
        });

        await ble.connect({ deviceId: device.deviceId });

        await ble.startNotifications(
          {
            deviceId: device.deviceId,
            service: BLE_SERVICE_UUID,
            characteristic: BLE_CHAR_STATE_UUID
          },
          (result) => {
            if (result && result.value) {
              const text = atob(result.value);
              this.receiveRawFrame(text);
            }
          }
        );

        this.updateStatus(true, device.name || BLE_DEVICE_NAME, 'CAPACITOR', -45);
        return true;
      } catch (err) {
        console.warn('[BleAdapter] Capacitor BLE connection failed, falling back to Tunnel:', err.message);
      }
    }

    // -----------------------------------------------------------
    // Environment B: Web Bluetooth API (Android Chrome / Edge)
    // -----------------------------------------------------------
    if (!forceTunnel && support.webBluetoothSupported && support.isSecureContext) {
      try {
        console.log('[BleAdapter] Requesting Web Bluetooth device...');
        const device = await navigator.bluetooth.requestDevice({
          filters: [
            { services: [BLE_SERVICE_UUID] },
            { namePrefix: 'SlideSync' }
          ],
          optionalServices: [BLE_SERVICE_UUID]
        });

        this.bluetoothDevice = device;
        device.addEventListener('gattserverdisconnected', () => {
          console.warn('[BleAdapter] Web Bluetooth disconnected.');
          this.updateStatus(false, null, null, null);
        });

        const server = await device.gatt.connect();
        this.gattServer = server;

        const service = await server.getPrimaryService(BLE_SERVICE_UUID);
        this.commandChar = await service.getCharacteristic(BLE_CHAR_COMMAND_UUID);
        this.stateChar = await service.getCharacteristic(BLE_CHAR_STATE_UUID);

        // Subscribe to State notifications
        await this.stateChar.startNotifications();
        this.stateChar.addEventListener('characteristicvaluechanged', (e) => {
          const decoder = new TextDecoder();
          const frameStr = decoder.decode(e.target.value);
          this.receiveRawFrame(frameStr);
        });

        this.updateStatus(true, device.name || BLE_DEVICE_NAME, 'WEB_BLUETOOTH', -42);
        return true;
      } catch (err) {
        console.warn('[BleAdapter] Web Bluetooth failed or was cancelled:', err.message);
        // Fall back to Environment C
      }
    }

    // -----------------------------------------------------------
    // Environment C: Local BLE GATT Packet Tunnel (/api/ble/frame)
    // -----------------------------------------------------------
    try {
      console.log('[BleAdapter] Initializing Local BLE GATT Tunnel handshake...');
      const response = await fetch('/api/ble/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.deviceId,
          deviceName: 'SlideSync Teleprompter (BLE Bridge)'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from /api/ble/connect`);
      }

      const data = await response.json();
      console.log('[BleAdapter] GATT Tunnel connected:', data);

      // Ingest initial sync chunks immediately
      if (Array.isArray(data.initialSyncChunks)) {
        data.initialSyncChunks.forEach((chunk) => this.receiveRawFrame(chunk));
      }

      // Start background poll to receive any push notification chunks
      this.startTunnelPolling();

      this.updateStatus(true, BLE_DEVICE_NAME, 'GATT_TUNNEL', -40);
      return true;
    } catch (err) {
      console.error('[BleAdapter] All BLE connection paths failed:', err);
      this.updateStatus(false, null, null, null);
      throw err;
    }
  }

  /**
   * Background poller for Environment C (GATT Tunnel)
   */
  startTunnelPolling() {
    this.stopTunnelPolling();
    this.tunnelPollInterval = setInterval(async () => {
      if (!this.state.connected || this.state.environment !== 'GATT_TUNNEL') {
        this.stopTunnelPolling();
        return;
      }
      try {
        const res = await fetch(`/api/ble/pending?deviceId=${encodeURIComponent(this.deviceId)}`);
        if (res.ok) {
          const body = await res.json();
          if (Array.isArray(body.pendingChunks) && body.pendingChunks.length > 0) {
            body.pendingChunks.forEach((chunk) => this.receiveRawFrame(chunk));
          }
        }
      } catch (e) {
        // Polling error silently handled
      }
    }, 1200);
  }

  stopTunnelPolling() {
    if (this.tunnelPollInterval) {
      clearInterval(this.tunnelPollInterval);
      this.tunnelPollInterval = null;
    }
  }

  /**
   * Sends a message over the active BLE environment with MTU chunk framing
   */
  async send(messageObject) {
    if (!this.state.connected) {
      console.warn('[BleAdapter] Cannot send: BLE is not connected.');
      return false;
    }

    const jsonString = JSON.stringify(messageObject);
    const chunks = this.splitIntoBleChunks(jsonString);

    // 1. Environment A: Capacitor
    if (this.state.environment === 'CAPACITOR') {
      try {
        const ble = window.Capacitor.Plugins.BluetoothLe;
        for (const chunk of chunks) {
          await ble.writeWithoutResponse({
            deviceId: this.deviceId,
            service: BLE_SERVICE_UUID,
            characteristic: BLE_CHAR_COMMAND_UUID,
            value: btoa(chunk)
          });
        }
        return true;
      } catch (err) {
        console.error('[BleAdapter] Capacitor write error:', err);
        return false;
      }
    }

    // 2. Environment B: Web Bluetooth
    if (this.state.environment === 'WEB_BLUETOOTH' && this.commandChar) {
      try {
        const encoder = new TextEncoder();
        for (const chunk of chunks) {
          const bytes = encoder.encode(chunk);
          if (this.commandChar.writeValueWithoutResponse) {
            await this.commandChar.writeValueWithoutResponse(bytes);
          } else {
            await this.commandChar.writeValue(bytes);
          }
        }
        return true;
      } catch (err) {
        console.error('[BleAdapter] Web Bluetooth write error:', err);
        return false;
      }
    }

    // 3. Environment C: Local BLE GATT Tunnel
    if (this.state.environment === 'GATT_TUNNEL') {
      try {
        for (const chunk of chunks) {
          const res = await fetch('/api/ble/frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rawFrame: chunk,
              deviceId: this.deviceId
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.pendingChunks)) {
              data.pendingChunks.forEach((c) => this.receiveRawFrame(c));
            }
          }
        }
        return true;
      } catch (err) {
        console.error('[BleAdapter] GATT Tunnel write error:', err);
        return false;
      }
    }

    return false;
  }

  /**
   * Disconnects from active BLE transport
   */
  disconnect() {
    this.stopTunnelPolling();

    if (this.gattServer && this.gattServer.connected) {
      try {
        this.gattServer.disconnect();
      } catch (e) {
        // Ignore
      }
    }

    this.bluetoothDevice = null;
    this.gattServer = null;
    this.commandChar = null;
    this.stateChar = null;

    this.updateStatus(false, null, null, null);
  }

  updateStatus(connected, deviceName, environment, rssi) {
    this.state = { connected, deviceName, environment, rssi };
    for (const listener of this.statusListeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('[BleAdapter] Error in status listener:', e);
      }
    }
  }

  notifyMessage(message) {
    for (const listener of this.messageListeners) {
      try {
        listener(message);
      } catch (e) {
        console.error('[BleAdapter] Error in message listener:', e);
      }
    }
  }

  subscribeStatus(callback) {
    this.statusListeners.add(callback);
    callback(this.state);
    return () => this.statusListeners.delete(callback);
  }

  subscribeMessage(callback) {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }
}

export const bleAdapter = new BleAdapter();
export default bleAdapter;
