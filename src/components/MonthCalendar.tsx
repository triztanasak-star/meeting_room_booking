import type { ReactNode } from 'react';
import { addDays } from '../features/meetings/api';
import './monthCalendar.css';

export function monthRange(date: string) {
  const first = date.slice(0, 7) + '-01';
  const next = new Date(first + 'T12:00:00Z');
  next.setUTCMonth(next.getUTCMonth() + 1);
  const last = addDays(next.toISOString().slice(0, 10), -1);
  const start = addDays(first, -((new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7));
  const end = addDays(last, 6 - ((new Date(last + 'T12:00:00Z').getUTCDay() + 6) % 7));
  return { start, end };
}
export function moveMonth(date: string, amount: number) {
  const next = new Date(date.slice(0, 7) + '-01T12:00:00Z');
  next.setUTCMonth(next.getUTCMonth() + amount);
  return next.toISOString().slice(0, 10);
}
export function MonthCalendar({ date, today, locale = 'vi-VN', renderDay, sidebar }: {
  date: string; today: string; locale?: string; renderDay: (day: string) => ReactNode; sidebar?: ReactNode;
}) {
  const { start, end } = monthRange(date);
  const weeks: string[][] = [];
  for (let day = start; day <= end; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
  }
  return <div className="month-calendar-layout">{sidebar && <aside className="month-resource-sidebar">{sidebar}</aside>}<div className="month-calendar-scroll"><table className="month-calendar">
    <caption>{new Date(date + 'T12:00:00Z').toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })}</caption>
    <thead><tr>{weeks[0].map(day => <th key={day} scope="col">{new Date(day + 'T12:00:00Z').toLocaleDateString(locale, { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' })}</th>)}</tr></thead>
    <tbody>{weeks.map(week => <tr key={week[0]}>{week.map(day => <td key={day} className={(day.slice(0, 7) !== date.slice(0, 7) ? 'outside-month ' : '') + (day === today ? 'month-today' : '')}>
      <time dateTime={day} className="month-day-number">{Number(day.slice(8))}{day.slice(0, 7) !== date.slice(0, 7) ? '/' + Number(day.slice(5, 7)) : ''}</time>
      <div className="month-day-content">{renderDay(day)}</div>
    </td>)}</tr>)}</tbody>
  </table></div></div>;
}
