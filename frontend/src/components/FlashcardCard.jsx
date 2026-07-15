import React, { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { vocabApi } from '../services/api';
import AiEnrichedTabbedView from './AiEnrichedTabbedView';

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

  // Check if word already has rich AI enrichment data (not just sampleSentence)
  const hasRichEnrichment = (w) => {
    return w && (w.pitchAccent || w.wordType || w.mnemonic || w.synonyms || w.antonyms || w.kanjiWords || w.commonMistakes || w.exampleSentences || w.collocations || w.conversationExamples);
  };

  useEffect(() => {
    if (!word) return;

    if (hasRichEnrichment(word)) {
      setEnriched(word);
      return;
    }

    setEnriched(null);
    setLoadingEnrich(true);

    let active = true;
    let pollInterval = null;

    vocabApi.enrich(word.id)
      .then(data => {
        if (!active) return;
        if (hasRichEnrichment(data)) {
          // Cache all enrichment fields on the parent word object
          word.pitchAccent = data.pitchAccent;
          word.wordType = data.wordType;
          word.mnemonic = data.mnemonic;
          word.kanjiWords = data.kanjiWords;
          word.synonyms = data.synonyms;
          word.antonyms = data.antonyms;
          word.commonMistakes = data.commonMistakes;
          word.exampleSentences = data.exampleSentences;
          word.collocations = data.collocations;
          word.conversationExamples = data.conversationExamples;
          // Keep backward compatibility
          word.sampleSentence = data.sampleSentence;
          word.sampleReading = data.sampleReading;
          word.sampleTranslation = data.sampleTranslation;

          setEnriched(data);
          setLoadingEnrich(false);
        } else {
          // Start polling every 1.5s until database is updated
          pollInterval = setInterval(() => {
            vocabApi.getById(word.id)
              .then(pollData => {
                if (!active) return;
                if (hasRichEnrichment(pollData)) {
                  word.pitchAccent = pollData.pitchAccent;
                  word.wordType = pollData.wordType;
                  word.mnemonic = pollData.mnemonic;
                  word.kanjiWords = pollData.kanjiWords;
                  word.synonyms = pollData.synonyms;
                  word.antonyms = pollData.antonyms;
                  word.commonMistakes = pollData.commonMistakes;
                  word.exampleSentences = pollData.exampleSentences;
                  word.collocations = pollData.collocations;
                  word.conversationExamples = pollData.conversationExamples;
                  word.sampleSentence = pollData.sampleSentence;
                  word.sampleReading = pollData.sampleReading;
                  word.sampleTranslation = pollData.sampleTranslation;

                  setEnriched(pollData);
                  setLoadingEnrich(false);
                  clearInterval(pollInterval);
                }
              })
              .catch(err => console.error("Failed to poll vocabulary details:", err));
          }, 1500);
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
      if (pollInterval) clearInterval(pollInterval);
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
                    backgroundColor: 'var(--surface-hover)', 
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
                  <button className="btn" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)', border: '1px solid', flex: 1, padding: '8px 2px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => onRateWord(1)}>
                    Forgot
                  </button>
                  <button className="btn" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning-color)', borderColor: 'rgba(245, 158, 11, 0.3)', border: '1px solid', flex: 1, padding: '8px 2px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => onRateWord(2)}>
                    Hard
                  </button>
                  <button className="btn" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', borderColor: 'rgba(37, 99, 235, 0.3)', border: '1px solid', flex: 1, padding: '8px 2px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => onRateWord(3)}>
                    Good
                  </button>
                  <button className="btn" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success-color)', borderColor: 'rgba(16, 185, 129, 0.3)', border: '1px solid', flex: 1, padding: '8px 2px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => onRateWord(4)}>
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
                  Đang tải dữ liệu AI (từ vựng, ví dụ, Kanji, mẹo nhớ...)...
                </div>
              )}

              {enriched && (
                <AiEnrichedTabbedView data={enriched} />
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default FlashcardCard;
