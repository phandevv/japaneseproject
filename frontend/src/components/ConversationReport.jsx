import React, { useState, useEffect } from 'react';
import { Check, X, BookOpen, Plus, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function ConversationReport({ conversationId, onClose }) {
  const [report, setReport] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States to keep track of saved/rejected vocabs & grammar cards to display feedback
  const [savedVocabIds, setSavedVocabIds] = useState(new Set());
  const [savedGrammarIds, setSavedGrammarIds] = useState(new Set());
  const [rejectedVocabIds, setRejectedVocabIds] = useState(new Set());
  const [rejectedGrammarIds, setRejectedGrammarIds] = useState(new Set());

  // Mini quiz state
  const [quizAnswers, setQuizAnswers] = useState({}); // idx -> selectedOption
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    // Call REST endpoints in parallel
    Promise.all([
      api.get(`/api/conversations/${conversationId}/report`),
      api.get(`/api/conversations/${conversationId}/corrections`)
    ])
      .then(([reportRes, correctionsRes]) => {
        setReport(reportRes.data);
        setCorrections(correctionsRes.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load conversation report:", err);
        setError("Không thể tải báo cáo. Báo cáo đang được AI tạo ngầm, vui lòng thử lại sau vài giây!");
        setLoading(false);
      });
  }, [conversationId]);

  const handleSaveVocab = async (vocab, idx) => {
    try {
      await api.post('/api/conversations/knowledge/save-vocab', {
        kanji: vocab.word,
        hiragana: vocab.reading,
        meaning: vocab.meaning,
        level: report.jlptLevel || 'N3'
      });
      setSavedVocabIds(prev => new Set([...prev, idx]));
    } catch (e) {
      console.error("Failed to save vocabulary:", e);
      alert("Lỗi khi lưu từ vựng!");
    }
  };

  const handleSaveGrammar = async (gram, idx) => {
    try {
      await api.post('/api/conversations/knowledge/save-grammar', {
        grammar: gram.grammar,
        meaning: gram.meaning,
        usageDesc: gram.example,
        jlpt: report.jlptLevel || 'N3'
      });
      setSavedGrammarIds(prev => new Set([...prev, idx]));
    } catch (e) {
      console.error("Failed to save grammar:", e);
      alert("Lỗi khi lưu ngữ pháp!");
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <RefreshCw className="animate-spin" size={32} style={{ marginBottom: '16px', color: 'var(--accent-color)' }} />
        <p>Đang biên soạn báo cáo & trích xuất tri thức từ buổi hội thoại...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <AlertCircle size={48} style={{ color: 'var(--warning-color)', marginBottom: '16px' }} />
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Thử lại</button>
      </div>
    );
  }

  // Parse recommended items from JSON strings in recommendation object
  let recommendedVocab = [];
  let recommendedGrammar = [];
  let quizzes = [];

  try {
    recommendedVocab = typeof report.recommendedVocab === 'string' ? JSON.parse(report.recommendedVocab) : report.recommendedVocab;
  } catch (e) {}

  try {
    recommendedGrammar = typeof report.recommendedGrammar === 'string' ? JSON.parse(report.recommendedGrammar) : report.recommendedGrammar;
  } catch (e) {}

  try {
    const quizData = typeof report.exerciseQuiz === 'string' ? JSON.parse(report.exerciseQuiz) : report.exerciseQuiz;
    quizzes = quizData?.quizzes || [];
  } catch (e) {}

  return (
    <div style={{ animation: 'slideIn 0.3s ease forwards', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', margin: 0 }}>
            <Award size={28} style={{ color: 'var(--accent-color)' }} /> Báo Cáo Kết Quả Buổi Học
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Kịch bản hội thoại đóng vai đã hoàn thành</p>
        </div>
        <button className="btn btn-secondary" onClick={onClose}>Đóng Báo Cáo</button>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '14px' }}>🎯 Chỉ số Đánh giá (Invisible Layer Analysis)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Độ chính xác Ngữ pháp</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--accent-color)', marginTop: '8px' }}>
              {Math.round((report.grammarScore || 0.85) * 100)}%
            </div>
          </div>
          <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Vốn Từ vựng sử dụng</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--success-color)', marginTop: '8px' }}>
              {Math.round((report.vocabularyScore || 0.80) * 100)}%
            </div>
          </div>
          <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Độ tự nhiên diễn đạt</span>
            <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--warning-color)', marginTop: '8px' }}>
              {Math.round((report.naturalnessScore || 0.75) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* 3. Conversation Summary */}
      <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--accent-color)', fontWeight: '600' }}>📖 Tóm tắt hội thoại</h4>
        <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.95rem' }}>{report.summary || "AI đang tổng kết lại phiên hội thoại..."}</p>
      </div>

      {/* 4. Mistakes & Corrections */}
      <div>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '14px' }}>⚠️ Các lỗi cần lưu ý (Corrections)</h3>
        {corrections.length === 0 ? (
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '12px', padding: '20px', textAlign: 'center', color: 'var(--success-color)' }}>
            ✨ Tuyệt vời! AI không phát hiện lỗi sai nghiêm trọng nào trong lời nói của bạn.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {corrections.map((corr, idx) => (
              <div key={idx} style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--danger-light)', color: 'var(--danger-color)', fontWeight: '600' }}>
                    {corr.type}
                  </span>
                </div>
                <div style={{ color: 'var(--danger-color)', textDecoration: 'line-through', marginBottom: '4px', fontSize: '0.95rem' }}>
                  ❌ {corr.originalText}
                </div>
                <div style={{ color: 'var(--success-color)', fontWeight: '600', marginBottom: '8px', fontSize: '1.05rem' }}>
                  ✅ {corr.correctedText}
                </div>
                {corr.explanation && (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                    💡 <strong>Giải thích:</strong> {corr.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Knowledge Extraction */}
      <div>
        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 Trích xuất Tri thức mới (Knowledge Extraction)
        </h3>
        
        {/* Recommended Vocabulary */}
        {recommendedVocab && recommendedVocab.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>🟢 Từ vựng được phát hiện từ hội thoại</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {recommendedVocab.map((vocab, idx) => (
                <div key={idx} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{vocab.word}</strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>({vocab.reading})</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--success-color)', fontWeight: '500' }}>{vocab.meaning}</p>
                  </div>
                  <div>
                    {savedVocabIds.has(idx) ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Đã lưu
                      </span>
                    ) : rejectedVocabIds.has(idx) ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đã bỏ qua</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn" style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--accent-light)', color: 'var(--accent-color)', border: 'none' }} onClick={() => handleSaveVocab(vocab, idx)}>
                          <Plus size={12} /> Lưu
                        </button>
                        <button className="btn" style={{ padding: '6px 8px', fontSize: '0.75rem', background: 'var(--surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }} onClick={() => setRejectedVocabIds(prev => new Set([...prev, idx]))}>
                          Bỏ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Grammar */}
        {recommendedGrammar && recommendedGrammar.length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>🔵 Cấu trúc ngữ pháp tương ứng</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {recommendedGrammar.map((gram, idx) => (
                <div key={idx} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{gram.grammar}</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--accent-color)' }}>{gram.meaning}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>VD: {gram.example}</p>
                  </div>
                  <div>
                    {savedGrammarIds.has(idx) ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Đã lưu
                      </span>
                    ) : rejectedGrammarIds.has(idx) ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đã bỏ qua</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn" style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--accent-light)', color: 'var(--accent-color)', border: 'none' }} onClick={() => handleSaveGrammar(gram, idx)}>
                          <Plus size={12} /> Lưu
                        </button>
                        <button className="btn" style={{ padding: '6px 8px', fontSize: '0.75rem', background: 'var(--surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }} onClick={() => setRejectedGrammarIds(prev => new Set([...prev, idx]))}>
                          Bỏ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Post-Conversation Review: Mini Quiz */}
      {quizzes && quizzes.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✏️ Mini Quiz thực hành (Tạo từ ngữ cảnh vừa hội thoại)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {quizzes.map((quiz, qIdx) => {
              const selectedOption = quizAnswers[qIdx];
              const isCorrect = selectedOption === quiz.answer;
              return (
                <div key={qIdx} style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ margin: '0 0 14px 0', fontWeight: '600', fontSize: '1.05rem' }}>
                    Câu {qIdx + 1}: {quiz.question}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {quiz.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOption === opt;
                      let btnBg = 'var(--surface-color)';
                      let btnBorder = 'var(--border-color)';
                      let btnColor = 'var(--text-primary)';

                      if (quizSubmitted) {
                        if (opt === quiz.answer) {
                          btnBg = 'var(--success-light)';
                          btnBorder = 'var(--success-color)';
                          btnColor = 'var(--success-color)';
                        } else if (isOptionSelected) {
                          btnBg = 'var(--danger-light)';
                          btnBorder = 'var(--danger-color)';
                          btnColor = 'var(--danger-color)';
                        }
                      } else if (isOptionSelected) {
                        btnBg = 'var(--accent-light)';
                        btnBorder = 'var(--accent-color)';
                        btnColor = 'var(--accent-color)';
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={quizSubmitted}
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: opt }))}
                          style={{
                            padding: '12px',
                            background: btnBg,
                            border: `1px solid ${btnBorder}`,
                            borderRadius: '8px',
                            color: btnColor,
                            textAlign: 'left',
                            cursor: quizSubmitted ? 'default' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: isOptionSelected ? 'bold' : 'normal',
                            transition: 'all 0.2s'
                          }}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizSubmitted && (
                    <div style={{ marginTop: '14px', fontSize: '0.85rem', color: isCorrect ? 'var(--success-color)' : 'var(--danger-color)', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                      <strong>{isCorrect ? "Chính xác!" : `Sai rồi (Đáp án đúng: ${quiz.answer})`}</strong>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        💡 <strong>Giải thích:</strong> {quiz.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {!quizSubmitted ? (
              <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={() => setQuizSubmitted(true)}>
                Nộp bài & Xem giải thích
              </button>
            ) : (
              <button className="btn btn-secondary" style={{ alignSelf: 'flex-end' }} onClick={() => {
                setQuizAnswers({});
                setQuizSubmitted(false);
              }}>
                Làm lại Quiz
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
