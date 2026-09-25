import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR, findDoc, readDocs, writeDocs } from '../services/documents.js';
import { deleteChat, imagePath, loadChat } from '../services/chats.js';

const TYPES = {
  'application/pdf': { ext: '.pdf', kind: 'pdf' },
  'image/png': { ext: '.png', kind: 'image' },
  'image/jpeg': { ext: '.jpg', kind: 'image' },
};

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
  const doc = await findDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없어요.' });
  res.sendFile(path.join(UPLOAD_DIR, doc.fileName));
});

// GET /api/documents/:id/chat → 이 문서의 대화 기록
router.get('/:id/chat', async (req, res) => {
  const doc = await findDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없어요.' });
  const chat = await loadChat(doc.id);
  res.json(
    chat.map(({ role, text, image, pageNumber }) => ({
      role,
      text,
      pageNumber,
      imageUrl: image ? `/api/documents/${doc.id}/chat/images/${image}` : null,
    })),
  );
});

// GET /api/documents/:id/chat/images/:name → 대화에 첨부된 선택 영역 이미지
router.get('/:id/chat/images/:name', (req, res) => {
  const file = imagePath(req.params.name);
  if (!file) return res.status(404).end();
  res.sendFile(file);
});

// DELETE /api/documents/:id → 파일과 대화 기록까지 삭제
router.delete('/:id', async (req, res) => {
  const docs = await readDocs();
  const doc = docs.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없어요.' });
  await writeDocs(docs.filter((d) => d.id !== doc.id));
  await fs.rm(path.join(UPLOAD_DIR, doc.fileName), { force: true });
  await deleteChat(doc.id);
  res.status(204).end();
});

export default router;
