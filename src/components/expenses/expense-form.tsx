"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

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

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

interface ExpenseFormProps {
  expense?: any
  categories: any[]
  onSubmit: (data: ExpenseFormValues) => void
  onCancel: () => void
}

export default function ExpenseForm({ expense, categories, onSubmit, onCancel }: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: expense?.amount || 0,
      description: expense?.description || "",
      date: expense?.date ? new Date(expense.date) : new Date(),
      categoryId: expense?.categoryId || "",
      receiptUrl: expense?.receiptUrl || "",
    },
  })

  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(expense?.receiptUrl || null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setFileName(file.name)

    // Create a preview URL for the file
    const localPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(localPreviewUrl)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      )

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      if (data.secure_url) {
        form.setValue("receiptUrl", data.secure_url)
        // Trigger validation after setting the value
        await form.trigger("receiptUrl")
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      setPreviewUrl(null)
      setFileName(null)
      // You might want to show an error message to the user here
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    form.setValue("receiptUrl", "")
    setPreviewUrl(null)
    setFileName(null)
  }

  const handleSubmit = async (data: ExpenseFormValues) => {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                    <Input type="number" step="0.01" className="pl-7" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="What did you spend on?" className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="receiptUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receipt</FormLabel>
              <FormControl>
                {previewUrl ? (
                  <Card className="overflow-hidden">
                    <CardContent className="p-0 relative">
                      {previewUrl.endsWith(".pdf") ? (
                        <div className="p-4 flex items-center">
                          <div className="flex-1 truncate">{fileName || "Receipt.pdf"}</div>
                          <Button type="button" variant="ghost" size="icon" onClick={removeFile} className="h-8 w-8">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={previewUrl || "/placeholder.svg"}
                            alt="Receipt preview"
                            className="w-full h-auto max-h-[200px] object-contain"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={removeFile}
                            className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="border rounded-md p-4 flex flex-col items-center justify-center gap-2 h-[120px]">
                    <Input
                      type="file"
                      id="receipt-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleFileUpload(file)
                        }
                      }}
                      disabled={uploading}
                    />
                    <label
                      htmlFor="receipt-upload"
                      className={cn(
                        "flex flex-col items-center justify-center cursor-pointer w-full h-full",
                        uploading && "pointer-events-none",
                      )}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mt-2">Click to upload a receipt</p>
                          <p className="text-xs text-muted-foreground">or drag and drop</p>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : expense ? "Update Expense" : "Add Expense"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

