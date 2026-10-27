import { useEffect, useId, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCheckCircle,
  FiFilter,
  FiLock,
  FiSearch,
  FiUserCheck,
  FiUserX,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { initials, shareRows, staffRows, summaryCards } from '../../../../utils/crmConsultancies';
import { chartPalette } from '../../../crm-demo/crmTheme';
import { useAdminTheme } from './adminThemeContext';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function reducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Keeps keyboard focus inside an open panel and returns it to the opener on close.
// Escape is handled on the panel element, so a dialog layered on top (rendered
// outside the panel) closes on its own without closing this panel.
function useFocusTrap(open, onClose, initialRef) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const opener = typeof document !== 'undefined' ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      const target = initialRef?.current || panelRef.current?.querySelector(FOCUSABLE) || panelRef.current;
      if (target) target.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    };
  }, [open, initialRef]);

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeRef.current();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return { panelRef, onKeyDown };
}

export function Sheet({ open, variant = 'drawer', title, subtitle, onClose, initialFocusRef, footer, children }) {
  const { panelRef, onKeyDown } = useFocusTrap(open, onClose, initialFocusRef);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className={`cs-layer is-${variant}`}>
      <div className="cs-scrim" aria-hidden="true" onClick={onClose} />
      <section
        ref={panelRef}
        className={`cs-sheet is-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <header className="cs-sheet-head">
          <div className="cs-sheet-titles">
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <div className="cs-sheet-sub">{subtitle}</div> : null}
          </div>
          <button type="button" className="cs-icon-btn" onClick={onClose} aria-label="Close">
            <FiX size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="cs-sheet-body">{children}</div>
        {footer ? <footer className="cs-sheet-foot">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function Avatar({ name, size = 'md', muted = false }) {
  return (
    <span className={`cs-avatar is-${size}${muted ? ' is-muted' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Notice({ tone = 'error', children, onDismiss }) {
  const Icon = tone === 'success' ? FiCheckCircle : FiAlertTriangle;
  return (
    <div className={`cs-notice is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={15} aria-hidden="true" />
      <span>{children}</span>
      {onDismiss ? (
        <button type="button" className="cs-notice-x" onClick={onDismiss} aria-label="Dismiss message">
          <FiX size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Searchable single-select listbox. The caller owns the query and the server
 * search, so options always come from a scoped API response.
 */
export function PersonCombobox({
  label,
  query,
  onQuery,
  options,
  loading,
  error,
  onSelect,
  selected,
  onClear,
  placeholder = 'Search by name or email',
  emptyText = 'No matching CRM staff.',
  inputRef,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputId = useId();
  const choices = options || [];

  function choose(option) {
    if (!option || option.disabled) return;
    onSelect(option);
    setOpen(false);
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, Math.max(choices.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      choose(choices[active]);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
    }
  }

  if (selected) {
    return (
      <div className="cs-field">
        <span className="cs-label" id={`${inputId}-label`}>{label}</span>
        <div className="cs-chip" aria-labelledby={`${inputId}-label`}>
          <Avatar name={selected.primary} size="xs" />
          <span className="cs-chip-text">{selected.primary}</span>
          <button type="button" className="cs-chip-x" onClick={onClear} aria-label={`Clear ${label.toLowerCase()}`}>
            <FiX size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  const activeOption = open && choices[active] ? `${listId}-${choices[active].id}` : undefined;
  return (
    <div className="cs-field cs-combo">
      <label className="cs-label" htmlFor={inputId}>{label}</label>
      <div className="cs-input-wrap">
        <FiSearch size={14} aria-hidden="true" className="cs-input-ico" />
        <input
          ref={inputRef}
          id={inputId}
          className="cs-input has-icon"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event) => { onQuery(event.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open ? (
        <ul className="cs-listbox" id={listId} role="listbox" aria-label={label}>
          {loading ? <li className="cs-list-note" aria-live="polite">Searching…</li> : null}
          {!loading && error ? <li className="cs-list-note is-error">{error}</li> : null}
          {!loading && !error && !choices.length ? <li className="cs-list-note">{emptyText}</li> : null}
          {!loading && !error ? choices.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${option.id}`}
              role="option"
              aria-selected={index === active}
              aria-disabled={option.disabled || undefined}
              className={`cs-option${index === active ? ' is-active' : ''}${option.disabled ? ' is-disabled' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option)}
            >
              <Avatar name={option.primary} size="sm" muted={option.disabled} />
              <span className="cs-option-copy">
                <span className="cs-option-primary">{option.primary}</span>
                {option.secondary ? <span className="cs-option-secondary">{option.secondary}</span> : null}
              </span>
              {option.badge ? <span className="cs-option-badge">{option.badge}</span> : null}
            </li>
          )) : null}
        </ul>
      ) : null}
    </div>
  );
}

const CARD_ICONS = {
  total: FiBriefcase,
  active: FiCheckCircle,
  assigned: FiUserCheck,
  unassigned: FiUserX,
  staffAssigned: FiUsers,
};

export function SummaryCards({ summary, loading }) {
  if (loading) {
    return (
      <div className="cs-cards" aria-busy="true" aria-label="Loading organization totals">
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="cs-bone h-card" />)}
      </div>
    );
  }
  return (
    <ul className="cs-cards" aria-label="Organization totals">
      {summaryCards(summary).map((card) => {
        const Icon = card.unavailable ? FiLock : CARD_ICONS[card.key];
        return (
          <li key={card.key} className={`cs-card${card.unavailable ? ' is-unavailable' : ''}${card.key === 'unassigned' && card.value > 0 ? ' is-attention' : ''}`}>
            <div className="cs-card-head">
              <span className="cs-card-ico"><Icon size={14} aria-hidden="true" /></span>
              <span className="cs-card-label">{card.label}</span>
            </div>
            <p className="cs-card-value">{card.text}</p>
            <p className="cs-card-sub">{card.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}

function StaffTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <div className="cs-tip">
      <span>{row.name}</span>
      <strong>{row.consultancies} {row.consultancies === 1 ? 'consultancy' : 'consultancies'}</strong>
    </div>
  );
}

export function DistributionPanel({ summary, onPickStaff }) {
  const theme = useAdminTheme();
  const base = chartPalette(theme);
  const bar = theme === 'dark' ? '#d6ff4a' : '#c6f000';
  const shares = shareRows(summary);
  const staff = staffRows(summary);
  if (!shares) return null;
  return (
    <section className="cs-panel cs-distribution" aria-labelledby="cs-dist-title">
      <header className="cs-panel-head">
        <div>
          <h2 id="cs-dist-title">Distribution</h2>
          <p>Organization-wide. List filters do not change these figures.</p>
        </div>
      </header>
      <div className="cs-dist-grid">
        <div className="cs-shares">
          {shares.map((share) => (
            <div key={share.id} className="cs-share">
              <div className="cs-share-head">
                <h3>{share.label}</h3>
                <span>{share.parts[0].percent}% {share.parts[0].label.toLowerCase()}</span>
              </div>
              <div
                className="cs-share-track"
                role="img"
                aria-label={share.parts.map((part) => `${part.label} ${part.value} (${part.percent}%)`).join(', ')}
              >
                {share.parts.map((part, index) => (
                  part.value ? (
                    <span
                      key={part.id}
                      className={`cs-share-seg is-${index === 0 ? 'primary' : 'rest'}`}
                      style={{ flexGrow: part.value }}
                    />
                  ) : null
                ))}
              </div>
              <dl className="cs-share-legend">
                {share.parts.map((part, index) => (
                  <div key={part.id}>
                    <dt><i className={`cs-key is-${index === 0 ? 'primary' : 'rest'}`} aria-hidden="true" />{part.label}</dt>
                    <dd>{part.value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <div className="cs-staff-chart">
          <div className="cs-share-head">
            <h3>Consultancies per staff member</h3>
            <span>
              {summary.staffTruncated ? `Top ${staff.length} of ${summary.staffAssigned}` : `${staff.length} assigned`}
            </span>
          </div>
          {staff.length ? (
            <>
              <div className="cs-bars" role="img" aria-label={`Bar chart: ${staff.map((row) => `${row.name} ${row.consultancies}`).join(', ')}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staff} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }} barCategoryGap={6}>
                    <CartesianGrid horizontal={false} stroke={base.grid} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: base.tick }} />
                    <YAxis type="category" dataKey="short" width={84} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: base.tick }} />
                    <Tooltip cursor={{ fill: theme === 'dark' ? '#2a2f38' : '#f1f0ec' }} content={<StaffTooltip />} />
                    <Bar dataKey="consultancies" fill={bar} radius={[0, 5, 5, 0]} maxBarSize={18} isAnimationActive={!reducedMotion()} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="cs-sr-only">
                <caption>Active consultancy assignments per CRM staff member</caption>
                <thead><tr><th scope="col">Staff member</th><th scope="col">Consultancies</th></tr></thead>
                <tbody>
                  {staff.map((row) => <tr key={row.id}><th scope="row">{row.name}</th><td>{row.consultancies}</td></tr>)}
                </tbody>
              </table>
              <div className="cs-staff-links" aria-label="Filter the list by staff member">
                {staff.slice(0, 4).map((row) => (
                  <button key={row.id} type="button" className="cs-link-chip" onClick={() => onPickStaff(row)}>
                    <FiFilter size={12} aria-hidden="true" /> {`Show ${row.short}’s`}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="cs-muted-block">No CRM staff hold an active assignment yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
