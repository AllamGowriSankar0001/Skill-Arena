import { Link } from 'react-router-dom'
import { DEVELOPER_PROGRAM, SKILL_ARENA_TEAM } from '../content/teamData'
import { ROUTES } from '../routes'
import './DevelopersPage.css'

const TeamMemberCard = ({ member }) => (
  <article className={`team-card team-card--${member.accentTone || 'dev'}`}>
    <div className="team-card-head">
      <div className="team-card-avatar" aria-hidden="true">
        {member.initials}
      </div>
      <div className="team-card-intro">
        <h3 className="team-card-name">{member.name}</h3>
        <p className="team-card-role">{member.role}</p>
      </div>
    </div>

    <p className="team-card-bio">{member.bio}</p>

    {member.highlights?.length ? (
      <ul className="team-card-highlights">
        {member.highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : null}

    {member.skills?.length ? (
      <div className="team-card-tags" aria-label="Skills">
        {member.skills.map((skill) => (
          <span key={skill} className="team-card-tag">
            {skill}
          </span>
        ))}
      </div>
    ) : null}
  </article>
)

const TeamMemberBlock = ({ member }) => (
  <div className="developers-member-wrap">
    {member.cardLabel ? (
      <p className={`developers-member-label developers-member-label--${member.accentTone || 'dev'}`}>
        {member.cardLabel}
      </p>
    ) : null}
    <TeamMemberCard member={member} />
  </div>
)

const DevelopersPage = () => (
  <main className="developers-page">
    <div className="developers-page-inner">
      <header className="developers-header">
        <div className="developers-header-copy">
          <p className="developers-eyebrow">Our team</p>
          <h1>The people behind Skill Arena</h1>
          <p className="developers-lead">
            Skill Arena is built and tested in-house — from the original idea and design to the code
            that ships, and the QA that keeps every release bug-free.
          </p>
        </div>
        <div className="developers-header-pills">
          <span className="developers-pill developers-pill--team">
            {SKILL_ARENA_TEAM.length} team member{SKILL_ARENA_TEAM.length === 1 ? '' : 's'}
          </span>
          <span className="developers-pill">Build · Test · Ship</span>
        </div>
      </header>

      <section className="developers-team-section" aria-labelledby="developers-team-title">
        <div className="developers-section-head">
          <h2 id="developers-team-title">Core team</h2>
          <p>The developer who created Skill Arena and the tester who keeps every release solid.</p>
        </div>

        <div className="developers-team-layout">
          {SKILL_ARENA_TEAM.map((member) => (
            <TeamMemberBlock key={member.id} member={member} />
          ))}
        </div>
      </section>

      <section className="developers-program-section" aria-labelledby="developers-program-title">
        <div className="developers-section-head">
          <h2 id="developers-program-title">Build on Skill Arena</h2>
          <p>{DEVELOPER_PROGRAM.intro}</p>
        </div>

        <div className="developers-program-grid">
          <article className="developers-program-card">
            <h3>What you can build</h3>
            <ul>
              {DEVELOPER_PROGRAM.buildIdeas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="developers-program-card">
            <h3>API roadmap</h3>
            <p className="developers-program-note">
              Public API access for profiles, match history, and course progress is on our roadmap.
              Early partners can request preview access.
            </p>
            <ul>
              {DEVELOPER_PROGRAM.apiRoadmap.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <a href={`mailto:${DEVELOPER_PROGRAM.contact}`} className="developers-program-cta">
              Request early access →
            </a>
          </article>
        </div>
      </section>

      <Link to={ROUTES.home} className="developers-back">
        Back to home <span aria-hidden="true">→</span>
      </Link>
    </div>
  </main>
)

export default DevelopersPage
