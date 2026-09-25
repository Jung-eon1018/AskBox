import { useRef, useState } from 'react';

const MIN_SIZE = 6; // 이보다 작은 드래그는 클릭으로 보고 무시

// 페이지 위에 투명하게 덮여서 캡처 도구처럼 네모 영역을 선택한다.
// rect 좌표는 이 overlay(=페이지)의 왼쪽 위 기준 CSS px.
export default function SelectionOverlay({ active, rect, onChange }) {
  const overlayRef = useRef(null);
  const startRef = useRef(null);
  const [draft, setDraft] = useState(null); // 드래그 중인 네모

  function pointFrom(e) {
    const box = overlayRef.current.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - box.left, 0), box.width),
      y: Math.min(Math.max(e.clientY - box.top, 0), box.height),
    };
  }

  function handlePointerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId); // 페이지 밖으로 나가도 드래그 유지
    startRef.current = pointFrom(e);
    setDraft({ ...startRef.current, width: 0, height: 0 });
    onChange(null); // 다른 페이지에 있던 선택은 지운다
  }

  function handlePointerMove(e) {
    if (!startRef.current) return;
    const start = startRef.current;
    const p = pointFrom(e);
    setDraft({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      width: Math.abs(p.x - start.x),
      height: Math.abs(p.y - start.y),
    });
  }

  function handlePointerUp() {
    if (!startRef.current) return;
    startRef.current = null;
    if (draft && draft.width >= MIN_SIZE && draft.height >= MIN_SIZE) onChange(draft);
    setDraft(null);
  }

  const shown = draft ?? rect;

  return (
    <div
      ref={overlayRef}
      className={`selection-overlay${active ? ' is-active' : ''}`}
      onPointerDown={active ? handlePointerDown : undefined}
      onPointerMove={active ? handlePointerMove : undefined}
      onPointerUp={active ? handlePointerUp : undefined}
      onPointerCancel={active ? handlePointerUp : undefined}
    >
      {shown && (
        <div
          className="selection-rect"
          style={{ left: shown.x, top: shown.y, width: shown.width, height: shown.height }}
        />
      )}
    </div>
  );
}
