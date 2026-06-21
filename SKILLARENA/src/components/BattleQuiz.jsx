import { useEffect, useMemo, useState } from 'react'
import './BattleQuiz.css'

const isQuestionAnswered = (question, answers) => Boolean(answers[question.id])

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const BattleQuiz = ({
  questions = [],
  remainingSeconds,
  onSubmit,
  submitting = false,
  submitted = false,
  result = null,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})

  const currentQuestion = questions[currentIndex]
  const answeredCount = useMemo(
    () => questions.filter((question) => isQuestionAnswered(question, answers)).length,
    [questions, answers],
  )
  const allAnswered = answeredCount === questions.length && questions.length > 0
  const timerClass =
    remainingSeconds != null && remainingSeconds <= 30 ? ' battle-timer--urgent' : ''

  const handleSelect = (questionId, optionId) => {
    if (submitted || submitting) return
    setAnswers((current) => ({ ...current, [questionId]: optionId }))
  }

  const handleSubmit = () => {
    if (!allAnswered || submitted || submitting) return
    onSubmit(answers)
  }

  if (submitted && result) {
    return (
      <div className="battle-quiz battle-quiz--done">
        <div className="battle-quiz-result">
          <p className="battle-quiz-result-label">Your score</p>
          <p className="battle-quiz-result-score">
            {result.correctCount}/{questions.length}
          </p>
          <p className="battle-quiz-result-meta">
            {result.percentage}% · Waiting for other players to finish…
          </p>
        </div>
      </div>
    )
  }

  if (!questions.length) {
    return <div className="battle-quiz-empty">Questions are loading…</div>
  }

  return (
    <div className="battle-quiz">
      <div className="battle-quiz-header">
        <div className={`battle-timer${timerClass}`} aria-live="polite">
          <span className="battle-timer-label">Time left</span>
          <span className="battle-timer-value">
            {remainingSeconds != null ? formatTime(remainingSeconds) : '--:--'}
          </span>
        </div>
        <div className="battle-quiz-progress">
          {answeredCount}/{questions.length} answered
        </div>
      </div>

      <div className="battle-quiz-nav">
        {questions.map((question, index) => (
          <button
            key={question.id}
            type="button"
            className={`battle-quiz-dot${index === currentIndex ? ' is-active' : ''}${
              isQuestionAnswered(question, answers) ? ' is-answered' : ''
            }`}
            onClick={() => setCurrentIndex(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {currentQuestion ? (
        <article className="battle-quiz-card">
          <p className="battle-quiz-prompt">{currentQuestion.prompt}</p>
          <div className="battle-quiz-options">
            {(currentQuestion.options || []).map((option) => (
              <button
                key={option.optionId}
                type="button"
                className={`battle-quiz-option${
                  answers[currentQuestion.id] === option.optionId ? ' is-selected' : ''
                }`}
                onClick={() => handleSelect(currentQuestion.id, option.optionId)}
                disabled={submitted || submitting}
              >
                {option.text}
              </button>
            ))}
          </div>
        </article>
      ) : null}

      <div className="battle-quiz-actions">
        <button
          type="button"
          className="battle-quiz-nav-btn"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
        >
          Previous
        </button>
        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            className="battle-quiz-nav-btn battle-quiz-nav-btn--primary"
            onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            className="battle-quiz-nav-btn battle-quiz-nav-btn--submit"
            disabled={!allAnswered || submitting || submitted}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit answers'}
          </button>
        )}
      </div>
    </div>
  )
}

export default BattleQuiz
