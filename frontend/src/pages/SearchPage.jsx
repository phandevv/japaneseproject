import React, { useState, useEffect, useMemo } from 'react';
import { vocabApi } from '../services/api';
import { Search as SearchIcon, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import MascotCorners from '../components/MascotCorners';
import '../styles/SearchPage.css';

const SearchPage = () => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  // Generate sakura petals once
  const sakuraPetals = useMemo(() =>
    Array.from({ length: 18 }).map((_, i) => ({
      left: Math.random() * 100,
      dur: 8 + Math.random() * 8,
      delay: Math.random() * 10,
      size: 10 + Math.random() * 14,
      swayDur: 3 + Math.random() * 4,
    })), []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await vocabApi.search(query, page, 20);
      setResults(data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query) {
      handleSearch();
    }
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    handleSearch();
  };

  return (
    <div className="search-page animate-fade-in">
      {/* ═══ SAKURA PETALS — Falling cherry blossoms ═══ */}
      {sakuraPetals.map((p, i) => (
        <span
          key={`search-sakura-${i}`}
          className="search-sakura-petal"
          style={{
            left: `${p.left}%`,
            animationDuration: `${p.dur}s, ${p.swayDur}s`,
            animationDelay: `${p.delay}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50% 0 50% 50%',
            background: `linear-gradient(135deg, rgba(255,183,197,0.7), rgba(255,105,135,0.4))`,
          }}
        />
      ))}

      {/* ── Corner Mascots ── */}
      <MascotCorners />

      {/* ── Hero header ── */}
      <div className="search-hero">
        <h1 className="search-hero-title">
          <span className="search-icon-deco">📖</span>
          {t.search.title}
        </h1>
        <p className="search-hero-subtitle">{t.search.subtitle}</p>
      </div>

      {/* ── Search bar ── */}
      <div className="search-bar-wrapper">
        <form onSubmit={handleSearchSubmit} className="search-bar-inner">
          <SearchIcon size={22} className="search-bar-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="search-bar-input"
          />
          <button type="submit" className="search-bar-btn">
            {t.search.searchBtn}
          </button>
        </form>
      </div>

      {/* ── Results ── */}
      {loading ? (
        <div className="search-loading">
          <Loader size={36} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
          <span>Đang tìm kiếm...</span>
        </div>
      ) : results && results.content ? (
        <div className="search-results-area">
          <div className="search-results-header">
            <h3 className="search-results-count">
              {t.search.found(results.totalElements)}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {results.content.map((word) => (
              <div key={word.id} className="search-result-card">
                <div className="search-kanji-section">
                  <span className="search-kanji-main jp-text">{word.kanji || word.hiragana}</span>
                  {word.kanji && <span className="search-kanji-reading jp-text">{word.hiragana}</span>}
                </div>

                <div className="search-info-section">
                  <span className="search-meaning">{word.meaning}</span>
                  <div className="search-meta-row">
                    <span className="search-level-badge">{word.level}</span>
                    {word.hanViet && (
                      <span className="search-hanviet">
                        {t.search.hanViet}: {word.hanViet}
                      </span>
                    )}
                    {word.wordType && (
                      <span className="search-wordtype">{word.wordType}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {results.content.length === 0 && (
              <div className="search-empty-state">
                <img src="/assets/mascot_siro_crying.png" alt="No results" />
                <p>{t.search.noResult(query)}</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {results.totalPages > 1 && (
            <div className="search-pagination">
              <button
                className="btn-icon"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={results.first}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="search-pagination-text">
                {t.search.page} {results.number + 1} / {results.totalPages}
              </span>
              <button
                className="btn-icon"
                onClick={() => setPage(p => Math.min(results.totalPages - 1, p + 1))}
                disabled={results.last}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SearchPage;
