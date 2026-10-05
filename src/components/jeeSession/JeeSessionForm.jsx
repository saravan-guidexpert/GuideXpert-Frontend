import { useCallback, useRef, useState } from 'react';
import MobileOtpField from '../forms/MobileOtpField';
import { FormInput, FormTextarea, NeoField } from '../oneOnOneSession/FormControls';
import { saveJeeSessionSection1, saveJeeSessionSection2 } from '../../utils/api';
import { hasJeeValidationErrors, validateJeeSessionStep } from '../../utils/jeeSessionValidation';

const TOTAL_STEPS = 2;

const INITIAL_FORM = {
  name: '',
  fatherName: '',
  contactNumber: '',
  whatsappNumber: '',
  currentStudying: '',
  collegeName: '',
  address: '',
  remark: '',
};

const STEP_TITLES = {
  1: 'Name & verification',
  2: 'Study details',
};

const STEP_HINTS = {
  1: 'Verify your contact number to continue.',
  2: 'Tell us where you study and how to reach you.',
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
        Registration successful
      </p>
      <h2 className="text-xl font-bold tracking-tight text-[#041e30] sm:text-2xl">
        Your JEE session details are saved
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#5a6570]">
        Thank you for registering. Our team will use these details to reach you about the JEE session.
      </p>
      <p className="mx-auto mt-5 max-w-md text-xs font-medium text-[#8a94a0]">
        Keep WhatsApp notifications on so you don&apos;t miss our message.
      </p>
    </div>
  );
}

export default function JeeSessionForm() {
  const [form, setForm] = useState(INITIAL_FORM);
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
      setErrors((prev) => ({ ...prev, contactNumber: '' }));
    }
  }, []);

  const scrollToTop = useCallback(() => {
    const el = localScrollRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const root = localScrollRef.current || document;
      root
        .querySelector?.('[aria-invalid="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const validateCurrentStep = () => {
    const nextErrors = validateJeeSessionStep(form, currentStep);
    if (currentStep === 1 && !otpVerified) {
      nextErrors.contactNumber = 'Please verify your contact number with OTP first.';
    }
    return nextErrors;
  };

  const handleStep1Next = async () => {
    const result = await saveJeeSessionSection1({
      name: form.name.trim(),
      fatherName: form.fatherName.trim(),
      contactNumber: form.contactNumber.replace(/\D/g, ''),
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
    const result = await saveJeeSessionSection2({
      leadId,
      whatsappNumber: form.whatsappNumber.replace(/\D/g, ''),
      currentStudying: form.currentStudying.trim(),
      collegeName: form.collegeName.trim(),
      address: form.address.trim(),
      remark: form.remark.trim(),
    });
    if (!result.success) {
      setSubmitError(result.message || 'Unable to submit. Please try again.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const nextErrors = validateCurrentStep();
    setErrors(nextErrors);
    if (hasJeeValidationErrors(nextErrors)) {
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

  return (
    <div ref={localScrollRef}>
      {!submitted ? (
        <>
          <div className="mb-5 rounded-2xl border border-[#e5e7eb] bg-gradient-to-br from-[#041e30] to-[#0b2a42] p-5 text-white sm:p-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
              JEE Sessions
            </p>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Register for a JEE Session
            </h1>
            <p className="mt-2 text-sm font-medium text-white/70">
              Step {currentStep} of {TOTAL_STEPS} — {STEP_TITLES[currentStep]}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/55">
              Share your details so we can reach you about the session.
            </p>
          </div>

          <div className="mb-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#eef0f4]">
              <div
                className="h-full rounded-full bg-[#f27921] transition-all duration-300"
                style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-1" noValidate>
            <p className="mb-4 text-xs font-medium text-[#667085]">
              Fields marked with <span className="text-[#f27921]">*</span> are required.
            </p>

            {currentStep === 1 ? (
              <div className="grid grid-cols-1 gap-3.5">
                <NeoField label="Name" error={errors.name} required>
                  <FormInput
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    error={errors.name}
                    placeholder="Full name"
                  />
                </NeoField>

                <NeoField label="Father's Name" error={errors.fatherName} required>
                  <FormInput
                    id="fatherName"
                    name="fatherName"
                    autoComplete="additional-name"
                    required
                    value={form.fatherName}
                    onChange={(e) => setField('fatherName', e.target.value)}
                    error={errors.fatherName}
                    placeholder="Father's full name"
                  />
                </NeoField>

                <MobileOtpField
                  label="Contact Number"
                  required
                  fullName={form.name}
                  mobileNumber={form.contactNumber}
                  onMobileChange={(digits) => setField('contactNumber', digits)}
                  error={errors.contactNumber}
                  onVerifiedChange={handleOtpVerifiedChange}
                  occupation="JEE Sessions"
                  className=""
                />
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-3">
                <NeoField
                  label="WhatsApp / Alternate Number"
                  error={errors.whatsappNumber}
                  className="sm:col-span-2"
                  required
                >
                  <FormInput
                    id="whatsappNumber"
                    name="whatsappNumber"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    maxLength={10}
                    value={form.whatsappNumber}
                    onChange={(e) => setField('whatsappNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    error={errors.whatsappNumber}
                    placeholder="10-digit WhatsApp or alternate number"
                  />
                </NeoField>

                <NeoField label="Current Studying" error={errors.currentStudying} required>
                  <FormInput
                    id="currentStudying"
                    name="currentStudying"
                    required
                    value={form.currentStudying}
                    onChange={(e) => setField('currentStudying', e.target.value)}
                    error={errors.currentStudying}
                    placeholder="e.g. Inter 2nd year, B.Tech 1st year"
                  />
                </NeoField>

                <NeoField label="College Name" error={errors.collegeName} required>
                  <FormInput
                    id="collegeName"
                    name="collegeName"
                    required
                    value={form.collegeName}
                    onChange={(e) => setField('collegeName', e.target.value)}
                    error={errors.collegeName}
                    placeholder="School or college name"
                  />
                </NeoField>

                <NeoField label="Address (City / Town)" error={errors.address} className="sm:col-span-2" required>
                  <FormInput
                    id="address"
                    name="address"
                    required
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    error={errors.address}
                    placeholder="City or town"
                  />
                </NeoField>

                <NeoField label="Remark" error={errors.remark} className="sm:col-span-2">
                  <FormTextarea
                    id="remark"
                    name="remark"
                    value={form.remark}
                    onChange={(e) => setField('remark', e.target.value)}
                    error={errors.remark}
                    placeholder="Anything you want to convey (optional)"
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
                      ? 'Verify your contact number with OTP to continue'
                      : undefined
                  }
                  className="rounded-xl bg-[#f27921] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-12px_rgba(242,121,33,0.7)] transition hover:bg-[#e06810] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting
                    ? currentStep === 2
                      ? 'Submitting…'
                      : 'Saving…'
                    : currentStep === 2
                      ? 'Submit'
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
