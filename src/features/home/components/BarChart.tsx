import React from "react"
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from "recharts"
import styles from "../styles/home.module.css"

interface BarChartData {
  name: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartData[]
}

const COLORS = ["#1976d2", "#057E74", "#fbc02d", "#e53935", "#388e3c"]

const CustomBarChart: React.FC<BarChartProps> = ({ data }) => {
  return (
    <div className={styles.chartCard}>
      <h3 style={{color: 'var(--color-text)'}}>Órdenes por tipo</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ReBarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="#111" />
          <YAxis allowDecimals={false} stroke="#111" />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CustomBarChart 