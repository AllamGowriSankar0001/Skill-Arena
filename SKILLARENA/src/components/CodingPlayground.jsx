import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { learningApi, getStoredUser } from '../services/api'
import './CodingPlayground.css'

const CodeEditor = lazy(() => import('./CodeEditor'))

const TABS = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'javascript', label: 'JavaScript' },
]

const buildDraftKey = (userId, lessonId) => `coding-draft:${userId}:${lessonId}`

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
  const logs = [];
  const native = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.log = (...args) => { logs.push({ type: 'log', text: args.map(String).join(' ') }); native.log(...args); };
  console.warn = (...args) => { logs.push({ type: 'warn', text: args.map(String).join(' ') }); native.warn(...args); };
  console.error = (...args) => { logs.push({ type: 'error', text: args.map(String).join(' ') }); native.error(...args); };
  window.addEventListener('error', (event) => {
    logs.push({ type: 'error', text: event.message || 'Runtime error' });
  });
  try {
    ${safeJs}
  } catch (error) {
    logs.push({ type: 'error', text: error.message || String(error) });
  }
  window.parent.postMessage({ source: 'skillarena-preview', logs }, '*');
})();
</script>
</body>
</html>`
}

const CodingPlayground = ({
  lessonId,
  payload,
  progress,
  onProgressUpdate,
  nextLessonId,
  coursePath,
}) => {
  const user = getStoredUser()
  const draftKey = user?.id ? buildDraftKey(user.id, lessonId) : null

  const [activeTab, setActiveTab] = useState('html')
  const [code, setCode] = useState({ html: '', css: '', javascript: '' })
  const [previewHtml, setPreviewHtml] = useState('')
  const [consoleLines, setConsoleLines] = useState([])
  const [visibleResults, setVisibleResults] = useState(null)
  const [submitResult, setSubmitResult] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [revealedHints, setRevealedHints] = useState(0)
  const [draftStatus, setDraftStatus] = useState('')
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')

  const draftTimerRef = useRef(null)
  const iframeRef = useRef(null)

  const isCompleted = progress?.status === 'COMPLETED'
  const hints = payload?.hints || []

  useEffect(() => {
    if (!payload?.starterCode) return

    const starter = payload.starterCode
    const serverDraft = progress?.codingDraft
    let initial = {
      html: starter.html || '',
      css: starter.css || '',
      javascript: starter.javascript || '',
    }

    if (serverDraft?.html || serverDraft?.css || serverDraft?.javascript) {
      initial = {
        html: serverDraft.html ?? initial.html,
        css: serverDraft.css ?? initial.css,
        javascript: serverDraft.javascript ?? initial.javascript,
      }
    } else if (draftKey) {
      try {
        const raw = localStorage.getItem(draftKey)
        if (raw) {
          const local = JSON.parse(raw)
          initial = {
            html: local.html ?? initial.html,
            css: local.css ?? initial.css,
            javascript: local.javascript ?? initial.javascript,
          }
        }
      } catch {
        /* ignore invalid local draft */
      }
    }

    setCode(initial)
    setPreviewHtml(buildPreviewDocument(initial))
  }, [payload, progress, draftKey])

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.source !== 'skillarena-preview') return
      setConsoleLines(event.data.logs || [])
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    learningApi
      .codingAttempts(lessonId)
      .then((data) => setAttempts(data.attempts || []))
      .catch(() => {})
  }, [lessonId, submitResult])

  const persistDraft = useCallback(
    (nextCode) => {
      if (draftKey) {
        localStorage.setItem(draftKey, JSON.stringify(nextCode))
      }
      setDraftStatus('Saving…')
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(async () => {
        try {
          await learningApi.saveCodingDraft(lessonId, nextCode)
          setDraftStatus('Draft saved')
        } catch {
          setDraftStatus('Draft save failed')
        }
      }, 2500)
    },
    [draftKey, lessonId],
  )

  const updateCode = (lang, value) => {
    setCode((current) => {
      const next = { ...current, [lang]: value }
      persistDraft(next)
      return next
    })
  }

  const handleRun = async () => {
    setRunning(true)
    setLoadError('')
    setVisibleResults(null)
    setPreviewHtml(buildPreviewDocument(code))
    try {
      const result = await learningApi.runCoding(lessonId, code)
      setVisibleResults(result)
      if (result.consoleLogs?.length) {
        setConsoleLines(result.consoleLogs.map((text) => ({ type: 'log', text })))
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to run code')
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setLoadError('')
    try {
      const result = await learningApi.submitCoding(lessonId, code)
      setSubmitResult(result)
      if (result.lessonCompleted && onProgressUpdate) {
        onProgressUpdate(result)
      }
    } catch (err) {
      setLoadError(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    if (!window.confirm('Reset code to the original starter template?')) return
    const starter = payload?.starterCode || { html: '', css: '', javascript: '' }
    setCode(starter)
    persistDraft(starter)
    setPreviewHtml(buildPreviewDocument(starter))
    setVisibleResults(null)
    setSubmitResult(null)
    setConsoleLines([])
  }

  const editorLanguage =
    activeTab === 'html' ? 'html' : activeTab === 'css' ? 'css' : 'javascript'

  if (!payload) {
    return (
      <div className="coding-playground-empty">
        <p>Coding question is not configured for this lesson yet.</p>
      </div>
    )
  }

  return (
    <div className="coding-playground">
      <section className="coding-playground-instructions">
        <h2>{payload.title}</h2>
        <p>{payload.prompt}</p>
        {payload.instructions ? <p className="coding-playground-note">{payload.instructions}</p> : null}
        {payload.expectedOutputDescription ? (
          <p className="coding-playground-note">{payload.expectedOutputDescription}</p>
        ) : null}
      </section>

      <div className="coding-playground-workspace">
        <div className="coding-playground-editor-panel">
          <div className="coding-playground-tabs" role="tablist" aria-label="Code editor tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`coding-playground-tab${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Suspense fallback={<div className="coding-playground-editor-loading">Loading editor…</div>}>
            <CodeEditor
              language={editorLanguage}
              value={code[activeTab]}
              onChange={(value) => updateCode(activeTab, value)}
            />
          </Suspense>

          {draftStatus ? (
            <p className="coding-playground-draft-status" aria-live="polite">
              {draftStatus}
            </p>
          ) : null}
        </div>

        <div className="coding-playground-preview-panel">
          <h3>Live preview</h3>
          <iframe
            ref={iframeRef}
            title="Code preview"
            className="coding-playground-preview-frame"
            sandbox="allow-scripts"
            srcDoc={previewHtml}
          />
        </div>
      </div>

      <div className="coding-playground-actions">
        <button type="button" className="app-section-button" onClick={handleRun} disabled={running}>
          {running ? 'Running…' : 'Run Code'}
        </button>
        <button
          type="button"
          className="app-section-button app-section-button--primary"
          onClick={handleSubmit}
          disabled={submitting || isCompleted}
        >
          {submitting ? 'Submitting…' : 'Submit Answer'}
        </button>
        <button type="button" className="app-section-button" onClick={handleReset}>
          Reset Code
        </button>
        {hints.length ? (
          <button
            type="button"
            className="app-section-button"
            onClick={() => setRevealedHints((count) => Math.min(count + 1, hints.length))}
            disabled={revealedHints >= hints.length}
          >
            Show Hint ({revealedHints}/{hints.length})
          </button>
        ) : null}
      </div>

      {revealedHints > 0 ? (
        <div className="coding-playground-hints">
          <h3>Hints</h3>
          <ol>
            {hints.slice(0, revealedHints).map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="coding-playground-console" aria-live="polite">
        <h3>Console output</h3>
        {consoleLines.length ? (
          <ul>
            {consoleLines.map((line, index) => (
              <li key={`${line.text}-${index}`} className={`coding-console-${line.type}`}>
                {line.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="coding-playground-muted">Run your code to see console output.</p>
        )}
      </div>

      {visibleResults ? (
        <div className="coding-playground-results" aria-live="polite">
          <h3>Test results (sample)</h3>
          <p>
            Passed {visibleResults.passedCount} of {visibleResults.totalCount}
          </p>
          <ul>
            {(visibleResults.results || []).map((item) => (
              <li key={item.index} className={item.passed ? 'is-pass' : 'is-fail'}>
                {item.label || item.type}: {item.passed ? 'Passed' : 'Failed'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {submitResult ? (
        <div
          className={`coding-playground-submit-result${submitResult.passed ? ' is-pass' : ' is-fail'}`}
          aria-live="assertive"
        >
          {submitResult.passed ? (
            <>
              <strong>All test cases passed!</strong>
              <p>Lesson completed ✓</p>
              {submitResult.xp?.earned ? <p>XP earned: +{submitResult.xp.earned}</p> : null}
              {nextLessonId ? (
                <Link
                  to={`${coursePath}/lessons/${nextLessonId}`}
                  className="app-section-button app-section-button--link"
                >
                  Continue to Next Lesson
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <strong>Some test cases failed</strong>
              <p>
                Passed: {submitResult.passedCount} of {submitResult.totalCount}
              </p>
              <p>Review your code and try again.</p>
            </>
          )}
        </div>
      ) : null}

      {loadError ? <p className="app-section-error">{loadError}</p> : null}

      {attempts.length ? (
        <div className="coding-playground-attempts">
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
    </div>
  )
}

export default CodingPlayground
