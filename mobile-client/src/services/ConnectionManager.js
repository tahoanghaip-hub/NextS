/**
 * ConnectionManager
 * Unified Dual-Transport Abstraction Layer (WIFI WebSocket + BLE Adapter Interface)
 */

class ConnectionManager {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectIntervalMs = 2000;
    this.statusListeners = new Set();
    this.messageListeners = new Set();
    this.pingTimer = null;
    this.lastPingTimestamp = 0;
    this.latencyMs = 0;

    this.state = {
      connected: false,
      mode: 'DISCONNECTED', // 'WIFI' | 'BLE' | 'DISCONNECTED'
      latencyMs: 0
    };

    // Auto-connect on browser instantiation
    if (typeof window !== 'undefined') {
      this.connectWebSocket();
    }
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use window.location.host (Vite proxies /ws to :3000 in dev; in prod same origin)
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
        this.updateStatus(true, 'WIFI', this.latencyMs);
        this.clearReconnectTimer();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // If this is a pong or response, we can calculate latency
          if (data && data.timestamp && this.lastPingTimestamp) {
            this.latencyMs = Math.max(1, Date.now() - this.lastPingTimestamp);
            this.updateStatus(true, this.state.mode, this.latencyMs);
            this.lastPingTimestamp = 0;
          }

          this.notifyMessage(data);
        } catch (err) {
          console.error('[ConnectionManager] Failed to parse message JSON:', err, event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.warn(`[ConnectionManager] WebSocket disconnected (code: ${event.code}). Retrying in ${this.reconnectIntervalMs}ms...`);
        this.updateStatus(false, 'DISCONNECTED', 0);
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[ConnectionManager] WebSocket error:', err);
        // onclose will trigger next
      };
    } catch (err) {
      console.error('[ConnectionManager] Error initiating WebSocket:', err);
      this.updateStatus(false, 'DISCONNECTED', 0);
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

  updateStatus(connected, mode, latencyMs) {
    this.state = { connected, mode, latencyMs };
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

  /**
   * Subscribe to connection status changes
   * @param {Function} callback ({ connected, mode, latencyMs }) => void
   * @returns {Function} unsubscribe
   */
  subscribeStatus(callback) {
    this.statusListeners.add(callback);
    callback(this.state);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Subscribe to incoming messages
   * @param {Function} callback (parsedJson) => void
   * @returns {Function} unsubscribe
   */
  subscribeMessage(callback) {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  /**
   * Send a JSON message object over the active transport
   * @param {Object} messageObject
   * @returns {boolean} whether message was transmitted
   */
  send(messageObject) {
    if (this.state.mode === 'WIFI' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.lastPingTimestamp = Date.now();
      this.ws.send(JSON.stringify(messageObject));
      return true;
    }

    // BLE fallback adapter ready for Milestone 5
    if (this.state.mode === 'BLE') {
      console.log('[ConnectionManager] Sending via BLE Adapter Interface:', messageObject);
      // Milestone 5 BLE transport implementation point
      return true;
    }

    console.warn('[ConnectionManager] Cannot send message: Transport is not connected.', messageObject);
    return false;
  }

  /**
   * Manual reconnect trigger
   */
  reconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // Ignore close error
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
    this.updateStatus(false, 'DISCONNECTED', 0);
  }
}

export const connectionManager = new ConnectionManager();
export default connectionManager;
