/*
 * Legacy client-side jsPDF renderer — replaced by LaTeX PDF service.
 * See: SKILLARENA/pdf-service (Python) + POST /api/resume/pdf (Node proxy).
 * Active download path: src/utils/atsResumePdfDownload.js
 */

/*
import { jsPDF } from 'jspdf'
import { formatEducationDegree } from './atsResume'
import { formatContactLine } from './resumeStructured'
import { SKILL_MISMATCH_LEGEND } from './resumeSkills'

const UNICODE_REPLACEMENTS = [
  [/[\u2022\u2023\u25E6\u2043\u2219]/g, '-'],
  [/[\u2013\u2014]/g, '-'],
  [/[\u2018\u2019]/g, "'"],
  [/[\u201C\u201D]/g, '"'],
  [/\u00A0/g, ' '],
  [/\uFFFD/g, ''],
  [/[\u200B-\u200D\uFEFF]/g, ''],
  [/&/g, 'and'],
]

const PDF_COLORS = {
  ink: [26, 17, 10],
  muted: [92, 79, 69],
  accent: [196, 92, 38],
  mismatch: [180, 35, 24],
}

const sanitizePdfText = (value) => {
  let text = String(value ?? '')
  UNICODE_REPLACEMENTS.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement)
  })
  return text.replace(/\s+/g, ' ').trim()
}

const wrapPdfText = (doc, text, maxWidth) => {
  const width = Math.max(48, maxWidth)
  const raw = doc.splitTextToSize(text, width)
  const lines = Array.isArray(raw) ? raw : [String(raw)]
  return lines.map((line) => sanitizePdfText(line)).filter(Boolean)
}

const drawPdfTextLine = (doc, line, x, y) => {
  if (!line) return
  doc.text(line, x, y, { align: 'left', baseline: 'alphabetic' })
}

const createLayout = (doc) => {
  const margin = 54
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  return {
    margin,
    pageWidth,
    pageHeight,
    maxWidth: pageWidth - margin * 2,
    y: margin,
  }
}

const ensureSpace = (layout, doc, needed) => {
  if (layout.y + needed > layout.pageHeight - layout.margin) {
    doc.addPage()
    layout.y = layout.margin
  }
}

const renderLines = (doc, layout, text, options = {}) => {
  const {
    size = 10,
    style = 'normal',
    color = PDF_COLORS.ink,
    gap = 8,
    x = layout.margin,
    maxWidth = layout.maxWidth,
  } = options

  const clean = sanitizePdfText(text)
  if (!clean) return

  doc.setFont('helvetica', style)
  doc.setFontSize(size)
  doc.setTextColor(...color)

  const lines = wrapPdfText(doc, clean, maxWidth)
  const lineHeight = size * 1.45
  ensureSpace(layout, doc, lines.length * lineHeight + gap)

  lines.forEach((line, index) => {
    drawPdfTextLine(doc, line, x, layout.y + index * lineHeight)
  })

  layout.y += lines.length * lineHeight + gap
}

const renderSectionTitle = (doc, layout, title) => {
  ensureSpace(layout, doc, 28)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...PDF_COLORS.ink)
  drawPdfTextLine(doc, sanitizePdfText(title).toUpperCase(), layout.margin, layout.y)
  layout.y += 14
  doc.setDrawColor(...PDF_COLORS.accent)
  doc.setLineWidth(0.8)
  doc.line(layout.margin, layout.y, layout.pageWidth - layout.margin, layout.y)
  layout.y += 12
}

const renderBullet = (doc, layout, text) => {
  const clean = sanitizePdfText(text)
  if (!clean) return

  const textX = layout.margin + 12
  const textWidth = layout.maxWidth - 12
  const size = 10
  const lineHeight = size * 1.45

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(size)
  doc.setTextColor(...PDF_COLORS.ink)

  const lines = wrapPdfText(doc, clean, textWidth)
  ensureSpace(layout, doc, lines.length * lineHeight + 4)

  lines.forEach((line, index) => {
    const lineY = layout.y + index * lineHeight
    if (index === 0) drawPdfTextLine(doc, '-', layout.margin, lineY)
    drawPdfTextLine(doc, line, textX, lineY)
  })

  layout.y += lines.length * lineHeight + 4
}

const renderRowHeader = (
  doc,
  layout,
  leftText,
  rightText,
  {
    style = 'bold',
    size = 10.5,
    rightSize = 9.5,
    color = PDF_COLORS.ink,
    rightColor = PDF_COLORS.muted,
    gapAfter = 4,
  } = {},
) => {
  const left = sanitizePdfText(leftText)
  const right = sanitizePdfText(rightText)
  if (!left && !right) return

  const lineHeight = size * 1.45
  const rightGap = 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(rightSize)
  const rightWidth = right ? doc.getTextWidth(right) + rightGap : 0
  const leftMaxWidth = Math.max(48, layout.maxWidth - rightWidth)

  doc.setFont('helvetica', style)
  doc.setFontSize(size)
  const leftLines = left ? wrapPdfText(doc, left, leftMaxWidth) : ['']

  ensureSpace(layout, doc, leftLines.length * lineHeight + gapAfter)

  leftLines.forEach((line, index) => {
    const lineY = layout.y + index * lineHeight
    if (line) {
      doc.setFont('helvetica', style)
      doc.setFontSize(size)
      doc.setTextColor(...color)
      drawPdfTextLine(doc, line, layout.margin, lineY)
    }

    if (index === 0 && right) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(rightSize)
      doc.setTextColor(...rightColor)
      drawPdfTextLine(
        doc,
        right,
        layout.pageWidth - layout.margin - doc.getTextWidth(right),
        lineY,
      )
    }
  })

  layout.y += leftLines.length * lineHeight + gapAfter
}

const renderExperienceHeader = (doc, layout, role, company, period) => {
  const title = sanitizePdfText(`${role}${company ? ` - ${company}` : ''}`)
  renderRowHeader(doc, layout, title, period, { gapAfter: 4 })
}

export const slugifyFilename = (name) =>
  (name || 'resume')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'resume'

export const buildAtsPdf = (ats) => {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const layout = createLayout(doc)

  if (ats.name) renderLines(doc, layout, ats.name, { size: 22, style: 'bold', gap: 6 })
  if (ats.role) renderLines(doc, layout, ats.role, { size: 12, color: PDF_COLORS.muted, gap: 6 })

  const contactLine = formatContactLine(ats.contact)
  if (contactLine) renderLines(doc, layout, contactLine, { size: 9, color: PDF_COLORS.muted, gap: 14 })

  if (ats.summary) {
    renderSectionTitle(doc, layout, 'Professional Summary')
    renderLines(doc, layout, ats.summary, { size: 10, gap: 12 })
  }

  if (ats.skills.length) {
    renderSectionTitle(doc, layout, 'Skills')
    const matched = ats.skills.filter((skill) => skill.matched).map((skill) => skill.name)
    const unmatched = ats.skills.filter((skill) => !skill.matched).map((skill) => skill.name)
    if (matched.length) renderLines(doc, layout, matched.join(', '), { size: 10, gap: 6 })
    if (unmatched.length) {
      renderLines(doc, layout, unmatched.join(', '), { size: 10, color: PDF_COLORS.mismatch, gap: 6 })
      renderLines(doc, layout, SKILL_MISMATCH_LEGEND, { size: 8, color: PDF_COLORS.mismatch, gap: 12 })
    } else {
      layout.y += 4
    }
  }

  if (ats.experiences.length) {
    renderSectionTitle(doc, layout, 'Work Experience')
    ats.experiences.forEach((item) => {
      renderExperienceHeader(doc, layout, item.role, item.company, item.period)
      item.bullets.forEach((bullet) => renderBullet(doc, layout, bullet))
      layout.y += 4
    })
  }

  if (ats.projects.length) {
    renderSectionTitle(doc, layout, 'Projects')
    ats.projects.forEach((item) => {
      renderLines(doc, layout, item.name, { size: 10.5, style: 'bold', gap: 4 })
      item.bullets.forEach((bullet) => renderBullet(doc, layout, bullet))
      layout.y += 4
    })
  }

  if (ats.educations.length) {
    renderSectionTitle(doc, layout, 'Education')
    ats.educations.forEach((edu) => {
      const degreeLabel = formatEducationDegree(edu)
      renderRowHeader(doc, layout, degreeLabel, edu.period || '')
      if (edu.institution || edu.grade) {
        renderRowHeader(doc, layout, edu.institution || '', edu.grade || '', {
          style: 'normal',
          size: 10,
          gapAfter: edu.grade ? 8 : 4,
        })
      }
    })
  }

  return doc
}

export const downloadAtsResumePdf = (ats, filename) => {
  const fileName = filename || `${slugifyFilename(ats.name)}-resume.pdf`
  buildAtsPdf(ats).save(fileName)
}
*/

export { downloadAtsResumePdf, slugifyFilename, warmAtsResumePdf } from './atsResumePdfDownload.js'
