import { ArrowRight, Sparkles, RefreshCw, Pencil, Check, X, Plus, Trash2, Edit3, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vocabApi } from '../services/api';

export default function AiEnrichedTabbedView({ data, onReEnriched }) {
  const { user } = useAuth();
  const [activeCardTab, setActiveCardTab] = useState('core');
  const [reEnriching, setReEnriching] = useState(false);
  const [reEnrichSuccess, setReEnrichSuccess] = useState(false);
  const [localData, setLocalData] = useState(null);

  // Admin Inline Edit States
  const [editingSection, setEditingSection] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccessSection, setEditSuccessSection] = useState(null);

  // Admin Section-Level AI Enrichment States
  const [enrichingSection, setEnrichingSection] = useState(null);
  const [enrichSuccessSection, setEnrichSuccessSection] = useState(null);

  // Reset localData and enriching states when parent word changes
  useEffect(() => {
    setLocalData(null);
    setReEnriching(false);
    setReEnrichSuccess(false);
    setEditingSection(null);
    setEditDraft({});
    setEnrichingSection(null);
    setEnrichSuccessSection(null);
  }, [data?.id]);

  // Auto-enrich on mount / view if word is missing core AI enriched fields
  useEffect(() => {
    if (!data || !data.id || isNaN(Number(data.id))) return;
    const targetId = data.id;

    const hasMnemonic = typeof data.mnemonic === 'string' && data.mnemonic.trim().length > 0;
    const hasUsage = typeof data.usageGuide === 'string' && data.usageGuide.trim().length > 0;
    const hasExamples = typeof data.exampleSentences === 'string' && data.exampleSentences.trim().length > 0 && data.exampleSentences !== '[]' && data.exampleSentences !== 'null';

    // If word is missing rich data and not currently enriching
    if ((!hasMnemonic || !hasUsage || !hasExamples) && !reEnriching && !localData) {
      setReEnriching(true);
      let active = true;
      vocabApi.enrich(targetId, false)
        .then(updated => {
          // STRICT RACE CONDITION GUARD: ensure user is STILL viewing targetId
          if (!active || data?.id !== targetId || !updated || updated.id !== targetId) return;
          if (updated.mnemonic || updated.usageGuide || updated.exampleSentences) {
            if (data && typeof data === 'object' && data.id === targetId) {
              Object.assign(data, updated);
            }
            setLocalData(updated);
            if (onReEnriched) {
              onReEnriched(updated);
            }
          }
        })
        .catch(err => {
          console.warn("Auto-enrichment error:", err);
        })
        .finally(() => {
          if (active && data?.id === targetId) setReEnriching(false);
        });

      return () => {
        active = false;
      };
    }
  }, [data?.id, data?.mnemonic, data?.usageGuide, data?.exampleSentences]);

  if (!data) return null;

  const displayData = (localData && localData.id === data.id) ? localData : data;

  const isAdmin = user && (user.username === "admin" || user.role === "ADMIN" || user.roles?.includes("ADMIN") || user.roles?.includes("ROLE_ADMIN"));

  const isCurrentlyCallingAi = reEnriching || displayData.isEnriching === true;

  const handleReEnrich = async (e) => {
    if (e) e.stopPropagation();
    if (!displayData || !displayData.id || isCurrentlyCallingAi) return;
    const targetId = displayData.id;
    setReEnriching(true);
    setReEnrichSuccess(false);

    try {
      const updated = await vocabApi.enrich(targetId, true);
      // STRICT RACE CONDITION GUARD: If user already switched to another word, discard this response
      if (data?.id !== targetId || !updated || updated.id !== targetId) {
        return;
      }
      if (data && typeof data === 'object' && data.id === targetId) {
        Object.assign(data, updated);
      }
      setLocalData(updated);
      setReEnrichSuccess(true);
      if (onReEnriched) {
        onReEnriched(updated);
      }
      setTimeout(() => setReEnrichSuccess(false), 3500);
    } catch (err) {
      console.error("Re-enrichment error:", err);
    } finally {
      if (data?.id === targetId) {
        setReEnriching(false);
      }
    }
  };

  const handleEnrichSection = async (section) => {
    if (!displayData?.id || enrichingSection) return;
    const targetId = displayData.id;
    setEnrichingSection(section);
    try {
      const updated = await vocabApi.enrichSection(targetId, section);
      if (updated && data?.id === targetId) {
        if (data && typeof data === 'object' && data.id === targetId) {
          Object.assign(data, updated);
        }
        setLocalData(prev => ({ ...(prev || {}), ...updated }));
        if (onReEnriched) {
          onReEnriched({ ...(displayData || {}), ...updated });
        }
        setEnrichSuccessSection(section);
        setTimeout(() => setEnrichSuccessSection(null), 2500);
      }
    } catch (err) {
      console.error(`Failed to enrich section ${section}:`, err);
      alert(`Lỗi khi AI nạp lại phần ${section}: ` + (err.response?.data?.message || err.message));
    } finally {
      setEnrichingSection(null);
    }
  };

  const parseJsonList = (val) => {
    if (!val) return [];
    if (typeof val !== 'string') return Array.isArray(val) ? val : [];
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
  };

  // --- Admin Editing Helpers ---
  const startEditing = (section, initialDraft) => {
    setEditingSection(section);
    setEditDraft(initialDraft);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditDraft({});
  };

  const saveEditing = async (fieldsToSave) => {
    if (!displayData?.id) return;
    setSavingEdit(true);
    try {
      const payload = {
        ...displayData,
        ...fieldsToSave
      };

      // Ensure uppercase for hanViet if present
      if (payload.hanViet) {
        payload.hanViet = String(payload.hanViet).trim().toUpperCase();
      }

      const saved = await vocabApi.update(displayData.id, payload);
      if (data && typeof data === 'object' && data.id === displayData.id) {
        Object.assign(data, saved);
      }
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
      console.error("Failed to update vocabulary field:", err);
      alert("Lỗi khi lưu dữ liệu: " + (err.response?.data?.message || err.message));
    } finally {
      setSavingEdit(false);
    }
  };

  const synonyms = parseJsonList(displayData.synonyms);
  const antonyms = parseJsonList(displayData.antonyms);
  const collocations = parseJsonList(displayData.collocations);
  const kanjiWords = parseJsonList(displayData.kanjiWords);
  const exampleSentences = parseJsonList(displayData.exampleSentences);
  const commonMistakes = parseJsonList(displayData.commonMistakes);
  const conversations = parseJsonList(displayData.conversationExamples);

  const hasOldSentence = !exampleSentences.length && displayData.sampleSentence;

  // Small Admin Edit Trigger Button Component
  const AdminEditBtn = ({ section, onClick, label = "Sửa" }) => {
    if (!isAdmin) return null;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        title="Admin: Chỉnh sửa mục này"
        style={{
          background: editSuccessSection === section ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37,99,235,0.09)',
          border: `1px solid ${editSuccessSection === section ? '#10b981' : 'rgba(37,99,235,0.22)'}`,
          borderRadius: '5px',
          color: editSuccessSection === section ? '#10b981' : 'var(--accent-color)',
          padding: '2px 7px',
          fontSize: '0.72rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontWeight: 600,
          transition: 'all 0.2s ease'
        }}
      >
        {editSuccessSection === section ? (
          <><Check size={11} /> Đã lưu</>
        ) : (
          <><Pencil size={11} /> {label}</>
        )}
      </button>
    );
  };

  // Small Admin AI Section Enrich Trigger Button Component
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
        title={`Admin: Gọi DeepSeek AI tạo/nạp riêng phần dữ liệu ${label}`}
        style={{
          background: isThisSuccess ? 'rgba(16, 185, 129, 0.15)' : isThisEnriching ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.09)',
          border: `1px solid ${isThisSuccess ? '#10b981' : isThisEnriching ? '#f59e0b' : 'rgba(245, 158, 11, 0.28)'}`,
          borderRadius: '5px',
          color: isThisSuccess ? '#10b981' : '#f59e0b',
          padding: '2px 7px',
          fontSize: '0.72rem',
          cursor: enrichingSection ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          opacity: (enrichingSection && !isThisEnriching) ? 0.5 : 1
        }}
      >
        <Sparkles size={11} style={{ animation: isThisEnriching ? 'spin 1s linear infinite' : 'none' }} />
        {isThisSuccess ? 'Đã nạp!' : isThisEnriching ? 'Đang nạp...' : label}
      </button>
    );
  };

  return (
    <div className="knowledge-card vocabulary-card-modern enriched-tabbed-view animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ marginTop: '0px', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface-color)', boxShadow: 'var(--shadow-sm)', height: '100%', width: '100%', minWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flex: 1 }}>
      
      {/* Mini header for context details */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-hover)', gap: '8px', flexWrap: 'wrap', flexShrink: 0, width: '100%', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {displayData.onReading && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              🔊 Âm On: <strong style={{ color: '#ef4444' }}>{displayData.onReading}</strong>
            </span>
          )}
          {displayData.kunReading && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              🍃 Âm Kun: <strong style={{ color: '#10b981' }}>{displayData.kunReading}</strong>
            </span>
          )}
          {!displayData.onReading && !displayData.kunReading && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              🗣️ Phiên âm: <strong style={{ color: 'var(--accent-color)' }}>{displayData.pitchAccent || 'Chưa cập nhật'}</strong>
            </span>
          )}
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            🈴 Hán Việt: {displayData.hanViet ? (
              <strong style={{ color: 'var(--warning-color)', textTransform: 'uppercase' }}>{displayData.hanViet}</strong>
            ) : (
              <em style={{ color: 'var(--text-muted)' }}>(Chưa có)</em>
            )}
            {isAdmin && <AdminAiEnrichSectionBtn section="hanViet" label="AI Hán Việt" />}
          </span>
          {isAdmin && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <AdminAiEnrichSectionBtn section="header" label="AI nạp gốc" />
              <AdminEditBtn 
                section="header" 
                label="Sửa thông tin gốc"
                onClick={() => startEditing('header', {
                  kanji: displayData.kanji || '',
                  hiragana: displayData.hiragana || '',
                  meaning: displayData.meaning || '',
                  hanViet: displayData.hanViet || '',
                  pitchAccent: displayData.pitchAccent || '',
                  onReading: displayData.onReading || '',
                  kunReading: displayData.kunReading || '',
                  wordType: displayData.wordType || ''
                })}
              />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAdmin && displayData?.id && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReEnrich}
              disabled={isCurrentlyCallingAi}
              title={isCurrentlyCallingAi ? "AI đang trong quá trình nạp dữ liệu ngầm..." : "Gọi lại DeepSeek AI để bổ sung/tải lại dữ liệu bị thiếu"}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: reEnrichSuccess ? '#10b981' : '#f59e0b',
                borderColor: reEnrichSuccess ? '#10b981' : '#f59e0b',
                backgroundColor: reEnrichSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                fontWeight: '600',
                cursor: isCurrentlyCallingAi ? 'not-allowed' : 'pointer',
                opacity: isCurrentlyCallingAi ? 0.75 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkles size={13} style={{ animation: isCurrentlyCallingAi ? 'spin 1s linear infinite' : 'none' }} />
              {isCurrentlyCallingAi ? '⚡ Đang gọi DeepSeek...' : reEnrichSuccess ? 'Đã làm giàu!' : 'Nạp lại dữ liệu AI'}
            </button>
          )}
          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', fontWeight: '600' }}>
            {displayData.wordType || 'Từ vựng'}
          </span>
        </div>
      </div>

      {/* Admin Inline Header Editor Modal / Panel */}
      {editingSection === 'header' && (
        <div style={{ padding: '14px 16px', background: 'var(--surface-color)', borderBottom: '2px solid var(--accent-color)', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.9rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit3 size={15} /> Chỉnh sửa thông tin cơ bản của từ vựng
            </strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Từ Kanji / Từ chính</label>
              <input 
                type="text" 
                value={editDraft.kanji || ''} 
                onChange={(e) => setEditDraft(prev => ({ ...prev, kanji: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Cách đọc Hiragana / Kana</label>
              <input 
                type="text" 
                value={editDraft.hiragana || ''} 
                onChange={(e) => setEditDraft(prev => ({ ...prev, hiragana: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Nghĩa tiếng Việt</label>
              <input 
                type="text" 
                value={editDraft.meaning || ''} 
                onChange={(e) => setEditDraft(prev => ({ ...prev, meaning: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Âm Hán Việt (VIẾT HOA)</label>
              <input 
                type="text" 
                value={editDraft.hanViet || ''} 
                onChange={(e) => setEditDraft(prev => ({ ...prev, hanViet: e.target.value.toUpperCase() }))}
                placeholder="VD: GIÁN CÁCH, THỰC SỰ"
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.88rem', textTransform: 'uppercase' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Trọng âm (Pitch Accent)</label>
              <input 
                type="text" 
                value={editDraft.pitchAccent || ''} 
                onChange={(e) => setEditDraft(prev => ({ ...prev, pitchAccent: e.target.value }))}
                placeholder="VD: [0] hoặc [1]"
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Âm On (Katakana)</label>
              <input 
                type="text" 
                value={editDraft.onReading || ''} 
                onChange={(e) => setEditDraft(prev => ({ ...prev, onReading: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Âm Kun (Hiragana)</label>
              <input 
                type="text" 
                value={editDraft.kunReading || ''} 
                onChange={(e) => setEditDraft(prev => ({ ...prev, kunReading: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Loại từ (Word Type)</label>
              <input 
                type="text" 
                value={editDraft.wordType || ''} 
                onChange={(e) => setEditDraft(prev => ({ ...prev, wordType: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button 
              type="button" 
              onClick={cancelEditing} 
              disabled={savingEdit}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <X size={13} /> Hủy
            </button>
            <button 
              type="button" 
              onClick={() => saveEditing(editDraft)} 
              disabled={savingEdit}
              style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Check size={14} /> {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card-nav-tabs hide-scrollbar" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color)', overflowY: 'hidden', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0, width: '100%', boxSizing: 'border-box' }}>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'core' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setActiveCardTab('core'); }}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeCardTab === 'core' ? '2px solid var(--accent-color)' : '2px solid transparent', color: activeCardTab === 'core' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'color 0.2s ease, border-color 0.2s ease' }}
        >
          <span>📖</span> Cốt lõi & Ghi nhớ
        </button>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'context' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setActiveCardTab('context'); }}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeCardTab === 'context' ? '2px solid var(--accent-color)' : '2px solid transparent', color: activeCardTab === 'context' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'color 0.2s ease, border-color 0.2s ease' }}
        >
          <span>📝</span> Ngữ cảnh & Ví dụ
        </button>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'practice' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setActiveCardTab('practice'); }}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeCardTab === 'practice' ? '2px solid var(--accent-color)' : '2px solid transparent', color: activeCardTab === 'practice' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'color 0.2s ease, border-color 0.2s ease' }}
        >
          <span>✍️</span> Luyện tập & Lưu ý
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px', flex: 1, height: 0, overflowY: 'scroll', scrollbarGutter: 'stable', textAlign: 'left', width: '100%', boxSizing: 'border-box' }} className="custom-scrollbar">
        
        {/* TAB 1: CORE & MEMORY */}
        {activeCardTab === 'core' && (
          <div className="card-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
            
            {/* 1. Hướng dẫn sử dụng & Trường hợp dùng */}
            <div style={{ padding: '12px 14px', background: 'rgba(37,99,235,0.06)', borderRadius: '10px', border: '1px solid rgba(37,99,235,0.18)', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📌 Hướng dẫn sử dụng & Trường hợp dùng
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AdminAiEnrichSectionBtn section="usageGuide" label="AI nạp" />
                  <AdminEditBtn 
                    section="usageGuide"
                    onClick={() => startEditing('usageGuide', { usageGuide: displayData.usageGuide || '' })}
                  />
                </div>
              </div>

              {editingSection === 'usageGuide' ? (
                <div style={{ marginTop: '8px' }}>
                  <textarea 
                    value={editDraft.usageGuide || ''} 
                    onChange={(e) => setEditDraft({ usageGuide: e.target.value })}
                    rows={4}
                    placeholder="Nhập hướng dẫn sử dụng và sắc thái nghĩa bằng tiếng Việt..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--accent-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.5, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                    <button type="button" onClick={cancelEditing} disabled={savingEdit} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>Hủy</button>
                    <button type="button" onClick={() => saveEditing({ usageGuide: editDraft.usageGuide })} disabled={savingEdit} style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>{savingEdit ? 'Đang lưu...' : 'Lưu'}</button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                  {displayData.usageGuide || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có hướng dẫn sử dụng</span>}
                </p>
              )}
            </div>

            {/* 2. Mẹo nhớ từ (Mnemonic) */}
            <div style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '600' }}>
                  💡 Mẹo nhớ từ (Mnemonic)
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AdminAiEnrichSectionBtn section="mnemonic" label="AI nạp" />
                  <AdminEditBtn 
                    section="mnemonic"
                    onClick={() => startEditing('mnemonic', { mnemonic: displayData.mnemonic || '' })}
                  />
                </div>
              </div>

              {editingSection === 'mnemonic' ? (
                <div style={{ marginTop: '8px' }}>
                  <textarea 
                    value={editDraft.mnemonic || ''} 
                    onChange={(e) => setEditDraft({ mnemonic: e.target.value })}
                    rows={3}
                    placeholder="Nhập mẹo nhớ từ vựng bằng tiếng Việt..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--accent-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.5, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                    <button type="button" onClick={cancelEditing} disabled={savingEdit} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>Hủy</button>
                    <button type="button" onClick={() => saveEditing({ mnemonic: editDraft.mnemonic })} disabled={savingEdit} style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>{savingEdit ? 'Đang lưu...' : 'Lưu'}</button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {displayData.mnemonic || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có mẹo nhớ</span>}
                </p>
              )}
            </div>

            {/* 3. Các từ ghép liên quan (Kanji Words) */}
            <div style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '600' }}>
                  🔍 Các từ ghép liên quan
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AdminAiEnrichSectionBtn section="kanjiWords" label="AI nạp" />
                  <AdminEditBtn 
                    section="kanjiWords"
                    onClick={() => startEditing('kanjiWords', { list: [...kanjiWords] })}
                  />
                </div>
              </div>

              {editingSection === 'kanjiWords' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(editDraft.list || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Từ ghép" 
                        value={item.word || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], word: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ flex: 1.2, padding: '5px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Cách đọc" 
                        value={item.reading || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], reading: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ flex: 1, padding: '5px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Nghĩa tiếng Việt" 
                        value={item.meaning || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], meaning: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ flex: 2, padding: '5px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const updatedList = editDraft.list.filter((_, i) => i !== idx);
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setEditDraft(prev => ({ list: [...(prev.list || []), { word: '', reading: '', meaning: '' }] }))}
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px dashed var(--accent-color)', color: 'var(--accent-color)', borderRadius: '5px', padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer', marginTop: '4px' }}
                  >
                    <Plus size={13} /> Thêm từ ghép
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
                    <button type="button" onClick={cancelEditing} disabled={savingEdit} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>Hủy</button>
                    <button type="button" onClick={() => saveEditing({ kanjiWords: JSON.stringify(editDraft.list || []) })} disabled={savingEdit} style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>{savingEdit ? 'Đang lưu...' : 'Lưu'}</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {kanjiWords.length > 0 ? (
                    kanjiWords.map((k, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '1rem', gap: '8px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px', width: '100%', boxSizing: 'border-box' }}>
                        <span className="font-jp" style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.25rem' }}>{k.word}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>({k.reading})</span>
                        <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{k.meaning}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>Chưa có từ ghép liên quan</span>
                  )}
                </div>
              )}
            </div>

            {/* 4. Đồng nghĩa & Trái nghĩa */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: '10px', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>🔗 Từ đồng nghĩa & Trái nghĩa</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AdminAiEnrichSectionBtn section="synonymsAntonyms" label="AI nạp" />
                  <AdminEditBtn 
                    section="synonymsAntonyms"
                    onClick={() => startEditing('synonymsAntonyms', {
                      synonymsStr: synonyms.join(', '),
                      antonymsStr: antonyms.join(', ')
                    })}
                  />
                </div>
              </div>

              {editingSection === 'synonymsAntonyms' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>🟢 Từ đồng nghĩa (phân cách bằng dấu phẩy)</label>
                    <input 
                      type="text" 
                      value={editDraft.synonymsStr || ''} 
                      onChange={(e) => setEditDraft(prev => ({ ...prev, synonymsStr: e.target.value }))}
                      placeholder="VD: いい, 素晴らしい"
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>🔴 Từ trái nghĩa (phân cách bằng dấu phẩy)</label>
                    <input 
                      type="text" 
                      value={editDraft.antonymsStr || ''} 
                      onChange={(e) => setEditDraft(prev => ({ ...prev, antonymsStr: e.target.value }))}
                      placeholder="VD: 悪い, 下手"
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                    <button type="button" onClick={cancelEditing} disabled={savingEdit} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>Hủy</button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const synList = (editDraft.synonymsStr || '').split(',').map(s => s.trim()).filter(Boolean);
                        const antList = (editDraft.antonymsStr || '').split(',').map(s => s.trim()).filter(Boolean);
                        saveEditing({
                          synonyms: JSON.stringify(synList),
                          antonyms: JSON.stringify(antList)
                        });
                      }} 
                      disabled={savingEdit} 
                      style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      {savingEdit ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>🟢 Đồng nghĩa</h5>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {synonyms.length > 0 ? (
                        synonyms.map(s => <span key={s} className="font-jp" style={{ fontSize: '0.78rem', padding: '2px 8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}>{s}</span>)
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>Chưa có từ đồng nghĩa</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>🔴 Trái nghĩa</h5>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {antonyms.length > 0 ? (
                        antonyms.map(a => <span key={a} className="font-jp" style={{ fontSize: '0.78rem', padding: '2px 8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}>{a}</span>)
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>Chưa có từ trái nghĩa</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: CONTEXT & EXAMPLES */}
        {activeCardTab === 'context' && (
          <div className="card-tab-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
            
            {/* 1. Câu ví dụ mẫu (Example Sentences) */}
            <div style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '600' }}>
                  📝 Câu ví dụ mẫu
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AdminAiEnrichSectionBtn section="exampleSentences" label="AI nạp" />
                  <AdminEditBtn 
                    section="exampleSentences"
                    onClick={() => startEditing('exampleSentences', {
                      list: exampleSentences.length > 0 
                        ? [...exampleSentences] 
                        : (displayData.sampleSentence ? [{ ja: displayData.sampleSentence, reading: displayData.sampleReading || '', vi: displayData.sampleTranslation || '' }] : [])
                    })}
                  />
                </div>
              </div>

              {editingSection === 'exampleSentences' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(editDraft.list || []).map((ex, idx) => (
                    <div key={idx} style={{ padding: '8px 10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-color)' }}>Ví dụ #{idx + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const updatedList = editDraft.list.filter((_, i) => i !== idx);
                            setEditDraft({ list: updatedList });
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Câu tiếng Nhật (JA)" 
                        value={ex.ja || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], ja: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Cách đọc Hiragana / Romaji" 
                        value={ex.reading || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], reading: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Dịch nghĩa tiếng Việt (VI)" 
                        value={ex.vi || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], vi: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setEditDraft(prev => ({ list: [...(prev.list || []), { ja: '', reading: '', vi: '' }] }))}
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px dashed var(--accent-color)', color: 'var(--accent-color)', borderRadius: '5px', padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    <Plus size={13} /> Thêm câu ví dụ
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                    <button type="button" onClick={cancelEditing} disabled={savingEdit} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>Hủy</button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const list = editDraft.list || [];
                        saveEditing({
                          exampleSentences: JSON.stringify(list),
                          sampleSentence: list[0]?.ja || '',
                          sampleReading: list[0]?.reading || '',
                          sampleTranslation: list[0]?.vi || ''
                        });
                      }} 
                      disabled={savingEdit} 
                      style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      {savingEdit ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  {exampleSentences.length > 0 ? (
                    exampleSentences.map((ex, i) => (
                      <div key={i} style={{ padding: '10px 14px', background: 'var(--surface-color)', borderRadius: '6px', borderLeft: '3px solid var(--accent-color)', width: '100%', boxSizing: 'border-box' }}>
                        <div className="font-jp" style={{ fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '0.02em' }}>{ex.ja}</div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '4px', fontStyle: 'italic' }}>{ex.reading}</div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--success-color)', fontWeight: '500' }}>{ex.vi}</div>
                      </div>
                    ))
                  ) : hasOldSentence ? (
                    <div style={{ padding: '10px 14px', background: 'var(--surface-color)', borderRadius: '6px', borderLeft: '3px solid var(--accent-color)', width: '100%', boxSizing: 'border-box' }}>
                      <div className="font-jp" style={{ fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '0.02em' }}>{displayData.sampleSentence}</div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '4px', fontStyle: 'italic' }}>{displayData.sampleReading}</div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--success-color)', fontWeight: '500' }}>{displayData.sampleTranslation}</div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>Chưa có câu ví dụ mẫu</span>
                  )}
                </div>
              )}
            </div>

            {/* 2. Cụm từ hay dùng (Collocations) */}
            <div style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '600' }}>
                  📚 Cụm từ hay dùng (Collocations)
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AdminAiEnrichSectionBtn section="collocations" label="AI nạp" />
                  <AdminEditBtn 
                    section="collocations"
                    onClick={() => startEditing('collocations', { text: collocations.join('\n') })}
                  />
                </div>
              </div>

              {editingSection === 'collocations' ? (
                <div style={{ marginTop: '6px' }}>
                  <textarea 
                    value={editDraft.text || ''} 
                    onChange={(e) => setEditDraft({ text: e.target.value })}
                    rows={4}
                    placeholder="Mỗi cụm từ trên 1 dòng..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--accent-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.5, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                    <button type="button" onClick={cancelEditing} disabled={savingEdit} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>Hủy</button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const list = (editDraft.text || '').split('\n').map(s => s.trim()).filter(Boolean);
                        saveEditing({ collocations: JSON.stringify(list) });
                      }} 
                      disabled={savingEdit} 
                      style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      {savingEdit ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {collocations.length > 0 ? (
                    collocations.map((c, i) => <li key={i}>{c}</li>)
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', paddingLeft: 0, listStyle: 'none' }}>Chưa có cụm từ đi kèm</span>
                  )}
                </ul>
              )}
            </div>

            {/* 3. Hội thoại thực tế (Conversations) */}
            <div style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '600' }}>
                  💬 Hội thoại thực tế
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AdminAiEnrichSectionBtn section="conversations" label="AI nạp" />
                  <AdminEditBtn 
                    section="conversations"
                    onClick={() => startEditing('conversations', { list: [...conversations] })}
                  />
                </div>
              </div>

              {editingSection === 'conversations' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(editDraft.list || []).map((con, idx) => (
                    <div key={idx} style={{ padding: '8px 10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-color)' }}>Hội thoại #{idx + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const updatedList = editDraft.list.filter((_, i) => i !== idx);
                            setEditDraft({ list: updatedList });
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Người A nói (JA)" 
                        value={con.speakerA || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], speakerA: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Dịch câu người A (VI)" 
                        value={con.translationA || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], translationA: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Người B nói (JA)" 
                        value={con.speakerB || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], speakerB: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Dịch câu người B (VI)" 
                        value={con.translationB || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], translationB: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      />
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setEditDraft(prev => ({ list: [...(prev.list || []), { speakerA: '', translationA: '', speakerB: '', translationB: '' }] }))}
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px dashed var(--accent-color)', color: 'var(--accent-color)', borderRadius: '5px', padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    <Plus size={13} /> Thêm đoạn hội thoại
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                    <button type="button" onClick={cancelEditing} disabled={savingEdit} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>Hủy</button>
                    <button 
                      type="button" 
                      onClick={() => saveEditing({ conversationExamples: JSON.stringify(editDraft.list || []) })} 
                      disabled={savingEdit} 
                      style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      {savingEdit ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {conversations.length > 0 ? (
                    conversations.map((con, i) => (
                      <div key={i} style={{ padding: '8px 10px', background: 'var(--surface-color)', borderRadius: '6px', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <strong>A:</strong> {con.speakerA}
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{con.translationA}</div>
                        </div>
                        <div>
                          <strong>B:</strong> {con.speakerB}
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{con.translationB}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>Chưa có đoạn hội thoại thực tế</span>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: PRACTICE & COMMON MISTAKES */}
        {activeCardTab === 'practice' && (
          <div className="card-tab-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '100%', width: '100%', boxSizing: 'border-box' }}>
            
            {/* 1. Lỗi thường gặp (Common Mistakes) */}
            <div style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h5 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--danger-color)', fontWeight: '600' }}>
                  ⚠️ Lỗi thường gặp (Common Mistakes)
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AdminAiEnrichSectionBtn section="commonMistakes" label="AI nạp" />
                  <AdminEditBtn 
                    section="commonMistakes"
                    onClick={() => startEditing('commonMistakes', { list: [...commonMistakes] })}
                  />
                </div>
              </div>

              {editingSection === 'commonMistakes' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(editDraft.list || []).map((m, idx) => (
                    <div key={idx} style={{ padding: '8px 10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--danger-color)' }}>Lỗi sai #{idx + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const updatedList = editDraft.list.filter((_, i) => i !== idx);
                            setEditDraft({ list: updatedList });
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="❌ Lỗi sai học viên hay mắc phải (tiếng Việt/Nhật)" 
                        value={m.error || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], error: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="✅ Cách dùng đúng / sửa lại chuẩn (tiếng Việt)" 
                        value={m.fix || ''} 
                        onChange={(e) => {
                          const updatedList = [...editDraft.list];
                          updatedList[idx] = { ...updatedList[idx], fix: e.target.value };
                          setEditDraft({ list: updatedList });
                        }}
                        style={{ width: '100%', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setEditDraft(prev => ({ list: [...(prev.list || []), { error: '', fix: '' }] }))}
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px dashed var(--danger-color)', color: 'var(--danger-color)', borderRadius: '5px', padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    <Plus size={13} /> Thêm lỗi sai
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                    <button type="button" onClick={cancelEditing} disabled={savingEdit} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>Hủy</button>
                    <button 
                      type="button" 
                      onClick={() => saveEditing({ commonMistakes: JSON.stringify(editDraft.list || []) })} 
                      disabled={savingEdit} 
                      style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      {savingEdit ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {commonMistakes.length > 0 ? (
                    commonMistakes.map((m, idx) => (
                      <div key={idx} style={{ padding: '8px 12px', background: 'var(--surface-color)', borderRadius: '6px', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ color: 'var(--danger-color)', marginBottom: '2px', fontWeight: '500' }}>❌ {m.error}</div>
                        <div style={{ color: 'var(--success-color)', fontWeight: '500' }}>✅ {m.fix}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                      ✨ Chưa có lỗi sai phổ biến nào được ghi nhận cho từ vựng này.
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
