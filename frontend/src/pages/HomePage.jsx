import React, { useState, useEffect } from 'react';
import { vocabApi } from '../services/api';
import { Play, Loader, BarChart3, Database, Sparkles } from 'lucide-react';

const HomePage = ({ startStudy, user, streak, onLogin, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginName, setLoginName] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await vocabApi.getStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to load stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
        <Loader size={40} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading your vocabulary...</p>
      </div>
    );
  }

  const levelLabels = {
    "N5": "JLPT N5",
    "N4": "JLPT N4",
    "N3": "JLPT N3",
    "N2": "JLPT N2",
    "N1": "JLPT N1",
    "TU_LAY": "Từ Láy",
    "TRO_TU": "Trợ Từ"
  };

  const levelColors = {
    "N5": "#3b82f6", // blue
    "N4": "#10b981", // green
    "N3": "#f59e0b", // yellow
    "N2": "#ef4444", // red
    "N1": "#8b5cf6", // purple
    "TU_LAY": "#ec4899", // pink
    "TRO_TU": "#06b6d4" // cyan
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (onLogin) {
      onLogin(loginName);
      setLoginName('');
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '18px 22px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.14), rgba(14, 165, 233, 0.12))', border: '1px solid var(--border-color)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--accent-color)' }}>
            <Sparkles size={18} />
            <strong>Study streak</strong>
          </div>
          {user ? (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Xin chào <strong>{user.userName}</strong> — streak hiện tại của bạn là <strong>{streak || 0} ngày</strong>.
            </p>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Đăng nhập để lưu chuỗi học mỗi ngày và theo dõi tiến trình của bạn.
            </p>
          )}
        </div>

        {user ? (
          <button className="btn btn-secondary" onClick={onLogout}>
            Đăng xuất
          </button>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Tên của bạn"
              style={{ minWidth: '180px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
            />
            <button className="btn btn-primary" type="submit">
              Đăng nhập
            </button>
          </form>
        )}
      </div>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '15px' }}>
          Welcome back to <span style={{ color: 'var(--accent-color)' }}>NihongoCards</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          Master Japanese vocabulary with our intelligent flashcard system. 
          Select a level below to start studying!
        </p>
      </div>



      {/* Level Selection */}
      <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        Study by Level
      </h2>
      
      <div className="grid grid-cols-3">
        {stats && stats.levels && Object.entries(stats.levels).map(([level, count]) => (
          <div key={level} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="flex-between">
              <h3 style={{ fontSize: '1.5rem', color: levelColors[level] || 'var(--text-primary)' }}>
                {levelLabels[level] || level}
              </h3>
              <span style={{ backgroundColor: 'var(--surface-hover)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>
                {count} words
              </span>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', flex: 1 }}>
              Practice random vocabulary from the {levelLabels[level] || level} list to improve your retention.
            </p>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem' }}
                onClick={() => startStudy(level, 'daily')}
                title="Học theo ngày (20 từ/ngày) + Kiểm tra"
              >
                Daily Study
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '10px 5px', fontSize: '0.9rem' }}
                onClick={() => startStudy(level, 'flashcard')}
                title="Lật thẻ ngẫu nhiên"
              >
                Flashcard
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
