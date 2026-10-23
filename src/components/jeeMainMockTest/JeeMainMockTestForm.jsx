import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import laptopPrize from '../../assets/jee-mock-laptop.webp';
import MobileOtpField from '../forms/MobileOtpField';
import { FormInput, FormSelect, FormTextarea, NeoField } from '../oneOnOneSession/FormControls';
import {
  CURRENT_STUDYING_OPTIONS,
  INITIAL_JEE_MAIN_MOCK_TEST_FORM,
} from '../../constants/jeeMainMockTestForm';
import { saveJeeMainMockTestSection1, saveJeeMainMockTestSection2 } from '../../utils/api';
import { getApiBaseUrl } from '../../utils/apiBaseUrl';
import { resolveUtmAttribution, trackMainPageVisit } from '../../utils/oneOnOneSessionTracking';
import {
  hasJeeMainMockTestErrors,
  validateJeeMainMockTestStep,
} from '../../utils/jeeMainMockTestValidation';

const TOTAL_STEPS = 2;

const STEP_TITLES = {
  1: 'Name & verification',
  2: 'Study details',
};

const STEP_HINTS = {
  1: 'Verify your number to continue.',
  2: 'Share your college and how we can reach you.',
};

const PRIZE_DISPLAY = { fontFamily: 'Sora, Satoshi, sans-serif' };
const PRIZE_BODY = { fontFamily: 'Satoshi, "Plus Jakarta Sans", sans-serif' };
const PRIZE_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function LaptopPrizeCard({ registered = false }) {
  const titleId = useId();

  return (
    <aside
      aria-labelledby={titleId}
      className={`group relative isolate overflow-hidden rounded-2xl bg-[#120706] shadow-[0_20px_40px_-24px_rgba(18,7,6,0.85)] ${
        registered ? 'mx-auto mt-6 max-w-lg' : 'mb-5'
      }`}
    >
      <div
        className="gx-prize-glow pointer-events-none absolute right-[-6%] top-1/2 h-[150%] w-[62%] -translate-y-1/2"
        style={{
          background:
            'radial-gradient(circle, rgba(255,126,72,0.5) 0%, rgba(176,42,24,0.22) 38%, transparent 68%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{ backgroundImage: PRIZE_GRAIN }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -left-2 bottom-[-18%] z-0 select-none text-[5.75rem] font-medium leading-none tracking-[-0.08em] text-white/[0.055] sm:text-[7.5rem]"
        style={PRIZE_DISPLAY}
        aria-hidden
      >
        01
      </span>
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" aria-hidden />

      <img
        src={laptopPrize}
        alt=""
        className="gx-laptop-float pointer-events-none absolute bottom-1 right-1.5 z-[1] h-auto max-h-[calc(100%-0.85rem)] w-auto max-w-[34%] object-contain object-right-bottom drop-shadow-[0_18px_24px_rgba(0,0,0,0.55)] sm:right-2 sm:max-w-[28%]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[11.25rem] flex-col justify-center py-4 pl-4 pr-[42%] sm:min-h-[10.25rem] sm:py-5 sm:pl-6 sm:pr-[36%]">
        <h3
          id={titleId}
          className="text-[1.85rem] font-bold leading-[0.88] tracking-[-0.045em] text-white sm:text-[2.15rem]"
          style={PRIZE_DISPLAY}
        >
          <span className="block">WRITE.</span>
          <span className="block" style={{ WebkitTextStroke: '1.35px #ff8d5c', color: 'transparent' }}>
            WIN.
          </span>
          <span className="block">REPEAT.</span>
        </h3>

        <p
          className="mt-3 text-[13px] font-semibold leading-snug tracking-[-0.01em] text-[#ffd2b8] sm:text-sm"
          style={PRIZE_DISPLAY}
        >
          A free laptop could be yours.
        </p>
        <p className="mt-1 text-[12.5px] font-medium leading-snug text-white/75 sm:text-[13px]" style={PRIZE_BODY}>
          Take the Mock Test for a Chance to Win!
          <svg
            viewBox="0 0 16 16"
            className="ml-1 inline-block h-3.5 w-3.5 align-[-2px] text-[#ff8d5c] transition-transform duration-300 group-hover:translate-y-0.5 motion-reduce:transform-none"
            aria-hidden
          >
            <path
              d="M8 2.5v9.2M4.2 8.2 8 12.2l3.8-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </p>
      </div>
    </aside>
  );
}

function SuccessView() {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 text-center sm:p-8">
      <div
        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4ed] text-2xl text-[#f27921]"
        aria-hidden
      >
        ✓
      </div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
        Registration successful
      </p>
      <h2 className="text-xl font-bold tracking-tight text-[#041e30] sm:text-2xl">
        You are registered for the JEE Main mock test
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#5a6570]">
        Thank you. Our team will use these details to reach you about the mock test.
      </p>
      <LaptopPrizeCard registered />
    </div>
  );
}

export default function JeeMainMockTestForm({ scrollContainerRef = null }) {
  const [form, setForm] = useState(INITIAL_JEE_MAIN_MOCK_TEST_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [leadId, setLeadId] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const localScrollRef = useRef(null);
  const visitorFingerprintRef = useRef('');
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const path = window.location.pathname || '/';
    if (path !== '/') return undefined;
    let cancelled = false;
    const utmPayload = resolveUtmAttribution();
    trackMainPageVisit(apiBase, utmPayload).then((fingerprint) => {
      if (!cancelled && fingerprint) visitorFingerprintRef.current = fingerprint;
    });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const handleOtpVerifiedChange = useCallback((verified) => {
    setOtpVerified(verified);
    if (verified) {
      setErrors((prev) => ({ ...prev, mobileNumber: '' }));
    }
  }, []);

  const scrollToTop = useCallback(() => {
    const el = scrollContainerRef?.current || localScrollRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [scrollContainerRef]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const root = scrollContainerRef?.current || localScrollRef.current || document;
      root.querySelector?.('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleStep1Next = async () => {
    const attribution = resolveUtmAttribution();
    const result = await saveJeeMainMockTestSection1({
      studentName: form.studentName.trim(),
      mobileNumber: form.mobileNumber.replace(/\D/g, ''),
      visitorFingerprint: visitorFingerprintRef.current,
      ...attribution,
    });
    if (!result.success) {
      setSubmitError(result.message || 'Could not save this step. Please try again.');
      return false;
    }
    const savedLeadId = result.data?.data?.leadId;
    if (savedLeadId) setLeadId(savedLeadId);
    return true;
  };

  const handleFinalSubmit = async () => {
    if (!leadId) {
      setSubmitError('Session expired. Please go back to step 1 and try again.');
      return false;
    }
    const result = await saveJeeMainMockTestSection2({
      leadId,
      whatsappNumber: form.whatsappNumber.replace(/\D/g, ''),
      currentStudying: form.currentStudying,
      collegeName: form.collegeName.trim(),
      location: form.location.trim(),
      remarks: form.remarks.trim(),
    });
    if (!result.success) {
      setSubmitError(result.message || 'Unable to register. Please try again.');
      return false;
    }
    setSubmitted(true);
    return true;
  };

  const handleBack = () => {
    if (currentStep <= 1) return;
    setErrors({});
    setSubmitError('');
    setCurrentStep(1);
    scrollToTop();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    const nextErrors = validateJeeMainMockTestStep(form, currentStep);
    if (currentStep === 1 && !otpVerified) {
      nextErrors.mobileNumber = 'Please verify your mobile number with OTP first.';
    }
    setErrors(nextErrors);
    if (hasJeeMainMockTestErrors(nextErrors)) {
      setSubmitError('Please complete all required fields before continuing.');
      scrollToFirstError();
      return;
    }

    setSubmitting(true);
    try {
      if (currentStep === 1) {
        const ok = await handleStep1Next();
        if (ok) {
          setErrors({});
          setCurrentStep(2);
          scrollToTop();
        }
        return;
      }
      const ok = await handleFinalSubmit();
      if (ok) scrollToTop();
    } catch {
      setSubmitError('Connection issue. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return <SuccessView />;

  return (
    <div ref={localScrollRef}>
      <p className="mb-3 text-sm font-medium text-[#5a6570]">
        Step {currentStep} of {TOTAL_STEPS} — {STEP_TITLES[currentStep]}
      </p>

      <div className="mb-5">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#eef0f4]">
          <div
            className="h-full rounded-full bg-[#f27921] transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <LaptopPrizeCard />

      <form onSubmit={handleSubmit} className="space-y-1" noValidate>
        <p className="mb-4 text-xs font-medium text-[#667085]">
          Fields marked with <span className="text-[#f27921]">*</span> are required.
        </p>

        {currentStep === 1 ? (
          <div className="grid grid-cols-1 gap-3.5">
            <NeoField label="Student Name" error={errors.studentName} required>
              <FormInput
                id="jee-main-student-name"
                name="studentName"
                autoComplete="name"
                required
                value={form.studentName}
                onChange={(e) => setField('studentName', e.target.value)}
                error={errors.studentName}
                placeholder="Full name"
              />
            </NeoField>

            <MobileOtpField
              label="Mobile Number"
              required
              fullName={form.studentName}
              mobileNumber={form.mobileNumber}
              onMobileChange={(digits) => setField('mobileNumber', digits)}
              error={errors.mobileNumber}
              onVerifiedChange={handleOtpVerifiedChange}
              occupation="JEE Main Mock Test"
            />
          </div>
        ) : null}

        {currentStep === 2 ? (
          <div className="grid grid-cols-1 gap-3.5">
            <NeoField label="WhatsApp Number" error={errors.whatsappNumber} required>
              <FormInput
                id="jee-main-whatsapp"
                name="whatsappNumber"
                inputMode="numeric"
                autoComplete="tel"
                required
                maxLength={10}
                value={form.whatsappNumber}
                onChange={(e) => setField('whatsappNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                error={errors.whatsappNumber}
                placeholder="10-digit WhatsApp number"
              />
            </NeoField>

            <NeoField label="Current studying" error={errors.currentStudying} required>
              <FormSelect
                id="jee-main-current-studying"
                name="currentStudying"
                required
                value={form.currentStudying}
                onChange={(e) => setField('currentStudying', e.target.value)}
                error={errors.currentStudying}
                options={CURRENT_STUDYING_OPTIONS}
                placeholder="Select current studying"
              />
            </NeoField>

            <NeoField label="College Name" error={errors.collegeName} required>
              <FormInput
                id="jee-main-college"
                name="collegeName"
                required
                value={form.collegeName}
                onChange={(e) => setField('collegeName', e.target.value)}
                error={errors.collegeName}
                placeholder="School or college name"
              />
            </NeoField>

            <NeoField label="Location (City/Town)" error={errors.location} required>
              <FormInput
                id="jee-main-location"
                name="location"
                required
                value={form.location}
                onChange={(e) => setField('location', e.target.value)}
                error={errors.location}
                placeholder="City or town"
              />
            </NeoField>

            <NeoField label="Remarks (if any)" error={errors.remarks}>
              <FormTextarea
                id="jee-main-remarks"
                name="remarks"
                value={form.remarks}
                onChange={(e) => setField('remarks', e.target.value)}
                error={errors.remarks}
                placeholder="Anything you want to convey"
              />
            </NeoField>
          </div>
        ) : null}

        {submitError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {submitError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-[#8a94a0]">{STEP_HINTS[currentStep]}</p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className="rounded-xl border border-[#d8dce6] bg-white px-5 py-2.5 text-sm font-semibold text-[#041e30] transition hover:border-[#f27921]/40 hover:text-[#f27921] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || (currentStep === 1 && !otpVerified)}
              title={
                currentStep === 1 && !otpVerified
                  ? 'Verify your mobile number with OTP to continue'
                  : undefined
              }
              className="rounded-xl bg-[#f27921] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-12px_rgba(242,121,33,0.7)] transition hover:bg-[#e06810] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting
                ? currentStep === 2
                  ? 'Registering…'
                  : 'Saving…'
                : currentStep === 2
                  ? 'Register'
                  : 'Continue'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
