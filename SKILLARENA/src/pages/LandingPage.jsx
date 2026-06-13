import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from '../components/Hero'
import MarqueeBar from '../components/MarqueeBar'
import Features from '../components/Features'
import StackSections from '../components/StackSections'
import CtaSection from '../components/CtaSection'

const LandingPage = () => {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return

    const sectionId = hash.replace('#', '')
    const section = document.getElementById(sectionId)

    if (section) {
      section.scrollIntoView({ behavior: 'smooth' })
    }
  }, [hash])

  return (
    <>
      <Hero />
      <MarqueeBar />
      <Features />
      <StackSections />
      <CtaSection />
    </>
  )
}

export default LandingPage
