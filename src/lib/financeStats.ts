import type { DigitalWork } from './db';

export function calculateFinanceStats(works: DigitalWork[], includeEstimated: boolean) {
  let totalCapex = 0;
  let totalSaving = 0;
  works.forEach(work => {
    const isEstimated = work.saving_is_estimated ?? (work.workflow_status !== 'completed');
    if (!includeEstimated && isEstimated) return;
    totalCapex += Number(work.capex_amount ?? 0);
    totalSaving += Number(work.estimated_saving_per_year ?? 0);
  });
  return {
    totalCapex,
    totalSaving,
    paybackPeriod: totalSaving > 0 ? (totalCapex / totalSaving).toFixed(1) : '0',
    cumulativeSaving5Years: totalSaving * 5,
  };
}
