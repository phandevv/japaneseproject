import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Volume2, RefreshCw, PenLine, Eraser, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { vocabApi } from '../services/api';

/* ─────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────── */
const DRAW_MS         = 1200;
const BETWEEN_CHAR_MS = 1200;
const DASH_MAX        = 600;
const CANVAS_SIZE     = 400;   // px – writing practice canvas

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
const isCJK = (c) => { const n = c.codePointAt(0); return n >= 0x4e00 && n <= 0x9fff; };
const extractKanjiChars = (str) => str ? [...str].filter(isCJK) : [];

const fetchKanjiSVG = async (char) => {
  if (!char || !isCJK(char)) return null;
  const hex = char.codePointAt(0).toString(16).padStart(5, '0');
  try {
    const r = await fetch(`https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`);
    return r.ok ? r.text() : null;
  } catch { return null; }
};

const parseStrokes = (svgText) => {
  if (!svgText) return [];
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const g = doc.querySelector('[id*="StrokePaths"]');
  return g ? Array.from(g.querySelectorAll('path')).map(p => p.getAttribute('d')) : [];
};

/* ─────────────────────────────────────────────
   KanjiBoard (presentational – stroke animation)
   ───────────────────────────────────────────── */
const KanjiBoard = ({ strokes, doneCount, currentIdx, animKey, size, isActive, onStrokeEnd }) => {
  const box   = size + 20;
  const total = strokes.length;
  const whiteUpTo = (currentIdx >= 0 && currentIdx < total)
    ? Math.max(doneCount, currentIdx + 1) : doneCount;
  const showAnim  = currentIdx >= 0 && currentIdx < total;

  return (
    <div style={{
      width: box, height: box,
      background: 'rgba(255,255,255,0.04)', borderRadius: 14,
      border: `1px solid ${isActive ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      transition: 'border-color 0.3s',
    }}>
      <svg width={box} height={box} style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
        <line x1={box/2} y1="0"    x2={box/2} y2={box}   stroke="white" strokeWidth="1"   strokeDasharray="4 4" />
        <line x1="0"     y1={box/2} x2={box}   y2={box/2} stroke="white" strokeWidth="1"   strokeDasharray="4 4" />
        <line x1="0"     y1="0"    x2={box}    y2={box}   stroke="white" strokeWidth="0.5" strokeDasharray="3 6" />
        <line x1={box}   y1="0"    x2="0"      y2={box}   stroke="white" strokeWidth="0.5" strokeDasharray="3 6" />
      </svg>
      {total > 0 ? (
        <svg viewBox="0 0 109 109" width={size} height={size} style={{ position: 'relative', zIndex: 1 }}>
          {strokes.map((d, i) => (
            <path key={`g${i}`} d={d} fill="none" stroke="rgba(255,255,255,0.08)"
              strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {strokes.slice(0, whiteUpTo).map((d, i) => (
            <path key={`w${i}`} d={d} fill="none" stroke="rgba(248,250,252,0.88)"
              strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {showAnim && (
            <path key={animKey} d={strokes[currentIdx]} fill="none"
              stroke="#f87171" strokeWidth="4.5"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={DASH_MAX} strokeDashoffset={DASH_MAX}
              onAnimationEnd={onStrokeEnd}
              style={{
                filter: 'drop-shadow(0 0 6px rgba(248,113,113,0.85))',
                animation: `drawKanjiStroke ${DRAW_MS}ms ease-in-out forwards`,
              }}
            />
          )}
          {strokes.slice(0, whiteUpTo).map((d, i) => {
            const m = d.match(/M\s*([\d.]+)[,\s]+([\d.]+)/);
            if (!m) return null;
            return (
              <text key={`n${i}`} x={parseFloat(m[1])} y={parseFloat(m[2]) - 4.5}
                fill={i === currentIdx ? 'rgba(239,68,68,0.95)' : 'rgba(239,68,68,0.55)'}
                fontSize="5.5" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
                {i + 1}
              </text>
            );
          })}
        </svg>
      ) : (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0 8px' }}>
          筆順データなし
        </span>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   StrokeOrderDisplay
   ───────────────────────────────────────────── */
const StrokeOrderDisplay = ({ kanji }) => {
  const kanjiChars = extractKanjiChars(kanji);
  const [strokesMap, setStrokesMap] = useState({});
  const [loading, setLoading]       = useState(false);
  const [queue, setQueue]           = useState([]);
  const [queueIdx, setQueueIdx]     = useState(-1);
  const [doneTotal, setDoneTotal]   = useState(0);
  const [animKey, setAnimKey]       = useState(0);
  const [animating, setAnimating]   = useState(false);
  const queueIdxRef = useRef(-1);
  const queueRef    = useRef([]);
  const timerRef    = useRef(null);

  useEffect(() => {
    if (kanjiChars.length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true); setStrokesMap({}); setQueue([]); queueRef.current = [];
    setQueueIdx(-1); queueIdxRef.current = -1; setDoneTotal(0); setAnimating(false);
    Promise.all(kanjiChars.map(c => fetchKanjiSVG(c).then(svg => ({ char: c, strokes: parseStrokes(svg) }))))
      .then(results => {
        const map = {};
        results.forEach(({ char, strokes }) => { map[char] = strokes; });
        setStrokesMap(map); setLoading(false);
      });
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [kanji]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const allReady = kanjiChars.length > 0 && kanjiChars.every(c => strokesMap[c] !== undefined);
    if (!allReady) return;
    const q = [];
    kanjiChars.forEach((char, ci) => { (strokesMap[char] ?? []).forEach((_, si) => q.push({ charIdx: ci, char, strokeIdx: si })); });
    queueRef.current = q; setQueue(q);
  }, [strokesMap]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (queue.length === 0) return;
    timerRef.current = setTimeout(runAnimation, 450);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [queue]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAnimation = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    queueIdxRef.current = -1; setQueueIdx(-1); setDoneTotal(0); setAnimating(true);
    timerRef.current = setTimeout(() => { queueIdxRef.current = 0; setQueueIdx(0); setAnimKey(k => k + 1); }, 80);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopAnimation = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    queueIdxRef.current = -1;
    setQueueIdx(-1);
    setDoneTotal(0);
    setAnimating(false);
  }, []);

  const handleStrokeEnd = useCallback((e) => {
    if (e.animationName !== 'drawKanjiStroke') return;
    const idx = queueIdxRef.current;
    const q   = queueRef.current;
    if (idx < 0 || idx >= q.length) return;
    const nextIdx = idx + 1;
    if (nextIdx >= q.length) {
      queueIdxRef.current = -1; setDoneTotal(q.length); setQueueIdx(-1); setAnimating(false); return;
    }
    const crossingChar = q[nextIdx].charIdx !== q[idx].charIdx;
    if (!crossingChar) {
      queueIdxRef.current = nextIdx; setDoneTotal(idx + 1); setQueueIdx(nextIdx); setAnimKey(k => k + 1);
    } else {
      queueIdxRef.current = -1; setDoneTotal(idx + 1); setQueueIdx(-1);
      timerRef.current = setTimeout(() => { queueIdxRef.current = nextIdx; setQueueIdx(nextIdx); setAnimKey(k => k + 1); }, BETWEEN_CHAR_MS);
    }
  }, []);

  let offset = 0;
  const charMeta = kanjiChars.map((char, ci) => {
    const strokes = strokesMap[char] ?? [];
    const start   = offset; offset += strokes.length;
    const charDoneCount  = Math.max(0, Math.min(strokes.length, doneTotal - start));
    const charCurrentIdx = (queueIdx >= start && queueIdx < start + strokes.length) ? queueIdx - start : -1;
    return { char, strokes, charDoneCount, charCurrentIdx, isActive: charCurrentIdx >= 0 };
  });

  const n = kanjiChars.length;
  // Scale down board size as kanji count increases to prevent overflow
  const boardSize = n >= 5 ? 74 : n === 4 ? 86 : n === 3 ? 100 : n === 2 ? 118 : 158;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {loading ? (
        <div style={{ width: 178, height: 178, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>読み込み中…</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
            {charMeta.map(({ char, strokes, charDoneCount, charCurrentIdx, isActive }, ci) => (
              <div key={`${char}-${ci}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: 'var(--font-jp)', fontSize: '0.95rem', fontWeight: 700, color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)', transition: 'color 0.3s' }}>{char}</span>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'var(--accent-color)' : 'transparent', boxShadow: isActive ? '0 0 8px rgba(239,68,68,0.9)' : 'none', transition: 'all 0.3s', marginBottom: 2 }} />
                <KanjiBoard strokes={strokes} doneCount={charDoneCount} currentIdx={charCurrentIdx} animKey={animKey} size={boardSize} isActive={isActive} onStrokeEnd={handleStrokeEnd} />
                {strokes.length > 0 && <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{charDoneCount}/{strokes.length} 画</span>}
              </div>
            ))}
          </div>
          {queue.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doneTotal}/{queue.length} 画</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={runAnimation} disabled={animating} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 20, fontSize: '0.75rem',
                  background: animating ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.3)',
                  color: animating ? 'var(--text-secondary)' : 'var(--accent-color)', cursor: animating ? 'default' : 'pointer', transition: 'all 0.2s',
                }}>
                  <RefreshCw size={11} style={{ animation: animating ? 'spin 0.8s linear infinite' : 'none' }} />
                  {animating ? 'Đang vẽ...' : 'Vẽ lại'}
                </button>
                {animating && (
                  <button onClick={stopAnimation} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 20, fontSize: '0.75rem',
                    background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.3)',
                    color: 'var(--accent-color)', cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    <X size={11} />
                    Dừng
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   KanjiPracticeCanvas
   Writing practice panel shown on the "back" of the card.
   ───────────────────────────────────────────── */
const KanjiPracticeCanvas = ({ word, onBack }) => {
  const bgRef  = useRef(null);   // grid + hint layer
  const fgRef  = useRef(null);   // user drawing layer
  const isDrawing = useRef(false);
  const [showHint, setShowHint] = useState(false);
  const [strokes, setStrokes]   = useState(0);  // count user strokes

  // Stroke data tracking states
  const userStrokes = useRef([]);
  const currentStroke = useRef({ x: [], y: [], t: [] });
  const startTime = useRef(null);
  const [checking, setChecking] = useState(false);
  const [recResult, setRecResult] = useState(null); // 'correct' | 'incorrect' | null
  const [candidates, setCandidates] = useState([]);

  /* Draw grid on background canvas */
  const drawBg = useCallback(() => {
    const canvas = bgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const S = CANVAS_SIZE;
    ctx.clearRect(0, 0, S, S);

    // Grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(S/2, 0);   ctx.lineTo(S/2, S);
    ctx.moveTo(0,   S/2); ctx.lineTo(S,   S/2);
    ctx.moveTo(0,   0);   ctx.lineTo(S,   S);
    ctx.moveTo(S,   0);   ctx.lineTo(0,   S);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Hint: ghost kanji text
    if (showHint) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle   = '#f87171';
      const text = word.kanji || word.hiragana || '';
      const fontSize = text.length > 2 ? Math.floor(S / text.length * 0.85) : Math.floor(S * 0.72);
      ctx.font = `900 ${fontSize}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, S / 2, S / 2);
      ctx.restore();
    }
  }, [showHint, word]);

  useEffect(() => { drawBg(); }, [drawBg]);

  /* Clear user drawing */
  const clearCanvas = () => {
    const ctx = fgRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    setStrokes(0);
    userStrokes.current = [];
    currentStroke.current = { x: [], y: [], t: [] };
    startTime.current = null;
    setRecResult(null);
    setCandidates([]);
  };

  /* Pointer position relative to canvas (supports touch + mouse) */
  const getPos = (e) => {
    const canvas = fgRef.current;
    const rect   = canvas.getBoundingClientRect();
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (CANVAS_SIZE / rect.width),
      y: (src.clientY - rect.top)  * (CANVAS_SIZE / rect.height),
    };
  };

  const onStart = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const ctx = fgRef.current.getContext('2d');
    const pt  = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setStrokes(s => s + 1);

    if (!startTime.current) {
      startTime.current = Date.now();
    }
    currentStroke.current = {
      x: [Math.round(pt.x)],
      y: [Math.round(pt.y)],
      t: [Date.now() - startTime.current]
    };
  };

  const onMove = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = fgRef.current.getContext('2d');
    const pt  = getPos(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth   = 5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();

    if (currentStroke.current) {
      currentStroke.current.x.push(Math.round(pt.x));
      currentStroke.current.y.push(Math.round(pt.y));
      currentStroke.current.t.push(Date.now() - startTime.current);
    }
  };

  const onEnd = (e) => {
    e.preventDefault();
    if (isDrawing.current) {
      isDrawing.current = false;
      if (currentStroke.current && currentStroke.current.x.length > 0) {
        userStrokes.current.push([
          currentStroke.current.x,
          currentStroke.current.y,
          currentStroke.current.t
        ]);
      }
    }
  };

  const checkHandwriting = async () => {
    if (userStrokes.current.length === 0) return;
    setChecking(true);
    setRecResult(null);
    setCandidates([]);
    
    try {
      const requestBody = {
        options: 'enable_pre_space',
        requests: [
          {
            writing_guide: {
              writing_area_width: CANVAS_SIZE,
              writing_area_height: CANVAS_SIZE
            },
            ink: userStrokes.current,
            language: 'ja'
          }
        ]
      };

      const response = await fetch('https://inputtools.google.com/request?itc=ja-t-i0-handwriting&app=translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      if (data[0] === 'SUCCESS') {
        const cands = data[1][0][1] || [];
        setCandidates(cands.slice(0, 10)); // Top 10 candidates
        
        const target = word.kanji || word.hiragana || '';
        const cleanTarget = target.trim();
        
        // Match with some error tolerance (matches if cleanTarget is in the candidates list)
        const isMatched = cands.some(cand => cand.trim() === cleanTarget);
        setRecResult(isMatched ? 'correct' : 'incorrect');
      } else {
        throw new Error('API returned failure status');
      }
    } catch (err) {
      console.error('Handwriting check error:', err);
      alert('Không thể kết nối dịch vụ nhận diện. Vui lòng thử lại!');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>

      {/* Prompt */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)', marginBottom: 8 }}>
          Viết kanji có nghĩa là
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--success-color)', lineHeight: 1.3 }}>
          {word.meaning}
        </div>
        {word.hiragana && word.kanji && (
          <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)', marginTop: 5, fontFamily: 'var(--font-jp)', letterSpacing: '0.05em' }}>
            {word.hiragana}
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div style={{
        position: 'relative',
        width: CANVAS_SIZE, height: CANVAS_SIZE,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        boxShadow: '0 0 0 1px rgba(239,68,68,0.08), inset 0 0 30px rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        {/* Background: grid + ghost hint */}
        <canvas ref={bgRef} width={CANVAS_SIZE} height={CANVAS_SIZE}
          style={{ position: 'absolute', top: 0, left: 0 }} />
        {/* Foreground: user strokes */}
        <canvas ref={fgRef} width={CANVAS_SIZE} height={CANVAS_SIZE}
          style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        />
        {/* Stroke counter badge */}
        {strokes > 0 && (
          <div style={{
            position: 'absolute', top: 8, right: 10,
            fontSize: '0.68rem', color: 'rgba(239,68,68,0.7)',
            fontWeight: 700, pointerEvents: 'none',
          }}>
            {strokes} 画
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Check button */}
        <button onClick={checkHandwriting} disabled={checking || strokes === 0} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 16px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 'bold',
          background: 'var(--accent-color)', border: 'none',
          color: 'white', cursor: (checking || strokes === 0) ? 'default' : 'pointer', transition: 'all 0.2s',
          opacity: (checking || strokes === 0) ? 0.5 : 1,
          boxShadow: (checking || strokes === 0) ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.3)',
        }}>
          {checking ? 'Đang kiểm tra...' : 'Kiểm tra'}
        </button>

        {/* Hint */}
        <button onClick={() => setShowHint(h => !h)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 14px', borderRadius: 20, fontSize: '0.78rem',
          background: showHint ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${showHint ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
          color: showHint ? 'var(--accent-color)' : 'var(--text-secondary)',
          cursor: 'pointer', transition: 'all 0.2s',
        }}>
          {showHint ? <EyeOff size={13} /> : <Eye size={13} />}
          {showHint ? 'Ẩn hint' : 'Hiện hint'}
        </button>

        {/* Clear */}
        <button onClick={clearCanvas} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 14px', borderRadius: 20, fontSize: '0.78rem',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <Eraser size={13} /> Xóa
        </button>

        {/* Back */}
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 14px', borderRadius: 20, fontSize: '0.78rem',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <RotateCcw size={13} /> Quay lại
        </button>
      </div>

      {/* Recognition Result Banner */}
      {recResult && (
        <div style={{
          width: '100%',
          maxWidth: CANVAS_SIZE,
          padding: '12px 16px',
          borderRadius: 12,
          border: `1px solid ${recResult === 'correct' ? 'var(--success-color)' : 'rgba(239,68,68,0.4)'}`,
          backgroundColor: recResult === 'correct' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          textAlign: 'center',
          marginTop: 5,
          animation: 'slideIn 0.2s ease forwards',
        }}>
          {recResult === 'correct' ? (
            <span style={{ color: 'var(--success-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>
              ✓ Viết chính xác! Bạn viết rất tốt. 🎉
            </span>
          ) : (
            <div>
              <span style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: 6 }}>
                ✗ Chưa đúng lắm, hãy thử viết lại nhé!
              </span>
              {candidates.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Gợi ý nhận diện: <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{candidates.slice(0, 5).join(', ')}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Answer reveal */}
      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.22)', textAlign: 'center' }}>
        Vẽ kanji vào khung · Hint hiển thị kanji mờ làm mẫu
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   KanjiDetailModal
   ───────────────────────────────────────────── */
const KanjiDetailModal = ({ words, initialIndex, onClose }) => {
  useLanguage();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [slideDir, setSlideDir]         = useState(null);
  const [isSliding, setIsSliding]       = useState(false);

  // Card flip state: 'front' | 'back'
  const [side, setSide]       = useState('front');
  const [flipping, setFlipping] = useState(false);

  const overlayRef = useRef(null);
  const word = words[currentIndex];

  const [enriched, setEnriched] = useState(null);
  const [loadingEnrich, setLoadingEnrich] = useState(false);

  // Reset to front when navigating words
  useEffect(() => { setSide('front'); }, [currentIndex]);

  useEffect(() => {
    if (!word) return;

    if (word.sampleSentence) {
      setEnriched(word);
      return;
    }

    setEnriched(null);
    setLoadingEnrich(true);

    let active = true;
    vocabApi.enrich(word.id)
      .then(data => {
        if (active) {
          setEnriched(data);
          setLoadingEnrich(false);
        }
      })
      .catch(err => {
        console.error("Failed to lazy load enrichment details:", err);
        if (active) {
          setLoadingEnrich(false);
        }
      });

    return () => {
      active = false;
    };
  }, [word]);

  /* Flip animation: scaleX collapse → switch content → expand */
  const flipTo = useCallback((target) => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setSide(target);
      setFlipping(false);
    }, 220);
  }, [flipping]);

  /* Keyboard navigation */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && side === 'front') goNext();
      if (e.key === 'ArrowLeft'  && side === 'front') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, words.length, side]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (dir) => {
    if (isSliding || side !== 'front') return;
    setSlideDir(dir); setIsSliding(true);
    setTimeout(() => {
      setCurrentIndex(prev => dir === 'right' ? prev + 1 : prev - 1);
      setSlideDir(null); setIsSliding(false);
    }, 220);
  };
  const goNext = () => { if (currentIndex < words.length - 1) navigate('right'); };
  const goPrev = () => { if (currentIndex > 0) navigate('left'); };

  const handleSpeak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word.hiragana || word.kanji || '');
    u.lang = 'ja-JP'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  const kanjiCount = word.kanji ? extractKanjiChars(word.kanji).length : 0;
  // Increase maxWidth based on kanji count to allow horizontal expansion
  const maxCardWidth = kanjiCount >= 5 ? 960 : kanjiCount === 4 ? 860 : kanjiCount === 3 ? 740 : 600;

  /* Card transform: slide animation (front/back navigation) + flip */
  const slideAnim = slideDir === 'right'
    ? 'slideOutLeft 0.22s ease forwards'
    : slideDir === 'left'
    ? 'slideOutRight 0.22s ease forwards'
    : 'slideIn 0.28s ease forwards';

  const flipStyle = flipping
    ? { transform: 'scaleX(0)', opacity: 0, transition: 'transform 0.22s ease, opacity 0.22s ease' }
    : { transform: 'scaleX(1)', opacity: 1, transition: 'transform 0.22s ease, opacity 0.22s ease' };

  return (
    /* ── Overlay ──
       position:fixed covers entire viewport.
       overflowY:auto on the overlay (not the card) means the whole
       overlay scrolls on tiny screens while keeping centering intact. */
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        width: '100%',
        minHeight: 'calc(100vh - 80px)', // Account for navbar if any
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 10px',
        animation: 'overlayIn 0.3s ease forwards',
      }}
    >
      <style>{`
        @keyframes overlayIn     { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
        @keyframes slideIn       { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes slideOutLeft  { from{opacity:1;transform:none} to{opacity:0;transform:translateX(-60px)} }
        @keyframes slideOutRight { from{opacity:1;transform:none} to{opacity:0;transform:translateX(60px)} }
        @keyframes kanjiPop      { 0%{opacity:0;transform:scale(0.55)} 65%{transform:scale(1.07)} 100%{opacity:1;transform:scale(1)} }
        @keyframes spin          { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes drawKanjiStroke { from{stroke-dashoffset:600} to{stroke-dashoffset:0} }
      `}</style>

      {/* ── Card ──
          margin:auto ensures it's centered inside the scrollable overlay.
          Both front and back are inside the same card element so the
          flip (scaleX) applies to the whole card. */}
      <div 
        key={currentIndex}
        style={{
        ...flipStyle,
        animation: !flipping && !slideDir ? slideAnim : undefined,
        margin: '0 auto',
        width: '100%',
        maxWidth: side === 'back' ? 580 : maxCardWidth,
        // Remove 94vw/94vh limits because it's no longer a modal, it's a normal page block
        background: 'linear-gradient(145deg, #1b2642, #0f1a2e)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 24,
        padding: side === 'back' ? '36px 30px 28px' : '38px 30px 28px',
        boxShadow: '0 28px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(239,68,68,0.07)',
        boxSizing: 'border-box',
        position: 'relative',
      }}>

        {/* ── Close button ── */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <X size={17} />
        </button>

        {/* ════════════════ FRONT FACE ════════════════ */}
        {side === 'front' && (
          <>
            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 22, flexWrap: 'wrap', paddingRight: 30 }}>
              {words.map((_, i) => (
                <div key={i} onClick={() => !isSliding && setCurrentIndex(i)} style={{
                  width: i === currentIndex ? 20 : 6, height: 6, borderRadius: 3,
                  background: i === currentIndex ? 'var(--accent-color)' : 'rgba(255,255,255,0.14)',
                  transition: 'all 0.3s', cursor: 'pointer', flexShrink: 0,
                }} />
              ))}
            </div>

            {/* Large kanji */}
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div key={`k-${currentIndex}`} style={{
                fontFamily: 'var(--font-jp)',
                fontSize: kanjiCount > 3 ? 'clamp(44px,10vw,72px)' : kanjiCount > 1 ? 'clamp(64px,13vw,94px)' : 'clamp(78px,16vw,128px)',
                fontWeight: 900, lineHeight: 1, marginBottom: 10,
                color: 'var(--text-primary)',
                animation: 'kanjiPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
                animationDelay: '0.04s', opacity: 0, animationFillMode: 'forwards',
                letterSpacing: '-1px', overflowWrap: 'break-word',
              }}>
                {word.kanji || word.hiragana}
              </div>
              {word.kanji && word.hiragana && (
                <div style={{ fontFamily: 'var(--font-jp)', fontSize: '1.2rem', color: 'var(--accent-color)', marginBottom: 6, opacity: 0.9, letterSpacing: '0.06em' }}>
                  {word.hiragana}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                <span className="level-badge">{word.level}</span>
                {word.wordType && (
                  <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {word.wordType}
                  </span>
                )}
                <button onClick={handleSpeak} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, fontSize: '0.75rem',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: 'var(--accent-color)', cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                >
                  <Volume2 size={12} /> 発音
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 18 }} />

            {/* Meaning + stroke boards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', justifyContent: 'center' }}>
              <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: 6 }}>Nghĩa</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--success-color)', lineHeight: 1.45, overflowWrap: 'break-word' }}>{word.meaning}</div>
                </div>
                {word.hanViet && (
                  <div>
                    <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: 6 }}>Hán Việt</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, color: 'rgba(248,250,252,0.75)', overflowWrap: 'break-word' }}>【{word.hanViet}】</div>
                  </div>
                )}

                {/* AI Rich Data Section */}
                {loadingEnrich && (
                  <div style={{ 
                    marginTop: '12px', 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.75rem', 
                    fontStyle: 'italic',
                    padding: '8px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '6px',
                    textAlign: 'left'
                  }}>
                    Đang gọi AI làm giàu dữ liệu ví dụ & Kanji...
                  </div>
                )}

                {enriched && enriched.sampleSentence && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '10px 12px', 
                    width: '100%', 
                    textAlign: 'left', 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--accent-color)',
                    boxSizing: 'border-box'
                  }}>
                    <h4 style={{ color: 'var(--accent-color)', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '600' }}>Câu ví dụ:</h4>
                    <p style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '2px', lineHeight: '1.35' }}>{enriched.sampleSentence}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontStyle: 'italic' }}>{enriched.sampleReading}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--success-color)', fontWeight: '500' }}>{enriched.sampleTranslation}</p>
                  </div>
                )}

                {(() => {
                  let relatedWords = [];
                  if (enriched && enriched.kanjiWords) {
                    try {
                      relatedWords = typeof enriched.kanjiWords === 'string' 
                        ? JSON.parse(enriched.kanjiWords) 
                        : enriched.kanjiWords;
                    } catch (e) {
                      console.error("Failed to parse kanjiWords JSON:", e);
                    }
                  }
                  if (relatedWords && relatedWords.length > 0) {
                    return (
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '10px 12px', 
                        width: '100%', 
                        textAlign: 'left', 
                        backgroundColor: 'rgba(255,255,255,0.03)', 
                        borderRadius: '8px',
                        borderLeft: '3px solid var(--success-color)',
                        boxSizing: 'border-box'
                      }}>
                        <h4 style={{ color: 'var(--success-color)', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '600' }}>Kanji liên quan:</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {relatedWords.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderBottom: idx < relatedWords.length - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none', paddingBottom: idx < relatedWords.length - 1 ? '4px' : '0' }}>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.word} ({item.reading})</span>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.meaning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              {word.kanji && (
                <div style={{ flexShrink: 0 }}>
                  <StrokeOrderDisplay key={`sod-${currentIndex}`} kanji={word.kanji} />
                </div>
              )}
            </div>

            {/* ── Practice flip button ── */}
            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => flipTo('back')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 28px', borderRadius: 50, fontSize: '0.9rem', fontWeight: 700,
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.08))',
                  border: '1.5px solid rgba(239,68,68,0.4)',
                  color: 'var(--accent-color)', cursor: 'pointer',
                  transition: 'all 0.25s',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(239,68,68,0.15))'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(239,68,68,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.08))'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(239,68,68,0.15)'; }}
              >
                <PenLine size={16} /> 練習する
              </button>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, gap: 8 }}>
              <button onClick={goPrev} disabled={currentIndex === 0 || isSliding} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
                background: currentIndex === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: currentIndex === 0 ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s', flexShrink: 0,
              }}
                onMouseEnter={e => { if (currentIndex > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
                onMouseLeave={e => { if (currentIndex > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              >
                <ChevronLeft size={16} /> Trước
              </button>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{currentIndex + 1} / {words.length}</span>
              <button onClick={goNext} disabled={currentIndex === words.length - 1 || isSliding} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600,
                background: currentIndex === words.length - 1 ? 'rgba(255,255,255,0.02)' : 'var(--accent-color)',
                border: 'none',
                color: currentIndex === words.length - 1 ? 'rgba(255,255,255,0.2)' : 'white',
                cursor: currentIndex === words.length - 1 ? 'not-allowed' : 'pointer',
                boxShadow: currentIndex !== words.length - 1 ? '0 4px 12px rgba(239,68,68,0.4)' : 'none',
                transition: 'all 0.2s', flexShrink: 0,
              }}
                onMouseEnter={e => { if (currentIndex < words.length - 1) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(239,68,68,0.5)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = currentIndex !== words.length - 1 ? '0 4px 12px rgba(239,68,68,0.4)' : 'none'; }}
              >
                Tiếp <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.65rem', color: 'rgba(255,255,255,0.16)' }}>
              ← → để chuyển · Esc để đóng · 練習する để viết
            </div>
          </>
        )}

        {/* ════════════════ BACK FACE (writing practice) ════════════════ */}
        {side === 'back' && (
          <KanjiPracticeCanvas
            key={`practice-${currentIndex}`}
            word={word}
            onBack={() => flipTo('front')}
          />
        )}
      </div>
    </div>
  );
};

export default KanjiDetailModal;
