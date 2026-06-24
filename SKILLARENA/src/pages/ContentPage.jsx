import PageShell from './PageShell'
import PageContent from './PageContent'
import { PAGE_SECTIONS } from '../content/pageContent'
import { LEGAL_PAGE_KEYS } from '../content/legalContent'

const ContentPage = ({ contentKey, eyebrow, title, description }) => {
  const staticLayout = LEGAL_PAGE_KEYS.has(contentKey)

  return (
    <PageShell
      eyebrow={eyebrow}
      title={title}
      description={description}
      staticLayout={staticLayout}
    >
      <PageContent sections={PAGE_SECTIONS[contentKey]} staticLayout={staticLayout} />
    </PageShell>
  )
}

export default ContentPage
