"use client";

import { useState, useEffect } from 'react';
import { PlusCircle, Pencil, Trash2, Receipt } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import ExpenseForm from '@/components/expenses/expense-form';
import { Badge } from '@/components/ui/badge';
import { z } from "zod";
import { ExpenseFormValues } from "@/components/expenses/expense-form"

type Category = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO string format
  categoryId: string;
  category?: {  // This is now correctly populated by the API
    name: string;
  };
  receiptUrl?: string | null;
};

// Skeleton Component for Loading Animation
const SkeletonCard = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 w-20 bg-gray-300 rounded animate-pulse"></div>
      <div className="h-4 w-12 bg-gray-300 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-6 w-full bg-gray-300 rounded animate-pulse"></div>
    </CardContent>
  </Card>
);

const ExpenseRowSkeleton = () => (
    <TableRow>
        <TableCell><div className="h-4 w-20 bg-gray-300 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-4 w-32 bg-gray-300 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-4 w-24 bg-gray-300 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-right"><div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div></TableCell>
        <TableCell>
             <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-300 rounded-full animate-pulse"></div>
            </div>
        </TableCell>
    </TableRow>
)


export default function DashboardPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);


  useEffect(() => {
    if (session) {
      fetchExpenses();
      fetchCategories();
    }
  }, [session]);

    const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      // Simulate network delay for demonstrating loading animation
      setTimeout(() => {
        setExpenses(data);
        setIsLoading(false);
      }, 500);  // 0.5 second delay

    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load expenses. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false); //  set loading to false even on error
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
        toast({
            title: "Error",
            description: "Failed to load categories",
            variant: "destructive"
        })
    }
  };

    // Define Zod schema to match your form
    const expenseFormSchema = z.object({
    amount: z.coerce.number().positive({ message: "Amount must be positive" }),
    description: z.string().min(3, { message: "Description must be at least 3 characters" }).max(255, { message: "Description must be less than 255 characters" }),
    date: z.date(),
    categoryId: z.string().min(1, { message: "Please select a category" }),
    receiptUrl: z.string().optional(),
    });

    // Create a type based on the Zod schema
    type ExpenseFormValues = z.infer<typeof expenseFormSchema>;


  const handleAddExpense = async (data: ExpenseFormValues) => {

    const formData = new FormData();
    formData.append("amount", data.amount.toString());
    formData.append("description", data.description);
    formData.append("date", data.date.toISOString()); // Crucial: Convert Date to ISO string
    formData.append("categoryId", data.categoryId);
    if (data.receiptUrl) {
      formData.append("receiptUrl", data.receiptUrl);
    }


    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        body: formData, // Correct: Use formData
      });

      if (!response.ok) throw new Error('Failed to add expense');

      await fetchExpenses(); // Refresh the expenses list
      setIsAddDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Expense added successfully!',
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to add expense. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateExpense = async (data: ExpenseFormValues) => {
    if (!currentExpense) return;
    
    const formData = new FormData();
    formData.append("amount", data.amount.toString());
    formData.append("description", data.description);
    // Ensure date is converted to ISO string
    formData.append("date", data.date.toISOString());
    formData.append("categoryId", data.categoryId);
    if (data.receiptUrl) {
      formData.append("receiptUrl", data.receiptUrl);
    }
    
    try {
        const response = await fetch(`/api/expenses/${currentExpense.id}`, {
            method: 'PUT',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to update expense');
        }

        await fetchExpenses();
        setCurrentExpense(null);
        toast({
            title: 'Success',
            description: 'Expense updated successfully!',
        });
    } catch (error) {
        console.error('Error updating expense:', error);
        toast({
            title: 'Error',
            description: 'Failed to update expense. Please try again.',
            variant: 'destructive',
        });
    }
};



  const handleDeleteExpense = async () => {
    if (!deleteExpenseId) return;

    try {
      const response = await fetch(`/api/expenses/${deleteExpenseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete expense');

      await fetchExpenses(); // Refresh the expenses list
      setDeleteExpenseId(null);
      toast({
        title: 'Success',
        description: 'Expense deleted successfully!',
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete expense. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);


  if (!session) {
      return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Expenses Dashboard</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          // Show skeleton cards while loading
          <>
            <SkeletonCard />
          </>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Badge className="bg-blue-500">This Month</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => ( <ExpenseRowSkeleton key={i} />))}
                </TableBody>
            </Table>

          ) : expenses.length === 0 ? (
            <p>No expenses found. Add your first expense to get started!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(new Date(expense.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    {/* Use optional chaining and nullish coalescing for safety */}
                    <TableCell>{expense.category?.name ?? 'Uncategorized'}</TableCell>
                    <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCurrentExpense(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteExpenseId(expense.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        {expense.receiptUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(expense.receiptUrl, '_blank')}
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Enter the details of your new expense.
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            categories={categories}
            onSubmit={handleAddExpense}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={!!currentExpense} onOpenChange={(open) => !open && setCurrentExpense(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the details of your expense.
            </DialogDescription>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteExpenseId} onOpenChange={(open) => !open && setDeleteExpenseId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExpenseId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExpense}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}