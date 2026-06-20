import { useEffect, useState } from 'react'
import { learningApi } from '../services/api'
import './LessonQuiz.css'

const LessonQuiz = ({ lessonId, quiz, progress, onCompleted, completionXpReward = 0 }) => {
  const questions = quiz?.questions || []
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [error, setError] = useState('')

  const passingPercentage = quiz?.passingPercentage ?? 70
  const isCompleted = progress?.status === 'COMPLETED'

  useEffect(() => {
    if (!lessonId) return
    learningApi
      .quizAttempts(lessonId)
      .then((data) => {
        setAttempts(data.attempts || [])
        if (data.passed && !result) {
          setResult({ passed: true, score: data.bestScore, passingPercentage })
        }
      })
      .catch(() => {})
  }, [lessonId, passingPercentage, result])

  if (!questions.length) {
    return (
      <div className="lesson-quiz-empty">
        <p>This quiz does not have any questions yet.</p>
      </div>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await learningApi.submitQuiz(lessonId, answers)
      setResult(response)
      if (response.lessonCompleted && onCompleted) {
        onCompleted(response)
      }
      const history = await learningApi.quizAttempts(lessonId)
      setAttempts(history.attempts || [])
    } catch (err) {
      setError(err.message || 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setResult(null)
    setError('')
  }

  const showResults = Boolean(result)

  return (
    <form className="lesson-quiz" onSubmit={handleSubmit}>
      <div className="lesson-quiz-head">
        <h2>{quiz.title || 'Lesson quiz'}</h2>
        {quiz.description ? <p>{quiz.description}</p> : null}
        <p className="lesson-quiz-meta">Required score: {passingPercentage}%</p>
        {completionXpReward ? <span className="lesson-quiz-xp">{completionXpReward} XP</span> : null}
      </div>

      <ol className="lesson-quiz-list">
        {questions.map((question, index) => {
          const explanation = result?.explanations?.find(
            (item) => item.questionId === question.id,
          )
          const answeredCorrectly = explanation?.isCorrect

          return (
            <li
              key={question.id}
              className={`lesson-quiz-question${
                showResults
                  ? answeredCorrectly
                    ? ' lesson-quiz-question--correct'
                    : ' lesson-quiz-question--incorrect'
                  : ''
              }`}
            >
              <p className="lesson-quiz-prompt">
                <span className="lesson-quiz-number">{index + 1}.</span> {question.prompt}
              </p>

              <div className="lesson-quiz-options">
                {question.options.map((option) => {
                  const inputId = `${question.id}-${option.optionId}`
                  const isSelected = answers[question.id] === option.optionId

                  return (
                    <label
                      key={option.optionId}
                      htmlFor={inputId}
                      className={`lesson-quiz-option${isSelected ? ' lesson-quiz-option--selected' : ''}`}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={question.id}
                        value={option.optionId}
                        checked={isSelected}
                        disabled={showResults || isCompleted}
                        onChange={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: option.optionId,
                          }))
                        }
                      />
                      <span>{option.text}</span>
                    </label>
                  )
                })}
              </div>

              {showResults && explanation?.explanation ? (
                <p className="lesson-quiz-explanation">{explanation.explanation}</p>
              ) : null}
            </li>
          )
        })}
      </ol>

      {error ? <p className="app-section-error">{error}</p> : null}

      {showResults && result ? (
        <div className="lesson-quiz-summary" aria-live="polite">
          {result.passed ? (
            <>
              <strong>Quiz Passed</strong>
              <p>Lesson Completed ✓</p>
              {completionXpReward ? <p>XP Earned: {completionXpReward}</p> : null}
            </>
          ) : (
            <>
              <strong>Quiz Not Passed</strong>
              <p>
                Your Score: {result.score}% — Required Score: {result.passingPercentage}%
              </p>
              <button type="button" className="app-section-button" onClick={handleRetry}>
                Try Again
              </button>
            </>
          )}
        </div>
      ) : (
        !isCompleted && (
          <button
            type="submit"
            className="app-section-button"
            disabled={submitting || Object.keys(answers).length < questions.length}
          >
            {submitting ? 'Submitting…' : 'Submit answers'}
          </button>
        )
      )}

      {attempts.length ? (
        <div className="lesson-quiz-attempts">
          <h3>Attempt history</h3>
          <ul>
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                {attempt.score}% — {attempt.passed ? 'Passed' : 'Not passed'} —{' '}
                {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  )
}

export default LessonQuiz
