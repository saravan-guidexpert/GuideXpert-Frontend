export const CONSULTANCY_PIPELINE = Object.freeze([
  { id: 'fresh', label: 'Fresh', hint: 'Not contacted yet', tone: 'fresh' },
  { id: 'contacted', label: 'Contacted', hint: 'A conversation has started', tone: 'contacted' },
  { id: 'meeting_done', label: 'Meeting done', hint: 'A meeting is complete', tone: 'meeting' },
  { id: 'onboarded', label: 'Onboarded', hint: 'Working with GuideXpert', tone: 'onboarded' },
]);

const STAGE_IDS = CONSULTANCY_PIPELINE.map((stage) => stage.id);

/** Demo follow-up labels grouped into the directory stages. */
export const FOLLOW_UP_STAGE_GROUPS = Object.freeze([
  { id: 'fresh', statuses: Object.freeze(['Fresh Lead']) },
  { id: 'contacted', statuses: Object.freeze(['Contacted', 'Follow-up Required', 'Interested', 'Not Interested', 'On Hold', 'Discontinued', 'Meeting Scheduled']) },
  { id: 'meeting_done', statuses: Object.freeze(['Meeting Completed']) },
  { id: 'onboarded', statuses: Object.freeze(['Onboarding in Progress', 'On - Boarded']) },
]);

const FOLLOW_UP_STAGE = Object.freeze(Object.fromEntries(
  FOLLOW_UP_STAGE_GROUPS.flatMap((group) => group.statuses.map((status) => [status, group.id])),
));

export function consultancyStage(value) {
  return STAGE_IDS.includes(value) ? value : 'fresh';
}

export function pipelineLabel(value) {
  const stage = consultancyStage(value);
  return CONSULTANCY_PIPELINE.find((item) => item.id === stage).label;
}

export function pipelineTone(value) {
  const stage = consultancyStage(value);
  return CONSULTANCY_PIPELINE.find((item) => item.id === stage).tone;
}

export function pipelineCounts(rows) {
  const counts = { total: 0, fresh: 0, contacted: 0, meeting_done: 0, onboarded: 0 };
  (rows || []).forEach((row) => {
    counts.total += 1;
    counts[consultancyStage(row && row.pipelineStage)] += 1;
  });
  return counts;
}

export function matchesPipeline(row, stage) {
  if (!stage || stage === 'all') return true;
  return consultancyStage(row && row.pipelineStage) === stage;
}

export function consultancyBoardStage(row) {
  if (row && row.pipelineStored === false) return null;
  if (row && STAGE_IDS.includes(row.pipelineStage)) return row.pipelineStage;
  return FOLLOW_UP_STAGE[row && row.followUpStatus] || 'fresh';
}

export function boardCounts(rows) {
  const counts = { total: 0, fresh: 0, contacted: 0, meeting_done: 0, onboarded: 0 };
  (rows || []).forEach((row) => {
    counts.total += 1;
    const stage = consultancyBoardStage(row);
    if (stage && counts[stage] != null) counts[stage] += 1;
  });
  return counts;
}

export function matchesBoardStage(row, stage) {
  if (!stage || stage === 'all' || stage === 'total') return true;
  const current = consultancyBoardStage(row);
  if (!current) return false;
  return current === stage;
}
