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
  const totalSlides = presentationData.totalSlides || slides.length;

  return (
    <aside className="w-[40px] min-w-[40px] max-w-[42px] h-full border-r theme-border theme-bg-surface flex flex-col items-center py-1.5 overflow-y-auto no-scrollbar select-none z-20 shrink-0">
      {/* ----------------------------------------------------- */}
      {/* Compact Header                                         */}
      {/* ----------------------------------------------------- */}
      <div
        className="text-[10px] font-bold theme-text-secondary mb-1.5 select-none shrink-0"
        title={`Tổng số ${totalSlides} slides`}
      >
        #{totalSlides}
      </div>

      {/* ----------------------------------------------------- */}
      {/* Compact Slide Number Buttons                           */}
      {/* ----------------------------------------------------- */}
      <div className="flex flex-col items-center w-full px-1">
        {slides.map((slide) => {
          const isActive = slide.slideNumber === currentSlide;
          const hasQA = Boolean(slide.qaContent && slide.qaContent.trim().length > 0);

          return (
            <button
              key={slide.slideNumber}
              ref={isActive ? activeCardRef : null}
              onClick={() => handleCardClick(slide.slideNumber)}
              title={`Slide ${slide.slideNumber}: ${slide.title || ''}`}
              className={`w-[32px] h-[32px] mb-1.5 rounded-lg flex items-center justify-center relative font-bold text-xs transition-all cursor-pointer focus:outline-none shrink-0 ${
                isActive ? 'scale-105' : 'hover:opacity-90'
              }`}
              style={{
                backgroundColor: isActive
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                border: isActive ? 'none' : '1px solid var(--border-subtle)',
                boxShadow: isActive
                  ? '0 0 10px rgba(59, 130, 246, 0.45)'
                  : 'none'
              }}
            >
              {slide.slideNumber}

              {/* Q&A Micro-Dot */}
              {hasQA && (
                <span
                  title="Có ghi chú Q&A"
                  className="w-1.5 h-1.5 rounded-full absolute -top-0.5 -right-0.5 shadow-sm"
                  style={{ backgroundColor: 'var(--trigger-line-color)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
