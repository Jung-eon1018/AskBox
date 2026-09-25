import { app, BrowserWindow, dialog, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

// 개발: `electron . --dev-url=http://localhost:5173` → Vite 화면만 띄운다 (서버는 npm run server로 따로 켠다)
// 배포: Express 서버를 이 프로세스 안에서 켜고, 서버가 제공하는 client/dist 화면을 띄운다
const DEV_URL = process.argv.find((arg) => arg.startsWith('--dev-url='))?.slice('--dev-url='.length);

// 읽던 위치를 localStorage(주소별로 저장됨)에 두므로 포트는 되도록 고정한다
const PORT = 38457;
const HOST = '127.0.0.1';

app.setName('AskBox'); // 사용자 데이터 폴더: %APPDATA%\AskBox

let mainWindow = null;
let server = null;

// 앱을 두 번 켜면 새로 띄우지 않고 기존 창을 앞으로 가져온다
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(main);
}

async function main() {
  try {
    const url = DEV_URL ?? (await startLocalServer());
    mainWindow = createWindow(url);
    if (!DEV_URL && !process.env.FACTCHAT_API_KEY) await warnMissingKey();
  } catch (err) {
    dialog.showErrorBox('AskBox를 시작하지 못했어요', err.stack || String(err));
    app.quit();
  }
}

// API 키는 사용자 데이터 폴더의 .env에서 읽는다 (exe 안에 키를 넣지 않는다)
// (loadEnvFile은 이미 있는 값을 덮어쓰지 않으므로 먼저 읽은 파일이 우선한다)
function loadEnv() {
  // 설치하지 않고 저장소에서 바로 실행할 때는 기존 server/.env를 먼저 쓴다
  const devEnvFile = path.join(app.getAppPath(), 'server', '.env');
  if (!app.isPackaged && fs.existsSync(devEnvFile)) process.loadEnvFile(devEnvFile);

  const envFile = path.join(app.getPath('userData'), '.env');
  if (!fs.existsSync(envFile)) {
    fs.mkdirSync(path.dirname(envFile), { recursive: true });
    fs.writeFileSync(envFile, 'FACTCHAT_API_KEY=\n# GATEWAY_MODEL=gpt-5.6-luna\n');
  }
  process.loadEnvFile(envFile);
  process.env.ASKBOX_ENV_FILE = envFile;
}

async function startLocalServer() {
  loadEnv();
  // 문서·대화는 설치 폴더가 아니라 사용자 데이터 폴더에 저장한다
  process.env.ASKBOX_DATA_DIR = app.getPath('userData');

  // 위 환경변수를 설정한 뒤에 불러와야 저장 위치가 반영된다
  const { startServer } = await import('../server/app.js');
  try {
    server = await startServer({ port: PORT, host: HOST });
  } catch (err) {
    if (err.code !== 'EADDRINUSE') throw err;
    server = await startServer({ port: 0, host: HOST }); // 다른 프로그램이 쓰고 있으면 빈 포트로
  }
  return `http://${HOST}:${server.address().port}`;
}

function createWindow(appUrl) {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'AskBox',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => (mainWindow = null));

  // 답변 속 링크는 앱 창이 아니라 기본 브라우저로 연다
  const openExternal = (target) => {
    if (/^https?:\/\//.test(target)) shell.openExternal(target);
  };
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin === new URL(appUrl).origin) return;
    event.preventDefault();
    openExternal(url);
  });

  win.loadURL(appUrl);
  return win;
}

async function warnMissingKey() {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'API 키가 없어요',
    message: 'AI 질문을 하려면 FACTCHAT_API_KEY가 필요해요.',
    detail: `아래 파일에 키를 넣고 앱을 다시 시작하세요.\n${process.env.ASKBOX_ENV_FILE}`,
    buttons: ['파일 위치 열기', '나중에'],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) shell.showItemInFolder(process.env.ASKBOX_ENV_FILE);
}

// 창을 모두 닫으면 앱과 서버를 함께 끈다
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  server?.closeAllConnections();
  server?.close();
});
