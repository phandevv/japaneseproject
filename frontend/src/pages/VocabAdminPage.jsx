import React, { useState, useEffect } from 'react';
import { vocabApi } from '../services/api';
import { 
  ArrowLeft, Plus, Edit, Trash2, Search, X, ChevronLeft, ChevronRight, 
  Sparkles, Volume2, RefreshCw, Layers, CheckCircle2, AlertCircle, Eye
} from 'lucide-react';
import MascotLoader from '../components/MascotLoader';

const LEVEL_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
  { value: 'TU_LAY', label: 'Từ láy' },
  { value: 'TRO_TU', label: 'Trợ từ' }
];

const VocabAdminPage = ({ goBack }) => {
  const [vocabList, setVocabList] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [enrichingIds, setEnrichingIds] = useState(new Set());
  const [statusMessage, setStatusMessage] = useState(null);

  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalTab, setModalTab] = useState('basic'); // 'basic' | 'ai'
  const [isModalEnriching, setIsModalEnriching] = useState(false);
  const [formData, setFormData] = useState({
    kanji: '',
    hiragana: '',
    romaji: '',
    hanViet: '',
    meaning: '',
    wordType: '',
    level: 'N5',
    category: '',
    pitchAccent: '',
    sampleSentence: '',
    sampleTranslation: '',
    sampleReading: '',
    mnemonic: '',
    usageGuide: '',
    synonyms: '',
    antonyms: '',
    collocations: '',
    commonMistakes: ''
  });
  const [formError, setFormError] = useState('');

  // Load stats on mount
  const loadStats = async () => {
    try {
      const res = await vocabApi.getStats();
      setStats(res);
    } catch (err) {
      console.error("Failed to load vocab stats", err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const fetchVocab = async () => {
    setLoading(true);
    try {
      let response;
      if (submittedQuery) {
        response = await vocabApi.search(submittedQuery, page, 15);
      } else {
        response = await vocabApi.getByLevelPaginated(selectedLevel, page, 15);
      }
      setVocabList(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error) {
      console.error("Failed to load vocabulary list", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVocab();
  }, [page, submittedQuery, selectedLevel]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setSubmittedQuery(searchQuery);
  };

  const handleLevelChange = (level) => {
    setSelectedLevel(level);
    setSearchQuery('');
    setSubmittedQuery('');
    setPage(0);
  };

  const speakWord = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      kanji: '',
      hiragana: '',
      romaji: '',
      hanViet: '',
      meaning: '',
      wordType: '',
      level: selectedLevel !== 'ALL' ? selectedLevel : 'N5',
      category: '',
      pitchAccent: '',
      sampleSentence: '',
      sampleTranslation: '',
      sampleReading: '',
      mnemonic: '',
      usageGuide: '',
      synonyms: '',
      antonyms: '',
      collocations: '',
      commonMistakes: ''
    });
    setFormError('');
    setModalTab('basic');
    setShowModal(true);
  };

  const handleOpenEdit = (word) => {
    setEditingId(word.id);
    setFormData({
      kanji: word.kanji || '',
      hiragana: word.hiragana || '',
      romaji: word.romaji || '',
      hanViet: word.hanViet || '',
      meaning: word.meaning || '',
      wordType: word.wordType || '',
      level: word.level || 'N5',
      category: word.category || '',
      pitchAccent: word.pitchAccent || '',
      sampleSentence: word.sampleSentence || '',
      sampleTranslation: word.sampleTranslation || '',
      sampleReading: word.sampleReading || '',
      mnemonic: word.mnemonic || '',
      usageGuide: word.usageGuide || '',
      synonyms: word.synonyms || '',
      antonyms: word.antonyms || '',
      collocations: word.collocations || '',
      commonMistakes: word.commonMistakes || ''
    });
    setFormError('');
    setModalTab('basic');
    setShowModal(true);
  };

  const handleEnrichSingleWord = async (id, e) => {
    if (e) e.stopPropagation();
    setEnrichingIds(prev => new Set(prev).add(id));
    try {
      const enriched = await vocabApi.enrich(id, true);
      setVocabList(prev => prev.map(item => (item.id === id ? { ...item, ...enriched } : item)));
      setStatusMessage({ type: 'success', text: `✨ Làm giàu dữ liệu AI cho từ vựng thành công!` });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error("Enrich error:", err);
      setStatusMessage({ type: 'error', text: `Lỗi làm giàu AI: ${err.response?.data?.error || err.message}` });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleModalAutoEnrich = async () => {
    if (!formData.kanji && !formData.hiragana) {
      setFormError('Vui lòng nhập Kanji hoặc Hiragana trước khi gọi AI làm giàu dữ liệu!');
      return;
    }
    setIsModalEnriching(true);
    setFormError('');
    try {
      if (editingId) {
        const enriched = await vocabApi.enrich(editingId, true);
        setFormData(prev => ({
          ...prev,
          ...enriched,
          kanji: enriched.kanji || prev.kanji,
          hiragana: enriched.hiragana || prev.hiragana,
          meaning: enriched.meaning || prev.meaning
        }));
      } else {
        // Temporary create or prompt info
        setFormError('Lưu từ vựng trước, sau đó bấm nút Làm giàu AI để DeepSeek tự động phân tích chi tiết.');
      }
    } catch (err) {
      setFormError('Lỗi kết nối AI: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsModalEnriching(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.kanji && !formData.hiragana) {
      setFormError('Cần nhập Kanji hoặc Hiragana');
      return;
    }
    if (!formData.meaning || !formData.meaning.trim()) {
      setFormError('Nghĩa tiếng Việt không được để trống');
      return;
    }

    try {
      if (editingId) {
        await vocabApi.update(editingId, formData);
        setStatusMessage({ type: 'success', text: 'Cập nhật từ vựng thành công!' });
      } else {
        await vocabApi.create(formData);
        setStatusMessage({ type: 'success', text: 'Thêm từ vựng mới thành công!' });
      }
      setShowModal(false);
      fetchVocab();
      loadStats();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setFormError(error.response?.data?.error || 'Có lỗi xảy ra khi lưu từ vựng.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá từ vựng này không?')) return;
    try {
      await vocabApi.delete(id);
      setStatusMessage({ type: 'success', text: 'Đã xoá từ vựng thành công!' });
      fetchVocab();
      loadStats();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      alert('Không thể xoá từ vựng: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '30px 20px', maxWidth: '1240px' }}>
      
      {/* Top Notification Toast */}
      {statusMessage && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 1000,
          padding: '14px 20px', borderRadius: '12px',
          background: statusMessage.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', fontWeight: 600, boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s ease'
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn btn-secondary" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={18} /> Quay lại
          </button>
          <div>
            <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>
              Quản lý Từ vựng (Admin Panel)
            </h2>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Tổng số từ vựng hệ thống: <strong>{totalElements.toLocaleString()}</strong> từ
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => { fetchVocab(); loadStats(); }} title="Tải lại danh sách">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> Thêm từ mới
          </button>
        </div>
      </div>

      {/* Level Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {LEVEL_OPTIONS.map(opt => {
          const isSelected = selectedLevel === opt.value;
          const count = stats && stats[opt.value] ? stats[opt.value] : null;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleLevelChange(opt.value)}
              style={{
                padding: '8px 16px', borderRadius: '10px',
                border: isSelected ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                backgroundColor: isSelected ? 'var(--accent-color)' : 'var(--surface-color)',
                color: isSelected ? 'white' : 'var(--text-primary)',
                fontWeight: isSelected ? 700 : 500, fontSize: '0.9rem',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap'
              }}
            >
              <span>{opt.label}</span>
              {count !== null && (
                <span style={{
                  fontSize: '0.75rem', padding: '1px 6px', borderRadius: '6px',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--surface-hover)',
                  color: isSelected ? 'white' : 'var(--text-secondary)'
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter / Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px',
        backgroundColor: 'var(--surface-color)',
        padding: '12px 18px',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text"
            placeholder="Tìm kiếm theo Kanji, Hiragana, Nghĩa, Hán Việt hoặc Chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); setSubmittedQuery(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <X size={16} />
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-secondary" style={{ padding: '8px 22px' }}>
          Tìm kiếm
        </button>
      </form>

      {/* Vocabulary Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        {loading ? (
          <div style={{ padding: '40px' }}>
            <MascotLoader message="Đang tải danh sách từ vựng..." />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', borderBottom: '1.5px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '14px 18px', width: '50px', textAlign: 'center' }}>Xóa</th>
                <th style={{ padding: '14px 18px', width: '50px' }}>#ID</th>
                <th style={{ padding: '14px 18px' }}>Từ vựng (Kanji / Kana)</th>
                <th style={{ padding: '14px 18px' }}>Hán Việt</th>
                <th style={{ padding: '14px 18px' }}>Nghĩa tiếng Việt</th>
                <th style={{ padding: '14px 18px' }}>Loại từ / Chủ đề</th>
                <th style={{ padding: '14px 18px' }}>Cấp độ</th>
                <th style={{ padding: '14px 18px' }}>Dữ liệu AI</th>
                <th style={{ padding: '14px 18px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vocabList.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Không tìm thấy từ vựng nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                vocabList.map((word) => {
                  const isEnriched = Boolean(word.sampleSentence || word.mnemonic || word.usageGuide || word.pitchAccent);
                  const isEnriching = enrichingIds.has(word.id);

                  return (
                    <tr key={word.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }} className="table-row-hover">
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleDelete(word.id)}
                          title="Xóa từ vựng"
                          style={{ width: '32px', height: '32px', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: '8px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        #{word.id}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div>
                            <div className="jp-text" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {word.kanji || word.hiragana}
                            </div>
                            {word.kanji && word.hiragana && (
                              <div className="jp-text" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', marginTop: '2px' }}>
                                {word.hiragana}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => speakWord(word.hiragana || word.kanji)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                            title="Nghe phát âm"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {word.hanViet ? `【${word.hanViet}】` : '-'}
                      </td>
                      <td style={{ padding: '12px 18px', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {word.meaning}
                        </div>
                        {word.sampleSentence && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Ví dụ: {word.sampleSentence}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {word.wordType && (
                            <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-hover)', color: 'var(--text-secondary)', width: 'fit-content' }}>
                              {word.wordType}
                            </span>
                          )}
                          {word.category && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {word.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span className="level-badge" style={{ fontSize: '0.8rem', padding: '3px 8px', borderRadius: '6px' }}>
                          {word.level}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {isEnriched ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            <CheckCircle2 size={13} /> Đã làm giàu
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-hover)', padding: '3px 8px', borderRadius: '6px' }}>
                            Chưa làm giàu
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button 
                            className="btn-icon" 
                            onClick={(e) => handleEnrichSingleWord(word.id, e)}
                            disabled={isEnriching}
                            title="Làm giàu dữ liệu AI (DeepSeek)"
                            style={{ width: '32px', height: '32px', border: '1px solid rgba(37,99,235,0.2)', color: 'var(--accent-color)', background: 'rgba(37,99,235,0.06)' }}
                          >
                            <Sparkles size={14} className={isEnriching ? 'animate-spin' : ''} />
                          </button>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleOpenEdit(word)}
                            title="Chỉnh sửa từ vựng"
                            style={{ width: '32px', height: '32px', border: '1px solid var(--border-color)' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleDelete(word.id)}
                            title="Xóa từ vựng"
                            style={{ width: '32px', height: '32px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && !loading && (
        <div className="flex-center" style={{ gap: '16px', marginTop: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setPage(p => Math.max(p - 1, 0))} 
            disabled={page === 0}
            style={{ opacity: page === 0 ? 0.5 : 1, padding: '8px 14px' }}
          >
            <ChevronLeft size={16} /> Trang trước
          </button>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
            Trang {page + 1} / {totalPages}
          </span>
          <button 
            className="btn btn-secondary" 
            onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} 
            disabled={page === totalPages - 1}
            style={{ opacity: page === totalPages - 1 ? 0.5 : 1, padding: '8px 14px' }}
          >
            Trang sau <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* CRUD Form Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 999, padding: '20px', overflowY: 'auto'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', animation: 'fadeIn 0.2s', padding: '28px' }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 700 }}>
                {editingId ? `Sửa thông tin từ vựng #${editingId}` : 'Thêm từ vựng mới'}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={handleModalAutoEnrich}
                  disabled={isModalEnriching}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                    borderRadius: '8px', border: '1px solid var(--accent-color)',
                    background: 'rgba(37,99,235,0.08)', color: 'var(--accent-color)',
                    fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <Sparkles size={14} className={isModalEnriching ? 'animate-spin' : ''} />
                  {isModalEnriching ? 'Đang gọi AI...' : 'Tự động làm giàu bằng AI'}
                </button>
              )}
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setModalTab('basic')}
                style={{
                  flex: 1, padding: '8px 14px', borderRadius: '8px', border: 'none',
                  background: modalTab === 'basic' ? 'var(--accent-color)' : 'var(--surface-hover)',
                  color: modalTab === 'basic' ? 'white' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer'
                }}
              >
                1. Thông tin cơ bản
              </button>
              <button
                type="button"
                onClick={() => setModalTab('ai')}
                style={{
                  flex: 1, padding: '8px 14px', borderRadius: '8px', border: 'none',
                  background: modalTab === 'ai' ? 'var(--accent-color)' : 'var(--surface-hover)',
                  color: modalTab === 'ai' ? 'white' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer'
                }}
              >
                2. Chi tiết & Dữ liệu AI
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', marginBottom: '18px', fontSize: '0.88rem', fontWeight: 600 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* TAB 1: BASIC INFO */}
              {modalTab === 'basic' && (
                <>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Kanji (Chữ Hán)</label>
                      <input 
                        type="text"
                        value={formData.kanji}
                        onChange={(e) => setFormData({ ...formData, kanji: e.target.value })}
                        className="jp-text"
                        placeholder="VD: 食べる"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Hiragana (Cách đọc) *</label>
                      <input 
                        type="text"
                        value={formData.hiragana}
                        onChange={(e) => setFormData({ ...formData, hiragana: e.target.value })}
                        className="jp-text"
                        placeholder="VD: たべる"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Hán Việt</label>
                      <input 
                        type="text"
                        value={formData.hanViet}
                        onChange={(e) => setFormData({ ...formData, hanViet: e.target.value })}
                        placeholder="VD: THỰC"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Romaji</label>
                      <input 
                        type="text"
                        value={formData.romaji}
                        onChange={(e) => setFormData({ ...formData, romaji: e.target.value })}
                        placeholder="VD: taberu"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Nghĩa tiếng Việt *</label>
                    <input 
                      type="text"
                      value={formData.meaning}
                      onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                      placeholder="VD: Ăn, dùng bữa"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 140px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Cấp độ JLPT</label>
                      <select 
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', outline: 'none' }}
                      >
                        <option value="N5">N5</option>
                        <option value="N4">N4</option>
                        <option value="N3">N3</option>
                        <option value="N2">N2</option>
                        <option value="N1">N1</option>
                        <option value="TU_LAY">Từ láy</option>
                        <option value="TRO_TU">Trợ từ</option>
                      </select>
                    </div>
                    <div style={{ flex: '1 1 160px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Loại từ</label>
                      <input 
                        type="text"
                        value={formData.wordType}
                        onChange={(e) => setFormData({ ...formData, wordType: e.target.value })}
                        placeholder="VD: Động từ nhóm 2"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 160px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Chủ đề (Category)</label>
                      <input 
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="VD: Ăn uống, Đời sống"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: AI & RICH DETAILS */}
              {modalTab === 'ai' && (
                <>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Cao độ (Pitch Accent)</label>
                      <input 
                        type="text"
                        value={formData.pitchAccent}
                        onChange={(e) => setFormData({ ...formData, pitchAccent: e.target.value })}
                        placeholder="VD: [2] hoặc Atamadaka"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Câu ví dụ tiếng Nhật (Sample Sentence)</label>
                    <textarea 
                      rows="2"
                      value={formData.sampleSentence}
                      onChange={(e) => setFormData({ ...formData, sampleSentence: e.target.value })}
                      placeholder="VD: 朝ご飯を食べます。"
                      className="jp-text"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Dịch nghĩa câu ví dụ</label>
                    <input 
                      type="text"
                      value={formData.sampleTranslation}
                      onChange={(e) => setFormData({ ...formData, sampleTranslation: e.target.value })}
                      placeholder="VD: Tôi ăn bữa sáng."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Mẹo ghi nhớ (Mnemonic)</label>
                    <textarea 
                      rows="2"
                      value={formData.mnemonic}
                      onChange={(e) => setFormData({ ...formData, mnemonic: e.target.value })}
                      placeholder="VD: Bộ Thực liên quan đến ăn uống..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Lưu ý sử dụng (Usage Guide)</label>
                    <textarea 
                      rows="2"
                      value={formData.usageGuide}
                      onChange={(e) => setFormData({ ...formData, usageGuide: e.target.value })}
                      placeholder="VD: Đi với trợ từ を..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Từ đồng nghĩa (Synonyms)</label>
                      <input 
                        type="text"
                        value={formData.synonyms}
                        onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
                        placeholder="VD: 食事する, 召し上がる"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Cụm từ đi kèm (Collocations)</label>
                      <input 
                        type="text"
                        value={formData.collocations}
                        onChange={(e) => setFormData({ ...formData, collocations: e.target.value })}
                        placeholder="VD: ご飯を食べる"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  {editingId ? 'Lưu thay đổi' : 'Thêm từ mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabAdminPage;
