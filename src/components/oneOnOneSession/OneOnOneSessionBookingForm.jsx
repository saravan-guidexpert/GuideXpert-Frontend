import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MobileOtpField from '../forms/MobileOtpField';
import {
  ChoiceGroup,
  FormInput,
  FormSelect,
  NeoField,
} from './FormControls';
import SessionSlotPicker from './SessionSlotPicker';
import {
  COLLEGE_BUDGET_OPTIONS,
  CURRENT_CLASS_OPTIONS,
  INITIAL_FORM_STATE,
  INTERESTED_BRANCH_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  SESSION_ATTENDEE_OPTIONS,
} from '../../constants/oneOnOneCounselingForm';
import { saveOneOnOneSection1, saveOneOnOneSection2 } from '../../utils/api';
import { getApiBaseUrl } from '../../utils/apiBaseUrl';
import {
  getOneOnOneCounselingSlots,
  msUntilNextISTMidnight,
} from '../../utils/oneOnOneCounselingSlots';
import { resolveUtmAttribution, trackOneOnOneSessionVisit } from '../../utils/oneOnOneSessionTracking';
import {
  hasValidationErrors,
  validateOneOnOneForm,
  validateOneOnOneFormStep,
} from '../../utils/oneOnOneCounselingValidation';

const STEP_TITLES = {
  1: 'Name & verification',
  2: 'Session preferences',
};

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
        Booking successful
      </p>
      <h2 className="text-xl font-bold tracking-tight text-[#041e30] sm:text-2xl">
        Your session request is confirmed
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#5a6570]">
        Thank you for booking your free 1-on-1 IITian career counseling session with GuideXpert.
      </p>

      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[#e5e7eb] bg-[#f8f9fc] p-5 text-left sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
          What happens next
        </p>
        <p className="mt-2 text-sm font-semibold leading-snug text-[#041e30] sm:text-base">
          Our executive will get in touch with you shortly on WhatsApp for the exact confirmation of
          your preferred session slot.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#5a6570]">
          The time you selected is your preference — we will confirm the final slot with you before
          the session.
        </p>
      </div>

      <p className="mx-auto mt-5 max-w-md text-xs font-medium text-[#8a94a0]">
        Keep WhatsApp notifications on so you don&apos;t miss our message.
      </p>
    </div>
  );
}

/**
 * Shared 1-on-1 booking form for the full page and modal popup.
 * @param {{ scrollContainerRef?: React.RefObject<HTMLElement | null>, showIntro?: boolean }} props
 */
export default function OneOnOneSessionBookingForm({
  scrollContainerRef = null,
  showIntro = true,
}) {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [currentStep, setCurrentStep] = useState(1);
  const [leadId, setLeadId] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [parentAttendanceConfirmed, setParentAttendanceConfirmed] = useState(false);
  const [slotOptionsTick, setSlotOptionsTick] = useState(0);
  const [visitorFingerprint, setVisitorFingerprint] = useState('');
  const localScrollRef = useRef(null);

  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const sessionSlotOptions = useMemo(() => {
    void slotOptionsTick;
    return getOneOnOneCounselingSlots();
  }, [slotOptionsTick]);

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

  useEffect(() => {
    let cancelled = false;
    const utmPayload = resolveUtmAttribution();
    trackOneOnOneSessionVisit(apiBase, utmPayload).then((fingerprint) => {
      if (!cancelled && fingerprint) setVisitorFingerprint(fingerprint);
    });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  useEffect(() => {
    const bump = () => setSlotOptionsTick((t) => t + 1);
    const intervalId = window.setInterval(bump, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') bump();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let cancelled = false;
    let midnightTimerId;
    const scheduleMidnightRefresh = () => {
      midnightTimerId = window.setTimeout(() => {
        if (cancelled) return;
        bump();
        scheduleMidnightRefresh();
      }, msUntilNextISTMidnight());
    };
    scheduleMidnightRefresh();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(midnightTimerId);
    };
  }, []);

  useEffect(() => {
    if (!form.preferredTimeSlot) return;
    if (!sessionSlotOptions.some((o) => o.value === form.preferredTimeSlot)) {
      setForm((prev) => ({ ...prev, preferredTimeSlot: '' }));
    }
  }, [sessionSlotOptions, form.preferredTimeSlot]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const root = scrollContainerRef?.current || localScrollRef.current || document;
      root
        .querySelector?.('[aria-invalid="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const validateCurrentStep = () => {
    const nextErrors = validateOneOnOneFormStep(form, currentStep);
    if (currentStep === 1 && !otpVerified) {
      nextErrors.mobileNumber = 'Please verify your mobile number with OTP first.';
    }
    if (currentStep === 2) {
      if (!form.preferredTimeSlot?.trim()) {
        nextErrors.preferredTimeSlot =
          nextErrors.preferredTimeSlot || 'Please select a session slot';
      } else if (!sessionSlotOptions.some((o) => o.value === form.preferredTimeSlot)) {
        nextErrors.preferredTimeSlot = 'Please select a valid session slot (next 2 days, IST).';
      }
    }
    return nextErrors;
  };

  const handleNext = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const nextErrors = validateCurrentStep();
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) {
      setSubmitError('Please complete all required fields before continuing.');
      scrollToFirstError();
      return;
    }

    setSubmitting(true);
    try {
      const utmPayload = resolveUtmAttribution();
      let fingerprint = visitorFingerprint;
      if (!fingerprint) {
        fingerprint = await trackOneOnOneSessionVisit(apiBase, utmPayload);
        if (fingerprint) setVisitorFingerprint(fingerprint);
      }

      const result = await saveOneOnOneSection1({
        studentName: form.studentName.trim(),
        mobileNumber: form.mobileNumber.replace(/\D/g, ''),
        otpVerified: true,
        ...utmPayload,
        ...(fingerprint ? { visitorFingerprint: fingerprint } : {}),
      });
      if (!result.success) {
        setSubmitError(result.message || 'Could not save this step. Please try again.');
        return;
      }
      const savedLeadId = result.data?.data?.leadId;
      if (savedLeadId) setLeadId(savedLeadId);

      setErrors({});
      setCurrentStep(2);
      scrollToTop();
    } catch {
      setSubmitError('Connection issue. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep <= 1) return;
    setErrors({});
    setSubmitError('');
    setParentAttendanceConfirmed(false);
    setCurrentStep((prev) => prev - 1);
    scrollToTop();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep === 1) {
      await handleNext(e);
      return;
    }

    setSubmitError('');
    const nextErrors = validateOneOnOneForm(form);
    if (!otpVerified) {
      nextErrors.mobileNumber = 'Please verify your mobile number with OTP first.';
    }
    if (!form.preferredTimeSlot?.trim()) {
      nextErrors.preferredTimeSlot =
        nextErrors.preferredTimeSlot || 'Please select a session slot';
    } else if (!sessionSlotOptions.some((o) => o.value === form.preferredTimeSlot)) {
      nextErrors.preferredTimeSlot = 'Please select a valid session slot (next 2 days, IST).';
    }
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) {
      setSubmitError('Please complete all required fields before submitting.');
      scrollToFirstError();
      return;
    }

    if (!parentAttendanceConfirmed) {
      setSubmitError('Please confirm that you will mandatorily attend the session with your parent.');
      return;
    }

    if (!leadId) {
      setSubmitError('Session expired. Please go back to step 1 and try again.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await saveOneOnOneSection2({
        leadId,
        currentClass: form.currentClass,
        sessionAttendee: form.sessionAttendee,
        interestedBranch: form.interestedBranch,
        collegeBudget: form.collegeBudget,
        preferredLanguage: form.preferredLanguage,
        preferredTimeSlot: form.preferredTimeSlot,
        parentAttendanceConfirmed: true,
      });

      if (result.success) {
        setSubmitted(true);
        scrollToTop();
      } else {
        setSubmitError(result.message || 'Unable to submit. Please try again.');
      }
    } catch {
      setSubmitError('Connection issue. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={localScrollRef}>
      {!submitted ? (
        <>
          {showIntro ? (
            <div className="mb-5 rounded-2xl border border-[#e5e7eb] bg-gradient-to-br from-[#041e30] to-[#0b2a42] p-5 text-white sm:p-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
                1-on-1 Career Counseling
              </p>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Book Your 1-on-1 IITian Career Counseling Session
              </h1>
              <p className="mt-2 text-sm font-medium text-white/70">
                Step {currentStep} of 2 — {STEP_TITLES[currentStep]}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/55">
                Get clarity on college selection, branch selection, placements, fees, and future career
                options — guided by experienced IITians.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-white/80">
                <li className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  1-on-1 personalized
                </li>
                <li className="rounded-full border border-[#f27921]/30 bg-[#f27921]/15 px-3 py-1 text-[#ffd2ae]">
                  100% free counseling
                </li>
              </ul>
            </div>
          ) : (
            <p className="mb-3 text-sm font-medium text-[#5a6570]">
              Step {currentStep} of 2 — {STEP_TITLES[currentStep]}
            </p>
          )}

          <div className="mb-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#eef0f4]">
              <div
                className="h-full rounded-full bg-[#f27921] transition-all duration-300"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-1" noValidate>
            <p className="mb-4 text-xs font-medium text-[#667085]">
              Fields marked with <span className="text-[#f27921]">*</span> are required.
            </p>

            {currentStep === 1 ? (
              <div className="grid grid-cols-1 gap-4">
                <NeoField label="Student Name" error={errors.studentName} required>
                  <FormInput
                    id="studentName"
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
                  occupation="1-on-1 Counseling"
                  className=""
                />
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ChoiceGroup
                  label="Current Class"
                  name="currentClass"
                  options={CURRENT_CLASS_OPTIONS}
                  value={form.currentClass}
                  onChange={(value) => setField('currentClass', value)}
                  error={errors.currentClass}
                  required
                  className="sm:col-span-2"
                />

                <NeoField
                  label="Who Will Attend the Session?"
                  error={errors.sessionAttendee}
                  className="sm:col-span-2"
                  required
                >
                  <FormSelect
                    id="sessionAttendee"
                    name="sessionAttendee"
                    required
                    value={form.sessionAttendee}
                    onChange={(e) => setField('sessionAttendee', e.target.value)}
                    error={errors.sessionAttendee}
                    options={SESSION_ATTENDEE_OPTIONS}
                    placeholder="Select who will attend"
                  />
                </NeoField>

                <NeoField label="Interested Branch" error={errors.interestedBranch} required>
                  <FormSelect
                    id="interestedBranch"
                    name="interestedBranch"
                    required
                    value={form.interestedBranch}
                    onChange={(e) => setField('interestedBranch', e.target.value)}
                    error={errors.interestedBranch}
                    options={INTERESTED_BRANCH_OPTIONS}
                    placeholder="Select branch"
                  />
                </NeoField>

                <NeoField label="College Budget" error={errors.collegeBudget} required>
                  <FormSelect
                    id="collegeBudget"
                    name="collegeBudget"
                    required
                    value={form.collegeBudget}
                    onChange={(e) => setField('collegeBudget', e.target.value)}
                    error={errors.collegeBudget}
                    options={COLLEGE_BUDGET_OPTIONS}
                    placeholder="Select budget"
                  />
                </NeoField>

                <ChoiceGroup
                  label="Preferred Language"
                  name="preferredLanguage"
                  options={PREFERRED_LANGUAGE_OPTIONS}
                  value={form.preferredLanguage}
                  onChange={(value) => setField('preferredLanguage', value)}
                  error={errors.preferredLanguage}
                  required
                />

                <SessionSlotPicker
                  label="Preferred Session Slot"
                  name="preferredTimeSlot"
                  options={sessionSlotOptions}
                  value={form.preferredTimeSlot}
                  onChange={(value) => setField('preferredTimeSlot', value)}
                  error={errors.preferredTimeSlot}
                  required
                />
                <p className="-mt-1 text-xs font-medium text-[#667085] sm:col-span-2">
                  3-hour slots from 9 AM–9 PM (IST) for the next 2 calendar days. Slots update at
                  12:00 AM IST.
                </p>

                <div className="sm:col-span-2">
                  <p className="mb-2 text-[13px] font-semibold text-[#041e30]">
                    Confirmation <span className="text-[#f27921]">*</span>
                  </p>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5e7eb] bg-[#f8f9fc] p-3.5 transition hover:border-[#f27921]/35">
                    <input
                      type="checkbox"
                      checked={parentAttendanceConfirmed}
                      onChange={(e) => {
                        setParentAttendanceConfirmed(e.target.checked);
                        if (e.target.checked) setSubmitError('');
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#d8dce6] text-[#f27921] accent-[#f27921]"
                    />
                    <span className="text-sm font-medium text-[#041e30]">
                      I&apos;ll mandatorily attend the session with the parent.
                    </span>
                  </label>
                </div>
              </div>
            ) : null}

            {submitError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {submitError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-[#8a94a0]">
                {currentStep === 2
                  ? "We'll contact you on WhatsApp to confirm your session."
                  : 'Verify your number to continue.'}
              </p>
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
                  disabled={
                    submitting ||
                    (currentStep === 1 && !otpVerified) ||
                    (currentStep === 2 && !parentAttendanceConfirmed)
                  }
                  title={
                    currentStep === 1 && !otpVerified
                      ? 'Verify your mobile number with OTP to continue'
                      : currentStep === 2 && !parentAttendanceConfirmed
                        ? 'Please confirm parent attendance to book your session'
                        : undefined
                  }
                  className="rounded-xl bg-[#f27921] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-12px_rgba(242,121,33,0.7)] transition hover:bg-[#e06810] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting
                    ? currentStep === 2
                      ? 'Booking…'
                      : 'Saving…'
                    : currentStep === 2
                      ? 'Book free session'
                      : 'Continue'}
                </button>
              </div>
            </div>
          </form>
        </>
      ) : (
        <SuccessView />
      )}
    </div>
  );
}
