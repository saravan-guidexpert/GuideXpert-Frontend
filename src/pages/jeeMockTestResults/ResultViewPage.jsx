import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AttemptedDashboard from '../../components/jeeMockTestResults/AttemptedDashboard';
import NotAttemptedState from '../../components/jeeMockTestResults/NotAttemptedState';
import ResultPendingState from '../../components/jeeMockTestResults/ResultPendingState';
import ResultsShell from '../../components/jeeMockTestResults/ResultsShell';
import ResultErrorState from '../../components/jeeMockTestResults/report/ResultErrorState';
import ResultLoadingSkeleton from '../../components/jeeMockTestResults/report/ResultLoadingSkeleton';
import ScoreInsightModal from '../../components/jeeMockTestResults/ScoreInsightModal';
import {
  downloadMockTestResultPdf,
  getMockTestResult,
  getResultOtpStatus,
  logoutMockTestResult,
} from '../../utils/jeeMockTestResultsApi';
import { scorePopupKind } from '../../utils/jeeMockTestResultFormat';

export default function ResultViewPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [downloadReady, setDownloadReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [insightDismissed, setInsightDismissed] = useState(false);

  const load = useCallback(async () => {
    setPhase('loading');
    setResult(null);
    setLoadError('');
    setInsightDismissed(false);
    const response = await getMockTestResult();
    if (response.ok && response.data?.result) {
      setResult(response.data.result);
      setPhase('ready');
      return;
    }
    if (response.status === 401 && response.data?.code === 'SESSION_EXPIRED') {
      const pending = await getResultOtpStatus();
      navigate(pending.ok ? '/jee-mock-test/results/verify' : '/jee-mock-test/results', { replace: true });
      return;
    }
    if (response.status === 401 || response.status === 403) {
      navigate('/jee-mock-test/results', { replace: true });
      return;
    }
    setLoadError(response.data?.message || 'Unable to load your result. Please try again.');
    setPhase('error');
  }, [navigate]);

  useEffect(() => {
    load();
    function onPageShow(event) {
      if (event.persisted) load();
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [load]);

  async function leave(destination) {
    setLeaving(true);
    await logoutMockTestResult();
    navigate(destination, { replace: true });
  }

  async function onDownload() {
    setDownloading(true);
    setDownloadError('');
    setDownloadReady(false);
    const response = await downloadMockTestResultPdf();
    setDownloading(false);
    if (!response.ok || !response.blob) {
      setDownloadError(response.message || 'The result PDF is not available.');
      return;
    }
    setDownloadReady(true);
    const url = URL.createObjectURL(response.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'JEE-Main-Mock-Test-Result.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const insightKind = phase === 'ready' && result?.eligibility === 'REGISTERED_ATTEMPTED'
    ? scorePopupKind(result.overall?.obtained)
    : null;
  const showInsight = Boolean(insightKind) && !insightDismissed;

  const reportLayout = phase === 'loading' || (phase === 'ready' && result?.eligibility === 'REGISTERED_ATTEMPTED');

  let body = <ResultLoadingSkeleton />;
  if (phase === 'error') {
    body = <ResultErrorState message={loadError} onRetry={load} />;
  } else if (phase === 'ready' && result?.eligibility === 'REGISTERED_ATTEMPTED') {
    body = (
      <AttemptedDashboard
        result={result}
        onDownload={onDownload}
        downloading={downloading}
        downloadError={downloadError}
        downloadReady={downloadReady}
        onLogout={() => leave('/jee-mock-test/results')}
        loggingOut={leaving}
      />
    );
  } else if (phase === 'ready' && result?.eligibility === 'REGISTERED_NOT_ATTEMPTED') {
    body = (
      <NotAttemptedState
        studentName={result.studentName}
        onLeave={() => leave('/')}
        leaving={leaving}
      />
    );
  } else if (phase === 'ready' && result?.eligibility === 'RESULT_PENDING') {
    body = (
      <ResultPendingState
        studentName={result.studentName}
        onLeave={() => leave('/')}
        leaving={leaving}
      />
    );
  } else if (phase === 'ready') {
    body = (
      <div>
        <h1 className="text-[1.7rem] font-semibold tracking-tight">Result access is not available</h1>
        <p className="mt-3 text-[15px] leading-6 text-[#243646]">
          Your registration is not complete, so there is no result or registration confirmation to show.
        </p>
        <button type="button" className="mt-6 text-sm font-semibold text-[#003366]" onClick={() => leave('/jee-mock-test/results')}>
          Start again
        </button>
      </div>
    );
  }

  return (
    <ResultsShell title="JEE Main Mock Test Result | GuideXpert" logoLinksHome={false} dense hideLogo={reportLayout} wide={reportLayout}>
      <div inert={showInsight ? true : undefined} aria-hidden={showInsight || undefined}>
        {body}
      </div>
      {showInsight && (
        <ScoreInsightModal
          kind={insightKind}
          onClose={() => setInsightDismissed(true)}
        />
      )}
    </ResultsShell>
  );
}
