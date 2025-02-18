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
 * Retry with exponential backoff helper function with improved error classification
 * @param operation Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelay Initial delay in milliseconds
 * @param factor Multiplier for each subsequent delay
 * @param jitter Whether to add randomness to delay times
 */
async function retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    factor: number = 2,
    jitter: boolean = true
): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            
            // Check if this error should not be retried (e.g., invalid input, auth errors)
            const statusCode = error.statusCode || (error.response && error.response.status);
            const errorMessage = error.message || String(error);
            
            // Don't retry client errors (4xx) except for 429 (too many requests) and 408 (timeout)
            if (statusCode && 
                statusCode >= 400 && 
                statusCode < 500 && 
                statusCode !== 429 && 
                statusCode !== 408) {
                console.error(`Non-retryable error (${statusCode}):`, errorMessage);
                throw error;
            }
            
            if (attempt < maxRetries - 1) {
                // Calculate delay with exponential backoff
                let delay = baseDelay * Math.pow(factor, attempt);
                
                // Add jitter (±30% randomness) if enabled
                if (jitter) {
                    const jitterAmount = delay * 0.3;
                    delay += Math.random() * jitterAmount - jitterAmount / 2;
                }
                
                console.warn(`Retry attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms:`, errorMessage);
                
                // Wait for the calculated delay
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`All ${maxRetries} retry attempts failed:`, errorMessage);
            }
        }
    }
    
    // If we've exhausted all retries, throw the last error
    throw lastError;
}

/**
 * Generate analytics data for a user with improved error handling
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

    // Make the Gemini API call with improved retry and fallback
    let aiInsights = null;
    try {
        const generateAIContent = async () => {
            try {
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                
                // Handle empty responses
                if (!responseText || responseText.trim() === '') {
                    throw new Error("Empty response from Gemini API");
                }
                
                const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
                
                try {
                    // Try to parse the JSON
                    return JSON.parse(cleanedResponse);
                } catch (parseError) {
                    console.warn("Failed to parse Gemini response as JSON:", cleanedResponse);
                    throw new Error(`Invalid JSON response: ${parseError.message}`);
                }
            } catch (apiError: any) {
                // Enhanced error classification
                if (apiError.message?.includes('rate limit') || 
                    apiError.message?.includes('quota exceeded') || 
                    apiError.message?.includes('429')) {
                    console.warn("Rate limiting detected:", apiError.message);
                    apiError.statusCode = 429; // Mark as retryable
                } else if (apiError.message?.includes('timeout') || 
                          apiError.message?.includes('deadline exceeded')) {
                    console.warn("Timeout detected:", apiError.message);
                    apiError.statusCode = 408; // Mark as retryable
                }
                throw apiError;
            }
        };

        // Attempt with exponential backoff (5 attempts, starting with 1s delay, doubling each time)
        aiInsights = await retryWithExponentialBackoff(generateAIContent, 5, 1000, 2, true);
    } catch (aiError) {
        console.error("AI analysis failed after all retries, using fallback:", aiError);
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
 * GET handler for fetching analytics data with improved error handling
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
                console.warn("In-progress request failed, starting fresh request:", error);
                requestsInProgress.delete(requestKey);
            }
        }

        // Create and track the new request with timeout
        const newRequest = Promise.race([
            generateAnalyticsData(user),
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Analytics request timeout after 60s")), 60000)
            })
        ]).finally(() => {
            requestsInProgress.delete(requestKey);
        });

        requestsInProgress.set(requestKey, newRequest);

        try {
            const data = await newRequest;
            return NextResponse.json(data);
        } catch (error: any) {
            console.error("Failed to fetch analytics:", error.message || error);
            
            // Check if there's any cached data as fallback, even if expired
            if (cachedData) {
                console.warn("Using expired cache data as fallback after fetch failure");
                return NextResponse.json({
                    ...cachedData.data,
                    _warning: "Using cached data due to processing error. Try refreshing later."
                });
            }
            
            return NextResponse.json(
                { error: "Failed to fetch analytics. Please try again." },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error("Unexpected error in analytics API:", error.message || error);
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

        // Generate fresh data immediately with shorter timeout
        try {
            const freshDataPromise = Promise.race([
                generateAnalyticsData(user),
                new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error("Analytics refresh timeout after 15s")), 15000)
                })
            ]);
            
            const freshData = await freshDataPromise;
            return NextResponse.json({ 
                success: true,
                analytics: freshData // Return the fresh data for immediate UI update
            });
        } catch (refreshError: any) {
            console.warn("Failed to refresh analytics after income update:", refreshError.message || refreshError);
            // Still return success since the income was updated
            return NextResponse.json({ 
                success: true,
                _warning: "Income updated successfully, but analytics refresh failed. Please refresh the page."
            });
        }
    } catch (error: any) {
        console.error("Failed to update income:", error.message || error);
        return NextResponse.json(
            { error: "Failed to update income" },
            { status: 500 }
        );
    }
}