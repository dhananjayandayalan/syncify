import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './MouseTooltip.module.css';

interface MouseTooltipProps {
  text: string;
  initialX: number;
  initialY: number;
  // Pass this ref to the component so the parent can update position
  // without triggering React re-renders on every mousemove
  posRef: React.RefObject<{ x: number; y: number }>;
}

function getPosition(x: number, y: number) {
  const W = 260; // tooltip max-width
  const H = 48;  // approximate tooltip height
  const ox = 16; // horizontal offset from cursor
  const oy = 14; // vertical offset above cursor

  let left = x + ox;
  let top = y - H - oy;

  // Flip right→left when near the right edge
  if (left + W > window.innerWidth - 8) left = x - W - ox;
  // Flip up→down when near the top
  if (top < 8) top = y + oy;

  return { left, top };
}

export function MouseTooltip({ text, initialX, initialY, posRef }: MouseTooltipProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Sync DOM position directly from posRef on every animation frame
  // — no React state updates, no re-renders during mouse movement
  useEffect(() => {
    function update() {
      if (elRef.current && posRef.current) {
        const { left, top } = getPosition(posRef.current.x, posRef.current.y);
        elRef.current.style.left = `${left}px`;
        elRef.current.style.top = `${top}px`;
      }
      rafRef.current = requestAnimationFrame(update);
    }
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [posRef]);

  const { left, top } = getPosition(initialX, initialY);

  return createPortal(
    <div ref={elRef} className={styles.tooltip} style={{ left, top }}>
      <span className={styles.note}>♪</span>
      <span className={styles.text}>{text}</span>
    </div>,
    document.body,
  );
}
