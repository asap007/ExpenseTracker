"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Edit, Trash2, ExternalLink, Eye } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import ExpenseForm from "./expense-form"
import { Card, CardContent } from "@/components/ui/card"

interface ExpenseListProps {
  expenses: any[]
  categories: any[]
  onDelete: (id: string) => void
  onUpdate: (id: string, data: any) => void
}

export default function ExpenseList({ expenses, categories, onDelete, onUpdate }: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<any | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null)

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    return category ? category.name : "Unknown"
  }

  const handleEditClick = (expense: any) => {
    setEditingExpense(expense)
  }

  const handleDeleteClick = (id: string) => {
    setExpenseToDelete(id)
  }

  const handleDeleteConfirm = () => {
    if (expenseToDelete) {
      onDelete(expenseToDelete)
      setExpenseToDelete(null)
    }
  }

  const handleUpdateSubmit = (data: any) => {
    if (editingExpense) {
      onUpdate(editingExpense.id, data)
      setEditingExpense(null)
    }
  }

  const showReceipt = (url: string) => {
    setViewingReceipt(url)
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} className="group">
                <TableCell className="font-medium">{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={expense.description}>
                  {expense.description}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {getCategoryName(expense.categoryId)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">${expense.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditClick(expense)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {expense.receiptUrl && (
                          <DropdownMenuItem onClick={() => showReceipt(expense.receiptUrl)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Receipt
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(expense.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Expense Dialog */}
      {editingExpense && (
        <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm
              expense={editingExpense}
              categories={categories}
              onSubmit={handleUpdateSubmit}
              onCancel={() => setEditingExpense(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Viewer */}
      {viewingReceipt && (
        <Dialog open={!!viewingReceipt} onOpenChange={(open) => !open && setViewingReceipt(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                <span>Receipt</span>
                <Button variant="outline" size="icon" onClick={() => window.open(viewingReceipt, "_blank")}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {viewingReceipt.endsWith(".pdf") ? (
                  <iframe src={viewingReceipt} className="w-full h-[500px]" title="Receipt PDF" />
                ) : (
                  <div className="flex justify-center p-4">
                    <img
                      src={viewingReceipt || "/placeholder.svg"}
                      alt="Receipt"
                      className="max-h-[500px] object-contain"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

