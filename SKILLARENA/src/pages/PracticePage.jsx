import { useEffect, useMemo, useState } from 'react'
import AppEmptyState from '../components/AppEmptyState'
import BoneyardSkeleton from '../components/BoneyardSkeleton'
import PracticeCard from '../components/PracticeCard'
import { MOCK_PRACTICE } from '../fixtures/skeletonFixtures'
import { learningApi } from '../services/api'
import useCodingViewportAllowed from '../hooks/useCodingViewportAllowed'
import './PracticePage.css'

const PRACTICE_CARD_FIXTURE = <PracticeCard assessment={MOCK_PRACTICE} asLink={false} />
const SKELETON_COUNT = 6

const MODE_TABS = [
  { id: 'all', label: 'All types' },
  { id: 'QUIZ', label: 'MCQ Quiz' },
  { id: 'CODING', label: 'Coding' },
  { id: 'MIXED', label: 'Mixed' },
]

const DIFFICULTY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'EASY', label: 'Easy' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HARD', label: 'Hard' },
  { id: 'MIXED', label: 'Mixed' },
]

const PracticePage = () => {
  const codingViewportAllowed = useCodingViewportAllowed()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [skillFilter, setSkillFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')

  useEffect(() => {
    learningApi
      .listPractice()
      .then((data) => setAssessments(data.assessments || []))
      .catch((err) => setError(err.message || 'Failed to load practice sets'))
      .finally(() => setLoading(false))
  }, [])

  const skills = useMemo(() => {
    const map = new Map()
    assessments.forEach((item) => {
      if (item.skillId && item.skillName) {
        map.set(item.skillId, item.skillName)
      }
    })
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [assessments])

  const stats = useMemo(() => {
    const quiz = assessments.filter((item) => item.mode === 'QUIZ').length
    const coding = assessments.filter((item) => item.mode === 'CODING').length
    const passed = assessments.filter((item) => item.passed).length
    return { quiz, coding, passed }
  }, [assessments])

  const filteredAssessments = useMemo(
    () =>
      assessments.filter((item) => {
        if (skillFilter !== 'all' && item.skillId !== skillFilter) return false
        if (difficultyFilter !== 'all' && item.difficulty !== difficultyFilter) return false
        if (modeFilter !== 'all' && item.mode !== modeFilter) return false
        return true
      }),
    [assessments, skillFilter, difficultyFilter, modeFilter],
  )

  const hasActiveFilters =
    skillFilter !== 'all' || difficultyFilter !== 'all' || modeFilter !== 'all'

  const clearFilters = () => {
    setSkillFilter('all')
    setDifficultyFilter('all')
    setModeFilter('all')
  }

  return (
    <main className="practice-page">
      <div className="practice-page-inner">
        <header className="practice-page-header">
          <div className="practice-header-copy">
            <p className="practice-eyebrow">Practice</p>
            <h1>Drills, quizzes & coding challenges</h1>
            <p className="practice-lead">
              Sharpen skills with industry-style MCQ sets and hands-on coding exercises. Track your
              best scores and earn XP when you pass.
            </p>
          </div>
          {!loading && assessments.length ? (
            <div className="practice-header-pills">
              <span className="practice-pill practice-pill--count">
                {assessments.length} set{assessments.length === 1 ? '' : 's'}
              </span>
              {stats.quiz ? <span className="practice-pill">{stats.quiz} quiz</span> : null}
              {stats.coding ? <span className="practice-pill">{stats.coding} coding</span> : null}
              {stats.passed ? (
                <span className="practice-pill practice-pill--passed">{stats.passed} passed</span>
              ) : null}
            </div>
          ) : null}
        </header>

        {!loading && assessments.length ? (
          <div className="practice-toolbar">
            <div className="practice-toolbar-head">
              <h2 className="practice-toolbar-title">Filter practice sets</h2>
              {hasActiveFilters ? (
                <button type="button" className="practice-clear-btn" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>

            <div className="practice-mode-tabs" role="tablist" aria-label="Practice type">
              {MODE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={modeFilter === tab.id}
                  className={`practice-mode-tab${modeFilter === tab.id ? ' is-active' : ''}`}
                  onClick={() => setModeFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="practice-filters-row">
              <label className="practice-filter">
                <span>Skill track</span>
                <div className="practice-select-wrap">
                  <select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}>
                    <option value="all">All skills</option>
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <div className="practice-filter practice-filter--difficulty">
                <span id="practice-difficulty-label">Difficulty</span>
                <div
                  className="practice-difficulty-tabs"
                  role="group"
                  aria-labelledby="practice-difficulty-label"
                >
                  {DIFFICULTY_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`practice-difficulty-tab${
                        difficultyFilter === tab.id ? ' is-active' : ''
                      }`}
                      onClick={() => setDifficultyFilter(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="practice-results-copy" aria-live="polite">
              Showing {filteredAssessments.length} of {assessments.length} practice set
              {assessments.length === 1 ? '' : 's'}
            </p>
          </div>
        ) : null}

        {error ? <p className="practice-alert practice-alert--error">{error}</p> : null}

        {loading ? (
          <div className="practice-grid" aria-busy="true" aria-label="Loading practice sets">
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <BoneyardSkeleton
                key={index}
                name="practice-card"
                loading
                fixture={PRACTICE_CARD_FIXTURE}
                className="practice-card-skeleton-wrap"
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && filteredAssessments.length ? (
          <div className="practice-grid">
            {filteredAssessments.map((assessment) => (
              <PracticeCard
                key={assessment.id}
                assessment={assessment}
                showDesktopBadge={assessment.mode === 'CODING' && !codingViewportAllowed}
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && assessments.length && !filteredAssessments.length ? (
          <AppEmptyState
            icon="🔍"
            title="No matches"
            description="Try changing your filters to see more practice sets."
            action={
              hasActiveFilters ? (
                <button type="button" className="practice-empty-btn" onClick={clearFilters}>
                  Clear all filters
                </button>
              ) : null
            }
          />
        ) : null}

        {!loading && !error && !assessments.length ? (
          <AppEmptyState
            icon="🎯"
            title="No practice available"
            description="There are no published practice sets yet. New drills and challenges will appear here when they are ready."
          />
        ) : null}
      </div>
    </main>
  )
}

export default PracticePage
