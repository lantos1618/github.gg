import { NextResponse } from "next/server"

// Sample data for user activity
export const userActivityData = [
  { month: "Jan", users: 12000 },
  { month: "Feb", users: 14000 },
  { month: "Mar", users: 15500 },
  { month: "Apr", users: 17000 },
  { month: "May", users: 18500 },
  { month: "Jun", users: 20000 },
  { month: "Jul", users: 21500 },
  { month: "Aug", users: 22000 },
  { month: "Sep", users: 23000 },
  { month: "Oct", users: 24000 },
  { month: "Nov", users: 24500 },
  { month: "Dec", users: 24738 },
]

// Sample data for repositories analyzed
export const reposAnalyzedData = [
  { month: "Jan", repos: 1200000 },
  { month: "Feb", repos: 1500000 },
  { month: "Mar", repos: 1700000 },
  { month: "Apr", repos: 1900000 },
  { month: "May", repos: 2100000 },
  { month: "Jun", repos: 2300000 },
  { month: "Jul", repos: 2500000 },
  { month: "Aug", repos: 2700000 },
  { month: "Sep", repos: 2900000 },
  { month: "Oct", repos: 3000000 },
  { month: "Nov", repos: 3100000 },
  { month: "Dec", repos: 3200000 },
]

export async function GET(request: Request) {
  // Get the query parameters
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const format = searchParams.get("format") || "full" // full or mobile

  let responseData = {}

  if (type === "user-activity") {
    // Return user activity data
    responseData = {
      data:
        format === "mobile"
          ? userActivityData.slice(-6) // Last 6 months for mobile
          : userActivityData,
      currentUsers: 24738,
      growthPercentage: 12.4,
    }
  } else if (type === "repos-analyzed") {
    // Return repositories analyzed data
    responseData = {
      data:
        format === "mobile"
          ? reposAnalyzedData.slice(-6) // Last 6 months for mobile
          : reposAnalyzedData,
      totalRepos: 3200000,
      growthPercentage: 18.7,
    }
  } else if (type === "tokens-used") {
    // Return token usage data
    responseData = {
      monthlyData: [35, 45, 60, 55, 70, 65, 90, 85, 95, 100, 120, 110],
      totalTokens: 1.2, // In billions
    }
  } else {
    // Return all stats
    responseData = {
      userActivity: {
        data: format === "mobile" ? userActivityData.slice(-6) : userActivityData,
        currentUsers: 24738,
        growthPercentage: 12.4,
      },
      reposAnalyzed: {
        data: format === "mobile" ? reposAnalyzedData.slice(-6) : reposAnalyzedData,
        totalRepos: 3200000,
        growthPercentage: 18.7,
      },
      tokensUsed: {
        monthlyData: [35, 45, 60, 55, 70, 65, 90, 85, 95, 100, 120, 110],
        totalTokens: 1.2, // In billions
      },
    }
  }

  return NextResponse.json(responseData)
}
