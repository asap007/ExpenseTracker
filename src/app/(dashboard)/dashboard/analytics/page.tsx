"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, AlertCircle, TrendingUp, Sparkles } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

// Define types for our data structure
type ExpenseCategory = {
  name: string;
  value: number;
};

type AIInsights = {
  analysis: string;
  recommendations: string[];
  concerns: string[];
  suggestedBudget: {
    needs: number;
    wants: number;
    savings: number;
  };
};

type SavingsPlan = {
  savingsPlan: string;
  recommendations: string[];
  tips: string[];
};

type AnalyticsData = {
  currentIncome: number;
  totalExpenses: number;
  expensesByCategory: ExpenseCategory[];
  aiInsights?: AIInsights;
  hasIncome: boolean;
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goalAmount, setGoalAmount] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [savingsPlan, setSavingsPlan] = useState<SavingsPlan | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics data");
      }
      const result = await response.json();
      setData(result);
      setShowIncomeForm(!result.hasIncome);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setError("Failed to load analytics data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyIncome: parseFloat(monthlyIncome) }),
      });

      if (!response.ok) {
        throw new Error("Failed to update income");
      }

      setShowIncomeForm(false);
      fetchData();
    } catch (error) {
      console.error("Failed to update income:", error);
      setError("Failed to update income. Please try again.");
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalAmount: parseFloat(goalAmount), timeframe: parseInt(timeframe) }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate savings plan");
      }

      const result = await response.json();
      setSavingsPlan(result);
    } catch (error) {
      console.error("Failed to generate savings plan:", error);
      setError("Failed to generate savings plan. Please try again.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Financial Analytics</h1>
        {!showIncomeForm && (
          <Button onClick={() => setShowIncomeForm(true)}>
            Update Income
          </Button>
        )}
      </div>

      {showIncomeForm && (
        <Card>
          <CardHeader>
            <CardTitle>Set Monthly Income</CardTitle>
            <CardDescription>
              This helps us provide more accurate financial insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleIncomeSubmit} className="flex gap-4">
              <Input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="Enter monthly income"
                className="max-w-xs"
                required
                min="0"
                step="0.01"
              />
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Set Savings Goal</CardTitle>
          <CardDescription>
            Define your savings goal and timeframe to get a personalized plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGoalSubmit} className="flex gap-4">
            <Input
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="Goal Amount"
              className="max-w-xs"
              required
              min="0"
              step="0.01"
            />
            <Input
              type="number"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              placeholder="Timeframe (months)"
              className="max-w-xs"
              required
              min="1"
            />
            <Button type="submit">Get Plan</Button>
          </form>
        </CardContent>
      </Card>

      {savingsPlan && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Savings Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Plan</h3>
              <p>{savingsPlan.savingsPlan}</p>
            </div>

            {savingsPlan.recommendations.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Recommendations</h3>
                <ul className="list-disc pl-6 space-y-1">
                  {savingsPlan.recommendations.map((rec, index) => (
                    <li key={`rec-${index}`}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {savingsPlan.tips.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Tips</h3>
                <ul className="list-disc pl-6 space-y-1">
                  {savingsPlan.tips.map((tip, index) => (
                    <li key={`tip-${index}`}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    {data && (
        <div className="grid gap-6 md:grid-cols-2">
          {data.expensesByCategory && data.expensesByCategory.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Expense Distribution</CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.expensesByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {data.expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Expenses</CardTitle>
                <CardDescription>Start adding expenses to see your distribution</CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Financial Overview</CardTitle>
              <CardDescription>Monthly summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <span>Monthly Income:</span>
                </div>
                <span className="font-bold">
                  ${(data.currentIncome || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  <span>Total Expenses:</span>
                </div>
                <span className="font-bold">
                  ${(data.totalExpenses || 0).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {data.aiInsights && (
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <CardTitle>AI-Powered Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Analysis</h3>
                  <p>{data.aiInsights.analysis}</p>
                </div>

                {data.aiInsights.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Recommendations</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      {data.aiInsights.recommendations.map((rec, index) => (
                        <li key={`rec-${index}`}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.aiInsights.concerns.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Areas of Concern</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-6 mt-2">
                        {data.aiInsights.concerns.map((concern, index) => (
                          <li key={`concern-${index}`}>{concern}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {data.aiInsights.suggestedBudget && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Suggested Monthly Budget (50/30/20 Rule)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="p-4">
                          <CardTitle className="text-lg">Needs</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          ${data.aiInsights.suggestedBudget.needs.toFixed(2)}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="p-4">
                          <CardTitle className="text-lg">Wants</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          ${data.aiInsights.suggestedBudget.wants.toFixed(2)}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="p-4">
                          <CardTitle className="text-lg">Savings</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          ${data.aiInsights.suggestedBudget.savings.toFixed(2)}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}