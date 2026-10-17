import { useRef, useState } from 'react';

export default function useCompletionConfirmation() {
  const [date, setDate] = useState<string | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const finish = (value: boolean) => {
    setDate(null);
    resolver.current?.(value);
    resolver.current = null;
  };
  const confirmCompletion = (value: string) => new Promise<boolean>(resolve => {
    resolver.current = resolve;
    setDate(value);
  });
  const dialog = date === null ? null : (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.stopPropagation()} onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        if (e.key === 'Tab') {
          const buttons = e.currentTarget.querySelectorAll('button');
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }}>
      <div role="alertdialog" aria-modal="true" aria-label="Xác nhận hoàn thành dự án" className="card shadow" style={{ width: 460, maxWidth: '100%' }}>
        <div className="card-body">
          <h5>Xác nhận hoàn thành dự án</h5>
          <p>Nhiệm vụ cuối cùng đã đạt <strong>100%</strong>. Bạn có xác nhận dự án đã hoàn thành?</p>
          <p>Ngày hoàn thành thực tế: <strong>{date.split('T')[0].split('-').reverse().join('/')}</strong></p>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" autoFocus onClick={() => finish(false)}>Hủy</button>
            <button type="button" className="btn btn-success" onClick={() => finish(true)}>Xác nhận hoàn thành</button>
          </div>
        </div>
      </div>
    </div>
  );
  return { confirmCompletion, dialog };
}
