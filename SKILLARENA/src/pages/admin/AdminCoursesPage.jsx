import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../services/api'
import VideoEmbed from '../../components/VideoEmbed'
import './AdminCoursesPage.css'

const EMPTY_FORM = {
  title: '',
  shortDescription: '',
  description: '',
  categoryId: '',
  level: 'BEGINNER',
  status: 'DRAFT',
}

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' },
]

const CREATE_STEPS = [
  { id: 'basics', label: 'Basics', hint: 'Name your course' },
  { id: 'details', label: 'Details', hint: 'Category & description' },
]

const LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
]

const EDIT_TABS = [
  { id: 'details', label: 'Details' },
  { id: 'builder', label: 'Content' },
]

const formatLessonContent = (lesson) => {
  if (lesson.type === 'VIDEO' && lesson.content?.videoUrl) return lesson.content.videoUrl
  if (lesson.type === 'ARTICLE' && lesson.content?.articleHtml) return lesson.content.articleHtml
  if (lesson.type === 'QUIZ') return 'Quiz lesson — attach questions from the practice admin tools.'
  return 'No content added yet.'
}

const courseToEditForm = (course) => ({
  title: course.title || '',
  shortDescription: course.shortDescription || '',
  description: course.description || '',
  categoryId: course.categoryId || '',
  level: course.level || 'BEGINNER',
  status: course.status || 'DRAFT',
})

const AdminModal = ({ open, title, subtitle, onClose, children, footer, size = 'default', stack = false }) => {
  if (!open) return null

  const sizeClass =
    size === 'wide' ? ' admin-modal-sheet--wide' : size === 'narrow' ? ' admin-modal-sheet--narrow' : ''

  return (
    <div
      className={`admin-modal-root${stack ? ' admin-modal-root--stack' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`admin-modal-sheet${sizeClass}`}
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

const AdminCoursesPage = () => {
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [modal, setModal] = useState('none')
  const [previousModal, setPreviousModal] = useState('none')
  const [activeCourse, setActiveCourse] = useState(null)
  const [activeLesson, setActiveLesson] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingCourse, setDeletingCourse] = useState(false)

  const [modules, setModules] = useState([])
  const [expandedModuleIds, setExpandedModuleIds] = useState([])
  const [lessonsByModule, setLessonsByModule] = useState({})
  const [loadingModules, setLoadingModules] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [createStep, setCreateStep] = useState(0)
  const [editTab, setEditTab] = useState('details')
  const [subModal, setSubModal] = useState('none')
  const [lessonModuleId, setLessonModuleId] = useState('')
  const [savingCourse, setSavingCourse] = useState(false)
  const [savingEditDetails, setSavingEditDetails] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleDescription, setModuleDescription] = useState('')
  const [editModuleId, setEditModuleId] = useState('')

  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [lessonType, setLessonType] = useState('ARTICLE')
  const [lessonContent, setLessonContent] = useState('')
  const [lessonDuration, setLessonDuration] = useState('10')
  const [lessonStatus, setLessonStatus] = useState('DRAFT')

  const stats = useMemo(() => {
    const published = courses.filter((course) => course.status === 'PUBLISHED').length
    return {
      total: courses.length,
      published,
      draft: courses.length - published,
    }
  }, [courses])

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return courses.filter((course) => {
      const matchesStatus = statusFilter === 'ALL' || course.status === statusFilter
      if (!matchesStatus) return false
      if (!query) return true
      const haystack = [
        course.title,
        course.shortDescription,
        course.categoryName,
        course.level,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [courses, searchQuery, statusFilter])

  const loadCourses = useCallback(async () => {
    const [courseData, categoryData] = await Promise.all([
      adminApi.courses(),
      adminApi.categories(),
    ])
    setCourses(courseData.courses)
    setCategories(categoryData.categories)
    if (!form.categoryId && categoryData.categories[0]) {
      setForm((current) => ({ ...current, categoryId: categoryData.categories[0].id }))
    }
  }, [form.categoryId])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await loadCourses()
    } catch (err) {
      setError(err.message || 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }, [loadCourses])

  const loadCourseStructure = async (courseId) => {
    setLoadingModules(true)
    try {
      const data = await adminApi.courseModules(courseId)
      setModules(data.modules)
      setExpandedModuleIds([])
      setLessonsByModule({})
      return data.modules
    } catch (err) {
      setError(err.message || 'Failed to load modules')
      return []
    } finally {
      setLoadingModules(false)
    }
  }

  const loadModuleLessons = async (courseId, moduleId) => {
    const data = await adminApi.moduleLessons(courseId, moduleId)
    setLessonsByModule((current) => ({ ...current, [moduleId]: data.lessons }))
  }

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [message])

  const closeModal = () => {
    setModal('none')
    setSubModal('none')
    setActiveCourse(null)
    setActiveLesson(null)
    setModules([])
    setExpandedModuleIds([])
    setLessonsByModule({})
    setCreateStep(0)
    setEditTab('details')
    setLessonModuleId('')
    setCustomCategoryName('')
  }

  const closeSubModal = () => {
    setSubModal('none')
    setLessonModuleId('')
    setModuleTitle('')
    setModuleDescription('')
    setLessonTitle('')
    setLessonDescription('')
    setLessonContent('')
    setLessonDuration('10')
    setLessonType('ARTICLE')
    setLessonStatus('DRAFT')
  }

  const openCreateModal = () => {
    setForm((current) => ({ ...EMPTY_FORM, categoryId: current.categoryId || categories[0]?.id || '' }))
    setCreateStep(0)
    setModal('create')
  }

  const openExploreModal = async (course) => {
    setActiveCourse(course)
    setModal('explore')
    await loadCourseStructure(course.id)
  }

  const openEditModal = async (course, tab = 'details') => {
    setActiveCourse(course)
    setEditForm(courseToEditForm(course))
    setEditTab(tab)
    setModal('edit')
    const loadedModules = await loadCourseStructure(course.id)
    setEditModuleId(loadedModules[0]?.id || '')
    closeSubModal()
  }

  const openBuilderAfterCreate = async (course) => {
    setActiveCourse(course)
    setEditForm(courseToEditForm(course))
    setEditTab('builder')
    setModal('edit')
    const loadedModules = await loadCourseStructure(course.id)
    setEditModuleId(loadedModules[0]?.id || '')
    closeSubModal()
  }

  const openAddModuleModal = () => {
    setModuleTitle('')
    setModuleDescription('')
    setSubModal('module')
  }

  const openAddLessonModal = (moduleId) => {
    setLessonModuleId(moduleId)
    setEditModuleId(moduleId)
    setLessonTitle('')
    setLessonDescription('')
    setLessonType('ARTICLE')
    setLessonContent('')
    setLessonDuration('10')
    setLessonStatus('DRAFT')
    setSubModal('lesson')
  }

  const openDeleteModal = (course) => {
    setDeleteTarget(course)
    setModal('delete')
  }

  const toggleModule = async (moduleId) => {
    if (!activeCourse) return
    const isExpanded = expandedModuleIds.includes(moduleId)
    if (isExpanded) {
      setExpandedModuleIds((current) => current.filter((id) => id !== moduleId))
      return
    }
    setExpandedModuleIds((current) => [...current, moduleId])
    if (!lessonsByModule[moduleId]) {
      await loadModuleLessons(activeCourse.id, moduleId)
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleEditFormChange = (event) => {
    const { name, value } = event.target
    setEditForm((current) => ({ ...current, [name]: value }))
  }

  const handleCreateCourse = async (event) => {
    event?.preventDefault?.()
    setSavingCourse(true)
    setMessage('')
    setError('')
    try {
      const result = await adminApi.createCourse({ ...form, status: 'DRAFT' })
      setMessage('Course created. Add your first module to start building content.')
      setModal('none')
      setCreateStep(0)
      await loadAll()
      await openBuilderAfterCreate(result.course)
    } catch (err) {
      setError(err.message || 'Failed to create course')
    } finally {
      setSavingCourse(false)
    }
  }

  const handleUpdateCourseDetails = async (event) => {
    event.preventDefault()
    if (!activeCourse) return
    setSavingEditDetails(true)
    setMessage('')
    setError('')
    try {
      const { course } = await adminApi.updateCourse(activeCourse.id, editForm)
      setMessage('Course details updated.')
      setActiveCourse(course)
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to update course')
    } finally {
      setSavingEditDetails(false)
    }
  }

  const handlePublishCourse = async (courseId) => {
    try {
      setError('')
      await adminApi.updateCourse(courseId, { status: 'PUBLISHED' })
      setMessage('Course published.')
      await loadAll()
      if (activeCourse?.id === courseId) {
        setActiveCourse((current) => (current ? { ...current, status: 'PUBLISHED' } : current))
      }
    } catch (err) {
      setError(err.message || 'Failed to publish course')
    }
  }

  const handleUnpublishCourse = async (courseId) => {
    try {
      setError('')
      await adminApi.updateCourse(courseId, { status: 'DRAFT' })
      setMessage('Course moved to draft.')
      await loadAll()
      if (activeCourse?.id === courseId) {
        setActiveCourse((current) => (current ? { ...current, status: 'DRAFT' } : current))
      }
    } catch (err) {
      setError(err.message || 'Failed to unpublish course')
    }
  }

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return
    setDeletingCourse(true)
    setError('')
    try {
      await adminApi.deleteCourse(deleteTarget.id)
      setMessage(`"${deleteTarget.title}" was deleted.`)
      if (activeCourse?.id === deleteTarget.id) {
        closeModal()
      }
      setDeleteTarget(null)
      setModal('none')
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to delete course')
    } finally {
      setDeletingCourse(false)
    }
  }

  const handleCreateModule = async (event) => {
    event.preventDefault()
    if (!activeCourse || !moduleTitle.trim()) return
    try {
      await adminApi.createModule(activeCourse.id, {
        title: moduleTitle.trim(),
        description: moduleDescription.trim(),
      })
      setMessage('Module added.')
      closeSubModal()
      const loadedModules = await loadCourseStructure(activeCourse.id)
      setEditModuleId(loadedModules[loadedModules.length - 1]?.id || loadedModules[0]?.id || '')
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to create module')
    }
  }

  const handleCreateLesson = async (event) => {
    event.preventDefault()
    const moduleId = lessonModuleId || editModuleId
    if (!activeCourse || !moduleId || !lessonTitle.trim()) return
    try {
      await adminApi.createLesson(activeCourse.id, moduleId, {
        title: lessonTitle.trim(),
        description: lessonDescription.trim(),
        type: lessonType,
        content:
          lessonType === 'VIDEO'
            ? { videoUrl: lessonContent.trim() }
            : lessonType === 'ARTICLE'
              ? { articleHtml: lessonContent.trim() }
              : {},
        durationMinutes: Number(lessonDuration) || 0,
        status: lessonStatus,
      })
      setMessage('Lesson added.')
      closeSubModal()
      await loadModuleLessons(activeCourse.id, moduleId)
      await loadCourseStructure(activeCourse.id)
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to create lesson')
    }
  }

  const handlePublishLesson = async (lesson) => {
    try {
      await adminApi.updateLesson(lesson.id, { status: 'PUBLISHED' })
      setMessage('Lesson published.')
      if (activeCourse) {
        await loadModuleLessons(activeCourse.id, lesson.moduleId)
      }
    } catch (err) {
      setError(err.message || 'Failed to publish lesson')
    }
  }

  const renderAccordion = (mode) =>
    modules.length ? (
      <div className="admin-accordion">
        {modules.map((module) => {
          const expanded = expandedModuleIds.includes(module.id)
          const lessons = lessonsByModule[module.id] || []
          return (
            <div key={module.id} className="admin-accordion-item">
              <div className="admin-accordion-item-head">
                <button
                  type="button"
                  className="admin-accordion-trigger"
                  onClick={() => toggleModule(module.id)}
                >
                  <span>
                    <strong>{module.title}</strong>
                    <small>{module.lessonCount} lessons</small>
                  </span>
                  <span>{expanded ? '▴' : '▾'}</span>
                </button>
                {mode === 'builder' ? (
                  <button
                    type="button"
                    className="admin-link-btn admin-link-btn--accent"
                    onClick={() => openAddLessonModal(module.id)}
                  >
                    + Lesson
                  </button>
                ) : null}
              </div>
              {expanded ? (
                <div className="admin-accordion-panel">
                  {lessons.length ? (
                    lessons.map((lesson) => (
                      <div key={lesson.id} className="admin-lesson-row">
                        <button
                          type="button"
                          className="admin-lesson-link"
                          onClick={() => {
                            setPreviousModal(modal)
                            setActiveLesson(lesson)
                            setModal('lesson')
                          }}
                        >
                          <strong>{lesson.title}</strong>
                          <span>
                            {lesson.type} • {lesson.durationMinutes} min • {lesson.status}
                          </span>
                        </button>
                        {mode === 'explore' && lesson.status !== 'PUBLISHED' ? (
                          <button
                            type="button"
                            className="admin-link-btn"
                            onClick={() => handlePublishLesson(lesson)}
                          >
                            Publish
                          </button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="admin-muted">No lessons yet.</p>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    ) : (
      <div className="admin-course-builder-empty">
        <p>No modules yet.</p>
        {mode === 'builder' ? (
          <button type="button" className="admin-btn admin-btn--accent" onClick={openAddModuleModal}>
            Add first module
          </button>
        ) : (
          <p className="admin-muted">Use Content tab to add modules and lessons.</p>
        )}
      </div>
    )

  const selectedCategoryName =
    categories.find((category) => category.id === form.categoryId)?.name || 'Category'

  const canProceedCreateBasics = form.title.trim() && form.shortDescription.trim()
  const canSubmitCreate =
    canProceedCreateBasics && form.description.trim() && form.categoryId

  const setFormLevel = (level) => {
    setForm((current) => ({ ...current, level }))
  }

  const setFormCategory = (categoryId) => {
    setForm((current) => ({ ...current, categoryId }))
  }

  const setEditFormCategory = (categoryId) => {
    setEditForm((current) => ({ ...current, categoryId }))
  }

  const handleAddCustomCategory = async (target = 'create') => {
    const name = customCategoryName.trim()
    if (!name) return

    setAddingCategory(true)
    setError('')
    try {
      const { category } = await adminApi.createCategory({ name })
      setCategories((current) => {
        if (current.some((item) => item.id === category.id)) return current
        return [...current, category].sort((a, b) => a.name.localeCompare(b.name))
      })
      if (target === 'edit') {
        setEditFormCategory(category.id)
      } else {
        setFormCategory(category.id)
      }
      setCustomCategoryName('')
      setMessage(`Category "${category.name}" added.`)
    } catch (err) {
      setError(err.message || 'Failed to add custom category')
    } finally {
      setAddingCategory(false)
    }
  }

  const renderCategoryPicker = (selectedCategoryId, onSelect, target = 'create') => (
    <label>
      Category
      <div className="admin-course-chip-row">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`admin-course-chip${selectedCategoryId === category.id ? ' is-active' : ''}`}
            onClick={() => onSelect(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="admin-course-category-custom">
        <span className="admin-course-category-custom-label">Or add a custom category</span>
        <div className="admin-course-category-custom-row">
          <input
            value={customCategoryName}
            onChange={(event) => setCustomCategoryName(event.target.value)}
            placeholder="e.g. Data Science, Design, Business"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAddCustomCategory(target)
              }
            }}
          />
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => handleAddCustomCategory(target)}
            disabled={addingCategory || !customCategoryName.trim()}
          >
            {addingCategory ? 'Adding…' : 'Add category'}
          </button>
        </div>
      </div>
    </label>
  )

  const renderCreateStepIndicator = () => (
    <div className="admin-course-steps" aria-label="Create course progress">
      {CREATE_STEPS.map((step, index) => (
        <div
          key={step.id}
          className={`admin-course-step${index === createStep ? ' is-active' : ''}${index < createStep ? ' is-complete' : ''}`}
        >
          <span className="admin-course-step-index">{index + 1}</span>
          <span className="admin-course-step-copy">
            <strong>{step.label}</strong>
            <small>{step.hint}</small>
          </span>
        </div>
      ))}
    </div>
  )

  const renderCreatePreview = () => (
    <aside className="admin-course-create-preview">
      <span className="admin-course-create-preview-label">Card preview</span>
      <article className="admin-course-create-preview-card">
        <div className="admin-course-create-preview-top">
          <span className="admin-course-category">{selectedCategoryName}</span>
          <span className="admin-badge">DRAFT</span>
        </div>
        <h3>{form.title.trim() || 'Course title'}</h3>
        <p>{form.shortDescription.trim() || 'Short description appears on course cards.'}</p>
        <span className="admin-course-meta">
          0 modules • 0 lessons • {form.level.toLowerCase()}
        </span>
      </article>
      <p className="admin-course-create-note">
        New courses start as drafts. Add modules and lessons, then publish when ready.
      </p>
    </aside>
  )

  const renderCreateWizard = () => (
    <div className="admin-course-create-layout">
      <div className="admin-course-create-main">
        {renderCreateStepIndicator()}
        <form id="create-course-form" className="admin-form" onSubmit={handleCreateCourse}>
          {createStep === 0 ? (
            <>
              <label>
                Course title
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Intro to JavaScript"
                  required
                />
              </label>
              <label>
                Short description
                <input
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={handleChange}
                  placeholder="One line summary for course cards"
                  required
                />
              </label>
            </>
          ) : (
            <>
              {renderCategoryPicker(form.categoryId, setFormCategory, 'create')}
              <label>
                Level
                <div className="admin-course-chip-row">
                  {LEVEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`admin-course-chip${form.level === option.value ? ' is-active' : ''}`}
                      onClick={() => setFormLevel(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </label>
              <label>
                Full description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="What will students learn in this course?"
                  className="admin-course-description-input"
                  required
                />
              </label>
            </>
          )}
        </form>
      </div>
      {renderCreatePreview()}
    </div>
  )

  const renderEditDetailsForm = () => (
    <form className="admin-form" onSubmit={handleUpdateCourseDetails}>
      <label>
        Title
        <input name="title" value={editForm.title} onChange={handleEditFormChange} required />
      </label>
      <label>
        Short description
        <input
          name="shortDescription"
          value={editForm.shortDescription}
          onChange={handleEditFormChange}
          required
        />
      </label>
      <label>
        Full description
        <textarea
          name="description"
          value={editForm.description}
          onChange={handleEditFormChange}
          required
          className="admin-course-description-input"
        />
      </label>
      {renderCategoryPicker(editForm.categoryId, setEditFormCategory, 'edit')}
      <div className="admin-form-row">
        <label>
          Level
          <select name="level" value={editForm.level} onChange={handleEditFormChange}>
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" value={editForm.status} onChange={handleEditFormChange}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
      </div>
      <button type="submit" className="admin-btn" disabled={savingEditDetails}>
        {savingEditDetails ? 'Saving…' : 'Save details'}
      </button>
    </form>
  )

  const renderBuilderPanel = () => (
    <div className="admin-course-builder">
      <div className="admin-course-builder-toolbar">
        <div>
          <h3 className="admin-modal-section-title">Course structure</h3>
          <p className="admin-course-builder-lead">
            Organize content into modules, then add lessons inside each module.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn--accent" onClick={openAddModuleModal}>
          + Add module
        </button>
      </div>
      {loadingModules ? <p className="admin-muted">Loading modules…</p> : null}
      {renderAccordion('builder')}
    </div>
  )

  return (
    <div className="admin-page admin-courses-page">
      <div className="admin-courses-header">
        <div>
          <p className="admin-courses-eyebrow">Content management</p>
          <h1>Courses</h1>
          <p className="admin-page-lead">
            Create learning paths, manage modules and lessons, and control what students see.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn--accent" onClick={openCreateModal}>
          + Create course
        </button>
      </div>

      {error ? (
        <div className="admin-courses-alert admin-courses-alert--error" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      ) : null}
      {message ? (
        <div className="admin-courses-alert admin-courses-alert--success" role="status">
          {message}
        </div>
      ) : null}

      {!loading ? (
        <div className="admin-courses-stats">
          <article className="admin-courses-stat admin-courses-stat--total">
            <span className="admin-courses-stat-label">Total courses</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="admin-courses-stat admin-courses-stat--published">
            <span className="admin-courses-stat-label">Published</span>
            <strong>{stats.published}</strong>
          </article>
          <article className="admin-courses-stat admin-courses-stat--draft">
            <span className="admin-courses-stat-label">Draft</span>
            <strong>{stats.draft}</strong>
          </article>
        </div>
      ) : null}

      {!loading && courses.length ? (
        <div className="admin-courses-toolbar">
          <label className="admin-courses-search">
            <span className="sr-only">Search courses</span>
            <input
              type="search"
              placeholder="Search by title, category, or level…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <div className="admin-courses-filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`admin-courses-filter${statusFilter === filter.value ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? <p className="admin-courses-loading">Loading courses…</p> : null}
      {!loading && !courses.length ? (
        <div className="admin-courses-empty">
          <h2>No courses yet</h2>
          <p>Create your first course to start building modules and lessons.</p>
          <button type="button" className="admin-btn admin-btn--accent" onClick={openCreateModal}>
            Create your first course
          </button>
        </div>
      ) : null}
      {!loading && courses.length && !filteredCourses.length ? (
        <div className="admin-courses-empty admin-courses-empty--compact">
          <h2>No matches</h2>
          <p>Try a different search term or status filter.</p>
        </div>
      ) : null}

      <div className="admin-course-grid">
        {filteredCourses.map((course) => (
          <article key={course.id} className="admin-course-card">
            <button
              type="button"
              className="admin-course-card-main"
              onClick={() => openExploreModal(course)}
            >
              <div className="admin-course-card-top">
                <div>
                  {course.categoryName ? (
                    <span className="admin-course-category">{course.categoryName}</span>
                  ) : null}
                  <h2>{course.title}</h2>
                </div>
                <span
                  className={`admin-badge${course.status === 'PUBLISHED' ? ' admin-badge--published' : ''}`}
                >
                  {course.status}
                </span>
              </div>
              <p>{course.shortDescription}</p>
              <span className="admin-course-meta">
                {course.moduleCount ?? 0} modules • {course.lessonCount ?? 0} lessons • {course.level}
              </span>
            </button>
            <div className="admin-course-card-actions">
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => openExploreModal(course)}
              >
                View
              </button>
              <button type="button" className="admin-link-btn" onClick={() => openEditModal(course, 'builder')}>
                Edit
              </button>
              {course.status === 'PUBLISHED' ? (
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => handleUnpublishCourse(course.id)}
                >
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-link-btn admin-link-btn--accent"
                  onClick={() => handlePublishCourse(course.id)}
                >
                  Publish
                </button>
              )}
              <button
                type="button"
                className="admin-link-btn admin-link-btn--danger"
                onClick={() => openDeleteModal(course)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <AdminModal
        open={modal === 'create'}
        title="Create course"
        subtitle="Set up the basics, then build modules and lessons."
        onClose={closeModal}
        size="wide"
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            {createStep > 0 ? (
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setCreateStep(0)}
              >
                Back
              </button>
            ) : null}
            {createStep === 0 ? (
              <button
                type="button"
                className="admin-btn"
                onClick={() => setCreateStep(1)}
                disabled={!canProceedCreateBasics}
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                form="create-course-form"
                className="admin-btn admin-btn--accent"
                disabled={savingCourse || !canSubmitCreate}
              >
                {savingCourse ? 'Creating…' : 'Create & build content'}
              </button>
            )}
          </div>
        }
      >
        {renderCreateWizard()}
      </AdminModal>

      <AdminModal
        open={modal === 'explore' && Boolean(activeCourse)}
        title={activeCourse?.title}
        subtitle={activeCourse?.shortDescription}
        onClose={closeModal}
        footer={
          activeCourse ? (
            <div className="admin-modal-action-row">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={closeModal}>
                Close
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => activeCourse && openEditModal(activeCourse, 'builder')}
              >
                Build content
              </button>
              {activeCourse.status === 'PUBLISHED' ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => handleUnpublishCourse(activeCourse.id)}
                >
                  Unpublish
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => handlePublishCourse(activeCourse.id)}
                >
                  Publish course
                </button>
              )}
            </div>
          ) : null
        }
      >
        {loadingModules ? <p>Loading modules…</p> : null}
        <div className="admin-course-explore-meta">
          <span className={`admin-badge${activeCourse?.status === 'PUBLISHED' ? ' admin-badge--published' : ''}`}>
            {activeCourse?.status}
          </span>
          <span>
            {activeCourse?.moduleCount ?? 0} modules • {activeCourse?.lessonCount ?? 0} lessons
          </span>
        </div>
        <h3 className="admin-modal-section-title">Modules & lessons</h3>
        {renderAccordion('explore')}
      </AdminModal>

      <AdminModal
        open={modal === 'edit' && Boolean(activeCourse)}
        title={activeCourse?.title || 'Edit course'}
        subtitle="Update course details or build modules and lessons."
        onClose={closeModal}
        size="wide"
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeModal}>
              Close
            </button>
            {activeCourse?.status === 'PUBLISHED' ? (
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => activeCourse && handleUnpublishCourse(activeCourse.id)}
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                className="admin-btn"
                onClick={() => activeCourse && handlePublishCourse(activeCourse.id)}
              >
                Publish course
              </button>
            )}
          </div>
        }
      >
        <div className="admin-course-edit-tabs">
          {EDIT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-course-edit-tab${editTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setEditTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {editTab === 'details' ? renderEditDetailsForm() : renderBuilderPanel()}
      </AdminModal>

      <AdminModal
        open={modal === 'edit' && subModal === 'module'}
        title="Add module"
        subtitle="Group related lessons into a module."
        onClose={closeSubModal}
        stack
        footer={
          <button type="submit" form="add-module-form" className="admin-btn">
            Add module
          </button>
        }
      >
        <form id="add-module-form" className="admin-form" onSubmit={handleCreateModule}>
          <label>
            Module title
            <input
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="e.g. Getting started"
              required
            />
          </label>
          <label>
            Module description
            <textarea
              value={moduleDescription}
              onChange={(e) => setModuleDescription(e.target.value)}
              placeholder="Optional summary for this section"
            />
          </label>
        </form>
      </AdminModal>

      <AdminModal
        open={modal === 'edit' && subModal === 'lesson'}
        title="Add lesson"
        subtitle={
          modules.find((module) => module.id === lessonModuleId)?.title || 'New lesson'
        }
        onClose={closeSubModal}
        stack
        size="wide"
        footer={
          <button type="submit" form="add-lesson-form" className="admin-btn">
            Add lesson
          </button>
        }
      >
        <form id="add-lesson-form" className="admin-form" onSubmit={handleCreateLesson}>
          <label>
            Lesson title
            <input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="e.g. Variables and types"
              required
            />
          </label>
          <label>
            Lesson description
            <textarea
              value={lessonDescription}
              onChange={(e) => setLessonDescription(e.target.value)}
              placeholder="Optional lesson summary"
            />
          </label>
          <div className="admin-form-row">
            <label>
              Lesson type
              <select value={lessonType} onChange={(e) => setLessonType(e.target.value)}>
                <option value="ARTICLE">Article</option>
                <option value="VIDEO">Video</option>
                <option value="QUIZ">Quiz</option>
              </select>
            </label>
            <label>
              Duration (minutes)
              <input
                value={lessonDuration}
                onChange={(e) => setLessonDuration(e.target.value)}
                type="number"
                min="0"
              />
            </label>
          </div>
          <label>
            {lessonType === 'VIDEO' ? 'Video URL' : lessonType === 'ARTICLE' ? 'Article content' : 'Content notes'}
            <textarea
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
              placeholder={
                lessonType === 'VIDEO'
                  ? 'YouTube or Google Drive link (e.g. youtube.com/watch?v=… or drive.google.com/file/d/…)'
                  : lessonType === 'QUIZ'
                    ? 'Quiz lessons link to practice admin tools.'
                    : 'Write the lesson content here…'
              }
            />
          </label>
          <label>
            Lesson status
            <select value={lessonStatus} onChange={(e) => setLessonStatus(e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </label>
        </form>
      </AdminModal>

      <AdminModal
        open={modal === 'lesson' && Boolean(activeLesson)}
        title={activeLesson?.title}
        subtitle={
          activeLesson
            ? `${activeLesson.type} • ${activeLesson.durationMinutes} min • ${activeLesson.status}`
            : undefined
        }
        onClose={() => {
          setActiveLesson(null)
          setModal(previousModal === 'none' ? 'explore' : previousModal)
        }}
      >
        {activeLesson?.description ? <p>{activeLesson.description}</p> : null}
        <h3 className="admin-modal-section-title">Content</h3>
        {activeLesson?.type === 'VIDEO' && activeLesson.content?.videoUrl ? (
          <VideoEmbed url={activeLesson.content.videoUrl} title={activeLesson.title} />
        ) : (
          <pre className="admin-lesson-content">{activeLesson ? formatLessonContent(activeLesson) : ''}</pre>
        )}
      </AdminModal>

      <AdminModal
        open={modal === 'delete' && Boolean(deleteTarget)}
        title="Delete course"
        subtitle="This action cannot be undone."
        onClose={() => {
          setDeleteTarget(null)
          setModal('none')
        }}
        size="narrow"
        footer={
          <div className="admin-modal-action-row">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                setDeleteTarget(null)
                setModal('none')
              }}
              disabled={deletingCourse}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--danger"
              onClick={handleDeleteCourse}
              disabled={deletingCourse}
            >
              {deletingCourse ? 'Deleting…' : 'Delete course'}
            </button>
          </div>
        }
      >
        <p className="admin-delete-copy">
          Delete <strong>{deleteTarget?.title}</strong>? All modules, lessons, enrollments, and
          student progress for this course will be permanently removed.
        </p>
      </AdminModal>
    </div>
  )
}

export default AdminCoursesPage
