import React, { useRef, useState } from 'react';
import { BookOpen, Search, Home, Languages, Upload, Loader } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { vocabApi } from '../services/api';

const Navbar = ({ setCurrentPage, user }) => {
  const { lang, toggleLang, t } = useLanguage();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImporting(true);
      try {
        await vocabApi.importExcel(file);
        alert("Nhập Excel thành công!");
        window.location.reload();
      } catch (error) {
        alert("Nhập Excel thất bại: " + (error.response?.data?.message || error.message));
      } finally {
        setImporting(false);
      }
    }
  };

  const isAdmin = user && user.username === 'admin';

  return (
    <nav style={{ 
      backgroundColor: 'var(--surface-color)', 
      borderBottom: '1px solid var(--border-color)',
      padding: '15px 0',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container flex-between">
        <div 
          className="flex-center" 
          style={{ gap: '10px', cursor: 'pointer' }}
          onClick={() => setCurrentPage('home')}
        >
          <div style={{ 
            backgroundColor: 'var(--accent-color)', 
            padding: '8px', 
            borderRadius: '8px',
            color: 'white'
          }}>
            <BookOpen size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', margin: 0, letterSpacing: '-0.5px' }}>
            Nihongo<span style={{ color: 'var(--accent-color)' }}>Cards</span>
          </h1>
        </div>

        <div className="flex-center" style={{ gap: '10px' }}>
          {isAdmin && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".xlsx, .xls" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
              <button 
                className="btn" 
                onClick={handleImportClick} 
                disabled={importing}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '7px 14px', 
                  borderRadius: '20px', 
                  border: '1.5px solid var(--success-color)', 
                  color: 'var(--success-color)',
                  backgroundColor: 'transparent',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {importing ? <Loader size={15} className="animate-spin" /> : <Upload size={15} />}
                Nhập Excel
              </button>
            </>
          )}

          <button className="btn-icon" onClick={() => setCurrentPage('home')} title={t.nav.home}>
            <Home size={20} />
          </button>
          <button className="btn-icon" onClick={() => setCurrentPage('search')} title={t.nav.search}>
            <Search size={20} />
          </button>

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '20px',
              border: '1.5px solid var(--accent-color)',
              background: 'transparent',
              color: 'var(--accent-color)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              letterSpacing: '0.5px',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--accent-color)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--accent-color)';
            }}
          >
            <Languages size={15} />
            {lang === 'vi' ? 'EN' : 'VI'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

