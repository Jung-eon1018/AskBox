import fs from 'node:fs/promises';
import path from 'node:path';

// 업로드한 파일은 server/uploads/, 목록은 server/data/documents.json 에 저장한다.
const ROOT = path.dirname(import.meta.dirname);
export const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DB_FILE = path.join(ROOT, 'data', 'documents.json');

await fs.mkdir(UPLOAD_DIR, { recursive: true });
await fs.mkdir(path.dirname(DB_FILE), { recursive: true });

export async function readDocs() {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function writeDocs(docs) {
  await fs.writeFile(DB_FILE, JSON.stringify(docs, null, 2));
}

export async function findDoc(id) {
  return (await readDocs()).find((d) => d.id === id) ?? null;
}
