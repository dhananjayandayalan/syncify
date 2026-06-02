import { useRef, useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import styles from './ImageCropModal.module.css';

interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  onCrop: (dataUrl: string) => void;
}

const OUTPUT_SIZE = 400;

export function ImageCropModal({ open, onClose, onCrop }: ImageCropModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext('2d')!;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onCrop(dataUrl);
    setPreview(null);
  };

  const handleClose = () => {
    setPreview(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Change cover" width={440}>
      <div className={styles.body}>
        <canvas ref={canvasRef} className={styles.canvas} style={{ display: preview ? 'block' : 'none' }} />
        {!preview && (
          <div className={styles.placeholder}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>Select an image</span>
          </div>
        )}
        <label className={styles.fileLabel}>
          {preview ? 'Change image' : 'Choose image'}
          <input type="file" accept="image/*" className={styles.fileInput} onChange={handleFile} />
        </label>
        {preview && (
          <Button onClick={handleApply} style={{ marginTop: 'var(--space-3)', width: '100%' }}>
            Apply cover
          </Button>
        )}
      </div>
    </Modal>
  );
}
