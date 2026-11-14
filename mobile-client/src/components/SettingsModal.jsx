import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Sparkles,
  Type,
  Maximize2,
  Sliders,
  Keyboard,
  Monitor,
  Smartphone,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AI_PROMPT_CONVENTION_TEXT } from '../constants/promptConvention';

export default function SettingsModal({ isOpen, onClose }) {
  const {
    settings,
    updateSetting,
    resetSettings,
    copyAiPromptConvention,
    wakeLockActive
  } = useApp();

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    await copyAiPromptConvention();
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="theme-bg-surface theme-text-primary theme-border border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto thin-scrollbar p-5 shadow-2xl flex flex-col space-y-6">
        {/* ----------------------------------------------------- */}
        {/* Header                                                 */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center justify-between border-b theme-border pb-3 shrink-0">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <h2 className="text-base sm:text-lg font-bold theme-text-primary">
              Cài Đặt Máy Nhắc Chữ & Hệ Thống
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:opacity-80 transition theme-bg-elevated theme-text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ----------------------------------------------------- */}
        {/* Section 1: Quy ước AI tạo kịch bản                    */}
        {/* ----------------------------------------------------- */}
        <section className="space-y-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider theme-text-primary">
              1. Quy ước AI tạo kịch bản
            </h3>
          </div>

          <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-3">
            <p className="text-xs theme-text-secondary leading-relaxed">
              Dán prompt quy chuẩn này vào ChatGPT, Gemini hoặc Claude cùng với tài liệu bài giảng của bạn. AI sẽ tạo kịch bản chuẩn định dạng có gắn thẻ <code className="px-1 py-0.5 rounded text-[11px] theme-bg-surface border theme-border font-mono">[Slide X]</code>, <code className="px-1 py-0.5 rounded text-[11px] theme-bg-surface border theme-border font-mono">[Q&A]</code> và <code className="px-1 py-0.5 rounded text-[11px] theme-bg-surface border theme-border font-mono">[Q&A Chung]</code> để NextS bóc tách chuẩn 100%.
            </p>

            <button
              onClick={handleCopyPrompt}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition hover:opacity-90 flex items-center justify-center space-x-2 shadow-sm"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Đã sao chép vào bộ nhớ tạm!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Prompt Quy Ước cho AI</span>
                </>
              )}
            </button>

            {/* Collapsible Preview */}
            <div className="border-t theme-border pt-2">
              <button
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="w-full flex items-center justify-between text-xs font-semibold theme-text-secondary hover:theme-text-primary transition"
              >
                <span>Xem nội dung Prompt quy ước</span>
                {showPromptPreview ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showPromptPreview && (
                <pre className="mt-2 p-2.5 rounded-lg theme-bg-app border theme-border text-[11px] font-mono whitespace-pre-wrap leading-relaxed theme-text-secondary max-h-48 overflow-y-auto thin-scrollbar">
                  {AI_PROMPT_CONVENTION_TEXT}
                </pre>
              )}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- */}
        {/* Section 2: Giao diện & Hiển thị chữ                   */}
        {/* ----------------------------------------------------- */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Type className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <h3 className="text-sm font-bold uppercase tracking-wider theme-text-primary">
              2. Giao diện & Hiển thị chữ
            </h3>
          </div>

          <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold theme-text-primary block">
                  Chế độ màu (Theme)
                </span>
                <span className="text-[11px] theme-text-secondary">
                  Giao diện tối chống mỏi mắt hoặc giao diện sáng
                </span>
              </div>
              <div className="flex items-center space-x-1 theme-bg-surface p-1 rounded-xl border theme-border">
                <button
                  onClick={() => updateSetting('theme', 'dark')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                  style={{
                    backgroundColor:
                      settings.theme === 'dark'
                        ? 'var(--accent-primary)'
                        : 'transparent',
                    color: settings.theme === 'dark' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <Moon className="w-3 h-3" />
                  <span>Tối</span>
                </button>
                <button
                  onClick={() => updateSetting('theme', 'light')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                  style={{
                    backgroundColor:
                      settings.theme === 'light'
                        ? 'var(--accent-primary)'
                        : 'transparent',
                    color: settings.theme === 'light' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <Sun className="w-3 h-3" />
                  <span>Sáng</span>
                </button>
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold theme-text-primary">
                  Cỡ chữ kịch bản (Font Size)
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {settings.fontSize}px
                </span>
              </div>
              <input
                type="range"
                min="16"
                max="36"
                step="1"
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', parseInt(e.target.value, 10))}
                className="w-full cursor-pointer h-1.5 rounded-lg appearance-none bg-slate-700 accent-blue-500"
              />
              <div className="flex justify-between text-[10px] theme-text-muted">
                <span>Nhỏ (16px)</span>
                <span>Vừa (22px)</span>
                <span>Lớn (36px)</span>
              </div>
            </div>

            {/* Line Height Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold theme-text-primary">
                  Giãn dòng (Line Height)
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {settings.lineHeight}
                </span>
              </div>
              <input
                type="range"
                min="1.2"
                max="2.2"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
                className="w-full cursor-pointer h-1.5 rounded-lg appearance-none bg-slate-700 accent-blue-500"
              />
              <div className="flex justify-between text-[10px] theme-text-muted">
                <span>Khít (1.2)</span>
                <span>Chuẩn (1.6)</span>
                <span>Thoáng (2.2)</span>
              </div>
            </div>

            {/* Mirror Mode Toggle */}
            <div className="flex items-center justify-between pt-1 border-t theme-border">
              <div>
                <span className="text-xs font-bold theme-text-primary block">
                  Lật gương chữ (Mirror Mode)
                </span>
                <span className="text-[11px] theme-text-secondary">
                  Dành cho kính phản quang teleprompter chuyên dụng
                </span>
              </div>
              <button
                onClick={() => updateSetting('mirrorMode', !settings.mirrorMode)}
                className="w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 focus:outline-none"
                style={{
                  backgroundColor: settings.mirrorMode
                    ? 'var(--accent-primary)'
                    : 'var(--border-subtle)'
                }}
              >
                <div
                  className="w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm"
                  style={{
                    transform: settings.mirrorMode ? 'translateX(20px)' : 'translateX(0px)'
                  }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- */}
        {/* Section 3: Tự động cuộn & Vạch kích hoạt              */}
        {/* ----------------------------------------------------- */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider theme-text-primary">
              3. Tự động cuộn & Vạch kích hoạt
            </h3>
          </div>

          <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-4">
            {/* Auto-Scroll Toggle & Speed Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold theme-text-primary block">
                    Tự động trôi chữ (Auto-Scroll)
                  </span>
                  <span className="text-[11px] theme-text-secondary">
                    Chữ tự trôi đều, tạm dừng khi chạm ngón tay
                  </span>
                </div>
                <button
                  onClick={() => updateSetting('autoScroll', !settings.autoScroll)}
                  className="w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 focus:outline-none"
                  style={{
                    backgroundColor: settings.autoScroll
                      ? 'var(--accent-primary)'
                      : 'var(--border-subtle)'
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm"
                    style={{
                      transform: settings.autoScroll ? 'translateX(20px)' : 'translateX(0px)'
                    }}
                  />
                </button>
              </div>

              {settings.autoScroll && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="theme-text-secondary">Tốc độ trôi chữ (1 - 10):</span>
                    <span className="font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                      Mức {settings.autoScrollSpeed}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={settings.autoScrollSpeed}
                    onChange={(e) => updateSetting('autoScrollSpeed', parseInt(e.target.value, 10))}
                    className="w-full cursor-pointer h-1.5 rounded-lg appearance-none bg-slate-700 accent-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Trigger Line Position */}
            <div className="space-y-2 pt-1 border-t theme-border">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold theme-text-primary block">
                    Vị trí Vạch kích hoạt chuyển slide
                  </span>
                  <span className="text-[11px] theme-text-secondary">
                    Vị trí vạch ngang kích hoạt đổi slide PC
                  </span>
                </div>
                <span className="font-mono font-bold" style={{ color: 'var(--trigger-line-color)' }}>
                  {settings.triggerPosition}%
                </span>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Đỉnh (15%)', val: 15 },
                  { label: '1/3 Trên (33%)', val: 33 },
                  { label: 'Giữa (50%)', val: 50 }
                ].map((preset) => (
                  <button
                    key={preset.val}
                    onClick={() => updateSetting('triggerPosition', preset.val)}
                    className="py-1 px-2 rounded-lg text-xs font-semibold theme-border border transition"
                    style={{
                      backgroundColor:
                        settings.triggerPosition === preset.val
                          ? 'var(--trigger-zone-bg)'
                          : 'var(--bg-surface)',
                      borderColor:
                        settings.triggerPosition === preset.val
                          ? 'var(--trigger-line-color)'
                          : 'var(--border-subtle)',
                      color:
                        settings.triggerPosition === preset.val
                          ? 'var(--trigger-line-color)'
                          : 'var(--text-secondary)'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="10"
                max="70"
                step="1"
                value={settings.triggerPosition}
                onChange={(e) => updateSetting('triggerPosition', parseInt(e.target.value, 10))}
                className="w-full cursor-pointer h-1.5 rounded-lg appearance-none bg-slate-700 accent-amber-500"
              />
            </div>

            {/* Debounce Time Slider */}
            <div className="space-y-1.5 pt-1 border-t theme-border">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold theme-text-primary block">
                    Độ trễ chống nhảy nhầm (Debounce Time)
                  </span>
                  <span className="text-[11px] theme-text-secondary">
                    Thời gian slide dừng ở vạch trước khi lệnh được gửi đi
                  </span>
                </div>
                <span className="font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {settings.debounceMs}ms
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2000"
                step="100"
                value={settings.debounceMs}
                onChange={(e) => updateSetting('debounceMs', parseInt(e.target.value, 10))}
                className="w-full cursor-pointer h-1.5 rounded-lg appearance-none bg-slate-700 accent-blue-500"
              />
              <div className="flex justify-between text-[10px] theme-text-muted">
                <span>0ms (Tức thì)</span>
                <span>500ms (Mặc định)</span>
                <span>2000ms (Chậm)</span>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- */}
        {/* Section 4: Điều khiển Máy tính & Hệ thống             */}
        {/* ----------------------------------------------------- */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <h3 className="text-sm font-bold uppercase tracking-wider theme-text-primary">
              4. Điều khiển Máy tính & Hệ thống
            </h3>
          </div>

          <div className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-4">
            {/* Key Mapping Selector */}
            <div className="space-y-2">
              <div>
                <span className="text-xs font-bold theme-text-primary block">
                  Phím giả lập trên Windows (Key Mapping)
                </span>
                <span className="text-[11px] theme-text-secondary">
                  Chọn tổ hợp phím phù hợp với phần mềm trình chiếu trên PC
                </span>
              </div>

              <div className="space-y-1.5">
                {[
                  {
                    key: 'ARROWS',
                    title: 'Phím Mũi Tên (Right / Left Arrow)',
                    desc: 'Chuẩn cho PDF, Google Slides, PowerPoint, Canva'
                  },
                  {
                    key: 'PAGEDOWN',
                    title: 'PageDown / PageUp',
                    desc: 'Bút chỉ laser vật lý, Keynote, WPS Office'
                  },
                  {
                    key: 'SPACE',
                    title: 'Phím Cách (Space / Left Arrow)',
                    desc: 'Trình chiếu web, Prezi, Slides.com'
                  }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => updateSetting('keyMapping', item.key)}
                    className="w-full text-left p-2.5 rounded-xl theme-border border transition flex items-center justify-between"
                    style={{
                      backgroundColor:
                        settings.keyMapping === item.key
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'var(--bg-surface)',
                      borderColor:
                        settings.keyMapping === item.key
                          ? 'var(--accent-primary)'
                          : 'var(--border-subtle)'
                    }}
                  >
                    <div>
                      <span className="text-xs font-bold theme-text-primary block">
                        {item.title}
                      </span>
                      <span className="text-[10px] theme-text-secondary">
                        {item.desc}
                      </span>
                    </div>
                    {settings.keyMapping === item.key && (
                      <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Minimize PC Host on Start */}
            <div className="flex items-center justify-between pt-1 border-t theme-border">
              <div>
                <span className="text-xs font-bold theme-text-primary block">
                  Tự thu nhỏ App PC khi bắt đầu
                </span>
                <span className="text-[11px] theme-text-secondary">
                  Tự động chuyển tiêu điểm phím sang ứng dụng trình chiếu
                </span>
              </div>
              <button
                onClick={() => updateSetting('autoMinimizeOnStart', !settings.autoMinimizeOnStart)}
                className="w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 focus:outline-none"
                style={{
                  backgroundColor: settings.autoMinimizeOnStart
                    ? 'var(--accent-primary)'
                    : 'var(--border-subtle)'
                }}
              >
                <div
                  className="w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm"
                  style={{
                    transform: settings.autoMinimizeOnStart
                      ? 'translateX(20px)'
                      : 'translateX(0px)'
                  }}
                />
              </button>
            </div>

            {/* Screen Wake Lock */}
            <div className="flex items-center justify-between pt-1 border-t theme-border">
              <div>
                <span className="text-xs font-bold theme-text-primary block">
                  Giữ màn hình luôn sáng (Screen Wake Lock)
                </span>
                <span className="text-[11px] theme-text-secondary">
                  Trạng thái: {wakeLockActive ? 'Đang giữ sáng màn hình' : 'Tắt'}
                </span>
              </div>
              <button
                onClick={() => updateSetting('keepAwake', !settings.keepAwake)}
                className="w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative p-0.5 focus:outline-none"
                style={{
                  backgroundColor: settings.keepAwake
                    ? 'var(--accent-primary)'
                    : 'var(--border-subtle)'
                }}
              >
                <div
                  className="w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm"
                  style={{
                    transform: settings.keepAwake
                      ? 'translateX(20px)'
                      : 'translateX(0px)'
                  }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- */}
        {/* Footer Actions                                        */}
        {/* ----------------------------------------------------- */}
        <div className="flex items-center justify-between pt-3 border-t theme-border shrink-0">
          <button
            onClick={resetSettings}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold theme-border border theme-bg-elevated theme-text-secondary hover:theme-text-primary transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>

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
