import { Link } from 'react-router-dom'
import ScrollReveal from './ScrollReveal'
import { ROUTES } from '../routes'
import './CommunitySection.css'

const COMMUNITY_IMAGE = '/community.png'

const CommunitySection = () => {
  return (
    <section className="community" id="community">
      <div className="community-inner">
        <ScrollReveal className="community-media-wrap">
          <div className="community-media">
            <img
              className="community-image"
              src={COMMUNITY_IMAGE}
              alt="Skill Arena community with squads, real-time chat, and study sessions"
              width={1024}
              height={1024}
              loading="lazy"
            />
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
            <Link to={ROUTES.community} className="community-link">
              Join the community <span aria-hidden="true">→</span>
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export default CommunitySection
