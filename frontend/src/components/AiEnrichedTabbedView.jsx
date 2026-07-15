import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function AiEnrichedTabbedView({ data }) {
  const [activeCardTab, setActiveCardTab] = useState('core');

  if (!data) return null;

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

  const synonyms = parseJsonList(data.synonyms);
  const antonyms = parseJsonList(data.antonyms);
  const collocations = parseJsonList(data.collocations);
  const kanjiWords = parseJsonList(data.kanjiWords);
  const exampleSentences = parseJsonList(data.exampleSentences);
  const commonMistakes = parseJsonList(data.commonMistakes);
  const conversations = parseJsonList(data.conversationExamples);

  // Fallback for old style data if exampleSentences is empty but sampleSentence exists
  const hasOldSentence = !exampleSentences.length && data.sampleSentence;

  return (
    <div className="knowledge-card vocabulary-card-modern enriched-tabbed-view animate-fade-in" style={{ marginTop: '12px', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', background: 'var(--surface-color)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Mini header for context details */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-hover)' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          🗣️ Trọng âm: <strong style={{ color: 'var(--accent-color)' }}>{data.pitchAccent || 'Chưa cập nhật'}</strong>
        </span>
        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', fontWeight: '600' }}>
          {data.wordType || 'Từ vựng'}
        </span>
      </div>

      {/* Tabs */}
      <div className="card-nav-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-color)' }}>
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
      <div style={{ padding: '14px 16px', maxHeight: '380px', overflowY: 'auto', textAlign: 'left' }} className="hide-scrollbar">
        {activeCardTab === 'core' && (
          <div className="card-tab-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {data.mnemonic && (
              <div>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '600' }}>💡 Mẹo nhớ từ (Mnemonic)</h5>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{data.mnemonic}</p>
              </div>
            )}

            {kanjiWords.length > 0 && (
              <div>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '600' }}>🔍 Các từ ghép liên quan</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {kanjiWords.map((k, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '0.82rem', gap: '6px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px' }}>
                      <span className="font-jp" style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{k.word}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>({k.reading})</span>
                      <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{k.meaning}</span>
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

            {!data.mnemonic && kanjiWords.length === 0 && synonyms.length === 0 && antonyms.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                Không có thêm thông tin cốt lõi nào khác.
              </div>
            )}
          </div>
        )}

        {activeCardTab === 'context' && (
          <div className="card-tab-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(exampleSentences.length > 0 || hasOldSentence) && (
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '600' }}>📝 Câu ví dụ mẫu</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {exampleSentences.length > 0 ? (
                    exampleSentences.map((ex, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: '6px', borderLeft: '3px solid var(--accent-color)' }}>
                        <div className="font-jp" style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{ex.ja}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px', fontStyle: 'italic' }}>{ex.reading}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '500' }}>{ex.vi}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: '6px', borderLeft: '3px solid var(--accent-color)' }}>
                      <div className="font-jp" style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{data.sampleSentence}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px', fontStyle: 'italic' }}>{data.sampleReading}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '500' }}>{data.sampleTranslation}</div>
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
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                Không tìm thấy câu ví dụ hoặc ngữ cảnh ứng dụng nào.
              </div>
            )}
          </div>
        )}

        {activeCardTab === 'practice' && (
          <div className="card-tab-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                ✨ Tuyệt vời! Không có lỗi sai phổ biến nào được ghi nhận cho từ vựng này.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
