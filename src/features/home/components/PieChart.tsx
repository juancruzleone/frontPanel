import React from "react"
import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import styles from "../styles/home.module.css"

interface PieChartData {
  name: string
  value: number
  color?: string
}

interface PieChartProps {
  data: PieChartData[]
}

const COLORS = ["#1976d2", "#057E74", "#fbc02d", "#e53935", "#388e3c"]

const CustomPieChart: React.FC<PieChartProps> = ({ data }) => {
  return (
    <div className={styles.chartCard}>
      <h3 style={{color: 'var(--color-text)'}}>Órdenes por estado</h3>
      <ResponsiveContainer width="100%" height={220}>
        <RePieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={70}
            label
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CustomPieChart 