import BattlesSection from './BattlesSection'
import LearnSection from './LearnSection'
import CommunitySection from './CommunitySection'
import './StackSections.css'

/** Linear landing sections — no sticky stacking. */
const StackSections = () => {
  return (
    <div className="landing-sections">
      <BattlesSection />
      <LearnSection />
      <CommunitySection />
    </div>
  )
}

export default StackSections
