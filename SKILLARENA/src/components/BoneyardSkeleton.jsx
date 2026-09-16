import { Skeleton } from 'boneyard-js/react'

const BONE_COLORS = {
  color: 'rgba(5, 150, 105, 0.14)',
  darkColor: 'rgba(52, 211, 153, 0.12)',
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
