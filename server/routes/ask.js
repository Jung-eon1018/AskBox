import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import { askAI } from '../services/ai.js';
import { findDoc } from '../services/documents.js';
import { appendMessages, imageMimeType, imagePath, loadChat, saveImage } from '../services/chats.js';

const MAX_HISTORY = 20; // 너무 긴 대화는 최근 것만 보낸다

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/png', 'image/jpeg'].includes(file.mimetype)),
});

const router = Router();

// POST /api/ask  (multipart: documentId, question, pageNumber?, image?)
// 이전 대화와 마지막 선택 이미지는 서버에 저장된 기록에서 가져온다.
router.post('/', upload.single('image'), async (req, res) => {
  const question = req.body.question?.trim();
  if (!question) return res.status(400).json({ error: '질문이 비어 있어요.' });

  const doc = await findDoc(req.body.documentId);
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없어요.' });

  try {
    const chat = await loadChat(doc.id);

    // 새로 선택한 영역이 없으면 이 대화에서 마지막으로 선택했던 영역을 다시 보여준다
    let image = req.file ? { data: req.file.buffer, mimeType: req.file.mimetype } : null;
    let pageNumber = Number(req.body.pageNumber) || null;
    if (!image) {
      const last = chat.findLast((m) => m.image && imagePath(m.image));
      if (last) {
        image = { data: await fs.readFile(imagePath(last.image)), mimeType: imageMimeType(last.image) };
        pageNumber = last.pageNumber ?? null;
      }
    }

    const answer = await askAI({
      question,
      history: chat.slice(-MAX_HISTORY).map(({ role, text }) => ({ role, text })),
      image,
      documentName: doc.name,
      pageNumber,
    });

    // 답변을 받은 경우에만 기록한다 (실패한 질문은 다시 보내면 되므로 저장하지 않음)
    const now = new Date().toISOString();
    const savedImage = req.file ? await saveImage(req.file.buffer, req.file.mimetype) : undefined;
    await appendMessages(doc.id, [
      { role: 'user', text: question, image: savedImage, pageNumber: savedImage ? pageNumber : undefined, createdAt: now },
      { role: 'assistant', text: answer, createdAt: now },
    ]);

    res.json({ answer });
  } catch (err) {
    console.error('[ask]', err);
    res.status(502).json({ error: err.message || 'AI 호출에 실패했어요.' });
  }
});

export default router;
