import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from '../components/Hero'
import MarqueeBar from '../components/MarqueeBar'
import Features from '../components/Features'
import StackSections from '../components/StackSections'
import CtaSection from '../components/CtaSection'
import { platformApi } from '../services/api'

const scrollToHashSection = (hash) => {
  if (!hash) return false

  const sectionId = hash.replace('#', '')
  const section = document.getElementById(sectionId)
  if (!section) return false

  section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

const LandingPage = () => {
  const { hash } = useLocation()

  useEffect(() => {
    // Warm the public blogs cache so /blog feels instant.
    const prefetch = () => {
      platformApi.blogs().catch(() => {})
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 2500 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = window.setTimeout(prefetch, 800)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (!hash) return undefined

    let attempts = 0
    let frameId = 0
    let timeoutId = 0

    const tryScroll = () => {
      if (scrollToHashSection(hash) || attempts >= 12) return
      attempts += 1
      frameId = window.requestAnimationFrame(tryScroll)
    }

    // Wait a beat so layout/images settle and ScrollToTop does not win the race.
    timeoutId = window.setTimeout(tryScroll, 50)

    return () => {
      window.clearTimeout(timeoutId)
      window.cancelAnimationFrame(frameId)
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
