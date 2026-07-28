import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle,
  Database,
  Eye, EyeOff,
  FileText,
  FolderHeart,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { knowledgeApi } from '../services/api';
import '../styles/KnowledgeBasePage.css';

export default function KnowledgeBasePage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('collect'); // 'collect' | 'reading' | 'conversation' | 'library'
  
  // Collect State
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); 
  const [fastMode, setFastMode] = useState(true); 

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

  // Library/Saved Cards State
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryVocab, setLibraryVocab] = useState([]);
  const [libraryGrammar, setLibraryGrammar] = useState([]);
  const [librarySubTab, setLibrarySubTab] = useState('vocab'); // 'vocab' | 'grammar'
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLibraryCard, setSelectedLibraryCard] = useState(null); // { type: 'vocab'|'grammar', data: Object }

  const handleCollect = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSaveStatus(null);

    try {
      // Step 1: Fast Core Mode - returns Tab 1 (Core & Memory) data in ~0.3s
      const data = await knowledgeApi.collect(trimmed, true);
      setResult(data);
      setLoading(false); // Unblock UI immediately so Core tab pops up in ~0.3s!

      // Step 2: Background Micro-Enrichment - fetch Tab 2 & Tab 3 rich data asynchronously
      if (data && data.normalizedInput) {
        knowledgeApi.collect(trimmed, false).then(fullData => {
          if (fullData && fullData.enrichmentData) {
            setResult(prev => {
              if (!prev) return fullData;
              return {
                ...prev,
                enrichmentData: {
                  ...prev.enrichmentData,
                  ...fullData.enrichmentData
                }
              };
            });
          }
        }).catch(err => console.log('Background micro-enrichment status:', err));
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Không thể kết nối đến AI để chuẩn hóa dữ liệu.');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaveStatus('saving');
    try {
      const saveData = {
        ...result.enrichmentData,
        isFast: result.isFast || false
      };
      await knowledgeApi.save(result.type, saveData);
      setSaveStatus('success');
      setInputText('');
      setTimeout(() => {
        setResult(null);
        setSaveStatus(null);
      }, 2500);
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

  // Fetch Library Data
  const loadLibraryData = async () => {
    if (!isAuthenticated) return;
    setLibraryLoading(true);
    setError(null);
    try {
      const vocabData = await knowledgeApi.getSavedVocabulary();
      const grammarData = await knowledgeApi.getSavedGrammar();
      setLibraryVocab(vocabData);
      setLibraryGrammar(grammarData);
      
      // Mặc định chọn item đầu tiên
      if (librarySubTab === 'vocab' && vocabData.length > 0) {
        setSelectedLibraryCard({ type: 'vocab', data: vocabData[0] });
      } else if (librarySubTab === 'grammar' && grammarData.length > 0) {
        setSelectedLibraryCard({ type: 'grammar', data: grammarData[0] });
      } else {
        setSelectedLibraryCard(null);
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Không thể tải thư viện tri thức.');
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'library' && isAuthenticated) {
      loadLibraryData();
    }
  }, [activeTab, isAuthenticated]);

  const filteredLibraryItems = () => {
    const query = librarySearch.toLowerCase().trim();
    if (librarySubTab === 'vocab') {
      return libraryVocab.filter(item => 
        (item.word && item.word.toLowerCase().includes(query)) ||
        (item.reading && item.reading.toLowerCase().includes(query)) ||
        (item.meaning && item.meaning.toLowerCase().includes(query))
      );
    } else {
      return libraryGrammar.filter(item => 
        (item.grammar && item.grammar.toLowerCase().includes(query)) ||
        (item.meaning && item.meaning.toLowerCase().includes(query))
      );
    }
  };

  const handleDeleteSavedCard = async (type, id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa thẻ tri thức này khỏi kho cá nhân?")) return;

    try {
      if (type === 'vocab') {
        await knowledgeApi.deleteSavedVocabulary(id);
        setLibraryVocab(prev => prev.filter(x => x.id !== id));
      } else {
        await knowledgeApi.deleteSavedGrammar(id);
        setLibraryGrammar(prev => prev.filter(x => x.id !== id));
      }

      if (selectedLibraryCard?.data?.id === id && selectedLibraryCard?.type === type) {
        setSelectedLibraryCard(null);
      }
    } catch (err) {
      console.error(err);
      setError('Xóa thẻ thất bại: ' + (err?.response?.data?.error || err.message));
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
            className={`kb-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('library');
              setError(null);
            }}
          >
            <FolderHeart size={15} />
            Kho tri thức đã lưu
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
              <div className="kb-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2>1. Nhập kiến thức mới học</h2>
                  <p>AI hỗ trợ chuẩn hóa Romaji, Kana, chữ Kanji viết sai, hoặc nghĩa tiếng Việt.</p>
                </div>

                <div className="kb-fast-mode-toggle" style={{ display: 'inline-flex', background: 'var(--surface-hover)', borderRadius: 12, padding: 3, border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    className={`kb-mode-btn ${fastMode ? 'active' : ''}`}
                    onClick={() => setFastMode(true)}
                    style={{
                      padding: '6px 12px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: fastMode ? 'var(--accent-color)' : 'transparent',
                      color: fastMode ? '#fff' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s'
                    }}
                  >
                    ⚡ Nhập nhanh (~1s)
                  </button>
                  <button
                    type="button"
                    className={`kb-mode-btn ${!fastMode ? 'active' : ''}`}
                    onClick={() => setFastMode(false)}
                    style={{
                      padding: '6px 12px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: !fastMode ? 'var(--accent-color)' : 'transparent',
                      color: !fastMode ? '#fff' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s'
                    }}
                  >
                    ✨ Phân tích đầy đủ
                  </button>
                </div>
              </div>

              <form onSubmit={handleCollect} className="kb-form">
                <div className="kb-input-wrapper">
                  <textarea
                    className="kb-textarea"
                    placeholder="Ví dụ: hazukashii, ショクジ, 将來, ように, 難しい, xấu hổ..."
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
                    <span className="kb-tip">💡 Nhấn Enter để gửi đi nhanh • Mode: {fastMode ? '⚡ Nhập nhanh (Siêu tốc)' : '✨ Phân tích đầy đủ (10-15s)'}</span>
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
                      {fastMode ? 'Đang nhập nhanh siêu tốc...' : 'Đang phân tích & làm giàu...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      {fastMode ? '⚡ AI Phân tích nhanh' : '✨ AI Normalize & Enrich'}
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
                    {!isAuthenticated ? (
                      <button
                        type="button"
                        className="btn-kb-save disabled"
                        disabled={true}
                        title="Vui lòng đăng nhập để lưu thẻ kiến thức"
                        style={{ opacity: 0.65, cursor: 'not-allowed', background: '#94a3b8', boxShadow: 'none' }}
                      >
                        <Plus size={16} />
                        Đăng nhập để lưu vào kho cá nhân
                      </button>
                    ) : (
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
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIBRARY / SAVED KNOWLEDGE CARDS */}
        {activeTab === 'library' && (
          !isAuthenticated ? (
            <div className="kb-auth-required glass-panel animate-fade-in">
              <FolderHeart size={64} className="auth-required-icon" />
              <h3>Kho tri thức cá nhân yêu cầu đăng nhập</h3>
              <p>Vui lòng đăng nhập tài khoản của bạn để lưu trữ các thẻ từ vựng, ngữ pháp đã học và xây dựng kho tri thức cá nhân lâu dài.</p>
              <div className="auth-required-tip">
                💡 <em>Nhấn nút <strong>Đăng nhập / Đăng ký</strong> ở góc dưới bên trái thanh menu để tiếp tục.</em>
              </div>
            </div>
          ) : (
            <div className="kb-library-layout animate-fade-in">
              {/* Left sidebar: items list */}
              <div className="kb-library-sidebar glass-panel">
                <div className="library-search-wrapper">
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Tìm từ vựng, ngữ pháp..." 
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="library-search-input"
                  />
                </div>

                <div className="library-subtabs">
                  <button
                    className={`subtab-btn ${librarySubTab === 'vocab' ? 'active' : ''}`}
                    onClick={() => setLibrarySubTab('vocab')}
                  >
                    Từ vựng ({libraryVocab.length})
                  </button>
                  <button
                    className={`subtab-btn ${librarySubTab === 'grammar' ? 'active' : ''}`}
                    onClick={() => setLibrarySubTab('grammar')}
                  >
                    Ngữ pháp ({libraryGrammar.length})
                  </button>
                </div>

                <div className="library-items-list">
                  {libraryLoading ? (
                    <div className="library-loading">
                      <RefreshCw className="animate-spin" size={20} />
                      <span>Đang tải kho tri thức...</span>
                    </div>
                  ) : filteredLibraryItems().length === 0 ? (
                    <div className="library-empty">
                      <span>Không tìm thấy thẻ nào.</span>
                    </div>
                  ) : (
                    filteredLibraryItems().map((item) => {
                      const isSelected = selectedLibraryCard?.data?.id === item.id && selectedLibraryCard?.type === librarySubTab;
                      return (
                        <div 
                          key={item.id}
                          className={`library-item-card ${isSelected ? 'active' : ''}`}
                          onClick={() => setSelectedLibraryCard({ type: librarySubTab, data: item })}
                        >
                          <div className="item-main-info">
                            {librarySubTab === 'vocab' ? (
                              <>
                                <div className="item-title font-jp">{item.word}</div>
                                <div className="item-sub-title">{item.reading}</div>
                              </>
                            ) : (
                              <div className="item-title font-jp">{item.grammar}</div>
                            )}
                            <div className="item-meaning">{item.meaning}</div>
                          </div>
                          <button 
                            className="btn-delete-card"
                            onClick={(e) => handleDeleteSavedCard(librarySubTab, item.id, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right main area: Detail card */}
              <div className="kb-library-main-panel">
                {selectedLibraryCard ? (
                  <div className="library-detail-wrapper glass-panel animate-fade-in">
                    <div className="knowledge-card-wrapper">
                      {selectedLibraryCard.type === 'grammar' ? (
                        <GrammarCardPreview data={selectedLibraryCard.data} parseList={parseJsonList} />
                      ) : (
                        <VocabularyCardPreview data={selectedLibraryCard.data} parseList={parseJsonList} />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="library-detail-empty glass-panel">
                    <Database size={48} className="empty-icon" />
                    <h3>Chi tiết thẻ tri thức</h3>
                    <p>Chọn một thẻ ở danh sách bên trái để xem chi tiết đầy đủ thông tin Obsidian + Anki style.</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* TAB 3: PERSONAL READING */}
        {activeTab === 'reading' && (
          !isAuthenticated ? (
            <div className="kb-auth-required glass-panel animate-fade-in">
              <BookOpen size={64} className="auth-required-icon" />
              <h3>Tính năng yêu cầu đăng nhập</h3>
              <p>Hệ thống cần phân tích lịch sử học tập và kho từ vựng đã lưu của riêng bạn để biên soạn bài đọc hiểu cá nhân hóa (Personal Corpus).</p>
              <div className="auth-required-tip">
                💡 <em>Vui lòng đăng nhập tài khoản để trải nghiệm tính năng này.</em>
              </div>
            </div>
          ) : (
            <div className="kb-reading-workspace glass-panel animate-fade-in">
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
                      {quizChecked && (() => {
                        // Pronounce the correct answer
                        if (typeof window !== 'undefined' && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                          const utterance = new SpeechSynthesisUtterance(readingData.quiz.answer);
                          utterance.lang = 'ja-JP';
                          utterance.rate = 0.95;
                          window.speechSynthesis.speak(utterance);
                        }
                        return (
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
                        );
                      })()}                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* TAB 4: PERSONAL CONVERSATION */}
        {activeTab === 'conversation' && (
          !isAuthenticated ? (
            <div className="kb-auth-required glass-panel animate-fade-in">
              <MessageSquare size={64} className="auth-required-icon" />
              <h3>Tính năng yêu cầu đăng nhập</h3>
              <p>Vui lòng đăng nhập để AI tạo ra các đoạn hội thoại đàm thoại thực tế dựa trên cấp độ học tập và vốn từ vựng của bạn.</p>
              <div className="auth-required-tip">
                💡 <em>Đăng nhập tài khoản để bắt đầu luyện hội thoại.</em>
              </div>
            </div>
          ) : (
            <div className="kb-conv-workspace glass-panel animate-fade-in">
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
          )
        )}
      </div>
    </div>
  );
}

/* ────────── VOCABULARY CARD PREVIEW COMPONENT ────────── */
function VocabularyCardPreview({ data, parseList }) {
  const [activeCardTab, setActiveCardTab] = useState('core');
  
  const synonyms = parseList(data.synonyms);
  const antonyms = parseList(data.antonyms);
  const collocations = parseList(data.collocations);
  const kanjiWords = parseList(data.kanjiWords);
  const exampleSentences = parseList(data.exampleSentences);
  const commonMistakes = parseList(data.commonMistakes);
  const conversations = parseList(data.conversationExamples);

  return (
    <div className="knowledge-card vocabulary-card-modern">
      {/* Top Banner Panel */}
      <div className="card-top-panel">
        <div className="card-badge-row">
          <span className="card-badge type-badge">{data.wordType || 'Vocabulary'}</span>
          <span className="card-badge level-badge">{data.jlpt || 'JLPT'}</span>
        </div>
        <div className="card-main-header">
          <div className="card-primary-title font-jp" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <ruby>
              {data.word} <rt>{data.reading}</rt>
            </ruby>
            {data.hanViet && (
              <span className="card-hanviet-badge" style={{ 
                fontSize: '1rem', 
                marginLeft: '10px', 
                padding: '3px 8px', 
                borderRadius: '4px', 
                backgroundColor: 'rgba(245, 158, 11, 0.15)', 
                color: 'var(--warning-color)', 
                fontWeight: 'bold',
                verticalAlign: 'middle'
              }}>
                【{data.hanViet}】
              </span>
            )}
          </div>
          <div className="card-pitch">
            🗣️ Phiên âm: <span>{data.pitchAccent || 'Chưa cập nhật'}</span>
          </div>
          <div className="card-meaning-title">
            Ý nghĩa: <strong>{data.meaning}</strong>
          </div>
        </div>
      </div>

      {/* Card internal navigation tabs */}
      <div className="card-nav-tabs">
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'core' ? 'active' : ''}`}
          onClick={() => setActiveCardTab('core')}
        >
          <span className="tab-icon">📖</span> Cốt lõi & Ghi nhớ
        </button>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveCardTab('context')}
        >
          <span className="tab-icon">📝</span> Ngữ cảnh & Ví dụ
        </button>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'practice' ? 'active' : ''}`}
          onClick={() => setActiveCardTab('practice')}
        >
          <span className="tab-icon">✍️</span> Luyện tập & Lưu ý
        </button>
      </div>

      {/* Tab contents */}
      <div className="card-tab-content-container">
        {activeCardTab === 'core' && (
          <div className="card-tab-content animate-fade-in">
            {data.mnemonic && (
              <div className="card-block-section mnemonic-block-modern">
                <h4>💡 Mẹo nhớ từ (Mnemonic)</h4>
                <p>{data.mnemonic}</p>
              </div>
            )}

            {kanjiWords.length > 0 && (
              <div className="card-block-section">
                <h4>🔍 Các từ ghép liên quan</h4>
                <div className="kanji-words-list">
                  {kanjiWords.map((k, idx) => (
                    <div key={idx} className="kanji-word-item">
                      <span className="k-word font-jp">{k.word}</span>
                      <span className="k-read">({k.reading})</span>
                      <span className="k-arrow"><ArrowRight size={12} /></span>
                      <span className="k-mean">{k.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(synonyms.length > 0 || antonyms.length > 0) && (
              <div className="card-block-section relation-section-modern">
                {synonyms.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4>🟢 Đồng nghĩa (Synonyms)</h4>
                    <div className="chips-list">
                      {synonyms.map(s => <span key={s} className="chip syn-chip font-jp">{s}</span>)}
                    </div>
                  </div>
                )}
                {antonyms.length > 0 && (
                  <div>
                    <h4>🔴 Trái nghĩa (Antonyms)</h4>
                    <div className="chips-list">
                      {antonyms.map(a => <span key={a} className="chip ant-chip font-jp">{a}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!data.mnemonic && kanjiWords.length === 0 && synonyms.length === 0 && antonyms.length === 0 && (
              <div className="card-empty-tab-state">
                Không có thêm thông tin cốt lõi nào khác.
              </div>
            )}
          </div>
        )}

        {activeCardTab === 'context' && (
          <div className="card-tab-content animate-fade-in">
            {exampleSentences.length > 0 && (
              <div className="card-block-section">
                <h4>📝 Câu ví dụ mẫu (Examples)</h4>
                <div className="examples-list">
                  {exampleSentences.map((ex, i) => (
                    <div key={i} className="example-item">
                      <div className="example-ja font-jp">{ex.ja}</div>
                      <div className="example-reading">{ex.reading}</div>
                      <div className="example-vi">{ex.vi}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {collocations.length > 0 && (
              <div className="card-block-section">
                <h4>📚 Cụm từ hay dùng (Collocations)</h4>
                <ul className="collocations-list-modern">
                  {collocations.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {conversations.length > 0 && (
              <div className="card-block-section">
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

            {exampleSentences.length === 0 && collocations.length === 0 && conversations.length === 0 && (
              <div className="card-empty-tab-state">
                Không tìm thấy câu ví dụ hoặc ngữ cảnh ứng dụng nào.
              </div>
            )}
          </div>
        )}

        {activeCardTab === 'practice' && (
          <div className="card-tab-content animate-fade-in">
            {commonMistakes.length > 0 ? (
              <div className="card-block-section">
                <h4>⚠️ Lỗi thường gặp (Common Mistakes)</h4>
                <div className="mistakes-list-modern">
                  {commonMistakes.map((m, idx) => (
                    <div key={idx} className="mistake-item">
                      <div className="mistake-error">❌ {m.error}</div>
                      <div className="mistake-fix">✅ {m.fix}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card-empty-tab-state">
                ✨ Tuyệt vời! Không có lỗi sai phổ biến nào được ghi nhận cho từ vựng này.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────── GRAMMAR CARD PREVIEW COMPONENT ────────── */
function GrammarCardPreview({ data, parseList }) {
  const [activeCardTab, setActiveCardTab] = useState('core');

  const similarGrammar = parseList(data.similarGrammar);
  const commonMistakes = parseList(data.commonMistakes);
  const examples = parseList(data.examples);
  const quizzes = parseList(data.quizzes);

  return (
    <div className="knowledge-card grammar-card-modern">
      {/* Top Banner Panel */}
      <div className="card-top-panel">
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
      </div>

      {/* Card internal navigation tabs */}
      <div className="card-nav-tabs">
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'core' ? 'active' : ''}`}
          onClick={() => setActiveCardTab('core')}
        >
          <span className="tab-icon">📖</span> Cấu trúc & Cách dùng
        </button>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveCardTab('context')}
        >
          <span className="tab-icon">📝</span> Ngữ cảnh & Ví dụ
        </button>
        <button 
          type="button"
          className={`card-nav-btn ${activeCardTab === 'practice' ? 'active' : ''}`}
          onClick={() => setActiveCardTab('practice')}
        >
          <span className="tab-icon">✍️</span> Luyện tập & Tránh lỗi
        </button>
      </div>

      {/* Tab contents */}
      <div className="card-tab-content-container">
        {activeCardTab === 'core' && (
          <div className="card-tab-content animate-fade-in">
            <div className="card-block-section formation-section">
              <h4>📐 Cách kết hợp cấu trúc (Formation)</h4>
              {(() => {
                const parseFormationLines = (raw) => {
                  if (!raw) return [];
                  if (Array.isArray(raw)) return raw;
                  const str = String(raw).trim();
                  if (!str) return [];
                  let items = [];
                  if (str.includes('\n')) {
                    items = str.split('\n');
                  } else if (str.includes(' / ') || str.includes(' /') || str.includes('/ ')) {
                    items = str.split(/\s*\/\s*/);
                  } else if (str.includes(';')) {
                    items = str.split(';');
                  } else {
                    items = [str];
                  }
                  return items.map(i => i.trim()).filter(Boolean);
                };

                const lines = parseFormationLines(data.formation);
                if (lines.length <= 1) {
                  return <div className="formation-box font-jp">{data.formation || 'Chưa cập nhật'}</div>;
                }
                return (
                  <div className="formation-list font-jp">
                    {lines.map((line, idx) => (
                      <div key={idx} className="formation-item">
                        <span className="formation-bullet">🔹</span>
                        <span className="formation-text">{line}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {data.usageDesc && (
                <div className="usage-desc">
                  <strong>Mô tả cách dùng:</strong> {data.usageDesc}
                </div>
              )}
            </div>

            {similarGrammar.length > 0 && (
              <div className="card-block-section">
                <h4>🆚 Cấu trúc tương tự</h4>
                <div className="chips-list">
                  {similarGrammar.map(s => <span key={s} className="chip syn-chip font-jp">{s}</span>)}
                </div>
                {data.difference && (
                  <div className="difference-box">
                    <strong>Phân biệt & điểm khác biệt:</strong>
                    <p>{data.difference}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeCardTab === 'context' && (
          <div className="card-tab-content animate-fade-in">
            {examples.length > 0 && (
              <div className="card-block-section">
                <h4>📝 Câu ví dụ mẫu (Examples)</h4>
                <div className="examples-list">
                  {examples.map((ex, i) => (
                    <div key={i} className="example-item">
                      <div className="example-ja font-jp">{ex.ja}</div>
                      <div className="example-reading">{ex.reading}</div>
                      <div className="example-vi">{ex.vi}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.readingPassage && (
              <div className="card-block-section">
                <h4>📖 Đoạn văn đọc hiểu ứng dụng</h4>
                <div className="reading-passage-box">
                  <p>{data.readingPassage}</p>
                </div>
              </div>
            )}

            {examples.length === 0 && !data.readingPassage && (
              <div className="card-empty-tab-state">
                Không tìm thấy câu ví dụ hoặc đoạn văn đọc hiểu nào.
              </div>
            )}
          </div>
        )}

        {activeCardTab === 'practice' && (
          <div className="card-tab-content animate-fade-in">
            {quizzes.length > 0 && (
              <div className="card-block-section">
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

            {commonMistakes.length > 0 && (
              <div className="card-block-section">
                <h4>⚠️ Lỗi thường gặp (Common Mistakes)</h4>
                <div className="mistakes-list-modern">
                  {commonMistakes.map((m, idx) => (
                    <div key={idx} className="mistake-item">
                      <div className="mistake-error">❌ {m.error}</div>
                      <div className="mistake-fix">✅ {m.fix}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {quizzes.length === 0 && commonMistakes.length === 0 && (
              <div className="card-empty-tab-state">
                ✨ Tuyệt vời! Không có lỗi sai phổ biến hoặc bài test nhanh nào được lưu ở đây.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
