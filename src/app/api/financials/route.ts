import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const generationConfig: GenerationConfig = {
  stopSequences: undefined, //remove stopSequences  as causing some issues with gemini api.
  maxOutputTokens: 2000,  // Adjust as needed
  temperature: 0.7, // Adjust for creativity (0.0 - 1.0)
  topP: 0.95,         // Adjust for diversity (nucleus sampling)
  topK: 40,           // Adjust for quality (top-k sampling)
  responseMimeType: "application/json", // Explicitly request JSON
};
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro",
generationConfig });

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get user's income
        const income = await prisma.income.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        // Get expenses for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const expenses = await prisma.expense.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: thirtyDaysAgo,
                },
            },
            include: {
                category: true,
            },
            orderBy: {
                date: "desc",
            },
        });

        // Calculate totals and prepare data for AI analysis
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const monthlyIncome = income?.amount || 0;

        const expensesByCategory = expenses.reduce((acc, expense) => {
            const category = expense.category.name;
            if (!acc[category]) acc[category] = 0;
            acc[category] += expense.amount;
            return acc;
        }, {} as Record<string, number>);

        // Prepare prompt for Gemini
        const prompt = `
      As a financial advisor, analyze this spending data:
      Monthly Income: $${monthlyIncome}
      Total Monthly Expenses: $${totalExpenses}
      Expenses by Category:
      ${Object.entries(expensesByCategory)
            .map(([category, amount]) => `${category}: $${amount}`)
            .join("\n")}

      Please provide:
      1. A brief analysis of spending patterns
      2. Three specific recommendations for saving money
      3. Identify any concerning spending categories
      4. A suggested monthly budget breakdown based on the 50/30/20 rule
      
      Format the response as JSON with the following structure:
      {
        "analysis": "brief analysis text",
        "recommendations": ["rec1", "rec2", "rec3"],
        "concerns": ["concern1", "concern2"],
        "suggestedBudget": {
          "needs": number,
          "wants": number,
          "savings": number
        }
      }
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Remove any markdown code block syntax from the response
        const cleanedResponse = responseText.replace(/```json|```/g, '').trim();

        // Parse the cleaned response as JSON
        const aiResponse = JSON.parse(cleanedResponse);

        return NextResponse.json({
            currentIncome: monthlyIncome,
            totalExpenses,
            expensesByCategory: Object.entries(expensesByCategory).map(([name, value]) => ({
                name,
                value,
            })),
            aiInsights: aiResponse,
            hasIncome: !!income,
        });
    } catch (error) {
        console.error("Failed to fetch analytics:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { monthlyIncome } = await req.json();

        if (!monthlyIncome || isNaN(parseFloat(monthlyIncome))) {
            return NextResponse.json(
                { error: "Invalid monthly income value" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Create a new income record
        await prisma.income.create({
            data: {
                amount: parseFloat(monthlyIncome),
                source: "Monthly Income",
                date: new Date(),
                userId: user.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update income:", error);
        return NextResponse.json(
            { error: "Failed to update income" },
            { status: 500 }
        );
    }
}