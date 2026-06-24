import { LEGAL_SECTIONS } from './legalContent'

export const PAGE_SECTIONS = {
  ...LEGAL_SECTIONS,

  helpCenter: [
    {
      heading: 'Getting started',
      list: [
        'Create a free account from the Sign Up button in the navbar.',
        'Complete your profile and choose a learning path that matches your goals.',
        'Take a short placement activity so battles and recommendations match your level.',
        'Join your first 1v1 duel or explore courses to start earning XP.',
      ],
    },
    {
      heading: 'Battles and matchmaking',
      paragraphs: [
        'Skill Arena adapts match difficulty based on your recent performance and topic familiarity. If a match feels too easy or too hard, play a few more rounds so the system can recalibrate.',
      ],
      list: [
        '1v1 duels are best for focused head-to-head practice.',
        '3v3 squad battles let you coordinate with friends and share roles.',
        'Replays are saved to your profile so you can review mistakes and share highlights.',
      ],
    },
    {
      heading: 'Courses and progress',
      paragraphs: [
        'Courses are organized into bite-sized lessons with projects and instant feedback. Your XP, unlocked paths, and skill graph update as you complete activities.',
      ],
      list: [
        'Resume any lesson from your dashboard.',
        'Track weekly progress in your skill graph.',
        'Earn badges for milestones in learning and competition.',
      ],
    },
    {
      heading: 'Account and safety',
      list: [
        'Reset your password from the login page.',
        'Report abusive chat or suspicious behavior directly from a match or profile.',
        'Enable fair-play notifications to stay informed about moderation actions.',
      ],
      note: 'Need more help? Email support@skillarena.com',
    },
  ],

  community: [
    {
      heading: 'Better together, louder in chat',
      paragraphs: [
        'Skill Arena is more than solo study. The community is where learners team up, review replays, share strategies, and turn practice into rivalry.',
      ],
    },
    {
      heading: 'What you can do',
      list: [
        'Add friends and build squads for private tournaments.',
        'Chat live during matches or hang out in study lounges.',
        'Share replays, celebrate wins, and learn from close losses.',
        'Join topic-based rooms for coding, languages, design, math, and more.',
        'Participate in seasonal community events and challenge weeks.',
      ],
    },
    {
      heading: 'Community guidelines',
      paragraphs: [
        'We want Skill Arena to feel competitive but welcoming. Be direct, be curious, and respect the person on the other side of the match.',
      ],
      list: [
        'No harassment, hate speech, or targeted abuse.',
        'No spam, scams, or misleading promotion.',
        'Compete hard, but keep conversations constructive.',
      ],
      note: 'Report issues to community@skillarena.com',
    },
  ],

  about: [
    {
      heading: 'Why Skill Arena exists',
      paragraphs: [
        'Learning is better when there is something on the line. Skill Arena turns lessons into matches and friends into rivals, so progress feels real and motivation stays high.',
        'We built Skill Arena as a free LMS for curious minds who want more than passive video lectures. You learn, you practice, you prove it in the arena.',
      ],
    },
    {
      heading: 'What makes us different',
      list: [
        '500+ free courses across coding, design, languages, math, business, and more.',
        'Real-time 1v1 and 3v3 battles tied to what you are learning.',
        'Live chat, squads, and replays that make study social.',
        'Global leaderboards, badges, and seasonal ranks.',
        'Fair play systems including anti-cheat and smart matchmaking.',
      ],
    },
    {
      heading: 'Our promise',
      paragraphs: [
        'Skill Arena is free forever. No credit card. No paywalls. We believe access to high-quality learning and honest competition should not depend on how much you can pay.',
      ],
    },
  ],

  careers: [
    {
      heading: 'Build the arena with us',
      paragraphs: [
        'We are a small team obsessed with learning, competition, and community. If you want to help millions of learners battle their way to mastery, we would love to hear from you.',
      ],
    },
    {
      heading: 'Open roles',
      list: [
        'Senior Frontend Engineer — React, real-time UI, design systems.',
        'Backend Engineer — matchmaking, leaderboards, platform scalability.',
        'Product Designer — learner experience, battle flows, mobile responsiveness.',
        'Community Manager — moderation, events, creator partnerships.',
        'Learning Content Lead — curriculum strategy across technical and creative tracks.',
      ],
    },
    {
      heading: 'How we work',
      list: [
        'Remote-friendly with async collaboration.',
        'Mission-driven, user-first decision making.',
        'Fast iteration with high craft standards.',
        'Competitive spirit welcome — many of us battle after standup.',
      ],
      note: 'Apply at careers@skillarena.com with your portfolio or GitHub.',
    },
  ],

  press: [
    {
      heading: 'Media inquiries',
      paragraphs: [
        'For interviews, product briefings, and partnership announcements, contact the Skill Arena press team at press@skillarena.com.',
      ],
    },
    {
      heading: 'About Skill Arena',
      paragraphs: [
        'Skill Arena is the free LMS where curiosity meets competition. The platform combines 500+ courses with live 1v1 and 3v3 skill battles, community chat, and global leaderboards.',
      ],
    },
    {
      heading: 'Press assets',
      list: [
        'Official logo and brand marks',
        'Product screenshots and battle UI captures',
        'Founder bios and company fact sheet',
        'Platform metrics and milestone announcements',
      ],
      note: 'Request assets at press@skillarena.com',
    },
  ],

  contact: [
    {
      heading: 'Get in touch',
      paragraphs: [
        'Whether you need help with your account, want to partner with Skill Arena, or have feedback that could make the platform better, our team is listening.',
      ],
    },
    {
      heading: 'Contact channels',
      list: [
        'General support: support@skillarena.com',
        'Community and safety: community@skillarena.com',
        'Partnerships: partnerships@skillarena.com',
        'Press: press@skillarena.com',
        'Careers: careers@skillarena.com',
      ],
    },
    {
      heading: 'Response times',
      paragraphs: [
        'Support requests are typically answered within 1–2 business days. Urgent safety reports are prioritized immediately.',
      ],
    },
  ],

  blog: [
    {
      heading: 'Inside the arena',
      paragraphs: [
        'Stories, product updates, and learning strategies from the Skill Arena team and community.',
      ],
    },
    {
      heading: 'Recent highlights',
      list: [
        'How 1v1 battles improve retention in technical courses',
        'Introducing seasonal ranks and the new badge system',
        'Community spotlight: squads that turned study groups into rivalries',
        'Roadmap recap: what shipped this quarter and what is next',
        'Five habits of learners who climb the leaderboard fast',
      ],
    },
    {
      heading: 'Contributors welcome',
      paragraphs: [
        'We feature learners, creators, and educators building in public. Share your Skill Arena journey with community@skillarena.com.',
      ],
    },
  ],

  battles: [
    {
      heading: 'Real matches. Real skills.',
      paragraphs: [
        'Queue up for fast 1v1 duels or rally a squad for 3v3 showdowns. Every match adapts to your level, so it always feels fair and always feels alive.',
      ],
    },
    {
      heading: 'Battle modes',
      list: [
        '1v1 Duels — head-to-head knowledge battles with instant results.',
        '3v3 Squads — coordinate with friends and split roles by strength.',
        'Private tournaments — custom rules for classrooms, clubs, and friend groups.',
        'Ranked seasons — climb tiers and earn placement on the global ladder.',
      ],
    },
    {
      heading: 'How matchmaking works',
      paragraphs: [
        'Skill Arena looks at your recent performance, topic history, and course progress to pair you with opponents near your skill level. The more you play, the sharper the matchmaking becomes.',
      ],
      list: [
        'Anti-cheat monitoring during live matches.',
        'Replay review for disputed outcomes.',
        'Fair-play penalties for abuse or exploitation.',
      ],
    },
  ],

  courses: [
    {
      heading: 'A library that grows with you',
      paragraphs: [
        'Bite-sized lessons, hands-on projects, and instant feedback. Track your XP, unlock paths, and watch your skill graph fill in week after week.',
      ],
    },
    {
      heading: 'What you can learn',
      list: [
        'Programming and web development',
        'UI/UX and digital design',
        'Languages and communication',
        'Mathematics and logic',
        'Business, productivity, and career skills',
        'Creative tools and media production',
      ],
    },
    {
      heading: 'How courses connect to battles',
      paragraphs: [
        'Lessons prepare you for arena topics. When you finish a module, related battle categories unlock so you can immediately test what you learned against real opponents.',
      ],
      note: '500+ courses and counting — all free.',
    },
  ],

  leaderboard: [
    {
      heading: 'Climb the ladder',
      paragraphs: [
        'Skill Arena ranks are earned, not bought. Win battles, complete course milestones, and stay active through seasonal challenges to rise on the global leaderboard.',
      ],
    },
    {
      heading: 'Ranking features',
      list: [
        'Global and regional leaderboards',
        'Seasonal resets with legacy badges for top performers',
        'Topic-specific ranks for coding, design, languages, and more',
        'Public arena profiles showcasing wins, replays, and badges',
        'Squad standings for 3v3 teams',
      ],
    },
    {
      heading: 'Badges and milestones',
      paragraphs: [
        'Earn badges for streaks, upset victories, course completions, and community contributions. Your profile tells the story of how you learned and how you compete.',
      ],
    },
  ],

  pricing: [
    {
      heading: 'Free forever',
      paragraphs: [
        'Skill Arena is free. No credit card. No paywalls. Just learning that feels like winning.',
      ],
    },
    {
      heading: 'Included at no cost',
      list: [
        'Full access to 500+ courses and learning paths',
        'Unlimited 1v1 and 3v3 battles',
        'Live chat, squads, and community features',
        'Leaderboards, badges, and seasonal ranks',
        'Replay storage and skill graph tracking',
        'Fair play protection and matchmaking',
      ],
    },
    {
      heading: 'Our philosophy',
      paragraphs: [
        'We believe competition and quality education should be accessible to everyone. Skill Arena is supported by a mission to grow the arena, not gate the learning behind premium tiers.',
      ],
      note: 'Create your free account today — no payment required.',
    },
  ],

  roadmap: [
    {
      heading: 'Where we are headed',
      paragraphs: [
        'Skill Arena is evolving quickly. This roadmap highlights what we are building next across learning, battles, and community.',
      ],
    },
    {
      heading: 'Now shipping',
      list: [
        'Mobile-responsive arena experience',
        'Improved 3v3 squad matchmaking',
        'Expanded course catalog across business and creative tracks',
        'Replay sharing and profile highlights',
      ],
    },
    {
      heading: 'Next up',
      list: [
        'Custom classroom tournaments for educators',
        'Advanced skill graph insights and weekly coaching prompts',
        'New seasonal rank tiers and limited-event badges',
        'API access for community tools and integrations',
        'Localized courses and multi-language battle support',
      ],
    },
    {
      heading: 'Exploring',
      list: [
        'Spectator mode for live battles',
        'Creator-led challenge paths',
        'Cross-platform native apps',
      ],
      note: 'Have a feature request? Send it to support@skillarena.com',
    },
  ],

  faq: [
    {
      heading: 'Account and access',
      list: [
        'Is Skill Arena really free? Yes — all core courses, battles, and community features are free with no credit card required.',
        'What is the minimum age? You must be at least 13 years old to create an account.',
        'Can I use Skill Arena on mobile? Yes — the platform is optimized for phones and tablets.',
        'How do I reset my password? Use the forgot-password link on the login page.',
      ],
    },
    {
      heading: 'Battles and ranking',
      list: [
        'How does matchmaking work? Skill Arena pairs you with opponents near your skill level based on recent performance.',
        'What is the difference between 1v1 and 3v3? 1v1 is a solo duel; 3v3 lets you squad up with friends.',
        'Do ranks reset? Seasonal ranks reset on a schedule, but legacy badges remain on your profile.',
        'Can I report cheating? Yes — use the in-match report button or email support@skillarena.com.',
      ],
    },
    {
      heading: 'Courses and progress',
      list: [
        'How many courses are available? 500+ free courses across technical, creative, and professional tracks.',
        'Does course progress affect battles? Yes — completing modules unlocks related battle categories.',
        'Can I resume where I left off? Your dashboard saves lesson progress automatically.',
      ],
    },
    {
      heading: 'Still need help?',
      paragraphs: [
        'Browse the Help Center for detailed guides or email support@skillarena.com and we will get back to you within 1–2 business days.',
      ],
    },
  ],

  guides: [
    {
      heading: 'Start here',
      paragraphs: [
        'New to Skill Arena? These guides walk you from account setup to your first win on the leaderboard.',
      ],
      list: [
        'Create your profile and pick a learning path.',
        'Complete a placement activity to calibrate matchmaking.',
        'Finish your first lesson, then queue for a 1v1 duel.',
        'Review your replay and note one thing to improve next match.',
      ],
    },
    {
      heading: 'Win more battles',
      list: [
        'Study the topic category before queuing — course progress gives you an edge.',
        'In 3v3, assign roles so teammates cover weak spots.',
        'Use replays to spot patterns in wrong answers.',
        'Play consistently so matchmaking stays accurate.',
      ],
    },
    {
      heading: 'Climb the leaderboard',
      list: [
        'Mix course milestones with ranked battles for steady XP gains.',
        'Focus on one topic rank at a time instead of spreading too thin.',
        'Join seasonal events for bonus badge opportunities.',
        'Squad up — 3v3 wins count toward team standings too.',
      ],
    },
    {
      heading: 'For educators and squads',
      paragraphs: [
        'Run private tournaments with custom rules for classrooms, clubs, or friend groups. Contact partnerships@skillarena.com for setup help.',
      ],
    },
  ],

  security: [
    {
      heading: 'Platform security',
      paragraphs: [
        'Skill Arena uses industry-standard encryption, secure authentication, and continuous monitoring to protect accounts and competitive integrity.',
      ],
    },
    {
      heading: 'Account protection',
      list: [
        'Use a strong, unique password for your Skill Arena account.',
        'Sign out on shared devices after each session.',
        'Report suspicious login activity to support@skillarena.com immediately.',
        'Never share your password or one-time codes with anyone claiming to be staff.',
      ],
    },
    {
      heading: 'Fair play and anti-cheat',
      list: [
        'Live match monitoring for abnormal behavior and exploit attempts.',
        'Replay review for disputed outcomes and reported matches.',
        'Automated and human moderation for repeat offenders.',
        'Rank adjustments and account actions for confirmed cheating.',
      ],
    },
    {
      heading: 'Data handling',
      paragraphs: [
        'We do not sell personal data. See our Privacy Policy for full details on collection, retention, and your rights.',
      ],
      note: 'Security reports: security@skillarena.com',
    },
  ],

  partners: [
    {
      heading: 'Partner with Skill Arena',
      paragraphs: [
        'We collaborate with educators, creators, organizations, and brands that share our mission: make learning competitive, social, and free.',
      ],
    },
    {
      heading: 'Partnership types',
      list: [
        'Education — schools, bootcamps, and nonprofits running arena tournaments.',
        'Creators — streamers and educators building challenge paths for their audience.',
        'Community — clubs and meetups hosting seasonal brackets.',
        'Brand — mission-aligned sponsorships for events and content series.',
      ],
    },
    {
      heading: 'What partners get',
      list: [
        'Co-branded tournament pages and event tooling.',
        'Dedicated onboarding for squads and classrooms.',
        'Featured placement in community announcements.',
        'Early access to new platform features.',
      ],
      note: 'Reach out at partnerships@skillarena.com',
    },
  ],

  tournaments: [
    {
      heading: 'Compete beyond the ladder',
      paragraphs: [
        'Tournaments bring structure, stakes, and spectacle to Skill Arena. Join open brackets or create private events for your squad, class, or community.',
      ],
    },
    {
      heading: 'Tournament formats',
      list: [
        'Weekly open brackets — solo 1v1 elimination across rotating topics.',
        'Squad showdowns — 3v3 teams battle through group stages and finals.',
        'Seasonal championships — top-ranked players qualify for prize-badge events.',
        'Private events — custom rules, invite-only entry, and moderator tools.',
      ],
    },
    {
      heading: 'How to join',
      list: [
        'Check the arena dashboard for upcoming open registrations.',
        'Form a squad of three for team events.',
        'Review tournament rules and topic categories before registering.',
        'Show up on time — late arrivals may forfeit the first round.',
      ],
    },
    {
      heading: 'Host your own',
      paragraphs: [
        'Educators, creators, and community leaders can request private tournament setup through partnerships@skillarena.com.',
      ],
    },
  ],

}
