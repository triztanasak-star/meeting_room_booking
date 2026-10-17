import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import UserAvatar from './UserAvatar';

export default function AvatarPicker({ name, value, onChange, onStatusChange, disabled = false }: { name: string; value: string | null; onChange: (value: string | null) => void; onStatusChange?: (status: 'ready' | 'processing' | 'error') => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError(true); onStatusChange?.('error'); return; }
    setProcessing(true);
    onStatusChange?.('processing');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      const side = Math.min(img.width, img.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 160, 160);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 160, 160);
      const image = canvas.toDataURL('image/jpeg', 0.85);
      if (!image.startsWith('data:image/jpeg;base64,') || image.length > 180000) throw new Error('Invalid image');
      onChange(image);
      onStatusChange?.('ready');
    } catch { setError(true); onStatusChange?.('error'); }
    finally { URL.revokeObjectURL(url); setProcessing(false); }
  };
  return <div className="mb-3">
    <label className="form-label">{t('avatar.label')}</label>
    <div className="d-flex align-items-center gap-2 mb-2"><UserAvatar name={name} src={value} size={40} /><span>{name}</span></div>
    <input disabled={disabled || processing} ref={input} type="file" className="form-control" aria-label={t('avatar.label')} accept="image/jpeg,image/png,image/webp" onChange={choose} />
    {processing && <div role="status">{t('avatar.processing')}</div>}
    <div className="form-text">{t('avatar.hint')}</div>
    {(value || error) && <button disabled={disabled || processing} type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={() => { onChange(null); setError(false); onStatusChange?.('ready'); }}>{t('avatar.remove')}</button>}
    {error && <div className="text-danger mt-1" role="alert">{t('avatar.error')}</div>}
  </div>;
}
