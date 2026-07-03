import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Footer.css';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="app-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">S</div>
          <div>
            <h2>SIRO NIHONGO</h2>
            <p>{t.footer.tagline}</p>
          </div>
        </div>

        <div className="footer-links">
          <a href="#" onClick={(e) => e.preventDefault()}>{t.footer.link1}</a>
          <a href="#" onClick={(e) => e.preventDefault()}>{t.footer.link2}</a>
          <a href="#" onClick={(e) => e.preventDefault()}>{t.footer.link3}</a>
          <a href="#" onClick={(e) => e.preventDefault()}>{t.footer.link4}</a>
        </div>

        <div className="footer-bottom">{t.footer.copy}</div>
      </div>
    </footer>
  );
};

export default Footer;
