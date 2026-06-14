import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import ScrollReveal from './ScrollReveal'
import { FOOTER_LINKS } from '../routes'
import './Footer.css'

const SOCIAL_LINKS = [
  { label: 'Twitter', icon: 'x' },
  { label: 'GitHub', icon: 'github' },
  { label: 'Instagram', icon: 'instagram' },
  { label: 'YouTube', icon: 'youtube' },
]

const socialIcons = {
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.3 3h3.1l-6.8 7.8L21.5 21h-6.1l-4.8-6.2L4.8 21H1.7l7.3-8.4L2.5 3h6.2l4.3 5.7L17.3 3zm-1.1 16.2h1.7L7.1 4.8H5.3l11 14.4z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.17-1.11-1.48-1.11-1.48-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.36 1.11 2.94.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.32.1-2.74 0 0 .84-.27 2.75 1.05A9.2 9.2 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.48.1 2.74.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.03 10.03 0 0 0 22 12.24C22 6.58 17.52 2 12 2z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 4.5A5.5 5.5 0 1 1 6.5 14 5.5 5.5 0 0 1 12 8.5zm0 2A3.5 3.5 0 1 0 15.5 14 3.5 3.5 0 0 0 12 10.5zM17.8 6.3a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.12 5 12 5 12 5s-6.12 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26.1 26.1 0 0 0 2 12a26.1 26.1 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.88 19 12 19 12 19s6.12 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26.1 26.1 0 0 0 22 12a26.1 26.1 0 0 0-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  ),
}

const Footer = ({ compact = false }) => {
  if (compact) {
    return (
      <footer className="app-footer">
        <div className="app-footer-inner">
          <p className="app-footer-copy">© 2028 Skill Arena</p>
          <nav className="app-footer-links" aria-label="Footer">
            <Link to="/">Home</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/help-center">Help</Link>
            <Link to="/privacy">Privacy</Link>
          </nav>
        </div>
      </footer>
    )
  }

  return (
    <footer className="footer">
      <div className="footer-watermark" aria-hidden="true">
        <span className="footer-watermark-skill">SKILL</span>
        <span className="footer-watermark-slash" />
        <span className="footer-watermark-arena">ARENA</span>
      </div>

      <div className="footer-inner">
        <ScrollReveal>
          <div className="footer-top">
            <div className="footer-brand">
              <Link to="/" className="footer-brand-link" aria-label="Skill Arena home">
                <BrandLogo className="footer-brand-logo" />
              </Link>

              <p className="footer-tagline">
                The free LMS where curiosity meets competition. Learn anything. Battle anyone.
              </p>

              <div className="footer-social">
                {SOCIAL_LINKS.map(({ label, icon }) => (
                  <a
                    key={label}
                    href="#"
                    className="footer-social-link"
                    aria-label={label}
                  >
                    {socialIcons[icon]}
                  </a>
                ))}
              </div>
            </div>

            <div className="footer-links">
              {Object.entries(FOOTER_LINKS).map(([title, links]) => (
                <div key={title} className="footer-column">
                  <h3 className="footer-column-title">{title}</h3>
                  <ul className="footer-column-list">
                    {links.map(({ label, to }) => (
                      <li key={label}>
                        <Link to={to}>{label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <div className="footer-bottom">
            <p className="footer-copy">© 2028 Skill Arena. All rights reserved.</p>
            <button type="button" className="footer-locale">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.8 3.2 2.8 14.8 0 18M12 3c-2.8 3.2-2.8 14.8 0 18" />
              </svg>
              English (US)
            </button>
          </div>
        </ScrollReveal>
      </div>
    </footer>
  )
}

export default Footer
