import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// 업로드한 파일은 server/uploads/, 목록은 server/data/documents.json 에 저장한다.
const ROOT = path.dirname(import.meta.dirname);
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DB_FILE = path.join(ROOT, 'data', 'documents.json');

const TYPES = {
  'application/pdf': { ext: '.pdf', kind: 'pdf' },
  'image/png': { ext: '.png', kind: 'image' },
  'image/jpeg': { ext: '.jpg', kind: 'image' },
};

await fs.mkdir(UPLOAD_DIR, { recursive: true });
await fs.mkdir(path.dirname(DB_FILE), { recursive: true });

async function readDocs() {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeDocs(docs) {
  await fs.writeFile(DB_FILE, JSON.stringify(docs, null, 2));
}

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + TYPES[file.mimetype].ext),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  defParamCharset: 'utf8', // 한글 파일 이름이 깨지지 않도록
  fileFilter: (req, file, cb) => cb(null, file.mimetype in TYPES),
});

const router = Router();

// GET /api/documents → 목록 (최근 추가한 것이 위)
router.get('/', async (req, res) => {
  res.json(await readDocs());
});

// POST /api/documents (multipart: files[]) → 추가된 문서들
router.post('/', upload.array('files'), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'PDF, PNG, JPG 파일만 올릴 수 있어요.' });

  const added = req.files.map((f) => ({
    id: path.parse(f.filename).name,
    name: f.originalname,
    size: f.size,
    kind: TYPES[f.mimetype].kind,
    fileName: f.filename,
    createdAt: new Date().toISOString(),
  }));
  await writeDocs([...added, ...(await readDocs())]);
  res.status(201).json(added);
});

// GET /api/documents/:id/file → 원본 파일
router.get('/:id/file', async (req, res) => {
  const doc = (await readDocs()).find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없어요.' });
  res.sendFile(path.join(UPLOAD_DIR, doc.fileName));
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  const docs = await readDocs();
  const doc = docs.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없어요.' });
  await writeDocs(docs.filter((d) => d.id !== doc.id));
  await fs.rm(path.join(UPLOAD_DIR, doc.fileName), { force: true });
  res.status(204).end();
});

export default router;
