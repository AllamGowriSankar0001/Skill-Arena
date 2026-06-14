function calculateLevel(totalXp) {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

function calculateLevelProgress(totalXp) {
  const level = calculateLevel(totalXp);
  const currentLevelMinXp = (level - 1) ** 2 * 100;
  const nextLevelMinXp = level ** 2 * 100;

  return {
    level,
    currentLevelXp: totalXp - currentLevelMinXp,
    nextLevelXp: nextLevelMinXp - currentLevelMinXp,
  };
}

function rankFromLevel(level) {
  if (level >= 20) return 'Diamond';
  if (level >= 15) return 'Platinum';
  if (level >= 10) return 'Gold';
  if (level >= 5) return 'Silver';
  return 'Bronze';
}

module.exports = {
  calculateLevel,
  calculateLevelProgress,
  rankFromLevel,
};
