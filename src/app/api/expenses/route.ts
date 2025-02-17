import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET all expenses for the current user
export async function GET(req: NextRequest) {
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
    
    const expenses = await prisma.expense.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { date: 'desc' },
    });
    
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

// POST create a new expense
export async function POST(req: NextRequest) {
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
    
    // Handle FormData instead of JSON
    const formData = await req.formData();
    
    const amount = formData.get('amount')?.toString();
    const description = formData.get('description')?.toString();
    const date = formData.get('date')?.toString();
    const categoryId = formData.get('categoryId')?.toString();
    const receiptFile = formData.get('receipt') as File | null;
    
    if (!amount || !description || !date || !categoryId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Handle file upload if provided
    let receiptUrl = null;
    if (receiptFile && receiptFile.size > 0) {
      // Here you would normally upload the file to a storage service
      // This is a placeholder - you'll need to implement actual file upload logic
      receiptUrl = `/uploads/${Date.now()}-${receiptFile.name}`;
    }
    
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        description,
        date: new Date(date),
        categoryId,
        userId: user.id,
        receiptUrl,
      },
      include: { category: true },
    });
    
    // Log the action
    await prisma.log.create({
      data: {
        action: `Created expense: ${description} - $${amount}`,
        userId: user.id,
      },
    });
    
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}