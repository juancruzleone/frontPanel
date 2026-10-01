import React from "react"
import styles from "./Skeleton.module.css"

const Skeleton: React.FC<{ height?: number | string, width?: number | string, style?: React.CSSProperties }> = ({ height = 40, width = '100%', style = {} }) => (
  <div
    className={styles.skeleton}
    style={{ height, width, ...style }}
  />
)

export default Skeleton
