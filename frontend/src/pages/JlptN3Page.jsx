import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, CheckCircle, XCircle, ChevronRight, ChevronLeft, RotateCcw, 
  Trophy, ArrowLeft, ArrowRight, Play, Sparkles, Layers, List, Award, 
  HelpCircle, AlertCircle, Volume2, Shuffle, Upload, FileText, Eye, EyeOff, Trash2
} from 'lucide-react';
import { jlptN3Api, srsApi, vocabApi, grammarApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FlashcardCard from '../components/FlashcardCard';
import KanjiDetailModal from '../components/KanjiDetailModal';
import GrammarDetailModal from '../components/GrammarDetailModal';
import AiEnrichedTabbedView from '../components/AiEnrichedTabbedView';
import LessonQuizView from '../components/LessonQuizView';

// ─── Helper: detect kanji characters in a string ──────────────────────────
const isContainsKanji = (str) => /[\u4e00-\u9faf\u3400-\u4dbf]/.test(str);

// ─── Vietnamese Synonym & Typo Matcher Utilities (ported from DailyStudyPage) ──
const VIETNAMESE_SYNONYMS = [
  ["bỏ việc", "nghỉ việc", "thôi việc"],
  ["cao tuổi", "lớn tuổi", "già"],
  ["yêu", "thương", "mến", "thích"],
  ["học sinh", "sinh viên", "học viên", "người học"],
  ["giúp đỡ", "trợ giúp", "hỗ trợ", "giúp"],
  ["bắt đầu", "khởi đầu"],
  ["kết thúc", "hoàn thành", "xong"],
  ["nhanh", "lẹ"],
  ["chậm", "trễ", "muộn"],
  ["đẹp", "xinh", "dễ thương"],
  ["thông minh", "sáng dạ", "giỏi"],
  ["đơn giản", "dễ", "dễ dàng"],
  ["khó", "phức tạp"],
  ["quyết định", "lựa chọn"],
  ["lo lắng", "bồn chồn", "sợ", "lo"],
  ["vui vẻ", "hạnh phúc", "vui"],
  ["buồn", "sầu", "chán", "buồn bã"],
  ["tức giận", "nổi giận", "giận", "bực mình"],
  ["đồ ăn", "thức ăn", "món ăn"],
  ["nước uống", "thức uống"],
  ["công việc", "việc làm", "nghề nghiệp"],
  ["thay đổi", "biến đổi", "chuyển"],
  ["chuẩn bị", "sắp sửa"],
  ["quan trọng", "chủ chốt", "cần thiết"],
  ["nguy hiểm", "nguy kịch"],
  ["an toàn", "yên tâm"],
  ["sức khỏe", "khỏe mạnh", "khỏe"],
  ["xe hơi", "ô tô", "xe ô tô"],
  ["máy bay", "phi cơ"],
  ["xe lửa", "tàu hỏa", "xe hỏa"],
  ["nhà", "căn hộ", "nơi ở", "căn nhà"],
  ["trường học", "trường"],
  ["bệnh viện", "nhà thương"],
  ["cửa hàng", "tiệm", "quán", "cửa tiệm"],
  ["công ty", "doanh nghiệp"],
  ["sử dụng", "dùng"],
  ["làm", "thực hiện", "chế tạo"],
  ["nói", "phát biểu", "trò chuyện"],
  ["nghe", "lắng nghe"],
  ["nhìn", "xem", "quan sát"],
  ["nghĩ", "suy nghĩ", "tư duy"],
  ["nhớ", "ghi nhớ"],
  ["quên", "lãng quên"],
  ["mua", "sắm"],
  ["bán", "giao dịch"],
  ["trả lời", "đáp"],
  ["hỏi", "truy vấn"],
  ["hiểu", "nắm rõ", "biết"],
  ["tìm", "tìm kiếm"],
  ["đóng", "tắt", "khóa"],
  ["mở", "bật"],
  ["gặp", "gặp gỡ"],
  ["viết", "soạn thảo"],
  ["đọc", "xem sách"],
  ["ăn", "dùng bữa"],
  ["uống", "nhấp nháp"],
  ["ngủ", "ngủ nghỉ"],
  ["đi", "di chuyển"],
  ["đến", "tới"],
  ["về", "trở về"],
  ["chạy", "chạy bộ"],
  ["bơi", "tắm biển"],
  ["cười", "vui cười"],
  ["khóc", "lệ rơi"]
];

const areVietnameseSynonyms = (w1, w2) => {
  const clean1 = w1.trim().toLowerCase().normalize("NFC");
  const clean2 = w2.trim().toLowerCase().normalize("NFC");
  if (clean1 === clean2) return true;
  return VIETNAMESE_SYNONYMS.some(cluster =>
    cluster.includes(clean1) && cluster.includes(clean2)
  );
};

const getLevenshteinDistance = (a, b) => {
  const aNorm = a.normalize("NFC");
  const bNorm = b.normalize("NFC");
  if (aNorm.length === 0) return bNorm.length;
  if (bNorm.length === 0) return aNorm.length;
  const matrix = [];
  for (let i = 0; i <= bNorm.length; i++) matrix[i] = [i];
  for (let j = 0; j <= aNorm.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= bNorm.length; i++) {
    for (let j = 1; j <= aNorm.length; j++) {
      if (bNorm.charAt(i - 1) === aNorm.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[bNorm.length][aNorm.length];
};

const matchVietnameseAnswer = (userInput, correctMeaning) => {
  const inputClean = userInput.trim().toLowerCase().normalize("NFC");
  const meaningClean = correctMeaning.trim().toLowerCase().normalize("NFC");
  if (inputClean === meaningClean) return true;
  const delimiters = /[,;\\/()]/;
  const correctParts = meaningClean.split(delimiters)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  if (correctParts.includes(inputClean)) return true;
  for (const part of correctParts) {
    if (areVietnameseSynonyms(inputClean, part)) return true;
  }
  for (const part of correctParts) {
    if (part.length >= 4) {
      const dist = getLevenshteinDistance(inputClean, part);
      if (dist <= 1) return true;
    }
  }
  return false;
};

const JlptN3Page = () => {
  const { user } = useAuth();
  const isAdmin = user && (user.username === 'admin' || user.role === 'ADMIN' || user.roles?.includes('ADMIN') || user.roles?.includes('ROLE_ADMIN'));
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

  const handleDeleteWord = async (e, word) => {
    e.stopPropagation();
    if (!word || !word.id) return;
    const wordLabel = word.kanji || word.tu || word.hiragana || 'từ vựng này';
    const confirmMsg = `Bạn có chắc chắn muốn xóa "${wordLabel}" (ID: ${word.id}) khỏi hệ thống không?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await vocabApi.delete(word.id);
      setLessonData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tu_vung: prev.tu_vung ? prev.tu_vung.filter(v => v.id !== word.id && v.tu !== word.kanji && v.tu !== wordLabel) : [],
          chu_han: prev.chu_han ? prev.chu_han.filter(k => k.id !== word.id && k.kanji !== word.kanji && k.kanji !== wordLabel) : []
        };
      });
      alert(`Đã xóa "${wordLabel}" thành công!`);
    } catch (err) {
      console.error("Lỗi khi xóa từ vựng:", err);
      alert("Không thể xóa từ vựng. Vui lòng thử lại!");
    }
  };

  const openGrammarModal = async (g) => {
    if (g.id) {
      try {
        const full = await grammarApi.getById(g.id);
        setSelectedGrammarModal(full);
      } catch {
        setSelectedGrammarModal({
          id: g.id,
          grammar: g.cau_truc,
          meaning: g.y_nghia,
          formation: g.cach_chia,
          examples: JSON.stringify(g.vi_du ? g.vi_du.map(v => ({ ja: v, vi: '' })) : [])
        });
      }
    } else {
      setSelectedGrammarModal({
        grammar: g.cau_truc,
        meaning: g.y_nghia,
        formation: g.cach_chia,
        examples: JSON.stringify(g.vi_du ? g.vi_du.map(v => ({ ja: v, vi: '' })) : [])
      });
    }
  };

  // Flashcard State
  const [flashcardCategory, setFlashcardCategory] = useState('all'); // 'all' | 'kanji' | 'vocab' | 'grammar'
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // List View Sub-Tab State
  const [listSubTab, setListSubTab] = useState('vocab'); // 'kanji' | 'vocab' | 'grammar'
  const [hideMeanings, setHideMeanings] = useState(false);

  // Quiz State (Ported EXACTLY from Daily Study Quiz)
  const [quizState, setQuizState] = useState('setup'); // 'setup' | 'playing' | 'finished'
  const [quizWords, setQuizWords] = useState([]);
  const [initialQuizWords, setInitialQuizWords] = useState([]);
  const [originalQuizLength, setOriginalQuizLength] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizStatus, setQuizStatus] = useState('idle'); // 'idle' | 'correct' | 'incorrect'
  const [userInput, setUserInput] = useState('');
  const [lastAssignedQuality, setLastAssignedQuality] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastElapsedSeconds, setLastElapsedSeconds] = useState(0);
  const [failedWordIds, setFailedWordIds] = useState(new Set());
  const [seenWordIds, setSeenWordIds] = useState(new Set());
  const [firstAttemptQualities, setFirstAttemptQualities] = useState({});
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState([]);
  const [quizWordEnriched, setQuizWordEnriched] = useState(null);
  const [loadingQuizEnrich, setLoadingQuizEnrich] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Daily Study Quiz Setup Configuration Options
  const [quizQuestionType, setQuizQuestionType] = useState('ja-to-vi'); // 'ja-to-vi' | 'vi-to-ja'
  const [showHiraganaHint, setShowHiraganaHint] = useState(true);
  const [quizCategory, setQuizCategory] = useState('all'); // 'all' | 'vocab' | 'kanji' | 'grammar'
  const [quizOptType, setQuizOptType] = useState('all'); // 'all' | 'random' | 'range'
  const [quizOptRandomCount, setQuizOptRandomCount] = useState(15);
  const [quizOptRangeStart, setQuizOptRangeStart] = useState(1);
  const [quizOptRangeEnd, setQuizOptRangeEnd] = useState(15);
  const [quizSetupError, setQuizSetupError] = useState('');
  const [checkingAiAnswer, setCheckingAiAnswer] = useState(false);
  const [aiMatchExplanation, setAiMatchExplanation] = useState('');
  const [selectedGrammarModal, setSelectedGrammarModal] = useState(null);
  const [loadingGrammarQuiz, setLoadingGrammarQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [quizReviewList, setQuizReviewList] = useState([]);
  const [quizReviewFilter, setQuizReviewFilter] = useState('all'); // 'all' | 'mistakes' | 'correct'

  // Timer effect for real-time elapsed seconds counter during quiz
  useEffect(() => {
    let interval = null;
    if (quizState === 'playing' && quizStatus === 'idle') {
      setElapsedSeconds(0);
      setQuestionStartTime(Date.now());
      interval = setInterval(() => {
        setElapsedSeconds(prev => {
          if (prev >= 30) return 30;
          return prev + 1;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [quizState, quizIndex, quizStatus]);

  // Enter Key Listener for automatically advancing to next question when answered
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (quizState === 'playing' && (quizStatus === 'correct' || quizStatus === 'incorrect')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          nextQuestion();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quizState, quizStatus, quizIndex, quizWords]);

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

  const resetQuizState = () => {
    setQuizState('setup');
    setQuizWords([]);
    setInitialQuizWords([]);
    setQuizIndex(0);
    setQuizStatus('idle');
    setUserInput('');
    setSelectedOption('');
    setScore(0);
    setFailedWordIds(new Set());
    setSeenWordIds(new Set());
    setFirstAttemptQualities({});
    setMistakes([]);
    setQuizReviewList([]);
    setQuizReviewFilter('needs_review');
    setQuizResult(null);
    setQuizWordEnriched(null);
    setAiMatchExplanation('');
    setCheckingAiAnswer(false);
    setQuizSetupError('');
  };

  const handleTabClick = (tabKey) => {
    if (tabKey !== 'quiz') {
      resetQuizState();
    }
    setActiveTab(tabKey);
  };

  // Load specific Lesson Data when selected
  const openLesson = async (chapterId, lessonId) => {
    setSelectedChapter(chapterId);
    setSelectedLesson(lessonId);
    setPhase('lesson');
    setActiveTab('flashcard');
    setLoadingLesson(true);
    resetQuizState();
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
        hiragana: v.cach_doc || v.furigana || v.hiragana || (isKanji ? '' : v.tu) || '',
        romaji: v.cach_doc || v.romaji || '',
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
    return lessonData.chu_han.map((k, idx) => {
      let wordsList = [];
      if (Array.isArray(k.tu_vung)) {
        wordsList = k.tu_vung;
      } else if (typeof k.tu_vung === 'string' && k.tu_vung.startsWith('[')) {
        try { wordsList = JSON.parse(k.tu_vung); } catch { wordsList = [k.tu_vung]; }
      } else if (typeof k.tu_vung === 'string' && k.tu_vung.trim()) {
        wordsList = [k.tu_vung.trim()];
      } else if (k.kanjiWords) {
        if (Array.isArray(k.kanjiWords)) wordsList = k.kanjiWords;
        else if (typeof k.kanjiWords === 'string' && k.kanjiWords.startsWith('[')) {
          try { wordsList = JSON.parse(k.kanjiWords); } catch { wordsList = [k.kanjiWords]; }
        }
      }

      return {
        id: k.id || (idx + 2000),
        kanji: k.kanji || k.tu || '',
        hiragana: k.am_doc || k.kanji || k.tu || '',
        meaning: k.nghia || k.meaning || '',
        hanViet: k.han_viet || k.am_han || k.hanViet || '',
        romaji: k.am_doc || '',
        wordType: 'Kanji',
        level: 'N3',
        tu_vung: wordsList,
        sampleSentence: wordsList.length > 0 ? wordsList.join(', ') : '',
        pitchAccent: k.pitchAccent,
        mnemonic: k.mnemonic,
        exampleSentences: k.exampleSentences
      };
    });
  }, [lessonData]);

  // Extract items for Flashcards (Default Sequence)
  const defaultFlashcardItems = useMemo(() => {
    if (!lessonData) return [];
    const items = [];

    // Vocab Items
    if (lessonData.tu_vung && (flashcardCategory === 'all' || flashcardCategory === 'vocab')) {
      lessonData.tu_vung.forEach((v, idx) => {
        const isKanji = v.tu && isContainsKanji(v.tu);
        items.push({
          id: v.id || `vocab-${idx}`,
          kanji: isKanji ? v.tu : (v.kanji || v.tu || v.hiragana || ''),
          hiragana: v.cach_doc || v.furigana || v.hiragana || (isKanji ? '' : v.tu) || '',
          romaji: v.cach_doc || v.romaji || '',
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
          hiragana: k.am_doc || k.kanji || k.tu || '',
          meaning: k.nghia || k.meaning || '',
          hanViet: k.han_viet || k.am_han || k.hanViet || '',
          romaji: k.am_doc || '',
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

  // Flashcard Order State: Default vs Shuffle
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledItems, setShuffledItems] = useState([]);

  // Fisher-Yates shuffle algorithm
  const shuffleList = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Re-shuffle when category or lesson data changes if currently in shuffle mode
  useEffect(() => {
    if (isShuffle) {
      setShuffledItems(shuffleList(defaultFlashcardItems));
    }
    setCurrentFlashcardIndex(0);
    setIsFlipped(false);
  }, [defaultFlashcardItems, isShuffle]);

  // Active flashcard items based on current mode
  const flashcardItems = useMemo(() => {
    return isShuffle ? shuffledItems : defaultFlashcardItems;
  }, [isShuffle, shuffledItems, defaultFlashcardItems]);

  const currentFlashcardWord = useMemo(() => {
    if (flashcardItems.length === 0) return null;
    return flashcardItems[currentFlashcardIndex] || null;
  }, [flashcardItems, currentFlashcardIndex]);

  // Toggle between Shuffle and Default modes (Single Button)
  const toggleShuffle = () => {
    setIsFlipped(false);
    setCurrentFlashcardIndex(0);
    if (!isShuffle) {
      setShuffledItems(shuffleList(defaultFlashcardItems));
      setIsShuffle(true);
    } else {
      setIsShuffle(false);
    }
  };

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

  const currentCategoryPoolCount = useMemo(() => {
    if (!lessonData) return 0;
    if (quizCategory === 'vocab') return lessonData.tu_vung?.length || 0;
    if (quizCategory === 'kanji') return lessonData.chu_han?.length || 0;
    if (quizCategory === 'grammar') return 30;
    return (lessonData.tu_vung?.length || 0) + (lessonData.chu_han?.length || 0) + (lessonData.ngu_phap?.length || 0);
  }, [lessonData, quizCategory]);

  useEffect(() => {
    setQuizOptRangeStart(1);
    const count = currentCategoryPoolCount || 15;
    setQuizOptRangeEnd(count);
    setQuizOptRandomCount(Math.min(15, count));
  }, [currentCategoryPoolCount]);

  const startQuiz = async () => {
    if (!lessonData) {
      setQuizSetupError('Chưa có dữ liệu Bài học.');
      return;
    }

    setQuizSetupError('');

    // 1. Handle Grammar Category (30 Multiple Choice Questions)
    if (quizCategory === 'grammar') {
      setLoadingGrammarQuiz(true);
      try {
        const questions = await jlptN3Api.getGrammarQuiz(selectedChapter, selectedLesson);
        if (!questions || questions.length === 0) {
          setQuizSetupError('Chưa có dữ liệu đề thi 30 câu ngữ pháp. Vui lòng thử lại!');
          setLoadingGrammarQuiz(false);
          return;
        }

        const mappedQuestions = questions.map((q, idx) => ({
          id: q.id || idx + 1,
          type: 'grammar_mcq',
          question: q.question,
          options: q.options || [],
          answer: q.answer,
          explanation: q.explanation || ''
        }));

        let selectedQuestions = [];
        if (quizOptType === 'all') {
          selectedQuestions = [...mappedQuestions];
        } else if (quizOptType === 'random') {
          const count = parseInt(quizOptRandomCount, 10);
          if (isNaN(count) || count <= 0 || count > mappedQuestions.length) {
            setQuizSetupError(`Vui lòng nhập số câu hợp lệ (1 - ${mappedQuestions.length})`);
            setLoadingGrammarQuiz(false);
            return;
          }
          selectedQuestions = shuffleArray(mappedQuestions).slice(0, count);
        } else if (quizOptType === 'range') {
          const start = parseInt(quizOptRangeStart, 10);
          const end = parseInt(quizOptRangeEnd, 10);
          if (isNaN(start) || isNaN(end) || start <= 0 || end > mappedQuestions.length || start > end) {
            setQuizSetupError(`Khoảng câu hỏi không hợp lệ (Từ 1 đến ${mappedQuestions.length})`);
            setLoadingGrammarQuiz(false);
            return;
          }
          selectedQuestions = mappedQuestions.slice(start - 1, end);
        }

        const finalQuestions = shuffleArray(selectedQuestions);

        setQuizWords(finalQuestions);
        setInitialQuizWords(finalQuestions);
        setOriginalQuizLength(finalQuestions.length);
        setQuizIndex(0);
        setQuizStatus('idle');
        setUserInput('');
        setSelectedOption('');
        setScore(0);
        setFailedWordIds(new Set());
        setSeenWordIds(new Set());
        setFirstAttemptQualities({});
        setMistakes([]);
        setQuizReviewList([]);
        setQuizReviewFilter('all');
        setQuizResult(null);
        setQuizWordEnriched(null);
        setAiMatchExplanation('');
        setCheckingAiAnswer(false);
        setQuestionStartTime(Date.now());
        setQuizState('playing');
      } catch (err) {
        console.error("Failed to load grammar quiz:", err);
        setQuizSetupError('Lỗi khi tải bài test ngữ pháp 30 câu.');
      } finally {
        setLoadingGrammarQuiz(false);
      }
      return;
    }

    // 2. Handle Vocab, Kanji, or All
    const pool = [];
    if ((quizCategory === 'vocab' || quizCategory === 'all') && lessonData.tu_vung) {
      lessonData.tu_vung.forEach((v) => {
        pool.push({
          id: v.id,
          type: 'vocab',
          category: 'Từ vựng',
          kanji: v.kanji || v.tu_vung || v.tu || '',
          hiragana: v.hiragana || v.furigana || v.doc || v.reading || v.tu || '',
          meaning: v.meaning || v.nghia || v.y_nghia || '',
          hanViet: v.hanViet || v.han_viet || v.am_han || '',
          wordType: v.loai_tu || v.wordType || 'Từ vựng',
          sampleSentence: v.vi_du || v.sampleSentence || '',
          mnemonic: v.mnemonic || '',
          usageGuide: v.usageGuide || ''
        });
      });
    }
    if ((quizCategory === 'kanji' || quizCategory === 'all') && lessonData.chu_han) {
      lessonData.chu_han.forEach((k) => {
        pool.push({
          id: k.id,
          type: 'kanji',
          category: 'Chữ Hán',
          kanji: k.kanji || k.tu || '',
          hiragana: k.hiragana || k.furigana || k.doc || k.kanji || k.tu || '',
          meaning: k.meaning || k.nghia || k.y_nghia || '',
          hanViet: k.han_viet || k.am_han || k.hanViet || '',
          wordType: 'Chữ Hán',
          sampleSentence: k.tu_vung ? (Array.isArray(k.tu_vung) ? k.tu_vung.join(', ') : k.tu_vung) : '',
          mnemonic: k.mnemonic || '',
          usageGuide: k.usageGuide || ''
        });
      });
    }

    if (pool.length === 0) {
      setQuizSetupError(`Bài học này chưa có dữ liệu ${quizCategory === 'vocab' ? 'Từ vựng' : quizCategory === 'kanji' ? 'Chữ Hán' : 'nội dung'}.`);
      return;
    }

    let selectedWords = [];
    if (quizOptType === 'all') {
      selectedWords = [...pool];
    } else if (quizOptType === 'random') {
      const count = parseInt(quizOptRandomCount, 10);
      if (isNaN(count) || count <= 0 || count > pool.length) {
        setQuizSetupError(`Vui lòng nhập số câu hợp lệ (1 - ${pool.length})`);
        return;
      }
      selectedWords = shuffleArray(pool).slice(0, count);
    } else if (quizOptType === 'range') {
      const start = parseInt(quizOptRangeStart, 10);
      const end = parseInt(quizOptRangeEnd, 10);
      if (isNaN(start) || isNaN(end) || start <= 0 || end > pool.length || start > end) {
        setQuizSetupError(`Khoảng câu hỏi không hợp lệ (Từ 1 đến ${pool.length})`);
        return;
      }
      selectedWords = pool.slice(start - 1, end);
    }

    const finalWords = shuffleArray(selectedWords);

    setQuizWords(finalWords);
    setInitialQuizWords(finalWords);
    setOriginalQuizLength(finalWords.length);
    setQuizIndex(0);
    setQuizStatus('idle');
    setUserInput('');
    setSelectedOption('');
    setScore(0);
    setFailedWordIds(new Set());
    setSeenWordIds(new Set());
    setFirstAttemptQualities({});
    setMistakes([]);
    setQuizReviewList([]);
    setQuizReviewFilter('all');
    setQuizResult(null);
    setQuizWordEnriched(null);
    setAiMatchExplanation('');
    setCheckingAiAnswer(false);
    setQuestionStartTime(Date.now());
    setQuizState('playing');
  };

  const handleRegenerateGrammarQuiz = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bộ câu hỏi cũ và gọi AI sinh lại 30 câu hỏi mới (15 Mondai 1 + 15 Mondai 2 Star ★) cho bài này?")) return;
    setLoadingGrammarQuiz(true);
    setQuizSetupError('');
    try {
      const questions = await jlptN3Api.regenerateGrammarQuiz(selectedChapter, selectedLesson);
      if (!questions || questions.length === 0) {
        setQuizSetupError('Không thể tạo lại bộ 30 câu hỏi ngữ pháp AI. Vui lòng thử lại!');
        setLoadingGrammarQuiz(false);
        return;
      }

      const mappedQuestions = questions.map((q, idx) => ({
        id: q.id || idx + 1,
        type: q.type || (q.question?.includes('★') ? 'star' : 'grammar_mcq'),
        question: q.question,
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation || ''
      }));

      setQuizWords(mappedQuestions);
      setInitialQuizWords(mappedQuestions);
      setOriginalQuizLength(mappedQuestions.length);
      setQuizIndex(0);
      setQuizStatus('idle');
      setUserInput('');
      setSelectedOption('');
      setScore(0);
      setFailedWordIds(new Set());
      setSeenWordIds(new Set());
      setFirstAttemptQualities({});
      setMistakes([]);
      setQuizReviewList([]);
      setQuizReviewFilter('all');
      setQuizResult(null);
      setQuizWordEnriched(null);
      setAiMatchExplanation('');
      setCheckingAiAnswer(false);
      setQuestionStartTime(Date.now());
      setQuizState('playing');
    } catch (err) {
      console.error("Failed to regenerate grammar quiz:", err);
      setQuizSetupError('Lỗi khi gọi AI sinh lại đề thi ngữ pháp 30 câu.');
    } finally {
      setLoadingGrammarQuiz(false);
    }
  };

  const checkAnswer = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!userInput.trim()) return;

    const currentWord = quizWords[quizIndex];
    if (!currentWord) return;

    const questionKey = String(currentWord.id || currentWord.kanji || currentWord.tu || currentWord.question || quizIndex);
    const isFirstAttempt = !seenWordIds.has(questionKey);

    const inputClean = userInput.trim().toLowerCase();
    let isCorrect = false;

    if (quizQuestionType === 'vi-to-ja') {
      // Direct exact string comparison for Japanese typing (0ms)
      const normInput = inputClean.replace(/[\s\u3000]+/g, '');
      const candidates = [
        currentWord.kanji,
        currentWord.hiragana,
        currentWord.furigana,
        currentWord.tu,
        currentWord.tu_vung,
        currentWord.reading,
        currentWord.doc
      ].filter(Boolean).map(s => String(s).trim().toLowerCase().replace(/[\s\u3000]+/g, ''));

      isCorrect = candidates.some(c => c && normInput === c);
    } else {
      // ja-to-vi mode: Fast local matching without DeepSeek AI call
      isCorrect = matchVietnameseAnswer(userInput, currentWord.meaning || '');
    }

    setAiMatchExplanation('');

    const finalElapsed = Math.min(30, (Date.now() - questionStartTime) / 1000);
    const quality = isCorrect ? (finalElapsed <= 3 ? 4 : finalElapsed <= 8 ? 3 : 2) : 1;
    setLastAssignedQuality(quality);
    setLastElapsedSeconds(finalElapsed);

    const questionDisplay = (
      quizQuestionType === 'vi-to-ja'
        ? (currentWord.meaning || '')
        : (currentWord.kanji ? `${currentWord.kanji} (${currentWord.hiragana})` : currentWord.hiragana)
    );
    const expectedAns = (
      quizQuestionType === 'vi-to-ja'
        ? (currentWord.kanji ? `${currentWord.kanji} (${currentWord.hiragana})` : currentWord.hiragana)
        : (currentWord.meaning || '')
    );
    const explanationText = (
      currentWord.explanation ||
      currentWord.usageGuide ||
      currentWord.mnemonic ||
      currentWord.sampleSentence ||
      (currentWord.hanViet ? `Âm Hán Việt: 【${currentWord.hanViet}】` : '') ||
      ''
    );

    const reviewItem = {
      id: questionKey,
      word: currentWord,
      question: questionDisplay,
      userAnswer: userInput,
      correctAnswer: expectedAns,
      explanation: explanationText,
      isCorrect: isCorrect,
      elapsedSeconds: finalElapsed,
      category: currentWord.category || currentWord.type || quizCategory,
      isRetry: !isFirstAttempt
    };

    // ONLY SCORE AND RECORD RESULTS ON THE FIRST ATTEMPT
    if (isFirstAttempt) {
      setSeenWordIds(prev => new Set(prev).add(questionKey));
      setFirstAttemptQualities(prev => ({
        ...prev,
        [questionKey]: { isCorrect, elapsedSeconds: finalElapsed, quality }
      }));
      setQuizReviewList(prev => [...prev, reviewItem]);

      // Save SRS review rating on first attempt only
      if (currentWord && currentWord.id) {
        const isGrammarItem = (currentWord.type === 'grammar_mcq' || currentWord.type === 'star' || quizCategory === 'grammar' || currentWord.cau_truc);
        if (isGrammarItem) {
          srsApi.reviewGrammar(currentWord.id, quality).catch(console.error);
        } else {
          srsApi.reviewWord(currentWord.id, quality).catch(console.error);
        }
      }

      if (isCorrect) {
        setScore(s => s + 1);
      } else {
        setFailedWordIds(prev => new Set(prev).add(questionKey));
        setMistakes(prev => [...prev, reviewItem]);
      }
    }

    if (isCorrect) {
      setQuizStatus('correct');
      speakWord(currentWord);
    } else {
      setQuizStatus('incorrect');
      // Re-enqueue word at the end to practice until memorized
      setQuizWords(prev => [...prev, currentWord]);
    }
  };

  const handleMcqSelect = (option) => {
    if (quizStatus !== 'idle') return;
    setSelectedOption(option);
    
    const currentWord = quizWords[quizIndex];
    if (!currentWord) return;

    const questionKey = String(currentWord.id || currentWord.question || quizIndex);
    const isFirstAttempt = !seenWordIds.has(questionKey);

    const normalizeOpt = (str) => String(str || '').replace(/^[A-D]\.\s*/i, '').trim().toLowerCase();
    const optNorm = normalizeOpt(option);
    const ansNorm = normalizeOpt(currentWord.answer);

    const isCorrect = (
      option === currentWord.answer ||
      optNorm === ansNorm ||
      option.trim().toLowerCase() === String(currentWord.answer || '').trim().toLowerCase() ||
      (optNorm && ansNorm && (optNorm.includes(ansNorm) || ansNorm.includes(optNorm)))
    );

    const finalElapsed = Math.min(30, (Date.now() - questionStartTime) / 1000);
    const quality = isCorrect ? (finalElapsed <= 3 ? 4 : finalElapsed <= 8 ? 3 : 2) : 1;
    setLastAssignedQuality(quality);
    setLastElapsedSeconds(finalElapsed);

    const reviewItem = {
      id: questionKey,
      word: currentWord,
      question: currentWord.question,
      userAnswer: option,
      correctAnswer: currentWord.answer,
      explanation: currentWord.explanation || '',
      isCorrect: isCorrect,
      elapsedSeconds: finalElapsed,
      category: 'grammar',
      isRetry: !isFirstAttempt
    };

    // ONLY SCORE AND RECORD RESULTS ON THE FIRST ATTEMPT
    if (isFirstAttempt) {
      setSeenWordIds(prev => new Set(prev).add(questionKey));
      setFirstAttemptQualities(prev => ({
        ...prev,
        [questionKey]: { isCorrect, elapsedSeconds: finalElapsed, quality }
      }));
      setQuizReviewList(prev => [...prev, reviewItem]);

      // Save SRS review rating on first attempt only
      if (currentWord && currentWord.id) {
        const isGrammarItem = (currentWord.type === 'grammar_mcq' || currentWord.type === 'star' || quizCategory === 'grammar' || currentWord.cau_truc);
        if (isGrammarItem) {
          srsApi.reviewGrammar(currentWord.id, quality).catch(console.error);
        } else {
          srsApi.reviewWord(currentWord.id, quality).catch(console.error);
        }
      }

      if (isCorrect) {
        setScore(s => s + 1);
      } else {
        setFailedWordIds(prev => new Set(prev).add(questionKey));
        setMistakes(prev => [...prev, reviewItem]);
      }
    }

    if (isCorrect) {
      setQuizStatus('correct');
    } else {
      setQuizStatus('incorrect');
      // Re-enqueue question at the end to practice until memorized
      setQuizWords(prev => [...prev, currentWord]);
    }
  };

  const speakWord = (word) => {
    if (!word) return;
    const text = word.hiragana || word.kanji || word.tu || '';
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  };

  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const nextQuestion = () => {
    if (quizIndex + 1 < quizWords.length) {
      setQuizIndex(i => i + 1);
      setUserInput('');
      setSelectedOption('');
      setQuizStatus('idle');
      setQuizWordEnriched(null);
      setAiMatchExplanation('');
      setCheckingAiAnswer(false);
      setQuestionStartTime(Date.now());
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const firstTryScore = score;
    const total = originalQuizLength;
    const accuracy = total > 0 ? Math.round((firstTryScore / total) * 100) : 0;

    // Calculate Average Response Time for unique questions (First Attempts)
    const qualityEntries = Object.values(firstAttemptQualities);
    const totalElapsed = qualityEntries.reduce((sum, q) => sum + (q.elapsedSeconds || 0), 0);
    const avgElapsed = qualityEntries.length > 0 ? (totalElapsed / qualityEntries.length) : 0;
    const isSpeedGood = avgElapsed <= 8.0;

    // Pass condition: Option is 'all', accuracy >= 80%, and average response time is Good (<= 8s)
    const isScopeAll = (quizOptType === 'all');
    const isPassed = isScopeAll && accuracy >= 80 && isSpeedGood;

    setSubmittingQuiz(true);
    try {
      let res = {};
      if (isPassed) {
        res = await jlptN3Api.submitQuiz(selectedChapter, selectedLesson, quizCategory, firstTryScore, total);
        if (res) {
          setLessonData(prev => prev ? ({
            ...prev,
            vocabPassed: res.vocabPassed !== undefined ? res.vocabPassed : (quizCategory === 'vocab' || quizCategory === 'all' ? true : prev.vocabPassed),
            kanjiPassed: res.kanjiPassed !== undefined ? res.kanjiPassed : (quizCategory === 'kanji' || quizCategory === 'all' ? true : prev.kanjiPassed),
            grammarPassed: res.grammarPassed !== undefined ? res.grammarPassed : (quizCategory === 'grammar' || quizCategory === 'all' ? true : prev.grammarPassed),
            completed: res.completed !== undefined ? res.completed : prev.completed,
            bestScore: res.bestScore || Math.max(prev.bestScore || 0, accuracy)
          }) : prev);
        }
      }
      setQuizResult({
        score: firstTryScore,
        total,
        accuracy,
        avgElapsed,
        isSpeedGood,
        isScopeAll,
        passed: isPassed,
        vocabPassed: res?.vocabPassed,
        kanjiPassed: res?.kanjiPassed,
        grammarPassed: res?.grammarPassed,
        completed: res?.completed,
        backendMsg: res?.message
      });
      loadOverview();
      setQuizState('finished');
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setQuizResult({
        score: firstTryScore,
        total,
        accuracy,
        avgElapsed,
        isSpeedGood,
        isScopeAll,
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
      let summaryText = `🎉 Tải lên & Nạp dữ liệu thành công ${res.processedFilesCount} tệp JSON!\n\n` +
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

  const getLessonBadge = (completed, bestScore, available, vocabPassed, kanjiPassed, grammarPassed, quizPassed) => {
    if (!available) {
      return (
        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', background: 'var(--surface-hover)', color: 'var(--text-muted)', fontWeight: 600 }}>
          Chưa mở
        </span>
      );
    }
    const isCompleted = completed || quizPassed || (vocabPassed && kanjiPassed && grammarPassed);
    if (isCompleted) {
      return (
        <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.25))', color: '#059669', fontWeight: 800, border: '1px solid rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle size={13} /> {quizPassed ? 'Pass Trắc nghiệm (100%)' : 'Hoàn thành 100%'}
        </span>
      );
    }
    const passedCount = (vocabPassed ? 1 : 0) + (kanjiPassed ? 1 : 0) + (grammarPassed ? 1 : 0) + (quizPassed ? 1 : 0);
    if (passedCount > 0) {
      return (
        <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ✓ Đã Pass {passedCount}/4 mục
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
      <span style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent-color)', fontWeight: 600 }}>
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
            background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, var(--accent-color) 100%)',
            borderRadius: '20px', padding: '30px 32px', color: 'white',
            boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden'
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
                    padding: '8px 18px', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.35)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white', fontWeight: 800,
                    fontSize: '0.9rem', cursor: uploadingFiles ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)', display: 'inline-flex', alignItems: 'center', gap: '8px',
                    backdropFilter: 'blur(8px)',
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
                    <div style={{ width: `${overview.progressPercentage}%`, height: '100%', background: 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.85) 100%)', borderRadius: '10px', transition: 'width 0.4s ease' }} />
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
                          background: ch.completedLessons === 3 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
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
                        {ch.lessons?.map((les) => {
                          const isLessonCompleted = les.completed || les.quizPassed || (les.vocabPassed && les.kanjiPassed && les.grammarPassed);
                          const passedCount = (les.vocabPassed ? 1 : 0) + (les.kanjiPassed ? 1 : 0) + (les.grammarPassed ? 1 : 0) + (les.quizPassed ? 1 : 0);

                          return (
                            <div 
                              key={les.id}
                              onClick={() => les.available && openLesson(ch.id, les.id)}
                              style={{
                                padding: '16px 20px', borderRadius: '16px',
                                border: isLessonCompleted 
                                  ? '1.5px solid #10b981' 
                                  : passedCount > 0 
                                    ? '1.5px solid rgba(16,185,129,0.45)' 
                                    : '1px solid var(--border-color)',
                                background: !les.available 
                                  ? 'var(--surface-hover)' 
                                  : isLessonCompleted 
                                    ? 'linear-gradient(135deg, rgba(16,185,129,0.09) 0%, rgba(16,185,129,0.02) 100%)' 
                                    : passedCount > 0 
                                      ? 'linear-gradient(135deg, var(--accent-light) 0%, rgba(16,185,129,0.03) 100%)' 
                                      : 'var(--surface-color)',
                                boxShadow: isLessonCompleted ? '0 4px 14px rgba(16,185,129,0.12)' : 'none',
                                cursor: les.available ? 'pointer' : 'not-allowed',
                                display: 'flex', flexDirection: 'column', gap: '12px',
                                opacity: les.available ? 1 : 0.65,
                                transition: 'all 0.25s ease'
                              }}
                              className={les.available ? 'card-hover' : ''}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ 
                                    width: '24px', height: '24px', borderRadius: '50%', 
                                    background: isLessonCompleted ? '#10b981' : passedCount > 0 ? 'var(--accent-color)' : 'var(--surface-hover)', 
                                    color: isLessonCompleted || passedCount > 0 ? 'white' : 'var(--text-secondary)',
                                    fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' 
                                  }}>
                                    {les.id}
                                  </span>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: isLessonCompleted ? '#059669' : 'var(--text-primary)', fontWeight: 700 }}>
                                    Bài {les.id} {isLessonCompleted && '🎉'}
                                  </h4>
                                </div>
                                {getLessonBadge(les.completed, les.bestScore, les.available, les.vocabPassed, les.kanjiPassed, les.grammarPassed, les.quizPassed)}
                              </div>

                              {/* Component Pills (Từ vựng, Hán tự, Ngữ pháp, Trắc nghiệm) with Pass Status */}
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 600,
                                  background: les.vocabPassed ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)',
                                  color: les.vocabPassed ? '#059669' : 'var(--text-muted)',
                                  border: `1px solid ${les.vocabPassed ? 'rgba(16,185,129,0.3)' : 'transparent'}`
                                }}>
                                  {les.vocabPassed ? '✓ Từ vựng' : 'Từ vựng'}
                                </span>
                                <span style={{
                                  fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 600,
                                  background: les.kanjiPassed ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)',
                                  color: les.kanjiPassed ? '#059669' : 'var(--text-muted)',
                                  border: `1px solid ${les.kanjiPassed ? 'rgba(16,185,129,0.3)' : 'transparent'}`
                                }}>
                                  {les.kanjiPassed ? '✓ Hán tự' : 'Hán tự'}
                                </span>
                                <span style={{
                                  fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 600,
                                  background: les.grammarPassed ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)',
                                  color: les.grammarPassed ? '#059669' : 'var(--text-muted)',
                                  border: `1px solid ${les.grammarPassed ? 'rgba(16,185,129,0.3)' : 'transparent'}`
                                }}>
                                  {les.grammarPassed ? '✓ Ngữ pháp' : 'Ngữ pháp'}
                                </span>
                                <span style={{
                                  fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 600,
                                  background: les.quizPassed ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)',
                                  color: les.quizPassed ? '#059669' : 'var(--text-muted)',
                                  border: `1px solid ${les.quizPassed ? 'rgba(16,185,129,0.3)' : 'transparent'}`
                                }}>
                                  {les.quizPassed ? '✓ Trắc nghiệm (100%)' : 'Trắc nghiệm'}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '2px' }}>
                                {les.available && (
                                  <span style={{ color: isLessonCompleted ? '#10b981' : 'var(--accent-color)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.82rem' }}>
                                    {isLessonCompleted ? 'Ôn tập lại' : 'Vào học ngay'} <ChevronRight size={14} />
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Chương {selectedChapter} - Bài {selectedLesson}
              </span>

              {/* Progress Chips for Vocab, Kanji, Grammar */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700,
                  background: lessonData?.vocabPassed ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)',
                  color: lessonData?.vocabPassed ? '#059669' : 'var(--text-muted)',
                  border: `1px solid ${lessonData?.vocabPassed ? '#10b981' : 'transparent'}`
                }}>
                  {lessonData?.vocabPassed ? '✓ Từ vựng (Đã Pass)' : 'Từ vựng (Chưa pass)'}
                </span>
                <span style={{
                  fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700,
                  background: lessonData?.kanjiPassed ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)',
                  color: lessonData?.kanjiPassed ? '#059669' : 'var(--text-muted)',
                  border: `1px solid ${lessonData?.kanjiPassed ? '#10b981' : 'transparent'}`
                }}>
                  {lessonData?.kanjiPassed ? '✓ Hán tự (Đã Pass)' : 'Hán tự (Chưa pass)'}
                </span>
                <span style={{
                  fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700,
                  background: lessonData?.grammarPassed ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)',
                  color: lessonData?.grammarPassed ? '#059669' : 'var(--text-muted)',
                  border: `1px solid ${lessonData?.grammarPassed ? '#10b981' : 'transparent'}`
                }}>
                  {lessonData?.grammarPassed ? '✓ Ngữ pháp (Đã Pass)' : 'Ngữ pháp (Chưa pass)'}
                </span>
                <span style={{
                  fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 700,
                  background: lessonData?.quizPassed ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)',
                  color: lessonData?.quizPassed ? '#059669' : 'var(--text-muted)',
                  border: `1px solid ${lessonData?.quizPassed ? '#10b981' : 'transparent'}`
                }}>
                  {lessonData?.quizPassed ? '✓ Trắc nghiệm 20 câu (Đã Pass 100%)' : 'Trắc nghiệm 20 câu (Cần 100%)'}
                </span>
              </div>

              {(lessonData?.completed || lessonData?.quizPassed || (lessonData?.vocabPassed && lessonData?.kanjiPassed && lessonData?.grammarPassed)) && (
                <span style={{ fontSize: '0.82rem', padding: '4px 12px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 800, boxShadow: '0 2px 8px rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  🏆 ĐÃ PASS NGÀY HỌC (100%)
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
              <div style={{ display: 'flex', background: 'var(--surface-color)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border-color)', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleTabClick('flashcard')}
                  style={{
                    flex: 1, minWidth: '160px', padding: '12px', borderRadius: '10px', border: 'none',
                    fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: activeTab === 'flashcard' ? 'var(--accent-color)' : 'transparent',
                    color: activeTab === 'flashcard' ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  <Layers size={18} /> Thẻ Ghi Nhớ
                </button>
                <button
                  onClick={() => handleTabClick('list')}
                  style={{
                    flex: 1, minWidth: '160px', padding: '12px', borderRadius: '10px', border: 'none',
                    fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: activeTab === 'list' ? 'var(--accent-color)' : 'transparent',
                    color: activeTab === 'list' ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  <List size={18} /> Danh Sách & AI
                </button>
                <button
                  onClick={() => handleTabClick('quiz')}
                  style={{
                    flex: 1, minWidth: '160px', padding: '12px', borderRadius: '10px', border: 'none',
                    fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: activeTab === 'quiz' ? 'var(--accent-color)' : 'transparent',
                    color: activeTab === 'quiz' ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  <Sparkles size={18} /> Luyện Tập SRS
                </button>
                <button
                  onClick={() => handleTabClick('lesson_quiz')}
                  style={{
                    flex: 1.2, minWidth: '200px', padding: '12px', borderRadius: '10px', border: 'none',
                    fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: activeTab === 'lesson_quiz' 
                      ? 'linear-gradient(135deg, #10b981, #059669)' 
                      : lessonData?.quizPassed 
                        ? 'rgba(16,185,129,0.12)' 
                        : 'transparent',
                    color: activeTab === 'lesson_quiz' ? 'white' : lessonData?.quizPassed ? '#10b981' : 'var(--text-secondary)',
                    boxShadow: activeTab === 'lesson_quiz' ? '0 4px 14px rgba(16,185,129,0.3)' : 'none'
                  }}
                >
                  <Award size={18} /> Trắc Nghiệm 20 Câu {lessonData?.quizPassed ? '✓ (100%)' : '(Cần 100% Pass)'}
                </button>
              </div>


              {/* ───────────────────────────────────────────────────────────────
                  TAB 1: FLASHCARD VIEW (Reusing FlashcardCard Component)
                 ─────────────────────────────────────────────────────────────── */}
              {activeTab === 'flashcard' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
                  
                  {/* Category Filter */}
                  <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-hover)', padding: '4px', borderRadius: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                      { cat: 'all', label: 'Tất cả', isPassed: lessonData?.completed || (lessonData?.vocabPassed && lessonData?.kanjiPassed && lessonData?.grammarPassed) },
                      { cat: 'vocab', label: 'Từ vựng', isPassed: lessonData?.vocabPassed },
                      { cat: 'kanji', label: 'Hán tự', isPassed: lessonData?.kanjiPassed },
                      { cat: 'grammar', label: 'Ngữ pháp', isPassed: lessonData?.grammarPassed }
                    ].map(({ cat, label, isPassed }) => (
                      <button
                        key={cat}
                        onClick={() => setFlashcardCategory(cat)}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', border: isPassed ? '1px solid #10b981' : '1px solid transparent', fontSize: '0.85rem', fontWeight: 700,
                          cursor: 'pointer',
                          background: flashcardCategory === cat 
                            ? (isPassed ? '#10b981' : 'var(--accent-color)') 
                            : (isPassed ? 'rgba(16,185,129,0.12)' : 'transparent'),
                          color: flashcardCategory === cat 
                            ? 'white' 
                            : (isPassed ? '#059669' : 'var(--text-secondary)'),
                          boxShadow: flashcardCategory === cat ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isPassed && <span>✓</span>} {label}
                      </button>
                    ))}
                  </div>

                  {flashcardItems.length === 0 ? (
                    <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Không có thẻ nào trong mục này.</div>
                  ) : (
                    <>
                      {/* Progress & Card Index */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <span>Thẻ {currentFlashcardIndex + 1} / {flashcardItems.length}</span>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isShuffle ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface-hover)',
                          color: isShuffle ? '#a78bfa' : 'var(--text-muted)',
                          border: isShuffle ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent'
                        }}>
                          {isShuffle ? '🔀 Ngẫu nhiên' : '📑 Mặc định'}
                        </span>
                      </div>

                      {/* REUSED FLASHCARD CARD COMPONENT */}
                      {currentFlashcardWord && (
                        <div style={{ width: '100%', maxWidth: '1050px', margin: '0 auto' }}>
                          <FlashcardCard 
                            word={currentFlashcardWord}
                            flipped={isFlipped}
                            onFlip={() => setIsFlipped(!isFlipped)}
                            onRateWord={async (quality) => {
                              if (currentFlashcardWord && currentFlashcardWord.id) {
                                if (currentFlashcardWord.cau_truc || currentFlashcardWord.type === 'grammar') {
                                  srsApi.reviewGrammar(currentFlashcardWord.id, quality).catch(console.error);
                                } else {
                                  srsApi.reviewWord(currentFlashcardWord.id, quality).catch(console.error);
                                }
                                nextFlashcard();
                              }
                            }}
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
                          onClick={toggleShuffle}
                          style={{
                            padding: '12px 20px',
                            borderRadius: '12px',
                            border: isShuffle ? '1.5px solid #8b5cf6' : '1px solid var(--border-color)',
                            background: isShuffle 
                              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(99, 102, 241, 0.25))' 
                              : 'var(--surface-color)',
                            color: isShuffle ? '#a78bfa' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            boxShadow: isShuffle ? '0 2px 10px rgba(139, 92, 246, 0.3)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                          title={isShuffle ? "Chế độ hiện tại: Shuffle (Ngẫu nhiên). Bấm để chuyển về Default (Mặc định)" : "Chế độ hiện tại: Default (Mặc định). Bấm để chuyển sang Shuffle (Ngẫu nhiên)"}
                        >
                          <Shuffle size={18} style={{ color: isShuffle ? '#a78bfa' : 'var(--text-muted)' }} />
                          <span>{isShuffle ? 'Shuffle' : 'Default'}</span>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setListSubTab('vocab')}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', border: lessonData?.vocabPassed ? '1px solid #10b981' : 'none', fontWeight: 700, cursor: 'pointer',
                          background: listSubTab === 'vocab' 
                            ? (lessonData?.vocabPassed ? 'rgba(16,185,129,0.2)' : 'var(--accent-light)') 
                            : (lessonData?.vocabPassed ? 'rgba(16,185,129,0.08)' : 'transparent'),
                          color: lessonData?.vocabPassed ? '#059669' : (listSubTab === 'vocab' ? 'var(--accent-color)' : 'var(--text-secondary)'),
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        {lessonData?.vocabPassed && <span>✓</span>} Từ Vựng ({lessonData?.tu_vung?.length || 0})
                        {lessonData?.vocabPassed && <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: '#10b981', color: 'white' }}>Đã Pass</span>}
                      </button>
                      <button
                        onClick={() => setListSubTab('kanji')}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', border: lessonData?.kanjiPassed ? '1px solid #10b981' : 'none', fontWeight: 700, cursor: 'pointer',
                          background: listSubTab === 'kanji' 
                            ? (lessonData?.kanjiPassed ? 'rgba(16,185,129,0.2)' : 'var(--accent-light)') 
                            : (lessonData?.kanjiPassed ? 'rgba(16,185,129,0.08)' : 'transparent'),
                          color: lessonData?.kanjiPassed ? '#059669' : (listSubTab === 'kanji' ? 'var(--accent-color)' : 'var(--text-secondary)'),
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        {lessonData?.kanjiPassed && <span>✓</span>} Hán Tự ({lessonData?.chu_han?.length || 0})
                        {lessonData?.kanjiPassed && <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: '#10b981', color: 'white' }}>Đã Pass</span>}
                      </button>
                      <button
                        onClick={() => setListSubTab('grammar')}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', border: lessonData?.grammarPassed ? '1px solid #10b981' : 'none', fontWeight: 700, cursor: 'pointer',
                          background: listSubTab === 'grammar' 
                            ? (lessonData?.grammarPassed ? 'rgba(16,185,129,0.2)' : 'var(--accent-light)') 
                            : (lessonData?.grammarPassed ? 'rgba(16,185,129,0.08)' : 'transparent'),
                          color: lessonData?.grammarPassed ? '#059669' : (listSubTab === 'grammar' ? 'var(--accent-color)' : 'var(--text-secondary)'),
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        {lessonData?.grammarPassed && <span>✓</span>} Ngữ Pháp ({lessonData?.ngu_phap?.length || 0})
                        {lessonData?.grammarPassed && <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: '#10b981', color: 'white' }}>Đã Pass</span>}
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
                            {isAdmin && <th style={{ padding: '14px 18px', textAlign: 'center', width: '90px' }}>Thao tác</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {formattedVocabWords.map((word, index) => (
                            <tr
                              key={word.id}
                              className="virtual-row"
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
                              {isAdmin && (
                                <td style={{ padding: '14px 18px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => handleDeleteWord(e, word)}
                                    title="Xóa từ này (Admin)"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.2)',
                                      borderRadius: '8px',
                                      padding: '6px 10px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      fontSize: '0.82rem',
                                      fontWeight: 600,
                                      transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#ef4444';
                                      e.currentTarget.style.color = '#ffffff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                      e.currentTarget.style.color = '#ef4444';
                                    }}
                                  >
                                    <Trash2 size={15} />
                                    <span>Xóa</span>
                                  </button>
                                </td>
                              )}
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
                            cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative'
                          }}
                          className="card-hover virtual-card"
                        >
                          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent-color)', fontSize: '2.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {k.kanji}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{k.hanViet}</span>
                              {isAdmin && (
                                <button
                                  onClick={(e) => handleDeleteWord(e, k)}
                                  title="Xóa chữ Hán này (Admin)"
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '6px',
                                    padding: '4px 6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                    e.currentTarget.style.color = '#ffffff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                    e.currentTarget.style.color = '#ef4444';
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            {k.romaji && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '4px' }}>
                                Âm đọc: {k.romaji}
                              </div>
                            )}
                            {!hideMeanings && <div style={{ fontSize: '0.92rem', color: 'var(--success-color)', fontWeight: 600, marginBottom: '6px' }}>{k.meaning}</div>}
                            {k.tu_vung && k.tu_vung.length > 0 && (
                              <div style={{ marginTop: '4px', marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Từ vựng chứa chữ Hán:</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {k.tu_vung.slice(0, 4).map((tv, i) => (
                                    <span key={i} style={{ fontSize: '0.76rem', background: 'var(--surface-hover)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                                      {tv}
                                    </span>
                                  ))}
                                  {k.tu_vung.length > 4 && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                                      +{k.tu_vung.length - 4} từ nữa
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
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
                        <div 
                          key={idx} 
                          onClick={() => openGrammarModal(g)}
                          style={{ 
                            background: 'var(--surface-color)', border: '1px solid var(--border-color)', 
                            borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px',
                            cursor: 'pointer', transition: 'all 0.2s ease'
                          }}
                          className="card-hover virtual-card"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-color)' }}>{g.cau_truc}</span>
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
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={14} /> Xem phân tích chi tiết & DeepSeek AI ➔
                            </span>
                          </div>
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
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                          <Sparkles size={32} />
                        </div>
                        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                          Cấu hình Quiz Kiểm tra - Bài {selectedLesson}
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                          Đạt <strong style={{ color: '#10b981' }}>≥ 90%</strong> điểm số ở chế độ kiểm tra tất cả từ vựng để mở khóa hoàn thành Bài học!
                        </p>
                      </div>

                      {/* Category Filter Selection */}
                      <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px', fontSize: '0.95rem' }}>
                          Loại nội dung kiểm tra (Bắt buộc Hoàn thành & Đạt ≥90% cả 3 mục để Pass Bài học):
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {[
                            { value: 'all',     label: '📚 Tất cả các nội dung trong ngày',    desc: 'Từ vựng + Chữ Hán + Ngữ pháp', isPassed: lessonData?.completed || (lessonData?.vocabPassed && lessonData?.kanjiPassed && lessonData?.grammarPassed) },
                            { value: 'vocab',   label: '🔤 Từ vựng',   desc: `${lessonData?.tu_vung?.length || 0} từ vựng`, isPassed: lessonData?.vocabPassed },
                            { value: 'kanji',   label: '漢 Chữ Hán (Kanji)',   desc: `${lessonData?.chu_han?.length || 0} chữ Hán`, isPassed: lessonData?.kanjiPassed },
                            { value: 'grammar', label: '📝 Ngữ pháp',  desc: `${lessonData?.ngu_phap?.length || 0} cấu trúc ngữ pháp`, isPassed: lessonData?.grammarPassed },
                          ].map(opt => {
                            const isSelected = quizCategory === opt.value;
                            return (
                              <label key={opt.value} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '12px',
                                border: isSelected 
                                  ? (opt.isPassed ? '1.5px solid #10b981' : '1.5px solid var(--accent-color)') 
                                  : (opt.isPassed ? '1.5px solid rgba(16,185,129,0.35)' : '1px solid var(--border-color)'),
                                backgroundColor: isSelected 
                                  ? (opt.isPassed ? 'rgba(16,185,129,0.1)' : 'var(--accent-light)') 
                                  : (opt.isPassed ? 'rgba(16,185,129,0.04)' : 'transparent'),
                                cursor: 'pointer', transition: 'all 0.15s ease'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <input
                                    type="radio"
                                    name="quizCategoryJlpt"
                                    value={opt.value}
                                    checked={isSelected}
                                    onChange={() => setQuizCategory(opt.value)}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.94rem', color: opt.isPassed ? '#059669' : 'var(--text-primary)' }}>
                                      {opt.label}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{opt.desc}</div>
                                  </div>
                                </div>

                                {opt.isPassed && (
                                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: '#10b981', color: 'white', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    ✓ Đã Pass
                                  </span>
                                )}
                              </label>
                            );
                          })}
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
                        disabled={loadingGrammarQuiz}
                        style={{
                          padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--accent-color)',
                          color: 'white', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px'
                        }}
                      >
                        {loadingGrammarQuiz ? (
                          <>✦ DeepSeek AI Đang Tạo Đề Thi 30 Câu Ngữ Pháp...
                          {(quizWordEnriched || currentWord) && (
                            <AiEnrichedTabbedView 
                              data={quizWordEnriched || currentWord} 
                              onReEnriched={(updated) => {
                                setQuizWordEnriched(updated);
                                if (updated && updated.hiragana) {
                                  setCurrentWord(prev => prev ? ({ ...prev, hiragana: updated.hiragana, reading: updated.hiragana }) : prev);
                                }
                              }}
                            />
                          )}</>
                        ) : (
                          <><Play size={20} /> Bắt đầu Làm Bài Test ({quizCategory === 'grammar' ? 'Ngữ Pháp' : quizCategory === 'vocab' ? 'Từ Vựng' : quizCategory === 'kanji' ? 'Chữ Hán' : 'Tất cả'})</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* QUIZ PLAYING SCREEN (Exact structure ported from Daily Study) */}
                  {quizState === 'playing' && quizWords.length > 0 && quizIndex < quizWords.length && (() => {
                    const currentWord = quizWords[quizIndex];

                    return (
                      <div className="container flex-center animate-fade-in" style={{ height: 'auto', minHeight: '65vh', flexDirection: 'column', width: '100%', maxWidth: '900px' }}>
                        <div style={{ width: '100%' }}>

                          {/* Progress Header & Timer */}
                          <div className="flex-between" style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                            <span>Câu {quizIndex + 1} / {quizWords.length}</span>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              color: elapsedSeconds >= 20 ? 'var(--accent-color)' : elapsedSeconds >= 10 ? 'var(--warning-color)' : 'var(--text-secondary)',
                              fontWeight: elapsedSeconds >= 10 ? 600 : 500,
                              transition: 'color 0.3s ease'
                            }}>
                              ⏱️ {elapsedSeconds}s {elapsedSeconds >= 30 && <span style={{ fontSize: '0.75rem' }}>(Treo máy)</span>}
                            </div>
                            <span>Điểm số: {score}</span>
                          </div>

                          <div className="progress-bg" style={{ marginBottom: '30px' }}>
                            <div className="progress-fill" style={{ width: `${(quizIndex / quizWords.length) * 100}%` }}></div>
                          </div>

                          {quizQuestionType === 'ja-to-vi' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <input 
                                  type="checkbox" 
                                  checked={showHiraganaHint} 
                                  onChange={(e) => setShowHiraganaHint(e.target.checked)} 
                                  style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                                />
                                Hiện cách đọc (Hiragana)
                              </label>
                            </div>
                          )}

                          {/* Question Display Card */}
                          <div className="card" style={{ padding: '36px 40px', textAlign: 'left', marginBottom: '24px' }}>
                            {currentWord.type === 'grammar_mcq' || currentWord.type === 'star' || quizCategory === 'grammar' ? (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                  <span style={{
                                    fontSize: '0.82rem', fontWeight: 800, padding: '4px 12px', borderRadius: '8px',
                                    backgroundColor: (currentWord.type === 'star' || currentWord.question?.includes('★')) ? 'rgba(245,158,11,0.15)' : 'var(--accent-light)',
                                    color: (currentWord.type === 'star' || currentWord.question?.includes('★')) ? '#d97706' : 'var(--accent-color)',
                                    border: `1px solid ${(currentWord.type === 'star' || currentWord.question?.includes('★')) ? 'rgba(245,158,11,0.3)' : 'var(--accent-color)'}`
                                  }}>
                                    {(currentWord.type === 'star' || currentWord.question?.includes('★'))
                                      ? '⭐ Mondai 2: Dạng Ngôi Sao ★ (Sắp xếp từ chọn vị trí ★)'
                                      : '📝 Mondai 1: Điền từ/Cấu trúc ngữ pháp đúng ( 　 )'}
                                  </span>
                                </div>
                                <h2 className="font-jp" style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
                                  {currentWord.question}
                                </h2>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
                                  {quizQuestionType === 'vi-to-ja' ? 'Hãy điền từ/đọc Tiếng Nhật của từ sau:' : 'Hãy điền nghĩa Tiếng Việt của từ sau:'}
                                </p>
                                <h2 className={quizQuestionType === 'ja-to-vi' ? 'font-jp' : ''} style={{ fontSize: quizQuestionType === 'ja-to-vi' ? '2.8rem' : '2.2rem', marginBottom: '20px', color: 'var(--text-primary)' }}>
                                  {quizQuestionType === 'vi-to-ja' ? currentWord.meaning : (currentWord.kanji || currentWord.hiragana)}
                                </h2>
                                {quizQuestionType === 'ja-to-vi' && currentWord.kanji && (quizStatus === 'correct' || quizStatus === 'incorrect') && (
                                  <p style={{ color: 'var(--accent-color)', fontSize: '1.2rem', marginBottom: '10px' }}>({currentWord.hiragana})</p>
                                )}
                                {quizQuestionType === 'vi-to-ja' && currentWord.hanViet && (
                                  <p style={{ color: 'var(--text-secondary)' }}>【{currentWord.hanViet}】</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Idle Form / MCQ Grid */}
                          {quizStatus === 'idle' && (
                            currentWord.type === 'grammar_mcq' || currentWord.type === 'star' || quizCategory === 'grammar' ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', width: '100%', marginBottom: '24px' }}>
                                {currentWord.options?.map((opt, oIdx) => (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => handleMcqSelect(opt)}
                                    className="font-jp card-hover"
                                    style={{
                                      padding: '18px 22px', borderRadius: '14px', border: '1.5px solid var(--border-color)',
                                      backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '1.1rem',
                                      fontWeight: 700, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s ease'
                                    }}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <form onSubmit={checkAnswer} className="flex-center" style={{ gap: '10px' }}>
                                <input
                                  type="text"
                                  autoFocus
                                  disabled={checkingAiAnswer}
                                  value={userInput}
                                  onChange={(e) => setUserInput(e.target.value)}
                                  placeholder={quizQuestionType === 'vi-to-ja' ? 'Nhập tiếng Nhật (Hiragana/Kanji)...' : 'Nhập nghĩa dịch Tiếng Việt...'}
                                  className={quizQuestionType === 'vi-to-ja' ? 'font-jp' : ''}
                                  style={{
                                    flex: 1,
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--surface-color)',
                                    color: 'var(--text-primary)',
                                    fontSize: '1.2rem',
                                    opacity: checkingAiAnswer ? 0.7 : 1
                                  }}
                                />
                                <button type="submit" disabled={checkingAiAnswer} className="btn btn-primary" style={{ padding: '16px 30px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {checkingAiAnswer ? (
                                    <>
                                      <Sparkles size={18} className="animate-spin" /> Đang thẩm định AI...
                                    </>
                                  ) : (
                                    'Kiểm tra ✓'
                                  )}
                                </button>
                              </form>
                            )
                          )}

                          {/* Correct Card */}
                          {quizStatus === 'correct' && (
                            <div className="card animate-fade-in" style={{ backgroundColor: 'var(--success-light)', borderColor: 'var(--success-color)', padding: '24px' }}>
                              {currentWord.type === 'grammar_mcq' || currentWord.type === 'star' || quizCategory === 'grammar' ? (
                                <div style={{ textAlign: 'left', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <CheckCircle size={28} color="var(--success-color)" />
                                    <h3 style={{ color: 'var(--success-color)', margin: 0, fontSize: '1.3rem' }}>Chính xác! 🎉</h3>
                                  </div>

                                  <div style={{ marginTop: '8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Đáp án đúng: <span style={{ color: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', padding: '4px 12px', borderRadius: '8px' }}>{currentWord.answer}</span>
                                  </div>

                                  {currentWord.explanation && (
                                    <div style={{
                                      marginTop: '14px', padding: '16px', borderRadius: '12px',
                                      backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                                      lineHeight: 1.65, fontSize: '0.96rem', color: 'var(--text-primary)'
                                    }}>
                                      <div style={{ fontWeight: 800, color: '#059669', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💡 Giải thích đáp án:
                                      </div>
                                      <div style={{ whiteSpace: 'pre-wrap' }}>{currentWord.explanation}</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                                  {/* Left Column: Word Info */}
                                  <div style={{ flex: '1 1 350px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                    <CheckCircle size={32} color="var(--success-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <div style={{ textAlign: 'left' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ color: 'var(--success-color)', margin: 0 }}>Chính xác! 🎉</h3>
                                        <span style={{ 
                                          fontSize: '0.75rem', 
                                          padding: '2px 8px', 
                                          borderRadius: '8px', 
                                          fontWeight: 600,
                                          backgroundColor: lastAssignedQuality === 4 ? 'var(--success-light)' : lastAssignedQuality === 3 ? 'var(--accent-light)' : 'var(--warning-light)',
                                          color: lastAssignedQuality === 4 ? 'var(--success-color)' : lastAssignedQuality === 3 ? 'var(--accent-color)' : 'var(--warning-color)',
                                          border: '1px solid rgba(0,0,0,0.05)'
                                        }}>
                                          {lastAssignedQuality === 4 ? 'Easy' : lastAssignedQuality === 3 ? 'Good' : 'Hard'} ({lastElapsedSeconds?.toFixed(1)}s)
                                        </span>
                                      </div>
                                      {aiMatchExplanation && (
                                        <div style={{ fontSize: '0.86rem', color: '#10b981', marginTop: '6px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '6px' }}>
                                          <Sparkles size={15} /> {aiMatchExplanation}
                                        </div>
                                      )}
                                      <p className="font-jp" style={{ fontSize: '1.3rem', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                        {currentWord.kanji && <span>{currentWord.kanji} </span>}
                                        <span style={{ color: 'var(--text-secondary)' }}>({currentWord.hiragana})</span>
                                        <button 
                                          type="button" 
                                          onClick={() => speakWord(currentWord)} 
                                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                        >
                                          <Volume2 size={16} />
                                        </button>
                                      </p>
                                      <p style={{ marginTop: '6px', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        <strong>Nghĩa:</strong> {currentWord.meaning}
                                      </p>
                                      {currentWord.hanViet && (
                                        <p style={{ marginTop: '4px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                          <strong>Hán Việt:</strong> 【{currentWord.hanViet}】
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right Column: AI Data */}
                                  <div style={{ flex: '1 1 350px', width: '100%' }}>
                                    {loadingQuizEnrich && (
                                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px', textAlign: 'left' }}>
                                        Đang tải dữ liệu AI...
                                      </div>
                                    )}
                                    {(quizWordEnriched || currentWord) && (
                                      <AiEnrichedTabbedView 
                                        data={quizWordEnriched || currentWord} 
                                        onReEnriched={(updated) => {
                                          setQuizWordEnriched(updated);
                                          if (updated && updated.hiragana) {
                                            setCurrentWord(prev => prev ? ({ ...prev, ...updated }) : prev);
                                          }
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                                <button className="btn btn-primary" onClick={nextQuestion} style={{ padding: '10px 24px' }}>
                                  Câu tiếp <ArrowRight size={18} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Incorrect Card */}
                          {quizStatus === 'incorrect' && (
                            <div className="card animate-fade-in" style={{ backgroundColor: 'var(--danger-light)', borderColor: 'var(--danger-color)', padding: '24px' }}>
                              {currentWord.type === 'grammar_mcq' || currentWord.type === 'star' || quizCategory === 'grammar' ? (
                                <div style={{ textAlign: 'left', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <XCircle size={28} color="var(--danger-color)" />
                                    <h3 style={{ color: 'var(--danger-color)', margin: 0, fontSize: '1.3rem' }}>Chưa chính xác ⚠️</h3>
                                  </div>

                                  <div style={{ marginTop: '8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Đáp án đúng: <span style={{ color: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', padding: '4px 12px', borderRadius: '8px' }}>{currentWord.answer}</span>
                                  </div>

                                  {currentWord.explanation && (
                                    <div style={{
                                      marginTop: '14px', padding: '16px', borderRadius: '12px',
                                      backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                                      lineHeight: 1.65, fontSize: '0.96rem', color: 'var(--text-primary)'
                                    }}>
                                      <div style={{ fontWeight: 800, color: '#dc2626', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💡 Giải thích đáp án chi tiết:
                                      </div>
                                      <div style={{ whiteSpace: 'pre-wrap' }}>{currentWord.explanation}</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                                  {/* Left Column: Word Info */}
                                  <div style={{ flex: '1 1 350px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                    <XCircle size={32} color="var(--danger-color)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <div style={{ textAlign: 'left' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ color: 'var(--danger-color)', margin: 0 }}>Chưa chính xác ⚠️</h3>
                                        <span style={{ 
                                          fontSize: '0.75rem', 
                                          padding: '2px 8px', 
                                          borderRadius: '8px', 
                                          fontWeight: 600,
                                          backgroundColor: 'var(--danger-light)',
                                          color: 'var(--danger-color)',
                                          border: '1px solid rgba(0,0,0,0.05)'
                                        }}>
                                          Forgot ({lastElapsedSeconds?.toFixed(1)}s)
                                        </span>
                                      </div>
                                      <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Đáp án đúng là:</p>
                                      <p className="font-jp" style={{ fontSize: '1.3rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                        {currentWord.kanji && <span style={{ color: 'var(--success-color)' }}>{currentWord.kanji} </span>}
                                        <span style={{ color: 'var(--success-color)' }}>({currentWord.hiragana})</span>
                                        <button 
                                          type="button" 
                                          onClick={() => speakWord(currentWord)} 
                                          style={{ background: 'none', border: 'none', color: 'var(--success-color)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                        >
                                          <Volume2 size={16} />
                                        </button>
                                      </p>
                                      <p style={{ marginTop: '6px', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        <strong>Nghĩa:</strong> {currentWord.meaning}
                                      </p>
                                      {currentWord.hanViet && (
                                        <p style={{ marginTop: '4px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                          <strong>Hán Việt:</strong> 【{currentWord.hanViet}】
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right Column: AI Data */}
                                  <div style={{ flex: '1 1 350px', width: '100%' }}>
                                    {loadingQuizEnrich && (
                                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px', textAlign: 'left' }}>
                                        Đang tải dữ liệu AI...
                                      </div>
                                    )}
                                    {(quizWordEnriched || currentWord) && (
                                      <AiEnrichedTabbedView 
                                        data={quizWordEnriched || currentWord} 
                                        onReEnriched={(updated) => {
                                          setQuizWordEnriched(updated);
                                          if (updated && updated.hiragana) {
                                            setCurrentWord(prev => prev ? ({ ...prev, ...updated }) : prev);
                                          }
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                                <button className="btn btn-primary" onClick={nextQuestion} style={{ padding: '10px 24px' }}>
                                  Tiếp tục <ArrowRight size={18} />
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })()}

                  {/* QUIZ FINISHED SCREEN */}
                  {quizState === 'finished' && quizResult && (
                    <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '36px', maxWidth: '820px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: 'var(--shadow-md)' }} className="animate-fade-in">
                      {/* Top Header Result */}
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
                          {quizResult.passed 
                            ? 'Chúc mừng! Đã đạt tiêu chuẩn Hoàn thành (PASS)! 🎉' 
                            : !quizResult.isScopeAll
                              ? 'Đã hoàn thành bài kiểm tra theo phạm vi! 🎯'
                              : 'Chưa đạt chỉ tiêu Hoàn thành (≥ 80% & phản xạ ≤ 8s) ⚠️'}
                        </h2>
                        <div style={{ fontSize: '3.2rem', fontWeight: 900, color: quizResult.passed ? '#10b981' : '#ef4444', lineHeight: 1.1 }}>
                          {quizResult.accuracy}%
                        </div>
                        <p style={{ margin: '6px 0 4px 0', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
                          Chính xác lần đầu: <strong style={{ color: 'var(--accent-color)' }}>{quizResult.score}</strong> / <strong>{quizResult.total}</strong> câu hỏi
                        </p>
                        <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 500 }}>
                          ⏱️ Tốc độ trung bình: <strong>{quizResult.avgElapsed ? quizResult.avgElapsed.toFixed(1) : 0}s / câu</strong> 
                          {' • '} 
                          <span style={{ 
                            fontWeight: 700, 
                            color: quizResult.isSpeedGood ? '#10b981' : '#f59e0b',
                            backgroundColor: quizResult.isSpeedGood ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                            padding: '2px 8px', borderRadius: '6px'
                          }}>
                            {quizResult.isSpeedGood ? '⚡ Đạt chuẩn Good (≤ 8s)' : '⚠️ Cần cải thiện (> 8s)'}
                          </span>
                        </p>
                        {!quizResult.isScopeAll && (
                          <div style={{ marginTop: '12px', padding: '10px 16px', borderRadius: '10px', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', fontSize: '0.88rem', fontWeight: 500 }}>
                            💡 <em>Lưu ý: Để được tính PASS bài học trên bản đồ tiến độ, hãy chọn chế độ <strong>"Kiểm tra tất cả các từ trong ngày"</strong>.</em>
                          </div>
                        )}
                        {quizResult.isScopeAll && quizResult.passed && (
                          <div style={{ marginTop: '12px', padding: '10px 16px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: '0.92rem', fontWeight: 700 }}>
                            {quizResult.completed 
                              ? `🏆 Chúc mừng! Bạn đã hoàn thành 100% tất cả các mục (Từ vựng, Chữ Hán, Ngữ pháp) của Bài ${selectedLesson}!`
                              : `✅ Đã PASS mục ${quizCategory === 'vocab' ? 'Từ vựng' : quizCategory === 'kanji' ? 'Chữ Hán' : quizCategory === 'grammar' ? 'Ngữ pháp' : 'bài học'}!`}
                          </div>
                        )}
                      </div>

                      {/* Filter Bar */}
                      {quizReviewList.length > 0 && (() => {
                        const wrongCount = quizReviewList.filter(item => !item.isCorrect).length;
                        const slowCount = quizReviewList.filter(item => item.isCorrect && item.elapsedSeconds && item.elapsedSeconds > 8).length;
                        const needsReviewCount = quizReviewList.filter(item => !item.isCorrect || (item.elapsedSeconds && item.elapsedSeconds > 8)).length;

                        return (
                          <div style={{ display: 'flex', gap: '8px', background: 'var(--surface-hover)', padding: '6px', borderRadius: '12px', width: '100%', boxSizing: 'border-box', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setQuizReviewFilter('needs_review')}
                              style={{
                                flex: '1 1 140px', padding: '8px 12px', borderRadius: '8px', border: 'none',
                                background: (quizReviewFilter === 'needs_review' || !quizReviewFilter || quizReviewFilter === 'all') ? 'var(--surface-color)' : 'transparent',
                                color: (quizReviewFilter === 'needs_review' || !quizReviewFilter || quizReviewFilter === 'all') ? '#ef4444' : 'var(--text-secondary)',
                                fontWeight: (quizReviewFilter === 'needs_review' || !quizReviewFilter || quizReviewFilter === 'all') ? 700 : 500, cursor: 'pointer',
                                boxShadow: (quizReviewFilter === 'needs_review' || !quizReviewFilter || quizReviewFilter === 'all') ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 0.2s ease', fontSize: '0.86rem'
                              }}
                            >
                              ⚠️ Cần ôn lại ({needsReviewCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuizReviewFilter('mistakes')}
                              style={{
                                flex: '1 1 120px', padding: '8px 12px', borderRadius: '8px', border: 'none',
                                background: quizReviewFilter === 'mistakes' ? 'var(--surface-color)' : 'transparent',
                                color: quizReviewFilter === 'mistakes' ? '#dc2626' : 'var(--text-secondary)',
                                fontWeight: quizReviewFilter === 'mistakes' ? 700 : 500, cursor: 'pointer',
                                boxShadow: quizReviewFilter === 'mistakes' ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 0.2s ease', fontSize: '0.86rem'
                              }}
                            >
                              ❌ Làm sai ({wrongCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuizReviewFilter('slow')}
                              style={{
                                flex: '1 1 120px', padding: '8px 12px', borderRadius: '8px', border: 'none',
                                background: quizReviewFilter === 'slow' ? 'var(--surface-color)' : 'transparent',
                                color: quizReviewFilter === 'slow' ? '#f59e0b' : 'var(--text-secondary)',
                                fontWeight: quizReviewFilter === 'slow' ? 700 : 500, cursor: 'pointer',
                                boxShadow: quizReviewFilter === 'slow' ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 0.2s ease', fontSize: '0.86rem'
                              }}
                            >
                              ⏱️ Chậm &gt; 8s ({slowCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuizReviewFilter('full_all')}
                              style={{
                                flex: '1 1 110px', padding: '8px 12px', borderRadius: '8px', border: 'none',
                                background: quizReviewFilter === 'full_all' ? 'var(--surface-color)' : 'transparent',
                                color: quizReviewFilter === 'full_all' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                fontWeight: quizReviewFilter === 'full_all' ? 700 : 500, cursor: 'pointer',
                                boxShadow: quizReviewFilter === 'full_all' ? 'var(--shadow-sm)' : 'none',
                                transition: 'all 0.2s ease', fontSize: '0.86rem'
                              }}
                            >
                              📚 Xem tất cả ({quizReviewList.length})
                            </button>
                          </div>
                        );
                      })()}

                      {/* Detailed Questions & Explanations List */}
                      {quizReviewList.length > 0 && (() => {
                        const filteredItems = quizReviewList.filter(item => {
                          if (quizReviewFilter === 'mistakes') return !item.isCorrect;
                          if (quizReviewFilter === 'slow') return item.isCorrect && item.elapsedSeconds && item.elapsedSeconds > 8;
                          if (quizReviewFilter === 'full_all') return true;
                          // Default: 'needs_review' (Chỉ liệt kê các câu làm sai HOẶC câu có thời gian phản xạ > 8s)
                          return !item.isCorrect || (item.elapsedSeconds && item.elapsedSeconds > 8);
                        });

                        if (filteredItems.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '28px 20px', background: 'rgba(16,185,129,0.08)', borderRadius: '16px', border: '1.5px solid rgba(16,185,129,0.25)' }}>
                              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginBottom: '6px' }}>
                                🎉 Xuất sắc! Không có câu nào cần ôn tập lại!
                              </div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                                Bạn đã trả lời đúng tất cả các câu hỏi và đạt phản xạ siêu tốc (tất cả đều dưới 8 giây).
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '440px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                            {filteredItems.map((item, idx) => {
                              const w = item.word || {};
                              const isSlow = item.elapsedSeconds && item.elapsedSeconds > 8;

                              return (
                                <div key={idx} style={{
                                  padding: '16px 18px', borderRadius: '14px',
                                  border: `1.5px solid ${!item.isCorrect ? 'rgba(239,68,68,0.35)' : isSlow ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.3)'}`,
                                  backgroundColor: !item.isCorrect ? 'rgba(239,68,68,0.04)' : isSlow ? 'rgba(245,158,11,0.04)' : 'rgba(16,185,129,0.04)',
                                  display: 'flex', flexDirection: 'column', gap: '10px'
                                }}>
                                  {/* Header: Question Status, Elapsed Time & Question Index */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      {!item.isCorrect ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontWeight: 700, fontSize: '0.84rem', background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                                          <XCircle size={14} /> Chưa chính xác
                                        </span>
                                      ) : isSlow ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 700, fontSize: '0.84rem', background: 'rgba(245,158,11,0.14)', padding: '2px 8px', borderRadius: '6px' }}>
                                          ⏱️ Phản xạ chậm ({item.elapsedSeconds.toFixed(1)}s &gt; 8s)
                                        </span>
                                      ) : (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 700, fontSize: '0.84rem', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                                          <CheckCircle size={14} /> Đúng ({item.elapsedSeconds ? `${item.elapsedSeconds.toFixed(1)}s` : ''})
                                        </span>
                                      )}
                                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>Câu #{idx + 1}</span>
                                    </div>
                                    {w.hiragana && (
                                      <button
                                        type="button"
                                        onClick={() => speakWord(w)}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                                        title="Phát âm từ vựng"
                                      >
                                        <Volume2 size={15} /> Nghe
                                      </button>
                                    )}
                                  </div>

                                  {/* Question Content */}
                                  <div className="font-jp" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {item.question}
                                  </div>

                                  {/* User answer vs Correct answer */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.92rem' }}>
                                    <div>
                                      <span style={{ color: 'var(--text-secondary)' }}>Bạn đã chọn / nhập: </span>
                                      <strong style={{ color: item.isCorrect ? (isSlow ? '#d97706' : '#10b981') : '#ef4444' }}>
                                        {item.userAnswer || '(Để trống)'}
                                      </strong>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-secondary)' }}>Đáp án chính xác: </span>
                                      <strong style={{ color: '#10b981' }}>{item.correctAnswer}</strong>
                                    </div>
                                  </div>

                                  {/* Rich Explanation Box */}
                                  {(item.explanation || w.mnemonic || w.usageGuide || w.sampleSentence || w.hanViet) && (
                                    <div style={{
                                      padding: '12px 14px', borderRadius: '10px',
                                      backgroundColor: 'var(--surface-color)',
                                      border: '1px solid var(--border-color)',
                                      display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem'
                                    }}>
                                      <div style={{ fontWeight: 700, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💡 Giải thích & Chi tiết:
                                      </div>

                                      {/* Grammar Explanation */}
                                      {item.explanation && (
                                        <div style={{ color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                                          {item.explanation}
                                        </div>
                                      )}

                                      {/* Han Viet */}
                                      {w.hanViet && (
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                          <strong>Âm Hán Việt:</strong> 【{w.hanViet}】
                                        </div>
                                      )}

                                      {/* Sample Sentence */}
                                      {(w.sampleSentence || w.vi_du) && (
                                        <div style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
                                          <strong>Ví dụ mẫu: </strong>
                                          <span className="font-jp">{w.sampleSentence || w.vi_du}</span>
                                        </div>
                                      )}

                                      {/* Mnemonic / Usage Guide */}
                                      {w.mnemonic && (
                                        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                          <strong>Mẹo nhớ:</strong> {w.mnemonic}
                                        </div>
                                      )}
                                      {w.usageGuide && (
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                          <strong>Lưu ý sử dụng:</strong> {w.usageGuide}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={startQuiz}
                          style={{ padding: '14px 22px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <RotateCcw size={16} /> Làm lại Quiz
                        </button>
                        <button
                          onClick={() => handleTabClick('flashcard')}
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

              {/* ───────────────────────────────────────────────────────────────
                  TAB 4: 20-QUESTION COMPREHENSIVE LESSON QUIZ (PASS 100%)
                 ─────────────────────────────────────────────────────────────── */}
              {activeTab === 'lesson_quiz' && (
                <LessonQuizView
                  chapter={selectedChapter}
                  lesson={selectedLesson}
                  lessonData={lessonData}
                  onQuizCompleted={(res) => {
                    if (res) {
                      setLessonData(prev => prev ? ({
                        ...prev,
                        quizPassed: res.quizPassed || (res.passed && res.score === res.total) || prev.quizPassed,
                        completed: res.completed || prev.completed,
                        bestScore: Math.max(prev.bestScore || 0, res.accuracy || 0)
                      }) : prev);
                      loadOverview();
                    }
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Grammar Detail Modal */}
      {selectedGrammarModal && (
        <GrammarDetailModal
          grammarCard={selectedGrammarModal}
          onClose={() => setSelectedGrammarModal(null)}
          onReEnriched={(updated) => setSelectedGrammarModal(updated)}
        />
      )}
    </div>
  );
};

export default JlptN3Page;
