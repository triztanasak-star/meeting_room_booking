import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiPlus, FiMapPin, FiCheck, FiCalendar, FiSearch } from 'react-icons/fi';
import client from '../../lib/adapters/nodeAdapter';
import { addDays, errorMessage, todayVN } from '../meetings/api';
import { Dialog } from '../meetings/MeetingApp';

interface Booking {
  id: number; booking_date: string; quantity: number; destination: string; departure_point: string | null;
  departure_time: string | null; purpose: string; phone: string; creator_name: string; status: string; reason: string | null;
  assignments: { vehicle_id: number; vehicle_name: string; plate: string; driver_name: string; driver_phone: string }[];
}
const labels: Record<string, string> = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy' };
export function MyVehicleBookingsPage() {
  const qc = useQueryClient();
  const [from, setFrom] = useState(todayVN());
  const [to, setTo] = useState(addDays(todayVN(), 29));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const bookings = useQuery({ queryKey: ['vehicles', 'mine', from, to], queryFn: async () => (await client.get<Booking[]>('/api/vehicles/bookings', { params: { from, to, mine: 'true' } })).data, refetchInterval: 15000 });
  const visible = (bookings.data || []).filter(b => (!status || b.status === status) && `${b.id} ${b.destination} ${b.departure_point || ''} ${b.purpose} ${b.assignments.map(a => `${a.plate} ${a.driver_name}`).join(' ')}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const detail = bookings.data?.find(b => b.id === detailId);
  async function cancel(event: FormEvent) {
    event.preventDefault(); if (!detail || saving || !reason.trim()) return;
    setSaving(true); setError('');
    try {
      await client.patch(`/api/vehicles/bookings/${detail.id}`, { action: 'cancel', reason });
      await qc.invalidateQueries({ queryKey: ['vehicles'] });
      setDetailId(null); setMessage('Đã hủy yêu cầu đặt xe.');
    } catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
  }
  return <>
    <div className="mr-page-heading"><div><p className="mr-eyebrow">VEHICLE BOOKING</p><h1>Lịch đặt xe của tôi</h1><p className="mr-muted">Theo dõi các yêu cầu đặt xe và thông tin xe, tài xế được phân công của bạn.</p></div><Link className="mr-button" to="/vehicles"><FiPlus />Đặt xe</Link></div>
    {message && <div className="mr-alert success" role="status">{message}</div>}
    <div className="mr-stats">{[['Yêu cầu đặt xe', visible.length, FiMapPin], ['Đã duyệt', visible.filter(b => b.status === 'approved').length, FiCheck], ['Chờ duyệt', visible.filter(b => b.status === 'pending').length, FiCalendar]].map(([label, value, Icon]) => { const I = Icon as typeof FiMapPin; return <div key={String(label)}><span className="mr-stat-icon"><I /></span><div><span>{String(label)}</span><strong>{String(value)}</strong></div><small>Danh sách</small></div>; })}</div>
    <section className="mr-panel">
      <div className="mr-toolbar"><div className="mr-site-tabs"><button className="active">Tất cả xe</button></div><label className="mr-search"><FiSearch /><input aria-label="Tìm lịch đặt xe" placeholder="Tìm điểm đến, biển số xe…" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
      <div className="mr-list-filters"><label>Từ ngày<input type="date" value={from} max={to} onChange={e => { if (e.target.value) setFrom(e.target.value); }} /></label><label>Đến ngày<input type="date" value={to} min={from} max={addDays(from, 365)} onChange={e => { if (e.target.value) setTo(e.target.value); }} /></label><label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      {bookings.error ? <div className="mr-alert error" role="alert">{errorMessage(bookings.error)} <button className="mr-button secondary" onClick={() => void bookings.refetch()}>Thử lại</button></div> : bookings.isPending ? <p className="mr-empty">Đang tải…</p> : <div className="mr-table-scroll"><table className="mr-table"><thead><tr><th>Hành trình</th><th>Xe / Tài xế</th><th>Ngày đặt xe</th><th>Giờ xuất phát</th><th>Số xe</th><th>Trạng thái</th></tr></thead><tbody>{visible.map(b => <tr key={b.id}><td><button className="mr-link" onClick={() => { setDetailId(b.id); setReason(''); setError(''); }}>{b.destination}</button><small>#{b.id} · {b.departure_point || 'Chưa có điểm xuất phát'}</small></td><td>{b.assignments.length ? b.assignments.map(a => <div key={a.vehicle_id}>{a.vehicle_name} · {a.plate}<small>{a.driver_name} · {a.driver_phone}</small></div>) : 'Chưa phân công'}</td><td>{b.booking_date}</td><td>{b.departure_time?.slice(0, 5) || '—'}</td><td>{b.quantity}</td><td><span className={'mr-badge ' + b.status}>{labels[b.status]}</span></td></tr>)}</tbody></table>{!visible.length && <p className="mr-empty">Không có lịch đặt trong khoảng thời gian này.</p>}</div>}
    </section>
    {detail && <Dialog title="Chi tiết đặt xe của tôi" close={() => { if (!saving) setDetailId(null); }}><div className="mr-dialog-body"><div className="mr-between"><h3>#{detail.id} · {detail.destination}</h3><span className={'mr-badge ' + detail.status}>{labels[detail.status]}</span></div><p>Ngày sử dụng: {detail.booking_date} · {detail.quantity} xe</p><p>Điểm xuất phát: {detail.departure_point || '—'} · {detail.departure_time?.slice(0, 5) || '—'}</p><p>Người đặt: {detail.creator_name} · {detail.phone}</p><p>Mục đích: {detail.purpose}</p>{detail.assignments.map(a => <p key={a.vehicle_id}>Xe: {a.vehicle_name} · {a.plate}<br />Tài xế: {a.driver_name} · {a.driver_phone}</p>)}{detail.reason && <p>Lý do: {detail.reason}</p>}{['pending', 'approved'].includes(detail.status) && detail.booking_date >= todayVN() && <form className="mr-form" onSubmit={cancel}>{error && <div className="mr-alert error" role="alert">{error}</div>}<label>Lý do hủy<textarea required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label><button className="mr-button danger secondary" disabled={saving || !reason.trim()}>{saving ? 'Đang hủy…' : 'Hủy yêu cầu'}</button></form>}<button className="mr-button secondary" disabled={saving} onClick={() => setDetailId(null)}>Đóng</button></div></Dialog>}
  </>;
}
