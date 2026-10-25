import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  dayKeyFromParts,
  eachDayKey,
  localDayKey,
  monthCells,
  parseIso,
  referralsOnDay,
  shiftDayKey,
  statusOf,
} from '../../utils/crmAnalytics';
import { loadAll } from './dashboard/dashboardModel';
import { PageHeader } from './CrmKit';
import { shortDate } from './crmFormat';
import { useCrmDemo } from './useCrmDemo';
import './crmInsight.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function monthParam(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function readMonth(params, now) {
  const month = params.get('month');
  const day = params.get('day');
  const source = /^\d{4}-\d{2}$/.test(month || '') ? month : (/^\d{4}-\d{2}-\d{2}$/.test(day || '') ? day.slice(0, 7) : '');
  if (source) {
    const [year, monthNumber] = source.split('-').map(Number);
    if (monthNumber >= 1 && monthNumber <= 12) return { year, monthIndex: monthNumber - 1 };
  }
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

function shiftMonth(year, monthIndex, delta) {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

function weekDates(anchorKey) {
  const [year, month, day] = anchorKey.split('-').map(Number);
  const anchor = new Date(year, month - 1, day);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export default function CalendarPage() {
  const { client, refresh, basePath } = useCrmDemo();
  const [params, setParams] = useSearchParams();
  const now = useMemo(() => new Date(), []);
  const view = ['week', 'agenda'].includes(params.get('view')) ? params.get('view') : 'month';
  const fromKey = /^\d{4}-\d{2}-\d{2}$/.test(params.get('from') || '') ? params.get('from') : '';
  const toKey = /^\d{4}-\d{2}-\d{2}$/.test(params.get('to') || '') ? params.get('to') : '';
  const rangeKeys = eachDayKey(fromKey, toKey);
  const ranged = view === 'agenda' && rangeKeys.length > 0;
  const { year, monthIndex } = readMonth(params, now);
  const todayKey = dayKeyFromParts(now.getFullYear(), now.getMonth(), now.getDate());
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(params.get('day') || '') ? params.get('day') : '';
  const studentsLoad = loadAll((page) => client.listStudents({ page, limit: 100 }));
  const consultanciesLoad = loadAll((page) => client.listConsultancies({ page, limit: 100 }));
  const referralsLoad = loadAll((page) => client.listReferrals({ page, limit: 100 }));
  const error = [studentsLoad, consultanciesLoad, referralsLoad].find((item) => !item.ok)?.message || '';
  const students = new Map(studentsLoad.items.map((row) => [row.id, row]));
  const consultancies = new Map(consultanciesLoad.items.map((row) => [row.id, row]));
  const referrals = referralsLoad.items.filter((row) => parseIso(row.createdAt));
  const undated = referralsLoad.items.length - referrals.length;
  const title = new Date(year, monthIndex, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  function write(next) {
    const copy = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value) copy.set(key, value);
      else copy.delete(key);
    });
    setParams(copy);
  }

  function openDay(key) {
    const [dayYear, dayMonth] = key.split('-').map(Number);
    write({ day: key, month: monthParam(dayYear, dayMonth - 1) });
  }

  function moveRange(direction) {
    const span = rangeKeys.length;
    const from = shiftDayKey(fromKey, direction * span);
    const to = shiftDayKey(toKey, direction * span);
    write({ from, to, day: '', month: from.slice(0, 7) });
  }

  function moveMonth(delta) {
    const next = shiftMonth(year, monthIndex, delta);
    write({ month: monthParam(next.year, next.monthIndex), day: '' });
  }

  function moveWeek(delta) {
    const anchor = selected || dayKeyFromParts(year, monthIndex, 1);
    const [anchorYear, anchorMonth, anchorDay] = anchor.split('-').map(Number);
    const date = new Date(anchorYear, anchorMonth - 1, anchorDay);
    date.setDate(date.getDate() + delta * 7);
    openDay(dayKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  const cells = monthCells(year, monthIndex).map((day) => {
    if (!day) return null;
    const key = dayKeyFromParts(year, monthIndex, day);
    return { day, key, count: referralsOnDay(referrals, key).length };
  });
  const weekAnchor = selected || dayKeyFromParts(year, monthIndex, 1);
  const week = weekDates(weekAnchor).map((date) => {
    const key = dayKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate());
    return {
      key,
      label: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      count: referralsOnDay(referrals, key).length,
    };
  });
  const agenda = ranged
    ? rangeKeys.map((key) => ({ key, count: referralsOnDay(referrals, key).length }))
    : cells.filter((cell) => cell && cell.count > 0);
  const rangeLabel = ranged ? `${shortDate(`${fromKey}T00:00:00`)} – ${shortDate(`${toKey}T00:00:00`)}` : '';
  const chosen = selected ? referralsOnDay(referrals, selected) : [];
  const chosenLabel = selected
    ? new Date(`${selected}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      <PageHeader title="Referral calendar" subtitle="Referral dates from the records in this browser. Only the date is shown." />
      <div className="gx-cal">
      <div className="gx-cal-toolbar">
        <div className="gx-periods" role="radiogroup" aria-label="Calendar view">
          {['month', 'week', 'agenda'].map((item) => (
            <button key={item} type="button" role="radio" aria-checked={view === item} className={view === item ? 'is-on' : ''} onClick={() => write({ view: item })}>
              {item === 'month' ? 'Month' : item === 'week' ? 'Week' : 'Agenda'}
            </button>
          ))}
        </div>
        <div className="gx-cal-nav">
          <button type="button" className="gx-cal-today" onClick={() => write({ month: monthParam(now.getFullYear(), now.getMonth()), day: todayKey, from: '', to: '' })}>Today</button>
          <button type="button" className="gx-cal-step" onClick={() => (ranged ? moveRange(-1) : view === 'week' ? moveWeek(-1) : moveMonth(-1))} aria-label={ranged ? 'Previous period' : view === 'week' ? 'Previous week' : 'Previous month'}>Previous</button>
          <strong>{ranged ? rangeLabel : title}</strong>
          <button type="button" className="gx-cal-step" onClick={() => (ranged ? moveRange(1) : view === 'week' ? moveWeek(1) : moveMonth(1))} aria-label={ranged ? 'Next period' : view === 'week' ? 'Next week' : 'Next month'}>Next</button>
        </div>
      </div>
      {error ? (
        <div className="gx-notice error" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      ) : (
        <div className="gx-cal-layout">
          <section className="gx-panel" aria-label={`${title} referrals`}>
            {referrals.length === 0 ? <p className="gx-help">No referral dates are on record.</p> : null}
            {view === 'month' ? (
              <>
                <div className="gx-cal-weekdays" aria-hidden="true">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
                <div className="gx-cal-grid">
                  {cells.map((cell, index) => (cell ? (
                    <button
                      key={cell.key}
                      type="button"
                      className={`gx-cal-cell${cell.key === selected ? ' is-selected' : ''}${cell.key === todayKey ? ' is-today' : ''}`}
                      aria-pressed={cell.key === selected}
                      aria-label={`${cell.day} ${title}, ${cell.count} ${cell.count === 1 ? 'referral' : 'referrals'}`}
                      onClick={() => openDay(cell.key)}
                    >
                      <span>{cell.day}</span>
                      {cell.count > 0 ? <b>{cell.count}</b> : null}
                    </button>
                  ) : <span key={`empty-${index}`} className="gx-cal-pad" />))}
                </div>
              </>
            ) : null}
            {view === 'week' ? (
              <div className="gx-cal-week">
                {week.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    className={`gx-cal-cell${day.key === selected ? ' is-selected' : ''}${day.key === todayKey ? ' is-today' : ''}`}
                    aria-pressed={day.key === selected}
                    aria-label={`${day.label}, ${day.count} ${day.count === 1 ? 'referral' : 'referrals'}`}
                    onClick={() => openDay(day.key)}
                  >
                    <span>{day.label}</span>
                    {day.count > 0 ? <b>{day.count}</b> : null}
                  </button>
                ))}
              </div>
            ) : null}
            {view === 'agenda' ? (
              agenda.length === 0 ? <p className="gx-help">No referrals in {title}.</p> : (
                <>
                  {ranged && agenda.every((day) => day.count === 0) ? <p className="gx-help">No referrals in this period. These dates are empty, not missing history.</p> : null}
                  <ul className="gx-agenda">
                    {agenda.map((day) => (
                      <li key={day.key}>
                        <button type="button" className={day.key === selected ? 'is-selected' : ''} onClick={() => openDay(day.key)}>
                          <span>{shortDate(`${day.key}T00:00:00`)}</span>
                          <b>{day.count}</b>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )
            ) : null}
            {undated > 0 ? <p className="gx-help">{undated} {undated === 1 ? 'referral has' : 'referrals have'} no usable date and {undated === 1 ? 'is' : 'are'} not on the calendar.</p> : null}
          </section>
          <aside className="gx-panel">
            <h3>{selected ? chosenLabel : 'Select a date'}</h3>
            {!selected ? <p className="gx-cal-empty">Choose a date to see the students referred that day.</p> : chosen.length === 0 ? (
              <p className="gx-cal-empty">No referrals on this date.</p>
            ) : (
              <ul className="gx-day-list">
                {chosen.map((referral) => {
                  const student = students.get(referral.crmStudentId);
                  const consultancy = consultancies.get(referral.consultancyId);
                  return (
                    <li key={referral.id}>
                      <Link to={`${basePath}/students/${referral.crmStudentId}`}>{student?.fullName || referral.studentName || 'Student'}</Link>
                      <span>{consultancy?.name || referral.consultancyName || 'Consultancy'}</span>
                      <span>{statusOf(student)}</span>
                      <time dateTime={localDayKey(referral.createdAt) || undefined}>{shortDate(referral.createdAt)}</time>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      )}
      </div>
    </>
  );
}
