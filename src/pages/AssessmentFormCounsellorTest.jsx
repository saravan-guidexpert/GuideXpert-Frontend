import { useState, useRef, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { parseUtmFromUrl } from '../utils/utm';
import {
  sendOtp,
  verifyOtp,
  setAssessmentUtm,
  getAssessmentUtm,
  submitCareerDnaAssessment,
  submitCourseFitAssessment,
} from '../utils/api';
import { ASSESSMENT_SECTIONS_CAREER_DNA } from '../data/assessmentQuestionsCareerDna';
import { ASSESSMENT_SECTIONS_COURSE_FIT } from '../data/assessmentQuestionsCourseFit';
import SuccessPopup from '../components/UI/SuccessPopup';
import { RocketIcon, LightbulbIcon } from '../components/AssessmentIcons';
import './AssessmentFormCounsellorTest.css';

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

function getInitialAnswers(sections) {
  const initial = {};
  sections.forEach((section) => {
    section.questions.forEach((q) => {
      initial[q.id] = '';
    });
  });
  return initial;
}

const CONFIG = {
  'career-dna': {
    title: 'Psychometric Test',
    subtitle: 'Discover what your dream course might be',
    sections: ASSESSMENT_SECTIONS_CAREER_DNA,
    submitFn: submitCareerDnaAssessment,
  },
  'course-fit': {
    title: 'Course Fit Test',
    subtitle: 'Find out which stream feels made for you',
    sections: ASSESSMENT_SECTIONS_COURSE_FIT,
    submitFn: submitCourseFitAssessment,
  },
};

export default function AssessmentFormCounsellorTest({ type = 'career-dna' }) {
  const config = CONFIG[type] || CONFIG['career-dna'];
  const sections = config.sections;

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [classVal, setClassVal] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState({ name: '', mobileNumber: '' });
  const [submitError, setSubmitError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [answers, setAnswers] = useState(() => getInitialAnswers(sections));
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  const otpInputRefs = useRef([]);

  // Capture UTM from URL on mount (for counsellor attribution)
  useEffect(() => {
    const utm = parseUtmFromUrl();
    if (Object.keys(utm).length > 0) setAssessmentUtm(utm);
  }, []);

  const flatQuestions = useMemo(
    () =>
      sections.flatMap((s, sectionIndex) =>
        s.questions.map((q) => ({ ...q, sectionTitle: s.title, sectionSetIndex: sectionIndex + 1 }))
      ),
    [sections]
  );

  const questionTextMap = useMemo(() => {
    const map = {};
    sections.forEach((s) => {
      s.questions.forEach((q) => {
        map[q.id] = q.text;
      });
    });
    return map;
  }, [sections]);

  const normalizedPhone = useMemo(() => {
    const digits = (mobileNumber || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  }, [mobileNumber]);

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
    try {
      const result = await sendOtp(name.trim(), normalizedPhone, config.title);
      if (result.success) {
        setSuccessMessage('OTP sent successfully to your mobile number');
        setStep(2);
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
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
    try {
      const result = await verifyOtp(normalizedPhone, otpString);
      if (result.success && result.data?.verified === true) {
        setSuccessMessage('OTP verified! Proceeding to assessment.');
        setQuestionIndex(0);
        setStep(3);
      } else {
        setOtpError(result.message || 'Invalid or expired OTP. Please try again.');
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
    try {
      const result = await sendOtp(name.trim(), normalizedPhone, config.title);
      if (result.success) {
        setSuccessMessage('OTP resent successfully');
        otpInputRefs.current[0]?.focus();
      } else {
        setSubmitError(result.message || 'Failed to resend OTP. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToOtp = () => {
    setStep(2);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setSubmitError('');
    setSuccessMessage('');
  };

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleAssessmentFormKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const target = e.target;
    const activeEl = document.activeElement;
    const isSubmitButton =
      (activeEl && activeEl.getAttribute?.('type') === 'submit') ||
      (target && (target.getAttribute?.('type') === 'submit' || target.type === 'submit'));
    if (isSubmitButton) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmitAssessment = async (e) => {
    e.preventDefault();
    if (questionIndex !== flatQuestions.length - 1) return;
    setSubmitError('');
    setSubmitting(true);
    const utm = getAssessmentUtm();
    const extra = {};
    if (email && String(email).trim()) extra.email = String(email).trim();
    if (school && String(school).trim()) extra.school = String(school).trim();
    if (classVal && String(classVal).trim()) extra.class = String(classVal).trim();
    try {
      const result = await config.submitFn(name.trim(), normalizedPhone, answers, utm, extra);
      const payload = result.data?.data ?? result.data;
      if (result.success && payload) {
        setSubmittedResult({
          score: payload.score ?? 0,
          maxScore: payload.maxScore ?? 10,
          questionResults: payload.questionResults ?? [],
        });
        setShowSuccessPopup(true);
      } else {
        setSubmitError(
          result.status === 404
            ? 'Assessment service is temporarily unavailable. Please try again later.'
            : (result.message || 'Failed to submit assessment. Please try again.')
        );
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWriteAgain = () => {
    setStep(1);
    setSubmittedResult(null);
    setAnswers(getInitialAnswers(sections));
    setQuestionIndex(0);
    setShowSuccessPopup(false);
    setSubmitError('');
    setOtpError('');
    setSuccessMessage('');
    setName('');
    setMobileNumber('');
    setEmail('');
    setSchool('');
    setClassVal('');
    setOtp(['', '', '', '', '', '']);
    setErrors({ name: '', mobileNumber: '' });
  };

  const currentQuestion = flatQuestions[questionIndex];
  const topBarRightLabel = step === 3 && !submittedResult && currentQuestion
    ? `Set ${currentQuestion.sectionSetIndex}`
    : config.title;

  return (
    <div className="assessment-page-wrap">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page-level top bar: Back (left), context label (right) */}
        <div className="nb-topbar">
          <div>
            {step === 1 && (
              <Link
                to="/become-counsellor"
                className="nb-btn-back"
                aria-label="Back to home"
              >
                <span aria-hidden>←</span> Back
              </Link>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setOtpError(''); setSuccessMessage(''); setSubmitError(''); }}
                className="nb-btn-back"
                aria-label="Back to your details"
              >
                <span aria-hidden>←</span> Back
              </button>
            )}
            {step === 3 && !submittedResult && (
              <button
                type="button"
                onClick={() => (questionIndex > 0 ? setQuestionIndex((i) => i - 1) : handleBackToOtp())}
                disabled={submitting}
                className="nb-btn-back"
                aria-label={questionIndex > 0 ? 'Previous question' : 'Back to verification'}
              >
                <span aria-hidden>←</span> Back
              </button>
            )}
            {step === 3 && submittedResult && (
              <span className="nb-topbar-label">{config.title}</span>
            )}
          </div>
          <span className="nb-topbar-label">{topBarRightLabel}</span>
        </div>

        <div className="nb-header">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="nb-header-title">GuideXpert</h1>
            <span className="nb-icon-wrap nb-icon-wrap--sm" aria-hidden="true">
              <RocketIcon size={18} />
            </span>
          </div>
          <p className="nb-header-subtitle">{config.title}</p>
          <p className="nb-header-desc">{config.subtitle}</p>
        </div>

        <div className="nb-step-progress-wrap">
          <div className="nb-step-progress-labels">
            <span>Step {step} of 3</span>
            <span>
              {step === 1 && 'Your details'}
              {step === 2 && 'OTP Verification'}
              {step === 3 && 'Questions'}
            </span>
          </div>
          <div className="nb-step-progress-track">
            <div
              className="nb-step-progress-fill"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="nb-card">
          {step === 1 && (
            <div className="nb-card-inner">
              <div className="nb-card-main">
                <h2 className="nb-form-title">Enter your details</h2>
                <p className="nb-form-desc">We will send an OTP to your mobile number before the assessment.</p>
                {successMessage && (
                  <div className="nb-alert-success">{successMessage}</div>
                )}
                {submitError && (
                  <div className="nb-alert-error">{submitError}</div>
                )}
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="nb-input-wrap">
                    <label htmlFor="assessment-name" className="nb-input-label">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="assessment-name"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="Full Name"
                      className={`nb-input ${errors.name ? 'error' : ''}`}
                      disabled={loading}
                      autoComplete="name"
                    />
                    {errors.name && <p className="nb-input-error">{errors.name}</p>}
                  </div>
                  <div className="nb-input-wrap">
                    <label htmlFor="assessment-mobile" className="nb-input-label">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="assessment-mobile"
                      value={mobileNumber}
                      onChange={handleMobileChange}
                      placeholder="10-digit mobile number"
                      className={`nb-input ${errors.mobileNumber ? 'error' : ''}`}
                      disabled={loading}
                      autoComplete="tel"
                      inputMode="numeric"
                      maxLength={10}
                    />
                    {errors.mobileNumber && <p className="nb-input-error">{errors.mobileNumber}</p>}
                  </div>
                  <div className="nb-input-wrap">
                    <label htmlFor="assessment-email" className="nb-input-label">Email <span className="text-gray-500">(optional)</span></label>
                    <input
                      type="email"
                      id="assessment-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="nb-input"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  <div className="nb-input-wrap">
                    <label htmlFor="assessment-school" className="nb-input-label">School <span className="text-gray-500">(optional)</span></label>
                    <input
                      type="text"
                      id="assessment-school"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="School name"
                      className="nb-input"
                      disabled={loading}
                    />
                  </div>
                  <div className="nb-input-wrap">
                    <label htmlFor="assessment-class" className="nb-input-label">Class <span className="text-gray-500">(optional)</span></label>
                    <input
                      type="text"
                      id="assessment-class"
                      value={classVal}
                      onChange={(e) => setClassVal(e.target.value)}
                      placeholder="e.g. 10th, 12th"
                      className="nb-input"
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="nb-btn-primary nb-btn-primary-full"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              </div>
              <aside className="nb-card-side" aria-label="What happens next">
                <h3 className="nb-side-title">What happens next</h3>
                <p className="nb-side-desc">We&apos;ll send an OTP to your mobile number so we can verify it&apos;s you.</p>
                <ol className="nb-side-steps">
                  <li><span className="nb-side-step-num">1</span> Your details</li>
                  <li><span className="nb-side-step-num">2</span> Verify OTP</li>
                  <li><span className="nb-side-step-num">3</span> Questions</li>
                </ol>
              </aside>
            </div>
          )}

          {step === 2 && (
            <div className="nb-card-inner">
              <div className="nb-card-main">
                <h2 className="nb-form-title">Verify your number</h2>
                <p className="nb-form-desc">Enter the 6-digit OTP sent to ****{mobileNumber.slice(-4)}</p>
                {successMessage && (
                  <div className="nb-alert-success">{successMessage}</div>
                )}
                {submitError && (
                  <div className="nb-alert-error">{submitError}</div>
                )}
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="nb-otp-wrap">
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
                        className="nb-otp-input"
                        aria-label={`OTP digit ${index + 1}`}
                        disabled={verifying}
                      />
                    ))}
                  </div>
                  {otpError && <p className="nb-input-error text-center">{otpError}</p>}
                  <div className="nb-btn-row">
                    <button
                      type="button"
                      onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setOtpError(''); setSuccessMessage(''); setSubmitError(''); }}
                      disabled={verifying || loading}
                      className="nb-btn-back"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={verifying || loading}
                      className="nb-btn-primary"
                    >
                      {verifying ? 'Verifying...' : 'Verify & Continue'}
                    </button>
                  </div>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading || verifying}
                      className="nb-link"
                    >
                      {loading ? 'Resending...' : "Didn't receive OTP? Resend"}
                    </button>
                  </div>
                </form>
              </div>
              <aside className="nb-card-side" aria-label="Tip">
                <h3 className="nb-side-title">Enter the code we sent</h3>
                <p className="nb-side-desc">Check your messages for a 6-digit code. If you don&apos;t see it, use &quot;Resend&quot; below.</p>
              </aside>
            </div>
          )}

          {step === 3 && !submittedResult && flatQuestions.length > 0 && (
            <div className="nb-card-inner nb-card-inner--wide">
              {submitError && (
                <div className="nb-alert-error">{submitError}</div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); }} onKeyDown={handleAssessmentFormKeyDown} className="space-y-0">
                <div className="nb-question-card">
                  {(() => {
                    const q = flatQuestions[questionIndex];
                    if (!q) return null;
                    return (
                      <div key={q.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="nb-icon-wrap nb-icon-wrap--md" aria-hidden="true">
                            <LightbulbIcon size={20} />
                          </span>
                          <p className="nb-question-count">Question {questionIndex + 1} of {flatQuestions.length}</p>
                        </div>
                        <div className="nb-question-progress-wrap">
                          <div
                            className="nb-question-progress-fill"
                            style={{ width: `${((questionIndex + 1) / flatQuestions.length) * 100}%` }}
                            role="progressbar"
                            aria-valuenow={questionIndex + 1}
                            aria-valuemin={1}
                            aria-valuemax={flatQuestions.length}
                            aria-label={`Question ${questionIndex + 1} of ${flatQuestions.length}`}
                          />
                        </div>
                        <h3 className="nb-section-title">{q.sectionTitle}</h3>
                        <p className="nb-question-text">{q.text}</p>
                        {q.type === 'mcq' && (
                          <div className="nb-options">
                            {q.options.map((opt, idx) => {
                              const letter = String.fromCharCode(65 + idx);
                              const isSelected = (answers[q.id] || '') === opt;
                              return (
                                <label
                                  key={opt}
                                  className={`nb-option ${isSelected ? 'nb-option-selected' : ''}`}
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    value={opt}
                                    checked={isSelected}
                                    onChange={() => setAnswer(q.id, opt)}
                                    className="sr-only"
                                    aria-label={`Option ${letter}: ${opt}`}
                                  />
                                  <span className="nb-option-letter">{letter}</span>
                                  <span className="nb-option-label">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="nb-question-footer">
                    <button
                      type="button"
                      onClick={() => (questionIndex > 0 ? setQuestionIndex((i) => i - 1) : handleBackToOtp())}
                      disabled={submitting}
                      className="nb-btn-back"
                      aria-label={questionIndex > 0 ? 'Previous question' : 'Back to verification'}
                    >
                      Back
                    </button>
                    {questionIndex < flatQuestions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setQuestionIndex((i) => i + 1)}
                        className="nb-btn-primary"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting}
                        className="nb-btn-primary"
                        onClick={(e) => handleSubmitAssessment(e)}
                      >
                        {submitting ? 'Submitting...' : 'Submit Assessment'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}

          {step === 3 && submittedResult && (
            <div className="nb-card-inner nb-card-inner--wide">
            <div className="nb-result-card">
              <div className="p-6 sm:p-8">
                <div className="text-center">
                  <div className="nb-result-icon-wrap">
                    <RocketIcon size={28} aria-hidden="true" />
                  </div>
                  <h2 className="nb-result-title">Assessment submitted successfully</h2>
                  <p className="nb-result-score-label">Your score</p>
                  <p className="nb-result-score">
                    {submittedResult.score} / {submittedResult.maxScore}
                  </p>
                  <p className="mt-4 text-sm text-gray-600">Thank you for completing the {config.title}.</p>
                </div>
                {submittedResult.questionResults && submittedResult.questionResults.length > 0 && (
                  <div className="nb-result-divider">
                    <h3 className="nb-result-detail-title">Detailed report</h3>
                    <ul className="mt-4 space-y-3">
                      {submittedResult.questionResults.filter((r) => !r.correct).map((r) => (
                        <li key={r.questionId} className="nb-result-detail-item">
                          <p className="text-sm font-medium text-gray-900">{questionTextMap[r.questionId] ?? r.questionId}</p>
                          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-gray-500">Your answer</p>
                          <p className="mt-0.5 text-sm text-[#991b1b]">{r.userAnswer || '—'}</p>
                          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-gray-500">Suggested</p>
                          <p className="mt-0.5 text-sm text-[#15803d]">{r.correctAnswer}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="nb-result-take-again">
                  <button
                    type="button"
                    onClick={handleWriteAgain}
                    className="nb-btn-back"
                  >
                    Take again
                  </button>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        variant="assessmentNeo"
        score={submittedResult?.score ?? 0}
        maxScore={submittedResult?.maxScore ?? 10}
        message="Thank you for completing the Psychometric Test."
      />
    </div>
  );
}
