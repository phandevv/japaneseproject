import React from 'react';
import { useNavigate } from 'react-router-dom';
import MascotCorners from '../components/MascotCorners';
import SakuraPetals from '../components/SakuraPetals';
import { Gamepad2, BrainCircuit, CloudRain } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const GamesHubPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="daily-study-page-bg animate-fade-in" style={{ padding: '20px', minHeight: 'calc(100vh - 64px)' }}>
      <SakuraPetals />
      <MascotCorners leftMascot="mascot_siro_detective_nobg.png" rightMascot="mascot_siro_ninja_nobg.png" />
      
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <div className="icon-container" style={{ background: 'var(--accent-color)', color: 'white', padding: '15px', borderRadius: '50%' }}>
              <Gamepad2 size={40} />
            </div>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '10px' }}>Khu Vực Trò Chơi</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
            Vừa học vừa chơi, rèn luyện trí nhớ và phản xạ tiếng Nhật!
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '40px' }}>
          {/* Memory Match Game Card */}
          <div 
            className="glass-card" 
            style={{ 
              cursor: 'pointer', 
              transition: 'transform 0.3s, box-shadow 0.3s',
              border: '2px solid transparent',
              overflow: 'hidden',
              padding: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(37,99,235,0.3)';
              e.currentTarget.style.borderColor = 'var(--accent-color)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onClick={() => navigate('/games/memory')}
          >
            {/* Banner Illustration */}
            <div style={{
              height: '160px',
              background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.05)'
            }}>
               {/* Pattern of cards */}
               <div style={{ position: 'absolute', top: 20, left: '10%', width: 50, height: 75, background: 'white', borderRadius: 6, transform: 'rotate(-25deg)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></div>
               <div style={{ position: 'absolute', bottom: -10, left: '25%', width: 50, height: 75, background: 'white', borderRadius: 6, transform: 'rotate(15deg)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></div>
               <div style={{ position: 'absolute', top: 30, right: '15%', width: 50, height: 75, background: 'white', borderRadius: 6, transform: 'rotate(25deg)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></div>
               <img src="/assets/mascot_siro_detective_nobg.png" alt="Memory Match Illustration" style={{ height: '140px', zIndex: 2, transform: 'translateY(10px)' }} />
            </div>

            <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BrainCircuit size={28} color="var(--accent-color)" />
                Tìm Thẻ Cặp
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', flex: 1 }}>
                Rèn luyện trí nhớ qua trò chơi lật bài. Phù hợp để ôn tập mặt chữ Kanji và ý nghĩa.
              </p>
            </div>
          </div>

          {/* Falling Words Game Card */}
          <div 
            className="glass-card" 
            style={{ 
              cursor: 'pointer', 
              transition: 'transform 0.3s, box-shadow 0.3s',
              border: '2px solid transparent',
              overflow: 'hidden',
              padding: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(239,68,68,0.3)';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            onClick={() => navigate('/games/falling')}
          >
            {/* Banner Illustration */}
            <div style={{
              height: '160px',
              background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.05)'
            }}>
               {/* Pattern of falling kanji */}
               <div style={{ position: 'absolute', top: 10, left: '20%', fontSize: '2rem', color: '#f87171', opacity: 0.5, fontWeight: 900 }}>語</div>
               <div style={{ position: 'absolute', top: 60, left: '10%', fontSize: '1.5rem', color: '#fca5a5', opacity: 0.6, fontWeight: 900 }}>漢</div>
               <div style={{ position: 'absolute', bottom: 20, right: '20%', fontSize: '2.5rem', color: '#ef4444', opacity: 0.4, fontWeight: 900 }}>字</div>
               <div style={{ position: 'absolute', top: 20, right: '10%', fontSize: '1.2rem', color: '#f87171', opacity: 0.7, fontWeight: 900 }}>学</div>
               <img src="/assets/mascot_siro_ninja_nobg.png" alt="Falling Words Illustration" style={{ height: '140px', zIndex: 2, transform: 'translateY(15px)' }} />
            </div>

            <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CloudRain size={28} color="#ef4444" />
                Mưa Từ Vựng
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', flex: 1 }}>
                Tăng tốc độ gõ phím và phản xạ nghĩa của từ. Kanji rơi liên tục, gõ nhanh kẻo lỡ!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamesHubPage;
