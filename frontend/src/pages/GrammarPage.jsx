import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, Filter, Volume2, Bookmark, Check, Sparkles, 
  ChevronRight, RefreshCw, Layers, Eye, EyeOff, X, Award, HelpCircle
} from 'lucide-react';
import { grammarApi, knowledgeApi } from '../services/api';

const GrammarPage = () => {
  const [grammarCards, setGrammarCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation & Filtering
  const [selectedLevel, setSelectedLevel] = useState('N3');
  const [navigation, setNavigation] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFurigana, setShowFurigana] = useState(true);
  const [showTranslations, setShowTranslations] = useState(true);
  
  // Selected Card for Modal Detail
  const [activeModalCard, setActiveModalCard] = useState(null);
  const [savedCardIds, setSavedCardIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  
  // Audio Speech state
  const [speakingIndex, setSpeakingIndex] = useState(null);

  // Fetch navigation when level changes
  useEffect(() => {
    fetchNavigation();
  }, [selectedLevel]);

  // Fetch grammar data when level, week, or day changes
  useEffect(() => {
    fetchGrammarData();
  }, [selectedLevel, selectedWeek, selectedDay]);

  const fetchNavigation = async () => {
    try {
      const data = await grammarApi.getNavigation(selectedLevel);
      setNavigation(data || []);
    } catch (err) {
      console.error('Failed to load navigation:', err);
    }
  };

  const fetchGrammarData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await grammarApi.getGrammarCards({
        jlpt: selectedLevel,
        week: selectedWeek === 'ALL' ? '' : selectedWeek,
        day: selectedDay === 'ALL' ? '' : selectedDay,
        query: searchQuery.trim(),
        page: 0,
        size: 200
      });
      setGrammarCards(res.content || []);
    } catch (err) {
      console.error('Failed to load grammar:', err);
      setError('Không thể tải dữ liệu ngữ pháp. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Handle search submission with debounce or enter
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGrammarData();
  };

  // Get available days for selected week
  const availableDays = useMemo(() => {
    if (selectedWeek === 'ALL') return [];
    const weekNav = navigation.find(n => n.week === selectedWeek);
    return weekNav ? weekNav.days : [];
  }, [selectedWeek, navigation]);

  // Audio Speech Synthesis for Japanese text
  const handlePlayAudio = (text, idx) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ phát âm giọng nói SpeechSynthesis.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;
    
    setSpeakingIndex(idx);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    
    window.speechSynthesis.speak(utterance);
  };

  // Save grammar card to Personal Knowledge / SRS
  const handleSaveToKnowledge = async (card) => {
    if (savedCardIds.has(card.id) || savingId === card.id) return;
    setSavingId(card.id);
    try {
      await knowledgeApi.save({
        type: 'grammar',
        data: {
          grammar: card.grammar,
          meaning: card.meaning,
          usageDesc: card.usageDesc,
          formation: card.formation,
          jlpt: card.jlpt || 'N3',
          examples: card.examples
        }
      });
      setSavedCardIds(prev => new Set(prev).add(card.id));
    } catch (err) {
      console.error('Failed to save grammar:', err);
      alert('Không thể lưu thẻ ngữ pháp: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingId(null);
    }
  };

  // Helper to parse examples text into array of (jp, vn)
  const parseExamples = (examplesStr) => {
    if (!examplesStr) return [];
    // Split by numbered list e.g. "1. " or "2. "
    const lines = examplesStr.split(/\n(?=\d+\.\s)/);
    return lines.map(line => {
      const parts = line.split(/👉|\n\s*👉/);
      const jp = parts[0] ? parts[0].replace(/^\d+\.\s*/, '').trim() : '';
      const vn = parts[1] ? parts[1].trim() : '';
      return { jp, vn };
    }).filter(ex => ex.jp || ex.vn);
  };

  return (
    <div className="grammar-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-main, #e8edf4)' }}>
      
      {/* Header Banner */}
      <div className="grammar-header-banner" style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '28px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '13px',
              padding: '4px 12px',
              borderRadius: '20px',
              letterSpacing: '0.5px'
            }}>
              JLPT {selectedLevel} GRAMMAR
            </span>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>
              • {grammarCards.length} Mẫu ngữ pháp trọng tâm
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.5px' }}>
            Ngữ Pháp Tiếng Nhật {selectedLevel}
          </h1>
          <p style={{ color: '#94a3b8', margin: '8px 0 0 0', fontSize: '15px' }}>
            Hệ thống bài học ngữ pháp JLPT phân loại theo Tuần, có giải thích công thức & phát âm ví dụ sinh động
          </p>
        </div>

        {/* Global Action Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowFurigana(!showFurigana)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: showFurigana ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${showFurigana ? '#6366f1' : 'rgba(255, 255, 255, 0.15)'}`,
              color: showFurigana ? '#818cf8' : '#cbd5e1',
              padding: '10px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            {showFurigana ? <Eye size={16} /> : <EyeOff size={16} />}
            Furigana: {showFurigana ? 'BẬT' : 'TẮT'}
          </button>

          <button
            onClick={() => setShowTranslations(!showTranslations)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: showTranslations ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${showTranslations ? '#a855f7' : 'rgba(255, 255, 255, 0.15)'}`,
              color: showTranslations ? '#c084fc' : '#cbd5e1',
              padding: '10px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={16} />
            Dịch Việt: {showTranslations ? 'HIỆN' : 'ẨN'}
          </button>
        </div>
      </div>

      {/* Search & Navigation Control Bar */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mẫu ngữ pháp, nghĩa tiếng Việt, hoặc từ khóa cấu trúc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <X 
                size={18} 
                onClick={() => { setSearchQuery(''); fetchGrammarData(); }}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}
              />
            )}
          </div>
          <button
            type="submit"
            style={{
              padding: '0 24px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Search size={16} /> Tim kiem
          </button>
        </form>

        {/* Level & Week Selector Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Level Selector Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', minWidth: '60px' }}>
              CẤP ĐỘ:
            </span>
            {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => {
              const isSelected = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => {
                    setSelectedLevel(lvl);
                    setSelectedWeek('ALL');
                    setSelectedDay('ALL');
                  }}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    border: 'none',
                    background: isSelected 
                      ? 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)' 
                      : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#fff' : '#cbd5e1',
                    boxShadow: isSelected ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  JLPT {lvl}
                </button>
              );
            })}
          </div>

          {/* Week Selector Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', minWidth: '60px' }}>
              CHỌN TUẦN:
            </span>
            <button
              onClick={() => { setSelectedWeek('ALL'); setSelectedDay('ALL'); }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                background: selectedWeek === 'ALL' ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
                color: selectedWeek === 'ALL' ? '#fff' : '#cbd5e1',
                transition: 'all 0.15s ease'
              }}
            >
              Tất Cả Tuần ({grammarCards.length} mẫu)
            </button>

            {[1, 2, 3, 4, 5, 6].map(wNum => {
              const wKey = `Tuần ${wNum}`;
              const isSelected = selectedWeek === wKey;
              return (
                <button
                  key={wNum}
                  onClick={() => { setSelectedWeek(wKey); setSelectedDay('ALL'); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: 'none',
                    background: isSelected ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#fff' : '#cbd5e1',
                    boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Tuần {wNum}
                </button>
              );
            })}
          </div>

          {/* Day Sub-Selector Tabs (if a specific week is chosen) */}
          {selectedWeek !== 'ALL' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', minWidth: '60px' }}>
                CHỌN NGÀY:
              </span>
              <button
                onClick={() => setSelectedDay('ALL')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: 'none',
                  background: selectedDay === 'ALL' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.04)',
                  color: selectedDay === 'ALL' ? '#c084fc' : '#94a3b8'
                }}
              >
                Cả ngày trong {selectedWeek}
              </button>
              {[1, 2, 3, 4, 5, 6].map(dNum => {
                const dKey = `Ngày ${dNum}`;
                const isSelected = selectedDay === dKey;
                return (
                  <button
                    key={dNum}
                    onClick={() => setSelectedDay(dKey)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: 'none',
                      background: isSelected ? '#a855f7' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#fff' : '#cbd5e1',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Ngày {dNum}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div style={{ textWrap: 'nowrap', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px auto', color: '#6366f1' }} />
          <p style={{ fontSize: '16px' }}>Đang tải danh sách ngữ pháp {selectedLevel}...</p>
        </div>
      ) : error ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '20px', borderRadius: '12px', color: '#fca5a5', textAlign: 'center' }}>
          {error}
        </div>
      ) : grammarCards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px' }}>
          <HelpCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <h3>Không tìm thấy mẫu ngữ pháp nào</h3>
          <p>Thử đổi từ khóa tìm kiếm hoặc lọc lại theo Tuần/Ngày khác.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px', color: '#94a3b8', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Hiển thị <strong>{grammarCards.length}</strong> mẫu ngữ pháp</span>
            {selectedWeek !== 'ALL' && <span>Đang xem: <strong>{selectedWeek}</strong> {selectedDay !== 'ALL' ? `- ${selectedDay}` : ''}</span>}
          </div>

          {/* Grammar Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
            gap: '24px'
          }}>
            {grammarCards.map((card, idx) => {
              const examples = parseExamples(card.examples);
              const isSaved = savedCardIds.has(card.id);

              return (
                <div
                  key={card.id || idx}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '18px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Top Bar Badges */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {card.jlpt || 'N3'}
                        </span>
                        {card.weekName && (
                          <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px' }}>
                            {card.weekName} {card.dayName ? `- ${card.dayName}` : ''}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleSaveToKnowledge(card)}
                        disabled={isSaved || savingId === card.id}
                        title={isSaved ? 'Đã lưu vào Kho tri thức' : 'Lưu vào Kho tri thức cá nhân'}
                        style={{
                          background: isSaved ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                          border: `1px solid ${isSaved ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: isSaved ? '#4ade80' : '#cbd5e1',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: isSaved ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        {isSaved ? <Check size={14} /> : <Bookmark size={14} />}
                        {isSaved ? 'Đã lưu' : 'Lưu SRS'}
                      </button>
                    </div>

                    {/* Grammar Title Header */}
                    <h2 style={{
                      fontSize: '22px',
                      fontWeight: '800',
                      color: '#60a5fa',
                      margin: '0 0 10px 0',
                      letterSpacing: '-0.3px',
                      lineHeight: '1.4'
                    }}>
                      {card.grammar}
                    </h2>

                    {/* Formation / Formula */}
                    {card.formation && (
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderLeft: '4px solid #6366f1',
                        padding: '10px 14px',
                        borderRadius: '0 8px 8px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#a5b4fc',
                        marginBottom: '14px',
                        fontFamily: 'monospace'
                      }}>
                        Cấu trúc: {card.formation}
                      </div>
                    )}

                    {/* Meaning */}
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#fbbf24',
                      fontSize: '15px',
                      fontWeight: '700',
                      marginBottom: '14px'
                    }}>
                      💡 Ý nghĩa: {card.meaning}
                    </div>

                    {/* Usage Description / Explanation */}
                    {card.usageDesc && (
                      <p style={{
                        fontSize: '14px',
                        color: '#cbd5e1',
                        lineHeight: '1.6',
                        margin: '0 0 16px 0',
                        whiteSpace: 'pre-line'
                      }}>
                        {card.usageDesc}
                      </p>
                    )}

                    {/* Example Sentences */}
                    {examples.length > 0 && (
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: '12px',
                        padding: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>
                          Ví dụ minh họa:
                        </div>
                        {examples.slice(0, 3).map((ex, exIdx) => {
                          const globalExIdx = `${card.id}-${exIdx}`;
                          return (
                            <div key={exIdx} style={{ marginBottom: exIdx < examples.length - 1 ? '12px' : '0', paddingBottom: exIdx < examples.length - 1 ? '10px' : '0', borderBottom: exIdx < examples.length - 1 ? '1px dashed rgba(255, 255, 255, 0.06)' : 'none' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontSize: '15px', color: '#f8fafc', fontWeight: '500', lineHeight: '1.5' }}>
                                  {ex.jp}
                                </span>
                                {ex.jp && (
                                  <button
                                    onClick={() => handlePlayAudio(ex.jp, globalExIdx)}
                                    style={{
                                      background: speakingIndex === globalExIdx ? 'rgba(99, 102, 241, 0.4)' : 'transparent',
                                      border: 'none',
                                      color: speakingIndex === globalExIdx ? '#818cf8' : '#94a3b8',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    title="Phát âm tiếng Nhật"
                                  >
                                    <Volume2 size={16} />
                                  </button>
                                )}
                              </div>
                              {showTranslations && ex.vn && (
                                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                                  👉 {ex.vn}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Detail Modal Button */}
                  <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setActiveModalCard(card)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#818cf8',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      Xem chi tiết <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Grammar Detail Modal */}
      {activeModalCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            color: '#fff'
          }}>
            <button
              onClick={() => setActiveModalCard(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '6px' }}>
                {activeModalCard.jlpt || 'N3'}
              </span>
              {activeModalCard.weekName && (
                <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontSize: '13px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px' }}>
                  {activeModalCard.weekName} {activeModalCard.dayName ? `- ${activeModalCard.dayName}` : ''}
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#60a5fa', margin: '0 0 16px 0' }}>
              {activeModalCard.grammar}
            </h2>

            {activeModalCard.formation && (
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderLeft: '4px solid #6366f1', padding: '14px', borderRadius: '0 8px 8px 0', fontSize: '15px', color: '#a5b4fc', fontWeight: '600', marginBottom: '20px' }}>
                📌 Cấu trúc: {activeModalCard.formation}
              </div>
            )}

            <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '14px', borderRadius: '12px', color: '#fbbf24', fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>
              💡 Ý nghĩa: {activeModalCard.meaning}
            </div>

            {activeModalCard.usageDesc && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#94a3b8', margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase' }}>Giải thích & Cách dùng:</h4>
                <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#e2e8f0', whiteSpace: 'pre-line', margin: 0 }}>
                  {activeModalCard.usageDesc}
                </p>
              </div>
            )}

            {activeModalCard.examples && (
              <div>
                <h4 style={{ color: '#94a3b8', margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase' }}>Tất cả ví dụ:</h4>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', padding: '16px' }}>
                  {parseExamples(activeModalCard.examples).map((ex, idx) => (
                    <div key={idx} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                        <span style={{ fontSize: '16px', color: '#fff', fontWeight: '500' }}>{ex.jp}</span>
                        <button
                          onClick={() => handlePlayAudio(ex.jp, `modal-${idx}`)}
                          style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer' }}
                        >
                          <Volume2 size={18} />
                        </button>
                      </div>
                      {ex.vn && <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>👉 {ex.vn}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrammarPage;
