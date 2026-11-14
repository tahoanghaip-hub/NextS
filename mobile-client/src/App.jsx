import React, { useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useApp } from './context/AppContext';
import TopBar from './components/TopBar';
import SlideSidebar from './components/SlideSidebar';
import ScriptSwipePager from './components/ScriptSwipePager';
import SettingsModal from './components/SettingsModal';
import QuickEditModal from './components/QuickEditModal';
import ConnectionModal from './components/ConnectionModal';

export default function App() {
  const { toastMessage, goToSlide } = useApp();

  // Modal open states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConnectionOpen, setIsConnectionOpen] = useState(false);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditTab, setQuickEditTab] = useState('structured');
  const [quickEditSlideNum, setQuickEditSlideNum] = useState(null);

  // Ref to ScriptSwipePager to trigger programmatic scroll on slide selection
  const pagerRef = useRef(null);

  const handleSelectSlide = (slideNumber) => {
    goToSlide(slideNumber, true);
    if (pagerRef.current) {
      pagerRef.current.scrollToSlide(slideNumber);
    }
  };

  const handleOpenQuickEdit = (tab = 'structured', slideNumber = null) => {
    setQuickEditTab(tab);
    setQuickEditSlideNum(slideNumber);
    setIsQuickEditOpen(true);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden theme-bg-app theme-text-primary antialiased select-none">
      {/* --------------------------------------------------------- */}
      {/* Toast Notification Banner                                */}
      {/* --------------------------------------------------------- */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out max-w-sm w-auto px-4 pointer-events-none">
          <div
            className="theme-bg-elevated theme-border border px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 text-xs font-semibold backdrop-blur-md"
            style={{ borderColor: 'var(--accent-primary)' }}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
            <span className="theme-text-primary truncate">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* Top Navigation Bar (52px)                                 */}
      {/* --------------------------------------------------------- */}
      <TopBar
        onOpenConnectionModal={() => setIsConnectionOpen(true)}
        onOpenQuickEditModal={(tab) => handleOpenQuickEdit(tab || 'structured')}
        onOpenImportModal={() => handleOpenQuickEdit('import')}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
      />

      {/* --------------------------------------------------------- */}
      {/* Main Workspace (1/5 Left Sidebar + 4/5 Dual-Screen Pager)  */}
      {/* --------------------------------------------------------- */}
      <div className="h-[calc(100dvh-52px)] w-full flex overflow-hidden theme-bg-app relative">
        {/* Left Column (1/5): Slide Quick-Jump Rail */}
        <SlideSidebar onSelectSlide={handleSelectSlide} />

        {/* Right Column (4/5): Horizontal Swipe Pager (Script <-> Q&A) */}
        <ScriptSwipePager
          ref={pagerRef}
          onOpenQuickEditModal={handleOpenQuickEdit}
        />
      </div>

      {/* --------------------------------------------------------- */}
      {/* Modals & Dialogs                                         */}
      {/* --------------------------------------------------------- */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <QuickEditModal
        isOpen={isQuickEditOpen}
        onClose={() => setIsQuickEditOpen(false)}
        initialTab={quickEditTab}
        initialSlideNumber={quickEditSlideNum}
      />

      <ConnectionModal
        isOpen={isConnectionOpen}
        onClose={() => setIsConnectionOpen(false)}
      />
    </div>
  );
}
