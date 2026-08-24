import React, { useState, useEffect } from 'react';
import { 
  X, Volume2, Sparkles, BookOpen, Layers, AlertTriangle, 
  HelpCircle, CheckCircle, RefreshCw, Pencil, Check, Plus, Trash2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { grammarApi } from '../services/api';

const FuriganaRuby = ({ text }) => {
  if (!text) return null;
  const str = String(text);
  const regex = /([^\s\(\)▶👉\u3040-\u309F\u30A0-\u30FF]+)\(([^)]+)\)/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      elements.push(str.substring(lastIndex, match.index));
    }
    const baseText = match[1];
    const furigana = match[2];
    elements.push(
      <ruby key={match.index} style={{ rubyPosition: 'over' }}>
        <span>{baseText}</span>
        <rt style={{ fontSize: '0.65em', color: 'var(--accent-color)', fontWeight: '600', userSelect: 'none', paddingBottom: '2px' }}>
          {furigana}
        </rt>
      </ruby>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    elements.push(str.substring(lastIndex));
  }

  return <>{elements}</>;
};

const GrammarDetailModal = ({ grammarCard, onClose, onReEnriched }) => {
  const { user } = useAuth();
  const isAdmin = user && (user.username === "admin" || user.role === "ADMIN" || user.roles?.includes("ADMIN") || user.roles?.includes("ROLE_ADMIN"));

  const [activeTab, setActiveTab] = useState('formation'); // 'formation' | 'usage' | 'examples' | 'comparison' | 'mistakes'
  const [localData, setLocalData] = useState(grammarCard);
  const [reEnriching, setReEnriching] = useState(false);
  const [reEnrichSuccess, setReEnrichSuccess] = useState(false);
  const [showReading, setShowReading] = useState(true);

  // Admin Inline Edit States
  const [editingSection, setEditingSection] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccessSection, setEditSuccessSection] = useState(null);

  // Admin Section-Level AI Enrichment States
  const [enrichingSection, setEnrichingSection] = useState(null);
  const [enrichSuccessSection, setEnrichSuccessSection] = useState(null);

  useEffect(() => {
    setLocalData(grammarCard);
    setEditingSection(null);
    setEditDraft({});
    setEnrichingSection(null);
    setEnrichSuccessSection(null);
  }, [grammarCard?.id]);

  if (!grammarCard) return null;

  const data = localData || grammarCard;
  const isCurrentlyCallingAi = reEnriching || data.isEnriching === true;

  const handleFullReEnrich = async () => {
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
      alert("Lỗi khi nạp dữ liệu AI: " + (err.response?.data?.message || err.message));
    } finally {
      setReEnriching(false);
    }
  };

  const handleEnrichSection = async (section) => {
    if (!data?.id || enrichingSection) return;
    setEnrichingSection(section);
    try {
      const updated = await grammarApi.enrichSection(data.id, section);
      if (updated) {
        setLocalData(updated);
        if (onReEnriched) {
          onReEnriched(updated);
        }
        setEnrichSuccessSection(section);
        setTimeout(() => setEnrichSuccessSection(null), 2500);
      }
    } catch (err) {
      console.error(`Failed to enrich section ${section}:`, err);
      alert(`Lỗi khi AI nạp lại mục ${section}: ` + (err.response?.data?.message || err.message));
    } finally {
      setEnrichingSection(null);
    }
  };

  const startEditing = (section, initialDraft) => {
    setEditingSection(section);
    setEditDraft(initialDraft);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditDraft({});
  };

  const saveEditing = async (fieldsToSave) => {
    if (!data?.id) return;
    setSavingEdit(true);
    try {
      const payload = {
        ...data,
        ...fieldsToSave
      };

      const saved = await grammarApi.update(data.id, payload);
      setLocalData(saved);
      if (onReEnriched) {
        onReEnriched(saved);
      }
      const savedSection = editingSection;
      setEditingSection(null);
      setEditDraft({});
      setEditSuccessSection(savedSection);
      setTimeout(() => setEditSuccessSection(null), 2500);
    } catch (err) {
      console.error("Failed to update grammar field:", err);
      alert("Lỗi khi lưu dữ liệu ngữ pháp: " + (err.response?.data?.message || err.message));
    } finally {
      setSavingEdit(false);
    }
  };

  const speakText = (text) => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\(.*?\)/g, '');
    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = 'ja-JP';
    u.rate = 0.88;
    window.speechSynthesis.speak(u);
  };

  const parseExamples = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val !== 'string') return [];
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch (e) {
      return [{ ja: val, reading: '', vi: '' }];
    }
  };

  const exampleList = parseExamples(data.examples);

  // Reusable Micro-Buttons for Admin
  const AdminEditBtn = ({ section, onClick, label = "Sửa" }) => {
    if (!isAdmin) return null;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        title="Admin: Chỉnh sửa trực tiếp phần này"
        style={{
          background: editSuccessSection === section ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37,99,235,0.09)',
          border: `1px solid ${editSuccessSection === section ? '#10b981' : 'rgba(37,99,235,0.22)'}`,
          borderRadius: '6px',
          color: editSuccessSection === section ? '#10b981' : 'var(--accent-color)',
          padding: '3px 8px',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 600,
          transition: 'all 0.2s ease'
        }}
      >
        {editSuccessSection === section ? (
          <><Check size={12} /> Đã lưu</>
        ) : (
          <><Pencil size={12} /> {label}</>
        )}
      </button>
    );
  };

  const AdminAiEnrichSectionBtn = ({ section, label = "AI nạp" }) => {
    if (!isAdmin) return null;
    const isThisEnriching = enrichingSection === section;
    const isThisSuccess = enrichSuccessSection === section;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleEnrichSection(section);
        }}
        disabled={!!enrichingSection}
        title={`Admin: Gọi DeepSeek AI phân tích & nạp riêng phần ${label}`}
        style={{
          background: isThisSuccess ? 'rgba(16, 185, 129, 0.15)' : isThisEnriching ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.09)',
          border: `1px solid ${isThisSuccess ? '#10b981' : isThisEnriching ? '#f59e0b' : 'rgba(245, 158, 11, 0.28)'}`,
          borderRadius: '6px',
          color: isThisSuccess ? '#10b981' : '#f59e0b',
          padding: '3px 8px',
          fontSize: '0.75rem',
          cursor: enrichingSection ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          opacity: (enrichingSection && !isThisEnriching) ? 0.5 : 1
        }}
      >
        <Sparkles size={12} style={{ animation: isThisEnriching ? 'spin 1s linear infinite' : 'none' }} />
        {isThisSuccess ? 'Đã nạp!' : isThisEnriching ? 'Đang nạp...' : label}
      </button>
    );
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 1050,
      backgroundColor: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div className="modal-content animate-scale-up" style={{
        width: '100%', maxWidth: '880px', maxHeight: '92vh',
        backgroundColor: 'var(--surface-color)', borderRadius: '22px',
        border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>

        {/* Modal Top Bar */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-hover)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: 'var(--accent-color)', color: '#fff',
              fontSize: '0.8rem', fontWeight: 800, padding: '4px 10px',
              borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              {data.jlpt || 'N3'} NGỮ PHÁP
            </span>
            {data.lessonTitle && (
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {data.lessonTitle}
              </span>
            )}
            {isAdmin && (
              <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                ADMIN MODE
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isAdmin && (
              <button
                onClick={handleFullReEnrich}
                disabled={isCurrentlyCallingAi}
                title={isCurrentlyCallingAi ? "AI đang làm giàu toàn bộ dữ liệu..." : "Nạp lại toàn bộ dữ liệu thẻ ngữ pháp bằng DeepSeek AI"}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.82rem', padding: '6px 12px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  cursor: isCurrentlyCallingAi ? 'not-allowed' : 'pointer',
                  opacity: isCurrentlyCallingAi ? 0.75 : 1,
                  backgroundColor: reEnrichSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37,99,235,0.08)',
                  color: reEnrichSuccess ? '#10b981' : 'var(--accent-color)',
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
                {isCurrentlyCallingAi ? 'Đang nạp AI...' : reEnrichSuccess ? 'Đã nạp xong!' : 'AI Toàn bộ'}
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Banner Hero (Grammar & Meaning) */}
        <div style={{
          padding: '22px 28px', backgroundColor: 'var(--surface-color)',
          borderBottom: '1px solid var(--border-color)', display: 'flex',
          justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px'
        }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            {editingSection === 'header' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={editDraft.grammar ?? data.grammar}
                    onChange={(e) => setEditDraft({ ...editDraft, grammar: e.target.value })}
                    placeholder="Mẫu ngữ pháp (VD: ～から～にかけて)"
                    className="input-field"
                    style={{ flex: 1, fontSize: '1.2rem', fontWeight: 700 }}
                  />
                  <input
                    type="text"
                    value={editDraft.jlpt ?? data.jlpt}
                    onChange={(e) => setEditDraft({ ...editDraft, jlpt: e.target.value })}
                    placeholder="JLPT (N3, N2...)"
                    className="input-field"
                    style={{ width: '90px', fontSize: '1rem', fontWeight: 700 }}
                  />
                </div>
                <input
                  type="text"
                  value={editDraft.meaning ?? data.meaning}
                  onChange={(e) => setEditDraft({ ...editDraft, meaning: e.target.value })}
                  placeholder="Ý nghĩa tiếng Việt tổng quát"
                  className="input-field"
                  style={{ fontSize: '1rem' }}
                />
                <input
                  type="text"
                  value={editDraft.lessonTitle ?? data.lessonTitle}
                  onChange={(e) => setEditDraft({ ...editDraft, lessonTitle: e.target.value })}
                  placeholder="Tiêu đề bài học (VD: Tuần 1 - Ngày 2: Ngữ pháp cơ bản)"
                  className="input-field"
                  style={{ fontSize: '0.9rem' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    onClick={() => saveEditing({
                      grammar: editDraft.grammar ?? data.grammar,
                      meaning: editDraft.meaning ?? data.meaning,
                      jlpt: editDraft.jlpt ?? data.jlpt,
                      lessonTitle: editDraft.lessonTitle ?? data.lessonTitle
                    })}
                    disabled={savingEdit}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                  >
                    <Check size={14} /> {savingEdit ? 'Đang lưu...' : 'Lưu Header'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={savingEdit}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <h1 className="font-jp" style={{
                    fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)',
                    margin: 0, lineHeight: 1.2
                  }}>
                    {data.grammar}
                  </h1>
                  {isAdmin && (
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <AdminEditBtn section="header" onClick={() => startEditing('header', { grammar: data.grammar, meaning: data.meaning, jlpt: data.jlpt, lessonTitle: data.lessonTitle })} label="Sửa Header" />
                      <AdminAiEnrichSectionBtn section="header" label="AI nạp Header" />
                    </div>
                  )}
                </div>
                <p style={{
                  fontSize: '1.2rem', color: 'var(--success-color)', fontWeight: 700,
                  margin: 0, display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  💡 {data.meaning}
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => speakText(data.grammar)}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px', borderRadius: '12px', display: 'flex',
                alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem'
              }}
            >
              <Volume2 size={18} color="var(--accent-color)" /> Phát âm
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-hover)', padding: '0 16px', overflowX: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('formation')}
            style={{
              padding: '12px 18px', border: 'none', background: 'none',
              fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
              color: activeTab === 'formation' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'formation' ? '3px solid var(--accent-color)' : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
            }}
          >
            <BookOpen size={16} /> Cấu trúc & Cách chia
          </button>

          <button
            onClick={() => setActiveTab('usage')}
            style={{
              padding: '12px 18px', border: 'none', background: 'none',
              fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
              color: activeTab === 'usage' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'usage' ? '3px solid var(--accent-color)' : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
            }}
          >
            <HelpCircle size={16} /> Giải thích & Sắc thái
          </button>

          <button
            onClick={() => setActiveTab('examples')}
            style={{
              padding: '12px 18px', border: 'none', background: 'none',
              fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
              color: activeTab === 'examples' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'examples' ? '3px solid var(--accent-color)' : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
            }}
          >
            <Layers size={16} /> Câu ví dụ ({exampleList.length})
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            style={{
              padding: '12px 18px', border: 'none', background: 'none',
              fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
              color: activeTab === 'comparison' ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'comparison' ? '3px solid var(--accent-color)' : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={16} /> So sánh & Phân biệt
          </button>

          <button
            onClick={() => setActiveTab('mistakes')}
            style={{
              padding: '12px 18px', border: 'none', background: 'none',
              fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
              color: activeTab === 'mistakes' ? '#ef4444' : 'var(--text-secondary)',
              borderBottom: activeTab === 'mistakes' ? '3px solid #ef4444' : '3px solid transparent',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
            }}
          >
            <AlertTriangle size={16} /> Lỗi thường gặp
          </button>
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* TAB 1: FORMATION & CONNECTION */}
          {activeTab === 'formation' && (
            <div style={{
              padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(37,99,235,0.05)',
              border: '1px solid rgba(37,99,235,0.18)', display: 'flex', flexDirection: 'column', gap: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-color)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📌 Công thức kết hợp / Cách chia (Formation)
                </h3>
                {isAdmin && editingSection !== 'formation' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <AdminEditBtn section="formation" onClick={() => startEditing('formation', { formation: data.formation || '' })} label="Sửa công thức" />
                    <AdminAiEnrichSectionBtn section="formation" label="AI nạp công thức" />
                  </div>
                )}
              </div>

              {editingSection === 'formation' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    rows={4}
                    value={editDraft.formation ?? ''}
                    onChange={(e) => setEditDraft({ ...editDraft, formation: e.target.value })}
                    placeholder="Nhập công thức kết hợp (VD: N + から + N + にかけて / V-ru + に際して)..."
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.98rem', lineHeight: 1.6, padding: '10px 14px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => saveEditing({ formation: editDraft.formation })}
                      disabled={savingEdit}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    >
                      <Check size={14} /> {savingEdit ? 'Đang lưu...' : 'Lưu công thức'}
                    </button>
                    <button onClick={cancelEditing} disabled={savingEdit} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="font-jp" style={{
                  fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)',
                  padding: '14px 18px', borderRadius: '12px', backgroundColor: 'var(--surface-color)',
                  border: '1px solid var(--border-color)', lineHeight: 1.6, whiteSpace: 'pre-line'
                }}>
                  {data.formation || (
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      Chưa có công thức kết hợp. Nhấn nút <strong>AI nạp công thức</strong> ở trên để DeepSeek tự động phân tích.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: USAGE & NUANCES */}
          {activeTab === 'usage' && (
            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💡 Giải thích chi tiết & Sắc thái sử dụng (Usage Guide)
                </h3>
                {isAdmin && editingSection !== 'usage' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <AdminEditBtn section="usage" onClick={() => startEditing('usage', { usageGuide: data.usageGuide || data.usageDesc || '' })} label="Sửa hướng dẫn" />
                    <AdminAiEnrichSectionBtn section="usageguide" label="AI nạp hướng dẫn" />
                  </div>
                )}
              </div>

              {editingSection === 'usage' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    rows={8}
                    value={editDraft.usageGuide ?? ''}
                    onChange={(e) => setEditDraft({ ...editDraft, usageGuide: e.target.value })}
                    placeholder="Nhập hướng dẫn sử dụng, sắc thái nghĩa, ngữ cảnh xuất hiện chi tiết..."
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.98rem', lineHeight: 1.6, padding: '10px 14px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => saveEditing({ usageGuide: editDraft.usageGuide, usageDesc: editDraft.usageGuide })}
                      disabled={savingEdit}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    >
                      <Check size={14} /> {savingEdit ? 'Đang lưu...' : 'Lưu hướng dẫn'}
                    </button>
                    <button onClick={cancelEditing} disabled={savingEdit} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.8,
                  whiteSpace: 'pre-line', padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-hover)'
                }}>
                  {data.usageGuide || data.usageDesc || (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Chưa có phân tích sắc thái sử dụng. Nhấn <strong>AI nạp hướng dẫn</strong> để bổ sung kiến thức chuyên sâu 100% tiếng Việt.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXAMPLES */}
          {activeTab === 'examples' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    📚 Danh sách câu ví dụ minh họa
                  </h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={showReading}
                      onChange={(e) => setShowReading(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Hiện Furigana
                  </label>
                </div>

                {isAdmin && editingSection !== 'examples' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <AdminEditBtn section="examples" onClick={() => startEditing('examples', { examples: exampleList })} label="Sửa câu ví dụ" />
                    <AdminAiEnrichSectionBtn section="examples" label="AI nạp ví dụ" />
                  </div>
                )}
              </div>

              {editingSection === 'examples' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(editDraft.examples || []).map((ex, idx) => (
                    <div key={idx} style={{
                      padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)',
                      background: 'var(--surface-hover)', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-color)' }}>Ví dụ #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editDraft.examples.filter((_, i) => i !== idx);
                            setEditDraft({ ...editDraft, examples: updated });
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                          title="Xóa ví dụ này"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={ex.ja || ''}
                        onChange={(e) => {
                          const updated = [...editDraft.examples];
                          updated[idx] = { ...updated[idx], ja: e.target.value };
                          setEditDraft({ ...editDraft, examples: updated });
                        }}
                        placeholder="Câu tiếng Nhật (VD: この仕事を通して、多くのことを学びました。)"
                        className="input-field font-jp"
                        style={{ fontSize: '0.95rem' }}
                      />
                      <input
                        type="text"
                        value={ex.reading || ''}
                        onChange={(e) => {
                          const updated = [...editDraft.examples];
                          updated[idx] = { ...updated[idx], reading: e.target.value };
                          setEditDraft({ ...editDraft, examples: updated });
                        }}
                        placeholder="Cách đọc Furigana/Hiragana"
                        className="input-field font-jp"
                        style={{ fontSize: '0.88rem' }}
                      />
                      <input
                        type="text"
                        value={ex.vi || ''}
                        onChange={(e) => {
                          const updated = [...editDraft.examples];
                          updated[idx] = { ...updated[idx], vi: e.target.value };
                          setEditDraft({ ...editDraft, examples: updated });
                        }}
                        placeholder="Dịch nghĩa tiếng Việt"
                        className="input-field"
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setEditDraft({
                        ...editDraft,
                        examples: [...(editDraft.examples || []), { ja: '', reading: '', vi: '' }]
                      });
                    }}
                    className="btn btn-secondary"
                    style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Thêm câu ví dụ
                  </button>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      onClick={() => saveEditing({ examples: JSON.stringify(editDraft.examples || []) })}
                      disabled={savingEdit}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    >
                      <Check size={14} /> {savingEdit ? 'Đang lưu...' : 'Lưu danh sách ví dụ'}
                    </button>
                    <button onClick={cancelEditing} disabled={savingEdit} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : exampleList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '36px 0', background: 'var(--surface-hover)', borderRadius: '14px' }}>
                  Chưa có câu ví dụ minh họa. Nhấn <strong>AI nạp ví dụ</strong> để DeepSeek tạo câu chuẩn JLPT.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {exampleList.map((ex, idx) => (
                    <div key={idx} style={{
                      padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--surface-color)', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', gap: '16px', transition: 'all 0.15s ease'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div className="font-jp" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.6 }}>
                          {showReading && ex.reading ? (
                            <FuriganaRuby text={ex.reading} />
                          ) : (
                            ex.ja
                          )}
                        </div>
                        {ex.vi && (
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            👉 {ex.vi}
                          </div>
                        )}
                      </div>

                      {ex.ja && (
                        <button
                          onClick={() => speakText(ex.ja)}
                          style={{
                            background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', padding: '8px',
                            borderRadius: '10px', color: 'var(--accent-color)', cursor: 'pointer', transition: 'all 0.15s ease'
                          }}
                          title="Nghe phát âm câu ví dụ"
                        >
                          <Volume2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMPARISON & SIMILAR GRAMMAR */}
          {activeTab === 'comparison' && (
            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-color)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚖️ Ngữ pháp tương tự & Phân biệt sắc thái (Comparison)
                </h3>
                {isAdmin && editingSection !== 'comparison' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <AdminEditBtn section="comparison" onClick={() => startEditing('comparison', { similarGrammar: data.similarGrammar || '', difference: data.difference || '' })} label="Sửa so sánh" />
                    <AdminAiEnrichSectionBtn section="similar" label="AI nạp so sánh" />
                  </div>
                )}
              </div>

              {editingSection === 'comparison' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Điểm ngữ pháp tương tự:</label>
                    <input
                      type="text"
                      value={editDraft.similarGrammar ?? ''}
                      onChange={(e) => setEditDraft({ ...editDraft, similarGrammar: e.target.value })}
                      placeholder="VD: ～から～まで, ～を通じて / ～を通して..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Phân biệt điểm giống & khác nhau:</label>
                    <textarea
                      rows={6}
                      value={editDraft.difference ?? ''}
                      onChange={(e) => setEditDraft({ ...editDraft, difference: e.target.value })}
                      placeholder="Giải thích sắc thái khác nhau, bối cảnh sử dụng của từng mẫu..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.95rem', lineHeight: 1.6, padding: '10px 14px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => saveEditing({ similarGrammar: editDraft.similarGrammar, difference: editDraft.difference })}
                      disabled={savingEdit}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    >
                      <Check size={14} /> {savingEdit ? 'Đang lưu...' : 'Lưu so sánh'}
                    </button>
                    <button onClick={cancelEditing} disabled={savingEdit} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {data.similarGrammar && (
                    <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Mẫu tương tự: </span>
                      <span className="font-jp" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-color)' }}>{data.similarGrammar}</span>
                    </div>
                  )}

                  <div style={{
                    fontSize: '0.98rem', color: 'var(--text-primary)', lineHeight: 1.75,
                    whiteSpace: 'pre-line', padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-hover)'
                  }}>
                    {data.difference || (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Chưa có phân biệt sắc thái. Nhấn <strong>AI nạp so sánh</strong> để tạo bảng so sánh chi tiết.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: COMMON MISTAKES */}
          {activeTab === 'mistakes' && (
            <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.04)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ Lỗi thường gặp khi sử dụng (Common Mistakes)
                </h3>
                {isAdmin && editingSection !== 'mistakes' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <AdminEditBtn section="mistakes" onClick={() => startEditing('mistakes', { commonMistakes: data.commonMistakes || '' })} label="Sửa lỗi sai" />
                    <AdminAiEnrichSectionBtn section="commonmistakes" label="AI nạp lỗi sai" />
                  </div>
                )}
              </div>

              {editingSection === 'mistakes' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    rows={6}
                    value={editDraft.commonMistakes ?? ''}
                    onChange={(e) => setEditDraft({ ...editDraft, commonMistakes: e.target.value })}
                    placeholder="Nhập các lỗi sai thường gặp khi dùng ngữ pháp này và cách sửa..."
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.98rem', lineHeight: 1.6, padding: '10px 14px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => saveEditing({ commonMistakes: editDraft.commonMistakes })}
                      disabled={savingEdit}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    >
                      <Check size={14} /> {savingEdit ? 'Đang lưu...' : 'Lưu lỗi sai'}
                    </button>
                    <button onClick={cancelEditing} disabled={savingEdit} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: '0.98rem', color: 'var(--text-primary)', lineHeight: 1.75,
                  whiteSpace: 'pre-line', padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-color)', border: '1px solid rgba(239,68,68,0.15)'
                }}>
                  {data.commonMistakes || (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Chưa có lưu ý lỗi sai thường gặp. Nhấn <strong>AI nạp lỗi sai</strong> để hệ thống tự động tổng hợp những bẫy thường gặp trong bài thi JLPT.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default GrammarDetailModal;
