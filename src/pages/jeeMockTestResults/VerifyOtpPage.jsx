import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OtpBoxes from '../../components/jeeMockTestResults/OtpBoxes';
import ResultsShell, { resultsPrimaryButtonClass } from '../../components/jeeMockTestResults/ResultsShell';
import {
  cancelResultOtp,
  getResultOtpStatus,
  resendResultOtp,
  verifyResultOtp,
} from '../../utils/jeeMockTestResultsApi';
import { emptyOtpDigits, otpValue } from '../../utils/jeeMockTestOtpEntry';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [digits, setDigits] = useState(emptyOtpDigits);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [incompleteMessage, setIncompleteMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let ignore = false;
    getResultOtpStatus().then((response) => {
      if (ignore) return;
      if (!response.ok) {
        navigate('/jee-mock-test/results', { replace: true });
        return;
      }
      setMaskedMobile(response.data.maskedMobile || '');
      setSecondsLeft(Number(response.data.resendAfterSeconds) || 0);
      setOtpExpired(Boolean(response.data.otpExpired));
      setPhase('ready');
    });
    return () => {
      ignore = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  async function onVerify(event) {
    event.preventDefault();
    const code = otpValue(digits);
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      setErrorCode('OTP_INVALID');
      return;
    }
    setSubmitting(true);
    setError('');
    setErrorCode('');
    const response = await verifyResultOtp(code);
    if (!response.ok) {
      setSubmitting(false);
      setError(response.data?.message || 'Unable to verify that code.');
      setErrorCode(response.data?.code || '');
      if (response.data?.code === 'OTP_EXPIRED' || response.status >= 500) {
        setOtpExpired(response.data?.code === 'OTP_EXPIRED');
        setSecondsLeft(0);
      }
      return;
    }
    if (response.data?.eligible === false || response.data?.eligibility === 'FORM_INCOMPLETE') {
      setSubmitting(false);
      setIncompleteMessage(response.data?.message || 'Your registration is not complete, so result access is not available.');
      return;
    }
    if (response.data?.eligible === true) {
      navigate('/jee-mock-test/results/view', { replace: true });
      return;
    }
    setSubmitting(false);
    setError('Unable to confirm this number. Please try again.');
  }

  async function onResend() {
    setResending(true);
    setError('');
    setErrorCode('');
    const response = await resendResultOtp();
    setResending(false);
    if (!response.ok) {
      setError(response.data?.message || 'Unable to resend the code.');
      if (response.data?.resendAfterSeconds) setSecondsLeft(Number(response.data.resendAfterSeconds) || 60);
      if (response.status === 401) navigate('/jee-mock-test/results', { replace: true });
      return;
    }
    setDigits(emptyOtpDigits());
    setSecondsLeft(Number(response.data.resendAfterSeconds) || 60);
    setOtpExpired(false);
    setMaskedMobile(response.data.maskedMobile || maskedMobile);
  }

  async function onChangeNumber() {
    await cancelResultOtp();
    navigate('/jee-mock-test/results', { replace: true });
  }

  return (
    <ResultsShell title="Verify Your Number | GuideXpert">
      {phase === 'loading' ? (
        <div className="animate-pulse space-y-4" aria-hidden="true">
          <div className="h-4 w-28 rounded bg-[#e5e7eb]" />
          <div className="h-8 w-56 rounded bg-[#e5e7eb]" />
          <div className="h-14 rounded-xl bg-[#e5e7eb]" />
        </div>
      ) : incompleteMessage ? (
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[#003366] uppercase">Registration incomplete</p>
          <h1 className="mt-2 text-[1.7rem] leading-tight font-semibold tracking-tight">Finish your registration</h1>
          <p className="mt-4 text-[15px] leading-6 text-[#243646]" role="status">{incompleteMessage}</p>
          <p className="mt-3 text-sm leading-6 text-[#5c6b7a]">
            This is different from a completed registration where the exam was not attempted. Result access opens only after the registration form is complete.
          </p>
          <Link to="/" className={`${resultsPrimaryButtonClass} mt-6`}>
            Go to registration
          </Link>
          <button type="button" className="mt-3 min-h-11 w-full text-sm font-semibold text-[#5c6b7a]" onClick={onChangeNumber}>
            Use another number
          </button>
        </div>
      ) : (
        <form onSubmit={onVerify}>
          <h1 className="text-[1.85rem] leading-tight font-semibold tracking-tight">Verify Your Number</h1>
          <p className="mt-3 text-[15px] leading-6 text-[#5c6b7a]">
            Enter the 6-digit code sent to <span className="font-semibold text-[#041e30]">{maskedMobile}</span>.
          </p>
          <div className="mt-7">
            <OtpBoxes
              digits={digits}
              onDigits={(next) => {
                setDigits(next);
                setError('');
                setErrorCode('');
              }}
              disabled={submitting}
              invalid={errorCode === 'OTP_INVALID' || errorCode === 'OTP_EXPIRED' || errorCode === 'OTP_LOCKED'}
            />
          </div>
          {(otpExpired || errorCode === 'OTP_EXPIRED') && (
            <p className="mt-3 text-sm text-red-700" role="alert">This code has expired. Request a new one.</p>
          )}
          {error && errorCode !== 'OTP_EXPIRED' && (
            <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              className="font-semibold text-[#003366] disabled:text-[#9aa3ad]"
              onClick={onResend}
              disabled={secondsLeft > 0 || resending || submitting}
            >
              {resending ? 'Sending…' : secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
            </button>
            <button type="button" className="font-semibold text-[#5c6b7a]" onClick={onChangeNumber} disabled={submitting}>
              Change number
            </button>
          </div>
          <button type="submit" className={`${resultsPrimaryButtonClass} mt-6`} disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      )}
    </ResultsShell>
  );
}
