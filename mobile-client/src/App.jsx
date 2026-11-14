import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  Play,
  Pause,
  RotateCcw,
  Lock,
  Unlock,
  Sun,
  Moon,
  Copy,
  Check,
  Tv,
  Sliders,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  HelpCircle,
  Maximize2,
  FileText,
  Sparkles,
  RefreshCw,
  Monitor,
  Smartphone,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useApp } from './context/AppContext';

export default function App() {
  const {
    settings,
    presentationData,
    connectionStatus,
    networkInfo,
    formattedTimer,
    isTimerRunning,
    toastMessage,
    showToast,
    selectIp,
    updateSetting,
    resetSettings,
    goToSlide,
    stepSlide,
    adjustDesync,
    toggleSyncLock,
    startPresentation,
    copyAiPromptConvention,
    startTimer,
    pauseTimer,
    resetTimer
  } = useApp();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qaAccordionOpen, setQaAccordionOpen] = useState(true);
  const [generalQaOpen, setGeneralQaOpen] = useState(false);

  const activeSlideIndex = (presentationData.currentSlide || 1) - 1;
  const currentSlideData = presentationData.slides?.[activeSlideIndex] || presentationData.slides?.[0];

  const handleCopyUrl = async () => {
    if (networkInfo.connectUrl) {
      try {
        await navigator.clipboard.writeText(networkInfo.connectUrl);
        setCopiedUrl(true);
        showToast('Đã sao chép liên kết ghép nối!');
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch (e) {
        showToast('Sao chép liên kết thất bại.');
      }
    }
  };

  return (
    <div className="min-h-screen theme-bg-app theme-text-primary flex flex-col antialiased">
      {/* --------------------------------------------------------- */}
      {/* Toast Notification Banner                                */}
      {/* --------------------------------------------------------- */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out">
          <div
            className="theme-bg-elevated theme-border border px-5 py-2.5 rounded-full shadow-2xl flex items-center space-x-2 text-sm font-medium"
            style={{ borderColor: 'var(--accent-primary)' }}
          >
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="theme-text-primary">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* Header Bar                                                */}
      {/* --------------------------------------------------------- */}
      <header className="theme-bg-surface theme-border border-b sticky top-0 z-40 px-4 lg:px-6 py-3 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Product Title */}
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              N
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight theme-text-primary">NextS</h1>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold border"
                  style={{
                    backgroundColor: 'var(--trigger-zone-bg)',
                    borderColor: 'var(--trigger-line-color)',
                    color: 'var(--trigger-line-color)'
                  }}
                >
                  Milestone 1
                </span>
              </div>
              <p className="text-xs theme-text-secondary hidden sm:block">
                Auto-Slide Teleprompter & Controller
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center space-x-2">
            <div
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold theme-border border"
              style={{
                backgroundColor: connectionStatus.connected
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
                color: connectionStatus.connected
                  ? 'var(--success-color)'
                  : 'var(--danger-color)'
              }}
            >
              {connectionStatus.connected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 animate-pulse" />
                  <span>WIFI Đã Kết Nối</span>
                  {connectionStatus.latencyMs > 0 && (
                    <span className="opacity-80">({connectionStatus.latencyMs}ms)</span>
                  )}
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Mất Kết Nối</span>
                </>
              )}
            </div>
          </div>

          {/* Center: Presentation Timer */}
          <div className="flex items-center space-x-2 theme-bg-elevated theme-border border px-3 py-1 rounded-xl">
            <span className="font-mono text-base font-bold tracking-wider theme-text-primary">
              {formattedTimer}
            </span>
            <div className="flex items-center space-x-1 pl-1 border-l theme-border">
              {isTimerRunning ? (
                <button
                  onClick={pauseTimer}
                  title="Tạm dừng thời gian"
                  className="p-1 rounded-lg hover:opacity-80 transition theme-text-secondary"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={startTimer}
                  title="Bắt đầu đếm thời gian"
                  className="p-1 rounded-lg hover:opacity-80 transition"
                  style={{ color: 'var(--success-color)' }}
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={resetTimer}
                title="Đặt lại thời gian"
                className="p-1 rounded-lg hover:opacity-80 transition theme-text-muted"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Actions Group */}
          <div className="flex items-center space-x-2">
            {/* Sync Lock Toggle */}
            <button
              onClick={toggleSyncLock}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold theme-border border transition hover:opacity-90"
              style={{
                backgroundColor: presentationData.isSyncLocked
                  ? 'rgba(59, 130, 246, 0.15)'
                  : 'var(--trigger-zone-bg)',
                borderColor: presentationData.isSyncLocked
                  ? 'var(--accent-primary)'
                  : 'var(--trigger-line-color)',
                color: presentationData.isSyncLocked
                  ? 'var(--accent-primary)'
                  : 'var(--trigger-line-color)'
              }}
              title="Khóa Đồng Bộ: Khi bật, việc cuộn hoặc chuyển slide sẽ tự động điều khiển máy chiếu"
            >
              {presentationData.isSyncLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Khóa Đồng Bộ</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Xem Tự Do</span>
                </>
              )}
            </button>

            {/* AI Prompt Convention Copy Button */}
            <button
              onClick={copyAiPromptConvention}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold theme-bg-elevated theme-border border hover:opacity-90 transition theme-text-primary"
              title="Sao chép quy ước định dạng prompt dành cho AI viết kịch bản"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
              <span className="hidden sm:inline">Copy AI Prompt</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg theme-bg-elevated theme-border border hover:opacity-90 transition theme-text-primary"
              title={settings.theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
            >
              {settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            {/* Start Presentation Button */}
            <button
              onClick={startPresentation}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:opacity-90 transition"
              style={{ backgroundColor: 'var(--accent-primary)' }}
              title="Bắt đầu thuyết trình và kích hoạt chế độ lấy nét cửa sổ trình chiếu"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Bắt đầu Trình Chiếu</span>
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------- */}
      {/* Main Two-Column Work Area                                 */}
      {/* --------------------------------------------------------- */}
      <main className="max-w-7xl mx-auto w-full p-4 lg:p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Pairing, Diagnostics & Settings (5 Cols)     */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Network & Pairing */}
          <section className="theme-bg-surface theme-border border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-base font-bold theme-text-primary">Ghép Nối Điện Thoại (QR)</h2>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md theme-bg-elevated theme-text-secondary">
                Không Cần Cài App
              </span>
            </div>

            {/* Network Adapter Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold theme-text-secondary">
                Card mạng kết nối (Ưu tiên Hotspot/Wi-Fi):
              </label>
              <div className="relative">
                <select
                  value={networkInfo.selectedIp || ''}
                  onChange={(e) => selectIp(e.target.value)}
                  className="w-full theme-bg-elevated theme-text-primary theme-border border rounded-xl px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-1"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  {networkInfo.interfaces && networkInfo.interfaces.length > 0 ? (
                    networkInfo.interfaces.map((net) => (
                      <option key={`${net.name}-${net.address}`} value={net.address}>
                        {net.label} ({net.address}) - {net.name}
                      </option>
                    ))
                  ) : (
                    <option value="127.0.0.1">Localhost (127.0.0.1)</option>
                  )}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 pointer-events-none theme-text-muted" />
              </div>
            </div>

            {/* QR Code & Connect URL Box */}
            <div className="flex flex-col sm:flex-row items-center gap-4 theme-bg-elevated theme-border border rounded-xl p-4">
              <div className="p-2 rounded-xl shadow-inner flex-shrink-0" style={{ backgroundColor: '#ffffff' }}>
                {networkInfo.qrDataUrl ? (
                  <img
                    src={networkInfo.qrDataUrl}
                    alt="Mã QR kết nối"
                    className="w-36 h-36 rounded-md object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center theme-text-muted text-xs">
                    Đang tạo mã QR...
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                <p className="text-xs font-semibold theme-text-secondary">
                  Dùng camera điện thoại quét mã QR hoặc mở liên kết:
                </p>
                <div className="flex items-center space-x-1.5 theme-bg-surface theme-border border rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-mono font-semibold truncate theme-text-primary flex-1">
                    {networkInfo.connectUrl || 'http://127.0.0.1:5173'}
                  </span>
                  <button
                    onClick={handleCopyUrl}
                    className="p-1 hover:opacity-80 transition theme-text-secondary"
                    title="Sao chép URL"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] theme-text-muted leading-tight">
                  Tự động đồng bộ hai chiều qua WebSocket. Khi máy tính phát Hotspot, điện thoại kết nối không cần Internet.
                </p>
              </div>
            </div>
          </section>

          {/* Card 2: Key Mapping & Direct Hardware Actions */}
          <section className="theme-bg-surface theme-border border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div className="flex items-center space-x-2">
                <Monitor className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-base font-bold theme-text-primary">Điều Khiển Phím Windows</h2>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md theme-bg-elevated theme-text-secondary">
                PowerShell Stdin Bridge
              </span>
            </div>

            {/* Keymap Mode Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold theme-text-secondary">
                Sơ đồ phím chiếu (Key Mapping Profile):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ARROWS', label: 'Mũi Tên (← / →)' },
                  { id: 'PAGEDOWN', label: 'PgDn / PgUp' },
                  { id: 'SPACE', label: 'Phím Cách (Space)' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => updateSetting('keyMapping', mode.id)}
                    className="py-2 px-2 text-xs font-semibold rounded-xl border transition text-center"
                    style={{
                      backgroundColor:
                        settings.keyMapping === mode.id
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'var(--bg-elevated)',
                      borderColor:
                        settings.keyMapping === mode.id
                          ? 'var(--accent-primary)'
                          : 'var(--border-subtle)',
                      color:
                        settings.keyMapping === mode.id
                          ? 'var(--accent-primary)'
                          : 'var(--text-secondary)'
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Step Controls */}
            <div className="space-y-2">
              <label className="text-xs font-semibold theme-text-secondary">
                Thử nghiệm phím bấm vật lý:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => stepSlide('PREV')}
                  className="flex items-center justify-center space-x-1 py-2.5 px-3 rounded-xl theme-bg-elevated theme-border border text-xs font-bold hover:opacity-85 transition theme-text-primary"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Lùi Slide</span>
                </button>
                <button
                  onClick={() => stepSlide('BLACKOUT')}
                  className="flex items-center justify-center space-x-1 py-2.5 px-3 rounded-xl theme-bg-elevated theme-border border text-xs font-bold hover:opacity-85 transition"
                  style={{ color: 'var(--trigger-line-color)' }}
                  title="Tắt đen màn hình máy chiếu (Phím b)"
                >
                  <CircleSlash className="w-4 h-4" />
                  <span>Tắt Đen (B)</span>
                </button>
                <button
                  onClick={() => stepSlide('NEXT')}
                  className="flex items-center justify-center space-x-1 py-2.5 px-3 rounded-xl theme-bg-elevated theme-border border text-xs font-bold hover:opacity-85 transition theme-text-primary"
                >
                  <span>Tiến Slide</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Anti-Desync Nudge Buttons */}
            <div className="theme-bg-elevated theme-border border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--trigger-line-color)' }}>
                  Nút Cứu Nguy: Bù Lệch Slide Máy Chiếu (Anti-Desync)
                </span>
                <span className="text-[10px] theme-text-muted">Không đổi kịch bản</span>
              </div>
              <p className="text-[11px] theme-text-secondary leading-tight">
                Nhấn khi máy chiếu chạy lệch so với kịch bản trên máy nhắc chữ (ví dụ do bấm nhầm chuột trên máy tính):
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => adjustDesync(-1)}
                  className="py-1.5 px-2 rounded-lg theme-bg-surface theme-border border text-xs font-bold hover:opacity-90 transition theme-text-secondary flex items-center justify-center space-x-1"
                >
                  <span>Bù Lệch: -1 Slide</span>
                </button>
                <button
                  onClick={() => adjustDesync(1)}
                  className="py-1.5 px-2 rounded-lg theme-bg-surface theme-border border text-xs font-bold hover:opacity-90 transition theme-text-secondary flex items-center justify-center space-x-1"
                >
                  <span>Bù Lệch: +1 Slide</span>
                </button>
              </div>
            </div>
          </section>

          {/* Card 3: Live Theme & Typography Customization */}
          <section className="theme-bg-surface theme-border border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-base font-bold theme-text-primary">Tinh Chỉnh Chữ & Giao Diện</h2>
              </div>
              <button
                onClick={resetSettings}
                className="text-xs font-semibold theme-text-muted hover:opacity-80 transition"
              >
                Mặc định
              </button>
            </div>

            {/* Font Size Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="theme-text-secondary">Cỡ chữ kịch bản:</span>
                <span className="theme-text-primary">{settings.fontSize} px</span>
              </div>
              <input
                type="range"
                min="16"
                max="36"
                step="1"
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Line Height Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="theme-text-secondary">Khoảng cách dòng:</span>
                <span className="theme-text-primary">{settings.lineHeight}x</span>
              </div>
              <input
                type="range"
                min="1.2"
                max="2.2"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) => updateSetting('lineHeight', Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* Trigger Position Selection */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold theme-text-secondary">
                Vị trí vạch kích hoạt chuyển slide:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 15, label: '15% (Đỉnh)' },
                  { value: 33, label: '33% (Khuyên dùng)' },
                  { value: 50, label: '50% (Giữa)' }
                ].map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => updateSetting('triggerPosition', pos.value)}
                    className="py-1.5 text-xs font-semibold rounded-xl border transition"
                    style={{
                      backgroundColor:
                        settings.triggerPosition === pos.value
                          ? 'var(--trigger-zone-bg)'
                          : 'var(--bg-elevated)',
                      borderColor:
                        settings.triggerPosition === pos.value
                          ? 'var(--trigger-line-color)'
                          : 'var(--border-subtle)',
                      color:
                        settings.triggerPosition === pos.value
                          ? 'var(--trigger-line-color)'
                          : 'var(--text-secondary)'
                    }}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 space-y-2 border-t theme-border text-xs font-medium">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="theme-text-secondary">Lật gương chữ (Mirror Mode cho kính quang):</span>
                <input
                  type="checkbox"
                  checked={settings.mirrorMode}
                  onChange={(e) => updateSetting('mirrorMode', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="theme-text-secondary">Giữ màn hình luôn sáng (Screen WakeLock):</span>
                <input
                  type="checkbox"
                  checked={settings.keepAwake}
                  onChange={(e) => updateSetting('keepAwake', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="theme-text-secondary">Tự động trả focus khi bắt đầu (Alt+Esc):</span>
                <input
                  type="checkbox"
                  checked={settings.autoMinimizeOnStart}
                  onChange={(e) => updateSetting('autoMinimizeOnStart', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                />
              </label>
            </div>
          </section>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Slide Deck & Teleprompter Stage (7 Cols)   */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Slide Deck Strip / Selector */}
          <section className="theme-bg-surface theme-border border rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-base font-bold theme-text-primary">
                  Bộ Slide ({presentationData.slides?.length || 0} trang)
                </h2>
              </div>
              <span className="text-xs font-semibold theme-text-secondary">
                Slide hiện tại: <span className="theme-text-primary font-bold">{presentationData.currentSlide}</span> / {presentationData.totalSlides}
              </span>
            </div>

            {/* Slide Navigation Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {presentationData.slides?.map((slide) => {
                const isActive = presentationData.currentSlide === slide.slideNumber;
                return (
                  <button
                    key={slide.slideNumber}
                    onClick={() => goToSlide(slide.slideNumber)}
                    className="p-2.5 rounded-xl border text-left transition flex flex-col justify-between"
                    style={{
                      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-elevated)',
                      borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      boxShadow: isActive ? '0 0 0 1px var(--accent-primary)' : 'none'
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className="text-xs font-extrabold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          color: isActive ? '#ffffff' : 'var(--text-secondary)'
                        }}
                      >
                        Slide {slide.slideNumber}
                      </span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent-primary)' }} />
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate mt-1 theme-text-primary">
                      {slide.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Teleprompter Stage */}
          <section className="theme-bg-surface theme-border border rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
            {/* Visual Trigger Line Indicator */}
            <div
              className="absolute left-0 right-0 pointer-events-none z-10 flex items-center"
              style={{
                top: `${settings.triggerPosition}%`,
                borderTop: '2px dashed var(--trigger-line-color)'
              }}
            >
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-r shadow-md ml-2"
                style={{
                  backgroundColor: 'var(--trigger-line-color)',
                  color: '#ffffff'
                }}
              >
                Vạch kích hoạt chuyển slide ({settings.triggerPosition}%)
              </span>
            </div>

            {/* Stage Header */}
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                  Slide {currentSlideData?.slideNumber || 1}
                </span>
                <h3 className="text-xl font-bold theme-text-primary">
                  {currentSlideData?.title || 'Chưa có tiêu đề'}
                </h3>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => stepSlide('PREV')}
                  disabled={presentationData.currentSlide <= 1}
                  className="p-2 rounded-xl theme-bg-elevated theme-border border hover:opacity-80 disabled:opacity-40 transition theme-text-primary"
                  title="Slide trước"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => stepSlide('NEXT')}
                  disabled={presentationData.currentSlide >= presentationData.totalSlides}
                  className="p-2 rounded-xl theme-bg-elevated theme-border border hover:opacity-80 disabled:opacity-40 transition theme-text-primary"
                  title="Slide tiếp theo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Script Text Body with Typography & Mirror Support */}
            <div className="py-4">
              <div
                className={`script-typography theme-text-primary transition-all duration-200 select-text leading-relaxed ${
                  settings.mirrorMode ? 'mirror-x' : ''
                }`}
                style={{
                  minHeight: '220px'
                }}
              >
                {currentSlideData?.scriptContent || 'Chưa có nội dung kịch bản cho slide này.'}
              </div>
            </div>

            {/* Contextual Q&A Card for this slide */}
            {currentSlideData?.qaContent && (
              <div className="theme-bg-elevated theme-border border rounded-xl overflow-hidden mt-4">
                <button
                  onClick={() => setQaAccordionOpen(!qaAccordionOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:opacity-90 transition"
                >
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-xs font-bold theme-text-primary">
                      Câu hỏi phản biện & Kiến thức mở rộng (Slide {currentSlideData.slideNumber})
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 theme-text-muted transition-transform duration-200 ${
                      qaAccordionOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {qaAccordionOpen && (
                  <div className="px-4 pb-4 text-xs whitespace-pre-line theme-text-secondary leading-relaxed border-t theme-border pt-3">
                    {currentSlideData.qaContent}
                  </div>
                )}
              </div>
            )}

            {/* General Presentation Q&A Section */}
            {presentationData.generalQA && (
              <div className="theme-bg-elevated theme-border border rounded-xl overflow-hidden">
                <button
                  onClick={() => setGeneralQaOpen(!generalQaOpen)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:opacity-90 transition"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold theme-text-primary">
                      Tổng hợp câu hỏi phản biện chung toàn bài ([Q&A Chung])
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 theme-text-muted transition-transform duration-200 ${
                      generalQaOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {generalQaOpen && (
                  <div className="px-4 pb-4 text-xs whitespace-pre-line theme-text-secondary leading-relaxed border-t theme-border pt-3">
                    {presentationData.generalQA}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* --------------------------------------------------------- */}
      {/* Footer                                                    */}
      {/* --------------------------------------------------------- */}
      <footer className="theme-bg-surface theme-border border-t py-3 px-4 text-center text-xs theme-text-muted transition-colors">
        <p>
          NextS Auto-Slide Teleprompter & Controller • Milestone 1 Architecture & Dual-Transport State Engine
        </p>
      </footer>
    </div>
  );
}
