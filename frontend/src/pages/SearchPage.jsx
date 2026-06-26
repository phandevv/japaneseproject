import React, { useState, useEffect } from 'react';
import { vocabApi } from '../services/api';
import { Search as SearchIcon, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const SearchPage = () => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

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
    <div className="container animate-fade-in" style={{ padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '15px' }}>{t.search.title}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t.search.subtitle}</p>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto 40px auto' }}>
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            style={{
              width: '100%',
              padding: '16px 20px 16px 50px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-color)',
              color: 'var(--text-primary)',
              fontSize: '1.1rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          />
          <SearchIcon
            size={24}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)'
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              position: 'absolute',
              right: '8px',
              top: '8px',
              padding: '8px 16px'
            }}
          >
            {t.search.searchBtn}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '40px' }}>
          <Loader size={32} className="animate-spin" style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : results && results.content ? (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>
              {t.search.found(results.totalElements)}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {results.content.map((word) => (
              <div key={word.id} className="card" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ flex: '0 0 150px', textAlign: 'center', borderRight: '1px solid var(--border-color)', paddingRight: '20px' }}>
                  <h2 className="jp-text" style={{ fontSize: '2rem', marginBottom: '5px' }}>{word.kanji || word.hiragana}</h2>
                  {word.kanji && <p className="jp-text" style={{ color: 'var(--accent-color)' }}>{word.hiragana}</p>}
                </div>

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{word.meaning}</h3>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="level-badge">{word.level}</span>
                    {word.hanViet && (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', padding: '4px 0' }}>
                        {t.search.hanViet}: {word.hanViet}
                      </span>
                    )}
                    {word.wordType && (
                      <span style={{
                        fontSize: '0.85rem',
                        padding: '4px 8px',
                        backgroundColor: 'var(--surface-hover)',
                        borderRadius: '4px'
                      }}>
                        {word.wordType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {results.content.length === 0 && (
              <div className="card flex-center" style={{ padding: '40px', color: 'var(--text-secondary)' }}>
                {t.search.noResult(query)}
              </div>
            )}
          </div>

          {/* Pagination */}
          {results.totalPages > 1 && (
            <div className="flex-center" style={{ gap: '20px', marginTop: '30px' }}>
              <button
                className="btn-icon"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={results.first}
              >
                <ChevronLeft size={20} />
              </button>
              <span>{t.search.page} {results.number + 1} / {results.totalPages}</span>
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
