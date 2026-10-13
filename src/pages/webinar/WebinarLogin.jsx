import { useState, useRef } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../../utils/api';
import { useWebinarAuth } from '../../contexts/WebinarAuthContext';

const LEFT_PANEL_BG = '#041e30';

function validateMobile(value) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!digits) return 'Mobile number is required';
  if (digits.length !== 10) return 'Mobile number must be exactly 10 digits';
  return '';
}

export default function WebinarLogin() {
  const { setAuthFromVerifyOtp, isAuthenticated } = useWebinarAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [mobileError, setMobileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const otpInputRefs = useRef([]);

  if (isAuthenticated) {
    return <Navigate to="/webinar" replace />;
  }

  const handleMobileChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(v);
    setMobileError(validateMobile(v));
    setSubmitError('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const mobileErr = validateMobile(mobileNumber);
    setMobileError(mobileErr);
    if (mobileErr) {
      setSubmitError('Please fix the errors above.');
      return;
    }
    setSubmitError('');
    setSuccessMessage('');
    setLoading(true);
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    const normalizedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    try {
      const result = await sendOtp('Webinar', normalizedPhone, 'Webinar Login');
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
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
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
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }
    setVerifying(true);
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    const normalizedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    try {
      const result = await verifyOtp(normalizedPhone, otpString, { webinarLogin: true });
      if (result.success && result.data?.verified === true) {
        if (result.data?.allowedAccess === false || !result.data?.token) {
          setStep(3);
          return;
        }
        if (result.data?.token && result.data?.user) {
          setAuthFromVerifyOtp(result.data);
          navigate('/webinar', { replace: true });
          return;
        }
        setOtpError(result.message || 'Login failed. Please try again.');
      } else {
        setOtpError(result.message || result.data?.message || 'Invalid or expired OTP. Please try again.');
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
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    const normalizedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    try {
      const result = await sendOtp('Webinar', normalizedPhone, 'Webinar Login');
      if (result.success) {
        setSuccessMessage('OTP resent successfully');
        otpInputRefs.current[0]?.focus();
      } else {
        setSubmitError(result.message || 'Failed to resend OTP. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please try again.');
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
  };

  if (step === 3) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        <div
          className="relative w-full md:w-1/2 min-h-0 md:min-h-screen flex flex-col justify-center px-5 py-6 md:px-12 md:py-16 overflow-hidden"
          style={{ background: LEFT_PANEL_BG }}
        >
          <div className="webinar-locked-panel-bg" aria-hidden />
          <div className="relative z-10 max-w-md mx-auto w-full flex flex-col items-center justify-center text-center md:text-left md:items-start">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 border-2 border-white/30" aria-hidden>
              <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
              Access limited to training participants
            </h1>
            <p className="text-white/80 text-sm md:text-base">
              This area is for people who have submitted the training form. Sign in with the phone number you used when submitting the form.
            </p>
          </div>
        </div>
        <div className="w-full md:w-1/2 min-h-0 md:min-h-screen flex flex-col items-center justify-center bg-white px-6 py-6 md:px-12 md:py-16">
          <div className="w-full max-w-md text-center">
            <p className="text-lg font-semibold text-gray-900 mb-1">Attend a demo first</p>
            <p className="text-gray-600 text-sm mb-6">
              To get access, book a demo slot. Fill the application form on our homepage and we’ll get you started.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center py-3 px-6 rounded-xl font-medium text-white transition-colors hover:opacity-90 bg-primary-navy"
            >
              Book a demo slot
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel – theme navy, branding + steps */}
      <div
        className="relative w-full md:w-1/2 min-h-0 md:min-h-screen flex flex-col justify-center px-5 py-6 md:px-12 md:py-16"
        style={{ background: LEFT_PANEL_BG }}
      >
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 4l8 8-8 8' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />
        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 mb-6">
            <span className="text-lg font-semibold text-primary-navy">
              Webinar Login
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
            Join your webinar dashboard. Learn and track your progress.
          </h1>
          <p className="text-white/80 text-sm md:text-base mb-8">Just 2 simple steps</p>
          <div className="flex flex-col gap-0">
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 1 ? 'bg-white text-[#041e30]' : 'bg-white/20 text-white border border-white/40'
                }`}
              >
                1
              </div>
              <div className="pt-0.5">
                <p className="text-white text-sm font-medium">Enter your phone number and verify OTP</p>
              </div>
            </div>
            <div className="w-px h-6 bg-white/30 ml-4 mt-0.5" aria-hidden />
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 2 ? 'bg-white text-[#041e30]' : 'bg-white/20 text-white border border-white/40'
                }`}
              >
                2
              </div>
              <div className="pt-0.5">
                <p className="text-white text-sm font-medium">Access your Webinar Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel – white form, theme accents */}
      <div className="w-full md:w-1/2 min-h-0 md:min-h-screen flex flex-col items-center justify-start md:justify-center bg-white px-6 py-6 md:px-12 md:py-16">
        <div className="w-full max-w-md">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
            {step === 1 ? 'Your Webinar Access Starts Here' : 'Verify OTP'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {step === 1
              ? 'Sign in with the mobile number you used in the training form'
              : `Enter the 6-digit code sent to ****${mobileNumber.slice(-4)}`}
          </p>

          {successMessage && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800" role="status">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600" aria-hidden>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </span>
              <span>{successMessage}</span>
            </div>
          )}
          {submitError && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800" role="alert">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600" aria-hidden>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </span>
              <span>{submitError}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="webinar-mobile" className="block text-sm font-medium text-gray-900 mb-1">
                  Mobile Number
                </label>
                <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-primary-navy/20 focus-within:border-primary-navy">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-700 text-sm">
                    <span className="font-medium">IN</span>
                    <span className="text-gray-500">+91</span>
                  </div>
                  <input
                    id="webinar-mobile"
                    type="tel"
                    value={mobileNumber}
                    onChange={handleMobileChange}
                    placeholder="Enter Number"
                    className={`flex-1 min-w-0 px-4 py-2.5 outline-none ${mobileError ? 'border-red-500' : ''}`}
                    disabled={loading}
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
                {mobileError && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {mobileError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-medium text-white uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-primary-navy hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary-navy focus:ring-offset-2"
              >
                {loading ? 'Sending…' : 'Get OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="OTP digits">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-semibold tabular-nums rounded-xl border-2 border-gray-200 bg-gray-50/50 text-gray-900 transition-all duration-200 outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/20 focus:bg-white hover:border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label={`Digit ${index + 1} of 6`}
                      disabled={verifying}
                    />
                  ))}
                </div>
                {otpError && (
                  <p className="text-sm text-red-600 text-center" role="alert">
                    {otpError}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={verifying || loading}
                  className="order-2 sm:order-1 flex-1 py-3.5 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={verifying || loading}
                  className="order-1 sm:order-2 flex-[1.5] py-3.5 px-4 rounded-xl font-semibold text-white bg-primary-navy hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-primary-navy focus:ring-offset-2"
                >
                  {verifying ? 'Verifying…' : 'Verify & Sign in'}
                </button>
              </div>
              <div className="text-center pt-1">
                <span className="text-sm text-gray-500">Didn&apos;t receive the code? </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || verifying}
                  className="text-sm font-semibold text-primary-navy underline underline-offset-2 hover:no-underline disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? 'Resending…' : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
