import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Volume2, X, Bookmark, BookmarkCheck, Search, Copy, Check, 
  ExternalLink, Sparkles, Languages, ChevronRight, BookOpen, Layers
} from 'lucide-react';
import * as wanakana from 'wanakana';
import { vocabApi, knowledgeApi } from '../services/api';
import { translateJapanese } from '../services/translatorService';
import { getHanViet, containsKanji } from '../utils/hanVietDict';
import '../styles/QuickSelectionTranslator.css';

// Client-side in-memory dictionary cache to ensure 0ms response on repeated words
const localLookupCache = new Map();

// Helper to check if a string contains Japanese characters (Kanji, Hiragana, Katakana)
const containsJapanese = (text) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf]/.test(text);

const QuickSelectionTranslator = () => {
  // Floating trigger state
  const [triggerPos, setTriggerPos] = useState(null); // { x, y, text }
  // Active modal/popup state
  const [popupPos, setPopupPos] = useState(null);
  const [activeWord, setActiveWord] = useState('');
  const [segments, setSegments] = useState([]);
  const [liveTranslation, setLiveTranslation] = useState('');
  const [liveHanViet, setLiveHanViet] = useState('');
  const [liveRomaji, setLiveRomaji] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [savedStatus, setSavedStatus] = useState({}); // { [wordId]: true }
  const [copied, setCopied] = useState(false);

  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  // 1. Text Selection Listener
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseUp = (e) => {
      // If clicking inside the popup or trigger, don't close or retrigger
      if (
        (popupRef.current && popupRef.current.contains(e.target)) ||
        (triggerRef.current && triggerRef.current.contains(e.target))
      ) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setTriggerPos(null);
        return;
      }

      const text = selection.toString().trim();
      // Only trigger if text is between 1 and 100 chars and contains Japanese
      if (text.length > 0 && text.length <= 100 && containsJapanese(text)) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const x = rect.left + rect.width / 2;
            const y = rect.top + window.scrollY - 8;
            setTriggerPos({ x, y, text });
          }
        } catch (err) {
          console.debug('Selection range error:', err);
        }
      } else {
        setTriggerPos(null);
      }
    };

    const handleMouseDown = (e) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setPopupPos(null);
        setTriggerPos(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 2. Open Lookup from Trigger
  // ─────────────────────────────────────────────────────────────
  const openLookup = (text, posX, posY) => {
    setTriggerPos(null); // hide trigger

    // Position popup nicely with screen boundary checks
    const viewportWidth = window.innerWidth;
    let finalX = posX;
    if (finalX < 210) finalX = 210;
    if (finalX > viewportWidth - 210) finalX = viewportWidth - 210;

    setPopupPos({ x: finalX, y: posY + 20 });
    setActiveWord(text);

    // Immediate offline linguistic analysis (< 0.01ms)
    const hv = getHanViet(text);
    setLiveHanViet(hv);
    setLiveRomaji(wanakana.toRomaji(text));

    // Segment text if multiple words (via Intl.Segmenter)
    let segList = [];
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
        segList = Array.from(segmenter.segment(text))
          .map(s => s.segment.trim())
          .filter(s => s.length > 0 && containsJapanese(s));
      }
    } catch (e) {
      console.debug('Intl.Segmenter fallback', e);
    }

    if (segList.length > 1) {
      setSegments(segList);
    } else {
      setSegments([]);
    }

    // Run both Translation Engine & System Database search concurrently
    performUniversalTranslation(text);
    executeDatabaseLookup(text);
  };

  // ─────────────────────────────────────────────────────────────
  // 3. Universal Real-Time Translation (Handles ANY text, idioms, sentences)
  // ─────────────────────────────────────────────────────────────
  const performUniversalTranslation = async (text) => {
    setTranslating(true);
    setLiveTranslation('');
    try {
      const transResult = await translateJapanese(text);
      if (transResult && transResult.translatedText) {
        setLiveTranslation(transResult.translatedText);
        if (transResult.romaji && !liveRomaji) setLiveRomaji(transResult.romaji);
        if (transResult.hanViet && !liveHanViet) setLiveHanViet(transResult.hanViet);
      } else {
        setLiveTranslation('Không thể dịch tự động.');
      }
    } catch (e) {
      console.error('Translation error:', e);
      setLiveTranslation('Lỗi khi kết nối engine dịch.');
    } finally {
      setTranslating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Fast Internal Database Search (Matching JLPT words & examples)
  // ─────────────────────────────────────────────────────────────
  const executeDatabaseLookup = async (queryText) => {
    const clean = queryText.trim();
    if (!clean) return;

    // Check memory cache (< 1ms)
    if (localLookupCache.has(clean)) {
      setResults(localLookupCache.get(clean));
      return;
    }

    setLoading(true);
    try {
      let data = await vocabApi.search(clean, 0, 5);
      let items = data?.content || [];

      // If empty, try stripping common trailing particles (は, が, を, に, で, へ, と, も, から, まで, の)
      if (items.length === 0 && clean.length > 1) {
        const stripped = clean.replace(/([はがをにでへともからまでの])$/, '');
        if (stripped && stripped !== clean) {
          try {
            const data2 = await vocabApi.search(stripped, 0, 5);
            if (data2?.content?.length > 0) {
              items = data2.content;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      localLookupCache.set(clean, items);
      setResults(items);
    } catch (err) {
      console.error('Error during local dictionary lookup:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Pronounce Japanese Text (TTS Offline)
  // ─────────────────────────────────────────────────────────────
  const speak = (text) => {
    if (!text || typeof window === 'undefined') return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('TTS error:', e);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Save Word to Personal Knowledge Base
  // ─────────────────────────────────────────────────────────────
  const handleSaveToPersonal = async (item) => {
    try {
      await knowledgeApi.save('vocabulary', {
        kanji: item.kanji || item.word || activeWord,
        hiragana: item.hiragana || item.reading || '',
        meaning: item.meaning || liveTranslation || '',
        hanViet: item.hanViet || item.han_viet || liveHanViet || '',
        wordType: item.wordType || item.word_type || '',
        level: item.level || 'N3',
        sampleSentence: item.sampleSentence || item.sample_sentence || '',
        sampleTranslation: item.sampleTranslation || item.sample_translation || ''
      });
      setSavedStatus(prev => ({ ...prev, [item.id || activeWord]: true }));
    } catch (err) {
      console.error('Failed to save to personal dictionary:', err);
      alert('Không thể lưu từ vựng: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7. Save From Live Translation directly
  // ─────────────────────────────────────────────────────────────
  const handleSaveDirect = async () => {
    try {
      await knowledgeApi.save('vocabulary', {
        kanji: activeWord,
        hiragana: wanakana.toHiragana(activeWord),
        meaning: liveTranslation,
        hanViet: liveHanViet,
        wordType: 'Từ vựng',
        level: 'N3',
        sampleSentence: '',
        sampleTranslation: ''
      });
      setSavedStatus(prev => ({ ...prev, [activeWord]: true }));
    } catch (err) {
      console.error('Failed to save directly:', err);
      alert('Không thể lưu từ vựng: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 8. Copy text
  // ─────────────────────────────────────────────────────────────
  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      {/* ─── Floating Trigger Button (appears right above highlighted text) ─── */}
      {triggerPos && (
        <div
          ref={triggerRef}
          className="selection-translator-trigger"
          style={{ top: `${triggerPos.y}px`, left: `${triggerPos.x}px` }}
          onClick={() => openLookup(triggerPos.text, triggerPos.x, triggerPos.y)}
          title="Tra cứu dịch nhanh từ vựng tiếng Nhật"
        >
          <Languages size={15} />
          <span>Dịch nhanh</span>
        </div>
      )}

      {/* ─── Detailed Quick Translation / Dictionary Popup ─── */}
      {popupPos && (
        <div
          ref={popupRef}
          className="selection-translator-popup"
          style={{ top: `${popupPos.y}px`, left: `${popupPos.x}px` }}
        >
          {/* Header */}
          <div className="quick-trans-header">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="quick-trans-word font-jp">{activeWord}</span>
                {liveHanViet && (
                  <span className="quick-trans-hanviet-tag" title="Âm Hán Việt">
                    {liveHanViet}
                  </span>
                )}
              </div>
              {liveRomaji && <div className="quick-trans-romaji">{liveRomaji}</div>}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="quick-trans-icon-btn"
                onClick={() => speak(activeWord)}
                title="Phát âm tiếng Nhật"
              >
                <Volume2 size={16} />
              </button>
              <button
                className="quick-trans-icon-btn"
                onClick={() => handleCopy(`${activeWord}: ${liveTranslation}`)}
                title={copied ? "Đã sao chép" : "Sao chép"}
              >
                {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              </button>
              <button
                className="quick-trans-icon-btn"
                onClick={() => setPopupPos(null)}
                title="Đóng"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Segmented Words Bar (if multiple words / sentence) */}
          {segments.length > 1 && (
            <div className="quick-trans-segments">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>
                Tách từ:
              </span>
              {segments.map((seg, idx) => (
                <button
                  key={idx}
                  className={`quick-trans-seg-chip ${activeWord === seg ? 'active' : ''}`}
                  onClick={() => {
                    setActiveWord(seg);
                    const hv = getHanViet(seg);
                    setLiveHanViet(hv);
                    setLiveRomaji(wanakana.toRomaji(seg));
                    performUniversalTranslation(seg);
                    executeDatabaseLookup(seg);
                  }}
                >
                  {seg}
                </button>
              ))}
            </div>
          )}

          {/* ─── LIVE UNIVERSAL TRANSLATION BANNER ─── */}
          <div className="quick-trans-live-box">
            <div className="quick-trans-live-title">
              <span>🌐 Bản dịch nghĩa tiếng Việt</span>
              {translating && <Sparkles size={13} className="animate-spin" />}
            </div>
            <div className="quick-trans-live-text">
              {translating && !liveTranslation ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Đang dịch nghĩa...</span>
              ) : (
                liveTranslation || 'Đang cập nhật bản dịch...'
              )}
            </div>
            {!results.length && liveTranslation && !translating && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  className={`quick-trans-save-btn ${savedStatus[activeWord] ? 'saved' : ''}`}
                  onClick={handleSaveDirect}
                  disabled={savedStatus[activeWord]}
                >
                  {savedStatus[activeWord] ? (
                    <>
                      <BookmarkCheck size={14} /> Đã lưu sổ tay
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} /> Lưu từ này
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ─── SYSTEM DATABASE MATCHES ─── */}
          {results.length > 0 && (
            <>
              <div className="quick-trans-dict-divider">
                <BookOpen size={13} />
                <span>Từ điển bài học ({results.length})</span>
              </div>

              <div className="quick-trans-results">
                {results.map((item, idx) => {
                  const isSaved = Boolean(savedStatus[item.id || item.kanji]);
                  return (
                    <div key={item.id || idx} className="quick-trans-card">
                      <div className="quick-trans-card-title">
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <strong className="font-jp" style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            {item.kanji || item.word}
                          </strong>
                          {item.hiragana && (
                            <span style={{ fontSize: '0.88rem', color: 'var(--accent-color)', fontWeight: 600 }}>
                              【{item.hiragana}】
                            </span>
                          )}
                          {(item.hanViet || item.han_viet) && (
                            <span className="quick-trans-hanviet">
                              ({item.hanViet || item.han_viet})
                            </span>
                          )}
                        </div>

                        {item.level && (
                          <span className="quick-trans-badge">{item.level}</span>
                        )}
                      </div>

                      <div className="quick-trans-meaning">
                        {item.meaning}
                      </div>

                      {(item.sampleSentence || item.sample_sentence) && (
                        <div className="quick-trans-example font-jp">
                          • {item.sampleSentence || item.sample_sentence}
                          {(item.sampleTranslation || item.sample_translation) && (
                            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              👉 {item.sampleTranslation || item.sample_translation}
                            </span>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                        <button
                          className={`quick-trans-save-btn ${isSaved ? 'saved' : ''}`}
                          onClick={() => handleSaveToPersonal(item)}
                          disabled={isSaved}
                        >
                          {isSaved ? (
                            <>
                              <BookmarkCheck size={14} /> Đã lưu sổ tay
                            </>
                          ) : (
                            <>
                              <Bookmark size={14} /> Lưu từ
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default QuickSelectionTranslator;
