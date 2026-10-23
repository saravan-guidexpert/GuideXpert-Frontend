import { useCallback, useId, useRef, useState } from 'react';
import { LuLaptop } from 'react-icons/lu';
import MobileOtpField from '../forms/MobileOtpField';
import { FormInput, FormSelect, FormTextarea, NeoField } from '../oneOnOneSession/FormControls';
import {
  CURRENT_STUDYING_OPTIONS,
  INITIAL_JEE_MAIN_MOCK_TEST_FORM,
} from '../../constants/jeeMainMockTestForm';
import { saveJeeMainMockTestSection1, saveJeeMainMockTestSection2 } from '../../utils/api';
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

function LaptopPrizeCard({ registered = false }) {
  const titleId = useId();

  return (
    <aside
      aria-labelledby={titleId}
      className={`relative overflow-hidden rounded-2xl border border-[#f0d3bd] bg-[linear-gradient(145deg,#fff4eb_0%,#fffaf6_42%,#ffffff_100%)] shadow-[0_14px_32px_-22px_rgba(242,121,33,0.7),0_1px_2px_rgba(4,30,48,0.04)] motion-safe:animate-[sw-fade-up_0.5s_cubic-bezier(0.22,1,0.36,1)_both] ${
        registered ? 'mx-auto mt-5 max-w-lg text-left' : 'mb-5'
      }`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[#f27921]" aria-hidden />
      <div className="flex items-start gap-3 py-3 pr-3 pl-3.5 sm:items-center sm:gap-4 sm:py-3.5 sm:pr-4 sm:pl-4">
        <div className="relative mt-0.5 grid h-12 w-12 shrink-0 place-items-center sm:mt-0 sm:h-14 sm:w-14" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(242,121,33,0.34)_0%,rgba(242,121,33,0.1)_48%,transparent_72%)]" />
          <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-white text-[#f27921] shadow-[0_10px_20px_-12px_rgba(242,121,33,0.9)] ring-1 ring-[#f6d7c2] sm:h-11 sm:w-11">
            <LuLaptop className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={1.75} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase leading-4 tracking-[0.11em] text-[#8a3d10] sm:text-[11px] sm:tracking-[0.12em]">
            <span className="sr-only">JEE Main mock test, special reward</span>
            <span aria-hidden className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span>JEE Main mock test</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="hidden text-[#e0b08a] min-[480px]:inline">·</span>
                <span className="rounded-full bg-white px-1.5 py-px tracking-[0.1em] text-[#c2410c] ring-1 ring-[#f3d3bc]">
                  Special reward
                </span>
              </span>
            </span>
          </p>
          <h3
            id={titleId}
            className="mt-1 text-[0.875rem] font-bold leading-[1.3] tracking-tight text-[#041e30] min-[400px]:text-[0.9375rem] sm:text-base"
          >
            <span className="block">Take the Mock Test.</span>
            <span className="block">Get a Chance to Win a Laptop.</span>
          </h3>
          <p className="mt-1 text-[12px] leading-snug text-[#3e4c59] sm:text-[13px]">
            Register for the JEE Main Mock Test and participate for a chance to win a laptop.
          </p>
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-[#041e30] sm:text-xs">
            <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f27921]" aria-hidden />
            <span className="min-w-0 text-balance">
              {registered ? 'Registration complete' : 'Complete your registration to participate'}
            </span>
          </p>
        </div>
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
    const result = await saveJeeMainMockTestSection1({
      studentName: form.studentName.trim(),
      mobileNumber: form.mobileNumber.replace(/\D/g, ''),
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
