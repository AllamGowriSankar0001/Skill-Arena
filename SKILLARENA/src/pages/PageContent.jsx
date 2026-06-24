import ScrollReveal from '../components/ScrollReveal'

export function PageContent({ sections, staticLayout = false }) {
  if (!sections?.length) return null

  return (
    <div className={`page-content${staticLayout ? ' page-content--static' : ''}`}>
      {sections.map((section, index) => (
        <ScrollReveal
          key={section.heading}
          delay={staticLayout ? 0 : index * 80}
          disabled={staticLayout}
        >
          <section className="page-content-section">
            <h2 className="page-content-heading">{section.heading}</h2>

            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="page-content-text">
                {paragraph}
              </p>
            ))}

            {section.list && (
              <ul className="page-content-list">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}

            {section.note && (
              <p className="page-content-note">{section.note}</p>
            )}
          </section>
        </ScrollReveal>
      ))}
    </div>
  )
}

export default PageContent
