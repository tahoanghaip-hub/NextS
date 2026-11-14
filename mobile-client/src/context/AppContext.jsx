import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_SETTINGS, AI_PROMPT_CONVENTION_TEXT } from '../constants/promptConvention';
import { connectionManager } from '../services/ConnectionManager';

const SETTINGS_STORAGE_KEY = 'nexts_app_settings_v1';

// Initial fallback presentation deck
const INITIAL_FALLBACK_PRESENTATION = {
  id: 'pres-default-001',
  title: 'Chiến lược Chuyển đổi Số & Ứng dụng AI 2026',
  totalSlides: 5,
  currentSlide: 1,
  isSyncLocked: true,
  updatedAt: Date.now(),
  slides: [
    {
      slideNumber: 1,
      title: 'Tổng quan chuyển đổi số',
      scriptContent: 'Kính chào quý thầy cô, ban giám khảo và toàn thể các bạn có mặt trong hội trường ngày hôm nay. Tôi rất vinh dự được đại diện nhóm nghiên cứu trình bày về Chiến lược Chuyển đổi Số và Ứng dụng Trí tuệ Nhân tạo giai đoạn 2026. Trong bối cảnh công nghệ đang tái định hình mọi ngành công nghiệp, việc chủ động làm chủ dữ liệu và tự động hóa quy trình không còn là một lựa chọn xa xỉ mà đã trở thành yếu tố sống còn. Hôm nay, chúng ta sẽ cùng đi qua ba trụ cột then chốt giúp doanh nghiệp bứt phá ngoạn mục trong kỷ nguyên mới.',
      qaContent: 'Câu hỏi 1: Đâu là thách thức lớn nhất khi doanh nghiệp bắt đầu chuyển đổi số?\nTrả lời: Rào cản lớn nhất thường không nằm ở công nghệ mà nằm ở văn hóa tổ chức và thói quen làm việc thủ công của nhân sự.',
      thumbnailBase64: null
    },
    {
      slideNumber: 2,
      title: 'Hiện trạng và thách thức',
      scriptContent: 'Bước sang phần thực trạng, dữ liệu khảo sát từ hơn năm trăm doanh nghiệp vừa và nhỏ cho thấy hơn bảy mươi phần trăm vẫn đang gặp khó khăn trong việc chuẩn hóa dữ liệu. Hệ thống công nghệ phân mảnh và dữ liệu lưu trữ rời rạc khiến việc ra quyết định bị chậm trễ đáng kể. Thêm vào đó, chi phí đầu tư ban đầu cho cơ sở hạ tầng đám mây thường vượt quá ngân sách dự kiến nếu không có chiến lược tối ưu từ đầu. Đây chính là nút thắt cổ chai mà giải pháp của chúng tôi tập trung giải quyết.',
      qaContent: 'Câu hỏi 1: Doanh nghiệp nhỏ với ngân sách hạn hẹp nên ưu tiên số hóa khâu nào trước?\nTrả lời: Nên ưu tiên số hóa quy trình quản lý khách hàng (CRM) và quy trình kế toán - bán hàng để tạo ra dòng tiền và hiệu quả thấy ngay.',
      thumbnailBase64: null
    },
    {
      slideNumber: 3,
      title: 'Kiến trúc giải pháp NextS',
      scriptContent: 'Để vượt qua các rào cản trên, chúng tôi giới thiệu kiến trúc NextS với ba lớp xử lý thông minh và khả năng hoạt động ngoại tuyến linh hoạt. Lớp điều khiển trung tâm được xây dựng trên nền tảng Node.js gọn nhẹ, kết hợp cơ chế gửi tín hiệu phần cứng trực tiếp không phụ thuộc driver phức tạp. Lớp hiển thị hỗ trợ máy nhắc chữ thời gian thực với độ trễ dưới năm mili-giây, cho phép người thuyết trình kiểm soát bài giảng hoàn toàn tự nhiên. Toàn bộ dữ liệu được đồng bộ song song qua giao thức WebSocket và Bluetooth năng lượng thấp.',
      qaContent: 'Câu hỏi 1: Tại sao giải pháp lại chọn cơ chế gửi phím qua PowerShell thay vì cài đặt driver C++ chuyên dụng?\nTrả lời: Cơ chế PowerShell không phụ thuộc bất kỳ thư viện C++ native nào, đảm bảo phần mềm chạy ngay lập tức trên mọi máy tính Windows mà không cần quyền quản trị viên phức tạp.',
      thumbnailBase64: null
    },
    {
      slideNumber: 4,
      title: 'Lộ trình triển khai thực tế',
      scriptContent: 'Về lộ trình triển khai, dự án được chia làm bốn giai đoạn nối tiếp nhau trong vòng mười hai tháng. Giai đoạn một tập trung vào việc thử nghiệm nội bộ và hoàn thiện hệ thống máy nhắc chữ cùng bộ điều khiển chống lệch slide. Giai đoạn hai sẽ mở rộng tích hợp trí tuệ nhân tạo để tự động tóm tắt kịch bản và gợi ý câu hỏi phản biện theo ngữ cảnh. Hai giai đoạn cuối cùng sẽ triển khai thí điểm tại các trường đại học và hội thảo quy mô lớn để thu thập phản hồi thực tế trước khi phát hành chính thức.',
      qaContent: 'Câu hỏi 1: Nếu thời gian triển khai bị kéo dài, các biện pháp dự phòng là gì?\nTrả lời: Nhóm đã xây dựng sẵn các mốc tính năng tối thiểu (MVP) có thể vận hành độc lập để đảm bảo luôn có phiên bản ổn định phục vụ người dùng đúng hạn.',
      thumbnailBase64: null
    },
    {
      slideNumber: 5,
      title: 'Kết luận và tầm nhìn',
      scriptContent: 'Tổng kết lại, bài thuyết trình đã làm rõ tầm quan trọng của việc làm chủ công nghệ thuyết trình thông minh và tự động hóa điều khiển slide. Với NextS, người thuyết trình hoàn toàn tự tin làm chủ sân khấu mà không còn phải lo lắng về việc bấm nhầm slide hay quên kịch bản. Chúng tôi tin rằng công nghệ phải phục vụ con người một cách tự nhiên và vô hình nhất. Xin chân thành cảm ơn ban giám khảo và các bạn đã chú ý lắng nghe, xin mời mọi người đặt câu hỏi phản biện.',
      qaContent: 'Câu hỏi 1: Định hướng phát triển thương mại hóa của dự án trong tương lai như thế nào?\nTrả lời: Dự án phát triển theo mô hình mã nguồn mở kết hợp gói tính năng nâng cao (Freemium) dành cho diễn giả chuyên nghiệp và các trung tâm đào tạo.',
      thumbnailBase64: null
    }
  ],
  generalQA: 'Câu hỏi chung 1: Hệ thống có hoạt động khi phòng thuyết trình mất hoàn toàn mạng Internet không?\nTrả lời: Hoàn toàn hoạt động. Điện thoại có thể phát Wi-Fi Hotspot cho máy tính hoặc kết nối trực tiếp qua Bluetooth BLE mà không cần kết nối Internet ra bên ngoài.\n\nCâu hỏi chung 2: Kịch bản thuyết trình có bị giới hạn độ dài chữ không?\nTrả lời: Hệ thống hỗ trợ kịch bản không giới hạn với cơ chế cuộn mượt và vạch kích hoạt quang học tự động chuyển slide.\n\nCâu hỏi chung 3: Làm sao đảm bảo máy chiếu và điện thoại không bị lệch số trang slide?\nTrả lời: Hệ thống trang bị tính năng Khóa Đồng Bộ (Sync Lock) kết hợp thuật toán tính khoảng cách delta và hai nút bù lệch (+1 / -1) giúp lập tức tái đồng bộ chỉ với một chạm.'
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // 1. Settings state (initialized from localStorage merged with defaults)
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[AppContext] Could not parse stored settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // 2. Presentation data state
  const [presentationData, setPresentationData] = useState(INITIAL_FALLBACK_PRESENTATION);

  // 3. Network & Connection states
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    mode: 'DISCONNECTED',
    latencyMs: 0
  });

  const [networkInfo, setNetworkInfo] = useState({
    interfaces: [],
    selectedIp: '',
    connectUrl: '',
    qrDataUrl: '',
    serverPort: 3000,
    loading: true
  });

  // 4. Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);

  // 5. Screen WakeLock state
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockSentinelRef = useRef(null);

  // 6. Toast Notification state
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2500);
  }, []);

  // -------------------------------------------------------------
  // DOM & CSS Variables Synchronization Effect
  // -------------------------------------------------------------
  useEffect(() => {
    const root = document.documentElement;

    // Apply data-theme
    root.setAttribute('data-theme', settings.theme);

    // Apply Teleprompter typography & trigger position custom properties
    root.style.setProperty('--script-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--script-line-height', `${settings.lineHeight}`);
    root.style.setProperty('--trigger-line-top', `${settings.triggerPosition}%`);

    // Persist settings
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('[AppContext] Failed to save settings to localStorage:', err);
    }
  }, [settings]);

  // -------------------------------------------------------------
  // Screen WakeLock Management
  // -------------------------------------------------------------
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && settings.keepAwake) {
      try {
        if (!wakeLockSentinelRef.current) {
          wakeLockSentinelRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          wakeLockSentinelRef.current.addEventListener('release', () => {
            setWakeLockActive(false);
            wakeLockSentinelRef.current = null;
          });
        }
      } catch (err) {
        console.warn('[AppContext] WakeLock request failed:', err.message);
        setWakeLockActive(false);
      }
    }
  }, [settings.keepAwake]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch (e) {
        // Ignore
      }
      wakeLockSentinelRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    if (settings.keepAwake) {
      requestWakeLock();
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && settings.keepAwake) {
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseWakeLock();
      };
    } else {
      releaseWakeLock();
    }
  }, [settings.keepAwake, requestWakeLock, releaseWakeLock]);

  // -------------------------------------------------------------
  // Timer Management
  // -------------------------------------------------------------
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  const startTimer = () => setIsTimerRunning(true);
  const pauseTimer = () => setIsTimerRunning(false);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const formattedTimer = (() => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  })();

  // -------------------------------------------------------------
  // Network Info Fetching
  // -------------------------------------------------------------
  const fetchNetworkInfo = useCallback(async (preferredIp = null) => {
    try {
      const url = preferredIp
        ? `/api/network-info?ip=${encodeURIComponent(preferredIp)}`
        : '/api/network-info';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo({
          ...data,
          loading: false
        });
      }
    } catch (err) {
      console.warn('[AppContext] Failed to fetch /api/network-info:', err.message);
      setNetworkInfo((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo]);

  const selectIp = (ip) => {
    fetchNetworkInfo(ip);
  };

  // -------------------------------------------------------------
  // ConnectionManager WebSocket Subscriptions
  // -------------------------------------------------------------
  useEffect(() => {
    const unsubStatus = connectionManager.subscribeStatus((status) => {
      setConnectionStatus(status);
    });

    const unsubMessage = connectionManager.subscribeMessage((msg) => {
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'STATE_SYNC':
          if (msg.payload) {
            setPresentationData(msg.payload);
          }
          if (msg.keyMapping && msg.keyMapping !== settings.keyMapping) {
            setSettings((prev) => ({ ...prev, keyMapping: msg.keyMapping }));
          }
          break;

        case 'KEY_EXEC_RESULT':
          if (msg.action === 'ADJUST_DESYNC') {
            const dir = msg.offset > 0 ? '+1' : '-1';
            showToast(`Đã bù lệch máy chiếu ${dir} slide (Không đổi kịch bản)`);
          } else if (msg.action === 'GOTO_SLIDE') {
            showToast(`Đã đồng bộ đến Slide ${msg.currentSlide}`);
          }
          break;

        default:
          break;
      }
    });

    return () => {
      unsubStatus();
      unsubMessage();
    };
  }, [settings.keyMapping, showToast]);

  // Initial fetch of /api/state for fast hydration
  useEffect(() => {
    fetch('/api/state')
      .then((res) => res.json())
      .then((data) => {
        if (data.presentationData) {
          setPresentationData(data.presentationData);
        }
        if (data.keyMapping) {
          setSettings((prev) => ({ ...prev, keyMapping: data.keyMapping }));
        }
      })
      .catch((e) => {
        // Fallback already in place
      });
  }, []);

  // -------------------------------------------------------------
  // Action Handlers
  // -------------------------------------------------------------
  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'keyMapping') {
        connectionManager.send({
          type: 'UPDATE_KEYMAP',
          keyMapping: value
        });
      }
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const goToSlide = (targetSlide, force = false) => {
    const target = Number(targetSlide);
    if (isNaN(target)) return;

    connectionManager.send({
      type: 'GOTO_SLIDE',
      targetSlide: target,
      force
    });

    // Optimistic UI update
    setPresentationData((prev) => ({
      ...prev,
      currentSlide: Math.max(1, Math.min(prev.totalSlides, target))
    }));
  };

  const stepSlide = (direction) => {
    // direction: 'NEXT' | 'PREV' | 'BLACKOUT'
    connectionManager.send({
      type: 'STEP_SLIDE',
      direction
    });

    if (direction === 'NEXT') {
      setPresentationData((prev) => ({
        ...prev,
        currentSlide: Math.min(prev.totalSlides, prev.currentSlide + 1)
      }));
    } else if (direction === 'PREV') {
      setPresentationData((prev) => ({
        ...prev,
        currentSlide: Math.max(1, prev.currentSlide - 1)
      }));
    }
  };

  const adjustDesync = (offset) => {
    // offset: +1 or -1
    connectionManager.send({
      type: 'ADJUST_DESYNC',
      offset
    });
  };

  const toggleSyncLock = () => {
    const nextLocked = !presentationData.isSyncLocked;
    connectionManager.send({
      type: 'TOGGLE_SYNC_LOCK',
      isSyncLocked: nextLocked
    });
    setPresentationData((prev) => ({
      ...prev,
      isSyncLocked: nextLocked
    }));
    showToast(nextLocked ? 'Đã bật Khóa Đồng Bộ (Sync Lock)' : 'Đã bật Chế độ Xem Tự Do (Free Preview)');
  };

  const updateScriptData = (newPresentationData) => {
    connectionManager.send({
      type: 'UPDATE_SCRIPT',
      payload: newPresentationData
    });
    setPresentationData(newPresentationData);
    showToast('Đã cập nhật kịch bản thuyết trình!');
  };

  const startPresentation = () => {
    connectionManager.send({
      type: 'START_PRESENTATION',
      autoMinimize: settings.autoMinimizeOnStart
    });
    setPresentationData((prev) => ({
      ...prev,
      isSyncLocked: true
    }));
    startTimer();
    showToast('Đã bắt đầu bài thuyết trình & lấy nét cửa sổ trình chiếu!');
  };

  /**
   * Copies AI_PROMPT_CONVENTION_TEXT to clipboard.
   * Uses navigator.clipboard.writeText with fallback <textarea> copy so it works over non-HTTPS LAN IPs on mobile.
   */
  const copyAiPromptConvention = async () => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(AI_PROMPT_CONVENTION_TEXT);
        success = true;
      }
    } catch (err) {
      console.warn('[AppContext] navigator.clipboard failed, attempting fallback:', err);
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = AI_PROMPT_CONVENTION_TEXT;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.error('[AppContext] Fallback copy failed:', e);
      }
    }

    if (success) {
      showToast('Đã sao chép Prompt Quy Ước cho AI!');
    } else {
      showToast('Không thể tự động sao chép. Hãy chọn nội dung thủ công.');
    }
  };

  const value = {
    settings,
    presentationData,
    connectionStatus,
    networkInfo,
    timerSeconds,
    isTimerRunning,
    formattedTimer,
    wakeLockActive,
    toastMessage,
    showToast,
    selectIp,
    updateSetting,
    resetSettings,
    goToSlide,
    stepSlide,
    adjustDesync,
    toggleSyncLock,
    updateScriptData,
    startPresentation,
    copyAiPromptConvention,
    startTimer,
    pauseTimer,
    resetTimer
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
