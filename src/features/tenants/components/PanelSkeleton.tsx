import React from "react"
import home from "../../home/styles/home.module.css"

interface PanelSkeletonProps {
  refreshing?: boolean
}

const PanelSkeleton: React.FC<PanelSkeletonProps> = ({ refreshing }) => {
  return (
    <div aria-busy="true" data-refreshing={refreshing ? "true" : undefined}>
      <div className={home.skeletonHeader} />
      <div className={home.attentionGrid}>
        <div className={home.skeletonKpis} />
        <div className={home.skeletonAttention} />
      </div>
      <div className={home.analysisGrid}>
        <div className={home.skeletonTrend} />
        <div className={home.skeletonDistribution} />
      </div>
      <div className={home.workGrid}>
        <div className={home.skeletonWork} />
        <div className={home.skeletonAttention} />
      </div>
    </div>
  )
}

export default PanelSkeleton
