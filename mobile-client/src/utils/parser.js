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

import { extractShortTitle } from './fileProcessors';

export { extractShortTitle };

export function parseConventionTextToPresentationData(rawText, title = '') {
  if (!rawText || !rawText.trim()) {
    throw new Error('Vui lòng dán nội dung văn bản kịch bản.');
  }

  // 1. Separate [Q&A Chung] if present
  let slidesText = rawText;
  let generalQA = '';

  const generalQaRegex = /(?:^|\n)\s*(?:\[\s*(?:Q&A\s*Chung|Câu\s*hỏi\s*chung)\s*\]|={3,}\s*Q&A\s*Chung\s*={3,}|Phần\s*câu\s*hỏi\s*chung\s*:?)\s*([\s\S]*)$/i;
  const generalQaMatch = rawText.match(generalQaRegex);
  if (generalQaMatch) {
    generalQA = generalQaMatch[1].trim();
    slidesText = rawText.slice(0, generalQaMatch.index);
  }

  // 2. Find all [Slide X] blocks
  const slideHeaderRegex = /(?:^|\n)\s*(?:\[\s*Slide\s*(\d+)\s*\]|Slide\s*(\d+)\s*:|---\s*Slide\s*(\d+)\s*---|#+\s*Slide\s*(\d+))\s*(?::\s*([^\n]*))?/gi;
  const matches = [...slidesText.matchAll(slideHeaderRegex)];

  const slides = [];

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const slideNumber = parseInt(currentMatch[1] || currentMatch[2] || currentMatch[3] || currentMatch[4], 10) || i + 1;
      let inlineTitle = currentMatch[5] ? currentMatch[5].trim() : '';

      const startIndex = currentMatch.index + currentMatch[0].length;
      const endIndex =
        i + 1 < matches.length ? matches[i + 1].index : slidesText.length;

      let slideBody = slidesText.slice(startIndex, endIndex).trim();

      // If title wasn't on the [Slide X]: Title line, check if the first line can serve as title
      if (!inlineTitle && slideBody) {
        const lines = slideBody.split('\n');
        inlineTitle = extractShortTitle(lines[0], slideNumber);
        if (lines.length > 1 && lines[0].trim().length < 60) {
          slideBody = lines.slice(1).join('\n').trim();
        }
      } else if (inlineTitle) {
        inlineTitle = extractShortTitle(inlineTitle, slideNumber);
      } else {
        inlineTitle = `Slide ${slideNumber}`;
      }

      // 3. Separate slide-specific [Q&A]
      let scriptContent = slideBody;
      let qaContent = '';

      const slideQaRegex = /(?:^|\n)\s*(?:\[\s*(?:Q&A|Mở\s*rộng|Câu\s*hỏi\s*mở\s*rộng)\s*\]|(?:Q&A|Câu\s*hỏi\s*mở\s*rộng)\s*:)\s*([\s\S]*)$/i;
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
  } else {
    // Fallback: Split by double newlines into logical slide sections
    const rawParagraphs = slidesText
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawParagraphs.length === 0) {
      slides.push({
        slideNumber: 1,
        title: extractShortTitle(title || 'Slide 1', 1),
        scriptContent: slidesText,
        qaContent: '',
        thumbnailBase64: null
      });
    } else {
      rawParagraphs.forEach((para, idx) => {
        const slideNum = idx + 1;
        const firstLine = para.split('\n')[0].trim();
        const slideTitle = extractShortTitle(firstLine, slideNum);

        let scriptContent = para;
        let qaContent = '';
        const slideQaRegex = /(?:^|\n)\s*(?:\[\s*(?:Q&A|Mở\s*rộng)\s*\]|Q&A\s*:)\s*([\s\S]*)$/i;
        const qaMatch = para.match(slideQaRegex);
        if (qaMatch) {
          qaContent = qaMatch[1].trim();
          scriptContent = para.slice(0, qaMatch.index).trim();
        }

        slides.push({
          slideNumber: slideNum,
          title: slideTitle,
          scriptContent: scriptContent || '(Chưa có nội dung kịch bản)',
          qaContent,
          thumbnailBase64: null
        });
      });
    }
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
 * Extracts Google Document or Presentation ID from a public Google Docs or Google Slides link
 */
export function extractGoogleDocId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}
