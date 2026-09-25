// 프론트는 AI API를 직접 부르지 않고 항상 우리 서버(/api)를 거친다. (API 키 보호)

export async function askQuestion({ documentName, pageNumber, image, question, history }) {
  const form = new FormData();
  form.append('documentName', documentName);
  form.append('question', question);
  form.append('history', JSON.stringify(history));
  if (pageNumber) form.append('pageNumber', String(pageNumber));
  if (image) form.append('image', image, 'selection.png');

  const res = await fetch('/api/ask', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `서버에 연결할 수 없어요 (${res.status})`);
  return body; // { answer }
}
