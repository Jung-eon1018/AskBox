import { useState } from 'react';
import LibraryPage from './pages/LibraryPage.jsx';
import ViewerPage from './pages/ViewerPage.jsx';

// 서버 업로드 연결 전까지는 브라우저 메모리에만 파일을 보관한다.
export default function App() {
  const [files, setFiles] = useState([]);
  const [openFileId, setOpenFileId] = useState(null);

  const openFile = files.find((f) => f.id === openFileId);

  function handleAddFiles(fileList) {
    const added = Array.from(fileList).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      kind: file.type === 'application/pdf' ? 'pdf' : 'image',
      file,
    }));
    setFiles((prev) => [...prev, ...added]);
  }

  if (openFile) {
    return <ViewerPage doc={openFile} onBack={() => setOpenFileId(null)} />;
  }

  return <LibraryPage files={files} onAddFiles={handleAddFiles} onOpen={setOpenFileId} />;
}
