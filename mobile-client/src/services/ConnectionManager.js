/**
 * ConnectionManager.js
 * Unified Dual-Transport Abstraction Layer (WIFI WebSocket + BLE Adapter Interface)
 * Seamlessly manages Wi-Fi and Bluetooth Low Energy switching with zero user friction.
 */

import { bleAdapter } from './BleAdapter.js';

const TRANSPORT_PREF_KEY = 'nexts_transport_preference';

class ConnectionManager {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectIntervalMs = 2000;
    this.statusListeners = new Set();
    this.messageListeners = new Set();
    this.lastPingTimestamp = 0;
    this.latencyMs = 0;

    // Independent transport channel states
    this.wifiConnected = false;
    this.bleConnected = false;
    this.bleDeviceName = null;
    this.bleEnvironment = null;

    // Persisted transport preference: 'AUTO' | 'WIFI' | 'BLE'
    this.transportPreference = this.loadTransportPreference();

    // Consolidated public state
    this.state = {
      connected: false,
      mode: 'DISCONNECTED', // 'WIFI' | 'BLE' | 'DISCONNECTED'
      latencyMs: 0,
      transportPreference: this.transportPreference,
      wifiConnected: false,
      bleConnected: false,
      bleDeviceName: null,
      bleSupportInfo: bleAdapter.getSupportInfo()
    };

    // Listen to BleAdapter notifications and state changes
    bleAdapter.subscribeStatus((bleState) => {
      this.bleConnected = Boolean(bleState.connected);
      this.bleDeviceName = bleState.deviceName;
      this.bleEnvironment = bleState.environment;
      this.recomputeActiveTransport();
    });

    bleAdapter.subscribeMessage((message) => {
      this.notifyMessage(message);
    });

    // Auto-connect Wi-Fi WebSocket on browser instantiation
    if (typeof window !== 'undefined') {
      this.connectWebSocket();
    }
  }

  loadTransportPreference() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(TRANSPORT_PREF_KEY);
        if (stored && ['AUTO', 'WIFI', 'BLE'].includes(stored)) {
          return stored;
        }
      }
    } catch (e) {
      // Ignore
    }
    return 'AUTO';
  }

  setTransportPreference(pref) {
    if (!['AUTO', 'WIFI', 'BLE'].includes(pref)) return;
    this.transportPreference = pref;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TRANSPORT_PREF_KEY, pref);
      }
    } catch (e) {
      // Ignore
    }
    this.recomputeActiveTransport();
  }

  /**
   * Re-evaluates active transport according to preference and link availability
   */
  recomputeActiveTransport() {
    let activeMode = 'DISCONNECTED';
    let isConnected = false;

    if (this.transportPreference === 'BLE') {
      if (this.bleConnected) {
        activeMode = 'BLE';
        isConnected = true;
      }
    } else if (this.transportPreference === 'WIFI') {
      if (this.wifiConnected) {
        activeMode = 'WIFI';
        isConnected = true;
      }
    } else {
      // 'AUTO' Mode:
      // Prefer Wi-Fi if available (full thumbnails), automatically failover to BLE if Wi-Fi drops!
      if (this.wifiConnected) {
        activeMode = 'WIFI';
        isConnected = true;
      } else if (this.bleConnected) {
        activeMode = 'BLE';
        isConnected = true;
      }
    }

    const latency = activeMode === 'BLE' ? (this.latencyMs || 15) : this.latencyMs;

    this.state = {
      connected: isConnected,
      mode: activeMode,
      latencyMs: latency,
      transportPreference: this.transportPreference,
      wifiConnected: this.wifiConnected,
      bleConnected: this.bleConnected,
      bleDeviceName: this.bleDeviceName,
      bleEnvironment: this.bleEnvironment,
      bleSupportInfo: bleAdapter.getSupportInfo()
    };

    this.emitStatus();
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const wsUrl = this.getWebSocketUrl();
    console.log(`[ConnectionManager] Connecting to WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[ConnectionManager] WebSocket connected successfully.');
        this.wifiConnected = true;
        this.clearReconnectTimer();
        this.recomputeActiveTransport();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.timestamp && this.lastPingTimestamp) {
            this.latencyMs = Math.max(1, Date.now() - this.lastPingTimestamp);
            this.lastPingTimestamp = 0;
            this.recomputeActiveTransport();
          }
          this.notifyMessage(data);
        } catch (err) {
          console.error('[ConnectionManager] Failed to parse message JSON:', err, event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.warn(`[ConnectionManager] WebSocket disconnected (code: ${event.code}). Retrying in ${this.reconnectIntervalMs}ms...`);
        this.wifiConnected = false;
        this.ws = null;
        this.recomputeActiveTransport();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[ConnectionManager] WebSocket error:', err);
      };
    } catch (err) {
      console.error('[ConnectionManager] Error initiating WebSocket:', err);
      this.wifiConnected = false;
      this.recomputeActiveTransport();
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, this.reconnectIntervalMs);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  emitStatus() {
    for (const listener of this.statusListeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('[ConnectionManager] Error in status listener:', e);
      }
    }
  }

  notifyMessage(message) {
    for (const listener of this.messageListeners) {
      try {
        listener(message);
      } catch (e) {
        console.error('[ConnectionManager] Error in message listener:', e);
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

  /**
   * Connects to BLE GATT Server
   */
  async connectBle(options = {}) {
    try {
      const result = await bleAdapter.connect(options);
      // If user connects BLE while on AUTO preference, switch preference or active mode smoothly
      if (this.transportPreference === 'AUTO') {
        this.recomputeActiveTransport();
      }
      return result;
    } catch (err) {
      this.recomputeActiveTransport();
      throw err;
    }
  }

  /**
   * Disconnects BLE
   */
  disconnectBle() {
    bleAdapter.disconnect();
    this.recomputeActiveTransport();
  }

  /**
   * Sends a JSON message object over the active transport.
   * If BLE is active, automatically strips large WebP thumbnails to conserve bandwidth.
   */
  send(messageObject) {
    if (!messageObject) return false;

    // 1. BLE Active Transport
    if (this.state.mode === 'BLE') {
      let finalMsg = messageObject;

      // Automatically strip thumbnails if sending UPDATE_SCRIPT over BLE
      if (messageObject.type === 'UPDATE_SCRIPT' && messageObject.payload && Array.isArray(messageObject.payload.slides)) {
        finalMsg = {
          ...messageObject,
          payload: {
            ...messageObject.payload,
            slides: messageObject.payload.slides.map((s) => ({
              ...s,
              thumbnailBase64: null
            }))
          }
        };
      }

      console.log('[ConnectionManager] Dispatching command via BLE Adapter:', finalMsg.type);
      bleAdapter.send(finalMsg);
      return true;
    }

    // 2. Wi-Fi Active Transport
    if (this.state.mode === 'WIFI' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.lastPingTimestamp = Date.now();
      this.ws.send(JSON.stringify(messageObject));
      return true;
    }

    console.warn('[ConnectionManager] Cannot send message: Active transport is not connected.', messageObject);
    return false;
  }

  reconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // Ignore
      }
      this.ws = null;
    }
    this.clearReconnectTimer();
    this.connectWebSocket();
  }

  disconnect() {
    this.clearReconnectTimer();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // Ignore
      }
      this.ws = null;
    }
    this.wifiConnected = false;
    bleAdapter.disconnect();
    this.recomputeActiveTransport();
  }

  getDetailedStatus() {
    return {
      ...this.state
    };
  }
}

export const connectionManager = new ConnectionManager();
export default connectionManager;
