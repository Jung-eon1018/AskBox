const icon = {
  crop: 'M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14',
  check: 'M5 12l5 5L19 7',
  close: 'M6 6l12 12M18 6L6 18',
};

function ToolButton({ path, label, ...props }) {
  return (
    <button className="tool-button" aria-label={label} title={label} {...props}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// 문서 왼쪽 아래에 떠 있는 툴바: [선택 모드] [확인] [취소]
export default function Toolbar({ selectMode, hasSelection, onToggleSelect, onConfirm, onCancel }) {
  return (
    <div className="toolbar">
      <ToolButton
        path={icon.crop}
        label="영역 선택"
        className={`tool-button${selectMode ? ' is-on' : ''}`}
        aria-pressed={selectMode}
        onClick={onToggleSelect}
      />
      <ToolButton path={icon.check} label="선택 확인" disabled={!hasSelection} onClick={onConfirm} />
      <ToolButton path={icon.close} label="선택 취소" disabled={!selectMode && !hasSelection} onClick={onCancel} />
    </div>
  );
}
