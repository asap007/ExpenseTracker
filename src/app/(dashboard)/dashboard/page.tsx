"use client"

import { useState, useEffect } from "react"
import { PlusCircle, ArrowUpDown, Search, Filter, DownloadCloud } from "lucide-react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import ExpenseForm from "@/components/expenses/expense-form"
import ExpenseList from "@/components/expenses/expense-list"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { z } from "zod"
import { Skeleton } from "@/components/ui/skeleton"

type Category = {
  id: string
  name: string
}

type Expense = {
  id: string
  amount: number
  description: string
  date: string // ISO string format
  categoryId: string
  category?: {
    name: string
  }
  receiptUrl?: string | null
}

// Skeleton Components for Loading Animation
const OverviewSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-2 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
)

export default function DashboardPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null)
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (session) {
      fetchExpenses()
      fetchCategories()
    }
  }, [session])

  useEffect(() => {
    if (expenses.length > 0) {
      filterAndSortExpenses()
    }
  }, [expenses, searchQuery, categoryFilter, sortOrder, activeTab])

  const filterAndSortExpenses = () => {
    let filtered = [...expenses]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((expense) => expense.description.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((expense) => expense.categoryId === categoryFilter)
    }

    // Apply time period filter
    const now = new Date()
    if (activeTab === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      filtered = filtered.filter((expense) => new Date(expense.date) >= startOfMonth)
    } else if (activeTab === "week") {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      filtered = filtered.filter((expense) => new Date(expense.date) >= startOfWeek)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA
    })

    setFilteredExpenses(filtered)
  }

  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/expenses")
      if (!response.ok) throw new Error("Failed to fetch expenses")
      const data = await response.json()

      // Simulate network delay for demonstrating loading animation
      setTimeout(() => {
        setExpenses(data)
        setFilteredExpenses(data)
        setIsLoading(false)
      }, 500) // 0.5 second delay
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast({
        title: "Error",
        description: "Failed to load expenses. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false) //  set loading to false even on error
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (!response.ok) throw new Error("Failed to fetch categories")
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      })
    }
  }

  // Define Zod schema to match your form
  const expenseFormSchema = z.object({
    amount: z.coerce.number().positive({ message: "Amount must be positive" }),
    description: z
      .string()
      .min(3, { message: "Description must be at least 3 characters" })
      .max(255, { message: "Description must be less than 255 characters" }),
    date: z.date(),
    categoryId: z.string().min(1, { message: "Please select a category" }),
    receiptUrl: z.string().optional(),
  })

  // Create a type based on the Zod schema
  type ExpenseFormValues = z.infer<typeof expenseFormSchema>

  const handleAddExpense = async (data: ExpenseFormValues) => {
    const formData = new FormData()
    formData.append("amount", data.amount.toString())
    formData.append("description", data.description)
    formData.append("date", data.date.toISOString()) // Crucial: Convert Date to ISO string
    formData.append("categoryId", data.categoryId)
    if (data.receiptUrl) {
      formData.append("receiptUrl", data.receiptUrl)
    }

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        body: formData, // Correct: Use formData
      })

      if (!response.ok) throw new Error("Failed to add expense")

      await fetchExpenses() // Refresh the expenses list
      setIsAddDialogOpen(false)
      toast({
        title: "Success",
        description: "Expense added successfully!",
      })
    } catch (error) {
      console.error("Error adding expense:", error)
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateExpense = async (data: ExpenseFormValues) => {
    if (!currentExpense) return

    const formData = new FormData()
    formData.append("amount", data.amount.toString())
    formData.append("description", data.description)
    // Ensure date is converted to ISO string
    formData.append("date", data.date.toISOString())
    formData.append("categoryId", data.categoryId)
    if (data.receiptUrl) {
      formData.append("receiptUrl", data.receiptUrl)
    }

    try {
      const response = await fetch(`/api/expenses/${currentExpense.id}`, {
        method: "PUT",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to update expense")
      }

      await fetchExpenses()
      setCurrentExpense(null)
      toast({
        title: "Success",
        description: "Expense updated successfully!",
      })
    } catch (error) {
      console.error("Error updating expense:", error)
      toast({
        title: "Error",
        description: "Failed to update expense. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete expense")

      await fetchExpenses() // Refresh the expenses list
      toast({
        title: "Success",
        description: "Expense deleted successfully!",
      })
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Calculate statistics
  const calculateStats = () => {
    if (!expenses || expenses.length === 0) return { 
      total: 0, 
      average: 0, 
      highest: 0, 
      count: 0,
      monthTotal: 0,
      monthCount: 0
    }
    if (expenses.length === 0) return { total: 0, average: 0, highest: 0, count: 0 }

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const average = total / expenses.length
    const highest = Math.max(...expenses.map((expense) => expense.amount))

    // Filter for current month expenses
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthExpenses = expenses.filter((expense) => new Date(expense.date) >= startOfMonth)
    const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)

    return {
      total,
      average,
      highest,
      count: expenses.length,
      monthTotal,
      monthCount: monthExpenses.length,
    }
  }

  const stats = calculateStats()

  // Group expenses by category for analysis
  const expensesByCategory = () => {
    const grouped = expenses.reduce(
      (acc, expense) => {
        const categoryId = expense.categoryId
        if (!acc[categoryId]) {
          acc[categoryId] = 0
        }
        acc[categoryId] += expense.amount
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(grouped)
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === categoryId)
        return {
          categoryId,
          name: category?.name || "Unknown",
          amount,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }

  const topCategories = expensesByCategory().slice(0, 3)

  const exportToCSV = () => {
    if (expenses.length === 0) return

    const headers = ["Date", "Description", "Category", "Amount"]
    const csvData = expenses.map((expense) => [
      format(new Date(expense.date), "yyyy-MM-dd"),
      expense.description,
      expense.category?.name || "Uncategorized",
      expense.amount.toFixed(2),
    ])

    const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses Dashboard</h1>
          <p className="text-muted-foreground">Track, manage, and analyze your expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={expenses.length === 0}>
            <DownloadCloud className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {isLoading ? (
        <OverviewSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Badge variant="outline">All Time</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.total.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.count} expenses recorded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Badge variant="outline" className="bg-blue-500 text-white">
                Current
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.monthTotal.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.monthCount} expenses this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
              <Badge variant="outline">Per Transaction</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.average.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Based on all transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Category</CardTitle>
              <Badge variant="outline">Highest Spend</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topCategories.length > 0 ? topCategories[0].name : "None"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {topCategories.length > 0 ? `$${topCategories[0].amount.toFixed(2)}` : "$0.00"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <TabsList>
            <TabsTrigger value="all">All Time</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
            <div className="relative w-full sm:w-[250px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              title={`Sort by date ${sortOrder === "asc" ? "newest first" : "oldest first"}`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Expense History</CardTitle>
              <CardDescription>
                {filteredExpenses.length} {filteredExpenses.length === 1 ? "expense" : "expenses"} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground mb-4">No expenses found</p>
                  {searchQuery || categoryFilter !== "all" ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("")
                        setCategoryFilter("all")
                      }}
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Clear Filters
                    </Button>
                  ) : (
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Your First Expense
                    </Button>
                  )}
                </div>
              ) : (
                <ExpenseList
                  expenses={filteredExpenses}
                  categories={categories}
                  onDelete={handleDeleteExpense}
                  onUpdate={(id, data) => {
                    const expense = expenses.find((e) => e.id === id)
                    if (expense) {
                      setCurrentExpense(expense)
                      handleUpdateExpense({ ...data, id })
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>This Month's Expenses</CardTitle>
              <CardDescription>
                {filteredExpenses.length} {filteredExpenses.length === 1 ? "expense" : "expenses"} this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground mb-4">No expenses found for this month</p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </div>
              ) : (
                <ExpenseList
                  expenses={filteredExpenses}
                  categories={categories}
                  onDelete={handleDeleteExpense}
                  onUpdate={(id, data) => {
                    const expense = expenses.find((e) => e.id === id)
                    if (expense) {
                      setCurrentExpense(expense)
                      handleUpdateExpense({ ...data, id })
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>This Week's Expenses</CardTitle>
              <CardDescription>
                {filteredExpenses.length} {filteredExpenses.length === 1 ? "expense" : "expenses"} this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground mb-4">No expenses found for this week</p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </div>
              ) : (
                <ExpenseList
                  expenses={filteredExpenses}
                  categories={categories}
                  onDelete={handleDeleteExpense}
                  onUpdate={(id, data) => {
                    const expense = expenses.find((e) => e.id === id)
                    if (expense) {
                      setCurrentExpense(expense)
                      handleUpdateExpense({ ...data, id })
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>Enter the details of your new expense.</DialogDescription>
          </DialogHeader>
          <ExpenseForm categories={categories} onSubmit={handleAddExpense} onCancel={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={!!currentExpense} onOpenChange={(open) => !open && setCurrentExpense(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the details of your expense.</DialogDescription>
          </DialogHeader>
          {currentExpense && (
            <ExpenseForm
              categories={categories}
              expense={currentExpense}
              onSubmit={handleUpdateExpense}
              onCancel={() => setCurrentExpense(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}

