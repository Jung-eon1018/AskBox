import { useRef } from 'react';
import FileCard from '../components/FileCard.jsx';

const ACCEPT = 'application/pdf,image/png,image/jpeg';

export default function LibraryPage({ files, onAddFiles, onOpen }) {
  const inputRef = useRef(null);

  function handleChange(e) {
    if (e.target.files.length > 0) onAddFiles(e.target.files);
    e.target.value = ''; // 같은 파일을 다시 골라도 onChange가 발생하도록
  }

  return (
    <div className="library">
      <header className="library-header">
        <h1>AskBox</h1>
        <p>궁금한 내용을 선택하고 질문하세요!</p>
      </header>

      <section className="library-panel">
        <div className="library-list">
          {files.length === 0 ? (
            <p className="library-empty">아직 파일이 없어요. 아래 버튼으로 PDF나 이미지를 추가하세요.</p>
          ) : (
            files.map((f) => <FileCard key={f.id} file={f} onOpen={() => onOpen(f.id)} />)
          )}
        </div>

        <div className="library-footer">
          <button className="upload-button" onClick={() => inputRef.current.click()} aria-label="파일 추가">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={handleChange} />
        </div>
      </section>
    </div>
  );
}
