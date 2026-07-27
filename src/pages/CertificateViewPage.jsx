import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getCertificateById } from '../utils/api';
import {
  loadCertificateImage,
  drawCertificateToCanvas,
  downloadCertificatePng,
  downloadCertificatePdf,
  formatCertificateDisplayName,
} from './webinar/utils/certificateWebinar';
import {
  openCommunityRedirectPlaceholder,
  navigatePlaceholderToCommunity,
  closeCommunityRedirectPlaceholder,
} from '../utils/whatsappCommunityInvite';
import { FiDownload, FiArrowLeft, FiAward, FiCheckCircle, FiCalendar, FiUser, FiHash } from 'react-icons/fi';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="h-6 w-40 rounded bg-gray-200 animate-pulse mb-8" />
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="aspect-[842/596] w-full bg-gray-100 animate-pulse" />
          <div className="p-6 space-y-4">
            <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="flex gap-3 pt-2">
              <div className="h-10 w-36 rounded-xl bg-gray-200 animate-pulse" />
              <div className="h-10 w-36 rounded-xl bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 mb-5">
          <FiAward className="w-7 h-7 text-red-400" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Certificate not found</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          This certificate link is invalid or has not been generated yet. Go to My Certificates, click Preview or download, then use the link again.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/webinar/certificates"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-navy text-white text-sm font-medium hover:bg-primary-navy/90 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" aria-hidden />
            My Certificates
          </Link>
          <Link
            to="/become-counsellor"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CertificateViewPage() {
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    const trimmedId = (id != null ? String(id) : '').trim();
    if (!trimmedId) {
      setError(true);
      setLoading(false);
      return;
    }
    const stateCertificate = location.state?.certificate;
    let cancelled = false;
    (async () => {
      try {
        const result = await getCertificateById(trimmedId);
        if (cancelled) return;
        const raw = result.data;
        const payload = raw?.data ?? raw;
        const storedCertificateId = (payload?.certificateId != null && String(payload.certificateId).trim())
          ? String(payload.certificateId).trim()
          : trimmedId;
        const fullName = payload?.fullName ?? raw?.fullName ?? '';
        const dateIssued = payload?.dateIssued ?? raw?.dateIssued ?? '';
        if (result.success && (fullName || dateIssued)) {
          const img = await loadCertificateImage();
          if (cancelled) return;
          const canvas = await drawCertificateToCanvas(img, fullName, dateIssued, storedCertificateId);
          setCertificateUrl(canvas.toDataURL('image/png'));
          setData({
            fullName: formatCertificateDisplayName(fullName),
            dateIssued,
            certificateId: storedCertificateId,
          });
          setLoading(false);
          return;
        }
        if (stateCertificate?.certificateId && (stateCertificate?.fullName || stateCertificate?.dateIssued)) {
          const fullNameFallback = stateCertificate.fullName || '';
          const dateIssuedFallback = stateCertificate.dateIssued || '';
          const idFallback = String(stateCertificate.certificateId || trimmedId).trim();
          const img = await loadCertificateImage();
          if (cancelled) return;
          const canvas = await drawCertificateToCanvas(img, fullNameFallback, dateIssuedFallback, idFallback);
          setCertificateUrl(canvas.toDataURL('image/png'));
          setData({
            fullName: formatCertificateDisplayName(fullNameFallback),
            dateIssued: dateIssuedFallback,
            certificateId: idFallback,
          });
          setLoading(false);
          return;
        }
        if (import.meta.env.DEV && result.status === 404) {
          console.warn('[CertificateViewPage] 404 — requested id:', trimmedId, 'response:', result.data);
        }
        setError(true);
      } catch (e) {
        if (cancelled) {
          setLoading(false);
          return;
        }
        if (stateCertificate?.certificateId && (stateCertificate?.fullName || stateCertificate?.dateIssued)) {
          const fullNameFallback = stateCertificate.fullName || '';
          const dateIssuedFallback = stateCertificate.dateIssued || '';
          const idFallback = String(stateCertificate.certificateId || trimmedId).trim();
          try {
            const img = await loadCertificateImage();
            if (cancelled) return;
            const canvas = await drawCertificateToCanvas(img, fullNameFallback, dateIssuedFallback, idFallback);
            setCertificateUrl(canvas.toDataURL('image/png'));
            setData({
            fullName: formatCertificateDisplayName(fullNameFallback),
            dateIssued: dateIssuedFallback,
            certificateId: idFallback,
          });
          } catch (imgErr) {
            if (import.meta.env.DEV) console.warn('[CertificateViewPage]', imgErr);
            setError(true);
          }
        } else {
          if (import.meta.env.DEV) console.warn('[CertificateViewPage]', trimmedId, e);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, location.state]);

  const handleDownloadPng = async () => {
    if (!data) return;
    const placeholder = openCommunityRedirectPlaceholder();
    setDownloading('png');
    try {
      await downloadCertificatePng(data.fullName, data.dateIssued, data.certificateId);
      navigatePlaceholderToCommunity(placeholder);
    } catch (e) {
      console.error(e);
      closeCommunityRedirectPlaceholder(placeholder);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    const placeholder = openCommunityRedirectPlaceholder();
    setDownloading('pdf');
    try {
      await downloadCertificatePdf(data.fullName, data.dateIssued, data.certificateId);
      navigatePlaceholderToCommunity(placeholder);
    } catch (e) {
      console.error(e);
      closeCommunityRedirectPlaceholder(placeholder);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Back link */}
        <Link
          to="/webinar/certificates"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" aria-hidden />
          My Certificates
        </Link>

        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Certificate of Completion</h1>
          <p className="text-sm text-gray-500 mt-1">Certified GuideXpert Career Counsellor</p>
        </div>

        <div className="space-y-4">
          {/* Certificate image card */}
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            {certificateUrl && (
              <img
                src={certificateUrl}
                alt={`Certificate for ${data?.fullName}`}
                className="w-full h-auto block"
              />
            )}
          </div>

          {/* Info + actions card */}
          {data && (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              {/* Verified banner */}
              <div className="flex items-center gap-3 px-5 py-3.5 bg-green-50 border-b border-green-100">
                <FiCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden />
                <span className="text-sm font-semibold text-green-800">Verified Certificate</span>
                <span className="ml-auto text-xs text-green-600 font-medium">GuideXpert</span>
              </div>

              {/* Details grid */}
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiUser className="w-4 h-4 text-primary-navy" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Recipient</p>
                    <p className="text-lg font-semibold text-gray-800 mt-0.5">{data.fullName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiCalendar className="w-4 h-4 text-primary-navy" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Date Issued</p>
                    <p className="text-base font-semibold text-gray-800 mt-0.5">{data.dateIssued}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <span className="w-8 h-8 rounded-lg bg-primary-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiHash className="w-4 h-4 text-primary-navy" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Certificate ID</p>
                    <p className="text-base font-mono text-gray-600 mt-0.5 break-all">{data.certificateId}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={!!downloading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-navy text-white text-sm font-medium hover:bg-primary-navy/90 disabled:opacity-60 transition-colors shadow-sm"
                >
                  <FiDownload className="w-4 h-4" aria-hidden />
                  {downloading === 'png' ? 'Preparing…' : 'Download PNG'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!!downloading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 disabled:opacity-60 transition-colors"
                >
                  <FiDownload className="w-4 h-4" aria-hidden />
                  {downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}
                </button>
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 py-2">
            This certificate was officially issued by GuideXpert. The unique Certificate ID above can be used to verify authenticity.
          </p>
        </div>
      </div>
    </div>
  );
}
