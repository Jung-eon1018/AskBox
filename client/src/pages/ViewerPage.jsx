import { useEffect, useState } from 'react';
import DocumentViewer from '../components/DocumentViewer.jsx';
import Toolbar from '../components/Toolbar.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import { cropCanvas } from '../utils/crop.js';

export default function ViewerPage({ doc, onBack }) {
  const [selectMode, setSelectMode] = useState(false);
  // { pageNumber, rect, canvas } — rect는 화면(CSS px) 기준, 페이지 왼쪽 위가 원점
  const [selection, setSelection] = useState(null);
  // { url, blob, pageNumber } — ✓로 확정된 crop 이미지
  const [preview, setPreview] = useState(null);

  // 미리보기가 바뀌거나 화면을 떠날 때 이전 object URL 해제
  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview]);

  async function handleConfirm() {
    if (!selection) return;
    const blob = await cropCanvas(selection.canvas, selection.rect);
    setPreview({ url: URL.createObjectURL(blob), blob, pageNumber: selection.pageNumber });
    setSelection(null);
    setSelectMode(false);
  }

  function handleCancel() {
    setSelection(null);
    setSelectMode(false);
  }

  return (
    <div className="viewer">
      <section className="viewer-document">
        <header className="viewer-header">
          <button className="back-button" onClick={onBack}>← Library</button>
          <span className="viewer-title">{doc.name}</span>
        </header>

        <DocumentViewer
          doc={doc}
          selectMode={selectMode}
          selection={selection}
          onSelect={setSelection}
        />

        <Toolbar
          selectMode={selectMode}
          hasSelection={selection !== null}
          onToggleSelect={() => setSelectMode((on) => !on)}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </section>

      <ChatPanel doc={doc} preview={preview} onClearPreview={() => setPreview(null)} />
    </div>
  );
}
