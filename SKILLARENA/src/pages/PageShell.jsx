import ScrollReveal from '../components/ScrollReveal'
import PageBreadcrumb from '../components/PageBreadcrumb'
import { ROUTES } from '../routes'
import './PageShell.css'

const PageShell = ({
  eyebrow,
  title,
  description,
  children,
  showBackLink = true,
  staticLayout = false,
  breadcrumbLabel,
}) => {
  const crumbLabel = breadcrumbLabel || title || 'Page'

  return (
    <main className={`page-shell${staticLayout ? ' page-shell--static' : ''}`}>
      <div className="page-shell-inner">
        {showBackLink ? (
          <ScrollReveal disabled={staticLayout}>
            <PageBreadcrumb
              items={[
                { label: 'Home', to: ROUTES.home },
                { label: crumbLabel },
              ]}
            />
          </ScrollReveal>
        ) : null}

        <ScrollReveal delay={staticLayout ? 0 : 40} disabled={staticLayout}>
          <p className="page-shell-eyebrow">
            <span className="page-shell-eyebrow-line" aria-hidden="true" />
            {eyebrow}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={staticLayout ? 0 : 80} disabled={staticLayout}>
          <h1 className="page-shell-title">{title}</h1>
        </ScrollReveal>

        <ScrollReveal delay={staticLayout ? 0 : 160} disabled={staticLayout}>
          <p className="page-shell-description">{description}</p>
        </ScrollReveal>

        <ScrollReveal delay={staticLayout ? 0 : 240} disabled={staticLayout}>
          <div className="page-shell-body">{children}</div>
        </ScrollReveal>
      </div>
    </main>
  )
}

export default PageShell
