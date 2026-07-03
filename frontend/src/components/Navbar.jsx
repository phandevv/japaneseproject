import React from 'react';
import { BookOpen, Search, Home, Languages, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Navbar.css';

const Navbar = ({ setCurrentPage, onLoginClick, user, onLogout }) => {
  const { lang, toggleLang, t } = useLanguage();

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

