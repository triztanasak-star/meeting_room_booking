import { MonthCalendar, monthRange, moveMonth } from '../../components/MonthCalendar';
import { useState, type FormEvent } from 'react';
import { FiPlus, FiMapPin, FiCheck, FiCalendar, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../lib/adapters/nodeAdapter';
import { errorMessage, todayVN, addDays } from '../meetings/api';
import { useAuth } from '../../context/AuthContext';
import { Dialog } from '../meetings/MeetingApp';
import './vehicles.css';

interface Resource { id: number; name: string; plate?: string; image?: string | null; seats?: number | null; phone?: string; active: boolean; busy: boolean }
interface Assignment { vehicle_id: number; driver_id: number; plate?: string; vehicle_name?: string; driver_name?: string; driver_phone?: string }
interface Booking { id: number; booking_date: string; quantity: number; departure_point: string | null; departure_time: string | null; destination: string; purpose: string; phone: string; creator_name: string; status: string; reason: string | null; assignments: Assignment[] }
interface Day { today: string; can_manage: boolean; total: number; reserved: number; remaining: number; bookings: Booking[]; fleet: Resource[]; drivers: Resource[] }
interface CalendarDay { date: string; total: number; reserved: number; remaining: number; bookings: Pick<Booking,'id'|'quantity'|'destination'|'status'>[] }
const formatDay=(date:string,options:Intl.DateTimeFormatOptions)=>new Date(date+'T12:00:00Z').toLocaleDateString('vi-VN',{...options,timeZone:'Asia/Ho_Chi_Minh'});
const labels: Record<string,string> = {pending:'Chờ duyệt',approved:'Đã duyệt',rejected:'Từ chối',cancelled:'Đã hủy'};
const base='/api/vehicles';

export function VehiclePage({view='calendar'}:{view?:'calendar'|'manage'}) {
  const { can }=useAuth();
  const qc=useQueryClient();
  const [date,setDate]=useState(todayVN());
  const [endDate,setEndDate]=useState(addDays(todayVN(),29));
  const [status,setStatus]=useState('');
  const [search,setSearch]=useState('');
  const manage=view==='manage';
  const [month,setMonth]=useState(todayVN());
  const range=monthRange(month);
  const [bookingOpen,setBookingOpen]=useState(false);
  const tab='book';
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [quantity,setQuantity]=useState(1);
  const [destination,setDestination]=useState('');
  const [departurePoint,setDeparturePoint]=useState('');
  const [departureTime,setDepartureTime]=useState('');
  const [purpose,setPurpose]=useState('');
  const [phone,setPhone]=useState('');
  const [review,setReview]=useState<{id:number;date:string}|null>(null);
  const [assignments,setAssignments]=useState<Assignment[]>([]);
  const [reason,setReason]=useState('');
  const day=useQuery({queryKey:['vehicles','day',date],queryFn:async()=> (await client.get<Day>(base+'/day',{params:{date}})).data,refetchInterval:15000});
  const calendar=useQuery({queryKey:['vehicles','calendar',range.start,range.end],queryFn:async()=> (await client.get<{today:string;days:CalendarDay[]}>(base+'/calendar',{params:{from:range.start,to:range.end}})).data,enabled:!manage&&tab==='book',refetchInterval:15000});
  const bookings=useQuery({queryKey:['vehicles','bookings',date,endDate],queryFn:async()=> (await client.get<Booking[]>(base+'/bookings',{params:{from:date,to:endDate}})).data,enabled:manage&&can('manager-or-admin'),refetchInterval:15000});
  const visible=bookings.data?.filter(b=>(!status||b.status===status)&&`${b.id} ${b.destination} ${b.departure_point||''} ${b.creator_name} ${b.phone} ${b.purpose} ${b.assignments.map(a=>`${a.plate} ${a.driver_name}`).join(' ')}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))) || [];
  const reviewDay=useQuery({queryKey:['vehicles','day',review?.date],queryFn:async()=> (await client.get<Day>(base+'/day',{params:{date:review!.date}})).data,enabled:!!review,refetchInterval:15000});
  const selectedBooking=reviewDay.data?.bookings.find(b=>b.id===review?.id);
  const settings=useQuery({queryKey:['vehicles','booking-settings'],queryFn:async()=> (await client.get<{minimum_notice_days:number}>(base+'/booking-settings')).data,enabled:!manage,refetchInterval:15000});
  const earliestDate=settings.data ? addDays(day.data?.today || todayVN(),settings.data.minimum_notice_days) : null;
  const d=day.data;
  async function perform(fn:()=>Promise<unknown>) {
    setBusy(true);setError('');
    try { await fn(); await qc.invalidateQueries({queryKey:['vehicles']}); }
    catch(e){setError(errorMessage(e));} finally {setBusy(false);}
  }
  function book(e:FormEvent) {
    e.preventDefault();
    void perform(async()=>{await client.post(base+'/bookings',{booking_date:date,quantity,departure_point:departurePoint,departure_time:departureTime,destination,purpose,phone});setBookingOpen(false);setDeparturePoint('');setDepartureTime('');setDestination('');setPurpose('');setQuantity(1);});
  }
  function action(b:Booking, action:string) {
    void perform(async()=>{await client.patch(base+'/bookings/'+b.id,{action,reason,assignments});setReview(null);setReason('');});
  }
  function open(b:Pick<Booking,'id'|'quantity'>, bookingDate:string) {setReview({id:b.id,date:bookingDate});setReason('');setAssignments(Array.from({length:b.quantity},()=>({vehicle_id:0,driver_id:0})));setError('');}
  function closeReview() {if(!busy){setReview(null);setError('');}}
  if(manage&&!can('manager-or-admin')) return <Navigate to="/403" replace />;
  return <div className={manage ? "vehicle-page vehicle-management-page" : "vehicle-page vehicle-calendar-page"}>
    <div className="mr-page-heading"><div><p className="mr-eyebrow">VEHICLE BOOKING</p><h1>{manage?'Quản lý đặt xe':'Lịch đặt xe'}</h1><p className="mr-muted">{manage?'Theo dõi yêu cầu đặt xe, xem chi tiết và xử lý phê duyệt.':'Xem lịch xe nhà máy, đặt xe và theo dõi phê duyệt.'}</p></div>{!manage&&<button className="mr-button" disabled={busy||!d||(!earliestDate||date<earliestDate)||d.remaining<1} onClick={()=>{setError('');setQuantity(1);setBookingOpen(true);}}><FiPlus />Đặt xe</button>}</div>
    <div className="mr-stats">{[
      ['Xe hoạt động', d?.total ?? 0, FiMapPin],
      ['Đã duyệt', manage ? visible.filter(b=>b.status==='approved').length : calendar.data?.days.reduce((n,day)=>n+day.bookings.filter(b=>b.status==='approved').length,0) ?? 0, FiCheck],
      ['Chờ duyệt', manage ? visible.filter(b=>b.status==='pending').length : calendar.data?.days.reduce((n,day)=>n+day.bookings.filter(b=>b.status==='pending').length,0) ?? 0, FiCalendar],
    ].map(([label,value,Icon])=>{const I=Icon as typeof FiMapPin;return <div key={String(label)}><span className="mr-stat-icon"><I /></span><div><span>{String(label)}</span><strong>{String(value)}</strong></div><small>{label==='Xe hoạt động'?'Xe nhà máy':manage?'Danh sách':'Lịch tháng'}</small></div>;})}</div>

    {manage?<>
      <section className="mr-panel">
        <div className="mr-toolbar">
          <div className="mr-site-tabs"><button className="active" onClick={()=>{setStatus('');setSearch('');}}>Tất cả</button></div>
          <label className="mr-search"><FiSearch /><input type="search" aria-label="Tìm yêu cầu đặt xe" placeholder="Tìm điểm đi, điểm đến, người đặt, biển số…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
        </div>
        <div className="mr-list-filters">
          <label>Từ ngày<input type="date" required value={date} max={endDate} onChange={e=>{if(e.target.value)setDate(e.target.value);}}/></label>
          <label>Đến ngày<input type="date" required value={endDate} min={date} max={addDays(date,365)} onChange={e=>{if(e.target.value)setEndDate(e.target.value);}}/></label>
          <label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        {bookings.isPending?<p className="mr-empty">Đang tải…</p>:bookings.error?<div className="mr-alert error" role="alert">{errorMessage(bookings.error)} <button onClick={()=>void bookings.refetch()}>Thử lại</button></div>:
          <div className="mr-table-scroll"><table className="mr-table">
            <thead><tr><th>Hành trình</th><th>Số xe</th><th>Ngày sử dụng</th><th>Giờ xuất phát</th><th>Người đặt</th><th>Trạng thái</th></tr></thead>
            <tbody>{visible.map(b=><tr key={b.id}>
              <td><button className="mr-link" disabled={busy} onClick={()=>open(b,b.booking_date)}>{b.destination}</button><small>#{b.id} · {b.departure_point||'Chưa có điểm xuất phát'}</small></td>
              <td>{b.quantity} xe</td>
              <td>{formatDay(b.booking_date,{day:'2-digit',month:'2-digit',year:'numeric'})}</td>
              <td>{b.departure_time?.slice(0,5)||'Chưa có giờ'}</td>
              <td>{b.creator_name}<small>{b.phone}</small></td>
              <td><span className={'mr-badge '+b.status}>{labels[b.status]}</span></td>
            </tr>)}</tbody>
          </table>{!visible.length&&<p className="mr-empty">Không có lịch đặt xe trong khoảng thời gian này.</p>}</div>
        }
      </section>
    </>:<>
    <section className="mr-panel">
    <div className="mr-toolbar"><label className="mr-search"><FiSearch /><input aria-label="Tìm điểm đến, mã đặt xe" placeholder="Tìm điểm đến, mã đặt xe…" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
    <div className="mr-calendar-controls"><div className="mr-actions"><button className="mr-button secondary compact" onClick={()=>{setDate(todayVN());setMonth(todayVN());setReview(null);}}>Hôm nay</button><button className="mr-icon" aria-label="Tháng trước" onClick={()=>{setMonth(moveMonth(month,-1));setReview(null);}}><FiChevronLeft /></button><input aria-label="Ngày sử dụng xe" type="date" required value={date} onChange={e=>{if(e.target.value){setDate(e.target.value);setMonth(e.target.value);setReview(null);}}}/><button className="mr-icon" aria-label="Tháng sau" onClick={()=>{setMonth(moveMonth(month,1));setReview(null);}}><FiChevronRight /></button></div><div className="mr-legend"><span className="approved">Đã duyệt</span><span className="pending">Chờ duyệt</span></div></div>

    {settings.data && <p className="mr-muted">{settings.data.minimum_notice_days ? `Phải đặt xe trước ít nhất ${settings.data.minimum_notice_days} ngày. Ngày có thể đặt sớm nhất: ${formatDay(earliestDate!,{day:'2-digit',month:'2-digit',year:'numeric'})}.` : 'Có thể đặt xe bất kỳ lúc nào, không yêu cầu số ngày đặt trước.'}</p>}
    {(error||day.error||settings.error||(tab==='book'&&calendar.error))&&<div role="alert" className="mr-alert error">{error||errorMessage(day.error||settings.error||calendar.error)} <button onClick={()=>{void day.refetch();void calendar.refetch();void settings.refetch();}}>Thử lại</button></div>}
    </section></>}
    {day.isPending?<p>Đang tải…</p>:d&&<>
      {!manage&&tab==='book'&&<>
        {calendar.isPending?<p>Đang tải lịch xe…</p>:calendar.data&&<>
          <section className="mr-panel vehicle-month-panel"><MonthCalendar date={month} today={calendar.data.today} sidebar={<>
            <h3>Xe nhà máy</h3>
            {d.fleet.map(vehicle => <article className="month-resource-card" key={vehicle.id}>
              <img src={vehicle.image || "/factory-car.svg"} alt={vehicle.name} loading="lazy" />
              <strong>{vehicle.name}</strong><small>Biển số xe: {vehicle.plate || "Chưa cập nhật"}</small><small>Số ghế: {vehicle.seats ?? "Chưa cập nhật"}</small>
              <small>{vehicle.active?'Đang hoạt động':'Ngừng hoạt động'}</small>
            </article>)}
          </>} renderDay={day=>{
            const c=calendar.data.days.find(c=>c.date===day);
            if(!c)return null;
            return <>
              {c.bookings.filter(b=>`${b.id} ${b.destination}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))).map(b=><button key={b.id} className={'mr-event '+b.status} title={`#${b.id} · ${b.destination} · ${b.quantity} xe · ${labels[b.status]}`} onClick={()=>open(b,c.date)}><strong>#{b.id} · {b.destination}</strong><small>{b.quantity} xe · {labels[b.status]}</small></button>)}
              <div className={'vehicle-availability '+(c.remaining?'available':'full')}><strong>{c.remaining>0?`Còn ${c.remaining} xe`:'Hết xe'}</strong><small>{c.reserved}/{c.total} xe đã giữ chỗ</small></div>
              <button className="mr-book-slot" disabled={busy||calendar.isFetching||(!earliestDate||c.date<earliestDate)||c.remaining<1} onClick={()=>{setDate(c.date);setQuantity(1);setError('');setReview(null);setBookingOpen(true);}}><FiPlus /> Đặt xe</button>
              <button className="vehicle-day-select" aria-pressed={c.date===date} onClick={()=>{setDate(c.date);setReview(null);}}>Xem ngày</button>
            </>;
          }}/></section>
          <p className="mr-muted">Yêu cầu chờ duyệt cũng giữ chỗ xe.</p>
        </>}
        <div id="vehicle-day-details" className="mr-between"><h2>Ngày {formatDay(date,{day:'2-digit',month:'2-digit',year:'numeric'})}</h2><button className="mr-primary" disabled={busy||(!earliestDate||date<earliestDate)||d.remaining<1} onClick={()=>{setError('');setQuantity(1);setBookingOpen(true);}}><FiPlus /> Đặt xe</button></div>
        <div className="vehicle-stats"><article><strong>{d.total}</strong>Xe hoạt động</article><article><strong>{d.reserved}</strong>Xe đã giữ chỗ</article><article><strong>{d.remaining}</strong>Xe còn trống</article></div>
        <p>Đặt theo ngày, mỗi xe phục vụ một yêu cầu trong ngày. Yêu cầu chờ duyệt cũng giữ số lượng xe. Người duyệt sẽ chọn xe và tài xế cụ thể.</p>
        {bookingOpen&&<Dialog title={'Đặt xe · '+formatDay(date,{day:'2-digit',month:'2-digit',year:'numeric'})} close={()=>{if(!busy)setBookingOpen(false);}}><form className="mr-dialog-body vehicle-form" onSubmit={book}>
          <p className="vehicle-form-wide">Còn {d.remaining} xe trong ngày. Gửi yêu cầu để người duyệt phân xe và tài xế.</p>
          {error&&<div className="mr-alert error vehicle-form-wide" role="alert">{error}</div>}
          <label>Số lượng xe <input type="number" required min={1} max={Math.max(1,d.remaining)} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
          <label>Điểm đến <input required maxLength={500} value={destination} onChange={e=>setDestination(e.target.value)}/></label>
          <label>Điểm xuất phát <input required maxLength={500} value={departurePoint} onChange={e=>setDeparturePoint(e.target.value)}/></label>
          <label>Thời gian xuất phát <input required type="time" value={departureTime} onChange={e=>setDepartureTime(e.target.value)}/></label>
          <label>Điện thoại liên hệ <input required type="tel" maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
          <label>Mục đích chuyến đi <textarea required maxLength={2000} value={purpose} onChange={e=>setPurpose(e.target.value)}/></label>
          <button className="mr-primary" disabled={busy||day.isFetching||(!earliestDate||date<earliestDate)||d.remaining<1||quantity>d.remaining}>{d.remaining<1?'Đã hết xe trong ngày':busy?'Đang gửi…':'Gửi yêu cầu đặt xe'}</button>
          <button type="button" disabled={busy} onClick={()=>setBookingOpen(false)}>Đóng</button>
        </form></Dialog>}
        <h2>{d.can_manage?'Quản lý yêu cầu trong ngày':'Yêu cầu của tôi trong ngày'}</h2>
        {!d.bookings.length&&<p>Chưa có yêu cầu trong ngày này.</p>}
        {d.bookings.map(b=><article className="vehicle-card" key={b.id}>
          <div className="mr-between"><h3>#{b.id} · {b.destination}</h3><span className={'mr-badge '+b.status}>{labels[b.status]}</span></div>
          <p>{b.quantity} xe · Người đặt: {b.creator_name} · {b.phone}</p><p>{b.purpose}</p>
          <p>Điểm xuất phát: {b.departure_point || 'Chưa có thông tin'} · Thời gian xuất phát: {b.departure_time?.slice(0,5) || 'Chưa có thông tin'}</p>
          {b.assignments.map(a=><p key={a.vehicle_id}>Xe: {a.vehicle_name} · {a.plate} — Tài xế: {a.driver_name} · {a.driver_phone}</p>)}
          {b.reason&&<p>Lý do: {b.reason}</p>}
          <button disabled={busy} onClick={()=>open(b,date)}>Xem chi tiết</button>
        </article>)}
      </>}
      {review&&<Dialog title="Chi tiết đặt xe" close={closeReview}><div className="mr-dialog-body">
        {reviewDay.isPending?<p>Đang tải…</p>:reviewDay.error?<div role="alert" className="mr-alert error">{errorMessage(reviewDay.error)} <button onClick={()=>void reviewDay.refetch()}>Thử lại</button></div>:selectedBooking&&reviewDay.data?(()=>{
          const b=selectedBooking;
          const actionable=['pending','approved'].includes(b.status)&&b.booking_date>=reviewDay.data.today;
          return <>
            <div className="mr-between"><h3>#{b.id} · {b.destination}</h3><span className={'mr-badge '+b.status}>{labels[b.status]}</span></div>
            <p>Ngày sử dụng: {formatDay(b.booking_date,{day:'2-digit',month:'2-digit',year:'numeric'})} · {b.quantity} xe</p>
            <p>Người đặt: {b.creator_name} · {b.phone}</p>
            <p>Điểm xuất phát: {b.departure_point || 'Chưa có thông tin'}</p>
            <p>Thời gian xuất phát: {b.departure_time?.slice(0,5) || 'Chưa có thông tin'}</p>
            <p>Điểm đến: {b.destination}</p><p>Mục đích chuyến đi: {b.purpose}</p>
            {b.assignments.map(a=><p key={a.vehicle_id}>Xe: {a.vehicle_name} · {a.plate} — Tài xế: {a.driver_name} · {a.driver_phone}</p>)}
            {b.reason&&<p>Lý do: {b.reason}</p>}
            {error&&<div role="alert" className="mr-alert error">{error}</div>}
            {actionable&&<div className="vehicle-review">
            {reviewDay.data!.can_manage&&b.status==='pending'&&<><h3>Chọn {b.quantity} xe và tài xế</h3>{assignments.map((a,i)=><div className="vehicle-assignment" key={i}>
              <label>Xe {i+1}<select value={a.vehicle_id} onChange={e=>setAssignments(old=>old.map((x,j)=>j===i?{...x,vehicle_id:Number(e.target.value)}:x))}><option value={0}>Chọn xe</option>{reviewDay.data!.fleet.filter(v=>v.active&&!v.busy).map(v=><option key={v.id} value={v.id} disabled={assignments.some((x,j)=>j!==i&&x.vehicle_id===v.id)}>{v.name} · {v.plate}</option>)}</select></label>
              <label>Tài xế {i+1}<select value={a.driver_id} onChange={e=>setAssignments(old=>old.map((x,j)=>j===i?{...x,driver_id:Number(e.target.value)}:x))}><option value={0}>Chọn tài xế</option>{reviewDay.data!.drivers.filter(v=>v.active&&!v.busy).map(v=><option key={v.id} value={v.id} disabled={assignments.some((x,j)=>j!==i&&x.driver_id===v.id)}>{v.name} · {v.phone}</option>)}</select></label>
            </div>)}<button className="mr-primary" disabled={busy||assignments.some(a=>!a.vehicle_id||!a.driver_id)} onClick={()=>action(b,'approve')}>Duyệt và phân xe</button></>}
            <label>Lý do từ chối / hủy<textarea maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
            <div className="vehicle-tabs">{reviewDay.data!.can_manage&&b.status==='pending'&&<button disabled={busy||!reason.trim()} onClick={()=>action(b,'reject')}>Từ chối</button>}<button disabled={busy||!reason.trim()} onClick={()=>action(b,'cancel')}>Hủy yêu cầu</button><button disabled={busy} onClick={()=>closeReview()}>Đóng</button></div>
            </div>}
          </>;
        })():<p>Yêu cầu không còn tồn tại hoặc bạn không có quyền xem.</p>}
        <button disabled={busy} onClick={closeReview}>Đóng</button>
      </div></Dialog>}

    </>}
  </div>;
}
