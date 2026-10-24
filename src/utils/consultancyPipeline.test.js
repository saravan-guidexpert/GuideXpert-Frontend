import test from 'node:test';
import assert from 'node:assert/strict';
import { consultancyStage, matchesPipeline, pipelineCounts, pipelineLabel } from './consultancyPipeline.js';

test('pipeline counts keep every stage and treat a missing stage as fresh', () => {
  const counts = pipelineCounts([
    { pipelineStage: 'fresh' },
    { pipelineStage: 'contacted' },
    { pipelineStage: 'meeting_done' },
    { pipelineStage: 'onboarded' },
    {},
    { pipelineStage: 'unknown' },
  ]);
  assert.deepEqual(counts, {
    total: 6,
    fresh: 3,
    contacted: 1,
    meeting_done: 1,
    onboarded: 1,
  });
  assert.equal(consultancyStage('meeting_done'), 'meeting_done');
  assert.equal(pipelineLabel('onboarded'), 'Onboarded');
  assert.equal(matchesPipeline({ pipelineStage: 'contacted' }, 'contacted'), true);
  assert.equal(matchesPipeline({ pipelineStage: 'fresh' }, 'all'), true);
  assert.equal(matchesPipeline({}, 'fresh'), true);
});
