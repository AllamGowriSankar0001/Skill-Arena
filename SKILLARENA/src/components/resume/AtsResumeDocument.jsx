import { formatEducationDegree } from '../../utils/atsResume'
import { formatContactLine } from '../../utils/resumeStructured'

const AtsResumeSections = ({ sections }) => (
  <>
    {sections.map((section) => (
      <section key={section.key} className="resume-ats-section">
        <h3>{section.title}</h3>
        {section.type === 'text' ? <p>{section.content}</p> : null}
        {section.type === 'tags' ? (
          <div className="resume-skill-tags">
            {section.content.map((skill) => (
              <span key={skill} className="resume-skill-tag">
                {skill}
              </span>
            ))}
          </div>
        ) : null}
        {section.type === 'skill-categories' ? (
          <div className="resume-skill-categories">
            {section.content.map((group) => (
              <p key={group.category} className="resume-skill-category-line">
                <strong>{group.category}:</strong>{' '}
                {group.skills.map((skill) => skill.name).join(', ')}
              </p>
            ))}
          </div>
        ) : null}
        {section.type === 'skill-tags' ? (
          <div className="resume-skill-tags">
            {section.content.map((skill) => (
              <span key={skill.name} className="resume-skill-tag">
                {skill.name}
              </span>
            ))}
          </div>
        ) : null}
        {section.type === 'experience' ? (
          <div className="resume-ats-entries">
            {section.content.map((item) => (
              <div key={item.id || `${item.company}-${item.role}`} className="resume-ats-entry">
                <div className="resume-ats-row">
                  <strong>{item.role}</strong>
                  {item.period ? <span>{item.period}</span> : null}
                </div>
                {item.company ? <p className="resume-ats-subline">{item.company}</p> : null}
                {item.bullets?.length ? (
                  <ul className="resume-ats-list">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {section.type === 'projects' ? (
          <div className="resume-ats-entries">
            {section.content.map((item) => (
              <div key={item.id || item.name} className="resume-ats-entry">
                <p className="resume-ats-project-name">{item.name}</p>
                {item.skills?.length ? (
                  <p className="resume-ats-project-skills">{item.skills.join(', ')}</p>
                ) : null}
                {item.bullets?.length ? (
                  <ul className="resume-ats-list">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {section.type === 'education' ? (
          <div className="resume-ats-entries">
            {section.content.map((edu) => (
              <div key={edu.id || edu.degree} className="resume-ats-edu-block">
                <div className="resume-ats-row">
                  <strong>{formatEducationDegree(edu)}</strong>
                  {edu.period ? <span>{edu.period}</span> : null}
                </div>
                {edu.institution || edu.grade ? (
                  <div className="resume-ats-row resume-ats-row--sub">
                    <span>{edu.institution}</span>
                    {edu.grade ? <span>{edu.grade}</span> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    ))}
  </>
)

export const AtsResumeDocument = ({ ats, sections }) => {
  const contactLine = formatContactLine(ats.contact)
  return (
    <article className="resume-ats-document">
      <header className="resume-ats-header">
        <h2>{ats.name}</h2>
        {ats.role ? <p className="resume-ats-role">{ats.role}</p> : null}
        {contactLine ? <p className="resume-ats-contact">{contactLine}</p> : null}
      </header>
      <AtsResumeSections sections={sections} />
    </article>
  )
}

export const AtsResumeDocumentModal = ({ ats, sections, className = '' }) => {
  const contactLine = formatContactLine(ats.contact)
  return (
    <article className={`resume-ats-document resume-ats-document--modal ${className}`.trim()}>
      <header className="resume-ats-header">
        <h2>{ats.name}</h2>
        {ats.role ? <p className="resume-ats-role">{ats.role}</p> : null}
        {contactLine ? <p className="resume-ats-contact">{contactLine}</p> : null}
      </header>
      <AtsResumeSections sections={sections} />
    </article>
  )
}

export default AtsResumeDocument
