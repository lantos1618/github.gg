"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ArrowUpIcon, DollarSignIcon, UsersIcon, MousePointerClickIcon, EyeIcon } from "lucide-react"

// Sample data for the dashboard
const revenueData = [
  { month: "Jan", revenue: 8000 },
  { month: "Feb", revenue: 9500 },
  { month: "Mar", revenue: 10000 },
  { month: "Apr", revenue: 10000 },
  { month: "May", revenue: 10000 },
  { month: "Jun", revenue: 12000 },
  { month: "Jul", revenue: 15000 },
  { month: "Aug", revenue: 20000 },
  { month: "Sep", revenue: 25000 },
  { month: "Oct", revenue: 30000 },
  { month: "Nov", revenue: 32000 },
  { month: "Dec", revenue: 35000 },
]

const clicksData = [
  { month: "Jan", clicks: 800 },
  { month: "Feb", clicks: 950 },
  { month: "Mar", clicks: 1100 },
  { month: "Apr", clicks: 1200 },
  { month: "May", clicks: 1300 },
  { month: "Jun", clicks: 1500 },
  { month: "Jul", clicks: 1800 },
  { month: "Aug", clicks: 2200 },
  { month: "Sep", clicks: 2500 },
  { month: "Oct", clicks: 2800 },
  { month: "Nov", clicks: 3000 },
  { month: "Dec", clicks: 3200 },
]

const advertisers = [
  { name: "GitHub", spend: 120000, active: true },
  { name: "JetBrains", spend: 85000, active: true },
  { name: "Vercel", spend: 75000, active: true },
  { name: "MongoDB", spend: 60000, active: true },
  { name: "DigitalOcean", spend: 45000, active: false },
  { name: "Supabase", spend: 40000, active: true },
]

const adSpots = [
  {
    id: "premium-1",
    name: "Homepage Featured",
    price: 10000,
    impressions: 250000,
    clicks: 3200,
    ctr: 1.28,
    advertiser: "GitHub",
    status: "active",
  },
  {
    id: "premium-2",
    name: "Repository Analysis",
    price: 8000,
    impressions: 180000,
    clicks: 2700,
    ctr: 1.5,
    advertiser: "JetBrains",
    status: "active",
  },
  {
    id: "standard-1",
    name: "Sidebar Top",
    price: 5000,
    impressions: 150000,
    clicks: 1800,
    ctr: 1.2,
    advertiser: "Vercel",
    status: "active",
  },
  {
    id: "standard-2",
    name: "Sidebar Bottom",
    price: 3500,
    impressions: 120000,
    clicks: 1200,
    ctr: 1.0,
    advertiser: "MongoDB",
    status: "active",
  },
  {
    id: "standard-3",
    name: "Footer Banner",
    price: 2500,
    impressions: 90000,
    clicks: 800,
    ctr: 0.89,
    advertiser: "Supabase",
    status: "active",
  },
  {
    id: "premium-3",
    name: "Code Explorer",
    price: 7500,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    advertiser: "",
    status: "available",
  },
]

const pieData = [
  { name: "GitHub", value: 120000, color: "#2ecc71" },
  { name: "JetBrains", value: 85000, color: "#3498db" },
  { name: "Vercel", value: 75000, color: "#9b59b6" },
  { name: "MongoDB", value: 60000, color: "#e67e22" },
  { name: "Supabase", value: 40000, color: "#f1c40f" },
]

export default function AdPublisherDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview")

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ad Publisher Dashboard</h1>
          <p className="text-muted-foreground">Manage your premium advertising inventory and track performance</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline">Export Report</Button>
          <Button>Create New Ad Spot</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="adspots">Ad Spots</TabsTrigger>
          <TabsTrigger value="advertisers">Advertisers</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-black/80 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSignIcon className="h-4 w-4 text-primary" />
                  Monthly Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$35,000</div>
                <div className="flex items-center text-xs text-green-500 mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>9.4% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/80 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <EyeIcon className="h-4 w-4 text-primary" />
                  Total Impressions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">790,000</div>
                <div className="flex items-center text-xs text-green-500 mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>12.3% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/80 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MousePointerClickIcon className="h-4 w-4 text-primary" />
                  Total Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">9,700</div>
                <div className="flex items-center text-xs text-green-500 mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>6.7% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/80 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-primary" />
                  Active Advertisers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <div className="flex items-center text-xs text-green-500 mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  <span>1 new this month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-black/80 border-border/50">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue from ad spots</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }}
                        labelStyle={{ color: "#fff" }}
                        formatter={(value) => [`$${value}`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="#2ecc71" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/80 border-border/50">
              <CardHeader>
                <CardTitle>Revenue by Advertiser</CardTitle>
                <CardDescription>Annual spend distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }}
                        formatter={(value) => [`$${value}`, "Annual Spend"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-black/80 border-border/50">
            <CardHeader>
              <CardTitle>Top Performing Ad Spots</CardTitle>
              <CardDescription>Based on click-through rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 font-medium">Ad Spot</th>
                      <th className="text-left py-3 px-4 font-medium">Price</th>
                      <th className="text-left py-3 px-4 font-medium">Impressions</th>
                      <th className="text-left py-3 px-4 font-medium">Clicks</th>
                      <th className="text-left py-3 px-4 font-medium">CTR</th>
                      <th className="text-left py-3 px-4 font-medium">Advertiser</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adSpots
                      .filter((spot) => spot.status === "active")
                      .sort((a, b) => b.ctr - a.ctr)
                      .slice(0, 5)
                      .map((spot, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-3 px-4">{spot.name}</td>
                          <td className="py-3 px-4">${spot.price.toLocaleString()}/mo</td>
                          <td className="py-3 px-4">{spot.impressions.toLocaleString()}</td>
                          <td className="py-3 px-4">{spot.clicks.toLocaleString()}</td>
                          <td className="py-3 px-4">{spot.ctr.toFixed(2)}%</td>
                          <td className="py-3 px-4">{spot.advertiser}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adspots" className="mt-0">
          <Card className="bg-black/80 border-border/50">
            <CardHeader>
              <CardTitle>Ad Inventory</CardTitle>
              <CardDescription>Manage your premium advertising spots</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 font-medium">Ad Spot</th>
                      <th className="text-left py-3 px-4 font-medium">Price</th>
                      <th className="text-left py-3 px-4 font-medium">Impressions</th>
                      <th className="text-left py-3 px-4 font-medium">Clicks</th>
                      <th className="text-left py-3 px-4 font-medium">CTR</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Advertiser</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adSpots.map((spot, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-3 px-4">{spot.name}</td>
                        <td className="py-3 px-4">${spot.price.toLocaleString()}/mo</td>
                        <td className="py-3 px-4">{spot.impressions.toLocaleString()}</td>
                        <td className="py-3 px-4">{spot.clicks.toLocaleString()}</td>
                        <td className="py-3 px-4">{spot.ctr.toFixed(2)}%</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              spot.status === "active"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {spot.status === "active" ? "Active" : "Available"}
                          </span>
                        </td>
                        <td className="py-3 px-4">{spot.advertiser || "—"}</td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advertisers" className="mt-0">
          <Card className="bg-black/80 border-border/50">
            <CardHeader>
              <CardTitle>Advertisers</CardTitle>
              <CardDescription>Companies currently advertising on GitHub.GG</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 font-medium">Advertiser</th>
                      <th className="text-left py-3 px-4 font-medium">Annual Spend</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advertisers.map((advertiser, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-3 px-4">{advertiser.name}</td>
                        <td className="py-3 px-4">${advertiser.spend.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              advertiser.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {advertiser.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-0">
          <Card className="bg-black/80 border-border/50">
            <CardHeader>
              <CardTitle>Performance Reports</CardTitle>
              <CardDescription>Detailed analytics for your ad inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Clicks Trend</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={clicksData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="month" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }}
                          labelStyle={{ color: "#fff" }}
                        />
                        <Line type="monotone" dataKey="clicks" stroke="#3498db" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Revenue Growth</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="month" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }}
                          labelStyle={{ color: "#fff" }}
                          formatter={(value) => [`$${value}`, "Revenue"]}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#2ecc71" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Available Reports</h3>
                <div className="space-y-3">
                  {[
                    { name: "Monthly Performance Report", date: "December 2024" },
                    { name: "Quarterly Revenue Analysis", date: "Q4 2024" },
                    { name: "Advertiser ROI Report", date: "November 2024" },
                    { name: "Ad Spot Optimization Report", date: "October 2024" },
                  ].map((report, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                      <div>
                        <h4 className="font-medium">{report.name}</h4>
                        <p className="text-sm text-muted-foreground">{report.date}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
