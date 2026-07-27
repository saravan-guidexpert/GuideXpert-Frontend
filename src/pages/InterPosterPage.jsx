import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { checkActivationEligibility, trackPosterDownloadBeacon } from '../utils/api';
import { isIOSDevice } from '../utils/posterDownloadUi';
import { usePosterIdentity } from '../hooks/usePosterIdentity';
import PosterIdentityNotice from '../components/Counsellor/PosterIdentityNotice';
import InterPosterPreview, {
  INTER_POSTER_WIDTH as POSTER_WIDTH,
  INTER_POSTER_HEIGHT as POSTER_HEIGHT,
  INTER_POSTER_EXPORT_LAYOUT,
} from '../components/Counsellor/InterPosterPreview';

function safeFilename(str) {
  return (str || 'poster').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 60);
}

const NAME_MAX_LEN = 50;
const PREVIEW_MAX_PX = 420;

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function loadInterPosterImage() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeout = setTimeout(() => reject(new Error('Poster image load timeout')), 20000);
    img.onload = () => { clearTimeout(timeout); resolve(img); };
    img.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load poster image')); };
    img.src = '/interposter.svg';
  });
}

function drawFittedText(ctx, text, x, y, opts) {
  const { color = '#003366', maxWidth = 400, fontSize = 28, minFontSize = 16, fontWeight = 700, fontFamily = 'sans-serif', textAlign = 'left' } = opts || {};
  const raw = String(text || '').trim();
  if (!raw) return;
  let size = fontSize;
  let display = raw;
  const setFont = (s) => { ctx.font = `${fontWeight} ${s}px ${fontFamily}`; };
  setFont(size);
  while (size > minFontSize && ctx.measureText(display).width > maxWidth) { size -= 1; setFont(size); }
  if (ctx.measureText(display).width > maxWidth) {
    let lo = 0, hi = display.length, best = '';
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const c = `${display.slice(0, mid).trimEnd()}…`;
      if (ctx.measureText(c).width <= maxWidth) { best = c; lo = mid + 1; } else { hi = mid - 1; }
    }
    display = best || display;
  }
  ctx.fillStyle = color;
  ctx.textAlign = textAlign;
  setFont(size);
  ctx.fillText(display, x, y);
}

function drawInterPosterToCanvas(img, fullName, mobileNumber, scale = 2) {
  const w = POSTER_WIDTH * scale;
  const h = POSTER_HEIGHT * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, w, h);

  const sx = scale;
  const nl = INTER_POSTER_EXPORT_LAYOUT.name;
  const pl = INTER_POSTER_EXPORT_LAYOUT.phone;

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  drawFittedText(ctx, String(fullName || ' ').trim().slice(0, NAME_MAX_LEN) || ' ', nl.x * sx, nl.y * sx, {
    color: nl.color, maxWidth: nl.maxWidth * sx,
    fontSize: nl.fontSize * sx, minFontSize: nl.minFontSize * sx,
    fontWeight: nl.fontWeight, fontFamily: nl.fontFamily, textAlign: nl.textAlign,
  });
  drawFittedText(ctx, mobileNumber ? mobileNumber : ' ', pl.x * sx, pl.y * sx, {
    color: pl.color, maxWidth: pl.maxWidth * sx,
    fontSize: pl.fontSize * sx, minFontSize: pl.minFontSize * sx,
    fontWeight: pl.fontWeight, fontFamily: pl.fontFamily, textAlign: pl.textAlign,
  });
  return canvas;
}

export default function InterPosterPage() {
  const navigate = useNavigate();
  const identity = usePosterIdentity();
  const { displayName: identityName, displayPhone, validationPhone, hasActivation, hasIdentity, usedSettingsOverride } = identity;
  const nameParts = identityName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ');
  const mobileNumber = displayPhone;
  const [showIneligibleModal, setShowIneligibleModal] = useState(false);
  const [ineligibleMessage, setIneligibleMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [iosResult, setIosResult] = useState(null);
  const iosResultBlobUrlRef = useRef(null);
  const posterRef = useRef(null);
  const previewBoxRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(PREVIEW_MAX_PX / POSTER_WIDTH);

  const mobile10 = displayPhone;
  const fullName = identityName;
  const displayName = fullName.slice(0, NAME_MAX_LEN);
  const formLocked = false;

  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth || PREVIEW_MAX_PX;
      const target = Math.min(available, PREVIEW_MAX_PX);
      setPreviewScale(Math.max(0.25, target / POSTER_WIDTH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canDownload = hasActivation && hasIdentity;

  async function verifyEligibility() {
    if (!hasActivation) {
      setIneligibleMessage('We could not find your activation form details. Please complete the activation form to download this poster.');
      setShowIneligibleModal(true);
      return false;
    }
    const result = await checkActivationEligibility(validationPhone);
    const payload = result.data?.data ?? result.data;
    const isEligible = Boolean(result.eligible ?? payload?.exists ?? payload?.eligible ?? false);
    if (result.success && isEligible) return true;
    setIneligibleMessage(result.message || payload?.message || 'You have not completed the activation form yet. Please complete it first.');
    setShowIneligibleModal(true);
    return false;
  }

  const handlePng = async () => {
    if (!(await verifyEligibility())) return;
    setGenerating(true);
    try {
      const img = await loadInterPosterImage();
      const c = drawInterPosterToCanvas(img, fullName, mobile10, 2);
      const url = c.toDataURL('image/png');
      if (isIOSDevice()) {
        setIosResult({ url, type: 'image' });
      } else {
        const fn = `GuideXpert-Poster-${safeFilename(fullName)}-${Date.now()}.png`;
        const a = document.createElement('a'); a.download = fn; a.href = url; a.click();
      }
      trackPosterDownloadBeacon({
        posterKey: 'inter',
        format: 'png',
        displayName,
        mobileNumber: mobile10,
        routeContext: 'public',
      });
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const handlePdf = async () => {
    if (!(await verifyEligibility())) return;
    setGenerating(true);
    try {
      const img = await loadInterPosterImage();
      const c = drawInterPosterToCanvas(img, fullName, mobile10, 2);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [POSTER_WIDTH, POSTER_HEIGHT], compress: true });
      pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
      if (isIOSDevice()) {
        const u = URL.createObjectURL(pdf.output('blob'));
        iosResultBlobUrlRef.current = u; setIosResult({ url: u, type: 'pdf' });
      } else {
        const fn = `GuideXpert-Poster-${safeFilename(fullName)}-${Date.now()}.pdf`;
        const blob = pdf.output('blob'); const u = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.download = fn; a.href = u; a.click();
        setTimeout(() => URL.revokeObjectURL(u), 5000);
      }
      trackPosterDownloadBeacon({
        posterKey: 'inter',
        format: 'pdf',
        displayName,
        mobileNumber: mobile10,
        routeContext: 'public',
      });
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  function closeIos() {
    if (iosResultBlobUrlRef.current) { try { URL.revokeObjectURL(iosResultBlobUrlRef.current); } catch (_) { /* */ } iosResultBlobUrlRef.current = null; }
    setIosResult(null);
  }

  const scaledW = Math.round(POSTER_WIDTH * previewScale);
  const scaledH = Math.round(POSTER_HEIGHT * previewScale);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Generating overlay */}
        {generating && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white shadow-2xl px-10 py-8 max-w-[240px]">
              <div className="w-8 h-8 rounded-full border-[3px] border-primary-navy border-t-transparent animate-spin" />
              <p className="text-sm font-semibold text-slate-800">Generating…</p>
            </div>
          </div>
        )}

        {/* iOS save result */}
        {iosResult && (
          <div className="fixed inset-0 z-[10001] flex flex-col bg-black">
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4">
              {iosResult.type === 'image'
                ? <img src={iosResult.url} alt="Poster" className="max-w-full max-h-full object-contain select-none" draggable={false} />
                : <iframe src={iosResult.url} title="PDF" className="w-full flex-1 min-h-0 border-0" />}
              <p className="text-white/80 text-xs text-center mt-3">
                {iosResult.type === 'image' ? 'Long-press → Save Image' : 'Tap Share → Save to Files'}
              </p>
            </div>
            <div className="p-4 bg-gray-900">
              <button onClick={closeIos} className="w-full py-3 rounded-xl bg-white text-gray-900 font-semibold text-sm">Close</button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-primary-navy tracking-tight">Download Your Counsellor Poster</h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-lg mx-auto">Enter your details below. Eligibility is verified when you click download.</p>
        </div>

        <PosterIdentityNotice className="mb-6" />

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">

            {/* Left — Form */}
            <div className="p-5 sm:p-7 border-b md:border-b-0 md:border-r border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5">Your Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">First Name</label>
                  <input type="text" value={firstName} readOnly aria-readonly="true" placeholder="Sign in to load your name"
                    className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 cursor-not-allowed placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Last Name</label>
                  <input type="text" value={lastName} readOnly aria-readonly="true" placeholder="—"
                    className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 cursor-not-allowed placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mobile Number</label>
                  <input type="tel" value={mobileNumber} readOnly aria-readonly="true" placeholder="Sign in to load your phone" maxLength={14}
                    className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700 cursor-not-allowed placeholder:text-slate-400" />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {usedSettingsOverride ? 'Pulled from your Settings profile.' : 'Pulled from your activation form.'}{' '}
                <Link to="/counsellor/settings" className="text-primary-navy underline font-medium">Edit in Settings</Link>
              </p>

              {!hasActivation ? (
                <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 leading-relaxed">
                  We could not find your activation form details. Please <Link to="/counsellor/login" className="underline font-semibold">sign in</Link> and complete the activation form to download this poster.
                </div>
              ) : (
                <div className="mt-4 text-xs text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-lg px-3 py-2.5 leading-relaxed">
                  These details come from your Settings profile (or activation form by default). They will appear on the downloaded poster.
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2.5">
                <button onClick={handlePng} disabled={generating || !canDownload}
                  className="w-full rounded-lg bg-primary-navy py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-navy/20 hover:shadow-lg hover:shadow-primary-navy/30 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {generating ? 'Generating…' : 'Download as PNG'}
                </button>
                <button onClick={handlePdf} disabled={generating || !canDownload}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {generating ? 'Generating…' : 'Download as PDF'}
                </button>
              </div>
            </div>

            {/* Right — Preview */}
            <div className="p-5 sm:p-7 flex flex-col items-center justify-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 self-start">Preview</h2>

              <div ref={previewBoxRef} className="relative w-full flex justify-center" style={{ maxWidth: PREVIEW_MAX_PX }}>
                <div
                  className="rounded-lg overflow-hidden shadow-md border border-slate-200/80"
                  style={{ width: scaledW, height: scaledH }}
                >
                  <div style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                    <InterPosterPreview ref={posterRef} fullName={displayName || fullName} mobileNumber={mobile10 || undefined} />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-3 text-center">Live preview — updates as you type.</p>
            </div>
          </div>
        </div>

        {/* Ineligible modal */}
        {showIneligibleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1.5">Activation Form Not Submitted</h2>
              <p className="text-sm text-slate-500 mb-5">{ineligibleMessage || 'Please complete the activation form first, then return here to download your poster.'}</p>
              <button onClick={() => { setShowIneligibleModal(false); navigate('/become-counsellor'); }}
                className="w-full py-2.5 text-sm font-semibold text-white bg-primary-navy rounded-xl hover:opacity-90 transition">
                Go to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
