import React from 'react';
import { BookOpen, Search, Home } from 'lucide-react';

const Navbar = ({ setCurrentPage }) => {
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

        <div className="flex-center" style={{ gap: '15px' }}>
          <button className="btn-icon" onClick={() => setCurrentPage('home')} title="Home">
            <Home size={20} />
          </button>
          <button className="btn-icon" onClick={() => setCurrentPage('search')} title="Search">
            <Search size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
