// app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET a specific expense
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // No changes needed here - your existing GET logic is already correct
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
      where: { id: params.id },  // Accessing params.id is fine *after* the initial awaits
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

// PATCH update an expense
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

    // --- The key change is here, but you already had this.
    //     We've already awaited getServerSession and prisma.user.findUnique.
    const expense = await prisma.expense.findUnique({
      where: { id: params.id }, // params.id is safe to use *now*
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

    let receiptUrl = expense.receiptUrl;

    if (receiptFile) {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      receiptUrl = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
            return;
          }
          resolve(result?.secure_url);
        }).end(buffer);
      });
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: params.id }, // params.id is safe to use here too
      data: {
        ...(amount && { amount: parseFloat(amount) }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(categoryId && { categoryId }),
        receiptUrl,
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

// DELETE an expense
export async function DELETE(
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
      // --- We are awaiting getServerSession and findUnique before params.id
    const expense = await prisma.expense.findUnique({
      where: { id: params.id }, // Accessing params.id is now safe
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (expense.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.expense.delete({
      where: { id: params.id }, // And here
    });

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


export const PUT = PATCH;