import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Plus, Database, Search, BookOpen, 
  HelpCircle, CheckCircle, RefreshCw, AlertCircle, 
  ChevronRight, Trash2, ArrowRight, FileText, Check,
  MessageSquare, Eye, EyeOff, Award
} from 'lucide-react';
import { knowledgeApi } from '../services/api';
import '../styles/KnowledgeBasePage.css';
import { useLanguage } from '../context/LanguageContext';

export default function KnowledgeBasePage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('collect'); // 'collect' | 'reading' | 'conversation'
  
  // Collect State
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); 

  // Reading State
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingData, setReadingData] = useState(null);
  const [showReadingKana, setShowReadingKana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState('');
  const [quizChecked, setQuizChecked] = useState(false);

  // Conversation State
  const [convLoading, setConvLoading] = useState(false);
  const [convData, setConvData] = useState(null);

  const handleCollect = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSaveStatus(null);

    try {
      const data = await knowledgeApi.collect(trimmed);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Không thể kết nối đến AI để chuẩn hóa dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaveStatus('saving');
    try {
      await knowledgeApi.save(result.type, result.enrichmentData);
      setSaveStatus('success');
      setInputText('');
      setTimeout(() => {
        setResult(null);
        setSaveStatus(null);
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Lỗi khi lưu thẻ kiến thức.');
      setSaveStatus('error');
    }
  };

  // Generate Reading Passage (Personal Corpus)
  const handleGenerateReading = async () => {
    setReadingLoading(true);
    setReadingData(null);
    setQuizChecked(false);
    setSelectedQuizOption('');
    setShowTranslation(false);
    setShowReadingKana(false);
    setError(null);

    try {
      const data = await knowledgeApi.generateReading();
      setReadingData(data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Không thể tạo bài đọc hiểu lúc này.');
    } finally {
      setReadingLoading(false);
    }
  };

  // Generate Dialogue (Personal Corpus)
  const handleGenerateConversation = async () => {
    setConvLoading(true);
    setConvData(null);
    setError(null);

    try {
      const data = await knowledgeApi.generateConversation();
      setConvData(data);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Không thể tạo đoạn hội thoại lúc này.');
    } finally {
      setConvLoading(false);
    }
  };

  const parseJsonList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  };

  return (
    <div className="kb-container animate-fade-in">
      <div className="kb-header-section">
        <div className="kb-title-block">
          <Database className="kb-header-icon" size={32} />
          <div>
            <h1>AI Personal Knowledge Base</h1>
            <p className="kb-subtitle">
              Chuẩn hóa và kiến tạo mạng lưới tri thức cá nhân hóa lâu dài bằng AI.
            </p>
          </div>
        </div>

        <div className="kb-tabs">
          <button 
            className={`kb-tab-btn ${activeTab === 'collect' ? 'active' : ''}`}
            onClick={() => setActiveTab('collect')}
          >
            <Sparkles size={15} />
            Làm giàu kiến thức
          </button>
          <button 
            className={`kb-tab-btn ${activeTab === 'reading' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('reading');
              setError(null);
            }}
          >
            <BookOpen size={15} />
            Đọc hiểu cá nhân hóa
          </button>
          <button 
            className={`kb-tab-btn ${activeTab === 'conversation' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('conversation');
              setError(null);
            }}
          >
            <MessageSquare size={15} />
            Hội thoại ứng dụng
          </button>
        </div>
      </div>

      <div className="kb-content-body">
        {error && (
          <div className="kb-error-box animate-fade-in" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: COLLECT & ENRICH */}
        {activeTab === 'collect' && (
          <div className="kb-collect-grid">
            <div className="kb-input-card glass-panel">
              <div className="kb-card-header">
                <h2>1. Nhập kiến thức mới học</h2>
                <p>AI hỗ trợ chuẩn hóa Romaji, Kana, chữ Kanji viết sai, hoặc nghĩa tiếng Việt.</p>
              </div>

              <form onSubmit={handleCollect} className="kb-form">
                <div className="kb-input-wrapper">
                  <textarea
                    className="kb-textarea"
                    placeholder="Ví dụ: hazukashii, ショクジ, 将來, ように, xấu hổ..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={4}
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCollect();
                      }
                    }}
                  />
                  <div className="kb-input-tips">
                    <span className="kb-tip">💡 Nhấn Enter để gửi đi nhanh</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-kb-submit" 
                  disabled={loading || !inputText.trim()}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Đang phân tích & làm giàu...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      AI Normalize & Enrich
                    </>
                  )}
                </button>
              </form>

              <div className="kb-demo-suggestions">
                <h3>Thử nhập các gợi ý sau:</h3>
                <div className="kb-suggestions-list">
                  {['hazukashii', 'ショクジ', 'ように', 'xấu hổ'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      className="kb-sug-chip"
                      onClick={() => setInputText(sug)}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="kb-preview-container">
              {loading && (
                <div className="kb-preview-skeleton glass-panel">
                  <div className="skeleton-avatar animate-pulse" />
                  <div className="skeleton-line w-3/4 animate-pulse" />
                  <div className="skeleton-line w-1/2 animate-pulse" />
                  <div className="skeleton-line w-5/6 animate-pulse" />
                  <p className="skeleton-text">AI đang đọc dữ liệu, phân tích Kanji và tổng hợp các ví dụ học tập cho bạn...</p>
                </div>
              )}

              {!loading && !result && (
                <div className="kb-preview-empty glass-panel">
                  <BookOpen size={48} className="empty-icon" />
                  <h3>Xem trước thẻ kiến thức (Knowledge Card)</h3>
                  <p>Sau khi AI xử lý xong đầu vào của bạn, thẻ kiến thức chi tiết (Obsidian + Anki style) sẽ được tạo lập tại đây.</p>
                </div>
              )}

              {!loading && result && (
                <div className="kb-card-preview animate-fade-in glass-panel">
                  <div className={`kb-status-banner ${result.existsInDb ? 'exists' : 'new'}`}>
                    {result.existsInDb ? (
                      <>
                        <AlertCircle size={16} />
                        Đã tồn tại trong Database (Lưu đè sẽ kích hoạt tự động Versioning)
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Kiến thức mới phát hiện! Sẵn sàng tạo thẻ.
                      </>
                    )}
                  </div>

                  <div className="knowledge-card-wrapper">
                    {result.type === 'grammar' ? (
                      <GrammarCardPreview data={result.enrichmentData} parseList={parseJsonList} />
                    ) : (
                      <VocabularyCardPreview data={result.enrichmentData} parseList={parseJsonList} />
                    )}
                  </div>

                  <div className="kb-preview-actions">
                    <button
                      className="btn-kb-save"
                      onClick={handleSave}
                      disabled={saveStatus === 'saving' || saveStatus === 'success'}
                    >
                      {saveStatus === 'saving' && (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          Đang lưu...
                        </>
                      )}
                      {saveStatus === 'success' && (
                        <>
                          <Check size={16} />
                          Đã lưu thành công!
                        </>
                      )}
                      {!saveStatus && (
                        <>
                          <Plus size={16} />
                          Lưu vào kho tri thức cá nhân
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL READING */}
        {activeTab === 'reading' && (
          <div className="kb-reading-workspace glass-panel">
            <div className="workspace-header">
              <div>
                <h2>Luyện đọc hiểu cá nhân hóa (Personal Corpus)</h2>
                <p>AI biên soạn một đoạn văn tiếng Nhật độc quyền, ưu tiên tối đa sử dụng các từ vựng & ngữ pháp bạn đã lưu học trước đó.</p>
              </div>
              <button 
                className="btn-kb-generate" 
                onClick={handleGenerateReading}
                disabled={readingLoading}
              >
                {readingLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Đang kiến tạo bài đọc...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Kiến tạo bài đọc mới
                  </>
                )}
              </button>
            </div>

            {readingLoading && (
              <div className="kb-loading-box">
                <div className="skeleton-line w-full animate-pulse" />
                <div className="skeleton-line w-3/4 animate-pulse" />
                <div className="skeleton-line w-5/6 animate-pulse" />
                <p className="loading-sub">AI đang quét lịch sử học tập của bạn để xây dựng ngữ cảnh bài đọc...</p>
              </div>
            )}

            {!readingLoading && !readingData && (
              <div className="workspace-empty-state">
                <FileText size={48} className="empty-icon" />
                <h3>Chưa có bài đọc</h3>
                <p>Hãy nhấn nút "Kiến tạo bài đọc mới" bên trên để AI quét kho từ vựng và ngữ pháp đã thuộc của bạn và soạn bài đọc.</p>
              </div>
            )}

            {!readingLoading && readingData && (
              <div className="reading-content-area animate-fade-in">
                <div className="reading-passage-card">
                  <div className="reading-card-header">
                    <h3>
                      <span className="reading-icon">📖</span>
                      {showReadingKana ? readingData.titleReading : readingData.title}
                    </h3>
                    <div className="reading-controls">
                      <button 
                        className={`btn-control-chip ${showReadingKana ? 'active' : ''}`}
                        onClick={() => setShowReadingKana(!showReadingKana)}
                      >
                        {showReadingKana ? 'Chữ Kanji' : 'Furigana'}
                      </button>
                      <button 
                        className="btn-control-chip"
                        onClick={() => setShowTranslation(!showTranslation)}
                      >
                        {showTranslation ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showTranslation ? 'Ẩn nghĩa' : 'Xem nghĩa'}
                      </button>
                    </div>
                  </div>

                  <div className="reading-passage-text font-jp">
                    {showReadingKana ? readingData.passageReading : readingData.passage}
                  </div>

                  {showTranslation && (
                    <div className="reading-translation-box animate-fade-in">
                      <h4>🇻🇳 Bản dịch tiếng Việt:</h4>
                      <p>{readingData.translation}</p>
                    </div>
                  )}
                </div>

                {/* Reading Quiz */}
                {readingData.quiz && (
                  <div className="reading-quiz-card">
                    <div className="quiz-header">
                      <Award size={18} className="quiz-icon" />
                      <h4>Kiểm tra đọc hiểu (Quiz)</h4>
                    </div>
                    <p className="quiz-question-text">{readingData.quiz.question}</p>

                    <div className="quiz-options-grid">
                      {readingData.quiz.options && readingData.quiz.options.map((opt, i) => (
                        <button
                          key={i}
                          className={`quiz-option-btn ${selectedQuizOption === opt ? 'selected' : ''}`}
                          onClick={() => {
                            if (!quizChecked) setSelectedQuizOption(opt);
                          }}
                          disabled={quizChecked}
                        >
                          <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                          {opt}
                        </button>
                      ))}
                    </div>

                    {!quizChecked && (
                      <div className="quiz-check-row">
                        <button
                          className="btn-quiz-check"
                          onClick={() => setQuizChecked(true)}
                          disabled={!selectedQuizOption}
                        >
                          Kiểm tra đáp án
                        </button>
                      </div>
                    )}

                    {quizChecked && (
                      <div className={`quiz-feedback-box animate-fade-in ${selectedQuizOption === readingData.quiz.answer ? 'correct' : 'incorrect'}`}>
                        <div className="feedback-result">
                          {selectedQuizOption === readingData.quiz.answer ? (
                            <>🎉 Chính xác! Đáp án đúng là: <strong>{readingData.quiz.answer}</strong></>
                          ) : (
                            <>❌ Sai rồi! Đáp án đúng phải là: <strong>{readingData.quiz.answer}</strong></>
                          )}
                        </div>
                        <p className="feedback-explanation">
                          <strong>Giải thích:</strong> {readingData.quiz.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PERSONAL CONVERSATION */}
        {activeTab === 'conversation' && (
          <div className="kb-conv-workspace glass-panel">
            <div className="workspace-header">
              <h2>Hội thoại ứng dụng thực tế</h2>
              <button 
                className="btn-kb-generate" 
                onClick={handleGenerateConversation}
                disabled={convLoading}
              >
                {convLoading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Đang tạo cuộc trò chuyện...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Tạo hội thoại mới
                  </>
                )}
              </button>
            </div>

            {convLoading && (
              <div className="kb-loading-box">
                <div className="skeleton-line w-full animate-pulse" />
                <div className="skeleton-line w-5/6 animate-pulse" />
                <p className="loading-sub">AI đang biên soạn hội thoại đàm thoại...</p>
              </div>
            )}

            {!convLoading && !convData && (
              <div className="workspace-empty-state">
                <MessageSquare size={48} className="empty-icon" />
                <h3>Chưa có hội thoại</h3>
                <p>Hãy nhấn nút "Tạo hội thoại mới" bên trên để bắt đầu đàm thoại.</p>
              </div>
            )}

            {!convLoading && convData && (
              <div className="conv-content-area animate-fade-in">
                <div className="conv-scenario-box">
                  <strong>📍 Bối cảnh:</strong> {convData.scenario}
                </div>

                <div className="conv-dialogues-chat">
                  {convData.dialogues && convData.dialogues.map((dialog, idx) => (
                    <div key={idx} className={`conv-bubble-row ${dialog.speaker === 'A' ? 'left' : 'right'}`}>
                      <div className="conv-speaker-avatar">
                        {dialog.speaker}
                      </div>
                      <div className="conv-bubble-content">
                        <div className="conv-text-ja font-jp">{dialog.ja}</div>
                        <div className="conv-text-reading">{dialog.reading}</div>
                        <div className="conv-text-vi">{dialog.vi}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────── VOCABULARY CARD PREVIEW COMPONENT ────────── */
function VocabularyCardPreview({ data, parseList }) {
  const synonyms = parseList(data.synonyms);
  const antonyms = parseList(data.antonyms);
  const collocations = parseList(data.collocations);
  const kanjiWords = parseList(data.kanjiWords);
  const exampleSentences = parseList(data.exampleSentences);
  const commonMistakes = parseList(data.commonMistakes);
  const conversations = parseList(data.conversationExamples);

  return (
    <div className="knowledge-card vocabulary-card">
      <div className="card-badge-row">
        <span className="card-badge type-badge">{data.wordType || 'Vocabulary'}</span>
        <span className="card-badge level-badge">{data.jlpt || 'JLPT'}</span>
      </div>

      <div className="card-main-header">
        <div className="card-primary-title">
          <ruby>
            {data.word} <rt>{data.reading}</rt>
          </ruby>
        </div>
        <div className="card-pitch">
          🗣️ Trọng âm: <span>{data.pitchAccent || 'Chưa cập nhật'}</span>
        </div>
        <div className="card-meaning-title">
          Ý nghĩa: <strong>{data.meaning}</strong>
        </div>
      </div>

      <hr className="card-divider" />

      {data.mnemonic && (
        <div className="card-section mnemonic-section">
          <h4>💡 Mẹo nhớ từ (Mnemonic)</h4>
          <p>{data.mnemonic}</p>
        </div>
      )}

      {kanjiWords.length > 0 && (
        <div className="card-section">
          <h4>🔍 Các từ ghép liên quan</h4>
          <div className="kanji-words-list">
            {kanjiWords.map((k, idx) => (
              <div key={idx} className="kanji-word-item">
                <span className="k-word">{k.word}</span>
                <span className="k-read">({k.reading})</span>
                <span className="k-arrow"><ArrowRight size={12} /></span>
                <span className="k-mean">{k.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(synonyms.length > 0 || antonyms.length > 0) && (
        <div className="card-section relation-section">
          {synonyms.length > 0 && (
            <div>
              <h4>🟢 Đồng nghĩa (Synonyms)</h4>
              <div className="chips-list">
                {synonyms.map(s => <span key={s} className="chip syn-chip">{s}</span>)}
              </div>
            </div>
          )}
          {antonyms.length > 0 && (
            <div>
              <h4>🔴 Trái nghĩa (Antonyms)</h4>
              <div className="chips-list">
                {antonyms.map(a => <span key={a} className="chip ant-chip">{a}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {collocations.length > 0 && (
        <div className="card-section collocations-section">
          <h4>📚 Cụm từ hay dùng (Collocations)</h4>
          <ul>
            {collocations.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {commonMistakes.length > 0 && (
        <div className="card-section mistakes-section">
          <h4>⚠️ Lỗi thường gặp (Common Mistakes)</h4>
          {commonMistakes.map((m, idx) => (
            <div key={idx} className="mistake-item">
              <div className="mistake-error">❌ {m.error}</div>
              <div className="mistake-fix">✅ {m.fix}</div>
            </div>
          ))}
        </div>
      )}

      {exampleSentences.length > 0 && (
        <div className="card-section examples-section">
          <h4>📝 Câu ví dụ mẫu (Examples)</h4>
          <div className="examples-list">
            {exampleSentences.map((ex, i) => (
              <div key={i} className="example-item">
                <div className="example-ja">{ex.ja}</div>
                <div className="example-reading">{ex.reading}</div>
                <div className="example-vi">{ex.vi}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {conversations.length > 0 && (
        <div className="card-section conversations-section">
          <h4>💬 Hội thoại ứng dụng thực tế</h4>
          <div className="conversations-list">
            {conversations.map((con, i) => (
              <div key={i} className="dialogue-block">
                <div className="dialogue-line">
                  <strong>A:</strong> {con.speakerA}
                  <div className="dialogue-translation">{con.translationA}</div>
                </div>
                <div className="dialogue-line">
                  <strong>B:</strong> {con.speakerB}
                  <div className="dialogue-translation">{con.translationB}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────── GRAMMAR CARD PREVIEW COMPONENT ────────── */
function GrammarCardPreview({ data, parseList }) {
  const similarGrammar = parseList(data.similarGrammar);
  const commonMistakes = parseList(data.commonMistakes);
  const examples = parseList(data.examples);
  const quizzes = parseList(data.quizzes);

  return (
    <div className="knowledge-card grammar-card">
      <div className="card-badge-row">
        <span className="card-badge type-badge grammar">Grammar</span>
        <span className="card-badge level-badge">{data.jlpt || 'JLPT'}</span>
      </div>

      <div className="card-main-header">
        <div className="card-primary-title font-jp">{data.grammar}</div>
        <div className="card-meaning-title">
          Ý nghĩa: <strong>{data.meaning}</strong>
        </div>
      </div>

      <hr className="card-divider" />

      <div className="card-section formation-section">
        <h4>📐 Cách kết hợp cấu trúc (Formation)</h4>
        <div className="formation-box font-jp">{data.formation}</div>
        {data.usageDesc && (
          <div className="usage-desc">
            <strong>Mô tả cách dùng:</strong> {data.usageDesc}
          </div>
        )}
      </div>

      {examples.length > 0 && (
        <div className="card-section examples-section">
          <h4>📝 Câu ví dụ mẫu (Examples)</h4>
          <div className="examples-list">
            {examples.map((ex, i) => (
              <div key={i} className="example-item">
                <div className="example-ja">{ex.ja}</div>
                <div className="example-reading">{ex.reading}</div>
                <div className="example-vi">{ex.vi}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.readingPassage && (
        <div className="card-section reading-passage-section">
          <h4>📖 Đoạn văn đọc hiểu ứng dụng</h4>
          <div className="reading-passage-box">
            <p>{data.readingPassage}</p>
          </div>
        </div>
      )}

      {similarGrammar.length > 0 && (
        <div className="card-section relation-section">
          <h4>🆚 Cấu trúc tương tự</h4>
          <div className="chips-list">
            {similarGrammar.map(s => <span key={s} className="chip syn-chip">{s}</span>)}
          </div>
          {data.difference && (
            <div className="difference-box">
              <strong>Phân biệt & điểm khác biệt:</strong>
              <p>{data.difference}</p>
            </div>
          )}
        </div>
      )}

      {commonMistakes.length > 0 && (
        <div className="card-section mistakes-section">
          <h4>⚠️ Lỗi thường gặp (Common Mistakes)</h4>
          {commonMistakes.map((m, idx) => (
            <div key={idx} className="mistake-item">
              <div className="mistake-error">❌ {m.error}</div>
              <div className="mistake-fix">✅ {m.fix}</div>
            </div>
          ))}
        </div>
      )}

      {quizzes.length > 0 && (
        <div className="card-section quizzes-section">
          <h4>✍️ Bài kiểm tra nhanh (Quick Quiz)</h4>
          {quizzes.map((q, idx) => (
            <div key={idx} className="quiz-preview-item">
              <div className="quiz-question">Q: {q.question}</div>
              <div className="quiz-options-list">
                {q.options && q.options.map((opt, i) => (
                  <span key={i} className="quiz-opt-chip">{opt}</span>
                ))}
              </div>
              <div className="quiz-ans-exp">
                <span>🔑 Đáp án đúng: <strong>{q.answer}</strong></span>
                <p>💡 {q.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
