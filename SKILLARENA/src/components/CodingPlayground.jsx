import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { learningApi, getStoredUser } from '../services/api'
import { getCodingOutputMode } from '../utils/codingPreview'
import './CodingPlayground.css'

const CodeEditor = lazy(() => import('./CodeEditor'))

const TABS = [
  { id: 'html', label: 'HTML', ext: '.html' },
  { id: 'css', label: 'CSS', ext: '.css' },
  { id: 'javascript', label: 'JavaScript', ext: '.js' },
]

const buildDraftKey = (userId, contextType, sessionId) =>
  contextType === 'practice'
    ? `coding-draft-practice:${userId}:${sessionId}`
    : `coding-draft:${userId}:${sessionId}`

const buildPanelHeightKey = (contextType, sessionId) =>
  `coding-panel-height:${contextType}:${sessionId}`

const MIN_EDITOR_HEIGHT = 140
const MIN_PANEL_HEIGHT = 160
const RESIZER_HEIGHT = 8
const DEFAULT_PANEL_HEIGHT = 220

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
  assessmentId,
  contextType = 'lesson',
  payload,
  progress,
  onProgressUpdate,
  nextLessonId,
  coursePath,
}) => {
  const user = getStoredUser()
  const isPractice = contextType === 'practice'
  const sessionId = isPractice ? assessmentId : lessonId
  const draftKey = user?.id ? buildDraftKey(user.id, contextType, sessionId) : null
  const panelHeightKey = sessionId ? buildPanelHeightKey(contextType, sessionId) : null

  const outputMode = useMemo(
    () => getCodingOutputMode(payload?.visibleTestCases || []),
    [payload?.visibleTestCases],
  )

  const [activeTab, setActiveTab] = useState('html')
  const [outputTab, setOutputTab] = useState('output')
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT)

  const draftTimerRef = useRef(null)
  const iframeRef = useRef(null)
  const playgroundRef = useRef(null)
  const splitRef = useRef(null)
  const panelHeightRef = useRef(DEFAULT_PANEL_HEIGHT)
  const resizeDragRef = useRef(null)

  const isCompleted = !isPractice && progress?.status === 'COMPLETED'
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
    if (!sessionId) return
    const loadAttempts = isPractice
      ? learningApi.practiceCodingAttempts(sessionId)
      : learningApi.codingAttempts(sessionId)

    loadAttempts
      .then((data) => setAttempts(data.attempts || []))
      .catch(() => {})
  }, [sessionId, submitResult, isPractice])

  const clampPanelHeight = useCallback((height) => {
    const split = splitRef.current
    if (!split) return height
    const max = split.clientHeight - MIN_EDITOR_HEIGHT - RESIZER_HEIGHT
    if (max <= MIN_PANEL_HEIGHT) return Math.max(100, max)
    return Math.min(max, Math.max(MIN_PANEL_HEIGHT, height))
  }, [])

  useEffect(() => {
    if (!panelHeightKey) return
    try {
      const raw = localStorage.getItem(panelHeightKey)
      const saved = raw ? Number(raw) : NaN
      if (Number.isFinite(saved) && saved >= MIN_PANEL_HEIGHT) {
        setPanelHeight(saved)
        panelHeightRef.current = saved
      }
    } catch {
      /* ignore invalid saved height */
    }
  }, [panelHeightKey])

  useEffect(() => {
    panelHeightRef.current = panelHeight
  }, [panelHeight])

  useEffect(() => {
    const split = splitRef.current
    if (!split) return undefined

    const syncPanelHeight = () => {
      setPanelHeight((current) => {
        const next = clampPanelHeight(current)
        panelHeightRef.current = next
        return next
      })
    }

    syncPanelHeight()
    const observer = new ResizeObserver(syncPanelHeight)
    observer.observe(split)
    return () => observer.disconnect()
  }, [clampPanelHeight, isFullscreen])

  const persistPanelHeight = useCallback(() => {
    if (!panelHeightKey) return
    try {
      localStorage.setItem(panelHeightKey, String(panelHeightRef.current))
    } catch {
      /* ignore storage errors */
    }
  }, [panelHeightKey])

  const handlePanelResizePointerDown = useCallback(
    (event) => {
      event.preventDefault()
      resizeDragRef.current = {
        startY: event.clientY,
        startHeight: panelHeightRef.current,
      }
      document.body.classList.add('coding-playground-is-resizing')
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [],
  )

  const handlePanelResizePointerMove = useCallback(
    (event) => {
      if (!resizeDragRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
      const delta = event.clientY - resizeDragRef.current.startY
      const next = clampPanelHeight(resizeDragRef.current.startHeight - delta)
      panelHeightRef.current = next
      setPanelHeight(next)
    },
    [clampPanelHeight],
  )

  const handlePanelResizePointerUp = useCallback(
    (event) => {
      if (!resizeDragRef.current) return
      resizeDragRef.current = null
      document.body.classList.remove('coding-playground-is-resizing')
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      persistPanelHeight()
    },
    [persistPanelHeight],
  )

  const handlePanelResizeKeyDown = useCallback(
    (event) => {
      const step = event.shiftKey ? 48 : 24
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setPanelHeight((current) => {
          const next = clampPanelHeight(current + step)
          panelHeightRef.current = next
          return next
        })
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setPanelHeight((current) => {
          const next = clampPanelHeight(current - step)
          panelHeightRef.current = next
          return next
        })
      } else {
        return
      }
      persistPanelHeight()
    },
    [clampPanelHeight, persistPanelHeight],
  )

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch {
      /* ignore exit errors */
    }
    setIsFullscreen(false)
  }, [])

  const enterFullscreen = useCallback(async () => {
    const node = playgroundRef.current
    if (!node) return

    try {
      if (node.requestFullscreen) {
        await node.requestFullscreen()
      } else {
        setIsFullscreen(true)
      }
    } catch {
      setIsFullscreen(true)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    const node = playgroundRef.current
    const nativeActive = document.fullscreenElement === node
    if (isFullscreen || nativeActive) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen])

  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement === playgroundRef.current
      setIsFullscreen(active)
    }
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    if (!isFullscreen) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!isFullscreen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !document.fullscreenElement) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  const persistDraft = useCallback(
    (nextCode) => {
      if (draftKey) {
        localStorage.setItem(draftKey, JSON.stringify(nextCode))
      }
      setDraftStatus('Saving…')
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(async () => {
        try {
          if (!isPractice) {
            await learningApi.saveCodingDraft(sessionId, nextCode)
          }
          setDraftStatus('Saved')
        } catch {
          setDraftStatus('Save failed')
        }
      }, 2500)
    },
    [draftKey, sessionId, isPractice],
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
      const result = isPractice
        ? await learningApi.runPracticeCoding(sessionId, code)
        : await learningApi.runCoding(sessionId, code)
      setVisibleResults(result)
      setOutputTab('tests')
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
      const result = isPractice
        ? await learningApi.submitPracticeCoding(sessionId, code)
        : await learningApi.submitCoding(sessionId, code)
      setSubmitResult(result)
      setOutputTab('tests')
      if ((result.lessonCompleted || result.passed) && onProgressUpdate) {
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
    setOutputTab('output')
  }

  const handleRevealHint = () => {
    setRevealedHints((count) => Math.min(count + 1, hints.length))
  }

  const editorLanguage =
    activeTab === 'html' ? 'html' : activeTab === 'css' ? 'css' : 'javascript'

  const testResults = submitResult?.visibleResults?.length
    ? submitResult.visibleResults
    : submitResult?.results?.length
      ? submitResult.results
      : visibleResults?.results || []

  const passedCount = submitResult?.passedCount ?? visibleResults?.passedCount ?? 0
  const totalCount = submitResult?.totalCount ?? visibleResults?.totalCount ?? testResults.length
  const hasTestResults = testResults.length > 0

  if (!payload) {
    return (
      <div className="coding-playground-empty">
        <p>Coding question is not configured for this {isPractice ? 'practice set' : 'lesson'} yet.</p>
      </div>
    )
  }

  const outputLabel = outputMode === 'console' ? 'Console output' : 'Live preview'

  return (
    <div
      ref={playgroundRef}
      className={`coding-playground${isPractice ? ' coding-playground--practice' : ''}${isFullscreen ? ' coding-playground--fullscreen' : ''}`}
    >
      {isFullscreen ? (
        <div className="coding-playground-fullscreen-bar">
          <div className="coding-playground-fullscreen-bar-main">
            <span className="coding-playground-badge">Coding challenge</span>
            <span className="coding-playground-fullscreen-title">{payload.title}</span>
          </div>
          <button
            type="button"
            className="coding-playground-btn coding-playground-btn--ghost coding-playground-btn--fullscreen-exit"
            onClick={toggleFullscreen}
          >
            Exit full screen
          </button>
        </div>
      ) : null}

      <div className="coding-playground-layout">
        <aside className="coding-playground-sidebar">
          {!isFullscreen ? (
            <div className="coding-playground-sidebar-head">
              <span className="coding-playground-badge">Coding challenge</span>
              <h2 className="coding-playground-problem-title">{payload.title}</h2>
            </div>
          ) : null}

          <div className="coding-playground-sidebar-scroll">
            <p className="coding-playground-prompt">{payload.prompt}</p>

            {payload.instructions ? (
              <div className="coding-playground-callout">
                <span className="coding-playground-callout-label">Instructions</span>
                <p>{payload.instructions}</p>
              </div>
            ) : null}

            {payload.expectedOutputDescription ? (
              <div className="coding-playground-callout coding-playground-callout--goal">
                <span className="coding-playground-callout-label">Expected output</span>
                <p>{payload.expectedOutputDescription}</p>
              </div>
            ) : null}

            <div className="coding-playground-output-hint">
              <span className="coding-playground-callout-label">Output type</span>
              <p>
                {outputMode === 'console'
                  ? 'This challenge checks console output. Run your code to see logs below the editor.'
                  : 'This challenge checks visual output. Run your code to see the live preview below the editor.'}
              </p>
            </div>

            {hints.length ? (
              <div className="coding-playground-sidebar-section">
                <div className="coding-playground-sidebar-section-head">
                  <span className="coding-playground-callout-label">Hints</span>
                  <button
                    type="button"
                    className="coding-playground-hint-btn"
                    onClick={handleRevealHint}
                    disabled={revealedHints >= hints.length}
                  >
                    Reveal {revealedHints}/{hints.length}
                  </button>
                </div>
                {revealedHints > 0 ? (
                  <ol className="coding-playground-hints-list">
                    {hints.slice(0, revealedHints).map((hint, index) => (
                      <li key={hint}>
                        <span className="coding-playground-hint-num">{index + 1}</span>
                        {hint}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="coding-playground-muted">Hints unlock one at a time when you need help.</p>
                )}
              </div>
            ) : null}

            {attempts.length ? (
              <div className="coding-playground-sidebar-section">
                <span className="coding-playground-callout-label">Attempt history</span>
                <ul className="coding-playground-history-list">
                  {attempts.map((attempt) => (
                    <li key={attempt.id} className={attempt.passed ? 'is-pass' : 'is-fail'}>
                      <span className="coding-playground-history-score">{attempt.score}%</span>
                      <span className="coding-playground-history-status">
                        {attempt.passed ? 'Passed' : 'Not passed'}
                      </span>
                      <span className="coding-playground-history-date">
                        {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="coding-playground-workspace">
          <div className="coding-playground-workspace-split" ref={splitRef}>
            <div className="coding-playground-pane coding-playground-pane--editor">
              <div className="coding-playground-pane-header">
                <div className="coding-playground-file-tabs" role="tablist" aria-label="Code editor tabs">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      className={`coding-playground-file-tab${activeTab === tab.id ? ' is-active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span>{tab.label}</span>
                      <span className="coding-playground-file-ext">{tab.ext}</span>
                    </button>
                  ))}
                </div>
                {draftStatus ? (
                  <span className="coding-playground-draft-status" aria-live="polite">
                    {draftStatus}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="coding-playground-fullscreen-toggle"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
                  title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
                >
                  {isFullscreen ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              <div className="coding-playground-editor-body">
                <Suspense fallback={<div className="coding-playground-editor-loading">Loading editor…</div>}>
                  <CodeEditor
                    language={editorLanguage}
                    value={code[activeTab]}
                    onChange={(value) => updateCode(activeTab, value)}
                    height="100%"
                  />
                </Suspense>
              </div>
            </div>

            <div
              className="coding-playground-resizer"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize code editor and preview panels"
              aria-valuemin={MIN_PANEL_HEIGHT}
              aria-valuemax={800}
              aria-valuenow={Math.round(panelHeight)}
              tabIndex={0}
              onPointerDown={handlePanelResizePointerDown}
              onPointerMove={handlePanelResizePointerMove}
              onPointerUp={handlePanelResizePointerUp}
              onPointerCancel={handlePanelResizePointerUp}
              onKeyDown={handlePanelResizeKeyDown}
            >
              <span className="coding-playground-resizer-grip" aria-hidden="true" />
            </div>

            <div className="coding-playground-workspace-panel" style={{ height: panelHeight }}>
              <div className="coding-playground-toolbar">
                <div className="coding-playground-toolbar-actions">
                  <button
                    type="button"
                    className="coding-playground-btn coding-playground-btn--run"
                    onClick={handleRun}
                    disabled={running}
                  >
                    {running ? 'Running…' : 'Run code'}
                  </button>
                  <button
                    type="button"
                    className="coding-playground-btn coding-playground-btn--submit"
                    onClick={handleSubmit}
                    disabled={submitting || isCompleted}
                  >
                    {submitting ? 'Submitting…' : 'Submit answer'}
                  </button>
                  <button type="button" className="coding-playground-btn coding-playground-btn--ghost" onClick={handleReset}>
                    Reset
                  </button>
                  {!isFullscreen ? (
                    <button
                      type="button"
                      className="coding-playground-btn coding-playground-btn--ghost coding-playground-btn--fullscreen"
                      onClick={toggleFullscreen}
                    >
                      Full screen
                    </button>
                  ) : null}
                </div>
                {hasTestResults ? (
                  <div className="coding-playground-toolbar-score">
                    <span className={passedCount === totalCount ? 'is-pass' : 'is-partial'}>
                      {passedCount}/{totalCount} tests passed
                    </span>
                  </div>
                ) : null}
              </div>

              {submitResult ? (
                <div
                  className={`coding-playground-verdict${submitResult.passed ? ' is-pass' : ' is-fail'}`}
                  aria-live="assertive"
                >
                  <div className="coding-playground-verdict-main">
                    {submitResult.passed ? (
                      <>
                        <strong>All test cases passed</strong>
                        <p>{isPractice ? 'Practice challenge completed.' : 'Lesson completed.'}</p>
                      </>
                    ) : (
                      <>
                        <strong>Some test cases failed</strong>
                        <p>
                          Passed {submitResult.passedCount} of {submitResult.totalCount}. Review your code and try again.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="coding-playground-verdict-meta">
                    {submitResult.xp?.earned ? (
                      <span className="coding-playground-xp">+{submitResult.xp.earned} XP</span>
                    ) : null}
                    {!isPractice && nextLessonId && submitResult.passed ? (
                      <Link
                        to={`${coursePath}/lessons/${nextLessonId}`}
                        className="coding-playground-btn coding-playground-btn--submit coding-playground-btn--link"
                      >
                        Next lesson →
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {loadError ? <p className="coding-playground-error">{loadError}</p> : null}

              <div className="coding-playground-output">
                <div className="coding-playground-output-tabs" role="tablist" aria-label="Output panels">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={outputTab === 'output'}
                    className={`coding-playground-output-tab${outputTab === 'output' ? ' is-active' : ''}`}
                    onClick={() => setOutputTab('output')}
                  >
                    {outputLabel}
                    {outputMode === 'console' && consoleLines.length ? (
                      <span className="coding-playground-output-badge">{consoleLines.length}</span>
                    ) : null}
                  </button>
                  {hasTestResults ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={outputTab === 'tests'}
                      className={`coding-playground-output-tab${outputTab === 'tests' ? ' is-active' : ''}`}
                      onClick={() => setOutputTab('tests')}
                    >
                      Test results
                      <span className="coding-playground-output-badge">
                        {passedCount}/{totalCount}
                      </span>
                    </button>
                  ) : null}
                </div>

                <div className="coding-playground-output-body" role="tabpanel">
                  {outputTab === 'output' ? (
                    outputMode === 'console' ? (
                      consoleLines.length ? (
                        <ul className="coding-playground-console-list">
                          {consoleLines.map((line, index) => (
                            <li key={`${line.text}-${index}`} className={`coding-console-${line.type}`}>
                              <span className="coding-playground-console-prefix">
                                {line.type === 'error' ? '✕' : line.type === 'warn' ? '!' : '›'}
                              </span>
                              {line.text}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="coding-playground-muted">Run your code to see console output here.</p>
                      )
                    ) : (
                      <iframe
                        ref={iframeRef}
                        title="Code preview"
                        className="coding-playground-preview-frame"
                        sandbox="allow-scripts"
                        srcDoc={previewHtml}
                      />
                    )
                  ) : null}

                  {outputTab === 'tests' ? (
                    <ul className="coding-playground-test-list">
                      {testResults.map((item, index) => (
                        <li
                          key={item.index ?? index}
                          className={`coding-playground-test-item${item.passed ? ' is-pass' : ' is-fail'}`}
                        >
                          <span className="coding-playground-test-icon" aria-hidden="true">
                            {item.passed ? '✓' : '✕'}
                          </span>
                          <span className="coding-playground-test-label">
                            {item.label || item.type || `Test ${index + 1}`}
                          </span>
                          <span className="coding-playground-test-status">{item.passed ? 'Passed' : 'Failed'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodingPlayground
