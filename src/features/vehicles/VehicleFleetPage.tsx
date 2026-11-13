import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiMapPin, FiPlus, FiUsers } from 'react-icons/fi';
import client from '../../lib/adapters/nodeAdapter';
import { errorMessage } from '../meetings/api';
import { Dialog, RoomImagePicker } from '../meetings/MeetingApp';

interface Vehicle { id: number; name: string; plate: string; active: boolean; seats: number | null; image: string | null }
const base = '/api/vehicles/fleet';
export function VehicleFleetPage() {
  const qc = useQueryClient();
  const fleet = useQuery({ queryKey: ['vehicles', 'fleet'], queryFn: async () => (await client.get<Vehicle[]>(base)).data });
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || processing) return;
    const data = new FormData(event.currentTarget);
    const body = { name: data.get('name'), plate: data.get('plate'), seats: Number(data.get('seats')), active: data.get('active') === 'true', image };
    setSaving(true); setError('');
    try {
      if (editing) await client.put(`${base}/${editing.id}`, body); else await client.post(base, body);
      setEditing(undefined); setMessage('Đã lưu thay đổi.');
      await qc.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
  }
  async function remove() {
    if (!deleting || saving) return;
    setSaving(true); setError('');
    try {
      await client.delete(`${base}/${deleting.id}`); setDeleting(null); setMessage('Đã xóa xe.');
      await qc.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
  }
  return <>
    <div className="mr-page-heading"><div><p className="mr-eyebrow">ADMINISTRATION</p><h1>Danh mục xe</h1><p className="mr-muted">Quản lý xe nhà máy, hình ảnh, biển số và số ghế.</p></div><button className="mr-button" onClick={() => { setEditing(null); setImage(null); setError(''); }}><FiPlus /> Thêm xe</button></div>
    {message && <div role="status" className="mr-alert success">{message}</div>}
    {fleet.isPending && <p>Đang tải…</p>}
    {fleet.error && <div role="alert" className="mr-alert error">{errorMessage(fleet.error)} <button className="mr-button secondary" onClick={() => void fleet.refetch()}>Thử lại</button></div>}
    {fleet.data?.length === 0 && <p className="mr-muted">Chưa có xe. Chọn Thêm xe để tạo danh mục.</p>}
    <div className="mr-room-grid">{fleet.data?.map(vehicle => <article className="mr-room-card" key={vehicle.id}>
      {vehicle.image ? <img className="mr-room-photo" src={vehicle.image} alt={vehicle.name} loading="lazy" /> : <div className="mr-room-art"><FiMapPin /><span>{vehicle.name}</span></div>}
      <div><span className={'mr-badge ' + (vehicle.active ? 'active' : 'maintenance')}>{vehicle.active ? 'Hoạt động' : 'Ngừng hoạt động'}</span><h2>{vehicle.name}</h2><p className="mr-muted">Biển số: {vehicle.plate}</p><p><FiUsers /> {vehicle.seats ? `${vehicle.seats} ghế` : 'Chưa cập nhật số ghế'}</p><div className="mr-actions"><button className="mr-button secondary" onClick={() => { setEditing(vehicle); setImage(vehicle.image); setError(''); }}>Chỉnh sửa</button><button className="mr-button danger secondary" onClick={() => { setDeleting(vehicle); setError(''); }}>Xóa xe</button></div></div>
    </article>)}</div>
    {editing !== undefined && <Dialog title={editing ? 'Chỉnh sửa xe' : 'Thêm xe'} close={() => { if (!saving && !processing) setEditing(undefined); }}><form className="mr-form" onSubmit={submit}><div className="mr-dialog-body">
      {error && <div role="alert" className="mr-alert error">{error}</div>}
      <RoomImagePicker label="Ảnh xe" value={image} onChange={setImage} processing={processing} onProcessing={setProcessing} disabled={saving} />
      <label>Tên xe *<input name="name" required maxLength={120} defaultValue={editing?.name} /></label>
      <label>Biển số *<input name="plate" required maxLength={30} defaultValue={editing?.plate} /></label>
      <label>Số ghế *<input name="seats" type="number" required min={1} max={100} step={1} defaultValue={editing?.seats ?? ''} /></label>
      <label>Trạng thái<select name="active" defaultValue={String(editing?.active ?? true)}><option value="true">Hoạt động</option><option value="false">Ngừng hoạt động</option></select></label>
    </div><footer><button className="mr-button" disabled={saving || processing}>{saving ? 'Đang lưu…' : 'Lưu'}</button></footer></form></Dialog>}
    {deleting && <Dialog title="Xác nhận xóa xe" close={() => { if (!saving) setDeleting(null); }}><div className="mr-dialog-body"><p>Xóa xe <strong>{deleting.name} · {deleting.plate}</strong> khỏi danh mục?</p><p>Xe đã có lịch phân công hoặc đang cần cho các yêu cầu giữ chỗ sẽ không thể xóa.</p>{error && <div role="alert" className="mr-alert error">{error}</div>}<div className="mr-actions"><button className="mr-button danger secondary" disabled={saving} onClick={() => void remove()}>{saving ? 'Đang xóa…' : 'Xóa xe'}</button><button className="mr-button secondary" disabled={saving} onClick={() => setDeleting(null)}>Quay lại</button></div></div></Dialog>}
  </>;
}
