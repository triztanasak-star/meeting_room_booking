import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import * as db from '../../../lib/db';
import { calculateFinanceStats } from '../../../lib/financeStats';
import LoadingOverlay from '../../../components/LoadingOverlay';
import ErrorState from '../../../components/ErrorState';
import EmptyState from '../../../components/EmptyState';
import './DashboardPage.css';

const STATUS_COLORS = { pending: '#b9a2ff', inProgress: '#6860ef', late: '#fb7185', completed: '#2dd4bf' };
type Status = keyof typeof STATUS_COLORS;

function workStatus(work: db.DigitalWork, now: number): Status {
  if (work.progress_percent >= 100) return 'completed';
  if (work.expected_deadline) {
    // Date-only deadlines remain valid through the end of the local calendar day.
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(work.expected_deadline)
      ? new Date(`${work.expected_deadline}T23:59:59.999`).getTime()
      : new Date(work.expected_deadline).getTime();
    if (deadline < now) return 'late';
  }
  return work.progress_percent > 0 ? 'inProgress' : 'pending';
}

async function loadAllWorks() {
  const first = await db.listWorks({ page: 1, limit: 200 });
  const documents = [...first.documents];
  for (let page = 2; (page - 1) * first.limit < first.total; page++) {
    const next = await db.listWorks({ page, limit: first.limit });
    documents.push(...next.documents);
  }
  return documents;
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const worksQuery = useQuery({ queryKey: ['works', 'dashboard'], queryFn: loadAllWorks });
  const [now, setNow] = useState(Date.now);
  const [includeEstimated, setIncludeEstimated] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const works = useMemo(() => worksQuery.data ?? [], [worksQuery.data]);
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const formatBillion = (amount: number) => `${(amount / 1_000_000_000).toLocaleString(locale, { maximumFractionDigits: 2 })} ${t('finance.units.billion')} ${t('finance.units.currency')}`;
  const statuses: { key: Status; name: string; color: string }[] = [
    { key: 'pending', name: t('common.status.pending'), color: STATUS_COLORS.pending },
    { key: 'inProgress', name: t('common.status.in_progress'), color: STATUS_COLORS.inProgress },
    { key: 'late', name: t('dashboard.lateCompletion'), color: STATUS_COLORS.late },
    { key: 'completed', name: t('common.status.done'), color: STATUS_COLORS.completed },
  ];
  const { counts, members } = useMemo(() => {
    const counts = { pending: 0, inProgress: 0, late: 0, completed: 0 };
    const byPic = new Map<string, { name: string; pending: number; inProgress: number; late: number; completed: number }>();
    works.forEach((work) => {
      const status = workStatus(work, now);
      counts[status]++;
      const names = (work.lead_project?.trim() || work.assigned_to_name || '')
        // Imported PICs can omit commas: "Mr. Tan Mr. Thinh" still means two people.
        .replace(/\b(?:mr|mrs|ms)\.?\s+/gi, ',')
        .split(/[,;\n/|&]+/)
        .map(name => name.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      const seen = new Set<string>();
      names.forEach(name => {
        const words = name.match(/\p{L}[\p{L}\p{M}]*/gu);
        if (!words?.length) return;
        const normalizedName = words.join(' ').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('vi-VN');
        if (['chua phan cong', 'unassigned'].includes(normalizedName)) return;
        const lastName = words.at(-1)!.toLocaleLowerCase('vi-VN');
        const key = lastName.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
        const displayName = lastName.charAt(0).toLocaleUpperCase('vi-VN') + lastName.slice(1);
        if (seen.has(key)) return;
        seen.add(key);
        const member = byPic.get(key) ?? { name: displayName, pending: 0, inProgress: 0, late: 0, completed: 0 };
        // Prefer the accented spelling when names were also entered without accents.
        if (displayName.normalize('NFD') !== displayName) member.name = displayName;
        member[status]++;
        byPic.set(key, member);
      });
    });
    return { counts, members: [...byPic.values()].sort((a, b) => a.name.localeCompare(b.name, locale)) };
  }, [works, now, t, locale]);
  const projects = useMemo(() => {
    return works.filter(work => work.priority?.trim().toLowerCase() === 'high')
      .map(work => ({
        id: work.id,
        name: [work.task_name?.trim() || t('finance.noName'), work.factory_name?.trim()].filter(Boolean).join(' - '),
        progress: work.progress_percent ?? 0,
      }))
      .sort((a, b) => b.progress - a.progress);
  }, [works, t]);
  const financeStats = useMemo(() => calculateFinanceStats(works, includeEstimated), [works, includeEstimated]);
  const metrics = [
    { label: t('dashboard.totalWorks'), value: works.length, detail: t('dashboard.statusSummary', { done: counts.completed, inProgress: counts.inProgress, notStarted: counts.pending }), color: '#38d9f5' },
    { label: t('dashboard.avgProgress'), value: `${works.length ? Math.round(works.reduce((sum, work) => sum + work.progress_percent, 0) / works.length) : 0}%`, detail: t('dashboard.acrossAllWorks'), color: '#2dd4bf' },
    { label: t('dashboard.totalCapex'), value: formatBillion(financeStats.totalCapex), color: '#fbbf24' },
    { label: t('dashboard.estimatedSaving'), value: formatBillion(financeStats.totalSaving), color: '#a78bfa' },
    { label: t('dashboard.paybackTime'), value: `${financeStats.paybackPeriod} ${t('finance.units.years')}`, color: '#fb7185' },
  ];
  const distribution = statuses.map(status => ({ ...status, value: counts[status.key] }));
  const tooltipStyle = { backgroundColor: '#17243b', border: '1px solid #405471', borderRadius: 10, color: '#eef5ff' };

  if (worksQuery.isLoading) return <LoadingOverlay />;
  if (worksQuery.isError) return <ErrorState />;

  return (
    <div className="dashboard-wrapper dashboard-command">
      <header className="dashboard-heading">
        <div><h1>{t('dashboard.title')}</h1><p>{t('dashboard.subtitle', { count: works.length })}</p></div>
        <span className="dashboard-date">{new Date(now).toLocaleDateString(locale)}</span>
      </header>
      <div>
        <div className="form-check">
          <input id="dashboard-include-estimated" type="checkbox" className="form-check-input"
            checked={includeEstimated} onChange={event => setIncludeEstimated(event.target.checked)}
            aria-describedby="dashboard-saving-scope" />
          <label htmlFor="dashboard-include-estimated" className="form-check-label fw-semibold">{t('finance.includeEstimated')}</label>
        </div>
        <small id="dashboard-saving-scope" className="text-muted" aria-live="polite">
          {t(includeEstimated ? 'dashboard.allSavingsHint' : 'dashboard.actualSavingsHint')}
        </small>
      </div>
      <div className="dashboard-metrics">
        {metrics.map(metric => <section className="dashboard-panel dashboard-metric" key={metric.label} style={{ borderTopColor: metric.color }}>
          <h2>{metric.label}</h2><strong style={{ color: metric.color }}>{metric.value}</strong>
          {metric.detail && <p>{metric.detail}</p>}
        </section>)}
      </div>
      <div className="dashboard-overview">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading"><h2>{t('dashboard.progressByMainWorks')}</h2><span className="dashboard-high">High &middot; {projects.length}</span></div>
          {!projects.length && <EmptyState message={t('dashboard.noHighPriorityProjects')} />}
          <div className="dashboard-projects">
            {projects.map(project => <div className="dashboard-project" key={project.id}>
              <span className="dashboard-project-name" title={project.name}>{project.name}</span>
              <div className="dashboard-progress" role="progressbar" aria-label={project.name} aria-valuenow={project.progress} aria-valuemin={0} aria-valuemax={100}>
                <div style={{ width: `${project.progress}%` }} />
              </div><strong>{project.progress}%</strong>
            </div>)}
          </div>
        </section>
        <div className="dashboard-charts">
        <section className="dashboard-panel">
          <h2>{t('dashboard.statusDistribution')}</h2><p>{t('dashboard.rowsByCompletion')}</p>
          {works.length ? <div className="dashboard-donut">
            <ResponsiveContainer width="100%" height={240}><PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={68} outerRadius={96} paddingAngle={3} stroke="none">
                {distribution.map(entry => <Cell key={entry.key} fill={entry.color} />)}
              </Pie><Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#eef5ff' }} />
            </PieChart></ResponsiveContainer>
            <div className="dashboard-donut-center"><strong>{works.length}</strong><small>{t('dashboard.totalWorks')}</small></div>
          </div> : <EmptyState message={t('dashboard.noWorks')} />}
          <div className="dashboard-statuses">{distribution.map(status => <div key={status.key}>
            <span className="dashboard-status-label"><i style={{ background: status.color }} />{status.name}</span>
            <strong style={{ color: status.color }}>{status.value}</strong><small>{works.length ? (status.value / works.length * 100).toFixed(1) : 0}%</small>
          </div>)}</div>
        </section>
      <section className="dashboard-panel">
        <h2>{t('dashboard.progressByPic')}</h2><p>{t('dashboard.picChartHint')}</p>
        {!members.length ? <EmptyState message={t('dashboard.noWorks')} /> : <div className="dashboard-members-scroll">
          <div style={{ minWidth: Math.max(320, members.length * 65) }}>
            <ResponsiveContainer width="100%" height={360}><BarChart data={members} margin={{ top: 20, right: 20, left: 0, bottom: 12 }} barSize={32}>
              <CartesianGrid stroke="#2a3a53" vertical={false} />
              <XAxis dataKey="name" interval={0} tick={{ fill: '#b9c9df', fontSize: 11 }} tickFormatter={name => name.length > 16 ? `${name.slice(0, 15)}...` : name} tickLine={false} axisLine={false} height={55} />
              <YAxis allowDecimals={false} tick={{ fill: '#8ea3bf', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#eef5ff' }} cursor={{ fill: '#ffffff08' }}
                labelFormatter={(label, payload) => `${label} · ${t('dashboard.totalWorks')}: ${payload.reduce((sum, entry) => sum + Number(entry.value ?? 0), 0)}`} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              {statuses.map(status => <Bar key={status.key} dataKey={status.key} name={status.name} stackId="status" fill={status.color} stroke="#142036" strokeWidth={2} />)}
            </BarChart></ResponsiveContainer>
          </div>
        </div>}
      </section>
        </div>
      </div>
    </div>
  );
}
