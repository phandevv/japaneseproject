import React, { useState, useEffect } from 'react';

const FlashcardCard = ({ word, onFlip }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when the word changes
  useEffect(() => {
    setIsFlipped(false);
  }, [word]);

  const handleFlip = () => {
    const newFlipState = !isFlipped;
    setIsFlipped(newFlipState);
    if (onFlip) {
      onFlip(newFlipState);
    }
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
          
          <div style={{ position: 'absolute', bottom: '20px', display: 'flex', gap: '10px' }}>
            <span className="level-badge">{word.level}</span>
            <span className="level-badge" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
              Click to flip
            </span>
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
