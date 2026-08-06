import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, CheckCircle, ChevronRight, ChevronLeft, RotateCcw, 
  Trophy, ArrowLeft, Play, Sparkles, Layers, List, Award, 
  HelpCircle, AlertCircle, Volume2, Shuffle, Upload, FileText, Eye, EyeOff
} from 'lucide-react';
import { jlptN3Api, srsApi } from '../services/api';
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

  // Quiz State (Matching Daily Study Quiz Options & Logic)
  const [quizState, setQuizState] = useState('setup'); // 'setup' | 'playing' | 'finished'
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(0);
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Daily Study Quiz Setup Configuration Options & Typing Answer Mode
  const [quizAnswerMode, setQuizAnswerMode] = useState('typing'); // 'typing' | 'mc'
  const [quizQuestionType, setQuizQuestionType] = useState('ja-to-vi'); // 'ja-to-vi' | 'vi-to-ja'
  const [showHiraganaHint, setShowHiraganaHint] = useState(true);
  const [quizOptType, setQuizOptType] = useState('all'); // 'all' | 'random' | 'range'
  const [quizOptRandomCount, setQuizOptRandomCount] = useState(15);
  const [quizOptRangeStart, setQuizOptRangeStart] = useState(1);
  const [quizOptRangeEnd, setQuizOptRangeEnd] = useState(15);
  const [quizSetupError, setQuizSetupError] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [lastAssignedQuality, setLastAssignedQuality] = useState(1);

  // Quiz Timer Effect
  useEffect(() => {
    let timer = null;
    if (quizState === 'playing') {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [quizState, currentQuestionIndex]);

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
        id: v.id || (idx + 1000),
        kanji: isKanji ? v.tu : (v.kanji || v.tu || v.hiragana || ''),
        hiragana: v.furigana || v.hiragana || v.tu || '',
        meaning: v.nghia || v.meaning || '',
        hanViet: v.am_han || v.han_viet || v.hanViet || '',
        wordType: v.loai_tu || v.wordType || 'N',
        level: 'N3',
        sampleSentence: v.vi_du || v.sampleSentence || '',
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
      id: k.id || (idx + 2000),
      kanji: k.kanji || k.tu || '',
      hiragana: k.kanji || k.tu || '',
      meaning: k.nghia || k.meaning || '',
      hanViet: k.han_viet || k.am_han || k.hanViet || '',
      wordType: 'Kanji',
      level: 'N3',
      sampleSentence: k.tu_vung ? (Array.isArray(k.tu_vung) ? k.tu_vung.join(', ') : k.tu_vung) : '',
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
          id: v.id || `vocab-${idx}`,
          kanji: isKanji ? v.tu : (v.kanji || v.tu || v.hiragana || ''),
          hiragana: v.furigana || v.hiragana || v.tu || '',
          meaning: v.nghia || v.meaning || '',
          hanViet: v.am_han || v.han_viet || v.hanViet || '',
          wordType: v.loai_tu || v.wordType || 'N',
          level: 'N3',
          sampleSentence: v.vi_du || v.sampleSentence || '',
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
          id: k.id || `kanji-${idx}`,
          kanji: k.kanji || k.tu || '',
          hiragana: k.kanji || k.tu || '',
          meaning: k.nghia || k.meaning || '',
          hanViet: k.han_viet || k.am_han || k.hanViet || '',
          wordType: 'Kanji',
          level: 'N3',
          sampleSentence: k.tu_vung ? (Array.isArray(k.tu_vung) ? k.tu_vung.join(', ') : k.tu_vung) : '',
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

  // Generate Quiz Questions from Lesson Data based on selected Options
  const startQuiz = () => {
    if (!lessonData) return;
    setQuizSetupError('');

    // Combine all study items (chu_han, tu_vung, ngu_phap)
    let allPool = [];
    if (lessonData.tu_vung && lessonData.tu_vung.length > 0) {
      lessonData.tu_vung.forEach((v) => {
        allPool.push({
          type: 'vocab',
          category: 'Từ vựng',
          ja: v.tu,
          hiragana: v.furigana || v.hiragana || v.tu,
          vi: v.nghia,
          wordObj: {
            id: v.id,
            kanji: v.tu,
            hiragana: v.furigana || v.hiragana || v.tu,
            meaning: v.nghia,
            hanViet: v.am_han || ''
          }
        });
      });
    }

    if (lessonData.chu_han && lessonData.chu_han.length > 0) {
      lessonData.chu_han.forEach((k) => {
        allPool.push({
          type: 'kanji',
          category: 'Kanji',
          ja: k.kanji,
          hiragana: k.kanji,
          vi: `${k.han_viet ? k.han_viet + ' - ' : ''}${k.nghia}`,
          wordObj: {
            id: k.id,
            kanji: k.kanji,
            hiragana: k.kanji,
            meaning: k.nghia,
            hanViet: k.han_viet || ''
          }
        });
      });
    }

    if (lessonData.ngu_phap && lessonData.ngu_phap.length > 0) {
      lessonData.ngu_phap.forEach((g) => {
        allPool.push({
          type: 'grammar',
          category: 'Ngữ pháp',
          ja: g.cau_truc,
          hiragana: g.cau_truc,
          vi: g.y_nghia,
          wordObj: null
        });
      });
    }

    if (allPool.length === 0) {
      setQuizSetupError('Chưa có dữ liệu từ vựng/ngữ pháp nào để tạo bài Quiz.');
      return;
    }

    // Scope filtering
    let selectedItems = [...allPool];
    if (quizOptType === 'random') {
      const count = Math.min(Math.max(1, parseInt(quizOptRandomCount) || 15), allPool.length);
      selectedItems = shuffleArray(allPool).slice(0, count);
    } else if (quizOptType === 'range') {
      const start = Math.max(1, parseInt(quizOptRangeStart) || 1) - 1;
      const end = Math.min(parseInt(quizOptRangeEnd) || allPool.length, allPool.length);
      if (start >= end) {
        setQuizSetupError(`Khoảng câu hỏi không hợp lệ (từ ${start + 1} đến ${end}).`);
        return;
      }
      selectedItems = allPool.slice(start, end);
    }

    // Build Quiz Questions based on Direction Selection
    const questions = selectedItems.map((item, idx) => {
      let questionText = '';
      let correctAnswer = '';
      let distractors = [];

      if (quizQuestionType === 'ja-to-vi') {
        questionText = item.type === 'grammar' 
          ? `Cấu trúc "${item.ja}" có nghĩa là gì?`
          : item.type === 'kanji'
          ? `Hán tự "${item.ja}" có nghĩa là gì?`
          : `Từ vựng "${item.ja}" có nghĩa là gì?`;
        correctAnswer = item.vi;

        const otherItems = allPool.filter(x => x.vi !== item.vi);
        distractors = shuffleArray(otherItems).map(x => x.vi).slice(0, 3);
        while (distractors.length < 3) {
          distractors.push(`Ý nghĩa ${distractors.length + 1}`);
        }
      } else {
        // vi-to-ja
        questionText = `Ý nghĩa "${item.vi}" tương ứng với từ/cấu trúc tiếng Nhật nào?`;
        correctAnswer = item.ja;

        const otherItems = allPool.filter(x => x.ja !== item.ja);
        distractors = shuffleArray(otherItems).map(x => x.ja).slice(0, 3);
        while (distractors.length < 3) {
          distractors.push(`Từ ${distractors.length + 1}`);
        }
      }

      const options = shuffleArray([correctAnswer, ...distractors.slice(0, 3)]);

      return {
        id: `q-${idx}`,
        category: item.category,
        question: questionText,
        options,
        correctAnswer,
        item,
        wordObj: item.wordObj
      };
    });

    setQuizQuestions(questions);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setUserInput('');
    setQuestionAnswered(false);
    setQuizScore(0);
    setMistakes([]);
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

  const handleAnswerCheck = (givenAnswer) => {
    const q = quizQuestions[currentQuestionIndex];
    if (!q || questionAnswered) return;

    const answerToTest = (givenAnswer !== undefined ? givenAnswer : userInput).trim();
    if (!answerToTest) return;

    let isCorrect = false;

    if (quizAnswerMode === 'mc') {
      isCorrect = answerToTest === q.correctAnswer;
    } else {
      // Typing mode
      if (quizQuestionType === 'vi-to-ja') {
        const inputClean = answerToTest.toLowerCase();
        const jaClean = (q.item?.ja || '').toLowerCase();
        const hiraClean = (q.item?.hiragana || '').toLowerCase();
        isCorrect = (inputClean === jaClean || inputClean === hiraClean);
      } else {
        // ja-to-vi mode with smart Vietnamese match & synonyms
        isCorrect = matchVietnameseAnswer(answerToTest, q.correctAnswer || q.item?.vi || '');
      }
    }

    // Determine SRS quality rating (Identical to Daily Study)
    let quality = 1; // Forgot
    if (isCorrect) {
      if (elapsedSeconds <= 3) {
        quality = 4; // Easy
      } else if (elapsedSeconds <= 8) {
        quality = 3; // Good
      } else {
        quality = 2; // Hard
      }
    }

    setLastAssignedQuality(quality);
    setQuestionAnswered(true);

    // Save user answer
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: {
        givenAnswer: answerToTest,
        isCorrect,
        quality,
        elapsedSeconds
      }
    }));

    // Trigger SRS review assessment in database (marks word as learned)
    if (isCorrect && q.wordObj && q.wordObj.id) {
      srsApi.reviewWord(q.wordObj.id, quality).catch(err => {
        console.warn("SRS review word update failed:", err);
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserInput('');
      setQuestionAnswered(false);
      setElapsedSeconds(0);
    } else {
      handleSubmitQuiz();
    }
  };

  const handleSubmitQuiz = async () => {
    let score = 0;
    const wrongList = [];
    quizQuestions.forEach((q, idx) => {
      const ans = userAnswers[idx];
      if (ans && ans.isCorrect) {
        score++;
      } else {
        wrongList.push(q.item);
      }
    });

    setQuizScore(score);
    setMistakes(wrongList);
    setSubmittingQuiz(true);

    const total = quizQuestions.length;
    const accuracy = Math.round((score / total) * 100);
    const isPassed = accuracy >= 90;

    try {
      if (quizOptType === 'all' || isPassed) {
        const res = await jlptN3Api.submitQuiz(selectedChapter, selectedLesson, score, total);
        setQuizResult({
          score,
          total,
          accuracy,
          passed: isPassed,
          backendMsg: res.message
        });
        loadOverview();
      } else {
        setQuizResult({
          score,
          total,
          accuracy,
          passed: isPassed
        });
      }
      setQuizState('finished');
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setQuizResult({
        score,
        total,
        accuracy,
        passed: isPassed
      });
      setQuizState('finished');
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
                        <div style={{ width: '100%', maxWidth: '1050px', margin: '0 auto' }}>
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
                  TAB 3: QUIZ TEST (With Typing & MC Options, SRS Rating & Pass >= 90%)
                 ─────────────────────────────────────────────────────────────── */}
              {activeTab === 'quiz' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0' }}>
                  
                  {/* QUIZ SETUP SCREEN (Configuration Modal) */}
                  {quizState === 'setup' && (
                    <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '36px', maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                          <Sparkles size={32} />
                        </div>
                        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                          Cấu hình Quiz Kiểm tra - Bài {selectedLesson}
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                          Đạt <strong style={{ color: '#10b981' }}>≥ 90%</strong> điểm số ở chế độ kiểm tra tất cả từ vựng để mở khóa hoàn thành Bài học!
                        </p>
                      </div>

                      {/* Quiz Answer Mode Selection (Gõ chữ vs Trắc nghiệm) */}
                      <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px', fontSize: '0.95rem' }}>
                          Hình thức làm bài Quiz:
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            type="button"
                            className={`btn ${quizAnswerMode === 'typing' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '12px 10px', fontSize: '0.92rem', borderRadius: '10px', fontWeight: 700 }}
                            onClick={() => setQuizAnswerMode('typing')}
                          >
                            ⌨️ Gõ câu trả lời (Typing)
                          </button>
                          <button 
                            type="button"
                            className={`btn ${quizAnswerMode === 'mc' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '12px 10px', fontSize: '0.92rem', borderRadius: '10px', fontWeight: 700 }}
                            onClick={() => setQuizAnswerMode('mc')}
                          >
                            🔘 Trắc nghiệm (4 Lựa chọn)
                          </button>
                        </div>
                      </div>

                      {/* Question Direction Selection */}
                      <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px', fontSize: '0.95rem' }}>
                          Chiều câu hỏi Quiz:
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            type="button"
                            className={`btn ${quizQuestionType === 'vi-to-ja' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '10px 8px', fontSize: '0.88rem', borderRadius: '10px' }}
                            onClick={() => setQuizQuestionType('vi-to-ja')}
                          >
                            🇻🇳 Nghĩa Việt → 🇯🇵 Tiếng Nhật
                          </button>
                          <button 
                            type="button"
                            className={`btn ${quizQuestionType === 'ja-to-vi' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '10px 8px', fontSize: '0.88rem', borderRadius: '10px' }}
                            onClick={() => setQuizQuestionType('ja-to-vi')}
                          >
                            🇯🇵 Tiếng Nhật → 🇻🇳 Nghĩa Việt
                          </button>
                        </div>
                      </div>

                      {/* Hiragana Hint Option */}
                      {quizQuestionType === 'ja-to-vi' && (
                        <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input 
                            type="checkbox" 
                            id="showHiraganaHintJlpt" 
                            checked={showHiraganaHint} 
                            onChange={(e) => setShowHiraganaHint(e.target.checked)} 
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <label htmlFor="showHiraganaHintJlpt" style={{ fontWeight: 600, cursor: 'pointer', fontSize: '0.92rem' }}>
                            Hiển thị cách đọc Hiragana (Furigana) kèm Kanji
                          </label>
                        </div>
                      )}

                      {/* Quiz Scope Options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem' }}>
                          Phạm vi & Số lượng câu hỏi:
                        </label>

                        {/* Option: All */}
                        <label style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', 
                          border: `1.5px solid ${quizOptType === 'all' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          backgroundColor: quizOptType === 'all' ? 'rgba(37,99,235,0.06)' : 'transparent', cursor: 'pointer'
                        }}>
                          <input 
                            type="radio" 
                            name="quizOptTypeJlpt" 
                            value="all" 
                            checked={quizOptType === 'all'} 
                            onChange={() => setQuizOptType('all')} 
                          />
                          <div>
                            <strong style={{ fontSize: '0.95rem' }}>Tất cả các nội dung trong bài</strong>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Kiểm tra toàn bộ từ vựng, chữ Hán & ngữ pháp của Bài {selectedLesson} (Bắt buộc đạt ≥ 90% để qua bài)
                            </div>
                          </div>
                        </label>

                        {/* Option: Random */}
                        <label style={{ 
                          display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px', borderRadius: '12px', 
                          border: `1.5px solid ${quizOptType === 'random' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          backgroundColor: quizOptType === 'random' ? 'rgba(37,99,235,0.06)' : 'transparent', cursor: 'pointer'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input 
                              type="radio" 
                              name="quizOptTypeJlpt" 
                              value="random" 
                              checked={quizOptType === 'random'} 
                              onChange={() => setQuizOptType('random')} 
                            />
                            <div>
                              <strong style={{ fontSize: '0.95rem' }}>Chọn ngẫu nhiên câu hỏi</strong>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Lấy ngẫu nhiên một số câu hỏi từ bài học để kiểm tra nhanh
                              </div>
                            </div>
                          </div>
                          {quizOptType === 'random' && (
                            <div style={{ paddingLeft: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input 
                                type="number" 
                                min="1" 
                                max="50"
                                value={quizOptRandomCount}
                                onChange={(e) => setQuizOptRandomCount(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', width: '90px' }}
                              />
                              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>câu hỏi</span>
                            </div>
                          )}
                        </label>

                        {/* Option: Range */}
                        <label style={{ 
                          display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px', borderRadius: '12px', 
                          border: `1.5px solid ${quizOptType === 'range' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          backgroundColor: quizOptType === 'range' ? 'rgba(37,99,235,0.06)' : 'transparent', cursor: 'pointer'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input 
                              type="radio" 
                              name="quizOptTypeJlpt" 
                              value="range" 
                              checked={quizOptType === 'range'} 
                              onChange={() => setQuizOptType('range')} 
                            />
                            <div>
                              <strong style={{ fontSize: '0.95rem' }}>Theo khoảng câu hỏi</strong>
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Kiểm tra theo thứ tự vị trí từ câu A đến câu B
                              </div>
                            </div>
                          </div>
                          {quizOptType === 'range' && (
                            <div style={{ paddingLeft: '28px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span>Từ câu</span>
                              <input 
                                type="number" min="1" value={quizOptRangeStart}
                                onChange={(e) => setQuizOptRangeStart(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', width: '80px' }}
                              />
                              <span>đến câu</span>
                              <input 
                                type="number" min="1" value={quizOptRangeEnd}
                                onChange={(e) => setQuizOptRangeEnd(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', width: '80px' }}
                              />
                            </div>
                          )}
                        </label>
                      </div>

                      {quizSetupError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
                          {quizSetupError}
                        </div>
                      )}

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
                  {quizState === 'playing' && quizQuestions.length > 0 && (() => {
                    const q = quizQuestions[currentQuestionIndex];
                    const currentAns = userAnswers[currentQuestionIndex];

                    return (
                      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '680px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Question Header & Progress & Timer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
                          <span style={{ fontSize: '0.85rem', padding: '4px 10px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-color)' }}>
                            {q?.category}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⏱️ {elapsedSeconds}s
                          </div>
                          <span>
                            Câu {currentQuestionIndex + 1} / {quizQuestions.length}
                          </span>
                        </div>

                        <div style={{ width: '100%', height: '6px', background: 'var(--surface-hover)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.2s ease' }} />
                        </div>

                        {/* Question Display Card */}
                        <div style={{ textAlign: 'center', margin: '10px 0', padding: '24px', background: 'var(--surface-hover)', borderRadius: '16px' }}>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '8px' }}>
                            {quizQuestionType === 'vi-to-ja' ? 'Hãy nhập từ/đọc Tiếng Nhật tương ứng:' : 'Hãy trả lời nghĩa Tiếng Việt tương ứng:'}
                          </p>
                          <h2 className="font-jp" style={{ fontSize: '2.4rem', color: 'var(--text-primary)', lineHeight: 1.4, margin: '0 0 6px 0', fontWeight: 800 }}>
                            {quizQuestionType === 'vi-to-ja' ? q?.item?.vi : q?.item?.ja}
                          </h2>
                          {showHiraganaHint && quizQuestionType === 'ja-to-vi' && q?.item?.hiragana && (
                            <div style={{ fontSize: '1.1rem', color: 'var(--accent-color)', fontStyle: 'italic', marginTop: '4px' }}>
                              ({q.item.hiragana})
                            </div>
                          )}
                          {quizQuestionType === 'vi-to-ja' && q?.item?.wordObj?.hanViet && (
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              【{q.item.wordObj.hanViet}】
                            </div>
                          )}
                        </div>

                        {/* TYPING INPUT MODE */}
                        {quizAnswerMode === 'typing' && !questionAnswered && (
                          <form onSubmit={(e) => { e.preventDefault(); handleAnswerCheck(); }} style={{ display: 'flex', gap: '10px' }}>
                            <input
                              type="text"
                              autoFocus
                              value={userInput}
                              onChange={(e) => setUserInput(e.target.value)}
                              placeholder={quizQuestionType === 'vi-to-ja' ? 'Gõ từ tiếng Nhật (Kanji/Hiragana)...' : 'Nhập nghĩa Tiếng Việt...'}
                              className={quizQuestionType === 'vi-to-ja' ? 'font-jp' : ''}
                              style={{
                                flex: 1,
                                padding: '16px 20px',
                                borderRadius: '12px',
                                border: '2px solid var(--border-color)',
                                backgroundColor: 'var(--surface-color)',
                                color: 'var(--text-primary)',
                                fontSize: '1.2rem',
                                outline: 'none'
                              }}
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: '16px 28px', fontSize: '1.05rem', fontWeight: 800 }}>
                              Kiểm tra ✓
                            </button>
                          </form>
                        )}

                        {/* MULTIPLE CHOICE MODE */}
                        {quizAnswerMode === 'mc' && !questionAnswered && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {q?.options?.map((opt, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleAnswerCheck(opt)}
                                style={{
                                  padding: '16px 20px', borderRadius: '12px', border: '2px solid var(--border-color)',
                                  background: 'var(--surface-color)', color: 'var(--text-primary)',
                                  fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* ANSWER FEEDBACK & SRS EVALUATION CARD */}
                        {questionAnswered && currentAns && (
                          <div className="animate-fade-in" style={{
                            backgroundColor: currentAns.isCorrect ? 'var(--success-light)' : 'var(--danger-light)',
                            borderColor: currentAns.isCorrect ? 'var(--success-color)' : 'var(--danger-color)',
                            borderWidth: '1.5px', borderStyle: 'solid', borderRadius: '16px', padding: '20px',
                            display: 'flex', flexDirection: 'column', gap: '16px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                {currentAns.isCorrect ? (
                                  <CheckCircle size={32} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                ) : (
                                  <AlertCircle size={32} color="var(--danger-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                )}
                                <div style={{ textAlign: 'left' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h3 style={{ color: currentAns.isCorrect ? 'var(--success-color)' : 'var(--danger-color)', margin: 0, fontSize: '1.2rem' }}>
                                      {currentAns.isCorrect ? 'Chính xác! 🎉' : 'Chưa đúng ⚠️'}
                                    </h3>
                                    <span style={{ 
                                      fontSize: '0.78rem', padding: '3px 10px', borderRadius: '10px', fontWeight: 700,
                                      backgroundColor: lastAssignedQuality === 4 ? 'var(--success-light)' : lastAssignedQuality === 3 ? 'rgba(37,99,235,0.1)' : lastAssignedQuality === 2 ? 'rgba(245,158,11,0.1)' : 'var(--danger-light)',
                                      color: lastAssignedQuality === 4 ? 'var(--success-color)' : lastAssignedQuality === 3 ? 'var(--accent-color)' : lastAssignedQuality === 2 ? '#f59e0b' : 'var(--danger-color)',
                                      border: '1px solid rgba(0,0,0,0.05)'
                                    }}>
                                      {lastAssignedQuality === 4 ? '🚀 Easy (Xuất sắc)' : lastAssignedQuality === 3 ? '👍 Good (Chuẩn)' : lastAssignedQuality === 2 ? '⌛ Hard (Chậm)' : '⚠️ Forgot (Cần ôn)'} ({currentAns.elapsedSeconds}s)
                                    </span>
                                  </div>

                                  <div style={{ marginTop: '8px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                    <strong>Đáp án đúng:</strong> <span className="font-jp" style={{ color: 'var(--success-color)', fontWeight: 700 }}>{q.correctAnswer}</span>
                                    {q.item?.hiragana && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({q.item.hiragana})</span>}
                                  </div>

                                  {!currentAns.isCorrect && (
                                    <div style={{ marginTop: '4px', fontSize: '0.95rem', color: 'var(--danger-color)' }}>
                                      <strong>Bạn đã nhập:</strong> {currentAns.givenAnswer}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* DeepSeek AI Breakdown Card */}
                            {q.wordObj && (
                              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                                  🤖 Giải thích chi tiết DeepSeek AI:
                                </h4>
                                <AiEnrichedTabbedView data={q.wordObj} />
                              </div>
                            )}

                            {/* Next Question Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                              {currentQuestionIndex < quizQuestions.length - 1 ? (
                                <button onClick={handleNextQuestion} className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 800 }}>
                                  Câu tiếp ➔
                                </button>
                              ) : (
                                <button onClick={handleNextQuestion} className="btn" style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 800, background: '#10b981', color: 'white' }}>
                                  Nộp Bài Quiz ✓
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })()}

                  {/* QUIZ FINISHED SCREEN */}
                  {quizState === 'finished' && quizResult && (
                    <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '36px', maxWidth: '640px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                          {quizResult.passed ? 'Chúc mừng! Đã đạt tiêu chuẩn Hoàn thành! 🎉' : 'Chưa đạt chỉ tiêu (≥ 90%) ⚠️'}
                        </h2>
                        <div style={{ fontSize: '3rem', fontWeight: 900, color: quizResult.passed ? '#10b981' : '#ef4444' }}>
                          {quizResult.accuracy}%
                        </div>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                          Đúng {quizResult.score} / {quizResult.total} câu hỏi
                        </p>
                      </div>

                      {mistakes.length > 0 && (
                        <div style={{ textAlign: 'left', background: 'var(--surface-hover)', borderRadius: '16px', padding: '20px' }}>
                          <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0', color: '#ef4444' }}>
                            Các câu trả lời chưa đúng ({mistakes.length}):
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                            {mistakes.map((m, idx) => (
                              <div key={idx} style={{ padding: '8px 12px', background: 'var(--surface-color)', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span className="font-jp" style={{ fontWeight: 700 }}>{m.ja} {m.hiragana ? `(${m.hiragana})` : ''}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{m.vi}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={startQuiz}
                          style={{ padding: '14px 22px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <RotateCcw size={16} /> Làm lại Quiz
                        </button>
                        <button
                          onClick={() => setActiveTab('flashcard')}
                          style={{ padding: '14px 22px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface-hover)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <BookOpen size={16} /> Ôn thẻ Flashcard
                        </button>
                        <button
                          onClick={() => setPhase('overview')}
                          style={{ padding: '14px 22px', borderRadius: '12px', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
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
