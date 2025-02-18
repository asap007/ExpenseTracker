// app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from 'cloudinary'; // Import Cloudinary

const prisma = new PrismaClient();

// Cloudinary configuration (same as in app/api/expenses/route.ts)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET a specific expense (existing code - unchanged)
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
      //your code
      try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: { category: true },
    });
    
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    
    if (expense.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    return NextResponse.json(expense);
  } catch (error) {
    console.error("Failed to fetch expense:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

// PATCH update an expense (modified for Cloudinary)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (expense.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const amount = formData.get("amount")?.toString();
    const description = formData.get("description")?.toString();
    const date = formData.get("date")?.toString();
    const categoryId = formData.get("categoryId")?.toString();
    const receiptFile = formData.get("receipt") as File | null;
    
    let receiptUrl = expense.receiptUrl; // Keep existing URL by default

      
    if (receiptFile) {
        // Convert the file to a buffer
        const buffer = Buffer.from(await receiptFile.arrayBuffer());
        
        // Use a Promise to handle the Cloudinary upload
        receiptUrl = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    reject(error); // Reject the promise on error
                    return;
                }
                resolve(result?.secure_url);
            }).end(buffer);
        });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...(amount && { amount: parseFloat(amount) }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(categoryId && { categoryId }),
        receiptUrl, // Update with the new URL, or keep the old one
      },
      include: { category: true },
    });

    await prisma.log.create({
      data: {
        action: `Updated expense: ${updatedExpense.description} - $${updatedExpense.amount}`,
        userId: user.id,
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error("Failed to update expense:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

// DELETE an expense (existing code - unchanged)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
//your code
try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    });
    
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    
    if (expense.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    await prisma.expense.delete({
      where: { id: params.id },
    });
    
    // Log the action
    await prisma.log.create({
      data: {
        action: `Deleted expense: ${expense.description} - $${expense.amount}`,
        userId: user.id,
      },
    });
    
    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}