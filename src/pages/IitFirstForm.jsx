import { useState, useRef } from 'react';
import { sendOtp, verifyOtp, submitIitFirstForm } from '../utils/api';

const OTP_OCCUPATION = 'IIT First Form';

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
 * Public flow: name + mobile → OTP → question about interest in learning more about AI.
 * Routes: /iitfirstform and /Iitfirstform
 */
export default function IitFirstForm() {
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
  const [aiResponseText, setAiResponseText] = useState('');
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [done, setDone] = useState(false);

  const otpInputRefs = useRef([]);

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
      const result = await sendOtp(name.trim(), cleanPhone, OTP_OCCUPATION);

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
    const phone = normalizedPhone();

    try {
      const result = await verifyOtp(phone, otpString);

      if (result.success && result.data?.verified === true) {
        setSuccessMessage('');
        setStep(3);
        setOtpError('');
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
      const result = await sendOtp(name.trim(), phone, OTP_OCCUPATION);

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

  const handleBackFromOtp = () => {
    setStep(1);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setSubmitError('');
    setSuccessMessage('');
  };

  const handleSubmitInterest = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const answer = aiResponseText.trim();
    if (!answer) {
      setSubmitError('Please type your answer in the text field.');
      return;
    }
    if (answer.length > 2000) {
      setSubmitError('Please keep your answer to 2000 characters or fewer.');
      return;
    }

    setSubmittingInterest(true);
    const phone = normalizedPhone();

    try {
      const res = await submitIitFirstForm(name.trim(), phone, answer);
      if (!res.success) {
        setSubmitError(res.message || 'Could not save your answer. Please try again.');
        setSubmittingInterest(false);
        return;
      }
      setDone(true);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmittingInterest(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 sm:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">GuideXpert</h1>
          <p className="text-gray-600 mt-1">IIT first form</p>
        </div>

        {step === 2 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Step 2 of 3</span>
              <span>OTP verification</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-700 h-1.5 rounded-full transition-all" style={{ width: '66%' }} />
            </div>
          </div>
        )}

        {step === 3 && !done && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Step 3 of 3</span>
              <span>Your interest</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-700 h-1.5 rounded-full transition-all" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {done ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Thank you</h2>
            <p className="text-sm text-gray-600">Your response has been recorded.</p>
          </div>
        ) : (
          <>
            {step === 1 && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Get started</h2>
                <p className="text-sm text-gray-600 mb-6">Enter your name and mobile number. We will send you an OTP.</p>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Verify your number</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Enter the 6-digit OTP sent to your number ending in{' '}
                  <span className="font-medium text-gray-900">****{mobileNumber.slice(-4)}</span>
                </p>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">One quick question</p>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-6 border-l-4 border-blue-600 pl-4 py-0.5">
                  Are you interested to learn more about AI?
                </h2>
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
                  <label htmlFor="iit-first-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="iit-first-name"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Full name"
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
                  <label htmlFor="iit-first-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="iit-first-mobile"
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
                  {loading ? 'Sending OTP…' : 'Send OTP'}
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
                    onClick={handleBackFromOtp}
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
                    {verifying ? 'Verifying…' : 'Verify & continue'}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || verifying}
                    className="text-sm text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Resending…' : "Didn't receive OTP? Resend"}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleSubmitInterest} className="space-y-4">
                <div>
                  <label htmlFor="iit-first-ai-response" className="block text-sm font-medium text-gray-700 mb-1">
                    Your answer <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="iit-first-ai-response"
                    value={aiResponseText}
                    onChange={(e) => {
                      setAiResponseText(e.target.value);
                      setSubmitError('');
                    }}
                    rows={4}
                    maxLength={2000}
                    placeholder="Type your response here…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm text-gray-900 resize-y min-h-[100px]"
                    disabled={submittingInterest}
                    aria-describedby="iit-first-ai-response-hint"
                  />
                  <p id="iit-first-ai-response-hint" className="mt-1 text-xs text-gray-500">
                    {aiResponseText.length}/2000 characters
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submittingInterest || !aiResponseText.trim()}
                  className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submittingInterest ? 'Submitting…' : 'Submit'}
                </button>
              </form>
            )}
          </>
        )}

        {!done && (
          <p className="mt-6 text-xs text-gray-500 text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        )}
      </div>
    </div>
  );
}
