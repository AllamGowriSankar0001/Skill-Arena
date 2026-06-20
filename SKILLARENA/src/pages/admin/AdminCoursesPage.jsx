import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../services/api'
import BlogContent from '../../components/BlogContent'
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

const BUILDER_FLOW_STEPS = [
  { number: 1, title: 'Add modules', body: 'Split the course into sections.' },
  { number: 2, title: 'Add lessons', body: 'Articles, videos, or quizzes inside each module.' },
  { number: 3, title: 'Publish', body: 'Review everything, then publish the course.' },
]

const LESSON_TYPE_OPTIONS = [
  {
    value: 'ARTICLE',
    label: 'Article',
    description: 'Written lesson with Markdown — headings, lists, code blocks, and links.',
  },
  {
    value: 'VIDEO',
    label: 'Video',
    description: 'Embed a YouTube or Google Drive video for students to watch.',
  },
  {
    value: 'QUIZ',
    label: 'Quiz',
    description: 'Multiple-choice questions. You will add MCQs right after creating the lesson.',
  },
]

const ADD_LESSON_STEPS = ['Choose type', 'Details & content']

const EMPTY_QUIZ_QUESTION = {
  prompt: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOptionId: 'opt-1',
  explanation: '',
}

const formatLessonContent = (lesson) => {
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
  const [deleting, setDeleting] = useState(false)

  const [skills, setSkills] = useState([])
  const [lessonAssessment, setLessonAssessment] = useState(null)
  const [loadingLessonAssessment, setLoadingLessonAssessment] = useState(false)
  const [quizQuestionForm, setQuizQuestionForm] = useState(EMPTY_QUIZ_QUESTION)
  const [savingQuizQuestion, setSavingQuizQuestion] = useState(false)
  const [creatingLessonQuiz, setCreatingLessonQuiz] = useState(false)

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
  const [lessonCreateStep, setLessonCreateStep] = useState(0)
  const [savingLesson, setSavingLesson] = useState(false)
  const [savingEditLesson, setSavingEditLesson] = useState(false)

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
      const [, skillData] = await Promise.all([loadCourses(), adminApi.skills()])
      setSkills(skillData.skills)
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
    setLessonAssessment(null)
    setQuizQuestionForm(EMPTY_QUIZ_QUESTION)
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
    setLessonCreateStep(0)
  }

  const openAddQuizQuestionModal = () => {
    setQuizQuestionForm(EMPTY_QUIZ_QUESTION)
    setSubModal('quizQuestion')
  }

  const openEditArticleModal = (lesson) => {
    setLessonTitle(lesson.title || '')
    setLessonDescription(lesson.description || '')
    setLessonContent(lesson.content?.articleHtml || '')
    setLessonDuration(String(lesson.durationMinutes ?? 10))
    setLessonStatus(lesson.status || 'DRAFT')
    setSubModal('editLesson')
  }

  const activeLessonModule = useMemo(
    () => modules.find((module) => module.id === lessonModuleId),
    [modules, lessonModuleId],
  )

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
    setLessonCreateStep(0)
    setSubModal('lesson')
  }

  const openDeleteModal = (target) => {
    setDeleteTarget({
      ...target,
      returnTo:
        target.returnTo ??
        (target.kind === 'course'
          ? 'none'
          : modal === 'delete'
            ? previousModal
            : modal),
    })
    setModal('delete')
  }

  const openDeleteCourseModal = (course) => {
    openDeleteModal({ kind: 'course', item: course })
  }

  const openDeleteModuleModal = (module) => {
    openDeleteModal({ kind: 'module', item: module, returnTo: 'edit' })
  }

  const openDeleteLessonModal = (lesson) => {
    openDeleteModal({ kind: 'lesson', item: lesson, returnTo: 'edit' })
  }

  const openDeleteQuestionModal = (question, assessmentId) => {
    openDeleteModal({ kind: 'question', item: question, assessmentId, returnTo: 'lesson' })
  }

  const loadLessonAssessment = async (lesson) => {
    if (!lesson?.assessmentId) {
      setLessonAssessment(null)
      return
    }

    setLoadingLessonAssessment(true)
    try {
      const data = await adminApi.assessment(lesson.assessmentId)
      setLessonAssessment(data.assessment)
    } catch (err) {
      setError(err.message || 'Failed to load quiz questions')
      setLessonAssessment(null)
    } finally {
      setLoadingLessonAssessment(false)
    }
  }

  const openLessonModal = async (lesson) => {
    setPreviousModal(modal)
    setActiveLesson(lesson)
    setLessonAssessment(null)
    setQuizQuestionForm(EMPTY_QUIZ_QUESTION)
    setModal('lesson')
    if (lesson.type === 'QUIZ') {
      await loadLessonAssessment(lesson)
    }
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
    if (!deleteTarget || deleteTarget.kind !== 'course') return
    setDeleting(true)
    setError('')
    try {
      await adminApi.deleteCourse(deleteTarget.item.id)
      setMessage(`"${deleteTarget.item.title}" was deleted.`)
      if (activeCourse?.id === deleteTarget.item.id) {
        closeModal()
      }
      setDeleteTarget(null)
      setModal('none')
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to delete course')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteModule = async () => {
    if (!deleteTarget || deleteTarget.kind !== 'module' || !activeCourse) return
    setDeleting(true)
    setError('')
    try {
      await adminApi.deleteModule(activeCourse.id, deleteTarget.item.id)
      setMessage(`Module "${deleteTarget.item.title}" was deleted.`)
      setDeleteTarget(null)
      setModal(deleteTarget.returnTo || 'edit')
      await loadCourseStructure(activeCourse.id)
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to delete module')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteLesson = async () => {
    if (!deleteTarget || deleteTarget.kind !== 'lesson' || !activeCourse) return
    const { item: lesson } = deleteTarget
    setDeleting(true)
    setError('')
    try {
      await adminApi.deleteLesson(lesson.id)
      setMessage(`Lesson "${lesson.title}" was deleted.`)
      if (activeLesson?.id === lesson.id) {
        setActiveLesson(null)
        setLessonAssessment(null)
      }
      setDeleteTarget(null)
      setModal(deleteTarget.returnTo || 'edit')
      await loadModuleLessons(activeCourse.id, lesson.moduleId)
      await loadCourseStructure(activeCourse.id)
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to delete lesson')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!deleteTarget || deleteTarget.kind !== 'question') return
    const { item: question, assessmentId } = deleteTarget
    setDeleting(true)
    setError('')
    try {
      const data = await adminApi.removeQuestionFromAssessment(assessmentId, question.id)
      setMessage('Question removed from quiz.')
      setLessonAssessment(data.assessment)
      if (activeLesson?.assessmentId === assessmentId) {
        setActiveLesson((current) =>
          current ? { ...current, assessmentId: data.assessment.id } : current,
        )
      }
      setDeleteTarget(null)
      setModal(deleteTarget.returnTo || 'lesson')
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to delete question')
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'course') return handleDeleteCourse()
    if (deleteTarget.kind === 'module') return handleDeleteModule()
    if (deleteTarget.kind === 'lesson') return handleDeleteLesson()
    if (deleteTarget.kind === 'question') return handleDeleteQuestion()
    return undefined
  }

  const handleCreateLessonQuiz = async () => {
    if (!activeLesson) return
    setCreatingLessonQuiz(true)
    setError('')
    try {
      const result = await adminApi.createLessonQuiz(activeLesson.id, {
        title: `${activeLesson.title} Quiz`,
      })
      setActiveLesson(result.lesson)
      const refreshed = await adminApi.assessment(result.lesson.assessmentId)
      setLessonAssessment(refreshed.assessment)
      setMessage('Quiz ready. Click + Add MCQ to create your first question.')
      if (activeCourse) {
        await loadModuleLessons(activeCourse.id, activeLesson.moduleId)
      }
    } catch (err) {
      setError(err.message || 'Failed to create quiz')
    } finally {
      setCreatingLessonQuiz(false)
    }
  }

  const handleQuizQuestionChange = (event) => {
    const { name, value } = event.target
    setQuizQuestionForm((current) => ({ ...current, [name]: value }))
  }

  const handleAddQuizQuestion = async (event) => {
    event.preventDefault()
    if (!activeLesson?.assessmentId || !lessonAssessment) return

    const skillId = skills[0]?.id
    if (!skillId) {
      setError('Add a skill in Practice admin before creating quiz questions.')
      return
    }

    setSavingQuizQuestion(true)
    setError('')
    try {
      const options = [
        { optionId: 'opt-1', text: quizQuestionForm.optionA },
        { optionId: 'opt-2', text: quizQuestionForm.optionB },
        { optionId: 'opt-3', text: quizQuestionForm.optionC },
        { optionId: 'opt-4', text: quizQuestionForm.optionD },
      ].filter((option) => option.text.trim())

      const questionResult = await adminApi.createQuestion({
        prompt: quizQuestionForm.prompt.trim(),
        skillId,
        difficulty: 'EASY',
        options,
        correctOptionId: quizQuestionForm.correctOptionId,
        explanation: quizQuestionForm.explanation.trim(),
      })

      await adminApi.addQuestionToAssessment(activeLesson.assessmentId, {
        questionId: questionResult.question.id,
      })

      const refreshed = await adminApi.assessment(activeLesson.assessmentId)
      setLessonAssessment(refreshed.assessment)
      setQuizQuestionForm(EMPTY_QUIZ_QUESTION)
      setMessage('MCQ added to lesson quiz.')
      closeSubModal()
      if (activeCourse) {
        await loadModuleLessons(activeCourse.id, activeLesson.moduleId)
      }
    } catch (err) {
      setError(err.message || 'Failed to add quiz question')
    } finally {
      setSavingQuizQuestion(false)
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
      setMessage('Module created. Add lessons inside it next.')
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

    setSavingLesson(true)
    setError('')
    try {
      const { lesson: createdLesson } = await adminApi.createLesson(activeCourse.id, moduleId, {
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

      let lessonToView = createdLesson
      if (lessonType === 'QUIZ') {
        const quizResult = await adminApi.createLessonQuiz(createdLesson.id, {
          title: `${lessonTitle.trim()} Quiz`,
        })
        lessonToView = quizResult.lesson
      }

      await loadModuleLessons(activeCourse.id, moduleId)
      await loadCourseStructure(activeCourse.id)
      await loadAll()
      closeSubModal()
      setExpandedModuleIds((current) => [...new Set([...current, moduleId])])

      if (lessonType === 'QUIZ') {
        setMessage('Quiz lesson created. Add your first MCQ below.')
        setPreviousModal('edit')
        await openLessonModal(lessonToView)
      } else {
        setMessage('Lesson added.')
      }
    } catch (err) {
      setError(err.message || 'Failed to create lesson')
    } finally {
      setSavingLesson(false)
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

  const handleUpdateArticleLesson = async (event) => {
    event.preventDefault()
    if (!activeLesson || !activeCourse) return

    setSavingEditLesson(true)
    setError('')
    try {
      const { lesson } = await adminApi.updateLesson(activeLesson.id, {
        title: lessonTitle.trim(),
        description: lessonDescription.trim(),
        durationMinutes: Number(lessonDuration) || 0,
        status: lessonStatus,
        content: {
          ...activeLesson.content,
          articleHtml: lessonContent.trim(),
        },
      })

      setActiveLesson(lesson)
      setMessage('Article lesson updated.')
      closeSubModal()
      await loadModuleLessons(activeCourse.id, lesson.moduleId)
      await loadCourseStructure(activeCourse.id)
      await loadAll()
    } catch (err) {
      setError(err.message || 'Failed to update lesson')
    } finally {
      setSavingEditLesson(false)
    }
  }

  const renderArticleLessonForm = (formId, onSubmit) => (
    <form id={formId} className="admin-form" onSubmit={onSubmit}>
      <div className="admin-form-section">
        <h4 className="admin-form-section-title">Basics</h4>
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
          Short description
          <textarea
            value={lessonDescription}
            onChange={(e) => setLessonDescription(e.target.value)}
            placeholder="Optional summary shown in the lesson list"
          />
        </label>
      </div>
      <div className="admin-form-section">
        <h4 className="admin-form-section-title">Settings</h4>
        <div className="admin-form-row">
          <label>
            Duration (minutes)
            <input
              value={lessonDuration}
              onChange={(e) => setLessonDuration(e.target.value)}
              type="number"
              min="0"
            />
          </label>
          <label>
            Status
            <select value={lessonStatus} onChange={(e) => setLessonStatus(e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </label>
        </div>
      </div>
      <div className="admin-form-section">
        <h4 className="admin-form-section-title">Article content</h4>
        <label>
          Markdown body
          <textarea
            value={lessonContent}
            onChange={(e) => setLessonContent(e.target.value)}
            className="admin-lesson-markdown-input"
            placeholder="Write lesson content in Markdown — headings, lists, code blocks, and links are supported."
          />
        </label>
        {lessonContent.trim() ? (
          <div className="admin-lesson-markdown-preview">
            <p className="admin-lesson-markdown-preview-label">Preview</p>
            <BlogContent content={lessonContent} />
          </div>
        ) : null}
      </div>
    </form>
  )

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
                  <div className="admin-accordion-item-actions">
                    <button
                      type="button"
                      className="admin-link-btn admin-link-btn--accent"
                      onClick={() => openAddLessonModal(module.id)}
                    >
                      + Lesson
                    </button>
                    <button
                      type="button"
                      className="admin-link-btn admin-link-btn--danger"
                      onClick={() => openDeleteModuleModal(module)}
                    >
                      Delete
                    </button>
                  </div>
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
                          onClick={() => openLessonModal(lesson)}
                        >
                          <strong>{lesson.title}</strong>
                          <span>
                            {lesson.type} • {lesson.durationMinutes} min • {lesson.status}
                          </span>
                        </button>
                        <div className="admin-lesson-row-actions">
                          {mode === 'explore' && lesson.status !== 'PUBLISHED' ? (
                            <button
                              type="button"
                              className="admin-link-btn"
                              onClick={() => handlePublishLesson(lesson)}
                            >
                              Publish
                            </button>
                          ) : null}
                          {mode === 'builder' && lesson.type === 'ARTICLE' ? (
                            <button
                              type="button"
                              className="admin-link-btn"
                              onClick={() => {
                                setActiveLesson(lesson)
                                openEditArticleModal(lesson)
                              }}
                            >
                              Edit
                            </button>
                          ) : null}
                          {mode === 'builder' ? (
                            <button
                              type="button"
                              className="admin-link-btn admin-link-btn--danger"
                              onClick={() => openDeleteLessonModal(lesson)}
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
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
        <p>No modules yet — start with your first section.</p>
        {mode === 'builder' ? (
          <button type="button" className="admin-btn admin-btn--accent" onClick={openAddModuleModal}>
            + Add first module
          </button>
        ) : (
          <p className="admin-muted">Switch to the Content tab to add modules and lessons.</p>
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

  const renderBuilderFlowGuide = () => (
    <div className="admin-flow-steps" aria-label="How to build a course">
      {BUILDER_FLOW_STEPS.map((step) => (
        <div key={step.number} className="admin-flow-step">
          <span className="admin-flow-step-number">{step.number}</span>
          <div className="admin-flow-step-copy">
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </div>
        </div>
      ))}
    </div>
  )

  const renderFlowContext = (trail) => (
    <p className="admin-flow-context">
      {trail.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 ? <span className="admin-flow-context-sep">→</span> : null}
          <span>{part}</span>
        </span>
      ))}
    </p>
  )

  const renderWizardSteps = (steps, activeIndex) => (
    <div className="admin-wizard-steps" aria-label="Progress">
      {steps.map((label, index) => (
        <div
          key={label}
          className={`admin-wizard-step${index === activeIndex ? ' is-active' : ''}${index < activeIndex ? ' is-complete' : ''}`}
        >
          <span className="admin-wizard-step-index">{index + 1}</span>
          <span className="admin-wizard-step-label">{label}</span>
        </div>
      ))}
    </div>
  )

  const renderLessonTypePicker = () => (
    <div className="admin-type-card-grid">
      {LESSON_TYPE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`admin-type-card${lessonType === option.value ? ' is-active' : ''}`}
          onClick={() => setLessonType(option.value)}
        >
          <span className="admin-type-card-label">{option.label}</span>
          <span className="admin-type-card-description">{option.description}</span>
        </button>
      ))}
    </div>
  )

  const renderQuizQuestionForm = (formId) => (
    <form id={formId} className="admin-form" onSubmit={handleAddQuizQuestion}>
      <div className="admin-form-section">
        <h4 className="admin-form-section-title">Question</h4>
        <label>
          Prompt
          <textarea
            name="prompt"
            value={quizQuestionForm.prompt}
            onChange={handleQuizQuestionChange}
            placeholder="What is the output of…?"
            required
          />
        </label>
      </div>
      <div className="admin-form-section">
        <h4 className="admin-form-section-title">Answer options</h4>
        <div className="admin-form-row">
          <label>
            Option A
            <input name="optionA" value={quizQuestionForm.optionA} onChange={handleQuizQuestionChange} required />
          </label>
          <label>
            Option B
            <input name="optionB" value={quizQuestionForm.optionB} onChange={handleQuizQuestionChange} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Option C
            <input name="optionC" value={quizQuestionForm.optionC} onChange={handleQuizQuestionChange} />
          </label>
          <label>
            Option D
            <input name="optionD" value={quizQuestionForm.optionD} onChange={handleQuizQuestionChange} />
          </label>
        </div>
      </div>
      <div className="admin-form-section">
        <h4 className="admin-form-section-title">Correct answer</h4>
        <label>
          Mark correct option
          <select
            name="correctOptionId"
            value={quizQuestionForm.correctOptionId}
            onChange={handleQuizQuestionChange}
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
            value={quizQuestionForm.explanation}
            onChange={handleQuizQuestionChange}
            placeholder="Briefly explain why this answer is correct"
          />
        </label>
      </div>
    </form>
  )

  const renderBuilderPanel = () => (
    <div className="admin-course-builder">
      {renderBuilderFlowGuide()}
      <div className="admin-course-builder-toolbar">
        <div>
          <h3 className="admin-modal-section-title">Course structure</h3>
          <p className="admin-course-builder-lead">
            Expand a module to see its lessons. Use <strong>+ Lesson</strong> to add content.
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
                onClick={() => openDeleteCourseModal(course)}
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
        subtitle="Step 1 of your course structure — group related lessons together."
        onClose={closeSubModal}
        stack
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeSubModal}>
              Cancel
            </button>
            <button type="submit" form="add-module-form" className="admin-btn">
              Create module
            </button>
          </div>
        }
      >
        {renderFlowContext([activeCourse?.title || 'Course', 'New module'])}
        <form id="add-module-form" className="admin-form" onSubmit={handleCreateModule}>
          <div className="admin-form-section">
            <h4 className="admin-form-section-title">Module details</h4>
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
              Short description
              <textarea
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
                placeholder="Optional — shown to help you organize this section"
              />
            </label>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={modal === 'edit' && subModal === 'lesson'}
        title="Add lesson"
        subtitle={
          lessonCreateStep === 0
            ? 'Step 1 — pick the lesson format'
            : 'Step 2 — fill in details and content'
        }
        onClose={closeSubModal}
        stack
        size="wide"
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeSubModal}>
              Cancel
            </button>
            {lessonCreateStep === 1 ? (
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setLessonCreateStep(0)}
              >
                Back
              </button>
            ) : null}
            {lessonCreateStep === 0 ? (
              <button type="button" className="admin-btn" onClick={() => setLessonCreateStep(1)}>
                Continue
              </button>
            ) : (
              <button type="submit" form="add-lesson-form" className="admin-btn" disabled={savingLesson}>
                {savingLesson ? 'Creating…' : 'Create lesson'}
              </button>
            )}
          </div>
        }
      >
        {renderFlowContext([
          activeCourse?.title || 'Course',
          activeLessonModule?.title || 'Module',
          'New lesson',
        ])}
        {renderWizardSteps(ADD_LESSON_STEPS, lessonCreateStep)}
        {lessonCreateStep === 0 ? (
          <div className="admin-form-section">
            <h4 className="admin-form-section-title">What type of lesson is this?</h4>
            {renderLessonTypePicker()}
          </div>
        ) : (
          <form id="add-lesson-form" className="admin-form" onSubmit={handleCreateLesson}>
            <div className="admin-form-section">
              <h4 className="admin-form-section-title">Basics</h4>
              <div className="admin-selected-type">
                <span className="admin-selected-type-label">
                  {LESSON_TYPE_OPTIONS.find((option) => option.value === lessonType)?.label}
                </span>
                <button type="button" className="admin-link-btn" onClick={() => setLessonCreateStep(0)}>
                  Change type
                </button>
              </div>
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
                Short description
                <textarea
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  placeholder="Optional summary shown in the lesson list"
                />
              </label>
            </div>
            <div className="admin-form-section">
              <h4 className="admin-form-section-title">Settings</h4>
              <div className="admin-form-row">
                <label>
                  Duration (minutes)
                  <input
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    type="number"
                    min="0"
                  />
                </label>
                <label>
                  Status
                  <select value={lessonStatus} onChange={(e) => setLessonStatus(e.target.value)}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </label>
              </div>
            </div>
            {lessonType === 'VIDEO' ? (
              <div className="admin-form-section">
                <h4 className="admin-form-section-title">Video</h4>
                <label>
                  Video URL
                  <input
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                    placeholder="youtube.com/watch?v=… or drive.google.com/file/d/…"
                  />
                </label>
              </div>
            ) : null}
            {lessonType === 'ARTICLE' ? (
              <div className="admin-form-section">
                <h4 className="admin-form-section-title">Article content</h4>
                <label>
                  Markdown body
                  <textarea
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                    className="admin-lesson-markdown-input"
                    placeholder="Write lesson content in Markdown — headings, lists, code blocks, and links are supported."
                  />
                </label>
                {lessonContent.trim() ? (
                  <div className="admin-lesson-markdown-preview">
                    <p className="admin-lesson-markdown-preview-label">Preview</p>
                    <BlogContent content={lessonContent} />
                  </div>
                ) : null}
              </div>
            ) : null}
            {lessonType === 'QUIZ' ? (
              <div className="admin-info-panel">
                <strong>Quiz lessons</strong>
                <p>
                  After you create this lesson, you will be taken straight to the quiz screen to add
                  multiple-choice questions one at a time.
                </p>
              </div>
            ) : null}
          </form>
        )}
      </AdminModal>

      <AdminModal
        open={(modal === 'lesson' || modal === 'edit') && subModal === 'editLesson' && Boolean(activeLesson)}
        title="Edit article lesson"
        subtitle="Update the lesson details and Markdown content."
        onClose={closeSubModal}
        stack
        size="wide"
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeSubModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="edit-article-lesson-form"
              className="admin-btn"
              disabled={savingEditLesson}
            >
              {savingEditLesson ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        }
      >
        {renderFlowContext([
          activeCourse?.title || 'Course',
          modules.find((module) => module.id === activeLesson?.moduleId)?.title || 'Module',
          activeLesson?.title || 'Lesson',
        ])}
        {renderArticleLessonForm('edit-article-lesson-form', handleUpdateArticleLesson)}
      </AdminModal>

      <AdminModal
        open={modal === 'lesson' && subModal === 'quizQuestion'}
        title="Add MCQ"
        subtitle="Add one multiple-choice question to this lesson quiz."
        onClose={closeSubModal}
        stack
        size="wide"
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeSubModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="add-quiz-question-form"
              className="admin-btn"
              disabled={savingQuizQuestion}
            >
              {savingQuizQuestion ? 'Adding…' : 'Add question'}
            </button>
          </div>
        }
      >
        {renderFlowContext([activeCourse?.title || 'Course', activeLesson?.title || 'Quiz', 'New MCQ'])}
        {renderQuizQuestionForm('add-quiz-question-form')}
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
          closeSubModal()
          setActiveLesson(null)
          setLessonAssessment(null)
          setModal(previousModal === 'none' ? 'explore' : previousModal)
        }}
        footer={
          activeLesson ? (
            <div className="admin-modal-action-row">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => {
                  setActiveLesson(null)
                  setLessonAssessment(null)
                  setModal(previousModal === 'none' ? 'explore' : previousModal)
                }}
              >
                Close
              </button>
              {activeLesson.type === 'ARTICLE' ? (
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => openEditArticleModal(activeLesson)}
                >
                  Edit article
                </button>
              ) : null}
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={() =>
                  openDeleteModal({
                    kind: 'lesson',
                    item: activeLesson,
                    returnTo: previousModal === 'none' ? 'edit' : previousModal,
                  })
                }
              >
                Delete lesson
              </button>
            </div>
          ) : null
        }
      >
        {activeLesson?.description ? <p>{activeLesson.description}</p> : null}
        <h3 className="admin-modal-section-title">Content</h3>
        {activeLesson?.type === 'VIDEO' && activeLesson.content?.videoUrl ? (
          <VideoEmbed url={activeLesson.content.videoUrl} title={activeLesson.title} />
        ) : activeLesson?.type === 'ARTICLE' ? (
          <div className="admin-lesson-content admin-lesson-content--markdown">
            <BlogContent content={activeLesson.content?.articleHtml || ''} />
          </div>
        ) : activeLesson?.type === 'QUIZ' ? (
          <div className="admin-lesson-quiz">
            {loadingLessonAssessment ? (
              <p className="admin-muted">Loading quiz…</p>
            ) : lessonAssessment ? (
              <>
                <div className="admin-lesson-quiz-toolbar">
                  <div className="admin-lesson-quiz-meta">
                    <span>{lessonAssessment.questionCount ?? 0} MCQs</span>
                    <span>{lessonAssessment.status}</span>
                  </div>
                  <button type="button" className="admin-btn admin-btn--accent" onClick={openAddQuizQuestionModal}>
                    + Add MCQ
                  </button>
                </div>
                {lessonAssessment.questions?.length ? (
                  <div className="admin-lesson-quiz-list">
                    {lessonAssessment.questions.map((question, index) => (
                      <div key={question.id} className="admin-lesson-quiz-item">
                        <div className="admin-lesson-quiz-item-copy">
                          <strong>
                            Q{index + 1}. {question.prompt}
                          </strong>
                          <span>{question.options?.length ?? 0} options</span>
                        </div>
                        <button
                          type="button"
                          className="admin-link-btn admin-link-btn--danger"
                          onClick={() => openDeleteQuestionModal(question, lessonAssessment.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="admin-info-panel">
                    <strong>No questions yet</strong>
                    <p>Click <strong>+ Add MCQ</strong> to create the first multiple-choice question.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="admin-lesson-quiz-empty">
                <div className="admin-info-panel">
                  <strong>Quiz not set up</strong>
                  <p>Create the quiz shell first, then add your MCQs.</p>
                </div>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={handleCreateLessonQuiz}
                  disabled={creatingLessonQuiz}
                >
                  {creatingLessonQuiz ? 'Creating…' : 'Set up quiz'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="admin-lesson-content admin-lesson-content--plain">
            {activeLesson ? formatLessonContent(activeLesson) : ''}
          </p>
        )}
      </AdminModal>

      <AdminModal
        open={modal === 'delete' && Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === 'course'
            ? 'Delete course'
            : deleteTarget?.kind === 'module'
              ? 'Delete module'
              : deleteTarget?.kind === 'lesson'
                ? 'Delete lesson'
                : 'Delete question'
        }
        subtitle="This action cannot be undone."
        onClose={() => {
          setDeleteTarget(null)
          setModal(deleteTarget?.returnTo || 'none')
        }}
        size="narrow"
        footer={
          <div className="admin-modal-action-row">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                setDeleteTarget(null)
                setModal(deleteTarget?.returnTo || 'none')
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
                : deleteTarget?.kind === 'course'
                  ? 'Delete course'
                  : deleteTarget?.kind === 'module'
                    ? 'Delete module'
                    : deleteTarget?.kind === 'lesson'
                      ? 'Delete lesson'
                      : 'Delete question'}
            </button>
          </div>
        }
      >
        <p className="admin-delete-copy">
          {deleteTarget?.kind === 'course' ? (
            <>
              Delete <strong>{deleteTarget.item.title}</strong>? All modules, lessons, enrollments, and
              student progress for this course will be permanently removed.
            </>
          ) : null}
          {deleteTarget?.kind === 'module' ? (
            <>
              Delete module <strong>{deleteTarget.item.title}</strong>? All lessons, quiz questions, and
              learner progress in this module will be permanently removed.
            </>
          ) : null}
          {deleteTarget?.kind === 'lesson' ? (
            <>
              Delete lesson <strong>{deleteTarget.item.title}</strong>? Its content
              {deleteTarget.item.type === 'QUIZ' ? ', quiz, and MCQs' : ''} will be permanently removed.
            </>
          ) : null}
          {deleteTarget?.kind === 'question' ? (
            <>
              Remove MCQ <strong>{deleteTarget.item.prompt}</strong> from this lesson quiz? The question
              will be deleted if it is not used elsewhere.
            </>
          ) : null}
        </p>
      </AdminModal>
    </div>
  )
}

export default AdminCoursesPage
