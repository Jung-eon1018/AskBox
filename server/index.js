import express from 'express';
import askRouter from './routes/ask.js';
import documentsRouter from './routes/upload.js';

const PORT = process.env.PORT || 3001;

const app = express();

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/ask', askRouter);
app.use('/api/documents', documentsRouter);

// multer 용량 초과 등 라우터 밖 에러도 JSON으로 응답
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`AskBox server → http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) console.warn('⚠ GEMINI_API_KEY가 없어요. server/.env에 추가하세요.');
});
