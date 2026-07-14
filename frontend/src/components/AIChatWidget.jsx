import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, SendHorizonal, Trash2, Sparkles } from 'lucide-react';
import { chatApi } from '../services/api';
import '../styles/AIChatWidget.css';

const MAX_CHAT_CHARS = 300;
const WELCOME_MSG = {
  role: 'assistant',
  content: 'こんにちは！ Tôi là trợ lý AI học tiếng Nhật 🇯🇵\nHỏi tôi về:\n• Dịch thuật Nhật ↔ Việt\n• Giải thích ngữ pháp\n• Cách phát âm & ý nghĩa\n• Từ vựng cùng chủ đề'
};

const QUICK_PROMPTS = [
  { label: '📖 Dịch sang tiếng Việt', text: 'Dịch sang tiếng Việt: ' },
  { label: '📐 Giải thích ngữ pháp', text: 'Giải thích ngữ pháp: ' },
  { label: '🎤 Cách đọc & ý nghĩa', text: 'Cách đọc và ý nghĩa của: ' },
  { label: '📚 Từ vựng cùng chủ đề', text: 'Cho tôi 5 từ vựng về chủ đề: ' },
];

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const historyForApi = messages
      .slice(-16)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await chatApi.send(trimmed, historyForApi);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || 'Xin lỗi, không nhận được phản hồi.'
      }]);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Không thể kết nối tới AI.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ ' + msg
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setMessages([WELCOME_MSG]);
  };

  return (
    <>
      {/* Floating AI Chat Button */}
      <button
        className={`ai-chat-fab ${isOpen ? 'open' : ''} ${loading ? 'thinking' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        title="Trợ lý AI học tiếng Nhật"
        aria-label="Mở chat AI"
      >
        {isOpen ? <X size={22} /> : <Bot size={22} />}
        {loading && <span className="ai-fab-ring" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="ai-chat-panel">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-chat-avatar-sm">
                <Bot size={16} />
              </div>
              <div>
                <div className="ai-chat-title">
                  AI Nhật ngữ
                  <Sparkles size={12} className="ai-chat-sparkle" />
                </div>
                <div className="ai-chat-subtitle">
                  {loading ? 'Đang soạn câu trả lời...' : 'Sẵn sàng hỗ trợ'}
                </div>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              {messages.length > 1 && (
                <button
                  className="ai-chat-icon-btn"
                  onClick={handleClear}
                  title="Xóa lịch sử"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                className="ai-chat-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Đóng"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-bubble ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ai-bubble-avatar"><Bot size={13} /></div>
                )}
                <div className="ai-bubble-text">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="ai-bubble assistant">
                <div className="ai-bubble-avatar"><Bot size={13} /></div>
                <div className="ai-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="ai-quick-prompts">
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q.label}
                  className="ai-quick-chip"
                  onClick={() => handleQuickPrompt(q.text)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="ai-chat-input-area">
            <div className="ai-chat-input-meta">
              <span className={input.length > MAX_CHAT_CHARS * 0.88 ? 'ai-char-warn' : 'ai-char-ok'}>
                {input.length}/{MAX_CHAT_CHARS}
              </span>
            </div>
            <div className="ai-chat-input-row">
              <textarea
                ref={inputRef}
                className="ai-chat-textarea"
                placeholder="Hỏi về tiếng Nhật... (Enter gửi)"
                value={input}
                maxLength={MAX_CHAT_CHARS}
                rows={2}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className="ai-chat-send"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                title="Gửi (Enter)"
              >
                <SendHorizonal size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
