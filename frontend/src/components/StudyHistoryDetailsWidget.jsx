import React, { useState, useEffect } from 'react';
import { usersApi } from '../services/api';

export default function StudyHistoryDetailsWidget() {
  const [range, setRange] = useState('day');
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await usersApi.studyHistoryDetails(range);
        setWords(data || []);
      } catch (err) {
        console.error("Failed to fetch study history details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [range]);

  // Group by rating
  const grouped = {
    perfect: words.filter(w => w.lastRating === 5),
    good: words.filter(w => w.lastRating === 4),
    hard: words.filter(w => w.lastRating > 0 && w.lastRating < 4),
    fail: words.filter(w => w.lastRating === 0)
  };

  const renderSection = (title, icon, items, bgColor) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: '20px' }}>
        <h5 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 10px 0', fontSize: '0.95rem' }}>
          {icon} <span>{title} ({items.length})</span>
        </h5>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
          gap: '12px' 
        }}>
          {items.map(w => (
            <div key={w.id} style={{
              background: bgColor,
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '4px' }}>
                {w.kanji || w.hiragana}
              </div>
              {w.kanji && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>{w.hiragana}</div>}
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{w.meaning}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: '20px', padding: '20px', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Chi tiết từ vựng đã ôn tập</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setRange('day')}
            style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: range === 'day' ? 'var(--accent-color)' : 'var(--surface-hover)', color: range === 'day' ? '#fff' : 'var(--text-primary)', transition: 'background 0.2s' }}
          >
            Hôm nay
          </button>
          <button 
            onClick={() => setRange('week')}
            style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: range === 'week' ? 'var(--accent-color)' : 'var(--surface-hover)', color: range === 'week' ? '#fff' : 'var(--text-primary)', transition: 'background 0.2s' }}
          >
            Tuần này
          </button>
          <button 
            onClick={() => setRange('month')}
            style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', background: range === 'month' ? 'var(--accent-color)' : 'var(--surface-hover)', color: range === 'month' ? '#fff' : 'var(--text-primary)', transition: 'background 0.2s' }}
          >
            Tháng này
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</div>
      ) : words.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
          Bạn chưa ôn tập từ vựng nào trong thời gian này. Hãy bắt đầu học ngay nhé!
        </div>
      ) : (
        <div>
          {renderSection('Hoàn hảo', '🟢', grouped.perfect, 'rgba(16, 185, 129, 0.08)')}
          {renderSection('Tốt', '🟡', grouped.good, 'rgba(245, 158, 11, 0.08)')}
          {renderSection('Khó', '🟠', grouped.hard, 'rgba(249, 115, 22, 0.08)')}
          {renderSection('Cần ôn lại', '🔴', grouped.fail, 'rgba(239, 68, 68, 0.08)')}
        </div>
      )}
    </div>
  );
}
