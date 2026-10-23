import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiClock, FiCalendar, FiBell, FiUserCheck } from 'react-icons/fi';
import ToolWorkspaceLayout from './components/ToolWorkspaceLayout';
import ToolFactsPreview from './components/ToolFactsPreview';
import {
  swEmptyState,
  swFormSubtitle,
  swFormTitle,
  swResultCard,
} from './components/studentWorkspaceUi';
import { useStudentAuthRequired } from '../../contexts/StudentAuthContext';
import { getMyOneOnOneBookings } from '../../utils/api';

const SAMPLE_DEADLINES = [
  { exam: 'JEE Main Session 2', phase: 'Registration window', date: 'Coming soon', status: 'Scheduled' },
  { exam: 'AP EAMCET', phase: 'Application', date: 'Coming soon', status: 'Scheduled' },
  { exam: 'KCET', phase: 'Counseling Round 1', date: 'Coming soon', status: 'Scheduled' },
  { exam: 'MHT CET', phase: 'Result declaration', date: 'Coming soon', status: 'Scheduled' },
];

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function DeadlineManagerPage() {
  const { session, savePrediction } = useStudentAuthRequired();
  const { openOneOnOneBooking } = useOutletContext() || {};
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.phone) {
        setBookings([]);
        setBookingsLoading(false);
        return;
      }
      setBookingsLoading(true);
      const res = await getMyOneOnOneBookings(session.phone);
      if (cancelled) return;
      const items = res.success ? res.data?.data?.items || [] : [];
      setBookings(items);
      setBookingsLoading(false);
      savePrediction?.({
        type: 'deadline_manager',
        tool: 'Deadline Manager',
        title: 'Opened Deadline Manager',
        summary: `${items.length} counselling booking${items.length === 1 ? '' : 's'} shown`,
        payload: {
          bookingCount: items.length,
          bookingIds: items.slice(0, 10).map((b) => b.id).filter(Boolean),
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.phone, savePrediction]);

  return (
    <ToolWorkspaceLayout
      title="Deadline Manager"
      subtitle="Track registrations, counselling sessions, and counseling rounds in one calm, reliable view."
      compactHero
      howItWorks={[
        'Exam and admission deadlines are aggregated from official sources.',
        'Your IITian counselling bookings appear here as session reminders.',
        'Upcoming deadlines are highlighted to help you plan ahead.',
      ]}
      whatThisToolDoes={[
        'Shows important exam and admission deadlines at a glance.',
        'Surfaces your counselling session bookings so you do not miss a slot.',
      ]}
      inputGuide={[
        'No input needed — deadlines and your bookings load automatically.',
        'Check back regularly as new deadlines are added through the admission cycle.',
      ]}
      preview={
        <ToolFactsPreview
          icon={FiClock}
          iconClass="bg-[#e8f1f8] text-[#0b3a5c]"
          name="Deadline Manager"
          metricLabel="Reminders tracked"
          metricValue={`${SAMPLE_DEADLINES.length + bookings.length} items`}
          points={[
            'Counselling session bookings',
            'Exam and admission deadline tracks',
            'Live official sync coming soon',
          ]}
        />
      }
      results={null}
      insights={null}
    >
      <h2 className={swFormTitle}>My counselling sessions</h2>
      <p className={swFormSubtitle}>
        Booked IITian 1-on-1 sessions — treat these as your personal reminders.
      </p>

      <div className="mt-5 space-y-3">
        {bookingsLoading ? (
          <p className="text-sm text-[#5a6570]">Loading your bookings…</p>
        ) : bookings.length ? (
          bookings.map((b) => (
            <div
              key={b.id}
              className={`${swResultCard} flex flex-col gap-4 sm:flex-row sm:items-center`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0f172a] text-white">
                <FiUserCheck className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-sw-display text-base font-bold text-[#041e30]">
                  {b.preferredTimeSlot || 'Preferred slot pending confirmation'}
                </h3>
                <p className="mt-0.5 text-sm text-[#5a6570]">
                  {[b.preferredLanguage, b.interestedBranch].filter(Boolean).join(' · ') ||
                    'IITian counselling'}
                </p>
                <p className="mt-1 text-xs text-[#94a3b8]">
                  Booked {formatWhen(b.bookingConfirmedAt || b.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-[#e4e9f0] bg-[#fff8f3] px-3 py-2 sm:self-auto">
                <FiBell className="h-3.5 w-3.5 text-[#f27921]" aria-hidden />
                <span className="text-xs font-semibold text-[#2c3640]">
                  {b.bookingStatus || b.leadStatus || 'Requested'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className={`${swResultCard} flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <p className="text-sm text-[#5a6570]">No counselling bookings yet.</p>
            <button
              type="button"
              onClick={() => openOneOnOneBooking?.()}
              className="inline-flex rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
            >
              Register for mock test
            </button>
          </div>
        )}
      </div>

      <h2 className={`${swFormTitle} mt-10`}>Upcoming exam deadlines</h2>
      <p className={swFormSubtitle}>Priority dates across major exams — official live sync is on the way.</p>

      <div className="mt-6 space-y-3">
        {SAMPLE_DEADLINES.map((d) => (
          <div
            key={`${d.exam}-${d.phase}`}
            className={`${swResultCard} flex flex-col gap-4 sm:flex-row sm:items-center`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#041e30] text-white">
              <FiCalendar className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-sw-display text-base font-bold text-[#041e30]">{d.exam}</h3>
              <p className="mt-0.5 text-sm text-[#5a6570]">{d.phase}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-[#e4e9f0] bg-[#f8fafc] px-3 py-2 sm:self-auto">
              <FiBell className="h-3.5 w-3.5 text-[#f27921]" aria-hidden />
              <span className="text-xs font-semibold text-[#2c3640]">{d.date}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-8 ${swEmptyState}`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2f7] text-[#041e30]">
          <FiClock className="h-6 w-6" aria-hidden />
        </div>
        <p className="mt-4 font-sw-display text-base font-bold text-[#041e30]">
          Live deadline data coming soon
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#5a6570]">
          Dates will be pulled from official exam portals once integration is complete — this list is a preview of the
          layout. Your counselling bookings above are already live from your account.
        </p>
      </div>
    </ToolWorkspaceLayout>
  );
}
