import PageShell from './PageShell'
import PageContent from './PageContent'
import { PAGE_SECTIONS } from '../content/pageContent'

const ContentPage = ({ contentKey, eyebrow, title, description }) => {
  return (
    <PageShell eyebrow={eyebrow} title={title} description={description}>
      <PageContent sections={PAGE_SECTIONS[contentKey]} />
    </PageShell>
  )
}

export default ContentPage
