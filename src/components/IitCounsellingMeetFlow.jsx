import { useState, useRef } from 'react';
import { sendOtp, verifyOtp } from '../utils/api';

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

/**
 * Shared name + OTP + register + Meet redirect flow for IIT counselling meet pages.
 * @param {object} props
 * @param {string} props.meetLink - Google Meet URL after successful registration
 * @param {(name: string, mobile: string) => Promise<{success: boolean, message?: string}>} props.registerFn
 * @param {string} props.otpOccupationLabel - passed to sendOtp for logging
 * @param {string} props.pageSubtitle - line under "GuideXpert"
 * @param {string} props.joinHeading - step 1 title
 * @param {string} [props.joinDescription]
 * @param {string} props.idPrefix - unique HTML id prefix for inputs
 * @param {(mobile: string) => Promise<{success: boolean, exists?: boolean, data?: object}>} [props.checkExistingFn]
 */
export default function IitCounsellingMeetFlow({
  meetLink,
  registerFn,
  otpOccupationLabel,
  pageSubtitle,
  joinHeading,
  joinDescription = 'Enter your details to receive an OTP.',
  idPrefix,
  checkExistingFn,
}) {
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

  const otpInputRefs = useRef([]);
  const joiningRef = useRef(false);

  const normalizedPhone = () => {
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    return cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
  };

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
      if (checkExistingFn) {
        const statusResult = await checkExistingFn(cleanPhone);
        if (statusResult.success && statusResult.exists) {
          const displayName = (statusResult.data?.name || name).trim();
          if (statusResult.data?.name) {
            setName(statusResult.data.name);
          }
          await attemptJoinMeet(cleanPhone, displayName);
          return;
        }
      }

      const result = await sendOtp(name.trim(), cleanPhone, otpOccupationLabel);

      if (result.success) {
        setSuccessMessage('OTP request submitted. Please check your SMS messages.');
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

  const attemptJoinMeet = async (phone, displayName) => {
    if (joiningRef.current) return;
    joiningRef.current = true;
    try {
      const reg = await registerFn(displayName, phone);
      if (!reg.success) {
        joiningRef.current = false;
        setSubmitError(reg.message || 'Could not complete registration. Please try again.');
        return;
      }
      window.location.href = meetLink;
    } catch {
      joiningRef.current = false;
      setSubmitError('Network error. Please try again.');
    }
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
        setSuccessMessage('OTP verified! Joining the meet...');
        setVerifying(false);
        await attemptJoinMeet(phone, name.trim());
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
      const result = await sendOtp(name.trim(), phone, otpOccupationLabel);

      if (result.success) {
        setSuccessMessage('OTP resent successfully');
        otpInputRefs.current[0]?.focus();
      } else if (result.status === 429) {
        setSubmitError(result.message || 'Too many OTP requests. Please try again after some time.');
      } else {
        setSubmitError(result.message || 'Failed to resend OTP. Please try again.');
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
    joiningRef.current = false;
  };

  const nameId = `${idPrefix}-name`;
  const mobileId = `${idPrefix}-mobile`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">GuideXpert</h1>
          <p className="text-gray-600 mt-1">{pageSubtitle}</p>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{joinHeading}</h2>
            <p className="text-sm text-gray-600 mb-6">{joinDescription}</p>
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
              <label htmlFor={nameId} className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id={nameId}
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
              <label htmlFor={mobileId} className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id={mobileId}
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
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
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
