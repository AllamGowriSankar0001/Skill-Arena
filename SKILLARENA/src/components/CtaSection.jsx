import { Link } from 'react-router-dom'
import ScrollReveal from './ScrollReveal'
import { ROUTES } from '../routes'
import './CtaSection.css'

const CtaSection = () => {
  return (
    <section className="cta">
      <div className="cta-inner">
        <ScrollReveal>
          <h2 className="cta-title">Your next skill is one match away.</h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <p className="cta-subtitle">
            Join Skill Arena free. No credit card. No paywalls. Just learning that
            feels like winning.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="cta-actions">
            <Link to={ROUTES.signup} className="cta-btn cta-btn-primary">
              Create free account <span aria-hidden="true">→</span>
            </Link>
            <Link to={ROUTES.login} className="cta-btn cta-btn-secondary">
              I have an account
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default CtaSection
