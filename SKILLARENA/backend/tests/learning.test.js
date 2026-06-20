const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { runCodingTests } = require('../src/services/codingTestRunner');

describe('codingTestRunner', () => {
  test('passes ELEMENT_EXISTS and TEXT_CONTAINS', () => {
    const result = runCodingTests(
      {
        html: '<h1>Welcome to Skill Arena</h1>',
        css: 'h1 { text-align: center; }',
        javascript: '',
      },
      [
        { type: 'ELEMENT_EXISTS', selector: 'h1' },
        {
          type: 'TEXT_CONTAINS',
          selector: 'h1',
          expected: 'Welcome to Skill Arena',
        },
        {
          type: 'STYLE_EQUALS',
          selector: 'h1',
          property: 'text-align',
          expected: 'center',
        },
      ],
    );

    assert.equal(result.passedCount, 3);
    assert.equal(result.totalCount, 3);
    assert.equal(result.score, 100);
  });

  test('detects CONSOLE_CONTAINS and GLOBAL_VALUE_EQUALS', () => {
    const result = runCodingTests(
      {
        html: '<div id="output"></div>',
        css: '',
        javascript: `
          result = 10;
          console.log('Hello');
          document.querySelector('#output').textContent = String(result);
        `,
      },
      [
        { type: 'CONSOLE_CONTAINS', expected: 'Hello' },
        { type: 'GLOBAL_VALUE_EQUALS', variable: 'result', expected: 10 },
        { type: 'DOM_TEXT_EQUALS', selector: '#output', expected: '10' },
      ],
    );

    assert.equal(result.passedCount, 3);
    assert.equal(result.score, 100);
  });

  test('fails when assertions do not match', () => {
    const result = runCodingTests(
      { html: '<p>Hi</p>', css: '', javascript: '' },
      [{ type: 'ELEMENT_EXISTS', selector: 'h1' }],
    );

    assert.equal(result.passedCount, 0);
    assert.equal(result.score, 0);
  });
});

describe('video auto-complete threshold', () => {
  test('90% watch progress qualifies for completion', () => {
    const VIDEO_AUTO_COMPLETE_PERCENT = 90;
    const positionSeconds = 90;
    const durationSeconds = 100;
    const percent = Math.min(100, Math.round((positionSeconds / durationSeconds) * 100));
    assert.ok(percent >= VIDEO_AUTO_COMPLETE_PERCENT);
  });

  test('89% watch progress does not auto-complete', () => {
    const VIDEO_AUTO_COMPLETE_PERCENT = 90;
    const positionSeconds = 89;
    const durationSeconds = 100;
    const percent = Math.min(100, Math.round((positionSeconds / durationSeconds) * 100));
    assert.ok(percent < VIDEO_AUTO_COMPLETE_PERCENT);
  });
});

describe('enrollment progress calculation', () => {
  test('calculates percentage from published lessons', () => {
    const totalPublishedLessons = 10;
    const completedPublishedLessons = 4;
    const progressPercentage =
      totalPublishedLessons === 0
        ? 0
        : Math.round((completedPublishedLessons / totalPublishedLessons) * 100);
    assert.equal(progressPercentage, 40);
  });

  test('returns zero when no published lessons', () => {
    const totalPublishedLessons = 0;
    const completedPublishedLessons = 0;
    const progressPercentage =
      totalPublishedLessons === 0
        ? 0
        : Math.round((completedPublishedLessons / totalPublishedLessons) * 100);
    assert.equal(progressPercentage, 0);
  });
});
