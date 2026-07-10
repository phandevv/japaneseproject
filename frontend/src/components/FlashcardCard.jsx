import React, { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { vocabApi } from '../services/api';

const FlashcardCard = ({ word, flipped, onFlip, onRateWord }) => {
  const { t } = useLanguage();
  const [enriched, setEnriched] = useState(null);
  const [loadingEnrich, setLoadingEnrich] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [word]);

  useEffect(() => {
    if (!word) return;

    if (word.sampleSentence) {
      setEnriched(word);
      return;
    }

    setEnriched(null);
    setLoadingEnrich(true);

    let active = true;
    vocabApi.enrich(word.id)
      .then(data => {
        if (active) {
          setEnriched(data);
          setLoadingEnrich(false);
        }
      })
      .catch(err => {
        console.error("Failed to lazy load enrichment details:", err);
        if (active) {
          setLoadingEnrich(false);
        }
      });

    return () => {
      active = false;
    };
  }, [word]);

  const handleFlip = () => {
    if (onFlip) {
      onFlip();
    }
  };

  const handleSpeak = (e) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const textToSpeak = word?.hiragana || word?.kanji || word?.meaning || '';
    if (!textToSpeak) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  if (!word) return null;

  return (
    <div className="flashcard-container" onClick={handleFlip}>
      <div className={`flashcard ${flipped ? 'is-flipped' : ''}`}>
        
        {/* Front side (Japanese) */}
        <div className="flashcard-face flashcard-front">
          {word.kanji ? (
            <h2 className="jp-text" style={{ fontSize: '7rem', marginBottom: '1rem', color: 'var(--text-primary)', transition: 'font-size 0.2s' }}>
              {word.kanji}
            </h2>
          ) : (
            <p className="jp-text" style={{ fontSize: '5.5rem', color: 'var(--text-primary)', transition: 'font-size 0.2s' }}>
              {word.hiragana}
            </p>
          )}
          
          <div style={{ position: 'absolute', bottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="level-badge">{word.level}</span>
            <span className="level-badge" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
              {t.card.clickToFlip}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSpeak}
              style={{ padding: '6px 12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Volume2 size={16} /> {t.card.pronounce}
            </button>
          </div>
        </div>

        {/* Back side (Meaning) */}
        <div className="flashcard-face flashcard-back" style={{ padding: 0 }}>
          <div className="flashcard-back-content">
            
            {/* Left Column: Basic word information and Rate buttons */}
            <div className="flashcard-back-left">
              <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
                {word.kanji && word.hiragana && (
                  <h2 className="jp-text" style={{ fontSize: '3rem', marginBottom: '0.8rem', color: 'var(--accent-color)' }}>
                    {word.hiragana}
                  </h2>
                )}
                
                <h3 style={{ fontSize: '2.4rem', marginBottom: '0.8rem', color: 'var(--success-color)' }}>
                  {word.meaning || "N/A"}
                </h3>
                
                {word.hanViet && (
                  <p style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                    【{word.hanViet}】
                  </p>
                )}
                
                {word.wordType && (
                  <span style={{ 
                    display: 'inline-block',
                    padding: '4px 12px', 
                    backgroundColor: 'rgba(255,255,255,0.08)', 
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem'
                  }}>
                    {word.wordType}
                  </span>
                )}
              </div>

              {/* Rate buttons for logged-in user in flashcard mode */}
              {onRateWord && (
                <div style={{ display: 'flex', gap: '6px', width: '100%', justifyContent: 'center', marginTop: '15px' }} onClick={e => e.stopPropagation()}>
                  <button className="btn" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderColor: '#ef4444', border: '1px solid', flex: 1, padding: '8px 2px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => onRateWord(1)}>
                    Forgot
                  </button>
                  <button className="btn" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderColor: '#f59e0b', border: '1px solid', flex: 1, padding: '8px 2px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => onRateWord(2)}>
                    Hard
                  </button>
                  <button className="btn" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderColor: '#3b82f6', border: '1px solid', flex: 1, padding: '8px 2px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => onRateWord(3)}>
                    Good
                  </button>
                  <button className="btn" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderColor: '#10b981', border: '1px solid', flex: 1, padding: '8px 2px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => onRateWord(4)}>
                    Easy
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: AI Rich Data Section */}
            <div className="flashcard-back-right hide-scrollbar" style={{ overflowY: 'auto' }}>
              {loadingEnrich && (
                <div style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.85rem', 
                  fontStyle: 'italic',
                  padding: '15px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  Đang gọi AI làm giàu dữ liệu ví dụ & Kanji...
                </div>
              )}

              {enriched && enriched.sampleSentence && (
                <div style={{ 
                  padding: '14px 18px', 
                  backgroundColor: 'rgba(255,255,255,0.04)', 
                  borderRadius: '8px',
                  borderLeft: '4px solid var(--accent-color)'
                }}>
                  <h4 style={{ color: 'var(--accent-color)', marginBottom: '4px', fontSize: '0.9rem', fontWeight: '600' }}>Câu ví dụ:</h4>
                  <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '2px', lineHeight: '1.35' }}>{enriched.sampleSentence}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontStyle: 'italic' }}>{enriched.sampleReading}</p>
                  <p style={{ fontSize: '0.95rem', color: 'var(--success-color)', fontWeight: '500' }}>{enriched.sampleTranslation}</p>
                </div>
              )}

              {(() => {
                let relatedWords = [];
                if (enriched && enriched.kanjiWords) {
                  try {
                    relatedWords = typeof enriched.kanjiWords === 'string' 
                      ? JSON.parse(enriched.kanjiWords) 
                      : enriched.kanjiWords;
                  } catch (e) {
                    console.error("Failed to parse kanjiWords JSON:", e);
                  }
                }
                if (relatedWords && relatedWords.length > 0) {
                  return (
                    <div style={{ 
                      padding: '12px 18px', 
                      backgroundColor: 'rgba(255,255,255,0.04)', 
                      borderRadius: '8px',
                      borderLeft: '4px solid var(--success-color)'
                    }}>
                      <h4 style={{ color: 'var(--success-color)', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '600' }}>Kanji liên quan:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {relatedWords.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderBottom: idx < relatedWords.length - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none', paddingBottom: idx < relatedWords.length - 1 ? '4px' : '0' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.word} ({item.reading})</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.meaning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default FlashcardCard;
