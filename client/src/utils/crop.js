// 화면 좌표(CSS px)로 선택한 영역을 canvas 실제 해상도 기준으로 잘라 PNG Blob으로 만든다.
// canvas는 선명도를 위해 화면 크기보다 크게 렌더링되므로 비율을 곱해야 정확히 잘린다.
export function cropCanvas(canvas, rect) {
  const ratio = canvas.width / canvas.getBoundingClientRect().width;

  const sx = Math.round(rect.x * ratio);
  const sy = Math.round(rect.y * ratio);
  const sw = Math.max(1, Math.round(rect.width * ratio));
  const sh = Math.max(1, Math.round(rect.height * ratio));

  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
}
