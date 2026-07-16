import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, CornerUpLeft, Volume2, Square, Activity, Wifi, WifiOff, Loader, LogOut, Compass, Sliders } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ConversationReport from '../components/ConversationReport';
import '../styles/ConversationTutorPage.css';

const SCENARIOS = [
  { id: 'Restaurant', name: 'Nhà hàng 🍽️', desc: 'Đóng vai khách hàng gọi món và giao tiếp với phục vụ.' },
  { id: 'Cafe', name: 'Quán Cafe ☕', desc: 'Gọi đồ uống, thanh toán tiền và giao tiếp nhẹ nhàng.' },
  { id: 'Convenience Store', name: 'Cửa hàng tiện lợi 🏪', desc: 'Mua sắm đồ ăn nhanh, hỏi giá, yêu cầu hâm nóng đồ ăn.' },
  { id: 'Hotel', name: 'Khách sạn 🏨', desc: 'Thủ tục Check-in, Check-out, hỏi đường, yêu cầu dịch vụ phòng.' },
  { id: 'Airport', name: 'Sân bay ✈️', desc: 'Check-in vé máy bay, khai báo hải quan, gửi hành lý.' },
  { id: 'Friend', name: 'Nói chuyện bạn bè 👥', desc: 'Hội thoại thân mật sử dụng thể ngắn (đầu óc thoải mái).' },
  { id: 'Daily Life', name: 'Đời sống hàng ngày 🏠', desc: 'Hội thoại ngẫu nhiên xoay quanh các chủ đề sinh hoạt.' }
];

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

export default function ConversationTutorPage({ goBack }) {
  const { t } = useLanguage();
  const { token, user } = useAuth();

  // Step state: 'setup' | 'active' | 'report'
  const [step, setStep] = useState('setup');
  const [scenario, setScenario] = useState('Cafe');
  const [jlpt, setJlpt] = useState('N3');
  const [conversationId, setConversationId] = useState(null);

  // Status variables
  const [wsConnected, setWsConnected] = useState(false);
  const [aiState, setAiState] = useState('idle'); // 'idle' | 'thinking' | 'speaking' | 'listening'
  const [subtitle, setSubtitle] = useState('');
  const [transcript, setTranscript] = useState([]); // [{sender: 'USER'|'AI', text: '...'}]
  const [isRecording, setIsRecording] = useState(false);

  // Mode: 'push' (Push-to-Talk) | 'continuous' (Continuous conversation)
  const [mode, setMode] = useState('push');

  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const ttsActiveRef = useRef(false);
  const transcriptEndRef = useRef(null);

  // Create refs to avoid closure issues with speech recognition callbacks
  const modeRef = useRef(mode);
  const aiStateRef = useRef(aiState);
  const stepRef = useRef(step);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    modeRef.current = mode;
    aiStateRef.current = aiState;
    stepRef.current = step;
    isRecordingRef.current = isRecording;
  });

  useEffect(() => {
    // Scroll to bottom of chat transcript area
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, subtitle]);

  // Web Speech API - Speech Recognition Setup (Run once on mount)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'ja-JP';
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setIsRecording(true);
        setAiState('listening');
      };

      rec.onresult = (event) => {
        const resultText = event.results[0][0].transcript;
        logMessage("USER", resultText);
        sendUserText(resultText);
      };

      rec.onerror = (e) => {
        // Only log serious errors, ignore 'aborted' as it happens naturally during switching
        if (e.error !== 'aborted') {
          console.error("Speech recognition error:", e);
        }
        setIsRecording(false);
        setAiState('idle');
      };

      rec.onend = () => {
        setIsRecording(false);
        // In continuous mode, restart listening if AI is not speaking/thinking
        if (modeRef.current === 'continuous' && aiStateRef.current === 'idle' && stepRef.current === 'active') {
          setTimeout(() => {
            if (!ttsActiveRef.current && stepRef.current === 'active' && aiStateRef.current === 'idle') {
              startListening();
            }
          }, 400);
        } else {
          setAiState('idle');
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []); // Run once on mount

  const startListening = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Stop any pending TTS voice
    }
    if (recognitionRef.current && !isRecordingRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isRecordingRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Connect to WebSocket Server
  const connectWebSocket = () => {
    const loc = window.location;
    const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl;
    if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
      wsUrl = `${proto}//${loc.hostname}:8080/ws/conversation`;
    } else {
      wsUrl = `${proto}//${loc.host}/ws/conversation`;
    }

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setWsConnected(true);
      // Send handshake message
      const initMsg = {
        type: 'CONNECT_SESSION',
        token: token,
        scenario: scenario,
        jlpt: jlpt
      };
      socket.send(JSON.stringify(initMsg));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (e) {
        console.error("Failed to parse websocket message:", e);
      }
    };

    socket.onclose = () => {
      setWsConnected(false);
      logMessage("SYSTEM", "Mất kết nối với gia sư!");
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  };

  const handleServerMessage = (msg) => {
    switch (msg.type) {
      case 'SESSION_CONNECTED':
        setConversationId(msg.conversationId);
        setStep('active');
        setTranscript([]);
        setSubtitle('Chào mừng bạn đến buổi học! Bấm Mic hoặc gõ phím để nói chuyện.');
        // Play welcome speech contextually
        speakText("こんにちは！準備はいいですか？始めましょう。");
        break;
      case 'AI_THINKING':
        setAiState('thinking');
        setSubtitle('AI đang suy nghĩ...');
        break;
      case 'STREAM_TEXT_CHUNK':
        setAiState('speaking');
        // If it's the first chunk of stream, reset subtitle
        setSubtitle(prev => (prev === 'AI đang suy nghĩ...' || prev.startsWith('Chào mừng')) ? msg.text : prev + msg.text);
        break;
      case 'AI_SPEAKING':
        setAiState('idle');
        const completeSpeech = subtitle;
        // Append response to transcript
        logMessage("AI", completeSpeech);
        speakText(completeSpeech);
        break;
      case 'SESSION_COMPLETED':
        setStep('report');
        break;
      case 'ERROR':
        console.error("Server Error:", msg.message);
        setSubtitle("Lỗi: " + msg.message);
        setAiState('idle');
        break;
    }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Remove tags/furigana helper brackets if any
    const cleanText = text.replace(/\[DIALOGUE\]|\[ANALYSIS\].*$/s, "").trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.88;

    utterance.onstart = () => {
      setAiState('speaking');
      ttsActiveRef.current = true;
    };

    utterance.onend = () => {
      setAiState('idle');
      ttsActiveRef.current = false;
      // In continuous mode, start listening immediately after AI finishes speaking
      if (mode === 'continuous' && step === 'active') {
        setTimeout(startListening, 300);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const sendUserText = (text) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg = {
        type: 'SEND_TEXT',
        text: text
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const logMessage = (sender, text) => {
    setTranscript(prev => [...prev, { sender, text }]);
  };

  const handleStartSession = () => {
    connectWebSocket();
  };

  const handleEndSession = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'END_SESSION' }));
    } else {
      setStep('setup');
    }
  };

  // ── Render ──

  if (step === 'setup') {
    return (
      <div className="tutor-container">
        <button className="btn btn-secondary" onClick={goBack} style={{ alignSelf: 'flex-start', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CornerUpLeft size={16} /> Quay lại Trang chủ
        </button>

        <div className="tutor-setup-card">
          <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
            🗣️ AI Japanese Tutor
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
            Học giao tiếp tiếng Nhật đóng vai theo thời gian thực. AI theo dõi hồ sơ học tập và phản xạ nói của riêng bạn.
          </p>

          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
              1. Chọn cấp độ JLPT của bạn
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {JLPT_LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setJlpt(level)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: jlpt === level ? 'var(--accent-color)' : 'var(--border-color)',
                    background: jlpt === level ? 'var(--accent-light)' : 'var(--surface-color)',
                    color: jlpt === level ? 'var(--accent-color)' : 'var(--text-primary)',
                    fontWeight: jlpt === level ? 'bold' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '35px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              2. Chọn Kịch bản đóng vai (Scenario)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }} className="hide-scrollbar">
              {SCENARIOS.map(sc => (
                <div
                  key={sc.id}
                  onClick={() => setScenario(sc.id)}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: scenario === sc.id ? 'var(--accent-color)' : 'var(--border-color)',
                    background: scenario === sc.id ? 'var(--accent-light)' : 'var(--surface-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <strong style={{ display: 'block', color: scenario === sc.id ? 'var(--accent-color)' : 'var(--text-primary)', fontSize: '0.95rem' }}>{sc.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sc.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }} onClick={handleStartSession}>
            Bắt đầu Hội thoại AI 🚀
          </button>
        </div>
      </div>
    );
  }

  if (step === 'report') {
    return (
      <div className="tutor-container" style={{ height: 'auto', overflowY: 'auto' }}>
        <ConversationReport conversationId={conversationId} onClose={() => setStep('setup')} />
      </div>
    );
  }

  // Active session screen
  return (
    <div className="tutor-container">
      {/* Top Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>🗣️ Gia sư AI ({scenario})</span>
          <span className="level-badge">{jlpt}</span>
          <div className={`status-badge ${wsConnected ? 'connected' : 'thinking'}`}>
            {wsConnected ? <><Wifi size={14} /> Trực tuyến</> : <><WifiOff size={14} /> Ngoại tuyến</>}
          </div>
        </div>
        <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--danger-light)', color: 'var(--danger-color)', border: 'none' }} onClick={handleEndSession}>
          <LogOut size={16} /> Kết thúc học
        </button>
      </div>

      <div className="tutor-grid">
        {/* Left Column: Chat Transcript */}
        <div className="chat-panel">
          <div className="transcript-area">
            {transcript.map((msg, i) => (
              <div key={i} className={`msg-bubble ${msg.sender.toLowerCase()}`}>
                <strong>{msg.sender === 'USER' ? 'Học viên: ' : 'AI Sensei: '}</strong>
                <span>{msg.text}</span>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {/* Subtitle Display */}
          <div className="subtitle-panel">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Subtitles</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>{subtitle}</span>
          </div>
        </div>

        {/* Right Column: AI Avatar & Soundwave status */}
        <div className="avatar-panel">
          <div className={`avatar-circle ${aiState}`}>
            {aiState === 'listening' ? '👂' : aiState === 'thinking' ? '🤔' : aiState === 'speaking' ? '🗣️' : '👨‍🏫'}
          </div>
          
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>Sensei</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {aiState === 'listening' ? 'Thầy đang nghe bạn...' : aiState === 'thinking' ? 'AI đang suy nghĩ...' : aiState === 'speaking' ? 'AI đang nói...' : 'Đang đợi bạn nói'}
          </span>

          {/* Soundwave Animation */}
          <div className="audio-wave">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`wave-bar ${aiState === 'speaking' || aiState === 'listening' ? 'active' : ''}`} style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>

          {/* Mic Controller Area */}
          <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            
            {/* Mode selection buttons */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--surface-hover)', padding: '4px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
              <button onClick={() => setMode('push')} style={{ padding: '6px 12px', fontSize: '0.78rem', background: mode === 'push' ? 'var(--surface-color)' : 'transparent', border: 'none', color: mode === 'push' ? 'var(--accent-color)' : 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Push to Talk
              </button>
              <button onClick={() => setMode('continuous')} style={{ padding: '6px 12px', fontSize: '0.78rem', background: mode === 'continuous' ? 'var(--surface-color)' : 'transparent', border: 'none', color: mode === 'continuous' ? 'var(--accent-color)' : 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Hội thoại liên tục
              </button>
            </div>

            <button className={`mic-btn ${isRecording ? 'recording' : 'idle'}`} onClick={toggleRecording}>
              {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px' }}>
              {mode === 'push' ? 'Nhấn để Nói (Click to Speak)' : 'Hội thoại liên tục đang bật'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
