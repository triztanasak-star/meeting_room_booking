import { useState } from 'react';

export default function UserAvatar({ name, src, size = 28 }: { name: string; src?: string | null; size?: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const style = { width: size, height: size, flexShrink: 0, objectFit: 'cover' as const };
  return src && failedSrc !== src
    ? <img src={src} alt="" className="rounded-circle" style={style} onError={() => setFailedSrc(src)} />
    : <span aria-hidden="true" className="rounded-circle d-inline-flex align-items-center justify-content-center bg-secondary-subtle text-secondary" style={style}>{name.trim().charAt(0).toUpperCase() || '?'}</span>;
}
