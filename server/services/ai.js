import OpenAI from "openai";

const MODEL = process.env.GATEWAY_MODEL || "gpt-6-astra";

const BASE_URL = "https://factchat-cloud.mindlogic.ai/v1/gateway";

const SYSTEM_INSTRUCTION = `너는 AskBox의 학습 도우미야.
사용자는 강의자료, 논문, 문제집 같은 문서를 보다가 궁금한 영역을 네모로 잘라서 질문한다.
- 첨부된 이미지는 사용자가 문서에서 가장 최근에 선택한 영역이다. 질문의 "여기", "이거"는 이 영역을 가리킨다.
  새로 선택하지 않은 후속 질문에도 같은 이미지가 다시 첨부된다. 이미지를 "새로 올렸다"고 말하지 않는다.
- 앞선 메시지들은 이 문서에 대해 사용자와 나눈 실제 대화 기록이다. 그 내용을 기억하고 이어서 답한다.
- 이미지 속 수식, 그림, 표, 코드를 정확히 읽고 그 내용에 근거해서 답한다.
- 사용자의 질문 언어로 답하고, 학생이 이해할 수 있게 핵심부터 간결하게 설명한다.
- 답변은 Markdown으로 쓴다. 수식은 LaTeX로 쓰되 인라인은 $...$, 블록은 $$...$$ 로 감싼다. (\\( \\) 와 \\[ \\] 는 쓰지 않는다)
- 이미지에서 확인할 수 없는 내용은 추측이라고 밝힌다.`;

let client;

function getClient() {
  if (!process.env.FACTCHAT_API_KEY) {
    throw new Error(
      "FACTCHAT_API_KEY가 설정되지 않았어요. server/.env 파일을 확인하세요.",
    );
  }
  client ??= new OpenAI({
    apiKey: process.env.FACTCHAT_API_KEY,
    baseURL: BASE_URL,
    maxRetries: 1, // 429·5xx는 SDK가 한 번만 더 시도한다
    timeout: 60_000,
  });
  return client;
}

// SDK 에러를 사용자에게 보여줄 문장으로 바꾼다
function friendlyError(err) {
  if (!(err instanceof OpenAI.APIError)) return err;
  if (err instanceof OpenAI.APIConnectionError) {
    return new Error("AI 서버에 연결하지 못했어요. 네트워크를 확인하세요.");
  }
  if (err.status === 429) {
    return new Error(
      "AI 사용량 한도에 도달했어요. 잠시 후 다시 시도하세요.",
    );
  }
  if (err.status >= 500) {
    return new Error(
      "AI 서버가 지금 붐비고 있어요. 잠시 후 다시 질문해 주세요.",
    );
  }
  if ([400, 401, 403, 404].includes(err.status)) {
    return new Error("AI 요청이 거부됐어요. API 키나 모델 설정을 확인하세요.");
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
export async function askAI({
  question,
  history,
  image,
  documentName,
  pageNumber,
}) {
  const context = [
    `문서: ${documentName}`,
    pageNumber && `선택 영역 위치: ${pageNumber}페이지`,
  ]
    .filter(Boolean)
    .join("\n");

  const content = [{ type: "input_text", text: `${context}

질문: ${question}` }];
  if (image) {
    content.unshift({
      type: "input_image",
      image_url: `data:${image.mimeType};base64,${image.data.toString("base64")}`,
      detail: "auto",
    });
  }

  const input = [
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text,
    })),
    { role: "user", content },
  ];

  try {
    const response = await getClient().responses.create({
      model: MODEL,
      instructions: SYSTEM_INSTRUCTION,
      input,
    });
    return response.output_text ?? "";
  } catch (err) {
    console.warn(`[ai] ${MODEL} 실패 (${err.status ?? err.name}): ${err.message}`);
    throw friendlyError(err);
  }
}
