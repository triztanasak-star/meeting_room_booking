import AttachmentInput from '../../../components/AttachmentInput';
import { isAxiosError } from 'axios';
import UserNameInput from '../../../components/UserNameInput';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DigitalWork, Project, User } from '../../../lib/db';

export interface WorkFormValues {
  task_name: string;
  factory_name: string;
  description: string;
  priority: string;
  lead_project: string;
  assistant: string;
  representative_name: string;
  representative_email: string;
  representative_phone: string;
  assigned_to: string;
  support_id: string;
  project_id: string;
  expected_deadline: string;
  capex_amount: string;
  estimated_saving_per_year: string;
  payback_years: string;
  files: File[];
  attachment_links: string;
}

export interface WorkFormModalHandle {
  openCreate: () => void;
  openEdit: (work: DigitalWork) => void;
  openAssign: (work: DigitalWork) => void;
  close: () => void;
}

interface Props {
  onReject: (workId: number, reason: string) => Promise<boolean>;
  projects: Project[];
  users: User[];
  onSubmit: (values: WorkFormValues, editingId: number | null, isAssignMode: boolean) => Promise<void>;
}

const initialValues: WorkFormValues = {
  task_name: '',
  factory_name: '',
  description: '',
  priority: 'medium',
  lead_project: '',
  assistant: '',
  representative_name: '',
  representative_email: '',
  representative_phone: '',
  assigned_to: '',
  support_id: '',
  project_id: '',
  expected_deadline: '',
  capex_amount: '',
  estimated_saving_per_year: '',
  payback_years: '',
  files: [],
  attachment_links: '',
};

const FACTORY_OPTIONS = [
  'Nhà máy Tiền Giang',
  'Nhà máy Đồng Nai',
  'Nhà máy Bào Xéo',
  'Nhà máy Bình Phước',
  'Nhà máy Bình Dương',
  'Nhà máy Bình Định',
  'Nhà máy Hải Dương',
  'Nhà máy Xuân Mai',
];

const WorkFormModal = forwardRef<WorkFormModalHandle, Props>(({ users, onSubmit, onReject }, ref) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAssignMode, setIsAssignMode] = useState(false);
  const [values, setValues] = useState<WorkFormValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectedSaved, setRejectedSaved] = useState(false);
  const resetRejection = () => {
    setSubmitError('');
    setShowReject(false); setRejectReason(''); setRejectError(''); setRejectedSaved(false);
  };
  const handleReject = async () => {
    if (editingId === null || !rejectReason.trim() || loading) return;
    setLoading(true); setRejectError('');
    try {
      const sent = await onReject(editingId, rejectReason.trim());
      if (sent) { setShowReject(false); setIsOpen(false); }
      else {
        setRejectedSaved(true);
        setRejectError('Đã lưu trạng thái Không duyệt và lý do, nhưng chưa gửi được thông báo Teams. Vui lòng kiểm tra cấu hình Teams trên máy chủ.');
      }
    } catch {
      setRejectError('Không thể lưu Không duyệt. Vui lòng kiểm tra trạng thái dự án và thử lại.');
    } finally { setLoading(false); }
  };

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      resetRejection();
      setEditingId(null);
      setIsAssignMode(false);
      setValues(initialValues);
      setIsOpen(true);
    },
    openEdit: (work: DigitalWork) => {
      resetRejection();
      setEditingId(work.id);
      setIsAssignMode(false);
      setValues({
        task_name: work.task_name ?? '',
        factory_name: work.factory_name ?? '',
        description: work.description ?? '',
        priority: work.priority ?? 'medium',
        lead_project: work.lead_project ?? '',
        assistant: work.assistant ?? '',
        representative_name: work.representative_name ?? '',
        representative_email: work.representative_email ?? '',
        representative_phone: work.representative_phone ?? '',
        assigned_to: '',
        support_id: '',
        project_id: work.project_id ? String(work.project_id) : '',
        expected_deadline: work.expected_deadline ? work.expected_deadline.split('T')[0] : '',
        capex_amount: work.capex_amount ? String(work.capex_amount) : '',
        estimated_saving_per_year: work.estimated_saving_per_year ? String(work.estimated_saving_per_year) : '',
        payback_years: work.payback_years ? String(work.payback_years) : '',
        files: [],
        attachment_links: '',
      });
      setIsOpen(true);
    },
    openAssign: (work: DigitalWork) => {
      resetRejection();
      setEditingId(work.id);
      setIsAssignMode(true);
      setValues({
        task_name: work.task_name ?? '',
        factory_name: work.factory_name ?? '',
        description: work.description ?? '',
        priority: work.priority ?? 'medium',
        lead_project: work.lead_project ?? work.assigned_to_name ?? '',
        assistant: work.assistant ?? work.support_name ?? '',
        representative_name: work.representative_name ?? '',
        representative_email: work.representative_email ?? '',
        representative_phone: work.representative_phone ?? '',
        assigned_to: '',
        support_id: '',
        project_id: work.project_id ? String(work.project_id) : '',
        expected_deadline: work.expected_deadline ? work.expected_deadline.split('T')[0] : '',
        capex_amount: work.capex_amount ? String(work.capex_amount) : '',
        estimated_saving_per_year: work.estimated_saving_per_year ? String(work.estimated_saving_per_year) : '',
        payback_years: work.payback_years ? String(work.payback_years) : '',
        files: [],
        attachment_links: '',
      });
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setSubmitError('');
    try {
      setLoading(true);
      await onSubmit(values, editingId, isAssignMode);
      setIsOpen(false);
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
      setSubmitError(message || t('workForm.submitError'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">
                {isAssignMode ? t('workForm.titleAssign') : editingId ? t('workForm.titleEdit') : t('workForm.titleCreate')}
              </h5>
              <button type="button" className="btn-close" onClick={() => setIsOpen(false)} />
            </div>

            <div className="modal-body">
              {submitError && <div className="alert alert-danger" role="alert">{submitError}</div>}
              {isAssignMode ? (
                /* FORM GIAO CÔNG VIỆC */
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('workForm.taskName')}</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={values.task_name}
                      onChange={(e) => setValues((prev) => ({ ...prev, task_name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">{t('workForm.factory')}</label>
                    <input
                      type="text"
                      className="form-control"
                      list="factory-list-assign"
                      value={values.factory_name}
                      onChange={(e) => setValues((prev) => ({ ...prev, factory_name: e.target.value }))}
                      placeholder={t('workForm.factoryPlaceholder')}
                    />
                    <datalist id="factory-list-assign">
                      {FACTORY_OPTIONS.map((factory) => (
                        <option key={factory} value={factory} />
                      ))}
                    </datalist>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">{t('workForm.priority')}</label>
                    <select
                      className="form-select"
                      value={values.priority}
                      onChange={(e) => setValues((prev) => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="high">{t('common.priority.high')}</option>
                      <option value="medium">{t('common.priority.medium')}</option>
                      <option value="low">{t('common.priority.low')}</option>
                    </select>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">{t('workForm.description')}</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={values.description}
                      onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">{t('workForm.representativeName')}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={values.representative_name}
                      onChange={(e) => setValues((prev) => ({ ...prev, representative_name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t('workForm.email')}</label>
                    <input
                      type="email"
                      className="form-control"
                      value={values.representative_email}
                      onChange={(e) => setValues((prev) => ({ ...prev, representative_email: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t('workForm.phone')}</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={values.representative_phone}
                      onChange={(e) => setValues((prev) => ({ ...prev, representative_phone: e.target.value }))}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">{t('workForm.expectedDeadline')}</label>
                    <input
                      type="date"
                      className="form-control"
                      value={values.expected_deadline}
                      onChange={(e) => setValues((prev) => ({ ...prev, expected_deadline: e.target.value }))}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">{t('workForm.attachment')}</label>
                    <AttachmentInput
                      files={values.files}
                      onFilesChange={(files) => setValues(prev => ({ ...prev, files }))}
                      links={values.attachment_links}
                      onLinksChange={(attachment_links) => setValues(prev => ({ ...prev, attachment_links }))}
                    />
                  </div>

                  {/* ✅ PIC — nhập tự do (nhiều tên, phân tách bằng dấu phẩy), lưu vào lead_project */}
                  <div className="col-md-6">
                    <label className="form-label">{t('workForm.pic')}</label>
                    <UserNameInput multiple
                      users={users}
                      placeholder={t('workForm.picPlaceholder')}
                      value={values.lead_project}
                      onChange={(val) => setValues((prev) => ({ ...prev, lead_project: val, assigned_to: '' }))}
                    />
                  </div>

                  {/* ✅ Support — nhập tự do (nhiều tên, phân tách bằng dấu phẩy), lưu vào assistant */}
                  <div className="col-md-6">
                    <label className="form-label">{t('workForm.support')}</label>
                    <UserNameInput multiple
                      users={users}
                      placeholder={t('workForm.supportPlaceholder')}
                      value={values.assistant}
                      onChange={(val) => setValues((prev) => ({ ...prev, assistant: val, support_id: '' }))}
                    />
                  </div>
                </div>
              ) : (
                /* FORM THÊM / SỬA DỰ ÁN */
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('workForm.taskName')}</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={values.task_name}
                      onChange={(e) => setValues((prev) => ({ ...prev, task_name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">{t('workForm.factory')}</label>
                    <input
                      type="text"
                      className="form-control"
                      list="factory-list-create"
                      value={values.factory_name}
                      onChange={(e) => setValues((prev) => ({ ...prev, factory_name: e.target.value }))}
                      placeholder={t('workForm.factoryPlaceholder')}
                    />
                    <datalist id="factory-list-create">
                      {FACTORY_OPTIONS.map((factory) => (
                        <option key={factory} value={factory} />
                      ))}
                    </datalist>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">{t('workForm.priority')}</label>
                    <select
                      className="form-select"
                      value={values.priority}
                      onChange={(e) => setValues((prev) => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="high">{t('common.priority.high')}</option>
                      <option value="medium">{t('common.priority.medium')}</option>
                      <option value="low">{t('common.priority.low')}</option>
                    </select>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">{t('workForm.description')}</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={values.description}
                      onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">{t('workForm.representativeName')}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={values.representative_name}
                      onChange={(e) => setValues((prev) => ({ ...prev, representative_name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t('workForm.email')}</label>
                    <input
                      type="email"
                      className="form-control"
                      value={values.representative_email}
                      onChange={(e) => setValues((prev) => ({ ...prev, representative_email: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t('workForm.phone')}</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={values.representative_phone}
                      onChange={(e) => setValues((prev) => ({ ...prev, representative_phone: e.target.value }))}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">{t('workForm.expectedDeadline')}</label>
                    <input
                      type="date"
                      className="form-control"
                      value={values.expected_deadline}
                      onChange={(e) => setValues((prev) => ({ ...prev, expected_deadline: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('workForm.attachment')}</label>
                    <AttachmentInput
                      files={values.files}
                      onFilesChange={(files) => setValues(prev => ({ ...prev, files }))}
                      links={values.attachment_links}
                      onLinksChange={(attachment_links) => setValues(prev => ({ ...prev, attachment_links }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {isAssignMode && editingId !== null && <button type="button" className="btn btn-outline-danger me-auto"
                disabled={loading} onClick={() => { setRejectError(''); setShowReject(true); }}>Không duyệt</button>}
              <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                {t('workForm.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {isAssignMode
                  ? (loading ? t('workForm.submitApproving') : t('workForm.submitApprove'))
                  : editingId
                  ? (loading ? t('workForm.submitSaving') : t('workForm.submitSave'))
                  : (loading ? t('workForm.submitRequesting') : t('workForm.submitRequest'))}
              </button>
            </div>
          </form>
        </div>
      </div>
      {showReject && <div role="dialog" aria-modal="true" aria-label="Không duyệt dự án"
        style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onKeyDown={e => { if (e.key === 'Escape' && !loading) { setShowReject(false); if (rejectedSaved) setIsOpen(false); } }}>
        <div className="modal-content" style={{ width: 500, maxWidth: '100%' }}>
          <form onSubmit={e => { e.preventDefault(); void handleReject(); }}>
            <div className="modal-header"><h5 className="modal-title">Không duyệt dự án</h5></div>
            <div className="modal-body">
              <p className="fw-semibold">{values.task_name}</p>
              <label htmlFor="rejection-reason" className="form-label">Lý do không duyệt <span className="text-danger">*</span></label>
              <textarea id="rejection-reason" autoFocus required maxLength={2000} rows={4}
                className="form-control" value={rejectReason} disabled={loading || rejectedSaved}
                onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do không duyệt..." />
              <small className="text-muted">Xác nhận sẽ lưu trạng thái Không duyệt và gửi lý do đến nhóm Microsoft Teams.</small>
              {rejectError && <div role="alert" className="alert alert-warning mt-3 mb-0">{rejectError}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" disabled={loading}
                onClick={() => { setShowReject(false); if (rejectedSaved) setIsOpen(false); }}>{rejectedSaved ? 'Đóng' : 'Hủy'}</button>
              {!rejectedSaved && <button type="submit" className="btn btn-danger" disabled={loading || !rejectReason.trim()}>
                {loading ? 'Đang xử lý...' : 'Xác nhận không duyệt'}</button>}
            </div>
          </form>
        </div>
      </div>}

    </div>
  );
});

export default WorkFormModal;
