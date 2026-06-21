import { Link } from 'react-router-dom'
import ScrollReveal from './ScrollReveal'
import { ROUTES } from '../routes'
import './LearnSection.css'

const LIBRARY_IMAGE = '/library.png'

const LearnSection = () => {
  return (
    <section className="learn" id="learn">
      <div className="learn-inner">
        <div className="learn-content">
          <ScrollReveal>
            <p className="learn-eyebrow">
              <span className="learn-eyebrow-line" aria-hidden="true" />
              LEARN
            </p>
          </ScrollReveal>

          <ScrollReveal delay={80}>
            <h2 className="learn-title">A library that grows with you.</h2>
          </ScrollReveal>

          <ScrollReveal delay={160}>
            <p className="learn-description">
              Bite-sized lessons, hands-on projects, and instant feedback. Track your
              XP, unlock paths, and watch your skill graph fill in week after week.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={240}>
            <Link to={ROUTES.learn} className="learn-link">
              Explore courses <span aria-hidden="true">→</span>
            </Link>
          </ScrollReveal>
        </div>

        <ScrollReveal className="learn-media-wrap" delay={120}>
          <div className="learn-media">
            <img
              className="learn-image"
              src={LIBRARY_IMAGE}
              alt="Skill Arena learning library with courses, progress tracking, streaks, and skill paths"
              width={1024}
              height={1024}
              loading="lazy"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default LearnSection
