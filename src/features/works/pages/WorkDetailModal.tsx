import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FiPaperclip } from 'react-icons/fi';
import * as db from '../../../lib/db';
import type { DigitalWork } from '../../../lib/db';

function progressBucket(percent: number): 'good' | 'warn' | 'bad' {
  if (percent >= 80) return 'good';
  if (percent >= 40) return 'warn';
  return 'bad';
}

// ============================================================
// Component hiển thị danh sách tài liệu đính kèm (trong Modal)
// ============================================================
function WorkAttachmentsList({ workId, category }: { workId: number; category?: 'after_work' }) {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['work_attachments', workId],
    queryFn: () => db.listAttachments(workId),
  });

  const attachments = (data?.documents ?? []).filter((f: any) =>
    category === 'after_work' ? f.category === 'after_work' : f.category !== 'after_work'
  );

  if (attachments.length === 0) {
    return (
      <span className="text-muted">
        {category === 'after_work' ? t('workDetail.noImages') : t('workDetail.noAttachments')}
      </span>
    );
  }

  const handleDownload = async (
    e: React.MouseEvent,
    fileUrl?: string,
    fileName?: string,
    fileId?: number,
    mimeType?: string
  ) => {
    e.preventDefault();
    if (!fileUrl) return;

    const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(fileName || '');
    if (isPdf && fileId) {
      try { await db.downloadAttachment(fileId, fileName || 'document.pdf'); }
      catch { window.alert('Không tải được PDF hợp lệ. Vui lòng kiểm tra tệp gốc hoặc quyền tải PDF trên Cloudinary.'); }
      return;
    }

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="d-flex flex-column gap-1">
      {attachments.map((file: any) => {
        const fileUrl = file.url || file.file_path;
        return (
          <a
            key={file.id}
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={file.mime_type === 'text/uri-list' ? undefined : (e) => handleDownload(e, fileUrl, file.original_name, file.id, file.mime_type)}
            className="text-decoration-none small d-flex align-items-center gap-1"
            style={{ cursor: 'pointer' }}
            title={file.original_name}
          >
            <FiPaperclip size={12} /> {file.original_name}
          </a>
        );
      })}
    </div>
  );
}

// ============================================================
// MODAL CHI TIẾT DỰ ÁN
// ============================================================
interface WorkDetailModalProps {
  work: DigitalWork | null;
  onClose: () => void;
}

export default function WorkDetailModal({ work, onClose }: WorkDetailModalProps) {
  const { t, i18n } = useTranslation();
  if (!work) return null;

  const PRIORITY_LABEL: Record<string, string> = {
    high: t('common.priority.high'),
    medium: t('common.priority.medium'),
    low: t('common.priority.low'),
  };

  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const bucket = progressBucket(work.progress_percent);
  const barColor =
    bucket === 'good'
      ? 'var(--status-good)'
      : bucket === 'warn'
      ? 'var(--status-warn)'
      : 'var(--status-bad)';

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      tabIndex={-1}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div
          className="modal-content"
          style={{
            background: 'var(--card-bg, #1a1d2e)',
            color: 'var(--text-color, #fff)',
          }}
        >
          {/* Header */}
          <div className="modal-header border-secondary">
            <h5 className="modal-title">
              {t('workDetail.title', { name: '' })}{' '}
              <span className="text-primary">{work.task_name}</span>
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* PHẦN 1: Thông tin chung */}
            <h6 className="text-muted text-uppercase small mb-3">
              {t('workDetail.generalInfo')}
            </h6>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="text-muted small d-block">{t('workDetail.project')}</label>
                <span className="fw-semibold">{work.task_name}</span>
              </div>
              <div className="col-md-6">
                <label className="text-muted small d-block">{t('workDetail.factory')}</label>
                <span>{work.factory_name || '—'}</span>
              </div>
              <div className="col-md-6">
                <label className="text-muted small d-block">{t('workDetail.priority')}</label>
                <span className={`badge-priority ${work.priority}`}>
                  {PRIORITY_LABEL[work.priority]}
                </span>
              </div>
              <div className="col-md-6">
                <label className="text-muted small d-block">{t('workDetail.statusPercent')}</label>
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="status-progress-bar"
                    style={{ width: '100px' }}
                  >
                    <div
                      style={{
                        width: `${work.progress_percent}%`,
                        background: barColor,
                      }}
                    />
                  </span>
                  <span className={`status-badge ${bucket}`}>
                    {work.progress_percent}%
                  </span>
                </div>
              </div>
            </div>

            {work.workflow_status === 'rejected' && <div className="alert alert-danger">
              <strong>{t('common.workflow.rejected')}</strong>
              <div style={{ whiteSpace: 'pre-wrap' }}>{work.rejection_reason}</div>
            </div>}
            <hr className="border-secondary" />

            {/* PHẦN 2: 4 cột đã ẩn khỏi bảng chính */}
            <h6 className="text-muted text-uppercase small mb-3">
              {t('workDetail.additionalInfo')}
            </h6>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="text-muted small d-block">
                  {t('workDetail.pic')}
                </label>
                <span className="fw-semibold">
                  {work.lead_project || work.assigned_to_name || '—'}
                </span>
              </div>
              <div className="col-md-6">
                <label className="text-muted small d-block">{t('workDetail.support')}</label>
                <span>{work.assistant || work.support_name || '—'}</span>
              </div>
              <div className="col-md-6">
                <label className="text-muted small d-block">
                  {t('workDetail.expectedDeadline')}
                </label>
                <span>
                  {work.expected_deadline
                    ? new Date(work.expected_deadline).toLocaleDateString(locale)
                    : '—'}
                </span>
              </div>
              <div className="col-md-6">
                <label className="text-muted small d-block">
                  {t('workDetail.attachments')}
                </label>
                <WorkAttachmentsList workId={work.id} />
              </div>
              <div className="col-md-6">
                <label className="text-muted small d-block">
                  {t('workDetail.afterWorkImages')}
                </label>
                <WorkAttachmentsList workId={work.id} category="after_work" />
              </div>
            </div>

            <hr className="border-secondary" />

            {/* PHẦN 3: Tiến độ chi tiết (không cắt ngắn) */}
            <h6 className="text-muted text-uppercase small mb-3">
              {t('workDetail.detailedProgress')}
            </h6>
            <div
              className="p-3 rounded"
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color, #2d3748)',
              }}
            >
              {(() => {
                const rawData =
                  (work as any).plans ||
                  (work as any).task_plans ||
                  (work as any).milestones;

                if (Array.isArray(rawData) && rawData.length > 0) {
                  return rawData.map((p: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      • <strong>{p.step_name || p.name}</strong>:{' '}
                      {p.progress_percent ?? p.progress ?? 0}%
                      <span className="text-muted ms-1">({p.status})</span>
                    </div>
                  ));
                }

                const textContent =
                  typeof rawData === 'string'
                    ? rawData
                    : work.progress_comment || '';

                if (textContent.trim().length > 0) {
                  const items = textContent
                    .split(/\s*-\s+/)
                    .filter(Boolean);
                  return items.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      • {item}
                    </div>
                  ));
                }

                return (
                  <span className="text-muted">{t('workDetail.noProgressUpdate')}</span>
                );
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-secondary">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              {t('workDetail.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
