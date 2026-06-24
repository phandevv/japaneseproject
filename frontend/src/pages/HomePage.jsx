import React, { useState, useEffect } from 'react';
import { vocabApi } from '../services/api';
import { Play, Loader, BarChart3, Database } from 'lucide-react';

const HomePage = ({ startStudy }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 20px' }}>
      
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
