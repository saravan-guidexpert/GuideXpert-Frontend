import { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiMoreHorizontal } from 'react-icons/fi';
import { localDayKey } from '../../../utils/crmAnalytics';
import { exactDateTime } from './overviewModel';
import useMatchMedia from './useMatchMedia';
import {
  MONTH_CHIP_LIMIT,
  WEEK_CHIP_LIMIT,
  WEEKDAYS,
  buildMonthGrid,
  buildWeekGrid,
  dateFromKey,
  dayTitle,
  eventLabel,
  eventTime,
  eventsByDay,
  filterFollowUps,
  filterOptions,
  followUpTone,
  followUpType,
  groupedFollowUps,
  monthTitle,
  pickedTitle,
  shiftDayKey,
  shiftMonth,
  splitEvents,
  typeLabel,
  undatedFollowUps,
  weekTitle,
} from './followUpCalendarModel';
import './followUpCalendar.css';

const VIEWS = [
  ['month', 'Month'],
  ['week', 'Week'],
  ['day', 'Day'],
];

function cellLabel(cell, count, todayKey, selectedKey) {
  const spoken = dateFromKey(cell.key).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const noun = count === 1 ? 'follow-up' : 'follow-ups';
  const bits = [`${spoken}, ${count} ${noun}`];
  if (cell.key === todayKey) bits.push('today');
  if (cell.key === selectedKey) bits.push('selected');
  if (!cell.inMonth) bits.push('outside this month');
  return bits.join(', ');
}

function FollowUpActions({ row, scope, saving, onComplete, onReschedule, onCancel, menuFor, setMenuFor }) {
  const open = !row.completedAt && !row.cancelledAt;
  const menuId = `${scope}:${row.id}`;
  const menuOpen = menuFor === menuId;
  if (!open) return null;
  return (
    <div className="gx-fu-actions">
      <button type="button" className="gx-fu-text is-primary" disabled={saving} onClick={() => onComplete(row)}>Complete</button>
      <button
        type="button"
        className="gx-fu-text gx-fu-menu-btn"
        aria-label={`Actions for ${eventLabel(row)}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuFor(menuOpen ? '' : menuId)}
      >
        <FiMoreHorizontal size={15} aria-hidden="true" />
      </button>
      {menuOpen ? (
        <div className="gx-fu-menu" role="menu">
          <button type="button" role="menuitem" disabled={saving} onClick={() => { setMenuFor(''); onReschedule(row); }}>Reschedule</button>
          <button type="button" role="menuitem" disabled={saving} onClick={() => { setMenuFor(''); onCancel(row); }}>Cancel</button>
        </div>
      ) : null}
    </div>
  );
}

function FollowUpList({ rows, scope, consultancyName, activeId, saving, now, onOpen, onComplete, onReschedule, onCancel, menuFor, setMenuFor, empty }) {
  if (rows.length === 0) return <p className="gx-fu-empty">{empty}</p>;
  return (
    <ul className="gx-fu-list">
      {rows.map((row) => {
        const tone = followUpTone(row, now);
        const active = row.id === activeId;
        return (
          <li key={row.id} className={`gx-fu-item${active ? ' is-active' : ''}${tone === 'completed' ? ' is-done' : ''}`}>
            <button type="button" className="gx-fu-open" onClick={() => onOpen(row)}>
              <i className={`gx-fu-dot is-${tone}`} aria-hidden="true" />
              <span>
                <strong>{row.status || typeLabel(followUpType(row))}</strong>
                <span className="gx-fu-meta">{consultancyName}</span>
                <span className="gx-fu-meta">{exactDateTime(row.scheduledAt || row.completedAt)} · {row.actorName || 'Unassigned'}</span>
                {row.notes ? <span className="gx-fu-note">{row.notes}</span> : null}
              </span>
            </button>
            <FollowUpActions
              row={row}
              scope={scope}
              saving={saving}
              onComplete={onComplete}
              onReschedule={onReschedule}
              onCancel={onCancel}
              menuFor={menuFor}
              setMenuFor={setMenuFor}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default function FollowUpCalendar({
  items,
  error,
  loading,
  consultancyName,
  saving,
  focusBucket,
  now,
  onRetry,
  onComplete,
  onCancel,
  onScheduleCall,
  onCreateFollowUp,
  onReschedule,
  onOpenConsultancy,
}) {
  const compact = useMatchMedia('(max-width: 720px)');
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState({ year: now.getFullYear(), monthIndex: now.getMonth() });
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [weekAnchor, setWeekAnchor] = useState(todayKey);
  const [status, setStatus] = useState('all');
  const [owner, setOwner] = useState('all');
  const [type, setType] = useState('all');
  const [activeId, setActiveId] = useState('');
  const [completedOpen, setCompletedOpen] = useState(focusBucket === 'completed');
  const [seenFocus, setSeenFocus] = useState(focusBucket);
  const [menuFor, setMenuFor] = useState('');
  if (focusBucket !== seenFocus) {
    setSeenFocus(focusBucket);
    if (focusBucket === 'completed') setCompletedOpen(true);
  }
  const gridRef = useRef(null);
  const keyboardNav = useRef(false);

  const options = useMemo(() => filterOptions(items), [items]);
  const filtered = useMemo(() => filterFollowUps(items, { status, owner, type }), [items, status, owner, type]);
  const byDay = useMemo(() => eventsByDay(filtered), [filtered]);
  const groups = useMemo(() => groupedFollowUps(filtered, now), [filtered, now]);
  const monthCells = useMemo(() => buildMonthGrid(cursor.year, cursor.monthIndex), [cursor.year, cursor.monthIndex]);
  const weekCells = useMemo(() => buildWeekGrid(weekAnchor), [weekAnchor]);
  const cells = view === 'week' ? weekCells : monthCells;
  const selectedEvents = byDay.get(selectedKey) || [];
  const active = filtered.find((row) => row.id === activeId) || null;
  const undated = undatedFollowUps(filtered);
  const heading = view === 'month' ? monthTitle(cursor.year, cursor.monthIndex) : view === 'week' ? weekTitle(weekCells) : dayTitle(selectedKey);
  const chipLimit = view === 'week' ? WEEK_CHIP_LIMIT : MONTH_CHIP_LIMIT;
  const stageKey = view === 'month' ? `month-${cursor.year}-${cursor.monthIndex}` : view === 'week' ? `week-${weekCells[0]?.key || ''}` : `day-${selectedKey}`;

  useEffect(() => {
    if (!menuFor) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') setMenuFor('');
    }
    function onPointer(event) {
      const target = event.target;
      if (target?.closest?.('.gx-fu-menu') || target?.closest?.('.gx-fu-menu-btn')) return;
      setMenuFor('');
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuFor]);

  useEffect(() => {
    if (!keyboardNav.current) return;
    keyboardNav.current = false;
    gridRef.current?.querySelector(`[data-date="${selectedKey}"]`)?.focus();
  }, [selectedKey, stageKey]);

  function reveal(key) {
    const [year, month] = key.split('-').map(Number);
    const monthIndex = month - 1;
    setCursor((current) => (current.year === year && current.monthIndex === monthIndex ? current : { year, monthIndex }));
    setWeekAnchor(key);
  }

  function selectDate(key) {
    setSelectedKey(key);
    setActiveId('');
    setMenuFor('');
    reveal(key);
  }

  function openEvent(row) {
    const key = localDayKey(row.scheduledAt || row.completedAt) || selectedKey;
    setSelectedKey(key);
    setActiveId(row.id);
    setMenuFor('');
    reveal(key);
  }

  function move(delta) {
    if (view === 'month') {
      setCursor((current) => shiftMonth(current.year, current.monthIndex, delta));
      return;
    }
    const amount = view === 'week' ? delta * 7 : delta;
    const next = shiftDayKey(view === 'week' ? weekAnchor : selectedKey, amount);
    if (!next) return;
    if (view === 'day') setSelectedKey(next);
    reveal(next);
  }

  function goToday() {
    setSelectedKey(todayKey);
    setActiveId('');
    setMenuFor('');
    reveal(todayKey);
  }

  function chooseView(next) {
    if (next === view) return;
    setView(next);
    if (next !== 'month') reveal(selectedKey);
  }

  function onCellKeyDown(event, key) {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    if (delta) {
      event.preventDefault();
      const next = shiftDayKey(key, delta);
      if (!next) return;
      keyboardNav.current = true;
      selectDate(next);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectDate(key);
    }
  }

  const selectedInView = cells.some((cell) => cell.key === selectedKey);
  const tabKey = selectedInView ? selectedKey : cells[0]?.key;

  return (
    <div className="gx-fu">
      <section className="gx-fu-board" aria-label="Follow-up calendar">
        <div className="gx-fu-toolbar">
          <div className="gx-fu-nav">
            <button type="button" className="gx-fu-today" onClick={goToday}>Today</button>
            <button type="button" className="gx-fu-icon" aria-label={view === 'week' ? 'Previous week' : view === 'day' ? 'Previous day' : 'Previous month'} onClick={() => move(-1)}>
              <FiChevronLeft size={16} aria-hidden="true" />
            </button>
            <h3 className="gx-fu-heading">{heading}</h3>
            <button type="button" className="gx-fu-icon" aria-label={view === 'week' ? 'Next week' : view === 'day' ? 'Next day' : 'Next month'} onClick={() => move(1)}>
              <FiChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="gx-fu-view" role="radiogroup" aria-label="Calendar view">
            {VIEWS.map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={view === value} className={view === value ? 'is-on' : ''} onClick={() => chooseView(value)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="gx-fu-filters">
          <label>Status
            <select aria-label="Follow-up status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              {options.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>Owner
            <select aria-label="Assigned owner" value={owner} onChange={(event) => setOwner(event.target.value)}>
              <option value="all">All owners</option>
              {options.owners.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>Type
            <select aria-label="Follow-up type" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">All types</option>
              {options.types.map((item) => <option key={item} value={item}>{typeLabel(item)}</option>)}
            </select>
          </label>
          <div className="gx-fu-quick">
            <label className="gx-fu-jump">
              <span className="gx-sr">Jump to date</span>
              <input className="gx-fu-date" type="date" value={selectedKey} onChange={(event) => { if (event.target.value) selectDate(event.target.value); }} />
            </label>
            <button type="button" className="gx-fu-quiet" disabled={saving} onClick={() => onScheduleCall(selectedKey)}>Schedule call</button>
            <button type="button" className="gx-fu-lime" disabled={saving} onClick={() => onCreateFollowUp(selectedKey)}>Add follow-up</button>
          </div>
        </div>
        {loading ? <p className="gx-fu-empty">Loading follow-ups…</p> : null}
        <div key={stageKey} className="gx-fu-stage">
          {view === 'day' ? (
            <div className="gx-fu-day">
              {selectedEvents.length === 0 ? <p className="gx-fu-empty">Nothing scheduled on {pickedTitle(selectedKey, todayKey)}.</p> : selectedEvents.map((row) => (
                <button key={row.id} type="button" className={`gx-fu-day-item${row.id === activeId ? ' is-active' : ''}`} onClick={() => openEvent(row)}>
                  <time dateTime={row.scheduledAt || row.completedAt || undefined}>{eventTime(row) || '—'}</time>
                  <span>
                    <strong>{eventLabel(row)}</strong>
                    <span>{consultancyName} · {row.actorName || 'Unassigned'}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div ref={gridRef} className={`gx-fu-grid${view === 'week' ? ' is-week' : ''}`} role="grid" aria-label={heading}>
              {WEEKDAYS.map((label) => <div key={label} className="gx-fu-dow" role="columnheader">{compact ? label.slice(0, 1) : label}</div>)}
              {cells.map((cell) => {
                const events = byDay.get(cell.key) || [];
                const { shown, hidden } = splitEvents(events, chipLimit);
                return (
                  <div
                    key={cell.key}
                    role="gridcell"
                    data-date={cell.key}
                    tabIndex={cell.key === tabKey ? 0 : -1}
                    className={`gx-fu-cell${cell.inMonth ? '' : ' is-out'}${cell.key === selectedKey ? ' is-selected' : ''}${cell.key === todayKey ? ' is-today' : ''}`}
                    aria-selected={cell.key === selectedKey}
                    aria-current={cell.key === todayKey ? 'date' : undefined}
                    aria-label={cellLabel(cell, events.length, todayKey, selectedKey)}
                    onClick={() => selectDate(cell.key)}
                    onKeyDown={(event) => onCellKeyDown(event, cell.key)}
                  >
                    <span className="gx-fu-num">{cell.day}</span>
                    {events.length === 0 ? null : compact ? (
                      <span className="gx-fu-dots" aria-hidden="true">
                        {shown.map((row) => <i key={row.id} className={`is-${followUpTone(row, now)}`} />)}
                        {hidden > 0 ? <em>+{hidden}</em> : null}
                      </span>
                    ) : (
                      <span className="gx-fu-events">
                        {shown.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            className={`gx-fu-chip is-${followUpTone(row, now)}`}
                            onClick={(event) => { event.stopPropagation(); openEvent(row); }}
                          >
                            {eventLabel(row)}
                          </button>
                        ))}
                        {hidden > 0 ? (
                          <button type="button" className="gx-fu-more" onClick={(event) => { event.stopPropagation(); selectDate(cell.key); }}>
                            +{hidden} more
                          </button>
                        ) : null}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {undated.length > 0 ? <p className="gx-fu-help">{undated.length} {undated.length === 1 ? 'follow-up has' : 'follow-ups have'} no date and {undated.length === 1 ? 'is' : 'are'} not on the calendar.</p> : null}
      </section>
      <aside className="gx-fu-side" aria-label="Follow-up management">
        <div className="gx-fu-side-head">
          <h3>Follow-ups</h3>
          <span>{error ? '—' : filtered.length}</span>
        </div>
        {error ? (
          <div className="gx-fu-error" role="alert">
            <p>{error}</p>
            <button type="button" className="gx-fu-quiet" onClick={onRetry}>Retry</button>
          </div>
        ) : (
          <div key={`${selectedKey}|${status}|${owner}|${type}`} className="gx-fu-stage">
            {active ? (
              <article className="gx-fu-detail">
                <strong>{active.status || typeLabel(followUpType(active))}</strong>
                <p>{consultancyName}</p>
                <p>{exactDateTime(active.scheduledAt || active.completedAt)} · {typeLabel(followUpType(active))} · {active.actorName || 'Unassigned'}</p>
                {active.notes ? <p>{active.notes}</p> : null}
                <div className="gx-fu-detail-actions">
                  {!active.completedAt && !active.cancelledAt ? (
                    <>
                      <button type="button" className="gx-fu-text is-primary" disabled={saving} onClick={() => onComplete(active)}>Complete</button>
                      <button type="button" className="gx-fu-text" disabled={saving} onClick={() => onReschedule(active)}>Reschedule</button>
                      <button type="button" className="gx-fu-text" disabled={saving} onClick={() => onCancel(active)}>Cancel</button>
                    </>
                  ) : null}
                  <button type="button" className="gx-fu-text" onClick={onOpenConsultancy}>View consultancy</button>
                </div>
              </article>
            ) : null}
            <section className="gx-fu-picked" aria-label="Selected date">
              <h3>{pickedTitle(selectedKey, todayKey)} <span className="gx-fu-count">{selectedEvents.length}</span></h3>
              <FollowUpList
                rows={selectedEvents}
                scope="picked"
                consultancyName={consultancyName}
                activeId={activeId}
                saving={saving}
                now={now}
                onOpen={openEvent}
                onComplete={onComplete}
                onReschedule={onReschedule}
                onCancel={onCancel}
                menuFor={menuFor}
                setMenuFor={setMenuFor}
                empty={`Nothing scheduled on ${pickedTitle(selectedKey, todayKey)}.`}
              />
            </section>
            <Section id="gx-follow-overdue" title="Overdue" count={groups.overdue.length} tone="is-overdue">
              <FollowUpList scope="overdue" rows={groups.overdue} consultancyName={consultancyName} activeId={activeId} saving={saving} now={now} onOpen={openEvent} onComplete={onComplete} onReschedule={onReschedule} onCancel={onCancel} menuFor={menuFor} setMenuFor={setMenuFor} empty="No overdue follow-ups." />
            </Section>
            <Section id="gx-follow-dueToday" title="Due today" count={groups.dueToday.length} tone="is-today">
              <FollowUpList scope="today" rows={groups.dueToday} consultancyName={consultancyName} activeId={activeId} saving={saving} now={now} onOpen={openEvent} onComplete={onComplete} onReschedule={onReschedule} onCancel={onCancel} menuFor={menuFor} setMenuFor={setMenuFor} empty="No follow-ups are due today." />
            </Section>
            <Section id="gx-follow-upcoming" title="Upcoming" count={groups.upcoming.length} tone="">
              <FollowUpList scope="upcoming" rows={groups.upcoming} consultancyName={consultancyName} activeId={activeId} saving={saving} now={now} onOpen={openEvent} onComplete={onComplete} onReschedule={onReschedule} onCancel={onCancel} menuFor={menuFor} setMenuFor={setMenuFor} empty="No upcoming follow-ups." />
            </Section>
            <section className="gx-fu-section is-done" id="gx-follow-completed">
              <button type="button" className="gx-fu-section-label" aria-expanded={completedOpen} onClick={() => setCompletedOpen((open) => !open)}>
                Completed
                <span className="gx-fu-count">{groups.completed.length}</span>
              </button>
              {completedOpen ? (
                <FollowUpList scope="completed" rows={groups.completed} consultancyName={consultancyName} activeId={activeId} saving={saving} now={now} onOpen={openEvent} onComplete={onComplete} onReschedule={onReschedule} onCancel={onCancel} menuFor={menuFor} setMenuFor={setMenuFor} empty="No completed follow-ups." />
              ) : null}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function Section({ id, title, count, tone, children }) {
  return (
    <section className={`gx-fu-section ${tone}`.trim()} id={id}>
      <h3 className="gx-fu-section-label">{title} <span className="gx-fu-count">{count}</span></h3>
      {children}
    </section>
  );
}
