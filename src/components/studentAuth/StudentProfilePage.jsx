import { Link, useOutletContext } from 'react-router-dom';
import {
  FiLogOut,
  FiUser,
  FiEdit2,
  FiHome,
  FiChevronRight,
  FiMapPin,
  FiBookOpen,
  FiCalendar,
  FiPhone,
  FiActivity,
  FiClock,
} from 'react-icons/fi';
import { useStudentAuthRequired } from '../../contexts/StudentAuthContext';
import { studyingLabel, STUDYING_OPTIONS } from '../../utils/studentProfileStore';
import { LAYOUT } from '../studentDashboard/careers360/careers360Theme';
import { useEffect, useState } from 'react';
import RequireStudentAuth from './RequireStudentAuth';
import { getMyOneOnOneBookings } from '../../utils/api';

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

function PredictionCard({ item }) {
  return (
    <article className="group flex flex-col gap-3 border-b border-[#eceff3] py-5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
          {item.tool || item.type}
        </p>
        <h3 className="mt-1.5 text-base font-semibold text-[#0f172a]">{item.title}</h3>
        {item.summary ? (
          <p className="mt-1.5 text-sm leading-relaxed text-[#64748b]">{item.summary}</p>
        ) : null}
      </div>
      <time
        className="shrink-0 text-xs font-medium text-[#94a3b8] sm:pt-1"
        dateTime={item.createdAt}
      >
        {formatWhen(item.createdAt)}
      </time>
    </article>
  );
}

function BookingCard({ item }) {
  return (
    <article className="rounded-xl border border-[#e8eaed] bg-[#fafbfc] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
            IITian counselling
          </p>
          <h3 className="mt-1.5 text-base font-semibold text-[#0f172a]">
            {item.preferredTimeSlot || 'Preferred slot pending confirmation'}
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
            {item.preferredLanguage ? <span>Language: {item.preferredLanguage}</span> : null}
            {item.interestedBranch ? <span>Branch: {item.interestedBranch}</span> : null}
          </div>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0f172a] ring-1 ring-[#e2e8f0]">
          {item.bookingStatus || item.leadStatus || 'Requested'}
        </span>
      </div>
      <p className="mt-3 text-xs text-[#94a3b8]">
        Booked {formatWhen(item.bookingConfirmedAt || item.createdAt)}
      </p>
    </article>
  );
}

function FieldRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3.5 py-3.5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f6f9] text-[#64748b]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#94a3b8]">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-[#0f172a]">{value || '—'}</p>
      </div>
    </div>
  );
}

function ProfileContent() {
  const { profile, session, predictions, updateProfile, logout } = useStudentAuthRequired();
  const { openOneOnOneBooking } = useOutletContext() || {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: profile?.fullName || session?.fullName || '',
    age: profile?.age != null ? String(profile.age) : '',
    currentlyStudying: profile?.currentlyStudying || '',
    city: profile?.city || '',
  });
  const [savedMsg, setSavedMsg] = useState('');
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const displayName = profile?.fullName || session?.fullName || 'Student';
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'S';

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
      setBookings(res.success ? res.data?.data?.items || [] : []);
      setBookingsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.phone]);

  const onSave = (e) => {
    e.preventDefault();
    updateProfile({
      fullName: form.fullName.trim(),
      age: form.age ? Number(form.age) : null,
      currentlyStudying: form.currentlyStudying,
      city: form.city.trim(),
    });
    setEditing(false);
    setSavedMsg('Profile updated.');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const startEdit = () => {
    setForm({
      fullName: profile?.fullName || session?.fullName || '',
      age: profile?.age != null ? String(profile.age) : '',
      currentlyStudying: profile?.currentlyStudying || '',
      city: profile?.city || '',
    });
    setEditing(true);
  };

  return (
    <main className="min-h-[70vh] bg-[#f6f7f9]">
      <div className="border-b border-[#e8eaed] bg-white">
        <div className={`${LAYOUT.container} py-6 sm:py-8`}>
          <nav
            className="mb-5 flex flex-wrap items-center gap-1.5 text-[13px] text-[#64748b]"
            aria-label="Breadcrumb"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-1 transition hover:text-[#0f172a]"
            >
              <FiHome className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Home</span>
            </Link>
            <FiChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden />
            <span className="font-medium text-[#0f172a]">My profile</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f27921]">
                Account
              </p>
              <h1 className="mt-1.5 font-sw-display text-2xl font-bold tracking-tight text-[#0f172a] sm:text-3xl">
                My profile
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#64748b]">
                Manage your details, counselling bookings, and prediction history.
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
            >
              <FiLogOut className="h-4 w-4" aria-hidden />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className={`${LAYOUT.container} py-8 sm:py-10 lg:py-12`}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,18.5rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-8">
          <aside className="self-start overflow-hidden rounded-2xl border border-[#e8eaed] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div
              className="h-20 bg-gradient-to-br from-[#1a2744] via-[#243b6b] to-[#0f4550]"
              aria-hidden
            />
            <div className="relative px-5 pb-6 pt-0">
              <div className="-mt-10 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-4 border-white bg-[#0f172a] text-lg font-bold tracking-wide text-white shadow-md">
                {initials}
              </div>
              <h2 className="mt-4 truncate text-lg font-bold text-[#0f172a]">{displayName}</h2>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#64748b]">
                <FiPhone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {session?.phone || '—'}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#f1f5f9] pt-5">
                <div className="rounded-xl bg-[#f8fafc] px-3 py-3 text-center">
                  <p className="text-lg font-bold tabular-nums text-[#0f172a]">
                    {predictions.length}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#94a3b8]">Predictions</p>
                </div>
                <div className="rounded-xl bg-[#f8fafc] px-3 py-3 text-center">
                  <p className="text-lg font-bold tabular-nums text-[#0f172a]">{bookings.length}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#94a3b8]">Sessions</p>
                </div>
              </div>

              {!editing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                >
                  <FiEdit2 className="h-4 w-4" aria-hidden />
                  Edit profile
                </button>
              ) : null}
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#0f172a] sm:text-lg">Personal details</h2>
                  <p className="mt-0.5 text-sm text-[#94a3b8]">
                    Used to personalise counselling and tool history.
                  </p>
                </div>
                {savedMsg ? (
                  <p className="text-sm font-semibold text-[#e06810]">{savedMsg}</p>
                ) : null}
              </div>

              {editing ? (
                <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={onSave}>
                  <label className="block text-sm font-semibold text-[#334155] sm:col-span-2">
                    Full name
                    <input
                      className="mt-2 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#0f172a] outline-none transition focus:border-[#f27921] focus:bg-white focus:ring-2 focus:ring-[#f27921]/15"
                      value={form.fullName}
                      onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm font-semibold text-[#334155]">
                    Age
                    <input
                      className="mt-2 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#0f172a] outline-none transition focus:border-[#f27921] focus:bg-white focus:ring-2 focus:ring-[#f27921]/15"
                      type="number"
                      min={10}
                      max={80}
                      value={form.age}
                      onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm font-semibold text-[#334155]">
                    City
                    <input
                      className="mt-2 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#0f172a] outline-none transition focus:border-[#f27921] focus:bg-white focus:ring-2 focus:ring-[#f27921]/15"
                      value={form.city}
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    />
                  </label>
                  <label className="block text-sm font-semibold text-[#334155] sm:col-span-2">
                    Currently studying
                    <select
                      className="mt-2 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-sm text-[#0f172a] outline-none transition focus:border-[#f27921] focus:bg-white focus:ring-2 focus:ring-[#f27921]/15"
                      value={form.currentlyStudying}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, currentlyStudying: e.target.value }))
                      }
                    >
                      <option value="">Select</option>
                      {STUDYING_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0f172a] px-5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#e2e8f0] bg-white px-5 text-sm font-semibold text-[#475569] transition hover:bg-[#f8fafc]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-1 divide-y divide-[#f1f5f9]">
                  <FieldRow icon={FiUser} label="Full name" value={displayName} />
                  <FieldRow icon={FiCalendar} label="Age" value={profile?.age} />
                  <FieldRow
                    icon={FiBookOpen}
                    label="Currently studying"
                    value={studyingLabel(profile?.currentlyStudying)}
                  />
                  <FieldRow icon={FiMapPin} label="City" value={profile?.city} />
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f1f5f9] pb-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef6ff] text-[#2563eb]">
                    <FiClock className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#0f172a] sm:text-lg">
                      My counselling sessions
                    </h2>
                    <p className="mt-0.5 text-sm text-[#94a3b8]">
                      {bookingsLoading
                        ? 'Loading bookings…'
                        : bookings.length
                          ? `${bookings.length} booking${bookings.length === 1 ? '' : 's'}`
                          : 'Free IITian 1-on-1 session requests'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openOneOnOneBooking?.()}
                  className="text-sm font-semibold text-[#f27921] transition hover:text-[#e06810]"
                >
                  Book session
                </button>
              </div>

              {bookingsLoading ? (
                <p className="mt-6 text-sm text-[#94a3b8]">Loading…</p>
              ) : bookings.length ? (
                <div className="mt-4 space-y-3">
                  {bookings.map((item) => (
                    <BookingCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-[#dce3ec] bg-[#fafbfc] px-5 py-10 text-center">
                  <p className="text-sm font-medium text-[#64748b]">No counselling bookings yet.</p>
                  <button
                    type="button"
                    onClick={() => openOneOnOneBooking?.()}
                    className="mt-4 inline-flex rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                  >
                    Book free IITian session
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f1f5f9] pb-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff4ed] text-[#f27921]">
                    <FiActivity className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-[#0f172a] sm:text-lg">
                      Prediction history
                    </h2>
                    <p className="mt-0.5 text-sm text-[#94a3b8]">
                      {predictions.length
                        ? `${predictions.length} saved result${predictions.length === 1 ? '' : 's'}`
                        : 'Results from tools you run will show up here'}
                    </p>
                  </div>
                </div>
                <Link
                  to="/students/college-predictor"
                  className="text-sm font-semibold text-[#f27921] transition hover:text-[#e06810]"
                >
                  Browse tools
                </Link>
              </div>

              {predictions.length ? (
                <div className="mt-1">
                  {predictions.map((item) => (
                    <PredictionCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-[#dce3ec] bg-[#fafbfc] px-5 py-10 text-center">
                  <p className="text-sm font-medium text-[#64748b]">
                    No predictions yet — run a tool to see results here.
                  </p>
                  <Link
                    to="/students/college-predictor"
                    className="mt-4 inline-flex rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                  >
                    Open College Predictor
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function StudentProfilePage() {
  return (
    <RequireStudentAuth title="Login to view your profile">
      <ProfileContent />
    </RequireStudentAuth>
  );
}
