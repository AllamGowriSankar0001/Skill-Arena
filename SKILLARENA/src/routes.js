export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  learn: '/courses',
  practice: '/practice',
  getPracticePath: (assessmentId) => `/practice/${assessmentId}`,
  battles: '/battles',
  getBattlePath: (battleId) => `/battles/${battleId}`,
  leaderboard: '/leaderboard',
  profile: '/profile',
  resume: '/resume',
  admin: '/admin',
  adminLogin: '/admin/login',
  adminCourses: '/admin/courses',
  adminPractice: '/admin/practice',
  adminBlog: '/admin/blog',
  adminResume: '/admin/resume',
  adminResumes: '/admin/resumes',
  adminUsers: '/admin/users',
  adminCommunity: '/admin/community',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  terms: '/terms',
  privacy: '/privacy',
  cookies: '/cookies',
  helpCenter: '/help-center',
  community: '/community',
  about: '/about',
  careers: '/careers',
  press: '/press',
  contact: '/contact',
  blog: '/blog',
  courses: '/courses',
  pricing: '/pricing',
  roadmap: '/roadmap',
  faq: '/faq',
  guides: '/guides',
  security: '/security',
  developers: '/developers',
  partners: '/partners',
  tournaments: '/tournaments',
  safety: '/safety',
}

export const getHomeRouteForUser = (user) =>
  user?.role === 'ADMIN' ? ROUTES.admin : ROUTES.dashboard

export const LANDING_SECTIONS = {
  features: 'features',
  battles: 'battles',
  learn: 'learn',
  community: 'community',
}

export const FOOTER_LINKS = {
  Product: [
    { label: 'Features', to: `${ROUTES.home}#features` },
    { label: 'Battles', to: ROUTES.battles },
    { label: 'Courses', to: ROUTES.courses },
    { label: 'Tournaments', to: ROUTES.tournaments },
    { label: 'Leaderboard', to: ROUTES.leaderboard },
    { label: 'Pricing', to: ROUTES.pricing },
    { label: 'Roadmap', to: ROUTES.roadmap },
  ],
  Company: [
    { label: 'About', to: ROUTES.about },
    { label: 'Careers', to: ROUTES.careers },
    { label: 'Press', to: ROUTES.press },
    { label: 'Partners', to: ROUTES.partners },
    { label: 'Contact', to: ROUTES.contact },
    { label: 'Blog', to: ROUTES.blog },
  ],
  Resources: [
    { label: 'Help center', to: ROUTES.helpCenter },
    { label: 'Community', to: ROUTES.community },
    { label: 'Guides', to: ROUTES.guides },
    { label: 'FAQ', to: ROUTES.faq },
    { label: 'Security', to: ROUTES.security },
    { label: 'Our team', to: ROUTES.developers },
  ],
  Legal: [
    { label: 'Terms', to: ROUTES.terms },
    { label: 'Privacy', to: ROUTES.privacy },
    { label: 'Cookies', to: ROUTES.cookies },
    { label: 'Safety', to: ROUTES.safety },
  ],
}

export const CONTENT_PAGES = [
  {
    path: ROUTES.terms,
    contentKey: 'terms',
    eyebrow: 'Legal',
    title: 'Terms of Service',
    description:
      'The legal agreement governing your use of Skill Arena — accounts, battles, community conduct, intellectual property, and dispute resolution.',
  },
  {
    path: ROUTES.privacy,
    contentKey: 'privacy',
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    description:
      'How Skill Arena collects, uses, stores, and protects personal data — including your rights under GDPR, CCPA, and other privacy laws.',
  },
  {
    path: ROUTES.cookies,
    contentKey: 'cookies',
    eyebrow: 'Legal',
    title: 'Cookie Policy',
    description:
      'Full disclosure on cookies, local storage, analytics, consent requirements, and how to control tracking on Skill Arena.',
  },
  {
    path: ROUTES.safety,
    contentKey: 'safety',
    eyebrow: 'Legal',
    title: 'Safety Center',
    description:
      'Community standards, anti-cheat enforcement, reporting and appeals, child safety, and crisis resources for the Skill Arena community.',
  },
  {
    path: ROUTES.helpCenter,
    contentKey: 'helpCenter',
    eyebrow: 'Resources',
    title: 'Help Center',
    description:
      'Find answers, troubleshooting guides, and support resources for getting the most out of Skill Arena.',
  },
  {
    path: ROUTES.community,
    contentKey: 'community',
    eyebrow: 'Resources',
    title: 'Community',
    description:
      'Join discussions, meet other learners, share replays, and stay connected with the Skill Arena community.',
  },
  {
    path: ROUTES.guides,
    contentKey: 'guides',
    eyebrow: 'Resources',
    title: 'Guides',
    description:
      'Step-by-step guides for learning faster, winning battles, and getting the most from Skill Arena.',
  },
  {
    path: ROUTES.faq,
    contentKey: 'faq',
    eyebrow: 'Resources',
    title: 'FAQ',
    description:
      'Quick answers to the most common questions about accounts, battles, courses, and community features.',
  },
  {
    path: ROUTES.security,
    contentKey: 'security',
    eyebrow: 'Resources',
    title: 'Security',
    description:
      'How Skill Arena protects your account, data, and competitive integrity across the platform.',
  },
  {
    path: ROUTES.developers,
    contentKey: 'developers',
    eyebrow: 'Company',
    title: 'Our team',
    description:
      'Meet the people behind Skill Arena — the developers and testers who build, ship, and quality-check every release.',
  },
  {
    path: ROUTES.about,
    contentKey: 'about',
    eyebrow: 'Company',
    title: 'About Skill Arena',
    description:
      'Skill Arena is the free LMS where curiosity meets competition. We help learners sharpen real skills and prove them in live matches.',
  },
  {
    path: ROUTES.careers,
    contentKey: 'careers',
    eyebrow: 'Company',
    title: 'Careers',
    description:
      'Help us build the arena. Explore open roles across product, engineering, design, and community.',
  },
  {
    path: ROUTES.press,
    contentKey: 'press',
    eyebrow: 'Company',
    title: 'Press',
    description:
      'Media resources, brand assets, and the latest announcements from Skill Arena.',
  },
  {
    path: ROUTES.partners,
    contentKey: 'partners',
    eyebrow: 'Company',
    title: 'Partners',
    description:
      'Partner with Skill Arena for education programs, creator collaborations, and community initiatives.',
  },
  {
    path: ROUTES.contact,
    contentKey: 'contact',
    eyebrow: 'Company',
    title: 'Contact',
    description:
      'Reach the Skill Arena team for support, partnerships, and general inquiries.',
  },
  {
    path: ROUTES.blog,
    contentKey: 'blog',
    eyebrow: 'Company',
    title: 'Blog',
    description:
      'Product updates, learning tips, community highlights, and stories from inside the arena.',
  },
  {
    path: ROUTES.battles,
    contentKey: 'battles',
    eyebrow: 'Product',
    title: 'Battles',
    description:
      'Queue up for fast 1v1 duels or rally a squad for 3v3 showdowns. Every match adapts to your level.',
  },
  {
    path: ROUTES.courses,
    contentKey: 'courses',
    eyebrow: 'Product',
    title: 'Courses',
    description:
      'Browse 500+ free courses across coding, design, languages, math, business, and more.',
  },
  {
    path: ROUTES.tournaments,
    contentKey: 'tournaments',
    eyebrow: 'Product',
    title: 'Tournaments',
    description:
      'Join seasonal brackets, squad showdowns, and community-run events with custom rules and prizes.',
  },
  {
    path: ROUTES.leaderboard,
    contentKey: 'leaderboard',
    eyebrow: 'Product',
    title: 'Leaderboard',
    description:
      'Climb seasonal ranks, earn badges, and showcase your arena profile on the global ladder.',
  },
  {
    path: ROUTES.pricing,
    contentKey: 'pricing',
    eyebrow: 'Product',
    title: 'Pricing',
    description:
      'Skill Arena is free forever. No credit card. No paywalls. Just learning that feels like winning.',
  },
  {
    path: ROUTES.roadmap,
    contentKey: 'roadmap',
    eyebrow: 'Product',
    title: 'Roadmap',
    description:
      'See what we are building next across battles, courses, community tools, and platform improvements.',
  },
]
