import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../lib/adapters/nodeAdapter';
import { errorMessage, todayVN, addDays } from '../meetings/api';
import { useAuth } from '../../context/AuthContext';
import { Dialog } from '../meetings/MeetingApp';
import './vehicles.css';

interface Resource { id: number; name: string; plate?: string; phone?: string; active: boolean; busy: boolean }
interface Assignment { vehicle_id: number; driver_id: number; plate?: string; vehicle_name?: string; driver_name?: string; driver_phone?: string }
interface Booking { id: number; booking_date: string; quantity: number; departure_point: string | null; departure_time: string | null; destination: string; purpose: string; phone: string; creator_name: string; status: string; reason: string | null; assignments: Assignment[] }
interface Day { today: string; can_manage: boolean; total: number; reserved: number; remaining: number; bookings: Booking[]; fleet: Resource[]; drivers: Resource[] }
interface Access { id: number; name: string; email: string; approver: boolean }
interface CalendarDay { date: string; total: number; reserved: number; remaining: number; bookings: Pick<Booking,'id'|'quantity'|'destination'|'status'>[] }
function weekStart(date:string) {
  const weekday=new Date(date+'T12:00:00Z').getUTCDay();
  return addDays(date,-((weekday+6)%7));
}
const formatDay=(date:string,options:Intl.DateTimeFormatOptions)=>new Date(date+'T12:00:00Z').toLocaleDateString('vi-VN',{...options,timeZone:'Asia/Ho_Chi_Minh'});
const labels: Record<string,string> = {pending:'Chờ duyệt',approved:'Đã duyệt',rejected:'Từ chối',cancelled:'Đã hủy'};
const base='/api/vehicles';

export function VehiclePage({view='calendar'}:{view?:'calendar'|'manage'}) {
  const { can }=useAuth();
  const admin=can('admin');
  const qc=useQueryClient();
  const [date,setDate]=useState(todayVN());
  const [endDate,setEndDate]=useState(addDays(todayVN(),29));
  const [status,setStatus]=useState('');
  const [search,setSearch]=useState('');
  const manage=view==='manage';
  const [week,setWeek]=useState(()=>weekStart(todayVN()));
  const [bookingOpen,setBookingOpen]=useState(false);
  const [tab,setTab]=useState('book');
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
  const [resource,setResource]=useState({id:0,name:'',plate:'',phone:'',active:true});
  const [deleting,setDeleting]=useState<Resource|null>(null);
  const day=useQuery({queryKey:['vehicles','day',date],queryFn:async()=> (await client.get<Day>(base+'/day',{params:{date}})).data,refetchInterval:15000});
  const calendar=useQuery({queryKey:['vehicles','calendar',week],queryFn:async()=> (await client.get<{today:string;days:CalendarDay[]}>(base+'/calendar',{params:{from:week,to:addDays(week,6)}})).data,enabled:!manage&&tab==='book',refetchInterval:15000});
  const bookings=useQuery({queryKey:['vehicles','bookings',date,endDate],queryFn:async()=> (await client.get<Booking[]>(base+'/bookings',{params:{from:date,to:endDate}})).data,enabled:manage&&can('manager-or-admin'),refetchInterval:15000});
  const visible=bookings.data?.filter(b=>(!status||b.status===status)&&`${b.id} ${b.destination} ${b.departure_point||''} ${b.creator_name} ${b.phone} ${b.purpose} ${b.assignments.map(a=>`${a.plate} ${a.driver_name}`).join(' ')}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))) || [];
  const access=useQuery({queryKey:['vehicles','access'],queryFn:async()=> (await client.get<Access[]>(base+'/access')).data,enabled:admin && tab==='access'});
  const reviewDay=useQuery({queryKey:['vehicles','day',review?.date],queryFn:async()=> (await client.get<Day>(base+'/day',{params:{date:review!.date}})).data,enabled:!!review,refetchInterval:15000});
  const selectedBooking=reviewDay.data?.bookings.find(b=>b.id===review?.id);
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
  function saveResource(e:FormEvent) {
    e.preventDefault();
    void perform(async()=>{
      const url=base+'/'+tab+(resource.id?'/'+resource.id:'');
      if(resource.id) await client.put(url,resource); else await client.post(url,resource);
      setResource({id:0,name:'',plate:'',phone:'',active:true});
    });
  }
  function deleteResource() {
    if(!deleting)return;
    const id=deleting.id;
    void perform(async()=>{
      await client.delete(base+'/'+tab+'/'+id);
      if(resource.id===id)setResource({id:0,name:'',plate:'',phone:'',active:true});
      setDeleting(null);
    });
  }
  if(manage&&!can('manager-or-admin')) return <Navigate to="/403" replace />;
  return <div className="vehicle-page">
    <div className="mr-between"><div><h1>{manage?'Quản lý đặt xe':'Đặt xe nhà máy'}</h1><p>{manage?'Theo dõi yêu cầu đặt xe, xem chi tiết và xử lý phê duyệt.':'Xem xe còn trống theo ngày, gửi yêu cầu và theo dõi phê duyệt.'}</p></div></div>
    {manage?<>
      <div className="vehicle-form vehicle-card">
        <label>Từ ngày<input type="date" required value={date} max={endDate} onChange={e=>{if(e.target.value)setDate(e.target.value);}}/></label>
        <label>Đến ngày<input type="date" required value={endDate} min={date} max={addDays(date,365)} onChange={e=>{if(e.target.value)setEndDate(e.target.value);}}/></label>
        <label>Trạng thái<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tất cả</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Tìm kiếm<input type="search" placeholder="Điểm đi, điểm đến, người đặt, biển số…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      </div>
      {bookings.isPending?<p>Đang tải…</p>:bookings.error?<div className="mr-alert error" role="alert">{errorMessage(bookings.error)} <button onClick={()=>void bookings.refetch()}>Thử lại</button></div>:<>
        <p>{visible.length} yêu cầu · {visible.filter(b=>b.status==='pending').length} chờ duyệt · {visible.filter(b=>b.status==='approved').length} đã duyệt</p>
        <div className="vehicle-management-scroll"><table className="vehicle-management-table">
          <thead><tr><th>Mã</th><th>Ngày / Giờ xuất phát</th><th>Người đặt</th><th>Hành trình</th><th>Số xe</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{visible.map(b=><tr key={b.id}>
            <td>#{b.id}</td><td>{formatDay(b.booking_date,{day:'2-digit',month:'2-digit',year:'numeric'})}<br/>{b.departure_time?.slice(0,5)||'Chưa có giờ'}</td>
            <td>{b.creator_name}<br/>{b.phone}</td><td>{b.departure_point||'Chưa có điểm xuất phát'} → {b.destination}</td><td>{b.quantity}</td><td><span className={'mr-badge '+b.status}>{labels[b.status]}</span></td>
            <td><button disabled={busy} onClick={()=>open(b,b.booking_date)}>Xem chi tiết</button></td>
          </tr>)}</tbody>
        </table></div>
        {!visible.length&&<p>Không có yêu cầu đặt xe phù hợp.</p>}
      </>}
    </>:<>
    <div className="vehicle-tabs">
      {[['book','Lịch và đặt xe'],...(admin?[['fleet','Danh mục xe'],['drivers','Tài xế'],['access','Người duyệt']]:[])].map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>{setTab(key);setError('');setResource({id:0,name:'',plate:'',phone:'',active:true});setReview(null);}}>{label}</button>)}
    </div>
    <div className="vehicle-date"><button aria-label={tab==='book'?'Tuần trước':'Ngày trước'} onClick={()=>{if(tab==='book'){setWeek(addDays(week,-7));setDate(addDays(week,-7));}else setDate(addDays(date,-1));setReview(null);}}>‹</button><label>{tab==='book'?'Lịch tuần':'Ngày sử dụng xe'} <input type="date" required value={date} onChange={e=>{if(e.target.value){setDate(e.target.value);setWeek(weekStart(e.target.value));setReview(null);}}}/></label><button aria-label={tab==='book'?'Tuần sau':'Ngày sau'} onClick={()=>{if(tab==='book'){setWeek(addDays(week,7));setDate(addDays(week,7));}else setDate(addDays(date,1));setReview(null);}}>›</button><button onClick={()=>{setDate(todayVN());setWeek(weekStart(todayVN()));setReview(null);}}>Hôm nay</button>{tab==='book'&&<strong>{formatDay(week,{day:'2-digit',month:'2-digit'})} – {formatDay(addDays(week,6),{day:'2-digit',month:'2-digit',year:'numeric'})}</strong>}</div>
    {(error||day.error||access.error||(tab==='book'&&calendar.error))&&<div role="alert" className="mr-alert error">{error||errorMessage(day.error||access.error||calendar.error)} <button onClick={()=>{void day.refetch();void calendar.refetch();if(admin&&tab==='access')void access.refetch();}}>Thử lại</button></div>}
    </>}
    {day.isPending?<p>Đang tải…</p>:d&&<>
      {!manage&&tab==='book'&&<>
        <div className="vehicle-calendar-scroll">
          {calendar.isPending?<p>Đang tải lịch xe…</p>:calendar.data&&<table className="vehicle-calendar"><caption>Lịch đặt xe theo tuần · Yêu cầu chờ duyệt cũng giữ chỗ xe</caption>
            <thead><tr>{calendar.data.days.map(c=><th key={c.date} className={c.date===calendar.data.today?'is-today':''}><span>{formatDay(c.date,{weekday:'long'})}</span><strong>{formatDay(c.date,{day:'2-digit',month:'2-digit'})}</strong>{c.date===calendar.data.today&&<small>Hôm nay</small>}</th>)}</tr></thead>
            <tbody><tr>{calendar.data.days.map(c=><td key={c.date} className={(c.date===date?'is-selected ':'')+(c.date<calendar.data.today?'is-past':'')}>
              <button className="vehicle-day-select" aria-pressed={c.date===date} onClick={()=>{setDate(c.date);setReview(null);}}>Xem ngày</button>
              <div className={'vehicle-availability '+(c.remaining?'available':'full')}><strong>{c.remaining>0?`Còn ${c.remaining} xe`:'Hết xe'}</strong><small>{c.reserved}/{c.total} xe đã giữ chỗ</small></div>
              <button className="vehicle-book-button" disabled={busy||calendar.isFetching||c.date<calendar.data.today||c.remaining<1} onClick={()=>{setDate(c.date);setQuantity(1);setError('');setReview(null);setBookingOpen(true);}}>+ Đặt xe</button>
              <div className="vehicle-calendar-bookings">{c.bookings.map(b=><button key={b.id} className={'vehicle-calendar-booking '+b.status} onClick={()=>open(b,c.date)}><strong>#{b.id} · {b.destination}</strong><small>{b.quantity} xe · {labels[b.status]}</small></button>)}</div>
            </td>)}</tr></tbody>
          </table>}
        </div>
        <div id="vehicle-day-details" className="mr-between"><h2>Ngày {formatDay(date,{day:'2-digit',month:'2-digit',year:'numeric'})}</h2><button className="mr-primary" disabled={busy||date<d.today||d.remaining<1} onClick={()=>{setError('');setQuantity(1);setBookingOpen(true);}}>+ Đặt xe</button></div>
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
          <button className="mr-primary" disabled={busy||day.isFetching||date<d.today||d.remaining<1||quantity>d.remaining}>{d.remaining<1?'Đã hết xe trong ngày':busy?'Đang gửi…':'Gửi yêu cầu đặt xe'}</button>
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
      {!manage&&admin&&['fleet','drivers'].includes(tab)&&<>
        <p>{tab==='fleet'?'Tổng xe được tính từ danh sách xe đang hoạt động. Thêm một dòng cho mỗi xe thực tế.':'Tạo tài xế để người duyệt phân công. Một tài xế chỉ phục vụ một yêu cầu mỗi ngày.'}</p>
        <form className="vehicle-card vehicle-form" onSubmit={saveResource}><h2>{resource.id?'Chỉnh sửa':'Thêm'} {tab==='fleet'?'xe':'tài xế'}</h2>
          <label>Tên {tab==='fleet'?'xe':'tài xế'}<input required maxLength={120} value={resource.name} onChange={e=>setResource({...resource,name:e.target.value})}/></label>
          {tab==='fleet'?<label>Biển số<input required maxLength={30} value={resource.plate} onChange={e=>setResource({...resource,plate:e.target.value})}/></label>:<label>Điện thoại<input required maxLength={30} value={resource.phone} onChange={e=>setResource({...resource,phone:e.target.value})}/></label>}
          <label className="vehicle-check"><input type="checkbox" checked={resource.active} onChange={e=>setResource({...resource,active:e.target.checked})}/>Đang hoạt động</label>
          <button className="mr-primary" disabled={busy}>Lưu</button>{resource.id>0&&<button type="button" onClick={()=>setResource({id:0,name:'',plate:'',phone:'',active:true})}>Thêm mới</button>}
        </form>
        {(tab==='fleet'?d.fleet:d.drivers).map(v=><article className="vehicle-card mr-between" key={v.id}><div><strong>{v.name}</strong><p>{v.plate||v.phone} · {v.active?'Hoạt động':'Ngừng hoạt động'}{v.busy?' · Đã phân công trong ngày':''}</p></div><div className="vehicle-tabs"><button disabled={busy} onClick={()=>setResource({id:v.id,name:v.name,plate:v.plate||'',phone:v.phone||'',active:v.active})}>Chỉnh sửa</button><button className="vehicle-delete" disabled={busy} onClick={()=>{setError('');setDeleting(v);}}>{tab==='fleet'?'Xóa xe':'Xóa tài xế'}</button></div></article>)}
        {deleting&&<Dialog title={tab==='fleet'?'Xác nhận xóa xe':'Xác nhận xóa tài xế'} close={()=>{if(!busy)setDeleting(null);}}><div className="mr-dialog-body"><p>Xóa {tab==='fleet'?'xe':'tài xế'} <strong>{deleting.name} · {deleting.plate||deleting.phone}</strong> khỏi danh mục? Thao tác này không thể hoàn tác.</p><p>{tab==='fleet'?'Xe đã có lịch phân công hoặc việc xóa làm thiếu xe cho các yêu cầu đang giữ chỗ sẽ không được xóa.':'Tài xế đã có lịch phân công sẽ không được xóa để giữ lịch sử.'}</p>{error&&<div role="alert" className="mr-alert error">{error}</div>}<div className="vehicle-tabs"><button className="vehicle-delete" disabled={busy} onClick={deleteResource}>{busy?'Đang xóa…':tab==='fleet'?'Xóa xe':'Xóa tài xế'}</button><button disabled={busy} onClick={()=>{setDeleting(null);setError('');}}>Quay lại</button></div></div></Dialog>}
      </>}
      {admin&&tab==='access'&&<><h2>Chỉ định người duyệt đặt xe</h2><p>Admin luôn có quyền duyệt. Người được chỉ định có thể xem yêu cầu, duyệt và phân xe, tài xế.</p>{access.isPending?<p>Đang tải…</p>:access.data?.map(u=><label className="vehicle-card vehicle-check" key={u.id}><input type="checkbox" disabled={busy} checked={u.approver} onChange={e=>{const approver=e.target.checked;void perform(()=>client.put(base+'/access/'+u.id,{approver}));}}/>{u.name} · {u.email}</label>)}</>}
    </>}
  </div>;
}
