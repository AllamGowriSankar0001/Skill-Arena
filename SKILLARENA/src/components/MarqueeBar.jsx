import './MarqueeBar.css'

const MARQUEE_ITEMS = [
  'LEARN',
  'BATTLE',
  'RANK UP',
  'REPEAT',
  '1V1',
  '3V3',
  'FREE FOREVER',
]

const MarqueeItems = ({ keyPrefix = '' }) => (
  <>
    {MARQUEE_ITEMS.map((item) => (
      <span key={`${keyPrefix}${item}`} className="marquee-bar-item">
        <span className="marquee-bar-text">{item}</span>
        <span className="marquee-bar-star" aria-hidden="true">★</span>
      </span>
    ))}
  </>
)

const MarqueeBar = () => {
  return (
    <section className="marquee-bar" aria-label="Skill Arena highlights">
      <div className="marquee-bar-track">
        <div className="marquee-bar-content">
          <MarqueeItems keyPrefix="a-" />
        </div>
        <div className="marquee-bar-content" aria-hidden="true">
          <MarqueeItems keyPrefix="b-" />
        </div>
      </div>
    </section>
  )
}

export default MarqueeBar
