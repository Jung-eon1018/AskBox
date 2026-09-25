// 프론트는 AI API를 직접 부르지 않고 항상 우리 서버(/api)를 거친다. (API 키 보호)

export async function askQuestion({ documentName, pageNumber, image, question, history }) {
  const form = new FormData();
  form.append('documentName', documentName);
  form.append('question', question);
  form.append('history', JSON.stringify(history));
  if (pageNumber) form.append('pageNumber', String(pageNumber));
  if (image) form.append('image', image, 'selection.png');

  const res = await fetch('/api/ask', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`서버 응답 오류 (${res.status})`);
  return res.json(); // { answer }
}
