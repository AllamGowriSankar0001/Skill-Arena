function parsePracticeSeriesTitle(title) {
  const trimmed = String(title || '').trim();
  if (!trimmed) {
    return { baseTitle: '', seriesPart: 1, isContinuation: false };
  }

  const patterns = [
    { regex: /\s+(?:part|pt\.?)\s*(\d+)\s*$/i, minPart: 1 },
    { regex: /\s+(?:vol\.?|volume)\s*(\d+)\s*$/i, minPart: 1 },
    { regex: /\s+#(\d+)\s*$/, minPart: 2 },
    { regex: /\s+-\s*(\d+)\s*$/, minPart: 2 },
    {
      regex: /\s+(\d+)\s*$/,
      minPart: 2,
      requireBaseSuffix: /\b(?:set|practice|quiz|drill|challenge|session|round|pack)\s*$/i,
    },
  ];

  for (const { regex, minPart, requireBaseSuffix } of patterns) {
    const match = trimmed.match(regex);
    if (!match) continue;

    const seriesPart = parseInt(match[1], 10);
    if (!Number.isFinite(seriesPart) || seriesPart < minPart) continue;

    const baseTitle = trimmed.slice(0, match.index).trim();
    if (!baseTitle) continue;
    if (requireBaseSuffix && !requireBaseSuffix.test(baseTitle)) continue;

    return {
      baseTitle,
      seriesPart,
      isContinuation: seriesPart >= 2,
    };
  }

  return { baseTitle: trimmed, seriesPart: 1, isContinuation: false };
}

function normalizeSeriesBaseTitle(baseTitle) {
  return String(baseTitle || '').trim().toLowerCase();
}

function getAssessmentSeriesPart(assessment) {
  if (assessment.seriesPart) return assessment.seriesPart;
  return parsePracticeSeriesTitle(assessment.title).seriesPart;
}

function getAssessmentSeriesBaseTitle(assessment) {
  if (assessment.seriesBaseTitle) return assessment.seriesBaseTitle;
  return parsePracticeSeriesTitle(assessment.title).baseTitle;
}

module.exports = {
  parsePracticeSeriesTitle,
  normalizeSeriesBaseTitle,
  getAssessmentSeriesPart,
  getAssessmentSeriesBaseTitle,
};
