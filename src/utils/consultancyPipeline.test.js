import test from 'node:test';
import assert from 'node:assert/strict';
import { boardCounts, consultancyBoardStage, consultancyStage, matchesBoardStage, matchesPipeline, pipelineCounts, pipelineLabel } from './consultancyPipeline.js';

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

test('directory stages follow the consultancy status when no pipeline stage is stored', () => {
  const counts = boardCounts([
    { followUpStatus: 'Fresh Lead' },
    { followUpStatus: 'Contacted' },
    { followUpStatus: 'Meeting Scheduled' },
    { followUpStatus: 'Meeting Completed' },
    { followUpStatus: 'On - Boarded' },
    { followUpStatus: 'Onboarding in Progress' },
    { pipelineStage: 'fresh', followUpStatus: 'On - Boarded' },
  ]);
  assert.deepEqual(counts, {
    total: 7,
    fresh: 2,
    contacted: 2,
    meeting_done: 1,
    onboarded: 2,
  });
  assert.equal(consultancyBoardStage({ followUpStatus: 'Meeting Completed' }), 'meeting_done');
  assert.equal(matchesBoardStage({ followUpStatus: 'Fresh Lead' }, 'total'), true);
  assert.equal(matchesBoardStage({ followUpStatus: 'On - Boarded' }, 'onboarded'), true);
  assert.equal(matchesBoardStage({ followUpStatus: 'Contacted' }, 'fresh'), false);
});
