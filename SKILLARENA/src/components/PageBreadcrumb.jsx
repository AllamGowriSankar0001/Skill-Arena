import { Link } from 'react-router-dom'
import './PageBreadcrumb.css'

/**
 * Path-style navigation: Home / Section / Current
 * Place at the top of page content (before the title).
 */
const PageBreadcrumb = ({ items = [], className = '' }) => {
  if (!items.length) return null

  return (
    <nav className={`page-breadcrumb ${className}`.trim()} aria-label="Breadcrumb">
      <ol className="page-breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="page-breadcrumb-item">
              {index > 0 ? (
                <span className="page-breadcrumb-sep" aria-hidden="true">
                  /
                </span>
              ) : null}
              {item.to && !isLast ? (
                <Link to={item.to} className="page-breadcrumb-link">
                  {item.label}
                </Link>
              ) : (
                <span className="page-breadcrumb-current" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default PageBreadcrumb
