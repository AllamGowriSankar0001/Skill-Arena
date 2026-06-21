import { useEffect, useMemo, useState } from 'react'
import { learningApi } from '../services/api'
import './PracticeQuiz.css'

const QUESTION_TYPE_LABELS = {
  SINGLE_CHOICE: 'Single choice',
  MULTIPLE_CHOICE: 'Multiple select',
  TRUE_FALSE: 'True or false',
}

const isQuestionAnswered = (question, answers) => {
  const value = answers[question.id]
  if (question.type === 'MULTIPLE_CHOICE') {
    return Array.isArray(value) && value.length > 0
  }
  return Boolean(value)
}

const PracticeQuiz = ({ assessmentId, quiz, onCompleted, completionXpReward = 0 }) => {
  const questions = quiz?.questions || []
  const passingPercentage = quiz?.passingPercentage ?? 70

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [error, setError] = useState('')

  const showResults = Boolean(result)
  const currentQuestion = questions[currentIndex]
  const answeredCount = useMemo(
    () => questions.filter((question) => isQuestionAnswered(question, answers)).length,
    [questions, answers],
  )
  const allAnswered = answeredCount === questions.length && questions.length > 0
  const progressPercent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0

  const loadAttempts = async () => {
    if (!assessmentId) return
    try {
      const data = await learningApi.practiceQuizAttempts(assessmentId)
      setAttempts(data.attempts || [])
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadAttempts()
  }, [assessmentId])

  const getQuestionReview = (questionId) =>
    result?.explanations?.find((item) => item.questionId === questionId)

  const handleSingleSelect = (questionId, optionId) => {
    if (showResults) return
    setAnswers((current) => ({ ...current, [questionId]: optionId }))
  }

  const handleMultiSelect = (questionId, optionId) => {
    if (showResults) return
    setAnswers((current) => {
      const existing = Array.isArray(current[questionId]) ? current[questionId] : []
      const next = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId]
      return { ...current, [questionId]: next }
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const response = await learningApi.submitPracticeQuiz(assessmentId, answers)
      setResult(response)
      if (response.passed && onCompleted) {
        onCompleted(response)
      }
      await loadAttempts()
    } catch (err) {
      setError(err.message || 'Failed to submit practice')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setResult(null)
    setError('')
    setCurrentIndex(0)
  }

  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index)
    }
  }

  if (!questions.length) {
    return (
      <div className="practice-quiz-empty">
        <p>This practice set does not have any questions yet.</p>
      </div>
    )
  }

  if (showResults && result) {
    return (
      <div className="practice-quiz practice-quiz--results">
        <div className={`practice-quiz-score-card${result.passed ? ' is-passed' : ' is-failed'}`}>
          <div
            className="practice-quiz-score-ring"
            style={{ '--score': result.score }}
            aria-hidden="true"
          >
            <span>{result.score}%</span>
          </div>
          <div className="practice-quiz-score-copy">
            <p className="practice-quiz-score-label">
              {result.passed ? 'Practice passed' : 'Not passed yet'}
            </p>
            <h2>
              {result.correctCount} of {result.totalQuestions} correct
            </h2>
            <p>
              Required score: {result.passingPercentage}% · Your score: {result.score}%
            </p>
            {result.passed && result.xp?.earned ? (
              <p className="practice-quiz-xp-earned">+{result.xp.earned} XP earned</p>
            ) : completionXpReward ? (
              <p className="practice-quiz-xp-hint">Pass to earn {completionXpReward} XP</p>
            ) : null}
          </div>
          {!result.passed ? (
            <button type="button" className="practice-quiz-btn practice-quiz-btn--primary" onClick={handleRetry}>
              Try again
            </button>
          ) : null}
        </div>

        <div className="practice-quiz-review">
          <h3>Question review</h3>
          <div className="practice-quiz-palette practice-quiz-palette--review">
            {questions.map((question, index) => {
              const review = getQuestionReview(question.id)
              return (
                <button
                  key={question.id}
                  type="button"
                  className={`practice-quiz-palette-btn${
                    review?.isCorrect ? ' is-correct' : review ? ' is-incorrect' : ''
                  }${currentIndex === index ? ' is-current' : ''}`}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>

          {currentQuestion ? (
            <article
              className={`practice-quiz-question practice-quiz-question--review ${
                getQuestionReview(currentQuestion.id)?.isCorrect
                  ? 'is-correct'
                  : 'is-incorrect'
              }`}
            >
              <header className="practice-quiz-question-head">
                <span className="practice-quiz-question-index">Question {currentIndex + 1}</span>
                <span className="practice-quiz-question-type">
                  {QUESTION_TYPE_LABELS[currentQuestion.type] || 'Question'}
                </span>
              </header>
              <h4 className="practice-quiz-prompt">{currentQuestion.prompt}</h4>
              <div className="practice-quiz-options">
                {currentQuestion.options.map((option, optionIndex) => {
                  const isMultiple = currentQuestion.type === 'MULTIPLE_CHOICE'
                  const isSelected = isMultiple
                    ? (answers[currentQuestion.id] || []).includes(option.optionId)
                    : answers[currentQuestion.id] === option.optionId
                  const review = getQuestionReview(currentQuestion.id)

                  return (
                    <div
                      key={option.optionId}
                      className={`practice-quiz-option is-readonly${
                        isSelected ? ' is-selected' : ''
                      }${showResults && isSelected && !review?.isCorrect ? ' is-wrong' : ''}${
                        showResults && isSelected && review?.isCorrect ? ' is-right' : ''
                      }`}
                    >
                      <span className="practice-quiz-option-letter">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="practice-quiz-option-text">{option.text}</span>
                    </div>
                  )
                })}
              </div>
              {getQuestionReview(currentQuestion.id)?.explanation ? (
                <p className="practice-quiz-explanation">
                  <strong>Explanation</strong>
                  {getQuestionReview(currentQuestion.id).explanation}
                </p>
              ) : null}
            </article>
          ) : null}
        </div>

        {attempts.length ? (
          <div className="practice-quiz-attempts">
            <h3>Attempt history</h3>
            <ul>
              {attempts.map((attempt) => (
                <li key={attempt.id}>
                  <span>{attempt.score}%</span>
                  <span>{attempt.passed ? 'Passed' : 'Not passed'}</span>
                  <time>
                    {attempt.submittedAt
                      ? new Date(attempt.submittedAt).toLocaleString()
                      : ''}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    )
  }

  const isMultiple = currentQuestion?.type === 'MULTIPLE_CHOICE'
  const typeHint =
    currentQuestion?.type === 'MULTIPLE_CHOICE'
      ? 'Select all that apply'
      : currentQuestion?.type === 'TRUE_FALSE'
        ? 'Select True or False'
        : 'Select one answer'

  return (
    <div className="practice-quiz">
      <header className="practice-quiz-toolbar">
        <div className="practice-quiz-toolbar-top">
          <div>
            <p className="practice-quiz-toolbar-label">Progress</p>
            <p className="practice-quiz-toolbar-meta">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <p className="practice-quiz-toolbar-count">
            {answeredCount}/{questions.length} answered
          </p>
        </div>
        <div className="practice-quiz-progress" aria-hidden="true">
          <span className="practice-quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="practice-quiz-palette" role="tablist" aria-label="Questions">
          {questions.map((question, index) => {
            const answered = isQuestionAnswered(question, answers)
            return (
              <button
                key={question.id}
                type="button"
                role="tab"
                aria-selected={currentIndex === index}
                className={`practice-quiz-palette-btn${
                  currentIndex === index ? ' is-current' : ''
                }${answered ? ' is-answered' : ''}`}
                onClick={() => goToQuestion(index)}
              >
                {index + 1}
              </button>
            )
          })}
        </div>
      </header>

      {currentQuestion ? (
        <article className="practice-quiz-question">
          <header className="practice-quiz-question-head">
            <span className="practice-quiz-question-index">Question {currentIndex + 1}</span>
            <span className="practice-quiz-question-type">
              {QUESTION_TYPE_LABELS[currentQuestion.type] || typeHint}
            </span>
          </header>
          <h3 className="practice-quiz-prompt">{currentQuestion.prompt}</h3>
          <p className="practice-quiz-hint">{typeHint}</p>

          <div className="practice-quiz-options" role={isMultiple ? 'group' : 'radiogroup'}>
            {currentQuestion.options.map((option, optionIndex) => {
              const inputId = `${currentQuestion.id}-${option.optionId}`
              const isSelected = isMultiple
                ? (answers[currentQuestion.id] || []).includes(option.optionId)
                : answers[currentQuestion.id] === option.optionId

              return (
                <label
                  key={option.optionId}
                  htmlFor={inputId}
                  className={`practice-quiz-option${isSelected ? ' is-selected' : ''}`}
                >
                  <input
                    id={inputId}
                    type={isMultiple ? 'checkbox' : 'radio'}
                    name={isMultiple ? `${currentQuestion.id}-${option.optionId}` : currentQuestion.id}
                    checked={isSelected}
                    onChange={() =>
                      isMultiple
                        ? handleMultiSelect(currentQuestion.id, option.optionId)
                        : handleSingleSelect(currentQuestion.id, option.optionId)
                    }
                    className="practice-quiz-option-input"
                  />
                  <span className="practice-quiz-option-letter">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="practice-quiz-option-text">{option.text}</span>
                  <span className="practice-quiz-option-indicator" aria-hidden="true" />
                </label>
              )
            })}
          </div>
        </article>
      ) : null}

      {error ? <p className="practice-quiz-error">{error}</p> : null}

      <footer className="practice-quiz-footer">
        <button
          type="button"
          className="practice-quiz-btn practice-quiz-btn--ghost"
          disabled={currentIndex === 0}
          onClick={() => goToQuestion(currentIndex - 1)}
        >
          Previous
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            className="practice-quiz-btn practice-quiz-btn--primary"
            onClick={() => goToQuestion(currentIndex + 1)}
          >
            Next question
          </button>
        ) : (
          <button
            type="button"
            className="practice-quiz-btn practice-quiz-btn--primary"
            disabled={submitting || !allAnswered}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit practice'}
          </button>
        )}
      </footer>

      {!allAnswered ? (
        <p className="practice-quiz-footer-note">
          Answer all questions to submit · Pass score {passingPercentage}%
          {completionXpReward ? ` · ${completionXpReward} XP` : ''}
        </p>
      ) : null}
    </div>
  )
}

export default PracticeQuiz
