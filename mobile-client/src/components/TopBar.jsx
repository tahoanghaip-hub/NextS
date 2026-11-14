import React from 'react';
import {
  Wifi,
  WifiOff,
  Bluetooth,
  FileUp,
  Lock,
  Unlock,
  Play,
  Pause,
  RotateCcw,
  Edit3,
  Settings,
  Monitor
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function TopBar({
  onOpenConnectionModal,
  onOpenQuickEditModal,
  onOpenSettingsModal,
  onOpenImportModal
}) {
  const {
    presentationData,
    connectionStatus,
    formattedTimer,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    toggleSyncLock,
    startPresentation,
    setViewMode
  } = useApp();

  const isConnected = connectionStatus.connected;
  const mode = connectionStatus.mode;

  // Handler for import button
  const handleImportClick = () => {
    if (onOpenImportModal) {
      onOpenImportModal();
    } else if (onOpenQuickEditModal) {
      onOpenQuickEditModal('import');
    }
  };

  return (
    <header className="h-[52px] px-2 sm:px-3 flex items-center justify-between border-b theme-border theme-bg-surface select-none z-30 relative shrink-0">
      {/* ----------------------------------------------------- */}
      {/* Far Left: Connection Status Button                     */}
      {/* ----------------------------------------------------- */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={onOpenConnectionModal}
          title="Xem trạng thái kết nối & Ghép nối QR"
          className="flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-semibold theme-border border transition hover:opacity-80"
          style={{
            backgroundColor: isConnected
              ? mode === 'BLE'
                ? 'rgba(59, 130, 246, 0.12)'
                : 'rgba(16, 185, 129, 0.12)'
              : 'rgba(239, 68, 68, 0.12)',
            color: isConnected
              ? mode === 'BLE'
                ? 'var(--accent-primary)'
                : 'var(--success-color)'
              : 'var(--danger-color)'
          }}
        >
          {isConnected ? (
            mode === 'BLE' ? (
              <>
                <Bluetooth className="w-3.5 h-3.5 animate-pulse" />
                <span>BLE</span>
              </>
            ) : (
              <>
                <span
                  className="w-2 h-2 rounded-full animate-ping mr-0.5"
                  style={{ backgroundColor: 'var(--success-color)' }}
                />
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Wi-Fi</span>
              </>
            )
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
            </>
          )}
        </button>
      </div>

      {/* ----------------------------------------------------- */}
      {/* Center Action Group                                    */}
      {/* ----------------------------------------------------- */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
        {/* Import Button */}
        <button
          onClick={handleImportClick}
          title="Dán nhanh kịch bản từ AI / Word"
          className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition"
        >
          <FileUp className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Import</span>
        </button>

        {/* Sync Lock Toggle Button */}
        <button
          onClick={toggleSyncLock}
          title={
            presentationData.isSyncLocked
              ? 'Đang khóa đồng bộ với máy chiếu (Bấm để xem tự do)'
              : 'Đang xem tự do không đổi slide máy tính (Bấm để bật đồng bộ)'
          }
          className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold theme-border border transition"
          style={{
            backgroundColor: presentationData.isSyncLocked
              ? 'rgba(59, 130, 246, 0.2)'
              : 'transparent',
            borderColor: presentationData.isSyncLocked
              ? 'var(--accent-primary)'
              : 'var(--border-subtle)',
            color: presentationData.isSyncLocked
              ? 'var(--accent-primary)'
              : 'var(--text-secondary)'
          }}
        >
          {presentationData.isSyncLocked ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Đồng bộ: BẬT</span>
              <span className="md:hidden">Khóa</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Xem tự do</span>
              <span className="md:hidden">Tự do</span>
            </>
          )}
        </button>

        {/* Start Presentation Button */}
        <button
          onClick={startPresentation}
          title="Bắt đầu thuyết trình & Thu nhỏ cửa sổ máy tính"
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Bắt đầu</span>
        </button>

        {/* Timer Pill */}
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg theme-border border theme-bg-elevated">
          <button
            onClick={isTimerRunning ? pauseTimer : startTimer}
            title={isTimerRunning ? 'Tạm dừng đồng hồ' : 'Chạy đồng hồ'}
            className="flex items-center space-x-1 focus:outline-none"
          >
            {isTimerRunning ? (
              <Pause className="w-3 h-3 text-amber-400" />
            ) : (
              <Play className="w-3 h-3" style={{ color: 'var(--success-color)' }} />
            )}
            <span className="font-mono text-xs font-bold theme-text-primary tracking-wide">
              {formattedTimer}
            </span>
          </button>
          <button
            onClick={resetTimer}
            title="Đặt lại đồng hồ về 00:00"
            className="p-0.5 rounded hover:opacity-75 theme-text-muted"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Quick Edit Button */}
        <button
          onClick={() => onOpenQuickEditModal && onOpenQuickEditModal('structured')}
          title="Chỉnh sửa nhanh kịch bản & Q&A"
          className="flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-medium theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Sửa nhanh</span>
        </button>
      </div>

      {/* ----------------------------------------------------- */}
      {/* Far Right: PC View Switcher & Settings Buttons        */}
      {/* ----------------------------------------------------- */}
      <div className="flex items-center space-x-1 pl-1">
        <button
          onClick={() => setViewMode('DESKTOP')}
          title="Chuyển sang Giao diện Bàn làm việc PC (PC Dashboard)"
          className="p-1.5 rounded-lg theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition"
        >
          <Monitor className="w-4 h-4 text-blue-400" />
        </button>

        <button
          onClick={onOpenSettingsModal}
          title="Cài đặt máy nhắc chữ & Prompt AI"
          className="p-1.5 rounded-lg theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
