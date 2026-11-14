import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  FileText,
  FileUp,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseConventionTextToPresentationData } from '../utils/parser';

export { parseConventionTextToPresentationData };

export default function QuickEditModal({
  isOpen,
  onClose,
  initialTab = 'structured',
  initialSlideNumber = null
}) {
  const {
    presentationData,
    updateScriptData,
    resetToMockData,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  // Local copy of structured data for editing
  const [deck, setDeck] = useState(() => JSON.parse(JSON.stringify(presentationData)));

  // Raw text import state
  const [rawText, setRawText] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [parseError, setParseError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const cloned = JSON.parse(JSON.stringify(presentationData));
      setDeck(cloned);
      setImportTitle(cloned.title || '');

      if (initialSlideNumber) {
        const foundIdx = (cloned.slides || []).findIndex(
          (s) => s.slideNumber === initialSlideNumber
        );
        if (foundIdx >= 0) {
          setSelectedSlideIndex(foundIdx);
        }
      } else {
        const currentIdx = Math.max(0, (cloned.currentSlide || 1) - 1);
        setSelectedSlideIndex(currentIdx);
      }
      setParseError(null);
    }
  }, [isOpen, initialTab, initialSlideNumber, presentationData]);

  if (!isOpen) return null;

  const currentSlide = deck.slides?.[selectedSlideIndex] || null;

  // -------------------------------------------------------------
  // Structured Editor Actions
  // -------------------------------------------------------------
  const handleUpdateSlideField = (field, value) => {
    if (!currentSlide) return;
    setDeck((prev) => {
      const updatedSlides = [...prev.slides];
      updatedSlides[selectedSlideIndex] = {
        ...updatedSlides[selectedSlideIndex],
        [field]: value
      };
      return {
        ...prev,
        slides: updatedSlides
      };
    });
  };

  const handleAddSlide = () => {
    setDeck((prev) => {
      const newSlideNumber = prev.slides.length + 1;
      const newSlide = {
        slideNumber: newSlideNumber,
        title: `Tiêu đề slide ${newSlideNumber}`,
        scriptContent: 'Nội dung kịch bản cho slide mới...',
        qaContent: '',
        thumbnailBase64: null
      };
      const updatedSlides = [...prev.slides, newSlide];
      return {
        ...prev,
        totalSlides: updatedSlides.length,
        slides: updatedSlides
      };
    });
    setSelectedSlideIndex(deck.slides.length);
  };

  const handleDeleteSlide = (indexToDelete) => {
    if (deck.slides.length <= 1) {
      showToast('Bài thuyết trình phải có tối thiểu 1 slide!');
      return;
    }

    setDeck((prev) => {
      const filtered = prev.slides.filter((_, idx) => idx !== indexToDelete);
      // Re-number slides sequentially
      const renumbered = filtered.map((s, idx) => ({
        ...s,
        slideNumber: idx + 1
      }));
      return {
        ...prev,
        totalSlides: renumbered.length,
        slides: renumbered,
        currentSlide: Math.min(prev.currentSlide, renumbered.length)
      };
    });

    setSelectedSlideIndex((prevIdx) => Math.max(0, prevIdx - 1));
  };

  const handleSaveStructured = () => {
    const finalData = {
      ...deck,
      totalSlides: deck.slides.length,
      updatedAt: Date.now()
    };
    updateScriptData(finalData);
    onClose();
  };

  // -------------------------------------------------------------
  // Raw Paste Parser Actions
  // -------------------------------------------------------------
  const handleParseAndApply = () => {
    try {
      setParseError(null);
      const parsedData = parseConventionTextToPresentationData(
        rawText,
        importTitle || deck.title
      );
      updateScriptData(parsedData);
      showToast(`Đã import thành công ${parsedData.totalSlides} slides!`);
      onClose();
    } catch (err) {
      setParseError(err.message || 'Lỗi phân tích cú pháp');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="theme-bg-surface theme-text-primary theme-border border rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto thin-scrollbar p-5 shadow-2xl flex flex-col space-y-4">
        {/* ----------------------------------------------------- */}
        {/* Header & Tabs                                          */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center justify-between border-b theme-border pb-3 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold theme-text-primary flex items-center space-x-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>Chỉnh Sửa Kịch Bản & Q&A</span>
            </h2>
            <p className="text-xs theme-text-secondary mt-0.5">
              Cập nhật trực tiếp trên điện thoại và đồng bộ ngay sang máy tính
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-80 transition theme-bg-elevated theme-text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center space-x-2 border-b theme-border pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('structured')}
            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
            style={{
              backgroundColor:
                activeTab === 'structured'
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
              color: activeTab === 'structured' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Sửa Từng Slide & Q&A</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
            style={{
              backgroundColor:
                activeTab === 'import'
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
              color: activeTab === 'import' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Dán Nhanh Theo Quy Ước AI</span>
          </button>
        </div>

        {/* ===================================================== */}
        {/* TAB 1: STRUCTURED EDITOR                              */}
        {/* ===================================================== */}
        {activeTab === 'structured' && (
          <div className="space-y-4 flex-1">
            {/* Presentation Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                Tiêu đề bài thuyết trình:
              </label>
              <input
                type="text"
                value={deck.title || ''}
                onChange={(e) => setDeck({ ...deck, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm theme-bg-elevated theme-border border theme-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập tiêu đề bài thuyết trình..."
              />
            </div>

            {/* Slide Selector Rail */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                  Chọn Slide để chỉnh sửa ({deck.slides.length} slides):
                </label>
                <button
                  onClick={handleAddSlide}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm Slide</span>
                </button>
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto thin-scrollbar pb-1">
                {deck.slides.map((s, idx) => (
                  <button
                    key={s.slideNumber}
                    onClick={() => setSelectedSlideIndex(idx)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition theme-border border"
                    style={{
                      backgroundColor:
                        selectedSlideIndex === idx
                          ? 'var(--accent-primary)'
                          : 'var(--bg-elevated)',
                      color: selectedSlideIndex === idx ? '#ffffff' : 'var(--text-primary)',
                      borderColor:
                        selectedSlideIndex === idx
                          ? 'var(--accent-primary)'
                          : 'var(--border-subtle)'
                    }}
                  >
                    Slide {s.slideNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Slide Detail Card */}
            {currentSlide && (
              <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold theme-text-primary">
                    Chi tiết Slide {currentSlide.slideNumber}
                  </span>
                  <button
                    onClick={() => handleDeleteSlide(selectedSlideIndex)}
                    title="Xóa slide này"
                    className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-semibold theme-border border text-rose-400 hover:opacity-80 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa</span>
                  </button>
                </div>

                {/* Slide Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold theme-text-secondary">
                    Tiêu đề ngắn của slide (3-5 từ):
                  </label>
                  <input
                    type="text"
                    value={currentSlide.title || ''}
                    onChange={(e) => handleUpdateSlideField('title', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg text-xs theme-bg-surface theme-border border theme-text-primary focus:outline-none"
                    placeholder="Ví dụ: Tổng quan chuyển đổi số"
                  />
                </div>

                {/* Script Content */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold theme-text-secondary">
                    Lời nói kịch bản chi tiết:
                  </label>
                  <textarea
                    rows={5}
                    value={currentSlide.scriptContent || ''}
                    onChange={(e) => handleUpdateSlideField('scriptContent', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-normal leading-relaxed theme-bg-surface theme-border border theme-text-primary focus:outline-none thin-scrollbar"
                    placeholder="Nhập toàn bộ lời nói cho slide này..."
                  />
                </div>

                {/* Slide-Specific Q&A */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-blue-400 flex items-center space-x-1">
                    <span>[Q&A] Câu hỏi mở rộng riêng cho Slide {currentSlide.slideNumber}:</span>
                  </label>
                  <textarea
                    rows={3}
                    value={currentSlide.qaContent || ''}
                    onChange={(e) => handleUpdateSlideField('qaContent', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-normal leading-relaxed theme-bg-surface theme-border border theme-text-primary focus:outline-none thin-scrollbar"
                    placeholder="Câu hỏi phản biện và câu trả lời gợi ý cho slide này..."
                  />
                </div>
              </div>
            )}

            {/* General Q&A Section */}
            <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-1.5">
              <label className="text-xs font-bold theme-text-primary block">
                [Q&A Chung] Câu hỏi & Mở rộng chung (Toàn bài thuyết trình):
              </label>
              <textarea
                rows={3}
                value={deck.generalQA || ''}
                onChange={(e) => setDeck({ ...deck, generalQA: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-xs font-normal leading-relaxed theme-bg-surface theme-border border theme-text-primary focus:outline-none thin-scrollbar"
                placeholder="Các câu hỏi phản biện tổng quát cho toàn bộ bài thuyết trình..."
              />
            </div>
          </div>
        )}

        {/* ===================================================== */}
        {/* TAB 2: RAW TEXT IMPORT PARSER                         */}
        {/* ===================================================== */}
        {activeTab === 'import' && (
          <div className="space-y-4 flex-1">
            <div className="p-3 rounded-xl theme-bg-elevated theme-border border text-xs theme-text-secondary leading-relaxed">
              <p className="font-semibold theme-text-primary mb-1">
                Hướng dẫn dán văn bản:
              </p>
              Dán toàn bộ nội dung kịch bản được tạo bởi ChatGPT, Gemini hoặc Claude tuân thủ cấu trúc <code className="px-1 py-0.5 rounded theme-bg-surface border theme-border font-mono">[Slide 1]: Tiêu đề</code>, <code className="px-1 py-0.5 rounded theme-bg-surface border theme-border font-mono">[Q&A]</code> và <code className="px-1 py-0.5 rounded theme-bg-surface border theme-border font-mono">[Q&A Chung]</code>. Hệ thống sẽ tự động bóc tách từng slide và câu hỏi tương ứng.
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                Tiêu đề bài thuyết trình (Tùy chọn):
              </label>
              <input
                type="text"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm theme-bg-elevated theme-border border theme-text-primary focus:outline-none"
                placeholder="Nhập tiêu đề hoặc để trống..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
                Nội dung văn bản thô theo Quy ước:
              </label>
              <textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full p-3 rounded-xl text-xs font-mono leading-relaxed theme-bg-elevated theme-border border theme-text-primary focus:outline-none thin-scrollbar"
                placeholder={`[Slide 1]: Tổng quan dự án\nKính chào quý vị, hôm nay tôi xin trình bày...\n[Q&A]\nCâu hỏi: Đâu là lợi thế cạnh tranh?\nTrả lời: Hệ thống phản hồi dưới 5ms.\n\n[Slide 2]: Giải pháp công nghệ\nĐể giải quyết vấn đề...\n\n[Q&A Chung]\nCâu hỏi chung 1: Khả năng vận hành offline?`}
              />
            </div>

            {parseError && (
              <div className="p-3 rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-400 text-xs font-medium">
                {parseError}
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------- */}
        {/* Footer Actions                                        */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center justify-between border-t theme-border pt-3 shrink-0">
          <button
            onClick={resetToMockData}
            title="Khôi phục lại 5 slide mẫu ban đầu"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-secondary hover:theme-text-primary transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Khôi phục mẫu 5 Slides</span>
            <span className="sm:hidden">Reset mẫu</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-secondary hover:theme-text-primary transition"
            >
              Hủy
            </button>

            {activeTab === 'structured' ? (
              <button
                onClick={handleSaveStructured}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu & Đồng bộ ngay</span>
              </button>
            ) : (
              <button
                onClick={handleParseAndApply}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-sm"
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
