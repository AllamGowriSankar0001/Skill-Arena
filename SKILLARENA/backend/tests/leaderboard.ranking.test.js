const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Re-implement ranking helper expectations by requiring service export after patch
const leaderboardServicePath = require.resolve('../src/services/leaderboardService');
delete require.cache[leaderboardServicePath];

// Export helper by reading file module after we add it to exports
const leaderboardService = require('../src/services/leaderboardService');

describe('course leaderboard ranking ties', () => {
  test('exports isEnrollmentAhead helper', () => {
    assert.equal(typeof leaderboardService.isEnrollmentAhead, 'function');
  });

  test('higher progress ranks ahead', () => {
    const ahead = leaderboardService.isEnrollmentAhead(
      { progressPercentage: 80, completedLessonCount: 1, lastAccessedAt: new Date('2020-01-01') },
      { progressPercentage: 50, completedLessonCount: 10, lastAccessedAt: new Date('2026-01-01') },
    );
    assert.equal(ahead, true);
  });

  test('equal progress uses completedLessonCount', () => {
    const ahead = leaderboardService.isEnrollmentAhead(
      { progressPercentage: 50, completedLessonCount: 5, lastAccessedAt: new Date('2020-01-01') },
      { progressPercentage: 50, completedLessonCount: 4, lastAccessedAt: new Date('2026-01-01') },
    );
    assert.equal(ahead, true);
  });

  test('equal progress and lessons uses lastAccessedAt', () => {
    const ahead = leaderboardService.isEnrollmentAhead(
      { progressPercentage: 50, completedLessonCount: 4, lastAccessedAt: new Date('2026-02-01') },
      { progressPercentage: 50, completedLessonCount: 4, lastAccessedAt: new Date('2026-01-01') },
    );
    assert.equal(ahead, true);
  });

  test('missing numeric values are treated as zero', () => {
    const ahead = leaderboardService.isEnrollmentAhead(
      { progressPercentage: null, completedLessonCount: undefined },
      { progressPercentage: 0, completedLessonCount: 0 },
    );
    assert.equal(ahead, false);
  });
});
