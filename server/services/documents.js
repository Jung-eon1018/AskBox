import fs from 'node:fs/promises';
import path from 'node:path';

import { DATA_DIR, UPLOAD_DIR } from '../paths.js';

export { UPLOAD_DIR };

// 업로드한 파일은 uploads/, 목록은 data/documents.json 에 저장한다. (위치는 paths.js 참고)
const DB_FILE = path.join(DATA_DIR, 'documents.json');

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
