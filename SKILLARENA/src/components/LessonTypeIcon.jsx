const icons = {
  ARTICLE: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 4.5h12a2 2 0 0 1 2 2v13l-4-2.5-4 2.5-4-2.5-4 2.5V6.5a2 2 0 0 1 2-2z" />
      <path d="M9 9h6M9 12.5h6" />
    </svg>
  ),
  VIDEO: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="6" width="13" height="12" rx="2" />
      <path d="M16.5 10.5 21 8v8l-4.5-2.5" />
    </svg>
  ),
  QUIZ: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5a2.6 2.6 0 0 1 4.2 2c0 1.5-2.2 1.8-2.2 3.2" />
      <circle cx="12" cy="16.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  CODING: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8.5 8 4 12l4.5 4M15.5 8 20 12l-4.5 4M13.5 6l-3 12" />
    </svg>
  ),
  LIVE_SESSION: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
    </svg>
  ),
}

const LessonTypeIcon = ({ type = 'ARTICLE', label }) => (
  <span className={`course-lesson-icon course-lesson-icon--${type.toLowerCase()}`} aria-hidden="true">
    {icons[type] || icons.ARTICLE}
    {label ? <span className="sr-only">{label}</span> : null}
  </span>
)

export default LessonTypeIcon
