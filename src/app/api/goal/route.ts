import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { goalAmount, timeframe } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's income and expenses
    const income = await prisma.income.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const expenses = await prisma.expense.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyIncome = income?.amount || 0;

    // Prepare prompt for Gemini
    const prompt = `
      As a financial advisor, help the user set a savings goal:
      Monthly Income: $${monthlyIncome}
      Total Monthly Expenses: $${totalExpenses}
      Savings Goal: $${goalAmount}
      Timeframe: ${timeframe} months

      Please provide:
      1. A personalized savings plan to reach the goal
      2. Recommendations on how to adjust expenses
      3. Any additional tips to improve savings

      Format the response as JSON with the following structure:
      {
        "savingsPlan": "detailed plan text",
        "recommendations": ["rec1", "rec2", "rec3"],
        "tips": ["tip1", "tip2", "tip3"]
      }
    `;

    const result = await model.generateContent(prompt);
    const aiResponse = JSON.parse(result.response.text());

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("Failed to generate savings plan:", error);
    return NextResponse.json(
      { error: "Failed to generate savings plan" },
      { status: 500 }
    );
  }
}