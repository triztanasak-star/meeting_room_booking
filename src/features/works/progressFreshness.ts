export function progressFreshness(
  percent: number,
  increasedAt: string | null | undefined,
  now = Date.now(),
): 'warning' | 'danger' | null {
  if (percent >= 100 || !increasedAt) return null;
  const elapsed = now - new Date(increasedAt).getTime();
  if (!Number.isFinite(elapsed)) return null;
  const day = 24 * 60 * 60 * 1000;
  if (elapsed > 21 * day) return 'danger';
  if (elapsed > 14 * day) return 'warning';
  return null;
}
