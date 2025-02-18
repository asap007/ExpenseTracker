import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const generationConfig: GenerationConfig = {
    stopSequences: undefined,
    maxOutputTokens: 2000,
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    responseMimeType: "application/json",
};
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig,
});

// In-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour cache
let currentRequest: Promise<any> | null = null;  // Track the current request

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

        const userId = user.id;
        const cacheKey = `analytics-${userId}`;

        // Check cache
        const cachedData = cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRATION_MS) {
            return NextResponse.json(cachedData.data);
        }
        // If there's a current request, return it.  Avoids duplicate requests.
        if (currentRequest) {
            return currentRequest.then(data => NextResponse.json(data));
        }


        // Get user's income (cached if possible)
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

        // Make the Gemini API call (only if not already in progress)
        currentRequest = model.generateContent(prompt)
            .then(result => {
                const responseText = result.response.text();
                const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
                const aiResponse = JSON.parse(cleanedResponse);

                const data = {
                    currentIncome: monthlyIncome,
                    totalExpenses,
                    expensesByCategory: Object.entries(expensesByCategory).map(([name, value]) => ({
                        name,
                        value,
                    })),
                    aiInsights: aiResponse,
                    hasIncome: !!income,
                };

                // Store in cache
                cache.set(cacheKey, { data, timestamp: Date.now() });
                return data;
            })
            .finally(() => {
                currentRequest = null; // Reset currentRequest after it completes
            });

        return currentRequest.then(data => NextResponse.json(data));

    } catch (error) {
        console.error("Failed to fetch analytics:", error);
        // Clear the current request if it fails.
        currentRequest = null;
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

        // Invalidate cache for this user
        const cacheKey = `analytics-${user.id}`;
        cache.delete(cacheKey);


        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update income:", error);
        return NextResponse.json(
            { error: "Failed to update income" },
            { status: 500 }
        );
    }
}