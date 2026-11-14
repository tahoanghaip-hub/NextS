# NextS — Trạm Thuyết Trình Thông Minh & Máy Nhắc Chữ Tự Động Đổi Slide

<div align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20Web-blue?style=for-the-badge" alt="Platforms" />
  <img src="https://img.shields.io/badge/Transport-Wi--Fi%20Hotspot%20%26%20Bluetooth%20BLE-success?style=for-the-badge" alt="Transport" />
  <img src="https://img.shields.io/badge/Dependencies-Zero%20Native%20Driver-orange?style=for-the-badge" alt="Zero Driver" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" alt="License" />
</div>

---

## 📖 1. Giới Thiệu Tổng Quan

**NextS** là giải pháp thuyết trình sân khấu thông minh thế hệ mới, biến chiếc điện thoại của bạn thành **Máy nhắc chữ (Teleprompter)** cầm tay, đồng thời **tự động chuyển trang slide trên máy tính** (PowerPoint, Google Slides, Canva, PDF Acrobat, Keynote...) theo tiến độ đọc kịch bản.

### 🌟 Tính năng đột phá:
- **Tự động chuyển slide quang học (Trigger Line):** Khi bạn cuộn kịch bản qua vạch kích hoạt màu cam (vùng 33% màn hình), NextS sẽ tự động gửi lệnh phím sang máy tính để nhảy slide tiếp theo hoặc lùi slide trước đó với bộ lọc chống rung (debounce 600ms).
- **Điều khiển phím Windows không cần Driver C++:** Sử dụng cầu nối tiến trình ngầm PowerShell `SendKeys` trực tiếp từ Node.js. Chạy ngay trên mọi máy tính Windows không cần cài thêm driver hay quyền Administrator.
- **Đồng bộ kép (Dual-Transport Wi-Fi + BLE):** Tự động phát hiện mạng LAN, Wi-Fi trường học hoặc Điểm phát sóng di động (Mobile Hotspot). Tích hợp Bluetooth Low Energy (BLE GATT Bridge) với cơ chế phân mảnh MTU giúp điều khiển mượt mà ngay cả khi không có mạng.
- **Kịch bản 2 màn hình (Swipe Pager):** Vuốt ngang mượt mà giữa **Màn hình 1 (Lời thoại thuyết trình)** và **Màn hình 2 (Câu hỏi phản biện Q&A theo slide + Hỏi đáp chung)**.
- **Kho bài thuyết trình Offline & Gói `.nexts.json`:** Lưu trữ nhiều bài thuyết trình trong bộ nhớ trình duyệt (LocalStorage). Cho phép xuất và nhập toàn bộ kịch bản, Q&A và ảnh thumbnail WebP dưới dạng file di động `.nexts.json`.
- **Hỗ trợ đa nền tảng:** Chạy dưới dạng Web PWA toàn màn hình, phần mềm Windows `.exe` qua Electron và ứng dụng Android `.apk` qua Capacitor.

---

## ⚡ 2. Cách Chạy Nhanh Nhất Trên Windows (1-Click Production)

Bạn có thể khởi chạy toàn bộ hệ thống ngay lập tức chỉ với một cú nhấp chuột:

### Cách 1: Dùng File `.bat` (Khuyên dùng trên Windows)
1. Nhấp đúp vào file **`Start-NextS.bat`** tại thư mục gốc của dự án.
2. File batch sẽ tự động:
   - Cài đặt thư viện nếu chạy lần đầu.
   - Biên dịch giao diện client sang thư mục `dist/`.
   - Khởi chạy máy chủ trạm phát `desktop-host` tại cổng `3000`.
   - Tự động mở trình duyệt mặc định vào địa chỉ `http://localhost:3000`.
3. Màn hình máy tính hiện mã QR. Dùng điện thoại quét mã QR để mở máy nhắc chữ và bắt đầu thuyết trình!

### Cách 2: Chạy bằng lệnh Node.js
```bash
npm run start:prod
```
Lệnh này sẽ tự động chạy `npm run build:client` và sau đó chạy máy chủ `desktop-host` ở chế độ phục vụ tĩnh cổng đơn (Single-Port Hosting).

---

## 🛠 3. Chạy Chế Độ Phát Triển (Development Mode)

Dành cho lập trình viên muốn chỉnh sửa giao diện và logic hệ thống với tính năng Hot-Reload:

### Bước 1: Khởi động Trạm phát máy tính (Desktop Host Server)
Mở **Terminal 1**:
```bash
cd desktop-host
npm install
npm run dev
```
- **Cổng lắng nghe:** `http://0.0.0.0:3000`
- **WebSocket:** `ws://0.0.0.0:3000/ws`
- **BLE GATT Service:** `SlideSync-Host` (UUID: `0000fe59-0000-1000-8000-00805f9b34fb`)

### Bước 2: Khởi động Giao diện Client (Vite Dev Server)
Mở **Terminal 2**:
```bash
cd mobile-client
npm install
npm run dev
```
- **Cổng giao diện:** `http://localhost:5173`
- Client sẽ tự động chuyển tiếp (proxy) các yêu cầu API và WebSocket sang cổng `3000`.

---

## 📦 4. Hướng Dẫn Đóng Gói Ứng Dụng

### 4.1. Đóng gói ứng dụng Windows `.exe` (Electron Portable)
NextS được cấu hình sẵn tệp `desktop-host/electron-main.js` bọc trọn gói Express server và giao diện điều khiển PC:

1. Cài đặt các gói hỗ trợ đóng gói Electron (chỉ cần chạy một lần):
   ```bash
   cd desktop-host
   npm install --save-dev electron electron-builder
   ```
2. Biên dịch giao diện web sang mã tĩnh:
   ```bash
   cd ../mobile-client
   npm run build
   ```
3. Chạy thử Electron trên máy:
   ```bash
   cd ../desktop-host
   npm run electron
   ```
4. Xuất file thực thi `.exe` độc lập (Portable):
   ```bash
   npm run build:exe
   ```
   *File `.exe` sẽ được tạo ra tại thư mục `desktop-host/dist/`.*

### 4.2. Đóng gói ứng dụng Android `.apk` (Capacitor)
NextS đã tích hợp sẵn tệp cấu hình `mobile-client/capacitor.config.json` hỗ trợ Bluetooth LE và WebP:

1. Di chuyển vào thư mục client và cài đặt Capacitor:
   ```bash
   cd mobile-client
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/bluetooth-le
   ```
2. Khởi tạo nền tảng Android:
   ```bash
   npm run build
   npx cap add android
   ```
3. Mở file `mobile-client/android/app/src/main/AndroidManifest.xml` và đảm bảo các quyền Bluetooth sau đã được thêm:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
   <uses-permission android:name="android.permission.BLUETOOTH" />
   <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
   <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   ```
4. Đồng bộ mã nguồn và mở bằng Android Studio:
   ```bash
   npx cap sync android
   npx cap open android
   ```
   *Trong Android Studio, chọn **Build > Build Bundle(s) / APK(s) > Build APK(s)** để xuất file `.apk` cài đặt lên điện thoại.*

### 4.3. Cài đặt dạng PWA Toàn màn hình (Không cần cài APK)
- Trên trình duyệt Chrome hoặc Safari của điện thoại, sau khi quét mã QR vào trang web NextS:
  - **Android (Chrome):** Nhấn menu 3 chấm góc trên bên phải > Chọn **"Thêm vào Màn hình chính" (Add to Home screen)** hoặc **"Cài đặt ứng dụng"**.
  - **iOS (Safari):** Nhấn nút **Chia sẻ (Share)** ở thanh dưới > Chọn **"Thêm vào MH chính" (Add to Home Screen)**.
- Khi mở từ màn hình chính, NextS sẽ hoạt động như một ứng dụng native toàn màn hình (Fullscreen Standalone), ẩn hoàn toàn thanh địa chỉ trình duyệt và hỗ trợ khoá màn hình không bị tắt (Screen Wake Lock).

---

## 🎯 5. Mẹo Kết Nối Thực Chiến Trên Giảng Đường & Hội Thảo

Khi thuyết trình tại hội trường, giảng đường hoặc phòng họp có mạng Wi-Fi yếu, chặn cổng LAN (Client Isolation) hoặc không có mạng Internet:

### 🔥 Cách 1: Điểm phát sóng di động (Mobile Hotspot) — Tốc độ cao nhất
> **Khuyên dùng:** Không tốn dung lượng 4G, tốc độ đồng bộ tức thì, hiển thị đầy đủ ảnh slide WebP sắc nét!
1. Trên điện thoại Android/iPhone: Bật **Điểm phát sóng di động (Personal Hotspot)** (bạn có thể tắt mạng 4G/LTE để không tốn data).
2. Trên Laptop: Kết nối vào Wi-Fi do điện thoại vừa phát ra.
3. Chạy `Start-NextS.bat` trên Laptop. NextS sẽ tự động nhận diện địa chỉ IP của mạng Hotspot (thường là `192.168.43.x` hoặc `172.20.10.x`).
4. Quét mã QR trên màn hình laptop bằng điện thoại. Kết nối hoàn tất chỉ trong 1 giây!

### 📡 Cách 2: Chế độ Bluetooth Low Energy (BLE) — Dự phòng không cần Wi-Fi
> **Khuyên dùng:** Khi máy tính bị cấm kết nối Wi-Fi ngoài hoặc trong phòng không cho phép phát sóng Wi-Fi.
1. Bật Bluetooth trên cả Laptop và Điện thoại.
2. Trên màn hình NextS máy tính: Tại Cột 1, bật công tắc **"Phát sóng BLE (GATT)"**.
3. Trên điện thoại: Nhấn vào biểu tượng Trạng thái kết nối góc trên bên trái > Chọn tab **"Bluetooth BLE"** > Bấm **"Quét & Kết nối BLE"**.
4. Chọn trạm `SlideSync-Host`. Hệ thống sẽ tự động chuyển sang chế độ **Bandwidth-Aware Sync** (tự ẩn ảnh Thumbnail nặng, chỉ truyền tiêu đề ngắn và chữ kịch bản) với độ trễ phản hồi cực thấp (< 25ms trong cự ly 2–5 mét).

---

## 📂 6. Cấu Trúc Thư Mục Dự Án

```text
NextS/
├── .agents/                      # Cấu hình AI Agent Skills (ui-ux-pro-max, frontend-design)
├── desktop-host/                 # Trạm phát máy tính & Bộ điều khiển phím Windows
│   ├── parsers/                  # Bộ phân tích file kịch bản (.docx, .txt) và slide (.pptx)
│   │   └── docSlideParser.js
│   ├── bleServer.js              # Trạm phát sóng Bluetooth Low Energy (GATT Server)
│   ├── electron-main.js          # Bộ bọc cửa sổ thực thi Windows Electron (.exe)
│   ├── keyController.js          # Bộ gửi tín hiệu phím PowerShell không cần Driver C++
│   ├── mockData.js               # Dữ liệu bài thuyết trình mẫu mặc định
│   ├── networkUtils.js           # Bộ quét adapter mạng (Hotspot, Wi-Fi, Ethernet)
│   ├── package.json
│   └── server.js                 # Máy chủ Express, WebSocket và Static Host
├── mobile-client/                # Giao diện Máy nhắc chữ (Teleprompter) & Dashboard
│   ├── public/
│   │   └── manifest.json         # Cấu hình Web PWA Standalone
│   ├── src/
│   │   ├── components/           # Các thành phần giao diện React
│   │   │   ├── ConnectionModal.jsx
│   │   │   ├── DesktopDashboard.jsx
│   │   │   ├── ImportModal.jsx
│   │   │   ├── MiniFloatingPill.jsx
│   │   │   ├── QuickEditModal.jsx
│   │   │   ├── SavedProjectsModal.jsx  # Kho bài lưu Offline & Quản lý .nexts.json
│   │   │   ├── ScriptSwipePager.jsx    # Vuốt kịch bản & vạch quang học chuyển slide
│   │   │   ├── SettingsModal.jsx       # Cài đặt cỡ chữ, tốc độ cuộn, phím, AI Prompt
│   │   │   ├── SlideSidebar.jsx        # Danh sách thumbnail slide tỷ lệ 1/5
│   │   │   └── TopBar.jsx
│   │   ├── constants/            # Mẫu chuẩn Prompt AI kịch bản thuyết trình
│   │   ├── context/
│   │   │   └── AppContext.jsx    # Quản lý trạng thái toàn cục & Kho bài lưu
│   │   ├── services/             # Bộ điều phối kết nối WebSocket & Bluetooth LE
│   │   │   ├── BleAdapter.js
│   │   │   └── ConnectionManager.js
│   │   ├── utils/                # Bộ xử lý file PDF/PPTX tại client và Parser
│   │   ├── App.jsx
│   │   ├── index.css             # Hệ màu động tuân thủ CSS Custom Properties
│   │   └── main.jsx
│   ├── capacitor.config.json     # Cấu hình đóng gói Android APK
│   ├── package.json
│   └── vite.config.js
├── ARCHITECTURE.md               # Đặc tả kỹ thuật giao thức đồng bộ & cấu trúc dữ liệu
├── package.json                  # Script điều phối toàn bộ dự án (Root Orchestrator)
├── Start-NextS.bat               # Trình kích hoạt 1-click trên hệ điều hành Windows
└── README.md                     # Tài liệu hướng dẫn sử dụng tiếng Việt
```

---

## 📄 7. Đặc Tả Kiến Trúc & Giao Thức
Chi tiết về định dạng gói tin WebSocket, cơ chế phân mảnh Bluetooth LE MTU, thuật toán chống lệch slide (Anti-Desync), và quy chuẩn dữ liệu `PresentationData` được trình bày đầy đủ tại tài liệu kỹ thuật:
👉 **[Xem ARCHITECTURE.md](ARCHITECTURE.md)**
