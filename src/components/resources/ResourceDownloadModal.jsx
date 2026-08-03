import { useEffect, useRef, useState } from 'react';
import { FiDownload, FiLoader, FiX } from 'react-icons/fi';
import {
  requestResourceDownloadOtp,
  verifyResourceDownload,
  downloadResourceFile,
} from '../../utils/api';

function normalizePhone(raw) {
  const d = String(raw ?? '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? d : '';
}

export default function ResourceDownloadModal({ resource, open, onClose }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const otpInputRefs = useRef([]);

  useEffect(() => {
    if (!open) {
      setFullName('');
      setPhone('');
      setOtp('');
      setOtpSent(false);
      setLoading(false);
      setError('');
      setInfo('');
      setResendIn(0);
    }
  }, [open, resource?.id]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  if (!open || !resource) return null;

  const canRequestOtp = () =>
    fullName.trim().length >= 2 && /^\d{10}$/.test(normalizePhone(phone));

  const handleSendOtp = async () => {
    if (loading || resendIn > 0) return;
    setError('');
    setInfo('');
    if (!canRequestOtp()) {
      setError('Enter your name and a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const result = await requestResourceDownloadOtp(
        resource.id,
        fullName.trim(),
        normalizePhone(phone)
      );
      if (!result.success) {
        setError(result.message || 'Could not send OTP');
        if (result.data?.retryAfter) setResendIn(result.data.retryAfter);
        return;
      }
      setOtpSent(true);
      setOtp('');
      setInfo('OTP sent to your mobile.');
      setResendIn(60);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err?.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (loading || !otpSent) return;
    const otpStr = String(otp).trim();
    if (!/^\d{6}$/.test(otpStr)) return;
    setLoading(true);
    setError('');
    try {
      const result = await verifyResourceDownload(
        resource.id,
        fullName.trim(),
        normalizePhone(phone),
        otpStr
      );
      if (!result.success) {
        setError(result.message || 'OTP verification failed');
        return;
      }
      const downloadToken = result.data?.downloadToken;
      const fileName = result.data?.fileName || resource.fileName;
      if (!downloadToken) {
        setError('Download token missing. Please try again.');
        return;
      }
      await downloadResourceFile(resource.id, normalizePhone(phone), downloadToken, fileName);
      setInfo('Download started.');
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(err?.message || 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = otp.split('');
    next[index] = digit;
    const joined = next.join('').slice(0, 6);
    setOtp(joined);
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0f172a]/30 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resource-download-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-[#eef1f4] bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Download PDF</p>
            <h2 id="resource-download-title" className="mt-1 text-lg font-semibold text-[#0f172a]">
              {resource.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#475569]"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {!otpSent ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#64748b]">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm text-[#0f172a] outline-none focus:border-[#cbd5e1] focus:ring-2 focus:ring-[#f1f5f9]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#64748b]">Mobile number</span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm text-[#0f172a] outline-none focus:border-[#cbd5e1] focus:ring-2 focus:ring-[#f1f5f9]"
              />
            </label>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || !canRequestOtp()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
              Continue
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#64748b]">
              Enter the OTP sent to <span className="font-medium text-[#334155]">{normalizePhone(phone)}</span>
            </p>
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index] || ''}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="h-11 w-10 rounded-lg border border-[#e2e8f0] text-center text-lg font-medium text-[#0f172a] outline-none focus:border-[#94a3b8]"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiDownload className="h-4 w-4" />}
              Verify &amp; download
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || resendIn > 0}
              className="w-full text-sm text-[#64748b] hover:text-[#334155] disabled:opacity-50"
            >
              {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
            </button>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {info ? <p className="mt-4 text-sm text-emerald-700">{info}</p> : null}
      </div>
    </div>
  );
}
