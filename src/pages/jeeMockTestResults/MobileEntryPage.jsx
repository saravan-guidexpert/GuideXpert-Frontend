import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResultsShell, { resultsPrimaryButtonClass } from '../../components/jeeMockTestResults/ResultsShell';
import { requestResultOtp } from '../../utils/jeeMockTestResultsApi';

export default function MobileEntryPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setSubmitting(true);
    setError('');
    const response = await requestResultOtp(mobile);
    setSubmitting(false);
    if (!response.ok) {
      setError(response.data?.message || 'Unable to send OTP. Please try again.');
      return;
    }
    navigate('/jee-mock-test/results/verify');
  }

  return (
    <ResultsShell title="JEE Main Mock Test Results | GuideXpert">
      <div className="flex flex-1 flex-col">
        <h1 className="text-[1.85rem] leading-tight font-semibold tracking-tight">JEE Main Mock Test Results</h1>
        <p className="mt-3 max-w-sm text-[15px] leading-6 text-[#5c6b7a]">
          Enter the mobile number you used to register. We will send a one-time code to confirm it is you.
        </p>

        <form className="mt-8" onSubmit={onSubmit}>
          <label htmlFor="jee-result-mobile" className="mb-2 block text-sm font-semibold">
            Mobile number
          </label>
          <div className={`flex overflow-hidden rounded-xl border bg-white focus-within:ring-2 focus-within:ring-[#003366]/15 ${error ? 'border-red-400' : 'border-[#d8dce6] focus-within:border-[#003366]'}`}>
            <span className="flex items-center border-r border-[#e5e7eb] px-3 text-base font-semibold text-[#041e30]">+91</span>
            <input
              id="jee-result-mobile"
              name="mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(event) => {
                setMobile(event.target.value.replace(/\D/g, '').slice(0, 10));
                setError('');
              }}
              className="min-h-12 w-full bg-transparent px-3 text-base text-[#041e30] outline-none placeholder:text-[#9aa3ad]"
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? 'jee-result-mobile-error' : 'jee-result-privacy'}
            />
          </div>
          {error && (
            <p id="jee-result-mobile-error" className="mt-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={`${resultsPrimaryButtonClass} mt-5`} disabled={submitting}>
            {submitting ? 'Sending code…' : 'Get OTP'}
          </button>
        </form>

        <p id="jee-result-privacy" className="mt-auto pt-8 text-xs leading-5 text-[#5c6b7a]">
          Your code is sent by SMS only to verify this number. Marks and personal details stay on a secure session and are not saved on this device.
        </p>
      </div>
    </ResultsShell>
  );
}
