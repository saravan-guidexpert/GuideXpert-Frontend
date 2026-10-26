import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  FiActivity, FiCheckCircle, FiEdit2, FiInfo, FiLink, FiMessageSquare, FiMoreHorizontal,
  FiPhone, FiPlus, FiRefreshCw, FiUser, FiUserPlus, FiUsers, FiXCircle,
} from 'react-icons/fi';
import { DEMO_ACTOR } from '../../../utils/crmDemoStore';
import { Dialog, SearchField } from '../CrmKit';
import { avatarColor, initials } from '../crmFormat';
import { exactDateTime, relativeTime } from './overviewModel';
import { buildActivityFeed, previousRemarkVersions, REMARK_LIMIT } from './remarksModel';
import './remarksActivity.css';

const FILTERS = [
  ['all', 'All activity'],
  ['remarks', 'Remarks'],
  ['events', 'System events'],
];

const ICONS = {
  call: FiPhone,
  done: FiCheckCircle,
  cancelled: FiXCircle,
  status: FiRefreshCw,
  student: FiUserPlus,
  referral: FiLink,
  owner: FiUser,
  remark: FiMessageSquare,
  contact: FiUsers,
  edit: FiEdit2,
  activity: FiActivity,
};

function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function whenLabel(iso, now) {
  const exact = exactDateTime(iso);
  const relative = relativeTime(iso, now);
  return { exact, relative };
}

export function RemarkDialog({ mode, text, onChange, saving, error, onClose, onSubmit, persisted = false }) {
  const helpId = useId();
  const countId = useId();
  const errorId = useId();
  const trimmed = text.trim();
  const title = mode === 'edit' ? 'Edit remark' : 'Add remark';
  const description = mode === 'edit'
    ? 'Update this note. The author and original time stay on the record, and the previous wording is kept.'
    : (persisted
      ? 'Add a note for this consultancy. It is saved for this signed-in account.'
      : 'Add a note for this consultancy. It is saved in this browser with the current demo author.');
  return (
    <Dialog
      title={title}
      description={description}
      className="gx-ra-dialog"
      hideDismiss
      focusSelector="textarea"
      onClose={saving ? () => {} : onClose}
    >
      <form className="gx-form" onSubmit={onSubmit}>
        <label>
          Remark
          <textarea
            name="remark"
            required
            maxLength={REMARK_LIMIT}
            rows={6}
            value={text}
            placeholder="Write a note about this consultancy"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${helpId} ${countId} ${errorId}` : `${helpId} ${countId}`}
            aria-errormessage={error ? errorId : undefined}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') event.currentTarget.form?.requestSubmit();
            }}
          />
        </label>
        <div className="gx-ra-composer-meta">
          <p id={helpId} className="gx-help">
            {mode === 'edit' ? 'The previous wording stays on the remark.' : 'Required. Shown on this consultancy timeline.'}
          </p>
          <span id={countId} className="gx-ra-count">{text.length}/{REMARK_LIMIT}</span>
        </div>
        {error ? <p id={errorId} className="gx-ra-form-error" role="alert">{error}</p> : null}
        <div className="gx-form-actions">
          <button type="button" className="gx-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="gx-lime" type="submit" disabled={saving || !trimmed} aria-busy={saving || undefined}>
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save remark'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function RemarkCard({ remark, now, menuOpen, historyOpen, onEdit, onToggleMenu, onCloseMenu, onToggleHistory, currentAuthorId }) {
  const menuRef = useRef(null);
  const versions = previousRemarkVersions(remark);
  const canEdit = remark.authorId === currentAuthorId;
  const stamp = whenLabel(remark.createdAt, now);
  const edited = remark.updatedAt && remark.updatedAt !== remark.createdAt;
  const author = remark.authorName || 'Demo';

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointer(event) {
      if (!menuRef.current?.contains(event.target)) onCloseMenu();
    }
    function onKey(event) {
      if (event.key === 'Escape') onCloseMenu();
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, onCloseMenu]);

  return (
    <article className="gx-ra-card">
      <header className="gx-ra-card-head">
        <span className="gx-ra-avatar" style={{ background: avatarColor(author) }} aria-hidden="true">{initials(author)}</span>
        <div className="gx-ra-who">
          <div className="gx-ra-name-row">
            <strong>{author}</strong>
            <span className="gx-ra-kind">Remark</span>
          </div>
          <p className="gx-ra-meta">
            <time dateTime={remark.createdAt || undefined}>{stamp.exact}</time>
            {stamp.relative ? <span>{stamp.relative}</span> : null}
            {edited ? <span>Edited {exactDateTime(remark.updatedAt)}</span> : null}
          </p>
        </div>
        {canEdit || versions.length ? (
          <div className="gx-ra-card-actions">
            {canEdit ? (
              <button type="button" className="gx-ra-edit" onClick={() => onEdit(remark)} aria-label={`Edit remark by ${author}`}>
                <FiEdit2 size={14} strokeWidth={1.75} aria-hidden="true" />
                Edit
              </button>
            ) : null}
            {versions.length ? (
              <div className="gx-ra-menu" ref={menuRef}>
                <button
                  type="button"
                  className="gx-ra-more"
                  aria-label={`More actions for remark by ${author}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => onToggleMenu(remark.id)}
                >
                  <FiMoreHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
                {menuOpen ? (
                  <div className="gx-ra-pop" role="menu">
                    <button type="button" role="menuitem" onClick={() => onToggleHistory(remark.id)}>
                      {historyOpen ? 'Hide previous wording' : 'Previous wording'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
      <p className="gx-ra-body">{remark.text}</p>
      {historyOpen && versions.length ? (
        <div className="gx-ra-previous">
          <p className="gx-ra-previous-label">Previous wording</p>
          {versions.map((version, index) => (
            <p key={`${version.updatedAt || 'previous'}-${index}`}>
              {version.text}
              {version.updatedAt ? <time dateTime={version.updatedAt}>{exactDateTime(version.updatedAt)}</time> : null}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function EventRow({ entry, now }) {
  const view = entry.view;
  const Icon = ICONS[view.icon] || FiActivity;
  const stamp = whenLabel(entry.at, now);
  return (
    <div className="gx-ra-event">
      <div className="gx-ra-event-top">
        <strong>{view.title}</strong>
        <span className="gx-ra-kind">{view.typeLabel}</span>
      </div>
      {view.detail ? <p className="gx-ra-detail">{view.detail}</p> : null}
      <p className="gx-ra-meta">
        <span>{view.actor}</span>
        <time dateTime={entry.at || undefined}>{stamp.relative ? `${stamp.relative}` : stamp.exact}</time>
        {stamp.relative ? <span>{stamp.exact}</span> : null}
      </p>
    </div>
  );
}

export default function RemarksActivity({
  remarks,
  audits,
  remarksError,
  auditsError,
  now,
  onAdd,
  onEdit,
  onRetry,
  persisted = false,
  currentAuthorId = DEMO_ACTOR.id,
}) {
  const titleId = useId();
  const [mode, setMode] = useState('all');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [menuId, setMenuId] = useState(null);
  const [historyId, setHistoryId] = useState(null);
  const toggleMenu = useCallback((id) => {
    setMenuId((current) => (current === id ? null : id));
  }, []);
  const closeMenu = useCallback(() => setMenuId(null), []);
  const toggleHistory = useCallback((id) => {
    setHistoryId((current) => (current === id ? null : id));
    setMenuId(null);
  }, []);
  const feed = buildActivityFeed({ remarks, audits, mode, query, from, to });
  const narrowed = Boolean(query.trim()) || Boolean(from) || Boolean(to);
  const filtersActive = narrowed || mode !== 'all';
  const remarkCount = Array.isArray(remarks) ? remarks.length : 0;
  const auditCount = Array.isArray(audits) ? audits.length : 0;

  function clearFilters() {
    setMode('all');
    setQuery('');
    setFrom('');
    setTo('');
  }

  function onFilterKey(event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = FILTERS.findIndex(([value]) => value === mode);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = FILTERS[(index + step + FILTERS.length) % FILTERS.length][0];
    setMode(next);
    event.currentTarget.parentElement?.querySelector(`[data-mode="${next}"]`)?.focus();
  }

  let emptyTitle = 'No records match these filters.';
  let emptyCopy = 'Try a different search, type, or date range.';
  if (!feed.rangeError && !narrowed && mode === 'all' && remarkCount + auditCount === 0) {
    emptyTitle = 'No remarks or activity yet.';
    emptyCopy = 'Notes, status updates, referrals, and student records for this consultancy will show up here.';
  } else if (!feed.rangeError && !narrowed && mode === 'remarks' && remarkCount === 0) {
    emptyTitle = 'No remarks yet.';
    emptyCopy = 'Add a remark to keep the conversation on this consultancy.';
  } else if (!feed.rangeError && !narrowed && mode === 'events' && auditCount === 0) {
    emptyTitle = 'No system events yet.';
    emptyCopy = 'Status updates, referrals, and other consultancy changes will show up here.';
  }

  return (
    <section className="gx-ra" aria-labelledby={titleId}>
      <header className="gx-ra-head">
        <div>
          <h2 id={titleId}>Remarks & Activity</h2>
          <p className="gx-ra-lead">Track conversations, notes and consultancy updates.</p>
          <p className="gx-ra-counts">
            <span>{remarksError ? 'Remarks unavailable' : countLabel(remarkCount, 'remark', 'remarks')}</span>
            <span>{auditsError ? 'Activity unavailable' : countLabel(auditCount, 'activity event', 'activity events')}</span>
          </p>
          <p className="gx-ra-store" role="note">
            <FiInfo size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>{persisted ? 'Remarks and activity are saved on the server for this consultancy.' : 'This history is stored in the browser. It is not tamper-proof and it is not a server audit log.'}</span>
          </p>
        </div>
        <button type="button" className="gx-lime" onClick={onAdd}>
          <FiPlus size={15} strokeWidth={2} aria-hidden="true" />
          Add remark
        </button>
      </header>

      <div className="gx-ra-bar">
        <SearchField value={query} onChange={setQuery} label="Search remarks and activity" />
        <div className="gx-ra-seg" role="radiogroup" aria-label="Activity type" onKeyDown={onFilterKey}>
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              data-mode={value}
              aria-checked={mode === value}
              tabIndex={mode === value ? 0 : -1}
              className={mode === value ? 'is-on' : ''}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="gx-ra-dates">
          <label className="gx-ra-date">
            <span>From</span>
            <input type="date" value={from} aria-label="From date" onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="gx-ra-date">
            <span>To</span>
            <input type="date" value={to} aria-label="To date" onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        {filtersActive ? <span className="gx-ra-showing">Showing {feed.entries.length}</span> : null}
        {filtersActive ? <button type="button" className="gx-ra-clear" onClick={clearFilters}>Clear filters</button> : null}
      </div>
      {remarksError ? <div className="gx-notice error" role="alert"><p>{remarksError}</p><button type="button" className="gx-btn" onClick={onRetry}>Retry</button></div> : null}
      {auditsError ? <div className="gx-notice error" role="alert"><p>{auditsError}</p><button type="button" className="gx-btn" onClick={onRetry}>Retry</button></div> : null}

      {feed.entries.length === 0 ? (
        <div className="gx-ra-empty" role={feed.rangeError ? 'alert' : undefined}>
          <strong>{feed.rangeError ? 'That date range is not valid.' : emptyTitle}</strong>
          <p>{feed.rangeError ? feed.rangeError : emptyCopy}</p>
          {filtersActive ? <button type="button" className="gx-btn" onClick={clearFilters}>Clear filters</button> : null}
          {!remarksError && !feed.rangeError && !narrowed && mode !== 'events' && remarkCount === 0 ? (
            <button type="button" className="gx-lime" onClick={onAdd}>Add remark</button>
          ) : null}
        </div>
      ) : (
        <ol className="gx-ra-list" aria-label="Remarks and activity, newest first">
          {feed.entries.map((entry) => {
            const icon = entry.kind === 'remark' ? 'remark' : entry.view.icon;
            const Icon = ICONS[icon] || FiActivity;
            return (
              <li key={entry.id} className={`gx-ra-item is-${entry.kind}`}>
                <span className={`gx-ra-mark is-${icon}`} aria-hidden="true">
                  <Icon size={15} strokeWidth={1.75} />
                </span>
                {entry.kind === 'remark' ? (
                  <RemarkCard
                    remark={entry.remark}
                    now={now}
                    menuOpen={menuId === entry.remark.id}
                    historyOpen={historyId === entry.remark.id}
                    onEdit={onEdit}
                    onToggleMenu={toggleMenu}
                    onCloseMenu={closeMenu}
                    onToggleHistory={toggleHistory}
                    currentAuthorId={currentAuthorId}
                  />
                ) : <EventRow entry={entry} now={now} />}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
