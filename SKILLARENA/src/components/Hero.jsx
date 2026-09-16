import { Link, useNavigate } from 'react-router-dom'
import ScrollReveal from './ScrollReveal'
import heroImage from '../assets/hero-image.png'
import { ROUTES } from '../routes'
import './Hero.css'

const Hero = () => {
  const navigate = useNavigate()

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

          <div className="hero-actions">
            <Link to={ROUTES.signup} className="hero-btn hero-btn-primary">
              Enter the Arena <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#features"
              className="hero-btn hero-btn-secondary"
              onClick={(event) => {
                event.preventDefault()
                const section = document.getElementById('features')
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                navigate({ pathname: ROUTES.home, hash: 'features' })
              }}
            >
              How it works
            </a>
          </div>
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
