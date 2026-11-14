import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Set up pdfjs worker
try {
  if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
} catch (e) {
  console.warn('[fileProcessors] Could not assign pdf.worker.min.js URL:', e);
}

/**
 * Helper to extract 3 to 5 words short title (up to 45 chars)
 */
export function extractShortTitle(text, fallbackIndex = 1) {
  if (!text || typeof text !== 'string') {
    return `Slide ${fallbackIndex}`;
  }

  const cleaned = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_~`>[\]()="':\-\\/|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return `Slide ${fallbackIndex}`;
  }

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length === 0) {
    return `Slide ${fallbackIndex}`;
  }

  const count = Math.min(words.length, 5);
  const hasMoreWords = words.length > 5;
  let title = words.slice(0, count).join(' ');

  if (title.length > 45) {
    title = title.slice(0, 42).trim() + '...';
  } else if (hasMoreWords) {
    title = title + '...';
  }

  return title || `Slide ${fallbackIndex}`;
}

/**
 * Generates a sleek 16:9 synthetic preview card on Canvas exported as WebP
 * Canvas: 240 x 135 px (16:9 aspect ratio)
 */
export function generateSlideCardWebp(slideNumber, title, snippetText = '') {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 135;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Background gradient: Modern dark presentation slate
    const bgGradient = ctx.createLinearGradient(0, 0, 240, 135);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 240, 135);

    // Accent top bar
    const barGradient = ctx.createLinearGradient(0, 0, 240, 0);
    barGradient.addColorStop(0, '#3b82f6');
    barGradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = barGradient;
    ctx.fillRect(0, 0, 240, 4);

    // Slide Number badge
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.beginPath();
    ctx.roundRect(12, 14, 60, 20, 4);
    ctx.fill();

    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(`SLIDE ${slideNumber}`, 18, 28);

    // Clean Slide Title
    const displayTitle = extractShortTitle(title, slideNumber);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';

    // Simple text wrapping for title up to 2 lines
    const titleWords = displayTitle.split(' ');
    let line1 = '';
    let line2 = '';
    for (const w of titleWords) {
      if ((line1 + ' ' + w).length <= 22) {
        line1 += (line1 ? ' ' : '') + w;
      } else {
        line2 += (line2 ? ' ' : '') + w;
      }
    }

    ctx.fillText(line1, 12, 54);
    if (line2) {
      ctx.fillText(line2, 12, 70);
    }

    // Snippet preview line
    if (snippetText) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      const snippet = snippetText.replace(/\s+/g, ' ').slice(0, 36) + '...';
      ctx.fillText(snippet, 12, 94);
    }

    // Bottom subtle brand badge
    ctx.fillStyle = '#475569';
    ctx.font = '9px system-ui, -apple-system, sans-serif';
    ctx.fillText('NextS Preview', 12, 122);

    return canvas.toDataURL('image/webp', 0.7);
  } catch (err) {
    console.warn('[fileProcessors] Error creating synthetic slide card:', err);
    return null;
  }
}

/**
 * 4.1. PDF Text + Low-Res WebP Thumbnail Extractor
 * Uses pdfjs-dist to load PDF ArrayBuffer, extracts text and renders 240px wide WebP thumbnails
 */
export async function processPdfFile(file, onProgress) {
  if (!file) throw new Error('Không có file PDF để xử lý.');

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const slides = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);

      // Extract plain text runs
      let slideText = '';
      try {
        const textContent = await page.getTextContent();
        slideText = textContent.items
          .map((item) => (item.str || ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch (textErr) {
        console.warn(`[fileProcessors] Error extracting text from page ${pageNum}:`, textErr);
      }

      // Title from first 3-5 words
      const title = extractShortTitle(slideText, pageNum);

      // Render 240px WebP thumbnail on offscreen Canvas
      let thumbnailBase64 = null;
      try {
        const defaultViewport = page.getViewport({ scale: 1 });
        const targetWidth = 240;
        const scale = targetWidth / (defaultViewport.width || 1);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = Math.max(100, Math.round(viewport.height));
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const renderContext = {
            canvasContext: ctx,
            viewport
          };
          await page.render(renderContext).promise;
          thumbnailBase64 = canvas.toDataURL('image/webp', 0.65);
        }
      } catch (renderErr) {
        console.warn(`[fileProcessors] PDF page ${pageNum} canvas render failed, generating synthetic card:`, renderErr);
        thumbnailBase64 = generateSlideCardWebp(pageNum, title, slideText);
      }

      slides.push({
        slideNumber: pageNum,
        title,
        slideText,
        speakerNotes: '',
        thumbnailBase64
      });
    } catch (pageErr) {
      console.warn(`[fileProcessors] Failed processing PDF page ${pageNum}:`, pageErr);
      const title = `Slide ${pageNum}`;
      slides.push({
        slideNumber: pageNum,
        title,
        slideText: '',
        speakerNotes: '',
        thumbnailBase64: generateSlideCardWebp(pageNum, title)
      });
    }

    if (typeof onProgress === 'function') {
      onProgress(pageNum, numPages);
    }
  }

  const baseTitle = file.name.replace(/\.[^/.]+$/, '');

  return {
    id: `pres-${Date.now()}`,
    title: extractShortTitle(baseTitle, 1).replace(/\.{3}$/, ''),
    totalSlides: slides.length,
    currentSlide: 1,
    isSyncLocked: true,
    updatedAt: Date.now(),
    slides,
    generalQA: ''
  };
}

/**
 * 4.3. Unified Upload & Merge Coordinator
 * Handles local PDF WebP rendering + FormData multipart upload to POST /api/parse-files
 */
export async function uploadAndProcessFiles({
  scriptFile = null,
  slideFile = null,
  rawText = '',
  mergeMode = 'MERGE',
  connectionMode = 'WIFI',
  onProgress = null
}) {
  let clientSlidesData = null;

  // If slideFile is a PDF, render low-res WebP thumbnails and extract page text on client
  if (slideFile && slideFile.name.toLowerCase().endsWith('.pdf')) {
    if (onProgress) onProgress({ status: 'RENDERING_PDF', current: 0, total: 1, message: 'Đang chuẩn bị bóc tách file PDF...' });

    clientSlidesData = await processPdfFile(slideFile, (current, total) => {
      if (onProgress) {
        onProgress({
          status: 'RENDERING_PDF',
          current,
          total,
          percent: Math.round((current / total) * 100),
          message: `Đang trích xuất & nén WebP trang ${current}/${total}...`
        });
      }
    });
  }

  if (onProgress) {
    onProgress({
      status: 'UPLOADING',
      percent: 90,
      message: 'Đang gửi dữ liệu lên máy chủ và căn chỉnh kịch bản...'
    });
  }

  // Construct FormData
  const formData = new FormData();
  if (scriptFile) {
    formData.append('scriptFile', scriptFile);
  }
  if (slideFile) {
    formData.append('slideFile', slideFile);
  }
  if (rawText && rawText.trim()) {
    formData.append('rawText', rawText.trim());
  }
  formData.append('mergeMode', mergeMode);

  if (clientSlidesData) {
    formData.append('clientSlidesJson', JSON.stringify(clientSlidesData));
  }

  const response = await fetch('/api/parse-files', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Lỗi máy chủ: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Bóc tách file thất bại.');
  }

  // If the slides returned do not have thumbnails and transport is not BLE, generate synthetic cards
  if (connectionMode !== 'BLE' && data.presentationData?.slides) {
    data.presentationData.slides = data.presentationData.slides.map((s) => {
      if (!s.thumbnailBase64) {
        return {
          ...s,
          thumbnailBase64: generateSlideCardWebp(s.slideNumber, s.title, s.scriptContent)
        };
      }
      return s;
    });
  }

  if (onProgress) {
    onProgress({
      status: 'COMPLETE',
      percent: 100,
      message: 'Hoàn tất bóc tách & đồng bộ!'
    });
  }

  return data;
}
