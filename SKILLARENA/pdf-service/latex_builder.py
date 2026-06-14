import re
from typing import Any

from skill_categories import group_skills_by_category

LATEX_SPECIAL = re.compile(r'([\\{}$&#_%^~])')


def escape_latex(value: Any) -> str:
    text = str(value or '').strip()
    if not text:
        return ''
    text = (
        text.replace('\u2022', '-')
        .replace('\u2013', '-')
        .replace('\u2014', '-')
        .replace('\u2018', "'")
        .replace('\u2019', "'")
        .replace('\u201c', '"')
        .replace('\u201d', '"')
        .replace('\u00a0', ' ')
        .replace('&', 'and')
    )
    return LATEX_SPECIAL.sub(r'\\\1', text)


def format_contact_line(contact: dict | None) -> str:
    contact = contact or {}
    parts = [
        contact.get('email', ''),
        contact.get('phone', ''),
        contact.get('location', ''),
        contact.get('linkedin', ''),
    ]
    line_parts = [escape_latex(part) for part in parts if str(part or '').strip()]
    for field in contact.get('customFields') or []:
        label = str(field.get('label', '')).strip()
        value = str(field.get('value', '')).strip()
        if label and value:
            line_parts.append(escape_latex(f'{label}: {value}'))
    return r' \textbar{} '.join(line_parts)


def format_degree(edu: dict) -> str:
    degree = escape_latex(edu.get('degree', ''))
    short_name = str(edu.get('shortName', '')).strip()
    if short_name:
        return f'{degree} ({escape_latex(short_name)})'
    return degree


def build_skill_category_lines(groups: list[dict]) -> str:
    if not groups:
        return ''

    lines: list[str] = []
    for group in groups:
        category = escape_latex(group.get('category', ''))
        if not category:
            continue

        skill_names: list[str] = []
        for skill in group.get('skills') or []:
            name = escape_latex(skill.get('name', ''))
            if not name:
                continue
            skill_names.append(name)

        if not skill_names:
            continue

        lines.append(
            rf'\textbf{{\textcolor{{ink}}{{{category}:}}}} {", ".join(skill_names)}\par\vspace{{2pt}}'
        )

    return '\n'.join(lines)


def build_skill_categories(skills: list[dict]) -> str:
    if not skills:
        return ''

    return build_skill_category_lines(group_skills_by_category(skills))


def build_skill_tags(skills: list[dict]) -> str:
    if not skills:
        return ''
    tags: list[str] = []
    for skill in skills:
        name = escape_latex(skill.get('name', ''))
        if not name:
            continue
        tags.append(rf'\skillpill{{{name}}}')
    if not tags:
        return ''
    return ' '.join(tags)


def build_bullets(items: list[str]) -> str:
    lines = [escape_latex(item) for item in items if str(item or '').strip()]
    if not lines:
        return ''
    body = '\n'.join(rf'\item {line}' for line in lines)
    return rf'\begin{{itemize}}[leftmargin=*, itemsep=2pt, topsep=2pt]' + '\n' + body + '\n' + r'\end{itemize}'


def build_section(title: str, body: str) -> str:
    if not body.strip():
        return ''
    return (
        rf'\atssection{{{escape_latex(title)}}}'
        f'\n{body}\\par\n'
        r'\vspace{4pt}'
    )


def build_experience_block(item: dict) -> str:
    role = escape_latex(item.get('role', ''))
    company = escape_latex(item.get('company', ''))
    period = escape_latex(item.get('period', ''))
    bullets = build_bullets(item.get('bullets') or [])
    company_block = rf'\textcolor{{muted}}{{{company}}}\par' if company else ''
    return (
        rf'\experienceentry{{{role}}}{{{period}}}'
        f'\n{company_block}'
        f'\n{bullets}\n'
        r'\vspace{8pt}'
    )


def build_project_block(item: dict) -> str:
    name = escape_latex(item.get('name', ''))
    bullets = build_bullets(item.get('bullets') or [])
    raw_skills = item.get('skills') or []
    if isinstance(raw_skills, str):
        skills = [part.strip() for part in raw_skills.split(',') if part.strip()]
    else:
        skills = [str(skill).strip() for skill in raw_skills if str(skill).strip()]
    skills_block = ''
    if skills:
        skills_text = escape_latex(', '.join(skills))
        skills_block = rf'\textcolor{{muted}}{{{skills_text}}}\par' + '\n'
    return (
        rf'\textbf{{\large\textcolor{{ink}}{{{name}}}}}\par'
        f'\n{skills_block}'
        f'{bullets}\n'
        r'\vspace{8pt}'
    )


def build_education_block(edu: dict) -> str:
    degree = format_degree(edu)
    institution = escape_latex(edu.get('institution', ''))
    period = escape_latex(edu.get('period', ''))
    grade = escape_latex(edu.get('grade', ''))
    sub_left = institution
    sub_right = grade
    sub_line = ''
    if sub_left or sub_right:
        sub_line = (
            rf'\educationsubrow{{{sub_left}}}{{{sub_right}}}'
        )
    return (
        rf'\educationentry{{{degree}}}{{{period}}}'
        f'\n{sub_line}\n'
        r'\vspace{8pt}'
    )


def build_resume_latex(ats: dict) -> str:
    name = escape_latex(ats.get('name', '')).upper()
    role = escape_latex(ats.get('role', ''))
    contact = format_contact_line(ats.get('contact'))
    summary = escape_latex(ats.get('summary', ''))

    sections: list[str] = []

    if summary:
        sections.append(build_section('Professional Summary', summary))

    skill_groups = ats.get('skillGroups') or []
    skills = ats.get('skills') or []
    if skill_groups or skills:
        skill_body = (
            build_skill_category_lines(skill_groups)
            if skill_groups
            else build_skill_categories(skills)
        )
        sections.append(build_section('Skills', skill_body))

    experiences = ats.get('experiences') or []
    if experiences:
        body = '\n'.join(build_experience_block(item) for item in experiences)
        sections.append(build_section('Work Experience', body))

    projects = ats.get('projects') or []
    if projects:
        body = '\n'.join(build_project_block(item) for item in projects)
        sections.append(build_section('Projects', body))

    educations = ats.get('educations') or []
    if educations:
        body = '\n'.join(build_education_block(edu) for edu in educations)
        sections.append(build_section('Education', body))

    sections_block = '\n'.join(section for section in sections if section)

    return rf"""
\documentclass[11pt,letterpaper]{{article}}
\usepackage{{iftex}}
\ifPDFTeX
  \usepackage[T1]{{fontenc}}
  \usepackage{{mathptmx}}
\else
  \usepackage{{fontspec}}
  \defaultfontfeatures{{Ligatures=TeX}}
  \IfFontExistsTF{{Times New Roman}}{{
    \setmainfont{{Times New Roman}}
  }}{{
    \setmainfont{{TeX Gyre Termes}}
  }}
\fi
\usepackage[margin=0.75in]{{geometry}}
\usepackage{{xcolor}}
\usepackage{{enumitem}}
\usepackage{{tabularx}}

\definecolor{{ink}}{{HTML}}{{1A110A}}
\definecolor{{muted}}{{HTML}}{{5C4F45}}
\definecolor{{accent}}{{HTML}}{{C45C26}}
\definecolor{{mismatch}}{{HTML}}{{B42318}}
\definecolor{{skillbg}}{{HTML}}{{F3E4D8}}
\definecolor{{mismatchbg}}{{HTML}}{{FBEAEA}}

\pagestyle{{empty}}
\setlength{{\parindent}}{{0pt}}
\setlength{{\parskip}}{{0pt}}
\setlength{{\fboxsep}}{{4pt}}
\linespread{{1.08}}

\newcommand{{\atssection}}[1]{{
  \vspace{{10pt}}
  \noindent\textcolor{{ink!15}}{{\rule{{\textwidth}}{{0.4pt}}}}
  \par
  \vspace{{6pt}}
  \noindent{{\small\bfseries\MakeUppercase{{#1}}}}
  \par
  \vspace{{6pt}}
}}

\newcommand{{\skillpill}}[1]{{
  \colorbox{{skillbg}}{{\footnotesize\bfseries\textcolor{{accent}}{{#1}}}}\hspace{{4pt}}
}}

\newcommand{{\skillpillmismatch}}[1]{{
  \colorbox{{mismatchbg}}{{\footnotesize\bfseries\textcolor{{mismatch}}{{#1}}}}\hspace{{4pt}}
}}

\newcommand{{\experienceentry}}[2]{{
  \begin{{tabularx}}{{\textwidth}}{{@{{}}X r@{{}}}}
    \textbf{{\textcolor{{ink}}{{#1}}}} & \textcolor{{muted}}{{\footnotesize #2}} \\
  \end{{tabularx}}
}}

\newcommand{{\educationentry}}[2]{{
  \begin{{tabularx}}{{\textwidth}}{{@{{}}X r@{{}}}}
    \textbf{{\textcolor{{ink}}{{#1}}}} & \textcolor{{muted}}{{\footnotesize #2}} \\
  \end{{tabularx}}
}}

\newcommand{{\educationsubrow}}[2]{{
  \vspace{{2pt}}
  \begin{{tabularx}}{{\textwidth}}{{@{{}}X r@{{}}}}
    \textcolor{{muted}}{{\small #1}} & \textcolor{{muted}}{{\small #2}} \\
  \end{{tabularx}}
}}

\begin{{document}}
{{\Huge\bfseries\textcolor{{ink}}{{{name}}}\par}}
\if\relax\detokenize{{{role}}}\relax\else{{\large\bfseries\textcolor{{ink}}{{{role}}}\par}}\fi
\if\relax\detokenize{{{contact}}}\relax\else{{\small\textcolor{{muted}}{{{contact}}}\par}}\fi
\vspace{{8pt}}
{sections_block}
\end{{document}}
"""
