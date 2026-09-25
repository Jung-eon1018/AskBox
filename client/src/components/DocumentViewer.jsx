import { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import SelectionOverlay from './SelectionOverlay.jsx';
import { documentFileUrl } from '../api/api.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PAGE_WIDTH = 900; // 화면에 보이는 페이지 최대 폭 (CSS px)
const PIXEL_RATIO = Math.max(2, window.devicePixelRatio || 1); // crop 선명도를 위해 최소 2배로 렌더링

// ───────── 읽던 위치 기억 (문서별, 이 브라우저에만 저장) ─────────
// { page: 몇 번째 페이지, offset: 그 페이지 안에서 얼마나 내려왔는지(0~1) }
// 창 크기가 달라져 페이지 높이가 바뀌어도 같은 위치로 돌아가도록 픽셀 대신 비율로 저장한다.
const positionKey = (docId) => `askbox:position:${docId}`;

function loadPosition(docId) {
  try {
    return JSON.parse(localStorage.getItem(positionKey(docId)));
  } catch {
    return null;
  }
}

function savePosition(docId, position) {
  try {
    localStorage.setItem(positionKey(docId), JSON.stringify(position));
  } catch {
    // 저장소를 못 쓰는 환경(시크릿 모드 등)에서는 기억하지 않는다
  }
}

function pageTop(container, page) {
  return page.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
}

export default function DocumentViewer({ doc, selectMode, selection, onSelect }) {
  const containerRef = useRef(null);
  const restoredRef = useRef(false);
  const saveTimerRef = useRef(null);
  const [pageWidth, setPageWidth] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  // 페이지 폭은 처음 한 번만 정한다. 폭이 바뀌면 이미 그린 선택 좌표가 어긋나기 때문.
  useEffect(() => {
    const available = containerRef.current.clientWidth - 48;
    setPageWidth(Math.min(MAX_PAGE_WIDTH, available));
  }, []);

  // 서버에 저장된 원본 파일을 받아온다
  useEffect(() => {
    let cancelled = false;
    fetch(documentFileUrl(doc.id))
      .then((res) => {
        if (!res.ok) throw new Error(`파일을 불러오지 못했어요 (${res.status})`);
        return res.blob();
      })
      .then((blob) => !cancelled && setFile(blob))
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  // 페이지 배치가 끝나면 마지막으로 읽던 위치로 이동
  const handleLayoutReady = useCallback(() => {
    const container = containerRef.current;
    const position = loadPosition(doc.id);
    const page = position && container.querySelectorAll('.document-page')[position.page - 1];
    if (page) container.scrollTop = pageTop(container, page) + position.offset * page.offsetHeight;
    restoredRef.current = true;
  }, [doc.id]);

  // 스크롤이 멈추면 화면 맨 위에 걸친 페이지와 그 안의 위치를 저장
  function handleScroll() {
    if (!restoredRef.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const container = containerRef.current;
      const pages = container.querySelectorAll('.document-page');
      let index = 0;
      pages.forEach((p, i) => {
        if (pageTop(container, p) <= container.scrollTop + 1) index = i;
      });
      const page = pages[index];
      const offset = (container.scrollTop - pageTop(container, page)) / page.offsetHeight;
      savePosition(doc.id, { page: index + 1, offset: Math.min(Math.max(offset, 0), 1) });
    }, 150);
  }

  const pageProps = (pageNumber) => ({
    pageNumber,
    selectMode,
    rect: selection?.pageNumber === pageNumber ? selection.rect : null,
    onSelect: (rect, canvas) => onSelect(rect ? { pageNumber, rect, canvas } : null),
  });

  return (
    <div ref={containerRef} className={`document-scroll${selectMode ? ' is-selecting' : ''}`} onScroll={handleScroll}>
      {error && <p className="document-message">{error.message}</p>}
      {!error && !file && <p className="document-message">불러오는 중…</p>}
      {pageWidth &&
        file &&
        (doc.kind === 'pdf' ? (
          <PdfDocument file={file} width={pageWidth} pageProps={pageProps} onLayoutReady={handleLayoutReady} />
        ) : (
          <ImagePage file={file} width={pageWidth} onLayoutReady={handleLayoutReady} {...pageProps(1)} />
        ))}
    </div>
  );
}

function PdfDocument({ file, width, pageProps, onLayoutReady }) {
  const [pdf, setPdf] = useState(null);
  const [pageSizes, setPageSizes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;

    (async () => {
      try {
        const data = await file.arrayBuffer();
        if (cancelled) return;
        loadingTask = pdfjsLib.getDocument({ data });
        const loaded = await loadingTask.promise;
        // 렌더링 전에 모든 페이지 크기를 알아야 스크롤 높이가 흔들리지 않는다.
        const sizes = [];
        for (let i = 1; i <= loaded.numPages; i++) {
          const { width: w, height: h } = (await loaded.getPage(i)).getViewport({ scale: 1 });
          sizes.push({ w, h });
        }
        if (!cancelled) {
          setPdf(loaded);
          setPageSizes(sizes);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      }
    })();

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [file]);

  // 모든 페이지 자리가 잡힌 뒤(높이 확정) 알린다 → 읽던 위치 복원
  useEffect(() => {
    if (pdf) onLayoutReady();
  }, [pdf, onLayoutReady]);

  if (error) return <p className="document-message">PDF를 열 수 없어요: {error.message}</p>;
  if (!pdf) return <p className="document-message">불러오는 중…</p>;

  return pageSizes.map((size, i) => (
    <PdfPage key={i} pdf={pdf} width={width} height={(width * size.h) / size.w} {...pageProps(i + 1)} />
  ));
}

function PdfPage({ pdf, width, height, pageNumber, selectMode, rect, onSelect }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // 화면 근처에 왔을 때만 렌더링 (한 번 그리면 유지)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let renderTask = null;
    let cancelled = false;

    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (width / base.width) * PIXEL_RATIO });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      renderTask = page.render({ canvas, viewport });
      renderTask.promise.catch(() => {}); // 취소 시 발생하는 에러 무시
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [visible, pdf, pageNumber, width]);

  return (
    <div ref={wrapperRef} className="document-page" style={{ width, height }}>
      <canvas ref={canvasRef} className="document-canvas" />
      <SelectionOverlay
        active={selectMode}
        rect={rect}
        onChange={(r) => onSelect(r, canvasRef.current)}
      />
      <span className="page-number">{pageNumber}</span>
    </div>
  );
}

// 이미지도 canvas에 그려서 PDF와 같은 선택/crop 로직을 쓴다.
function ImagePage({ file, width, pageNumber, selectMode, rect, onSelect, onLayoutReady }) {
  const canvasRef = useRef(null);
  const [size, setSize] = useState(null); // 화면에 보이는 크기 { w, h }

  useEffect(() => {
    if (size) onLayoutReady();
  }, [size, onLayoutReady]);

  useEffect(() => {
    let cancelled = false;
    let bitmap = null;

    (async () => {
      bitmap = await createImageBitmap(file);
      if (cancelled) return;
      const canvas = canvasRef.current;
      canvas.width = bitmap.width; // 원본 해상도 그대로 → crop이 선명
      canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const w = Math.min(width, bitmap.width); // 작은 이미지는 억지로 늘리지 않음
      setSize({ w, h: (w * bitmap.height) / bitmap.width });
    })();

    return () => {
      cancelled = true;
      bitmap?.close();
    };
  }, [file, width]);

  return (
    <div className="document-page" style={size ? { width: size.w, height: size.h } : { width }}>
      <canvas ref={canvasRef} className="document-canvas" />
      {size && (
        <SelectionOverlay active={selectMode} rect={rect} onChange={(r) => onSelect(r, canvasRef.current)} />
      )}
    </div>
  );
}
