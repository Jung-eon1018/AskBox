import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// 문서별 대화 기록: server/data/chats/<문서 id>.json
// 대화에 첨부된 선택 영역 이미지: server/data/chat-images/<이미지 id>.png
const DATA_DIR = path.join(path.dirname(import.meta.dirname), 'data');
const CHAT_DIR = path.join(DATA_DIR, 'chats');
const IMAGE_DIR = path.join(DATA_DIR, 'chat-images');

const ID_PATTERN = /^[0-9a-f-]{36}$/; // 경로 조작(../) 방지: uuid 형식만 허용
const IMAGE_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg' };

await fs.mkdir(CHAT_DIR, { recursive: true });
await fs.mkdir(IMAGE_DIR, { recursive: true });

function chatFile(docId) {
  if (!ID_PATTERN.test(docId)) throw new Error('잘못된 문서 id예요.');
  return path.join(CHAT_DIR, `${docId}.json`);
}

/**
 * @returns {Promise<{ role: 'user' | 'assistant', text: string, image?: string, pageNumber?: number, createdAt: string }[]>}
 */
export async function loadChat(docId) {
  try {
    return JSON.parse(await fs.readFile(chatFile(docId), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function appendMessages(docId, messages) {
  const chat = await loadChat(docId);
  await fs.writeFile(chatFile(docId), JSON.stringify([...chat, ...messages], null, 2));
}

export async function deleteChat(docId) {
  const chat = await loadChat(docId);
  await Promise.all(chat.filter((m) => m.image).map((m) => fs.rm(imagePath(m.image), { force: true })));
  await fs.rm(chatFile(docId), { force: true });
}

// 이미지 파일 이름(id + 확장자)을 돌려준다
export async function saveImage(buffer, mimeType) {
  const name = crypto.randomUUID() + (IMAGE_EXT[mimeType] ?? '.png');
  await fs.writeFile(path.join(IMAGE_DIR, name), buffer);
  return name;
}

export function imagePath(name) {
  const { name: id, ext } = path.parse(name);
  if (!ID_PATTERN.test(id) || !Object.values(IMAGE_EXT).includes(ext)) return null;
  return path.join(IMAGE_DIR, name);
}

export function imageMimeType(name) {
  return path.extname(name) === '.jpg' ? 'image/jpeg' : 'image/png';
}
