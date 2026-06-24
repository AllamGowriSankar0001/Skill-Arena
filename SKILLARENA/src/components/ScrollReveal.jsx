import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './ScrollReveal.css'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const ScrollReveal = ({
  children,
  className = '',
  delay = 0,
  as: Component = 'div',
  disabled = false,
}) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(disabled)

  useIsomorphicLayoutEffect(() => {
    if (disabled) {
      setVisible(true)
      return undefined
    }

    const node = ref.current
    if (!node) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
      },
      {
        threshold: [0, 0.2],
        rootMargin: '0px 0px -10% 0px',
      },
    )

    observer.observe(node)

    const rect = node.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      setVisible(true)
    }

    return () => observer.disconnect()
  }, [disabled])

  return (
    <Component
      ref={ref}
      className={`scroll-reveal${visible ? ' is-visible' : ''}${disabled ? ' scroll-reveal--static' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      {children}
    </Component>
  )
}

export default ScrollReveal
