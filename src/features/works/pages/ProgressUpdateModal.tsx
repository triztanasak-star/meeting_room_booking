import ExpandablePlanName from '../../../components/ExpandablePlanName';
import { useQueryClient } from '@tanstack/react-query';
import AttachmentInput from '../../../components/AttachmentInput';
import useCompletionConfirmation from '../../../components/useCompletionConfirmation';
import { forwardRef, useImperativeHandle, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { listTaskPlans, createTaskPlan, updateTaskPlan, deleteTaskPlan, uploadAttachments, type DigitalWork, type MilestoneItem } from '../../../lib/db';

export interface ProgressFormValues {
  status: number;
  progress_percent: number;
  progress_comment: string;
  manager_comment: string;
  support_request: string;
  capex_amount: number | null;
  estimated_saving_per_year: number | null;
  saving_is_estimated: boolean;
  payback_years: number | null;
  workflow_status: DigitalWork['workflow_status'];
}

export interface ProgressUpdateModalHandle {
  open: (work: DigitalWork) => void;
}

interface ProgressUpdateModalProps {
  canEditFinance?: boolean;
  isReviewer?: boolean;
  onSubmit: (workId: number, values: Partial<ProgressFormValues>) => Promise<void>;
}

const ProgressUpdateModal = forwardRef<ProgressUpdateModalHandle, ProgressUpdateModalProps>(
  ({ onSubmit }, ref) => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { confirmCompletion, dialog } = useCompletionConfirmation();
    const modalRef = useRef<HTMLDivElement>(null);
    const [workId, setWorkId] = useState<number | null>(null);
    const [taskName, setTaskName] = useState('');

    const [form, setForm] = useState<ProgressFormValues>({
      status: 0,
      progress_percent: 0,
      progress_comment: '',
      manager_comment: '',
      support_request: '',
      capex_amount: null,
      estimated_saving_per_year: null,
      saving_is_estimated: true,
      payback_years: null,
      workflow_status: 'requested',
    });

    const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
    const [newMilestoneName, setNewMilestoneName] = useState('');
    const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
    const [attachmentLinks, setAttachmentLinks] = useState('');
    const [afterWorkImages, setAfterWorkImages] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const showFinanceSection = true;
    const paybackRatio = form.capex_amount !== null
      && form.estimated_saving_per_year !== null
      && form.estimated_saving_per_year > 0
      ? form.capex_amount / form.estimated_saving_per_year
      : null;
    const paybackYears = paybackRatio !== null && Number.isFinite(paybackRatio)
      ? Number(paybackRatio.toFixed(1))
      : null;

    useImperativeHandle(ref, () => ({
      open: async (work: DigitalWork) => {
        setWorkId(work.id);
        setTaskName(work.task_name || '');
        setAfterWorkImages([]);
        setAttachmentLinks('');

        setForm({
          status: work.status ?? 0,
          progress_percent: work.progress_percent ?? 0,
          progress_comment: work.progress_comment ?? '',
          manager_comment: work.manager_comment ?? '',
          support_request: work.support_request ?? '',
          capex_amount: work.capex_amount !== null && work.capex_amount !== undefined ? Number(work.capex_amount) : null,
          estimated_saving_per_year: work.estimated_saving_per_year !== null && work.estimated_saving_per_year !== undefined ? Number(work.estimated_saving_per_year) : null,
          saving_is_estimated: work.saving_is_estimated ?? (work.workflow_status !== 'completed'),
          payback_years: work.payback_years !== null && work.payback_years !== undefined ? Number(work.payback_years) : null,
          workflow_status: work.workflow_status ?? 'requested',
        });

        try {
          const res: any = await listTaskPlans(work.id);
          const rawList = Array.isArray(res) ? res : (res?.documents || res?.data || []);

          const loadedPlans = [...rawList].sort((a: any, b: any) => (a.step_order - b.step_order) || (a.id - b.id)).map((p: any) => ({
            id: p.id,
            name: p.step_name || p.name,
            progress: p.progress_percent ?? p.progress ?? 0,
            status: p.status === 'done' || p.status === 'Hoàn thành' ? 'Hoàn thành'
                    : p.status === 'in_progress' || p.status === 'Đang thực hiện' ? 'Đang thực hiện'
                    : 'Chưa bắt đầu',
            dueDate: p.due_date ? String(p.due_date).split('T')[0] : '',
          }));
          setMilestones(loadedPlans);
        } catch (error) {
          console.error("Không thể tải danh sách hạng mục:", error);
          setMilestones([]);
        }

        if (modalRef.current && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modalRef.current);
          modalInstance.show();
        }
      },
    }));

    const handleClose = () => {
      if (modalRef.current && window.bootstrap) {
        const modalInstance = window.bootstrap.Modal.getInstance(modalRef.current);
        modalInstance?.hide();
      }
    };

    const calculateAndUpdateFromMilestones = (updatedMilestones: MilestoneItem[]) => {
      if (updatedMilestones.length === 0) {
        setForm(prev => ({ ...prev, progress_percent: 0, status: 0, progress_comment: '' }));
        return;
      }

      const totalProgress = updatedMilestones.reduce((sum, item) => sum + Number(item.progress || 0), 0);
      const avgProgress = Math.round(totalProgress / updatedMilestones.length);

      const combinedNotes = updatedMilestones
        .map((item) => `- ${item.name}: ${item.progress}% [${item.status}]`)
        .join('\n');

      const allCompleted = updatedMilestones.every((item) => item.status === 'Hoàn thành' || Number(item.progress) === 100);
      const anyInProgress = updatedMilestones.some((item) => item.status === 'Đang thực hiện' || (Number(item.progress) > 0 && Number(item.progress) < 100));

      let computedStatus = 0;
      if (allCompleted) computedStatus = 2;
      else if (anyInProgress || avgProgress > 0) computedStatus = 1;

      setForm(prev => ({
        ...prev,
        progress_percent: allCompleted ? 100 : avgProgress,
        status: computedStatus,
        progress_comment: combinedNotes,
      }));
    };

    const handleAddMilestone = async () => {
      if (!newMilestoneName.trim() || !workId) return;
      try {
        const createdPlan = await createTaskPlan(workId, {
          step_name: newMilestoneName.trim(),
          step_order: milestones.length + 1,
          progress_percent: 0,
          due_date: newMilestoneDueDate || undefined,
        });

        const newItem: MilestoneItem = {
          id: createdPlan.id,
          name: createdPlan.step_name || newMilestoneName.trim(),
          progress: createdPlan.progress_percent ?? 0,
          status: 'Chưa bắt đầu',
          dueDate: createdPlan.due_date ? String(createdPlan.due_date).split('T')[0] : (newMilestoneDueDate || ''),
        };

        const updated = [...milestones, newItem];
        setMilestones(updated);
        setNewMilestoneName('');
        setNewMilestoneDueDate('');
        calculateAndUpdateFromMilestones(updated);
      } catch (error) {
        console.error("Lỗi khi thêm hạng mục:", error);
      }
    };

    const handleDeleteMilestone = async (id: string | number) => {
      if (typeof id === 'number') {
        try {
          await deleteTaskPlan(id);
        } catch (error) {
          console.error("Lỗi khi xóa hạng mục trên server:", error);
          return;
        }
      }
      const updated = milestones.filter((item) => item.id !== id);
      setMilestones(updated);
      calculateAndUpdateFromMilestones(updated);
    };

    const handleUpdateMilestone = async (id: string | number, field: keyof MilestoneItem, val: any) => {
      if (field === 'progress' && (!Number.isFinite(Number(val)) || Number(val) < 0 || Number(val) > 100)) return;
      const updated = milestones.map((item) => {
        if (item.id === id) {
          const itemUpdated = { ...item, [field]: val };
          if (field === 'progress') {
            const numVal = Number(val);
            if (numVal === 100) itemUpdated.status = 'Hoàn thành';
            else if (numVal > 0) itemUpdated.status = 'Đang thực hiện';
            else itemUpdated.status = 'Chưa bắt đầu';
          }
          if (field === 'status') {
            itemUpdated.progress = val === 'Hoàn thành' ? 100 : val === 'Chưa bắt đầu' ? 0 : Math.min(99, Number(item.progress));
          }
          return itemUpdated;
        }
        return item;
      });

      const target = updated.find(item => item.id === id);
      const previous = milestones.find(item => item.id === id);
      const completing = updated.at(-1)?.id === id && Number(target?.progress) === 100 && Number(previous?.progress) !== 100;
      if (completing) {
        if (!target?.dueDate) { window.alert('Vui lòng chọn ngày hoàn thành của nhiệm vụ cuối cùng.'); return; }
        if (!await confirmCompletion(target!.dueDate!)) return;
      }

      if (typeof id === 'number') {
        try {
          const target = updated.find(i => i.id === id);
          if (target) {
            let apiStatus: 'pending' | 'in_progress' | 'done' = 'pending';
            if (target.status === 'Hoàn thành') apiStatus = 'done';
            else if (target.status === 'Đang thực hiện') apiStatus = 'in_progress';

            await updateTaskPlan(id, {
              confirm_completion: completing,
              step_name: target.name,
              progress_percent: Number(target.progress),
              status: apiStatus,
              due_date: target.dueDate || null,
            });
          }
        } catch (error) {
          console.error("Lỗi cập nhật hạng mục:", error);
          return;
        }
      }
      setMilestones(updated);
      calculateAndUpdateFromMilestones(updated);
    };

    const handleSubmit = async (event: FormEvent) => {
      event.preventDefault();
      if (workId === null || dialog) return;
      setIsSubmitting(true);
      try {
        const payload: Partial<ProgressFormValues> = {
          status: form.status,
          progress_percent: form.progress_percent,
          progress_comment: form.progress_comment,
          manager_comment: form.manager_comment,
          support_request: form.support_request,
          capex_amount: form.capex_amount,
          estimated_saving_per_year: form.estimated_saving_per_year,
          saving_is_estimated: form.saving_is_estimated,
          payback_years: paybackYears,
        };

        await onSubmit(workId, payload);

        if (afterWorkImages.length > 0 || attachmentLinks.trim()) {
          await uploadAttachments(workId, afterWorkImages, 'after_work', attachmentLinks.split(/\r?\n/).map(link => link.trim()).filter(Boolean));
        }

        await queryClient.invalidateQueries({ queryKey: ['work_attachments', workId] });
        await queryClient.invalidateQueries({ queryKey: ['works'] });
        handleClose();
      } finally {
        setIsSubmitting(false);
      }
    };

    // 👈 Chấp nhận công việc: chuyển trạng thái quy trình sang "Thực hiện"
    const handleAccept = async () => {
      if (workId === null || dialog) return;
      setIsSubmitting(true);
      try {
        await onSubmit(workId, { workflow_status: 'in_progress' });
        setForm((prev) => ({ ...prev, workflow_status: 'in_progress' }));
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
        {dialog}
        <style>{`
          /* ===== LIGHT MODE (mặc định) ===== */
          .progress-modal-input {
            background-color: #ffffff !important;
            color: #1f2937 !important;
            border: 1px solid #d1d5db !important;
          }
          .progress-modal-input:focus {
            background-color: #ffffff !important;
            color: #1f2937 !important;
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.15) !important;
          }
          .progress-modal-input::placeholder {
            color: #9ca3af !important;
            opacity: 1;
          }

          /* Ô input-group-text (dấu %) */
          .input-group-text {
            background-color: #f3f4f6 !important;
            color: #1f2937 !important;
            border-color: #d1d5db !important;
          }

          /* Row hạng mục */
          .progress-milestone-row {
            background-color: #f8fafc !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 6px;
          }
          .progress-milestone-empty {
            background-color: #f9fafb !important;
            border: 1px solid #e5e7eb !important;
          }

          /* Date input light */
          .progress-modal-input[type="date"] {
            color-scheme: light;
          }

          /* ===== DARK MODE ===== */
          [data-theme="dark"] .progress-modal-input {
            background-color: rgba(30, 41, 59, 0.6) !important;
            color: #e5e7eb !important;
            border-color: rgba(148, 163, 184, 0.25) !important;
          }
          [data-theme="dark"] .progress-modal-input:focus {
            background-color: rgba(30, 41, 59, 0.6) !important;
            color: #e5e7eb !important;
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.15) !important;
          }
          [data-theme="dark"] .progress-modal-input::placeholder {
            color: #94a3b8 !important;
            opacity: 0.7;
          }
          [data-theme="dark"] .input-group-text {
            background-color: rgba(30, 41, 59, 0.6) !important;
            color: #e5e7eb !important;
            border-color: rgba(148, 163, 184, 0.25) !important;
          }
          [data-theme="dark"] .progress-milestone-row {
            background-color: rgba(30, 41, 59, 0.4) !important;
            border-color: rgba(148, 163, 184, 0.15) !important;
          }
          [data-theme="dark"] .progress-milestone-empty {
            background-color: rgba(30, 41, 59, 0.3) !important;
            border-color: rgba(148, 163, 184, 0.15) !important;
          }
          [data-theme="dark"] .progress-modal-input[type="date"] {
            color-scheme: dark;
          }
          [data-theme="dark"] .progress-modal-input[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
          }
        `}</style>

        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">{t('progress.title', { name: taskName })}</h5>
                <button type="button" className="btn-close" onClick={handleClose} aria-label={t('progress.close')} />
              </div>
              <div className="modal-body">
                <div className="row g-3">

                  {/* KẾ HOẠCH THỰC HIỆN (HẠNG MỤC) */}
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label fw-bold m-0">{t('progress.planSection')}</label>
                      <span className="text-muted small fw-semibold">
                        {t('progress.avgProgress', { percent: form.progress_percent })}
                      </span>
                    </div>

                    {/* Thêm ô nhập ngày cho hạng mục mới */}
                    <div className="d-flex gap-2 mb-3 align-items-start">
                      <textarea
                        className="form-control progress-modal-input"
                        placeholder={t('progress.addMilestonePlaceholder')}
                        value={newMilestoneName}
                        rows={1}
                        style={{
                          resize: 'none',
                          overflow: 'hidden',
                          minHeight: '38px',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          flex: 1,
                        }}
                        onChange={(e) => setNewMilestoneName(e.target.value)}
                        onInput={(e: any) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddMilestone();
                            (e.target as HTMLTextAreaElement).style.height = 'auto';
                          }
                        }}
                      />
                      <input
                        type="date"
                        className="form-control progress-modal-input"
                        style={{ height: '38px', width: '160px', flexShrink: 0 }}
                        value={newMilestoneDueDate}
                        onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                        title={t('progress.dueDateOptional')}
                      />
                      <button
                        type="button"
                        className="btn btn-primary px-4"
                        onClick={handleAddMilestone}
                        style={{ height: '38px', flexShrink: 0 }}
                      >
                        {t('progress.add')}
                      </button>
                    </div>

                    <div className="d-flex flex-column gap-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {milestones.length === 0 ? (
                        <div className="text-muted text-center py-2 progress-milestone-empty small">
                          {t('progress.noMilestones')}
                        </div>
                      ) : (
                        milestones.map((item) => (
                          <div key={`${workId}:${item.id}`} className="d-flex align-items-center gap-2 p-2 progress-milestone-row">
                            <ExpandablePlanName
                              className="form-control form-control-sm progress-modal-input"
                              value={item.name}
                              onChange={(value) => handleUpdateMilestone(item.id, 'name', value)}
                              placeholder={t('progress.milestoneNamePlaceholder')}
                            />
                            <div className="input-group input-group-sm" style={{ width: '120px', flexShrink: 0 }}>
                              <input
                                type="number"
                                className="form-control text-center progress-modal-input"
                                key={String(item.id) + ":" + item.progress}
                                defaultValue={item.progress}
                                min={0}
                                max={100}
                                onBlur={async (e) => {
                                  const input = e.currentTarget;
                                  await handleUpdateMilestone(item.id, 'progress', input.value);
                                  input.value = String(item.progress);
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                              />
                              <span className="input-group-text">%</span>
                            </div>

                            {/* Ô nhập ngày cho từng hạng mục */}
                            <input
                              type="date"
                              className="form-control form-control-sm progress-modal-input"
                              style={{ width: '150px', flexShrink: 0 }}
                              value={item.dueDate || ''}
                              onChange={(e) => handleUpdateMilestone(item.id, 'dueDate', e.target.value)}
                              title={t('progress.dueDate')}
                            />

                            <select
                              className="form-select form-select-sm progress-modal-input"
                              style={{ width: '140px', flexShrink: 0 }}
                              value={item.status}
                              onChange={(e) => handleUpdateMilestone(item.id, 'status', e.target.value)}
                            >
                              <option value="Chưa bắt đầu">{t('common.status.pending')}</option>
                              <option value="Đang thực hiện">{t('common.status.in_progress')}</option>
                              <option value="Hoàn thành">{t('common.status.done')}</option>
                            </select>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger px-3"
                              onClick={() => handleDeleteMilestone(item.id)}
                              style={{ flexShrink: 0 }}
                            >
                              {t('progress.delete')}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Thông tin quản lý & tài chính */}
                  {showFinanceSection && (
                    <>
                      <div className="col-12 mt-4">
                        <hr className="my-2" />
                        <h6 className="text-muted mb-3">{t('progress.financeSection')}</h6>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">{t('progress.capex')}</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control progress-modal-input"
                          value={form.capex_amount ?? ''}
                          onChange={(e) => setForm({ ...form, capex_amount: e.target.value ? Number(e.target.value) : null })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label" htmlFor="annual-saving">{t('progress.annualSaving')}</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control progress-modal-input"
                          id="annual-saving"
                          aria-describedby="annual-saving-type"
                          value={form.estimated_saving_per_year ?? ''}
                          onChange={(e) => setForm({ ...form, estimated_saving_per_year: e.target.value ? Number(e.target.value) : null })}
                        />
                        <div className="form-check mt-2">
                          <input type="checkbox" id="saving-is-estimated" className="form-check-input"
                            checked={form.saving_is_estimated}
                            onChange={e => setForm(prev => ({ ...prev, saving_is_estimated: e.target.checked }))} />
                          <label htmlFor="saving-is-estimated" className="form-check-label">{t('progress.projectedSaving')}</label>
                        </div>
                        <small id="annual-saving-type" className="text-muted" aria-live="polite">
                          {form.saving_is_estimated ? t('progress.projectedSavingHint') : t('progress.actualSavingHint')}
                        </small>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">{t('progress.paybackYears')}</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control progress-modal-input"
                          value={paybackYears?.toFixed(1) ?? ''}
                          readOnly
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">{t('progress.otherBenefit')}</label>
                        <textarea
                          className="form-control progress-modal-input"
                          style={{ minHeight: '85px', resize: 'vertical' }}
                          value={form.manager_comment}
                          onChange={(e) => setForm({ ...form, manager_comment: e.target.value })}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">{t('progress.supportRequest')}</label>
                        <textarea
                          className="form-control progress-modal-input"
                          style={{ minHeight: '85px', resize: 'vertical' }}
                          value={form.support_request}
                          onChange={(e) => setForm({ ...form, support_request: e.target.value })}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">{t('progress.afterWorkImages')}</label>
                        <AttachmentInput
                          files={afterWorkImages}
                          onFilesChange={setAfterWorkImages}
                          links={attachmentLinks}
                          onLinksChange={setAttachmentLinks}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleClose}>{t('progress.cancel')}</button>
                {form.workflow_status === 'approved' && (
                  <button type="button" className="btn btn-success" disabled={isSubmitting} onClick={handleAccept}>
                    {t('progress.accept')}
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? t('progress.saving') : t('progress.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  },
);

ProgressUpdateModal.displayName = 'ProgressUpdateModal';

export default ProgressUpdateModal;
