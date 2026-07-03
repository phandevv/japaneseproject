import React, { useState, useEffect } from 'react';
import { vocabApi } from '../services/api';
import { ArrowLeft, Plus, Edit, Trash2, Search, X, ChevronLeft, ChevronRight, Loader } from 'lucide-react';

const VocabAdminPage = ({ goBack }) => {
  const [vocabList, setVocabList] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  
  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    kanji: '',
    hiragana: '',
    hanViet: '',
    meaning: '',
    wordType: '',
    level: 'N5',
    category: ''
  });
  const [formError, setFormError] = useState('');

  const fetchVocab = async () => {
    setLoading(true);
    try {
      let response;
      if (submittedQuery) {
        response = await vocabApi.search(submittedQuery, page, 15);
      } else {
        // Fallback to fetch N5 by default or paginated lists
        response = await vocabApi.getByLevelPaginated('N5', page, 15);
      }
      setVocabList(response.content || []);
      setTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error("Failed to load vocabulary list", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVocab();
  }, [page, submittedQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setSubmittedQuery(searchQuery);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      kanji: '',
      hiragana: '',
      hanViet: '',
      meaning: '',
      wordType: '',
      level: 'N5',
      category: ''
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (word) => {
    setEditingId(word.id);
    setFormData({
      kanji: word.kanji || '',
      hiragana: word.hiragana || '',
      hanViet: word.hanViet || '',
      meaning: word.meaning || '',
      wordType: word.wordType || '',
      level: word.level || 'N5',
      category: word.category || ''
    });
    setFormError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.kanji && !formData.hiragana) {
      setFormError('Cần nhập Kanji hoặc Hiragana');
      return;
    }

    try {
      if (editingId) {
        await vocabApi.update(editingId, formData);
      } else {
        await vocabApi.create(formData);
      }
      setShowModal(false);
      fetchVocab();
    } catch (error) {
      setFormError(error.response?.data?.error || 'Có lỗi xảy ra khi lưu từ vựng.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá từ vựng này không?')) return;
    try {
      await vocabApi.delete(id);
      fetchVocab();
    } catch (error) {
      alert('Không thể xoá từ vựng: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '30px 20px', maxWidth: '1100px' }}>
      
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '30px' }}>
        <button className="btn btn-secondary" onClick={goBack}>
          <ArrowLeft size={18} /> Quay lại
        </button>
        <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Quản lý từ vựng (Admin Panel)</h2>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Thêm từ mới
        </button>
      </div>

      {/* Filter / Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        backgroundColor: 'var(--surface-color)',
        padding: '12px 18px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text"
            placeholder="Tìm kiếm theo Kanji, Hiragana, Nghĩa hoặc Hán Việt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); setSubmittedQuery(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          )}
        </div>
        <button type="submit" className="btn btn-secondary" style={{ padding: '8px 20px' }}>
          Tìm kiếm
        </button>
      </form>

      {/* Vocabulary Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '24px' }}>
        {loading ? (
          <div className="flex-center" style={{ height: '300px', flexDirection: 'column', gap: '16px' }}>
            <Loader className="animate-spin" size={32} color="var(--accent-color)" />
            <p style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách từ vựng...</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '15px 20px' }}>Kanji</th>
                <th style={{ padding: '15px 20px' }}>Hiragana</th>
                <th style={{ padding: '15px 20px' }}>Hán Việt</th>
                <th style={{ padding: '15px 20px' }}>Nghĩa dịch</th>
                <th style={{ padding: '15px 20px' }}>Loại từ</th>
                <th style={{ padding: '15px 20px' }}>Cấp độ</th>
                <th style={{ padding: '15px 20px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vocabList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Không tìm thấy từ vựng nào phù hợp.
                  </td>
                </tr>
              ) : (
                vocabList.map((word) => (
                  <tr key={word.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <td className="jp-text" style={{ padding: '12px 20px', fontSize: '1.1rem', fontWeight: 600 }}>{word.kanji || '-'}</td>
                    <td className="jp-text" style={{ padding: '12px 20px', color: 'var(--accent-color)' }}>{word.hiragana || '-'}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-secondary)' }}>{word.hanViet || '-'}</td>
                    <td style={{ padding: '12px 20px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{word.meaning}</td>
                    <td style={{ padding: '12px 20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{word.wordType || '-'}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span className="level-badge" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>{word.level}</span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleOpenEdit(word)}
                          style={{ width: '32px', height: '32px', border: '1px solid var(--border-color)' }}
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleDelete(word.id)}
                          style={{ width: '32px', height: '32px', border: '1px solid var(--border-color)', color: 'var(--accent-color)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && !loading && (
        <div className="flex-center" style={{ gap: '16px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setPage(p => Math.max(p - 1, 0))} 
            disabled={page === 0}
            style={{ opacity: page === 0 ? 0.5 : 1, padding: '8px 12px' }}
          >
            <ChevronLeft size={16} /> Trang trước
          </button>
          <span style={{ color: 'var(--text-secondary)' }}>
            Trang {page + 1} / {totalPages}
          </span>
          <button 
            className="btn btn-secondary" 
            onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} 
            disabled={page === totalPages - 1}
            style={{ opacity: page === totalPages - 1 ? 0.5 : 1, padding: '8px 12px' }}
          >
            Trang sau <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* CRUD Form Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', position: 'relative', animation: 'fadeIn 0.2s' }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              {editingId ? 'Sửa thông tin từ vựng' : 'Thêm từ vựng mới'}
            </h3>

            {formError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', padding: '10px 14px', borderRadius: '8px', marginBottom: '18px', fontSize: '0.9rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Kanji</label>
                  <input 
                    type="text"
                    value={formData.kanji}
                    onChange={(e) => setFormData({ ...formData, kanji: e.target.value })}
                    className="jp-text"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hiragana (cách đọc) *</label>
                  <input 
                    type="text"
                    value={formData.hiragana}
                    onChange={(e) => setFormData({ ...formData, hiragana: e.target.value })}
                    className="jp-text"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hán Việt</label>
                  <input 
                    type="text"
                    value={formData.hanViet}
                    onChange={(e) => setFormData({ ...formData, hanViet: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Cấp độ JLPT</label>
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
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Nghĩa tiếng Việt *</label>
                <input 
                  type="text"
                  value={formData.meaning}
                  onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Loại từ (Danh từ, Động từ...)</label>
                  <input 
                    type="text"
                    value={formData.wordType}
                    onChange={(e) => setFormData({ ...formData, wordType: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Chủ đề (Category)</label>
                  <input 
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
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
