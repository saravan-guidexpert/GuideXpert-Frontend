export const CONSULTANCY_PIPELINE = Object.freeze([
  { id: 'fresh', label: 'Fresh', hint: 'Not contacted yet', tone: 'fresh' },
  { id: 'contacted', label: 'Contacted', hint: 'A conversation has started', tone: 'contacted' },
  { id: 'meeting_done', label: 'Meeting done', hint: 'A meeting is complete', tone: 'meeting' },
  { id: 'onboarded', label: 'Onboarded', hint: 'Working with GuideXpert', tone: 'onboarded' },
]);

const STAGE_IDS = CONSULTANCY_PIPELINE.map((stage) => stage.id);

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
