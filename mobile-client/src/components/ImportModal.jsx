import React, { useState, useRef } from 'react';
import {
  X,
  FileUp,
  FolderOpen,
  FileText,
  Presentation,
  Globe,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  UploadCloud,
  FileCheck,
  RotateCcw,
  Sliders,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  parseConventionTextToPresentationData,
  extractGoogleDocId
} from '../utils/parser';
import {
  uploadAndProcessFiles
} from '../utils/fileProcessors';

export default function ImportModal({ isOpen, onClose, initialTab = 'file' }) {
  const {
    presentationData,
    updateScriptData,
    copyAiPromptConvention,
    showToast,
    connectionStatus
  } = useApp();

  const [activeTab, setActiveTab] = useState(initialTab);

  // --- Tab 1: File Upload states ---
  const [mergeMode, setMergeMode] = useState('MERGE'); // 'MERGE' | 'REPLACE'
  const [selectedScriptFile, setSelectedScriptFile] = useState(null);
  const [selectedDeckFile, setSelectedDeckFile] = useState(null);
  const [parsedPreviewData, setParsedPreviewData] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [parseProgress, setParseProgress] = useState({ active: false, percent: 0, message: '' });

  const scriptInputRef = useRef(null);
  const deckInputRef = useRef(null);

  // --- Tab 2: Google Docs / Slides URL states ---
  const [gdocUrl, setGdocUrl] = useState('');
  const [gdocLoading, setGdocLoading] = useState(false);
  const [gdocError, setGdocError] = useState(null);

  // --- Tab 3: Raw AI Convention Text states ---
  const [rawText, setRawText] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [rawError, setRawError] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Tab 1 Handlers: File Processing
  // -------------------------------------------------------------
  const handleScriptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedScriptFile(file);
    setFileError(null);
    showToast(`Đã chọn file kịch bản: ${file.name}`);
  };

  const handleDeckFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedDeckFile(file);
    setFileError(null);
    showToast(`Đã chọn file trình chiếu: ${file.name}`);
  };

  const handleProcessAndSyncFiles = async () => {
    if (!selectedScriptFile && !selectedDeckFile) {
      setFileError('Vui lòng chọn ít nhất một file kịch bản (.docx, .txt) hoặc file trình chiếu (.pdf, .pptx).');
      return;
    }

    setFileLoading(true);
    setFileError(null);
    setParseProgress({
      active: true,
      percent: 10,
      message: 'Đang chuẩn bị bóc tách & nén WebP...'
    });

    try {
      const res = await uploadAndProcessFiles({
        scriptFile: selectedScriptFile,
        slideFile: selectedDeckFile,
        mergeMode,
        connectionMode: connectionStatus?.mode || 'WIFI',
        onProgress: (p) => {
          setParseProgress({
            active: true,
            percent: p.percent || 50,
            message: p.message || 'Đang xử lý tài liệu...'
          });
        }
      });

      if (res.presentationData) {
        setParsedPreviewData(res.presentationData);
        updateScriptData(res.presentationData);
        showToast(`Đã bóc tách & đồng bộ ${res.presentationData.totalSlides} slides thành công!`);
      }
    } catch (err) {
      console.error('[ImportModal] Error processing files:', err);
      setFileError(err.message || 'Lỗi bóc tách tài liệu.');
    } finally {
      setFileLoading(false);
      setTimeout(() => {
        setParseProgress({ active: false, percent: 0, message: '' });
      }, 700);
    }
  };

  const handleApplyParsedData = () => {
    if (!parsedPreviewData) return;
    updateScriptData(parsedPreviewData);
    showToast(`Đã cập nhật bài thuyết trình với ${parsedPreviewData.totalSlides} slides!`);
    onClose();
  };

  // -------------------------------------------------------------
  // Tab 2 Handlers: Google Docs / Slides Public URL Import
  // -------------------------------------------------------------
  const handleFetchGoogleDoc = async () => {
    if (!gdocUrl.trim()) {
      setGdocError('Vui lòng nhập đường link Google Docs hoặc Google Slides.');
      return;
    }

    setGdocLoading(true);
    setGdocError(null);

    try {
      const res = await fetch('/api/fetch-google-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: gdocUrl.trim(), mergeMode })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Mã lỗi tải: ${res.status}`);
      }

      const data = await res.json();
      if (data.presentationData) {
        updateScriptData(data.presentationData);
        const typeLabel = data.type === 'GOOGLE_SLIDES' ? 'Google Slides' : 'Google Docs';
        showToast(`Đã nạp thành công ${data.presentationData.totalSlides} slides từ ${typeLabel}!`);
        onClose();
      } else {
        throw new Error('Không nhận được dữ liệu từ link Google.');
      }
    } catch (err) {
      setGdocError(err.message || 'Lỗi khi tải hoặc bóc tách dữ liệu từ Google Docs/Slides.');
    } finally {
      setGdocLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Tab 3 Handlers: Raw AI Prompt Convention Text
  // -------------------------------------------------------------
  const handleCopyPrompt = async () => {
    await copyAiPromptConvention();
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleParseRawText = () => {
    if (!rawText.trim()) {
      setRawError('Vui lòng dán văn bản kịch bản có các thẻ [Slide X].');
      return;
    }

    try {
      setRawError(null);
      const parsed = parseConventionTextToPresentationData(
        rawText,
        customTitle || presentationData.title
      );
      updateScriptData(parsed);
      showToast(`Đã phân tích & cập nhật ${parsed.totalSlides} slides thành công!`);
      onClose();
    } catch (err) {
      setRawError(err.message || 'Lỗi phân tích cú pháp');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="theme-bg-surface theme-text-primary theme-border border rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto thin-scrollbar p-5 sm:p-6 shadow-2xl flex flex-col space-y-5">
        {/* ----------------------------------------------------- */}
        {/* Modal Header                                          */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center justify-between border-b theme-border pb-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
            >
              <FileUp className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold theme-text-primary">
                Nhập Kịch Bản & File Thuyết Trình
              </h2>
              <p className="text-xs theme-text-secondary mt-0.5">
                Đa kênh nạp dữ liệu: File Word/Text, Slide PDF/PowerPoint, Link Google Docs và Prompt AI
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
        {/* Tab Navigation (3 Channels)                           */}
        {/* ----------------------------------------------------- */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl theme-bg-elevated border theme-border shrink-0">
          <button
            onClick={() => setActiveTab('file')}
            className="py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5"
            style={{
              backgroundColor:
                activeTab === 'file' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'file' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">File Thiết Bị / Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('gdocs')}
            className="py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5"
            style={{
              backgroundColor:
                activeTab === 'gdocs' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'gdocs' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Link Google Docs</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_prompt')}
            className="py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5"
            style={{
              backgroundColor:
                activeTab === 'ai_prompt' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'ai_prompt' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Dán Kịch Bản AI</span>
          </button>
        </div>

        {/* ===================================================== */}
        {/* TAB 1: FILE PICKER (DEVICE / GOOGLE DRIVE STORAGE)    */}
        {/* ===================================================== */}
        {activeTab === 'file' && (
          <div className="space-y-4 flex-1">
            {/* Merge Mode Toggle */}
            <div className="p-3 rounded-xl theme-bg-elevated theme-border border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Chế độ nạp & đồng bộ:</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMergeMode('MERGE')}
                  className="py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center space-x-1.5 text-center"
                  style={{
                    backgroundColor: mergeMode === 'MERGE' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    color: mergeMode === 'MERGE' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Gộp thông minh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMergeMode('REPLACE')}
                  className="py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center space-x-1.5 text-center"
                  style={{
                    backgroundColor: mergeMode === 'REPLACE' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    color: mergeMode === 'REPLACE' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Tạo bài mới</span>
                </button>
              </div>

              <p className="text-[11px] theme-text-muted leading-tight">
                {mergeMode === 'MERGE'
                  ? '⚡ Gộp thông minh: Kết hợp kịch bản Word và slide PowerPoint/PDF, không mất nội dung đã nhập.'
                  : '🔄 Tạo bài mới: Thay thế toàn bộ kịch bản và slide hiện tại.'}
              </p>
            </div>

            {/* Android Google Drive Note Box */}
            <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-start space-x-2.5 text-xs">
              <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="theme-text-secondary leading-relaxed">
                <span className="font-semibold text-blue-400">Gợi ý chọn file: </span>
                Trên điện thoại Android, bấm chọn file sẽ mở trình quản lý tệp hệ thống (có tích hợp sẵn mục <strong>Google Drive</strong> ở menu ngăn kéo bên trái).
              </div>
            </div>

            {/* Real-time Progress Bar */}
            {parseProgress.active && (
              <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold theme-text-primary flex items-center space-x-2 truncate">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                    <span className="truncate">{parseProgress.message}</span>
                  </span>
                  <span className="font-mono font-bold text-blue-400 shrink-0 ml-2">
                    {parseProgress.percent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full theme-bg-surface overflow-hidden border theme-border">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${parseProgress.percent}%`,
                      backgroundColor: 'var(--accent-primary)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Sub-zone 1: Script File Intake (.docx, .txt, .md) */}
            <div className="p-4 rounded-xl theme-bg-elevated theme-border border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    1. File Kịch Bản Lời Nói (.docx, .txt, .md)
                  </span>
                </div>
                {selectedScriptFile && (
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã chọn</span>
                  </span>
                )}
              </div>

              <input
                ref={scriptInputRef}
                type="file"
                accept=".docx,.txt,.md"
                onChange={handleScriptFileChange}
                className="hidden"
              />

              <div
                onClick={() => scriptInputRef.current?.click()}
                className="border-2 border-dashed theme-border rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition hover:border-blue-500 hover:bg-blue-500/5 group text-center"
              >
                <UploadCloud className="w-7 h-7 text-blue-400 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold theme-text-primary">
                  {selectedScriptFile
                    ? selectedScriptFile.name
                    : 'Bấm để chọn file kịch bản hoặc kéo thả vào đây'}
                </span>
                <span className="text-[11px] theme-text-secondary mt-0.5">
                  {selectedScriptFile
                    ? `Kích thước: ${(selectedScriptFile.size / 1024).toFixed(1)} KB`
                    : 'Hỗ trợ tệp văn bản Word (.docx), Markdown (.md) và Plain text (.txt)'}
                </span>
              </div>
            </div>

            {/* Sub-zone 2: Presentation Deck File (.pdf, .pptx) */}
            <div className="p-4 rounded-xl theme-bg-elevated theme-border border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Presentation className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    2. File Trình Chiếu (.pdf, .pptx)
                  </span>
                </div>
                {selectedDeckFile && (
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã nhận</span>
                  </span>
                )}
              </div>

              <input
                ref={deckInputRef}
                type="file"
                accept=".pdf,.pptx"
                onChange={handleDeckFileChange}
                className="hidden"
              />

              <div
                onClick={() => deckInputRef.current?.click()}
                className="border-2 border-dashed theme-border rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition hover:border-blue-500 hover:bg-blue-500/5 group text-center"
              >
                <Layers className="w-7 h-7 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold theme-text-primary">
                  {selectedDeckFile
                    ? selectedDeckFile.name
                    : 'Bấm để nạp file trình chiếu PowerPoint (.pptx) hoặc PDF (.pdf)'}
                </span>
                <span className="text-[11px] theme-text-secondary mt-0.5">
                  {selectedDeckFile
                    ? `Kích thước: ${(selectedDeckFile.size / (1024 * 1024)).toFixed(2)} MB — Sẵn sàng trích xuất thumbnail WebP`
                    : 'Dùng để bóc tách tiêu đề slide và tạo ảnh xem trước thu nhỏ (WebP)'}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            {(selectedScriptFile || selectedDeckFile) && !parsedPreviewData && (
              <button
                type="button"
                onClick={handleProcessAndSyncFiles}
                disabled={fileLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition hover:opacity-90 flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                {fileLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang bóc tách & căn chỉnh...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bóc tách & Đồng bộ ngay ({mergeMode === 'MERGE' ? 'Gộp thông minh' : 'Tạo mới'})</span>
                  </>
                )}
              </button>
            )}

            {/* File Parsing Error */}
            {fileError && (
              <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Parsed Preview Card */}
            {parsedPreviewData && (
              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">
                      Đã bóc tách thành công: {parsedPreviewData.title}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-300">
                    {parsedPreviewData.totalSlides} slides
                  </span>
                </div>
                <p className="text-[11px] theme-text-secondary">
                  Kịch bản đã sẵn sàng. Bấm nút <strong>"Áp dụng vào Bài thuyết trình"</strong> bên dưới để đồng bộ sang điện thoại và máy tính.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 2: PUBLIC GOOGLE DOCS / SLIDES URL IMPORT         */}
        {/* ===================================================== */}
        {activeTab === 'gdocs' && (
          <div className="space-y-4 flex-1">
            <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border text-xs theme-text-secondary leading-relaxed space-y-1.5">
              <p className="font-semibold theme-text-primary flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Nạp trực tiếp từ Google Docs hoặc Google Slides công khai:</span>
              </p>
              <p>
                Mở Google Docs (kịch bản) hoặc Google Slides (bài trình chiếu), bấm <strong>Chia sẻ (Share)</strong> → Chọn <strong>"Bất kỳ ai có đường liên kết đều có thể xem"</strong> → Dán đường liên kết vào ô bên dưới.
              </p>
            </div>

            {/* Merge Mode Toggle for Google Link */}
            <div className="p-3 rounded-xl theme-bg-elevated theme-border border space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Chế độ kết hợp khi nạp link:</span>
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMergeMode('MERGE')}
                  className="py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center space-x-1 text-center"
                  style={{
                    backgroundColor: mergeMode === 'MERGE' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    color: mergeMode === 'MERGE' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Gộp thông minh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMergeMode('REPLACE')}
                  className="py-1.5 px-2 rounded-lg font-semibold transition flex items-center justify-center space-x-1 text-center"
                  style={{
                    backgroundColor: mergeMode === 'REPLACE' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    color: mergeMode === 'REPLACE' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Tạo bài mới</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                Đường dẫn Google Docs / Google Slides công khai:
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={gdocUrl}
                  onChange={(e) => {
                    setGdocUrl(e.target.value);
                    setGdocError(null);
                  }}
                  placeholder="https://docs.google.com/document/d/... hoặc https://docs.google.com/presentation/d/..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs theme-bg-elevated theme-border border theme-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {gdocError && (
              <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{gdocError}</span>
              </div>
            )}

            <button
              onClick={handleFetchGoogleDoc}
              disabled={gdocLoading || !gdocUrl.trim()}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition hover:opacity-90 flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {gdocLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải & bóc tách dữ liệu...</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  <span>Tải & Bóc tách từ Link Google Docs / Slides</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 3: RAW AI PROMPT CONVENTION PASTE                 */}
        {/* ===================================================== */}
        {activeTab === 'ai_prompt' && (
          <div className="space-y-4 flex-1">
            {/* Copy Convention Prompt Action Bar */}
            <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-xs font-bold theme-text-primary block">
                  Chưa có kịch bản chuẩn cấu trúc?
                </span>
                <span className="text-[11px] theme-text-secondary">
                  Sao chép prompt quy chuẩn để dán vào ChatGPT, Gemini hoặc Claude
                </span>
              </div>
              <button
                onClick={handleCopyPrompt}
                className="py-1.5 px-3 rounded-xl text-xs font-bold text-white transition hover:opacity-90 flex items-center justify-center space-x-1.5 shrink-0 shadow-sm"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt Quy Ước cho AI</span>
                  </>
                )}
              </button>
            </div>

            {/* Custom Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                Tiêu đề bài thuyết trình (Tùy chọn):
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Nhập tiêu đề hoặc để mặc định..."
                className="w-full px-3 py-2 rounded-xl text-xs theme-bg-elevated theme-border border theme-text-primary focus:outline-none"
              />
            </div>

            {/* Raw Text Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs theme-text-secondary">
                <span className="font-bold uppercase tracking-wider">
                  Dán nội dung kịch bản AI:
                </span>
                <span className="font-mono text-[11px]">
                  {rawText.length} ký tự
                </span>
              </div>
              <textarea
                rows={9}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setRawError(null);
                }}
                placeholder={`[Slide 1]: Giới thiệu dự án\nKính chào quý vị, hôm nay tôi xin chia sẻ về...\n[Q&A]\nCâu hỏi 1: Lợi thế cốt lõi là gì?\nTrả lời: Tốc độ phản hồi dưới 5ms.\n\n[Slide 2]: Giải pháp công nghệ\nKiến trúc hệ thống bao gồm...\n\n[Q&A Chung]\nCâu hỏi tổng quan 1: Khả năng vận hành ngoại tuyến?`}
                className="w-full p-3 rounded-xl text-xs font-mono leading-relaxed theme-bg-elevated theme-border border theme-text-primary focus:outline-none thin-scrollbar"
              />
            </div>

            {rawError && (
              <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rawError}</span>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------- */}
        {/* Modal Footer Actions                                  */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center justify-between border-t theme-border pt-3.5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-secondary hover:theme-text-primary transition"
          >
            Đóng
          </button>

          <div className="flex items-center space-x-2">
            {activeTab === 'file' && parsedPreviewData && (
              <button
                onClick={handleApplyParsedData}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
                style={{ backgroundColor: 'var(--success-color)' }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Áp dụng vào Bài thuyết trình ({parsedPreviewData.totalSlides} slides)</span>
              </button>
            )}

            {activeTab === 'ai_prompt' && (
              <button
                onClick={handleParseRawText}
                disabled={!rawText.trim()}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-sm disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Phân tích & Cập nhật kịch bản</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
