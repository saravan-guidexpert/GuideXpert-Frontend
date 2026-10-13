import { useState, useRef, useEffect } from 'react';
import { FaRocket } from 'react-icons/fa';
import { FiSend, FiPhone, FiDollarSign, FiAward, FiHome, FiUsers, FiArrowLeft, FiCalendar, FiCheck, FiX } from 'react-icons/fi';
import ShinyText from '../UI/ShinyText';
import SuccessPopup from '../UI/SuccessPopup';
import Loader from '../UI/Loader';
import { sendOtp, verifyOtp, getDemoSlots, submitApplication, saveStep1, saveStep2, saveStep3 } from '../../utils/api';
import {
  OTP_ENTRY_INSTRUCTION,
  OTP_REQUEST_FAILED_MESSAGE,
  OTP_REQUEST_SUBMITTED_MESSAGE,
} from '../../utils/otpUserMessages';
import { captureUtmFirstTouch, getStoredUtm } from '../../utils/utm';
import './ApplySection.css';

const WHATSAPP_NUMBER = '919009000914';
const WHATSAPP_MESSAGE = 'hi can you provide me the link';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const ApplySection = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    whatsappNumber: '',
    occupation: '',
    otp: ['', '', '', '', '', ''],
    demoPreference: '',
    timeSlot: '',
  });
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [bookedSlotInfo, setBookedSlotInfo] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [registeredSlotInfo, setRegisteredSlotInfo] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const otpInputRefs = useRef([]);
  const prevStepRef = useRef(currentStep);
  const osviCountdownIntervalRef = useRef(null);

  // DD-MM-YYYY for professional date display
  const formatDateDDMMYYYY = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const formatSlotDayHeading = (date) => {
    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${dayLabel} (${formatDateDDMMYYYY(date)})`;
  };

  // Time range for slot: "7:00 PM – 8:00 PM" (1hr window)
  const formatSlotTimeRange = (startDate) => {
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const start = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const end = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${start} – ${end}`;
  };

  const normalizeSlots = (rawSlots) => {
    if (!Array.isArray(rawSlots)) return [];
    return rawSlots.filter((slot) => slot && typeof slot === 'object' && slot.id != null);
  };

  /** Stable radio / form value when the same slot id appears on two calendar days (demo fallback). */
  const getSlotSelectionKey = (slot) =>
    slot && typeof slot.selectionId === 'string' && slot.selectionId ? slot.selectionId : slot?.id;

  const hasEnabledSlots = (list) => list.some((s) => s && s.enabled !== false);

  // Fetch demo slots from API on mount
  useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true);
    getDemoSlots()
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSlots(normalizeSlots(res.data?.slots));
          return;
        }
        setSlots([]);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Clear slot selection when entering step 3 (prevents stale/default selection)
  useEffect(() => {
    if (prevStepRef.current !== 3 && currentStep === 3) {
      setFormData((prev) => ({ ...prev, timeSlot: '' }));
    }
    prevStepRef.current = currentStep;
  }, [currentStep]);

  // localStorage functions
  const saveRegistrationToLocalStorage = (phone) => {
    try {
      const registrationData = {
        phone,
        isRegistered: true,
        registeredAt: Date.now()
      };
      localStorage.setItem('guidexpert_registration', JSON.stringify(registrationData));
    } catch (error) {
      console.error('[localStorage] Failed to save registration:', error);
    }
  };

  const getRegistrationFromLocalStorage = () => {
    try {
      const data = localStorage.getItem('guidexpert_registration');
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[localStorage] Failed to get registration:', error);
    }
    return null;
  };

  // First-touch UTM capture on registration page load
  useEffect(() => {
    captureUtmFirstTouch();
  }, []);

  useEffect(() => {
    return () => {
      if (osviCountdownIntervalRef.current != null) {
        clearInterval(osviCountdownIntervalRef.current);
        osviCountdownIntervalRef.current = null;
      }
    };
  }, []);

  // Restore "already registered" state from localStorage only (no initial API call)
  useEffect(() => {
    const localData = getRegistrationFromLocalStorage();
    if (localData && localData.phone && localData.isRegistered) {
      setIsRegistered(true);
      setRegisteredPhone(localData.phone);
      setCurrentStep(1);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear errors when user makes changes
    if (error) setError('');
    if (otpError) setOtpError('');
  };

  // Add checked class to radio options for better styling
  useEffect(() => {
    const radioOptions = document.querySelectorAll('.apply-radio-option');
    radioOptions.forEach((option) => {
      const radio = option.querySelector('input[type="radio"]');
      if (radio?.checked) {
        option.classList.add('apply-radio-checked');
      } else {
        option.classList.remove('apply-radio-checked');
      }
    });
  }, [formData.timeSlot]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...formData.otp];
    newOtp[index] = value.slice(-1); // Only take last character
    setFormData({ ...formData, otp: newOtp });
    setOtpError('');

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;
    
    const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setFormData({ ...formData, otp: newOtp });
    
    // Focus last filled input or first empty
    const lastIndex = Math.min(pastedData.length - 1, 5);
    otpInputRefs.current[lastIndex]?.focus();
  };

  const handleGetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    // Validate Step 1 fields
    if (!formData.fullName.trim() || !formData.whatsappNumber.trim() || !formData.occupation.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate WhatsApp number format (10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = formData.whatsappNumber.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setIsLoading(true);
    
    // Log request details
    console.log('[Send OTP] Request:', {
      fullName: formData.fullName.trim(),
      whatsappNumber: cleanPhone,
      occupation: formData.occupation.trim(),
    });
    
    try {
      const result = await sendOtp(
        formData.fullName.trim(),
        cleanPhone,
        formData.occupation.trim(),
        { scheduleOsviForAbandonment: true }
      );

      // Log response for debugging
      console.log('[Send OTP] Response:', result);

      if (result.success) {
        setSuccessMessage(result.message || OTP_REQUEST_SUBMITTED_MESSAGE);
        
        // Save Step 1 data to MongoDB
        try {
          const saveResult = await saveStep1(
            formData.fullName.trim(),
            cleanPhone,
            formData.occupation.trim(),
            getStoredUtm() ?? undefined
          );
          if (saveResult.success) {
            console.log('[Save Step 1] Successfully saved to MongoDB');
          } else {
            console.error('[Save Step 1] Failed to save:', saveResult.message);
            // Don't block user flow if save fails
          }
        } catch (saveErr) {
          console.error('[Save Step 1] Exception:', saveErr);
          // Don't block user flow if save fails
        }
        
        setCurrentStep(2);
        // Focus first OTP input after state update
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      } else {
        // Log error details
        console.error('[Send OTP] Failed:', {
          success: result.success,
          status: result.status,
          message: result.message,
          data: result.data,
        });
        
        // Handle rate limiting
        if (result.status === 429) {
          setError(result.message || 'Too many OTP requests. Please try again after some time.');
        } else {
          const errorMessage = result.message || result.data?.message || OTP_REQUEST_FAILED_MESSAGE;
          setError(errorMessage);
        }
      }
    } catch (err) {
      console.error('[Send OTP] Exception:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setError('');
    
    const otpString = formData.otp.join('');
    if (otpString.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }
    
    setIsVerifying(true);
    const cleanPhone = formData.whatsappNumber.replace(/\D/g, '');
    
    // Normalize phone: take last 10 digits (same as backend normalizePhone)
    const normalizedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    
    // Log request details
    console.log('[Verify OTP] Request:', { 
      original: formData.whatsappNumber,
      cleaned: cleanPhone,
      normalized: normalizedPhone,
      otp: otpString 
    });
    
    try {
      const result = await verifyOtp(normalizedPhone, otpString);

      // Log full response for debugging
      console.log('[Verify OTP] Response:', result);

      // Backend returns { verified: true } on success (status 200)
      // API utility wraps it as { success: true, data: { verified: true } }
      if (result.success && result.data?.verified === true) {
        // Mark phone as verified and store the normalized phone number
        setIsPhoneVerified(true);
        setVerifiedPhone(normalizedPhone); // Store normalized phone for consistency
        console.log('[Verify OTP] Phone verified and stored:', normalizedPhone);
        setSuccessMessage('OTP verified successfully');
        
        // Save Step 2 data to MongoDB
        try {
          const saveResult = await saveStep2(normalizedPhone, getStoredUtm() ?? undefined);
          if (saveResult.success) {
            console.log('[Save Step 2] Successfully saved to MongoDB');
          } else {
            console.error('[Save Step 2] Failed to save:', saveResult.message);
            // Don't block user flow if save fails
          }
        } catch (saveErr) {
          console.error('[Save Step 2] Exception:', saveErr);
          // Don't block user flow if save fails
        }
        
        setCurrentStep(3);
      } else {
        // Log error details
        console.error('[Verify OTP] Failed:', {
          success: result.success,
          status: result.status,
          message: result.message,
          data: result.data,
        });
        
        const errorMessage = result.message || result.data?.message || 'Invalid or expired OTP. Please try again.';
        setOtpError(errorMessage);
        
        // Clear OTP inputs on error
        setFormData({ ...formData, otp: ['', '', '', '', '', ''] });
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      console.error('[Verify OTP] Exception:', err);
      setOtpError('Network error. Please check your connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setError('');
    setFormData({ ...formData, otp: ['', '', '', '', '', ''] });
    
    setIsLoading(true);
    const cleanPhone = formData.whatsappNumber.replace(/\D/g, '');
    
    // Normalize phone: take last 10 digits (same as backend normalizePhone)
    const normalizedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    
    try {
      const result = await sendOtp(
        formData.fullName.trim(),
        normalizedPhone,
        formData.occupation.trim(),
        { scheduleOsviForAbandonment: true }
      );

      if (result.success) {
        setSuccessMessage(result.message || OTP_REQUEST_SUBMITTED_MESSAGE);
        otpInputRefs.current[0]?.focus();
      } else {
        if (result.status === 429) {
          setError(result.message || 'Too many OTP requests. Please try again after some time.');
        } else {
          setError(result.message || OTP_REQUEST_FAILED_MESSAGE);
        }
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    // Check if phone is verified before submitting
    if (!isPhoneVerified || !verifiedPhone) {
      setError('Please verify your phone number with OTP first. Go back to step 2 to verify.');
      console.error('[Submit Application] Phone not verified. isPhoneVerified:', isPhoneVerified, 'verifiedPhone:', verifiedPhone);
      return;
    }
    
    // Time slot is required
    if (!formData.timeSlot) {
      setError('Please select a time slot');
      return;
    }

    // Reject disabled slots (e.g. if form state was tampered)
    const selectedSlotData = slots.find((s) => getSlotSelectionKey(s) === formData.timeSlot);
    if (!selectedSlotData || !selectedSlotData.id) {
      setError('Please select a valid time slot');
      return;
    }
    if (selectedSlotData.enabled === false) {
      setError('This slot is no longer available. Please choose another.');
      return;
    }

    setIsLoading(true);
    
    // Use the verified phone number to ensure exact match with backend
    const cleanPhone = verifiedPhone || formData.whatsappNumber.replace(/\D/g, '');
    
    // Normalize phone: take last 10 digits (same as backend normalizePhone)
    const normalizedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
    
    console.log('[Submit Application] Using verified phone:', normalizedPhone);
    
    // Selected slot ID and date from API slots (selectedSlotData already validated as enabled above)
    const selectedSlot = selectedSlotData.id;
    const slotDate = selectedSlotData.date || new Date().toISOString();

    // Log submission data
    console.log('[Submit Application] Request:', {
      phone: normalizedPhone,
      selectedSlot,
      slotDate
    });

    try {
      // Save Step 3 data to MongoDB
      const result = await saveStep3(
        normalizedPhone,
        selectedSlot,
        slotDate,
        getStoredUtm() ?? undefined
      );

      // Log full response for debugging
      console.log('[Submit Application] Response:', result);

      if (result.success) {
        console.log('[OSVI] Slot booked. Any pending abandoned-apply OSVI call is cancelled on server.');

        // Store booked slot info for popup
        setBookedSlotInfo({
          selectedSlot,
          slotDate: typeof slotDate === 'string' ? slotDate : new Date(slotDate).toISOString()
        });
        
        // Show success popup
        setShowSuccessPopup(true);
        
        // Reset form after popup closes (handled by popup close callback)
      } else {
        // Log error details
        console.error('[Submit Application] Failed:', {
          success: result.success,
          status: result.status,
          message: result.message,
          data: result.data,
        });
        
        const errorMessage = result.message || result.data?.message || 'Failed to submit application. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      console.error('[Submit Application] Exception:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    
    // Mark user as registered
    const normalizedPhone = verifiedPhone || formData.whatsappNumber.replace(/\D/g, '');
    const cleanPhone = normalizedPhone.length >= 10 ? normalizedPhone.slice(-10) : normalizedPhone;
    
    setIsRegistered(true);
    setRegisteredPhone(cleanPhone);
    setRegisteredSlotInfo(bookedSlotInfo);
    
    // Save to localStorage
    saveRegistrationToLocalStorage(cleanPhone);
    
    // Reset back to Step 1 (Step 4 has been removed from the flow)
    setCurrentStep(1);
    setBookedSlotInfo(null);
    setSuccessMessage('');
    // Reset form fields so they see a fresh form
    setFormData({
      fullName: '',
      whatsappNumber: '',
      occupation: '',
      otp: ['', '', '', '', '', ''],
      demoPreference: '',
      timeSlot: '',
    });
    setIsPhoneVerified(false);
    setVerifiedPhone('');

    // Redirect to WhatsApp with prefilled message; fall back to same-tab nav if popup blocked
    const opened = window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = WHATSAPP_URL;
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setError('');
      setSuccessMessage('');
      setOtpError('');
      // Don't reset verification status when going back
      setCurrentStep(currentStep - 1);
    }
  };

  const stepLabels = {
    1: '',
    2: 'OTP Verification',
    3: 'Slot Booking',
  };

  const progressPercentage = (currentStep / 3) * 100;

  return (
    <section id="home" className="apply-section">
      <div className="apply-section-inner">
        {/* Left column: marketing content */}
        <div className="apply-left">
          <div className="apply-join">
            <FaRocket className="apply-join-icon" aria-hidden />
            <ShinyText
              text="Join the Movement"
              speed={2.5}
              delay={0}
              color="#4b5563"
              shineColor="#ffffff"
              spread={120}
              direction="left"
              yoyo={false}
              pauseOnHover={false}
              disabled={false}
            />
          </div>

          <h2 className="apply-heading">
            <span className="apply-heading-grey">Become a Certified </span>
            <span className="apply-heading-elite">Elite </span>
            <span className="apply-heading-grey">Counselor</span>
          </h2>

          <p className="apply-desc">
            Work from home. Guide students with confidence. Earn income while transforming lives.
          </p>
          <p className="apply-desc apply-desc-sub">
            For Professionals from All Backgrounds
          </p>

          <div className="apply-stats">
            <div className="apply-stat">
              <span className="apply-stat-value apply-stat-value-blue">110+</span>
              <span className="apply-stat-label">counsellors joined this week</span>
            </div>
            <div className="apply-stat">
              <span className="apply-stat-value apply-stat-value-gold">₹6L</span>
              <span className="apply-stat-label">Earning Potential</span>
            </div>
            <div className="apply-stat">
              <span className="apply-stat-value apply-stat-value-green">PAN-India</span>
              <span className="apply-stat-label">Opportunities</span>
            </div>
          </div>
        </div>

        {/* Right column: form card */}
        <div className="apply-right">
          <div className="apply-form-card">
            {/* Already registered banner - shown only on steps 1 and 2 */}
            {isRegistered && currentStep <= 2 && (
              <div className="apply-already-registered">
                <span className="apply-already-registered-text">Already registered</span>
              </div>
            )}

            {/* Progress indicator - hidden on step 1 */}
            {currentStep >= 2 && (
              <div className="apply-progress">
                <div className="apply-progress-top">
                  <span className="apply-progress-step">Step {currentStep} of 3</span>
                  <span className="apply-progress-label">{stepLabels[currentStep]}</span>
                </div>
                <div className="apply-progress-bar">
                  <div 
                    className="apply-progress-fill" 
                    style={{ width: `${progressPercentage}%` }}
                    aria-hidden 
                  />
                </div>
              </div>
            )}

            {/* Form title - shown only on steps 1 and 2 */}
            {currentStep <= 2 && (
              <>
                <div className="apply-form-title-wrap">
                  <FiSend className="apply-form-title-icon" aria-hidden />
                  <h3 className="apply-form-title">
                    <ShinyText
                      text="Apply Now"
                      speed={2}
                      delay={0}
                      color="#003366"
                      shineColor="#ffffff"
                      spread={120}
                      direction="left"
                      yoyo={false}
                      pauseOnHover={false}
                      disabled={false}
                    />
                  </h3>
                </div>
                <p className="apply-form-sub">Start your journey as a certified counselor</p>
              </>
            )}

            {/* Error Message */}
            {error && <div className="apply-error-message-global">{error}</div>}
            
            {/* Success Message - shown only on steps 1 and 2 */}
            {successMessage && currentStep <= 2 && (
              <div className="apply-success-message">{successMessage}</div>
            )}

            {/* Step 1: Contact Details */}
            {currentStep === 1 && (
              <form className="apply-form" onSubmit={handleGetOtp}>
                <div className="apply-field">
                  <label htmlFor="fullName">
                    Full Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="apply-field">
                  <label htmlFor="whatsappNumber">
                    Mobile Number (for SMS OTP) <span>*</span>
                  </label>
                  <input
                    type="tel"
                    id="whatsappNumber"
                    name="whatsappNumber"
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    placeholder="9876543210"
                    required
                    pattern="[6-9]\d{9}"
                    maxLength="10"
                  />
                </div>

                <div className="apply-field">
                  <label htmlFor="occupation">
                    Occupation <span>*</span>
                  </label>
                  <input
                    type="text"
                    id="occupation"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    placeholder="Enter your occupation"
                    required
                  />
                </div>

                <button type="submit" className="apply-otp-btn" disabled={isLoading}>
                  {isLoading ? <Loader size="small" aria-hidden /> : <FiPhone aria-hidden />}
                  {isLoading ? 'Sending OTP...' : 'Get OTP'}
                </button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {currentStep === 2 && (
              <form className="apply-form" onSubmit={handleVerifyOtp}>
                <div className="apply-otp-wrapper">
                  <p className="apply-otp-instruction">
                    {OTP_ENTRY_INSTRUCTION}
                  </p>
                  <div className="apply-otp-container">
                    {formData.otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        className="apply-otp-input"
                        aria-label={`OTP digit ${index + 1}`}
                      />
                    ))}
                  </div>
                  {otpError && <p className="apply-error-message">{otpError}</p>}
                </div>

                <div className="apply-step-nav">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="apply-back-btn"
                  >
                    <FiArrowLeft aria-hidden />
                    Back
                  </button>
                  <button
                    type="submit"
                    className="apply-otp-btn"
                    disabled={isVerifying || isLoading}
                  >
                    {isVerifying ? <Loader size="small" aria-hidden /> : null}
                    {isVerifying ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>

                <div className="apply-resend-otp">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="apply-resend-link"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader size="small" aria-hidden /> : null}
                    {isLoading ? 'Resending...' : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Slot Booking - dynamic slots from API */}
            {currentStep === 3 && (
              <form className="apply-form" onSubmit={handleSubmit} autoComplete="off">
                <div className="apply-field apply-slot-step">
                  <label className="apply-question-label">
                    Choose your demo session
                  </label>
                  {slotsLoading ? (
                    <div className="apply-slot-loading">
                      <Loader size="small" aria-hidden />
                      <span>Loading available slots...</span>
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="apply-slot-error">No slots available at the moment. Please try again later.</p>
                  ) : (
                    <div className="apply-slot-by-date">
                      {slots.map((slot) => {
                        const selectionKey = getSlotSelectionKey(slot);
                        const slotDateObj = new Date(slot.date);
                        const dayHeading = formatSlotDayHeading(slotDateObj);
                        const timeRange = formatSlotTimeRange(slotDateObj);
                        const isSelected = formData.timeSlot === selectionKey;
                        const isDisabled = slot.enabled === false;
                        const slotLabel = typeof slot.label === 'string' ? slot.label : '';
                        return (
                          <div key={selectionKey} className="apply-slot-date-group">
                            <p className="apply-slot-date-heading">{dayHeading}</p>
                            <div className="apply-slot-day-options">
                              <label
                                htmlFor={`apply-slot-${selectionKey}`}
                                className={`apply-slot-card ${isSelected ? 'apply-slot-card-selected' : ''} ${isDisabled ? 'apply-slot-card-disabled' : ''}`}
                              >
                                <input
                                  type="radio"
                                  id={`apply-slot-${selectionKey}`}
                                  name="timeSlot"
                                  value={selectionKey}
                                  checked={isSelected}
                                  onChange={handleChange}
                                  required={!hasEnabledSlots(slots)}
                                  disabled={isDisabled}
                                  className="apply-slot-card-input"
                                />
                                <span className="apply-slot-card-icon" aria-hidden="true">
                                  {isDisabled ? <FiX /> : (isSelected ? <FiCheck /> : <FiCalendar />)}
                                </span>
                                <div className="apply-slot-card-content">
                                  <span className="apply-slot-card-day">{slotLabel.split(' — ')[0] || 'Available slot'}</span>
                                  <span className="apply-slot-card-datetime">
                                    {isDisabled ? 'Slots filled' : timeRange}
                                  </span>
                                </div>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="apply-step-nav">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="apply-back-btn"
                  >
                    <FiArrowLeft aria-hidden />
                    Back
                  </button>
                  <button type="submit" className="apply-otp-btn" disabled={isLoading || slotsLoading || slots.length === 0 || !hasEnabledSlots(slots)}>
                    {isLoading ? <Loader size="small" aria-hidden /> : null}
                    {isLoading ? 'Booking...' : 'Book Slot'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
      
      {/* Success Popup */}
      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={handleSuccessPopupClose}
        slotInfo={bookedSlotInfo}
        variant="slot"
      />
      
      <div className="apply-feature-cards">
        {[
          {
            icon: FiDollarSign,
            iconBg: 'apply-card-icon-gold',
            title: 'Earnings Potential',
            subtitle: '₹9 Lakhs/year potential',
          },
          {
            icon: FiAward,
            iconBg: 'apply-card-icon-blue',
            title: 'Certified Training',
            subtitle: 'Become a trusted, certified counselor',
          },
          {
            icon: FiHome,
            iconBg: 'apply-card-icon-green',
            title: 'Work from Anywhere',
            subtitle: 'Flexible, work-from-home model',
          },
          {
            icon: FiUsers,
            iconBg: 'apply-card-icon-blue',
            title: 'Expert Support',
            subtitle: "Backed by GuideXpert's central team",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="apply-feature-card">
              <div className={`apply-feature-card-icon ${card.iconBg}`}>
                <Icon className="apply-feature-card-icon-svg" aria-hidden />
              </div>
              <h4 className="apply-feature-card-title">{card.title}</h4>
              <p className="apply-feature-card-subtitle">{card.subtitle}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ApplySection;
