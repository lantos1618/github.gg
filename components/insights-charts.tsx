"use client"

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface ContributorsChartProps {
  data: Array<{
    name: string
    contributions: number
  }>
}

export function ContributorsChart({ data }: ContributorsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="name" stroke="#666" />
        <YAxis stroke="#666" />
        <Tooltip contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }} labelStyle={{ color: "#fff" }} />
        <Bar dataKey="contributions" fill="#25a55f" />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface CommitsChartProps {
  data: Array<{
    name: string
    commits: number
  }>
}

export function CommitsChart({ data }: CommitsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="name" stroke="#666" />
        <YAxis stroke="#666" />
        <Tooltip contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }} labelStyle={{ color: "#fff" }} />
        <Bar dataKey="commits" fill="#9b59b6" />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface LineChartProps {
  data: Array<{
    date: string
    [key: string]: any
  }>
  dataKey: string
  color: string
}

export function SimpleLineChart({ data, dataKey, color }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="date" stroke="#666" />
        <YAxis stroke="#666" />
        <Tooltip contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }} labelStyle={{ color: "#fff" }} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
