import { startServer } from './app.js';

const PORT = process.env.PORT || 3001;

await startServer({ port: PORT });
console.log(`AskBox server → http://localhost:${PORT}`);
if (!process.env.FACTCHAT_API_KEY) console.warn('⚠ FACTCHAT_API_KEY가 없어요. server/.env에 추가하세요.');
