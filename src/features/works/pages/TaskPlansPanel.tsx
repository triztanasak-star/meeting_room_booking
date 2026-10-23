import ExpandablePlanName from '../../../components/ExpandablePlanName';
import useCompletionConfirmation from '../../../components/useCompletionConfirmation';
import { useMemo, useState, useRef, useEffect, type FormEvent } from 'react';
import { useCreateTaskPlan, useDeleteTaskPlan, useTaskPlans, useUpdateTaskPlan } from '../hooks/useWorks';
import EmptyState from '../../../components/EmptyState';
import type { TaskPlan } from '../../../lib/db';

const STATUS_LABEL: Record<TaskPlan['status'], string> = {
  pending: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  done: 'Hoàn thành',
};

export default function TaskPlansPanel({ workId, canEdit }: { workId: number; canEdit: boolean }) {
  const { confirmCompletion, dialog } = useCompletionConfirmation();
  const { data, isLoading } = useTaskPlans(workId);
  const createPlan = useCreateTaskPlan();
  const updatePlan = useUpdateTaskPlan(workId);
  const deletePlan = useDeleteTaskPlan(workId);

  const [stepName, setStepName] = useState('');
  const [dueDate, setDueDate] = useState('');  // 👈 STATE NGÀY
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [stepName]);

  const plans = useMemo(() => {
    const raw = data?.documents ?? [];
    return [...raw].sort((a, b) => (a.step_order - b.step_order) || (a.id ?? 0) - (b.id ?? 0));
  }, [data]);

  const averagePercent = useMemo(() => {
    if (plans.length === 0) return null;
    return Math.round(plans.reduce((sum, p) => sum + p.progress_percent, 0) / plans.length);
  }, [plans]);

  const saveProgress = async (plan: TaskPlan, value: number) => {
    if (!Number.isFinite(value) || value < 0 || value > 100) return false;
    const completing = plans.at(-1)?.id === plan.id && value === 100 && plan.progress_percent !== 100;
    if (completing) {
      if (!plan.due_date) { window.alert('Vui lòng chọn ngày hoàn thành của nhiệm vụ cuối cùng.'); return false; }
      if (!await confirmCompletion(plan.due_date!)) return false;
    }
    updatePlan.mutate({ id: plan.id, payload: {
      progress_percent: value,
      status: value === 100 ? 'done' : value > 0 ? 'in_progress' : 'pending',
      confirm_completion: completing,
    } });
    return true;
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!stepName.trim()) return;

    await createPlan.mutateAsync({
      workId,
      payload: {
        step_name: stepName,
        step_order: Math.max(0, ...plans.map(plan => plan.step_order)) + 1,
        ...(dueDate && { due_date: dueDate }),  // 👈 CHỈ GỬI KHI CÓ NGÀY
      },
    });

    setStepName('');
    setDueDate('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="mt-3">
      {dialog}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Kế hoạch thực hiện (hạng mục)</h6>
        {averagePercent !== null && (
          <span className="text-muted small">
            Tổng tiến độ trung bình: <strong>{averagePercent}%</strong>
          </span>
        )}
      </div>

      {canEdit && (
        <form className="d-flex gap-2 mb-3 align-items-start" onSubmit={handleAdd}>
          <textarea
            ref={textareaRef}
            className="form-control form-control-sm"
            placeholder="Thêm hạng mục mới..."
            value={stepName}
            onChange={(e) => setStepName(e.target.value)}
            rows={1}
            style={{
              resize: 'none',
              overflow: 'hidden',
              minHeight: '31px',
              lineHeight: '1.5',
              paddingTop: '4px',
              paddingBottom: '4px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              flex: 1,
            }}
          />

          {/* 👇 INPUT DATE - FORM THÊM MỚI */}
          <input
            type="date"
            className="form-control form-control-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ width: 150, flexShrink: 0 }}
            title="Ngày hoàn thành dự kiến"
          />

          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={createPlan.isPending}
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Thêm
          </button>
        </form>
      )}

      {isLoading && <div className="text-muted small">Đang tải kế hoạch...</div>}
      {!isLoading && plans.length === 0 && <EmptyState message="Chưa có hạng mục nào." />}

      <ul className="list-group">
        {plans.map((plan) => (
          <li key={plan.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
            <ExpandablePlanName value={plan.step_name} />
            <div className="d-flex gap-2 align-items-center">

              {/* 👇 INPUT DATE - MỖI DÒNG */}
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: 150 }}
                key={plan.due_date}
                defaultValue={plan.due_date?.split('T')[0] || ''}
                disabled={!canEdit}
                title="Ngày hoàn thành dự kiến"
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value !== (plan.due_date || '')) {
                    updatePlan.mutate({
                      id: plan.id,
                      payload: {
                        ...(value ? { due_date: value } : {}),
                      },
                    });
                  }
                }}
              />

              <input
                type="number"
                min={0}
                max={100}
                className="form-control form-control-sm"
                style={{ width: 80 }}
                key={plan.progress_percent}
                defaultValue={plan.progress_percent}
                disabled={!canEdit}
                onBlur={async (e) => {
                  const input = e.currentTarget;
                  const value = Number(input.value);
                  if (value !== plan.progress_percent) {
                    if (!await saveProgress(plan, value)) input.value = String(plan.progress_percent);
                  }
                }}
              />
              <span className="text-muted small">%</span>
              <select
                className="form-select form-select-sm"
                value={plan.status}
                disabled={!canEdit}
                onChange={(e) => saveProgress(plan, e.target.value === 'done' ? 100 : e.target.value === 'pending' ? 0 : Math.min(99, plan.progress_percent))}
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => deletePlan.mutate(plan.id)}
                >
                  Xoá
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
