import { Skeleton } from 'boneyard-js/react'

const BONE_COLORS = {
  color: 'rgba(138, 122, 109, 0.14)',
  darkColor: 'rgba(253, 248, 240, 0.08)',
}

const BoneyardSkeleton = ({ name, loading, fixture, children, className, ...props }) => (
  <Skeleton
    name={name}
    loading={loading}
    fixture={fixture}
    animate="shimmer"
    stagger
    transition
    className={className}
    {...BONE_COLORS}
    {...props}
  >
    {children}
  </Skeleton>
)

export default BoneyardSkeleton
