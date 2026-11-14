import React, { useState, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  Bluetooth,
  Sliders,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Sun,
  Moon,
  Smartphone,
  Minimize2,
  FileText,
  Presentation,
  Globe,
  Plus,
  Trash2,
  Edit3,
  Save,
  Clock,
  Layers,
  UploadCloud,
  FileCheck,
  Sparkles,
  Lock,
  Unlock,
  MessageSquare,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  parseConventionTextToPresentationData,
  extractGoogleDocId
} from '../utils/parser';

export default function DesktopDashboard({
  onOpenSettingsModal,
  onOpenImportModal,
  onOpenQuickEditModal
}) {
  const {
    settings,
    presentationData,
    connectionStatus,
    networkInfo,
    timerSeconds,
    isTimerRunning,
    formattedTimer,
    importStats,
    selectIp,
    updateSetting,
    goToSlide,
    stepSlide,
    adjustDesync,
    toggleSyncLock,
    updateScriptData,
    resetToMockData,
    startPresentation,
    copyAiPromptConvention,
    startTimer,
    pauseTimer,
    resetTimer,
    setViewMode,
    showToast
  } = useApp();

  // Column 1 Local States
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [bleBroadcasting, setBleBroadcasting] = useState(true);

  // Column 2 Local States
  const [gdocUrl, setGdocUrl] = useState('');
  const [gdocLoading, setGdocLoading] = useState(false);
  const [scriptFileBadge, setScriptFileBadge] = useState(null);
  const [deckFileBadge, setDeckFileBadge] = useState(null);
  const [dragOverScript, setDragOverScript] = useState(false);
  const [dragOverDeck, setDragOverDeck] = useState(false);

  const scriptInputRef = useRef(null);
  const deckInputRef = useRef(null);

  // Column 3 Local States
  const [column3Tab, setColumn3Tab] = useState('slides'); // 'slides' | 'general_qa'
  const [editingSlideNumber, setEditingSlideNumber] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    scriptContent: '',
    qaContent: ''
  });
  const [generalQaDraft, setGeneralQaDraft] = useState(presentationData.generalQA || '');
  const [isEditingGeneralQa, setIsEditingGeneralQa] = useState(false);

  const isConnected = connectionStatus.connected;
  const currentSlide = presentationData.currentSlide || 1;
  const totalSlides = presentationData.totalSlides || 1;

  // -------------------------------------------------------------
  // Column 1 Handlers: QR & Key Emulation
  // -------------------------------------------------------------
  const handleCopyConnectUrl = async () => {
    if (!networkInfo.connectUrl) return;
    try {
      await navigator.clipboard.writeText(networkInfo.connectUrl);
      setCopiedUrl(true);
      showToast('Đã sao chép link kết nối!');
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
        showToast('Đã sao chép link kết nối!');
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch (err) {
        showToast('Không thể sao chép liên kết.');
      }
    }
  };

  // -------------------------------------------------------------
  // Column 2 Handlers: File Drops & GDoc Import
  // -------------------------------------------------------------
  const processScriptFile = async (file) => {
    if (!file) return;
    setScriptFileBadge({ name: file.name, size: file.size });

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      try {
        const text = await file.text();
        const baseTitle = file.name.replace(/\.[^/.]+$/, '');
        const parsed = parseConventionTextToPresentationData(text, baseTitle);
        updateScriptData(parsed);
        showToast(`Đã nạp thành công ${parsed.totalSlides} slides từ ${file.name}!`);
      } catch (err) {
        showToast(`Lỗi đọc file kịch bản: ${err.message}`);
      }
    } else if (fileName.endsWith('.docx')) {
      showToast(`Đã nhận file Word: ${file.name}. Sẵn sàng bóc tách kịch bản.`);
      // Prepare form data for server
      const formData = new FormData();
      formData.append('file', file);
      try {
        await fetch('/api/parse-files', { method: 'POST', body: formData });
      } catch (e) {
        // Fallback
      }
    } else {
      showToast('Định dạng kịch bản không hợp lệ (.docx, .txt, .md).');
    }
  };

  const processDeckFile = (file) => {
    if (!file) return;
    setDeckFileBadge({ name: file.name, size: file.size });
    showToast(`Đã nhận file trình chiếu ${file.name} (Milestone 4 Extractor ready)`);
  };

  const handleScriptDrop = (e) => {
    e.preventDefault();
    setDragOverScript(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processScriptFile(file);
  };

  const handleDeckDrop = (e) => {
    e.preventDefault();
    setDragOverDeck(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processDeckFile(file);
  };

  const handleFetchGDoc = async () => {
    if (!gdocUrl.trim()) {
      showToast('Vui lòng nhập link Google Docs.');
      return;
    }
    const docId = extractGoogleDocId(gdocUrl);
    if (!docId) {
      showToast('Đường link không chứa Google Doc ID hợp lệ.');
      return;
    }

    setGdocLoading(true);
    try {
      let rawText = '';
      try {
        const res = await fetch(`/api/fetch-google-doc?url=${encodeURIComponent(gdocUrl)}`);
        if (res.ok) {
          const data = await res.json();
          rawText = data.rawText;
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Lỗi tải: ${res.status}`);
        }
      } catch (proxyErr) {
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        const directRes = await fetch(exportUrl);
        if (!directRes.ok) throw new Error('Không thể tải Google Docs trực tiếp.');
        rawText = await directRes.text();
      }

      if (rawText && rawText.trim()) {
        const parsed = parseConventionTextToPresentationData(rawText, 'Google Docs Kịch bản');
        updateScriptData(parsed);
        showToast(`Đã nạp ${parsed.totalSlides} slides từ Google Docs!`);
        setGdocUrl('');
      } else {
        showToast('Tài liệu Google Docs trống.');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi nạp Google Docs');
    } finally {
      setGdocLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Column 3 Handlers: Inline Slide Editing & Management
  // -------------------------------------------------------------
  const handleStartEditSlide = (slide) => {
    setEditingSlideNumber(slide.slideNumber);
    setEditFormData({
      title: slide.title || '',
      scriptContent: slide.scriptContent || '',
      qaContent: slide.qaContent || ''
    });
  };

  const handleCancelEditSlide = () => {
    setEditingSlideNumber(null);
  };

  const handleSaveInlineSlide = (slideNumber) => {
    const updatedSlides = presentationData.slides.map((s) => {
      if (s.slideNumber === slideNumber) {
        return {
          ...s,
          title: editFormData.title.trim() || `Slide ${slideNumber}`,
          scriptContent: editFormData.scriptContent,
          qaContent: editFormData.qaContent
        };
      }
      return s;
    });

    const newDeck = {
      ...presentationData,
      slides: updatedSlides,
      updatedAt: Date.now()
    };

    updateScriptData(newDeck);
    setEditingSlideNumber(null);
    showToast(`Đã lưu Slide ${slideNumber} và đồng bộ sang điện thoại!`);
  };

  const handleAddNewSlide = () => {
    const newSlideNumber = presentationData.slides.length + 1;
    const newSlide = {
      slideNumber: newSlideNumber,
      title: `Tiêu đề slide ${newSlideNumber}`,
      scriptContent: 'Nội dung kịch bản cho slide mới...',
      qaContent: '',
      thumbnailBase64: null
    };

    const updatedSlides = [...presentationData.slides, newSlide];
    const newDeck = {
      ...presentationData,
      totalSlides: updatedSlides.length,
      slides: updatedSlides,
      updatedAt: Date.now()
    };

    updateScriptData(newDeck);
    showToast(`Đã thêm Slide ${newSlideNumber}!`);
  };

  const handleDeleteSlide = (slideNumberToDelete) => {
    if (presentationData.slides.length <= 1) {
      showToast('Bài thuyết trình phải có tối thiểu 1 slide!');
      return;
    }

    const filtered = presentationData.slides.filter(
      (s) => s.slideNumber !== slideNumberToDelete
    );
    const renumbered = filtered.map((s, idx) => ({
      ...s,
      slideNumber: idx + 1
    }));

    const newDeck = {
      ...presentationData,
      totalSlides: renumbered.length,
      slides: renumbered,
      currentSlide: Math.min(presentationData.currentSlide, renumbered.length),
      updatedAt: Date.now()
    };

    updateScriptData(newDeck);
    if (editingSlideNumber === slideNumberToDelete) {
      setEditingSlideNumber(null);
    }
    showToast(`Đã xóa Slide ${slideNumberToDelete}`);
  };

  const handleSaveGeneralQa = () => {
    const newDeck = {
      ...presentationData,
      generalQA: generalQaDraft,
      updatedAt: Date.now()
    };
    updateScriptData(newDeck);
    setIsEditingGeneralQa(false);
    showToast('Đã lưu nội dung [Q&A Chung]!');
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden theme-bg-app theme-text-primary select-none">
      {/* ======================================================= */}
      {/* 1. TOP HEADER BAR (h-14 px-5 border-b theme-border)     */}
      {/* ======================================================= */}
      <header className="h-14 px-4 sm:px-5 border-b theme-border theme-bg-surface flex items-center justify-between shrink-0 z-20">
        {/* Left: App Logo & Connection Badge */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-md"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              N
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-sm tracking-tight theme-text-primary">
                NextS
              </span>
              <span className="hidden md:inline text-[11px] theme-text-secondary ml-1.5 font-medium">
                PC Host & Teleprompter
              </span>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold theme-border border"
            style={{
              backgroundColor: isConnected
                ? connectionStatus.mode === 'BLE'
                  ? 'rgba(59, 130, 246, 0.12)'
                  : 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
              color: isConnected
                ? connectionStatus.mode === 'BLE'
                  ? 'var(--accent-primary)'
                  : 'var(--success-color)'
                : 'var(--danger-color)'
            }}
          >
            {isConnected ? (
              connectionStatus.mode === 'BLE' ? (
                <>
                  <Bluetooth className="w-3.5 h-3.5 animate-pulse" />
                  <span>BLE Connected</span>
                </>
              ) : (
                <>
                  <span
                    className="w-2 h-2 rounded-full animate-ping mr-0.5"
                    style={{ backgroundColor: 'var(--success-color)' }}
                  />
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Wi-Fi Online</span>
                </>
              )
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline (Sẵn sàng ghép nối)</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Title & Live Timer & Sync Lock */}
        <div className="hidden lg:flex items-center space-x-3">
          {/* Deck Title Badge */}
          <div className="px-3 py-1 rounded-lg theme-bg-elevated theme-border border text-xs font-bold theme-text-primary max-w-xs truncate">
            {presentationData.title || 'Bài thuyết trình NextS'}
          </div>

          {/* Live Timer Pill */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg theme-border border theme-bg-elevated">
            <button
              onClick={isTimerRunning ? pauseTimer : startTimer}
              className="flex items-center space-x-1.5 focus:outline-none"
              title={isTimerRunning ? 'Tạm dừng' : 'Chạy đồng hồ'}
            >
              {isTimerRunning ? (
                <Pause className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Play className="w-3.5 h-3.5" style={{ color: 'var(--success-color)' }} />
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

          {/* Sync Lock Toggle */}
          <button
            onClick={toggleSyncLock}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold theme-border border transition"
            style={{
              backgroundColor: presentationData.isSyncLocked
                ? 'rgba(59, 130, 246, 0.15)'
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
                <span>Đồng bộ: BẬT</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Xem tự do</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Switcher, Mini Pill, Theme, Settings */}
        <div className="flex items-center space-x-2">
          {/* Mobile View Switcher */}
          <button
            onClick={() => setViewMode('MOBILE')}
            title="Chuyển sang Giao diện Điện thoại (Mobile View)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-85 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xl:inline">Giao diện Mobile</span>
          </button>

          {/* Mini Pill Mode Button */}
          <button
            onClick={() => setViewMode('MINI_PILL')}
            title="Thu gọn Nhãn nổi (Mini Pill) để trình chiếu"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-85 transition"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Thu gọn Mini Pill</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() =>
              updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
            }
            title={settings.theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className="p-1.5 rounded-lg theme-border border theme-bg-elevated theme-text-primary hover:opacity-85 transition"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-500" />
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettingsModal}
            title="Mở Cài đặt hệ thống"
            className="p-1.5 rounded-lg theme-border border theme-bg-elevated theme-text-primary hover:opacity-85 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ======================================================= */}
      {/* 2. MAIN 3-COLUMN WORKSPACE (h-[calc(100dvh-112px)])      */}
      {/* ======================================================= */}
      <main className="h-[calc(100dvh-112px)] grid grid-cols-12 gap-4 p-4 overflow-hidden theme-bg-app">
        {/* ----------------------------------------------------- */}
        {/* COLUMN 1: TRẠM KẾT NỐI & ĐIỀU KHIỂN BÀN PHÍM (col-3)  */}
        {/* ----------------------------------------------------- */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-3 overflow-y-auto thin-scrollbar">
          {/* Card 1: QR Code & IP Adapter Selection */}
          <div className="theme-bg-surface border theme-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                Ghép Nối Điện Thoại
              </span>
              <span className="text-[10px] theme-text-muted">Quét bằng Camera</span>
            </div>

            {/* High-Contrast QR Code */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl theme-bg-elevated theme-border border">
              {networkInfo.qrDataUrl ? (
                <div className="p-2.5 bg-white rounded-xl shadow-md border border-slate-200">
                  <img
                    src={networkInfo.qrDataUrl}
                    alt="Pairing QR Code"
                    className="w-36 h-36 object-contain"
                  />
                </div>
              ) : (
                <div className="w-36 h-36 flex items-center justify-center rounded-xl theme-bg-surface border theme-border">
                  <span className="text-xs theme-text-muted">Đang tạo mã QR...</span>
                </div>
              )}
            </div>

            {/* Direct Connection URL */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold theme-text-secondary">
                URL Kết nối trực tiếp:
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  readOnly
                  value={networkInfo.connectUrl || 'Đang dò IP...'}
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono theme-bg-elevated theme-border border theme-text-primary select-all focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyConnectUrl}
                  title="Sao chép URL kết nối"
                  className="p-2 rounded-lg text-xs font-bold text-white transition hover:opacity-90 shadow-sm shrink-0"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Network Adapter Dropdown */}
            {networkInfo.interfaces && networkInfo.interfaces.length > 0 && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold theme-text-secondary">
                  Chọn Card mạng (Adapter):
                </label>
                <select
                  value={networkInfo.selectedIp}
                  onChange={(e) => selectIp(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs theme-bg-elevated theme-border border theme-text-primary focus:outline-none cursor-pointer"
                >
                  {networkInfo.interfaces.map((iface) => (
                    <option key={iface.address} value={iface.address}>
                      {iface.name} ({iface.address})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Card 2: Bluetooth BLE Status */}
          <div className="theme-bg-surface border theme-border rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Bluetooth className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold theme-text-primary">
                  Bluetooth BLE
                </span>
              </div>
              <button
                onClick={() => setBleBroadcasting(!bleBroadcasting)}
                className="w-9 h-5 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 focus:outline-none"
                style={{
                  backgroundColor: bleBroadcasting
                    ? 'var(--accent-primary)'
                    : 'var(--border-subtle)'
                }}
              >
                <div
                  className="w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm"
                  style={{
                    transform: bleBroadcasting ? 'translateX(16px)' : 'translateX(0px)'
                  }}
                />
              </button>
            </div>
            <p className="text-[11px] theme-text-secondary leading-snug">
              Dịch vụ <code className="font-mono text-blue-400">SlideSync-Host</code> GATT: {bleBroadcasting ? 'Sẵn sàng kết nối tầm gần 2-5m (Không cần router Wi-Fi)' : 'Đã tạm tắt'}
            </p>
          </div>

          {/* Card 3: Windows Key Emulation & Anti-Desync Diagnostics */}
          <div className="theme-bg-surface border theme-border rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold theme-text-primary">
                  Phím Giả Lập & Bù Lệch
                </span>
              </div>
              <span className="text-[10px] font-mono theme-text-muted">
                {settings.keyMapping}
              </span>
            </div>

            {/* Key Map Selector */}
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'ARROWS', label: 'Arrows' },
                { id: 'PAGEDOWN', label: 'PageDown' },
                { id: 'SPACE', label: 'Space' }
              ].map((map) => (
                <button
                  key={map.id}
                  onClick={() => updateSetting('keyMapping', map.id)}
                  className="py-1 px-1.5 rounded-lg text-xs font-semibold theme-border border text-center transition"
                  style={{
                    backgroundColor:
                      settings.keyMapping === map.id
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'var(--bg-elevated)',
                    borderColor:
                      settings.keyMapping === map.id
                        ? 'var(--accent-primary)'
                        : 'var(--border-subtle)',
                    color:
                      settings.keyMapping === map.id
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)'
                  }}
                >
                  {map.label}
                </button>
              ))}
            </div>

            {/* Test Action Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => stepSlide('PREV')}
                className="py-1.5 px-2 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition flex items-center justify-center space-x-1"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Test Lùi</span>
              </button>

              <button
                onClick={() => stepSlide('NEXT')}
                className="py-1.5 px-2 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition flex items-center justify-center space-x-1"
              >
                <span>Test Tiến</span>
                <ChevronRight className="w-3 h-3" />
              </button>

              <button
                onClick={() => stepSlide('BLACKOUT')}
                title="Tắt màn hình đen (Phím B)"
                className="py-1.5 px-2 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated text-rose-400 hover:opacity-80 transition flex items-center justify-center space-x-1"
              >
                <EyeOff className="w-3 h-3" />
                <span>Phím B</span>
              </button>
            </div>

            {/* Anti-Desync Offset Buttons */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t theme-border">
              <button
                onClick={() => adjustDesync(-1)}
                title="Bù lùi máy chiếu 1 slide mà không đổi kịch bản"
                className="py-1.5 px-2 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition flex items-center justify-center space-x-1"
              >
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>-1 Bù Lệch</span>
              </button>

              <button
                onClick={() => adjustDesync(1)}
                title="Bù tiến máy chiếu 1 slide mà không đổi kịch bản"
                className="py-1.5 px-2 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition flex items-center justify-center space-x-1"
              >
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>+1 Bù Lệch</span>
              </button>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- */}
        {/* COLUMN 2: KHU VỰC NẠP FILE & THỐNG KÊ (col-4)         */}
        {/* ----------------------------------------------------- */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-3 overflow-y-auto thin-scrollbar">
          {/* Dropzone 1: Script File (.docx, .txt, .md) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverScript(true);
            }}
            onDragLeave={() => setDragOverScript(false)}
            onDrop={handleScriptDrop}
            className="theme-bg-surface border theme-border rounded-xl p-3.5 space-y-2.5 transition"
            style={{
              borderColor: dragOverScript ? 'var(--accent-primary)' : 'var(--border-subtle)',
              backgroundColor: dragOverScript ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-surface)'
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>File Kịch Bản Lời Nói</span>
              </span>
              <span className="text-[10px] theme-text-muted">.docx, .txt, .md</span>
            </div>

            <input
              ref={scriptInputRef}
              type="file"
              accept=".docx,.txt,.md"
              onChange={(e) => processScriptFile(e.target.files?.[0])}
              className="hidden"
            />

            <div
              onClick={() => scriptInputRef.current?.click()}
              className="border-2 border-dashed theme-border rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition hover:border-blue-500 hover:bg-blue-500/5 group text-center"
            >
              <UploadCloud className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform mb-1" />
              <span className="text-xs font-bold theme-text-primary">
                {scriptFileBadge ? scriptFileBadge.name : 'Kéo thả hoặc bấm chọn File Kịch Bản'}
              </span>
              <span className="text-[10px] theme-text-secondary mt-0.5">
                {scriptFileBadge
                  ? `${(scriptFileBadge.size / 1024).toFixed(1)} KB — Đã sẵn sàng`
                  : 'Tự động nhận diện [Slide X], [Q&A], [Q&A Chung]'}
              </span>
            </div>
          </div>

          {/* Dropzone 2: Slide Deck (.pdf, .pptx) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverDeck(true);
            }}
            onDragLeave={() => setDragOverDeck(false)}
            onDrop={handleDeckDrop}
            className="theme-bg-surface border theme-border rounded-xl p-3.5 space-y-2.5 transition"
            style={{
              borderColor: dragOverDeck ? 'var(--accent-primary)' : 'var(--border-subtle)',
              backgroundColor: dragOverDeck ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-surface)'
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center space-x-1.5">
                <Presentation className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <span>File Trình Chiếu</span>
              </span>
              <span className="text-[10px] theme-text-muted">.pdf, .pptx</span>
            </div>

            <input
              ref={deckInputRef}
              type="file"
              accept=".pdf,.pptx"
              onChange={(e) => processDeckFile(e.target.files?.[0])}
              className="hidden"
            />

            <div
              onClick={() => deckInputRef.current?.click()}
              className="border-2 border-dashed theme-border rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition hover:border-blue-500 hover:bg-blue-500/5 group text-center"
            >
              <Layers className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform mb-1" />
              <span className="text-xs font-bold theme-text-primary">
                {deckFileBadge ? deckFileBadge.name : 'Kéo thả file PowerPoint (.pptx) hoặc PDF'}
              </span>
              <span className="text-[10px] theme-text-secondary mt-0.5">
                {deckFileBadge
                  ? `${(deckFileBadge.size / (1024 * 1024)).toFixed(2)} MB — Chuẩn bị bóc tách WebP`
                  : 'Bóc tách 3–5 từ tiêu đề slide & thumbnail nén WebP'}
              </span>
            </div>
          </div>

          {/* Public Google Docs Link Input */}
          <div className="theme-bg-surface border theme-border rounded-xl p-3.5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center space-x-1.5">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Link Google Docs / Slides Công Khai</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <input
                type="url"
                value={gdocUrl}
                onChange={(e) => setGdocUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/.../edit"
                className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono theme-bg-elevated theme-border border theme-text-primary focus:outline-none"
              />
              <button
                onClick={handleFetchGDoc}
                disabled={gdocLoading || !gdocUrl.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90 shadow-sm shrink-0 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                {gdocLoading ? 'Đang nạp...' : 'Nạp Link'}
              </button>
            </div>
          </div>

          {/* Live Recognition Statistics Card */}
          <div className="theme-bg-surface border theme-border rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                Thống Kê Bóc Tách Dữ Liệu
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                Live Data
              </span>
            </div>

            {/* 2x2 Grid of Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg theme-bg-elevated theme-border border">
                <span className="text-[11px] theme-text-muted block">Tổng số Slide:</span>
                <span className="text-sm font-bold theme-text-primary mt-0.5 block">
                  {importStats.totalSlides} trang
                </span>
              </div>

              <div className="p-2.5 rounded-lg theme-bg-elevated theme-border border">
                <span className="text-[11px] theme-text-muted block">Slide có Q&A:</span>
                <span className="text-sm font-bold text-blue-400 mt-0.5 block">
                  {importStats.slidesWithQA} / {importStats.totalSlides} slide
                </span>
              </div>

              <div className="p-2.5 rounded-lg theme-bg-elevated theme-border border">
                <span className="text-[11px] theme-text-muted block">Q&A Chung cuối bài:</span>
                <span
                  className="text-sm font-bold mt-0.5 block"
                  style={{
                    color: importStats.hasGeneralQA ? 'var(--success-color)' : 'var(--text-muted)'
                  }}
                >
                  {importStats.hasGeneralQA ? 'Đã có' : 'Chưa có'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg theme-bg-elevated theme-border border">
                <span className="text-[11px] theme-text-muted block">Thời lượng đọc ước tính:</span>
                <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                  ~{importStats.estimatedMinutes} phút
                </span>
                <span className="text-[10px] theme-text-secondary">
                  ({importStats.totalWords} từ kịch bản)
                </span>
              </div>
            </div>

            {/* Action buttons inside card */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t theme-border">
              <button
                onClick={onOpenImportModal}
                className="py-1.5 px-2 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-85 transition flex items-center justify-center space-x-1"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                <span>Trình Nhập Nâng Cao</span>
              </button>

              <button
                onClick={() => onOpenQuickEditModal && onOpenQuickEditModal('structured')}
                className="py-1.5 px-2 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-85 transition flex items-center justify-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Soạn / Sửa Toàn Bộ</span>
              </button>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- */}
        {/* COLUMN 3: XEM TRƯỚC & CHỈNH SỬA NHANH (col-5)         */}
        {/* ----------------------------------------------------- */}
        <section className="col-span-12 lg:col-span-5 flex flex-col theme-bg-surface border theme-border rounded-xl overflow-hidden">
          {/* Column Header */}
          <div className="p-3 border-b theme-border flex items-center justify-between shrink-0 theme-bg-elevated">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setColumn3Tab('slides')}
                className="px-3 py-1 rounded-lg text-xs font-bold transition"
                style={{
                  backgroundColor:
                    column3Tab === 'slides' ? 'var(--accent-primary)' : 'transparent',
                  color: column3Tab === 'slides' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Tất cả Slides ({presentationData.totalSlides})
              </button>

              <button
                onClick={() => setColumn3Tab('general_qa')}
                className="px-3 py-1 rounded-lg text-xs font-bold transition"
                style={{
                  backgroundColor:
                    column3Tab === 'general_qa' ? 'var(--accent-primary)' : 'transparent',
                  color: column3Tab === 'general_qa' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                [Q&A Chung] Cuối Bài
              </button>
            </div>

            {/* Quick Add Slide */}
            {column3Tab === 'slides' && (
              <button
                onClick={handleAddNewSlide}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Plus className="w-3 h-3" />
                <span>+ Thêm Slide</span>
              </button>
            )}
          </div>

          {/* Scrollable Slide Cards & Inline Quick Editor List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 thin-scrollbar">
            {column3Tab === 'slides' && (
              <>
                {presentationData.slides.map((slide) => {
                  const isActive = slide.slideNumber === currentSlide;
                  const isEditing = editingSlideNumber === slide.slideNumber;

                  return (
                    <div
                      key={slide.slideNumber}
                      className="rounded-xl border transition p-3.5 space-y-2.5"
                      style={{
                        backgroundColor: isActive
                          ? 'rgba(59, 130, 246, 0.08)'
                          : 'var(--bg-elevated)',
                        borderColor: isActive
                          ? 'var(--accent-primary)'
                          : 'var(--border-subtle)'
                      }}
                    >
                      {/* Slide Header Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className="px-2 py-0.5 rounded-md text-xs font-bold"
                            style={{
                              backgroundColor: isActive
                                ? 'var(--accent-primary)'
                                : 'var(--bg-surface)',
                              color: isActive ? '#ffffff' : 'var(--text-primary)'
                            }}
                          >
                            Slide {slide.slideNumber}
                          </span>

                          {isActive && (
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">
                              Đang chiếu
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {/* Go to Slide button */}
                          <button
                            onClick={() => goToSlide(slide.slideNumber, true)}
                            title={`Chiếu ngay Slide ${slide.slideNumber}`}
                            className="px-2 py-0.5 rounded-md text-xs font-semibold theme-border border theme-bg-surface hover:opacity-85 transition"
                            style={{
                              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)'
                            }}
                          >
                            Chiếu Slide
                          </button>

                          {/* Inline Edit Toggle */}
                          {!isEditing ? (
                            <button
                              onClick={() => handleStartEditSlide(slide)}
                              title="Sửa nhanh nội dung slide này"
                              className="p-1 rounded-md theme-border border theme-bg-surface theme-text-secondary hover:theme-text-primary transition"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                          ) : (
                            <button
                              onClick={handleCancelEditSlide}
                              title="Hủy sửa"
                              className="px-2 py-0.5 rounded-md text-xs theme-border border theme-bg-surface theme-text-muted hover:theme-text-primary"
                            >
                              Hủy
                            </button>
                          )}

                          {/* Delete Slide */}
                          <button
                            onClick={() => handleDeleteSlide(slide.slideNumber)}
                            title="Xóa slide này"
                            className="p-1 rounded-md theme-border border theme-bg-surface text-rose-400 hover:opacity-85 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Normal View vs Inline Editor */}
                      {!isEditing ? (
                        <div className="space-y-1.5">
                          {/* Slide Title */}
                          <h4 className="text-xs font-bold theme-text-primary">
                            {slide.title || `Slide ${slide.slideNumber}`}
                          </h4>

                          {/* Script Content Excerpt */}
                          <p className="text-xs theme-text-secondary leading-relaxed line-clamp-3">
                            {slide.scriptContent || '(Chưa có kịch bản)'}
                          </p>

                          {/* QA Excerpt Badge */}
                          {slide.qaContent && slide.qaContent.trim() && (
                            <div className="p-2 rounded-lg theme-bg-surface border theme-border text-[11px] text-blue-400 space-y-0.5">
                              <span className="font-bold flex items-center space-x-1">
                                <MessageSquare className="w-3 h-3" />
                                <span>[Q&A] Phản biện slide:</span>
                              </span>
                              <p className="theme-text-secondary line-clamp-2">
                                {slide.qaContent}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Inline Editor Form */
                        <div className="space-y-2.5 pt-1 border-t theme-border animate-fadeIn">
                          {/* Editable Title */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                              Tiêu đề slide:
                            </label>
                            <input
                              type="text"
                              value={editFormData.title}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, title: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg text-xs theme-bg-surface theme-border border theme-text-primary focus:outline-none"
                              placeholder="Nhập tiêu đề slide..."
                            />
                          </div>

                          {/* Editable Script */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
                              Lời nói kịch bản:
                            </label>
                            <textarea
                              rows={4}
                              value={editFormData.scriptContent}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  scriptContent: e.target.value
                                })
                              }
                              className="w-full p-2 rounded-lg text-xs theme-bg-surface theme-border border theme-text-primary focus:outline-none thin-scrollbar"
                              placeholder="Nhập lời nói cho slide này..."
                            />
                          </div>

                          {/* Editable QA */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                              [Q&A] Câu hỏi mở rộng riêng cho slide này:
                            </label>
                            <textarea
                              rows={2}
                              value={editFormData.qaContent}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  qaContent: e.target.value
                                })
                              }
                              className="w-full p-2 rounded-lg text-xs theme-bg-surface theme-border border theme-text-primary focus:outline-none thin-scrollbar"
                              placeholder="Nhập câu hỏi phản biện..."
                            />
                          </div>

                          {/* Save Inline Button */}
                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              onClick={() => handleSaveInlineSlide(slide.slideNumber)}
                              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
                              style={{ backgroundColor: 'var(--accent-primary)' }}
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Lưu Slide & Đồng Bộ</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Inline Editable General QA at Bottom */}
                <div className="rounded-xl border theme-border theme-bg-elevated p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold theme-text-primary flex items-center space-x-1.5">
                      <MessageSquare className="w-4 h-4 text-amber-400" />
                      <span>[Q&A Chung] Cho Toàn Bài Thuyết Trình</span>
                    </span>
                    <button
                      onClick={() => setColumn3Tab('general_qa')}
                      className="text-xs font-semibold text-blue-400 hover:underline"
                    >
                      Mở tab Q&A
                    </button>
                  </div>
                  <p className="text-xs theme-text-secondary line-clamp-3">
                    {presentationData.generalQA || '(Chưa có nội dung Q&A chung)'}
                  </p>
                </div>
              </>
            )}

            {column3Tab === 'general_qa' && (
              <div className="theme-bg-elevated border theme-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center space-x-1.5">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span>Nội Dung [Q&A Chung] (Toàn Bộ Bài)</span>
                  </span>
                  {!isEditingGeneralQa ? (
                    <button
                      onClick={() => {
                        setGeneralQaDraft(presentationData.generalQA || '');
                        setIsEditingGeneralQa(true);
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold theme-border border theme-bg-surface theme-text-primary hover:opacity-85 transition"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      <span>Chỉnh sửa</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingGeneralQa(false)}
                      className="px-2.5 py-1 rounded-lg text-xs theme-border border theme-bg-surface theme-text-muted"
                    >
                      Hủy
                    </button>
                  )}
                </div>

                {!isEditingGeneralQa ? (
                  <pre className="p-3 rounded-lg theme-bg-surface border theme-border text-xs font-normal whitespace-pre-wrap leading-relaxed theme-text-secondary max-h-96 overflow-y-auto thin-scrollbar">
                    {presentationData.generalQA || 'Chưa có nội dung câu hỏi phản biện chung.'}
                  </pre>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={12}
                      value={generalQaDraft}
                      onChange={(e) => setGeneralQaDraft(e.target.value)}
                      className="w-full p-3 rounded-lg text-xs font-normal leading-relaxed theme-bg-surface theme-border border theme-text-primary focus:outline-none thin-scrollbar"
                      placeholder="Nhập các câu hỏi phản biện và câu trả lời mở rộng chung cho cả bài thuyết trình..."
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveGeneralQa}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu & Đồng bộ Q&A Chung</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ======================================================= */}
      {/* 3. BOTTOM ACTION BAR (h-14 px-5 border-t theme-border)  */}
      {/* ======================================================= */}
      <footer className="h-14 px-4 sm:px-5 border-t theme-border theme-bg-surface flex items-center justify-between shrink-0 z-20">
        {/* Left: Copy AI Prompt & Reset Mock */}
        <div className="flex items-center space-x-2">
          <button
            onClick={copyAiPromptConvention}
            title="Sao chép prompt quy ước để dán vào ChatGPT / Gemini / Claude"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold theme-border border theme-bg-elevated theme-text-primary hover:opacity-85 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Copy Prompt Quy Ước cho AI</span>
            <span className="sm:hidden">Prompt AI</span>
          </button>

          <button
            onClick={resetToMockData}
            title="Khôi phục lại bài mẫu 5 slides"
            className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-secondary hover:theme-text-primary transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Khôi phục bài mẫu</span>
          </button>
        </div>

        {/* Right: Primary Start Presentation Button */}
        <div>
          <button
            onClick={() => startPresentation(true)}
            title="Bắt đầu thuyết trình, khóa đồng bộ và tự động thu nhỏ dashboard thành Mini Floating Pill"
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white transition hover:opacity-95 shadow-lg"
            style={{ backgroundColor: 'var(--success-color)' }}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>BẮT ĐẦU THUYẾT TRÌNH (Auto-Minimize & Mini Pill)</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
