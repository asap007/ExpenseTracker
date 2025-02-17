// app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET a specific expense
export async function GET(
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
    
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    });
    
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    
    if (expense.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    const body = await req.json();
    const { amount, description, date, categoryId, receiptUrl } = body;
    
    const updatedExpense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...(amount && { amount: parseFloat(amount) }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(categoryId && { categoryId }),
        ...(receiptUrl !== undefined && { receiptUrl }),
      },
      include: { category: true },
    });
    
    // Log the action
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