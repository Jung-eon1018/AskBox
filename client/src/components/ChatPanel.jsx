import { useEffect, useRef, useState } from 'react';
import { askQuestion } from '../api/api.js';
import Markdown from './Markdown.jsx';

// messages: { role: 'user' | 'assistant', text, imageUrl?, imageBlob?, pageNumber?, error? }[]
// 대화 기록은 App이 문서별로 보관하므로 여기서는 항상 함수형 업데이트(onMessagesChange(prev => ...))만 쓴다.
export default function ChatPanel({ doc, messages, onMessagesChange: setMessages, preview, onClearPreview }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    const userMessage = {
      role: 'user',
      text: question,
      // 미리보기 URL은 곧 해제되므로 대화 기록용 URL을 따로 만든다
      imageUrl: preview ? URL.createObjectURL(preview.blob) : null,
      imageBlob: preview?.blob,
      pageNumber: preview?.pageNumber,
    };
    const history = messages.filter((m) => !m.error).map(({ role, text }) => ({ role, text }));
    // 새로 선택하지 않은 후속 질문은 직전에 선택한 영역을 계속 보고 답하게 한다
    const lastImageMessage = messages.findLast((m) => m.imageBlob);
    const image = preview?.blob ?? lastImageMessage?.imageBlob;
    const pageNumber = preview?.pageNumber ?? lastImageMessage?.pageNumber;

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    onClearPreview();

    try {
      const { answer } = await askQuestion({
        documentName: doc.name,
        pageNumber,
        image,
        question,
        history,
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `답변을 받지 못했어요. (${err.message})`, error: true },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    // Enter = 전송, Shift+Enter = 줄바꿈 (한글 조합 중에는 무시)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) handleSend(e);
  }

  return (
    <aside className="chat-panel">
      <div className="chat-preview">
        {preview ? (
          <>
            <img src={preview.url} alt="선택한 영역" />
            <span className="chat-preview-page">p.{preview.pageNumber}</span>
            <button className="chat-preview-clear" onClick={onClearPreview} aria-label="선택 영역 지우기">✕</button>
          </>
        ) : (
          <p className="chat-preview-empty">✂ 버튼으로 문서에서 궁금한 영역을 선택하세요</p>
        )}
      </div>

      <div ref={listRef} className="chat-messages">
        {messages.length === 0 && <p className="chat-empty">선택한 영역이나 문서에 대해 무엇이든 물어보세요.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-message chat-${m.role}${m.error ? ' is-error' : ''}`}>
            {m.imageUrl && <img className="chat-message-image" src={m.imageUrl} alt={`p.${m.pageNumber} 선택 영역`} />}
            {m.role === 'assistant' && !m.error ? <Markdown>{m.text}</Markdown> : <p>{m.text}</p>}
          </div>
        ))}
        {sending && <div className="chat-message chat-assistant is-pending"><p>생각하는 중…</p></div>}
      </div>

      <form className="chat-input" onSubmit={handleSend}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={preview ? '선택한 영역에 대해 질문하세요' : '질문을 입력하세요'}
          rows={2}
        />
        <button type="submit" className="send-button" disabled={!input.trim() || sending} aria-label="보내기">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </aside>
  );
}
