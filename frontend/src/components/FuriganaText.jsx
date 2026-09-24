import React, { useMemo } from 'react';

/**
 * FuriganaText component:
 * - Parses text in `[Kanji|hiragana]` format into HTML `<ruby>Kanji<rt>hiragana</rt></ruby>`.
 * - Toggles Furigana ON/OFF (single toggle, default OFF).
 * - Toggles Highlight of target vocabulary (amber) and grammar (cyan) with tooltips.
 */
const FuriganaText = ({
  text = '',
  showFurigana = false,
  showHighlight = false,
  targetVocabs = [],
  targetGrammars = [],
  style = {},
  className = ''
}) => {
  // Extract simple lookup lists for highlight
  const vocabMap = useMemo(() => {
    const map = new Map();
    if (!targetVocabs || !Array.isArray(targetVocabs)) return map;
    for (const v of targetVocabs) {
      const word = v.tu || v.kanji || v.word || '';
      const clean = word.trim();
      if (clean.length > 0) {
        map.set(clean, v.nghia || v.meaning || '');
      }
    }
    return map;
  }, [targetVocabs]);

  const grammarMap = useMemo(() => {
    const map = new Map();
    if (!targetGrammars || !Array.isArray(targetGrammars)) return map;
    for (const g of targetGrammars) {
      const struc = g.cau_truc || g.grammar || '';
      const clean = struc.replace(/^[~～]/, '').trim();
      if (clean.length > 0) {
        map.set(clean, g.y_nghia || g.meaning || '');
      }
    }
    return map;
  }, [targetGrammars]);

  // Parse text into tokens: Kanji compound with furigana [Kanji|hiragana] vs normal text
  const renderedContent = useMemo(() => {
    if (!text) return null;

    // Split text by paragraphs first (\n\n or \n)
    const paragraphs = text.split(/\n+/);

    return paragraphs.map((para, pIdx) => {
      // Regex to find [Kanji|hiragana]
      const regex = /\[([^\|\]]+)\|([^\]]+)\]/g;
      const elements = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(para)) !== null) {
        const preText = para.substring(lastIndex, match.index);
        if (preText) {
          elements.push(...renderPlainSegment(preText, pIdx, elements.length, showHighlight, vocabMap, grammarMap));
        }

        const kanji = match[1];
        const hiragana = match[2];

        // Check if kanji is target vocab or grammar
        const vocabMeaning = vocabMap.get(kanji);
        const grammarMeaning = grammarMap.get(kanji);
        const isHighlight = showHighlight && (vocabMeaning || grammarMeaning);

        elements.push(
          <ruby
            key={`ruby-${pIdx}-${match.index}`}
            className={`furigana-ruby ${isHighlight ? (grammarMeaning ? 'highlight-grammar' : 'highlight-vocab') : ''}`}
            title={isHighlight ? (vocabMeaning ? `Từ vựng: ${vocabMeaning}` : `Ngữ pháp: ${grammarMeaning}`) : undefined}
            style={{
              padding: isHighlight ? '2px 4px' : '0',
              borderRadius: isHighlight ? '4px' : '0',
              backgroundColor: isHighlight
                ? grammarMeaning
                  ? 'rgba(14, 165, 233, 0.18)'
                  : 'rgba(245, 158, 11, 0.18)'
                : 'transparent',
              borderBottom: isHighlight
                ? `2px solid ${grammarMeaning ? '#0ea5e9' : '#f59e0b'}`
                : 'none',
              cursor: isHighlight ? 'help' : 'inherit'
            }}
          >
            {kanji}
            <rt
              style={{
                display: showFurigana ? 'ruby-text' : 'none',
                userSelect: 'none',
                fontSize: '0.62em',
                color: 'var(--accent-color, #6366f1)',
                fontWeight: 600
              }}
            >
              {hiragana}
            </rt>
          </ruby>
        );

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < para.length) {
        const remaining = para.substring(lastIndex);
        elements.push(...renderPlainSegment(remaining, pIdx, elements.length, showHighlight, vocabMap, grammarMap));
      }

      return (
        <p
          key={`p-${pIdx}`}
          style={{
            marginBottom: '1.4em',
            textIndent: '1.2em',
            lineHeight: showFurigana ? '2.3' : '2.0',
            textAlign: 'justify',
            fontSize: '1.12rem'
          }}
        >
          {elements}
        </p>
      );
    });
  }, [text, showFurigana, showHighlight, vocabMap, grammarMap]);

  return (
    <div className={`furigana-container ${className}`} style={{ ...style }}>
      {renderedContent}
    </div>
  );
};

// Helper to highlight matching vocabulary or grammar in plain text chunks
function renderPlainSegment(plainText, pIdx, baseIdx, showHighlight, vocabMap, grammarMap) {
  if (!showHighlight || (vocabMap.size === 0 && grammarMap.size === 0)) {
    return [<span key={`txt-${pIdx}-${baseIdx}`}>{plainText}</span>];
  }

  // Combine target terms for regex matching (longest first to avoid greedy collision)
  const allTerms = [...Array.from(vocabMap.keys()), ...Array.from(grammarMap.keys())]
    .filter(t => t.length > 0)
    .sort((a, b) => b.length - a.length);

  if (allTerms.length === 0) {
    return [<span key={`txt-${pIdx}-${baseIdx}`}>{plainText}</span>];
  }

  // Escape regex special chars
  const escapedTerms = allTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const termRegex = new RegExp(`(${escapedTerms})`, 'g');

  const parts = plainText.split(termRegex);
  return parts.map((part, idx) => {
    const vocabMeaning = vocabMap.get(part);
    const grammarMeaning = grammarMap.get(part);

    if (vocabMeaning || grammarMeaning) {
      return (
        <span
          key={`hl-${pIdx}-${baseIdx}-${idx}`}
          title={vocabMeaning ? `Từ vựng: ${vocabMeaning}` : `Ngữ pháp: ${grammarMeaning}`}
          style={{
            padding: '2px 4px',
            borderRadius: '4px',
            backgroundColor: grammarMeaning ? 'rgba(14, 165, 233, 0.18)' : 'rgba(245, 158, 11, 0.18)',
            borderBottom: `2px solid ${grammarMeaning ? '#0ea5e9' : '#f59e0b'}`,
            fontWeight: 600,
            cursor: 'help'
          }}
        >
          {part}
        </span>
      );
    }
    return <span key={`subtxt-${pIdx}-${baseIdx}-${idx}`}>{part}</span>;
  });
}

export default FuriganaText;
