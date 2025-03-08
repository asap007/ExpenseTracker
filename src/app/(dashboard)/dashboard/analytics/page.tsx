"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DollarSign,
  AlertCircle,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Wallet,
  PiggyBank,
  BarChart3,
  ArrowRight,
  ChevronRight,
  BadgeCheck,
  Target,
} from "lucide-react"
import { BarChart, CartesianGrid,XAxis ,YAxis ,Bar ,LabelList , Cell, Legend, ResponsiveContainer, Tooltip, PieChart } from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

type ExpenseCategory = {
  name: string
  value: number
}

type AIInsights = {
  analysis: string
  recommendations: string[]
  concerns: string[]
  suggestedBudget: {
    needs: number
    wants: number
    savings: number
  }
}

type SavingsPlan = {
  savingsPlan: string
  recommendations: string[]
  tips: string[]
}

type AnalyticsData = {
  currentIncome: number
  totalExpenses: number
  expensesByCategory: ExpenseCategory[]
  aiInsights?: AIInsights
  hasIncome: boolean
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [monthlyIncome, setMonthlyIncome] = useState("")
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [goalAmount, setGoalAmount] = useState("")
  const [timeframe, setTimeframe] = useState("")
  const [savingsPlan, setSavingsPlan] = useState<SavingsPlan | null>(null)
  const [goalLoading, setGoalLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const fetchData = async () => {
    try {
      setLoading(true)

      // First attempt
      try {
        const response = await fetch("/api/financials")
        if (!response.ok) {
          throw new Error("Initial fetch failed")
        }
        const result = await response.json()
        setData(result)
        setShowIncomeForm(!result.hasIncome)
        setLoading(false)
      } catch (initialError) {
        console.warn("Initial fetch failed, retrying...", initialError)

        // Wait a moment and retry
        setTimeout(async () => {
          try {
            const retryResponse = await fetch("/api/financials")
            if (!retryResponse.ok) {
              throw new Error("Retry fetch failed")
            }
            const retryResult = await retryResponse.json()
            setData(retryResult)
            setShowIncomeForm(!retryResult.hasIncome)
          } catch (retryError) {
            console.error("All fetch attempts failed:", retryError)
            setError("Failed to load analytics data. Please try again later.")
          } finally {
            setLoading(false)
          }
        }, 1500) // 1.5 second delay before retry
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
      setError("Failed to load analytics data. Please try again later.")
      setLoading(false)
    }
  }

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const incomeValue = Number.parseFloat(monthlyIncome)

    // Optimistically update UI
    if (data) {
      const optimisticData = {
        ...data,
        currentIncome: incomeValue,
        hasIncome: true,
      }
      setData(optimisticData)
    }

    setShowIncomeForm(false)

    try {
      const response = await fetch("/api/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyIncome: incomeValue }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update income")
      }

      // If the response includes fresh analytics data, use it
      const result = await response.json()
      if (result.analytics) {
        setData(result.analytics)
      } else {
        // Otherwise fetch fresh data
        fetchData()
      }
    } catch (error: any) {
      console.error("Failed to update income:", error)
      setError(error.message || "Failed to update income. Please try again.")

      // Revert optimistic update if there was an error
      fetchData()
    }
  }

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGoalLoading(true)
    try {
      const response = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalAmount: Number.parseFloat(goalAmount),
          timeframe: Number.parseInt(timeframe),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate savings plan")
      }

      const result = await response.json()
      setSavingsPlan(result)
      setActiveTab("savings")
    } catch (error: any) {
      console.error("Failed to generate savings plan:", error)
      setError(error.message || "Failed to generate savings plan. Please try again.")
    } finally {
      setGoalLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Card className="w-full max-w-md p-6 text-center border-red-200">
          <CardContent className="pt-6 pb-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-700">Error Loading Data</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your finances and get smart insights</p>
        </div>

        {loading ? (
          <Skeleton className="h-10 w-32" />
        ) : (
          !showIncomeForm && (
            <Button onClick={() => setShowIncomeForm(true)} className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4" />
              Update Income
            </Button>
          )
        )}
      </div>

      {showIncomeForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Set Monthly Income</CardTitle>
            <CardDescription>This helps us provide more accurate financial insights</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleIncomeSubmit} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-sm">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  placeholder="Enter monthly income"
                  className="pl-10"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowIncomeForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview" className="flex items-center justify-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center justify-center">
            <Sparkles className="mr-2 h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="savings" className="flex items-center justify-center">
            <PiggyBank className="mr-2 h-4 w-4" />
            Savings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Overview Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-[200px] w-full" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center">
                    <Wallet className="mr-2 h-5 w-5 text-primary" />
                    Financial Summary
                  </CardTitle>
                  <CardDescription>Monthly income and expenses</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-green-500" />
                        </div>
                        <span className="font-medium">Monthly Income</span>
                      </div>
                      <span className="font-bold text-xl">{formatCurrency(data?.currentIncome || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        </div>
                        <span className="font-medium">Total Expenses</span>
                      </div>
                      <span className="font-bold text-xl">{formatCurrency(data?.totalExpenses || 0)}</span>
                    </div>
                    <div className="h-px bg-muted my-2" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <PiggyBank className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="font-medium">Remaining</span>
                      </div>
                      <span
                        className={`font-bold text-xl ${(data?.currentIncome || 0) - (data?.totalExpenses || 0) < 0 ? "text-red-500" : "text-green-500"}`}
                      >
                        {formatCurrency((data?.currentIncome || 0) - (data?.totalExpenses || 0))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {data?.expensesByCategory && data.expensesByCategory.length > 0 ? (
                <Card>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-xl flex items-center">
                        <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                        Expense Distribution
                    </CardTitle>
                    <CardDescription>Breakdown by category</CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                        layout="vertical"
                        data={data.expensesByCategory}
                        margin={{ top: 20, right: 80, left: 40, bottom: 5 }}
                        >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis 
                            type="number" 
                            tickFormatter={(value) => formatCurrency(value)}
                            domain={[0, 'dataMax']}
                            padding={{ left: 0, right: 20 }}
                        />
                        <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={120}
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
                            }}
                        />
                        <Legend 
                            verticalAlign="top"
                            height={36}
                        />
                        <Bar 
                            dataKey="value" 
                            name="Amount" 
                            radius={[0, 4, 4, 0]}
                            barSize={24}
                        >
                            {data.expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                            <LabelList 
                            dataKey="value" 
                            position="right"
                            offset={10} 
                            formatter={(value) => formatCurrency(value)}
                            style={{ fill: '#666', fontSize: 12, fontWeight: 500 }}
                            />
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
                ) : (
                <Card>
                    <CardHeader className="pb-2">
                    <CardTitle className="text-xl flex items-center">
                        <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                        No Expense Data
                    </CardTitle>
                    <CardDescription>Start tracking your expenses</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 flex flex-col items-center justify-center h-64">
                    <div className="p-4 bg-muted rounded-full mb-4">
                        <BarChart3 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-center text-muted-foreground max-w-xs">
                        Add some expenses to see your spending distribution by category
                    </p>
                    </CardContent>
                </Card>
                )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {loading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-40" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-4 w-40" />
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : data?.aiInsights ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center">
                  <Sparkles className="mr-2 h-5 w-5 text-primary" />
                  AI-Powered Financial Insights
                </CardTitle>
                <CardDescription>Smart analysis of your financial patterns and behavior</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center">
                    <BadgeCheck className="mr-2 h-5 w-5 text-blue-500" />
                    Analysis
                  </h3>
                  <p className="text-muted-foreground">{data.aiInsights.analysis}</p>
                </div>

                {data.aiInsights.recommendations.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="font-semibold text-lg mb-2 text-blue-700">Recommendations</h3>
                    <ul className="space-y-2">
                      {data.aiInsights.recommendations.map((rec, index) => (
                        <li key={`rec-${index}`} className="flex items-start">
                          <ChevronRight className="h-5 w-5 text-blue-500 mr-2 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.aiInsights.concerns.length > 0 && (
                  <Alert className="bg-amber-50 border-amber-100 text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Areas of Concern</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-6 mt-2 space-y-1">
                        {data.aiInsights.concerns.map((concern, index) => (
                          <li key={`concern-${index}`}>{concern}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {data.aiInsights.suggestedBudget && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Suggested Monthly Budget (50/30/20 Rule)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-emerald-50 border-emerald-100">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-emerald-800">Needs (50%)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <p className="text-2xl font-bold text-emerald-700">
                            {formatCurrency(data.aiInsights.suggestedBudget.needs)}
                          </p>
                          <p className="text-xs text-emerald-600 mt-1">Housing, groceries, utilities, healthcare</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-50 border-blue-100">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-blue-800">Wants (30%)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <p className="text-2xl font-bold text-blue-700">
                            {formatCurrency(data.aiInsights.suggestedBudget.wants)}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">Entertainment, dining out, shopping, hobbies</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-purple-50 border-purple-100">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg text-purple-800">Savings (20%)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <p className="text-2xl font-bold text-purple-700">
                            {formatCurrency(data.aiInsights.suggestedBudget.savings)}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">Emergency fund, retirement, investments</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Insights Available</CardTitle>
                <CardDescription>We need more financial data to generate personalized insights</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Continue adding income and expense information to get AI-powered financial insights.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="savings" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center">
                <Target className="mr-2 h-5 w-5 text-primary" />
                Savings Goal
              </CardTitle>
              <CardDescription>Define your savings goal and timeframe to get a personalized plan</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleGoalSubmit} className="flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 space-y-2 w-full">
                  <label htmlFor="goalAmount" className="text-sm font-medium">
                    Goal Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="goalAmount"
                      type="number"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="pl-10"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <label htmlFor="timeframe" className="text-sm font-medium">
                    Timeframe (months)
                  </label>
                  <Input
                    id="timeframe"
                    type="number"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    placeholder="Number of months"
                    required
                    min="1"
                  />
                </div>
                <Button type="submit" disabled={goalLoading}>
                  {goalLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      Get Plan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {loading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : savingsPlan ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center">
                  <PiggyBank className="mr-2 h-5 w-5 text-primary" />
                  Your Personalized Savings Plan
                </CardTitle>
                <CardDescription>A detailed plan to help you reach your savings goal</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-semibold text-lg text-blue-700 mb-2">Savings Strategy</h3>
                  <p className="text-blue-700">{savingsPlan.savingsPlan}</p>
                </div>

                {savingsPlan.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Recommendations</h3>
                    <ul className="space-y-2">
                      {savingsPlan.recommendations.map((rec, index) => (
                        <li key={`rec-${index}`} className="flex items-start p-3 bg-white rounded-lg border">
                          <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center mr-3 shrink-0 mt-0.5">
                            <BadgeCheck className="h-4 w-4 text-emerald-500" />
                          </div>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {savingsPlan.tips.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Tips for Success</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {savingsPlan.tips.map((tip, index) => (
                        <div key={`tip-${index}`} className="flex items-start p-3 bg-white rounded-lg border">
                          <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 shrink-0 mt-0.5">
                            <ChevronRight className="h-4 w-4 text-blue-500" />
                          </div>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  onClick={() => {
                    setGoalAmount("")
                    setTimeframe("")
                    setSavingsPlan(null)
                  }}
                  variant="outline"
                  className="ml-auto"
                >
                  Create New Plan
                </Button>
              </CardFooter>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}

