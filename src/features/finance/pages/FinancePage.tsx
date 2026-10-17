import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { listWorks, type DigitalWork } from '../../../lib/db';
import { calculateFinanceStats } from '../../../lib/financeStats';

export default function FinancePage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const [includeEstimated, setIncludeEstimated] = useState(false);
  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ['works', 'finance'],
    queryFn: async () => {
      const first = await listWorks({ page: 1, limit: 200 });
      const allWorks: DigitalWork[] = [...first.documents];
      const pages = Math.ceil(first.total / first.limit);
      for (let page = 2; page <= pages; page++) {
        const next = await listWorks({ page, limit: first.limit });
        allWorks.push(...next.documents);
      }
      return allWorks;
    },
  });
  const works = data ?? [];

  // Tính toán các chỉ số tổng quan
  const stats = useMemo(() => calculateFinanceStats(works, includeEstimated), [works, includeEstimated]);

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '—';
    if (amount >= 1e9) {
      return `${(amount / 1e9).toFixed(2)} ${t('finance.units.billion')}`;
    }
    return `${new Intl.NumberFormat(locale).format(amount)} ${t('finance.units.currency')}`;
  };

  const formatRawNumber = (amount: number) => {
    if (!amount || isNaN(amount)) return '';
    return `${new Intl.NumberFormat(locale).format(amount)} ${t('finance.units.currencyPerYear')}`;
  };

  if (loading) {
    return <div className="p-4">{t('finance.loading')}</div>;
  }

  if (isError) return <div className="alert alert-danger">{t('finance.loadError')}</div>;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: '16px',
      }}
    >
      {/* ✅ CSS cho bảng — tự động theo theme light/dark */}
      <style>{`
        .finance-table {
          color: var(--text-color, #1a1a1a);
        }
        .finance-table tbody td {
          color: var(--text-color, #1a1a1a) !important;
          border-color: rgba(148, 163, 184, 0.2) !important;
          vertical-align: middle;
        }
        .finance-table tbody tr:hover {
          background: rgba(148, 163, 184, 0.08);
        }
        .finance-table thead th {
          color: var(--text-color, #1a1a1a) !important;
          background: var(--card-bg, #f8f9fa) !important;
          border-bottom: 2px solid rgba(148, 163, 184, 0.3) !important;
          font-weight: 600;
          padding: 12px 8px;
        }
        .finance-table .cell-name {
          color: var(--text-color, #1a1a1a) !important;
          font-weight: 600;
        }
        .finance-table .cell-capex {
          color: var(--text-color, #1a1a1a) !important;
          opacity: 0.85;
        }
        .finance-table .cell-saving {
          color: #0284c7 !important;
          font-weight: 600;
        }
        .finance-table .cell-payback {
          color: #16a34a !important;
          font-weight: 600;
        }
        .finance-table .cell-benefit {
          color: var(--text-color, #1a1a1a) !important;
          opacity: 0.85;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .finance-table .cell-empty {
          color: var(--text-color, #1a1a1a) !important;
          opacity: 0.4;
        }

        /* ✅ Dark mode: màu sáng hơn để nổi bật trên nền tối */
        [data-theme="dark"] .finance-table {
          color: #e5e7eb;
        }
        [data-theme="dark"] .finance-table tbody td {
          color: #e5e7eb !important;
          border-color: rgba(148, 163, 184, 0.15) !important;
        }
        [data-theme="dark"] .finance-table thead th {
          color: #ffffff !important;
          background: #1a1d2e !important;
          border-bottom: 2px solid #334155 !important;
        }
        [data-theme="dark"] .finance-table .cell-name {
          color: #f1f5f9 !important;
        }
        [data-theme="dark"] .finance-table .cell-capex {
          color: #cbd5e1 !important;
        }
        [data-theme="dark"] .finance-table .cell-saving {
          color: #38bdf8 !important;
        }
        [data-theme="dark"] .finance-table .cell-payback {
          color: #4ade80 !important;
        }
        [data-theme="dark"] .finance-table .cell-benefit {
          color: #cbd5e1 !important;
        }
        [data-theme="dark"] .finance-table .cell-empty {
          color: #64748b !important;
        }
      `}</style>

      <div style={{ flexShrink: 0 }}>
        <div className="form-check">
          <input id="finance-include-estimated" type="checkbox" className="form-check-input"
            checked={includeEstimated} onChange={e => setIncludeEstimated(e.target.checked)}
            aria-describedby="finance-saving-scope" />
          <label htmlFor="finance-include-estimated" className="form-check-label fw-semibold">
            {t('finance.includeEstimated')}
          </label>
        </div>
        <small id="finance-saving-scope" className="text-muted" aria-live="polite">
          {includeEstimated ? t('finance.allSavingsHint') : t('finance.actualSavingsHint')}
        </small>
      </div>

      {/* 4 Thẻ thống kê tổng quan */}
      <div className="row g-3" style={{ flexShrink: 0 }}>
        <div className="col-md-3">
          <div className="card-surface h-100">
            <span className="text-muted small fw-bold text-uppercase">{t('finance.totalCapex')}</span>
            <h3 className="fw-bold mt-2 mb-1">{formatCurrency(stats.totalCapex)}</h3>
            <span className="text-muted small">{`${new Intl.NumberFormat(locale).format(stats.totalCapex)} ${t('finance.units.currency')}`}</span>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card-surface h-100">
            <span className="text-muted small fw-bold text-uppercase">{t('finance.totalSavingPerYear')}</span>
            <h3 className="fw-bold mt-2 mb-1" style={{ color: '#0284c7' }}>
              {formatCurrency(stats.totalSaving)}
            </h3>
            <span className="text-muted small">{formatRawNumber(stats.totalSaving)}</span>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card-surface h-100">
            <span className="text-muted small fw-bold text-uppercase">{t('finance.paybackTime')}</span>
            <h3 className="fw-bold mt-2 mb-1" style={{ color: '#16a34a' }}>
              {stats.paybackPeriod} {t('finance.units.years')}
            </h3>
            <span className="text-muted small">{t('finance.capexDivSaving')}</span>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card-surface h-100">
            <span className="text-muted small fw-bold text-uppercase">{t('finance.accumulatedSaving5y')}</span>
            <h3 className="fw-bold mt-2 mb-1" style={{ color: '#0284c7' }}>
              {formatCurrency(stats.cumulativeSaving5Years)}
            </h3>
            <span className="text-muted small">{t('finance.beforeCapex')}</span>
          </div>
        </div>
      </div>

      {/* Bảng danh sách Capex & Saving */}
      <div
        className="card-surface"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          padding: 0,
        }}
      >
        <div
          className="d-flex justify-content-between align-items-center"
          style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}
        >
          <h5 className="mb-0 fw-bold">{t('finance.listTitle')}</h5>
          <span className="text-muted small">{t('finance.itemCount', { count: works.length })}</span>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            minHeight: 0,
          }}
        >
          <table className="table align-middle mb-0 finance-table">
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <tr>
                <th className="ps-3" style={{ width: '24%' }}>{t('finance.columns.item')}</th>
                <th className="text-center" style={{ width: '8%', minWidth: 110 }}>{t('finance.columns.statusPercent')}</th>
                <th style={{ width: '13%' }}>{t('finance.columns.capex')}</th>
                <th style={{ width: '14%' }}>{t('finance.columns.saving')}</th>
                <th className="text-center" style={{ width: '10%' }}>{t('finance.columns.payback')}</th>
                <th className="pe-3" style={{ width: '31%' }}>{t('finance.columns.otherBenefit')}</th>
              </tr>
            </thead>
            <tbody>
              {works.map((work: any, index: number) => {
                const capexVal = Number(work.capex_amount || work.capex || 0);
                const savingVal = Number(work.estimated_saving_per_year || work.saving || work.estimated_saving || 0);
                
                let paybackVal = work.payback_years ? Number(work.payback_years) : 0;
                if (!paybackVal && savingVal > 0 && capexVal > 0) {
                  paybackVal = Number((capexVal / savingVal).toFixed(1));
                }

                const benefits = work.other_benefits || work.manager_comment || '';

                return (
                  <tr key={work.id || index}>
                    <td className="ps-3 cell-name">
                      {work.task_name || work.name || t('finance.noName')}{' '}
                      {work.factory_name ? `(${work.factory_name})` : ''}
                    </td>
                    <td className="text-center">
                      <span className="fw-semibold">{work.progress_percent ?? 0}%</span>
                    </td>
                    <td className="cell-capex">
                      {capexVal ? (
                        new Intl.NumberFormat(locale).format(capexVal)
                      ) : (
                        <span className="cell-empty">—</span>
                      )}
                    </td>
                    <td className="cell-saving">
                      {savingVal ? (
                        new Intl.NumberFormat(locale).format(savingVal)
                      ) : (
                        <span className="cell-empty">—</span>
                      )}
                    </td>
                    <td className="text-center cell-payback">
                      {paybackVal ? `${paybackVal} ${t('finance.units.years')}` : <span className="cell-empty">—</span>}
                    </td>
                    <td className="pe-3 cell-benefit">
                      {benefits || <span className="cell-empty">—</span>}
                    </td>
                  </tr>
                );
              })}
              {works.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    {t('finance.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}