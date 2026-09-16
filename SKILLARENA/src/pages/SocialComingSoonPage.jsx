import PageShell from './PageShell'

const SocialComingSoonPage = () => {
  return (
    <PageShell
      eyebrow="Social"
      title="Coming soon"
      description="We haven't created any social media accounts yet. We should create them in the future."
      staticLayout
    >
      <p className="page-content-text">
        Official Skill Arena channels on Twitter, GitHub, Instagram, and YouTube are not live yet.
        Check back later for updates once those accounts are ready.
      </p>
    </PageShell>
  )
}

export default SocialComingSoonPage
