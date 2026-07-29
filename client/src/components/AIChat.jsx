import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Sparkles, ImageIcon } from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

async function sendChat(messages) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || '서버 오류');
  }
  return res.json(); // { reply, imageUrl }
}

const STARTERS = [
  '소년만화 스타일 전사 캐릭터 그려줘',
  '밤하늘 아래 성 풍경 그려줘',
  '귀여운 고양이 마법사 그려줘',
  '어떻게 배경을 더 잘 그릴 수 있어?',
];

export default function AIChat({ onImageGenerated, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 어떤 장면을 그려드릴까요? 원하는 그림을 설명해주세요 😊\n그리기 관련 질문도 괜찮아요!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Send only role+content to server (no imageUrl in history)
      const history = [...messages, userMsg]
        .filter(m => m.role !== 'system')
        .map(({ role, content }) => ({ role, content }));

      const { reply, imageUrl } = await sendChat(history);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        imageUrl: imageUrl || null,
      }]);

      if (imageUrl) onImageGenerated?.(imageUrl);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${err.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, messages, onImageGenerated]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px', left: '80px',
      width: '320px', height: '480px',
      background: '#2a2a2a',
      border: '1px solid #555',
      borderRadius: '12px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column',
      zIndex: 150,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 14px', borderBottom: '1px solid #3a3a3a',
        background: '#333', flexShrink: 0,
      }}>
        <Sparkles size={14} color="#f97316" />
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', flex: 1 }}>AI 그림 어시스턴트</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px' }}>
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} onImageGenerated={onImageGenerated} />
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', alignSelf: 'flex-start' }}>
            {[0,1,2].map(n => (
              <div key={n} style={{
                width: '6px', height: '6px', borderRadius: '50%', background: '#666',
                animation: `bounce 1s ${n * 0.15}s infinite`,
              }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starters (only when no user messages yet) */}
      {messages.length === 1 && (
        <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: '5px', flexShrink: 0 }}>
          {STARTERS.map((s, i) => (
            <button key={i} onClick={() => send(s)}
              style={{
                fontSize: '10px', color: '#ccc', background: '#3a3a3a',
                border: '1px solid #555', borderRadius: '12px',
                padding: '4px 8px', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4a4a4a'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#3a3a3a'; e.currentTarget.style.color = '#ccc'; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '6px',
        padding: '10px', borderTop: '1px solid #3a3a3a', flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="무엇을 그려드릴까요?"
          rows={1}
          disabled={loading}
          style={{
            flex: 1, background: '#1a1a1a', border: '1px solid #555',
            borderRadius: '8px', color: '#eee', fontSize: '12px',
            padding: '8px 10px', resize: 'none', outline: 'none',
            fontFamily: 'inherit', lineHeight: '1.4',
            maxHeight: '80px', overflowY: 'auto',
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          style={{
            width: '34px', height: '34px', borderRadius: '8px',
            background: input.trim() && !loading ? '#f97316' : '#3a3a3a',
            border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          <Send size={14} color={input.trim() && !loading ? '#fff' : '#666'} />
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

function ChatBubble({ msg, onImageGenerated }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: '4px' }}>
      <div style={{
        maxWidth: '85%', padding: '8px 11px',
        background: isUser ? '#f97316' : '#3a3a3a',
        color: '#fff', fontSize: '12px', lineHeight: '1.5',
        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
      {msg.imageUrl && (
        <div style={{
          maxWidth: '85%', borderRadius: '8px', overflow: 'hidden',
          border: '1px solid #555', background: '#1a1a1a',
        }}>
          <img src={msg.imageUrl} alt="AI 생성 이미지" style={{ width: '100%', display: 'block' }} />
          <div style={{ display: 'flex', gap: '6px', padding: '6px 8px' }}>
            <a href={msg.imageUrl} download="ai-generated.png"
              style={{
                flex: 1, textAlign: 'center', fontSize: '10px', color: '#aaa',
                background: '#2a2a2a', border: '1px solid #444',
                borderRadius: '4px', padding: '4px', textDecoration: 'none',
              }}
            >
              저장
            </a>
            <button
              onClick={() => onImageGenerated?.(msg.imageUrl)}
              style={{
                flex: 1, fontSize: '10px', color: '#fff',
                background: '#f97316', border: 'none',
                borderRadius: '4px', padding: '4px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
              }}
            >
              <ImageIcon size={10} /> 결과 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
