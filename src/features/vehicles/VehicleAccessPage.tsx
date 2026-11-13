import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiPlus } from 'react-icons/fi';
import client from '../../lib/adapters/nodeAdapter';
import { errorMessage } from '../meetings/api';
import { BookingSettings, Dialog } from '../meetings/MeetingApp';

interface Driver { id: number; name: string; phone: string; active: boolean }
interface Approver { id: number; name: string; email: string; role: string; approver: boolean }
const base = '/api/vehicles';
function ApproverRow({ user }: { user: Approver }) {
  const qc = useQueryClient();
  const [checked, setChecked] = useState(user.approver);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save() {
    setSaving(true); setError(''); setMessage('');
    try {
      await client.put(`${base}/access/${user.id}`, { approver: checked });
      await qc.invalidateQueries({ queryKey: ['vehicles'] });
      setMessage('Đã lưu thay đổi.');
    } catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
  }
  return <article className="mr-access-card"><div><strong>{user.name}</strong><small>{user.email}</small></div><fieldset><legend>Quyền đặt xe</legend><div className="mr-checkbox-grid"><label><input type="checkbox" checked={checked} disabled={saving} onChange={e => { setChecked(e.target.checked); setMessage(''); }} />Duyệt yêu cầu và phân xe, tài xế</label></div></fieldset><div><button className="mr-button secondary" disabled={saving} onClick={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>{message && <small role="status">{message}</small>}{error && <small role="alert">{error}</small>}</div></article>;
}
export function VehicleAccessPage() {
  const settings = useQuery({ queryKey: ['vehicles', 'booking-settings'], queryFn: async () => (await client.get<{minimum_notice_days:number}>(base + '/booking-settings')).data });
  const qc = useQueryClient();
  const drivers = useQuery({ queryKey: ['vehicles', 'drivers'], queryFn: async () => (await client.get<Driver[]>(base + '/drivers')).data });
  const access = useQuery({ queryKey: ['vehicles', 'access'], queryFn: async () => (await client.get<Approver[]>(base + '/access')).data });
  const [editing, setEditing] = useState<Driver | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    const data = new FormData(event.currentTarget);
    const body = { name: data.get('name'), phone: data.get('phone'), active: data.get('active') === 'true' };
    setSaving(true); setError('');
    try {
      if (editing) await client.put(`${base}/drivers/${editing.id}`, body); else await client.post(base + '/drivers', body);
      setEditing(undefined); setMessage('Đã lưu tài xế.');
      await qc.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
  }
  async function remove() {
    if (!deleting || saving) return;
    setSaving(true); setError('');
    try {
      await client.delete(`${base}/drivers/${deleting.id}`); setDeleting(null); setMessage('Đã xóa tài xế.');
      await qc.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
  }
  return <>
    <div className="mr-page-heading"><div><p className="mr-eyebrow">ADMINISTRATION</p><h1>Phân quyền xe</h1><p className="mr-muted">Quản lý tài xế và chỉ định người duyệt yêu cầu đặt xe. Admin luôn có quyền duyệt và phân công.</p></div><button className="mr-button" onClick={() => { setEditing(null); setError(''); }}><FiPlus />Thêm tài xế</button></div>
    {message && <div role="status" className="mr-alert success">{message}</div>}
    {settings.isPending && <p>Đang tải cài đặt thời gian đặt xe…</p>}
    {settings.error && <div className="mr-alert error" role="alert">{errorMessage(settings.error)} <button className="mr-button secondary" onClick={()=>void settings.refetch()}>Thử lại</button></div>}
    {settings.data && <BookingSettings vehicle key={settings.data.minimum_notice_days} days={settings.data.minimum_notice_days}/>}
    <section className="mr-access-section" aria-labelledby="vehicle-drivers-heading">
    <h2 id="vehicle-drivers-heading">Tài xế</h2>
    {drivers.isPending && <p>Đang tải tài xế…</p>}
    {drivers.error && <div className="mr-alert error" role="alert">{errorMessage(drivers.error)} <button className="mr-button secondary" onClick={() => void drivers.refetch()}>Thử lại</button></div>}
    {drivers.data?.length === 0 && <p className="mr-muted">Chưa có tài xế. Chọn Thêm tài xế để bổ sung.</p>}
    <div className="mr-access-grid">{drivers.data?.map(driver => <article className="mr-access-card" key={driver.id}><div><strong>{driver.name}</strong><small>{driver.phone}</small></div><div><span className={'mr-badge ' + (driver.active ? 'active' : 'maintenance')}>{driver.active ? 'Hoạt động' : 'Ngừng hoạt động'}</span></div><div className="mr-actions"><button className="mr-button secondary" onClick={() => { setEditing(driver); setError(''); }}>Chỉnh sửa</button><button className="mr-button danger secondary" onClick={() => { setDeleting(driver); setError(''); }}>Xóa tài xế</button></div></article>)}</div>
    </section>
    <section className="mr-access-section" aria-labelledby="vehicle-approvers-heading">
    <h2 id="vehicle-approvers-heading">Người duyệt</h2><p className="mr-muted">Người được cấp quyền có thể duyệt yêu cầu, phân xe và tài xế.</p>
    {access.isPending && <p>Đang tải người duyệt…</p>}
    {access.error && <div className="mr-alert error" role="alert">{errorMessage(access.error)} <button className="mr-button secondary" onClick={() => void access.refetch()}>Thử lại</button></div>}
    <div className="mr-access-grid">{access.data?.filter(user => user.role === 'admin' || user.role === 'manager').map(user => <ApproverRow key={`${user.id}-${user.approver}`} user={user} />)}</div>
    </section>
    {editing !== undefined && <Dialog title={editing ? 'Chỉnh sửa tài xế' : 'Thêm tài xế'} close={() => { if (!saving) setEditing(undefined); }}><form className="mr-form" onSubmit={submit}><div className="mr-dialog-body">{error && <div className="mr-alert error" role="alert">{error}</div>}<label>Tên tài xế *<input name="name" required maxLength={120} defaultValue={editing?.name} /></label><label>Điện thoại *<input name="phone" type="tel" required maxLength={30} defaultValue={editing?.phone} /></label><label>Trạng thái<select name="active" defaultValue={String(editing?.active ?? true)}><option value="true">Hoạt động</option><option value="false">Ngừng hoạt động</option></select></label></div><footer><button className="mr-button" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button></footer></form></Dialog>}
    {deleting && <Dialog title="Xác nhận xóa tài xế" close={() => { if (!saving) setDeleting(null); }}><div className="mr-dialog-body"><p>Xóa tài xế <strong>{deleting.name} · {deleting.phone}</strong> khỏi danh mục?</p><p>Tài xế đã có lịch phân công sẽ không thể xóa để giữ lịch sử.</p>{error && <div className="mr-alert error" role="alert">{error}</div>}<div className="mr-actions"><button className="mr-button danger secondary" disabled={saving} onClick={() => void remove()}>{saving ? 'Đang xóa…' : 'Xóa tài xế'}</button><button className="mr-button secondary" disabled={saving} onClick={() => setDeleting(null)}>Quay lại</button></div></div></Dialog>}
  </>;
}
