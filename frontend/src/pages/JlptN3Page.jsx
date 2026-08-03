import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, CheckCircle, ChevronRight, ChevronLeft, RotateCcw, 
  Trophy, ArrowLeft, Play, Sparkles, Layers, List, Award, 
  HelpCircle, AlertCircle, Volume2, Shuffle, Upload, FileText, Eye, EyeOff
} from 'lucide-react';
import { jlptN3Api } from '../services/api';
import FlashcardCard from '../components/FlashcardCard';
import KanjiDetailModal from '../components/KanjiDetailModal';
import AiEnrichedTabbedView from '../components/AiEnrichedTabbedView';

const JlptN3Page = () => {
  const fileInputRef = useRef(null);

  // State for Course & Lesson Navigation
  const [phase, setPhase] = useState('overview'); // 'overview' | 'lesson'
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedLesson, setSelectedLesson] = useState(1);

  // Lesson Detail State
  const [lessonData, setLessonData] = useState(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [activeTab, setActiveTab] = useState('flashcard'); // 'flashcard' | 'list' | 'quiz'

  // Modal Detail State (Reusing KanjiDetailModal from Daily Study)
  const [detailModalIndex, setDetailModalIndex] = useState(null);

  // Flashcard State
  const [flashcardCategory, setFlashcardCategory] = useState('all'); // 'all' | 'kanji' | 'vocab' | 'grammar'
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // List View Sub-Tab State
  const [listSubTab, setListSubTab] = useState('vocab'); // 'kanji' | 'vocab' | 'grammar'
  const [hideMeanings, setHideMeanings] = useState(false);

  // Quiz State
  const [quizState, setQuizState] = useState('setup'); // 'setup' | 'playing' | 'finished'
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(0);
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Load Overview Data on mount
  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const data = await jlptN3Api.getCourseOverview();
      setOverview(data);
    } catch (err) {
      console.error("Error loading JLPT N3 overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Load specific Lesson Data when selected
  const openLesson = async (chapterId, lessonId) => {
    setSelectedChapter(chapterId);
    setSelectedLesson(lessonId);
    setPhase('lesson');
    setActiveTab('flashcard');
    setLoadingLesson(true);
    setQuizState('setup');
    setDetailModalIndex(null);

    try {
      const data = await jlptN3Api.getLessonData(chapterId, lessonId);
      setLessonData(data);
    } catch (err) {
      console.error(`Error loading Chapter ${chapterId} Lesson ${lessonId}:`, err);
    } finally {
      setLoadingLesson(false);
    }
  };

const isContainsKanji = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /[\u4e00-\u9faf\u3400-\u4dbf]/.test(str);
};

  // Convert tu_vung items into standard Vocabulary objects expected by KanjiDetailModal & FlashcardCard
  const formattedVocabWords = useMemo(() => {
    if (!lessonData || !lessonData.tu_vung) return [];
    return lessonData.tu_vung.map((v, idx) => {
      const isKanji = v.tu && isContainsKanji(v.tu);
      return {
        id: v.id,
        kanji: isKanji ? v.tu : (v.kanji || v.tu),
        hiragana: v.furigana || v.hiragana || v.tu,
        meaning: v.nghia,
        hanViet: v.am_han || v.han_viet || '',
        wordType: v.loai_tu || 'N',
        level: 'N3',
        sampleSentence: v.vi_du,
        pitchAccent: v.pitchAccent,
        mnemonic: v.mnemonic,
        synonyms: v.synonyms,
        antonyms: v.antonyms,
        exampleSentences: v.exampleSentences,
        collocations: v.collocations,
        commonMistakes: v.commonMistakes,
        conversationExamples: v.conversationExamples,
        usageGuide: v.usageGuide
      };
    });
  }, [lessonData]);

  // Convert chu_han items into Vocabulary objects for modal preview
  const formattedKanjiWords = useMemo(() => {
    if (!lessonData || !lessonData.chu_han) return [];
    return lessonData.chu_han.map((k, idx) => ({
      id: k.id,
      kanji: k.kanji,
      hiragana: k.kanji,
      meaning: k.nghia,
      hanViet: k.han_viet || '',
      wordType: 'Kanji',
      level: 'N3',
      sampleSentence: k.tu_vung ? k.tu_vung.join(', ') : '',
      pitchAccent: k.pitchAccent,
      mnemonic: k.mnemonic,
      exampleSentences: k.exampleSentences
    }));
  }, [lessonData]);

  // Extract items for Flashcards
  const flashcardItems = useMemo(() => {
    if (!lessonData) return [];
    const items = [];

    // Vocab Items
    if (lessonData.tu_vung && (flashcardCategory === 'all' || flashcardCategory === 'vocab')) {
      lessonData.tu_vung.forEach((v, idx) => {
        const isKanji = v.tu && isContainsKanji(v.tu);
        items.push({
          id: v.id,
          kanji: isKanji ? v.tu : (v.kanji || v.tu),
          hiragana: v.furigana || v.hiragana || v.tu,
          meaning: v.nghia,
          hanViet: v.am_han || v.han_viet || '',
          wordType: v.loai_tu || 'N',
          level: 'N3',
          sampleSentence: v.vi_du,
          pitchAccent: v.pitchAccent,
          mnemonic: v.mnemonic,
          synonyms: v.synonyms,
          antonyms: v.antonyms,
          exampleSentences: v.exampleSentences,
          collocations: v.collocations,
          commonMistakes: v.commonMistakes,
          conversationExamples: v.conversationExamples,
          usageGuide: v.usageGuide,
          category: 'vocab',
          badge: `Từ Vựng [${v.loai_tu || 'N'}]`
        });
      });
    }

    // Kanji Items
    if (lessonData.chu_han && (flashcardCategory === 'all' || flashcardCategory === 'kanji')) {
      lessonData.chu_han.forEach((k, idx) => {
        items.push({
          id: k.id,
          kanji: k.kanji,
          hiragana: k.kanji,
          meaning: k.nghia,
          hanViet: k.han_viet || '',
          wordType: 'Kanji',
          level: 'N3',
          sampleSentence: k.tu_vung ? k.tu_vung.join(', ') : '',
          pitchAccent: k.pitchAccent,
          mnemonic: k.mnemonic,
          exampleSentences: k.exampleSentences,
          category: 'kanji',
          badge: `Hán Tự • ${k.han_viet || ''}`
        });
      });
    }

    // Grammar Items
    if (lessonData.ngu_phap && (flashcardCategory === 'all' || flashcardCategory === 'grammar')) {
      lessonData.ngu_phap.forEach((g, idx) => {
        items.push({
          id: `grammar-${idx}`,
          kanji: g.cau_truc,
          hiragana: g.cau_truc,
          meaning: g.y_nghia,
          hanViet: 'Ngữ Pháp N3',
          wordType: 'Grammar',
          level: 'N3',
          sampleSentence: g.vi_du ? g.vi_du[0] : '',
          category: 'grammar',
          badge: 'Ngữ Pháp N3'
        });
      });
    }

    return items;
  }, [lessonData, flashcardCategory]);

  const currentFlashcardWord = useMemo(() => {
    if (flashcardItems.length === 0) return null;
    return flashcardItems[currentFlashcardIndex] || null;
  }, [flashcardItems, currentFlashcardIndex]);

  // Reset Flashcard index when category changes
  useEffect(() => {
    setCurrentFlashcardIndex(0);
    setIsFlipped(false);
  }, [flashcardCategory]);

  // Handle Flashcard Navigation
  const nextFlashcard = () => {
    if (flashcardItems.length === 0) return;
    setIsFlipped(false);
    setCurrentFlashcardIndex(prev => (prev + 1) % flashcardItems.length);
  };

  const prevFlashcard = () => {
    if (flashcardItems.length === 0) return;
    setIsFlipped(false);
    setCurrentFlashcardIndex(prev => (prev - 1 + flashcardItems.length) % flashcardItems.length);
  };

  const shuffleFlashcards = () => {
    setIsFlipped(false);
    if (flashcardItems.length > 0) {
      const rand = Math.floor(Math.random() * flashcardItems.length);
      setCurrentFlashcardIndex(rand);
    }
  };

  // Generate Quiz Questions from Lesson Data
  const startQuiz = () => {
    if (!lessonData) return;

    const questions = [];

    // 1. Kanji Questions
    if (lessonData.chu_han && lessonData.chu_han.length > 0) {
      lessonData.chu_han.forEach((k, idx) => {
        const wrongKanji = lessonData.chu_han.filter((_, i) => i !== idx);
        const distractors = wrongKanji.map(item => `${item.han_viet} (${item.nghia})`);
        while (distractors.length < 3) {
          distractors.push(`Ý nghĩa ${distractors.length + 1}`);
        }
        const correctAnswer = `${k.han_viet} (${k.nghia})`;
        const options = shuffleArray([correctAnswer, ...distractors.slice(0, 3)]);

        questions.push({
          id: `q-kanji-${idx}`,
          category: 'Kanji',
          question: `Chữ Hán "${k.kanji}" có âm Hán Việt và nghĩa là gì?`,
          options,
          correctAnswer,
          wordObj: {
            id: k.id,
            kanji: k.kanji,
            hiragana: k.kanji,
            meaning: k.nghia,
            hanViet: k.han_viet
          }
        });
      });
    }

    // 2. Vocab Questions
    if (lessonData.tu_vung && lessonData.tu_vung.length > 0) {
      lessonData.tu_vung.forEach((v, idx) => {
        const wrongVocab = lessonData.tu_vung.filter((_, i) => i !== idx);
        const distractors = wrongVocab.map(item => item.nghia);
        while (distractors.length < 3) {
          distractors.push(`Nghĩa ${distractors.length + 1}`);
        }

        const correctAnswer = v.nghia;
        const options = shuffleArray([correctAnswer, ...distractors.slice(0, 3)]);

        questions.push({
          id: `q-vocab-${idx}`,
          category: 'Từ vựng',
          question: `Từ vựng "${v.tu}" có nghĩa là gì?`,
          options,
          correctAnswer,
          wordObj: {
            id: v.id,
            kanji: v.tu,
            hiragana: v.furigana || v.tu,
            meaning: v.nghia,
            hanViet: v.am_han || ''
          }
        });
      });
    }

    // 3. Grammar Questions
    if (lessonData.ngu_phap && lessonData.ngu_phap.length > 0) {
      lessonData.ngu_phap.forEach((g, idx) => {
        const wrongGrammar = lessonData.ngu_phap.filter((_, i) => i !== idx);
        const distractors = wrongGrammar.map(item => item.y_nghia);
        while (distractors.length < 3) {
          distractors.push(`Ý nghĩa ngữ pháp ${distractors.length + 1}`);
        }

        const correctAnswer = g.y_nghia;
        const options = shuffleArray([correctAnswer, ...distractors.slice(0, 3)]);

        questions.push({
          id: `q-grammar-${idx}`,
          category: 'Ngữ pháp',
          question: `Cấu trúc ngữ pháp "${g.cau_truc}" mang ý nghĩa gì?`,
          options,
          correctAnswer,
          wordObj: null
        });
      });
    }

    const finalQuestions = shuffleArray(questions).slice(0, 15);

    setQuizQuestions(finalQuestions);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizScore(0);
    setQuizResult(null);
    setQuizState('playing');
  };

  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const handleSelectOption = (option) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: option
    }));
  };

  const handleSubmitQuiz = async () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });
    setQuizScore(score);
    setSubmittingQuiz(true);

    try {
      const res = await jlptN3Api.submitQuiz(selectedChapter, selectedLesson, score, quizQuestions.length);
      setQuizResult(res);
      setQuizState('finished');
      loadOverview();
    } catch (err) {
      console.error("Error submitting quiz:", err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFilesSelected = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploadingFiles(true);
    try {
      const res = await jlptN3Api.uploadJsonFiles(selectedFiles);
      let summaryText = `🎉 Tải lên & Nạp dữ liệu thành công ${res.processedFiles} tệp JSON!\n\n` +
        `• ${res.importedVocab} từ vựng mới/cập nhật\n` +
        `• ${res.importedKanji} chữ Hán mới/cập nhật\n` +
        `• ${res.importedGrammar} mẫu ngữ pháp mới/cập nhật\n\n` +
        (res.details ? res.details.join('\n') : '');
      alert(summaryText);
      loadOverview();
    } catch (err) {
      alert("Lỗi tải tệp JSON: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadingFiles(false);
      if (e.target) e.target.value = '';
    }
  };

  const getLessonBadge = (completed, bestScore, available) => {
    if (!available) {
      return (
        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', background: 'var(--surface-hover)', color: 'var(--text-muted)', fontWeight: 600 }}>
          Chưa mở
        </span>
      );
    }
    if (completed) {
      return (
        <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle size={13} /> Hoàn thành ({bestScore}%)
        </span>
      );
    }
    if (bestScore > 0) {
      return (
        <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 700 }}>
          Chưa đạt ({bestScore}%)
        </span>
      );
    }
    return (
      <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-color)', fontWeight: 600 }}>
        Chưa học
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px', position: 'relative' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />

      {/* REUSED KANJI & VOCAB DETAIL MODAL (From Daily Study) */}
      {detailModalIndex !== null && (listSubTab === 'vocab' ? formattedVocabWords : formattedKanjiWords).length > 0 && (
        <KanjiDetailModal
          words={listSubTab === 'vocab' ? formattedVocabWords : formattedKanjiWords}
          initialIndex={detailModalIndex}
          onClose={() => setDetailModalIndex(null)}
        />
      )}
      
      {/* ───────────────────────────────────────────────────────────────────────
          PHASE 1: CHAPTERS & LESSONS OVERVIEW
         ─────────────────────────────────────────────────────────────────────── */}
      {phase === 'overview' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            borderRadius: '20px', padding: '30px 32px', color: 'white',
            boxShadow: '0 12px 32px rgba(37,99,235,0.2)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Award size={16} /> Lộ trình Tổng ôn JLPT N3
                </div>
                
                <button
                  onClick={handleFileUploadClick}
                  disabled={uploadingFiles}
                  style={{
                    padding: '8px 18px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 800,
                    fontSize: '0.9rem', cursor: uploadingFiles ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.35)', display: 'inline-flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Upload size={16} /> {uploadingFiles ? 'Đang nạp tệp...' : '📁 Tải Lên Tệp JSON (Chọn từ máy tính)'}
                </button>
              </div>
              <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2rem', fontWeight: 800 }}>
                Ôn Luyện JLPT N3 (9 Chương - 27 Bài)
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '1.05rem', maxWidth: '640px', lineHeight: 1.5 }}>
                Chinh phục toàn bộ Kanji, Từ vựng & Ngữ Pháp N3. Học qua Thẻ ghi nhớ thông minh, Bảng chi tiết từ và bài Quiz kiểm tra đạt <strong style={{ color: '#fef08a' }}>≥ 90%</strong> để vượt qua bài học!
              </p>

              {/* Progress Summary Bar */}
              {overview && (
                <div style={{ marginTop: '24px', background: 'rgba(0,0,0,0.2)', padding: '16px 20px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 600 }}>
                    <span>Tiến độ khóa học: {overview.completedLessons} / {overview.totalLessons} bài học đã hoàn thành</span>
                    <span>{overview.progressPercentage}%</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.25)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${overview.progressPercentage}%`, height: '100%', background: '#10b981', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chapters List */}
          {loadingOverview ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
              Đang tải danh sách bài học...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {overview?.chapters?.map((ch) => {
                const isExpanded = selectedChapter === ch.id;

                return (
                  <div key={ch.id} style={{
                    background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)',
                    overflow: 'hidden', transition: 'all 0.2s ease', boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                  }}>
                    {/* Chapter Header Card */}
                    <div 
                      onClick={() => setSelectedChapter(prev => prev === ch.id ? null : ch.id)}
                      style={{
                        padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', background: isExpanded ? 'var(--surface-hover)' : 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: ch.completedLessons === 3 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '1.2rem'
                        }}>
                          {ch.id}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                            Chương {ch.id}
                          </h3>
                          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            Hoàn thành {ch.completedLessons}/3 bài
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {ch.completedLessons === 3 && (
                          <span style={{ fontSize: '0.82rem', padding: '4px 12px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700 }}>
                            ✓ Đã hoàn thành chương
                          </span>
                        )}
                        <ChevronRight size={20} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    {/* Lessons Grid (if expanded) */}
                    {isExpanded && (
                      <div style={{ padding: '0 24px 20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '10px' }}>
                        {ch.lessons?.map((les) => (
                          <div 
                            key={les.id}
                            onClick={() => les.available && openLesson(ch.id, les.id)}
                            style={{
                              padding: '16px 20px', borderRadius: '14px',
                              border: '1px solid var(--border-color)',
                              background: les.available ? 'var(--surface-color)' : 'var(--surface-hover)',
                              cursor: les.available ? 'pointer' : 'not-allowed',
                              display: 'flex', flexDirection: 'column', gap: '12px',
                              opacity: les.available ? 1 : 0.65,
                              transition: 'all 0.2s ease'
                            }}
                            className={les.available ? 'card-hover' : ''}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                Bài {les.id}
                              </h4>
                              {getLessonBadge(les.completed, les.bestScore, les.available)}
                            </div>

                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>Hán tự, Từ vựng, Ngữ pháp</span>
                              {les.available && (
                                <span style={{ color: 'var(--accent-color)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  Học ngay <ChevronRight size={14} />
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}


      {/* ───────────────────────────────────────────────────────────────────────
          PHASE 2: LESSON STUDY VIEW
         ─────────────────────────────────────────────────────────────────────── */}
      {phase === 'lesson' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={() => setPhase('overview')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px',
                borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)',
                color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} /> Danh sách Chương
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Chương {selectedChapter} - Bài {selectedLesson}
              </span>
              {lessonData?.completed && (
                <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700 }}>
                  ✓ Đã đạt ≥90%
                </span>
              )}
            </div>
          </div>

          {loadingLesson ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Đang tải nội dung Bài {selectedLesson}...
            </div>
          ) : (
            <>
              {/* Study Mode Navigation Tabs */}
              <div style={{ display: 'flex', background: 'var(--surface-color)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setActiveTab('flashcard')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: activeTab === 'flashcard' ? 'var(--accent-color)' : 'transparent',
                    color: activeTab === 'flashcard' ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  <Layers size={18} /> Thẻ Ghi Nhớ (Flashcard)
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: activeTab === 'list' ? 'var(--accent-color)' : 'transparent',
                    color: activeTab === 'list' ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  <List size={18} /> Danh Sách Chi Tiết & AI
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: activeTab === 'quiz' ? 'var(--accent-color)' : 'transparent',
                    color: activeTab === 'quiz' ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  <Sparkles size={18} /> Bài Quiz (Cần ≥ 90%)
                </button>
              </div>


              {/* ───────────────────────────────────────────────────────────────
                  TAB 1: FLASHCARD VIEW (Reusing FlashcardCard Component)
                 ─────────────────────────────────────────────────────────────── */}
              {activeTab === 'flashcard' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
                  
                  {/* Category Filter */}
                  <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-hover)', padding: '4px', borderRadius: '10px' }}>
                    {['all', 'vocab', 'kanji', 'grammar'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFlashcardCategory(cat)}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600,
                          cursor: 'pointer',
                          background: flashcardCategory === cat ? 'var(--surface-color)' : 'transparent',
                          color: flashcardCategory === cat ? 'var(--accent-color)' : 'var(--text-secondary)',
                          boxShadow: flashcardCategory === cat ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
                        }}
                      >
                        {cat === 'all' && 'Tất cả'}
                        {cat === 'vocab' && 'Từ vựng'}
                        {cat === 'kanji' && 'Hán tự'}
                        {cat === 'grammar' && 'Ngữ pháp'}
                      </button>
                    ))}
                  </div>

                  {flashcardItems.length === 0 ? (
                    <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Không có thẻ nào trong mục này.</div>
                  ) : (
                    <>
                      {/* Progress & Card Index */}
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Thẻ {currentFlashcardIndex + 1} / {flashcardItems.length}
                      </div>

                      {/* REUSED FLASHCARD CARD COMPONENT */}
                      {currentFlashcardWord && (
                        <div style={{ width: '100%', maxWidth: '560px' }}>
                          <FlashcardCard 
                            word={currentFlashcardWord}
                            flipped={isFlipped}
                            onFlip={() => setIsFlipped(!isFlipped)}
                          />
                        </div>
                      )}

                      {/* Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                        <button
                          onClick={prevFlashcard}
                          style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                        >
                          <ChevronLeft size={18} /> Thẻ trước
                        </button>
                        <button
                          onClick={shuffleFlashcards}
                          style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer' }}
                          title="Xáo trộn thẻ"
                        >
                          <Shuffle size={18} />
                        </button>
                        <button
                          onClick={nextFlashcard}
                          style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: 'var(--accent-color)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                        >
                          Thẻ tiếp <ChevronRight size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}


              {/* ───────────────────────────────────────────────────────────────
                  TAB 2: DETAILED LIST VIEW (With DeepSeek AI & Kanji Detail Modal)
                 ─────────────────────────────────────────────────────────────── */}
              {activeTab === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* List Sub-Tab Switcher */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setListSubTab('vocab')}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer',
                          background: listSubTab === 'vocab' ? 'rgba(37,99,235,0.1)' : 'transparent',
                          color: listSubTab === 'vocab' ? 'var(--accent-color)' : 'var(--text-secondary)'
                        }}
                      >
                        Từ Vựng ({lessonData?.tu_vung?.length || 0})
                      </button>
                      <button
                        onClick={() => setListSubTab('kanji')}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer',
                          background: listSubTab === 'kanji' ? 'rgba(37,99,235,0.1)' : 'transparent',
                          color: listSubTab === 'kanji' ? 'var(--accent-color)' : 'var(--text-secondary)'
                        }}
                      >
                        Hán Tự ({lessonData?.chu_han?.length || 0})
                      </button>
                      <button
                        onClick={() => setListSubTab('grammar')}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer',
                          background: listSubTab === 'grammar' ? 'rgba(37,99,235,0.1)' : 'transparent',
                          color: listSubTab === 'grammar' ? 'var(--accent-color)' : 'var(--text-secondary)'
                        }}
                      >
                        Ngữ Pháp ({lessonData?.ngu_phap?.length || 0})
                      </button>
                    </div>

                    <button
                      onClick={() => setHideMeanings(!hideMeanings)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {hideMeanings ? <Eye size={16} /> : <EyeOff size={16} />}
                      {hideMeanings ? 'Hiện nghĩa' : 'Ẩn nghĩa'}
                    </button>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 8px 0' }}>
                    <ChevronRight size={14} /> Nhấn vào một từ hoặc chữ Hán để xem Chi Tiết AI DeepSeek, Nét Viết & Ví Dụ
                  </p>

                  {/* VOCAB LIST TABLE */}
                  {listSubTab === 'vocab' && (
                    <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
                          <tr>
                            <th style={{ padding: '14px 18px', width: '50px' }}>STT</th>
                            <th style={{ padding: '14px 18px' }}>Từ vựng (Kanji)</th>
                            {!hideMeanings && <th style={{ padding: '14px 18px' }}>Cách đọc (Kana)</th>}
                            {!hideMeanings && <th style={{ padding: '14px 18px' }}>Nghĩa tiếng Việt</th>}
                            <th style={{ padding: '14px 18px' }}>Hán Việt / Loại từ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formattedVocabWords.map((word, index) => (
                            <tr
                              key={word.id}
                              onClick={() => setDetailModalIndex(index)}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{index + 1}</td>
                              <td style={{ padding: '14px 18px', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{word.kanji}</td>
                              {!hideMeanings && <td style={{ padding: '14px 18px', color: 'var(--accent-color)', fontWeight: 600 }}>{word.hiragana}</td>}
                              {!hideMeanings && <td style={{ padding: '14px 18px', fontWeight: 500, color: 'var(--success-color)' }}>{word.meaning}</td>}
                              <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span>{word.hanViet || word.wordType}</span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 600 }}>Chi tiết AI ➔</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* KANJI LIST GRID */}
                  {listSubTab === 'kanji' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                      {formattedKanjiWords.map((k, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setDetailModalIndex(idx)}
                          style={{ 
                            background: 'var(--surface-color)', border: '1px solid var(--border-color)', 
                            borderRadius: '14px', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start',
                            cursor: 'pointer', transition: 'all 0.2s ease'
                          }}
                          className="card-hover"
                        >
                          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(37,99,235,0.08)', color: 'var(--accent-color)', fontSize: '2.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {k.kanji}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{k.hanViet}</span>
                            </div>
                            {!hideMeanings && <div style={{ fontSize: '0.92rem', color: 'var(--success-color)', fontWeight: 600, marginBottom: '6px' }}>{k.meaning}</div>}
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 600 }}>Xem nét viết & DeepSeek AI ➔</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* GRAMMAR LIST */}
                  {listSubTab === 'grammar' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {lessonData?.ngu_phap?.map((g, idx) => (
                        <div key={idx} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-color)' }}>{g.cau_truc}</span>
                            {!hideMeanings && <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success-color)' }}>{g.y_nghia}</span>}
                          </div>
                          {g.cach_chia && (
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', background: 'var(--surface-hover)', padding: '6px 12px', borderRadius: '6px' }}>
                              <strong>Cách chia:</strong> {g.cach_chia}
                            </div>
                          )}
                          {g.vi_du && g.vi_du.length > 0 && (
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong>Ví dụ mẫu:</strong>
                              {g.vi_du.map((ex, i) => <div key={i}>• {ex}</div>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}


              {/* ───────────────────────────────────────────────────────────────
                  TAB 3: QUIZ TEST (With DeepSeek AI Breakdown & Pass >= 90%)
                 ─────────────────────────────────────────────────────────────── */}
              {activeTab === 'quiz' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0' }}>
                  
                  {/* QUIZ SETUP SCREEN */}
                  {quizState === 'setup' && (
                    <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '36px', maxWidth: '520px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        <Sparkles size={32} />
                      </div>
                      <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                        Bài Kiểm Tra Bài {selectedLesson}
                      </h2>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                        Bài test bao gồm các câu hỏi trắc nghiệm về Hán tự, Từ vựng & Ngữ Pháp của Bài {selectedLesson}. Đạt <strong style={{ color: '#10b981' }}>≥ 90%</strong> điểm số để chính thức vượt qua Bài học này!
                      </p>
                      <button
                        onClick={startQuiz}
                        style={{
                          padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--accent-color)',
                          color: 'white', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px'
                        }}
                      >
                        <Play size={20} /> Bắt đầu Làm Quiz
                      </button>
                    </div>
                  )}

                  {/* QUIZ PLAYING SCREEN */}
                  {quizState === 'playing' && quizQuestions.length > 0 && (
                    <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '640px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Question Header & Progress */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '4px 10px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-color)' }}>
                          {quizQuestions[currentQuestionIndex]?.category}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Câu {currentQuestionIndex + 1} / {quizQuestions.length}
                        </span>
                      </div>

                      <div style={{ width: '100%', height: '6px', background: 'var(--surface-hover)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.2s ease' }} />
                      </div>

                      {/* Question Text */}
                      <h3 style={{ margin: '10px 0 0 0', fontSize: '1.3rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {quizQuestions[currentQuestionIndex]?.question}
                      </h3>

                      {/* 4 Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {quizQuestions[currentQuestionIndex]?.options?.map((opt, idx) => {
                          const isSelected = userAnswers[currentQuestionIndex] === opt;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectOption(opt)}
                              style={{
                                padding: '16px 20px', borderRadius: '12px', border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                background: isSelected ? 'rgba(37,99,235,0.06)' : 'var(--surface-color)',
                                color: 'var(--text-primary)', fontSize: '1rem', fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease'
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* DeepSeek AI Enrichment View in Quiz Feedback */}
                      {userAnswers[currentQuestionIndex] && quizQuestions[currentQuestionIndex]?.wordObj && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                            🤖 Giải thích Chi Tiết DeepSeek AI cho từ này:
                          </h4>
                          <AiEnrichedTabbedView word={quizQuestions[currentQuestionIndex].wordObj} />
                        </div>
                      )}

                      {/* Quiz Controls */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                        <button
                          disabled={currentQuestionIndex === 0}
                          onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                          style={{
                            padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border-color)',
                            background: 'var(--surface-color)', opacity: currentQuestionIndex === 0 ? 0.4 : 1,
                            cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Câu trước
                        </button>

                        {currentQuestionIndex < quizQuestions.length - 1 ? (
                          <button
                            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                            style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Câu tiếp ➔
                          </button>
                        ) : (
                          <button
                            onClick={handleSubmitQuiz}
                            disabled={submittingQuiz}
                            style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: 800, cursor: 'pointer' }}
                          >
                            {submittingQuiz ? 'Đang nộp...' : 'Nộp Bài Quiz ✓'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* QUIZ FINISHED SCREEN */}
                  {quizState === 'finished' && quizResult && (
                    <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '36px', maxWidth: '520px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: quizResult.passed ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #f59e0b)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                      }}>
                        {quizResult.passed ? <Trophy size={42} /> : <AlertCircle size={42} />}
                      </div>

                      <div>
                        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', color: 'var(--text-primary)' }}>
                          {quizResult.passed ? 'Chúc mừng! Đã hoàn thành Bài!' : 'Chưa đạt chỉ tiêu (≥ 90%)'}
                        </h2>
                        <div style={{ fontSize: '3rem', fontWeight: 800, color: quizResult.passed ? '#10b981' : '#ef4444' }}>
                          {quizResult.accuracy}%
                        </div>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                          Đúng {quizResult.score} / {quizResult.total} câu hỏi
                        </p>
                      </div>

                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                        {quizResult.passed 
                          ? 'Bạn đã đạt điểm số xuất sắc và vượt qua Bài học này! Trạng thái hoàn thành đã được ghi nhận.'
                          : 'Cần đạt ≥ 90% điểm số để mở khóa trạng thái Hoàn thành. Hãy làm lại để ôn tập kiến thức nhé!'}
                      </p>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '10px' }}>
                        <button
                          onClick={startQuiz}
                          style={{ padding: '14px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <RotateCcw size={16} /> Làm lại Quiz
                        </button>
                        <button
                          onClick={() => setPhase('overview')}
                          style={{ padding: '14px 24px', borderRadius: '12px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Danh sách Chương ➔
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default JlptN3Page;
