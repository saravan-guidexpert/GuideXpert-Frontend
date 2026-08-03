import { useMemo } from 'react';
import { useLeadDetails } from '../../../hooks/useLeadDetails';
import { useLeadTranscript } from '../../../hooks/useLeadTranscript';
import LeadChatHeader from './LeadChatHeader';
import LeadChatTranscript from './LeadChatTranscript';
import LeadDetailsSidebar from './LeadDetailsSidebar';
import { flattenRecentEvents, LI } from './leadIntelligenceUtils';

export default function LeadSelectedColumns({ phone, onClose }) {
  const { details, loading, error, retry } = useLeadDetails(phone);
  const {
    messages,
    loading: transcriptLoading,
    error: transcriptError,
    retry: retryTranscript,
  } = useLeadTranscript(phone);

  const profile = details?.profile || null;
  const score = details?.score || null;
  const eventRows = useMemo(
    () => flattenRecentEvents(details?.recentEvents || []),
    [details?.recentEvents]
  );
  const displayName = details?.name || profile?.name || 'Unknown lead';

  return (
    <>
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-[#E5E7EB] bg-white">
        <LeadChatHeader displayName={displayName} phone={phone} onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-hidden">
          <LeadChatTranscript
            messages={messages}
            loading={transcriptLoading}
            error={transcriptError}
            onRetry={retryTranscript}
            contactName={displayName}
          />
        </div>
      </section>

      <section className={`flex min-h-0 flex-col overflow-hidden ${LI.bg}`}>
        <LeadDetailsSidebar
          phone={phone}
          details={details}
          score={score}
          profile={profile}
          eventRows={eventRows}
          loading={loading}
          error={error}
          onRetry={retry}
        />
      </section>
    </>
  );
}
