import React, { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FlashcardCard = ({ word, onFlip }) => {
  const { t } = useLanguage();
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when the word changes
  useEffect(() => {
    setIsFlipped(false);
  }, [word]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleFlip = () => {
    const newFlipState = !isFlipped;
    setIsFlipped(newFlipState);
    if (onFlip) {
      onFlip(newFlipState);
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
      <div className={`flashcard ${isFlipped ? 'is-flipped' : ''}`}>
        
        {/* Front side (Japanese) */}
        <div className="flashcard-face flashcard-front">
          {word.kanji ? (
            <h2 className="jp-text" style={{ fontSize: '5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              {word.kanji}
            </h2>
          ) : (
            <p className="jp-text" style={{ fontSize: '4rem', color: 'var(--text-primary)' }}>
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
        <div className="flashcard-face flashcard-back">
          {word.kanji && word.hiragana && (
            <h2 className="jp-text" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>
              {word.hiragana}
            </h2>
          )}
          
          <h3 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--success-color)' }}>
            {word.meaning || "N/A"}
          </h3>
          
          {word.hanViet && (
            <p style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              【{word.hanViet}】
            </p>
          )}
          
          {word.wordType && (
            <p style={{ 
              marginTop: '1rem', 
              padding: '4px 12px', 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              borderRadius: '4px',
              color: 'var(--text-secondary)'
            }}>
              {word.wordType}
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default FlashcardCard;
