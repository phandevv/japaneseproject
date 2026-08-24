import React, { useState, useEffect, useMemo } from 'react';
import { vocabApi, jlptN3Api } from '../services/api';
import { 
  ArrowLeft, Plus, Edit, Trash2, Search, X, ChevronLeft, ChevronRight, 
  Sparkles, Volume2, RefreshCw, Layers, CheckCircle2, AlertCircle, Eye,
  BookOpen, Filter, GraduationCap, Tag, Sparkle
} from 'lucide-react';
import MascotLoader from '../components/MascotLoader';

const LEVEL_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
  { value: 'TU_LAY', label: 'Từ láy' },
  { value: 'TRO_TU', label: 'Trợ từ' },
  { value: 'N3_COURSE', label: 'N3 Khóa học' }
];

const N3_CHAPTERS = [
  { id: 1, title: 'Chương 1: Cuộc sống hàng ngày' },
  { id: 2, title: 'Chương 2: Gia đình & Bạn bè' },
  { id: 3, title: 'Chương 3: Giao tiếp & Xã hội' },
  { id: 4, title: 'Chương 4: Nơi làm việc & Kinh doanh' },
  { id: 5, title: 'Chương 5: Học tập & Trường học' },
  { id: 6, title: 'Chương 6: Tự nhiên & Môi trường' },
  { id: 7, title: 'Chương 7: Sức khỏe & Y tế' },
  { id: 8, title: 'Chương 8: Du lịch & Giao thông' },
  { id: 9, title: 'Chương 9: Văn hóa & Giải trí' }
];

const N3_LESSONS = [
  { id: 1, title: 'Bài 1' },
  { id: 2, title: 'Bài 2' },
  { id: 3, title: 'Bài 3' }
];

const WORD_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả loại từ' },
  { value: 'KANJI', label: 'Chữ Hán (Kanji)' },
  { value: 'Danh từ', label: 'Danh từ' },
  { value: 'Động từ', label: 'Động từ' },
  { value: 'Tính từ đuôi な', label: 'Tính từ な' },
  { value: 'Tính từ đuôi い', label: 'Tính từ い' },
  { value: 'Phó từ', label: 'Phó từ' },
  { value: 'Trợ từ', label: 'Trợ từ' },
  { value: 'Liên từ', label: 'Liên từ' }
];

const AI_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái AI' },
  { value: 'ENRICHED', label: '✨ Đã làm giàu AI' },
  { value: 'UNENRICHED', label: 'Chưa làm giàu AI' }
];

const VocabAdminPage = ({ goBack }) => {
  // Management View Mode: 'course_n3' | 'level' | 'word_type' | 'ai_status'
  const [viewMode, setViewMode] = useState('course_n3');

  // N3 Course Mode States
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedLesson, setSelectedLesson] = useState(1);
  const [n3SubFilter, setN3SubFilter] = useState('all'); // 'all' | 'vocab' | 'kanji'
  const [n3LessonData, setN3LessonData] = useState(null);

  // Level & Global List States
  const [vocabList, setVocabList] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedWordType, setSelectedWordType] = useState('ALL');
  const [selectedAiStatus, setSelectedAiStatus] = useState('ALL');

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [enrichingIds, setEnrichingIds] = useState(new Set());
  const [statusMessage, setStatusMessage] = useState(null);

  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalTab, setModalTab] = useState('basic'); // 'basic' | 'ai'
  const [isModalEnriching, setIsModalEnriching] = useState(false);
  const [formData, setFormData] = useState({
    kanji: '',
    hiragana: '',
    romaji: '',
    hanViet: '',
    meaning: '',
    wordType: '',
    level: 'N5',
    category: '',
    pitchAccent: '',
    sampleSentence: '',
    sampleTranslation: '',
    sampleReading: '',
    mnemonic: '',
    usageGuide: '',
    synonyms: '',
    antonyms: '',
    collocations: '',
    commonMistakes: ''
  });
  const [formError, setFormError] = useState('');

  // Load stats on mount
  const loadStats = async () => {
    try {
      const res = await vocabApi.getStats();
      setStats(res);
    } catch (err) {
      console.error("Failed to load vocab stats", err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Fetch N3 Course Lesson Data
  const fetchN3Lesson = async () => {
    setLoading(true);
    try {
      const data = await jlptN3Api.getLessonData(selectedChapter, selectedLesson);
      setN3LessonData(data);
    } catch (err) {
      console.error("Failed to load N3 lesson data:", err);
      setStatusMessage({ type: 'error', text: 'Không thể tải dữ liệu Bài học N3' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Level Paginated Data
  const fetchVocabByLevel = async () => {
    setLoading(true);
    try {
      let response;
      if (submittedQuery) {
        response = await vocabApi.search(submittedQuery, page, 15);
      } else {
        response = await vocabApi.getByLevelPaginated(selectedLevel, page, 15);
      }
      setVocabList(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error) {
      console.error("Failed to load vocabulary list", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'course_n3') {
      fetchN3Lesson();
    } else {
      fetchVocabByLevel();
    }
  }, [viewMode, selectedChapter, selectedLesson, page, submittedQuery, selectedLevel]);

  // Filtered words for N3 Course View
  const displayedN3Words = useMemo(() => {
    if (!n3LessonData) return [];
    let items = [];
    
    const vocabItems = (n3LessonData.tu_vung || n3LessonData.vocabulary || []).map((v, idx) => ({
      id: v.id || `v-${idx}`,
      kanji: v.kanji || v.tu || v.hiragana || '',
      hiragana: v.hiragana || v.furigana || v.cach_doc || v.tu || '',
      romaji: v.romaji || v.cach_doc || '',
      hanViet: v.hanViet || v.am_han || v.han_viet || '',
      meaning: v.meaning || v.nghia || '',
      wordType: v.loai_tu || v.wordType || 'Danh từ',
      level: 'N3_COURSE',
      category: `Tổng ôn N3 - Chương ${selectedChapter} Bài ${selectedLesson}`,
      sampleSentence: v.sampleSentence || v.vi_du || '',
      sampleTranslation: v.sampleTranslation || '',
      sampleReading: v.sampleReading || '',
      pitchAccent: v.pitchAccent || '',
      mnemonic: v.mnemonic || '',
      usageGuide: v.usageGuide || '',
      synonyms: v.synonyms || '',
      antonyms: v.antonyms || '',
      collocations: v.collocations || '',
      commonMistakes: v.commonMistakes || ''
    }));

    const kanjiItems = (n3LessonData.chu_han || n3LessonData.kanji || []).map((k, idx) => ({
      id: k.id || `k-${idx}`,
      kanji: k.kanji || k.tu || '',
      hiragana: k.am_doc || k.am_on || k.am_kun || k.hiragana || k.kanji || '',
      romaji: k.romaji || k.am_doc || '',
      hanViet: k.han_viet || k.hanViet || k.am_han || '',
      meaning: k.meaning || k.nghia || '',
      wordType: 'KANJI',
      level: 'N3_COURSE',
      category: `Tổng ôn N3 - Chương ${selectedChapter} Bài ${selectedLesson} - Kanji`,
      sampleSentence: k.sampleSentence || (Array.isArray(k.tu_vung) ? k.tu_vung.join(', ') : (k.tu_vung || '')),
      sampleTranslation: k.sampleTranslation || '',
      sampleReading: k.sampleReading || '',
      pitchAccent: k.pitchAccent || '',
      mnemonic: k.mnemonic || '',
      usageGuide: k.usageGuide || '',
      synonyms: '',
      antonyms: '',
      collocations: '',
      commonMistakes: ''
    }));

    if (n3SubFilter === 'vocab') {
      items = vocabItems;
    } else if (n3SubFilter === 'kanji') {
      items = kanjiItems;
    } else {
      items = [...vocabItems, ...kanjiItems];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(w => 
        (w.kanji && w.kanji.toLowerCase().includes(q)) ||
        (w.hiragana && w.hiragana.toLowerCase().includes(q)) ||
        (w.meaning && w.meaning.toLowerCase().includes(q)) ||
        (w.hanViet && w.hanViet.toLowerCase().includes(q))
      );
    }

    if (selectedAiStatus === 'ENRICHED') {
      items = items.filter(w => Boolean(w.sampleSentence || w.mnemonic || w.usageGuide || w.pitchAccent));
    } else if (selectedAiStatus === 'UNENRICHED') {
      items = items.filter(w => !Boolean(w.sampleSentence || w.mnemonic || w.usageGuide || w.pitchAccent));
    }

    if (selectedWordType !== 'ALL') {
      items = items.filter(w => w.wordType && (w.wordType.toLowerCase().includes(selectedWordType.toLowerCase()) || (selectedWordType === 'KANJI' && w.wordType === 'KANJI')));
    }

    return items;
  }, [n3LessonData, n3SubFilter, searchQuery, selectedAiStatus, selectedWordType, selectedChapter, selectedLesson]);

  // Filtered words for Level View
  const displayedLevelWords = useMemo(() => {
    let items = vocabList;
    if (selectedAiStatus === 'ENRICHED') {
      items = items.filter(w => Boolean(w.sampleSentence || w.mnemonic || w.usageGuide || w.pitchAccent));
    } else if (selectedAiStatus === 'UNENRICHED') {
      items = items.filter(w => !Boolean(w.sampleSentence || w.mnemonic || w.usageGuide || w.pitchAccent));
    }
    if (selectedWordType !== 'ALL') {
      items = items.filter(w => w.wordType && w.wordType.includes(selectedWordType));
    }
    return items;
  }, [vocabList, selectedAiStatus, selectedWordType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (viewMode !== 'course_n3') {
      setPage(0);
      setSubmittedQuery(searchQuery);
    }
  };

  const handleLevelChange = (level) => {
    setSelectedLevel(level);
    setSearchQuery('');
    setSubmittedQuery('');
    setPage(0);
  };

  const speakWord = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    const defaultCategory = viewMode === 'course_n3' 
      ? `Tổng ôn N3 - Chương ${selectedChapter} Bài ${selectedLesson}` 
      : '';
    const defaultLevel = viewMode === 'course_n3' 
      ? 'N3_COURSE' 
      : (selectedLevel !== 'ALL' ? selectedLevel : 'N5');

    setFormData({
      kanji: '',
      hiragana: '',
      romaji: '',
      hanViet: '',
      meaning: '',
      wordType: '',
      level: defaultLevel,
      category: defaultCategory,
      pitchAccent: '',
      sampleSentence: '',
      sampleTranslation: '',
      sampleReading: '',
      mnemonic: '',
      usageGuide: '',
      synonyms: '',
      antonyms: '',
      collocations: '',
      commonMistakes: ''
    });
    setFormError('');
    setModalTab('basic');
    setShowModal(true);
  };

  const handleOpenEdit = (word) => {
    setEditingId(word.id);
    setFormData({
      kanji: word.kanji || '',
      hiragana: word.hiragana || '',
      romaji: word.romaji || '',
      hanViet: word.hanViet || '',
      meaning: word.meaning || '',
      wordType: word.wordType || '',
      level: word.level || 'N5',
      category: word.category || '',
      pitchAccent: word.pitchAccent || '',
      sampleSentence: word.sampleSentence || '',
      sampleTranslation: word.sampleTranslation || '',
      sampleReading: word.sampleReading || '',
      mnemonic: word.mnemonic || '',
      usageGuide: word.usageGuide || '',
      synonyms: word.synonyms || '',
      antonyms: word.antonyms || '',
      collocations: word.collocations || '',
      commonMistakes: word.commonMistakes || ''
    });
    setFormError('');
    setModalTab('basic');
    setShowModal(true);
  };

  const handleEnrichSingleWord = async (id, e) => {
    if (e) e.stopPropagation();
    setEnrichingIds(prev => new Set(prev).add(id));
    try {
      const enriched = await vocabApi.enrich(id, true);
      if (viewMode === 'course_n3') {
        fetchN3Lesson();
      } else {
        setVocabList(prev => prev.map(item => (item.id === id ? { ...item, ...enriched } : item)));
      }
      setStatusMessage({ type: 'success', text: `✨ Làm giàu dữ liệu AI cho từ vựng thành công!` });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error("Enrich error:", err);
      setStatusMessage({ type: 'error', text: `Lỗi làm giàu AI: ${err.response?.data?.error || err.message}` });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleModalAutoEnrich = async () => {
    if (!formData.kanji && !formData.hiragana) {
      setFormError('Vui lòng nhập Kanji hoặc Hiragana trước khi gọi AI làm giàu dữ liệu!');
      return;
    }
    setIsModalEnriching(true);
    setFormError('');
    try {
      if (editingId) {
        const enriched = await vocabApi.enrich(editingId, true);
        setFormData(prev => ({
          ...prev,
          ...enriched,
          kanji: enriched.kanji || prev.kanji,
          hiragana: enriched.hiragana || prev.hiragana,
          meaning: enriched.meaning || prev.meaning
        }));
      } else {
        setFormError('Vui lòng lưu từ vựng trước, sau đó bấm nút Làm giàu AI để DeepSeek tự động phân tích chi tiết.');
      }
    } catch (err) {
      setFormError('Lỗi kết nối AI: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsModalEnriching(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.kanji && !formData.hiragana) {
      setFormError('Cần nhập Kanji hoặc Hiragana');
      return;
    }
    if (!formData.meaning || !formData.meaning.trim()) {
      setFormError('Nghĩa tiếng Việt không được để trống');
      return;
    }

    try {
      if (editingId) {
        await vocabApi.update(editingId, formData);
        setStatusMessage({ type: 'success', text: 'Cập nhật từ vựng thành công!' });
      } else {
        await vocabApi.create(formData);
        setStatusMessage({ type: 'success', text: 'Thêm từ vựng mới thành công!' });
      }
      setShowModal(false);
      if (viewMode === 'course_n3') {
        fetchN3Lesson();
      } else {
        fetchVocabByLevel();
      }
      loadStats();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setFormError(error.response?.data?.error || 'Có lỗi xảy ra khi lưu từ vựng.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá từ vựng này khỏi hệ thống không?')) return;
    try {
      await vocabApi.delete(id);
      setStatusMessage({ type: 'success', text: 'Đã xoá từ vựng thành công!' });
      if (viewMode === 'course_n3') {
        fetchN3Lesson();
      } else {
        fetchVocabByLevel();
      }
      loadStats();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      alert('Không thể xoá từ vựng: ' + (error.response?.data?.error || error.message));
    }
  };

  const currentList = viewMode === 'course_n3' ? displayedN3Words : displayedLevelWords;

  return (
    <div className="container animate-fade-in" style={{ padding: '30px 20px', maxWidth: '1280px' }}>
      
      {/* Top Notification Toast */}
      {statusMessage && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 1000,
          padding: '14px 20px', borderRadius: '12px',
          background: statusMessage.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', fontWeight: 600, boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s ease'
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn btn-secondary" onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={18} /> Quay lại
          </button>
          <div>
            <h2 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>
              Quản lý Từ vựng (Admin Panel)
            </h2>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Tổng số từ vựng hệ thống: <strong>{totalElements.toLocaleString()}</strong> từ
              {viewMode === 'course_n3' && n3LessonData && (
                <span style={{ marginLeft: '12px', color: 'var(--accent-color)', fontWeight: 600 }}>
                  • Đang xem: Chương {selectedChapter} - Bài {selectedLesson} ({currentList.length} từ)
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => { 
              if (viewMode === 'course_n3') fetchN3Lesson(); 
              else fetchVocabByLevel(); 
              loadStats(); 
            }} 
            title="Tải lại danh sách"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> {viewMode === 'course_n3' ? `Thêm từ vào Bài ${selectedLesson}` : 'Thêm từ mới'}
          </button>
        </div>
      </div>

      {/* ═══ VIEW MODE SELECTOR (QUẢN LÝ THEO NHIỀU KIỂU) ═══ */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px', 
        backgroundColor: 'var(--surface-color)', 
        padding: '8px', 
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => { setViewMode('course_n3'); setPage(0); }}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: '12px', border: 'none',
            backgroundColor: viewMode === 'course_n3' ? 'var(--accent-color)' : 'transparent',
            color: viewMode === 'course_n3' ? 'white' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}
        >
          <GraduationCap size={18} /> 🎓 Theo Khóa học N3 (Chương & Bài)
        </button>

        <button
          type="button"
          onClick={() => { setViewMode('level'); setPage(0); }}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: '12px', border: 'none',
            backgroundColor: viewMode === 'level' ? 'var(--accent-color)' : 'transparent',
            color: viewMode === 'level' ? 'white' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}
        >
          <Layers size={18} /> 📊 Theo Cấp độ JLPT (N5 - N1)
        </button>
      </div>

      {/* ═══ CONDITIONAL FILTER CONTROLS ═══ */}
      {viewMode === 'course_n3' ? (
        /* 🎓 N3 COURSE CONTROLS: CHAPTER & LESSON SELECTOR */
        <div className="card" style={{ padding: '18px 22px', marginBottom: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Chapters Pills / Selector */}
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Chọn Chương (1 - 9):
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {N3_CHAPTERS.map(ch => {
                  const isSel = selectedChapter === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedChapter(ch.id)}
                      style={{
                        padding: '8px 16px', borderRadius: '10px',
                        border: isSel ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                        backgroundColor: isSel ? 'var(--accent-color)' : 'var(--surface-hover)',
                        color: isSel ? 'white' : 'var(--text-primary)',
                        fontWeight: isSel ? 700 : 500, fontSize: '0.88rem',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      {ch.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lesson & Sub-filter Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              
              {/* Lessons Selection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Chọn Bài:</span>
                {N3_LESSONS.map(les => {
                  const isSel = selectedLesson === les.id;
                  return (
                    <button
                      key={les.id}
                      type="button"
                      onClick={() => setSelectedLesson(les.id)}
                      style={{
                        padding: '6px 16px', borderRadius: '8px',
                        border: isSel ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                        backgroundColor: isSel ? 'rgba(37,99,235,0.15)' : 'var(--surface-color)',
                        color: isSel ? 'var(--accent-color)' : 'var(--text-primary)',
                        fontWeight: 700, fontSize: '0.88rem',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      {les.title}
                    </button>
                  );
                })}
              </div>

              {/* Sub Filter (All / Vocab / Kanji) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Phân loại:</span>
                <button
                  type="button"
                  onClick={() => setN3SubFilter('all')}
                  style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                    border: '1px solid var(--border-color)', cursor: 'pointer',
                    backgroundColor: n3SubFilter === 'all' ? 'var(--accent-color)' : 'transparent',
                    color: n3SubFilter === 'all' ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  Tất cả ({n3LessonData ? ((n3LessonData.vocabulary?.length || 0) + (n3LessonData.kanji?.length || 0)) : 0})
                </button>
                <button
                  type="button"
                  onClick={() => setN3SubFilter('vocab')}
                  style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                    border: '1px solid var(--border-color)', cursor: 'pointer',
                    backgroundColor: n3SubFilter === 'vocab' ? 'var(--accent-color)' : 'transparent',
                    color: n3SubFilter === 'vocab' ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  Từ vựng ({n3LessonData?.vocabulary?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setN3SubFilter('kanji')}
                  style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                    border: '1px solid var(--border-color)', cursor: 'pointer',
                    backgroundColor: n3SubFilter === 'kanji' ? 'var(--accent-color)' : 'transparent',
                    color: n3SubFilter === 'kanji' ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  Chữ Hán Kanji ({n3LessonData?.kanji?.length || 0})
                </button>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* 📊 LEVEL SELECTION TABS */
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
          {LEVEL_OPTIONS.map(opt => {
            const isSelected = selectedLevel === opt.value;
            const count = stats && stats[opt.value] ? stats[opt.value] : null;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleLevelChange(opt.value)}
                style={{
                  padding: '8px 16px', borderRadius: '10px',
                  border: isSelected ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'var(--accent-color)' : 'var(--surface-color)',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  fontWeight: isSelected ? 700 : 500, fontSize: '0.9rem',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.15s ease', whiteSpace: 'nowrap'
                }}
              >
                <span>{opt.label}</span>
                {count !== null && (
                  <span style={{
                    fontSize: '0.75rem', padding: '1px 6px', borderRadius: '6px',
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--surface-hover)',
                    color: isSelected ? 'white' : 'var(--text-secondary)'
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ═══ COMBINED SEARCH & MULTI-FILTER BAR ═══ */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px',
        backgroundColor: 'var(--surface-color)',
        padding: '12px 18px',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        flexWrap: 'wrap'
      }}>
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text"
            placeholder={viewMode === 'course_n3' ? "Lọc nhanh theo Kanji, Hiragana, Nghĩa trong Bài này..." : "Tìm kiếm theo Kanji, Hiragana, Nghĩa, Hán Việt hoặc Chủ đề..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); setSubmittedQuery(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <X size={16} />
            </button>
          )}
        </form>

        {/* Word Type Filter */}
        <select
          value={selectedWordType}
          onChange={(e) => setSelectedWordType(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
          }}
        >
          {WORD_TYPE_OPTIONS.map(wt => (
            <option key={wt.value} value={wt.value}>{wt.label}</option>
          ))}
        </select>

        {/* AI Status Filter */}
        <select
          value={selectedAiStatus}
          onChange={(e) => setSelectedAiStatus(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-hover)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, outline: 'none'
          }}
        >
          {AI_STATUS_OPTIONS.map(ai => (
            <option key={ai.value} value={ai.value}>{ai.label}</option>
          ))}
        </select>
      </div>

      {/* ═══ VOCABULARY TABLE (NÚT XÓA Ở BÊN PHẢI CÙNG) ═══ */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        {loading ? (
          <div style={{ padding: '40px' }}>
            <MascotLoader message="Đang tải danh sách từ vựng..." />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', borderBottom: '1.5px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '14px 18px', width: '60px' }}>#ID</th>
                <th style={{ padding: '14px 18px' }}>Từ vựng (Kanji / Kana)</th>
                <th style={{ padding: '14px 18px' }}>Hán Việt</th>
                <th style={{ padding: '14px 18px' }}>Nghĩa tiếng Việt</th>
                <th style={{ padding: '14px 18px' }}>Loại từ / Chủ đề</th>
                <th style={{ padding: '14px 18px' }}>Cấp độ</th>
                <th style={{ padding: '14px 18px' }}>Dữ liệu AI</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', width: '140px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Không tìm thấy từ vựng nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                currentList.map((word) => {
                  const isEnriched = Boolean(word.sampleSentence || word.mnemonic || word.usageGuide || word.pitchAccent);
                  const isEnriching = enrichingIds.has(word.id);

                  return (
                    <tr key={word.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }} className="table-row-hover">
                      <td style={{ padding: '12px 18px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        #{word.id}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div>
                            <div className="jp-text" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {word.kanji || word.hiragana}
                            </div>
                            {word.kanji && word.hiragana && (
                              <div className="jp-text" style={{ fontSize: '0.85rem', color: 'var(--accent-color)', marginTop: '2px' }}>
                                {word.hiragana}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => speakWord(word.hiragana || word.kanji)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                            title="Nghe phát âm"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {word.hanViet ? `【${word.hanViet}】` : '-'}
                      </td>
                      <td style={{ padding: '12px 18px', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {word.meaning}
                        </div>
                        {word.sampleSentence && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Ví dụ: {word.sampleSentence}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {word.wordType && (
                            <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-hover)', color: 'var(--text-secondary)', width: 'fit-content' }}>
                              {word.wordType}
                            </span>
                          )}
                          {word.category && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {word.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span className="level-badge" style={{ fontSize: '0.8rem', padding: '3px 8px', borderRadius: '6px' }}>
                          {word.level}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        {isEnriched ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            <CheckCircle2 size={13} /> Đã làm giàu
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-hover)', padding: '3px 8px', borderRadius: '6px' }}>
                            Chưa làm giàu
                          </span>
                        )}
                      </td>
                      
                      {/* Thao tác ở BÊN PHẢI CÙNG */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button 
                            className="btn-icon" 
                            onClick={(e) => handleEnrichSingleWord(word.id, e)}
                            disabled={isEnriching}
                            title="Làm giàu dữ liệu AI (DeepSeek)"
                            style={{ width: '32px', height: '32px', border: '1px solid rgba(37,99,235,0.2)', color: 'var(--accent-color)', background: 'rgba(37,99,235,0.06)' }}
                          >
                            <Sparkles size={14} className={isEnriching ? 'animate-spin' : ''} />
                          </button>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleOpenEdit(word)}
                            title="Chỉnh sửa từ vựng"
                            style={{ width: '32px', height: '32px', border: '1px solid var(--border-color)' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleDelete(word.id)}
                            title="Xóa từ vựng"
                            style={{ width: '32px', height: '32px', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls (Only in Level mode) */}
      {viewMode === 'level' && totalPages > 1 && !loading && (
        <div className="flex-center" style={{ gap: '16px', marginTop: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setPage(p => Math.max(p - 1, 0))} 
            disabled={page === 0}
            style={{ opacity: page === 0 ? 0.5 : 1, padding: '8px 14px' }}
          >
            <ChevronLeft size={16} /> Trang trước
          </button>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
            Trang {page + 1} / {totalPages}
          </span>
          <button 
            className="btn btn-secondary" 
            onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} 
            disabled={page === totalPages - 1}
            style={{ opacity: page === totalPages - 1 ? 0.5 : 1, padding: '8px 14px' }}
          >
            Trang sau <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* CRUD Form Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 999, padding: '20px', overflowY: 'auto'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', animation: 'fadeIn 0.2s', padding: '28px' }}>
            <button 
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 700 }}>
                {editingId ? `Sửa thông tin từ vựng #${editingId}` : (viewMode === 'course_n3' ? `Thêm từ vào Chương ${selectedChapter} Bài ${selectedLesson}` : 'Thêm từ vựng mới')}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={handleModalAutoEnrich}
                  disabled={isModalEnriching}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                    borderRadius: '8px', border: '1px solid var(--accent-color)',
                    background: 'rgba(37,99,235,0.08)', color: 'var(--accent-color)',
                    fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <Sparkles size={14} className={isModalEnriching ? 'animate-spin' : ''} />
                  {isModalEnriching ? 'Đang gọi AI...' : 'Tự động làm giàu bằng AI'}
                </button>
              )}
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setModalTab('basic')}
                style={{
                  flex: 1, padding: '8px 14px', borderRadius: '8px', border: 'none',
                  background: modalTab === 'basic' ? 'var(--accent-color)' : 'var(--surface-hover)',
                  color: modalTab === 'basic' ? 'white' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer'
                }}
              >
                1. Thông tin cơ bản
              </button>
              <button
                type="button"
                onClick={() => setModalTab('ai')}
                style={{
                  flex: 1, padding: '8px 14px', borderRadius: '8px', border: 'none',
                  background: modalTab === 'ai' ? 'var(--accent-color)' : 'var(--surface-hover)',
                  color: modalTab === 'ai' ? 'white' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer'
                }}
              >
                2. Chi tiết & Dữ liệu AI
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', marginBottom: '18px', fontSize: '0.88rem', fontWeight: 600 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* TAB 1: BASIC INFO */}
              {modalTab === 'basic' && (
                <>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Kanji (Chữ Hán)</label>
                      <input 
                        type="text"
                        value={formData.kanji}
                        onChange={(e) => setFormData({ ...formData, kanji: e.target.value })}
                        className="jp-text"
                        placeholder="VD: 食べる"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Hiragana (Cách đọc) *</label>
                      <input 
                        type="text"
                        value={formData.hiragana}
                        onChange={(e) => setFormData({ ...formData, hiragana: e.target.value })}
                        className="jp-text"
                        placeholder="VD: たべる"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Hán Việt</label>
                      <input 
                        type="text"
                        value={formData.hanViet}
                        onChange={(e) => setFormData({ ...formData, hanViet: e.target.value })}
                        placeholder="VD: THỰC"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Romaji</label>
                      <input 
                        type="text"
                        value={formData.romaji}
                        onChange={(e) => setFormData({ ...formData, romaji: e.target.value })}
                        placeholder="VD: taberu"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Nghĩa tiếng Việt *</label>
                    <input 
                      type="text"
                      value={formData.meaning}
                      onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                      placeholder="VD: Ăn, dùng bữa"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 140px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Cấp độ JLPT</label>
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
                        <option value="N3_COURSE">N3 Khóa học</option>
                        <option value="TU_LAY">Từ láy</option>
                        <option value="TRO_TU">Trợ từ</option>
                      </select>
                    </div>
                    <div style={{ flex: '1 1 160px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Loại từ</label>
                      <input 
                        type="text"
                        value={formData.wordType}
                        onChange={(e) => setFormData({ ...formData, wordType: e.target.value })}
                        placeholder="VD: Động từ nhóm 2"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 160px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Chủ đề (Category)</label>
                      <input 
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="VD: Tổng ôn N3 - Chương 1 Bài 1"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: AI & RICH DETAILS */}
              {modalTab === 'ai' && (
                <>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Cao độ (Pitch Accent)</label>
                      <input 
                        type="text"
                        value={formData.pitchAccent}
                        onChange={(e) => setFormData({ ...formData, pitchAccent: e.target.value })}
                        placeholder="VD: [2] hoặc Atamadaka"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Câu ví dụ tiếng Nhật (Sample Sentence)</label>
                    <textarea 
                      rows="2"
                      value={formData.sampleSentence}
                      onChange={(e) => setFormData({ ...formData, sampleSentence: e.target.value })}
                      placeholder="VD: 朝ご飯を食べます。"
                      className="jp-text"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Dịch nghĩa câu ví dụ</label>
                    <input 
                      type="text"
                      value={formData.sampleTranslation}
                      onChange={(e) => setFormData({ ...formData, sampleTranslation: e.target.value })}
                      placeholder="VD: Tôi ăn bữa sáng."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Mẹo ghi nhớ (Mnemonic)</label>
                    <textarea 
                      rows="2"
                      value={formData.mnemonic}
                      onChange={(e) => setFormData({ ...formData, mnemonic: e.target.value })}
                      placeholder="VD: Bộ Thực liên quan đến ăn uống..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Lưu ý sử dụng (Usage Guide)</label>
                    <textarea 
                      rows="2"
                      value={formData.usageGuide}
                      onChange={(e) => setFormData({ ...formData, usageGuide: e.target.value })}
                      placeholder="VD: Đi với trợ từ を..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Từ đồng nghĩa (Synonyms)</label>
                      <input 
                        type="text"
                        value={formData.synonyms}
                        onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
                        placeholder="VD: 食事する, 召し上がる"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Cụm từ đi kèm (Collocations)</label>
                      <input 
                        type="text"
                        value={formData.collocations}
                        onChange={(e) => setFormData({ ...formData, collocations: e.target.value })}
                        placeholder="VD: ご飯を食べる"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  {editingId ? 'Lưu thay đổi' : 'Thêm từ mới'}
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
