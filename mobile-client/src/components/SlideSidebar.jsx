import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export default function SlideSidebar({ onSelectSlide }) {
  const { presentationData, goToSlide } = useApp();
  const activeCardRef = useRef(null);

  // Auto-scroll active card into view within the sidebar rail
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [presentationData.currentSlide]);

  const handleCardClick = (slideNumber) => {
    if (onSelectSlide) {
      onSelectSlide(slideNumber);
    } else {
      goToSlide(slideNumber, true);
    }
  };

  const slides = presentationData.slides || [];
  const currentSlide = presentationData.currentSlide || 1;

  return (
    <aside className="w-1/5 min-w-[68px] max-w-[110px] h-full border-r theme-border theme-bg-surface flex flex-col overflow-y-auto thin-scrollbar select-none shrink-0">
      {/* ----------------------------------------------------- */}
      {/* Header                                                 */}
      {/* ----------------------------------------------------- */}
      <div className="py-2 px-1 border-b theme-border text-center sticky top-0 theme-bg-surface z-10">
        <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase theme-text-secondary block truncate">
          SLIDES ({presentationData.totalSlides || slides.length})
        </span>
      </div>

      {/* ----------------------------------------------------- */}
      {/* Slide Cards List                                       */}
      {/* ----------------------------------------------------- */}
      <div className="p-1.5 space-y-2 flex-1">
        {slides.map((slide) => {
          const isActive = slide.slideNumber === currentSlide;
          const hasQA = Boolean(slide.qaContent && slide.qaContent.trim().length > 0);

          return (
            <button
              key={slide.slideNumber}
              ref={isActive ? activeCardRef : null}
              onClick={() => handleCardClick(slide.slideNumber)}
              className="w-full text-left rounded-xl p-1.5 transition-all duration-200 relative flex flex-col items-center group cursor-pointer focus:outline-none"
              style={{
                borderWidth: isActive ? '2px' : '1px',
                borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-subtle)',
                backgroundColor: isActive
                  ? 'rgba(59, 130, 246, 0.16)'
                  : 'var(--bg-elevated)',
                boxShadow: isActive ? '0 0 10px rgba(59, 130, 246, 0.25)' : 'none'
              }}
            >
              {/* Q&A Micro-Badge indicator in top-right corner */}
              {hasQA && (
                <span
                  title="Có ghi chú Q&A mở rộng"
                  className="absolute -top-1 -right-1 text-[9px] font-bold px-1 py-0.2 rounded-full border shadow-sm z-10"
                  style={{
                    backgroundColor: 'var(--trigger-zone-bg)',
                    borderColor: 'var(--trigger-line-color)',
                    color: 'var(--trigger-line-color)'
                  }}
                >
                  Q&A
                </span>
              )}

              {/* Slide Number Badge */}
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs mb-1"
                style={{
                  backgroundColor: isActive
                    ? 'var(--accent-primary)'
                    : 'var(--border-subtle)',
                  color: isActive ? '#ffffff' : 'var(--text-primary)'
                }}
              >
                {slide.slideNumber}
              </div>

              {/* Optional Thumbnail Image */}
              {slide.thumbnailBase64 && (
                <img
                  src={slide.thumbnailBase64}
                  alt={`Thumbnail Slide ${slide.slideNumber}`}
                  className="w-full aspect-video object-cover rounded mb-1 border theme-border"
                />
              )}

              {/* Slide Title Preview (3-5 words) */}
              <span
                className="text-[10px] leading-tight text-center line-clamp-2 w-full break-words"
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? '700' : '500'
                }}
              >
                {slide.title || `Slide ${slide.slideNumber}`}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
