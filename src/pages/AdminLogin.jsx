import { useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import SplitLoginLayout, {
  LoginAlert,
  LoginPhoneField,
  LoginPrimaryButton,
  NAVY_BTN,
} from '../components/auth/SplitLoginLayout';
import { useAuth } from '../hooks/useAuth';
import { getAdminApiBaseUrl } from '../utils/adminApi';
import { sendOtp, verifyOtp } from '../utils/api';

function normalizePhone10(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export default function AdminLogin() {
  const { login, loginWithPhone, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [phoneStep, setPhoneStep] = useState(1);
  const [error, setError] = useState('');
  const [loginHint, setLoginHint] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const otpInputRefs = useRef([]);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setLoginHint('');
    setInfo('');
    setPhoneStep(1);
    setOtp(['', '', '', '', '', '']);
  };

  const leftSteps =
    mode === 'password'
      ? [
          { label: 'Enter your username and password', active: true },
          { label: 'Access the Admin Dashboard', active: false },
        ]
      : [
          { label: 'Enter your phone number and verify OTP', active: phoneStep === 1 },
          { label: 'Access the Admin Dashboard', active: phoneStep === 2 },
        ];

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoginHint('');
    setInfo('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      navigate('/admin', { replace: true });
    } else {
      setError(result.message || 'Login failed');
      if (result.data?.hint) setLoginHint(result.data.hint);
    }
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setInfo('');
    const p = normalizePhone10(phone);
    if (!/^\d{10}$/.test(p)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const result = await sendOtp('Admin', p, 'Admin Login');
      if (!result.success) {
        const msg = result.message || 'Could not send OTP.';
        setError(
          result.status === 500 && import.meta.env.DEV
            ? `${msg} Start the backend: cd backend && npm run dev`
            : msg
        );
        return;
      }
      setPhoneStep(2);
      setOtp(['', '', '', '', '', '']);
      setInfo('OTP request submitted. Please check your SMS messages.');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setError('');
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pasted)) return;
    const next = pasted.split('').concat(Array(6 - pasted.length).fill(''));
    setOtp(next);
    const last = Math.min(pasted.length - 1, 5);
    otpInputRefs.current[last]?.focus();
  };

  const handlePhoneVerify = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const p = normalizePhone10(phone);
    const otpStr = otp.join('');
    if (!/^\d{10}$/.test(p)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (otpStr.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    try {
      const verifyResult = await verifyOtp(p, otpStr);
      if (!verifyResult.success || verifyResult.data?.verified !== true) {
        setError(verifyResult.message || verifyResult.data?.message || 'Invalid OTP.');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
        return;
      }
      const loginResult = await loginWithPhone(p);
      if (loginResult.success) {
        navigate('/admin', { replace: true });
        return;
      }
      setError(loginResult.message || 'Admin login failed.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneBack = () => {
    setPhoneStep(1);
    setOtp(['', '', '', '', '', '']);
    setError('');
    setInfo('');
  };

  const rightTitle =
    mode === 'password'
      ? 'Admin access starts here'
      : phoneStep === 1
        ? 'Sign in with your mobile number'
        : 'Verify OTP';

  const rightSubtitle =
    mode === 'password'
      ? 'Use your admin username and password'
      : phoneStep === 1
        ? 'We will send a one-time code to your registered number'
        : `Enter the 6-digit code sent to ****${normalizePhone10(phone).slice(-4)}`;

  return (
    <SplitLoginLayout
      badgeLabel="Admin Login"
      headline="Manage your platform. Guide students and teams with clarity."
      steps={leftSteps}
      rightTitle={rightTitle}
      rightSubtitle={rightSubtitle}
      footer={
        <>
          {import.meta.env.DEV && mode === 'password' ? (
            <div className="space-y-1 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
              <p>
                Dev: <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">admin</kbd> /{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">admin123</kbd>
              </p>
              <p>API: {getAdminApiBaseUrl()}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center">© 2026 GuideXpert</p>
          )}
        </>
      }
    >
      <div className="flex rounded-lg border border-gray-200 p-1 mb-6 bg-gray-50">
        <button
          type="button"
          onClick={() => switchMode('password')}
          className={`flex-1 h-10 rounded-md text-sm font-semibold transition-colors ${
            mode === 'password' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => switchMode('phone')}
          className={`flex-1 h-10 rounded-md text-sm font-semibold transition-colors ${
            mode === 'phone' ? 'bg-white text-[#003366] shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Phone OTP
        </button>
      </div>

      {info ? <LoginAlert variant="success" message={info} /> : null}
      <LoginAlert message={error} />
      {loginHint ? <p className="text-xs text-gray-500 mb-4">{loginHint}</p> : null}

      {mode === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-900 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="Username"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-primary-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Password"
                disabled={loading}
                className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-primary-blue-500 focus:border-primary-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <LoginPrimaryButton loading={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </LoginPrimaryButton>
        </form>
      ) : phoneStep === 1 ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <LoginPhoneField
            id="admin-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            disabled={loading}
          />
          <LoginPrimaryButton loading={loading}>{loading ? 'Sending…' : 'Get OTP'}</LoginPrimaryButton>
        </form>
      ) : (
        <form onSubmit={handlePhoneVerify} className="space-y-6">
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
                disabled={loading}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-semibold tabular-nums rounded-xl border-2 border-gray-200 bg-gray-50/50 text-gray-900 outline-none focus:border-primary-navy focus:ring-2 focus:ring-primary-navy/20 focus:bg-white"
                aria-label={`Digit ${index + 1} of 6`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handlePhoneBack}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-lg border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60"
            >
              Back
            </button>
            <LoginPrimaryButton loading={loading} className="flex-[1.5] sm:uppercase">
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </LoginPrimaryButton>
          </div>
          <p className="text-center text-sm text-gray-500">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-60"
              style={{ color: NAVY_BTN }}
            >
              Resend OTP
            </button>
          </p>
        </form>
      )}
    </SplitLoginLayout>
  );
}
