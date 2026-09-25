import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// LLM이 쓰는 여러 수식 표기를 remark-math가 읽는 $ / $$ 형식으로 맞춘다.
function normalizeMath(text) {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`) // \[ … \] → 블록
    .replace(/\\\((.+?)\\\)/g, (_, m) => `$${m.trim()}$`) // \( … \) → 인라인
    .replace(/^[ \t]*\$\$(.+?)\$\$[ \t]*$/gm, (_, m) => `$$\n${m.trim()}\n$$`); // 한 줄짜리 $$…$$ → 블록
}

// AI 답변용: 굵은 글씨, 목록, 표, 코드와 $수식$ / $$수식$$ 을 렌더링한다.
export default function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}
      >
        {normalizeMath(children)}
      </ReactMarkdown>
    </div>
  );
}
