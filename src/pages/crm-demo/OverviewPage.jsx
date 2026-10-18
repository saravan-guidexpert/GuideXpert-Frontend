import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrmDemo } from './useCrmDemo';
import ActivityFeed from './dashboard/ActivityFeed';
import AttentionList from './dashboard/AttentionList';
import GrowthPanel from './dashboard/GrowthPanel';
import KpiStrip from './dashboard/KpiStrip';
import QuickActions from './dashboard/QuickActions';
import ReferralSources from './dashboard/ReferralSources';
import { calendarQueryForBucket } from '../../utils/crmAnalytics';
import {
  attentionItems,
  buildChart,
  chartSubtitle,
  dayGreeting,
  includesSample,
  kpiHints,
  loadAll,
  localDayStamp,
  referralSources,
  referredStudentCount,
  relatedLabel,
  sampleEntityIds,
  sortActivity,
  uniqueRecent,
} from './dashboard/dashboardModel';
import './overview.css';

export default function CrmDemoOverviewPage() {
  const navigate = useNavigate();
  const { client, refresh } = useCrmDemo();
  const [period, setPeriod] = useState('year');
  const [picked, setPicked] = useState('');
  const now = useMemo(() => new Date(), []);
  const overview = client.overview();

  if (!overview.success) {
    return (
      <div className="gx-notice error" role="alert">
        <p>{overview.message || 'The overview could not be loaded.'}</p>
        <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
      </div>
    );
  }

  const counts = overview.data;
  const studentsLoad = loadAll((page) => client.listStudents({ page, limit: 100 }));
  const consultanciesLoad = loadAll((page) => client.listConsultancies({ page, limit: 100 }));
  const referralsLoad = loadAll((page) => client.listReferrals({ page, limit: 100 }));
  const auditsLoad = loadAll((page) => client.listAudits({ page, limit: 100 }));
  const students = studentsLoad.items;
  const consultancies = consultanciesLoad.items;
  const referrals = referralsLoad.items;
  const recordError = [studentsLoad, consultanciesLoad, referralsLoad].find((item) => !item.ok)?.message || '';
  const chart = buildChart(period, students, referrals, now);
  const focus = chart.points.some((point) => point.key === picked) ? picked : '';
  const sources = referralSources(referrals, consultancies);
  const attention = attentionItems({ students, consultancies, referrals });
  const hints = recordError
    ? null
    : kpiHints({
      studentCount: counts.students,
      consultancyCount: counts.consultancies,
      activeCount: counts.activeConsultancies,
      referredStudentCount: referredStudentCount(students, referrals),
      inactiveCount: consultancies.filter((row) => row.status === 'inactive').length,
    });
  const sample = !recordError && auditsLoad.ok && includesSample(students, referrals, sampleEntityIds(auditsLoad.items));
  const recent = sortActivity(uniqueRecent(Array.isArray(counts.recent) ? counts.recent : [])).map((entry) => ({
    ...entry,
    related: relatedLabel(entry, students, consultancies, referrals),
  }));

  const year = now.getFullYear();
  const growthSubtitle = period === 'year'
    ? `Students and referrals created in ${year}.${sample ? ' Seeded rows are demo data.' : ''}`
    : chartSubtitle(period);

  return (
    <div className="gx-home">
      <header className="gx-dash-head">
        <div className="gx-dash-copy">
          <h1>{dayGreeting(now)}, Demo Workspace</h1>
          <p className="gx-lede">Local demo records for consultancies, students and referrals. Stored in this browser.</p>
        </div>
      </header>
      <KpiStrip
        counts={counts}
        hints={hints ? {
          students: counts.students === 0 ? 'No profiles on file' : 'Profiles on file',
          consultancies: counts.consultancies === 0 ? 'No profiles on file' : 'Partner profiles',
          referrals: 'First source is kept',
          active: counts.consultancies ? `${counts.activeConsultancies} of ${counts.consultancies}` : 'No consultancies on file',
        } : null}
      />
      <GrowthPanel
        period={period}
        onPeriod={(next) => { setPeriod(next); setPicked(''); }}
        subtitle={growthSubtitle}
        chart={chart}
        picked={focus}
        onSelect={(key, point) => {
          if (period === '90' && point?.start && point?.end) {
            const from = localDayStamp(point.start);
            const to = localDayStamp(point.end);
            navigate(`/crm/calendar?view=agenda&from=${from}&to=${to}&month=${from.slice(0, 7)}`);
            return;
          }
          const query = calendarQueryForBucket(key);
          if (query?.day) navigate(`/crm/calendar?day=${query.day}`);
          else if (query?.month) navigate(`/crm/calendar?month=${query.month}`);
          else setPicked((current) => (current === key ? '' : key));
        }}
        error={recordError}
        onRetry={refresh}
      />
      <QuickActions />
      <ReferralSources sources={recordError ? [] : sources} total={referrals.length} error={recordError} onRetry={refresh} />
      <ActivityFeed entries={recent.slice(0, 4)} />
      <AttentionList items={recordError ? [] : attention} error={recordError} onRetry={refresh} />
    </div>
  );
}
