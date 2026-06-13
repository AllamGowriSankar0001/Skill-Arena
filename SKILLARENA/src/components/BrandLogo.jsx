const BrandLogo = ({ className = '' }) => (
  <span className={`brand-logo ${className}`.trim()}>
    <span className="brand-logo-skill">SKILL</span>
    <span className="brand-logo-slash" aria-hidden="true" />
    <span className="brand-logo-arena">ARENA</span>
  </span>
)

export default BrandLogo
