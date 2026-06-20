import ScrollReveal from './ScrollReveal'
import heroImage from '../assets/hero-image.png'
import './Hero.css'

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-content">
          <ScrollReveal>
            <span className="hero-badge">
              <span className="hero-badge-icon" aria-hidden="true">✦</span>
              THE NEXT-GEN LMS
            </span>
          </ScrollReveal>

          <h1 className="hero-title">
            <ScrollReveal as="span" className="hero-title-line" delay={80}>
              Learn fast.
            </ScrollReveal>
            <ScrollReveal as="span" className="hero-title-line" delay={160}>
              Battle
            </ScrollReveal>
            <ScrollReveal as="span" className="hero-title-line" delay={240}>
              <span className="hero-title-accent">
                harder.
                <svg
                  className="hero-title-underline"
                  viewBox="0 0 280 16"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 12 C 70 4, 140 18, 278 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </ScrollReveal>
          </h1>

          <ScrollReveal delay={320}>
            <p className="hero-description">
              Skill Arena is the free LMS where you sharpen real skills and prove them
              in <strong>1v1</strong> and <strong>3v3</strong> battles. Learn with friends,
              chat live, and climb the global ladder.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <div className="hero-actions">
              <button type="button" className="hero-btn hero-btn-primary">
                Enter the Arena <span aria-hidden="true">→</span>
              </button>
              <button type="button" className="hero-btn hero-btn-secondary">
                How it works
              </button>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal className="hero-aside-wrap" delay={200}>
          <div className="hero-aside">
            <img
              className="hero-image"
              src={heroImage}
              alt="Students learning and competing in Skill Arena with courses, battles, XP, and leaderboards"
              width={1024}
              height={1024}
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default Hero
