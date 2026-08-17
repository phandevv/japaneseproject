import React, { useState, useEffect } from 'react';
import { X, Volume2, Sparkles, BookOpen, Layers, AlertTriangle, HelpCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { grammarApi } from '../services/api';

const GrammarDetailModal = ({ grammarCard, onClose, onReEnriched }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'examples' | 'comparison'
  const [localData, setLocalData] = useState(grammarCard);
  const [reEnriching, setReEnriching] = useState(false);
  const [reEnrichSuccess, setReEnrichSuccess] = useState(false);
  const [showReading, setShowReading] = useState(true);

  useEffect(() => {
    setLocalData(grammarCard);
  }, [grammarCard]);

  if (!grammarCard) return null;

  const data = localData || grammarCard;
  const isCurrentlyCallingAi = reEnriching || data.isEnriching === true;

  const handleReEnrich = async () => {
    if (!data || !data.id || isCurrentlyCallingAi) return;
    setReEnriching(true);
    setReEnrichSuccess(false);
    try {
      const updated = await grammarApi.enrich(data.id, true);
      setLocalData(updated);
      setReEnrichSuccess(true);
      if (onReEnriched) {
        onReEnriched(updated);
      }
      setTimeout(() => setReEnrichSuccess(false), 3500);
    } catch (err) {
      console.error("Re-enriching grammar error:", err);
    } finally {
      setReEnriching(false);
    }
  };

  const speakText = (text) => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\(.*?\)/g, ''); // Remove hiragana reading hints in brackets
    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = 'ja-JP';
    u.rate = 0.88;
    window.speechSynthesis.speak(u);
  };

  const parseExamples = (val) => {
    if (!val) return [];
    if (typeof val !== 'string') return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return [{ ja: val, vi: '' }];
    }
  };

  const exampleList = parseExamples(data.examples);

  return (
    <div className="modal-overlay animate-fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div className="modal-content animate-scale-up" style={{
        width: '100%', maxWidth: '850px', maxHeight: '90vh',
        backgroundColor: 'var(--surface-color)', borderRadius: '20px',
        border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>

        {/* Modal Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-hover)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: 'var(--accent-color)', color: '#fff',
              fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px',
              borderRadius: '8px', textTransform: 'uppercase'
            }}>
              {data.jlpt || 'N3'} Ngữ pháp
            </span>
            {data.lessonTitle && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {data.lessonTitle}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleReEnrich}
              disabled={isCurrentlyCallingAi}
              title={isCurrentlyCallingAi ? "AI đang làm giàu dữ liệu..." : "Nạp dữ liệu AI chuyên sâu"}
              className="btn btn-secondary"
              style={{
                fontSize: '0.82rem', padding: '6px 14px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', gap: '6px',
                cursor: isCurrentlyCallingAi ? 'not-allowed' : 'pointer',
                opacity: isCurrentlyCallingAi ? 0.75 : 1,
                backgroundColor: reEnrichSuccess ? 'var(--success-light)' : 'rgba(37,99,235,0.08)',
                color: reEnrichSuccess ? 'var(--success-color)' : 'var(--accent-color)',
                border: '1px solid rgba(37,99,235,0.2)'
              }}
            >
              {isCurrentlyCallingAi ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : reEnrichSuccess ? (
                <CheckCircle size={14} />
              ) : (
                <Sparkles size={14} />
              )}
              {isCurrentlyCallingAi ? '⚡ AI Đang làm giàu...' : reEnrichSuccess ? 'Đã nạp xong!' : 'Nạp dữ liệu AI'}
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', padding: '6px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Modal Banner Hero */}
        <div style={{
          padding: '24px 28px', backgroundColor: 'var(--surface-color)',
          borderBottom: '1px solid var(--border-color)', display: 'flex',
          justify: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px'
        }}>
          <div>
            <h1 className="font-jp" style={{
              fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)',
              margin: '0 0 8px 0', lineHeight: 1.2
            }}>
              {data.grammar}
            </h1>
            <p style={{
              fontSize: '1.25rem', color: 'var(--accent-color)', fontWeight: 600,
              margin: 0
            }}>
              {data.meaning}
            </p>
          </div>

          <button
            onClick={() => speakText(data.grammar)}
            className="btn btn-secondary"
            style={{
              padding: '10px 16px', borderRadius: '12px', display: 'flex',
              alignItems: 'center', gap: '8px', cursor: 'pointer'
            }}
          >
            <Volume2 size={18} color="var(--accent-color)" /> Phát âm
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-hover)', padding: '0 20px'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '14px 20px', border: 'none', background: 'none',
              fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
              color: activeTab === 'overview' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'overview' ? '3px solid var(--accent-color)' : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <BookOpen size={16} /> Cấu trúc & Ý nghĩa
          </button>

          <button
            onClick={() => setActiveTab('examples')}
            style={{
              padding: '14px 20px', border: 'none', background: 'none',
              fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
              color: activeTab === 'examples' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'examples' ? '3px solid var(--accent-color)' : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Layers size={16} /> Câu ví dụ ({exampleList.length})
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            style={{
              padding: '14px 20px', border: 'none', background: 'none',
              fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
              color: activeTab === 'comparison' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'comparison' ? '3px solid var(--accent-color)' : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <AlertTriangle size={16} /> So sánh & Lưu ý
          </button>
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* TAB 1: OVERVIEW & FORMATION */}
          {activeTab === 'overview' && (
            <>
              {/* Formation Box */}
              <div style={{
                padding: '20px', borderRadius: '14px', backgroundColor: 'rgba(37,99,235,0.06)',
                border: '1px solid rgba(37,99,235,0.2)'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-color)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📌 Công thức / Cấu trúc kết hợp (Formation)
                </h3>
                <div className="font-jp" style={{
                  fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)',
                  padding: '12px 16px', borderRadius: '10px', backgroundColor: 'var(--surface-color)',
                  border: '1px solid var(--border-color)'
                }}>
                  {data.formation || (
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      Bấm nút "Nạp dữ liệu AI" ở trên để DeepSeek tự động phân tích công thức kết hợp.
                    </span>
                  )}
                </div>
              </div>

              {/* Usage & Nuances Guide */}
              <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💡 Giải thích chi tiết & Sắc thái sử dụng
                </h3>
                <div style={{ fontSize: '0.98rem', color: 'var(--text-primary)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                  {data.usageGuide || data.usageDesc || (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Chưa có phân tích sắc thái sử dụng. Nhấn "Nạp dữ liệu AI" để AI bổ sung thông tin giải thích chuyên sâu.
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: EXAMPLES */}
          {activeTab === 'examples' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={showReading}
                    onChange={(e) => setShowReading(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Hiện đọc Hiragana (Furigana)
                </label>
              </div>

              {exampleList.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
                  Chưa có câu ví dụ. Nhấn nút "Nạp dữ liệu AI" để tạo ví dụ tự động.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {exampleList.map((ex, idx) => (
                    <div key={idx} style={{
                      padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--surface-color)', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', gap: '16px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div className="font-jp" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                          {ex.ja}
                        </div>
                        {showReading && ex.reading && (
                          <div className="font-jp" style={{ fontSize: '0.9rem', color: 'var(--accent-color)', marginBottom: '8px' }}>
                            ({ex.reading})
                          </div>
                        )}
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                          {ex.vi}
                        </div>
                      </div>

                      <button
                        onClick={() => speakText(ex.ja)}
                        style={{
                          background: 'rgba(37,99,235,0.08)', border: 'none', padding: '10px',
                          borderRadius: '10px', color: 'var(--accent-color)', cursor: 'pointer'
                        }}
                        title="Nghe đọc câu ví dụ"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPARISON & COMMON MISTAKES */}
          {activeTab === 'comparison' && (
            <>
              {/* Similar Grammar & Differences */}
              <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-color)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚖️ Ngữ pháp tương tự & Phân biệt sắc thái
                </h3>
                {data.similarGrammar && (
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Từ/Cấu trúc tương tự: <span className="font-jp" style={{ color: 'var(--accent-color)' }}>{data.similarGrammar}</span>
                  </p>
                )}
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {data.difference || (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Chưa có so sánh điểm khác biệt. Nhấn "Nạp dữ liệu AI" để tạo bảng phân biệt sắc thái.
                    </span>
                  )}
                </div>
              </div>

              {/* Common Mistakes */}
              <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ Lỗi thường gặp khi sử dụng (Common Mistakes)
                </h3>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {data.commonMistakes || (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Chưa có dữ liệu về lỗi thường gặp. Nhấn "Nạp dữ liệu AI" để tự động thu thập bài học kinh nghiệm.
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};

export default GrammarDetailModal;
