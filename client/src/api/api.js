// 프론트는 AI API를 직접 부르지 않고 항상 우리 서버(/api)를 거친다. (API 키 보호)

async function request(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error('서버에 연결할 수 없어요. 서버(npm run server)가 켜져 있는지 확인하세요.');
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `서버에 연결할 수 없어요 (${res.status})`);
  return body;
}

// ───────── 문서 (Library) ─────────

export function listDocuments() {
  return request('/api/documents');
}

export function uploadDocuments(files) {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  return request('/api/documents', { method: 'POST', body: form });
}

export function deleteDocument(id) {
  return request(`/api/documents/${id}`, { method: 'DELETE' });
}

export function documentFileUrl(id) {
  return `/api/documents/${id}/file`;
}

// ───────── 질문 ─────────

export async function askQuestion({ documentName, pageNumber, image, question, history }) {
  const form = new FormData();
  form.append('documentName', documentName);
  form.append('question', question);
  form.append('history', JSON.stringify(history));
  if (pageNumber) form.append('pageNumber', String(pageNumber));
  if (image) form.append('image', image, 'selection.png');

  return request('/api/ask', { method: 'POST', body: form }); // { answer }
}
