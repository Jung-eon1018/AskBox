import path from 'node:path';

// 문서·대화를 저장할 폴더. 기본은 server/ 아래(data/, uploads/)이고,
// 데스크톱 앱은 ASKBOX_DATA_DIR을 사용자 데이터 폴더로 지정한다. (설치 폴더는 쓰기가 안 되므로)
export const DATA_ROOT = process.env.ASKBOX_DATA_DIR || import.meta.dirname;
export const DATA_DIR = path.join(DATA_ROOT, 'data');
export const UPLOAD_DIR = path.join(DATA_ROOT, 'uploads');
