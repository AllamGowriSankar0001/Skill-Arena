import { Link } from 'react-router-dom'
import CourseThumbnail from './CourseThumbnail'
import { getCourseCtaLabel } from '../utils/courseProgress'
import { ROUTES } from '../routes'

const formatLevel = (level = '') =>
  level
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const CourseCard = ({ course, enrollment = null, asLink = true }) => {
  const cardAction = enrollment?.hasStarted ? getCourseCtaLabel(enrollment) : 'View course'

  const body = (
    <>
      <div className="course-card-media">
        <CourseThumbnail
          src={course.thumbnailUrl}
          alt=""
          placeholderLabel={course.title?.slice(0, 1) || 'C'}
        />
        {course.level ? <span className="course-card-badge">{formatLevel(course.level)}</span> : null}
        {enrollment?.hasStarted && enrollment.status !== 'COMPLETED' ? (
          <span className="course-card-badge course-card-badge--progress">In progress</span>
        ) : null}
        {enrollment?.status === 'COMPLETED' ? (
          <span className="course-card-badge course-card-badge--completed">Completed</span>
        ) : null}
      </div>

      <div className="course-card-body">
        <h2>{course.title}</h2>
        {course.shortDescription ? <p className="course-card-desc">{course.shortDescription}</p> : null}

        <div className="course-card-meta">
          {course.lessonCount != null ? <span>{course.lessonCount} lessons</span> : null}
          {course.estimatedMinutes ? <span>{course.estimatedMinutes} min</span> : null}
          {enrollment?.hasStarted ? (
            <span className="course-card-progress">{enrollment.progressPercentage}% complete</span>
          ) : null}
          {course.ratingAverage ? (
            <span className="course-card-rating">★ {Number(course.ratingAverage).toFixed(1)}</span>
          ) : null}
        </div>

        <span className="course-card-action">{cardAction} →</span>
      </div>
    </>
  )

  if (!asLink) {
    return <article className="course-card">{body}</article>
  }

  return (
    <Link to={`${ROUTES.learn}/${course.id}`} className="course-card">
      {body}
    </Link>
  )
}

export default CourseCard
