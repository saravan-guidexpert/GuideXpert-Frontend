import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCrmCalendar } from '../../../utils/crmApi';
import { interpretCrmResult } from '../../../utils/crmAccess';
import { browserTimeZone, calendarParams } from './crmProductionQuery';
import { Banner, Pagination, PrimaryButton } from './crmUi';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(value) {
  return String(value).padStart(2, '0');
}

function monthKey(year, monthIndex) {
  return `${year}-${pad(monthIndex + 1)}`;
}

function shiftMonth(year, monthIndex, delta) {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
}

export default function CalendarPage() {
  const timeZone = useMemo(() => browserTimeZone(), []);
  const today = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth(), day: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` };
  }, []);
  const [cursor, setCursor] = useState({ year: today.year, monthIndex: today.monthIndex });
  const [selected, setSelected] = useState('');
  const [page, setPage] = useState(1);
  const [monthData, setMonthData] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [seenMonthKey, setSeenMonthKey] = useState('');
  const monthRequest = useMemo(
    () => calendarParams({ mode: 'month', month: monthKey(cursor.year, cursor.monthIndex), timeZone }),
    [cursor, timeZone]
  );
  const monthKeyToken = `${reloadKey}:${monthRequest.error || JSON.stringify(monthRequest.query)}`;
  if (seenMonthKey !== monthKeyToken) {
    setSeenMonthKey(monthKeyToken);
    if (monthRequest.error) {
      setLoading(false);
      setMonthData(null);
      setNotice({ tone: 'warning', message: monthRequest.error });
    } else {
      setLoading(true);
    }
  }

  useEffect(() => {
    if (monthRequest.error) return undefined;
    let cancelled = false;
    getCrmCalendar(monthRequest.query).then((result) => {
      if (cancelled) return;
      const interpreted = interpretCrmResult(result);
      if (interpreted.state === 'ok') {
        setMonthData(interpreted.data);
        setNotice(null);
      } else {
        setMonthData(null);
        setNotice({ tone: interpreted.state === 'forbidden' ? 'warning' : 'error', message: interpreted.message });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [monthRequest, monthKeyToken]);

  const dayRequest = useMemo(
    () => (selected ? calendarParams({ mode: 'day', day: selected, page, timeZone }) : null),
    [selected, page, timeZone]
  );

  useEffect(() => {
    if (!dayRequest || dayRequest.error) return undefined;
    let cancelled = false;
    getCrmCalendar(dayRequest.query).then((result) => {
      if (cancelled) return;
      const interpreted = interpretCrmResult(result);
      if (interpreted.state === 'ok') setDayData(interpreted.data);
      else setNotice({ tone: 'error', message: interpreted.message });
    });
    return () => {
      cancelled = true;
    };
  }, [dayRequest, reloadKey]);

  const title = new Date(Date.UTC(cursor.year, cursor.monthIndex, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const lead = monthData?.days?.length
    ? new Date(`${monthData.days[0].key}T00:00:00Z`).getUTCDay()
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#003366]">Referral calendar</h2>
        <p className="mt-1 text-sm text-gray-500">Dates are the referredAt calendar day in {timeZone}. Only the date is shown.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PrimaryButton type="button" onClick={() => { setCursor({ year: today.year, monthIndex: today.monthIndex }); setSelected(today.day); setPage(1); }}>Today</PrimaryButton>
        <button type="button" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" onClick={() => { setCursor(shiftMonth(cursor.year, cursor.monthIndex, -1)); setSelected(''); setPage(1); }}>Previous</button>
        <strong className="text-sm text-[#003366]">{title}</strong>
        <button type="button" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm" onClick={() => { setCursor(shiftMonth(cursor.year, cursor.monthIndex, 1)); setSelected(''); setPage(1); }}>Next</button>
      </div>
      {notice ? <Banner tone={notice.tone}>{notice.message} <button type="button" className="ml-2 underline" onClick={() => setReloadKey((current) => current + 1)}>Retry</button></Banner> : null}
      {loading ? <p className="text-sm text-gray-500">Loading calendar…</p> : null}
      {monthData ? (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((name) => <div key={name} className="px-1 py-1 text-center text-xs text-gray-500">{name}</div>)}
          {Array.from({ length: lead }, (_, index) => <div key={`lead-${index}`} />)}
          {monthData.days.map((day) => (
            <button
              key={day.key}
              type="button"
              className={`min-h-[4rem] rounded-lg border p-2 text-left text-sm ${selected === day.key ? 'border-[#003366] bg-[#003366] text-white' : 'border-gray-200 bg-white'}`}
              onClick={() => { setSelected(day.key); setPage(1); }}
            >
              <span className="block font-medium">{Number(day.key.slice(-2))}</span>
              <span className="block text-xs">{day.count}</span>
            </button>
          ))}
        </div>
      ) : null}
      {selected ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="font-semibold text-[#003366]">{selected}</h3>
          {!dayData ? <p className="mt-2 text-sm text-gray-500">Loading this date…</p> : null}
          {dayData && dayData.items.length === 0 ? <p className="mt-2 text-sm text-gray-500">No referrals on this date.</p> : null}
          {dayData && dayData.items.length > 0 ? (
            <ul className="mt-2 divide-y divide-gray-100">
              {dayData.items.map((item) => (
                <li key={item.id} className="py-2 text-sm">
                  <Link className="font-medium text-[#003366] underline" to={`/admin/crm/students/${item.crmStudentId}`}>{item.studentName || 'Student'}</Link>
                  <span className="text-gray-500"> · {item.consultancyName} · {item.admissionStatus || 'Not started'}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {dayData && dayData.total > dayData.limit ? <Pagination page={page} limit={dayData.limit} total={dayData.total} onPage={setPage} /> : null}
        </section>
      ) : <p className="text-sm text-gray-500">Select a date to list its referrals.</p>}
    </div>
  );
}
