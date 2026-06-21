import { useCallback, useEffect, useRef, useState, memo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import './CodeEditor.css'

const extensionsByLanguage = {
  html: [html()],
  css: [css()],
  javascript: [javascript()],
}

const CodeEditor = ({ language, value, onChange, height = '320px' }) => {
  const shellRef = useRef(null)
  const [fillHeight, setFillHeight] = useState(320)
  const isFill = height === '100%'

  useEffect(() => {
    if (!isFill) return undefined

    const shell = shellRef.current
    if (!shell) return undefined

    const measure = () => {
      const next = Math.floor(shell.getBoundingClientRect().height)
      if (next > 0) {
        setFillHeight((current) => (current === next ? current : next))
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(shell)

    return () => observer.disconnect()
  }, [isFill])

  const focusEditor = useCallback(() => {
    const content = shellRef.current?.querySelector('.cm-content')
    content?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return undefined

    const handleWheel = (event) => {
      const scroller = shell.querySelector('.cm-scroller')
      if (!scroller) return

      const maxScroll = scroller.scrollHeight - scroller.clientHeight
      if (maxScroll <= 0) return

      const nextScroll = Math.min(maxScroll, Math.max(0, scroller.scrollTop + event.deltaY))
      if (nextScroll === scroller.scrollTop) return

      scroller.scrollTop = nextScroll
      event.preventDefault()
      event.stopPropagation()
    }

    shell.addEventListener('wheel', handleWheel, { passive: false })
    return () => shell.removeEventListener('wheel', handleWheel)
  }, [fillHeight, language])

  const editorHeight = isFill ? `${fillHeight}px` : height

  return (
    <div
      ref={shellRef}
      className={`code-editor-shell${isFill ? ' code-editor-shell--fill' : ''}`}
      onPointerDown={focusEditor}
    >
      <CodeMirror
        value={value}
        height={editorHeight}
        extensions={extensionsByLanguage[language] || []}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
        }}
        aria-label={`${language} code editor`}
      />
    </div>
  )
}

export default memo(CodeEditor)
