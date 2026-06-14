import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../services/api'
import { ROUTES } from '../routes'
import {
  emptyCertification,
  emptyProfileProject,
  emptyResumeProfileForm,
  formToResumeProfile,
  getResumeProfileCompletion,
  GENDER_OPTIONS,
  resumeProfileToForm,
} from '../utils/userProfile'
import './ProfilePage.css'

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'SA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const ProfilePage = () => {
  const { user, refreshUser } = useAuth()
  const [profileForm, setProfileForm] = useState(emptyResumeProfileForm)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [keySaving, setKeySaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [keyError, setKeyError] = useState('')

  useEffect(() => {
    if (user?.resumeProfile) {
      setProfileForm(resumeProfileToForm(user.resumeProfile))
    }
  }, [user])

  const profileCompletion = useMemo(() => getResumeProfileCompletion(user), [user])

  const updateField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }))
  }

  const updateProject = (id, field, value) => {
    setProfileForm((current) => ({
      ...current,
      projects: current.projects.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  const updateCertification = (id, field, value) => {
    setProfileForm((current) => ({
      ...current,
      certifications: current.certifications.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileMessage('')
    setProfileError('')
    try {
      await authApi.updateMe({ resumeProfile: formToResumeProfile(profileForm) })
      await refreshUser()
      setProfileMessage('Resume profile saved.')
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSaveKeys = async () => {
    setKeySaving(true)
    setKeyMessage('')
    setKeyError('')
    try {
      const payload = {}
      if (geminiApiKey.trim()) payload.geminiApiKey = geminiApiKey.trim()
      if (openaiApiKey.trim()) payload.openaiApiKey = openaiApiKey.trim()

      if (!Object.keys(payload).length) {
        setKeyError('Paste at least one API key to save, or use Remove to clear a saved key.')
        return
      }

      await authApi.updateMe(payload)
      await refreshUser()
      setGeminiApiKey('')
      setOpenaiApiKey('')
      setKeyMessage('API keys saved.')
    } catch (err) {
      setKeyError(err.message || 'Failed to save API keys')
    } finally {
      setKeySaving(false)
    }
  }

  const handleClearKey = async (provider) => {
    setKeySaving(true)
    setKeyMessage('')
    setKeyError('')
    try {
      await authApi.updateMe(provider === 'gemini' ? { geminiApiKey: null } : { openaiApiKey: null })
      await refreshUser()
      if (provider === 'gemini') setGeminiApiKey('')
      if (provider === 'openai') setOpenaiApiKey('')
      setKeyMessage(`${provider === 'gemini' ? 'Gemini' : 'ChatGPT'} API key removed.`)
    } catch (err) {
      setKeyError(err.message || 'Failed to remove API key')
    } finally {
      setKeySaving(false)
    }
  }

  return (
    <main className="profile-page">
      <div className="profile-page-inner">
        <section className="profile-hero">
          <div className="profile-hero-main">
            <span className="profile-avatar" aria-hidden="true">
              {getInitials(user?.name)}
            </span>
            <div>
              <p className="profile-eyebrow">Account</p>
              <h1>{user?.name}</h1>
              <p className="profile-hero-email">{user?.email}</p>
            </div>
          </div>
          <div className="profile-hero-stats">
            <article>
              <span>Level</span>
              <strong>Lv {user?.level ?? 1}</strong>
            </article>
            <article>
              <span>Total XP</span>
              <strong>{user?.xp ?? 0}</strong>
            </article>
            <article>
              <span>Rank</span>
              <strong>{user?.rank ?? 'Bronze'}</strong>
            </article>
            <article>
              <span>Battles won</span>
              <strong>{user?.battlesWon ?? 0}</strong>
            </article>
          </div>
        </section>

        <section
          className={`profile-completion${profileCompletion.isComplete ? ' profile-completion--complete' : ''}`}
          aria-label="Profile completion"
        >
          <div className="profile-completion-main">
            <div className="profile-completion-head">
              <div>
                <p className="profile-eyebrow">Resume profile</p>
                <h2 className="profile-completion-title">
                  {profileCompletion.isComplete
                    ? 'Profile complete'
                    : 'Please fill your profile for a better resume'}
                </h2>
                <p className="profile-completion-copy">
                  {profileCompletion.isComplete
                    ? 'Your saved details are ready to power stronger AI resume suggestions and PDF export.'
                    : `You have completed ${profileCompletion.filledCount} of ${profileCompletion.totalCount} resume sections. Add the missing details below, then save your profile.`}
                </p>
              </div>
              <div className="profile-completion-percent" aria-label={`${profileCompletion.percent}% complete`}>
                <strong>{profileCompletion.percent}%</strong>
                <span>complete</span>
              </div>
            </div>

            <div className="profile-completion-track" aria-hidden="true">
              <div
                className="profile-completion-fill"
                style={{ width: `${profileCompletion.percent}%` }}
              />
            </div>
          </div>

          {!profileCompletion.isComplete && profileCompletion.missing.length ? (
            <div className="profile-completion-missing">
              <p>Still needed:</p>
              <ul>
                {profileCompletion.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="profile-layout">
          <div className="profile-main">
            <section className="profile-card">
              <header className="profile-card-head">
                <h2>Personal details</h2>
                <p>Used for resume and career tools.</p>
              </header>
              <div className="profile-form-grid">
                <label>
                  Email
                  <input value={user?.email || ''} readOnly className="profile-readonly" />
                </label>
                <label>
                  Date of birth
                  <input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                </label>
                <label>
                  Gender
                  <select value={profileForm.gender} onChange={(e) => updateField('gender', e.target.value)}>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Mobile number
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </label>
              </div>
            </section>

            <section className="profile-card">
              <header className="profile-card-head">
                <h2>Online profiles</h2>
                <p>Links shown on your resume and portfolio.</p>
              </header>
              <div className="profile-form-grid">
                <label>
                  GitHub
                  <input
                    value={profileForm.githubUrl}
                    onChange={(e) => updateField('githubUrl', e.target.value)}
                    placeholder="https://github.com/username"
                  />
                </label>
                <label>
                  Portfolio
                  <input
                    value={profileForm.portfolioUrl}
                    onChange={(e) => updateField('portfolioUrl', e.target.value)}
                    placeholder="https://yourportfolio.com"
                  />
                </label>
                <label className="profile-form-full">
                  LinkedIn
                  <input
                    value={profileForm.linkedinUrl}
                    onChange={(e) => updateField('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                </label>
              </div>
            </section>

            <section className="profile-card">
              <header className="profile-card-head">
                <h2>Skills</h2>
                <p>Technical and professional skills for your resume.</p>
              </header>
              <label>
                Skills (comma-separated)
                <input
                  value={profileForm.skillsText}
                  onChange={(e) => updateField('skillsText', e.target.value)}
                  placeholder="JavaScript, React, Node.js, MongoDB"
                />
              </label>
            </section>

            <section className="profile-card">
              <header className="profile-card-head">
                <h2>Projects</h2>
                <p>Projects used when generating resumes.</p>
              </header>
              {profileForm.projects.map((project, index) => (
                <div key={project.id} className="profile-entry-card">
                  <div className="profile-entry-head">
                    <strong>Project {index + 1}</strong>
                    {profileForm.projects.length > 1 ? (
                      <button
                        type="button"
                        className="profile-entry-remove"
                        onClick={() =>
                          setProfileForm((current) => ({
                            ...current,
                            projects: current.projects.filter((item) => item.id !== project.id),
                          }))
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <label>
                    Project name
                    <input value={project.name} onChange={(e) => updateProject(project.id, 'name', e.target.value)} />
                  </label>
                  <label>
                    Skills used
                    <input
                      value={project.skillsText}
                      onChange={(e) => updateProject(project.id, 'skillsText', e.target.value)}
                      placeholder="React, Node.js"
                    />
                  </label>
                  <label>
                    Description / bullet points (one per line)
                    <textarea
                      value={project.bulletsText}
                      onChange={(e) => updateProject(project.id, 'bulletsText', e.target.value)}
                      rows={4}
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="profile-entry-add"
                onClick={() =>
                  setProfileForm((current) => ({
                    ...current,
                    projects: [...current.projects, emptyProfileProject()],
                  }))
                }
              >
                + Add project
              </button>
            </section>

            <section className="profile-card">
              <header className="profile-card-head">
                <h2>Certifications</h2>
                <p>Professional certifications and credentials.</p>
              </header>
              {profileForm.certifications.map((cert, index) => (
                <div key={cert.id} className="profile-entry-card">
                  <div className="profile-entry-head">
                    <strong>Certification {index + 1}</strong>
                    {profileForm.certifications.length > 1 ? (
                      <button
                        type="button"
                        className="profile-entry-remove"
                        onClick={() =>
                          setProfileForm((current) => ({
                            ...current,
                            certifications: current.certifications.filter((item) => item.id !== cert.id),
                          }))
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="profile-form-grid">
                    <label>
                      Name
                      <input value={cert.name} onChange={(e) => updateCertification(cert.id, 'name', e.target.value)} />
                    </label>
                    <label>
                      Issuer
                      <input value={cert.issuer} onChange={(e) => updateCertification(cert.id, 'issuer', e.target.value)} />
                    </label>
                    <label>
                      Year
                      <input value={cert.year} onChange={(e) => updateCertification(cert.id, 'year', e.target.value)} />
                    </label>
                    <label className="profile-form-full">
                      Credential URL
                      <input value={cert.url} onChange={(e) => updateCertification(cert.id, 'url', e.target.value)} />
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="profile-entry-add"
                onClick={() =>
                  setProfileForm((current) => ({
                    ...current,
                    certifications: [...current.certifications, emptyCertification()],
                  }))
                }
              >
                + Add certification
              </button>
            </section>

            <div className="profile-save-row">
              <button type="button" className="profile-btn profile-btn--primary" onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save resume profile'}
              </button>
              {profileMessage ? <p className="profile-message profile-message--success">{profileMessage}</p> : null}
              {profileError ? <p className="profile-message profile-message--error">{profileError}</p> : null}
            </div>
          </div>

          <aside className="profile-side">
            <section className="profile-card profile-card--sticky">
              <header className="profile-card-head">
                <h2>AI API keys</h2>
                <p>Optional keys when shared AI is busy.</p>
              </header>

              <div className="profile-ai-key-card">
                <div className="profile-ai-key-meta">
                  <strong>Gemini</strong>
                  <span className={`profile-ai-key-status${user?.hasGeminiApiKey ? ' profile-ai-key-status--on' : ''}`}>
                    {user?.hasGeminiApiKey ? 'Saved' : 'Not set'}
                  </span>
                </div>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder={user?.hasGeminiApiKey ? 'Paste a new key to replace' : 'Paste Gemini API key'}
                  autoComplete="off"
                />
                {user?.hasGeminiApiKey ? (
                  <button type="button" className="profile-ai-key-clear" onClick={() => handleClearKey('gemini')} disabled={keySaving}>
                    Remove saved key
                  </button>
                ) : null}
              </div>

              <div className="profile-ai-key-card">
                <div className="profile-ai-key-meta">
                  <strong>ChatGPT</strong>
                  <span className={`profile-ai-key-status${user?.hasOpenaiApiKey ? ' profile-ai-key-status--on' : ''}`}>
                    {user?.hasOpenaiApiKey ? 'Saved' : 'Not set'}
                  </span>
                </div>
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder={user?.hasOpenaiApiKey ? 'Paste a new key to replace' : 'Paste OpenAI API key'}
                  autoComplete="off"
                />
                {user?.hasOpenaiApiKey ? (
                  <button type="button" className="profile-ai-key-clear" onClick={() => handleClearKey('openai')} disabled={keySaving}>
                    Remove saved key
                  </button>
                ) : null}
              </div>

              <button type="button" className="profile-btn profile-btn--primary profile-btn--full" onClick={handleSaveKeys} disabled={keySaving}>
                {keySaving ? 'Saving…' : 'Save API keys'}
              </button>
              {keyMessage ? <p className="profile-message profile-message--success">{keyMessage}</p> : null}
              {keyError ? <p className="profile-message profile-message--error">{keyError}</p> : null}
            </section>

            <Link to={ROUTES.resume} className="profile-btn profile-btn--ghost profile-btn--full profile-resume-link">
              Open AI Resume Maker
            </Link>
          </aside>
        </div>
      </div>
    </main>
  )
}

export default ProfilePage
