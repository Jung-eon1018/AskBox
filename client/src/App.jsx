import { useCallback, useState } from 'react';
import LibraryPage from './pages/LibraryPage.jsx';
import ViewerPage from './pages/ViewerPage.jsx';

// 서버 업로드 연결 전까지는 브라우저 메모리에만 파일을 보관한다.
export default function App() {
  const [files, setFiles] = useState([]);
  const [openFileId, setOpenFileId] = useState(null);
  // 문서별 대화 기록 { [fileId]: messages[] } — Viewer를 나갔다 와도 유지된다
  const [chats, setChats] = useState({});

  const openFile = files.find((f) => f.id === openFileId);

  // 답변을 기다리는 중에 Library로 나가도 답이 해당 문서 대화에 저장되도록 id로 묶는다
  const updateMessages = useCallback((fileId, updater) => {
    setChats((prev) => ({ ...prev, [fileId]: updater(prev[fileId] ?? []) }));
  }, []);

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
    return (
      <ViewerPage
        doc={openFile}
        messages={chats[openFile.id] ?? []}
        onMessagesChange={(updater) => updateMessages(openFile.id, updater)}
        onBack={() => setOpenFileId(null)}
      />
    );
  }

  return <LibraryPage files={files} onAddFiles={handleAddFiles} onOpen={setOpenFileId} />;
}
