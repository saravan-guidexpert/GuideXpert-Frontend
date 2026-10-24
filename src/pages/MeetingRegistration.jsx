import { useState, useRef, useEffect, useCallback } from 'react';
import {
  registerForMeeting,
  registerForOrientationMeeting,
  registerForActivationCounsellorMeeting,
  sendOtp,
  verifyOtp,
  checkMeetingDemoEligibility,
  checkOrientationMeetEligibility,
  checkActivationCounsellorMeetEligibility,
} from '../utils/api';

const DEFAULT_GOOGLE_MEET_LINK = 'https://meet.google.com/rgk-pwrg-jze';

const POLL_MS = 30000;

function validateName(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return 'Name is required';
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  if (trimmed.length > 100) return 'Name must be at most 100 characters';
  return '';
}

function validateMobile(value) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!digits) return 'Mobile number is required';
  if (digits.length !== 10) return 'Mobile number must be exactly 10 digits';
  return '';
}

/** Backend wraps payload as { success, data: eligibility }; normalize. */
function eligibilityFromResponse(apiResult) {
  const body = apiResult?.data;
  if (!body || typeof body !== 'object') return null;
  return body.data && typeof body.data === 'object' ? body.data : body;
}

export default function MeetingRegistration({
  redirectMeetUrl = DEFAULT_GOOGLE_MEET_LINK,
  variant = 'demo',
}) {
  const isDemo = variant === 'demo';
  const isActivationCounsellor = variant === 'activation-counsellor';
  const otpOccupation = isDemo
    ? 'Meeting Attendee'
    : isActivationCounsellor
      ? 'Activation Counsellor Meet Attendee'
      : 'Orientation Attendee';
  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({ name: '', mobileNumber: '' });
  const [submitError, setSubmitError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [meetGateModal, setMeetGateModal] = useState(null);
  const [eligibilityRechecking, setEligibilityRechecking] = useState(false);

  const otpInputRefs = useRef([]);
  const joiningRef = useRef(false);
  const meetSheetWasOpenRef = useRef(false);
  const [meetSheetEntered, setMeetSheetEntered] = useState(false);

  const normalizedPhone = () => {
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    return cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
  };

  const attemptJoinMeet = useCallback(
    async (phone, displayName) => {
      if (joiningRef.current) return;
      joiningRef.current = true;
      try {
        const reg = isDemo
          ? await registerForMeeting(displayName, phone)
          : isActivationCounsellor
            ? await registerForActivationCounsellorMeeting(displayName, phone)
            : await registerForOrientationMeeting(displayName, phone);
        if (!reg.success) {
          if (isDemo) {
            window.location.href = redirectMeetUrl;
            return;
          }
          joiningRef.current = false;
          if (reg.status === 403 && isActivationCounsellor) {
            setSubmitError(reg.message || 'You are not eligible to join this meet. Complete the activation form first.');
            return;
          }
          setSubmitError(reg.message || 'Could not complete meeting registration. Please try again.');
          return;
        }
        window.location.href = redirectMeetUrl;
      } catch {
        if (isDemo) {
          window.location.href = redirectMeetUrl;
          return;
        }
        joiningRef.current = false;
        setSubmitError('Network error. Please try again.');
      }
    },
    [redirectMeetUrl, isDemo, isActivationCounsellor]
  );

  const recheckEligibilityAndJoin = useCallback(async () => {
    if (!isDemo) return;
    const phone = normalizedPhone();
    if (phone.length !== 10) return;
    setEligibilityRechecking(true);
    setSubmitError('');
    try {
      const result = await checkMeetingDemoEligibility(phone);
      const elig = eligibilityFromResponse(result);
      if (!result.success || !elig) {
        setSubmitError(result.message || 'Could not verify your demo slot. Please try again.');
        return;
      }
      if (elig.status === 'allowed') {
        setMeetGateModal(null);
        setSuccessMessage('Joining the meet...');
        joiningRef.current = false;
        await attemptJoinMeet(phone, name.trim());
      } else {
        setMeetGateModal({
          status: elig.status,
          message: elig.message || 'You cannot join the meet yet.',
          slotStartLabel: elig.slotStartLabel,
          joinOpensAtLabel: elig.joinOpensAtLabel,
          slotEndLabel: elig.slotEndLabel,
        });
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setEligibilityRechecking(false);
    }
  }, [attemptJoinMeet, mobileNumber, name, isDemo]);

  useEffect(() => {
    if (!isDemo || !meetGateModal || meetGateModal.status !== 'too_early') return;
    const phone = normalizedPhone();
    if (phone.length !== 10) return;
    const id = setInterval(() => {
      recheckEligibilityAndJoin();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [isDemo, meetGateModal, mobileNumber, recheckEligibilityAndJoin]);

  useEffect(() => {
    if (!meetGateModal) {
      meetSheetWasOpenRef.current = false;
      setMeetSheetEntered(false);
      return;
    }

    const openingFresh = !meetSheetWasOpenRef.current;
    if (!openingFresh) return;

    meetSheetWasOpenRef.current = true;
    setMeetSheetEntered(false);
    const outerId = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMeetSheetEntered(true));
    });
    return () => {
      cancelAnimationFrame(outerId);
      meetSheetWasOpenRef.current = false;
    };
  }, [meetGateModal]);

  const handleNameChange = (e) => {
    const v = e.target.value;
    setName(v);
    setErrors((prev) => ({ ...prev, name: validateName(v) }));
    setSubmitError('');
  };

  const handleMobileChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(v);
    setErrors((prev) => ({ ...prev, mobileNumber: validateMobile(v) }));
    setSubmitError('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const nameErr = validateName(name);
    const mobileErr = validateMobile(mobileNumber);
    setErrors({ name: nameErr, mobileNumber: mobileErr });
    if (nameErr || mobileErr) {
      setSubmitError('Please fix the errors above.');
      return;
    }

    setSubmitError('');
    setSuccessMessage('');
    setLoading(true);

    const cleanPhone = mobileNumber.replace(/\D/g, '');

    try {
      const result = await sendOtp(name.trim(), cleanPhone, otpOccupation);

      if (result.success) {
        setSuccessMessage('OTP request submitted. Please check your SMS messages.');
        setStep(2);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        if (result.status === 429) {
          setSubmitError(result.message || 'Too many OTP requests. Please try again after some time.');
        } else {
          setSubmitError(result.message || 'Failed to send OTP. Please try again.');
        }
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setOtpError('');

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setOtp(newOtp);

    const lastIndex = Math.min(pastedData.length - 1, 5);
    otpInputRefs.current[lastIndex]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setSubmitError('');
    joiningRef.current = false;

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setVerifying(true);
    const phone = normalizedPhone();

    try {
      const result = await verifyOtp(phone, otpString);

      if (result.success && result.data?.verified === true) {
        if (isDemo) {
          setSuccessMessage('OTP verified! Joining the meet...');
          setVerifying(false);
          await attemptJoinMeet(phone, name.trim());
          return;
        }

        setSuccessMessage('OTP verified. Checking activation…');

        const eligResult = isActivationCounsellor
          ? await checkActivationCounsellorMeetEligibility(phone)
          : await checkOrientationMeetEligibility(phone);
        const elig = eligibilityFromResponse(eligResult);

        if (!eligResult.success || !elig) {
          setSuccessMessage('');
          setOtpError(
            eligResult.message || 'Could not verify activation. Please try again.'
          );
          setVerifying(false);
          return;
        }

        if (elig.status === 'allowed') {
          setSuccessMessage('OTP verified! Joining the meet...');
          setVerifying(false);
          await attemptJoinMeet(phone, name.trim());
          return;
        }

        setSuccessMessage('');
        setOtpError(elig.message || 'You are not eligible to join this meet. Complete the activation form first.');
      } else {
        const errorMessage = result.message || 'Invalid or expired OTP. Please try again.';
        setOtpError(errorMessage);
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setOtpError('Network error. Please check your connection and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setSubmitError('');
    setSuccessMessage('');
    setOtp(['', '', '', '', '', '']);
    setLoading(true);

    const phone = normalizedPhone();

    try {
      const result = await sendOtp(name.trim(), phone, otpOccupation);

      if (result.success) {
        setSuccessMessage('OTP resent successfully');
        otpInputRefs.current[0]?.focus();
      } else {
        if (result.status === 429) {
          setSubmitError(result.message || 'Too many OTP requests. Please try again after some time.');
        } else {
          setSubmitError(result.message || 'Failed to resend OTP. Please try again.');
        }
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setSubmitError('');
    setSuccessMessage('');
    setMeetGateModal(null);
    joiningRef.current = false;
  };

  const closeMeetGateModal = () => {
    setMeetSheetEntered(false);
    window.setTimeout(() => {
      setMeetGateModal(null);
      joiningRef.current = false;
      meetSheetWasOpenRef.current = false;
    }, 340);
  };

  const modalTitle =
    meetGateModal?.status === 'too_early'
      ? 'Live session not open yet'
      : meetGateModal?.status === 'too_late'
        ? 'Session window ended'
        : 'Demo booking required';

  const sheetStatusStyles =
    meetGateModal?.status === 'too_early'
      ? { ring: 'ring-[#007aff]/20', iconBg: 'bg-[#007aff]/12', iconColor: 'text-[#007aff]' }
      : meetGateModal?.status === 'too_late'
        ? { ring: 'ring-orange-400/25', iconBg: 'bg-orange-500/10', iconColor: 'text-orange-600' }
        : { ring: 'ring-slate-400/20', iconBg: 'bg-slate-500/10', iconColor: 'text-slate-600' };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {isDemo && meetGateModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center md:p-6" role="presentation">
          <button
            type="button"
            aria-label="Close dialog"
            className={`absolute inset-0 bg-black/48 backdrop-blur-md transition-opacity duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
              meetSheetEntered ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeMeetGateModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="meet-gate-title"
            className={`relative z-10 w-full max-w-lg md:max-w-[420px] mx-auto outline-none transition-all duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
              meetSheetEntered
                ? 'translate-y-0 opacity-100 md:scale-100'
                : 'translate-y-[108%] opacity-100 md:translate-y-8 md:scale-[0.94] md:opacity-0'
            }`}
          >
            <div
              className={`rounded-t-[1.35rem] md:rounded-[1.35rem] bg-white/[0.97] shadow-[0_-12px_48px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.04)] ring-1 ring-inset ${sheetStatusStyles.ring} backdrop-blur-2xl px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-6 md:px-6 md:pt-4`}
            >
              <div className="flex justify-center pb-2 md:hidden" aria-hidden>
                <span className="h-1 w-10 shrink-0 rounded-full bg-gray-300/90" />
              </div>
              <div className="flex gap-4 items-start">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] ${sheetStatusStyles.iconBg} ${sheetStatusStyles.iconColor}`}
                  aria-hidden
                >
                  {meetGateModal.status === 'too_early' && (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {meetGateModal.status === 'too_late' && (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  )}
                  {meetGateModal.status !== 'too_early' && meetGateModal.status !== 'too_late' && (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 id="meet-gate-title" className="text-[1.0625rem] font-semibold tracking-tight text-gray-900 leading-snug">
                    {modalTitle}
                  </h2>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-gray-600 whitespace-pre-wrap">{meetGateModal.message}</p>
                  {meetGateModal.status === 'too_early' && (
                    <p className="mt-3 text-[0.8125rem] leading-snug text-gray-500">
                      We&apos;ll check automatically every 30 seconds, or tap <span className="font-medium text-gray-700">Check again</span>{' '}
                      once the live demo join window opens (see times above; doors may open a few minutes early per schedule).
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end sm:gap-3 sm:flex-wrap">
                <button
                  type="button"
                  onClick={closeMeetGateModal}
                  className="w-full sm:w-auto min-h-[48px] rounded-[0.8125rem] px-5 text-[0.9375rem] font-semibold text-[#007aff] bg-[#007aff]/[0.08] hover:bg-[#007aff]/[0.14] active:scale-[0.98] transition-transform duration-150 sm:bg-transparent sm:hover:bg-gray-100 sm:text-gray-800"
                >
                  Close
                </button>
                {meetGateModal.status === 'too_early' && (
                  <button
                    type="button"
                    disabled={eligibilityRechecking || verifying}
                    onClick={recheckEligibilityAndJoin}
                    className="w-full sm:w-auto min-h-[48px] rounded-[0.8125rem] bg-[#007aff] px-5 text-[0.9375rem] font-semibold text-white shadow-sm hover:bg-[#0066dd] active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100 transition-[transform,opacity] duration-150"
                  >
                    {eligibilityRechecking ? 'Checking…' : 'Check again'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">GuideXpert</h1>
          <p className="text-gray-600 mt-1">
            {isDemo
              ? 'Join Google Meet Session'
              : isActivationCounsellor
                ? 'Activation counsellor Google Meet'
                : 'Orientation Google Meet'}
          </p>
        </div>

        {step === 2 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Step 2 of 2</span>
              <span>OTP Verification</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-700 h-1.5 rounded-full transition-all" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {isDemo || isActivationCounsellor ? 'Register for Meet' : 'Register for orientation meet'}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {isDemo
                ? 'Enter your details to receive an OTP.'
                : 'Use the same mobile number as on your activation form. We will send an OTP to verify.'}
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Verify Your Number</h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter the 6-digit OTP sent to your mobile number ending in{' '}
              <span className="font-medium text-gray-900">****{mobileNumber.slice(-4)}</span>
            </p>
          </>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm" role="status">
            {successMessage}
          </div>
        )}

        {submitError && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm" role="alert">
            {submitError}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="meet-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="meet-name"
                value={name}
                onChange={handleNameChange}
                placeholder="Full Name"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
                autoComplete="name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="meet-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="meet-mobile"
                value={mobileNumber}
                onChange={handleMobileChange}
                placeholder="10-digit mobile number"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                  errors.mobileNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
              />
              {errors.mobileNumber && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.mobileNumber}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex justify-center gap-2 sm:gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition border-gray-300"
                    aria-label={`OTP digit ${index + 1}`}
                    disabled={verifying}
                  />
                ))}
              </div>
              {otpError && (
                <p className="mt-2 text-sm text-red-600 text-center" role="alert">
                  {otpError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={verifying || loading}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={verifying || loading}
                className="flex-[2] py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {verifying ? 'Verifying...' : 'Verify & Join Meet'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || verifying}
                className="text-sm text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Resending...' : "Didn't receive OTP? Resend"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-xs text-gray-500 text-center">
          By joining, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
