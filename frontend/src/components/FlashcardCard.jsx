import React, { useState, useEffect } from 'react';
import { Volume2, Pencil, Check, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { vocabApi } from '../services/api';
import AiEnrichedTabbedView from './AiEnrichedTabbedView';

const FlashcardCard = ({ word, flipped, onFlip, onRateWord }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user && (user.username === "admin" || user.role === "ADMIN" || user.roles?.includes("ADMIN") || user.roles?.includes("ROLE_ADMIN"));

  const [enriched, setEnriched] = useState(null);
  const [loadingEnrich, setLoadingEnrich] = useState(false);

  // Admin inline editing for Flashcard left column
  const [isEditingLeft, setIsEditingLeft] = useState(false);
  const [editDraft, setEditDraft] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const startEdit = () => {
    setIsEditingLeft(true);
    setEditDraft({
      kanji: word.kanji || '',
      hiragana: word.hiragana || '',
      meaning: word.meaning || '',
      hanViet: word.hanViet || '',
      wordType: word.wordType || ''
    });
  };

  const cancelEdit = () => {
    setIsEditingLeft(false);
    setEditDraft({});
  };

  const saveEdit = async () => {
    if (!word?.id) return;
    setSavingEdit(true);
    try {
      const payload = {
        ...word,
        ...(enriched || {}),
        ...editDraft
      };
      if (payload.hanViet) {
        payload.hanViet = String(payload.hanViet).trim().toUpperCase();
      }

      const saved = await vocabApi.update(word.id, payload);
      Object.assign(word, saved);
      setEnriched(saved);
      setIsEditingLeft(false);
      setEditDraft({});
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save flashcard edit:", err);
      alert("Lỗi khi lưu: " + (err.response?.data?.message || err.message));
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [word]);

  // Check if word already has rich AI enrichment data
  const hasRichEnrichment = (w) => {
    return w && (
      (typeof w.mnemonic === 'string' && w.mnemonic.trim().length > 0) &&
      (typeof w.usageGuide === 'string' && w.usageGuide.trim().length > 0) &&
      (typeof w.exampleSentences === 'string' && w.exampleSentences.trim().length > 0 && w.exampleSentences !== '[]' && w.exampleSentences !== 'null')
    );
  };

  useEffect(() => {
    if (!word || !word.id) {
      setLoadingEnrich(false);
      return;
    }

    if (hasRichEnrichment(word)) {
      setEnriched(word);
      return;
    }

    if (!word.id || isNaN(Number(word.id))) {
      setEnriched(word);
      setLoadingEnrich(false);
      return;
    }

    // Display available word details immediately to eliminate UI flicker
    setEnriched(word);

    const targetWordId = word.id;
    let active = true;
    let pollInterval = null;

    vocabApi.enrich(targetWordId)
      .then(data => {
        if (!active || word?.id !== targetWordId || !data || data.id !== targetWordId) return;
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
          // Start polling every 1.5s (max 5 attempts / 7.5s) until database is updated
          let pollAttempts = 0;
          pollInterval = setInterval(() => {
            pollAttempts++;
            if (pollAttempts >= 5) {
              if (pollInterval) clearInterval(pollInterval);
              setLoadingEnrich(false);
              return;
            }
            vocabApi.getById(targetWordId)
              .then(pollData => {
                if (!active || word?.id !== targetWordId || !pollData || pollData.id !== targetWordId) return;
                if (hasRichEnrichment(pollData) || pollData.isEnriching === false) {
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
                  if (pollInterval) clearInterval(pollInterval);
                }
              })
              .catch(err => {
                console.error("Failed to poll vocabulary details:", err);
                if (pollInterval) clearInterval(pollInterval);
                setLoadingEnrich(false);
              });
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

  const getGlowColor = (level) => {
    if (!level) return 'rgba(0, 0, 0, 0.08)';
    const l = level.toUpperCase();
    if (l.includes('N1')) return 'rgba(139, 92, 246, 0.4)';
    if (l.includes('N2')) return 'rgba(239, 68, 68, 0.4)';
    if (l.includes('N3')) return 'rgba(245, 158, 11, 0.4)';
    if (l.includes('N4')) return 'rgba(16, 185, 129, 0.4)';
    if (l.includes('N5')) return 'rgba(59, 130, 246, 0.4)';
    return 'rgba(0, 0, 0, 0.08)';
  };
  
  const cardGlowStyle = {
    boxShadow: `0 12px 40px ${getGlowColor(word?.level)}`
  };

  return (
    <div className="flashcard-container" onClick={handleFlip}>
      <div className={`flashcard ${flipped ? 'is-flipped' : ''}`}>
        
        {/* Front side (Japanese) */}
        <div className="flashcard-face flashcard-front" style={{ ...cardGlowStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '24px 20px 20px 20px' }}>
          {/* Top header bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="level-badge">{word.level}</span>
              <span className="level-badge" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}>
                {t.card.clickToFlip}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSpeak}
              style={{ padding: '6px 12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Volume2 size={16} /> {t.card.pronounce}
            </button>
          </div>

          {/* Main Japanese Word Display */}
          <div style={{ marginTop: 'auto', marginBottom: 'auto', textAlign: 'center' }}>
            {word.kanji ? (
              <h2 className="jp-text" style={{ fontSize: '6rem', marginBottom: '0.5rem', color: 'var(--text-primary)', transition: 'font-size 0.2s' }}>
                {word.kanji}
              </h2>
            ) : (
              <p className="jp-text" style={{ fontSize: '5rem', color: 'var(--text-primary)', transition: 'font-size 0.2s' }}>
                {word.hiragana}
              </p>
            )}
          </div>
          
          {/* Difficulty Rate Buttons directly on Front Side */}
          {onRateWord && (() => {
            const proj = word.projections || { AGAIN: 0, HARD: 0, GOOD: 1, EASY: 5 };
            return (
              <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '500px', justifyContent: 'center', marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                <button className="glass-pill-btn glass-pill-forgot" onClick={() => onRateWord(1)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                  <span style={{fontSize: '0.72rem', opacity: 0.8}}>{proj.AGAIN === 0 ? '<10m' : proj.AGAIN + 'd'}</span>
                  <span style={{ fontWeight: 700 }}>Forgot</span>
                </button>
                <button className="glass-pill-btn glass-pill-hard" onClick={() => onRateWord(2)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                  <span style={{fontSize: '0.72rem', opacity: 0.8}}>{proj.HARD === 0 ? '<10m' : proj.HARD + 'd'}</span>
                  <span style={{ fontWeight: 700 }}>Hard</span>
                </button>
                <button className="glass-pill-btn glass-pill-good" onClick={() => onRateWord(3)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                  <span style={{fontSize: '0.72rem', opacity: 0.8}}>{proj.GOOD === 0 ? '<10m' : proj.GOOD + 'd'}</span>
                  <span style={{ fontWeight: 700 }}>Good</span>
                </button>
                <button className="glass-pill-btn glass-pill-easy" onClick={() => onRateWord(4)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                  <span style={{fontSize: '0.72rem', opacity: 0.8}}>{proj.EASY === 0 ? '<10m' : proj.EASY + 'd'}</span>
                  <span style={{ fontWeight: 700 }}>Easy</span>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Back side (Meaning) */}
        <div className="flashcard-face flashcard-back" style={{ padding: 0, ...cardGlowStyle }}>
          <div className="flashcard-back-content">
            
            {/* Left Column: Basic word information and Rate buttons */}
            <div className="flashcard-back-left" style={{ position: 'relative' }}>
              {/* Admin Edit button in top left */}
              {isAdmin && (
                <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 3 }} onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={startEdit}
                    style={{
                      background: editSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37,99,235,0.1)',
                      border: `1px solid ${editSuccess ? '#10b981' : 'rgba(37,99,235,0.25)'}`,
                      borderRadius: '5px',
                      color: editSuccess ? '#10b981' : 'var(--accent-color)',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}
                  >
                    {editSuccess ? <><Check size={11} /> Đã lưu</> : <><Pencil size={11} /> Sửa thông tin</>}
                  </button>
                </div>
              )}

              {isEditingLeft ? (
                <div style={{ padding: '16px', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--accent-color)', textAlign: 'left', width: '90%', margin: 'auto' }} onClick={e => e.stopPropagation()}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Từ Kanji</label>
                    <input 
                      type="text" 
                      value={editDraft.kanji || ''} 
                      onChange={(e) => setEditDraft(prev => ({ ...prev, kanji: e.target.value }))}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cách đọc Hiragana</label>
                    <input 
                      type="text" 
                      value={editDraft.hiragana || ''} 
                      onChange={(e) => setEditDraft(prev => ({ ...prev, hiragana: e.target.value }))}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ý nghĩa</label>
                    <input 
                      type="text" 
                      value={editDraft.meaning || ''} 
                      onChange={(e) => setEditDraft(prev => ({ ...prev, meaning: e.target.value }))}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Hán Việt (VIẾT HOA)</label>
                    <input 
                      type="text" 
                      value={editDraft.hanViet || ''} 
                      onChange={(e) => setEditDraft(prev => ({ ...prev, hanViet: e.target.value.toUpperCase() }))}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Từ loại</label>
                    <input 
                      type="text" 
                      value={editDraft.wordType || ''} 
                      onChange={(e) => setEditDraft(prev => ({ ...prev, wordType: e.target.value }))}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button type="button" onClick={cancelEdit} disabled={savingEdit} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>Hủy</button>
                    <button type="button" onClick={saveEdit} disabled={savingEdit} style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>{savingEdit ? 'Đang lưu...' : 'Lưu'}</button>
                  </div>
                </div>
              ) : (
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
                      fontSize: '0.85rem',
                      marginBottom: '8px'
                    }}>
                      {word.wordType}
                    </span>
                  )}

                  {/* Related words list for Kanji */}
                  {word.tu_vung && Array.isArray(word.tu_vung) && word.tu_vung.length > 0 && (
                    <div style={{ marginTop: '8px', width: '100%', textAlign: 'left', padding: '8px', background: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Từ vựng chứa chữ Hán:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {word.tu_vung.map((tv, idx) => (
                          <span key={idx} style={{ fontSize: '0.76rem', background: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                            {tv}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample sentence for Vocab */}
                  {word.sampleSentence && !word.tu_vung && (
                    <div style={{ marginTop: '8px', width: '100%', textAlign: 'left', padding: '8px', background: 'var(--surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Ví dụ:</span>
                      {word.sampleSentence}
                    </div>
                  )}
                </div>
              )}

              {/* Rate buttons for logged-in user in flashcard mode */}
              {onRateWord && (() => {
                // Fallback default FSRS projections for NEW cards (when studying in Daily Study mode)
                const proj = word.projections || { AGAIN: 0, HARD: 0, GOOD: 1, EASY: 5 };
                return (
                  <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center', marginTop: '20px' }} onClick={e => e.stopPropagation()}>
                    <button className="glass-pill-btn glass-pill-forgot" onClick={() => onRateWord(1)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{fontSize: '0.75rem', opacity: 0.7}}>{proj.AGAIN === 0 ? '<10m' : proj.AGAIN + 'd'}</span>
                      <span>Forgot</span>
                    </button>
                    <button className="glass-pill-btn glass-pill-hard" onClick={() => onRateWord(2)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{fontSize: '0.75rem', opacity: 0.7}}>{proj.HARD === 0 ? '<10m' : proj.HARD + 'd'}</span>
                      <span>Hard</span>
                    </button>
                    <button className="glass-pill-btn glass-pill-good" onClick={() => onRateWord(3)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{fontSize: '0.75rem', opacity: 0.7}}>{proj.GOOD === 0 ? '<10m' : proj.GOOD + 'd'}</span>
                      <span>Good</span>
                    </button>
                    <button className="glass-pill-btn glass-pill-easy" onClick={() => onRateWord(4)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{fontSize: '0.75rem', opacity: 0.7}}>{proj.EASY === 0 ? '<10m' : proj.EASY + 'd'}</span>
                      <span>Easy</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Right Column: AI Rich Data Section */}
            <div className="flashcard-back-right hide-scrollbar" style={{ overflowY: 'auto', flex: 1, minWidth: 0 }} onClick={e => e.stopPropagation()}>
              {loadingEnrich && (
                <div style={{ 
                  color: 'var(--accent-color)', 
                  fontSize: '0.78rem', 
                  padding: '6px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: '6px',
                  textAlign: 'center',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  ✨ Đang tự động gọi DeepSeek AI làm giàu dữ liệu (mẹo nhớ, ngữ cảnh, ví dụ)...
                </div>
              )}

              <AiEnrichedTabbedView data={enriched || word} />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default FlashcardCard;
