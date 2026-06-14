from typing import Any

SKILL_CATEGORY_LABELS = {
    'programming': 'Programming Languages',
    'web': 'Web Technologies',
    'frameworks': 'Frameworks & Libraries',
    'databases': 'Databases & Data',
    'cloud': 'Cloud & DevOps',
    'tools': 'Tools & Platforms',
    'soft': 'Soft Skills',
}

SKILL_CATEGORY_ORDER = [
    'programming',
    'web',
    'frameworks',
    'databases',
    'cloud',
    'tools',
    'soft',
]

SKILL_CATEGORY_ALIASES: dict[str, list[str]] = {
    'programming': [
        'python', 'c++', 'cpp', 'c#', 'csharp', 'java', 'typescript', 'ts', 'go', 'golang',
        'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'dart',
        'objectivec', 'objective-c', 'lua', 'haskell', 'elixir', 'clojure', 'fortran',
        'cobol', 'assembly', 'bash', 'shell', 'powershell',
    ],
    'web': [
        'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'javascript', 'js', 'jsx',
        'responsive design', 'rest', 'restapi', 'restful', 'graphql', 'http', 'https',
        'websocket', 'websockets', 'seo', 'accessibility', 'wcag', 'tailwind', 'tailwindcss',
        'bootstrap', 'materialui', 'material ui', 'styledcomponents', 'styled components',
    ],
    'frameworks': [
        'react', 'reactjs', 'react native', 'reactnative', 'angular', 'vue', 'vuejs', 'nextjs',
        'next.js', 'nuxt', 'svelte', 'django', 'flask', 'fastapi', 'spring', 'springboot',
        'spring boot', 'express', 'expressjs', 'nodejs', 'node.js', 'node', 'nestjs', 'laravel',
        'rails', 'ruby on rails', 'dotnet', '.net', 'asp.net', 'tensorflow', 'pytorch', 'keras',
        'scikit-learn', 'sklearn', 'pandas', 'numpy', 'redux', 'jquery', 'vite', 'webpack', 'babel',
    ],
    'databases': [
        'sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mongodb', 'mongo', 'redis',
        'dynamodb', 'firebase', 'firestore', 'oracle', 'mssql', 'sql server', 'mariadb',
        'cassandra', 'elasticsearch', 'neo4j', 'supabase', 'prisma', 'nosql', 'database',
        'databases', 'data modeling', 'etl',
    ],
    'cloud': [
        'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'google cloud platform',
        'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'github actions',
        'gitlab ci', 'circleci', 'ci/cd', 'cicd', 'devops', 'serverless', 'lambda',
        'cloudformation', 'helm', 'nginx', 'apache', 'microservices', 'linux', 'unix',
    ],
    'tools': [
        'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'postman', 'swagger',
        'openapi', 'figma', 'vscode', 'visual studio code', 'intellij', 'eclipse', 'npm', 'yarn',
        'pnpm', 'maven', 'gradle', 'slack', 'trello', 'notion', 'excel', 'power bi', 'tableau',
        'junit', 'pytest', 'selenium', 'cypress', 'jest', 'mocha', 'agile', 'scrum', 'kanban',
    ],
    'soft': [
        'communication', 'leadership', 'teamwork', 'collaboration', 'problem solving',
        'critical thinking', 'time management', 'adaptability', 'creativity', 'mentoring',
        'presentation', 'public speaking', 'project management', 'stakeholder management',
        'analytical thinking',
    ],
}

def _compact_skill_key(value: str) -> str:
    return ''.join(ch for ch in value.lower() if ch.isalnum() or ch in '+#')


_alias_lookup: dict[str, str] = {}
for category, aliases in SKILL_CATEGORY_ALIASES.items():
    for alias in aliases:
        _alias_lookup[_compact_skill_key(alias)] = category


def _resolve_category(name: str) -> str:
    compact = _compact_skill_key(name)
    if not compact:
        return 'tools'

    if compact in _alias_lookup:
        return _alias_lookup[compact]

    for alias, category in _alias_lookup.items():
        if len(alias) >= 3 and (alias in compact or compact in alias):
            return category

    lower = name.lower()
    if any(token in lower for token in ('sql', 'database', 'mongo', 'postgres', 'mysql', 'redis', 'nosql')):
        return 'databases'
    if any(token in lower for token in ('aws', 'azure', 'gcp', 'docker', 'kubernetes', 'devops', 'terraform', 'cloud')):
        return 'cloud'
    if any(token in lower for token in ('react', 'angular', 'vue', 'django', 'flask', 'spring', 'express', 'next')):
        return 'frameworks'
    if any(token in lower for token in ('html', 'css', 'javascript', 'frontend', 'front-end', 'web')):
        return 'web'
    if any(token in lower for token in ('python', 'java', 'c++', 'typescript', 'golang', 'rust', 'kotlin')):
        return 'programming'
    if any(token in lower for token in ('git', 'jira', 'figma', 'postman', 'agile', 'scrum')):
        return 'tools'
    if any(token in lower for token in ('leadership', 'communication', 'teamwork', 'collaboration', 'management')):
        return 'soft'

    return 'tools'


def group_skills_by_category(skills: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets: dict[str, list[dict[str, Any]]] = {}

    for skill in skills:
        name = str(skill.get('name', '')).strip()
        if not name:
            continue
        category = _resolve_category(name)
        buckets.setdefault(category, []).append({
            'name': name,
            'matched': skill.get('matched', True) is not False,
        })

    return [
        {
            'category': SKILL_CATEGORY_LABELS[category],
            'skills': buckets[category],
        }
        for category in SKILL_CATEGORY_ORDER
        if category in buckets
    ]
