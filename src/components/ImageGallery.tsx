import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GalleryImage { id: number; url: string; original_name: string; }

export default function ImageGallery({ images, initialIndex = 0, onClose }: {
  images: GalleryImage[]; initialIndex?: number; onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  const move = (delta: number) => setIndex(current => (current + delta + images.length) % images.length);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);

  const image = images[index];
  if (!image) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={vi ? 'Xem ảnh dự án' : 'Project images'}
      onClick={onClose}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
        if (event.key === 'Tab') {
          const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}
      onTouchStart={event => { const point = event.touches[0]; touchStart.current = { x: point.clientX, y: point.clientY }; }}
      onTouchEnd={event => {
        if (!touchStart.current) return;
        const point = event.changedTouches[0];
        const dx = point.clientX - touchStart.current.x;
        const dy = point.clientY - touchStart.current.y;
        if (images.length > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
        touchStart.current = null;
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 48px 100px' }}>
      <button ref={closeRef} type="button" className="btn btn-light" aria-label={vi ? 'Đóng' : 'Close'}
        onClick={event => { event.stopPropagation(); onClose(); }}
        style={{ position: 'absolute', top: 16, right: 16 }}>✕</button>
      {images.length > 1 && <button type="button" className="btn btn-light" aria-label={vi ? 'Ảnh trước' : 'Previous image'}
        onClick={event => { event.stopPropagation(); move(-1); }}
        style={{ position: 'absolute', left: 8, top: '50%' }}>❮</button>}
      <img src={image.url} alt={image.original_name || (vi ? 'Ảnh dự án' : 'Project image')}
        onClick={event => event.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, touchAction: 'pan-y' }} />
      {images.length > 1 && <button type="button" className="btn btn-light" aria-label={vi ? 'Ảnh tiếp theo' : 'Next image'}
        onClick={event => { event.stopPropagation(); move(1); }}
        style={{ position: 'absolute', right: 8, top: '50%' }}>❯</button>}
      <div onClick={event => event.stopPropagation()}
        style={{ position: 'absolute', bottom: 12, left: 48, right: 48, color: '#fff', textAlign: 'center' }}>
        <div aria-live="polite" className="small mb-2">{index + 1} / {images.length}</div>
        <div className="d-flex justify-content-center gap-2" style={{ overflowX: 'auto' }}>
          {images.map((item, itemIndex) => <button key={item.id} type="button"
            aria-label={(vi ? 'Xem ảnh ' : 'View image ') + (itemIndex + 1)} aria-pressed={itemIndex === index}
            onClick={() => setIndex(itemIndex)}
            style={{ padding: 0, flexShrink: 0, borderRadius: 4, overflow: 'hidden', border: itemIndex === index ? '2px solid #60a5fa' : '2px solid transparent' }}>
            <img src={item.url} alt="" style={{ width: 48, height: 48, objectFit: 'cover' }} />
          </button>)}
        </div>
      </div>
    </div>
  );
}
