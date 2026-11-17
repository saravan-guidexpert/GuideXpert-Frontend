import OverallScoreCard from './report/OverallScoreCard';
import ResultActions from './report/ResultActions';
import ResultPageHeader from './report/ResultPageHeader';
import SectionPerformanceCard from './report/SectionPerformanceCard';
import StudentIdentity from './report/StudentIdentity';
import TimeAnalysis from './report/TimeAnalysis';

function recordedMarksLine(overall, mcq, numerical) {
  const numbers = [overall, mcq, numerical].every((value) => typeof value === 'number' && Number.isFinite(value));
  if (!numbers) return null;
  const addsUp = Math.abs(overall - (mcq + numerical)) < 0.05;
  if (!addsUp) return null;
  return `MCQ contributes ${mcq} marks and Numerical contributes ${numerical} marks to the overall ${overall}.`;
}

export default function AttemptedDashboard({
  result,
  onDownload,
  downloading,
  downloadError,
  downloadReady,
  onLogout,
  loggingOut,
}) {
  const insight = recordedMarksLine(result.overall?.obtained, result.mcq?.obtained, result.numerical?.obtained);

  return (
    <div className="jee-result-report flex flex-col gap-2">
      <ResultPageHeader onLogout={onLogout} loggingOut={loggingOut} />
      <StudentIdentity name={result.studentName} invitedOn={result.invitedOn} />
      <OverallScoreCard
        obtained={result.overall?.obtained}
        total={result.overall?.total}
        percentage={result.overall?.percentage}
      />
      <section className="grid grid-cols-1 gap-2 md:grid-cols-2" aria-label="Section performance">
        <SectionPerformanceCard
          kind="mcq"
          title="MCQ section"
          obtained={result.mcq?.obtained}
          total={result.mcq?.total}
          durationMinutes={result.mcq?.durationMinutes}
        />
        <SectionPerformanceCard
          kind="numerical"
          title="Numerical section"
          obtained={result.numerical?.obtained}
          total={result.numerical?.total}
          durationMinutes={result.numerical?.durationMinutes}
        />
      </section>
      <TimeAnalysis
        overallMinutes={result.overall?.durationMinutes}
        allottedMinutes={result.overall?.allottedMinutes}
        mcqMinutes={result.mcq?.durationMinutes}
        numericalMinutes={result.numerical?.durationMinutes}
      />
      {insight && <p className="px-1 text-sm leading-5 text-[#69798A]">{insight}</p>}
      <ResultActions
        onDownload={onDownload}
        downloading={downloading}
        downloadError={downloadError}
        downloadReady={downloadReady}
      />
    </div>
  );
}
