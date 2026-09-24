import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, HelpCircle, FileText, CheckCircle } from 'lucide-react';

const JlptN3ReadingEditModal = ({
  isOpen,
  onClose,
  readingData,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('passage'); // 'passage' | 'questions'
  const [title, setTitle] = useState('');
  const [passage, setPassage] = useState('');
  const [translation, setTranslation] = useState('');
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (readingData) {
      setTitle(readingData.title || '');
      setPassage(readingData.passage || '');
      setTranslation(readingData.translation || '');
      setQuestions(Array.isArray(readingData.questions) ? JSON.parse(JSON.stringify(readingData.questions)) : []);
    }
  }, [readingData, isOpen]);

  if (!isOpen) return null;

  const handleQuestionChange = (index, field, value) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    setQuestions(prev => {
      const copy = [...prev];
      const opts = [...(copy[qIndex].options || [])];
      opts[optIndex] = value;
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave({
        title,
        passage,
        translation,
        questions
      });
      onClose();
    } catch (err) {
      console.error('Error saving reading:', err);
      setError(err?.response?.data?.error || err.message || 'Lỗi khi lưu bài đọc');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-color, #1e293b)',
          borderRadius: '18px',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-hover, rgba(255,255,255,0.03))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Edit3 size={22} style={{ color: 'var(--accent-color, #6366f1)' }} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Chỉnh Sửa Bài Đọc Hiểu & Bộ Câu Hỏi (Admin)
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 24px' }}>
          <button
            onClick={() => setActiveTab('passage')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'passage' ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: activeTab === 'passage' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FileText size={18} /> Nội Dung Bài Đọc & Bản Dịch
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'questions' ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: activeTab === 'questions' ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <HelpCircle size={18} /> 10 Câu Hỏi Trắc Nghiệm ({questions.length})
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {activeTab === 'passage' && (
            <>
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  Tiêu đề bài đọc:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                  placeholder="Tiêu đề bài đọc tiếng Nhật (có thể có [Kanji|furigana])"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    Nội dung bài văn tiếng Nhật (~1500 - 2000 ký tự):
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                    Cú pháp Furigana: [ChữHán|hiragana]
                  </span>
                </div>
                <textarea
                  value={passage}
                  onChange={(e) => setPassage(e.target.value)}
                  rows={12}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    color: 'var(--text-primary)',
                    fontSize: '1.02rem',
                    lineHeight: 1.8,
                    fontFamily: 'inherit'
                  }}
                  placeholder="Nhập toàn bộ nội dung bài văn tiếng Nhật..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  Bản dịch nghĩa tiếng Việt:
                </label>
                <textarea
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    lineHeight: 1.7,
                    fontFamily: 'inherit'
                  }}
                  placeholder="Bản dịch tiếng Việt tương ứng..."
                />
              </div>
            </>
          )}

          {activeTab === 'questions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: 'var(--surface-hover, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--accent-color)' }}>Câu hỏi {qIdx + 1}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {q.id || qIdx + 1}</span>
                  </div>

                  <input
                    type="text"
                    value={q.question || ''}
                    onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--surface-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      marginBottom: '12px'
                    }}
                    placeholder={`Nội dung câu hỏi ${qIdx + 1}...`}
                  />

                  {/* 4 Options */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                      const optVal = q.options && q.options[optIdx] ? q.options[optIdx] : '';
                      const isCorrect = q.answer && q.answer.trim().startsWith(letter);

                      return (
                        <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: isCorrect ? '#10b981' : 'var(--text-secondary)', minWidth: '22px' }}>
                            {letter}.
                          </span>
                          <input
                            type="text"
                            value={optVal}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: isCorrect ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                              background: 'var(--surface-color)',
                              color: 'var(--text-primary)',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Correct Answer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#10b981' }}>Đáp án đúng:</label>
                    <input
                      type="text"
                      value={q.answer || ''}
                      onChange={(e) => handleQuestionChange(qIdx, 'answer', e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #10b981',
                        background: 'var(--surface-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        width: '320px'
                      }}
                      placeholder="Ví dụ: A. ..."
                    />
                  </div>

                  {/* Explanation */}
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Giải thích chi tiết 100% tiếng Việt:
                    </label>
                    <textarea
                      value={q.explanation || ''}
                      onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--surface-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        lineHeight: 1.6
                      }}
                      placeholder="Giải thích vì sao đáp án đúng và vì sao các đáp án còn lại sai..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            background: 'var(--surface-hover)'
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--accent-color, #6366f1)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 10px rgba(99,102,241,0.3)'
            }}
          >
            <Save size={18} />
            {saving ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JlptN3ReadingEditModal;
