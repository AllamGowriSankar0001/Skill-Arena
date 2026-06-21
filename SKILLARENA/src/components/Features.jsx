import { Link } from 'react-router-dom'
import { useCallback, useRef, useState } from 'react'
import ScrollReveal from './ScrollReveal'
import { ROUTES } from '../routes'
import './Features.css'

const FEATURES = [
  {
    index: '01 / 06',
    badge: 'Battles',
    theme: 'dark',
    icon: 'swords',
    title: '1v1 & 3v3 Battles',
    description:
      'Real-time skill duels. Pick a topic, drop into a match, and let your knowledge do the talking.',
    to: ROUTES.battles,
  },
  {
    index: '02 / 06',
    badge: 'Courses',
    theme: 'tan',
    icon: 'book',
    title: '500+ Free Courses',
    description:
      'Coding, design, languages, math, business — everything is free and built for momentum.',
    to: ROUTES.learn,
  },
  {
    index: '03 / 06',
    badge: 'Social',
    theme: 'light',
    icon: 'users',
    title: 'Play with Friends',
    description:
      'Invite friends, form squads, and run private tournaments with custom rules.',
    to: ROUTES.tournaments,
  },
  {
    index: '04 / 06',
    badge: 'Community',
    theme: 'dark',
    icon: 'chat',
    title: 'Live Chat & DMs',
    description: 'Talk strategy mid-match or just hang out in your study lounge.',
    to: ROUTES.community,
  },
  {
    index: '05 / 06',
    badge: 'Rankings',
    theme: 'tan',
    icon: 'trophy',
    title: 'Global Leaderboards',
    description: 'Climb seasonal ranks, earn badges, and showcase your arena profile.',
    to: ROUTES.leaderboard,
  },
  {
    index: '06 / 06',
    badge: 'Integrity',
    theme: 'light',
    icon: 'shield',
    title: 'Fair Play, Always',
    description:
      'Anti-cheat, smart matchmaking and clean moderation — so every win is earned.',
    to: ROUTES.security,
  },
]

const icons = {
  swords: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20 9 15" />
      <path d="M15 9 20 4" />
      <path d="m7 17 3-3" />
      <path d="m14 10 3-3" />
      <path d="M11 13 4 20" />
      <path d="M20 4l-7 7" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 4h8a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
      <path d="M8 4h8a3 3 0 0 1 3 3v13" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 19c.2-2.2 1.8-3.8 4-4" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H5a2 2 0 0 0 2 3" />
      <path d="M16 5h3a2 2 0 0 1-2 3" />
      <path d="M10 14h4" />
      <path d="M9 18h6" />
      <path d="M10 14v4h4v-4" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.2 3 7.8 7 9 4-1.2 7-4.8 7-9V6l-7-3z" />
      <path d="m9.5 12 1.8 1.8L15 10" />
    </svg>
  ),
}

const CARD_COUNT = FEATURES.length

function getCardOffset(index, activeIndex) {
  return (index - activeIndex + CARD_COUNT) % CARD_COUNT
}

function getCardTransform(offset) {
  if (offset === 0) {
    return 'translate(-50%, -50%) rotate(0deg) scale(1)'
  }

  const angle = (offset / CARD_COUNT) * 300 - 150
  const radians = (angle * Math.PI) / 180
  const radius = 95 + offset * 14
  const x = Math.sin(radians) * radius
  const y = Math.cos(radians) * radius * 0.28 + offset * 10

  return `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${angle * 0.35}deg) scale(${1 - offset * 0.028})`
}

const Features = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef(null)

  const goNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % CARD_COUNT)
  }, [])

  const goPrev = useCallback(() => {
    setActiveIndex((current) => (current - 1 + CARD_COUNT) % CARD_COUNT)
  }, [])

  const onTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX
  }

  const onTouchEnd = (event) => {
    if (touchStartX.current === null) return

    const deltaX = event.changedTouches[0].clientX - touchStartX.current

    if (Math.abs(deltaX) > 48) {
      if (deltaX < 0) goNext()
      else goPrev()
    }

    touchStartX.current = null
  }

  return (
    <section className="features" id="features">
      <div className="features-inner">
        <header className="features-header">
          <ScrollReveal>
            <p className="features-eyebrow">
              <span className="features-eyebrow-line" aria-hidden="true" />
              WHY SKILL ARENA
            </p>
          </ScrollReveal>

          <div className="features-intro">
            <ScrollReveal delay={80}>
              <h2 className="features-title">An arena built for curious minds.</h2>
            </ScrollReveal>
            <ScrollReveal delay={160}>
              <p className="features-subtitle">
                Learning is better when there&apos;s something on the line. Skill Arena turns
                lessons into matches and friends into rivals.
              </p>
            </ScrollReveal>
          </div>
        </header>

        <ScrollReveal delay={120}>
          <div className="features-deck-wrap">
            <div
              className="features-deck"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {FEATURES.map((feature, index) => {
                const offset = getCardOffset(index, activeIndex)

                return (
                  <article
                    key={feature.index}
                    className={`deck-card deck-card--${feature.theme}${offset === 0 ? ' deck-card--active' : ''}`}
                    style={{
                      zIndex: CARD_COUNT - offset,
                      transform: getCardTransform(offset),
                    }}
                    aria-hidden={offset !== 0}
                  >
                    <span className="deck-card-badge">{feature.badge}</span>
                    <div className="deck-card-body">
                      <div className="deck-card-icon">{icons[feature.icon]}</div>
                      <h3 className="deck-card-title">{feature.title}</h3>
                      <p className="deck-card-description">{feature.description}</p>
                      {offset === 0 ? (
                        <Link to={feature.to} className="deck-card-link">
                          Explore <span aria-hidden="true">→</span>
                        </Link>
                      ) : null}
                    </div>
                    <span className="deck-card-index">{feature.index}</span>
                  </article>
                )
              })}
            </div>

            <div className="features-deck-nav">
              <button
                type="button"
                className="features-deck-nav-btn"
                onClick={goPrev}
                aria-label="Previous feature"
              >
                ‹
              </button>
              <span className="features-deck-nav-label">Swipe</span>
              <button
                type="button"
                className="features-deck-nav-btn"
                onClick={goNext}
                aria-label="Next feature"
              >
                ›
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default Features
