function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileCard({ file, onOpen, onDelete }) {
  return (
    <div className="file-card">
      <button className="file-open" onClick={onOpen}>
        <span className={`file-badge file-badge-${file.kind}`}>{file.kind === 'pdf' ? 'PDF' : 'IMG'}</span>
        <span className="file-name">{file.name}</span>
        <span className="file-size">{formatSize(file.size)}</span>
      </button>
      <button className="file-delete" onClick={onDelete} aria-label={`${file.name} 삭제`} title="삭제">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
