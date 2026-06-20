import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppEmptyState from '../components/AppEmptyState'
import BlogContent from '../components/BlogContent'
import LessonQuiz from '../components/LessonQuiz'
import VideoLessonPlayer from '../components/VideoLessonPlayer'
import { getStoredUser, learningApi, platformApi } from '../services/api'
import { ROUTES } from '../routes'
import './AppSectionPage.css'
import './LessonPage.css'

const CodingPlayground = lazy(() => import('../components/CodingPlayground'))

const formatLabel = (value = '') =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const statusLabel = (status) => {
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'IN_PROGRESS') return 'In Progress'
  return 'Not Started'
}

const LessonPage = () => {
  const { courseId, lessonId } = useParams()
  const user = getStoredUser()
  const [lesson, setLesson] = useState(null)
  const [progressDetail, setProgressDetail] = useState(null)
  const [courseProgress, setCourseProgress] = useState(null)
  const [codingPayload, setCodingPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progressLoading, setProgressLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [lockedMessage, setLockedMessage] = useState('')

  const coursePath = `${ROUTES.learn}/${courseId || lesson?.courseId}`

  const refreshProgress = useCallback(async () => {
    if (!user || !lessonId) return
    try {
      const detail = await learningApi.lessonProgress(lessonId)
      setProgressDetail(detail)
      if (courseId || detail.courseId) {
        const progress = await learningApi.courseProgress(courseId || detail.courseId)
        setCourseProgress(progress)
      }
    } catch {
      /* progress optional when logged out */
    }
  }, [user, lessonId, courseId])

  useEffect(() => {
    if (!lessonId) return

    setLoading(true)
    setError('')
    setLockedMessage('')

    platformApi
      .lesson(lessonId)
      .then((data) => setLesson(data.lesson))
      .catch((err) => setError(err.message || 'Failed to load lesson'))
      .finally(() => setLoading(false))
  }, [lessonId])

  useEffect(() => {
    if (!user || !lessonId || loading) return

    let cancelled = false

    const bootstrap = async () => {
      setProgressLoading(true)
      try {
        if (courseId) {
          try {
            await learningApi.enroll(courseId)
          } catch {
            /* already enrolled */
          }
        }

        await learningApi.startLesson(lessonId)
        const detail = await learningApi.lessonProgress(lessonId)
        if (cancelled) return
        setProgressDetail(detail)

        if (courseId || detail.courseId) {
          const progress = await learningApi.courseProgress(courseId || detail.courseId)
          if (!cancelled) setCourseProgress(progress)
        }
      } catch (err) {
        if (err.code === 'LESSON_LOCKED') {
          setLockedMessage(err.message || 'Complete the previous lesson to unlock this lesson.')
        } else if (!cancelled) {
          setError(err.message || 'Failed to load lesson progress')
        }
      } finally {
        if (!cancelled) setProgressLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [user, lessonId, courseId, loading])

  useEffect(() => {
    if (!user || !lessonId || lesson?.type !== 'CODING' || lockedMessage) return
    learningApi
      .getCoding(lessonId)
      .then(setCodingPayload)
      .catch((err) => setError(err.message || 'Failed to load coding lesson'))
  }, [user, lessonId, lesson?.type, lockedMessage])

  const handleArticleComplete = async () => {
    setActionLoading(true)
    setError('')
    try {
      await learningApi.completeLesson(lessonId)
      await refreshProgress()
    } catch (err) {
      setError(err.message || 'Failed to mark lesson complete')
    } finally {
      setActionLoading(false)
    }
  }

  const handleArticleIncomplete = async () => {
    setActionLoading(true)
    setError('')
    try {
      await learningApi.markIncomplete(lessonId)
      await refreshProgress()
    } catch (err) {
      setError(err.message || 'Failed to update lesson')
    } finally {
      setActionLoading(false)
    }
  }

  const renderArticleActions = () => {
    const completed = progressDetail?.status === 'COMPLETED'
    const nextId = progressDetail?.nextLessonId

    return (
      <div className="lesson-page-actions">
        {completed ? (
          <>
            <button type="button" className="app-section-button is-complete" disabled>
              Completed ✓
            </button>
            <button
              type="button"
              className="app-section-button"
              onClick={handleArticleIncomplete}
              disabled={actionLoading}
            >
              Mark as Incomplete
            </button>
            {nextId ? (
              <Link to={`${coursePath}/lessons/${nextId}`} className="app-section-button app-section-button--link">
                Continue to Next Lesson
              </Link>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            className="app-section-button app-section-button--primary"
            onClick={handleArticleComplete}
            disabled={actionLoading || Boolean(lockedMessage)}
          >
            {actionLoading ? 'Saving…' : 'Mark as Complete'}
          </button>
        )}
      </div>
    )
  }

  const renderContent = () => {
    if (!lesson || lockedMessage) return null

    if (lesson.type === 'VIDEO') {
      return (
        <VideoLessonPlayer
          lessonId={lessonId}
          url={lesson.content?.videoUrl}
          title={lesson.title}
          progress={progressDetail}
          onCompleted={refreshProgress}
        />
      )
    }

    if (lesson.type === 'QUIZ') {
      return (
        <LessonQuiz
          lessonId={lessonId}
          quiz={lesson.quiz}
          progress={progressDetail}
          completionXpReward={lesson.completionXpReward}
          onCompleted={refreshProgress}
        />
      )
    }

    if (lesson.type === 'CODING') {
      if (!user) {
        return (
          <AppEmptyState
            icon="🔐"
            title="Sign in required"
            description="Log in to access the coding playground, save drafts, and submit your solution."
          />
        )
      }
      return (
        <Suspense fallback={<p className="app-section-meta">Loading coding playground…</p>}>
          <CodingPlayground
            lessonId={lessonId}
            payload={codingPayload}
            progress={progressDetail}
            onProgressUpdate={refreshProgress}
            nextLessonId={progressDetail?.nextLessonId}
            coursePath={coursePath}
          />
        </Suspense>
      )
    }

    return (
      <>
        <div className="app-lesson-content app-lesson-content--article">
          <BlogContent content={lesson.content?.articleHtml || ''} />
        </div>
        {user ? renderArticleActions() : null}
      </>
    )
  }

  const enrollment = courseProgress?.enrollment

  return (
    <main className="app-section">
      <div className="app-section-inner app-section-inner--lesson">
        <Link to={coursePath} className="app-section-back">
          ← Back to course
        </Link>

        {loading || progressLoading ? (
          <p className="app-section-meta" aria-live="polite">
            Loading lesson…
          </p>
        ) : null}
        {error ? <p className="app-section-error">{error}</p> : null}

        {!loading && !error && lesson ? (
          <>
            <p className="app-section-eyebrow">
              {lesson.courseTitle}
              {lesson.moduleTitle ? ` • ${lesson.moduleTitle}` : ''}
            </p>
            <h1>{lesson.title}</h1>
            {lesson.description ? <p className="app-section-lead">{lesson.description}</p> : null}
            <p className="app-section-meta">
              {formatLabel(lesson.type)}
              {lesson.durationMinutes ? ` • ${lesson.durationMinutes} min` : ''}
              {progressDetail ? ` • ${statusLabel(progressDetail.status)}` : ''}
            </p>

            {enrollment ? (
              <div className="lesson-page-course-progress">
                <strong>Course Progress</strong>
                <p>
                  {enrollment.completedLessonCount} of {enrollment.totalLessons} lessons completed —{' '}
                  {enrollment.progressPercentage}%
                </p>
                <div
                  className="lesson-page-progress-bar"
                  role="progressbar"
                  aria-valuenow={enrollment.progressPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${enrollment.progressPercentage}%` }} />
                </div>
              </div>
            ) : null}

            {lockedMessage ? (
              <AppEmptyState
                icon="🔒"
                title="Lesson locked"
                description={lockedMessage}
                action={
                  progressDetail?.previousLessonId ? (
                    <Link
                      to={`${coursePath}/lessons/${progressDetail.previousLessonId}`}
                      className="app-section-button app-section-button--link"
                    >
                      Go to previous lesson
                    </Link>
                  ) : (
                    <Link to={coursePath} className="app-section-button app-section-button--link">
                      Back to course
                    </Link>
                  )
                }
              />
            ) : (
              renderContent()
            )}

            {!lockedMessage && progressDetail ? (
              <nav className="lesson-page-nav" aria-label="Lesson navigation">
                {progressDetail.previousLessonId ? (
                  <Link to={`${coursePath}/lessons/${progressDetail.previousLessonId}`}>
                    ← Previous lesson
                  </Link>
                ) : (
                  <span />
                )}
                {progressDetail.nextLessonId ? (
                  <Link to={`${coursePath}/lessons/${progressDetail.nextLessonId}`}>
                    Next lesson →
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        ) : null}

        {!loading && !error && !lesson ? (
          <AppEmptyState
            icon="📖"
            title="Lesson not found"
            description="This lesson may have been removed or is not published yet."
            action={
              <Link to={ROUTES.learn} className="app-section-button app-section-button--link">
                Back to courses
              </Link>
            }
          />
        ) : null}
      </div>
    </main>
  )
}

export default LessonPage
