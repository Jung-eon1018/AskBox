import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import SelectionOverlay from './SelectionOverlay.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PAGE_WIDTH = 900; // 화면에 보이는 페이지 최대 폭 (CSS px)
const PIXEL_RATIO = Math.max(2, window.devicePixelRatio || 1); // crop 선명도를 위해 최소 2배로 렌더링

export default function DocumentViewer({ doc, selectMode, selection, onSelect }) {
  const containerRef = useRef(null);
  const [pageWidth, setPageWidth] = useState(null);

  // 페이지 폭은 처음 한 번만 정한다. 폭이 바뀌면 이미 그린 선택 좌표가 어긋나기 때문.
  useEffect(() => {
    const available = containerRef.current.clientWidth - 48;
    setPageWidth(Math.min(MAX_PAGE_WIDTH, available));
  }, []);

  const pageProps = (pageNumber) => ({
    pageNumber,
    selectMode,
    rect: selection?.pageNumber === pageNumber ? selection.rect : null,
    onSelect: (rect, canvas) => onSelect(rect ? { pageNumber, rect, canvas } : null),
  });

  return (
    <div ref={containerRef} className={`document-scroll${selectMode ? ' is-selecting' : ''}`}>
      {pageWidth &&
        (doc.kind === 'pdf' ? (
          <PdfDocument file={doc.file} width={pageWidth} pageProps={pageProps} />
        ) : (
          <ImagePage file={doc.file} width={pageWidth} {...pageProps(1)} />
        ))}
    </div>
  );
}

function PdfDocument({ file, width, pageProps }) {
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
function ImagePage({ file, width, pageNumber, selectMode, rect, onSelect }) {
  const canvasRef = useRef(null);
  const [size, setSize] = useState(null); // 화면에 보이는 크기 { w, h }

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
