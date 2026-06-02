import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './ImageCropModal.module.css';

interface CropRect { x: number; y: number; size: number }
type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se';
interface DragState { handle: Handle; startX: number; startY: number; startCrop: CropRect }

const HANDLE_HIT = 14;
const MIN_SIZE = 50;
const OUTPUT_SIZE = 300;

function getHandle(mx: number, my: number, c: CropRect): Handle | null {
  const near = (ax: number, ay: number) => Math.abs(mx - ax) < HANDLE_HIT && Math.abs(my - ay) < HANDLE_HIT;
  if (near(c.x, c.y)) return 'nw';
  if (near(c.x + c.size, c.y)) return 'ne';
  if (near(c.x, c.y + c.size)) return 'sw';
  if (near(c.x + c.size, c.y + c.size)) return 'se';
  if (mx > c.x && mx < c.x + c.size && my > c.y && my < c.y + c.size) return 'move';
  return null;
}

const CURSORS: Record<Handle, string> = {
  move: 'move', nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize',
};

function applyDrag(handle: Handle, start: CropRect, dx: number, dy: number, cW: number, cH: number): CropRect {
  const { x, y, size } = start;
  let nx = x, ny = y, ns = size;

  switch (handle) {
    case 'move':
      nx = Math.max(0, Math.min(x + dx, cW - size));
      ny = Math.max(0, Math.min(y + dy, cH - size));
      return { x: nx, y: ny, size };
    case 'se':
      ns = Math.max(MIN_SIZE, Math.min(size + dx, cW - x, cH - y));
      return { x, y, size: ns };
    case 'nw':
      ns = Math.max(MIN_SIZE, Math.min(size - dx, x + size, y + size));
      return { x: x + size - ns, y: y + size - ns, size: ns };
    case 'ne':
      ns = Math.max(MIN_SIZE, Math.min(size + dx, cW - x, y + size));
      return { x, y: y + size - ns, size: ns };
    case 'sw':
      ns = Math.max(MIN_SIZE, Math.min(size - dx, x + size, cH - y));
      return { x: x + size - ns, y, size: ns };
  }
}

function drawOverlay(canvas: HTMLCanvasElement, c: CropRect) {
  const ctx = canvas.getContext('2d')!;
  const { width: W, height: H } = canvas;
  ctx.clearRect(0, 0, W, H);

  // Dark mask outside crop
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.clearRect(c.x, c.y, c.size, c.size);

  // Crop border
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(c.x, c.y, c.size, c.size);

  // Rule-of-thirds grid
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 3; i++) {
    const vx = c.x + (c.size * i) / 3;
    const hy = c.y + (c.size * i) / 3;
    ctx.moveTo(vx, c.y); ctx.lineTo(vx, c.y + c.size);
    ctx.moveTo(c.x, hy); ctx.lineTo(c.x + c.size, hy);
  }
  ctx.stroke();

  // Corner handles
  const S = 10;
  ctx.fillStyle = 'white';
  [[c.x, c.y], [c.x + c.size, c.y], [c.x, c.y + c.size], [c.x + c.size, c.y + c.size]]
    .forEach(([hx, hy]) => ctx.fillRect(hx - S / 2, hy - S / 2, S, S));
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCrop: (dataUrl: string) => void;
}

export function ImageCropModal({ open, onClose, onCrop }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, size: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (canvasRef.current && imageSrc && crop.size > 0) {
      drawOverlay(canvasRef.current, crop);
    }
  }, [crop, imageSrc]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImageLoad = () => {
    const img = imgRef.current!;
    const canvas = canvasRef.current!;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    const size = Math.round(Math.min(img.clientWidth, img.clientHeight) * 0.8);
    setCrop({
      x: Math.round((img.clientWidth - size) / 2),
      y: Math.round((img.clientHeight - size) / 2),
      size,
    });
  };

  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPos(e);
    const handle = getHandle(x, y, crop);
    if (handle) {
      e.preventDefault();
      dragRef.current = { handle, startX: x, startY: y, startCrop: { ...crop } };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPos(e);
    if (!dragRef.current) {
      const handle = getHandle(x, y, crop);
      canvasRef.current!.style.cursor = handle ? CURSORS[handle] : 'default';
      return;
    }
    e.preventDefault();
    const { handle, startX, startY, startCrop } = dragRef.current;
    const c = canvasRef.current!;
    setCrop(applyDrag(handle, startCrop, x - startX, y - startY, c.width, c.height));
  };

  const handleMouseUp = () => { dragRef.current = null; };

  const handleApply = () => {
    const img = imgRef.current!;
    const canvas = canvasRef.current!;
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;
    const out = document.createElement('canvas');
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    out.getContext('2d')!.drawImage(
      img,
      crop.x * scaleX, crop.y * scaleY,
      crop.size * scaleX, crop.size * scaleY,
      0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
    );
    onCrop(out.toDataURL('image/jpeg', 0.85));
    handleClose();
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0, size: 0 });
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Set playlist cover" width={580}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.hidden}
        onChange={handleFile}
      />

      {!imageSrc ? (
        <div className={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
          <div className={styles.dropzoneIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <p className={styles.dropzoneText}>Click to choose an image</p>
          <p className={styles.dropzoneSub}>JPEG, PNG, or WEBP · Max 10 MB</p>
        </div>
      ) : (
        <>
          <div className={styles.cropArea}>
            <div className={styles.imageWrapper}>
              <img
                ref={imgRef}
                src={imageSrc}
                className={styles.image}
                onLoad={handleImageLoad}
                draggable={false}
                alt=""
              />
              <canvas
                ref={canvasRef}
                className={styles.overlay}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </div>
          <p className={styles.hint}>Drag inside to move · Drag corners to resize</p>
        </>
      )}

      <div className={styles.footer}>
        <div>
          {imageSrc && (
            <button className={styles.changeBtn} onClick={() => fileInputRef.current?.click()}>
              Change image
            </button>
          )}
        </div>
        <div className={styles.footerRight}>
          <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
          {imageSrc && (
            <Button size="sm" onClick={handleApply}>Apply crop</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
