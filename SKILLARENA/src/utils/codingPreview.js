export const buildPreviewDocument = ({ html, css, javascript }) => {
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
  try {
    ${safeJs}
  } catch (error) {
    document.body.insertAdjacentHTML('beforeend', '<pre style="color:#b42318;padding:1rem;">' + (error.message || String(error)) + '</pre>');
  }
})();
</script>
</body>
</html>`
}

export const hasPreviewCode = ({ html, css, javascript } = {}) =>
  Boolean(html?.trim() || css?.trim() || javascript?.trim())

const CONSOLE_OUTPUT_TYPES = new Set(['CONSOLE_CONTAINS', 'GLOBAL_VALUE_EQUALS'])

/** Whether the challenge expects DOM preview or console output. */
export const getCodingOutputMode = (visibleTestCases = []) => {
  if (!visibleTestCases.length) return 'preview'
  const allConsole = visibleTestCases.every((test) =>
    CONSOLE_OUTPUT_TYPES.has(test.type || ''),
  )
  return allConsole ? 'console' : 'preview'
}
