import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, MonthSelects, PageHeader, SearchField } from './CrmKit';
import { activityTitle, inMonthRange, monthKey, shortDate } from './crmFormat';
import { loadAll } from './dashboard/dashboardModel';
import { useCrmDemo } from './useCrmDemo';
import './crmInsight.css';

const TYPE_LABEL = { student: 'Student', consultancy: 'Consultancy', referral: 'Referral', contact: 'Contact', settings: 'Settings' };

function named(record) {
  if (!record || typeof record !== 'object') return '';
  const name = record.consultancyName || record.fullName || record.name || '';
  const extra = [record.role, record.status, record.phone].filter(Boolean);
  if (!name) return extra.join(' · ');
  return extra.length ? `${name} · ${extra.join(' · ')}` : name;
}

function entityLabel(audit) {
  const name = named(audit.after) || named(audit.before);
  if (name) return name.split(' · ')[0];
  if (audit.entityType === 'settings') return 'Demo settings';
  return audit.entityId || 'Record';
}

function recordPath(audit) {
  if (audit.entityType === 'student') return `/crm/demo/students/${audit.entityId}`;
  if (audit.entityType === 'consultancy') return `/crm/demo/consultancies/${audit.entityId}`;
  if (audit.entityType === 'referral') return `/crm/demo/referrals?id=${audit.entityId}`;
  return '';
}

export default function AuditPage() {
  const { client, refresh } = useCrmDemo();
  const [params, setParams] = useSearchParams();
  const id = params.get('id') || '';
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const auditsLoad = loadAll((page) => client.listAudits({ page, limit: 100 }));
  const all = auditsLoad.items;
  const months = [...new Set(all.map((row) => monthKey(row.createdAt)).filter(Boolean))].sort();
  const needle = search.trim().toLowerCase();
  const searched = all.filter((row) => {
    const hay = `${row.action} ${activityTitle(row.action)} ${row.actorLabel || ''} ${row.reason || ''} ${entityLabel(row)}`.toLowerCase();
    return (!needle || hay.includes(needle)) && inMonthRange(row.createdAt, from, to);
  });
  const rows = searched.filter((row) => tab === 'all' || row.entityType === tab);
  const selected = id ? (all.find((row) => row.id === id) || null) : (rows[0] || null);
  const selectedMissing = Boolean(id) && auditsLoad.ok && !selected;
  const hiddenByFilters = Boolean(selected) && !rows.some((row) => row.id === selected.id);
  const fromValue = selected ? named(selected.before) : '';
  const toValue = selected ? named(selected.after) : '';
  const showChange = Boolean(fromValue || toValue) && fromValue !== toValue;
  const reason = selected?.reason?.trim() || '';
  const cards = [
    showChange && fromValue ? { label: 'Previous value', value: fromValue } : null,
    showChange && toValue ? { label: 'Recorded value', value: toValue } : null,
    reason ? { label: 'Reason', value: reason } : null,
  ].filter(Boolean);
  const related = selected ? recordPath(selected) : '';

  return (
    <>
      <PageHeader title="Activity" subtitle="Changes recorded for consultancies, students and referrals." />
      {auditsLoad.ok ? null : (
        <div className="gx-notice error" role="alert">
          <p>{auditsLoad.message}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      )}
      {auditsLoad.ok ? (
      <>
      <div className="gx-toolbar">
        <SearchField value={search} onChange={setSearch} label="Search activity" />
        <MonthSelects from={from} to={to} months={months} onFrom={setFrom} onTo={setTo} />
        {(needle || from || to || tab !== 'all') ? <button type="button" className="gx-text" onClick={() => { setSearch(''); setTab('all'); setFrom(''); setTo(''); }}>Clear filters</button> : null}
      </div>
      <div className="gx-tabs" role="tablist">
        {[
          { id: 'all', label: 'All', count: searched.length },
          { id: 'student', label: 'Students', count: searched.filter((row) => row.entityType === 'student').length },
          { id: 'consultancy', label: 'Consultancies', count: searched.filter((row) => row.entityType === 'consultancy').length },
          { id: 'referral', label: 'Referrals', count: searched.filter((row) => row.entityType === 'referral').length },
        ].map((item) => (
          <button key={item.id} type="button" className={`gx-tab${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)}>{item.label} <span>{item.count}</span></button>
        ))}
      </div>
      <div className={`gx-activity${id ? ' is-routed' : ''}`}>
        <section className="gx-co-card gx-activity-list">
          <p className="gx-kicker">Recent activity</p>
          {rows.length === 0 ? <p className="gx-note">No activity matches these filters.</p> : (
            <ul className="gx-activity-rows">
              {rows.map((row) => (
                <li key={row.id}>
                  <button type="button" className={row.id === selected?.id ? 'is-on' : ''} onClick={() => setParams({ id: row.id })}>
                    <span>
                      <strong>{activityTitle(row.action)}</strong>
                      <em>{entityLabel(row)}</em>
                    </span>
                    <span className="gx-act-side">
                      <Badge>{TYPE_LABEL[row.entityType] || row.entityType}</Badge>
                      <span>{shortDate(row.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="gx-co-card gx-activity-detail">
          {id ? <button type="button" className="gx-text gx-back" onClick={() => setParams({})}>Back to list</button> : null}
          {selected ? (
            <>
              <div className="gx-profile-top">
                <div>
                  <p className="gx-kicker">Selected activity</p>
                  <h3>{activityTitle(selected.action)}</h3>
                </div>
                <Badge>{TYPE_LABEL[selected.entityType] || selected.entityType}</Badge>
              </div>
              <dl className="gx-facts">
                <div><dt>Record</dt><dd>{entityLabel(selected)}</dd></div>
                <div><dt>When</dt><dd>{shortDate(selected.createdAt)}</dd></div>
                <div><dt>Recorded by</dt><dd>{selected.actorLabel || 'Demo'}</dd></div>
              </dl>
              {cards.length ? (
                <div className="gx-blocks">
                  {cards.map((card) => (
                    <div key={card.label} className="gx-block"><em>{card.label}</em><b>{card.value}</b></div>
                  ))}
                </div>
              ) : null}
              {related ? <Link className="gx-lime" to={related}>Open related record</Link> : null}
              {hiddenByFilters ? <p className="gx-note">This activity stays open. The current filters hide it in the list.</p> : null}
              <p className="gx-note">This history is stored in this browser. It is not tamper-proof and it is not a server audit log.</p>
            </>
          ) : <p className="gx-note">{selectedMissing ? 'Activity not found.' : 'Select an activity to view its details.'}</p>}
        </section>
      </div>
      </>
      ) : null}
    </>
  );
}
