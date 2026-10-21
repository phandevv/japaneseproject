import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, RotateCcw, Volume2, Shuffle, Sparkles, 
  BookOpen, Flame, Trophy, HelpCircle, CheckCircle2, Layers, 
  Eye, EyeOff, Award, ChevronLeft, ChevronRight, BarChart3, Clock
} from 'lucide-react';
import { grammarFrequencyApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { renderTextWithFurigana } from '../utils/furiganaUtils';

const HighFrequencyGrammarFlashcardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Filter: 'all' | 'critical' | 'n3' | 'n4' | 'due'
  const currentFilter = searchParams.get('filter') || 'all';

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 79, learned: 0, reviewed: 0, due: 0 });
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [showAnswerHint, setShowAnswerHint] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Load list & stats
  const loadData = useCallback(async (filterParam) => {
    setLoading(true);
    try {
      const [listData, statsData] = await Promise.all([
        grammarFrequencyApi.getList(filterParam),
        grammarFrequencyApi.getStats()
      ]);
      setItems(Array.isArray(listData) ? listData : []);
      if (statsData) setStats(statsData);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowAnswerHint(false);
    } catch (err) {
      console.error("Lỗi khi tải ngữ pháp tần suất cao:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(currentFilter);
  }, [currentFilter, loadData]);

  const handleFilterChange = (newFilter) => {
    setSearchParams({ filter: newFilter });
  };

  const handleShuffle = () => {
    if (items.length <= 1) return;
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(true);
  };

  const handleResetOrder = () => {
    loadData(currentFilter);
    setIsShuffled(false);
  };

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
      setShowAnswerHint(false);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowAnswerHint(false);
    }
  }, [currentIndex, items.length]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  // Text to speech
  const handleSpeak = (text, e) => {
    if (e) e.stopPropagation();
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    // Strip clean Japanese text
    const clean = text.replace(/\[(.*?)\|(.*?)\]/g, '$1').replace(/[〜\(\)\s]/g, '');
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'ja-JP';
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  };

  // Submit SRS review rating: 1 (Forgot), 2 (Hard), 3 (Good), 4 (Easy)
  const handleRate = async (quality, e) => {
    if (e) e.stopPropagation();
    if (!user) {
      alert("Vui lòng đăng nhập để lưu tiến độ ôn tập SRS của bạn!");
      return;
    }
    const currentItem = items[currentIndex];
    if (!currentItem || ratingSubmitting) return;

    setRatingSubmitting(true);
    try {
      const updated = await grammarFrequencyApi.review(currentItem.id, quality);
      // Update local item
      setItems(prev => {
        const copy = [...prev];
        copy[currentIndex] = { ...copy[currentIndex], ...updated };
        return copy;
      });
      // Refresh stats in background
      grammarFrequencyApi.getStats().then(s => s && setStats(s)).catch(() => {});

      // Auto advance to next card after a brief moment if not at end
      setTimeout(() => {
        if (currentIndex < items.length - 1) {
          handleNext();
        } else {
          setIsFlipped(false);
        }
      }, 300);
    } catch (err) {
      console.error("Lỗi khi chấm điểm SRS:", err);
      alert(err.response?.data?.message || "Không thể lưu tiến trình ôn tập.");
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === '1') {
        handleRate(1);
      } else if (e.key === '2') {
        handleRate(2);
      } else if (e.key === '3') {
        handleRate(3);
      } else if (e.key === '4') {
        handleRate(4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handlePrev, handleNext]);

  const currentItem = items[currentIndex];

  // Parse examples json
  const examExamples = useMemo(() => {
    if (!currentItem?.examExamplesJson) return [];
    try {
      const parsed = JSON.parse(currentItem.examExamplesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [currentItem]);

  // Clean challenge sentence (mask pattern)
  const challengeExample = examExamples.length > 0 ? examExamples[0] : null;

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '24px 16px 60px 16px',
      color: 'var(--text-primary)',
      minHeight: '100vh',
      fontFamily: 'inherit'
    }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <button
          onClick={() => navigate('/jlpt-n3')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            padding: '8px 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} /> Quay lại Khóa học JLPT N3
        </button>

        {/* Stats Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-color)',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '13px'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}>
            <CheckCircle2 size={15} /> Đã thuộc: <b>{stats.learned}</b> / {stats.total}
          </span>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f59e0b' }}>
            <Clock size={15} /> Cần ôn hôm nay: <b>{stats.due}</b>
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Flame size={14} /> Phân Tích 30 Đề Thi JLPT N3 (2010 - 2025)
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Dataset: 3.503 lần xuất hiện ngữ pháp
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(20px, 4vw, 26px)',
          fontWeight: '800',
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, #fff 0%, #fca5a5 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Flashcard 79 Mẫu Ngữ Pháp Tần Suất Cao Nhất
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '750px', lineHeight: 1.5 }}>
          Bộ Flashcard ngữ liệu thực chiến được trích xuất trực tiếp từ 60 tệp đề thi và script nghe qua 30 kỳ thi.
          Tích hợp thuật toán lặp lại ngắt quãng (SM-2 SRS) để nắm chắc 100% câu hỏi ngữ pháp và đọc hiểu N3.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '20px',
        scrollbarWidth: 'none'
      }}>
        {[
          { key: 'all', label: `Tất cả (79)`, icon: Layers },
          { key: 'critical', label: `🔥 TOP 20 Critical (30/30 Đề)`, icon: Flame },
          { key: 'n3', label: `🎯 N3 Thuần Túy (45)`, icon: BookOpen },
          { key: 'n4', label: `⚡ N4 Hay Ra Đề N3 (34)`, icon: Award },
          { key: 'due', label: `⏰ Cần Ôn SRS (${stats.due})`, icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = currentFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: isActive ? '700' : '500',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: isActive ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid var(--border-color)',
                background: isActive ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.15) 100%)' : 'var(--surface-color)',
                color: isActive ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Icon size={15} color={isActive ? '#ef4444' : 'currentColor'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Flashcard Arena */}
      {loading ? (
        <div style={{
          minHeight: '380px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-color)',
          borderRadius: '24px',
          border: '1px solid var(--border-color)',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--border-color)',
            borderTopColor: '#ef4444',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Đang nạp bộ ngữ pháp tần suất cao...</span>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          minHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-color)',
          borderRadius: '24px',
          border: '1px solid var(--border-color)',
          padding: '32px',
          textAlign: 'center'
        }}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700' }}>
            {currentFilter === 'due' ? 'Tuyệt vời! Không có thẻ nào cần ôn hôm nay.' : 'Không tìm thấy mẫu ngữ pháp nào theo bộ lọc này.'}
          </h3>
          <p style={{ margin: '0 0 18px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {currentFilter === 'due' ? 'Bạn đã hoàn thành toàn bộ thẻ ôn tập ngắt quãng. Hãy chuyển sang tab Tất cả để tiếp tục học thẻ mới!' : 'Vui lòng chọn bộ lọc khác để luyện tập.'}
          </p>
          <button
            onClick={() => handleFilterChange('all')}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Học toàn bộ 79 mẫu ngữ pháp
          </button>
        </div>
      ) : (
        <div>
          {/* Progress Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            fontSize: '13px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '15px' }}>
                Thẻ {currentIndex + 1} / {items.length}
              </span>
              {isShuffled && (
                <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                  Đang xáo trộn
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleShuffle}
                title="Xáo trộn ngẫu nhiên"
                style={{
                  background: isShuffled ? 'rgba(239, 68, 68, 0.2)' : 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  color: isShuffled ? '#ef4444' : 'var(--text-secondary)',
                  padding: '6px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px'
                }}
              >
                <Shuffle size={14} /> Xáo trộn
              </button>
              {isShuffled && (
                <button
                  onClick={handleResetOrder}
                  title="Khôi phục thứ tự xếp hạng"
                  style={{
                    background: 'var(--surface-color)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px'
                  }}
                >
                  <RotateCcw size={14} /> Theo thứ hạng
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            height: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '2px',
            marginBottom: '20px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${((currentIndex + 1) / items.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #ef4444, #ec4899)',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={handleFlip}
            style={{
              perspective: '1200px',
              minHeight: '440px',
              cursor: 'pointer',
              marginBottom: '24px'
            }}
          >
            <div style={{
              width: '100%',
              minHeight: '440px',
              position: 'relative',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}>

              {/* ─── FRONT FACE ─────────────────────────────────────────── */}
              <div style={{
                position: isFlipped ? 'absolute' : 'relative',
                top: 0,
                left: 0,
                width: '100%',
                minHeight: '440px',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                background: 'linear-gradient(145deg, var(--surface-color) 0%, rgba(30, 41, 59, 0.85) 100%)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.45)',
                boxSizing: 'border-box'
              }}>
                {/* Header Row */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#fff',
                        fontWeight: '800',
                        fontSize: '13px',
                        padding: '4px 12px',
                        borderRadius: '10px',
                        letterSpacing: '0.5px'
                      }}>
                        TOP #{currentItem?.rankNumber}
                      </span>
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontWeight: '700',
                        fontSize: '13px',
                        padding: '4px 10px',
                        borderRadius: '10px'
                      }}>
                        {currentItem?.level}
                      </span>
                      <span style={{
                        color: '#f59e0b',
                        fontWeight: '700',
                        fontSize: '13px',
                        letterSpacing: '1px'
                      }}>
                        {currentItem?.priorityStars} {currentItem?.priority}
                      </span>
                    </div>

                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#fca5a5',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '12.5px',
                      fontWeight: '600'
                    }}>
                      <Flame size={14} /> Xuất hiện {currentItem?.totalOccurrences} lần ({currentItem?.examCoverage} đề)
                    </div>
                  </div>

                  {/* Main Pattern Name */}
                  <div style={{ textAlign: 'center', margin: '30px 0 20px 0' }}>
                    <div style={{
                      fontSize: 'clamp(26px, 5vw, 36px)',
                      fontWeight: '800',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                      marginBottom: '10px',
                      letterSpacing: '-0.5px'
                    }}>
                      {renderTextWithFurigana(currentItem?.grammar || '')}
                    </div>

                    <button
                      onClick={(e) => handleSpeak(currentItem?.grammar, e)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      <Volume2 size={16} /> Nghe phát âm
                    </button>
                  </div>

                  {/* Section Breakdown Chips */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    margin: '20px 0',
                    maxWidth: '560px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color)',
                      padding: '10px 8px',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>文法 (Ngữ pháp)</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#60a5fa' }}>{currentItem?.bunpouCount || 0}</div>
                    </div>
                    <div style={{
                      background: currentItem?.dokkaiCount > currentItem?.bunpouCount ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: currentItem?.dokkaiCount > currentItem?.bunpouCount ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-color)',
                      padding: '10px 8px',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>読解 (Đọc hiểu)</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#f87171' }}>{currentItem?.dokkaiCount || 0}</div>
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color)',
                      padding: '10px 8px',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>聴解 (Nghe hiểu)</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#34d399' }}>{currentItem?.choukaiCount || 0}</div>
                    </div>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color)',
                      padding: '10px 8px',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px' }}>語彙 (Từ vựng)</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#fbbf24' }}>{currentItem?.goiCount || 0}</div>
                    </div>
                  </div>

                  {/* Real Exam Quick Challenge Context */}
                  {challengeExample && (
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: '14px',
                      padding: '14px 18px',
                      marginTop: '16px',
                      fontSize: '13.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#93c5fd', fontWeight: '600', marginBottom: '4px' }}>
                        <Trophy size={13} /> Câu trích từ đề thi thật [{challengeExample.session} / {challengeExample.section}]:
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
                        {challengeExample.japanese}
                      </div>
                    </div>
                  )}
                </div>

                {/* Flip Prompt */}
                <div style={{
                  textAlign: 'center',
                  paddingTop: '20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <RotateCcw size={15} /> Nhấn thẻ hoặc bấm <b>Space</b> để xem ý nghĩa, cấu trúc & mẹo làm bài
                </div>
              </div>

              {/* ─── BACK FACE ──────────────────────────────────────────── */}
              <div style={{
                position: isFlipped ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                minHeight: '440px',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(145deg, var(--surface-color) 0%, rgba(24, 30, 44, 0.95) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '24px',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.45)',
                boxSizing: 'border-box'
              }}>
                <div>
                  {/* Top Header of Back */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '18px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', color: '#f87171', fontSize: '15px' }}>
                        TOP #{currentItem?.rankNumber}
                      </span>
                      <span style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text-primary)' }}>
                        {currentItem?.grammar}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleSpeak(currentItem?.grammar, e)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        padding: '6px 12px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Volume2 size={14} /> Phát âm
                    </button>
                  </div>

                  {/* 1. Ý Nghĩa Cốt Lõi */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#10b981', fontWeight: '700', marginBottom: '4px', letterSpacing: '0.5px' }}>
                      Ý nghĩa cốt lõi
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {currentItem?.meaning}
                    </div>
                  </div>

                  {/* 2. Cấu Trúc / Formation */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#60a5fa', fontWeight: '700', marginBottom: '4px', letterSpacing: '0.5px' }}>
                      Cấu trúc ngữ pháp
                    </div>
                    <div style={{ fontSize: '14.5px', fontFamily: 'monospace', color: '#93c5fd', fontWeight: '600' }}>
                      {currentItem?.formation || currentItem?.grammar}
                    </div>
                  </div>

                  {/* 3. Mẹo Thực Chiến (Study Tip) */}
                  {currentItem?.studyTip && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      color: '#fde68a',
                      lineHeight: 1.5
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '2px', color: '#f59e0b' }}>
                        <Sparkles size={14} /> Mẹo thực chiến trong đề thi thật:
                      </div>
                      {currentItem.studyTip}
                    </div>
                  )}

                  {/* 4. Ví Dụ Trích Dẫn Đề Thi Thật */}
                  {examExamples.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#f87171', fontWeight: '700', marginBottom: '8px', letterSpacing: '0.5px' }}>
                        Trích dẫn đề thi chính thức ({examExamples.length} câu)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                        {examExamples.map((ex, exIdx) => (
                          <div
                            key={exIdx}
                            style={{
                              background: 'rgba(0, 0, 0, 0.25)',
                              borderLeft: '3px solid #ef4444',
                              padding: '8px 12px',
                              borderRadius: '4px 8px 8px 4px',
                              fontSize: '13px'
                            }}
                          >
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                              [{ex.session} / {ex.section} / {ex.questionId}]
                            </div>
                            <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                              {renderTextWithFurigana(ex.japanese)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SRS Rating Actions on Back */}
                <div style={{
                  paddingTop: '20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  marginTop: '16px'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <Award size={14} color="#f59e0b" /> Đánh giá mức độ ghi nhớ (Thuật toán SM-2 SRS):
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px'
                  }}>
                    {[
                      { quality: 1, label: '1. Quên', sub: '1 ngày', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#fca5a5' },
                      { quality: 2, label: '2. Khó', sub: 'Ôn sớm', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#fcd34d' },
                      { quality: 3, label: '3. Nhớ', sub: 'Tốt', bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#6ee7b7' },
                      { quality: 4, label: '4. Dễ', sub: 'Giãn dài', bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#93c5fd' }
                    ].map(btn => (
                      <button
                        key={btn.quality}
                        disabled={ratingSubmitting}
                        onClick={(e) => handleRate(btn.quality, e)}
                        style={{
                          background: btn.bg,
                          border: `1px solid ${btn.border}`,
                          color: btn.text,
                          padding: '10px 6px',
                          borderRadius: '12px',
                          cursor: ratingSubmitting ? 'not-allowed' : 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{btn.label}</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>{btn.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                background: currentIndex === 0 ? 'rgba(255, 255, 255, 0.03)' : 'var(--surface-color)',
                color: currentIndex === 0 ? 'rgba(255, 255, 255, 0.25)' : 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <ChevronLeft size={18} /> Thẻ trước (←)
            </button>

            <button
              onClick={handleFlip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 32px',
                borderRadius: '14px',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              <RotateCcw size={16} /> {isFlipped ? 'Xem mặt trước' : 'Lật thẻ (Space)'}
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex >= items.length - 1}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                background: currentIndex >= items.length - 1 ? 'rgba(255, 255, 255, 0.03)' : 'var(--surface-color)',
                color: currentIndex >= items.length - 1 ? 'rgba(255, 255, 255, 0.25)' : 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: currentIndex >= items.length - 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Thẻ sau (→) <ChevronRight size={18} />
            </button>
          </div>

          {/* Keyboard Shortcuts Helper */}
          <div style={{
            marginTop: '28px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <span>⌨️ Phím tắt:</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>Space</kbd> Lật thẻ</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>←</kbd> / <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>→</kbd> Chuyển thẻ</span>
            <span><kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px' }}>1-4</kbd> Đánh giá SRS</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighFrequencyGrammarFlashcardPage;
