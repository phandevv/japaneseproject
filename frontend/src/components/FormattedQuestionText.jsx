import React from 'react';
import { renderTextWithFurigana } from '../utils/furiganaUtils';

/**
 * FormattedQuestionText
 * Parses <u>...</u> tags in JLPT question texts and renders
 * an eye-catching, high-contrast underlined + highlighted badge for the target word.
 * Also formats ( ), （ ） blanks into a stylish dashed blank slot,
 * and renders Furigana on top of Kanji using standard <ruby><rt> annotations.
 *
 * If no <u> is present but questionType is KANJI_READING or KANJI_WRITING,
 * it attempts a smart fallback to detect and highlight the tested word.
 */
export default function FormattedQuestionText({
  text,
  fallbackNumber,
  questionType,
  choices = [],
  style = {}
}) {
  if (!text) {
    return <span style={style}>{`Câu hỏi số ${fallbackNumber || ''}`}</span>;
  }

  // 1. If text already has <u>...</u> or <ins>...</ins>
  if (text.includes('<u>') || text.includes('<ins>')) {
    const parts = [];
    const regex = /<u[^>]*>(.*?)<\/u>|<ins[^>]*>(.*?)<\/ins>/gi;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const target = match[1] || match[2];
      if (match.index > lastIndex) {
        parts.push(renderPlainTextWithBlanks(text.slice(lastIndex, match.index), `pt-${lastIndex}`));
      }
      parts.push(
        <span key={`target-${match.index}`} className="exam-target-word">
          {renderTextWithFurigana(target, { keyPrefix: `tgt-${match.index}` })}
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(renderPlainTextWithBlanks(text.slice(lastIndex), `pt-${lastIndex}`));
    }

    return (
      <span style={style} className="formatted-exam-text">
        {parts}
      </span>
    );
  }

  // 2. Client-side Fallback: If no <u> tag, try to detect target word dynamically
  let detectedTarget = null;

  if (questionType === 'KANJI_READING' && choices.length > 0) {
    const kanjiWords = text.match(/[\u4e00-\u9faf]+[ぁ-ん]*/g) || [];
    for (const kw of kanjiWords) {
      for (const c of choices) {
        const cleanC = typeof c === 'string' ? c.trim() : '';
        const hSuffix = kw.match(/[ぁ-ん]+$/);
        if (hSuffix && cleanC.endsWith(hSuffix[0])) {
          detectedTarget = kw;
          break;
        }
      }
      if (detectedTarget) break;
    }
    if (!detectedTarget && kanjiWords.length === 1) {
      detectedTarget = kanjiWords[0];
    }
  } else if (questionType === 'KANJI_WRITING' && choices.length > 0) {
    const hiraWords = text.match(/[ぁ-ん]{2,}/g) || [];
    const commonParticles = ['している', 'していた', 'だった', 'でした', 'ました', 'について', 'かどうか', 'において'];
    for (const hw of hiraWords) {
      if (hw.length >= 2 && !commonParticles.includes(hw)) {
        detectedTarget = hw;
        break;
      }
    }
  }

  if (detectedTarget && text.includes(detectedTarget)) {
    const idx = text.indexOf(detectedTarget);
    const before = text.slice(0, idx);
    const after = text.slice(idx + detectedTarget.length);

    return (
      <span style={style} className="formatted-exam-text">
        {renderPlainTextWithBlanks(before, 'fb-pre')}
        <span className="exam-target-word">
          {renderTextWithFurigana(detectedTarget, { keyPrefix: 'fb-tgt' })}
        </span>
        {renderPlainTextWithBlanks(after, 'fb-post')}
      </span>
    );
  }

  // Default: render text with blank slot formatting
  return (
    <span style={style} className="formatted-exam-text">
      {renderPlainTextWithBlanks(text, 'def')}
    </span>
  );
}

/**
 * Format blanks like ( ), （ ）, (   ) into dashed slots
 * and render Japanese text with furigana directly above Kanji.
 */
function renderPlainTextWithBlanks(plainText, keyPrefix = 'blank') {
  if (!plainText) return null;
  const blankRegex = /\(\s*\)|（\s*）|\(\s{2,}\)|（\s{2,}）/g;
  if (!blankRegex.test(plainText)) {
    return renderTextWithFurigana(plainText, { keyPrefix });
  }

  const parts = [];
  let lastIndex = 0;
  let match;
  blankRegex.lastIndex = 0;

  while ((match = blankRegex.exec(plainText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        renderTextWithFurigana(plainText.slice(lastIndex, match.index), {
          keyPrefix: `${keyPrefix}-sub-${lastIndex}`
        })
      );
    }
    parts.push(
      <span key={`blank-${match.index}`} className="exam-blank-slot">
        (&nbsp;&nbsp;&nbsp;)
      </span>
    );
    lastIndex = blankRegex.lastIndex;
  }

  if (lastIndex < plainText.length) {
    parts.push(
      renderTextWithFurigana(plainText.slice(lastIndex), {
        keyPrefix: `${keyPrefix}-sub-${lastIndex}`
      })
    );
  }

  return parts;
}
