import React from 'react';
import { Book, Folder } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const JlptPage = () => {
  const { t } = useLanguage();
  
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  
  return (
    <div className="container animate-fade-in" style={{ padding: '40px 20px', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '15px' }}>
          Kho Tài Liệu JLPT
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Tổng hợp các tài liệu học tập, giáo trình và đề thi thử JLPT từ N5 đến N1.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '25px',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {levels.map((level) => (
          <div key={level} className="card" style={{ 
            padding: '25px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            textAlign: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '16px', 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              color: 'var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '15px'
            }}>
              <Folder size={30} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px' }}>Tài liệu {level}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px' }}>
              Từ vựng, ngữ pháp, kanji và đề thi {level}
            </p>
            <button className="btn" style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              backgroundColor: 'var(--surface-hover)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}>
              <Book size={16} /> Xem chi tiết
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JlptPage;
