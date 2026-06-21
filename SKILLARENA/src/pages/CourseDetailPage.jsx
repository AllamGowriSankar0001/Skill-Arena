import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppEmptyState from '../components/AppEmptyState'
import CourseThumbnail from '../components/CourseThumbnail'
import LessonTypeIcon from '../components/LessonTypeIcon'
import { getStoredUser, learningApi, platformApi } from '../services/api'
import { getLessonStateLabel } from '../utils/lessonProgress'
import { getCourseCtaLabel, getCourseStatusLabel, hasStartedCourse } from '../utils/courseProgress'
import { ROUTES } from '../routes'
import './AppSectionPage.css'
import './CoursesPage.css'

const formatLevel = (level = '') =>
  level
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatLessonType = (type = '') => formatLevel(type)

const lessonPath = (courseId, lessonId) => `${ROUTES.learn}/${courseId}/lessons/${lessonId}`

const CourseDetailPage = () => {
  const { courseId } = useParams()
  const user = getStoredUser()
  const [detail, setDetail] = useState(null)
  const [courseProgress, setCourseProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!courseId) return

    setLoading(true)
    setError('')

    platformApi
      .course(courseId)
      .then(setDetail)
      .catch((err) => setError(err.message || 'Failed to load course'))
      .finally(() => setLoading(false))
  }, [courseId])

  useEffect(() => {
    if (!user || !courseId) return

    learningApi.enroll(courseId).catch(() => {})
  }, [user, courseId])

  useEffect(() => {
    if (!user || !courseId) return

    const refreshProgress = () => {
      learningApi
        .courseProgress(courseId)
        .then(setCourseProgress)
        .catch(() => {})
    }

    refreshProgress()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshProgress()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user, courseId])

  const progressByLessonId = useMemo(() => {
    const map = new Map()
    courseProgress?.lessons?.forEach((lesson) => map.set(lesson.id, lesson))
    return map
  }, [courseProgress])

  const course = detail?.course
  const modules = detail?.modules || []

  const { lessonCount, totalMinutes, firstLesson } = useMemo(() => {
    let count = 0
    let minutes = 0
    let first = null

    modules.forEach((module) => {
      module.lessons?.forEach((lesson) => {
        count += 1
        minutes += lesson.durationMinutes || 0
        if (!first) first = lesson
      })
    })

    return { lessonCount: count, totalMinutes: minutes, firstLesson: first }
  }, [modules])

  const enrollment = courseProgress?.enrollment
  const lessons = courseProgress?.lessons || []
  const courseStarted = hasStartedCourse(enrollment, lessons)
  const courseStatusLabel = getCourseStatusLabel(enrollment, lessons)
  const courseCtaLabel = getCourseCtaLabel(enrollment, lessons)
  const continueLessonId =
    enrollment?.currentLessonId ||
    courseProgress?.lessons?.find((lesson) => lesson.lockState !== 'LOCKED')?.id ||
    firstLesson?.id

  return (
    <main className="courses-page courses-page--detail">
      <div className="courses-page-inner">
        <nav className="courses-breadcrumb" aria-label="Breadcrumb">
          <Link to={ROUTES.learn}>Courses</Link>
          <span aria-hidden="true">/</span>
          <span>{course?.title || 'Course'}</span>
        </nav>

        {loading ? (
          <div className="course-detail-loading" aria-live="polite">
            Loading course…
          </div>
        ) : null}
        {error ? <p className="courses-alert courses-alert--error">{error}</p> : null}

        {!loading && !error && course ? (
          <div className="course-detail-layout">
            <div className="course-detail-main">
              <header className="course-detail-hero">
                <div className="course-detail-hero-copy">
                  {course.categoryName ? (
                    <span className="course-detail-category">{course.categoryName}</span>
                  ) : null}
                  <h1>{course.title}</h1>
                  {course.description ? (
                    <p className="course-detail-desc">{course.description}</p>
                  ) : null}

                  <div className="course-detail-pills">
                    {course.level ? (
                      <span className="course-pill">{formatLevel(course.level)}</span>
                    ) : null}
                    {lessonCount ? (
                      <span className="course-pill">{lessonCount} lessons</span>
                    ) : null}
                    {(course.estimatedMinutes || totalMinutes) ? (
                      <span className="course-pill">
                        {course.estimatedMinutes || totalMinutes} min total
                      </span>
                    ) : null}
                    {modules.length ? (
                      <span className="course-pill">
                        {modules.length} module{modules.length === 1 ? '' : 's'}
                      </span>
                    ) : null}
                    {course.ratingAverage ? (
                      <span className="course-pill course-pill--accent">
                        ★ {Number(course.ratingAverage).toFixed(1)}
                      </span>
                    ) : null}
                  </div>

                  {continueLessonId ? (
                    <Link
                      to={lessonPath(courseId, continueLessonId)}
                      className="course-detail-cta course-detail-cta--mobile"
                    >
                      {courseCtaLabel}
                    </Link>
                  ) : null}
                </div>
              </header>

              <section className="course-curriculum" aria-labelledby="course-curriculum-title">
                <div className="course-curriculum-head">
                  <div>
                    <h2 id="course-curriculum-title">Course curriculum</h2>
                    <p>
                      {modules.length} module{modules.length === 1 ? '' : 's'} · {lessonCount}{' '}
                      lesson{lessonCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {enrollment ? (
                  <div className="course-detail-progress">
                    <div className="course-detail-progress-head">
                      <strong>Course progress</strong>
                      {courseStatusLabel ? (
                        <span
                          className={`course-detail-progress-status course-detail-progress-status--${courseStatusLabel.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {courseStatusLabel}
                        </span>
                      ) : null}
                    </div>
                    <p>
                      {enrollment.completedLessonCount} of {enrollment.totalLessons} lessons
                      completed — {enrollment.progressPercentage}%
                    </p>
                    <div
                      className="course-detail-progress-bar"
                      role="progressbar"
                      aria-valuenow={enrollment.progressPercentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${enrollment.progressPercentage}%` }} />
                    </div>
                  </div>
                ) : null}

                {modules.length ? (
                  <div className="course-modules">
                    {modules.map((module, moduleIndex) => (
                      <article key={module.id} className="course-module">
                        <header className="course-module-head">
                          <span className="course-module-index">Module {moduleIndex + 1}</span>
                          <h3>{module.title}</h3>
                          {module.description ? <p>{module.description}</p> : null}
                          <span className="course-module-count">
                            {module.lessons?.length || 0} lesson
                            {(module.lessons?.length || 0) === 1 ? '' : 's'}
                          </span>
                        </header>

                        {module.lessons?.length ? (
                          <ul className="course-lessons">
                            {module.lessons.map((lesson, lessonIndex) => {
                              const lessonProgress = progressByLessonId.get(lesson.id)
                              const state = getLessonStateLabel(lessonProgress)
                              const isLocked = lessonProgress?.lockState === 'LOCKED'

                              return (
                              <li key={lesson.id}>
                                {isLocked ? (
                                  <div className="course-lesson-row course-lesson-row--locked">
                                    <span className="course-lesson-index">{lessonIndex + 1}</span>
                                    <LessonTypeIcon type={lesson.type} />
                                    <div className="course-lesson-copy">
                                      <strong>{lesson.title}</strong>
                                      <span className="course-lesson-lock-reason">
                                        Complete the previous lesson to unlock this lesson.
                                      </span>
                                    </div>
                                    <span className={`course-lesson-state course-lesson-state--${state.className}`}>
                                      {state.label}
                                    </span>
                                  </div>
                                ) : (
                                <Link
                                  to={lessonPath(courseId, lesson.id)}
                                  className="course-lesson-row"
                                >
                                  <span className="course-lesson-index">{lessonIndex + 1}</span>
                                  <LessonTypeIcon type={lesson.type} />
                                  <div className="course-lesson-copy">
                                    <strong>{lesson.title}</strong>
                                    {lesson.description ? (
                                      <span>{lesson.description}</span>
                                    ) : (
                                      <span className="course-lesson-type">
                                        {formatLessonType(lesson.type)}
                                      </span>
                                    )}
                                  </div>
                                  {lessonProgress ? (
                                    <span className={`course-lesson-state course-lesson-state--${state.className}`}>
                                      {state.label}
                                    </span>
                                  ) : null}
                                  {lesson.durationMinutes ? (
                                    <span className="course-lesson-duration">
                                      {lesson.durationMinutes} min
                                    </span>
                                  ) : null}
                                </Link>
                                )}
                              </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="course-module-empty">No lessons in this module yet.</p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <AppEmptyState
                    icon="📖"
                    title="No modules available"
                    description="This course does not have any published modules yet. Check back soon for new content."
                  />
                )}
              </section>
            </div>

            <aside className="course-detail-sidebar" aria-label="Course summary">
              <div className="course-sidebar-card">
                <div className="course-sidebar-cover">
                  <CourseThumbnail
                    src={course.thumbnailUrl}
                    alt=""
                    className="course-sidebar-thumb"
                    fallbackClassName="course-sidebar-thumb"
                    placeholderLabel={course.title?.slice(0, 1) || 'C'}
                  />
                  {course.categoryName ? (
                    <span className="course-sidebar-category">{course.categoryName}</span>
                  ) : null}
                </div>

                  <div className="course-sidebar-content">
                  <p className="course-sidebar-label">Course overview</p>

                  {courseStatusLabel && enrollment ? (
                    <p
                      className={`course-sidebar-enrollment course-sidebar-enrollment--${courseStatusLabel.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {courseStatusLabel}
                      {courseStarted && enrollment.status !== 'COMPLETED'
                        ? ` · ${enrollment.progressPercentage}%`
                        : ''}
                    </p>
                  ) : null}

                  <div className="course-sidebar-stat-grid">
                    {course.level ? (
                      <div className="course-sidebar-stat">
                        <span className="course-sidebar-stat-label">Level</span>
                        <span className="course-sidebar-stat-value">{formatLevel(course.level)}</span>
                      </div>
                    ) : null}
                    {lessonCount ? (
                      <div className="course-sidebar-stat">
                        <span className="course-sidebar-stat-label">Lessons</span>
                        <span className="course-sidebar-stat-value">{lessonCount}</span>
                      </div>
                    ) : null}
                    {(course.estimatedMinutes || totalMinutes) ? (
                      <div className="course-sidebar-stat">
                        <span className="course-sidebar-stat-label">Duration</span>
                        <span className="course-sidebar-stat-value">
                          {course.estimatedMinutes || totalMinutes} min
                        </span>
                      </div>
                    ) : null}
                    {modules.length ? (
                      <div className="course-sidebar-stat">
                        <span className="course-sidebar-stat-label">Modules</span>
                        <span className="course-sidebar-stat-value">{modules.length}</span>
                      </div>
                    ) : null}
                    {course.ratingAverage ? (
                      <div className="course-sidebar-stat course-sidebar-stat--wide">
                        <span className="course-sidebar-stat-label">Rating</span>
                        <span className="course-sidebar-stat-value course-sidebar-stat-value--accent">
                          ★ {Number(course.ratingAverage).toFixed(1)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {continueLessonId ? (
                    <Link
                      to={lessonPath(courseId, continueLessonId)}
                      className="course-detail-cta"
                    >
                      {courseCtaLabel}
                    </Link>
                  ) : (
                    <span className="course-detail-cta course-detail-cta--disabled">
                      Content coming soon
                    </span>
                  )}
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {!loading && !error && !course ? (
          <AppEmptyState
            icon="📚"
            title="Course not found"
            description="This course may have been removed or is not published yet."
            action={
              <Link to={ROUTES.learn} className="course-detail-cta course-detail-cta--inline">
                Back to courses
              </Link>
            }
          />
        ) : null}
      </div>
    </main>
  )
}

export default CourseDetailPage
