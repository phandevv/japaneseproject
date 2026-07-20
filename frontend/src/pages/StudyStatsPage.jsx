import React, { useState, useEffect } from 'react';
import { usersApi } from '../services/api';
import { ArrowLeft, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RATING_COLORS = {
  5: { bg: '#dcfce7', text: '#166534', label: 'Hoàn hảo', border: '#bbf7d0' },
  4: { bg: '#fef9c3', text: '#854d0e', label: 'Tốt', border: '#fef08a' },
  3: { bg: '#ffedd5', text: '#9a3412', label: 'Khó', border: '#fed7aa' },
  2: { bg: '#ffedd5', text: '#9a3412', label: 'Khó', border: '#fed7aa' },
  1: { bg: '#ffedd5', text: '#9a3412', label: 'Khó', border: '#fed7aa' },
  0: { bg: '#fee2e2', text: '#991b1b', label: 'Cần ôn lại', border: '#fecaca' }
};

const StudyStatsPage = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState('day');
  const [tab, setTab] = useState('all'); // all, perfect, good, hard, fail
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(30);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async (r, t, p, s) => {
    setLoading(true);
    try {
      const res = await usersApi.studyHistoryDetails(r, t, p, s);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(range, tab, page, size);
  }, [range, tab, page, size]);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    setPage(0);
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setPage(0);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Nunito', sans-serif", paddingBottom: '60px' }}>
      <button 
        onClick={() => navigate('/')} 
        style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)', marginBottom: '24px', fontWeight: 600 }}
      >
        <ArrowLeft size={20} /> Quay lại trang chủ
      </button>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px', color: 'var(--text-primary)' }}>
        Chi tiết từ vựng đã ôn tập
      </h1>

      {/* Modern Top Tab Bar */}
      <div style={{ display: 'flex', background: '#27272a', padding: '6px', borderRadius: '12px', gap: '4px', marginBottom: '24px', overflowX: 'auto' }}>
        {[
          { id: 'day', label: 'Ngày' },
          { id: 'week', label: 'Tuần' },
          { id: 'month', label: 'Tháng' },
          { id: 'all', label: 'Toàn thời gian' },
          { id: 'custom', label: 'Khác' }
        ].map(r => (
          <button
            key={r.id}
            onClick={() => handleRangeChange(r.id)}
            style={{
              flex: '1',
              minWidth: '100px',
              padding: '10px 16px',
              background: range === r.id ? '#3b82f6' : 'transparent',
              color: range === r.id ? 'white' : '#a1a1aa',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'perfect', label: 'Hoàn hảo', color: '#166534', bg: '#dcfce7' },
          { id: 'good', label: 'Tốt', color: '#854d0e', bg: '#fef9c3' },
          { id: 'hard', label: 'Khó', color: '#9a3412', bg: '#ffedd5' },
          { id: 'fail', label: 'Cần ôn lại', color: '#991b1b', bg: '#fee2e2' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            style={{
              padding: '8px 16px',
              border: `1px solid ${tab === t.id ? (t.color || 'var(--accent-color)') : 'var(--border-color)'}`,
              borderRadius: '20px',
              background: tab === t.id ? (t.bg || 'rgba(37,99,235,0.1)') : 'transparent',
              color: tab === t.id ? (t.color || 'var(--accent-color)') : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader className="animate-spin" size={32} color="var(--accent-color)" />
        </div>
      ) : data?.content?.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <img src="/assets/mascot_siro_studying_nobg.png" alt="Empty" style={{ height: '140px', marginBottom: '20px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Chưa có từ vựng nào</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Bạn chưa học từ vựng nào trong khoảng thời gian này. Hãy tiếp tục cố gắng nhé!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data?.content?.map((item, idx) => {
             const rc = RATING_COLORS[item.lastRating] || RATING_COLORS[0];
             return (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                background: 'var(--surface-color)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{item.kanji}</span>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500, paddingBottom: '2px' }}>{item.hiragana}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.meaning}</div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: rc.bg,
                  color: rc.text,
                  border: `1px solid ${rc.border}`,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}>
                  {rc.label}
                </div>
              </div>
             );
          })}
          
          {/* Pagination Controls */}
          {data?.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
              <button 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-color)', background: page === 0 ? 'var(--bg-color)' : 'var(--surface-color)', color: page === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={20} />
              </button>
              
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Trang {page + 1} / {data.totalPages}
              </span>
              
              <button 
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-color)', background: page >= data.totalPages - 1 ? 'var(--bg-color)' : 'var(--surface-color)', color: page >= data.totalPages - 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', cursor: page >= data.totalPages - 1 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudyStatsPage;
