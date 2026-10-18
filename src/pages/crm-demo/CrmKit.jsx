import { useEffect, useRef } from 'react';
import { FiSearch } from 'react-icons/fi';
import { monthLabel } from './crmFormat';
import { useCrmDemo } from './useCrmDemo';

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="gx-page-head">
      <div>
        <h2 className="gx-title">{title}</h2>
        {subtitle ? <p className="gx-subtitle">{subtitle}</p> : null}
      </div>
      <div className="gx-actions">{children}</div>
    </header>
  );
}

export function MetricRow() {
  const { client } = useCrmDemo();
  const overview = client.overview();
  const counts = overview.success ? overview.data : { consultancies: 0, activeConsultancies: 0, students: 0, referrals: 0 };
  const cards = [
    { label: 'Consultancies', value: counts.consultancies, hint: 'Profiles on file' },
    { label: 'Students', value: counts.students, hint: 'Local student profiles' },
    { label: 'Referrals', value: counts.referrals, hint: 'First source is kept' },
    { label: 'Active consultancies', value: counts.activeConsultancies, hint: `${counts.activeConsultancies} of ${counts.consultancies}`, accent: true },
  ];
  return (
    <section className="gx-metrics" aria-label="CRM totals">
      {cards.map((card) => (
        <article key={card.label} className={`gx-metric${card.accent ? ' is-accent' : ''}`}>
          <p className="k">{card.label}</p>
          <p className="v">{card.value}</p>
          <p className="h">{card.hint}</p>
        </article>
      ))}
    </section>
  );
}

export function Notice({ notice }) {
  if (!notice) return null;
  const alert = notice.tone === 'error' || notice.tone === 'warning';
  return <div className={`gx-notice ${notice.tone || ''}`} role={alert ? 'alert' : 'status'}>{notice.message}</div>;
}

export function Dialog({ title, children, onClose }) {
  const cardRef = useRef(null);
  useEffect(() => {
    cardRef.current?.focus();
  }, []);
  return (
    <div className="gx-modal" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <div ref={cardRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="gx-modal-card">
        <h3>{title}</h3>
        {children}
        <div className="gx-form-actions">
          <button type="button" className="gx-text" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function MonthSelects({ from, to, months, onFrom, onTo }) {
  return (
    <>
      <select className="gx-select" aria-label="From month" value={from} onChange={(event) => onFrom(event.target.value)}>
        <option value="">From any month</option>
        {months.map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}
      </select>
      <select className="gx-select" aria-label="To month" value={to} onChange={(event) => onTo(event.target.value)}>
        <option value="">To any month</option>
        {months.map((month) => <option key={`to-${month}`} value={month}>{monthLabel(month)}</option>)}
      </select>
    </>
  );
}

export function SearchField({ value, onChange, label }) {
  return (
    <label className="gx-search">
      <FiSearch size={15} aria-hidden="true" />
      <input value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} placeholder={label} />
    </label>
  );
}

export function Badge({ children, tone }) {
  return <span className={`gx-badge${tone ? ` is-${tone}` : ''}`}>{children}</span>;
}

export function DataTable({ columns, rows, selectedId, onSelect, empty }) {
  return (
    <div className="gx-table-wrap">
      <table className="gx-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="gx-empty" colSpan={columns.length}>{empty}</td></tr>
          ) : rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={onSelect ? 0 : undefined}
              className={row.id === selectedId ? 'is-selected' : ''}
              onClick={() => onSelect?.(row.id)}
              onKeyDown={onSelect ? (event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(row.id);
                }
              } : undefined}
            >
              {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
