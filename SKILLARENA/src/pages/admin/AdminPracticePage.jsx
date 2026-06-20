import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../services/api'
import './AdminPracticePage.css'

const EMPTY_ASSESSMENT = {
  title: '',
  description: '',
  skillId: '',
  difficulty: 'MIXED',
  mode: 'QUIZ',
  xpReward: 25,
  status: 'DRAFT',
}

const EMPTY_QUESTION = {
  assessmentId: '',
  prompt: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOptionId: 'opt-1',
  explanation: '',
}

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' },
]

const assessmentToEditForm = (assessment) => ({
  title: assessment.title || '',
  description: assessment.description || '',
  skillId: assessment.skillId || '',
  difficulty: assessment.difficulty || 'MIXED',
  mode: assessment.mode || 'QUIZ',
  xpReward: assessment.xpReward ?? 25,
  status: assessment.status || 'DRAFT',
})

const AdminModal = ({ open, title, subtitle, onClose, children, footer, size = 'default' }) => {
  if (!open) return null

  return (
    <div className="admin-modal-root" role="presentation" onClick={onClose}>
      <div
        className={`admin-modal-sheet${size === 'narrow' ? ' admin-modal-sheet--narrow' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer ? <div className="admin-modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}

const AdminPracticePage = () => {
  const [assessments, setAssessments] = useState([])
  const [skills, setSkills] = useState([])
  const [assessmentForm, setAssessmentForm] = useState(EMPTY_ASSESSMENT)
  const [editForm, setEditForm] = useState(EMPTY_ASSESSMENT)
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION)
  const [loading, setLoading] = useState(true)
  const [savingAssessment, setSavingAssessment] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [customSkillName, setCustomSkillName] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [deletingSkillId, setDeletingSkillId] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal] = useState('none')
  const [previousModal, setPreviousModal] = useState('none')
  const [activeAssessment, setActiveAssessment] = useState(null)
  const [assessmentDetail, setAssessmentDetail] = useState(null)
  const [loadingAssessmentDetail, setLoadingAssessmentDetail] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [questionContextAssessment, setQuestionContextAssessment] = useState(null)

  const stats = useMemo(() => {
    const published = assessments.filter((item) => item.status === 'PUBLISHED').length
    const questions = assessments.reduce((sum, item) => sum + (item.questionCount ?? 0), 0)
    return {
      total: assessments.length,
      published,
      draft: assessments.length - published,
      questions,
    }
  }, [assessments])

  const filteredAssessments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return assessments.filter((assessment) => {
      const matchesStatus = statusFilter === 'ALL' || assessment.status === statusFilter
      if (!matchesStatus) return false
      if (!query) return true
      const haystack = [
        assessment.title,
        assessment.description,
        assessment.skillName,
        assessment.difficulty,
        assessment.mode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [assessments, searchQuery, statusFilter])

  const skillUsageCounts = useMemo(() => {
    const counts = {}
    assessments.forEach((assessment) => {
      if (!assessment.skillId) return
      counts[assessment.skillId] = (counts[assessment.skillId] || 0) + 1
    })
    return counts
  }, [assessments])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [assessmentData, skillData] = await Promise.all([
        adminApi.assessments('PRACTICE'),
        adminApi.skills(),
      ])
      setAssessments(assessmentData.assessments)
      setSkills(skillData.skills)
      setAssessmentForm((current) => ({
        ...current,
        skillId: current.skillId || skillData.skills[0]?.id || '',
      }))
      setQuestionForm((current) => ({
        ...current,
        assessmentId: current.assessmentId || assessmentData.assessments[0]?.id || '',
      }))
    } catch (err) {
      setError(err.message || 'Failed to load practice data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [message])

  const closeModal = () => {
    setModal('none')
    setPreviousModal('none')
    setActiveAssessment(null)
    setAssessmentDetail(null)
    setQuestionContextAssessment(null)
    setCustomSkillName('')
  }

  const loadAssessmentDetail = async (assessmentId) => {
    setLoadingAssessmentDetail(true)
    try {
      const data = await adminApi.assessment(assessmentId)
      setAssessmentDetail(data.assessment)
      setActiveAssessment(data.assessment)
    } catch (err) {
      setError(err.message || 'Failed to load practice set details')
      setAssessmentDetail(null)
    } finally {
      setLoadingAssessmentDetail(false)
    }
  }

  const openDeleteAssessmentModal = (assessment) => {
    setDeleteTarget({ kind: 'assessment', item: assessment })
    setPreviousModal(modal)
    setModal('delete')
  }

  const openDeleteQuestionModal = (question, assessmentId) => {
    setDeleteTarget({ kind: 'question', item: question, assessmentId })
    setPreviousModal(modal)
    setModal('delete')
  }

  const handleDeleteAssessment = async () => {
    if (!deleteTarget || deleteTarget.kind !== 'assessment') return
    setDeleting(true)
    setError('')
    try {
      await adminApi.deleteAssessment(deleteTarget.item.id)
      setMessage(`"${deleteTarget.item.title}" was deleted.`)
      if (activeAssessment?.id === deleteTarget.item.id) {
        setActiveAssessment(null)
        setAssessmentDetail(null)
      }
      setDeleteTarget(null)
      setModal('none')
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to delete practice set')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!deleteTarget || deleteTarget.kind !== 'question') return
    setDeleting(true)
    setError('')
    try {
      const data = await adminApi.removeQuestionFromAssessment(
        deleteTarget.assessmentId,
        deleteTarget.item.id,
      )
      setMessage('Question removed from practice set.')
      setAssessmentDetail(data.assessment)
      setActiveAssessment(data.assessment)
      setDeleteTarget(null)
      setModal(previousModal === 'none' ? 'view' : previousModal)
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to delete question')
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'assessment') return handleDeleteAssessment()
    if (deleteTarget.kind === 'question') return handleDeleteQuestion()
    return undefined
  }

  const openCreateModal = () => {
    setAssessmentForm((current) => ({
      ...EMPTY_ASSESSMENT,
      skillId: current.skillId || skills[0]?.id || '',
    }))
    setModal('create')
  }

  const openQuestionModal = (assessment) => {
    setQuestionContextAssessment(assessment || null)
    setQuestionForm((current) => ({
      ...EMPTY_QUESTION,
      assessmentId: assessment?.id || current.assessmentId,
      correctOptionId: 'opt-1',
    }))
    setModal('question')
  }

  const openViewModal = async (assessment) => {
    setActiveAssessment(assessment)
    setAssessmentDetail(null)
    setModal('view')
    await loadAssessmentDetail(assessment.id)
  }

  const openEditModal = (assessment) => {
    setActiveAssessment(assessment)
    setEditForm(assessmentToEditForm(assessment))
    setModal('edit')
  }

  const handleAssessmentChange = (event) => {
    const { name, value } = event.target
    setAssessmentForm((current) => ({ ...current, [name]: value }))
  }

  const handleEditFormChange = (event) => {
    const { name, value } = event.target
    setEditForm((current) => ({ ...current, [name]: value }))
  }

  const handleQuestionChange = (event) => {
    const { name, value } = event.target
    setQuestionForm((current) => ({ ...current, [name]: value }))
  }

  const handleCreateAssessment = async (event) => {
    event.preventDefault()
    setSavingAssessment(true)
    setMessage('')
    setError('')

    try {
      const result = await adminApi.createAssessment(assessmentForm)
      setQuestionForm((current) => ({
        ...current,
        assessmentId: result.assessment.id,
      }))
      setMessage('Practice set created. Add your first question.')
      await loadData()
      openQuestionModal(result.assessment)
    } catch (err) {
      setError(err.message || 'Failed to create practice set')
    } finally {
      setSavingAssessment(false)
    }
  }

  const handleUpdateAssessment = async (event) => {
    event.preventDefault()
    if (!activeAssessment) return
    setSavingEdit(true)
    setMessage('')
    setError('')

    try {
      const { assessment } = await adminApi.updateAssessment(activeAssessment.id, editForm)
      setMessage('Practice set updated.')
      setActiveAssessment(assessment)
      closeModal()
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to update practice set')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCreateQuestion = async (event) => {
    event.preventDefault()
    setSavingQuestion(true)
    setMessage('')
    setError('')

    try {
      const options = [
        { optionId: 'opt-1', text: questionForm.optionA },
        { optionId: 'opt-2', text: questionForm.optionB },
        { optionId: 'opt-3', text: questionForm.optionC },
        { optionId: 'opt-4', text: questionForm.optionD },
      ]

      const questionResult = await adminApi.createQuestion({
        prompt: questionForm.prompt,
        skillId:
          assessments.find((item) => item.id === questionForm.assessmentId)?.skillId ||
          skills[0]?.id,
        difficulty: 'EASY',
        options,
        correctOptionId: questionForm.correctOptionId,
        explanation: questionForm.explanation,
      })

      await adminApi.addQuestionToAssessment(questionForm.assessmentId, {
        questionId: questionResult.question.id,
        points: 10,
      })

      setMessage('Question added.')
      const targetId = questionForm.assessmentId
      await loadData()
      const refreshed = await adminApi.assessment(targetId)
      setAssessmentDetail(refreshed.assessment)
      setActiveAssessment(refreshed.assessment)
      setQuestionContextAssessment(null)
      setModal('view')
    } catch (err) {
      setError(err.message || 'Failed to add question')
    } finally {
      setSavingQuestion(false)
    }
  }

  const handlePublish = async (assessmentId) => {
    setError('')
    setMessage('')
    try {
      await adminApi.updateAssessment(assessmentId, { status: 'PUBLISHED' })
      setMessage('Practice set published.')
      if (activeAssessment?.id === assessmentId) {
        setActiveAssessment((current) => (current ? { ...current, status: 'PUBLISHED' } : current))
      }
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to publish practice set')
    }
  }

  const handleUnpublish = async (assessmentId) => {
    setError('')
    setMessage('')
    try {
      await adminApi.updateAssessment(assessmentId, { status: 'DRAFT' })
      setMessage('Practice set moved to draft.')
      if (activeAssessment?.id === assessmentId) {
        setActiveAssessment((current) => (current ? { ...current, status: 'DRAFT' } : current))
      }
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to unpublish practice set')
    }
  }

  const openSkillsModal = () => {
    setCustomSkillName('')
    setModal('skills')
  }

  const clearSkillFromForms = (skillId) => {
    const fallbackSkillId = skills.find((skill) => skill.id !== skillId)?.id || ''
    setAssessmentForm((current) =>
      current.skillId === skillId ? { ...current, skillId: fallbackSkillId } : current,
    )
    setEditForm((current) =>
      current.skillId === skillId ? { ...current, skillId: fallbackSkillId } : current,
    )
  }

  const handleDeleteSkill = async (skill) => {
    const usageCount = skillUsageCounts[skill.id] || 0
    const warning =
      usageCount > 0
        ? `"${skill.name}" is used by ${usageCount} practice set(s). Delete anyway?`
        : `Delete skill "${skill.name}"? This cannot be undone.`

    if (!window.confirm(warning)) return

    setDeletingSkillId(skill.id)
    setError('')
    try {
      await adminApi.deleteSkill(skill.id)
      setSkills((current) => current.filter((item) => item.id !== skill.id))
      clearSkillFromForms(skill.id)
      setMessage(`Skill "${skill.name}" deleted.`)
    } catch (err) {
      setError(err.message || 'Failed to delete skill')
    } finally {
      setDeletingSkillId('')
    }
  }

  const handleAddCustomSkill = async (target = 'create') => {
    const name = customSkillName.trim()
    if (!name) return

    setAddingSkill(true)
    setError('')
    try {
      const { skill } = await adminApi.createSkill({ name })
      setSkills((current) => {
        if (current.some((item) => item.id === skill.id)) return current
        return [...current, skill].sort((a, b) => a.name.localeCompare(b.name))
      })
      if (target === 'edit') {
        setEditForm((current) => ({ ...current, skillId: skill.id }))
      } else {
        setAssessmentForm((current) => ({ ...current, skillId: skill.id }))
      }
      setCustomSkillName('')
      setMessage(`Skill "${skill.name}" added.`)
    } catch (err) {
      setError(err.message || 'Failed to add custom skill')
    } finally {
      setAddingSkill(false)
    }
  }

  const renderSkillField = (formState, onChange, target = 'create') => (
    <div className="admin-practice-skill-picker">
      <label>
        Skill
        <select name="skillId" value={formState.skillId} onChange={onChange} required>
          <option value="">Select a skill</option>
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-practice-skill-custom">
        <span className="admin-practice-skill-custom-label">Or add a custom skill</span>
        <div className="admin-practice-skill-custom-row">
          <input
            value={customSkillName}
            onChange={(event) => setCustomSkillName(event.target.value)}
            placeholder="e.g. TypeScript, React, SQL"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAddCustomSkill(target)
              }
            }}
          />
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => handleAddCustomSkill(target)}
            disabled={addingSkill || !customSkillName.trim()}
          >
            {addingSkill ? 'Adding…' : 'Add skill'}
          </button>
        </div>
        <button type="button" className="admin-practice-manage-skills-link" onClick={openSkillsModal}>
          Manage all skills
        </button>
      </div>
    </div>
  )

  const renderAssessmentFormFields = (formState, onChange, skillTarget = 'create') => (
    <>
      <label>
        Title
        <input name="title" value={formState.title} onChange={onChange} required />
      </label>
      <label>
        Description
        <textarea name="description" value={formState.description} onChange={onChange} />
      </label>
      {renderSkillField(formState, onChange, skillTarget)}
      <div className="admin-form-row">
        <label>
          Difficulty
          <select name="difficulty" value={formState.difficulty} onChange={onChange}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="MIXED">Mixed</option>
          </select>
        </label>
      </div>
      <div className="admin-form-row">
        <label>
          Mode
          <select name="mode" value={formState.mode} onChange={onChange}>
            <option value="QUIZ">Quiz</option>
            <option value="CODING">Coding</option>
          </select>
        </label>
        <label>
          XP reward
          <input
            name="xpReward"
            type="number"
            min="0"
            value={formState.xpReward}
            onChange={onChange}
          />
        </label>
      </div>
      <label>
        Status
        <select name="status" value={formState.status} onChange={onChange}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </label>
    </>
  )

  return (
    <div className="admin-page admin-practice-page">
      <div className="admin-practice-header">
        <div>
          <p className="admin-practice-eyebrow">Content management</p>
          <h1>Practice sets</h1>
          <p className="admin-page-lead">
            Build quizzes, attach multiple-choice questions, and publish practice for students.
          </p>
        </div>
        <div className="admin-practice-header-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={openSkillsModal}>
            Manage skills
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => openQuestionModal()}
            disabled={!assessments.length}
          >
            + Add question
          </button>
          <button type="button" className="admin-btn admin-btn--accent" onClick={openCreateModal}>
            + Create set
          </button>
        </div>
      </div>

      {error ? (
        <div className="admin-practice-alert admin-practice-alert--error" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      ) : null}
      {message ? (
        <div className="admin-practice-alert admin-practice-alert--success" role="status">
          {message}
        </div>
      ) : null}

      {!loading ? (
        <div className="admin-practice-stats">
          <article className="admin-practice-stat admin-practice-stat--total">
            <span className="admin-practice-stat-label">Total sets</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="admin-practice-stat admin-practice-stat--published">
            <span className="admin-practice-stat-label">Published</span>
            <strong>{stats.published}</strong>
          </article>
          <article className="admin-practice-stat admin-practice-stat--draft">
            <span className="admin-practice-stat-label">Draft</span>
            <strong>{stats.draft}</strong>
          </article>
          <article className="admin-practice-stat admin-practice-stat--questions">
            <span className="admin-practice-stat-label">Questions</span>
            <strong>{stats.questions}</strong>
          </article>
        </div>
      ) : null}

      {!loading && assessments.length ? (
        <div className="admin-practice-toolbar">
          <label className="admin-practice-search">
            <span className="sr-only">Search practice sets</span>
            <input
              type="search"
              placeholder="Search by title, skill, or difficulty…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <div className="admin-practice-filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`admin-practice-filter${statusFilter === filter.value ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? <p className="admin-practice-loading">Loading practice sets…</p> : null}
      {!loading && !assessments.length ? (
        <div className="admin-practice-empty">
          <h2>No practice sets yet</h2>
          <p>Create your first quiz set, then add multiple-choice questions.</p>
          <button type="button" className="admin-btn admin-btn--accent" onClick={openCreateModal}>
            Create your first set
          </button>
        </div>
      ) : null}
      {!loading && assessments.length && !filteredAssessments.length ? (
        <div className="admin-practice-empty admin-practice-empty--compact">
          <h2>No matches</h2>
          <p>Try a different search term or status filter.</p>
        </div>
      ) : null}

      <div className="admin-practice-grid">
        {filteredAssessments.map((assessment) => (
          <article key={assessment.id} className="admin-practice-card">
            <button
              type="button"
              className="admin-practice-card-main"
              onClick={() => openViewModal(assessment)}
            >
              <div className="admin-practice-card-top">
                <div>
                  {assessment.skillName ? (
                    <span className="admin-practice-skill">{assessment.skillName}</span>
                  ) : null}
                  <h2>{assessment.title}</h2>
                </div>
                <span
                  className={`admin-badge${assessment.status === 'PUBLISHED' ? ' admin-badge--published' : ''}`}
                >
                  {assessment.status}
                </span>
              </div>
              {assessment.description ? <p>{assessment.description}</p> : null}
              <div className="admin-practice-meta">
                <span>{assessment.questionCount ?? 0} questions</span>
                <span>{assessment.difficulty}</span>
                <span>{assessment.xpReward ?? 0} XP</span>
              </div>
            </button>
            <div className="admin-practice-card-actions">
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => openViewModal(assessment)}
              >
                View
              </button>
              <button
                type="button"
                className="admin-link-btn admin-link-btn--accent"
                onClick={() => openQuestionModal(assessment)}
              >
                Add question
              </button>
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => openEditModal(assessment)}
              >
                Edit
              </button>
              {assessment.status === 'PUBLISHED' ? (
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => handleUnpublish(assessment.id)}
                >
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-link-btn admin-link-btn--accent"
                  onClick={() => handlePublish(assessment.id)}
                >
                  Publish
                </button>
              )}
              <button
                type="button"
                className="admin-link-btn admin-link-btn--danger"
                onClick={() => openDeleteAssessmentModal(assessment)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <AdminModal
        open={modal === 'create'}
        title="Create practice set"
        subtitle="Step 1 — define the quiz. You will add MCQs in the next step."
        onClose={closeModal}
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="create-practice-form"
              className="admin-btn"
              disabled={savingAssessment}
            >
              {savingAssessment ? 'Creating…' : 'Create set'}
            </button>
          </div>
        }
      >
        <form id="create-practice-form" className="admin-form" onSubmit={handleCreateAssessment}>
          <div className="admin-form-section">
            <h4 className="admin-form-section-title">Set details</h4>
            {renderAssessmentFormFields(assessmentForm, handleAssessmentChange, 'create')}
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={modal === 'edit' && Boolean(activeAssessment)}
        title="Edit practice set"
        subtitle={activeAssessment?.title}
        onClose={closeModal}
        footer={
          <button
            type="submit"
            form="edit-practice-form"
            className="admin-btn"
            disabled={savingEdit}
          >
            {savingEdit ? 'Saving…' : 'Save changes'}
          </button>
        }
      >
        <form id="edit-practice-form" className="admin-form" onSubmit={handleUpdateAssessment}>
          {renderAssessmentFormFields(editForm, handleEditFormChange, 'edit')}
        </form>
      </AdminModal>

      <AdminModal
        open={modal === 'question'}
        title="Add question"
        subtitle={
          questionContextAssessment
            ? `Adding to "${questionContextAssessment.title}"`
            : 'Choose a practice set, then write one MCQ.'
        }
        onClose={closeModal}
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="add-question-form"
              className="admin-btn"
              disabled={savingQuestion || !assessments.length}
            >
              {savingQuestion ? 'Adding…' : 'Add question'}
            </button>
          </div>
        }
      >
        <form id="add-question-form" className="admin-form" onSubmit={handleCreateQuestion}>
          {questionContextAssessment ? (
            <div className="admin-selected-type">
              <span className="admin-selected-type-label">{questionContextAssessment.title}</span>
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => setQuestionContextAssessment(null)}
              >
                Change set
              </button>
            </div>
          ) : (
            <div className="admin-form-section">
              <h4 className="admin-form-section-title">Practice set</h4>
              <label>
                Attach to
                <select
                  name="assessmentId"
                  value={questionForm.assessmentId}
                  onChange={handleQuestionChange}
                  required
                >
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="admin-form-section">
            <h4 className="admin-form-section-title">Question</h4>
            <label>
              Prompt
              <textarea
                name="prompt"
                value={questionForm.prompt}
                onChange={handleQuestionChange}
                placeholder="What is the output of…?"
                required
              />
            </label>
          </div>
          <div className="admin-form-section">
            <h4 className="admin-form-section-title">Answer options</h4>
            <div className="admin-practice-options-grid">
              <label>
                Option A
                <input
                  name="optionA"
                  value={questionForm.optionA}
                  onChange={handleQuestionChange}
                  required
                />
              </label>
              <label>
                Option B
                <input
                  name="optionB"
                  value={questionForm.optionB}
                  onChange={handleQuestionChange}
                  required
                />
              </label>
              <label>
                Option C
                <input
                  name="optionC"
                  value={questionForm.optionC}
                  onChange={handleQuestionChange}
                  required
                />
              </label>
              <label>
                Option D
                <input
                  name="optionD"
                  value={questionForm.optionD}
                  onChange={handleQuestionChange}
                  required
                />
              </label>
            </div>
          </div>
          <div className="admin-form-section">
            <h4 className="admin-form-section-title">Correct answer</h4>
            <label>
              Mark correct option
              <select
                name="correctOptionId"
                value={questionForm.correctOptionId}
                onChange={handleQuestionChange}
              >
                <option value="opt-1">Option A</option>
                <option value="opt-2">Option B</option>
                <option value="opt-3">Option C</option>
                <option value="opt-4">Option D</option>
              </select>
            </label>
            <label>
              Explanation (optional)
              <textarea
                name="explanation"
                value={questionForm.explanation}
                onChange={handleQuestionChange}
                placeholder="Briefly explain why this answer is correct"
              />
            </label>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={modal === 'view' && Boolean(activeAssessment)}
        title={activeAssessment?.title}
        subtitle={activeAssessment?.description || 'Practice quiz set'}
        onClose={closeModal}
        footer={
          activeAssessment ? (
            <div className="admin-modal-action-row">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={closeModal}>
                Close
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => openQuestionModal(activeAssessment)}
              >
                Add question
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => openEditModal(activeAssessment)}
              >
                Edit set
              </button>
              {activeAssessment.status === 'PUBLISHED' ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => handleUnpublish(activeAssessment.id)}
                >
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => handlePublish(activeAssessment.id)}
                >
                  Publish
                </button>
              )}
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={() => openDeleteAssessmentModal(activeAssessment)}
              >
                Delete set
              </button>
            </div>
          ) : null
        }
      >
        {activeAssessment ? (
          <>
            <div className="admin-practice-detail-grid">
              <div className="admin-practice-detail-item">
                <span>Skill</span>
                <strong>{activeAssessment.skillName || '—'}</strong>
              </div>
              <div className="admin-practice-detail-item">
                <span>Status</span>
                <strong>{activeAssessment.status}</strong>
              </div>
              <div className="admin-practice-detail-item">
                <span>Questions</span>
                <strong>{assessmentDetail?.questionCount ?? activeAssessment.questionCount ?? 0}</strong>
              </div>
              <div className="admin-practice-detail-item">
                <span>Difficulty</span>
                <strong>{activeAssessment.difficulty}</strong>
              </div>
              <div className="admin-practice-detail-item">
                <span>Mode</span>
                <strong>{activeAssessment.mode}</strong>
              </div>
              <div className="admin-practice-detail-item">
                <span>XP reward</span>
                <strong>{activeAssessment.xpReward ?? 0}</strong>
              </div>
            </div>
            <h3 className="admin-modal-section-title">Questions</h3>
            {loadingAssessmentDetail ? (
              <p className="admin-muted">Loading questions…</p>
            ) : assessmentDetail?.questions?.length ? (
              <div className="admin-practice-question-list">
                {assessmentDetail.questions.map((question, index) => (
                  <div key={question.id} className="admin-practice-question-item">
                    <div className="admin-practice-question-copy">
                      <strong>
                        Q{index + 1}. {question.prompt}
                      </strong>
                      <span>{question.points ?? 10} pts</span>
                    </div>
                    <button
                      type="button"
                      className="admin-link-btn admin-link-btn--danger"
                      onClick={() => openDeleteQuestionModal(question, assessmentDetail.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-muted">No questions yet. Use Add Q to create MCQs.</p>
            )}
          </>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modal === 'delete' && Boolean(deleteTarget)}
        title={deleteTarget?.kind === 'assessment' ? 'Delete practice set' : 'Delete question'}
        subtitle="This action cannot be undone."
        onClose={() => {
          setDeleteTarget(null)
          setModal(previousModal === 'none' ? 'none' : previousModal)
        }}
        size="narrow"
        footer={
          <div className="admin-modal-action-row">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                setDeleteTarget(null)
                setModal(previousModal === 'none' ? 'none' : previousModal)
              }}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--danger"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting
                ? 'Deleting…'
                : deleteTarget?.kind === 'assessment'
                  ? 'Delete practice set'
                  : 'Delete question'}
            </button>
          </div>
        }
      >
        <p className="admin-delete-copy">
          {deleteTarget?.kind === 'assessment' ? (
            <>
              Delete practice set <strong>{deleteTarget.item.title}</strong>? All linked MCQs that
              are not used elsewhere will be permanently removed.
            </>
          ) : null}
          {deleteTarget?.kind === 'question' ? (
            <>
              Remove MCQ <strong>{deleteTarget.item.prompt}</strong> from this practice set? The
              question will be deleted if it is not used elsewhere.
            </>
          ) : null}
        </p>
      </AdminModal>

      <AdminModal
        open={modal === 'skills'}
        title="Manage skills"
        subtitle="Add custom skills or remove ones you no longer need."
        onClose={closeModal}
        size="narrow"
      >
        <div className="admin-practice-skill-custom">
          <span className="admin-practice-skill-custom-label">Add custom skill</span>
          <div className="admin-practice-skill-custom-row">
            <input
              value={customSkillName}
              onChange={(event) => setCustomSkillName(event.target.value)}
              placeholder="e.g. TypeScript, React, SQL"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAddCustomSkill('create')
                }
              }}
            />
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => handleAddCustomSkill('create')}
              disabled={addingSkill || !customSkillName.trim()}
            >
              {addingSkill ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>

        {skills.length ? (
          <div className="admin-practice-skill-list">
            {skills.map((skill) => {
              const usageCount = skillUsageCounts[skill.id] || 0
              return (
                <div key={skill.id} className="admin-practice-skill-item">
                  <div>
                    <strong>{skill.name}</strong>
                    <span>
                      {usageCount
                        ? `Used by ${usageCount} practice set${usageCount === 1 ? '' : 's'}`
                        : 'Not used in practice sets'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="admin-link-btn admin-link-btn--danger"
                    onClick={() => handleDeleteSkill(skill)}
                    disabled={deletingSkillId === skill.id}
                  >
                    {deletingSkillId === skill.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="admin-practice-skill-empty">No skills yet. Add your first custom skill above.</p>
        )}
      </AdminModal>
    </div>
  )
}

export default AdminPracticePage
