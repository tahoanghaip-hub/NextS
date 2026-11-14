# NextS Architecture & System Contract
**Auto-Slide Teleprompter & Presentation Controller**
*Single Source of Truth for Data Structures, Network Protocols, Hardware Bridges & UI Architecture*

---

## 1. Monorepo Directory Structure

```text
NextS/
├── .agents/                          # AI design skills and UI/UX guidance (Do not modify)
├── ARCHITECTURE.md                   # Single Source of Truth for Data, State & Protocol
├── desktop-host/                     # Node.js HTTP + WebSocket Server & Windows Key Controller
│   ├── package.json
│   ├── server.js                     # Express + WS Server + Static Hosting + State Sync
│   ├── keyController.js              # Persistent PowerShell SendKeys & Window Focus Manager
│   ├── networkUtils.js               # LAN IPv4 & Mobile Hotspot Interface Scanner
│   └── mockData.js                   # Default 5-Slide Vietnamese Presentation Dataset
└── mobile-client/                    # React + Vite + TailwindCSS (Mobile Portrait & PC Landscape UI)
    ├── package.json
    ├── vite.config.js                # Configured with host: '0.0.0.0' and /api + /ws proxy to :3000
    ├── index.html
    └── src/
        ├── main.jsx
        ├── index.css                 # Global CSS Custom Properties (Dark/Light + Typography + Trigger Line)
        ├── constants/
        │   └── promptConvention.js   # AI Prompt Convention Template & Default Settings
        ├── services/
        │   └── ConnectionManager.js  # Unified Dual-Transport Abstraction (WebSocket + BLE Ready)
        ├── context/
        │   └── AppContext.jsx        # Global State, Settings Persistence, WakeLock, Timer & Actions
        └── App.jsx                   # Milestone 1 Diagnostic & Control Harness
```

---

## 2. Canonical Data Schema (`PresentationData`)

All parsers, editors, and network payloads MUST strictly adhere to this exact JSON structure:

```json
{
  "id": "pres-default-001",
  "title": "Chiến lược Chuyển đổi Số & Ứng dụng AI 2026",
  "totalSlides": 5,
  "currentSlide": 1,
  "isSyncLocked": true,
  "updatedAt": 1763080000000,
  "slides": [
    {
      "slideNumber": 1,
      "title": "Tổng quan chuyển đổi số",
      "scriptContent": "Xin chào thầy cô và các bạn. Hôm nay tôi xin trình bày về chủ đề Chiến lược Chuyển đổi Số...",
      "qaContent": "Câu hỏi 1: Chi phí triển khai ban đầu là bao nhiêu?\nTrả lời: Chi phí có thể tối ưu bằng mã nguồn mở...",
      "thumbnailBase64": null
    }
  ],
  "generalQA": "Câu hỏi chung 1: Hệ thống có hoạt động khi mất mạng không?\nTrả lời: Hoàn toàn hoạt động nhờ cơ chế Offline-First qua Hotspot và Bluetooth BLE."
}
```

### Field Definitions

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier of the presentation deck (e.g. `pres-default-001`). |
| `title` | `string` | Presentation title. |
| `totalSlides` | `number` | Total number of slides (must match `slides.length`). |
| `currentSlide` | `number` | 1-indexed pointer to currently active slide (`1 <= currentSlide <= totalSlides`). |
| `isSyncLocked` | `boolean` | When `true`, scrolling or clicking slides physically triggers slide transitions on Windows. When `false`, user can preview slides freely without moving projector slides. |
| `updatedAt` | `number` | Millisecond Unix timestamp of last modification. |
| `slides` | `Array<SlideItem>` | Array of slide items. |
| `slides[].slideNumber` | `number` | 1-indexed slide number. |
| `slides[].title` | `string` | Short title (3–5 words). |
| `slides[].scriptContent`| `string` | Full presenter script for this slide. |
| `slides[].qaContent` | `string` | Expected Q&A and counter-arguments for this specific slide. |
| `slides[].thumbnailBase64`| `string \| null`| Optional base64-encoded thumbnail image or `null`. |
| `generalQA` | `string` | Overall presentation Q&A, context, and backup notes. |

---

## 3. Canonical Settings Schema (`AppSettings`)

Stored in `localStorage` under key `nexts_app_settings_v1` and synchronized across components:

```json
{
  "theme": "dark",
  "fontSize": 22,
  "lineHeight": 1.6,
  "mirrorMode": false,
  "autoScroll": false,
  "autoScrollSpeed": 3,
  "triggerPosition": 33,
  "debounceMs": 500,
  "keyMapping": "ARROWS",
  "keepAwake": true,
  "autoMinimizeOnStart": true
}
```

### Settings Dictionary & Constraints

| Key | Type | Default | Permitted Values / Description |
| :--- | :--- | :--- | :--- |
| `theme` | `string` | `"dark"` | `"dark"` or `"light"`. Configures `[data-theme]` on `<html>`. |
| `fontSize` | `number` | `22` | Font size in pixels (range: 16 to 36). Maps to `--script-font-size`. |
| `lineHeight` | `number` | `1.6` | Line height ratio (range: 1.2 to 2.2). Maps to `--script-line-height`. |
| `mirrorMode` | `boolean` | `false` | Inverts horizontal axis via CSS `transform: scaleX(-1)` for physical beam-splitter teleprompter glass. |
| `autoScroll` | `boolean` | `false` | Whether automated teleprompter scrolling is active. |
| `autoScrollSpeed` | `number` | `3` | Scroll speed level (1 to 10). |
| `triggerPosition` | `number` | `33` | Vertical trigger line position in viewport percentage (`15`, `33`, or `50`). Maps to `--trigger-line-top`. |
| `debounceMs` | `number` | `500` | Debounce time in ms for scroll-driven slide change events. |
| `keyMapping` | `string` | `"ARROWS"` | Key emulation map: `"ARROWS"`, `"PAGEDOWN"`, or `"SPACE"`. |
| `keepAwake` | `boolean` | `true` | Requests Screen WakeLock API to prevent device screen timeout. |
| `autoMinimizeOnStart`| `boolean`| `true` | Restores presentation window focus (Alt+Esc / minimize host) when presentation starts. |

### Key Mapping Symbol Table
Windows `SendKeys` symbol mapping:

| Key Mapping Mode | NEXT | PREV | BLACKOUT |
| :--- | :--- | :--- | :--- |
| **`ARROWS`** | `{RIGHT}` | `{LEFT}` | `b` |
| **`PAGEDOWN`** | `{PGDN}` | `{PGUP}` | `b` |
| **`SPACE`** | ` ` *(single space)* | `{LEFT}` | `b` |

---

## 4. Canonical WebSocket / BLE Message Protocol (`SyncMessage`)

Every message exchanged between `mobile-client` and `desktop-host` is a JSON string with a `type` field.

### Client -> Host Messages

```typescript
// 1. Jump directly to target slide (calculates delta and emulates |delta| key presses)
{ "type": "GOTO_SLIDE", "targetSlide": number, "force"?: boolean }

// 2. Step 1 slide forward, backward, or toggle blackout
{ "type": "STEP_SLIDE", "direction": "NEXT" | "PREV" | "BLACKOUT" }

// 3. Anti-Desync Manual Nudge (fixes projector drift without altering PresentationData.currentSlide)
{ "type": "ADJUST_DESYNC", "offset": 1 | -1 }

// 4. Toggle synchronized slide switching lock
{ "type": "TOGGLE_SYNC_LOCK", "isSyncLocked": boolean }

// 5. Update complete presentation script and metadata
{ "type": "UPDATE_SCRIPT", "payload": PresentationData }

// 6. Update hardware key mapping profile
{ "type": "UPDATE_KEYMAP", "keyMapping": "ARROWS" | "PAGEDOWN" | "SPACE" }

// 7. Start presentation mode and optionally refocus presentation window
{ "type": "START_PRESENTATION", "autoMinimize": boolean }
```

### Host -> Client Messages

```typescript
// Broadcast full state snapshot on connection, slide jumps, or script updates
{
  "type": "STATE_SYNC",
  "payload": PresentationData,
  "connectionMode": "WIFI" | "BLE",
  "keyMapping": "ARROWS" | "PAGEDOWN" | "SPACE"
}

// Execution confirmation of key emulation actions
{
  "type": "KEY_EXEC_RESULT",
  "success": boolean,
  "action": string,
  "currentSlide": number,
  "timestamp": number
}
```

---

## 5. Global Theme & Design Token Architecture

All UI components MUST consume semantic CSS Custom Properties declared in `mobile-client/src/index.css`:

```css
:root, [data-theme="dark"] {
  --bg-app: #090d16;
  --bg-surface: #111827;
  --bg-elevated: #1e293b;
  --bg-glass: rgba(17, 24, 39, 0.88);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border-subtle: #334155;
  --accent-primary: #3b82f6;
  --accent-hover: #2563eb;
  --trigger-line-color: #f59e0b;
  --trigger-zone-bg: rgba(245, 158, 11, 0.08);
  --danger-color: #ef4444;
  --success-color: #10b981;
}

[data-theme="light"] {
  --bg-app: #f1f5f9;
  --bg-surface: #ffffff;
  --bg-elevated: #e2e8f0;
  --bg-glass: rgba(255, 255, 255, 0.90);
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --border-subtle: #cbd5e1;
  --accent-primary: #2563eb;
  --accent-hover: #1d4ed8;
  --trigger-line-color: #d97706;
  --trigger-zone-bg: rgba(217, 119, 6, 0.10);
  --danger-color: #dc2626;
  --success-color: #059669;
}
```

### Strict Styling Rule
Under no circumstances should static Tailwind colors (`bg-white`, `bg-black`, `text-black`, `text-slate-900`) be used for background or text colors. Use `.theme-bg-app`, `.theme-bg-surface`, `.theme-bg-elevated`, `.theme-text-primary`, `.theme-text-secondary`, and `.theme-border`.
