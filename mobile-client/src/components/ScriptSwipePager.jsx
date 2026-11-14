import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback
} from 'react';
import {
  Sliders,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Play,
  Pause,
  MessageSquare,
  FileText,
  Plus,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const ScriptSwipePager = forwardRef(function ScriptSwipePager(
  { onOpenQuickEditModal },
  ref
) {
  const {
    settings,
    presentationData,
    activePagerScreen,
    setActivePagerScreen,
    goToSlide,
    stepSlide,
    adjustDesync,
    updateSetting
  } = useApp();

  const pagerRef = useRef(null);
  const scriptContainerRef = useRef(null);
  const qaContainerRef = useRef(null);

  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const pendingCandidateSlideRef = useRef(null);
  const currentActiveSlideRef = useRef(presentationData.currentSlide || 1);

  const userInteractingRef = useRef(false);
  const userTouchResumeTimerRef = useRef(null);

  // Touch gesture coordinates for horizontal swipe between Screen 1 and Screen 2
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);

  const currentSlide = presentationData.currentSlide || 1;
  const totalSlides = presentationData.totalSlides || 1;
  const slides = presentationData.slides || [];

  // Keep currentActiveSlideRef synced with presentationData.currentSlide
  useEffect(() => {
    currentActiveSlideRef.current = presentationData.currentSlide;
    if (pendingCandidateSlideRef.current === presentationData.currentSlide) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingCandidateSlideRef.current = null;
    }
  }, [presentationData.currentSlide]);

  // -------------------------------------------------------------
  // Screen Switcher Helper
  // -------------------------------------------------------------
  const switchToScreen = useCallback(
    (screenIndex) => {
      if (pagerRef.current) {
        pagerRef.current.scrollTo({
          left: screenIndex * pagerRef.current.clientWidth,
          behavior: 'smooth'
        });
        setActivePagerScreen(screenIndex);
      }
    },
    [setActivePagerScreen]
  );

  // -------------------------------------------------------------
  // Expose scrollToSlide & switchToScreen to parent via ref
  // -------------------------------------------------------------
  const scrollToSlide = useCallback(
    (slideNum) => {
      // Ensure we are viewing Screen 1 (Script View)
      if (pagerRef.current && activePagerScreen !== 0) {
        switchToScreen(0);
      }

      // Lock scroll detection during programmatic smooth scroll
      isProgrammaticScrollRef.current = true;
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }
      programmaticScrollTimerRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        programmaticScrollTimerRef.current = null;
      }, 700);

      const targetEl = document.getElementById(`slide-block-${slideNum}`);
      if (targetEl && scriptContainerRef.current) {
        const container = scriptContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const triggerOffset = containerRect.height * (settings.triggerPosition / 100);

        const targetScrollTop =
          container.scrollTop + (targetRect.top - containerRect.top) - triggerOffset + 20;

        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    },
    [activePagerScreen, settings.triggerPosition, switchToScreen]
  );

  useImperativeHandle(ref, () => ({
    scrollToSlide,
    switchToScreen
  }));

  // -------------------------------------------------------------
  // Horizontal Pager Scroll & Touch Gesture Handlers
  // -------------------------------------------------------------
  const handlePagerScroll = (e) => {
    const el = e.currentTarget;
    if (!el || el.clientWidth === 0) return;
    const pageIndex = Math.round(el.scrollLeft / el.clientWidth);
    if (pageIndex !== activePagerScreen) {
      setActivePagerScreen(pageIndex);
    }
  };

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detect intentional horizontal swipe gesture (ignoring vertical scrolling)
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      if (deltaX < -45 && activePagerScreen === 0) {
        // Swiped Right-to-Left on Screen 1 -> Switch to Screen 2 (Q&A)
        switchToScreen(1);
      } else if (deltaX > 45 && activePagerScreen === 1) {
        // Swiped Left-to-Right on Screen 2 -> Switch to Screen 1 (Script)
        switchToScreen(0);
      }
    }
  };

  // -------------------------------------------------------------
  // Screen 1: Full-Span Slide Detection + Candidate Debounce Engine
  // -------------------------------------------------------------
  const handleScriptScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const container = scriptContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const triggerViewportY =
      containerRect.top + containerRect.height * (settings.triggerPosition / 100);

    const slideElements = container.querySelectorAll('[data-slide-number]');
    if (!slideElements.length) return;

    let detectedSlide = null;
    let lastPassedSlide = null;

    for (const el of slideElements) {
      const rect = el.getBoundingClientRect();
      const slideNum = parseInt(el.getAttribute('data-slide-number'), 10);
      if (isNaN(slideNum)) continue;

      // Full-span check: does this block span across the trigger line?
      if (rect.top <= triggerViewportY + 12 && rect.bottom > triggerViewportY) {
        detectedSlide = slideNum;
        break;
      }

      // Track last slide block whose top has crossed the trigger line
      if (rect.top <= triggerViewportY + 12) {
        lastPassedSlide = slideNum;
      }
    }

    if (detectedSlide === null) {
      detectedSlide = lastPassedSlide;
    }

    if (detectedSlide === null) return;

    // If candidate matches the already active slide, clear any pending timer
    if (detectedSlide === currentActiveSlideRef.current) {
      if (pendingCandidateSlideRef.current !== null) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        pendingCandidateSlideRef.current = null;
      }
      return;
    }

    // CRITICAL: If scrolling continues within the same pending candidate slide, DO NOT reset the timer!
    if (pendingCandidateSlideRef.current === detectedSlide) {
      return;
    }

    // Only when crossing into a NEW candidate slide, start fresh countdown
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    pendingCandidateSlideRef.current = detectedSlide;
    const effectiveDebounceMs = Math.min(settings.debounceMs || 250, 400);

    debounceTimerRef.current = setTimeout(() => {
      const finalSlide = pendingCandidateSlideRef.current;
      pendingCandidateSlideRef.current = null;
      debounceTimerRef.current = null;

      if (
        finalSlide &&
        finalSlide !== currentActiveSlideRef.current &&
        !isProgrammaticScrollRef.current &&
        presentationData.isSyncLocked
      ) {
        currentActiveSlideRef.current = finalSlide;
        goToSlide(finalSlide, false);
      }
    }, effectiveDebounceMs);
  }, [
    goToSlide,
    presentationData.isSyncLocked,
    settings.debounceMs,
    settings.triggerPosition
  ]);

  // Attach requestAnimationFrame throttled scroll listener
  useEffect(() => {
    const container = scriptContainerRef.current;
    if (!container) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScriptScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleScriptScroll]);

  // -------------------------------------------------------------
  // Screen 1: Auto-Scroll Engine
  // -------------------------------------------------------------
  useEffect(() => {
    if (!settings.autoScroll) return;

    let animationFrameId = null;

    const step = () => {
      if (
        !userInteractingRef.current &&
        scriptContainerRef.current &&
        settings.autoScroll
      ) {
        const speed = (settings.autoScrollSpeed || 3) * 0.35;
        scriptContainerRef.current.scrollTop += speed;
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [settings.autoScroll, settings.autoScrollSpeed]);

  const handleUserTouchStart = () => {
    userInteractingRef.current = true;
    if (userTouchResumeTimerRef.current) {
      clearTimeout(userTouchResumeTimerRef.current);
      userTouchResumeTimerRef.current = null;
    }
  };

  const handleUserTouchEnd = () => {
    if (userTouchResumeTimerRef.current) {
      clearTimeout(userTouchResumeTimerRef.current);
    }
    userTouchResumeTimerRef.current = setTimeout(() => {
      userInteractingRef.current = false;
      userTouchResumeTimerRef.current = null;
    }, 1500);
  };

  // -------------------------------------------------------------
  // Screen 2: Smart Auto-Scroll to Current Slide's Q&A
  // -------------------------------------------------------------
  useEffect(() => {
    if (activePagerScreen === 1) {
      const targetQA = document.getElementById(`qa-slide-${currentSlide}`);
      if (targetQA && qaContainerRef.current) {
        targetQA.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activePagerScreen, currentSlide]);

  const currentSlideObj = slides.find((s) => s.slideNumber === currentSlide);
  const currentHasQA = Boolean(
    currentSlideObj &&
      currentSlideObj.qaContent &&
      currentSlideObj.qaContent.trim().length > 0
  );

  return (
    <main className="flex-1 h-full relative flex flex-col overflow-hidden theme-bg-app min-w-0">
      {/* --------------------------------------------------------- */}
      {/* Top Screen Switcher Pill Bar (Height: 32px)               */}
      {/* --------------------------------------------------------- */}
      <nav className="h-8 px-2 flex items-center justify-between border-b theme-border theme-bg-surface select-none shrink-0 z-20">
        <div className="flex items-center space-x-1.5 w-full">
          {/* Tab 1: Script */}
          <button
            onClick={() => switchToScreen(0)}
            className="flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all truncate"
            style={{
              backgroundColor:
                activePagerScreen === 0
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'transparent',
              color:
                activePagerScreen === 0
                  ? 'var(--accent-primary)'
                  : 'var(--text-secondary)',
              borderBottom:
                activePagerScreen === 0
                  ? '2px solid var(--accent-primary)'
                  : '2px solid transparent'
            }}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              1. Kịch bản (Slide {currentSlide}/{totalSlides})
            </span>
          </button>

          {/* Tab 2: Q&A */}
          <button
            onClick={() => switchToScreen(1)}
            className="flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all truncate"
            style={{
              backgroundColor:
                activePagerScreen === 1
                  ? 'rgba(59, 130, 246, 0.2)'
                  : 'transparent',
              color:
                activePagerScreen === 1
                  ? 'var(--accent-primary)'
                  : 'var(--text-secondary)',
              borderBottom:
                activePagerScreen === 1
                  ? '2px solid var(--accent-primary)'
                  : '2px solid transparent'
            }}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">2. Câu hỏi & Mở rộng (Q&A)</span>
            {currentHasQA && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--trigger-line-color)' }}
                title="Slide hiện tại có Q&A"
              />
            )}
          </button>
        </div>
      </nav>

      {/* --------------------------------------------------------- */}
      {/* 2-Screen Horizontal Swipeable Pager                       */}
      {/* --------------------------------------------------------- */}
      <div
        ref={pagerRef}
        onScroll={handlePagerScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="swipe-pager-container flex-1 relative"
      >
        {/* ======================================================= */}
        {/* SCREEN 1: KỊCH BẢN THUYẾT TRÌNH (MAIN SCRIPT VIEW)      */}
        {/* ======================================================= */}
        <section className="swipe-pager-page relative flex flex-col h-full overflow-hidden">
          {/* Non-intrusive Tiny Side Edge Trigger Marker (hugging left edge) */}
          <div
            className="absolute left-0.5 pointer-events-none z-20 -translate-y-1/2 flex items-center transition-all duration-200"
            style={{ top: `${settings.triggerPosition}%` }}
            aria-label={`Vạch chuyển slide (${settings.triggerPosition}%)`}
            title={`Vạch chuyển slide (${settings.triggerPosition}%)`}
          >
            <div
              className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[7px]"
              style={{
                borderLeftColor: 'var(--trigger-line-color)',
                filter: 'drop-shadow(0 0 4px var(--trigger-line-color))'
              }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full ml-0.5 shadow-sm"
              style={{
                backgroundColor: 'var(--trigger-line-color)',
                boxShadow: '0 0 6px var(--trigger-line-color)'
              }}
            />
          </div>

          {/* Script Sections Scrollable List */}
          <div
            ref={scriptContainerRef}
            onTouchStart={handleUserTouchStart}
            onTouchEnd={handleUserTouchEnd}
            onMouseDown={handleUserTouchStart}
            onMouseUp={handleUserTouchEnd}
            onWheel={handleUserTouchStart}
            className="flex-1 overflow-y-auto px-4 md:px-8 pt-[18vh] pb-[55vh] thin-scrollbar select-text"
          >
            <div
              className={`max-w-3xl mx-auto space-y-12 script-typography ${
                settings.mirrorMode ? 'mirror-x' : ''
              }`}
            >
              {slides.map((slide) => {
                const isActive = slide.slideNumber === currentSlide;
                const hasQA = Boolean(
                  slide.qaContent && slide.qaContent.trim().length > 0
                );

                return (
                  <article
                    key={slide.slideNumber}
                    id={`slide-block-${slide.slideNumber}`}
                    data-slide-number={slide.slideNumber}
                    className="transition-opacity duration-300 relative"
                    style={{
                      opacity: isActive ? 1 : 0.65
                    }}
                  >
                    {/* Horizontal Slide Divider & Header Badge */}
                    <div className="border-t-2 theme-border mb-4 pt-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border shadow-sm"
                          style={{
                            backgroundColor: isActive
                              ? 'var(--accent-primary)'
                              : 'var(--bg-elevated)',
                            color: isActive ? '#ffffff' : 'var(--text-primary)',
                            borderColor: isActive
                              ? 'var(--accent-primary)'
                              : 'var(--border-subtle)'
                          }}
                        >
                          SLIDE {slide.slideNumber}: {slide.title || `Slide ${slide.slideNumber}`}
                        </span>

                        {isActive && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.16)',
                              color: 'var(--success-color)'
                            }}
                          >
                            ĐANG CHIẾU
                          </span>
                        )}
                      </div>

                      {/* Quick Jump to Q&A for this slide */}
                      <button
                        onClick={() => switchToScreen(1)}
                        className="text-xs flex items-center space-x-1 px-2.5 py-1 rounded-lg theme-border border theme-bg-elevated theme-text-secondary hover:theme-text-primary transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span>Xem Q&A ({hasQA ? 'Có' : '0'})</span>
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>

                    {/* Script Body Text */}
                    <div className="whitespace-pre-line leading-relaxed theme-text-primary font-normal">
                      {slide.scriptContent || '(Slide này chưa có nội dung kịch bản)'}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Compact Floating Bottom Controls Overlay (Screen 1) */}
          <div className="absolute bottom-2.5 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-20">
            {/* Left Pill Group: Anti-Desync Offset Adjustments */}
            <div className="pointer-events-auto flex items-center gap-1 px-1.5 py-1 rounded-full border theme-border shadow-lg theme-bg-surface backdrop-blur-md">
              <button
                onClick={() => adjustDesync(-1)}
                title="Bù lùi 1 slide trên máy chiếu (Không đổi kịch bản)"
                className="flex items-center space-x-1 px-2 py-1 text-[11px] font-semibold rounded-full theme-bg-elevated theme-text-primary hover:opacity-80 active:scale-95 transition"
              >
                <Sliders className="w-2.5 h-2.5 text-amber-400" />
                <span>-1 Lệch</span>
              </button>

              <button
                onClick={() => adjustDesync(1)}
                title="Bù tiến 1 slide trên máy chiếu (Không đổi kịch bản)"
                className="flex items-center space-x-1 px-2 py-1 text-[11px] font-semibold rounded-full theme-bg-elevated theme-text-primary hover:opacity-80 active:scale-95 transition"
              >
                <Sliders className="w-2.5 h-2.5 text-amber-400" />
                <span>+1 Lệch</span>
              </button>
            </div>

            {/* Right Pill Group: Compact Playback & Step Controls */}
            <div className="pointer-events-auto flex items-center gap-1 px-1.5 py-1 rounded-full border theme-border shadow-lg theme-bg-surface backdrop-blur-md">
              {/* Auto-Scroll Toggle */}
              <button
                onClick={() => updateSetting('autoScroll', !settings.autoScroll)}
                title={settings.autoScroll ? 'Tắt tự động cuộn chữ' : 'Bật tự động cuộn chữ'}
                className="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95"
                style={{
                  backgroundColor: settings.autoScroll
                    ? 'rgba(59, 130, 246, 0.25)'
                    : 'var(--bg-elevated)',
                  color: settings.autoScroll
                    ? 'var(--accent-primary)'
                    : 'var(--text-primary)'
                }}
              >
                {settings.autoScroll ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Blackout Button */}
              <button
                onClick={() => stepSlide('BLACKOUT')}
                title="Tắt đen / Mở lại màn hình máy chiếu (Phím B)"
                className="w-7 h-7 rounded-full flex items-center justify-center theme-bg-elevated theme-text-primary hover:opacity-80 active:scale-95 transition"
              >
                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
              </button>

              {/* Prev Slide Button */}
              <button
                onClick={() => stepSlide('PREV')}
                title="Lùi 1 slide"
                disabled={currentSlide <= 1}
                className="w-7 h-7 rounded-full flex items-center justify-center theme-bg-elevated theme-text-primary hover:opacity-80 disabled:opacity-30 active:scale-95 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Next Slide Button */}
              <button
                onClick={() => stepSlide('NEXT')}
                title="Tiến 1 slide"
                disabled={currentSlide >= totalSlides}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white hover:opacity-90 disabled:opacity-30 active:scale-95 transition shadow-sm"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================= */}
        {/* SCREEN 2: CÂU HỎI & MỞ RỘNG (Q&A VIEW)                 */}
        {/* ======================================================= */}
        <section
          ref={qaContainerRef}
          className="swipe-pager-page relative flex flex-col h-full overflow-y-auto px-4 md:px-8 py-5 thin-scrollbar select-text"
        >
          <div className="max-w-3xl mx-auto w-full space-y-6 pb-20">
            {/* Interactive Return Banner to Screen 1 */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => switchToScreen(0)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold theme-border border theme-bg-surface theme-text-secondary hover:theme-text-primary active:scale-95 transition shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
                <span>← Vuốt sang phải để quay lại Kịch bản Slide {currentSlide}</span>
              </button>
            </div>

            {/* Part A: Slide-Specific Q&A Cards */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider theme-text-primary">
                  Câu hỏi & Mở rộng theo từng Slide
                </h2>
              </div>

              {slides.map((slide) => {
                const isActive = slide.slideNumber === currentSlide;
                const hasQA = Boolean(
                  slide.qaContent && slide.qaContent.trim().length > 0
                );

                return (
                  <div
                    key={slide.slideNumber}
                    id={`qa-slide-${slide.slideNumber}`}
                    className="rounded-2xl p-4 transition-all duration-300 theme-border border"
                    style={{
                      borderWidth: isActive ? '2px' : '1px',
                      borderColor: isActive
                        ? 'var(--accent-primary)'
                        : 'var(--border-subtle)',
                      backgroundColor: isActive
                        ? 'rgba(59, 130, 246, 0.08)'
                        : 'var(--bg-surface)',
                      boxShadow: isActive
                        ? '0 0 15px rgba(59, 130, 246, 0.2)'
                        : 'none'
                    }}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between mb-3 border-b theme-border pb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            backgroundColor: isActive
                              ? 'var(--accent-primary)'
                              : 'var(--bg-elevated)',
                            color: isActive ? '#ffffff' : 'var(--text-primary)'
                          }}
                        >
                          Slide {slide.slideNumber}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold theme-text-primary truncate">
                          {slide.title} — CÂU HỎI & MỞ RỘNG
                        </h3>
                      </div>

                      {isActive && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            color: 'var(--accent-primary)'
                          }}
                        >
                          Slide đang chiếu
                        </span>
                      )}
                    </div>

                    {/* Card Body */}
                    {hasQA ? (
                      <div className="script-typography whitespace-pre-line theme-text-primary leading-relaxed text-sm sm:text-base">
                        {slide.qaContent}
                      </div>
                    ) : (
                      <div className="py-3 flex flex-col items-center justify-center text-center space-y-2">
                        <p className="text-xs theme-text-muted">
                          Chưa có câu hỏi mở rộng riêng cho slide này.
                        </p>
                        <button
                          onClick={() =>
                            onOpenQuickEditModal &&
                            onOpenQuickEditModal('structured', slide.slideNumber)
                          }
                          className="flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold theme-border border theme-bg-elevated theme-text-primary hover:opacity-80 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm Q&A</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Part B: Bottom Unnumbered General Q&A Section */}
            <div className="pt-6 border-t-2 theme-border space-y-3">
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full theme-bg-elevated theme-border border theme-text-secondary">
                  === CÂU HỎI & NỘI DUNG MỞ RỘNG CHUNG (CUỐI BÀI) ===
                </span>
              </div>

              <div className="rounded-2xl p-5 theme-bg-surface theme-border border shadow-sm">
                <div className="script-typography whitespace-pre-line theme-text-primary leading-relaxed text-sm sm:text-base">
                  {presentationData.generalQA ||
                    'Chưa có câu hỏi chung cuối bài. Bạn có thể thêm trong phần Sửa Nhanh.'}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
});

export default ScriptSwipePager;
