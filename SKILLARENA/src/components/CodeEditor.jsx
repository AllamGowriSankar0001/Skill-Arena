import CodeMirror from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'

const extensionsByLanguage = {
  html: [html()],
  css: [css()],
  javascript: [javascript()],
}

const CodeEditor = ({ language, value, onChange }) => (
  <CodeMirror
    value={value}
    height="320px"
    extensions={extensionsByLanguage[language] || []}
    onChange={onChange}
    basicSetup={{
      lineNumbers: true,
      foldGutter: true,
      highlightActiveLine: true,
    }}
    aria-label={`${language} code editor`}
  />
)

export default CodeEditor
