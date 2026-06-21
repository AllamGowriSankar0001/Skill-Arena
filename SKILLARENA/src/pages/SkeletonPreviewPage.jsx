import BoneyardSkeleton from '../components/BoneyardSkeleton'
import CommunityMessagePreview from '../components/CommunityMessagePreview'
import CourseCard from '../components/CourseCard'
import PracticeCard from '../components/PracticeCard'
import {
  MOCK_COMMUNITY_MESSAGE,
  MOCK_COURSE,
  MOCK_PRACTICE,
} from '../fixtures/skeletonFixtures'
import '../pages/CoursesPage.css'
import '../pages/PracticePage.css'
import '../pages/CommunityPage.css'
import './SkeletonPreviewPage.css'

const courseFixture = <CourseCard course={MOCK_COURSE} asLink={false} />
const practiceFixture = <PracticeCard assessment={MOCK_PRACTICE} asLink={false} />
const messageFixture = <CommunityMessagePreview message={MOCK_COMMUNITY_MESSAGE} />

const SkeletonPreviewPage = () => (
  <main className="skeleton-preview-page">
    <h1 className="skeleton-preview-title">Boneyard capture preview</h1>

    <section className="skeleton-preview-section">
      <h2>Learn course card</h2>
      <div className="courses-grid skeleton-preview-grid">
        <BoneyardSkeleton name="learn-course-card" loading={false} fixture={courseFixture}>
          {courseFixture}
        </BoneyardSkeleton>
      </div>
    </section>

    <section className="skeleton-preview-section">
      <h2>Practice card</h2>
      <div className="practice-grid skeleton-preview-grid">
        <BoneyardSkeleton name="practice-card" loading={false} fixture={practiceFixture}>
          {practiceFixture}
        </BoneyardSkeleton>
      </div>
    </section>

    <section className="skeleton-preview-section">
      <h2>Community message</h2>
      <div className="disc-messages skeleton-preview-messages">
        <BoneyardSkeleton name="community-message" loading={false} fixture={messageFixture}>
          {messageFixture}
        </BoneyardSkeleton>
      </div>
    </section>
  </main>
)

export default SkeletonPreviewPage
