import React, { useState, useRef } from 'react';
import {
  X,
  FolderKanban,
  BookmarkPlus,
  Download,
  Upload,
  Play,
  Trash2,
  RotateCcw,
  Clock,
  Layers,
  FileCheck,
  Sparkles,
  HelpCircle,
  ImageIcon,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SavedProjectsModal({ isOpen, onClose }) {
  const {
    presentationData,
    savedLibrary,
    saveCurrentToLibrary,
    loadFromLibrary,
    deleteFromLibrary,
    exportPresentationBundle,
    importPresentationBundle,
    resetToMockData,
    showToast
  } = useApp();

  const [customTitle, setCustomTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handler to save current deck
  const handleSaveCurrent = () => {
    const title = customTitle.trim() || presentationData.title || 'Bài thuyết trình mới';
    saveCurrentToLibrary(title);
    setCustomTitle('');
  };

  // Handler for importing .nexts.json file
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      await importPresentationBundle(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('[SavedProjectsModal] Import failed:', err);
    } finally {
      setIsImporting(false);
    }
  };

  // Handler to export an arbitrary presentation from library as .nexts.json
  const handleExportSingle = (item) => {
    try {
      const bundleData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        format: 'NEXTS_BUNDLE_V1',
        presentationData: item.data || presentationData
      };
      const jsonStr = JSON.stringify(bundleData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = `${(item.title || 'presentation').toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-')}.nexts.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Đã xuất file ${filename} thành công!`);
    } catch (err) {
      showToast('Lỗi xuất file: ' + err.message);
    }
  };

  // Filter library items
  const filteredLibrary = (savedLibrary || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (item.title || '').toLowerCase().includes(q);
    const idMatch = (item.id || '').toLowerCase().includes(q);
    return titleMatch || idMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="theme-bg-surface theme-text-primary theme-border border rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto thin-scrollbar p-5 sm:p-6 shadow-2xl flex flex-col space-y-5">
        {/* ----------------------------------------------------- */}
        {/* Modal Header                                          */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center justify-between border-b theme-border pb-3.5 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div
              className="p-2 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold theme-text-primary">
                Kho Bài Thuyết Trình Offline & Sao Lưu (.nexts.json)
              </h2>
              <p className="text-xs theme-text-secondary">
                Lưu nhiều bài thuyết trình trên máy, nạp tức thì và sao lưu dạng gói file di động
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-80 transition theme-bg-elevated theme-text-secondary"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ----------------------------------------------------- */}
        {/* Top Action Bar: Save Current & Import/Export Bundle   */}
        {/* ----------------------------------------------------- */}
        <div className="theme-bg-elevated theme-border border rounded-xl p-3.5 space-y-3">
          {/* Section: Save Current Presentation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={`Tên bài lưu (mặc định: "${presentationData.title || 'Bài hiện tại'}")`}
                className="w-full px-3 py-2 rounded-lg text-xs theme-bg-surface theme-border border theme-text-primary focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--border-subtle)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCurrent();
                }}
              />
            </div>
            <button
              onClick={handleSaveCurrent}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white transition hover:opacity-90 shrink-0 shadow-sm"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>Lưu bài hiện tại vào Kho</span>
            </button>
          </div>

          {/* Section: Bundle Export / Import & Defaults */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t theme-border text-xs">
            {/* Export .nexts.json */}
            <button
              onClick={exportPresentationBundle}
              title="Xuất bài đang chiếu ra file .nexts.json đầy đủ kịch bản, Q&A và ảnh slide"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold theme-bg-surface theme-border border theme-text-primary hover:opacity-85 transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Xuất file .nexts.json</span>
            </button>

            {/* Import .nexts.json */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.nexts.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              title="Nhập file .nexts.json đã sao lưu trước đó"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold theme-bg-surface theme-border border theme-text-primary hover:opacity-85 transition disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isImporting ? 'Đang đọc...' : 'Nhập file .nexts.json'}</span>
            </button>

            {/* Reset to Mock */}
            <button
              onClick={() => {
                if (window.confirm('Khôi phục bài thuyết trình 5 slide mẫu mặc định của NextS?')) {
                  resetToMockData();
                }
              }}
              title="Nạp lại bài mẫu 5 Slides Chuyển đổi Số mặc định"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold theme-bg-surface theme-border border theme-text-secondary hover:theme-text-primary hover:opacity-85 transition ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục 5 Slides mẫu</span>
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------- */}
        {/* Search & Counter Bar                                  */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold theme-text-secondary">
            <span>Danh sách bài đã lưu trong kho:</span>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--accent-primary)'
              }}
            >
              {savedLibrary?.length || 0} bài
            </span>
          </div>

          {savedLibrary?.length > 1 && (
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 theme-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm bài thuyết trình..."
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg theme-bg-elevated theme-border border theme-text-primary focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* ----------------------------------------------------- */}
        {/* Saved Presentations List                              */}
        {/* ----------------------------------------------------- */}
        <div className="space-y-2.5 max-h-[46vh] overflow-y-auto thin-scrollbar pr-0.5">
          {filteredLibrary.length === 0 ? (
            <div className="theme-bg-elevated theme-border border rounded-xl p-8 text-center space-y-2">
              <FolderKanban className="w-8 h-8 mx-auto theme-text-muted" />
              <p className="text-sm font-semibold theme-text-primary">
                {searchQuery ? 'Không tìm thấy bài thuyết trình phù hợp' : 'Kho bài lưu trữ đang trống'}
              </p>
              <p className="text-xs theme-text-secondary max-w-sm mx-auto">
                {searchQuery
                  ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.'
                  : 'Hãy nhập tên và bấm "Lưu bài hiện tại vào Kho" hoặc nhập tệp .nexts.json để lưu trữ.'}
              </p>
            </div>
          ) : (
            filteredLibrary.map((item) => {
              const isCurrent = item.id === presentationData.id;
              const slidesCount = item.totalSlides || item.data?.slides?.length || 0;
              const qaCount = (item.data?.slides || []).filter(
                (s) => s.qaContent && s.qaContent.trim().length > 0
              ).length;
              const thumbCount = (item.data?.slides || []).filter((s) => Boolean(s.thumbnailBase64)).length;
              const hasGeneralQA = Boolean(item.data?.generalQA && item.data.generalQA.trim().length > 0);
              const formattedDate = item.updatedAt
                ? new Date(item.updatedAt).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })
                : 'Vừa xong';

              return (
                <div
                  key={item.id}
                  className="rounded-xl theme-border border p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition"
                  style={{
                    backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-elevated)',
                    borderColor: isCurrent ? 'var(--accent-primary)' : 'var(--border-subtle)'
                  }}
                >
                  {/* Left: Info & Badges */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold theme-text-primary truncate" title={item.title}>
                        {item.title || 'Bài thuyết trình không tên'}
                      </h4>
                      {isCurrent && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 shrink-0"
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--success-color)'
                          }}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ĐANG CHỌN</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] theme-text-secondary">
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3 h-3 text-blue-400" />
                        <span>{slidesCount} slides</span>
                      </span>

                      {qaCount > 0 && (
                        <span className="flex items-center space-x-1 text-amber-400">
                          <HelpCircle className="w-3 h-3" />
                          <span>{qaCount} câu hỏi Q&A</span>
                        </span>
                      )}

                      {hasGeneralQA && (
                        <span className="flex items-center space-x-1 text-purple-400">
                          <Sparkles className="w-3 h-3" />
                          <span>Hỏi đáp chung</span>
                        </span>
                      )}

                      {thumbCount > 0 && (
                        <span className="flex items-center space-x-1 text-emerald-400">
                          <ImageIcon className="w-3 h-3" />
                          <span>{thumbCount} ảnh WebP</span>
                        </span>
                      )}

                      <span className="flex items-center space-x-1 theme-text-muted">
                        <Clock className="w-3 h-3" />
                        <span>{formattedDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    {/* Export button */}
                    <button
                      onClick={() => handleExportSingle(item)}
                      title="Xuất bài này ra file .nexts.json"
                      className="p-2 rounded-lg theme-border border theme-bg-surface theme-text-secondary hover:theme-text-primary hover:opacity-85 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Load & Present button */}
                    <button
                      onClick={() => {
                        loadFromLibrary(item.id);
                        onClose();
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Nạp & Trình chiếu</span>
                    </button>

                    {/* Delete button */}
                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center space-x-1 animate-fadeIn">
                        <button
                          onClick={() => {
                            deleteFromLibrary(item.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded text-xs font-bold text-white transition"
                          style={{ backgroundColor: 'var(--danger-color)' }}
                        >
                          Xác nhận xóa
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded text-xs font-medium theme-bg-surface theme-text-secondary"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        title="Xóa bài thuyết trình này khỏi kho"
                        className="p-2 rounded-lg theme-border border theme-bg-surface hover:text-red-400 transition"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ----------------------------------------------------- */}
        {/* Footer Hints                                          */}
        {/* ----------------------------------------------------- */}
        <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-muted">
          <div className="flex items-center space-x-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dữ liệu được lưu trữ an toàn trong bộ nhớ máy (Local Storage)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium theme-bg-elevated theme-text-primary hover:opacity-85 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
