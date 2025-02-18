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

// In-memory cache for analytics data
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour cache

// Track in-progress requests by user to prevent duplicates
const requestsInProgress = new Map<string, Promise<any>>();

/**
 * Generate analytics data for a user
 * This function handles all the data gathering, AI analysis, and caching logic
 */
async function generateAnalyticsData(user: any) {
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

    // Make the Gemini API call with fallback
    let aiInsights = null;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
        aiInsights = JSON.parse(cleanedResponse);
    } catch (aiError) {
        console.warn("AI analysis failed, continuing with basic data:", aiError);
        // Provide basic insights when AI fails
        aiInsights = {
            analysis: "Basic analysis based on your spending data. For more detailed insights, please try again later.",
            recommendations: [
                "Review your highest spending categories",
                "Consider setting a monthly budget",
                "Build an emergency fund if you haven't already"
            ],
            concerns: totalExpenses > monthlyIncome ? ["Your expenses exceed your income"] : [],
            suggestedBudget: {
                needs: Math.max(0, monthlyIncome * 0.5),
                wants: Math.max(0, monthlyIncome * 0.3),
                savings: Math.max(0, monthlyIncome * 0.2)
            }
        };
    }

    const data = {
        currentIncome: monthlyIncome,
        totalExpenses,
        expensesByCategory: Object.entries(expensesByCategory).map(([name, value]) => ({
            name,
            value,
        })),
        aiInsights,
        hasIncome: !!income,
    };

    // Store in cache
    cache.set(`analytics-${user.id}`, { data, timestamp: Date.now() });
    return data;
}

/**
 * GET handler for fetching analytics data
 */
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
        const requestKey = `request-${userId}`;

        // Check cache first
        const cachedData = cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRATION_MS) {
            return NextResponse.json(cachedData.data);
        }

        // Check if there's an in-progress request for this user
        if (requestsInProgress.has(requestKey)) {
            try {
                const data = await requestsInProgress.get(requestKey);
                return NextResponse.json(data);
            } catch (error) {
                // If the in-progress request fails, we'll continue and try a new one
                requestsInProgress.delete(requestKey);
            }
        }

        // Create and track the new request
        const newRequest = generateAnalyticsData(user)
            .finally(() => {
                requestsInProgress.delete(requestKey);
            });

        requestsInProgress.set(requestKey, newRequest);

        try {
            const data = await newRequest;
            return NextResponse.json(data);
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
            return NextResponse.json(
                { error: "Failed to fetch analytics. Please try again." },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Failed to fetch analytics:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}

/**
 * POST handler for updating user income
 */
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

        // Generate fresh data immediately to prevent errors on next GET
        try {
            const freshData = await generateAnalyticsData(user);
            return NextResponse.json({ 
                success: true,
                analytics: freshData // Return the fresh data for immediate UI update
            });
        } catch (refreshError) {
            console.warn("Failed to refresh analytics after income update:", refreshError);
            // Still return success since the income was updated
            return NextResponse.json({ success: true });
        }
    } catch (error) {
        console.error("Failed to update income:", error);
        return NextResponse.json(
            { error: "Failed to update income" },
            { status: 500 }
        );
    }
}