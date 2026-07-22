import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { achievementApi } from '../services/api';
import { Trophy, Award, Sparkles, Loader, Shield, CornerUpLeft, CheckCircle2 } from 'lucide-react';
import AchievementTree from '../components/AchievementTree';
import AchievementUnlockModal from '../components/AchievementUnlockModal';
import MascotCorners from '../components/MascotCorners';
import SakuraPetals from '../components/SakuraPetals';
import { useAuth } from '../context/AuthContext';
import '../styles/AchievementsPage.css';

export default function AchievementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await achievementApi.getAchievements();
        setData(res);
        if (res.newlyUnlocked && res.newlyUnlocked.length > 0) {
          setNewlyUnlocked(res.newlyUnlocked);
        }
      } catch (err) {
        console.error("Failed to fetch achievements:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
        <Loader size={40} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải cây thành tựu...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container flex-center animate-fade-in" style={{ height: '70vh', flexDirection: 'column', gap: '20px' }}>
        <Trophy size={64} color="var(--accent-color)" />
        <h2>Vui lòng đăng nhập để xem Cây Thành Tựu</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Quay lại Trang chủ</button>
      </div>
    );
  }

  const achievements = data?.achievements || [];
  const totalPoints = data?.totalPoints || 0;
  const unlockedCount = data?.unlockedCount || 0;
  const totalCount = data?.totalCount || achievements.length;
  const overallPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="achievements-page-bg animate-fade-in">
      <MascotCorners leftMascot="mascot_siro_sensei.png" rightMascot="mascot_siro_ninja_nobg.png" />
      <SakuraPetals />

      {/* Pop-up for newly unlocked achievements */}
      {newlyUnlocked.length > 0 && (
        <AchievementUnlockModal 
          newlyUnlocked={newlyUnlocked} 
          onClose={() => setNewlyUnlocked([])} 
        />
      )}

      <div className="container" style={{ maxWidth: '1000px', padding: '30px 20px 80px' }}>
        {/* Header Bar */}
        <div className="flex-between" style={{ marginBottom: '30px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <CornerUpLeft size={18} /> Quay lại Trang chủ
          </button>
          <h2>Cây Thành Tựu & Huy Hiệu</h2>
          <div style={{ width: '120px' }}></div>
        </div>

        {/* Hero Card */}
        <div className="ach-hero-card card">
          <div className="ach-hero-info">
            <div className="ach-hero-icon-glow">
              <Trophy size={42} color="#f59e0b" />
            </div>
            <div>
              <h1 className="ach-hero-title">
                Hệ Thống Thành Tựu Gamified
                <Sparkles size={20} className="sparkle-gold" />
              </h1>
              <p className="ach-hero-subtitle">
                Tích lũy Điểm AP (Achievement Points), mở khóa huy hiệu và theo dõi sự tiến bộ hàng ngày.
              </p>
            </div>
          </div>

          <div className="ach-stats-grid">
            <div className="ach-stat-box">
              <span className="stat-label">Tổng Điểm AP</span>
              <span className="stat-val gold">+{totalPoints}</span>
            </div>
            <div className="ach-stat-box">
              <span className="stat-label">Huy Hiệu Đạt Được</span>
              <span className="stat-val green">{unlockedCount} / {totalCount}</span>
            </div>
            <div className="ach-stat-box">
              <span className="stat-label">Tỷ Lệ Mở Khóa</span>
              <span className="stat-val blue">{overallPercent}%</span>
            </div>
          </div>
        </div>

        {/* Achievement Tree Section */}
        <AchievementTree achievements={achievements} />
      </div>
    </div>
  );
}
