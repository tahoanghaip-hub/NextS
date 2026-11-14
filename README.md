# NextS — Auto-Slide Teleprompter & Presentation Controller

> **Milestone 1:** Architecture Contract, Zero-Dependency Windows Key Controller, Dual-Transport Connection Manager, and Global Theme/State Engine.

---

## 🚀 Quick Start Guide

### 1. Start the Desktop Host Server (Backend & Windows Key Controller)
```bash
cd desktop-host
npm install
npm start
```
- **Port:** `3000` (Listening on `0.0.0.0:3000`)
- **WebSocket:** `ws://0.0.0.0:3000/ws`
- **Features:** Persistent background PowerShell `SendKeys` bridge (zero C++ dependencies), network interface scanner (Mobile Hotspot / Wi-Fi / Ethernet), QR code generator, and 2-way real-time state synchronization.

### 2. Start the Mobile Client (Vite Dev Server)
In a separate terminal:
```bash
cd mobile-client
npm install
npm run dev
```
- **Port:** `5173` (Listening on `0.0.0.0:5173`)
- **Vite Proxy:** All `/api` and `/ws` traffic automatically proxied to `http://127.0.0.1:3000`.

### 3. Build Client for Production Static Serving
```bash
cd mobile-client
npm run build
```
Once built, running `npm start` in `desktop-host` will automatically serve the built client files from `mobile-client/dist` directly on port `3000`.

---

## 📱 Mobile Pairing
1. Connect phone and PC to the same Wi-Fi or have the PC turn on **Mobile Hotspot**.
2. Scan the QR code displayed in NextS with your phone camera.
3. The teleprompter loads immediately on your phone without installing any app!

---

## 🏛 Architecture & Protocols
Please refer to [ARCHITECTURE.md](ARCHITECTURE.md) for the complete canonical data schema, settings schema, and WebSocket message protocol.
