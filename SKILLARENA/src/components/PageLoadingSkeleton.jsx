import BoneyardSkeleton from './BoneyardSkeleton'
import './PageLoadingSkeleton.css'

const PageFixture = () => (
  <div className="page-loading-fixture" aria-hidden="true">
    <div className="page-loading-fixture-kicker" />
    <div className="page-loading-fixture-title" />
    <div className="page-loading-fixture-line" />
    <div className="page-loading-fixture-line page-loading-fixture-line--short" />
    <div className="page-loading-fixture-grid">
      <div className="page-loading-fixture-card" />
      <div className="page-loading-fixture-card" />
      <div className="page-loading-fixture-card" />
    </div>
  </div>
)

const ListFixture = () => (
  <div className="page-loading-fixture" aria-hidden="true">
    <div className="page-loading-fixture-row" />
    <div className="page-loading-fixture-row" />
    <div className="page-loading-fixture-row" />
    <div className="page-loading-fixture-row" />
  </div>
)

/**
 * Shared Boneyard loading UI for full pages / lists.
 * @param {'page' | 'list'} variant
 */
const PageLoadingSkeleton = ({
  variant = 'page',
  label = 'Loading',
  className = '',
  count = 1,
}) => {
  const name = variant === 'list' ? 'list-loading' : 'page-loading'
  const fixture = variant === 'list' ? <ListFixture /> : <PageFixture />

  return (
    <div
      className={`page-loading-skeleton${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <BoneyardSkeleton key={`${name}-${index}`} name={name} loading fixture={fixture}>
          {fixture}
        </BoneyardSkeleton>
      ))}
    </div>
  )
}

export default PageLoadingSkeleton
