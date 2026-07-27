import { useState, useRef } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../../utils/api';
import { useStudentAuth } from '../../contexts/StudentAuthContext';

const LEFT_PANEL_BG = '#1a2744';

function validateName(value) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return 'Name is required';
  if (v.length < 2) return 'Name must be at least 2 characters';
  return '';
}

function validateMobile(value) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!digits) return 'Mobile number is required';
  if (digits.length !== 10) return 'Mobile number must be exactly 10 digits';
  return '';
}

export default function StudentLogin() {
  const { setAuthFromVerifyOtp, isAuthenticated } = useStudentAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const otpInputRefs = useRef([]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleNameChange = (e) => {
    const v = e.target.value.slice(0, 100);
    setFullName(v);
    setNameError(validateName(v));
    setSubmitError('');
  };

  const handleMobileChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(v);
    setMobileError(validateMobile(v));
    setSubmitError('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const nameErr = validateName(fullName);
    const mobileErr = validateMobile(mobileNumber);
    setNameError(nameErr);
    setMobileError(mobileErr);
    if (nameErr || mobileErr) {
      setSubmitError('Please fix the errors above.');
      return;
    }
    setSubmitError('');
    setSuccessMessage('');
    setLoading(true);
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    const normalizedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    try {
      const result = await sendOtp(fullName.trim(), normalizedPhone, 'Student Login');
      if (result.success) {
        setSuccessMessage('OTP sent successfully to your mobile number');
        setStep(2);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else if (result.status === 429) {
        setSubmitError(result.message || 'Too many OTP requests. Please try again after some time.');
      } else {
        setSubmitError(result.message || 'Failed to send OTP. Please try again.');
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
      const result = await verifyOtp(normalizedPhone, otpString, {
        studentLogin: true,
        fullName: fullName.trim(),
      });
      if (result.success && result.data?.verified === true) {
        if (result.data?.allowedAccess === false || !result.data?.token) {
          setSubmitError(result.message || 'Login failed. Please try again.');
          return;
        }
        if (result.data?.token && result.data?.user) {
          setAuthFromVerifyOtp(result.data);
          navigate('/', { replace: true });
          return;
        }
      }
      setOtpError(result.message || 'Invalid OTP. Please try again.');
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setSubmitError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div
        className="relative w-full md:w-1/2 min-h-0 md:min-h-screen flex flex-col justify-center px-5 py-6 md:px-12 md:py-16"
        style={{ background: LEFT_PANEL_BG }}
      >
        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 mb-6">
            <span className="text-lg font-semibold text-[#1a2744]">Student Login</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
            Access predictors, fit tests, and counselling tools.
          </h1>
          <p className="text-white/80 text-sm md:text-base mb-8">Sign in with your mobile number</p>
          <div className="flex flex-col gap-0">
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 1 ? 'bg-white text-[#1a2744]' : 'bg-white/20 text-white border border-white/40'
                }`}
              >
                1
              </div>
              <div className="pt-0.5">
                <p className="text-white text-sm font-medium">Enter your name and phone number</p>
              </div>
            </div>
            <div className="w-px h-6 bg-white/30 ml-4 mt-0.5" aria-hidden />
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === 2 ? 'bg-white text-[#1a2744]' : 'bg-white/20 text-white border border-white/40'
                }`}
              >
                2
              </div>
              <div className="pt-0.5">
                <p className="text-white text-sm font-medium">Verify OTP and continue</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 min-h-0 md:min-h-screen flex flex-col items-center justify-start md:justify-center bg-white px-6 py-6 md:px-12 md:py-16">
        <div className="w-full max-w-md">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
            {step === 1 ? 'Student workspace login' : 'Verify OTP'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {step === 1
              ? 'Use your WhatsApp number to receive a one-time code'
              : `Enter the 6-digit code sent to ****${mobileNumber.slice(-4)}`}
          </p>

          {successMessage ? (
            <div
              className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800"
              role="status"
            >
              <span>{successMessage}</span>
            </div>
          ) : null}
          {submitError ? (
            <div
              className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              <span>{submitError}</span>
            </div>
          ) : null}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="student-name" className="block text-sm font-medium text-gray-900 mb-1">
                  Full name
                </label>
                <input
                  id="student-name"
                  type="text"
                  value={fullName}
                  onChange={handleNameChange}
                  placeholder="Enter your name"
                  className={`w-full rounded-xl border-2 px-4 py-2.5 outline-none focus:border-[#f27921] focus:ring-2 focus:ring-[#f27921]/20 ${
                    nameError ? 'border-red-500' : 'border-gray-200'
                  }`}
                  disabled={loading}
                  autoComplete="name"
                />
                {nameError ? (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {nameError}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="student-mobile" className="block text-sm font-medium text-gray-900 mb-1">
                  Mobile Number
                </label>
                <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#f27921]/20 focus-within:border-[#f27921]">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-700 text-sm">
                    <span className="font-medium">IN</span>
                    <span className="text-gray-500">+91</span>
                  </div>
                  <input
                    id="student-mobile"
                    type="tel"
                    value={mobileNumber}
                    onChange={handleMobileChange}
                    placeholder="Enter Number"
                    className="flex-1 min-w-0 px-4 py-2.5 outline-none"
                    disabled={loading}
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
                {mobileError ? (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {mobileError}
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-[#f27921] hover:bg-[#e06810]"
              >
                {loading ? 'Sending…' : 'Get OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="OTP digits">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-semibold tabular-nums rounded-xl border-2 border-gray-200 bg-gray-50/50 text-gray-900 outline-none focus:border-[#f27921] focus:ring-2 focus:ring-[#f27921]/20"
                    aria-label={`Digit ${index + 1} of 6`}
                    disabled={verifying}
                  />
                ))}
              </div>
              {otpError ? (
                <p className="text-center text-sm text-red-600" role="alert">
                  {otpError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white disabled:opacity-50 bg-[#f27921] hover:bg-[#e06810]"
              >
                {verifying ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="w-full text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Change number
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-gray-500">
            Looking for counsellor access?{' '}
            <Link to="/counsellor/login" className="font-medium text-[#f27921] hover:underline">
              Counsellor login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
