import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { checkPosterEligibility, trackPosterDownloadBeacon } from '../utils/api';
import { isIOSDevice } from '../utils/posterDownloadUi';
import { usePosterIdentity } from '../hooks/usePosterIdentity';
import PosterIdentityNotice from '../components/Counsellor/PosterIdentityNotice';
import HoliPosterPreview, { HOLI_POSTER_WIDTH as POSTER_WIDTH, HOLI_POSTER_HEIGHT as POSTER_HEIGHT } from '../components/Counsellor/HoliPosterPreview';

function safeFilename(str) {
  return (str || 'poster').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 60);
}

const PREVIEW_SCALE = 0.38;
const NAME_MAX_LEN = 50;

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function loadHoliPosterImage() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeout = setTimeout(() => reject(new Error('Poster image load timeout')), 20000);
    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load poster image'));
    };
    img.src = '/holiposter.svg';
  });
}

/** iOS: draw Holi poster with text at bottom-east (right-aligned). Use lineHeight 1.5 and nudge up so glyphs are never clipped. */
function drawHoliPosterToCanvas(img, fullName, mobileNumber, scale = 2) {
  const w = POSTER_WIDTH * scale;
  const h = POSTER_HEIGHT * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, w, h);

  const sx = scale;
  const blockRight = 24 * sx;
  const blockBottom = 28 * sx;
  const paddingH = 20 * sx;
  const nameFontSize = 34 * sx;
  const phoneFontSize = 26 * sx;
  const taglineFontSize = 32 * sx;
  const lineGap = 8 * sx;
  const lineHeight = 1.5;
  const taglineLineHeightMultiplier = 1.6;
  const nameLineHeight = nameFontSize * lineHeight;
  const phoneLineHeight = phoneFontSize * lineHeight;
  const taglineLineHeight = taglineFontSize * taglineLineHeightMultiplier;
  const paddingV = 18 * sx;
  const extraBottom = 20 * sx;

  const textRight = w - blockRight - paddingH;
  const blockTotalHeight = paddingV + nameLineHeight + lineGap + phoneLineHeight + lineGap + taglineLineHeight + paddingV + extraBottom;
  const blockTop = h - blockBottom - blockTotalHeight;
  const nameBaselineY = blockTop + paddingV + nameFontSize;
  const phoneBaselineY = blockTop + paddingV + nameLineHeight + lineGap + phoneFontSize;
  const taglineBaselineY = blockTop + paddingV + nameLineHeight + lineGap + phoneLineHeight + lineGap + taglineFontSize;

  const displayName = String(fullName || ' ').trim().slice(0, NAME_MAX_LEN) || ' ';

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';

  const canvasFont = (weight, sizePx) => `${weight} ${sizePx}px "Source Sans 3", sans-serif`;

  ctx.fillStyle = '#1f2937';
  ctx.font = canvasFont(700, nameFontSize);
  ctx.fillText(displayName, textRight, nameBaselineY);

  ctx.fillStyle = '#374151';
  ctx.font = canvasFont(600, phoneFontSize);
  ctx.fillText(mobileNumber ? `+91 ${mobileNumber}` : ' ', textRight, phoneBaselineY);

  ctx.fillStyle = '#b45309';
  ctx.font = canvasFont(800, taglineFontSize);
  ctx.fillText('Certified Career Counsellor', textRight, taglineBaselineY);

  return canvas;
}

export default function HoliPosterPage() {
  const navigate = useNavigate();
  const identity = usePosterIdentity();
  const { displayPhone, validationPhone, hasActivation, hasIdentity, usedSettingsOverride } = identity;
  const fullName = identity.displayName;
  const mobileNumber = displayPhone;
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showIneligibleModal, setShowIneligibleModal] = useState(false);
  const [ineligibleMessage, setIneligibleMessage] = useState('');
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportImageReady, setExportImageReady] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(null);
  const [iosResult, setIosResult] = useState(null);
  const iosResultBlobUrlRef = useRef(null);
  const posterRef = useRef(null);
  const exportRef = useRef(null);
  const exportWrapperRef = useRef(null);
  const captureContainerRef = useRef(null);
  const exportImageReadyRef = useRef(false);
  const pendingDownloadRef = useRef({ url: null, filename: null, revoke: false });

  const mobile10 = displayPhone;
  const displayName = fullName.slice(0, NAME_MAX_LEN);
  const canSubmit = hasActivation && hasIdentity && confirmChecked;
  const formLocked = eligible;

  const handleOpenConfirmModal = () => {
    if (!canSubmit) return;
    setShowConfirmModal(true);
  };

  useEffect(() => {
    if (!eligible) {
      setExportImageReady(false);
      exportImageReadyRef.current = false;
    }
  }, [eligible]);

  const handleConfirmAndGenerate = async () => {
    setShowConfirmModal(false);
    setCheckingEligibility(true);
    const result = await checkPosterEligibility(validationPhone);
    setCheckingEligibility(false);
    const eligibleResult = result.data?.eligible ?? result.eligible;
    if (result.success && eligibleResult) {
      setEligible(true);
    } else {
      setIneligibleMessage(result.data?.message || result.message || 'Your training is not yet completed. Please complete the training to download the poster.');
      setShowIneligibleModal(true);
    }
  };

  function waitForExportImageReadyWithTimeout(ms) {
    return new Promise((resolve) => {
      if (exportImageReadyRef.current) return resolve();
      const deadline = Date.now() + ms;
      const id = setInterval(() => {
        if (exportImageReadyRef.current || Date.now() >= deadline) {
          clearInterval(id);
          resolve();
        }
      }, 50);
    });
  }

  function showExportWrapper() {
    const wrapper = exportWrapperRef.current;
    const container = captureContainerRef.current;
    if (!wrapper) return;
    if (isIOS()) {
      wrapper.style.position = 'absolute';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      if (container) {
        container.style.zIndex = '9998';
        container.style.overflow = 'visible';
      }
    } else if (isIOSDevice()) {
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
    }
    wrapper.style.opacity = '1';
    wrapper.style.zIndex = '9998';
    wrapper.style.overflow = 'visible';
    wrapper.style.minWidth = `${POSTER_WIDTH}px`;
    wrapper.style.maxWidth = `${POSTER_WIDTH}px`;
    wrapper.style.minHeight = `${POSTER_HEIGHT}px`;
    wrapper.style.maxHeight = `${POSTER_HEIGHT}px`;
    wrapper.style.transform = 'translateZ(0)';
  }

  function hideExportWrapper() {
    const wrapper = exportWrapperRef.current;
    const container = captureContainerRef.current;
    if (!wrapper) return;
    wrapper.style.opacity = '0';
    wrapper.style.zIndex = '-1';
    wrapper.style.overflow = 'hidden';
    wrapper.style.left = '';
    wrapper.style.top = '';
    wrapper.style.minWidth = '';
    wrapper.style.maxWidth = '';
    wrapper.style.minHeight = '';
    wrapper.style.maxHeight = '';
    wrapper.style.transform = '';
    if (isIOS()) {
      wrapper.style.position = '';
      if (container) {
        container.style.zIndex = '-1';
        container.style.overflow = 'hidden';
      }
    }
  }

  function getHtml2canvasOptions(scale, target) {
    const isIos = isIOS();
    const el = target || exportRef.current;
    const winW = isIos ? (el?.scrollWidth || POSTER_WIDTH) : POSTER_WIDTH + 20;
    const winH = isIos ? (el?.scrollHeight || POSTER_HEIGHT) : POSTER_HEIGHT + 20;
    return {
      scale,
      ...(isIos ? { width: POSTER_WIDTH * scale, height: POSTER_HEIGHT * scale } : { width: POSTER_WIDTH, height: POSTER_HEIGHT }),
      windowWidth: winW,
      windowHeight: winH,
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
      imageTimeout: 0,
      onclone: (clonedDoc, clonedElement) => {
        clonedDoc.documentElement.style.overflow = 'visible';
        if (clonedDoc.body) clonedDoc.body.style.overflow = 'visible';
        if (isIos) {
          clonedDoc.documentElement.style.width = `${POSTER_WIDTH}px`;
          clonedDoc.documentElement.style.height = `${POSTER_HEIGHT}px`;
          clonedDoc.documentElement.style.minWidth = `${POSTER_WIDTH}px`;
          clonedDoc.documentElement.style.minHeight = `${POSTER_HEIGHT}px`;
          if (clonedDoc.body) {
            clonedDoc.body.style.width = `${POSTER_WIDTH}px`;
            clonedDoc.body.style.height = `${POSTER_HEIGHT}px`;
            clonedDoc.body.style.minWidth = `${POSTER_WIDTH}px`;
            clonedDoc.body.style.minHeight = `${POSTER_HEIGHT}px`;
          }
          let node = clonedElement;
          while (node && node !== clonedDoc.body) {
            node.style.width = `${POSTER_WIDTH}px`;
            node.style.height = `${POSTER_HEIGHT}px`;
            node.style.minWidth = `${POSTER_WIDTH}px`;
            node.style.minHeight = `${POSTER_HEIGHT}px`;
            node.style.overflow = 'visible';
            node = node.parentElement;
          }
        }
        clonedElement.style.opacity = '1';
        clonedElement.style.visibility = 'visible';
        clonedElement.style.zIndex = '9999';
        clonedElement.style.overflow = 'visible';
        clonedElement.style.position = 'relative';
        clonedElement.style.left = '0';
        clonedElement.style.top = '0';
        let parent = clonedElement.parentElement;
        while (parent && parent !== clonedDoc.body) {
          const pos = parent.style.position || (parent.currentStyle && parent.currentStyle.position);
          if (pos === 'fixed' || (parent.getAttribute && parent.getAttribute('style') && String(parent.getAttribute('style')).includes('fixed'))) {
            parent.style.position = 'absolute';
            parent.style.left = '0';
            parent.style.top = '0';
          }
          parent = parent.parentElement;
        }
      },
    };
  }

  const imageWaitMs = isIOSDevice() ? 800 : 3000;
  const layoutSettleMs = isIOSDevice() ? 100 : 400;

  function triggerPendingDownload() {
    const { url, filename, revoke } = pendingDownloadRef.current;
    if (!url || !filename) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    if (revoke) setTimeout(() => URL.revokeObjectURL(url), 2000);
    pendingDownloadRef.current = { url: null, filename: null, revoke: false };
    setPendingDownload(null);
  }

  const handleDownloadPng = async () => {
    setGenerating(true);
    setPendingDownload(null);
    try {
      if (isIOS()) {
        const img = await loadHoliPosterImage();
        const scale = 2;
        const canvas = drawHoliPosterToCanvas(img, displayName, mobile10, scale);
        const dataUrl = canvas.toDataURL('image/png');
        setIosResult({ url: dataUrl, type: 'image' });
        trackPosterDownloadBeacon({
          posterKey: 'holi',
          format: 'png',
          displayName,
          mobileNumber: mobile10,
          routeContext: 'public',
        });
      } else {
        const target = exportRef.current || posterRef.current;
        if (!target) return;
        await waitForExportImageReadyWithTimeout(imageWaitMs);
        await new Promise((r) => setTimeout(r, layoutSettleMs));
        showExportWrapper();
        await new Promise((r) => requestAnimationFrame(r));
        const scale = 2;
        const canvas = await html2canvas(target, getHtml2canvasOptions(scale, target));
        const w = POSTER_WIDTH * scale;
        const h = POSTER_HEIGHT * scale;
        const cropped = document.createElement('canvas');
        cropped.width = w;
        cropped.height = h;
        const ctx = cropped.getContext('2d');
        if (ctx) ctx.drawImage(canvas, 0, 0, Math.min(canvas.width, w), Math.min(canvas.height, h), 0, 0, w, h);
        const dataUrl = cropped.toDataURL('image/png');
        const filename = `GuideXpert-Holi-Poster-${safeFilename(displayName)}-${Date.now()}.png`;
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        trackPosterDownloadBeacon({
          posterKey: 'holi',
          format: 'png',
          displayName,
          mobileNumber: mobile10,
          routeContext: 'public',
        });
        if (isIOSDevice()) {
          pendingDownloadRef.current = { url: dataUrl, filename };
          setPendingDownload('png');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isIOS()) hideExportWrapper();
    }
    setGenerating(false);
  };

  const handleDownloadPdf = async () => {
    setGenerating(true);
    setPendingDownload(null);
    try {
      if (isIOS()) {
        const img = await loadHoliPosterImage();
        const scale = 2;
        const canvas = drawHoliPosterToCanvas(img, displayName, mobile10, scale);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [POSTER_WIDTH, POSTER_HEIGHT],
          compress: true,
        });
        pdf.addImage(imgData, 'PNG', 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
        const blob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(blob);
        iosResultBlobUrlRef.current = pdfUrl;
        setIosResult({ url: pdfUrl, type: 'pdf' });
        trackPosterDownloadBeacon({
          posterKey: 'holi',
          format: 'pdf',
          displayName,
          mobileNumber: mobile10,
          routeContext: 'public',
        });
      } else {
        const target = exportRef.current || posterRef.current;
        if (!target) return;
        await waitForExportImageReadyWithTimeout(imageWaitMs);
        await new Promise((r) => setTimeout(r, layoutSettleMs));
        showExportWrapper();
        await new Promise((r) => requestAnimationFrame(r));
        const scale = 2;
        const canvas = await html2canvas(target, getHtml2canvasOptions(scale, target));
        const w = POSTER_WIDTH * scale;
        const h = POSTER_HEIGHT * scale;
        const cropped = document.createElement('canvas');
        cropped.width = w;
        cropped.height = h;
        const ctx = cropped.getContext('2d');
        if (ctx) ctx.drawImage(canvas, 0, 0, Math.min(canvas.width, w), Math.min(canvas.height, h), 0, 0, w, h);
        const imgData = cropped.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [POSTER_WIDTH, POSTER_HEIGHT],
          compress: true,
        });
        pdf.addImage(imgData, 'PNG', 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
        const filename = `GuideXpert-Holi-Poster-${safeFilename(displayName)}-${Date.now()}.pdf`;
        const blob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(blob);
        const pdfLink = document.createElement('a');
        pdfLink.download = filename;
        pdfLink.href = pdfUrl;
        pdfLink.click();
        trackPosterDownloadBeacon({
          posterKey: 'holi',
          format: 'pdf',
          displayName,
          mobileNumber: mobile10,
          routeContext: 'public',
        });
        if (isIOSDevice()) {
          pendingDownloadRef.current = { url: pdfUrl, filename, revoke: true };
          setPendingDownload('pdf');
        } else {
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isIOS()) hideExportWrapper();
    }
    setGenerating(false);
  };

  function closeIosResult() {
    if (iosResultBlobUrlRef.current) {
      try { URL.revokeObjectURL(iosResultBlobUrlRef.current); } catch (_) {}
      iosResultBlobUrlRef.current = null;
    }
    setIosResult(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf2f8] via-[#f5f3ff] to-[#fefce8]">
      <div className="max-w-6xl mx-auto px-4 py-6">
      {generating && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[10000]"
          style={{
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-gradient-to-b from-white to-[#fdf2f8] shadow-2xl px-8 py-8 mx-4 max-w-[280px] border border-[#fbcfe8]/40">
            <div className="w-10 h-10 rounded-full border-2 border-[#c026d3] border-t-transparent animate-spin" style={{ animationDuration: '0.8s' }} />
            <p className="text-sm font-medium text-gray-800 text-center">Generating poster…</p>
            <p className="text-xs text-gray-500 text-center">This may take a few seconds</p>
          </div>
        </div>
      )}

      {iosResult && (
        <div className="fixed inset-0 z-[10001] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Save your poster">
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4">
            {iosResult.type === 'image' ? (
              <img src={iosResult.url} alt="Your Holi poster" className="max-w-full max-h-full object-contain select-none" style={{ WebkitUserSelect: 'none', userSelect: 'none' }} draggable={false} />
            ) : (
              <iframe src={iosResult.url} title="Poster PDF" className="w-full flex-1 min-h-0 border-0" />
            )}
            <p className="text-white text-sm text-center mt-3 px-2">
              {iosResult.type === 'image' ? 'Long-press the image above, then tap "Save Image" to save to Photos.' : 'Tap the Share icon below, then choose Save to Files or add to Photos.'}
            </p>
          </div>
          <div className="p-4 bg-gray-900">
            <button type="button" onClick={closeIosResult} className="w-full py-3 rounded-lg bg-white text-gray-900 font-medium">Close</button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[#c026d3] via-[#db2777] to-[#ea580c] bg-clip-text text-transparent">Holi Poster</h1>
      <p className="text-gray-700 mb-6">Your poster is generated using the name and phone number on your counsellor profile. Update them anytime in <Link to="/counsellor/settings" className="text-[#c026d3] underline font-medium">Settings</Link>.</p>

      <PosterIdentityNotice className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4 rounded-2xl bg-gradient-to-b from-white to-[#fdf2f8] p-6 shadow-lg border border-[#fbcfe8]/40">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Full Name</span>
            <input
              type="text"
              value={fullName}
              readOnly
              aria-readonly="true"
              placeholder="Sign in to load your name"
              maxLength={NAME_MAX_LEN + 5}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm cursor-not-allowed text-gray-700"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Mobile Number</span>
            <input
              type="tel"
              value={mobileNumber}
              readOnly
              aria-readonly="true"
              placeholder="Sign in to load your phone"
              maxLength={14}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm cursor-not-allowed text-gray-700"
            />
          </label>

          <p className="text-xs text-gray-500">
            {usedSettingsOverride ? 'Pulled from your Settings profile.' : 'Pulled from your activation form.'}{' '}
            <Link to="/counsellor/settings" className="text-[#c026d3] underline font-medium">Edit in Settings</Link>
          </p>

          {!hasActivation ? (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              We could not find your activation form details. Please {' '}
              <Link to="/counsellor/login" className="underline font-semibold">sign in</Link> and complete the activation form to download this poster.
            </div>
          ) : (
            <>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  disabled={formLocked}
                  className="mt-1 rounded border-gray-300 text-primary-navy focus:ring-primary-navy"
                />
                <span className="text-sm text-gray-700">I confirm that the above details are correct.</span>
              </label>

              {!eligible ? (
                <button
                  type="button"
                  onClick={handleOpenConfirmModal}
                  disabled={!canSubmit || checkingEligibility}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#c026d3] to-[#ea580c] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-[#a21caf] hover:to-[#c2410c] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {checkingEligibility ? 'Checking eligibility…' : 'Check Eligibility'}
                </button>
              ) : (
                <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 font-medium">You are eligible. Your poster is ready to download below.</div>
              )}
            </>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col items-center rounded-2xl bg-gradient-to-b from-white/90 to-[#f5f3ff]/90 p-6 shadow-lg border border-[#e9d5ff]/50">
          <div className="relative w-full flex flex-col items-center" style={{ width: POSTER_WIDTH * PREVIEW_SCALE, maxWidth: '100%' }}>
            {checkingEligibility && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded z-10">
                <span className="text-gray-600 font-medium">Checking eligibility…</span>
              </div>
            )}
            <div className="overflow-hidden rounded-md relative" style={{ width: POSTER_WIDTH * PREVIEW_SCALE, height: POSTER_HEIGHT * PREVIEW_SCALE }}>
              {eligible ? (
                <div style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
                  <HoliPosterPreview ref={posterRef} fullName={displayName} mobileNumber={mobile10 || undefined} />
                </div>
              ) : (
                <>
                  <div style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
                    <img
                      src="/holiposter.svg"
                      alt=""
                      style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT, objectFit: 'fill', display: 'block' }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
                    <p className="text-white text-sm font-medium text-center px-4 drop-shadow">
                      Enter details and check eligibility to see your poster preview.
                    </p>
                  </div>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              {eligible ? 'Your poster is ready. Use the buttons below to download.' : 'Check eligibility to see your poster preview.'}
            </p>
          </div>
          {eligible && (
            <div className="flex flex-wrap gap-3 mt-4 w-full justify-center">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={generating}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-[#c026d3] to-[#ea580c] px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-[#a21caf] hover:to-[#c2410c] hover:shadow-lg disabled:opacity-60 transition-all"
              >
                {generating ? 'Generating…' : 'Download as PNG'}
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={generating}
                className="inline-flex items-center rounded-xl border-2 border-[#c026d3]/60 bg-white px-4 py-2 text-sm font-medium text-[#7c3aed] shadow-sm hover:bg-[#fdf2f8] hover:border-[#c026d3] disabled:opacity-60 transition-all"
              >
                {generating ? 'Generating…' : 'Download as PDF'}
              </button>
              {pendingDownload && (
                <button type="button" onClick={triggerPendingDownload} className="inline-flex items-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-amber-600">
                  Download now (tap to save)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {eligible && (
        <div
          ref={captureContainerRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: POSTER_WIDTH,
            height: POSTER_HEIGHT,
            minWidth: POSTER_WIDTH,
            maxWidth: POSTER_WIDTH,
            minHeight: POSTER_HEIGHT,
            maxHeight: POSTER_HEIGHT,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: -1,
            boxSizing: 'border-box',
          }}
        >
          <div
            ref={exportWrapperRef}
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: POSTER_WIDTH,
              height: POSTER_HEIGHT,
              minWidth: POSTER_WIDTH,
              maxWidth: POSTER_WIDTH,
              minHeight: POSTER_HEIGHT,
              maxHeight: POSTER_HEIGHT,
              overflow: 'hidden',
              opacity: 0,
              pointerEvents: 'none',
              zIndex: -1,
              boxSizing: 'border-box',
            }}
          >
            <HoliPosterPreview
              ref={exportRef}
              fullName={displayName}
              mobileNumber={mobile10 || undefined}
              forExport
              onExportImageLoad={() => {
                exportImageReadyRef.current = true;
                setExportImageReady(true);
              }}
            />
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="holi-confirm-modal-title">
          <div className="bg-gradient-to-b from-white to-[#fdf2f8] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#fbcfe8]/50">
            <h2 id="holi-confirm-modal-title" className="text-lg font-bold bg-gradient-to-r from-[#c026d3] to-[#ea580c] bg-clip-text text-transparent mb-2">Confirm details</h2>
            <p className="text-gray-700 text-sm mb-4">These details will be used on your Holi poster.</p>
            <div className="bg-white/80 rounded-xl p-3 mb-4 text-sm border border-[#fbcfe8]/40">
              <p><span className="font-medium text-gray-700">Name:</span> {displayName || '—'}</p>
              <p><span className="font-medium text-gray-700">Mobile:</span> {mobile10 || '—'}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50">Edit</button>
              <button type="button" onClick={handleConfirmAndGenerate} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#c026d3] to-[#ea580c] rounded-xl shadow-md hover:from-[#a21caf] hover:to-[#c2410c]">Confirm & Check</button>
            </div>
          </div>
        </div>
      )}

      {showIneligibleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="holi-ineligible-modal-title">
          <div className="bg-gradient-to-b from-white to-[#f5f3ff] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#e9d5ff]/50">
            <h2 id="holi-ineligible-modal-title" className="text-lg font-bold text-gray-900 mb-2">Training not yet completed</h2>
            <p className="text-gray-700 text-sm mb-4">{ineligibleMessage}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowIneligibleModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => { setShowIneligibleModal(false); navigate('/become-counsellor'); }}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#c026d3] to-[#ea580c] rounded-xl shadow-md hover:from-[#a21caf] hover:to-[#c2410c]"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
