function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileCard({ file, onOpen }) {
  return (
    <button className="file-card" onClick={onOpen}>
      <span className={`file-badge file-badge-${file.kind}`}>{file.kind === 'pdf' ? 'PDF' : 'IMG'}</span>
      <span className="file-name">{file.name}</span>
      <span className="file-size">{formatSize(file.size)}</span>
    </button>
  );
}
