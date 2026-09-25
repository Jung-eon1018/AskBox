import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import askRouter from './routes/ask.js';
import documentsRouter from './routes/upload.js';

const CLIENT_DIST = path.join(import.meta.dirname, '..', 'client', 'dist');

export function createApp() {
  const app = express();

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/ask', askRouter);
  app.use('/api/documents', documentsRouter);

  // 빌드된 화면(client/dist)이 있으면 서버 하나로 화면까지 제공한다 → http://localhost:3001 만 열면 된다
  // (개발 중에는 npm run dev의 Vite 서버를 쓰므로 필요 없음)
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST));
    app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
  }

  // multer 용량 초과 등 라우터 밖 에러도 JSON으로 응답
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 400).json({ error: err.message });
  });

  return app;
}

// 서버를 켜고, 실제로 열린 http.Server를 돌려준다 (포트 충돌 등은 reject)
export function startServer({ port, host } = {}) {
  return new Promise((resolve, reject) => {
    const server = createApp().listen(port, host);
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}
