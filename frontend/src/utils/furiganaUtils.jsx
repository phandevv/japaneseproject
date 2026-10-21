import React from 'react';

/**
 * Regex matching:
 * 1. [Kanji|reading] format: e.g. [日本語|にほんご]
 * 2. Kanji(reading) or Kanji（reading） format: e.g. 誘(さそ), 五角(ごかく), 合格(ごうかく), 雨（あめ）
 */
const FURIGANA_REGEX = /\[([^|\]]+)\|([^\]]+)\]|([\u4e00-\u9faf々〆〇]+)[(（]([\u3040-\u309f\u30a0-\u30ff]{1,8})[)）]/g;

/**
 * Non-furigana particles/markers when preceded by 2+ kanji.
 * For example: 必要（な） -> "な" is a grammar marker, not furigana for 必要.
 */
const NON_FURIGANA_MARKERS = new Set(['な', 'に', 'の', 'だ', 'する', 'される', 'ない']);

/**
 * Parses a string into tokens of plain text and ruby annotations.
 * @param {string} text
 * @returns {Array<{type: 'text'|'ruby', val?: string, base?: string, reading?: string}>}
 */
export function parseFurigana(text) {
  if (!text) return [];
  const str = String(text);
  const tokens = [];
  let lastIndex = 0;
  let match;
  FURIGANA_REGEX.lastIndex = 0;

  while ((match = FURIGANA_REGEX.exec(str)) !== null) {
    let base = '';
    let reading = '';
    const fullMatch = match[0];

    if (match[1] && match[2]) {
      // Explicit format: [Kanji|reading]
      base = match[1];
      reading = match[2];
    } else if (match[3] && match[4]) {
      // Parenthesized format: 漢字(かんじ) or 漢字（かんじ）
      base = match[3];
      reading = match[4];

      // Guard: Ignore phrases containing "など" or non-furigana grammatical markers on compounds
      if (reading.includes('など') || (base.length >= 2 && NON_FURIGANA_MARKERS.has(reading))) {
        continue;
      }
    }

    if (match.index > lastIndex) {
      tokens.push({ type: 'text', val: str.substring(lastIndex, match.index) });
    }

    tokens.push({ type: 'ruby', base, reading });
    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < str.length) {
    tokens.push({ type: 'text', val: str.substring(lastIndex) });
  }

  return tokens;
}

/**
 * Renders text with Furigana stacked directly above Kanji using standard HTML5 <ruby><rt>.
 * If showFurigana is false, only the base Kanji is displayed.
 */
export function renderTextWithFurigana(text, options = {}) {
  if (!text) return null;
  const {
    keyPrefix = 'furi',
    showFurigana = true,
    rubyStyle = {},
    rtStyle = {},
    className = ''
  } = options;

  const tokens = parseFurigana(text);
  if (tokens.length === 0) return null;

  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (token.type === 'ruby') {
      if (!showFurigana) {
        return <span key={key}>{token.base}</span>;
      }
      return (
        <ruby key={key} className={`furigana-ruby ${className}`.trim()} style={{ rubyPosition: 'over', ...rubyStyle }}>
          {token.base}
          <rt className="furigana-rt" style={rtStyle}>
            {token.reading}
          </rt>
        </ruby>
      );
    }
    return <React.Fragment key={key}>{token.val}</React.Fragment>;
  });
}
