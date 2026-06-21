export const MOCK_COURSE = {
  id: 'course-fixture',
  title: 'Full-Stack JavaScript Mastery',
  shortDescription: 'Build production-ready apps with React, Node, and modern tooling.',
  thumbnailUrl: '',
  level: 'INTERMEDIATE',
  lessonCount: 24,
  estimatedMinutes: 480,
  ratingAverage: 4.8,
}

export const MOCK_PRACTICE = {
  id: 'practice-fixture',
  title: 'React Hooks Deep Dive',
  description: 'Master useState, useEffect, and custom hooks with real-world scenarios.',
  skillName: 'React',
  difficulty: 'MEDIUM',
  mode: 'QUIZ',
  seriesPart: 1,
  questionCount: 12,
  xpReward: 50,
  passed: false,
  bestScore: null,
}

export const MOCK_COMMUNITY_MESSAGE = {
  id: 'message-fixture',
  content: 'Has anyone finished the async module? Looking for study partners this week.',
  createdAt: new Date().toISOString(),
  author: {
    name: 'Alex Rivera',
    avatarUrl: '',
    rankLabel: 'Level 5',
  },
  isAdminMessage: false,
}
