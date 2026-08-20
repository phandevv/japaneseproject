import React from 'react';
import { Medal } from 'lucide-react';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const PodiumLeaderboard = ({ data = [], scores, type = 'score' }) => {
  const list = (scores && scores.length > 0) ? scores : (data || []);

  if (!list || list.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '30px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Medal size={48} color="#ccc" style={{ marginBottom: '15px' }} />
        <h3 style={{ fontSize: '1.3rem', marginBottom: '10px', color: 'var(--text-primary)' }}>
          Bảng Xếp Hạng Kỷ Lục
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>Chưa có người chơi nào.</p>
      </div>
    );
  }

  // Ensure we have up to 10
  const top3 = [
    list[1] || null, // Rank 2 (Left)
    list[0] || null, // Rank 1 (Center)
    list[2] || null  // Rank 3 (Right)
  ];
  const rest = list.slice(3, 10);

  const getMetricDisplay = (item) => {
    if (!item) return '';
    if (type === 'time') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{formatTime(item.time)}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.moves} lượt</span>
        </div>
      );
    } else {
      return (
        <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{item.score}</div>
      );
    }
  };

  const getMetricListDisplay = (item) => {
    if (type === 'time') {
      return (
        <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
          <span>Lượt: <strong>{item.moves}</strong></span>
          <span>⏱️ <strong>{formatTime(item.time)}</strong></span>
        </div>
      );
    } else {
      return (
        <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
          <span>Điểm: <strong>{item.score}</strong></span>
        </div>
      );
    }
  };

  return (
    <div className="glass-card" style={{ padding: '30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '1.4rem', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', justifyContent: 'center' }}>
        <Medal size={24} color="#f59e0b" /> Bảng Xếp Hạng Kỷ Lục
      </h3>

      {/* PODIUM */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '10px', minHeight: '200px', marginBottom: '30px' }}>
        {/* Rank 2 - Silver */}
        {top3[0] ? (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', animationDelay: '0.2s' }}>
            <div style={{ marginBottom: '10px', textAlign: 'center', fontFamily: 'var(--font-ui)' }}>{getMetricDisplay(top3[0])}</div>
            <div style={{ 
              width: '100%', height: '100px', background: 'linear-gradient(to top, #94a3b8, #cbd5e1)', 
              borderRadius: '8px 8px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', paddingTop: '10px',
              boxShadow: '0 -4px 10px rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.3)', fontFamily: 'var(--font-ui)', lineHeight: 1 }}>2</span>
              <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, marginTop: '5px', textShadow: '1px 1px 2px rgba(0,0,0,0.3)', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[0].username || 'Khách'}</span>
            </div>
          </div>
        ) : <div style={{ width: '30%' }}></div>}

        {/* Rank 1 - Gold */}
        {top3[1] ? (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', zIndex: 2 }}>
            <div style={{ marginBottom: '10px', textAlign: 'center', color: '#f59e0b', fontFamily: 'var(--font-ui)' }}>
              <Medal size={32} style={{ marginBottom: '8px' }} />
              {getMetricDisplay(top3[1])}
            </div>
            <div style={{ 
              width: '100%', height: '130px', background: 'linear-gradient(to top, #d97706, #fbbf24)', 
              borderRadius: '8px 8px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', paddingTop: '10px',
              boxShadow: '0 -4px 15px rgba(245, 158, 11, 0.4)'
            }}>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.3)', fontFamily: 'var(--font-ui)', lineHeight: 1 }}>1</span>
              <span style={{ color: 'white', fontSize: '1rem', fontWeight: 800, marginTop: '8px', textShadow: '1px 1px 2px rgba(0,0,0,0.3)', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[1].username || 'Khách'}</span>
            </div>
          </div>
        ) : <div style={{ width: '35%' }}></div>}

        {/* Rank 3 - Bronze */}
        {top3[2] ? (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', animationDelay: '0.4s' }}>
            <div style={{ marginBottom: '10px', textAlign: 'center', fontFamily: 'var(--font-ui)' }}>{getMetricDisplay(top3[2])}</div>
            <div style={{ 
              width: '100%', height: '70px', background: 'linear-gradient(to top, #b45309, #d97706)', 
              borderRadius: '8px 8px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', paddingTop: '10px',
              boxShadow: '0 -4px 10px rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.3)', fontFamily: 'var(--font-ui)', lineHeight: 1 }}>3</span>
              <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, marginTop: '5px', textShadow: '1px 1px 2px rgba(0,0,0,0.3)', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[2].username || 'Khách'}</span>
            </div>
          </div>
        ) : <div style={{ width: '30%' }}></div>}
      </div>

      {/* REST OF THE LIST (4-10) */}
      {rest.length > 0 && (
        <ul className="animate-fade-in" style={{ listStyle: 'none', padding: 0, margin: 0, animationDelay: '0.6s', flex: 1 }}>
          {rest.map((score, idx) => (
            <li key={idx} style={{ 
              display: 'flex', justifyContent: 'space-between', padding: '12px 15px', 
              borderBottom: idx < rest.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              fontFamily: 'var(--font-ui)',
              background: idx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
              borderRadius: '8px'
            }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>#{idx + 4}</span>
                <span>{score.username || 'Khách'}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{new Date(score.date).toLocaleDateString()}</span>
              </span>
              {getMetricListDisplay(score)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PodiumLeaderboard;
