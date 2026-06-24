/** Industry-standard legal copy for Skill Arena public pages. */

export const LEGAL_PAGE_KEYS = new Set(['terms', 'privacy', 'cookies', 'safety'])

export const LEGAL_SECTIONS = {
  terms: [
    {
      heading: '1. Agreement to these Terms',
      paragraphs: [
        'These Terms of Service ("Terms") constitute a legally binding agreement between you and Skill Arena ("Skill Arena," "we," "us," or "our") governing your access to and use of the Skill Arena website, applications, learning tools, battle systems, community features, and related services (collectively, the "Platform").',
        'By creating an account, accessing the Platform, or using any Skill Arena service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, Cookie Policy, and Community Safety standards, each incorporated herein by reference.',
        'If you do not agree to these Terms, you must not access or use the Platform.',
      ],
      note: 'Effective date: June 20, 2026 · Last updated: June 20, 2026',
    },
    {
      heading: '2. Eligibility and account registration',
      paragraphs: [
        'You may use the Platform only if you can form a binding contract with Skill Arena and are not barred from using the Platform under applicable law.',
      ],
      list: [
        'You must be at least 13 years of age to create an account. Users between 13 and 18 (or the age of majority in their jurisdiction) may use the Platform only with permission from a parent or legal guardian who accepts these Terms on their behalf.',
        'You agree to provide accurate, current, and complete registration information and to keep your account information updated.',
        'You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account.',
        'You may not create multiple accounts to manipulate rankings, evade enforcement actions, or gain an unfair competitive advantage.',
        'You may not transfer, sell, or share your account except where expressly permitted by Skill Arena.',
      ],
    },
    {
      heading: '3. Description of the Platform',
      paragraphs: [
        'Skill Arena is a free learning and competition platform that provides courses, practice assessments, skill battles (including quiz and coding formats), leaderboards, community channels, resume tools, and related educational features.',
        'We may add, modify, suspend, or discontinue any feature at any time. While we strive to keep core learning and battle features accessible without paywalls, we do not guarantee uninterrupted availability of any specific service.',
      ],
    },
    {
      heading: '4. License and acceptable use',
      paragraphs: [
        'Subject to your compliance with these Terms, Skill Arena grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for personal, non-commercial learning and competition purposes.',
      ],
      list: [
        'You may not copy, modify, distribute, sell, lease, or create derivative works from the Platform or its content except as expressly allowed.',
        'You may not reverse engineer, decompile, scrape, crawl, or attempt to extract source code, datasets, or proprietary matchmaking logic.',
        'You may not interfere with Platform security, overload infrastructure, or use automated tools to access the Platform without written permission.',
        'You may not use the Platform to transmit malware, spam, phishing content, or unlawful material.',
        'You may not impersonate another person, misrepresent affiliation with Skill Arena, or mislead other users.',
      ],
    },
    {
      heading: '5. User content and community conduct',
      paragraphs: [
        'You may submit or generate content on the Platform, including profile information, chat messages, community posts, battle responses, code submissions, and other materials ("User Content"). You retain ownership of your User Content, subject to the license you grant below.',
        'By submitting User Content, you grant Skill Arena a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, and distribute that content solely to operate, improve, and promote the Platform. This license ends when your content is deleted from our systems, except where retention is required by law or legitimate business needs (such as moderation records or dispute resolution).',
        'You represent that you have all rights necessary to submit User Content and that your content does not violate any law or third-party rights.',
      ],
      list: [
        'Harassment, hate speech, threats, sexual exploitation, or targeted abuse are prohibited.',
        'Cheating, exploiting bugs, using unauthorized assistance in battles, or manipulating rankings is prohibited.',
        'Sharing another person\'s private information without consent is prohibited.',
        'Posting content that infringes intellectual property, privacy, or publicity rights is prohibited.',
      ],
    },
    {
      heading: '6. Battles, rankings, and fair play',
      paragraphs: [
        'Skill Arena provides ranked and casual matchmaking, private friend battles, and team formats. Match outcomes may affect XP, leaderboard placement, badges, and public profile statistics.',
        'We use automated and human review systems to detect cheating, collusion, and abuse. We may adjust rankings, void results, restrict features, or suspend accounts when we reasonably believe fair play has been compromised.',
        'Battle results, AI-generated questions, and scoring systems are provided for educational and entertainment purposes. Skill Arena does not guarantee that every outcome will be error-free, and disputed results may be reviewed at our discretion.',
      ],
    },
    {
      heading: '7. Intellectual property',
      paragraphs: [
        'The Platform, including its software, design, branding, course materials, logos, and documentation (excluding User Content), is owned by Skill Arena or its licensors and is protected by intellectual property laws.',
        'You may not use Skill Arena trademarks, logos, or branding without prior written consent. Limited use for good-faith commentary or press coverage may be permitted where consistent with our brand guidelines.',
      ],
    },
    {
      heading: '8. Third-party services and links',
      paragraphs: [
        'The Platform may integrate third-party tools, libraries, or links to external websites. Skill Arena does not control and is not responsible for third-party services. Your use of third-party services is governed by their own terms and policies.',
      ],
    },
    {
      heading: '9. Disclaimers',
      paragraphs: [
        'THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.',
        'Skill Arena does not warrant that the Platform will be uninterrupted, secure, or error-free, that learning outcomes or career results will be achieved, or that battle rankings reflect real-world professional competence.',
        'Educational content is provided for general learning purposes and does not constitute professional, legal, financial, or medical advice.',
      ],
    },
    {
      heading: '10. Limitation of liability',
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, SKILL ARENA AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM.',
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, SKILL ARENA\'S TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM WILL NOT EXCEED THE GREATER OF (A) USD $100 OR (B) THE AMOUNT YOU PAID SKILL ARENA IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM.',
        'Some jurisdictions do not allow certain limitations of liability. In those jurisdictions, our liability is limited to the fullest extent permitted by law.',
      ],
    },
    {
      heading: '11. Indemnification',
      paragraphs: [
        'You agree to defend, indemnify, and hold harmless Skill Arena and its affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys\' fees) arising out of or related to your User Content, your use of the Platform, or your violation of these Terms or applicable law.',
      ],
    },
    {
      heading: '12. Suspension and termination',
      paragraphs: [
        'You may stop using the Platform at any time and may request account deletion through your profile settings or by contacting support.',
        'We may suspend or terminate your access immediately, with or without notice, if we reasonably believe you have violated these Terms, created risk for other users or Skill Arena, or where required by law.',
        'Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination will survive, including intellectual property, disclaimers, limitation of liability, indemnification, and dispute resolution.',
      ],
    },
    {
      heading: '13. Dispute resolution and governing law',
      paragraphs: [
        'These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law principles, except where mandatory consumer protection laws in your country of residence provide otherwise.',
        'Before filing a claim, you agree to contact legal@skillarena.com and attempt to resolve the dispute informally for at least thirty (30) days.',
        'Except where prohibited by law, disputes that cannot be resolved informally will be resolved through binding arbitration on an individual basis, and you waive any right to participate in a class action or class-wide arbitration. You may opt out of arbitration within thirty (30) days of account creation by emailing legal@skillarena.com with subject line "Arbitration Opt-Out."',
      ],
    },
    {
      heading: '14. Changes to these Terms',
      paragraphs: [
        'We may update these Terms from time to time. When we make material changes, we will post the updated Terms on this page and update the effective date. Continued use of the Platform after changes become effective constitutes acceptance of the revised Terms.',
        'If you do not agree to updated Terms, you must stop using the Platform and may request account deletion.',
      ],
      note: 'Legal inquiries: legal@skillarena.com',
    },
  ],

  privacy: [
    {
      heading: '1. Introduction',
      paragraphs: [
        'Skill Arena ("we," "us," or "our") respects your privacy and is committed to protecting personal information. This Privacy Policy explains how we collect, use, disclose, retain, and safeguard information when you use the Skill Arena platform, including our website, applications, courses, battles, community features, and support channels.',
        'This Policy applies to all users worldwide. Additional rights may apply depending on your location, as described in Section 12.',
      ],
      note: 'Effective date: June 20, 2026 · Last updated: June 20, 2026',
    },
    {
      heading: '2. Information we collect',
      paragraphs: [
        'We collect information you provide directly, information generated through your use of the Platform, and limited information from third parties where permitted.',
      ],
      list: [
        'Account and identity data: name, email address, username, password (stored in hashed form), profile photo, bio, and account preferences.',
        'Learning data: course enrollments, lesson progress, quiz answers, practice scores, XP, badges, skill tracks, and resume profile fields you choose to provide.',
        'Competitive data: battle history, matchmaking settings, rankings, coding submissions, response times, accuracy metrics, and anti-cheat signals.',
        'Community data: messages, channel memberships, reports, blocks, moderation actions, and interaction metadata.',
        'Support and communications: emails, support tickets, feedback, and survey responses.',
        'Technical and usage data: IP address, device type, browser, operating system, session identifiers, log files, crash reports, and feature usage analytics.',
        'Cookie and similar technology data as described in our Cookie Policy.',
      ],
    },
    {
      heading: '3. How we use information',
      paragraphs: [
        'We use personal information only where we have a lawful basis, including performance of our contract with you, legitimate interests, compliance with legal obligations, and consent where required.',
      ],
      list: [
        'Provide, operate, and maintain the Platform, including authentication, course delivery, battles, and community features.',
        'Personalize learning paths, recommendations, and matchmaking based on skill level and activity.',
        'Process resume and AI-assisted features using information you submit or store in your profile.',
        'Detect, investigate, and prevent fraud, cheating, abuse, and security incidents.',
        'Communicate service updates, security alerts, and administrative messages.',
        'Send optional product announcements or community updates where permitted and subject to your preferences.',
        'Analyze aggregated and de-identified trends to improve platform performance and educational outcomes.',
        'Comply with law, enforce our Terms, and protect the rights, safety, and property of users and Skill Arena.',
      ],
    },
    {
      heading: '4. How we share information',
      paragraphs: [
        'We do not sell your personal information. We share information only in the circumstances below.',
      ],
      list: [
        'Service providers: trusted vendors that help us host infrastructure, send email, provide analytics, moderate content, or support AI features, bound by contractual confidentiality and data protection obligations.',
        'Other users: information you choose to make public, such as leaderboard rankings, profile details, battle results, and community posts.',
        'Legal and safety: regulators, law enforcement, or other parties when required by law or when we reasonably believe disclosure is necessary to protect users, investigate abuse, or respond to legal process.',
        'Business transfers: in connection with a merger, acquisition, financing, or sale of assets, subject to appropriate confidentiality protections.',
        'With your consent: when you direct us to share information or connect third-party integrations.',
      ],
    },
    {
      heading: '5. AI and automated processing',
      paragraphs: [
        'Skill Arena uses automated systems, including artificial intelligence, to generate practice questions, battle content, resume suggestions, and moderation signals. Outputs are provided for educational purposes and may require human review.',
        'We do not use your private messages or sensitive personal data to train public third-party models without your consent. Automated moderation and anti-cheat systems may analyze activity patterns to protect platform integrity.',
      ],
    },
    {
      heading: '6. Data retention',
      paragraphs: [
        'We retain personal information for as long as necessary to provide the Platform, comply with legal obligations, resolve disputes, and enforce agreements.',
        'When you delete your account, we delete or anonymize personal information within a reasonable period, except where retention is required for security logs, legal compliance, fraud prevention, or backup systems with limited retention cycles.',
      ],
    },
    {
      heading: '7. Security',
      paragraphs: [
        'We implement administrative, technical, and organizational safeguards designed to protect personal information, including encryption in transit, access controls, hashed credentials, and monitoring for suspicious activity.',
        'No method of transmission or storage is completely secure. You are responsible for safeguarding your account credentials and reporting unauthorized access promptly.',
      ],
    },
    {
      heading: '8. International data transfers',
      paragraphs: [
        'Skill Arena may process and store information in countries other than your own. Where required, we use appropriate safeguards such as standard contractual clauses or equivalent mechanisms to protect cross-border transfers.',
      ],
    },
    {
      heading: '9. Your privacy rights',
      paragraphs: [
        'Depending on your location, you may have the following rights, subject to applicable law and verification requirements:',
      ],
      list: [
        'Access: request a copy of personal information we hold about you.',
        'Correction: request correction of inaccurate or incomplete information.',
        'Deletion: request deletion of your personal information, subject to legal exceptions.',
        'Portability: request a machine-readable copy of certain information you provided.',
        'Restriction or objection: object to or request restriction of certain processing activities.',
        'Withdraw consent: where processing is based on consent, withdraw consent at any time.',
        'Opt out of sale/sharing (US): Skill Arena does not sell personal information; where "sharing" for targeted advertising applies, you may exercise applicable opt-out rights.',
      ],
      note: 'To exercise rights, email privacy@skillarena.com from your registered address. We respond within the timeframe required by applicable law.',
    },
    {
      heading: '10. Children\'s privacy',
      paragraphs: [
        'Skill Arena is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If we learn that we have collected information from a child under 13, we will delete it promptly.',
        'Users between 13 and 18 should use the Platform with parental or guardian permission. Parents may contact privacy@skillarena.com to review or delete a minor\'s information.',
      ],
    },
    {
      heading: '11. Changes to this Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. Material changes will be posted on this page with an updated effective date. Where required by law, we will provide additional notice or request consent.',
      ],
    },
    {
      heading: '12. Regional disclosures',
      paragraphs: [
        'European Economic Area / UK: Skill Arena processes personal data as a controller. Legal bases include contract performance, legitimate interests, consent, and legal obligation. You may lodge a complaint with your local supervisory authority.',
        'California (CCPA/CPRA): California residents may request access, deletion, and correction, and may limit use of sensitive personal information. We do not sell personal information.',
        'Other regions: local privacy laws may provide additional rights. Contact privacy@skillarena.com for region-specific requests.',
      ],
      note: 'Data protection contact: privacy@skillarena.com · Data Protection Officer requests: dpo@skillarena.com',
    },
  ],

  cookies: [
    {
      heading: '1. Overview',
      paragraphs: [
        'This Cookie Policy explains how Skill Arena ("we," "us," or "our") uses cookies, local storage, pixels, and similar technologies ("cookies") when you visit or use our website and applications.',
        'It should be read together with our Privacy Policy and Terms of Service. Where required by law, we request your consent before placing non-essential cookies.',
      ],
      note: 'Effective date: June 20, 2026 · Last updated: June 20, 2026',
    },
    {
      heading: '2. What cookies are',
      paragraphs: [
        'Cookies are small text files placed on your device when you visit a website. They help websites remember your preferences, keep you signed in, understand usage patterns, and improve security.',
        'We also use local storage and session storage for similar purposes within the application.',
      ],
    },
    {
      heading: '3. Categories of cookies we use',
      paragraphs: [
        'We group cookies by purpose so you can understand what is essential and what is optional.',
      ],
      list: [
        'Strictly necessary: required for core functionality such as authentication, session management, security tokens, load balancing, and fraud prevention. These cannot be disabled without breaking the Platform.',
        'Functional / preference: remember language, theme, notification settings, sidebar state, and other choices to personalize your experience.',
        'Analytics / performance: help us measure traffic, page performance, feature adoption, and error rates in aggregate so we can improve reliability and UX.',
        'Security: support abuse detection, rate limiting, and integrity checks during battles and community activity.',
      ],
    },
    {
      heading: '4. Examples of cookies and storage keys',
      paragraphs: [
        'Cookie names and durations may change as we update the Platform. The examples below represent typical categories rather than an exhaustive live inventory.',
      ],
      list: [
        'Session authentication token — strictly necessary — session or up to 30 days if "remember me" is enabled — keeps you signed in securely.',
        'CSRF / security cookie — strictly necessary — session — protects forms and API requests from cross-site attacks.',
        'theme, locale, or ui_prefs — functional — up to 12 months — stores display and language preferences.',
        'analytics session ID — analytics — up to 24 months — counts visits and feature usage in aggregate.',
        'battle_queue_state — functional — session — preserves matchmaking state during active sessions.',
      ],
    },
    {
      heading: '5. Third-party cookies',
      paragraphs: [
        'Some cookies may be set by service providers that help us operate Skill Arena, such as hosting providers, analytics tools, or embedded content. These providers process data according to their own privacy policies.',
        'We limit third-party cookies to what is necessary for security, performance, and product improvement. We do not permit advertising partners to track you across unrelated websites through the Platform.',
      ],
    },
    {
      heading: '6. Legal bases and consent',
      paragraphs: [
        'Where required by the GDPR, ePrivacy Directive, UK PECR, or similar laws, we rely on legitimate interests or consent for non-essential cookies.',
        'Strictly necessary cookies are used based on our legitimate interest in providing a secure, functioning service. Analytics and optional preference cookies are used only with your consent where mandated.',
      ],
    },
    {
      heading: '7. How to manage cookies',
      paragraphs: [
        'You can control cookies through your browser settings. Most browsers let you block, delete, or alert you about cookies. Blocking strictly necessary cookies may prevent sign-in, battles, or other core features from working.',
        'To clear Skill Arena data stored in your browser, remove site data for skillarena.com (or your deployment domain) in browser privacy settings.',
        'If we offer an in-product cookie preference center, you can update non-essential cookie choices there at any time without affecting essential cookies.',
      ],
      list: [
        'Chrome: Settings → Privacy and security → Cookies and other site data',
        'Firefox: Settings → Privacy & Security → Cookies and Site Data',
        'Safari: Settings → Privacy → Manage Website Data',
        'Edge: Settings → Cookies and site permissions',
      ],
    },
    {
      heading: '8. Do Not Track and Global Privacy Control',
      paragraphs: [
        'Some browsers send "Do Not Track" (DNT) signals. Because there is no industry-wide standard for DNT, Skill Arena does not respond to DNT signals uniformly. Where legally required, we honor Global Privacy Control (GPC) signals for applicable opt-out rights in the United States.',
      ],
    },
    {
      heading: '9. Updates to this Policy',
      paragraphs: [
        'We may update this Cookie Policy to reflect changes in technology, regulation, or our practices. Material updates will be posted on this page with a revised effective date.',
      ],
      note: 'Cookie and privacy questions: privacy@skillarena.com',
    },
  ],

  safety: [
    {
      heading: '1. Our safety mission',
      paragraphs: [
        'Skill Arena is built for competitive learning — not harassment, exploitation, or abuse. The Safety Center explains how we protect learners, enforce fair play, and respond to reports across battles, courses, and community spaces.',
        'Every user deserves an environment where they can learn, compete, and connect without fear. Safety is a shared responsibility between Skill Arena, our moderation systems, and our community.',
      ],
      note: 'Effective date: June 20, 2026 · Last updated: June 20, 2026',
    },
    {
      heading: '2. Community standards',
      paragraphs: [
        'All users must follow these standards. Violations may result in warnings, feature restrictions, rank adjustments, or permanent account termination.',
      ],
      list: [
        'Respect: treat opponents, teammates, instructors, and moderators with dignity. Trash talk must not cross into harassment or hate.',
        'Integrity: no cheating, answer sharing during live battles, exploit abuse, botting, smurfing to manipulate rankings, or collusion.',
        'Safety: no threats, doxxing, stalking, sexual harassment, or encouragement of self-harm or violence.',
        'Legality: no promotion of illegal activity, malware, fraud, or scams.',
        'Privacy: do not share another person\'s personal contact information, credentials, or private data without consent.',
        'Authenticity: do not impersonate Skill Arena staff, other users, or public figures.',
      ],
    },
    {
      heading: '3. Battle and competitive integrity',
      paragraphs: [
        'Ranked and casual battles use automated anti-cheat signals, timing analysis, and post-match review. We investigate reports of unfair play, including unauthorized tools, shared answers, and match manipulation.',
      ],
      list: [
        'First offense: warning and possible match void.',
        'Repeated or serious cheating: temporary battle ban, rank reset, or XP rollback.',
        'Organized cheating or account selling: permanent ban and hardware or IP restrictions where permitted by law.',
        'Coding battles: plagiarism, copying external solutions during timed matches, or submitting non-original code may result in disqualification.',
      ],
    },
    {
      heading: '4. Reporting tools',
      paragraphs: [
        'If you see behavior that violates our standards, report it immediately. Do not retaliate or engage with bad actors — use the tools below so our team can act.',
      ],
      list: [
        'In-match report: flag abusive chat or suspicious behavior from the battle or community UI.',
        'User report: report a profile for harassment, impersonation, or scam attempts.',
        'Message report: flag individual community messages or threads.',
        'Appeal evidence: attach battle IDs, timestamps, or screenshots when submitting a detailed report.',
        'Urgent safety email: community@skillarena.com with subject line "URGENT SAFETY".',
      ],
    },
    {
      heading: '5. Moderation process',
      paragraphs: [
        'Reports are reviewed by a combination of automated systems and trained human moderators. We prioritize cases involving threats, child safety, hate speech, and active harassment.',
      ],
      list: [
        'Triage: urgent reports escalated immediately; standard reports reviewed within 24–72 hours.',
        'Investigation: moderators review chat logs, battle data, and report history.',
        'Action: outcomes may include no violation found, warning, content removal, mute, temporary suspension, rank correction, or permanent ban.',
        'Notification: affected users are informed of significant enforcement actions where appropriate and safe to do so.',
      ],
    },
    {
      heading: '6. Appeals',
      paragraphs: [
        'If you believe an enforcement action was made in error, you may submit an appeal within fourteen (14) days to appeals@skillarena.com including your username, action taken, and relevant battle or message IDs.',
        'Appeals are reviewed by a different moderator where possible. Decisions on appeals are final for that enforcement cycle, though new evidence may be considered in exceptional cases.',
      ],
    },
    {
      heading: '7. Child and teen safety',
      paragraphs: [
        'Users under 18 should not share personal contact information in public channels. Parents and educators may contact safety@skillarena.com to report concerns about a minor\'s account.',
        'We prohibit grooming, sexual content involving minors, and any attempt to solicit private information from minors. Such reports are escalated immediately and may be referred to law enforcement.',
      ],
    },
    {
      heading: '8. Self-harm and crisis resources',
      paragraphs: [
        'If you or someone you know is in crisis, contact local emergency services immediately. Skill Arena moderators cannot provide clinical intervention.',
        'International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/',
        'Crisis Text Line (US/UK/CA): text HOME to 741741 (US) or visit crisistextline.org for local options.',
      ],
    },
    {
      heading: '9. Security and account protection',
      paragraphs: [
        'Skill Arena will never ask for your password by email or direct message. Enable a strong unique password and sign out on shared devices.',
      ],
      list: [
        'Report phishing or fake Skill Arena sites to security@skillarena.com.',
        'If your account is compromised, reset your password and contact support immediately.',
        'Review connected sessions and profile visibility in account settings.',
      ],
    },
    {
      heading: '10. Law enforcement and legal requests',
      paragraphs: [
        'We cooperate with law enforcement when required by valid legal process and when necessary to prevent imminent harm. Legal requests may be directed to legal@skillarena.com.',
      ],
      note: 'Safety team: community@skillarena.com · Urgent threats: include "URGENT SAFETY" in the subject line',
    },
  ],
}
