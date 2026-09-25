import { useCallback, useEffect, useState } from 'react';
import LibraryPage from './pages/LibraryPage.jsx';
import ViewerPage from './pages/ViewerPage.jsx';
import { deleteDocument, getChat, listDocuments, uploadDocuments } from './api/api.js';

// 파일과 대화 기록은 서버(server/uploads, server/data)에 저장되어 새로고침해도 남는다.
export default function App() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: null, uploading: false });
  const [openFileId, setOpenFileId] = useState(null);
  // 문서별 대화 기록 캐시 { [fileId]: messages[] } — 원본은 서버에 있고, 여기는 이번 세션에 불러온 것
  const [chats, setChats] = useState({});

  const openFile = files.find((f) => f.id === openFileId);

  const loadFiles = useCallback(async () => {
    setStatus((s) => ({ ...s, loading: true, error: null }));
    try {
      setFiles(await listDocuments());
      setStatus((s) => ({ ...s, loading: false }));
    } catch (err) {
      setStatus((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // 문서를 처음 열 때 서버에 저장된 대화 기록을 불러온다 (이번 세션에 이미 불러왔으면 그대로 사용)
  const chatLoaded = openFileId !== null && openFileId in chats;
  useEffect(() => {
    if (openFileId === null || chatLoaded) return;
    getChat(openFileId)
      .then((messages) => setChats((prev) => ({ ...prev, [openFileId]: messages })))
      .catch((err) =>
        setChats((prev) => ({
          ...prev,
          [openFileId]: [{ role: 'assistant', text: `대화 기록을 불러오지 못했어요. (${err.message})`, error: true }],
        })),
      );
  }, [openFileId, chatLoaded]);

  // 답변을 기다리는 중에 Library로 나가도 답이 해당 문서 대화에 저장되도록 id로 묶는다
  const updateMessages = useCallback((fileId, updater) => {
    setChats((prev) => ({ ...prev, [fileId]: updater(prev[fileId] ?? []) }));
  }, []);

  async function handleAddFiles(fileList) {
    setStatus((s) => ({ ...s, uploading: true, error: null }));
    try {
      const added = await uploadDocuments(Array.from(fileList));
      setFiles((prev) => [...added, ...prev]);
    } catch (err) {
      setStatus((s) => ({ ...s, error: err.message }));
    } finally {
      setStatus((s) => ({ ...s, uploading: false }));
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`'${file.name}'을(를) 삭제할까요?`)) return;
    try {
      await deleteDocument(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setChats(({ [file.id]: _, ...rest }) => rest);
    } catch (err) {
      setStatus((s) => ({ ...s, error: err.message }));
    }
  }

  if (openFile) {
    return (
      <ViewerPage
        doc={openFile}
        messages={chats[openFile.id] ?? null}
        onMessagesChange={(updater) => updateMessages(openFile.id, updater)}
        onBack={() => setOpenFileId(null)}
      />
    );
  }

  return (
    <LibraryPage
      files={files}
      status={status}
      onRetry={loadFiles}
      onAddFiles={handleAddFiles}
      onOpen={setOpenFileId}
      onDelete={handleDelete}
    />
  );
}
