import { useMemo } from 'react';

const WEEKDAY_HEADER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateKey(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getTodayIstKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Build Sun-start month grid rows (null = empty cell), matching meet attendance. */
function buildMonthGrid(year, month) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

export default function LeadActivityCalendar({
  year,
  month,
  days = [],
  selectedDate = '',
  loading = false,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}) {
  const countByDate = useMemo(() => {
    const map = new Map();
    for (const row of days) {
      if (row?.date) map.set(row.date, Number(row.count) || 0);
    }
    return map;
  }, [days]);

  const todayKey = getTodayIstKey();
  const monthGrid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const handleDayClick = (date) => {
    if (!onSelectDate) return;
    onSelectDate(selectedDate === date ? '' : date);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-200 bg-gradient-to-r from-primary-blue-50 to-indigo-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 shadow-sm">
            <button
              type="button"
              className="rounded-md bg-primary-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md"
            >
              Day
            </button>
            <button
              type="button"
              onClick={onToday}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={onPrevMonth}
              className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="min-w-[100px] text-center text-sm font-bold text-gray-900">
              {MONTH_NAMES[month - 1].slice(0, 3)} {year}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={onNextMonth}
              className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {WEEKDAY_HEADER.map((day) => (
                <th
                  key={day}
                  className="py-2 text-center text-[10px] font-bold uppercase text-gray-400"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthGrid.map((row, ri) => (
              <tr key={ri}>
                {row.map((dayNum, ci) => {
                  if (dayNum === null) {
                    return <td key={`${ri}-${ci}`} className="p-1" />;
                  }
                  const date = toDateKey(year, month, dayNum);
                  const isToday = date === todayKey;
                  const isSelected = selectedDate === date;
                  const count = countByDate.get(date) || 0;
                  const hasActivity = count > 0;

                  let cellClass = 'text-gray-700 hover:bg-gray-100';
                  if (isSelected) {
                    cellClass =
                      'bg-gradient-to-br from-primary-blue-500 to-primary-blue-600 text-white shadow-sm';
                  }

                  return (
                    <td key={`${ri}-${ci}`} className="p-1">
                      <button
                        type="button"
                        disabled={loading}
                        title={
                          hasActivity
                            ? `${count} active lead${count === 1 ? '' : 's'}`
                            : undefined
                        }
                        onClick={() => handleDayClick(date)}
                        className={`relative flex w-full items-center justify-center rounded-lg py-2.5 text-xs font-semibold transition-all ${cellClass} ${
                          isToday && !isSelected ? 'ring-2 ring-primary-blue-300' : ''
                        } ${loading ? 'opacity-60' : ''}`}
                      >
                        {dayNum}
                        {hasActivity ? (
                          <span
                            className={`absolute bottom-1 h-1 w-1 rounded-full ${
                              isSelected ? 'bg-white' : 'bg-primary-blue-500'
                            }`}
                          />
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
          {selectedDate ? (
            <button
              type="button"
              onClick={() => onSelectDate?.('')}
              className="text-xs font-medium text-primary-blue-600 hover:underline"
            >
              All dates
            </button>
          ) : (
            <span className="text-xs text-gray-400">Select a date to filter</span>
          )}
        </div>
      </div>
    </div>
  );
}
