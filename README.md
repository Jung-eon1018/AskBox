# AskBox

**AI-native document learning workspace** — 문서를 보다가 궁금한 부분을 마우스로 네모 선택하고, 바로 AI에게 질문하세요.

> 캡처 → 챗봇 열기 → 업로드 → 맥락 설명 → 질문
> ⟶ **파일 열기 → 영역 선택 → 질문**

## 핵심 흐름

1. Library에서 문서(PDF / JPG / PNG)를 연다.
2. 텍스트, 수식, 그림, 표 등 궁금한 영역을 네모로 선택한다.
3. 질문을 입력하면 AI가 **선택 영역 + 현재 페이지 + 문서 전체 맥락 + 이전 대화**를 바탕으로 답한다.

## 구조

```
client/   React + PDF.js — Library, Document Viewer, Selection Overlay, AI Panel
server/   Node + Express — 업로드, 질문 처리, LLM 호출 (API 키는 서버에만 보관)
```

## 로드맵

- [ ] Viewer — PDF/이미지를 canvas에 렌더링
- [ ] Selection — 드래그로 영역 선택
- [ ] Crop — 선택 영역을 PNG로 잘라 미리보기
- [ ] AI — 선택 이미지 + 질문 → multimodal LLM 답변
- [ ] Document Context — 문서 인덱싱(RAG)으로 전체 맥락 반영
