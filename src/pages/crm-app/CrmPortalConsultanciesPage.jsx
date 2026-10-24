import { useEffect, useState } from 'react';
import { crmCan } from '../../constants/crmUserAccess';
import { crmPortalGet, crmPortalSend } from '../../utils/crmSessionApi';
import { useCrmSession } from './useCrmSession';

export default function CrmPortalConsultanciesPage() {
  const { user } = useCrmSession();
  const canRead = crmCan(user, 'crm.consultancies.read');
  const canCreate = crmCan(user, 'crm.consultancies.create');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    crmPortalGet('/consultancies', { page: 1, limit: 50 }).then((result) => {
      setLoading(false);
      if (!result.success) {
        setItems([]);
        setNotice({ tone: 'error', text: result.message || 'Consultancies could not be loaded.' });
        return;
      }
      setNotice(null);
      setItems(result.data?.items || []);
    });
  }

  useEffect(() => {
    if (!canRead) return undefined;
    let cancelled = false;
    crmPortalGet('/consultancies', { page: 1, limit: 50 }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setItems([]);
        setNotice({ tone: 'error', text: result.message || 'Consultancies could not be loaded.' });
        return;
      }
      setNotice(null);
      setItems(result.data?.items || []);
    });
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  async function onCreate(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await crmPortalSend('/consultancies', 'POST', { name, status: 'active' });
    setSaving(false);
    if (!result.success) {
      setNotice({ tone: 'error', text: result.message || 'Consultancy was not created.' });
      return;
    }
    setName('');
    setNotice({ tone: 'success', text: result.message || 'Consultancy created.' });
    load();
  }

  if (!canRead) {
    return (
      <section>
        <header className="gx-page-head"><div><h2 className="gx-title">Consultancies</h2></div></header>
        <p>This section is outside your CRM permissions.</p>
      </section>
    );
  }

  return (
    <section>
      <header className="gx-page-head"><div><h2 className="gx-title">Consultancies</h2></div></header>
      {notice ? (
        <div className={`gx-notice ${notice.tone === 'success' ? 'success' : 'error'}`} role="alert">
          <p>{notice.text}</p>
          {notice.tone === 'error' ? <button type="button" className="gx-ghost" onClick={load}>Retry</button> : null}
        </div>
      ) : null}
      {loading ? <p>Loading consultancies…</p> : null}
      {!loading && items.length === 0 && !notice ? <p>No consultancies yet.</p> : null}
      {!loading && items.length > 0 ? (
        <div className="gx-table-wrap">
          <table className="gx-table">
            <thead><tr><th>Name</th><th>Status</th></tr></thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}><td>{row.name}</td><td>{row.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {canCreate ? (
        <form className="gx-form gx-portal-form" onSubmit={onCreate}>
          <h3>Add consultancy</h3>
          <label><span>Name</span><input aria-label="Consultancy name" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <button className="gx-lime" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create consultancy'}</button>
        </form>
      ) : null}
    </section>
  );
}
