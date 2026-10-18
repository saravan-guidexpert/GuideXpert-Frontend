import { useEffect, useMemo, useRef, useState } from 'react';
import { getIitCounsellingSlots } from '../utils/api';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import {
  extractIitCounsellingSlotsPayload,
  getAvailableSlots,
  normalizeSlotOptionsFromApi,
  parseIitSlotSelection,
} from '../utils/weekendSlots';
/** Keep in sync with GuideXpert-Backend/controllers/formController.js IIT_ALLOWED_VALUES.classStatus and IitCounsellingSubmission schema. */
const CURRENT_STUDYING_OPTIONS = [
  'Completed 12th/Intermediate 2nd Year',
  'Studying 12th/Intermediate 2nd Year',
  'Studying 11th/Intermediate 1st Year',
  'Degree Completed',
  'Degree Studying',
  'Engineering Completed',
  'Engineering Studying',
  'Diploma',
];
const STREAM_OPTIONS = ['MPC', 'BiPC', 'Commerce', 'Others'];
const CAREER_DECISION_OPTIONS = ['Very clear', 'Somewhat clear', 'Completely confused'];
const COLLEGE_DECISION_OPTIONS = ['Self', 'Parents', 'Both'];
const BUDGET_OPTIONS = ['<1L', '1-3L', '3-6L', '6L+'];
const COLLEGE_PRIORITY_OPTIONS = ['Placements', 'Brand', 'Fees', 'Skills', 'Abroad opportunities', 'All the above'];
/** Keep in sync with GuideXpert-Backend/controllers/formController.js IIT_ALLOWED_VALUES.preferredLanguage */
const PREFERRED_LANGUAGE_OPTIONS = ['Telugu', 'Hindi'];
const HELP_OPTIONS = ['Scholarship Test', 'Career Counseling with IITian', 'How to choose the right college', 'Not sure'];
const ONE_TO_ONE_OPTIONS = ['Yes', 'Maybe', 'No'];
const CONFUSION_OPTIONS = ['Course', 'College', 'Placements', 'Parent pressure', 'Not sure'];

const initialFormData = {
  fullName: '',
  mobileNumber: '',
  studentOrParent: '',
  classStatus: '',
  stream: '',
  city: '',
  slotBooking: '',
  top5Colleges: '',
  careerDecisionClarity: '',
  collegeDecisionStakeholder: '',
  expectedBudget: '',
  topCollegePriority: '',
  preferredLanguage: '',
  helpNeeded: '',
  wantsOneToOneSession: '',
  biggestConfusion: '',
};

const STUDENT_PARENT_OPTIONS = ['Student', 'Parent'];

const neoInputClass =
  'w-full rounded-[10px] border-2 border-[#0F172A] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] outline-none transition-all focus:-translate-y-0.5 focus:shadow-[3px_3px_0px_#0F172A]';

const neoLabelClass = 'mb-2 block text-sm font-black uppercase tracking-wide text-[#0F172A]';

const IIT_COUNSELLING_WHATSAPP_URL = `https://wa.me/919009000914?text=${encodeURIComponent('Hi')}`;
const WHATSAPP_REDIRECT_SECONDS = 4;

export default function IitCounsellingPage() {
  const [formData, setFormData] = useState(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionId, setSubmissionId] = useState('');
  const [visitorFingerprint, setVisitorFingerprint] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ ok: false, message: '' });
  const [waSection1Notice, setWaSection1Notice] = useState('');
  /** After section 3 saves: show thanks UI, then redirect to WhatsApp (not section 3 again). */
  const [showThankYou, setShowThankYou] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(WHATSAPP_REDIRECT_SECONDS);

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpInfo, setOtpInfo] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const otpInputRefs = useRef([]);

  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const [slotOptionsTick, setSlotOptionsTick] = useState(0);
  const [enabledSlotBookings, setEnabledSlotBookings] = useState(null);
  const [resolvedSlotOptions, setResolvedSlotOptions] = useState(null);
  const [iitSlotDateOverrides, setIitSlotDateOverrides] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  useEffect(() => {
    const bump = () => setSlotOptionsTick((t) => t + 1);
    const id = window.setInterval(bump, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') bump();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true);
    getIitCounsellingSlots()
      .then((res) => {
        if (cancelled) return;
        const payload = extractIitCounsellingSlotsPayload(res);
        if (payload && Array.isArray(payload.enabledSlotBookings)) {
          setEnabledSlotBookings(payload.enabledSlotBookings);
          setIitSlotDateOverrides(Array.isArray(payload.dateOverrides) ? payload.dateOverrides : []);
          const fromApi = normalizeSlotOptionsFromApi(payload.slotOptions);
          setResolvedSlotOptions(fromApi.length > 0 ? fromApi : null);
        } else {
          setEnabledSlotBookings([]);
          setIitSlotDateOverrides([]);
          setResolvedSlotOptions(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnabledSlotBookings([]);
          setIitSlotDateOverrides([]);
          setResolvedSlotOptions(null);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => { cancelled = true; };
  }, [slotOptionsTick]);

  const slotBookingOptions = useMemo(() => {
    if (Array.isArray(resolvedSlotOptions) && resolvedSlotOptions.length > 0) {
      return resolvedSlotOptions;
    }
    if (enabledSlotBookings === null) return [];
    return getAvailableSlots(new Date(), enabledSlotBookings, iitSlotDateOverrides);
  }, [slotOptionsTick, enabledSlotBookings, iitSlotDateOverrides, resolvedSlotOptions]);

  useEffect(() => {
    if (!formData.slotBooking || !enabledSlotBookings) return;
    const stillAvailable = slotBookingOptions.some((opt) => opt.value === formData.slotBooking);
    if (!stillAvailable) {
      setFormData((prev) => ({ ...prev, slotBooking: '' }));
    }
  }, [enabledSlotBookings, formData.slotBooking, slotBookingOptions]);

  const stepConfig = useMemo(() => ({
    1: ['fullName', 'mobileNumber', 'studentOrParent', 'classStatus', 'stream', 'city', 'slotBooking', 'top5Colleges'],
    2: ['careerDecisionClarity', 'collegeDecisionStakeholder', 'expectedBudget', 'topCollegePriority', 'preferredLanguage'],
    3: ['helpNeeded', 'wantsOneToOneSession', 'biggestConfusion'],
  }), []);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const payload = {
      path: window.location.pathname,
      query: window.location.search,
      referrer: document.referrer || '',
      utm_source: queryParams.get('utm_source') || '',
      utm_medium: queryParams.get('utm_medium') || '',
      utm_campaign: queryParams.get('utm_campaign') || '',
      utm_content: queryParams.get('utm_content') || '',
    };

    fetch(`${apiBase}/iit-counselling/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        const fingerprint = result?.data?.visitorFingerprint;
        if (response.ok && typeof fingerprint === 'string' && fingerprint) {
          setVisitorFingerprint(fingerprint);
        }
      })
      .catch(() => {});
  }, [apiBase]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (otpSent && !otpVerified) {
      const first = otpInputRefs.current[0];
      if (first) {
        const timeout = setTimeout(() => first.focus(), 50);
        return () => clearTimeout(timeout);
      }
    }
    return undefined;
  }, [otpSent, otpVerified]);

  useEffect(() => {
    if (!showThankYou) return undefined;

    setRedirectCountdown(WHATSAPP_REDIRECT_SECONDS);
    const tick = window.setInterval(() => {
      setRedirectCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const redirectTimer = window.setTimeout(() => {
      window.location.assign(IIT_COUNSELLING_WHATSAPP_URL);
    }, WHATSAPP_REDIRECT_SECONDS * 1000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(redirectTimer);
    };
  }, [showThankYou]);

  const openWhatsApp = () => {
    window.location.assign(IIT_COUNSELLING_WHATSAPP_URL);
  };

  const handleInputChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    if (key === 'mobileNumber' && !otpVerified) {
      if (otpSent) {
        setOtpSent(false);
        setOtp('');
        setOtpError('');
        setOtpInfo('');
      }
    }
  };

  const handleMobileChange = (value) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    handleInputChange('mobileNumber', digitsOnly);
  };

  const canRequestOtp = () => {
    const name = formData.fullName.trim();
    const phone = formData.mobileNumber.trim();
    return name.length >= 2 && /^\d{10}$/.test(phone);
  };

  const missingOtpRequirementHint = () => {
    const name = formData.fullName.trim();
    const phone = formData.mobileNumber.trim();
    if (name.length < 2) return 'Enter your full name to enable OTP.';
    if (!/^\d{10}$/.test(phone)) return 'Enter a valid 10-digit mobile number to enable OTP.';
    return '';
  };

  const handleSendOtp = async () => {
    if (otpLoading || resendIn > 0) return;
    setOtpError('');
    setOtpInfo('');
    if (!canRequestOtp()) {
      setOtpError(missingOtpRequirementHint() || 'Please complete your name and mobile number first.');
      return;
    }
    setOtpLoading(true);
    try {
      const response = await fetch(`${apiBase}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          phone: formData.mobileNumber.trim(),
          occupation: formData.studentOrParent || 'IIT Counselling',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || `Could not send OTP (status ${response.status}).`);
      }
      setOtpSent(true);
      setOtp('');
      setResendIn(30);
      setOtpInfo(result?.message || 'OTP request submitted. Please check your SMS messages.');
    } catch (error) {
      const message = error?.message || 'Could not send OTP. Please try again.';
      const friendly = /failed to fetch|networkerror|typeerror/i.test(message)
        ? 'Could not reach the OTP service. Please check your internet and try again.'
        : message;
      setOtpError(friendly);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpLoading) return;
    setOtpError('');
    setOtpInfo('');
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError('Enter the 6-digit OTP you received.');
      return;
    }
    setOtpLoading(true);
    try {
      const response = await fetch(`${apiBase}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.mobileNumber.trim(),
          otp: otp.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || 'Invalid OTP. Please try again.');
      }
      setOtpVerified(true);
      setOtp('');
      setOtpError('');
      setOtpInfo('Mobile number verified successfully.');
      setErrors((prev) => ({ ...prev, mobileNumber: '' }));
    } catch (error) {
      setOtpError(error?.message || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleEditPhone = () => {
    setOtpVerified(false);
    setOtpSent(false);
    setOtp('');
    setOtpError('');
    setOtpInfo('');
    setResendIn(0);
  };

  const updateOtpDigit = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const chars = prev.split('');
      while (chars.length < 6) chars.push('');
      chars[index] = digit;
      return chars.slice(0, 6).join('');
    });
    if (otpError) setOtpError('');
    if (digit && index < 5) {
      const next = otpInputRefs.current[index + 1];
      if (next) next.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    const key = event.key;
    if (key === 'Backspace') {
      event.preventDefault();
      setOtp((prev) => {
        const chars = prev.split('');
        while (chars.length < 6) chars.push('');
        if (chars[index]) {
          chars[index] = '';
          return chars.join('');
        }
        if (index > 0) {
          chars[index - 1] = '';
          const prevInput = otpInputRefs.current[index - 1];
          if (prevInput) prevInput.focus();
        }
        return chars.join('');
      });
      if (otpError) setOtpError('');
      return;
    }
    if (key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      const prevInput = otpInputRefs.current[index - 1];
      if (prevInput) prevInput.focus();
    } else if (key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      const nextInput = otpInputRefs.current[index + 1];
      if (nextInput) nextInput.focus();
    } else if (key === 'Enter' && otp.length === 6) {
      event.preventDefault();
      handleVerifyOtp();
    }
  };

  const handleOtpPaste = (event) => {
    const text = event.clipboardData?.getData('text') || '';
    const digits = text.replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    setOtp(digits);
    if (otpError) setOtpError('');
    const focusIndex = Math.min(digits.length, 5);
    const target = otpInputRefs.current[focusIndex];
    if (target) target.focus();
  };

  const validateStep = (step) => {
    const nextErrors = {};
    const fields = stepConfig[step] || [];
    fields.forEach((key) => {
      if (!String(formData[key] ?? '').trim()) nextErrors[key] = 'This field is required.';
    });
    if (formData.mobileNumber && !/^\d{10}$/.test(formData.mobileNumber.trim())) {
      nextErrors.mobileNumber = 'Enter a valid 10-digit mobile number.';
    }
    if (step === 1 && !otpVerified) {
      nextErrors.mobileNumber = 'Please verify your mobile number with OTP first.';
    }
    if (step === 1 && String(formData.slotBooking ?? '').trim()) {
      const { slotBookingDate } = parseIitSlotSelection(formData.slotBooking, slotBookingOptions);
      if (!slotBookingDate) {
        nextErrors.slotBooking = 'Could not resolve your session date. Please choose a slot from the list again.';
      }
    }
    return nextErrors;
  };

  const saveCurrentStep = async () => {
    const nextErrors = validateStep(currentStep);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    const endpoint = currentStep === 1
      ? `${apiBase}/iit-counselling/section1`
      : currentStep === 2
        ? `${apiBase}/iit-counselling/section2`
        : `${apiBase}/iit-counselling/section3`;

    const selectedSlotOption = currentStep === 1
      ? slotBookingOptions.find((o) => o.value === formData.slotBooking)
      : null;
    const { slotBooking, slotBookingDate } = parseIitSlotSelection(formData.slotBooking, slotBookingOptions);

    const payload = currentStep === 1
      ? {
          fullName: formData.fullName.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          studentOrParent: formData.studentOrParent,
          classStatus: formData.classStatus,
          stream: formData.stream,
          city: formData.city.trim(),
          slotBooking: slotBooking || selectedSlotOption?.slotBooking || formData.slotBooking,
          ...(slotBookingDate ? { slotBookingDate } : {}),
          visitorFingerprint,
          otpVerified: true,
          top5Colleges: formData.top5Colleges
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 5),
        }
      : currentStep === 2
        ? {
            submissionId,
            careerDecisionClarity: formData.careerDecisionClarity,
            collegeDecisionStakeholder: formData.collegeDecisionStakeholder,
            expectedBudget: formData.expectedBudget,
            topCollegePriority: formData.topCollegePriority,
            preferredLanguage: formData.preferredLanguage,
          }
        : {
            submissionId,
            helpNeeded: formData.helpNeeded,
            wantsOneToOneSession: formData.wantsOneToOneSession,
            biggestConfusion: formData.biggestConfusion,
          };

    setSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || 'Could not save this step right now.');
      }
      if (result?.data?.submissionId) {
        setSubmissionId(result.data.submissionId);
      }
      if (currentStep === 1 && result?.data?.whatsappSlotBooked) {
        const w = result.data.whatsappSlotBooked;
        if (w.attempted && w.success) {
          setWaSection1Notice('Check WhatsApp for your slot confirmation.');
        } else {
          setWaSection1Notice('');
        }
      }
      return true;
    } catch (error) {
      setSubmitState({
        ok: false,
        message: error?.message || 'Failed to save this step. Please try again.',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitState({ ok: false, message: '' });
    if (currentStep === 1) setWaSection1Notice('');

    const saved = await saveCurrentStep();
    if (!saved) return;

    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    setSubmitState({ ok: true, message: '' });
    setShowThankYou(true);
  };

  const goBack = () => {
    if (currentStep > 1) {
      setErrors({});
      setSubmitState({ ok: false, message: '' });
      if (currentStep === 2) setWaSection1Notice('');
      setCurrentStep((prev) => prev - 1);
    }
  };

  const stepTitle = currentStep === 1 ? 'Section 1: Basic Details' : currentStep === 2 ? 'Section 2' : 'Section 3';

  if (showThankYou) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-10 selection:bg-[#c7f36b] selection:text-[#0F172A] sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[14px] border-2 border-[#0F172A] bg-white p-8 text-center shadow-[6px_6px_0px_#0F172A] sm:p-12">
            <p className="mb-3 inline-flex rounded border-2 border-emerald-800 bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-900">
              Submission received
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">Thank you for submitting!</h1>
            <p className="mx-auto mt-4 max-w-lg text-sm font-medium leading-relaxed text-slate-600">
              Your IIT counselling form is complete. We&apos;ve saved all your answers.
              {waSection1Notice ? ` ${waSection1Notice}` : ' Check WhatsApp for your slot confirmation if you booked in Section 1.'}
            </p>
            <p className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-500">
              {redirectCountdown > 0
                ? `Opening WhatsApp in ${redirectCountdown} second${redirectCountdown === 1 ? '' : 's'}…`
                : 'Opening WhatsApp…'}
            </p>
            <button
              type="button"
              onClick={openWhatsApp}
              className="mt-8 rounded-[14px] border-2 border-[#0F172A] bg-[#c7f36b] px-8 py-4 text-sm font-black uppercase tracking-wide text-[#0F172A] shadow-[4px_4px_0px_#0F172A] transition-all hover:-translate-y-0.5 hover:bg-[#b0d95d]"
            >
              Continue on WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10 selection:bg-[#c7f36b] selection:text-[#0F172A] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-[14px] border-2 border-[#0F172A] bg-[#0F172A] p-6 text-white shadow-[6px_6px_0px_#c7f36b]">
          <p className="mb-2 inline-flex rounded border border-slate-600 bg-[#1E293B] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300">
            IIT Counselling Intake
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Book Your IITian Counselling Session</h1>
          <p className="mt-2 text-sm font-medium text-slate-300">
            Step {currentStep} of 3 - {stepTitle}
          </p>
          {currentStep >= 2 && waSection1Notice ? (
            <p className="mt-3 rounded-lg border-2 border-emerald-900/40 bg-emerald-950/50 px-3 py-2 text-xs font-semibold text-emerald-100">
              {waSection1Notice}
            </p>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[14px] border-2 border-[#0F172A] bg-white p-5 shadow-[6px_6px_0px_#0F172A] sm:p-7"
        >
          {currentStep === 1 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="1. Full Name" error={errors.fullName}>
                <input className={neoInputClass} value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <label className={neoLabelClass}>2. Mobile Number</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <div className="relative flex-1">
                    <input
                      className={`${neoInputClass} ${otpVerified ? 'bg-emerald-50 pr-28' : 'pr-24'}`}
                      inputMode="numeric"
                      maxLength={10}
                      value={formData.mobileNumber}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      readOnly={otpVerified}
                      aria-invalid={Boolean(errors.mobileNumber)}
                    />
                    {otpVerified ? (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border-2 border-emerald-700 bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                        Verified
                      </span>
                    ) : null}
                  </div>
                  {otpVerified ? (
                    <button
                      type="button"
                      onClick={handleEditPhone}
                      className="rounded-[10px] border-2 border-[#0F172A] bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-[#0F172A] transition-all hover:-translate-y-0.5 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading || resendIn > 0 || !canRequestOtp()}
                      title={!canRequestOtp() ? missingOtpRequirementHint() : (resendIn > 0 ? `Resend available in ${resendIn}s` : undefined)}
                      className="rounded-[10px] border-2 border-[#0F172A] bg-[#0F172A] px-4 py-3 text-xs font-black uppercase tracking-wide text-white shadow-[3px_3px_0px_#c7f36b] transition-all hover:-translate-y-0.5 hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {otpLoading && !otpSent ? 'Sending...' : otpSent ? (resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP') : 'Send OTP'}
                    </button>
                  )}
                </div>
                {errors.mobileNumber ? <p className="mt-1 text-xs font-bold text-red-700">{errors.mobileNumber}</p> : null}
                {!otpVerified && !otpSent && !errors.mobileNumber && !canRequestOtp() ? (
                  <p className="mt-1 text-xs font-semibold text-slate-600">{missingOtpRequirementHint()}</p>
                ) : null}

                {otpSent && !otpVerified ? (
                  <div className="mt-3 rounded-[10px] border-2 border-[#0F172A] bg-[#F8FAFC] p-3">
                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#0F172A]">Enter OTP</label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2" onPaste={handleOtpPaste}>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <input
                            key={index}
                            ref={(el) => { otpInputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={1}
                            value={otp[index] || ''}
                            onChange={(e) => updateOtpDigit(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            onFocus={(e) => e.target.select()}
                            aria-label={`OTP digit ${index + 1}`}
                            className="h-12 w-12 rounded-[10px] border-2 border-[#0F172A] bg-white text-center text-lg font-black text-[#0F172A] outline-none transition-all focus:-translate-y-0.5 focus:shadow-[3px_3px_0px_#0F172A]"
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || otp.length !== 6}
                        className="rounded-[10px] border-2 border-[#0F172A] bg-[#c7f36b] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#0F172A] shadow-[3px_3px_0px_#0F172A] transition-all hover:-translate-y-0.5 hover:bg-[#b0d95d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {otpLoading ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                    {otpError ? (
                      <p className="mt-2 text-xs font-bold text-red-700">{otpError}</p>
                    ) : otpInfo ? (
                      <p className="mt-2 text-xs font-bold text-emerald-800">{otpInfo}</p>
                    ) : null}
                  </div>
                ) : null}
                {otpVerified && otpInfo ? (
                  <p className="mt-2 text-xs font-bold text-emerald-800">{otpInfo}</p>
                ) : null}
                {!otpSent && otpError ? (
                  <p className="mt-2 text-xs font-bold text-red-700">{otpError}</p>
                ) : null}
              </div>
              <ChoiceGroup label="3. Student or Parent?" options={STUDENT_PARENT_OPTIONS} value={formData.studentOrParent} onChange={(value) => handleInputChange('studentOrParent', value)} error={errors.studentOrParent} />
              <Field label="4. Current studying" error={errors.classStatus}>
                <select
                  className={neoInputClass}
                  value={formData.classStatus}
                  onChange={(e) => handleInputChange('classStatus', e.target.value)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {CURRENT_STUDYING_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>
              <ChoiceGroup label="5. Stream" options={STREAM_OPTIONS} value={formData.stream} onChange={(value) => handleInputChange('stream', value)} error={errors.stream} />
              <Field label="6. City" error={errors.city}>
                <input className={neoInputClass} value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} />
              </Field>
              <div className="sm:col-span-1">
                <p className={neoLabelClass}>7. Select Your Demo Slot</p>
                {slotsLoading ? (
                  <p className="text-sm font-semibold text-[#64748B]">Loading available slots…</p>
                ) : slotBookingOptions.length === 0 ? (
                  <p className="rounded-[10px] border-2 border-[#0F172A] bg-[#F8FAFC] p-3 text-sm font-semibold text-[#64748B]">
                    No demo slots are available right now. Please check back later.
                  </p>
                ) : (
                  <ChoiceGroup
                    label="7. Select Your Demo Slot"
                    options={slotBookingOptions}
                    value={formData.slotBooking}
                    onChange={(value) => handleInputChange('slotBooking', value)}
                    error={errors.slotBooking}
                    hideLabel
                  />
                )}
                {!slotsLoading && errors.slotBooking ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">{errors.slotBooking}</p>
                ) : null}
              </div>
              <Field label="8. Your Top 5 colleges (comma separated)" error={errors.top5Colleges}>
                <textarea className={`${neoInputClass} min-h-[100px]`} value={formData.top5Colleges} onChange={(e) => handleInputChange('top5Colleges', e.target.value)} />
              </Field>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChoiceGroup label="9. Career decision clarity" options={CAREER_DECISION_OPTIONS} value={formData.careerDecisionClarity} onChange={(value) => handleInputChange('careerDecisionClarity', value)} error={errors.careerDecisionClarity} />
              <ChoiceGroup label="10. Who decides college?" options={COLLEGE_DECISION_OPTIONS} value={formData.collegeDecisionStakeholder} onChange={(value) => handleInputChange('collegeDecisionStakeholder', value)} error={errors.collegeDecisionStakeholder} />
              <ChoiceGroup label="11. Expected annual budget" options={BUDGET_OPTIONS} value={formData.expectedBudget} onChange={(value) => handleInputChange('expectedBudget', value)} error={errors.expectedBudget} />
              <ChoiceGroup label="12. What matters most?" options={COLLEGE_PRIORITY_OPTIONS} value={formData.topCollegePriority} onChange={(value) => handleInputChange('topCollegePriority', value)} error={errors.topCollegePriority} />
              <ChoiceGroup label="Language you prefer" options={PREFERRED_LANGUAGE_OPTIONS} value={formData.preferredLanguage} onChange={(value) => handleInputChange('preferredLanguage', value)} error={errors.preferredLanguage} />
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChoiceGroup label="13. What would you like help with?" options={HELP_OPTIONS} value={formData.helpNeeded} onChange={(value) => handleInputChange('helpNeeded', value)} error={errors.helpNeeded} />
              <ChoiceGroup label="14. Need 1:1 personalized guidance?" options={ONE_TO_ONE_OPTIONS} value={formData.wantsOneToOneSession} onChange={(value) => handleInputChange('wantsOneToOneSession', value)} error={errors.wantsOneToOneSession} />
              <ChoiceGroup label="15. Biggest confusion right now?" options={CONFUSION_OPTIONS} value={formData.biggestConfusion} onChange={(value) => handleInputChange('biggestConfusion', value)} error={errors.biggestConfusion} />
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Data is saved section by section.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={currentStep === 1 || submitting}
                className="rounded-[14px] border-2 border-[#0F172A] bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || (currentStep === 1 && !otpVerified)}
                title={currentStep === 1 && !otpVerified ? 'Verify your mobile number with OTP to continue' : undefined}
                className="rounded-[14px] border-2 border-[#0F172A] bg-[#c7f36b] px-6 py-3 text-sm font-black uppercase tracking-wide text-[#0F172A] shadow-[4px_4px_0px_#0F172A] transition-all hover:-translate-y-0.5 hover:bg-[#b0d95d] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Saving...' : currentStep === 3 ? 'Submit Final Section' : 'Save & Next'}
              </button>
            </div>
          </div>

          {submitState.message ? (
            <p
              className={`mt-4 rounded-[10px] border-2 px-4 py-3 text-sm font-bold ${
                submitState.ok
                  ? 'border-emerald-900 bg-emerald-100 text-emerald-900'
                  : 'border-red-900 bg-red-100 text-red-900'
              }`}
            >
              {submitState.message}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div className="sm:col-span-1">
      <label className={neoLabelClass}>{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}

function ChoiceGroup({ label, options, value, onChange, error, hideLabel = false }) {
  const normalizedOptions = options
    .map((option) => {
      if (typeof option === 'string') {
        return { value: option, label: option };
      }
      return {
        value: option?.value || '',
        label: option?.label || option?.value || '',
      };
    })
    .filter((option) => option.value);

  return (
    <div className={hideLabel ? '' : 'sm:col-span-1'}>
      {hideLabel ? null : (
        <p className={neoLabelClass}>
          {label}
        </p>
      )}
      <div className="space-y-2 rounded-[10px] border-2 border-[#0F172A] bg-[#F8FAFC] p-3">
        {normalizedOptions.map((option) => {
          const id = `${label}-${option.value}`;
          return (
            <label key={option.value} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <input
                id={id}
                type="radio"
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="h-4 w-4 border-2 border-[#0F172A] accent-[#0F172A]"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {!hideLabel && error ? <p className="mt-1 text-xs font-bold text-red-700">{error}</p> : null}
    </div>
  );
}
