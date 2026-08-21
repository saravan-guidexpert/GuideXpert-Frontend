import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWebinarAuth } from '../../contexts/WebinarAuthContext';
import { useWebinar } from './context/WebinarContext';
import { getUnlockProgress } from './utils/unlockLogic';
import {
  formatCertificateDate,
  downloadCertificatePng,
  downloadCertificatePdf,
  getCertificatePngDataUrl,
} from './utils/certificateWebinar';
import {
  getOrCreateCertificateForUser,
  createCertificateRecord,
  migrateCertificateToShortId,
  recordCertificateDownload,
  checkActivationEligibility,
  submitTrainingFeedback,
} from '../../utils/api';
import {
  openCommunityRedirectPlaceholder,
  navigatePlaceholderToCommunity,
  closeCommunityRedirectPlaceholder,
} from '../../utils/whatsappCommunityInvite';
import { FiDownload, FiAward, FiExternalLink, FiCheckCircle, FiUser, FiCalendar, FiHash } from 'react-icons/fi';

const EDUCATION_OPTIONS = [
  'Diploma',
  "Bachelor's degree",
  "Master's degree",
  'PhD / Doctorate',
  'Other',
];

const OCCUPATION_OPTIONS = [
  'Teachers',
  'Working professionals',
  'Graduation completed',
  'Housewives (graduated)',
  'Others',
];

const inputBase =
  'w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#003366]/25 focus:border-[#003366] outline-none transition text-gray-900 placeholder:text-gray-400 bg-white';
const inputError = 'border-amber-500 bg-amber-50/40';

function isLegacyCertificateId(id) {
  return !id || typeof id !== 'string' || !String(id).trim().toUpperCase().startsWith('GX');
}

function generateShortCertificateId() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return 'GX' + hex;
}

function validateName(value) {
  const t = typeof value === 'string' ? value.trim() : '';
  if (!t) return 'Required';
  if (t.length < 2) return 'At least 2 characters';
  if (t.length > 100) return 'Maximum 100 characters';
  return '';
}
function validateMobile(value) {
  const d = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!d) return 'Required';
  if (d.length !== 10) return 'Enter 10 digits';
  return '';
}
function validateEmail(value) {
  const t = typeof value === 'string' ? value.trim() : '';
  if (!t) return 'Required';
  if (!/^\S+@\S+\.\S+$/.test(t)) return 'Enter a valid email';
  return '';
}
function validateAddress(value) {
  const t = typeof value === 'string' ? value.trim() : '';
  if (!t) return 'Required';
  if (t.length < 10) return 'At least 10 characters';
  if (t.length > 500) return 'Maximum 500 characters';
  return '';
}
function validateOccupation(value) {
  const t = typeof value === 'string' ? value.trim() : '';
  if (!t) return 'Select an option';
  if (!OCCUPATION_OPTIONS.includes(t)) return 'Select an option';
  return '';
}
function validateDob(value) {
  if (!value) return 'Required';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Enter a valid date';
  const now = new Date();
  if (d > now) return 'Must be in the past';
  const ageYears = (now - d) / (365.25 * 24 * 60 * 60 * 1000);
  if (ageYears < 18) return 'Minimum age 18 years';
  if (ageYears > 80) return 'Enter a valid date';
  return '';
}
function validateGender(value) {
  if (value !== 'Male' && value !== 'Female') return 'Select an option';
  return '';
}
function validateEducation(value) {
  const t = typeof value === 'string' ? value.trim() : '';
  if (!t) return 'Required';
  if (t.length > 200) return 'Maximum 200 characters';
  return '';
}
function validateYearsOfExperience(value) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined) return 'Required';
  if (Number.isNaN(n)) return 'Enter a number';
  if (n < 0) return '0 or more';
  if (n > 50) return '50 or less';
  if (n !== Math.floor(n)) return 'Whole number only';
  return '';
}

export default function CertificatesPage() {
  const { user: authUser, token: webinarToken } = useWebinarAuth();
  const { completedSessions } = useWebinar();
  const displayName = authUser?.name || 'Trainee';
  const dateStr = formatCertificateDate();
  const { completed: completedModules, total: totalModules } = getUnlockProgress(completedSessions);
  const courseCompleted = totalModules > 0 && completedModules >= totalModules && completedSessions.includes('a5');

  const [downloading, setDownloading] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewCertificateId, setPreviewCertificateId] = useState(null);
  const [userCertificateId, setUserCertificateId] = useState(null);
  const [actionError, setActionError] = useState('');

  const [activationChecking, setActivationChecking] = useState(false);
  const [activationEligible, setActivationEligible] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');

  const [name, setName] = useState(displayName);
  const [mobileNumber, setMobileNumber] = useState(String(authUser?.phone || '').replace(/\D/g, '').slice(-10));
  const [whatsappNumber, setWhatsappNumber] = useState(String(authUser?.phone || '').replace(/\D/g, '').slice(-10));
  const [email, setEmail] = useState(authUser?.email || '');
  const [addressOfCommunication, setAddressOfCommunication] = useState('');
  const [occupation, setOccupation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [educationQualification, setEducationQualification] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [anythingToConvey, setAnythingToConvey] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  const certCookieName = authUser?.phone
    ? `gx_cert_id_${String(authUser.phone).replace(/\D/g, '').slice(-10)}`
    : null;

  const getCertCookie = (nameKey) => {
    if (!nameKey) return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + nameKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  };
  const setCertCookie = (nameKey, value) => {
    if (!nameKey) return;
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${nameKey}=${encodeURIComponent(value)};max-age=${maxAge};path=/;SameSite=Lax`;
  };
  const clearCertCookie = (nameKey) => {
    if (!nameKey) return;
    document.cookie = `${nameKey}=; Max-Age=0; path=/`;
  };

  const verifyActivationEligibility = async () => {
    const phone = String(authUser?.phone || '').replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) {
      setActivationEligible(false);
      setActivationError('Unable to verify activation form status for this account.');
      return false;
    }
    setActivationChecking(true);
    setActivationError('');
    try {
      const result = await checkActivationEligibility(phone);
      const payload = result.data?.data ?? result.data;
      const eligible = Boolean(result.success && (result.eligible || payload?.exists));
      setActivationEligible(eligible);
      if (!eligible) {
        setActivationError(result.message || 'Submit activation form to unlock certificate download.');
      }
      return eligible;
    } catch (e) {
      setActivationEligible(false);
      setActivationError(e?.message || 'Could not verify activation status. Please retry.');
      return false;
    } finally {
      setActivationChecking(false);
    }
  };

  useEffect(() => {
    if (!courseCompleted) return;
    verifyActivationEligibility();
  }, [authUser?.phone, courseCompleted]);

  useEffect(() => {
    if (!courseCompleted) return;
    let cancelled = false;
    (async () => {
      try {
        if (certCookieName) {
          const stored = getCertCookie(certCookieName);
          if (stored) {
            let idToUse = stored;
            if (isLegacyCertificateId(stored) && authUser?.phone) {
              try {
                const migrateRes = await migrateCertificateToShortId(authUser.phone);
                const migPayload = migrateRes.data?.data ?? migrateRes.data;
                if (migrateRes?.success && migPayload?.certificateId) {
                  idToUse = migPayload.certificateId;
                  setCertCookie(certCookieName, idToUse);
                }
              } catch (_) {}
            }
            try {
              const result = await createCertificateRecord({ certificateId: idToUse, fullName: displayName, dateIssued: dateStr });
              if (result?.success && !cancelled) {
                setUserCertificateId(idToUse);
                return;
              }
            } catch (_) {}
            clearCertCookie(certCookieName);
          }
        }
        if (authUser?.phone) {
          const result = await getOrCreateCertificateForUser({
            fullName: displayName,
            dateIssued: dateStr,
            mobileNumber: authUser.phone,
          });
          if (cancelled) return;
          const payload = result.data?.data ?? result.data;
          if (result.success && payload?.certificateId) {
            let idToUse = payload.certificateId;
            if (isLegacyCertificateId(idToUse)) {
              try {
                const migrateRes = await migrateCertificateToShortId(authUser.phone);
                const migPayload = migrateRes.data?.data ?? migrateRes.data;
                if (migrateRes?.success && migPayload?.certificateId) idToUse = migPayload.certificateId;
              } catch (_) {}
            }
            setCertCookie(certCookieName, idToUse);
            setUserCertificateId(idToUse);
            return;
          }
        }
        const certificateId = generateShortCertificateId();
        const createResult = await createCertificateRecord({ certificateId, fullName: displayName, dateIssued: dateStr });
        if (createResult?.success && !cancelled) {
          setCertCookie(certCookieName, certificateId);
          setUserCertificateId(certificateId);
        }
      } catch (e) {
        if (!cancelled) console.warn('Certificate setup failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [authUser?.phone, displayName, dateStr, certCookieName, courseCompleted]);

  useEffect(() => {
    if (!courseCompleted) return;
    if (!userCertificateId || !displayName) return;
    let cancelled = false;
    setPreviewLoading(true);
    getCertificatePngDataUrl(displayName, dateStr, userCertificateId)
      .then((dataUrl) => {
        if (!cancelled) {
          setPreviewImageUrl(dataUrl);
          setPreviewCertificateId(userCertificateId);
        }
      })
      .catch((e) => {
        if (!cancelled) setActionError(e?.message || 'Could not load certificate preview.');
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => { cancelled = true; };
  }, [userCertificateId, displayName, dateStr, courseCompleted]);

  const runValidation = () => {
    const next = {
      name: validateName(name),
      mobileNumber: validateMobile(mobileNumber),
      whatsappNumber: validateMobile(whatsappNumber),
      email: validateEmail(email),
      addressOfCommunication: validateAddress(addressOfCommunication),
      occupation: validateOccupation(occupation),
      dateOfBirth: validateDob(dateOfBirth),
      gender: validateGender(gender),
      educationQualification: validateEducation(educationQualification),
      yearsOfExperience: validateYearsOfExperience(yearsOfExperience),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleActivationSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setActivationSuccess('');
    if (!runValidation()) {
      setSubmitError('Complete all required fields to submit.');
      return;
    }
    setSubmittingForm(true);
    try {
      const payload = {
        name: name.trim(),
        mobileNumber: mobileNumber.replace(/\D/g, ''),
        whatsappNumber: whatsappNumber.replace(/\D/g, ''),
        email: email.trim().toLowerCase(),
        addressOfCommunication: addressOfCommunication.trim(),
        occupation: occupation.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender,
        educationQualification: educationQualification.trim(),
        yearsOfExperience: Math.min(50, Math.max(0, Math.floor(Number(yearsOfExperience)))),
        anythingToConvey: anythingToConvey.trim().slice(0, 1000) || undefined,
      };
      const result = await submitTrainingFeedback(payload);
      if (!result.success) {
        setSubmitError(result.message || 'Unable to submit at the moment. Please try again.');
        return;
      }
      setActivationSuccess('Activation form submitted successfully. Verifying status...');
      await verifyActivationEligibility();
    } catch {
      setSubmitError('Connection issue. Please check your network and try again.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handlePreviewDownloadPng = async () => {
    if (!courseCompleted || !previewCertificateId || !activationEligible) return;
    const placeholder = openCommunityRedirectPlaceholder();
    setDownloading('png');
    try {
      await downloadCertificatePng(displayName, dateStr, previewCertificateId);
      if (webinarToken) recordCertificateDownload(webinarToken).catch(() => {});
      navigatePlaceholderToCommunity(placeholder);
    } catch (e) {
      closeCommunityRedirectPlaceholder(placeholder);
      setActionError(e?.message || 'Unable to download certificate PNG. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handlePreviewDownloadPdf = async () => {
    if (!courseCompleted || !previewCertificateId || !activationEligible) return;
    const placeholder = openCommunityRedirectPlaceholder();
    setDownloading('pdf');
    try {
      await downloadCertificatePdf(displayName, dateStr, previewCertificateId);
      if (webinarToken) recordCertificateDownload(webinarToken).catch(() => {});
      navigatePlaceholderToCommunity(placeholder);
    } catch (e) {
      closeCommunityRedirectPlaceholder(placeholder);
      setActionError(e?.message || 'Unable to download certificate PDF. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  if (!courseCompleted) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8 sm:p-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Certificates</h1>
          <p className="mt-3 text-sm text-gray-600">
            Complete all videos and assessments to unlock this section.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Progress: {completedModules}/{totalModules} modules completed
          </p>
          <Link
            to="/webinar"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-navy/90 transition-colors"
          >
            Continue training
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary-navy/10 flex items-center justify-center text-primary-navy shrink-0">
          <FiAward className="w-5 h-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Certificates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Activation + certificate download</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-5 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Certified Counsellor Activation Form</h2>
            <p className="text-sm text-gray-500 mt-1">Complete this once to unlock certificate downloads.</p>
          </div>

          <div className="p-5 space-y-4">
            {activationEligible ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Activation completed. Your certificate downloads are now enabled.
              </div>
            ) : (
              <form onSubmit={handleActivationSubmit} className="space-y-4">
                {submitError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>}
                {activationError && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">{activationError}</div>}
                {activationSuccess && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{activationSuccess}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Name *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputBase} ${errors.name ? inputError : 'border-gray-300'}`} placeholder="Full name" />
                    {errors.name && <p className="mt-1 text-xs text-amber-700">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Occupation *</label>
                    <select value={occupation} onChange={(e) => setOccupation(e.target.value)} className={`${inputBase} ${errors.occupation ? inputError : 'border-gray-300'}`}>
                      <option value="">Select</option>
                      {OCCUPATION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {errors.occupation && <p className="mt-1 text-xs text-amber-700">{errors.occupation}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Mobile number *</label>
                    <input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} className={`${inputBase} ${errors.mobileNumber ? inputError : 'border-gray-300'}`} placeholder="10 digits" />
                    {errors.mobileNumber && <p className="mt-1 text-xs text-amber-700">{errors.mobileNumber}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">WhatsApp number *</label>
                    <input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} className={`${inputBase} ${errors.whatsappNumber ? inputError : 'border-gray-300'}`} placeholder="10 digits" />
                    {errors.whatsappNumber && <p className="mt-1 text-xs text-amber-700">{errors.whatsappNumber}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Email *</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputBase} ${errors.email ? inputError : 'border-gray-300'}`} placeholder="you@example.com" />
                  {errors.email && <p className="mt-1 text-xs text-amber-700">{errors.email}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Address of communication *</label>
                  <textarea value={addressOfCommunication} onChange={(e) => setAddressOfCommunication(e.target.value)} rows={3} className={`${inputBase} resize-none ${errors.addressOfCommunication ? inputError : 'border-gray-300'}`} placeholder="Full address" />
                  {errors.addressOfCommunication && <p className="mt-1 text-xs text-amber-700">{errors.addressOfCommunication}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Date of birth *</label>
                    <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={`${inputBase} ${errors.dateOfBirth ? inputError : 'border-gray-300'}`} />
                    {errors.dateOfBirth && <p className="mt-1 text-xs text-amber-700">{errors.dateOfBirth}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Gender *</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${inputBase} ${errors.gender ? inputError : 'border-gray-300'}`}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {errors.gender && <p className="mt-1 text-xs text-amber-700">{errors.gender}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Education qualification *</label>
                    <select value={educationQualification} onChange={(e) => setEducationQualification(e.target.value)} className={`${inputBase} ${errors.educationQualification ? inputError : 'border-gray-300'}`}>
                      <option value="">Select</option>
                      {EDUCATION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    {errors.educationQualification && <p className="mt-1 text-xs text-amber-700">{errors.educationQualification}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Years of experience *</label>
                    <input type="number" min={0} max={50} value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} className={`${inputBase} ${errors.yearsOfExperience ? inputError : 'border-gray-300'}`} placeholder="0" />
                    {errors.yearsOfExperience && <p className="mt-1 text-xs text-amber-700">{errors.yearsOfExperience}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Anything to convey</label>
                  <textarea value={anythingToConvey} onChange={(e) => setAnythingToConvey(e.target.value.slice(0, 1000))} rows={3} className={`${inputBase} resize-none border-gray-300`} placeholder="Optional" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="submit" disabled={submittingForm} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary-navy text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary-navy/90 disabled:opacity-60">
                    {submittingForm ? 'Submitting...' : 'Submit Activation Form'}
                  </button>
                  <button type="button" onClick={verifyActivationEligibility} disabled={activationChecking} className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                    {activationChecking ? 'Checking...' : 'Recheck Activation Status'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="xl:col-span-7 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-green-50 border-b border-green-100">
            <FiCheckCircle className="w-4 h-4 text-green-600 shrink-0" aria-hidden />
            <span className="text-sm font-semibold text-green-800">Certificate Preview</span>
            <span className="ml-auto text-xs text-green-600 font-medium">GuideXpert · {dateStr}</span>
          </div>

          <div className="bg-gray-50 px-4 sm:px-6 py-6 flex justify-center">
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt={`Certificate for ${displayName}`}
                className="w-full max-w-4xl rounded-xl shadow-lg border border-gray-200 object-contain"
              />
            ) : (
              <div className="w-full max-w-4xl aspect-842/596 rounded-xl bg-gray-200 animate-pulse flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                <span className="text-sm text-gray-500 font-medium">{previewLoading ? 'Generating certificate...' : 'Preview unavailable'}</span>
              </div>
            )}
          </div>

          {previewImageUrl && (
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-t border-gray-100">
              <div className="flex items-center gap-3 px-4 sm:px-5 py-4">
                <span className="w-8 h-8 rounded-lg bg-primary-navy/8 flex items-center justify-center shrink-0">
                  <FiUser className="w-4 h-4 text-primary-navy" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Recipient</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{displayName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 sm:px-5 py-4">
                <span className="w-8 h-8 rounded-lg bg-primary-navy/8 flex items-center justify-center shrink-0">
                  <FiCalendar className="w-4 h-4 text-primary-navy" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date Issued</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{dateStr}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 sm:px-5 py-4">
                <span className="w-8 h-8 rounded-lg bg-primary-navy/8 flex items-center justify-center shrink-0">
                  <FiHash className="w-4 h-4 text-primary-navy" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Certificate ID</p>
                  <p className="text-sm font-mono text-gray-600 mt-0.5 truncate">{previewCertificateId}</p>
                </div>
              </div>
            </div>
          )}

          <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePreviewDownloadPng}
              disabled={!!downloading || !previewCertificateId || !activationEligible}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-navy text-white text-sm font-medium hover:bg-primary-navy/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              <FiDownload className="w-4 h-4" aria-hidden />
              {downloading === 'png' ? 'Preparing...' : 'Download PNG'}
            </button>
            <button
              type="button"
              onClick={handlePreviewDownloadPdf}
              disabled={!!downloading || !previewCertificateId || !activationEligible}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors"
            >
              <FiDownload className="w-4 h-4" aria-hidden />
              {downloading === 'pdf' ? 'Preparing...' : 'Download PDF'}
            </button>
            {previewCertificateId && activationEligible && (
              <Link
                to={`/certificate/${previewCertificateId}`}
                state={{ certificate: { certificateId: previewCertificateId, fullName: displayName, dateIssued: dateStr } }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors ml-auto"
              >
                <FiExternalLink className="w-4 h-4" aria-hidden />
                View full page
              </Link>
            )}
          </div>

          {actionError && (
            <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
              {actionError}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
