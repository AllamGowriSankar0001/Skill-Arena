import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BattleTimer from './BattleTimer'
import { getCodingOutputMode } from '../utils/codingPreview'
import './BattleQuiz.css'
import './BattleCoding.css'

const CodeEditor = lazy(() => import('./CodeEditor'))

const TABS = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'javascript', label: 'JavaScript' },
]

const buildPreviewDocument = ({ html, css, javascript }) => {
  const safeJs = javascript || ''
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${css || ''}</style>
</head>
<body>${html || ''}
<script>
(function() {
  try { ${safeJs} } catch (error) { console.error(error.message || String(error)); }
})();
</script>
</body>
</html>`
}

const BattleCoding = ({
  challenge,
  timerEndsAt,
  onRun,
  onSubmit,
  onTimeUp,
  submitting = false,
  submitted = false,
  result = null,
}) => {
  const starter = challenge?.starterCode || { html: '', css: '', javascript: '' }
  const [activeTab, setActiveTab] = useState('html')
  const [code, setCode] = useState(starter)
  const [previewHtml, setPreviewHtml] = useState('')
  const [runResult, setRunResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const codeRef = useRef(code)
  codeRef.current = code

  const outputMode = useMemo(
    () => getCodingOutputMode(challenge?.visibleTestCases || []),
    [challenge?.visibleTestCases],
  )

  useEffect(() => {
    setCode(starter)
    setPreviewHtml(buildPreviewDocument(starter))
    codeRef.current = starter
  }, [challenge?.id])

  const testResults = result?.results?.length
    ? result.results
    : runResult?.results || []
  const passedCount = result?.passedCount ?? runResult?.passedCount ?? 0
  const totalCount = result?.totalCount ?? runResult?.totalCount ?? testResults.length

  const updateCode = useCallback((lang, value) => {
    setCode((current) => {
      const next = { ...current, [lang]: value }
      codeRef.current = next
      return next
    })
  }, [])

  const handleTimeUp = useCallback(() => {
    if (submitted || submitting) return
    onTimeUp?.(codeRef.current)
  }, [submitted, submitting, onTimeUp])

  const handleRun = useCallback(async () => {
    setRunning(true)
    setError('')
    setRunResult(null)
    setPreviewHtml(buildPreviewDocument(codeRef.current))
    try {
      const payload = await onRun(codeRef.current)
      setRunResult(payload)
    } catch (err) {
      setError(err.message || 'Failed to run code')
    } finally {
      setRunning(false)
    }
  }, [onRun])

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return
    setError('')
    try {
      await onSubmit(codeRef.current)
    } catch (err) {
      setError(err.message || 'Submission failed')
    }
  }, [submitting, submitted, onSubmit])

  const editorLanguage =
    activeTab === 'html' ? 'html' : activeTab === 'css' ? 'css' : 'javascript'

  if (submitted && result) {
    return (
      <div className="battle-coding battle-coding--done">
        <div className="battle-quiz-result">
          <p className="battle-quiz-result-label">Your score</p>
          <p className="battle-quiz-result-score">
            {result.passedCount ?? result.correctCount}/{result.totalCount ?? totalCount} tests
          </p>
          <p className="battle-quiz-result-meta">
            {result.percentage}% · {result.score}/{result.maxScore} pts · Waiting for other players…
          </p>
        </div>
      </div>
    )
  }

  if (!challenge) {
    return <div className="battle-coding-empty">Loading coding challenge…</div>
  }

  return (
    <div className="battle-coding">
      <div className="battle-quiz-header">
        <BattleTimer endsAt={timerEndsAt} onExpire={handleTimeUp} />
        <div className="battle-coding-score-hint">
          {passedCount}/{totalCount || challenge.visibleTestCases?.length || 0} tests passing
        </div>
      </div>

      <div className="battle-coding-brief">
        <h3>{challenge.title}</h3>
        <p>{challenge.prompt}</p>
        {challenge.instructions ? (
          <p className="battle-coding-instructions">{challenge.instructions}</p>
        ) : null}
      </div>

      <div className="battle-coding-workspace">
        <div className="battle-coding-editor-pane">
          <div className="battle-coding-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`battle-coding-tab${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="battle-coding-editor">
            <Suspense fallback={<div className="battle-coding-editor-loading">Loading editor…</div>}>
              <CodeEditor
                language={editorLanguage}
                value={code[activeTab] || ''}
                onChange={(value) => updateCode(activeTab, value)}
                readOnly={submitting || submitted}
              />
            </Suspense>
          </div>
          <div className="battle-coding-actions">
            <button
              type="button"
              className="battle-coding-btn"
              onClick={handleRun}
              disabled={running || submitting}
            >
              {running ? 'Running…' : 'Run tests'}
            </button>
            <button
              type="button"
              className="battle-coding-btn battle-coding-btn--submit"
              onClick={handleSubmit}
              disabled={submitting || submitted}
            >
              {submitting ? 'Submitting…' : 'Submit solution'}
            </button>
          </div>
        </div>

        <div className="battle-coding-output-pane">
          {outputMode === 'preview' ? (
            <iframe
              title="Battle code preview"
              className="battle-coding-preview"
              sandbox="allow-scripts"
              srcDoc={previewHtml}
            />
          ) : (
            <div className="battle-coding-console">Run your code to see console output.</div>
          )}

          {testResults.length ? (
            <ul className="battle-coding-tests">
              {testResults.map((test, index) => (
                <li key={test.id || index} className={test.passed ? 'is-pass' : 'is-fail'}>
                  <span>{test.passed ? 'Pass' : 'Fail'}</span>
                  <span>{test.label || test.description || `Test ${index + 1}`}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {error ? <p className="battle-coding-error">{error}</p> : null}
    </div>
  )
}

export default memo(BattleCoding)
