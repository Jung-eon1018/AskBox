import { GoogleGenAI } from '@google/genai';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// 기본 모델이 붐빌 때(503/429) 대신 쓸 모델
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.7-flash';
const OVERLOADED = [429, 500, 503, 504];

const SYSTEM_INSTRUCTION = `너는 AskBox의 학습 도우미야.
사용자는 강의자료, 논문, 문제집 같은 문서를 보다가 궁금한 영역을 네모로 잘라서 질문한다.
- 첨부된 이미지는 사용자가 문서에서 가장 최근에 선택한 영역이다. 질문의 "여기", "이거"는 이 영역을 가리킨다.
  새로 선택하지 않은 후속 질문에도 같은 이미지가 다시 첨부된다. 이미지를 "새로 올렸다"고 말하지 않는다.
- 앞선 메시지들은 이 문서에 대해 사용자와 나눈 실제 대화 기록이다. 그 내용을 기억하고 이어서 답한다.
- 이미지 속 수식, 그림, 표, 코드를 정확히 읽고 그 내용에 근거해서 답한다.
- 사용자의 질문 언어로 답하고, 학생이 이해할 수 있게 핵심부터 간결하게 설명한다.
- 답변은 Markdown으로 쓴다. 수식은 LaTeX로 쓰되 인라인은 $...$, 블록은 $...$ 로 감싼다. (\\( \\) 와 \\[ \\] 는 쓰지 않는다)
- 이미지에서 확인할 수 없는 내용은 추측이라고 밝힌다.`;

let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았어요. server/.env 파일을 확인하세요.');
  }
  client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // 일시적인 과부하는 SDK가 잠깐 기다렸다가 다시 시도한다 (총 3번)
    httpOptions: { retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 4, httpStatusCodes: OVERLOADED } },
  });
  return client;
}

async function generate(model, contents) {
  const response = await getClient().models.generateContent({
    model,
    contents,
    config: { systemInstruction: SYSTEM_INSTRUCTION },
  });
  return response.text ?? '';
}

// SDK 에러(JSON 문자열이 그대로 담김)를 사용자에게 보여줄 문장으로 바꾼다
function friendlyError(err) {
  if (OVERLOADED.includes(err.status)) {
    return new Error('AI 서버가 지금 붐비고 있어요. 잠시 후 다시 질문해 주세요.');
  }
  if ([400, 403, 404].includes(err.status)) {
    return new Error('AI 요청이 거부됐어요. API 키나 모델 설정을 확인하세요.');
  }
  return err;
}

/**
 * @param {object} params
 * @param {string} params.question
 * @param {{ role: 'user' | 'assistant', text: string }[]} params.history
 * @param {{ data: Buffer, mimeType: string } | null} params.image  선택 영역 이미지
 * @param {string} params.documentName
 * @param {number | null} params.pageNumber
 */
export async function askAI({ question, history, image, documentName, pageNumber }) {
  const context = [`문서: ${documentName}`, pageNumber && `선택 영역 위치: ${pageNumber}페이지`]
    .filter(Boolean)
    .join('\n');

  const parts = [{ text: `${context}\n\n질문: ${question}` }];
  if (image) {
    parts.unshift({ inlineData: { data: image.data.toString('base64'), mimeType: image.mimeType } });
  }

  const contents = [
    ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
    { role: 'user', parts },
  ];

  try {
    return await generate(MODEL, contents);
  } catch (err) {
    if (!OVERLOADED.includes(err.status) || !FALLBACK_MODEL) throw friendlyError(err);
    console.warn(`[ai] ${MODEL} 과부하(${err.status}) → ${FALLBACK_MODEL}로 재시도`);
    try {
      return await generate(FALLBACK_MODEL, contents);
    } catch (fallbackErr) {
      throw friendlyError(fallbackErr);
    }
  }
}
