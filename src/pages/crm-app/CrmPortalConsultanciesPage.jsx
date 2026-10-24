import { useEffect, useState } from 'react';
import { crmCan } from '../../constants/crmUserAccess';
import { CONSULTANCY_PIPELINE, pipelineCounts, pipelineLabel } from '../../utils/consultancyPipeline';
import { crmPortalGet, crmPortalSend } from '../../utils/crmSessionApi';
import { useCrmSession } from './useCrmSession';

const EMPTY_PIPELINE = { total: 0, fresh: 0, contacted: 0, meeting_done: 0, onboarded: 0 };

export default function CrmPortalConsultanciesPage() {
  const { user } = useCrmSession();
  const canCreate = crmCan(user, 'crm.consultancies.create');
  const [items, setItems] = useState([]);
  const [pipeline, setPipeline] = useState(EMPTY_PIPELINE);
  const [stage, setStage] = useState('all');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [name, setName] = useState('');
  const [pipelineStage, setPipelineStage] = useState('fresh');
  const [saving, setSaving] = useState(false);

  function applyResult(result) {
    setLoading(false);
    if (!result.success) {
      setItems([]);
      setPipeline(EMPTY_PIPELINE);
      setNotice({ tone: 'error', text: result.message || 'Consultancies could not be loaded.' });
      return;
    }
    const nextItems = result.data?.items || [];
    setNotice(null);
    setItems(nextItems);
    setPipeline(result.data?.pipeline || pipelineCounts(nextItems));
  }

  function load(nextStage = stage) {
    setLoading(true);
    crmPortalGet('/consultancies', { page: 1, limit: 50, pipelineStage: nextStage === 'all' ? '' : nextStage }).then(applyResult);
  }

  useEffect(() => {
    let cancelled = false;
    crmPortalGet('/consultancies', { page: 1, limit: 50, pipelineStage: stage === 'all' ? '' : stage }).then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [stage]);

  async function onCreate(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await crmPortalSend('/consultancies', 'POST', { name, status: 'active', pipelineStage });
    setSaving(false);
    if (!result.success) {
      setNotice({ tone: 'error', text: result.message || 'Consultancy was not created.' });
      return;
    }
    setName('');
    setNotice({ tone: 'success', text: result.message || 'Consultancy created.' });
    load();
  }

  return (
    <section>
      <header className="gx-page-head"><div><h2 className="gx-title">Consultancies</h2><p>Follow each consultancy from first contact through onboarding.</p></div></header>
      <section className="gx-metrics is-five" aria-label="Consultancy pipeline">
        <button type="button" className={`gx-metric${stage === 'all' ? ' is-selected' : ''}`} aria-pressed={stage === 'all'} onClick={() => setStage('all')}>
          <p className="k">Total consultancies</p>
          <p className="v">{pipeline.total}</p>
          <p className="h">Every consultancy</p>
        </button>
        {CONSULTANCY_PIPELINE.map((item) => (
          <button key={item.id} type="button" className={`gx-metric${stage === item.id ? ' is-selected' : ''}`} aria-pressed={stage === item.id} onClick={() => setStage(item.id)}>
            <p className="k">{item.label}</p>
            <p className="v">{pipeline[item.id]}</p>
            <p className="h">{item.hint}</p>
          </button>
        ))}
      </section>
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
            <thead><tr><th>Name</th><th>Pipeline</th><th>Record</th></tr></thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}><td>{row.name}</td><td>{pipelineLabel(row.pipelineStage)}</td><td className="capitalize">{row.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {canCreate ? (
        <form className="gx-form gx-portal-form" onSubmit={onCreate}>
          <h3>Add consultancy</h3>
          <label><span>Name</span><input aria-label="Consultancy name" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span>Pipeline</span>
            <select aria-label="Pipeline stage" value={pipelineStage} onChange={(event) => setPipelineStage(event.target.value)}>
              {CONSULTANCY_PIPELINE.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <button className="gx-lime" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create consultancy'}</button>
        </form>
      ) : null}
    </section>
  );
}
