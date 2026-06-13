import ScrollReveal from './ScrollReveal'
import './CommunitySection.css'

const CommunitySection = () => {
  return (
    <section className="community" id="community">
      <div className="community-inner">
        <ScrollReveal className="community-media-wrap">
          <div className="community-media" aria-hidden="true">
            <div className="community-media-placeholder">
              <span>Image coming soon</span>
            </div>
          </div>
        </ScrollReveal>

        <div className="community-content">
          <ScrollReveal>
            <p className="community-eyebrow">
              <span className="community-eyebrow-line" aria-hidden="true" />
              COMMUNITY
            </p>
          </ScrollReveal>

          <h2 className="community-title">
            <ScrollReveal as="span" className="community-title-line" delay={80}>
              Better together,
            </ScrollReveal>
            <ScrollReveal
              as="span"
              className="community-title-line community-title-accent"
              delay={160}
            >
              louder in chat.
            </ScrollReveal>
          </h2>

          <ScrollReveal delay={240}>
            <p className="community-description">
              Add friends, build squads, and chat in real time. Coach each other through
              hard topics, share replays, and turn study sessions into hangouts.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={320}>
            <a href="#community" className="community-link">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export default CommunitySection
