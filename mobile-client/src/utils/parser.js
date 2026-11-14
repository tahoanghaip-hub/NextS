/**
 * Parser for text matching AI Prompt Convention format
 * Format:
 * [Slide 1]: Title
 * Script content...
 * [Q&A]
 * Questions & Answers for Slide 1...
 *
 * [Slide 2]: Title
 * ...
 *
 * [Q&A Chung]
 * General Q&A for entire presentation...
 */
export function parseConventionTextToPresentationData(rawText, title = '') {
  if (!rawText || !rawText.trim()) {
    throw new Error('Vui lòng dán nội dung văn bản kịch bản.');
  }

  // 1. Separate [Q&A Chung] if present
  let slidesText = rawText;
  let generalQA = '';

  const generalQaRegex = /(?:^|\n)\s*\[Q&A\s*Chung\]\s*([\s\S]*)$/i;
  const generalQaMatch = rawText.match(generalQaRegex);
  if (generalQaMatch) {
    generalQA = generalQaMatch[1].trim();
    slidesText = rawText.slice(0, generalQaMatch.index);
  }

  // 2. Find all [Slide X] blocks
  const slideHeaderRegex = /(?:^|\n)\s*\[Slide\s*(\d+)\]\s*(?::\s*([^\n]*))?/gi;
  const matches = [...slidesText.matchAll(slideHeaderRegex)];

  if (matches.length === 0) {
    throw new Error(
      'Không tìm thấy thẻ [Slide 1], [Slide 2]... Vui lòng kiểm tra lại định dạng theo đúng Quy ước AI.'
    );
  }

  const slides = [];

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const slideNumber = parseInt(currentMatch[1], 10) || i + 1;
    let inlineTitle = currentMatch[2] ? currentMatch[2].trim() : '';

    const startIndex = currentMatch.index + currentMatch[0].length;
    const endIndex =
      i + 1 < matches.length ? matches[i + 1].index : slidesText.length;

    let slideBody = slidesText.slice(startIndex, endIndex).trim();

    // If title wasn't on the [Slide X]: Title line, check if the first line is short and can serve as title
    if (!inlineTitle && slideBody) {
      const lines = slideBody.split('\n');
      if (lines.length > 1 && lines[0].trim().length < 60) {
        inlineTitle = lines[0].trim();
        slideBody = lines.slice(1).join('\n').trim();
      }
    }

    if (!inlineTitle) {
      inlineTitle = `Slide ${slideNumber}`;
    }

    // 3. Separate slide-specific [Q&A]
    let scriptContent = slideBody;
    let qaContent = '';

    const slideQaRegex = /(?:^|\n)\s*\[Q&A\]\s*([\s\S]*)$/i;
    const slideQaMatch = slideBody.match(slideQaRegex);
    if (slideQaMatch) {
      qaContent = slideQaMatch[1].trim();
      scriptContent = slideBody.slice(0, slideQaMatch.index).trim();
    }

    slides.push({
      slideNumber,
      title: inlineTitle,
      scriptContent: scriptContent || '(Chưa có nội dung kịch bản)',
      qaContent,
      thumbnailBase64: null
    });
  }

  return {
    id: `pres-${Date.now()}`,
    title: (title || '').trim() || 'Bài thuyết trình NextS',
    totalSlides: slides.length,
    currentSlide: 1,
    isSyncLocked: true,
    updatedAt: Date.now(),
    slides,
    generalQA
  };
}

/**
 * Extracts Google Document ID from a public Google Docs or Google Slides link
 */
export function extractGoogleDocId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}
