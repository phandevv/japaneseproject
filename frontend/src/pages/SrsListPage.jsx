import React, { useState, useEffect } from 'react';
import { srsApi } from '../services/api';
import { Search, ChevronLeft, Volume2, ArrowLeft, Calendar, Brain, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import MascotLoader from '../components/MascotLoader';

export default function SrsListPage({ goBack }) {
  const { t, lang } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSrsList = async () => {
      setLoading(true);
      try {
        const data = await srsApi.getSrsList();
        // Sort: Due first, then by next review date ascending
        const sorted = data.sort((a, b) => {
          const aTime = new Date(a.nextReview).getTime();
          const bTime = new Date(b.nextReview).getTime();
          return aTime - bTime;
        });
        setReviews(sorted);
        setFilteredReviews(sorted);
      } catch (error) {
        console.error("Failed to fetch SRS list:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSrsList();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredReviews(reviews);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = reviews.filter(rev => {
      const v = rev.vocabulary;
      return (
        v.kanji?.toLowerCase().includes(query) ||
        v.hiragana?.toLowerCase().includes(query) ||
        v.romaji?.toLowerCase().includes(query) ||
        v.meaning?.toLowerCase().includes(query) ||
        v.hanViet?.toLowerCase().includes(query)
      );
    });
    setFilteredReviews(filtered);
  }, [searchQuery, reviews]);

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  };

  const getRelativeNextReviewString = (nextReviewStr) => {
    const now = new Date();
    const next = new Date(nextReviewStr);
    const diffMs = next.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { text: t.srsList.statusDue, isDue: true };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return { text: t.srsList.hours(diffHours), isDue: false };
    }

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { text: t.srsList.days(diffDays), isDue: false };
  };

  const getLevelBadgeStyle = (level) => {
    const styles = {
      N5: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' },
      N4: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' },
      N3: { bg: 'rgba(10, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' },
      N2: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' },
      N1: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' },
      DEFAULT: { bg: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.3)' }
    };
    return styles[level] || styles.DEFAULT;
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 20px' }}>
      {/* Back Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={goBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px' }}
        >
          <ArrowLeft size={16} /> {t.srsList.backDashboard}
        </button>
      </div>

      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.3rem', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <Brain size={32} style={{ color: 'var(--accent-color)' }} />
          {t.srsList.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>{t.srsList.subtitle}</p>
      </div>

      {/* Search Input */}
      <div style={{ maxWidth: '600px', margin: '0 auto 32px auto', position: 'relative' }}>
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.srsList.searchPlaceholder}
          style={{
            width: '100%',
            padding: '14px 20px 14px 46px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-color)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
        />
        <Search size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-secondary)' }} />
      </div>

      {/* Content Area */}
      {loading ? (
        <MascotLoader message={t.home.loading} />
      ) : filteredReviews.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Clock size={48} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>{t.srsList.noWords}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  {t.srsList.colVocab}
                </th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  {t.srsList.colMeaning}
                </th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>
                  {t.srsList.colEaseFactor}
                </th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>
                  {t.srsList.colInterval}
                </th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>
                  {t.srsList.colNextReview}
                </th>
                <th style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map((rev, idx) => {
                const v = rev.vocabulary;
                const relativeReview = getRelativeNextReviewString(rev.nextReview);
                const badgeStyle = getLevelBadgeStyle(v.level);
                
                return (
                  <tr 
                    key={rev.id} 
                    style={{ 
                      borderBottom: idx === filteredReviews.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Kanji / Hiragana */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                          className="btn-icon"
                          onClick={() => handleSpeak(v.kanji || v.hiragana)}
                          style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '50%' }}
                        >
                          <Volume2 size={14} />
                        </button>
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-jp)' }}>
                            {v.kanji || v.hiragana}
                          </div>
                          {v.kanji && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-jp)', marginTop: '2px' }}>
                              {v.hiragana}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Meaning / Han Viet */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{v.meaning}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {v.hanViet && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {v.hanViet}
                            </span>
                          )}
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              backgroundColor: badgeStyle.bg, 
                              color: badgeStyle.color, 
                              border: badgeStyle.border 
                            }}
                          >
                            {v.level}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Ease Factor */}
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {rev.easeFactor.toFixed(2)}
                    </td>

                    {/* Interval */}
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {rev.intervalDays === 0 ? '0' : t.srsList.days(rev.intervalDays)}
                    </td>

                    {/* Next Review */}
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                        {new Date(rev.nextReview).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>

                    {/* Due / Pending Badge */}
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          backgroundColor: relativeReview.isDue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 222, 128, 0.15)',
                          color: relativeReview.isDue ? '#ef4444' : 'var(--success-color)',
                          border: relativeReview.isDue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)',
                        }}
                      >
                        {relativeReview.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
