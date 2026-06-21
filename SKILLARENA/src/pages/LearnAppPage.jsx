import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppEmptyState from '../components/AppEmptyState'
import BoneyardSkeleton from '../components/BoneyardSkeleton'
import CourseCard from '../components/CourseCard'
import { MOCK_COURSE } from '../fixtures/skeletonFixtures'
import { getStoredUser, learningApi, platformApi } from '../services/api'
import { ROUTES } from '../routes'
import './AppSectionPage.css'
import './CoursesPage.css'

const COURSE_CARD_FIXTURE = <CourseCard course={MOCK_COURSE} asLink={false} />
const SKELETON_COUNT = 6

const LearnAppPage = () => {
  const user = getStoredUser()
  const [courses, setCourses] = useState([])
  const [enrollmentByCourseId, setEnrollmentByCourseId] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi
      .courses()
      .then((data) => setCourses(data.courses || []))
      .catch((err) => setError(err.message || 'Failed to load courses'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) {
      setEnrollmentByCourseId(new Map())
      return
    }

    learningApi
      .enrollments()
      .then((data) => {
        const map = new Map()
        ;(data.enrollments || []).forEach((entry) => map.set(entry.courseId, entry))
        setEnrollmentByCourseId(map)
      })
      .catch(() => {})
  }, [user])

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
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <BoneyardSkeleton
                key={index}
                name="learn-course-card"
                loading
                fixture={COURSE_CARD_FIXTURE}
                className="course-card-skeleton-wrap"
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && courses.length ? (
          <div className="courses-grid">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                enrollment={enrollmentByCourseId.get(course.id)}
              />
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
