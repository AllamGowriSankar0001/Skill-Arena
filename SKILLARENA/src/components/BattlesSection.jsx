import ScrollReveal from './ScrollReveal'
import MediaPlaceholder from './MediaPlaceholder'
import './BattlesSection.css'

const BattlesSection = () => {
  return (
    <section className="battles" id="battles">
      <div className="battles-inner">
        <ScrollReveal className="battles-media-wrap">
          <div className="battles-media" aria-hidden="true">
            <MediaPlaceholder />
          </div>
        </ScrollReveal>

        <div className="battles-content">
          <ScrollReveal>
            <p className="battles-eyebrow">
              <span className="battles-eyebrow-line" aria-hidden="true" />
              BATTLES
            </p>
          </ScrollReveal>

          <h2 className="battles-title">
            <ScrollReveal as="span" className="battles-title-line" delay={80}>
              Real matches.
            </ScrollReveal>
            <ScrollReveal as="span" className="battles-title-line" delay={160}>
              <span className="battles-title-accent">Real</span> skills.
            </ScrollReveal>
          </h2>

          <ScrollReveal delay={240}>
            <p className="battles-description">
              Queue up for fast 1v1 duels or rally a squad for 3v3 showdowns. Every
              match adapts to your level, so it always feels fair and always feels alive.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={320}>
            <a href="#battles" className="battles-link">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export default BattlesSection
