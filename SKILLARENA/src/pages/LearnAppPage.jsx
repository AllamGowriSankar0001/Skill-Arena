import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppEmptyState from '../components/AppEmptyState'
import CourseThumbnail from '../components/CourseThumbnail'
import { platformApi } from '../services/api'
import { ROUTES } from '../routes'
import './AppSectionPage.css'
import './CoursesPage.css'

const formatLevel = (level = '') =>
  level
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const CourseCardSkeleton = () => (
  <div className="course-card course-card--skeleton" aria-hidden="true">
    <div className="course-card-media course-card-media--skeleton" />
    <div className="course-card-body">
      <div className="courses-skeleton-line courses-skeleton-line--title" />
      <div className="courses-skeleton-line courses-skeleton-line--copy" />
      <div className="courses-skeleton-line courses-skeleton-line--meta" />
    </div>
  </div>
)

const LearnAppPage = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi
      .courses()
      .then((data) => setCourses(data.courses || []))
      .catch((err) => setError(err.message || 'Failed to load courses'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="courses-page">
      <div className="courses-page-inner">
        <header className="courses-page-header">
          <p className="courses-eyebrow">Learn</p>
          <h1>Courses & learning paths</h1>
          <p className="courses-lead">
            Structured programs with modules and lessons — learn at your own pace and track your
            progress in the arena.
          </p>
          {!loading && courses.length ? (
            <p className="courses-count">
              {courses.length} course{courses.length === 1 ? '' : 's'} available
            </p>
          ) : null}
        </header>

        {error ? <p className="courses-alert courses-alert--error">{error}</p> : null}

        {loading ? (
          <div className="courses-grid" aria-busy="true" aria-label="Loading courses">
            {Array.from({ length: 6 }).map((_, index) => (
              <CourseCardSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {!loading && !error && courses.length ? (
          <div className="courses-grid">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`${ROUTES.learn}/${course.id}`}
                className="course-card"
              >
                <div className="course-card-media">
                  <CourseThumbnail
                    src={course.thumbnailUrl}
                    alt=""
                    placeholderLabel={course.title?.slice(0, 1) || 'C'}
                  />
                  {course.level ? (
                    <span className="course-card-badge">{formatLevel(course.level)}</span>
                  ) : null}
                </div>

                <div className="course-card-body">
                  <h2>{course.title}</h2>
                  {course.shortDescription ? (
                    <p className="course-card-desc">{course.shortDescription}</p>
                  ) : null}

                  <div className="course-card-meta">
                    {course.lessonCount != null ? (
                      <span>{course.lessonCount} lessons</span>
                    ) : null}
                    {course.estimatedMinutes ? (
                      <span>{course.estimatedMinutes} min</span>
                    ) : null}
                    {course.ratingAverage ? (
                      <span className="course-card-rating">
                        ★ {Number(course.ratingAverage).toFixed(1)}
                      </span>
                    ) : null}
                  </div>

                  <span className="course-card-action">View course →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {!loading && !error && !courses.length ? (
          <AppEmptyState
            icon="📚"
            title="No courses available"
            description="There are no published courses yet. Check back soon — new learning paths are added regularly."
          />
        ) : null}
      </div>
    </main>
  )
}

export default LearnAppPage
