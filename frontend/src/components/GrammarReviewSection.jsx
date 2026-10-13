import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Play, CheckCircle, XCircle, RefreshCw, Award,
  ChevronDown, ChevronUp, HelpCircle, Edit3, Save, Trash2,
  Search, Filter, Sparkles
} from 'lucide-react';
import { jlptN3GrammarReviewApi } from '../services/api';

const PASS_THRESHOLD = 24;

const GrammarReviewSection = ({ isAdmin }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState('');

  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await jlptN3GrammarReviewApi.getGrammarGroupOverview();
      if (data && data.groups) {
        setGroups(data.groups);
      }
    } catch (err) {
      console.error('Error fetching grammar groups:', err);
      setError('Không thể tải danh sách nhóm ngữ pháp. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleGenerateAll = async () => {
    if (!isAdmin) return;
    const confirmed = window.confirm('Bạn có chắc chắn muốn sinh lại toàn bộ nhóm ngữ pháp qua AI? Hành động này sẽ xóa dữ liệu cũ. Quá trình chạy nền mất 10-20 phút.');
    if (!confirmed) return;

    setGenerating(true);
    setGenStep('Đang khởi chạy AI nền...');
    try {
      const data = await jlptN3GrammarReviewApi.generateGrammarGroups();
      setGenerating(false);
      setGenStep('');
      window.alert(
        (data && data.message) ||
          'Đã khởi chạy tiến trình sinh nhóm ngữ pháp nền. Mở console server để theo dõi tiến trình, sau đó tải lại trang.'
      );
      setTimeout(fetchGroups, 5000);
    } catch (err) {
      console.error('Error generating grammar groups:', err);
      setError('Lỗi khi sinh nhóm ngữ pháp: ' + err.message);
      setGenerating(false);
      setGenStep('');
    }
  };

  const handleImport = async (jsonString) => {
    if (!isAdmin) return;
    try {
      const data = await jlptN3GrammarReviewApi.importGrammarGroupData(jsonString);
      if (data) {
        fetchGroups();
      }
    } catch (err) {
      console.error('Error importing grammar groups:', err);
      setError('Lỗi khi nhập dữ liệu: ' + err.message);
    }
  };

  const openGroupDetail = async (group) => {
    setSelectedGroup(null);
    setShowDetail(true);
    setError('');
    setLoading(true);
    try {
      const data = await jlptN3GrammarReviewApi.getGrammarGroupDetail(group.groupCode);
      if (data) {
        setSelectedGroup(data);
        resetQuizState();
      }
    } catch (err) {
      console.error('Error fetching group detail:', err);
      setError('Không thể tải chi tiết nhóm ngữ pháp.');
      setShowDetail(false);
    } finally {
      setLoading(false);
    }
  };

  const closeGroupDetail = () => {
    setShowDetail(false);
    setSelectedGroup(null);
    resetQuizState();
  };

  const resetQuizState = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setQuizScore(null);
    setSubmitResult(null);
  };

  const handleAnswerSelect = (questionIndex, answer) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleAnswerChange = (questionIndex, value) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const calculateScore = () => {
    if (!selectedGroup || !selectedGroup.questions) return 0;
    let score = 0;
    selectedGroup.questions.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      if (userAnswer && q.answer) {
        if (userAnswer.toString().trim().toLowerCase() === q.answer.toString().trim().toLowerCase()) {
          score++;
        }
      }
    });
    return score;
  };

  const handleSubmitQuiz = async () => {
    if (!selectedGroup || !selectedGroup.groupCode) return;
    setSubmitting(true);
    try {
      const score = calculateScore();
      const total = selectedGroup.questions.length;
      const result = await jlptN3GrammarReviewApi.submitGroupQuiz(selectedGroup.groupCode, score, total);
      setSubmitResult(result);
      setQuizScore(score);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Lỗi khi nộp bài.');
    } finally {
      setSubmitting(false);
    }
    setIsSubmitted(true);
  };

  const handleRetakeQuiz = () => {
    resetQuizState();
  };

  const renderQuestion = (q, idx) => {
    const userAnswer = userAnswers[idx];
    const isCorrect = userAnswer && q.answer &&
      userAnswer.toString().trim().toLowerCase() === q.answer.toString().trim().toLowerCase();
    const isIncorrect = isSubmitted && userAnswer && !isCorrect;

    const getOptionClass = (option, correct, selected) => {
      let baseClass = 'quiz-option';
      if (!isSubmitted) {
        if (selected) return baseClass + ' selected';
        return baseClass;
      }
      if (option === correct) return baseClass + ' correct';
      if (selected && option !== correct) return baseClass + ' incorrect';
      return baseClass;
    };

    const questionType = q.type || 'MCQ';
    let isPassed = submitResult && submitResult.passed;

    return (
      <div key={idx} className="quiz-question-card">
        <div className="quiz-question-header">
          <span className="quiz-question-number">Câu {idx + 1}/{selectedGroup.questions.length}</span>
          {q.type && <span className="quiz-question-type">{q.type}</span>}
        </div>
        <div className="quiz-question-text">{q.question}</div>

        {questionType === 'MCQ' && q.options && (
          <div className="quiz-options">
            {q.options.map((opt, optIdx) => (
              <button
                key={optIdx}
                type="button"
                className={getOptionClass(opt, q.answer, userAnswer === opt)}
                onClick={() => handleAnswerSelect(idx, opt)}
                disabled={isSubmitted}
              >
                {String.fromCharCode(65 + optIdx)}. {opt}
              </button>
            ))}
          </div>
        )}

        {questionType === 'FILL_BLANK' && (
          <div className="quiz-fill-blank">
            <input
              type="text"
              className={`fill-input ${isSubmitted ? (isCorrect ? 'correct' : (userAnswer && isIncorrect ? 'incorrect' : '')) : ''}`}
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(idx, e.target.value)}
              disabled={isSubmitted}
              placeholder="Nhập đáp án của bạn..."
            />
          </div>
        )}

        {questionType === 'CHOOSE_PATTERN' && q.options && (
          <div className="quiz-options">
            {q.options.map((opt, optIdx) => (
              <button
                key={optIdx}
                type="button"
                className={getOptionClass(opt, q.answer, userAnswer === opt)}
                onClick={() => handleAnswerSelect(idx, opt)}
                disabled={isSubmitted}
              >
                {String.fromCharCode(65 + optIdx)}. {opt}
              </button>
            ))}
          </div>
        )}

        {isSubmitted && (
          <div className={`quiz-explanation ${isCorrect ? 'correct' : ''}`}>
            {q.explanation && (
              <div>
                <strong>Giải thích:</strong> {q.explanation}
              </div>
            )}
            {userAnswer && !isCorrect && (
              <div>
                <strong>Đáp án đúng:</strong> {q.answer}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const unansweredCount = selectedGroup ? selectedGroup.questions.filter((_, idx) => !userAnswers[idx]).length : 0;

  if (!showDetail) {
    return (
      <div className="grammar-review-section">
        <div className="grammar-review-header">
          <div className="grammar-review-title">
            <BookOpen size={24} />
            <h2>Tổng Ôn Ngữ Pháp</h2>
          </div>
          <p className="grammar-review-subtitle">
            Ôn tập toàn bộ mẫu ngữ pháp JLPT N3 được nhóm hoá theo chủ đề
          </p>
          {isAdmin && (
            <div className="grammar-review-admin-actions">
              <button
                className="btn btn-outline"
                onClick={handleGenerateAll}
                disabled={generating}
              >
                {generating ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className="spinning" /> {genStep || 'Đang sinh...'}
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} /> Sinh bởi AI
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {error && <div className="grammar-review-error">{error}</div>}

        {loading ? (
          <div className="grammar-review-loading">
            <RefreshCw size={32} className="spinning" />
            <p>Đang tải danh sách nhóm ngữ pháp...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="grammar-review-empty">
            <HelpCircle size={48} />
            <h3>Chưa có nhóm ngữ pháp nào</h3>
            <p>{isAdmin ? 'Nhấn "Sinh bởi AI" để tạo nhóm ngữ pháp tự động.' : 'Hãy quay lại sau!'}</p>
          </div>
        ) : (
          <div className="grammar-groups-grid">
            {groups.map((g) => (
              <div
                key={g.groupCode}
                className="grammar-group-card"
                onClick={() => openGroupDetail(g)}
              >
                <div className="grammar-group-card-header">
                  <span className="grammar-group-code">{g.groupCode}</span>
                  <span className={`grammar-group-badge ${g.passed ? 'passed' : ''}`}>
                    {g.passed ? 'Đã Pass' : 'Chưa Pass'}
                  </span>
                </div>
                <h3 className="grammar-group-title">{g.title}</h3>
                <p className="grammar-group-description">
                  {g.description ? g.description.substring(0, 120) + '...' : 'Chưa có mô tả'}
                </p>
                <div className="grammar-group-meta">
                  <span className="grammar-group-patterns">{g.totalPatterns} mẫu ngữ pháp</span>
                  {g.bestScore > 0 && (
                    <span className="grammar-group-score">Điểm tốt nhất: {g.bestScore}/30</span>
                  )}
                </div>
                <button className="grammar-group-open-btn">
                  Bắt đầu ôn tập
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grammar-review-detail">
      <div className="grammar-review-detail-header">
        <button className="btn btn-ghost" onClick={closeGroupDetail}>
          ← Quay lại
        </button>
        <h2>{selectedGroup?.title || 'Chi tiết nhóm'}</h2>
        <span className="grammar-group-code-header">{selectedGroup?.groupCode}</span>
      </div>

      <div className="grammar-review-detail-content">
        <div className="grammar-group-info">
          {selectedGroup?.description && (
            <div className="grammar-group-section">
              <h3>Mô tả</h3>
              <p>{selectedGroup.description}</p>
            </div>
          )}

          {selectedGroup?.usageGuide && (
            <div className="grammar-group-section">
              <h3>Hướng dẫn cách dùng</h3>
              <p>{selectedGroup.usageGuide}</p>
            </div>
          )}

          {selectedGroup?.usageCases && (
            <div className="grammar-group-section">
              <h3>Trường hợp sử dụng</h3>
              <p>{selectedGroup.usageCases}</p>
            </div>
          )}

          {selectedGroup?.patterns && selectedGroup.patterns.length > 0 && (
            <div className="grammar-patterns-section">
              <h3>Các mẫu ngữ pháp ({selectedGroup.patterns.length})</h3>
              <div className="grammar-patterns-list">
                {selectedGroup.patterns.map((p, idx) => (
                  <div key={idx} className="grammar-pattern-item">
                    <div className="grammar-pattern-header">
                      <span className="grammar-pattern-structure">{p.cauTruc || p.structure}</span>
                      <span className="grammar-pattern-meaning">{p.yNghia || p.meaning}</span>
                    </div>
                    {p.examples && p.examples.length > 0 && (
                      <div className="grammar-pattern-examples">
                        <strong>Ví dụ:</strong>
                        <ul>
                          {p.examples.map((ex, exIdx) => (
                            <li key={exIdx}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grammar-review-quiz">
          <div className="grammar-review-quiz-header">
            <h3>Quiz (30 câu)</h3>
            {!isSubmitted && unansweredCount > 0 && (
              <span className="unanswered-badge">{unansweredCount} chưa trả lời</span>
            )}
          </div>

          {selectedGroup?.questions && selectedGroup.questions.length > 0 ? (
            <>
              <div className="grammar-quiz-container">
                {selectedGroup.questions.map((q, idx) => renderQuestion(q, idx))}
              </div>

              {!isSubmitted ? (
                <button
                  className="btn btn-primary quiz-submit-btn"
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                >
                  {submitting ? 'Đang nộp...' : `Nộp bài (${selectedGroup.questions.filter((_, idx) => userAnswers[idx]).length}/${selectedGroup.questions.length} đã trả lời)`}
                </button>
              ) : (
                <div className="quiz-result-summary">
                  <div className={`quiz-result ${submitResult?.passed ? 'passed' : 'failed'}`}>
                    <Award size={32} />
                    <span>
                      {submitResult?.passed ? 'ĐẠT' : 'CHƯA ĐẠT'} ({quizScore}/{selectedGroup?.questions?.length || 30})
                    </span>
                  </div>
                  {!submitResult?.passed && (
                    <button className="btn btn-outline" onClick={handleRetakeQuiz}>
                      Làm lại
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="quiz-empty">
              <p>Chưa có câu hỏi cho nhóm này.</p>
              {isAdmin && (
                <button className="btn btn-outline" onClick={() => handleGenerateAll()}>
                  <RefreshCw size={16} /> Sinh câu hỏi
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GrammarReviewSection;
