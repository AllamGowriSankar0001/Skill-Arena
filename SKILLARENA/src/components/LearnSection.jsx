import ScrollReveal from './ScrollReveal'
import MediaPlaceholder from './MediaPlaceholder'
import './LearnSection.css'

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
            <a href="#learn" className="learn-link">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </ScrollReveal>
        </div>

        <ScrollReveal className="learn-media-wrap" delay={120}>
          <div className="learn-media" aria-hidden="true">
            <MediaPlaceholder />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default LearnSection
