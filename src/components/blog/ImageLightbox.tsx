import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

type Props = { src: string; alt: string; onClose: () => void };

/**
 * Full-screen view of an article image. The site disables browser pinch-zoom, so zoom is ours:
 * tap toggles between "fit" and full size, two fingers pinch, one finger pans (native scroll).
 */
const ImageLightbox = ({ src, alt, onClose }: Props) => {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  // null = fit to screen; otherwise the image width in CSS pixels.
  const [width, setWidth] = useState<number | null>(null);
  const pinch = useRef<{ dist: number; width: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const fitWidth = () => img.current?.getBoundingClientRect().width ?? window.innerWidth;
  const fullWidth = () => Math.max(Math.min(img.current?.naturalWidth || 0, window.innerWidth * 2.2), window.innerWidth * 1.2);
  const maxWidth = () => fullWidth() * 2;

  /** Changes the zoom while keeping the point (cx, cy) on screen in place. */
  const zoomTo = (next: number | null, cx: number, cy: number) => {
    const el = box.current, im = img.current;
    if (!el || !im) return setWidth(next);
    const r = im.getBoundingClientRect();
    const fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
    setWidth(next);
    requestAnimationFrame(() => {
      const r2 = im.getBoundingClientRect();
      el.scrollLeft += r2.left + fx * r2.width - cx;
      el.scrollTop += r2.top + fy * r2.height - cy;
    });
  };

  const toggle = (cx: number, cy: number) => zoomTo(width ? null : fullWidth(), cx, cy);

  const dist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Slika'}
      className="fixed inset-0 z-[110] overflow-auto overscroll-contain bg-black/95"
      style={{ touchAction: 'pan-x pan-y' }}
      onClick={(e) => { if (e.target === e.currentTarget && !width) onClose(); }}
      onTouchStart={(e) => {
        moved.current = false;
        if (e.touches.length === 2) pinch.current = { dist: dist(e.touches), width: width ?? fitWidth() };
      }}
      onTouchMove={(e) => {
        moved.current = true;
        if (e.touches.length !== 2 || !pinch.current) return;
        const t = e.touches;
        const next = Math.min(maxWidth(), pinch.current.width * dist(t) / pinch.current.dist);
        const cx = (t[0].clientX + t[1].clientX) / 2, cy = (t[0].clientY + t[1].clientY) / 2;
        zoomTo(next <= fitWidth() * 1.05 && next < pinch.current.width ? null : next, cx, cy);
      }}
      onTouchEnd={(e) => { if (e.touches.length < 2) pinch.current = null; }}
    >
      <div className={width ? 'p-4' : 'flex min-h-full items-center justify-center px-4 pb-12 pt-16'}>
        <img
          ref={img}
          src={src}
          alt={alt}
          draggable={false}
          onClick={(e) => { if (!moved.current) toggle(e.clientX, e.clientY); }}
          style={width ? { width, maxWidth: 'none' } : undefined}
          className={`select-none rounded-md ${width ? 'cursor-zoom-out' : 'max-h-[calc(100dvh-7rem)] w-auto max-w-full cursor-zoom-in'}`}
        />
      </div>
      <div
        className="fixed right-0 top-0 flex gap-2 p-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}
      >
        <button
          type="button"
          onClick={() => toggle(window.innerWidth / 2, window.innerHeight / 2)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/30 backdrop-blur hover:bg-black/80"
          aria-label={width ? 'Smanji' : 'Povećaj'}
        >
          {width ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/30 backdrop-blur hover:bg-black/80"
          aria-label="Zatvori"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {!width && (
        <p className="pointer-events-none fixed inset-x-0 bottom-0 pb-4 text-center text-sm text-white/70" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          Dodirnite sliku ili raširite prste za povećanje
        </p>
      )}
    </div>
  );
};

export default ImageLightbox;
