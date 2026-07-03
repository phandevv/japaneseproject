import React, { useRef, useState } from 'react';
import { BookOpen, Search, Home, Languages, Upload, Loader, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { vocabApi } from '../services/api';
import '../styles/Navbar.css';

const Navbar = ({ setCurrentPage, onLoginClick, user, onLogout }) => {
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
    <nav className="app-navbar">
      <div className="container navbar-inner">
        <div className="navbar-brand" onClick={() => setCurrentPage('home')}>
          <div className="navbar-logo">
            <Sparkles size={22} />
          </div>
          <div>
            <h1>SIRO NIHONGO</h1>
            <span>{t.nav.slogan}</span>
          </div>
        </div>

        <div className="navbar-links">
          <button className="nav-link" onClick={() => setCurrentPage('home')}>{t.nav.home}</button>
          <button className="nav-link" onClick={() => setCurrentPage('search')}>{t.nav.search}</button>
          <button className="nav-link" onClick={() => setCurrentPage('daily')}>{t.nav.dailyStudy}</button>
          <button className="nav-link" onClick={() => setCurrentPage('flashcard')}>{t.nav.flashcard}</button>
          <button className="nav-link" onClick={() => setCurrentPage('home')}>{t.nav.jlpt}</button>
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
                className="nav-link btn-import" 
                onClick={handleImportClick} 
                disabled={importing}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  border: '1.5px solid var(--success-color)', 
                  color: 'var(--success-color)',
                  backgroundColor: 'transparent',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  marginLeft: '10px',
                  cursor: 'pointer'
                }}
              >
                {importing ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                Nhập Excel
              </button>
            </>
          )}
        </div>

        <div className="navbar-actions">
          <button className="lang-btn" onClick={toggleLang}>
            <Languages size={14} />
            {lang === 'vi' ? 'EN' : 'VI'}
          </button>
          {user ? (
            <button className="btn btn-logout" onClick={onLogout}>{t.home.logout}</button>
          ) : (
            <button className="btn btn-login" onClick={onLoginClick}>{t.auth.loginTitle}</button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

