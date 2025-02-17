"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle } from "lucide-react";
import ExpenseList from "@/components/expenses/expense-list";
import ExpenseForm from "@/components/expenses/expense-form";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      const response = await fetch("/api/expenses");
      if (!response.ok) {
        throw new Error("Failed to fetch expenses");
      }
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast({
        title: "Error",
        description: "Failed to load expenses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      setCategories(data);
      
      // If no categories exist, create default ones
      if (data.length === 0) {
        createDefaultCategories();
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createDefaultCategories = async () => {
    const defaultCategories = [
      "Food & Dining",
      "Transportation",
      "Housing",
      "Utilities",
      "Entertainment",
      "Shopping",
      "Health & Fitness",
      "Personal Care",
      "Education",
      "Travel",
      "Gifts & Donations",
      "Other"
    ];
    
    for (const categoryName of defaultCategories) {
      try {
        await fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: categoryName }),
        });
      } catch (error) {
        console.error(`Error creating default category ${categoryName}:`, error);
      }
    }
    
    // Refresh categories
    fetchCategories();
  };

  const handleAddExpense = async (expenseData) => {
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add expense");
      }
      
      setIsAddingExpense(false);
      fetchExpenses();
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete expense");
      }
      
      fetchExpenses();
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateExpense = async (id, expenseData) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update expense");
      }
      
      fetchExpenses();
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({
        title: "Error",
        description: "Failed to update expense. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (session) {
      fetchExpenses();
      fetchCategories();
    }
  }, [session]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => setIsAddingExpense(true)} className="flex items-center gap-2">
          <PlusCircle size={18} />
          Add Expense
        </Button>
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="expenses" className="space-y-4">
          {isAddingExpense ? (
            <Card>
              <CardHeader>
                <CardTitle>Add New Expense</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpenseForm
                  categories={categories}
                  onSubmit={handleAddExpense}
                  onCancel={() => setIsAddingExpense(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length > 0 ? (
                  <ExpenseList
                    expenses={expenses}
                    categories={categories}
                    onDelete={handleDeleteExpense}
                    onUpdate={handleUpdateExpense}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No expenses found. Add your first expense!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Expense Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Summary charts and statistics will go here.</p>
              <Button
                className="mt-4"
                onClick={() => router.push("/dashboard/analytics")}
              >
                View Detailed Analytics
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}