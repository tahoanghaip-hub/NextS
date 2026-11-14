import React from 'react';
import {
  Wifi,
  WifiOff,
  Bluetooth,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Presentation,
  CheckCircle,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function MiniFloatingPill({ onOpenSettingsModal }) {
  const {
    presentationData,
    connectionStatus,
    formattedTimer,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    stepSlide,
    adjustDesync,
    setViewMode,
    goToSlide
  } = useApp();

  const isConnected = connectionStatus.connected;
  const mode = connectionStatus.mode;
  const currentSlide = presentationData.currentSlide || 1;
  const totalSlides = presentationData.totalSlides || 1;
  const activeSlideObj =
    presentationData.slides?.find((s) => s.slideNumber === currentSlide) || null;

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 theme-bg-app theme-text-primary select-none overflow-hidden">
      {/* --------------------------------------------------------- */}
      {/* Background Presentation Mode Canvas                       */}
      {/* --------------------------------------------------------- */}
      <div className="max-w-xl w-full p-6 sm:p-8 rounded-3xl theme-bg-surface border theme-border shadow-2xl space-y-6 text-center animate-fadeIn relative z-10">
        {/* Active Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Chế Độ Thuyết Trình Đang Hoạt Động (Mode B)</span>
        </div>

        {/* Current Presentation Snapshot */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black theme-text-primary tracking-tight">
            {presentationData.title || 'Bài thuyết trình NextS'}
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed max-w-md mx-auto">
            Cửa sổ điều khiển máy tính đã được tối ưu thu nhỏ. Hãy bật cửa sổ <strong>PowerPoint, Google Slides hoặc PDF</strong> lên toàn màn hình để bắt đầu trình chiếu trước khán giả.
          </p>
        </div>

        {/* Live Presentation Status Card */}
        <div className="p-4 rounded-2xl theme-bg-elevated theme-border border space-y-3 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Slide Hiện Tại Trên Máy Chiếu:
            </span>
            <span className="text-xs font-mono font-extrabold text-blue-400">
              Slide {currentSlide} / {totalSlides}
            </span>
          </div>

          <div className="p-3 rounded-xl theme-bg-surface border theme-border">
            <span className="text-xs font-bold theme-text-primary block">
              {activeSlideObj?.title || `Slide ${currentSlide}`}
            </span>
            <p className="text-xs theme-text-secondary mt-1 line-clamp-2 leading-relaxed">
              {activeSlideObj?.scriptContent || '(Không có kịch bản)'}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs theme-text-secondary pt-1">
            <div className="flex items-center space-x-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: isConnected
                    ? mode === 'BLE'
                      ? 'var(--accent-primary)'
                      : 'var(--success-color)'
                    : 'var(--danger-color)'
                }}
              />
              <span>
                {isConnected
                  ? mode === 'BLE'
                    ? 'Đồng bộ qua BLE'
                    : 'Đồng bộ qua Wi-Fi'
                  : 'Chưa có điện thoại kết nối'}
              </span>
            </div>

            <div className="font-mono font-bold theme-text-primary">
              Thời gian: {formattedTimer}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setViewMode('DESKTOP')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-md flex items-center justify-center space-x-2"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Maximize2 className="w-4 h-4" />
            <span>Mở Lại Toàn Màn Hình Dashboard</span>
          </button>

          <button
            onClick={() => setViewMode('MOBILE')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-85 transition flex items-center justify-center space-x-1.5"
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>Xem Teleprompter Điện Thoại</span>
          </button>
        </div>

        {/* Tip Box */}
        <div className="text-[11px] theme-text-muted flex items-center justify-center space-x-1 pt-1">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Nhãn nổi thu nhỏ (Mini Floating Pill) luôn ghim ở góc dưới bên phải màn hình.</span>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 2. MINI FLOATING PILL OVERLAY (fixed bottom-4 right-4)    */}
      {/* --------------------------------------------------------- */}
      <aside
        className="fixed bottom-4 right-4 z-50 rounded-full px-4 py-2.5 shadow-2xl border theme-border flex items-center gap-3 backdrop-blur-md transition-all duration-200 hover:opacity-100 opacity-90"
        style={{
          backgroundColor: 'var(--bg-glass)',
          color: 'var(--text-primary)'
        }}
      >
        {/* 1. Connection Status Dot */}
        <div className="flex items-center space-x-1" title={isConnected ? `Đã kết nối (${mode})` : 'Offline'}>
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: isConnected
                ? mode === 'BLE'
                  ? 'var(--accent-primary)'
                  : 'var(--success-color)'
                : 'var(--danger-color)'
            }}
          />
        </div>

        {/* 2. Slide Counter */}
        <div className="text-xs font-extrabold tracking-tight theme-text-primary whitespace-nowrap">
          Slide {currentSlide}/{totalSlides}
        </div>

        {/* 3. Live Timer */}
        <div className="flex items-center space-x-1 font-mono text-xs font-bold theme-text-secondary pl-1 border-l theme-border">
          <button
            onClick={isTimerRunning ? pauseTimer : startTimer}
            className="p-0.5 rounded hover:opacity-80 focus:outline-none"
            title={isTimerRunning ? 'Tạm dừng đồng hồ' : 'Chạy đồng hồ'}
          >
            {isTimerRunning ? (
              <Pause className="w-3 h-3 text-amber-400" />
            ) : (
              <Play className="w-3 h-3" style={{ color: 'var(--success-color)' }} />
            )}
          </button>
          <span>{formattedTimer}</span>
        </div>

        {/* 4. Quick Step Controls */}
        <div className="flex items-center space-x-1 pl-1 border-l theme-border">
          {/* Prev Slide (<) */}
          <button
            onClick={() => stepSlide('PREV')}
            title="Lùi 1 slide máy tính"
            className="p-1 rounded-full theme-bg-elevated theme-border border theme-text-primary hover:opacity-80 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Next Slide (>) */}
          <button
            onClick={() => stepSlide('NEXT')}
            title="Tiến 1 slide máy tính"
            className="p-1 rounded-full theme-bg-elevated theme-border border theme-text-primary hover:opacity-80 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Anti-Desync -1 Button */}
          <button
            onClick={() => adjustDesync(-1)}
            title="Bù lệch lùi -1 slide (không đổi kịch bản)"
            className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold theme-bg-elevated theme-border border text-amber-400 hover:opacity-80 transition"
          >
            -1
          </button>

          {/* Anti-Desync +1 Button */}
          <button
            onClick={() => adjustDesync(1)}
            title="Bù lệch tiến +1 slide (không đổi kịch bản)"
            className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold theme-bg-elevated theme-border border text-amber-400 hover:opacity-80 transition"
          >
            +1
          </button>
        </div>

        {/* 5. Expand Button (Maximize2) */}
        <div className="pl-1 border-l theme-border">
          <button
            onClick={() => setViewMode('DESKTOP')}
            title="Mở rộng lại Toàn màn hình Dashboard (Restore)"
            className="p-1.5 rounded-full text-white transition hover:opacity-90 shadow-sm"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </div>
  );
}
