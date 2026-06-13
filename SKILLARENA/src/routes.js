export const ROUTES = {
  home: '/',
  login: '/login',
  signup: '/signup',
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
  battles: '/battles',
  courses: '/courses',
  leaderboard: '/leaderboard',
  pricing: '/pricing',
  roadmap: '/roadmap',
}

export const LANDING_SECTIONS = {
  features: 'features',
  battles: 'battles',
  learn: 'learn',
  community: 'community',
}

export const FOOTER_LINKS = {
  Product: [
    { label: 'Battles', to: ROUTES.battles },
    { label: 'Courses', to: ROUTES.courses },
    { label: 'Leaderboard', to: ROUTES.leaderboard },
    { label: 'Pricing', to: ROUTES.pricing },
    { label: 'Roadmap', to: ROUTES.roadmap },
  ],
  Company: [
    { label: 'About', to: ROUTES.about },
    { label: 'Careers', to: ROUTES.careers },
    { label: 'Press', to: ROUTES.press },
    { label: 'Contact', to: ROUTES.contact },
    { label: 'Blog', to: ROUTES.blog },
  ],
  Resources: [
    { label: 'Help center', to: ROUTES.helpCenter },
    { label: 'Community', to: ROUTES.community },
  ],
  Legal: [
    { label: 'Terms', to: ROUTES.terms },
    { label: 'Privacy', to: ROUTES.privacy },
    { label: 'Cookies', to: ROUTES.cookies },
  ],
}

export const CONTENT_PAGES = [
  {
    path: ROUTES.terms,
    contentKey: 'terms',
    eyebrow: 'Legal',
    title: 'Terms of Service',
    description:
      'These terms outline how Skill Arena works, what you can expect from the platform, and the responsibilities that come with learning and competing here.',
  },
  {
    path: ROUTES.privacy,
    contentKey: 'privacy',
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    description:
      'Learn how Skill Arena collects, uses, and protects your data while you learn, battle, and connect with the community.',
  },
  {
    path: ROUTES.cookies,
    contentKey: 'cookies',
    eyebrow: 'Legal',
    title: 'Cookie Policy',
    description:
      'Understand how cookies and similar technologies help Skill Arena remember preferences and improve your experience.',
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
