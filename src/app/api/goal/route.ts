import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  GoogleGenerativeAI,
  GenerationConfig,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const generationConfig: GenerationConfig = {
  stopSequences: undefined, // Remove stopSequences as causing some issues with gemini api
  maxOutputTokens: 2000,
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  responseMimeType: "application/json",
};

// Use 'gemini-1.5-pro' with the generation config
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  generationConfig
});

// In-memory cache for goals
const goalCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes cache

// Track in-progress goal generation requests
const goalRequestsInProgress = new Map<string, Promise<any>>();

/**
 * Generate a savings plan based on user data and goals
 */
async function generateSavingsPlan(user: any, goalAmount: number, timeframe: number) {
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

  // Improved Prompt with stronger emphasis on JSON format
  const prompt = `
Create a financial savings plan based on the following:

Monthly Income: $${monthlyIncome}
Total Monthly Expenses: $${totalExpenses}
Savings Goal: $${goalAmount}
Timeframe: ${timeframe} months

Respond with a JSON object and nothing else. Do NOT include any Markdown, backticks (\`), introductory text, or concluding remarks. The response should consist of *ONLY* the JSON object.

Here's the REQUIRED JSON structure:

{
  "savingsPlan": "A detailed savings plan (string).",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Example of a VALID response (replace with your plan data):

{
  "savingsPlan": "Save $X per month...",
  "recommendations": ["Reduce spending...", "Increase income...", "Automate transfers..."],
  "tips": ["Track expenses...", "Set goals...", "Review progress..."]
}

I repeat: Respond with *ONLY* the JSON object, and nothing else. No \`\`\`, no "json", no other text.
`;

  // Add retry logic for the AI call
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      // Generate content
      const result = await model.generateContent(prompt);
      
      if (!result?.response) {
        throw new Error("Invalid AI response: No response received");
      }
      
      let responseText = result.response.text();
      
      // Clean up the response: Remove backticks and "json" if present
      responseText = responseText.replace(/```json\s*|\s*```/g, "");
      responseText = responseText.trim();
      
      try {
        const aiResponse = JSON.parse(responseText);
        
        // Validate the response structure
        if (
          !aiResponse.savingsPlan ||
          !Array.isArray(aiResponse.recommendations) ||
          !Array.isArray(aiResponse.tips)
        ) {
          throw new Error("Invalid response structure");
        }
        
        // Cache the successful result
        const cacheKey = `goal-${user.id}-${goalAmount}-${timeframe}`;
        goalCache.set(cacheKey, { data: aiResponse, timestamp: Date.now() });
        
        return aiResponse;
      } catch (parseError) {
        console.error(
          `Attempt ${attempts + 1}/${maxAttempts} - Failed to parse AI response:`,
          parseError,
          "Original response:",
          responseText
        );
        attempts++;
        
        // If last attempt, throw to trigger fallback
        if (attempts >= maxAttempts) {
          throw parseError;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
      }
    } catch (error) {
      console.error(`Attempt ${attempts + 1}/${maxAttempts} - AI generation error:`, error);
      attempts++;
      
      // If last attempt, throw to trigger fallback
      if (attempts >= maxAttempts) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
    }
  }
  
  // This should never be reached due to the throw in the loop
  throw new Error("Failed to generate savings plan after multiple attempts");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { goalAmount, timeframe } = await req.json();
    
    // Validate input
    if (!goalAmount || isNaN(parseFloat(goalAmount.toString())) || !timeframe || isNaN(parseInt(timeframe.toString()))) {
      return NextResponse.json(
        { error: "Invalid goal amount or timeframe" },
        { status: 400 }
      );
    }
    
    const parsedGoalAmount = parseFloat(goalAmount.toString());
    const parsedTimeframe = parseInt(timeframe.toString());
    
    if (parsedGoalAmount <= 0 || parsedTimeframe <= 0) {
      return NextResponse.json(
        { error: "Goal amount and timeframe must be positive values" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Check cache first
    const cacheKey = `goal-${user.id}-${parsedGoalAmount}-${parsedTimeframe}`;
    const cachedPlan = goalCache.get(cacheKey);
    if (cachedPlan && Date.now() - cachedPlan.timestamp < CACHE_EXPIRATION_MS) {
      return NextResponse.json(cachedPlan.data);
    }
    
    // Check if there's an in-progress request for this combination
    const requestKey = `request-${user.id}-${parsedGoalAmount}-${parsedTimeframe}`;
    if (goalRequestsInProgress.has(requestKey)) {
      try {
        const data = await goalRequestsInProgress.get(requestKey);
        return NextResponse.json(data);
      } catch (error) {
        // If the in-progress request fails, we'll continue and try a new one
        goalRequestsInProgress.delete(requestKey);
      }
    }
    
    // Create and track the new request
    const newRequest = generateSavingsPlan(user, parsedGoalAmount, parsedTimeframe)
      .finally(() => {
        goalRequestsInProgress.delete(requestKey);
      });
      
    goalRequestsInProgress.set(requestKey, newRequest);
    
    try {
      const data = await newRequest;
      return NextResponse.json(data);
    } catch (error) {
      console.error("Failed to generate savings plan:", error);
      
      // Provide fallback response
      return NextResponse.json({
        savingsPlan: `Based on your goal of saving $${parsedGoalAmount} over ${parsedTimeframe} months, you'll need to save approximately $${(parsedGoalAmount / parsedTimeframe).toFixed(2)} per month.`,
        recommendations: [
          "Review your monthly expenses and identify areas where you can reduce spending.",
          "Set up automatic transfers to a dedicated savings account each payday.",
          "Explore options for increasing your income, such as a side hustle or negotiating a raise.",
        ],
        tips: [
          "Track your spending meticulously to understand where your money is going.",
          "Set realistic and achievable savings goals to stay motivated.",
          "Regularly review your progress and adjust your plan as needed.",
        ],
      });
    }
  } catch (error) {
    console.error("Failed to generate savings plan:", error);
    return NextResponse.json(
      { error: "Failed to generate savings plan. Please try again later." },
      { status: 500 }
    );
  }
}