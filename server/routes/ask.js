import { Router } from 'express';
import multer from 'multer';
import { askAI } from '../services/ai.js';

const MAX_HISTORY = 20; // 너무 긴 대화는 최근 것만 보낸다

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ['image/png', 'image/jpeg'].includes(file.mimetype)),
});

const router = Router();

// POST /api/ask  (multipart: question, history, documentName, pageNumber?, image?)
router.post('/', upload.single('image'), async (req, res) => {
  const question = req.body.question?.trim();
  if (!question) return res.status(400).json({ error: '질문이 비어 있어요.' });

  let history = [];
  try {
    history = JSON.parse(req.body.history || '[]').slice(-MAX_HISTORY);
  } catch {
    return res.status(400).json({ error: 'history 형식이 잘못됐어요.' });
  }

  try {
    const answer = await askAI({
      question,
      history,
      image: req.file ? { data: req.file.buffer, mimeType: req.file.mimetype } : null,
      documentName: req.body.documentName || '(이름 없음)',
      pageNumber: Number(req.body.pageNumber) || null,
    });
    res.json({ answer });
  } catch (err) {
    console.error('[ask]', err);
    res.status(502).json({ error: err.message || 'AI 호출에 실패했어요.' });
  }
});

export default router;
