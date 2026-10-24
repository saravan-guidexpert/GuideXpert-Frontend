import { useEffect, useState } from 'react';
import { crmCan } from '../../constants/crmUserAccess';
import { crmPortalGet, crmPortalSend } from '../../utils/crmSessionApi';
import { useCrmSession } from './useCrmSession';

export default function CrmPortalReferralsPage() {
  const { user } = useCrmSession();
  const canRead = crmCan(user, 'crm.referrals.read');
  const canCorrect = crmCan(user, 'crm.referrals.correct_source');
  const canReadConsultancies = crmCan(user, 'crm.consultancies.read');
  const [items, setItems] = useState([]);
  const [consultancies, setConsultancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState('');
  const [consultancyId, setConsultancyId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      crmPortalGet('/referrals', { page: 1, limit: 50 }),
      canReadConsultancies ? crmPortalGet('/consultancies', { page: 1, limit: 100, status: 'active' }) : Promise.resolve({ success: true, data: { items: [] } }),
    ]).then(([referrals, firms]) => {
      setLoading(false);
      if (!referrals.success) {
        setNotice({ tone: 'error', text: referrals.message || 'Referrals could not be loaded.' });
        setItems([]);
        return;
      }
      setNotice(null);
      setItems(referrals.data?.items || []);
      setConsultancies(firms.success ? firms.data?.items || [] : []);
    });
  }

  useEffect(() => {
    if (!canRead) return undefined;
    let cancelled = false;
    Promise.all([
      crmPortalGet('/referrals', { page: 1, limit: 50 }),
      canReadConsultancies ? crmPortalGet('/consultancies', { page: 1, limit: 100, status: 'active' }) : Promise.resolve({ success: true, data: { items: [] } }),
    ]).then(([referrals, firms]) => {
      if (cancelled) return;
      setLoading(false);
      if (!referrals.success) {
        setNotice({ tone: 'error', text: referrals.message || 'Referrals could not be loaded.' });
        setItems([]);
        return;
      }
      setNotice(null);
      setItems(referrals.data?.items || []);
      setConsultancies(firms.success ? firms.data?.items || [] : []);
    });
    return () => {
      cancelled = true;
    };
  }, [canRead, canReadConsultancies]);

  async function onCorrect(event) {
    event.preventDefault();
    if (saving || !selected) return;
    setSaving(true);
    const result = await crmPortalSend(`/referrals/${selected}/source-correction`, 'POST', { consultancyId, reason });
    setSaving(false);
    if (!result.success) {
      setNotice({ tone: 'error', text: result.message || 'Source was not corrected.' });
      return;
    }
    setReason('');
    setNotice({ tone: 'success', text: 'Referral source corrected.' });
    load();
  }

  if (!canRead) {
    return (
      <section>
        <header className="gx-page-head"><div><h2 className="gx-title">Referrals</h2></div></header>
        <p>This section is outside your CRM permissions.</p>
      </section>
    );
  }

  return (
    <section>
      <header className="gx-page-head"><div><h2 className="gx-title">Referrals</h2></div></header>
      {notice ? (
        <div className={`gx-notice ${notice.tone === 'success' ? 'success' : 'error'}`} role="alert">
          <p>{notice.text}</p>
          {notice.tone === 'error' ? <button type="button" className="gx-ghost" onClick={load}>Retry</button> : null}
        </div>
      ) : null}
      {loading ? <p>Loading referrals…</p> : null}
      {!loading && items.length === 0 && !notice ? <p>No referrals yet.</p> : null}
      {!loading && items.length > 0 ? (
        <div className="gx-table-wrap">
          <table className="gx-table">
            <thead><tr><th>Student</th><th>Consultancy</th><th>Referred</th></tr></thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.studentName || row.crmStudentId}</td>
                  <td>{row.consultancyName}</td>
                  <td>{row.referredAt ? new Date(row.referredAt).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {canCorrect ? (
        <form className="gx-form gx-portal-form" onSubmit={onCorrect}>
          <h3>Correct source</h3>
          <label>
            <span>Referral</span>
            <select aria-label="Referral" value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">Choose</option>
              {items.map((row) => <option key={row.id} value={row.id}>{row.consultancyName} · {row.id.slice(-6)}</option>)}
            </select>
          </label>
          <label>
            <span>New consultancy</span>
            <select aria-label="New consultancy" value={consultancyId} onChange={(event) => setConsultancyId(event.target.value)}>
              <option value="">Choose</option>
              {consultancies.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label>
            <span>Reason</span>
            <input aria-label="Correction reason" value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <button className="gx-lime" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Correct source'}</button>
        </form>
      ) : null}
    </section>
  );
}
