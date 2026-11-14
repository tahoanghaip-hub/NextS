import JSZip from 'jszip';
import mammoth from 'mammoth';

/**
 * Common Vietnamese & English Stop Words for TF-IDF / Token Overlap
 */
const STOP_WORDS = new Set([
  'và', 'của', 'là', 'các', 'có', 'trong', 'để', 'với', 'những', 'cho',
  'về', 'khi', 'được', 'tại', 'theo', 'này', 'đó', 'từ', 'một', 'thì',
  'sẽ', 'đã', 'đang', 'ra', 'vào', 'lại', 'nên', 'cũng', 'như', 'nhưng',
  'bởi', 'vì', 'ở', 'qua', 'đến', 'nhiều', 'rất', 'hơn', 'sau', 'trước',
  'the', 'and', 'to', 'of', 'a', 'in', 'is', 'that', 'for', 'it', 'as',
  'was', 'with', 'on', 'at', 'by', 'this', 'an', 'be', 'are', 'from', 'or'
]);

/**
 * 2.1. Helper: extractShortTitle(text, fallbackIndex)
 * Cleans whitespace/markdown symbols from text, takes first 3 to 5 words (up to 45 chars),
 * and appends '...' if truncated. If empty, returns "Slide " + fallbackIndex.
 */
export function extractShortTitle(text, fallbackIndex = 1) {
  if (!text || typeof text !== 'string') {
    return `Slide ${fallbackIndex}`;
  }

  // Strip Markdown, HTML tags, common bracket decorations, quotes
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

  // Take first 3 to 5 words
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
 * Helper to unescape XML entities
 */
function unescapeXml(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * 2.2. .docx & Raw Text Parser: parseScriptBufferOrText
 * Accepts { buffer, fileName, rawText }
 */
export async function parseScriptBufferOrText({ buffer, fileName = '', rawText = '' }) {
  let content = rawText || '';

  // If buffer is provided and is a .docx file or contains zip header
  if (buffer) {
    const isDocx = fileName?.toLowerCase().endsWith('.docx') ||
      (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b);

    if (isDocx) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        content = result.value || '';
      } catch (err) {
        console.error('[docSlideParser] Mammoth extraction failed, falling back to text string:', err);
        content = buffer.toString('utf8');
      }
    } else {
      content = buffer.toString('utf8');
    }
  }

  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  if (!content) {
    return {
      title: extractShortTitle(fileName.replace(/\.[^/.]+$/, ''), 1),
      totalSlides: 0,
      slides: [],
      generalQA: '',
      hasExplicitMarkers: false
    };
  }

  // 1. Extract Bottom [Q&A Chung] (Unnumbered General Q&A)
  let slidesText = content;
  let generalQA = '';

  const generalQaRegex = /(?:^|\n)\s*(?:\[\s*(?:Q&A\s*Chung|Câu\s*hỏi\s*chung)\s*\]|={3,}\s*Q&A\s*Chung\s*={3,}|Phần\s*câu\s*hỏi\s*chung\s*:?)\s*([\s\S]*)$/i;
  const generalQaMatch = content.match(generalQaRegex);
  if (generalQaMatch) {
    generalQA = generalQaMatch[1].trim();
    slidesText = content.slice(0, generalQaMatch.index).trim();
  }

  // 2. Detect Slide Blocks: [Slide 1], Slide 1:, --- Slide 1 ---, # Slide 1
  const slideHeaderRegex = /(?:^|\n)\s*(?:\[\s*Slide\s*(\d+)\s*\]|Slide\s*(\d+)\s*:|---\s*Slide\s*(\d+)\s*---|#+\s*Slide\s*(\d+))\s*(?::\s*([^\n]*))?/gi;
  const matches = [...slidesText.matchAll(slideHeaderRegex)];

  const slides = [];
  let hasExplicitMarkers = false;

  if (matches.length > 0) {
    hasExplicitMarkers = true;
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const slideNum = parseInt(match[1] || match[2] || match[3] || match[4], 10) || (i + 1);
      let inlineTitle = match[5] ? match[5].trim() : '';

      const startIndex = match.index + match[0].length;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : slidesText.length;
      let body = slidesText.slice(startIndex, endIndex).trim();

      // If inline title is missing, try to extract from first line or sentence
      if (!inlineTitle && body) {
        const firstLine = body.split('\n')[0].trim();
        inlineTitle = extractShortTitle(firstLine, slideNum);
      } else if (inlineTitle) {
        inlineTitle = extractShortTitle(inlineTitle, slideNum);
      } else {
        inlineTitle = `Slide ${slideNum}`;
      }

      // Check for slide-specific [Q&A] / [Mở rộng] / Câu hỏi mở rộng:
      let scriptContent = body;
      let qaContent = '';

      const slideQaRegex = /(?:^|\n)\s*(?:\[\s*(?:Q&A|Mở\s*rộng|Câu\s*hỏi\s*mở\s*rộng)\s*\]|(?:Q&A|Câu\s*hỏi\s*mở\s*rộng)\s*:)\s*([\s\S]*)$/i;
      const qaMatch = body.match(slideQaRegex);
      if (qaMatch) {
        qaContent = qaMatch[1].trim();
        scriptContent = body.slice(0, qaMatch.index).trim();
      }

      slides.push({
        slideNumber: slideNum,
        title: inlineTitle,
        scriptContent: scriptContent || '(Chưa có nội dung kịch bản)',
        qaContent,
        thumbnailBase64: null
      });
    }
  } else {
    // Fallback: Split by double newlines or numbered headings
    hasExplicitMarkers = false;
    const rawParagraphs = slidesText
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawParagraphs.length === 0) {
      slides.push({
        slideNumber: 1,
        title: extractShortTitle(slidesText, 1),
        scriptContent: slidesText,
        qaContent: '',
        thumbnailBase64: null
      });
    } else {
      rawParagraphs.forEach((para, idx) => {
        const slideNum = idx + 1;
        const firstLine = para.split('\n')[0].trim();
        const title = extractShortTitle(firstLine, slideNum);

        // Check for slide-specific [Q&A]
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
          title,
          scriptContent: scriptContent || '(Chưa có nội dung kịch bản)',
          qaContent,
          thumbnailBase64: null
        });
      });
    }
  }

  const baseTitle = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Bài thuyết trình NextS';

  return {
    id: `pres-${Date.now()}`,
    title: extractShortTitle(baseTitle, 1).replace(/\.{3}$/, ''),
    totalSlides: slides.length,
    currentSlide: 1,
    isSyncLocked: true,
    updatedAt: Date.now(),
    slides,
    generalQA,
    hasExplicitMarkers
  };
}

/**
 * 2.3. .pptx Parser: parsePptxBuffer
 * Loads buffer using JSZip, inspects slide XML, speaker notes, and embedded thumbnails
 */
export async function parsePptxBuffer(buffer, fileName = '') {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Find all ppt/slides/slide{N}.xml
  const slideFileRegex = /^ppt\/slides\/slide(\d+)\.xml$/;
  const slideEntries = [];

  zip.forEach((relativePath, file) => {
    const match = relativePath.match(slideFileRegex);
    if (match) {
      slideEntries.push({
        path: relativePath,
        slideNumber: parseInt(match[1], 10),
        file
      });
    }
  });

  // Sort slides numerically
  slideEntries.sort((a, b) => a.slideNumber - b.slideNumber);

  const slides = [];

  for (let idx = 0; idx < slideEntries.length; idx++) {
    const entry = slideEntries[idx];
    const slideNum = idx + 1; // Normalized 1-based sequential slide number
    const xmlContent = await entry.file.async('string');

    // Extract all paragraphs <a:p>
    const paragraphRegex = /<a:p[\s>][\s\S]*?<\/a:p>/gi;
    const paragraphMatches = xmlContent.match(paragraphRegex) || [];

    const extractedParagraphs = [];
    for (const pXml of paragraphMatches) {
      // Inside each paragraph, extract text runs <a:t>
      const textRunRegex = /<a:t[\s>]([\s\S]*?)<\/a:t>/gi;
      const textMatches = [...pXml.matchAll(textRunRegex)];
      if (textMatches.length > 0) {
        const line = textMatches.map((m) => unescapeXml(m[1])).join('').trim();
        if (line) {
          extractedParagraphs.push(line);
        }
      }
    }

    const slideText = extractedParagraphs.join('\n');
    const firstLine = extractedParagraphs[0] || '';
    const title = extractShortTitle(firstLine, slideNum);

    // 2. Extract speaker notes if available
    let speakerNotes = '';
    const notesPath = `ppt/notesSlides/notesSlide${entry.slideNumber}.xml`;
    const notesFile = zip.file(notesPath);
    if (notesFile) {
      try {
        const notesXml = await notesFile.async('string');
        const notesMatches = [...notesXml.matchAll(/<a:t[\s>]([\s\S]*?)<\/a:t>/gi)];
        const rawNotes = notesMatches.map((m) => unescapeXml(m[1])).join(' ').trim();
        // Ignore single slide number indicator in notes
        if (rawNotes && rawNotes !== String(entry.slideNumber)) {
          speakerNotes = rawNotes;
        }
      } catch (e) {
        // Ignore notes read error
      }
    }

    // 3. Check for embedded slide thumbnail image in slide rels
    let thumbnailBase64 = null;
    const relsPath = `ppt/slides/_rels/slide${entry.slideNumber}.xml.rels`;
    const relsFile = zip.file(relsPath);
    if (relsFile) {
      try {
        const relsXml = await relsFile.async('string');
        const imgMatch = relsXml.match(/Target="(?:\.\.\/)?media\/(image\d+\.(png|jpe?g|webp))"/i);
        if (imgMatch) {
          const imgFilename = imgMatch[1];
          const imgExt = imgMatch[2].toLowerCase() === 'jpg' ? 'jpeg' : imgMatch[2].toLowerCase();
          const mediaFile = zip.file(`ppt/media/${imgFilename}`);
          if (mediaFile) {
            const imgData = await mediaFile.async('nodebuffer');
            // Check size limit: under 100KB to prevent bloated sync payloads
            if (imgData.length < 100 * 1024) {
              thumbnailBase64 = `data:image/${imgExt};base64,${imgData.toString('base64')}`;
            }
          }
        }
      } catch (e) {
        // Ignore rels thumbnail error
      }
    }

    slides.push({
      slideNumber: slideNum,
      title,
      slideText,
      speakerNotes,
      thumbnailBase64
    });
  }

  const baseTitle = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'PowerPoint Presentation';

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
 * Tokenize string into a map of term frequencies, ignoring common stop words
 */
function tokenizeAndCount(text = '') {
  const clean = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(' ').filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  const counts = new Map();
  for (const w of words) {
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return counts;
}

/**
 * Compute Cosine Similarity between two term-frequency maps
 */
function computeCosineSimilarity(tf1, tf2) {
  if (!tf1 || !tf2 || tf1.size === 0 || tf2.size === 0) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const [, count] of tf1) {
    norm1 += count * count;
  }
  for (const [, count] of tf2) {
    norm2 += count * count;
  }

  if (norm1 === 0 || norm2 === 0) return 0;

  for (const [word, count1] of tf1) {
    const count2 = tf2.get(word);
    if (count2) {
      dotProduct += count1 * count2;
    }
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * 2.4. Smart Merge & TF-IDF Keyword Alignment: mergeScriptAndSlideDeck
 */
export function mergeScriptAndSlideDeck(
  scriptData = null,
  slideDeckData = null,
  existingPresentationData = null,
  mergeMode = 'MERGE'
) {
  const isMerge = mergeMode === 'MERGE';

  // Case A: Both scriptData and slideDeckData are provided
  if (scriptData && slideDeckData) {
    const totalSlides = Math.max(
      scriptData.slides?.length || 0,
      slideDeckData.slides?.length || 0
    );

    const mergedSlides = [];

    if (scriptData.hasExplicitMarkers) {
      // 1:1 Index Matching when explicit markers [Slide X] exist
      for (let i = 0; i < totalSlides; i++) {
        const slideNum = i + 1;
        const scriptSlide = scriptData.slides?.[i] || null;
        const deckSlide = slideDeckData.slides?.[i] || null;

        // Prefer 3-5 word title from slideDeck (the visible projector slide), fallback to script
        const title = deckSlide?.title || scriptSlide?.title || `Slide ${slideNum}`;

        const scriptContent =
          scriptSlide?.scriptContent ||
          deckSlide?.speakerNotes ||
          deckSlide?.slideText ||
          '(Chưa có nội dung kịch bản)';

        const qaContent = scriptSlide?.qaContent || '';
        const thumbnailBase64 = deckSlide?.thumbnailBase64 || null;

        mergedSlides.push({
          slideNumber: slideNum,
          title: extractShortTitle(title, slideNum),
          scriptContent,
          qaContent,
          thumbnailBase64
        });
      }
    } else {
      // TF-IDF Cosine Similarity Alignment between unformatted Word paragraphs & Slide Deck
      const deckSlides = slideDeckData.slides || [];
      const scriptBlocks = scriptData.slides || [];

      // Tokenize each slide in slide deck
      const deckTfs = deckSlides.map((s) => {
        const combinedText = `${s.title} ${s.slideText || ''} ${s.speakerNotes || ''}`;
        return tokenizeAndCount(combinedText);
      });

      // Align script blocks to slides sequentially
      const slideAssignments = Array.from({ length: deckSlides.length }, () => []);
      let lastAssignedIndex = 0;

      scriptBlocks.forEach((block, bIdx) => {
        const blockTf = tokenizeAndCount(block.scriptContent);
        let bestScore = -1;
        let bestSlideIdx = -1;

        // Search sequentially starting from lastAssignedIndex to preserve temporal order
        for (let sIdx = lastAssignedIndex; sIdx < deckSlides.length; sIdx++) {
          const sim = computeCosineSimilarity(blockTf, deckTfs[sIdx]);
          if (sim > bestScore) {
            bestScore = sim;
            bestSlideIdx = sIdx;
          }
        }

        // If similarity score is very low or no match found, fallback to sequential distribution
        if (bestScore <= 0.05 || bestSlideIdx === -1) {
          const ratio = scriptBlocks.length > 0 ? bIdx / scriptBlocks.length : 0;
          bestSlideIdx = Math.min(deckSlides.length - 1, Math.floor(ratio * deckSlides.length));
          if (bestSlideIdx < lastAssignedIndex) {
            bestSlideIdx = lastAssignedIndex;
          }
        }

        lastAssignedIndex = bestSlideIdx;
        slideAssignments[bestSlideIdx].push(block);
      });

      // Assemble merged slides
      for (let i = 0; i < totalSlides; i++) {
        const slideNum = i + 1;
        const deckSlide = deckSlides[i] || null;
        const assigned = slideAssignments[i] || [];

        const title = deckSlide?.title || assigned[0]?.title || `Slide ${slideNum}`;
        const scriptContent = assigned.length > 0
          ? assigned.map((a) => a.scriptContent).join('\n\n')
          : (deckSlide?.speakerNotes || deckSlide?.slideText || '(Chưa có nội dung kịch bản)');

        const qaContent = assigned.map((a) => a.qaContent).filter(Boolean).join('\n\n');
        const thumbnailBase64 = deckSlide?.thumbnailBase64 || null;

        mergedSlides.push({
          slideNumber: slideNum,
          title: extractShortTitle(title, slideNum),
          scriptContent,
          qaContent,
          thumbnailBase64
        });
      }
    }

    return {
      id: `pres-${Date.now()}`,
      title: slideDeckData.title || scriptData.title || 'Bài thuyết trình NextS',
      totalSlides: mergedSlides.length,
      currentSlide: 1,
      isSyncLocked: true,
      updatedAt: Date.now(),
      slides: mergedSlides,
      generalQA: scriptData.generalQA || existingPresentationData?.generalQA || ''
    };
  }

  // Case B: Only slideDeckData is provided
  if (slideDeckData && !scriptData) {
    if (isMerge && existingPresentationData?.slides?.length > 0) {
      // Preserve existing scripts & Q&A while updating slide titles & thumbnails
      const totalSlides = Math.max(
        slideDeckData.slides.length,
        existingPresentationData.slides.length
      );

      const mergedSlides = [];
      for (let i = 0; i < totalSlides; i++) {
        const slideNum = i + 1;
        const newSlide = slideDeckData.slides[i] || null;
        const existingSlide = existingPresentationData.slides[i] || null;

        mergedSlides.push({
          slideNumber: slideNum,
          title: newSlide?.title ? extractShortTitle(newSlide.title, slideNum) : (existingSlide?.title || `Slide ${slideNum}`),
          scriptContent: existingSlide?.scriptContent || newSlide?.speakerNotes || newSlide?.slideText || '(Chưa có kịch bản)',
          qaContent: existingSlide?.qaContent || '',
          thumbnailBase64: newSlide?.thumbnailBase64 || existingSlide?.thumbnailBase64 || null
        });
      }

      return {
        ...existingPresentationData,
        title: slideDeckData.title || existingPresentationData.title,
        totalSlides: mergedSlides.length,
        slides: mergedSlides,
        updatedAt: Date.now()
      };
    }

    // Replace mode or no existing data
    return {
      id: `pres-${Date.now()}`,
      title: slideDeckData.title || 'Slide Deck',
      totalSlides: slideDeckData.slides.length,
      currentSlide: 1,
      isSyncLocked: true,
      updatedAt: Date.now(),
      slides: slideDeckData.slides.map((s, idx) => ({
        slideNumber: idx + 1,
        title: extractShortTitle(s.title, idx + 1),
        scriptContent: s.speakerNotes || s.slideText || '(Chưa có nội dung kịch bản)',
        qaContent: '',
        thumbnailBase64: s.thumbnailBase64 || null
      })),
      generalQA: isMerge ? (existingPresentationData?.generalQA || '') : ''
    };
  }

  // Case C: Only scriptData is provided
  if (scriptData && !slideDeckData) {
    if (isMerge && existingPresentationData?.slides?.length > 0) {
      // Update scriptContent, qaContent, generalQA while preserving thumbnails and slide titles
      const totalSlides = Math.max(
        scriptData.slides.length,
        existingPresentationData.slides.length
      );

      const mergedSlides = [];
      for (let i = 0; i < totalSlides; i++) {
        const slideNum = i + 1;
        const newScript = scriptData.slides[i] || null;
        const existingSlide = existingPresentationData.slides[i] || null;

        // Prefer existing title if it came from slide deck, else new title
        const title = existingSlide?.title || newScript?.title || `Slide ${slideNum}`;

        mergedSlides.push({
          slideNumber: slideNum,
          title: extractShortTitle(title, slideNum),
          scriptContent: newScript?.scriptContent || existingSlide?.scriptContent || '(Chưa có kịch bản)',
          qaContent: newScript?.qaContent || existingSlide?.qaContent || '',
          thumbnailBase64: existingSlide?.thumbnailBase64 || null
        });
      }

      return {
        ...existingPresentationData,
        title: scriptData.title || existingPresentationData.title,
        totalSlides: mergedSlides.length,
        slides: mergedSlides,
        generalQA: scriptData.generalQA || existingPresentationData.generalQA || '',
        updatedAt: Date.now()
      };
    }

    // Replace mode
    return {
      ...scriptData,
      updatedAt: Date.now()
    };
  }

  // Fallback: Return existing or empty presentation
  return existingPresentationData || {
    id: `pres-${Date.now()}`,
    title: 'Bài thuyết trình NextS',
    totalSlides: 0,
    currentSlide: 1,
    isSyncLocked: true,
    updatedAt: Date.now(),
    slides: [],
    generalQA: ''
  };
}
