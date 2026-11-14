import React, { useState } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  Bluetooth,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Sliders,
  HelpCircle,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ConnectionModal({ isOpen, onClose }) {
  const {
    connectionStatus,
    networkInfo,
    selectIp,
    stepSlide,
    adjustDesync,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('wifi');
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const handleCopyConnectUrl = async () => {
    if (!networkInfo.connectUrl) return;
    try {
      await navigator.clipboard.writeText(networkInfo.connectUrl);
      setCopiedUrl(true);
      showToast('Đã sao chép liên kết ghép nối!');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (e) {
      // Fallback copy
      try {
        const textarea = document.createElement('textarea');
        textarea.value = networkInfo.connectUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedUrl(true);
        showToast('Đã sao chép liên kết ghép nối!');
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch (err) {
        showToast('Không thể sao chép liên kết.');
      }
    }
  };

  const isConnected = connectionStatus.connected;
  const mode = connectionStatus.mode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="theme-bg-surface theme-text-primary theme-border border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto thin-scrollbar p-5 shadow-2xl flex flex-col space-y-5">
        {/* ----------------------------------------------------- */}
        {/* Header                                                 */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center justify-between border-b theme-border pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2 className="text-base sm:text-lg font-bold theme-text-primary">
                Ghép Nối & Trạng Thái Kết Nối
              </h2>
              <p className="text-xs theme-text-secondary">
                Đồng bộ thời gian thực giữa Điện thoại và Máy tính trình chiếu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-80 transition theme-bg-elevated theme-text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ----------------------------------------------------- */}
        {/* Connection Status Indicator Banner                     */}
        {/* ----------------------------------------------------- */}
        <div
          className="p-3 rounded-xl border flex items-center justify-between"
          style={{
            backgroundColor: isConnected
              ? mode === 'BLE'
                ? 'rgba(59, 130, 246, 0.12)'
                : 'rgba(16, 185, 129, 0.12)'
              : 'rgba(239, 68, 68, 0.12)',
            borderColor: isConnected
              ? mode === 'BLE'
                ? 'var(--accent-primary)'
                : 'var(--success-color)'
              : 'var(--danger-color)'
          }}
        >
          <div className="flex items-center space-x-2.5">
            {isConnected ? (
              mode === 'BLE' ? (
                <Bluetooth className="w-5 h-5 text-blue-500 animate-pulse" />
              ) : (
                <Wifi className="w-5 h-5" style={{ color: 'var(--success-color)' }} />
              )
            ) : (
              <WifiOff className="w-5 h-5" style={{ color: 'var(--danger-color)' }} />
            )}
            <div>
              <span
                className="text-xs font-bold block"
                style={{
                  color: isConnected
                    ? mode === 'BLE'
                      ? 'var(--accent-primary)'
                      : 'var(--success-color)'
                    : 'var(--danger-color)'
                }}
              >
                {isConnected
                  ? mode === 'BLE'
                    ? 'Đang kết nối qua Bluetooth BLE'
                    : 'Đang kết nối qua Wi-Fi LAN / Hotspot'
                  : 'Chưa kết nối đến máy tính (Offline)'}
              </span>
              <span className="text-[11px] theme-text-secondary">
                {isConnected
                  ? `Độ trễ tín hiệu: ${connectionStatus.latencyMs || '<5'}ms`
                  : 'Quét mã QR dưới đây bằng camera điện thoại để kết nối'}
              </span>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------- */}
        {/* Transport Mode Tabs (Wi-Fi vs Bluetooth BLE)           */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center space-x-2 border-b theme-border pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('wifi')}
            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
            style={{
              backgroundColor:
                activeTab === 'wifi'
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
              color: activeTab === 'wifi' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Wi-Fi LAN / Điểm phát Hotspot</span>
          </button>

          <button
            onClick={() => setActiveTab('ble')}
            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
            style={{
              backgroundColor:
                activeTab === 'ble'
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
              color: activeTab === 'ble' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>Bluetooth BLE (Milestone 5)</span>
          </button>
        </div>

        {/* ===================================================== */}
        {/* TAB 1: WI-FI / HOTSPOT PAIRING                        */}
        {/* ===================================================== */}
        {activeTab === 'wifi' && (
          <div className="space-y-4">
            {/* Live QR Code Preview */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl theme-bg-elevated theme-border border space-y-3">
              {networkInfo.qrDataUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                  <img
                    src={networkInfo.qrDataUrl}
                    alt="NextS Pairing QR Code"
                    className="w-44 h-44 object-contain"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 flex items-center justify-center rounded-2xl theme-bg-surface border theme-border">
                  <span className="text-xs theme-text-muted">Đang tải mã QR...</span>
                </div>
              )}

              <p className="text-xs text-center theme-text-secondary max-w-xs">
                Mở camera trên điện thoại và quét mã QR ở trên để mở giao diện điều khiển ngay lập tức.
              </p>
            </div>

            {/* Direct Connect URL Copy Box */}
            <div className="space-y-1">
              <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                Địa chỉ URL kết nối trực tiếp:
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  readOnly
                  value={networkInfo.connectUrl || 'Đang xác định địa chỉ IP...'}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-mono theme-bg-elevated theme-border border theme-text-primary select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyConnectUrl}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 flex items-center space-x-1 shrink-0 shadow-sm"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Network Adapter Dropdown */}
            {networkInfo.interfaces && networkInfo.interfaces.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                  Chọn card mạng máy tính (Network Interface):
                </label>
                <select
                  value={networkInfo.selectedIp}
                  onChange={(e) => selectIp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium theme-bg-elevated theme-border border theme-text-primary focus:outline-none cursor-pointer"
                >
                  {networkInfo.interfaces.map((iface) => (
                    <option key={iface.address} value={iface.address}>
                      {iface.name} — {iface.address}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Android Hotspot Advice Box */}
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1 text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-amber-400">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>Mẹo khi Wi-Fi hội trường / trường học bị chặn:</span>
              </div>
              <p className="theme-text-secondary leading-relaxed">
                Nếu mạng Wi-Fi công cộng chặn kết nối nội bộ cổng 3000, hãy bật <strong>Điểm phát sóng di động (Mobile Hotspot)</strong> trên điện thoại, sau đó kết nối máy tính vào mạng Hotspot này. Quá trình hoạt động 100% offline và không tiêu tốn dung lượng 4G/5G.
              </p>
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 2: BLUETOOTH BLE (PREPARED FOR MILESTONE 5)       */}
        {/* ===================================================== */}
        {activeTab === 'ble' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl theme-bg-elevated theme-border border space-y-3">
              <div className="flex items-center space-x-2">
                <Bluetooth className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold theme-text-primary">
                  Bluetooth Low Energy (BLE)
                </h3>
              </div>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Kiến trúc sẵn sàng cho <strong>Milestone 5</strong> với Web Bluetooth GATT Server / Client bridge. Cho phép điện thoại kết nối trực tiếp với máy tính Windows mà không cần chung mạng Wi-Fi, không cần router và không bị ảnh hưởng bởi tường lửa trường học.
              </p>
              <div className="p-3 rounded-lg theme-bg-surface border theme-border flex items-center justify-between text-xs">
                <span className="theme-text-secondary">Trạng thái BLE Adapter:</span>
                <span className="font-bold text-blue-400">Đã tích hợp giao diện trừu tượng</span>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------- */}
        {/* Diagnostic Test Bar at Bottom                         */}
        {/* ----------------------------------------------------- */}
        <div className="space-y-2 pt-2 border-t theme-border">
          <label className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider block">
            Kiểm tra phím giả lập trên máy tính (Test Keys):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            <button
              onClick={() => stepSlide('PREV')}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition flex items-center justify-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Test Lùi</span>
            </button>

            <button
              onClick={() => stepSlide('NEXT')}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition flex items-center justify-center space-x-1"
            >
              <span>Test Tiến</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => stepSlide('BLACKOUT')}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition flex items-center justify-center space-x-1"
            >
              <EyeOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Phím B</span>
            </button>

            <button
              onClick={() => adjustDesync(-1)}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition flex items-center justify-center space-x-1"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>-1 Lệch</span>
            </button>

            <button
              onClick={() => adjustDesync(1)}
              className="py-1.5 px-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition flex items-center justify-center space-x-1 col-span-2 sm:col-span-1"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>+1 Lệch</span>
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------- */}
        {/* Footer Close                                          */}
        {/* ----------------------------------------------------- */}
        <div className="flex justify-end pt-2 border-t theme-border shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
