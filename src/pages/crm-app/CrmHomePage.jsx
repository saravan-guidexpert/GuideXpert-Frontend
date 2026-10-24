import { useEffect, useState } from 'react';
import { crmCan } from '../../constants/crmUserAccess';
import { crmPortalGet } from '../../utils/crmSessionApi';
import { useCrmSession } from './useCrmSession';

export default function CrmHomePage() {
  const { user } = useCrmSession();
  const [analytics, setAnalytics] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(crmCan(user, 'crm.analytics.read'));

  useEffect(() => {
    if (!crmCan(user, 'crm.analytics.read')) return undefined;
    let cancelled = false;
    crmPortalGet('/analytics', { period: '30', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success) setNotice(result.message || 'Analytics could not be loaded.');
      else setAnalytics(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <section>
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">Overview</h2>
          <p>{user?.fullName} · {user?.roleLabel}</p>
        </div>
      </header>
      {notice ? <div className="gx-notice error" role="alert"><p>{notice}</p></div> : null}
      {loading ? <p>Loading overview…</p> : null}
      {analytics ? (
        <div className="gx-metrics">
          <article className="gx-metric"><p>Referrals in 30 days</p><strong>{analytics.referralsInPeriod}</strong></article>
          <article className="gx-metric"><p>Active consultancies</p><strong>{analytics.activeConsultancies}</strong></article>
        </div>
      ) : null}
      {!loading && !analytics && !notice ? <p>Your account can sign in. Sections you can open are in the navigation.</p> : null}
    </section>
  );
}
