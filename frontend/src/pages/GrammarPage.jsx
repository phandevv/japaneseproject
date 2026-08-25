import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, Filter, Volume2, Bookmark, Check, Sparkles, 
  ChevronRight, RefreshCw, Layers, Eye, EyeOff, X, Award, HelpCircle
} from 'lucide-react';
import { grammarApi, knowledgeApi } from '../services/api';
import GrammarDetailModal from '../components/GrammarDetailModal';

const FuriganaText = ({ text }) => {
  if (!text) return null;
  const str = String(text);

  // Match Kanji/Word + (furigana): e.g. "本(ほん)", "説明(せつめい)"
  const regex = /([^\s\(\)▶👉\u3040-\u309F\u30A0-\u30FF]+)\(([^)]+)\)/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      elements.push(str.substring(lastIndex, match.index));
    }

    const baseText = match[1];
    const furigana = match[2];

    elements.push(
      <ruby key={match.index} style={{ rubyPosition: 'over' }}>
        <span>{baseText}</span>
        <rt style={{ fontSize: '0.65em', color: 'var(--accent-color)', fontWeight: '600', userSelect: 'none', paddingBottom: '2px' }}>
          {furigana}
        </rt>
      </ruby>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    elements.push(str.substring(lastIndex));
  }

  return <>{elements}</>;
};

const ModalQuizItem = ({ quiz, index }) => {
  const [selectedOpt, setSelectedOpt] = useState(null);
  if (typeof quiz !== 'object' || !quiz) {
    return <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>• {String(quiz)}</div>;
  }

  const question = quiz.question || quiz.q || '';
  const options = quiz.options || quiz.opts || [];
  const answer = quiz.answer || quiz.ans || '';
  const explanation = quiz.explanation || quiz.exp || '';

  return (
    <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px dashed var(--border-color)' }}>
      <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '8px' }}>
        Câu {index + 1}: {question}
      </div>
      {options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '8px' }}>
          {options.map((opt, oIdx) => {
            const isSelected = selectedOpt === opt;
            const isCorrect = answer && (opt === answer || opt.startsWith(answer));
            let btnBg = 'var(--surface-hover)';
            let borderClr = 'var(--border-color)';
            let textClr = 'var(--text-secondary)';

            if (selectedOpt !== null) {
              if (isCorrect) {
                btnBg = 'var(--success-light)';
                borderClr = 'var(--success-color)';
                textClr = 'var(--success-color)';
              } else if (isSelected) {
                btnBg = 'var(--danger-light)';
                borderClr = 'var(--danger-color)';
                textClr = 'var(--danger-color)';
              }
            }

            return (
              <button
                key={oIdx}
                onClick={() => setSelectedOpt(opt)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${borderClr}`,
                  background: btnBg,
                  color: textClr,
                  textAlign: 'left',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.15s ease'
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
      {selectedOpt !== null && explanation && (
        <div style={{ fontSize: '13px', color: 'var(--success-color)', background: 'var(--success-light)', padding: '8px 12px', borderRadius: '6px', marginTop: '6px', border: '1px solid var(--success-color)' }}>
          💡 Giải thích: {explanation}
        </div>
      )}
    </div>
  );
};

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
        size: 500
      });
      let items = res.content || [];
      // When viewing 'ALL' weeks without search query, only display weekly curriculum cards (Tuần 1 - Tuần 6)
      if (selectedWeek === 'ALL' && !searchQuery.trim()) {
        const weeklyItems = items.filter(c => c.weekName && c.weekName.startsWith('Tuần'));
        if (weeklyItems.length > 0) {
          items = weeklyItems;
        }
      }
      setGrammarCards(items);
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

  // Helper to parse JSON or raw string data safely (handles double/triple encoded JSON strings)
  const parseJsonData = (raw) => {
    if (!raw) return null;
    let data = raw;
    let attempts = 0;
    while (typeof data === 'string' && attempts < 5) {
      const trimmed = data.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{') || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
          data = JSON.parse(trimmed);
          attempts++;
        } catch (e) {
          break;
        }
      } else {
        break;
      }
    }
    return data;
  };

  // Helper to parse examples text or JSON into array of { jp, reading, vn }
  const parseExamples = (raw) => {
    if (!raw) return [];
    
    const items = parseJsonData(raw);

    if (Array.isArray(items)) {
      return items.map(item => {
        if (typeof item === 'object' && item !== null) {
          return {
            jp: item.ja || item.jp || item.japanese || item.kanji || item.word || '',
            reading: item.reading || item.hiragana || item.furigana || '',
            vn: item.vi || item.vn || item.meaning || item.translation || ''
          };
        }
        if (typeof item === 'string') return { jp: item, reading: '', vn: '' };
        return null;
      }).filter(ex => ex && (ex.jp || ex.vn));
    }

    if (typeof items === 'string') {
      const lines = items.split(/\n(?=\d+\.\s)/);
      return lines.map(line => {
        const parts = line.split(/👉|\n\s*👉/);
        const jp = parts[0] ? parts[0].replace(/^\d+\.\s*/, '').trim() : '';
        const vn = parts[1] ? parts[1].trim() : '';
        return { jp, reading: '', vn };
      }).filter(ex => ex.jp || ex.vn);
    }

    return [];
  };

  return (
    <div className="grammar-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* Header Banner */}
      <div className="grammar-header-banner" style={{
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '28px',
        boxShadow: 'var(--shadow-sm)',
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
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              • {grammarCards.length} Mẫu ngữ pháp trọng tâm
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Ngữ Pháp Tiếng Nhật {selectedLevel}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '15px' }}>
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
              background: showFurigana ? 'var(--accent-light)' : 'var(--surface-hover)',
              border: `1px solid ${showFurigana ? 'var(--accent-color)' : 'var(--border-color)'}`,
              color: showFurigana ? 'var(--accent-color)' : 'var(--text-secondary)',
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
              background: showTranslations ? 'rgba(168, 85, 247, 0.15)' : 'var(--surface-hover)',
              border: `1px solid ${showTranslations ? '#a855f7' : 'var(--border-color)'}`,
              color: showTranslations ? '#a855f7' : 'var(--text-secondary)',
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
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mẫu ngữ pháp, nghĩa tiếng Việt, hoặc từ khóa cấu trúc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <X 
                size={18} 
                onClick={() => { setSearchQuery(''); fetchGrammarData(); }}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }}
              />
            )}
          </div>
          <button
            type="submit"
            style={{
              padding: '0 24px',
              background: 'var(--accent-color)',
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
            <Search size={16} /> Tìm kiếm
          </button>
        </form>

        {/* Level & Week Selector Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Level Selector Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', minWidth: '60px' }}>
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
                    border: isSelected ? 'none' : '1px solid var(--border-color)',
                    background: isSelected 
                      ? 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)' 
                      : 'var(--surface-hover)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
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
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', minWidth: '60px' }}>
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
                border: selectedWeek === 'ALL' ? 'none' : '1px solid var(--border-color)',
                background: selectedWeek === 'ALL' ? 'var(--accent-color)' : 'var(--surface-hover)',
                color: selectedWeek === 'ALL' ? '#fff' : 'var(--text-secondary)',
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
                    border: isSelected ? 'none' : '1px solid var(--border-color)',
                    background: isSelected ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'var(--surface-hover)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', minWidth: '60px' }}>
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
                  border: selectedDay === 'ALL' ? '1px solid #a855f7' : '1px solid var(--border-color)',
                  background: selectedDay === 'ALL' ? 'rgba(168, 85, 247, 0.2)' : 'var(--surface-hover)',
                  color: selectedDay === 'ALL' ? '#a855f7' : 'var(--text-secondary)'
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
                      border: isSelected ? 'none' : '1px solid var(--border-color)',
                      background: isSelected ? '#a855f7' : 'var(--surface-hover)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
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
        <div style={{ textWrap: 'nowrap', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px auto', color: 'var(--accent-color)' }} />
          <p style={{ fontSize: '16px' }}>Đang tải danh sách ngữ pháp {selectedLevel}...</p>
        </div>
      ) : error ? (
        <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger-color)', padding: '20px', borderRadius: '12px', color: 'var(--danger-color)', textAlign: 'center' }}>
          {error}
        </div>
      ) : grammarCards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <HelpCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <h3>Không tìm thấy mẫu ngữ pháp nào</h3>
          <p>Thử đổi từ khóa tìm kiếm hoặc lọc lại theo Tuần/Ngày khác.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '18px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
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
                          <span style={{ background: 'var(--accent-light)', color: 'var(--accent-color)', fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px' }}>
                            {card.weekName} {card.dayName ? `- ${card.dayName}` : ''}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleSaveToKnowledge(card)}
                        disabled={isSaved || savingId === card.id}
                        title={isSaved ? 'Đã lưu vào Kho tri thức' : 'Lưu vào Kho tri thức cá nhân'}
                        style={{
                          background: isSaved ? 'var(--success-light)' : 'var(--surface-hover)',
                          border: `1px solid ${isSaved ? 'var(--success-color)' : 'var(--border-color)'}`,
                          color: isSaved ? 'var(--success-color)' : 'var(--text-secondary)',
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
                      color: 'var(--text-primary)',
                      margin: '0 0 10px 0',
                      letterSpacing: '-0.3px',
                      lineHeight: '1.5'
                    }}>
                      <FuriganaText text={showFurigana && card.grammarFurigana ? card.grammarFurigana : card.grammar} />
                    </h2>

                    {/* Formation / Formula */}
                    {card.formation && (
                      <div style={{
                        background: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        borderLeft: '4px solid var(--accent-color)',
                        padding: '10px 14px',
                        borderRadius: '0 8px 8px 0',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '14px',
                        fontFamily: 'monospace'
                      }}>
                        Cấu trúc: {card.formation}
                      </div>
                    )}

                    {/* Meaning */}
                    <div style={{
                      background: 'var(--warning-light)',
                      border: '1px solid var(--warning-color)',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
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
                        color: 'var(--text-secondary)',
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
                        background: 'var(--bg-color)',
                        borderRadius: '12px',
                        padding: '14px',
                        border: '1px solid var(--border-color)',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
                          Ví dụ minh họa:
                        </div>
                        {examples.slice(0, 3).map((ex, exIdx) => {
                          const globalExIdx = `${card.id}-${exIdx}`;
                          return (
                            <div key={exIdx} style={{ marginBottom: exIdx < examples.length - 1 ? '12px' : '0', paddingBottom: exIdx < examples.length - 1 ? '10px' : '0', borderBottom: exIdx < examples.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600', lineHeight: '1.6' }}>
                                  {showFurigana && ex.reading ? (
                                    <FuriganaText text={ex.reading} />
                                  ) : (
                                    <FuriganaText text={ex.jp} />
                                  )}
                                </div>
                                {ex.jp && (
                                  <button
                                    onClick={() => handlePlayAudio(ex.jp, globalExIdx)}
                                    style={{
                                      background: speakingIndex === globalExIdx ? 'var(--accent-light)' : 'transparent',
                                      border: 'none',
                                      color: speakingIndex === globalExIdx ? 'var(--accent-color)' : 'var(--text-muted)',
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
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
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
                  <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setActiveModalCard(card)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-color)',
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
        <GrammarDetailModal
          grammarCard={activeModalCard}
          onClose={() => setActiveModalCard(null)}
          onReEnriched={(updated) => {
            setActiveModalCard(updated);
            setCards(prevCards => prevCards.map(c => c.id === updated.id ? updated : c));
          }}
        />
      )}
    </div>
  );
};

export default GrammarPage;
