import { ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vocabApi } from '../services/api';

export default function AiEnrichedTabbedView({ data, onReEnriched }) {
  const { user } = useAuth();
  const [activeCardTab, setActiveCardTab] = useState('core');
  const [reEnriching, setReEnriching] = useState(false);
  const [reEnrichSuccess, setReEnrichSuccess] = useState(false);
  const [localData, setLocalData] = useState(null);

  // Reset localData if parent data changes
  useEffect(() => {
    setLocalData(null);
  }, [data?.id]);

  if (!data) return null;

  const displayData = localData || data;

  const isAdmin = user && (user.username === "admin" || user.role === "ADMIN" || user.roles?.includes("ADMIN") || user.roles?.includes("ROLE_ADMIN"));

  const handleReEnrich = async (e) => {
    if (e) e.stopPropagation();
    if (!displayData || !displayData.id || reEnriching) return;
    setReEnriching(true);
    setReEnrichSuccess(false);

    try {
      const updated = await vocabApi.enrich(displayData.id, true);
      setLocalData(updated);
      setReEnrichSuccess(true);
      if (onReEnriched) {
        onReEnriched(updated);
      }
      setTimeout(() => setReEnrichSuccess(false), 3500);
    } catch (err) {
      console.error("Re-enrichment error:", err);
    } finally {
      setReEnriching(false);
    }
  };

  const parseJsonList = (val) => {
    if (!val) return [];
    if (typeof val !== 'string') return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      // Fallback for simple comma-separated string
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
  };

  const synonyms = parseJsonList(displayData.synonyms);
  const antonyms = parseJsonList(displayData.antonyms);
  const collocations = parseJsonList(displayData.collocations);
  const kanjiWords = parseJsonList(displayData.kanjiWords);
  const exampleSentences = parseJsonList(displayData.exampleSentences);
  const commonMistakes = parseJsonList(displayData.commonMistakes);
  const conversations = parseJsonList(displayData.conversationExamples);

  // Fallback for old style data if exampleSentences is empty but sampleSentence exists
  const hasOldSentence = !exampleSentences.length && displayData.sampleSentence;

  return (
    <div className="knowledge-card vocabulary-card-modern enriched-tabbed-view animate-fade-in" style={{ marginTop: '0px', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface-color)', boxShadow: 'var(--shadow-sm)', minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
      {/* Mini header for context details */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-hover)', gap: '8px' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          🗣️ Phiên âm: <strong style={{ color: 'var(--accent-color)' }}>{displayData.pitchAccent || 'Chưa cập nhật'}</strong>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAdmin && displayData?.id && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReEnrich}
              disabled={reEnriching}
              title="Gọi lại DeepSeek AI để bổ sung/tải lại dữ liệu bị thiếu"
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
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Sparkles size={13} style={{ animation: reEnriching ? 'spin 1s linear infinite' : 'none' }} />
              {reEnriching ? 'Đang gọi DeepSeek...' : reEnrichSuccess ? 'Đã làm giàu!' : 'Nạp lại dữ liệu AI'}
            </button>
          )}
          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', fontWeight: '600' }}>
            {displayData.wordType || 'Từ vựng'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="card-nav-tabs hide-scrollbar" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color)', overflowY: 'hidden', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'core' ? 'active' : ''}`}
          onClick={() => setActiveCardTab('core')}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeCardTab === 'core' ? '2px solid var(--accent-color)' : 'none', color: activeCardTab === 'core' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeCardTab === 'core' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <span>📖</span> Cốt lõi & Ghi nhớ
        </button>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveCardTab('context')}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeCardTab === 'context' ? '2px solid var(--accent-color)' : 'none', color: activeCardTab === 'context' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeCardTab === 'context' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <span>📝</span> Ngữ cảnh & Ví dụ
        </button>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'practice' ? 'active' : ''}`}
          onClick={() => setActiveCardTab('practice')}
          style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: activeCardTab === 'practice' ? '2px solid var(--accent-color)' : 'none', color: activeCardTab === 'practice' ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: activeCardTab === 'practice' ? 'bold' : 'normal', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <span>✍️</span> Luyện tập & Lưu ý
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px', height: '420px', minHeight: '420px', overflowY: 'auto', textAlign: 'left', flex: 1 }} className="custom-scrollbar">
        {activeCardTab === 'core' && (
          <div className="card-tab-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '380px' }}>
            {displayData.usageGuide && (
              <div style={{ padding: '12px 14px', background: 'rgba(37,99,235,0.06)', borderRadius: '10px', border: '1px solid rgba(37,99,235,0.18)' }}>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📌 Hướng dẫn sử dụng & Trường hợp dùng
                </h5>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{displayData.usageGuide}</p>
              </div>
            )}

            {displayData.mnemonic && (
              <div>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '600' }}>💡 Mẹo nhớ từ (Mnemonic)</h5>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{displayData.mnemonic}</p>
              </div>
            )}

            {kanjiWords.length > 0 && (
              <div>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '600' }}>🔍 Các từ ghép liên quan</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {kanjiWords.map((k, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '1rem', gap: '8px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                      <span className="font-jp" style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1.35rem' }}>{k.word}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>({k.reading})</span>
                      <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.98rem' }}>{k.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(synonyms.length > 0 || antonyms.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                {synonyms.length > 0 && (
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>🟢 Đồng nghĩa</h5>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {synonyms.map(s => <span key={s} className="font-jp" style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}>{s}</span>)}
                    </div>
                  </div>
                )}
                {antonyms.length > 0 && (
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>🔴 Trái nghĩa</h5>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {antonyms.map(a => <span key={a} className="font-jp" style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}>{a}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!displayData.mnemonic && kanjiWords.length === 0 && synonyms.length === 0 && antonyms.length === 0 && !displayData.usageGuide && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)', borderRadius: '10px', padding: '20px' }}>
                Không có thêm thông tin cốt lõi nào khác.
              </div>
            )}
          </div>
        )}

        {activeCardTab === 'context' && (
          <div className="card-tab-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '380px' }}>
            {(exampleSentences.length > 0 || hasOldSentence) && (
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '600' }}>📝 Câu ví dụ mẫu</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {exampleSentences.length > 0 ? (
                    exampleSentences.map((ex, i) => (
                       <div key={i} style={{ padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: '6px', borderLeft: '3px solid var(--accent-color)' }}>
                        <div className="font-jp" style={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '0.02em' }}>{ex.ja}</div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '4px', fontStyle: 'italic' }}>{ex.reading}</div>
                        <div style={{ fontSize: '1.02rem', color: 'var(--success-color)', fontWeight: '500' }}>{ex.vi}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: '6px', borderLeft: '3px solid var(--accent-color)' }}>
                      <div className="font-jp" style={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '0.02em' }}>{displayData.sampleSentence}</div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '4px', fontStyle: 'italic' }}>{displayData.sampleReading}</div>
                      <div style={{ fontSize: '1.02rem', color: 'var(--success-color)', fontWeight: '500' }}>{displayData.sampleTranslation}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {collocations.length > 0 && (
              <div>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '600' }}>📚 Cụm từ hay dùng</h5>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {collocations.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {conversations.length > 0 && (
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '600' }}>💬 Hội thoại thực tế</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {conversations.map((con, i) => (
                    <div key={i} style={{ padding: '8px 10px', background: 'var(--surface-hover)', borderRadius: '6px', fontSize: '0.82rem' }}>
                      <div style={{ marginBottom: '6px' }}>
                        <strong>A:</strong> {con.speakerA}
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{con.translationA}</div>
                      </div>
                      <div>
                        <strong>B:</strong> {con.speakerB}
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{con.translationB}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!exampleSentences.length && !hasOldSentence && !collocations.length && !conversations.length && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)', borderRadius: '10px', padding: '20px' }}>
                Không tìm thấy câu ví dụ hoặc ngữ cảnh ứng dụng nào.
              </div>
            )}
          </div>
        )}

        {activeCardTab === 'practice' && (
          <div className="card-tab-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '380px' }}>
            {commonMistakes.length > 0 ? (
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--danger-color)', fontWeight: '600' }}>⚠️ Lỗi thường gặp (Common Mistakes)</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {commonMistakes.map((m, idx) => (
                    <div key={idx} style={{ padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: '6px', fontSize: '0.82rem' }}>
                      <div style={{ color: 'var(--danger-color)', marginBottom: '2px', fontWeight: '500' }}>❌ {m.error}</div>
                      <div style={{ color: 'var(--success-color)', fontWeight: '500' }}>✅ {m.fix}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)', borderRadius: '10px', padding: '20px' }}>
                ✨ Tuyệt vời! Không có lỗi sai phổ biến nào được ghi nhận cho từ vựng này.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
