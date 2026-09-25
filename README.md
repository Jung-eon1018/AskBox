# AskBox

> **Select what you don't understand. Ask. Keep reading.**

AskBox는 제가 강의자료나 논문을 공부할 때 직접 사용하기 위해 만든  
**개인 학습용 AI 문서 뷰어**입니다.

평소 PDF를 읽다가 이해되지 않는 부분이 생기면

**캡처 → AI 챗봇 열기 → 이미지 업로드 → 맥락 설명 → 질문**

과정을 반복해야 했습니다.

특히 수식, 그림, 표처럼 텍스트만 복사해서 질문하기 어려운 부분에서는  
이 과정 때문에 읽던 흐름이 자주 끊겼습니다.

그래서 문서를 읽는 화면 안에서 궁금한 부분을 바로 선택하고  
AI에게 질문할 수 있도록 AskBox를 만들었습니다.

**Read → Select → Ask → Understand → Keep reading**

---

## Why I Built This

AskBox의 목적은 AI가 자료를 대신 읽거나  
공부 자체를 대신해주는 것이 아닙니다.

제가 직접 자료를 읽고 이해하는 과정에서

> **이해가 막힌 바로 그 순간 빠르게 질문하고 다시 읽기로 돌아가는 것**

에 초점을 맞췄습니다.

그래서 자동 요약, 퀴즈 생성, 플래시카드 같은 기능을 추가하기보다

**읽기 → 궁금한 영역 선택 → 질문 → 다시 읽기**

라는 흐름을 최대한 단순하게 유지했습니다.

---

## Core Interaction

문서의 텍스트만 선택하는 방식이 아니라  
캡처 도구처럼 궁금한 영역을 자유롭게 네모로 선택할 수 있습니다.

따라서 다음과 같은 내용도 같은 방식으로 질문할 수 있습니다.

- Text
- Formula
- Figure
- Table
- Code
- Image

선택한 영역은 이미지로 crop되어 AI에게 전달됩니다.

```text
Open Document
      ↓
Select Any Region
      ↓
Ask a Question
      ↓
Multimodal AI
      ↓
Understand
      ↓
Keep Reading
```

---

## Features

### Document Library

- PDF / JPG / PNG 파일 업로드
- 업로드한 문서 서버에 저장
- 문서 목록 유지
- 문서 삭제

### Document Viewer

- PDF.js 기반 PDF 렌더링
- 여러 페이지를 세로 스크롤 방식으로 표시
- 화면 근처의 페이지만 lazy rendering
- 문서를 다시 열었을 때 이전에 읽던 위치 복원

### Region Selection

- Pointer drag 방식의 자유 영역 선택
- 텍스트 / 수식 / 그림 / 표를 구분하지 않고 선택 가능
- 화면 좌표를 Canvas 해상도에 맞게 변환
- 선택 영역을 고해상도 PNG로 crop
- 질문 전에 선택 영역 preview 제공

### AI Q&A

- 선택한 이미지와 질문을 함께 전달하는 multimodal Q&A
- 현재 문서명과 페이지 정보 전달
- 문서별 대화 기록 저장 및 복원
- 이전 대화 맥락을 활용한 후속 질문
- 새 영역을 선택하지 않은 경우 이전 선택 영역을 유지하여 질문 가능

### Answer Rendering

- Markdown 렌더링
- 리스트 / 표 / 코드 블록 지원
- KaTeX 기반 수식 렌더링

---

## AI Model

현재 AskBox는 **GPT-5.6 Luna**를 사용합니다.

서강대학교에서 제공하는 **API Gateway**를 통해 모델을 호출하며,  
OpenAI-compatible Responses API 방식으로 연결되어 있습니다.

AskBox에서는 복잡한 장시간 추론보다

- 선택한 이미지 이해
- 수식 / 그림 / 표 해석
- 짧은 개념 질문
- 이전 질문과 이어지는 설명

이 주된 사용 방식이기 때문에  
가장 높은 성능의 모델보다 **멀티모달 성능과 사용 비용의 균형**을 기준으로  
GPT-5.6 Luna를 선택했습니다.

```text
Selected Region
      +
Question
      +
Document / Page Metadata
      +
Conversation Context
      ↓
GPT-5.6 Luna
      ↓
Answer
```

---

## Tech Stack

### Frontend

- React
- Vite
- PDF.js
- Canvas API
- React Markdown
- KaTeX

### Backend

- Node.js
- Express
- Multer

### AI

- GPT-5.6 Luna
- Sogang University API Gateway
- OpenAI SDK
- Responses API

---

## Development Process

이 프로젝트는 코딩 자체를 연습하기 위한 프로젝트라기보다  
제가 실제 공부 과정에서 겪고 있던 문제를 빠르게 해결하기 위해 시작했습니다.

개발 과정에서는 **Claude Code**를 적극적으로 활용했습니다.

필요한 기능과 사용자 경험을 먼저 정의한 뒤,  
AI coding agent를 이용해 빠르게 구현하고 직접 사용하면서

```text
Idea
 ↓
Implementation
 ↓
Use
 ↓
Find Problems
 ↓
Improve
 ↓
Use Again
```

과정을 반복했습니다.

실제로 사용하면서 발견한 불편을 다시 수정하고,  
필요하지 않은 기능은 제거하면서

> **문서를 읽다가 이해되지 않는 부분을 바로 선택해서 질문할 수 있는가?**

라는 하나의 문제에 집중해 계속 개선하고 있습니다.

---

## Current Limitation

현재 AI는

- 사용자가 선택한 영역
- 문서명
- 페이지 정보
- 해당 문서에서 이어진 대화 기록

을 기반으로 답변합니다.

아직 PDF 전체 내용을 인덱싱하여 관련 내용을 자동으로 검색하는  
RAG / document retrieval 기능은 구현되어 있지 않습니다.

따라서 현재 AskBox는

> **문서 전체를 대신 읽어주는 AI가 아니라,  
> 내가 읽고 있는 부분을 바로 이해할 수 있도록 도와주는 AI**

에 더 가깝습니다.

---

## Future

필요성을 느낄 경우 다음 기능을 추가할 수 있습니다.

- Document-level retrieval
- PDF 전체 맥락 검색
- 긴 문서에서 관련 페이지 탐색

다만 기능을 계속 늘리기보다

> **Select → Ask → Keep reading**

이라는 AskBox의 단순한 사용 흐름을 유지하는 것을 목표로 합니다.

---

## Run Locally

### 1. Clone

```bash
git clone https://github.com/Jung-eon1018/ai-workspace.git
cd ai-workspace
```

### 2. Install Dependencies

```bash
cd client
npm install

cd ../server
npm install
```

### 3. Environment Variables

`server/.env` 파일을 생성합니다.

```env
FACTCHAT_API_KEY=your_api_key
GATEWAY_MODEL=gpt-5.6-luna
```

> API Key는 GitHub에 업로드하지 않습니다.

### 4. Run Backend

프로젝트 루트에서:

```bash
npm run server
```

### 5. Run Frontend

새 터미널에서:

```bash
npm run dev
```

---

## Philosophy

**AskBox is not designed to replace reading.**

It is designed to help me stay in the reading flow  
when I encounter something I don't understand.

> **Select. Ask. Understand. Keep reading.**
